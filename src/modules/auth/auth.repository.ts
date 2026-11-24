import { sql } from 'kysely'
import { BaseRepository } from '../../core/base.repository.ts'

export class AuthRepository extends BaseRepository {
  findActiveByEmployeeCode(employeeCode: string) {
    return this.db
      .selectFrom('users as u')
      .leftJoin('departments as d', 'd.id', 'u.department_id')
      .select(['u.id', 'u.employee_code', 'u.name', 'u.role', 'u.site', 'u.department_id', 'u.password_hash', 'u.email', 'd.name as department_name'])
      .where('u.employee_code', '=', employeeCode)
      .where('u.is_active', '=', true)
      .where('u.deleted_at', 'is', null)
      .executeTakeFirst()
  }

  findPasswordHash(userId: number) {
    return this.db.selectFrom('users').select('password_hash').where('id', '=', userId).executeTakeFirstOrThrow()
  }

  updatePassword(userId: number, passwordHash: string) {
    return this.db.updateTable('users').set({ password_hash: passwordHash, updated_at: sql`now()` }).where('id', '=', userId).execute()
  }
}
