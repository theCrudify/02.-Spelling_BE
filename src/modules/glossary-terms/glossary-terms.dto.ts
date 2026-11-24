import { z } from 'zod'
import { bool, optMaster, reqStr, str } from '../../core/dto.ts'

/** Istilah glossary. */
export const GlossaryTermDto = z
  .object({
    term: reqStr(200),
    language: optMaster('languages'),
    brand: optMaster('brands'),
    note: str(255),
    is_active: bool(),
  })
export type GlossaryTermInput = z.infer<typeof GlossaryTermDto>
