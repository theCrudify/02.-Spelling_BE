import { z } from 'zod'
import { bool, master, reqStr, str } from '../../core/dto.ts'

/** Master: Jenis pengecekan. */
export const CheckTypeDto = z.object({
    code: z.string({ error: 'Wajib diisi' }).trim().min(1, 'Wajib diisi').max(60).regex(/^[A-Za-z0-9_-]+$/, 'Hanya huruf, angka, - dan _'),
    name: reqStr(150),
    sort_order: z.coerce.number().int().min(0).max(9999).catch(0),
    is_active: bool(),
    severity: master('severities'),
    description: str(1000),
})
export type CheckTypeInput = z.infer<typeof CheckTypeDto>
