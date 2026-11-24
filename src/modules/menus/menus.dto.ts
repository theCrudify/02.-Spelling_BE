import { z } from 'zod'
import { bool, reqStr, str } from '../../core/dto.ts'
import { PERMISSIONS } from '../../core/masters.ts'

/** Configuration: Menu navigasi. */
export const MenuDto = z.object({
    code: z.string({ error: 'Wajib diisi' }).trim().min(1, 'Wajib diisi').max(60).regex(/^[A-Za-z0-9_-]+$/, 'Hanya huruf, angka, - dan _'),
    name: reqStr(150),
    sort_order: z.coerce.number().int().min(0).max(9999).catch(0),
    is_active: bool(),
    group_name: str(60),
    path: z.string({ error: 'Wajib diisi' }).trim().regex(/^\/[^\s]*$/, 'Diawali “/”, tanpa spasi'),
    icon: reqStr(60),
    // permission keys come from core/masters.ts PERMISSIONS
    permission: z.preprocess((v) => (v === '' ? null : v), z.string().refine((k) => k in PERMISSIONS, 'Hak akses tidak dikenal').nullable()),
    badge: z.preprocess((v) => (v === '' ? null : v), z.enum(['tasks']).nullable()),
    expand_shortcuts: bool(),
  })
export type MenuInput = z.infer<typeof MenuDto>
