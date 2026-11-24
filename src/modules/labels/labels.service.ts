import { readFile } from 'node:fs/promises'
import type { Transaction } from 'kysely'
import { assertPlantAccess, can, scopedPlants, verifyPassword, type User } from '../../core/auth.ts'
import { conflict, forbidden, notFound, unprocessable } from '../../core/http.ts'
import { masters, type StateKind } from '../../core/masters.ts'
import { storagePath, type FileService } from '../files/files.service.ts'
import type { ApproveInput, CreateLabelInput, DecisionInput, ResolveFindingInput, UploadVersionInput } from './labels.dto.ts'
import type { LabelRepository } from './labels.repository.ts'

const S = (kind: StateKind) => masters.state(kind)

/**
 * Label lifecycle (status kinds are fixed, names / colours are data):
 *   draft ─upload→ processing ─OCR worker→ review ─submit→ approval (route steps) → approved
 *                       ▲                    │  ▲                │
 *                       └──── new version ───┘  └── revision ◄───┤ (return)   rejected ◄─┘ (reject)
 */
export class LabelService {
  constructor(
    private readonly labels: LabelRepository,
    private readonly files: FileService,
  ) {}

  list(user: User, scope: 'tasks' | 'all', query: Record<string, string | undefined>) {
    const tasks = scope === 'tasks' ? { userId: user.id, role: user.role, admin: can(user, 'admin'), approvalStatus: S('approval') } : null
    return this.labels.list(scopedPlants(user), tasks, query)
  }

  summary(user: User) {
    return this.labels.summary(scopedPlants(user))
  }

  private async get(user: User, id: number) {
    const l = await this.labels.findById(id)
    if (!l) throw notFound('Label')
    assertPlantAccess(user, l.plant)
    return l
  }

  async detail(user: User, id: number, versionNo?: number) {
    const l = await this.get(user, id)
    const versions = await this.labels.versions(id)
    const version = versions.find((v) => v.version === (versionNo ?? l.current_version)) ?? null
    const [pages, blocks, findings, steps, histories] = await Promise.all([
      version ? this.labels.pages(version.id) : [],
      version ? this.labels.textBlocks(version.id) : [],
      version ? this.labels.findings(version.id) : [],
      this.labels.steps(id, l.round),
      this.labels.histories(id),
    ])
    const kind = masters.kindOf(l.status)
    const isCurrent = version?.version === l.current_version
    const step = steps.find((s) => s.step_no === l.current_step)
    const approved = step ? await this.labels.approvers(id, l.round, step.step_no) : []
    return {
      ...l,
      versions,
      version,
      pages,
      blocks,
      findings,
      steps,
      approved_by: approved,
      histories,
      revision: `${l.round}-${l.current_step}`, // send back with approve / return / reject
      can_upload: can(user, 'label.edit') && ['draft', 'review', 'revision'].includes(kind ?? ''),
      can_review: can(user, 'label.review') && kind === 'review' && isCurrent,
      can_submit: can(user, 'label.review') && kind === 'review' && isCurrent && version?.ocr_status === 'done' && l.open_findings === 0,
      can_approve: kind === 'approval' && !!step && this.canActOnStep(user, step) && l.submitted_by !== user.id && !approved.includes(user.id),
    }
  }

  private canActOnStep(user: User, step: Record<string, any>) {
    const asAdmin = can(user, 'admin') && masters.bool('admin_can_approve', true)
    return asAdmin || step.user_id === user.id || (!!step.role_code && step.role_code === user.role)
  }

  private history(trx: Transaction<any>, l: Record<string, any>, user: User, action: string, from: string | null, to: string, extra: { note?: string | null; step_no?: number | null; version_id?: number | null; signed?: boolean } = {}) {
    return this.labels.withTx(trx).insertHistory({ label_id: l.id, round: l.round, action, from_status: from, to_status: to, user_id: user.id, role: user.role, note: extra.note ?? null, step_no: extra.step_no ?? null, version_id: extra.version_id ?? null, signed: extra.signed ?? false })
  }

  // ---------------------------------------------------------------- create & versions
  async create(user: User, input: CreateLabelInput) {
    assertPlantAccess(user, input.plant)
    const fileId = await this.files.save(input.file, user.id)
    return this.labels.transaction(async (trx) => {
      const repo = this.labels.withTx(trx)
      const { file, note, ...data } = input
      const id = await repo.insert({ ...data, status: S('processing'), current_version: 1, created_by: user.id })
      const versionId = await repo.insertVersion({ label_id: id, version: 1, file_id: fileId, note, created_by: user.id })
      await this.history(trx, { id, round: 0 }, user, 'Upload', null, S('processing'), { note, version_id: versionId })
      return { id }
    })
  }

