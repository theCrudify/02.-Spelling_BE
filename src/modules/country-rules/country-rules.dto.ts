import { z } from 'zod'
import { bool, master, optMaster, reqStr } from '../../core/dto.ts'

/** Aturan negara. */
export const CountryRuleDto = z
  .object({
    name: reqStr(150),
    country_id: z.coerce.number({ error: 'Wajib dipilih' }).int(),
    label_type: optMaster('label_types'),
    pattern: reqStr(2000).refine((p) => { try { new RegExp(p, 'iu'); return true } catch { return false } }, 'Regex tidak valid'),
    severity: master('severities'),
    is_active: bool(),
  })
export type CountryRuleInput = z.infer<typeof CountryRuleDto>
