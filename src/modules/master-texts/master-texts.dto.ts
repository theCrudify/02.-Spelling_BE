import { z } from 'zod'
import { master, reqStr, str } from '../../core/dto.ts'

/** Teks master. */
export const MasterTextDto = z
  .object({
    product_id: z.coerce.number({ error: 'Wajib dipilih' }).int(),
    country_id: z.coerce.number({ error: 'Wajib dipilih' }).int(),
    language: master('languages'),
    text: reqStr(20000),
    note: str(255),
  })
export type MasterTextInput = z.infer<typeof MasterTextDto>
