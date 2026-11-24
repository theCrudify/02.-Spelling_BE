import { db, pool } from './database.ts'

/** Every business option lives in one of these tables (see migrate.ts). */
export const MASTER_TABLES = ['sites', 'plants', 'roles', 'brands', 'label_types', 'languages', 'file_types', 'severities', 'check_types', 'finding_resolutions', 'history_actions', 'workflow_states', 'approval_routes', 'list_resources', 'menus'] as const
export type MasterTable = (typeof MASTER_TABLES)[number]
export type StateKind = 'draft' | 'processing' | 'review' | 'approval' | 'approved' | 'revision' | 'rejected'
export type MasterRow = { id: number; code: string; name: string; sort_order: number; is_active: boolean } & Record<string, any>

/**
 * Capability keys the API checks. Which role has which capability is data (roles.permissions); only the
 * list of capabilities is code, because code enforces them.
 */
export const PERMISSIONS: Record<string, string> = {
  admin: 'Administrator: semua akses termasuk master data & user',
  'label.edit': 'Membuat label & mengunggah versi artwork',
  'label.review': 'Mereview temuan, mengelola glossary dari temuan & mengajukan approval',
}

const TTL_MS = 30_000

/**
 * In-memory snapshot of all master tables. Refreshed every 30 s and immediately after any master write.
 * shortcut: with several API instances another instance sees a master change after at most 30 s; use LISTEN/NOTIFY if that matters.
 */
export type ListField = { id: number; resource: string; key: string; label: string; column_ref: string; show_in_table: boolean; sortable: boolean; filter_type: string | null; filter_source: string | null; null_label: string | null; filter_primary: boolean; sort_order: number; is_active: boolean }
export type Setting = { key: string; value: string; value_type: 'number' | 'text' | 'list' | 'boolean'; description: string }

class MasterRegistry {
  private data = {} as Record<MasterTable, MasterRow[]>
  private fields: ListField[] = []
  private settingRows: Setting[] = []
  private loadedAt = 0
  private loading: Promise<void> | null = null

  async load(force = false) {
    if (!force && Date.now() - this.loadedAt < TTL_MS) return
    this.loading ??= (async () => {
      const [rows, fields, settings] = await Promise.all([
        Promise.all(MASTER_TABLES.map((t) => db.selectFrom(t).selectAll().orderBy('sort_order').orderBy('name').execute())),
        db.selectFrom('list_fields').selectAll().orderBy('resource').orderBy('sort_order').execute(),
        db.selectFrom('settings').selectAll().execute(),
      ])
      this.data = Object.fromEntries(MASTER_TABLES.map((t, i) => [t, rows[i]])) as Record<MasterTable, MasterRow[]>
      this.fields = fields as ListField[]
      this.settingRows = settings as Setting[]
      this.loadedAt = Date.now()
    })().finally(() => (this.loading = null))
    return this.loading
  }

  invalidate() {
    this.loadedAt = 0
  }

  all(t: MasterTable) {
    return this.data[t] ?? []
  }
  active(t: MasterTable) {
    return this.all(t).filter((r) => r.is_active)
  }
  get(t: MasterTable, code?: string | null) {
    return code ? this.all(t).find((r) => r.code === code) : undefined
  }
  /** Valid for new data: exists and active. */
  has(t: MasterTable, code?: string | null) {
    return !!this.get(t, code)?.is_active
  }
  name(t: MasterTable, code?: string | null) {
    return this.get(t, code)?.name ?? code ?? ''
  }

  // ---- label status (the kinds are the state machine; names / colours are data)
  state(kind: StateKind) {
    const s = this.all('workflow_states').find((x) => x.kind === kind)
    if (!s) throw new Error(`Master workflow_states has no '${kind}' state`)
    return s.code as string
  }
  kindOf(code: string) {
    return this.get('workflow_states', code)?.kind as StateKind | undefined
  }

  // ---- finding review outcomes (kinds drive the rules; rows are data)
  resolutionKind(code: string) {
    return this.get('finding_resolutions', code)?.kind as 'open' | 'blocking' | 'cleared' | undefined
  }
  /** Outcomes that still stop a submit: not reviewed, or must be fixed. */
  blockingResolutions() {
    return this.all('finding_resolutions').filter((r) => r.kind !== 'cleared').map((r) => r.code as string)
  }

  // ---- configuration
  /** All rows of a table that the registry knows, for the meta endpoint. */
  listFields(resource?: string) {
    return this.fields.filter((f) => f.is_active && (!resource || f.resource === resource))
  }
  resource(code: string) {
    const r = this.get('list_resources', code)
    if (!r) throw new Error(`list_resources has no '${code}' row`)
    return r
  }
  settings() {
    return this.settingRows
  }
  /** Typed setting with a fallback used only when the row is missing. */
  number(key: string, fallback: number) {
    const v = Number(this.settingRows.find((s) => s.key === key)?.value)
    return Number.isFinite(v) ? v : fallback
  }
  bool(key: string, fallback: boolean) {
    const v = this.settingRows.find((s) => s.key === key)?.value
    return v === undefined ? fallback : v === 'true'
  }
  list(key: string, fallback: string[]) {
    const v = this.settingRows.find((s) => s.key === key)?.value
    return v ? v.split(',').map((x) => x.trim()).filter(Boolean) : fallback
  }

  // ---- sites & roles
  plantsOfSite(site: string) {
    return this.all('plants').filter((p) => p.site_code === site).map((p) => p.code)
  }
  permissions(role: string): string[] {
    return this.get('roles', role)?.permissions ?? []
  }
}

export const masters = new MasterRegistry()

/** Keeps one connection listening, so a master change on another API instance drops this instance's snapshot at once. */
export async function listenMasterChanges() {
  try {
    const client = await pool.connect()
    client.on('notification', () => masters.invalidate())
    client.on('error', () => {
      client.release(true)
      setTimeout(listenMasterChanges, 5000)
    })
    await client.query('listen masters_changed')
  } catch {
    setTimeout(listenMasterChanges, 5000) // database not reachable yet; the 30 s TTL still applies meanwhile
  }
}
