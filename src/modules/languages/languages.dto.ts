import { z } from 'zod'
import { bool, reqStr, str } from '../../core/dto.ts'

/** Bahasa. */
export const LanguageDto = z
  .object({
    code: z.string({ error: 'Wajib diisi' }).trim().min(1, 'Wajib diisi').max(60).regex(/^[A-Za-z0-9_-]+$/, 'Hanya huruf, angka, - dan _'),
    name: reqStr(150),
    sort_order: z.coerce.number().int().min(0).max(9999).catch(0),
    is_active: bool(),
    ocr_lang: reqStr(30),
    dictionary: str(30),
  })
export type LanguageInput = z.infer<typeof LanguageDto>
