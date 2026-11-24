import { z } from 'zod'
import { oneOf, reqStr } from '../../core/dto.ts'

/** Configuration: Pengaturan. */
export const SettingDto = z.object({
    key: z.string({ error: 'Wajib diisi' }).trim().min(1).max(60).regex(/^[a-z0-9_]+$/, 'Huruf kecil, angka dan _'),
    value: reqStr(2000),
    value_type: oneOf(['number', 'text', 'list', 'boolean']),
    description: reqStr(500),
  })
  .refine((v) => v.value_type !== 'number' || Number.isFinite(Number(v.value)), { path: ['value'], message: 'Harus berupa angka' })
  .refine((v) => v.value_type !== 'boolean' || ['true', 'false'].includes(v.value), { path: ['value'], message: 'Isi true atau false' })
export type SettingInput = z.infer<typeof SettingDto>