  async uploadVersion(user: User, id: number, input: UploadVersionInput) {
    await this.get(user, id)
    const fileId = await this.files.save(input.file, user.id)
    return this.labels.transaction(async (trx) => {
      const repo = this.labels.withTx(trx)
      const l = (await repo.lockById(id))!
      if (!['draft', 'review', 'revision'].includes(masters.kindOf(l.status) ?? '')) throw conflict('Versi baru hanya bisa diunggah saat label draft, direview, atau diminta revisi')
      const version = l.current_version + 1
      const versionId = await repo.insertVersion({ label_id: id, version, file_id: fileId, note: input.note, created_by: user.id })
      await repo.update(id, { status: S('processing'), current_version: version, current_step: null })
      await this.history(trx, l, user, 'Upload', l.status, S('processing'), { note: input.note, version_id: versionId })
      return { id, version }
    })
  }

  /** Runs extraction + checks again on the current version (e.g. after the glossary or master text changed). */
  async recheck(user: User, id: number) {
    await this.get(user, id)
    return this.labels.transaction(async (trx) => {
      const repo = this.labels.withTx(trx)
      const l = (await repo.lockById(id))!
      if (masters.kindOf(l.status) !== 'review') throw conflict('Cek ulang hanya bisa saat label dalam tahap review')
      const v = (await repo.versions(id)).find((x) => x.version === l.current_version)!
      await repo.updateVersion(v.id, { ocr_status: 'queued', ocr_error: null })
      await repo.update(id, { status: S('processing') })
      await this.history(trx, l, user, 'Recheck', l.status, S('processing'), { version_id: v.id })
      return { ok: true }
    })
  }

  async pageImage(user: User, id: number, versionId: number, pageNo: number) {
    await this.get(user, id)
    const page = await this.labels.page(id, versionId, pageNo)
    if (!page) throw notFound('Halaman')
    return readFile(storagePath(page.image_path))
  }

  // ---------------------------------------------------------------- review
  async resolveFinding(user: User, id: number, findingId: number, input: ResolveFindingInput) {
    await this.get(user, id)
    return this.labels.transaction(async (trx) => {
      const repo = this.labels.withTx(trx)
      // Same lock as submit: a finding can never be reopened while (or after) the label is being submitted.
      const l = (await repo.lockById(id))!
      if (masters.kindOf(l.status) !== 'review') throw conflict('Temuan hanya bisa direview saat label dalam tahap review')
      const version = (await repo.versions(id)).find((x) => x.version === l.current_version)
      const f = await repo.finding(findingId)
      if (!f || f.version_id !== version?.id) throw notFound('Temuan')
      const open = masters.resolutionKind(input.resolution) === 'open'
      await repo.updateFinding(findingId, { resolution: input.resolution, note: input.note, resolved_by: open ? null : user.id, resolved_at: open ? null : new Date() })
      if (input.correct_text && f.found && f.bbox && input.correct_text !== f.found) {
        await repo.upsertCorrection({ version_id: f.version_id, page_no: f.page_no, bbox: f.bbox, lang: f.lang, wrong_text: f.found, correct_text: input.correct_text, user_id: user.id })
      }
      if (input.add_glossary && f.found) await repo.addGlossary(input.correct_text || f.found, f.lang)
      return { ok: true }
    })
  }

  // ---------------------------------------------------------------- approval
  async submit(user: User, id: number, note: string | null) {
    await this.get(user, id)
    return this.labels.transaction(async (trx) => {
      const repo = this.labels.withTx(trx)
      const l = (await repo.lockById(id))!
      if (masters.kindOf(l.status) !== 'review') throw conflict('Label tidak dalam tahap review')
      const v = (await repo.versions(id)).find((x) => x.version === l.current_version)!
      if (v.ocr_status !== 'done') throw unprocessable('Pemeriksaan otomatis belum selesai atau gagal')
      const blocking = await repo.countBlocking(v.id)
      if (blocking) throw unprocessable(`Masih ada ${blocking} temuan yang belum selesai direview atau harus diperbaiki`)

      const product = (await repo.findById(id))!
      const route = await repo.matchRoute({ country_id: l.country_id, brand: product.brand, label_type: l.label_type, plant: l.plant })
      if (!route) throw unprocessable('Tidak ada rute approval yang cocok. Admin perlu membuat rute default (semua kondisi kosong).')
      const routeSteps = await repo.routeSteps(route.code)
      if (!routeSteps.length) throw unprocessable(`Rute approval "${route.name}" belum memiliki tahap`)

      // Snapshot: later edits of the route never change this approval round.
      const site = masters.get('plants', l.plant)?.site_code
      const round = l.round + 1
      const rows = []
      for (const s of routeSteps) {
        // min_approvals empty = everyone eligible; never more than the people who can actually approve.
        const eligible = s.role_code ? (await repo.eligibleIds(s.role_code, site, user.id)).length : 1
        if (eligible === 0) throw unprocessable(`Tidak ada user aktif dengan role ${masters.name('roles', s.role_code)} untuk tahap "${s.name}"`)
        const required = Math.min(s.min_approvals ?? eligible, eligible)
        rows.push({ label_id: id, round, step_no: s.step_no, name: s.name, role_code: s.role_code, user_id: s.user_id, required, sla_days: s.sla_days, started_at: s === routeSteps[0] ? new Date() : null })
      }
      await repo.insertSteps(rows)
      await repo.update(id, { status: S('approval'), round, current_step: routeSteps[0].step_no, route_code: route.code, submitted_by: user.id })
      await this.history(trx, { ...l, round }, user, 'Submit', l.status, S('approval'), { note, version_id: v.id })
      return { status: S('approval') }
    })
  }

