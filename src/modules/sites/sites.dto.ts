import { z } from 'zod'
import { bool, reqStr } from '../../core/dto.ts'

/** Master: Site. */
export const SiteDto = z
  .object({
    code: z.string({ error: 'Wajib diisi' }).trim().min(1, 'Wajib diisi').max(30).regex(/^[A-Za-z0-9_-]+$/, 'Hanya huruf, angka, - dan _'),
    name: reqStr(150),
    sort_order: z.coerce.number().int().min(0).max(9999).catch(0),
    is_active: bool(),
  })
export type SiteInput = z.infer<typeof SiteDto>
