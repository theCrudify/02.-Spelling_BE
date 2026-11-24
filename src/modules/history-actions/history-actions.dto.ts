import { z } from 'zod'
import { bool, reqStr, tone } from '../../core/dto.ts'

/** Master: Aksi riwayat. */
export const HistoryActionDto = z.object({
    code: z.string({ error: 'Wajib diisi' }).trim().min(1, 'Wajib diisi').max(60).regex(/^[A-Za-z0-9_-]+$/, 'Hanya huruf, angka, - dan _'),
    name: reqStr(150),
    sort_order: z.coerce.number().int().min(0).max(9999).catch(0),
    is_active: bool(),
    icon: reqStr(60),
    tone: tone(),
})
export type HistoryActionInput = z.infer<typeof HistoryActionDto>
