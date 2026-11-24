import { sql } from 'kysely'
import { BaseRepository } from '../../core/base.repository.ts'
import { paginateResource } from '../../core/list.ts'
import { masters } from '../../core/masters.ts'

export type TaskScope = { userId: number; role: string; admin: boolean; approvalStatus: string }

export class LabelRepository extends BaseRepository {
  private base() {
    return this.db
      .selectFrom('labels as t')
      .innerJoin('products as p', 'p.id', 't.product_id')
      .innerJoin('countries as c', 'c.id', 't.country_id')
      .leftJoin('label_versions as v', (j) => j.onRef('v.label_id', '=', 't.id').onRef('v.version', '=', 't.current_version'))
      .leftJoin('users as su', 'su.id', 't.submitted_by')
      .selectAll('t')
      .select(['p.name as product_name', 'p.code as product_code', 'p.brand', 'c.name as country_name', 'c.code as country_code', 'v.id as version_id', 'v.ocr_status', 'su.name as submitted_by_name'])
      .select((eb) => [
        eb.selectFrom('findings as f').innerJoin('finding_resolutions as fr', 'fr.code', 'f.resolution').select((x) => x.fn.countAll<number>().as('n')).whereRef('f.version_id', '=', 'v.id').where('fr.kind', '<>', 'cleared').as('open_findings'),
        eb.selectFrom('findings as f').select((x) => x.fn.countAll<number>().as('n')).whereRef('f.version_id', '=', 'v.id').as('total_findings'),
      ])
      .where('t.deleted_at', 'is', null)
  }

  /** Labels waiting for this user's decision: current step is theirs (role or named user), not submitted by them, not yet approved by them. */
  list(plants: string[] | null, tasks: TaskScope | null, query: Record<string, string | undefined>) {
    let qb = this.base()
    if (plants) qb = qb.where('t.plant', 'in', [...plants, '-'])
    if (tasks) {
      qb = qb
        .where('t.status', '=', tasks.approvalStatus)
        .where('t.submitted_by', '<>', tasks.userId)
        .where(({ exists, selectFrom }) =>
          exists(
            selectFrom('label_approval_steps as s')
              .select('s.id')
              .whereRef('s.label_id', '=', 't.id')
              .whereRef('s.round', '=', 't.round')
              .whereRef('s.step_no', '=', 't.current_step')
              .where('s.status', '=', 'pending')
              .where((eb) => (tasks.admin ? eb.val(true) : eb.or([eb('s.user_id', '=', tasks.userId), eb('s.role_code', '=', tasks.role)]))),
          ),
        )
        .where(({ not, exists, selectFrom }) =>
          not(
            exists(
              selectFrom('approval_histories as h')
                .select('h.id')
                .whereRef('h.label_id', '=', 't.id')
                .whereRef('h.round', '=', 't.round')
                .whereRef('h.step_no', '=', 't.current_step')
                .where('h.action', '=', 'Approve')
                .where('h.user_id', '=', tasks.userId),
            ),
          ),
        )
    }
    return paginateResource(qb, query, 'labels', 't.id')
  }

  findById(id: number) {
    return this.base().where('t.id', '=', id).executeTakeFirst()
  }

  lockById(id: number) {
    return this.db.selectFrom('labels').selectAll().where('id', '=', id).where('deleted_at', 'is', null).forUpdate().executeTakeFirst()
  }

  async insert(row: Record<string, unknown>) {
    const { id } = await this.db.insertInto('labels').values(row).returning('id').executeTakeFirstOrThrow()
    return id as number
  }

  update(id: number, data: Record<string, unknown>) {
    return this.db.updateTable('labels').set({ ...data, updated_at: sql`now()` }).where('id', '=', id).execute()
  }

  // ---------------------------------------------------------------- versions & OCR results
  async insertVersion(row: Record<string, unknown>) {
    const { id } = await this.db.insertInto('label_versions').values(row).returning('id').executeTakeFirstOrThrow()
    return id as number
  }

  versions(labelId: number) {
    return this.db
      .selectFrom('label_versions as v')
      .innerJoin('files as f', 'f.id', 'v.file_id')
      .leftJoin('users as u', 'u.id', 'v.created_by')
      .select(['v.id', 'v.version', 'v.file_id', 'v.note', 'v.ocr_status', 'v.ocr_error', 'v.ocr_started_at', 'v.ocr_finished_at', 'v.locked_at', 'v.created_at', 'f.name as file_name', 'f.size as file_size', 'f.sha256', 'u.name as created_by_name'])
      .where('v.label_id', '=', labelId)
      .orderBy('v.version', 'desc')
      .execute()
  }

  updateVersion(id: number, data: Record<string, unknown>) {
    return this.db.updateTable('label_versions').set(data).where('id', '=', id).execute()
  }

  pages(versionId: number) {
    return this.db.selectFrom('label_pages').select(['page_no', 'width', 'height']).where('version_id', '=', versionId).orderBy('page_no').execute()
  }

