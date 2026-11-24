import { z } from 'zod'
import { bool, oneOf, reqStr, tone } from '../../core/dto.ts'

/** Master: Hasil review temuan. */
export const FindingResolutionDto = z.object({
    code: z.string({ error: 'Wajib diisi' }).trim().min(1, 'Wajib diisi').max(60).regex(/^[A-Za-z0-9_-]+$/, 'Hanya huruf, angka, - dan _'),
    name: reqStr(150),
    sort_order: z.coerce.number().int().min(0).max(9999).catch(0),
    is_active: bool(),
    kind: oneOf(['open', 'blocking', 'cleared']),
    tone: tone(),
})
export type FindingResolutionInput = z.infer<typeof FindingResolutionDto>
