import { sql } from 'kysely'
import { BaseRepository } from '../../core/base.repository.ts'

export class MetaRepository extends BaseRepository {
  /**
   * id/name options of a table used as a 'relation' filter source. The table name comes from configuration, so it is
   * checked against the real schema first (must exist and have id + name).
   */
  async relationOptions(table: string) {
    const { rows } = await sql<{ n: number }>`
      select count(*)::int as n from information_schema.columns
      where table_schema = 'public' and table_name = ${table} and column_name in ('id', 'name')`.execute(this.db)
    if (rows[0]?.n !== 2) return []
    const hasDeleted = await sql<{ n: number }>`
      select count(*)::int as n from information_schema.columns where table_schema = 'public' and table_name = ${table} and column_name = 'deleted_at'`.execute(this.db)
    let qb = this.db.selectFrom(table).select(['id', 'name']).orderBy('name')
    if (hasDeleted.rows[0]?.n) qb = qb.where('deleted_at', 'is', null)
    const out = await qb.execute()
    return out.map((r) => ({ value: String(r.id), label: r.name as string }))
  }
}
