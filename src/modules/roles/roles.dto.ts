import { z } from 'zod'
import { bool, reqStr } from '../../core/dto.ts'
import { PERMISSIONS } from '../../core/masters.ts'

/** Master: Role. */
export const RoleDto = z
  .object({
    code: z.string({ error: 'Wajib diisi' }).trim().min(1, 'Wajib diisi').max(30).regex(/^[A-Za-z0-9_-]+$/, 'Hanya huruf, angka, - dan _'),
    name: reqStr(150),
    sort_order: z.coerce.number().int().min(0).max(9999).catch(0),
    is_active: bool(),
    // capability keys from PERMISSIONS (core/masters.ts)
    permissions: z.preprocess(
    (v) => (v == null || v === '' ? [] : Array.isArray(v) ? v : String(v).split(',')),
    z.array(z.string().refine((k) => k in PERMISSIONS, 'Hak akses tidak dikenal')),
    ),
  })
export type RoleInput = z.infer<typeof RoleDto>
