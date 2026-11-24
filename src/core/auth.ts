import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { sign, verify } from 'hono/jwt'
import { db } from './database.ts'
import { masters } from './masters.ts'

const SECRET = process.env.JWT_SECRET ?? ''
if (SECRET.length < 16) throw new Error('JWT_SECRET must be at least 16 characters')

export type User = {
  id: number
  employee_code: string
  name: string
  role: string // roles.code
  site: string | null // sites.code; null = all sites
  department_id: number | null
}
export type Env = { Variables: { user: User } }

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(password, salt, 64)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

/** Session length = setting session_hours. */
export const signToken = (user: User) => sign({ user, exp: Math.floor(Date.now() / 1000) + masters.number('session_hours', 8) * 3600 }, SECRET, 'HS256')

export const requireAuth = createMiddleware<Env>(async (c, next) => {
  const token = c.req.header('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new HTTPException(401, { message: 'Silakan login terlebih dahulu' })
  let id: number
  try {
    const payload = await verify(token, SECRET, 'HS256')
    id = (payload.user as User).id
  } catch {
    throw new HTTPException(401, { message: 'Sesi berakhir, silakan login kembali' })
  }
  // Role, site and active status are read fresh, so a demoted or deactivated user loses access immediately.
  const user = await db
    .selectFrom('users')
    .select(['id', 'employee_code', 'name', 'role', 'site', 'department_id'])
    .where('id', '=', id)
    .where('is_active', '=', true)
    .where('deleted_at', 'is', null)
    .executeTakeFirst()
  if (!user) throw new HTTPException(401, { message: 'Sesi berakhir, silakan login kembali' })
  c.set('user', user as User)
  await masters.load() // DTO validation and permission checks read the master snapshot
  await next()
})

/** Role permissions come from the roles master; `admin` grants everything. */
export const can = (user: User, permission: string) => {
  const p = masters.permissions(user.role)
  return p.includes('admin') || p.includes(permission)
}

export const requirePermission = (permission: string) =>
  createMiddleware<Env>(async (c, next) => {
    if (!can(c.get('user'), permission)) throw new HTTPException(403, { message: 'Anda tidak memiliki akses' })
    await next()
  })

/** Plant codes the user may see, or null for all plants. */
export const scopedPlants = (user: User) => (user.site ? masters.plantsOfSite(user.site) : null)

export const assertPlantAccess = (user: User, plant: string) => {
  const plants = scopedPlants(user)
  if (plants && !plants.includes(plant)) throw new HTTPException(403, { message: 'Plant di luar akses Anda' })
}
