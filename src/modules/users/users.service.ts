import { hashPassword, type User } from '../../core/auth.ts'
import { masters } from '../../core/masters.ts'
import { notFound, unprocessable } from '../../core/http.ts'
import type { CreateUserInput, UpdateUserInput } from './users.dto.ts'
import type { UserRepository } from './users.repository.ts'

export class UserService {
  constructor(private readonly repo: UserRepository) {}

  list(query: Record<string, string | undefined>) {
    return this.repo.list(query)
  }

  options() {
    return this.repo.options()
  }

  async get(id: number) {
    return (await this.repo.findById(id)) ?? Promise.reject(notFound('User'))
  }

  create({ password, ...data }: CreateUserInput) {
    return this.repo.create({ ...data, password_hash: hashPassword(password) })
  }

  async update(actor: User, id: number, { password, ...data }: UpdateUserInput) {
    // An admin cannot lock themselves out (deactivate, or switch to a role without the admin permission).
    if (id === actor.id && (!data.is_active || !masters.permissions(data.role).includes('admin')))
      throw unprocessable('Tidak bisa menonaktifkan / melepas hak admin akun sendiri')
    const row = await this.repo.update(id, { ...data, ...(password && { password_hash: hashPassword(password) }) })
    return row ?? Promise.reject(notFound('User'))
  }

  async remove(actor: User, id: number) {
    if (id === actor.id) throw unprocessable('Tidak bisa menghapus akun sendiri')
    if (!(await this.repo.softDelete(id))) throw notFound('User')
    return { ok: true }
  }
}
