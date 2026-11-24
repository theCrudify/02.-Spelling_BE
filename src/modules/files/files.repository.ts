import { sql } from 'kysely'
import { BaseRepository } from '../../core/base.repository.ts'

export class FileRepository extends BaseRepository {
  async insert(row: { name: string; mime: string; size: number; path: string; sha256: string; created_by: number }) {
    const { id } = await this.db.insertInto('files').values(row).returning('id').executeTakeFirstOrThrow()
    return id as number
  }

  findById(id: number) {
    return this.db.selectFrom('files').select(['name', 'mime', 'path']).where('id', '=', id).executeTakeFirst()
  }

  async isAccessible(fileId: number, plants: string[] | null) {
    const inPlants = plants ? sql`l.plant in (${sql.join([...plants, '-'])})` : sql`true`
    const { rows } = await sql<{ ok: boolean }>`
      select exists (
        select 1 from label_versions v join labels l on l.id = v.label_id
        where v.file_id = ${fileId} and l.deleted_at is null and ${inPlants}) as ok`.execute(this.db)
    return rows[0]?.ok === true
  }
}