  page(labelId: number, versionId: number, pageNo: number) {
    return this.db
      .selectFrom('label_pages as pg')
      .innerJoin('label_versions as v', 'v.id', 'pg.version_id')
      .select(['pg.image_path'])
      .where('v.label_id', '=', labelId)
      .where('pg.version_id', '=', versionId)
      .where('pg.page_no', '=', pageNo)
      .executeTakeFirst()
  }

  textBlocks(versionId: number) {
    return this.db.selectFrom('text_blocks').select(['id', 'page_no', 'text', 'lang', 'bbox', 'confidence', 'source']).where('version_id', '=', versionId).orderBy('page_no').orderBy('seq').execute()
  }

  findings(versionId: number) {
    return this.db
      .selectFrom('findings as f')
      .leftJoin('users as u', 'u.id', 'f.resolved_by')
      .innerJoin('severities as sv', 'sv.code', 'f.severity')
      .selectAll('f')
      .select('u.name as resolved_by_name')
      .where('f.version_id', '=', versionId)
      .orderBy('sv.sort_order')
      .orderBy('f.page_no')
      .orderBy('f.id')
      .execute()
  }

  finding(id: number) {
    return this.db.selectFrom('findings').selectAll().where('id', '=', id).executeTakeFirst()
  }

  updateFinding(id: number, data: Record<string, unknown>) {
    return this.db.updateTable('findings').set(data).where('id', '=', id).execute()
  }

  async countBlocking(versionId: number) {
    const r = await this.db.selectFrom('findings as f').innerJoin('finding_resolutions as fr', 'fr.code', 'f.resolution').select((eb) => eb.fn.countAll<number>().as('n')).where('f.version_id', '=', versionId).where('fr.kind', '<>', 'cleared').executeTakeFirstOrThrow()
    return r.n
  }

  /** One correction per word (version + page + bbox): a repeated save replaces it instead of duplicating training data. */
  upsertCorrection(row: Record<string, unknown>) {
    return this.db
      .insertInto('ocr_corrections')
      .values(row)
      .onConflict((oc) => oc.columns(['version_id', 'page_no', 'bbox']).doUpdateSet({ correct_text: row.correct_text, user_id: row.user_id, created_at: sql`now()` }))
      .execute()
  }

  addGlossary(term: string, language: string | null) {
    return sql`insert into glossary_terms (term, language) values (${term}, ${language}) on conflict do nothing`.execute(this.db)
  }

  // ---------------------------------------------------------------- approval routes & snapshot
  /** Most specific active route matching the label (null condition = any), ties by priority (sort_order). */
  matchRoute(l: { country_id: number; brand: string; label_type: string; plant: string }) {
    return this.db
      .selectFrom('approval_routes as r')
      .selectAll('r')
      .where('r.is_active', '=', true)
      .where((eb) => eb.or([eb('r.country_id', 'is', null), eb('r.country_id', '=', l.country_id)]))
      .where((eb) => eb.or([eb('r.brand', 'is', null), eb('r.brand', '=', l.brand)]))
      .where((eb) => eb.or([eb('r.label_type', 'is', null), eb('r.label_type', '=', l.label_type)]))
      .where((eb) => eb.or([eb('r.plant', 'is', null), eb('r.plant', '=', l.plant)]))
      .orderBy(sql`(r.country_id is not null)::int + (r.brand is not null)::int + (r.label_type is not null)::int + (r.plant is not null)::int`, 'desc')
      .orderBy('r.sort_order')
      .orderBy('r.id')
      .executeTakeFirst()
  }

  routeSteps(routeCode: string) {
    return this.db.selectFrom('approval_route_steps').selectAll().where('route_code', '=', routeCode).orderBy('step_no').execute()
  }

  async passwordHash(userId: number) {
    return (await this.db.selectFrom('users').select('password_hash').where('id', '=', userId).executeTakeFirstOrThrow()).password_hash as string
  }

  /** Active users who may approve a role step for a label of this plant (site scope), excluding the submitter. */
  async eligibleIds(role: string, plantSite: string, excludeUserId: number) {
    const rows = await this.db
      .selectFrom('users')
      .select('id')
      .where('role', '=', role)
      .where('is_active', '=', true)
      .where('deleted_at', 'is', null)
      .where('id', '<>', excludeUserId)
      .where((eb) => eb.or([eb('site', 'is', null), eb('site', '=', plantSite)]))
      .execute()
    return rows.map((r) => r.id as number)
  }

  insertSteps(rows: Record<string, unknown>[]) {
    return this.db.insertInto('label_approval_steps').values(rows).execute()
  }

  steps(labelId: number, round: number) {
    return this.db
      .selectFrom('label_approval_steps as s')
      .leftJoin('users as u', 'u.id', 's.user_id')
      .selectAll('s')
      .select('u.name as user_name')
      .where('s.label_id', '=', labelId)
      .where('s.round', '=', round)
      .orderBy('s.step_no')
      .execute()
  }

