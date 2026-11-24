import { z } from 'zod'
import { bool, oneOf, reqStr } from '../../core/dto.ts'

/** Configuration: Daftar (list). */
export const ListResourceDto = z.object({
    code: z.string({ error: 'Wajib diisi' }).trim().min(1, 'Wajib diisi').max(60).regex(/^[A-Za-z0-9_-]+$/, 'Hanya huruf, angka, - dan _'),
    name: reqStr(150),
    sort_order: z.coerce.number().int().min(0).max(9999).catch(0),
    is_active: bool(),
    default_sort: reqStr(60),
    default_dir: oneOf(['asc', 'desc']),
    page_size: z.coerce.number().int().min(5).max(100),
    search_refs: z.preprocess((v) => (v == null || v === '' ? [] : Array.isArray(v) ? v : String(v).split(',').map((x) => x.trim())), z.array(z.string().min(1))),
  })
export type ListResourceInput = z.infer<typeof ListResourceDto>
