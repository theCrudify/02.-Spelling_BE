import { z } from 'zod'
import { master, optInt, optMaster, reqStr } from '../../core/dto.ts'

/** Tahap rute. */
export const ApprovalRouteStepDto = z
  .object({
    route_code: master('approval_routes'),
    step_no: z.coerce.number({ error: 'Wajib diisi' }).int().min(1).max(50),
    name: reqStr(100),
    role_code: optMaster('roles'),
    user_id: optInt(),
    min_approvals: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().int().min(1, 'Minimal 1').max(99).nullable()),
    sla_days: z.coerce.number().int().min(1).max(365).catch(3),
  })
  .refine((v) => !v.role_code !== !v.user_id, { path: ['role_code'], message: 'Pilih role ATAU user tertentu (salah satu)' })
  // A named user is exactly one approver.
  .transform((v) => (v.user_id ? { ...v, min_approvals: 1 } : v))
export type ApprovalRouteStepInput = z.infer<typeof ApprovalRouteStepDto>
