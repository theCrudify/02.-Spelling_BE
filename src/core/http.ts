import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { z } from 'zod'

// HTTP errors used by services. app.ts turns them into JSON { message }.
export const notFound = (what = 'Data') => new HTTPException(404, { message: `${what} tidak ditemukan` })
export const forbidden = (message = 'Anda tidak memiliki akses') => new HTTPException(403, { message })
export const conflict = (message: string) => new HTTPException(409, { message })
export const unprocessable = (message: string) => new HTTPException(422, { message })
export const unauthorized = (message: string) => new HTTPException(401, { message })

/** Mutations accept multipart/form-data (with files) or JSON. */
export async function readBody(c: Context): Promise<Record<string, any>> {
  if ((c.req.header('content-type') ?? '').includes('application/json')) return c.req.json()
  return c.req.parseBody({ all: true })
}

/** Parses the request body into a DTO; zod errors become 422 with field errors. */
export const bodyDto = async <T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> => schema.parse(await readBody(c))

export function idParam(c: Context, name = 'id') {
  const id = Number(c.req.param(name))
  if (!Number.isInteger(id) || id < 1) throw notFound()
  return id
}
