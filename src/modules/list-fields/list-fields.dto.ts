import { z } from 'zod'
import { bool, master, reqStr, str } from '../../core/dto.ts'

/** Configuration: Kolom & filter daftar. */
export const ListFieldDto = z.object({
    resource: master('list_resources'),
    key: z.string({ error: 'Wajib diisi' }).trim().min(1, 'Wajib diisi').max(60).regex(/^[a-z0-9_]+$/, 'Huruf kecil, angka dan _'),
    label: reqStr(100),
    // SQL column of the list query, e.g. m.expired_date (identifier only; quoted when used)
    column_ref: z.string({ error: 'Wajib diisi' }).trim().regex(/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/, 'Format alias.kolom, mis. m.status'),
    show_in_table: bool(),
    sortable: bool(),
    filter_type: z.preprocess((v) => (v === '' ? null : v), z.enum(['master', 'relation', 'site', 'expiry', 'values', 'year']).nullable()),
    filter_source: str(100),
    null_label: str(60),
    filter_primary: bool(),
    sort_order: z.coerce.number().int().min(0).max(9999).catch(0),
    is_active: bool(),
  })
export type ListFieldInput = z.infer<typeof ListFieldDto>
