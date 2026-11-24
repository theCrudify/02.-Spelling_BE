import { z } from 'zod'
import { bool, oneOf, reqStr, tone } from '../../core/dto.ts'

/** Master: Status label. The kinds are fixed (state machine in code); name, colour and order are data. */
export const WorkflowStateDto = z.object({
  code: z.string({ error: 'Wajib diisi' }).trim().min(1, 'Wajib diisi').max(30).regex(/^[A-Za-z0-9_-]+$/, 'Hanya huruf, angka, - dan _'),
  name: reqStr(150),
  sort_order: z.coerce.number().int().min(0).max(9999).catch(0),
  is_active: bool(),
  kind: oneOf(['draft', 'processing', 'review', 'approval', 'approved', 'revision', 'rejected']),
  tone: tone(),
})
export type WorkflowStateInput = z.infer<typeof WorkflowStateDto>