  updateStep(labelId: number, round: number, stepNo: number, data: Record<string, unknown>) {
    return this.db.updateTable('label_approval_steps').set(data).where('label_id', '=', labelId).where('round', '=', round).where('step_no', '=', stepNo).execute()
  }

  /** Distinct users who approved this step in this round. */
  async approvers(labelId: number, round: number, stepNo: number) {
    const rows = await this.db.selectFrom('approval_histories').select('user_id').distinct().where('label_id', '=', labelId).where('round', '=', round).where('step_no', '=', stepNo).where('action', '=', 'Approve').execute()
    return rows.map((r) => r.user_id as number)
  }

  // ---------------------------------------------------------------- history
  insertHistory(row: Record<string, unknown>) {
    return this.db.insertInto('approval_histories').values(row).execute()
  }

  histories(labelId: number) {
    return this.db
      .selectFrom('approval_histories as h')
      .innerJoin('users as u', 'u.id', 'h.user_id')
      .leftJoin('roles as ro', 'ro.code', 'h.role')
      .selectAll('h')
      .select(['u.name as user_name', 'ro.name as role_name'])
      .where('h.label_id', '=', labelId)
      .orderBy('h.created_at', 'desc')
      .orderBy('h.id', 'desc')
      .execute()
  }

  // ---------------------------------------------------------------- dashboard
  async summary(plants: string[] | null) {
    const scope = plants ? sql`and l.plant in (${sql.join([...plants, '-'])})` : sql``
    const months = masters.number('dashboard_trend_months', 6)
    const [byStatus, overdue, findingTypes, totals, trend, byCountry, stepTimes] = await Promise.all([
      sql<{ status: string; n: number }>`select l.status, count(*)::int as n from labels l where l.deleted_at is null ${scope} group by l.status`.execute(this.db),
      sql<{ id: number; code: string; name: string; step_name: string; days: number }>`
        select l.id, l.code, l.name, s.name as step_name, floor(extract(epoch from now() - s.started_at) / 86400)::int as days
        from labels l join label_approval_steps s on s.label_id = l.id and s.round = l.round and s.step_no = l.current_step
        where l.deleted_at is null and s.status = 'pending' and s.started_at < now() - make_interval(days => s.sla_days) ${scope}
        order by s.started_at limit 10`.execute(this.db),
      sql<{ check_type: string; n: number }>`
        select f.check_type, count(*)::int as n from findings f
        join label_versions v on v.id = f.version_id join labels l on l.id = v.label_id and v.version = l.current_version
        where l.deleted_at is null ${scope} group by f.check_type order by n desc`.execute(this.db),
      // Headline numbers. first_pass = approved in the first approval round (never sent back for revision).
      sql<{ labels: number; approved: number; first_pass: number; findings: number; versions: number }>`
        select count(*)::int as labels,
               count(*) filter (where ws.kind = 'approved')::int as approved,
               count(*) filter (where ws.kind = 'approved' and l.round = 1)::int as first_pass,
               coalesce(sum((select count(*) from findings f join label_versions v on v.id = f.version_id where v.label_id = l.id and v.version = l.current_version)), 0)::int as findings,
               count(*) filter (where l.current_version > 0)::int as versions
        from labels l join workflow_states ws on ws.code = l.status where l.deleted_at is null ${scope}`.execute(this.db),
      // Per month: artwork versions uploaded and labels approved (history actions written by LabelService).
      sql<{ month: string; uploaded: number; approved: number }>`
        select to_char(m, 'YYYY-MM') as month,
               (select count(*)::int from approval_histories h join labels l on l.id = h.label_id where h.action = 'Upload' and date_trunc('month', h.created_at) = m and l.deleted_at is null ${scope}) as uploaded,
               (select count(*)::int from approval_histories h join labels l on l.id = h.label_id where h.action = 'Approved' and date_trunc('month', h.created_at) = m and l.deleted_at is null ${scope}) as approved
        from generate_series(date_trunc('month', now()) - make_interval(months => ${months - 1}), date_trunc('month', now()), interval '1 month') m order by m`.execute(this.db),
      sql<{ name: string; n: number }>`
        select c.name, count(*)::int as n from labels l join countries c on c.id = l.country_id
        where l.deleted_at is null ${scope} group by c.name order by n desc, c.name limit 8`.execute(this.db),
      // Average days a finished step took, next to its average SLA.
      sql<{ name: string; days: number; sla: number; n: number }>`
        select s.name, round(avg(extract(epoch from s.completed_at - s.started_at) / 86400)::numeric, 1)::float as days, round(avg(s.sla_days)::numeric, 1)::float as sla, count(*)::int as n
        from label_approval_steps s join labels l on l.id = s.label_id
        where s.completed_at is not null and s.started_at is not null and l.deleted_at is null ${scope}
        group by s.name order by days desc limit 8`.execute(this.db),
    ])
    return { byStatus: byStatus.rows, overdue: overdue.rows, findingTypes: findingTypes.rows, totals: totals.rows[0], trend: trend.rows, byCountry: byCountry.rows, stepTimes: stepTimes.rows }
  }
}
