import { Hono, type Context } from 'hono'
import { sql } from 'kysely'
import type { z } from 'zod'
import { requirePermission, type Env } from './auth.ts'
import { BaseRepository } from './base.repository.ts'
import { db } from './database.ts'
import { bodyDto, conflict, idParam, notFound, readBody, unprocessable } from './http.ts'
import { paginateResource } from './list.ts'
import { masters } from './masters.ts'

/*
 * Generic CRUD building blocks (alias "t").
 *  - 'soft'  : reference data (departments, suppliers…) deleted via deleted_at; the unique code is freed on delete.
 *  - 'master': business options referenced by code (roles, brands, workflow…). Delete is a real delete that the
 *              foreign keys block while the row is in use (→ 409); deactivate with is_active instead.
 *  - 'hard'  : configuration rows without a code (glossary, rules, route steps): real delete, no master snapshot.
 */
export type CrudConfig = {
  table: string
  mode: 'soft' | 'master' | 'hard'
  uniqueColumn: string
  resource: string // list_resources.code: search / sort / filters come from the database
}

export abstract class CrudRepository extends BaseRepository {
  protected abstract readonly config: CrudConfig

  /** Override to add joins / extra columns. */
  protected base() {
    const qb = this.db.selectFrom(`${this.config.table} as t`).selectAll('t')
    return this.config.mode === 'soft' ? qb.where('t.deleted_at', 'is', null) : qb
  }

