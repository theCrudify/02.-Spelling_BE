import { z } from 'zod'
import { reqStr } from '../../core/dto.ts'

export const CountryDto = z.object({
  code: reqStr(3).toUpperCase(),
  name: reqStr(100),
})
export type CountryInput = z.infer<typeof CountryDto>