  /**
   * Locks the label and checks that `user` may decide on its current step, that they were looking at this very step
   * (round + step, so two approvers of the same step do not block each other) and that their password is right
   * (electronic signature: every decision is re-authenticated).
   */
  private async lockStep(trx: Transaction<any>, id: number, user: User, revision: string, password: string) {
    const repo = this.labels.withTx(trx)
    const l = await repo.lockById(id)
    if (!l) throw notFound('Label')
    assertPlantAccess(user, l.plant)
    if (masters.kindOf(l.status) !== 'approval') throw conflict('Label ini sudah tidak dalam proses approval')
    const step = (await repo.steps(id, l.round)).find((s) => s.step_no === l.current_step)
    if (!step || step.status !== 'pending') throw conflict('Tahap approval tidak ditemukan')
    if (!this.canActOnStep(user, step)) throw forbidden(`Tahap "${step.name}" bukan tugas Anda`)
    // Segregation of duties: whoever submitted the label never approves it, admins included.
    if (l.submitted_by === user.id) throw forbidden('Label yang Anda ajukan sendiri harus diproses oleh orang lain')
    if (`${l.round}-${l.current_step}` !== revision) throw conflict('Label ini sudah diproses sejak halaman dibuka. Muat ulang halaman.')
    if (!verifyPassword(password, await repo.passwordHash(user.id))) throw unprocessable('Password salah. Keputusan tidak disimpan (tanda tangan elektronik gagal).')
    return { l, step, repo }
  }

  async approve(user: User, id: number, input: ApproveInput) {
    return this.labels.transaction(async (trx) => {
      const { l, step, repo } = await this.lockStep(trx, id, user, input.revision, input.password)
      const done = await repo.approvers(id, l.round, step.step_no)
      if (done.includes(user.id)) throw conflict('Anda sudah menyetujui tahap ini')
      await this.history(trx, l, user, 'Approve', l.status, l.status, { note: input.note, step_no: step.step_no, signed: true })
      // Complete when enough people approved, or when nobody eligible is left to ask (an approver was deactivated
      // or moved after the snapshot), so the step can never wait for someone who no longer exists.
      const approved = [...done, user.id]
      if (approved.length < step.required) {
        const site = masters.get('plants', l.plant)?.site_code
        const waiting = step.role_code ? (await repo.eligibleIds(step.role_code, site, l.submitted_by)).filter((u) => !approved.includes(u)) : []
        if (waiting.length) return { status: l.status, waiting: waiting.length }
      }

      await repo.updateStep(id, l.round, step.step_no, { status: 'approved', completed_at: new Date() })
      const next = (await repo.steps(id, l.round)).find((s) => s.step_no > step.step_no)
      if (next) {
        await repo.updateStep(id, l.round, next.step_no, { started_at: new Date() })
        await repo.update(id, { current_step: next.step_no })
        return { status: l.status }
      }
      // Last step: the current version becomes the approved, locked artwork.
      const v = (await repo.versions(id)).find((x) => x.version === l.current_version)!
      await repo.updateVersion(v.id, { locked_at: new Date() })
      await repo.update(id, { status: S('approved'), current_step: null })
      await this.history(trx, l, user, 'Approved', l.status, S('approved'), { version_id: v.id })
      return { status: S('approved') }
    })
  }

  /** Back to the designer: a new version is required, then the whole approval starts again. */
  async requestRevision(user: User, id: number, input: DecisionInput) {
    return this.labels.transaction(async (trx) => {
      const { l, step, repo } = await this.lockStep(trx, id, user, input.revision, input.password)
      await repo.updateStep(id, l.round, step.step_no, { status: 'returned', completed_at: new Date() })
      await repo.update(id, { status: S('revision'), current_step: null })
      await this.history(trx, l, user, 'Revision', l.status, S('revision'), { note: input.note, step_no: step.step_no, signed: true })
      return { status: S('revision') }
    })
  }

  async reject(user: User, id: number, input: DecisionInput) {
    return this.labels.transaction(async (trx) => {
      const { l, step, repo } = await this.lockStep(trx, id, user, input.revision, input.password)
      await repo.updateStep(id, l.round, step.step_no, { status: 'rejected', completed_at: new Date() })
      await repo.update(id, { status: S('rejected'), current_step: null })
      await this.history(trx, l, user, 'Reject', l.status, S('rejected'), { note: input.note, step_no: step.step_no, signed: true })
      return { status: S('rejected') }
    })
  }
}
