import { sql } from 'kysely'
import { BaseRepository } from '../../core/base.repository.ts'
import { paginateResource } from '../../core/list.ts'

export class UserRepository extends BaseRepository {
  private base() {
    return this.db
      .selectFrom('users as t')
      .leftJoin('departments as d', 'd.id', 't.department_id')
      .select(['t.id', 't.employee_code', 't.name', 't.email', 't.role', 't.site', 't.department_id', 't.is_active', 't.created_at', 't.updated_at', 'd.name as department_name'])
      .where('t.deleted_at', 'is', null)
  }

  /** Filters, search, sort and paging: list configuration 'users' (database). */
  list(q: Record<string, string | undefined>) {
    return paginateResource(this.base(), q, 'users', 't.id')
  }

  /** Dropdown list (active users), same shape as the master options: id, code, name. */
  options() {
    return this.db.selectFrom('users').select(['id', 'employee_code as code', 'name']).where('deleted_at', 'is', null).where('is_active', '=', true).orderBy('name').execute()
  }

  findById(id: number) {
    return this.base().where('t.id', '=', id).executeTakeFirst()
  }

  create(data: Record<string, unknown>) {
    return this.db.insertInto('users').values(data).returning('id').executeTakeFirstOrThrow()
  }

  update(id: number, data: Record<string, unknown>) {
    return this.db.updateTable('users').set({ ...data, updated_at: sql`now()` }).where('id', '=', id).where('deleted_at', 'is', null).returning('id').executeTakeFirst()
  }

  softDelete(id: number) {
    return this.db
      .updateTable('users')
      .set({ deleted_at: sql`now()`, is_active: false, employee_code: sql`employee_code || '#deleted-' || id` })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .returning('id')
      .executeTakeFirst()
  }
}
