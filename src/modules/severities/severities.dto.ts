import { z } from 'zod'
import { bool, reqStr, tone } from '../../core/dto.ts'

/** Master: Tingkat temuan. */
export const SeverityDto = z.object({
    code: z.string({ error: 'Wajib diisi' }).trim().min(1, 'Wajib diisi').max(60).regex(/^[A-Za-z0-9_-]+$/, 'Hanya huruf, angka, - dan _'),
    name: reqStr(150),
    sort_order: z.coerce.number().int().min(0).max(9999).catch(0),
    is_active: bool(),
    tone: tone(),
})
export type SeverityInput = z.infer<typeof SeverityDto>
