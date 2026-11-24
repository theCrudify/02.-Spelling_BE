import { hashPassword, signToken, verifyPassword, type User } from '../../core/auth.ts'
import { HTTPException } from 'hono/http-exception'
import { unauthorized, unprocessable } from '../../core/http.ts'
import { masters } from '../../core/masters.ts'
import type { ChangePasswordInput, LoginInput } from './auth.dto.ts'
import type { AuthRepository } from './auth.repository.ts'

// shortcut: counters live in this process's memory (reset on restart, not shared across instances); move to the DB when scaling out.
// Keyed by employee code, not IP: every login arrives from the Next.js server, so the client IP is not available.
const fails = new Map<string, { count: number; until: number }>()

export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  async login({ employee_code, password }: LoginInput) {
    await masters.load() // login runs before requireAuth: limits and session length are settings
    const maxFails = masters.number('login_max_fails', 5)
    const lockMs = masters.number('login_lock_minutes', 15) * 60_000
    const key = employee_code.toLowerCase()
    const f = fails.get(key)
    if (f && f.count >= maxFails && f.until > Date.now()) {
      throw new HTTPException(429, { message: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil((f.until - Date.now()) / 60000)} menit.` })
    }
    const row = await this.repo.findActiveByEmployeeCode(employee_code)
    // Same message for unknown user and wrong password, so employee codes cannot be probed.
    if (!row || !verifyPassword(password, row.password_hash)) {
      const count = f && f.until > Date.now() ? f.count + 1 : 1
      fails.set(key, { count, until: Date.now() + lockMs })
      throw unauthorized('NIK atau password salah')
    }
    fails.delete(key)
    const user: User = { id: row.id, employee_code: row.employee_code, name: row.name, role: row.role, site: row.site, department_id: row.department_id }
    return { token: await signToken(user), user: { ...user, email: row.email, department_name: row.department_name } }
  }

  async changePassword(user: User, { current_password, new_password }: ChangePasswordInput) {
    const { password_hash } = await this.repo.findPasswordHash(user.id)
    if (!verifyPassword(current_password, password_hash)) throw unprocessable('Password lama salah')
    await this.repo.updatePassword(user.id, hashPassword(new_password))
    return { ok: true }
  }
}