  /**
   * Form schema of the table, read from the database itself (types, required, FK targets, column comments as labels),
   * so the admin UI needs no per-table code.
   */
  async schema() {
    const { rows } = await sql<{ name: string; type: string; nullable: boolean; has_default: boolean; label: string | null; ref_table: string | null; ref_column: string | null }>`
      select c.column_name as name, c.data_type as type, c.is_nullable = 'YES' as nullable, c.column_default is not null as has_default,
             col_description(${this.config.table}::regclass, c.ordinal_position) as label,
             ccu.table_name as ref_table, ccu.column_name as ref_column
      from information_schema.columns c
      left join information_schema.key_column_usage k on k.table_name = c.table_name and k.column_name = c.column_name
      left join information_schema.table_constraints tc on tc.constraint_name = k.constraint_name and tc.constraint_type = 'FOREIGN KEY'
      left join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
      where c.table_schema = 'public' and c.table_name = ${this.config.table}
        and c.column_name not in ('id', 'created_at', 'updated_at', 'deleted_at', 'search_text', 'password_hash')
      order by c.ordinal_position`.execute(this.db)
    // Allowed values of CHECK (col IN (...)) constraints become select options in the admin form.
    const checks = await sql<{ def: string }>`select pg_get_constraintdef(oid) as def from pg_constraint where conrelid = ${this.config.table}::regclass and contype = 'c'`.execute(this.db)
    const choices: Record<string, string[]> = {}
    for (const { def } of checks.rows) {
      const m = def.match(/\(\(?([a-z_]+)\)?(?:::text)? = ANY \(\(?ARRAY\[(.*?)\]/)
      if (m) choices[m[1]] = [...m[2].matchAll(/'([^']*)'/g)].map((x) => x[1])
    }
    return rows.map((r) => ({
      name: r.name,
      choices: choices[r.name] ?? null,
      label: r.label ?? r.name,
      type: r.type === 'boolean' ? 'boolean' : r.type === 'ARRAY' ? 'array' : r.type === 'date' ? 'date' : ['integer', 'numeric', 'bigint'].includes(r.type) ? 'number' : r.type === 'text' ? 'textarea' : 'text',
      required: !r.nullable && !r.has_default,
      ref: r.ref_table && r.ref_table !== this.config.table ? { table: r.ref_table, column: r.ref_column } : null,
    }))
  }

  get isMaster() {
    return this.config.mode === 'master'
  }

  list(query: Record<string, string | undefined>) {
    return paginateResource(this.base(), query, this.config.resource, 't.id')
  }

  /** Lightweight list for dropdowns (active rows only for masters). */
  options() {
    let qb = this.db.selectFrom(this.config.table).select(['id', 'code', 'name'])
    if (this.isMaster) qb = qb.where('is_active', '=', true).orderBy('sort_order')
    if (this.config.mode === 'soft') qb = qb.where('deleted_at', 'is', null)
    return qb.orderBy('name').execute()
  }

  findById(id: number) {
    return this.base().where('t.id', '=', id).executeTakeFirst()
  }

  create(data: Record<string, unknown>) {
    return this.db.insertInto(this.config.table).values(data).returningAll().executeTakeFirstOrThrow()
  }

  /** `version` = updated_at the editor loaded; when given, the row is saved only if nobody changed it since. */
  update(id: number, data: Record<string, unknown>, version?: string) {
    let qb = this.db.updateTable(this.config.table).set({ ...data, updated_at: sql`now()` }).where('id', '=', id)
    if (version) qb = qb.where(sql<boolean>`date_trunc('milliseconds', updated_at) = ${version}::timestamptz`)
    if (this.config.mode === 'soft') qb = qb.where('deleted_at', 'is', null)
    return qb.returningAll().executeTakeFirst()
  }

  /**
   * Soft-deleted rows keep their id, so foreign keys cannot stop the delete. Returns the first table that still
   * references this row (ignoring rows that are themselves soft-deleted), or null.
   */
  async inUse(id: number) {
    if (this.config.mode !== 'soft') return null
    const refs = await sql<{ tbl: string; col: string; soft: boolean }>`
      select c.conrelid::regclass::text as tbl, a.attname as col,
             exists (select 1 from pg_attribute d where d.attrelid = c.conrelid and d.attname = 'deleted_at' and not d.attisdropped) as soft
      from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      where c.contype = 'f' and c.confrelid = ${this.config.table}::regclass`.execute(this.db)
    for (const r of refs.rows) {
      let qb = this.db.selectFrom(r.tbl).select(sql`1`.as('x')).where(r.col, '=', id).limit(1)
      if (r.soft) qb = qb.where('deleted_at', 'is', null)
      if (await qb.executeTakeFirst()) return r.tbl
    }
    return null
  }

  /** CSV import: all rows or none. Rows whose unique column already exists are updated. */
  importRows(rows: Record<string, unknown>[]) {
    const { table, uniqueColumn, mode } = this.config
    return (this.db as typeof db).transaction().execute(async (trx) => {
      for (const row of rows) {
        const insert = trx.insertInto(table).values(row)
        if (mode === 'hard') await insert.execute()
        else if (mode === 'master') await insert.onConflict((oc) => oc.column(uniqueColumn).doUpdateSet({ ...row, updated_at: sql`now()` })).execute()
        else {
          // soft: the unique constraint also covers deleted rows (renamed on delete), so update live rows by hand
          const hit = await trx.updateTable(table).set({ ...row, updated_at: sql`now()` }).where(uniqueColumn, '=', row[uniqueColumn] as string).where('deleted_at', 'is', null).returning('id').executeTakeFirst()
          if (!hit) await insert.execute()
        }
      }
      return rows.length
    })
  }

  remove(id: number) {
    if (this.config.mode !== 'soft') return this.db.deleteFrom(this.config.table).where('id', '=', id).returning('id').executeTakeFirst()
    const col = this.config.uniqueColumn
    return this.db
      .updateTable(this.config.table)
      .set({ deleted_at: sql`now()`, [col]: sql`${sql.ref(col)} || '#deleted-' || id` })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .returning('id')
      .executeTakeFirst()
  }
}

export class CrudService<TInput extends Record<string, unknown>> {
  constructor(protected readonly repo: CrudRepository, protected readonly label = 'Data') {}

  /** Master changes must be visible to validation / workflow immediately. */
  private touched<T>(result: T) {
    if (this.repo.isMaster) {
      masters.invalidate()
      void sql`select pg_notify('masters_changed', '')`.execute(db).catch(() => {}) // other API instances (see listenMasterChanges)
    }
    return result
  }

  list(query: Record<string, string | undefined>) {
    return this.repo.list(query)
  }
  schema() {
    return this.repo.schema()
  }
  options() {
    return this.repo.options()
  }
  async get(id: number) {
    return (await this.repo.findById(id)) ?? Promise.reject(notFound(this.label))
  }
  async create(input: TInput) {
    return this.touched(await this.repo.create(input))
  }
  async update(id: number, input: TInput, version?: string) {
    const row = await this.repo.update(id, input, version)
    if (!row) throw version && (await this.repo.findById(id)) ? conflict(`${this.label} ini sudah diubah orang lain sejak Anda membukanya. Muat ulang lalu ulangi perubahan Anda.`) : notFound(this.label)
    return this.touched(row)
  }
  /** `parse` validates one CSV row with the module DTO; every bad row is reported, nothing is saved unless all pass. */
  async importCsv(text: string, parse: (row: Record<string, string>) => TInput) {
    const rows = parseCsv(text)
    if (!rows.length) throw unprocessable('File CSV kosong atau tidak punya baris data')
    const maxRows = masters.number('csv_max_rows', 5000)
    if (rows.length > maxRows) throw unprocessable(`Maksimal ${maxRows} baris per file`)
    const ok: TInput[] = []
    const errors: string[] = []
    rows.forEach((r, i) => {
      try {
        ok.push(parse(r))
      } catch (e) {
        const issues = (e as { issues?: { path: PropertyKey[]; message: string }[] }).issues
        errors.push(`Baris ${i + 2}: ${issues ? issues.map((x) => `${String(x.path[0] ?? '')} ${x.message}`).join('; ') : (e as Error).message}`)
      }
    })
    if (errors.length) throw unprocessable(`${errors.length} baris tidak valid, tidak ada yang disimpan. ${errors.slice(0, 5).join(' | ')}${errors.length > 5 ? ' …' : ''}`)
    return this.touched({ imported: await this.repo.importRows(ok) })
  }
  async remove(id: number) {
    const usedBy = await this.repo.inUse(id)
    if (usedBy) throw conflict(`${this.label} masih dipakai (${usedBy}) sehingga tidak bisa dihapus`)
    if (!(await this.repo.remove(id))) throw notFound(this.label)
    return this.touched({ ok: true })
  }
}

export class CrudController<TInput extends Record<string, unknown>> {
  constructor(protected readonly service: CrudService<TInput>, protected readonly dto: z.ZodType<TInput>) {}

  list = async (c: Context) => c.json(await this.service.list(c.req.query()))
  options = async (c: Context) => c.json(await this.service.options())
  schema = async (c: Context) => c.json(await this.service.schema())
  get = async (c: Context) => c.json(await this.service.get(idParam(c)))
  create = async (c: Context) => c.json(await this.service.create(await bodyDto(c, this.dto)), 201)
  update = async (c: Context) => {
    const body = await readBody(c)
    return c.json(await this.service.update(idParam(c), this.dto.parse(body), typeof body._version === 'string' && body._version ? body._version : undefined))
  }
  import = async (c: Context) => {
    const file = (await readBody(c)).file
    if (!(file instanceof File) || !file.size) throw unprocessable('File CSV wajib diunggah')
    const maxMb = masters.number('csv_max_mb', 5)
    if (file.size > maxMb * 1024 * 1024) throw unprocessable(`File CSV maksimal ${maxMb} MB`)
    return c.json(await this.service.importCsv(await file.text(), (row) => this.dto.parse(row)))
  }
  remove = async (c: Context) => c.json(await this.service.remove(idParam(c)))
}

/** Read for every logged-in user, write for `permission` (admins by default). */
export function crudRoutes(controller: CrudController<any>, permission = 'admin') {
  const admin = requirePermission(permission)
  return new Hono<Env>()
    .get('/', controller.list)
    .get('/options', controller.options)
    .get('/schema', controller.schema)
    .get('/:id', controller.get)
    .post('/', admin, controller.create)
    .post('/import', admin, controller.import)
    .put('/:id', admin, controller.update)
    .delete('/:id', admin, controller.remove)
}

/** Small CSV reader: header row, quoted fields, "" escapes, comma or semicolon (Excel in Indonesian locale). */
export function parseCsv(text: string): Record<string, string>[] {
  const src = text.replace(/^\uFEFF/, '')
  const firstLine = src.split(/\r?\n/, 1)[0]
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const table: string[][] = [[]]
  let cell = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') (cell += '"'), i++
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === sep) table.at(-1)!.push(cell), (cell = '')
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      table.at(-1)!.push(cell), (cell = ''), table.push([])
    } else cell += ch
  }
  table.at(-1)!.push(cell)
  const [header, ...rows] = table.filter((r) => r.some((c) => c.trim() !== ''))
  if (!header) return []
  const keys = header.map((h) => h.trim())
  return rows.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])))
}
