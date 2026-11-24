import { z } from 'zod'
import { bool, master, reqStr, str, upload } from '../../core/dto.ts'
import { masters } from '../../core/masters.ts'

/** Repeated form keys or a comma separated string -> codes of active languages. */
const languageList = () =>
  z.preprocess(
    (v) => (v == null || v === '' ? [] : Array.isArray(v) ? v : String(v).split(',')).map((x: unknown) => String(x).trim()).filter(Boolean),
    z.array(z.string().refine((c) => masters.has('languages', c), 'Bahasa tidak valid')).min(1, 'Pilih minimal satu bahasa'),
  )

export const CreateLabelDto = z.object({
  code: reqStr(60),
  name: reqStr(200),
  product_id: z.coerce.number({ error: 'Wajib dipilih' }).int().positive('Wajib dipilih'),
  country_id: z.coerce.number({ error: 'Wajib dipilih' }).int().positive('Wajib dipilih'),
  label_type: master('label_types'),
  plant: master('plants'),
  languages: languageList(),
  file: upload(),
  note: str(1000),
})
export type CreateLabelInput = z.infer<typeof CreateLabelDto>

export const UploadVersionDto = z.object({ file: upload(), note: str(1000) })
export type UploadVersionInput = z.infer<typeof UploadVersionDto>

export const ResolveFindingDto = z.object({
  resolution: master('finding_resolutions'),
  note: str(1000),
  correct_text: str(500), // OCR read it wrong: the real text on the artwork (training data for our model)
  add_glossary: bool(), // false positive that is a valid term: never report it again
})
export type ResolveFindingInput = z.infer<typeof ResolveFindingDto>

// revision = "<round>-<step>" the approver was looking at; password = electronic signature (re-authentication).
const decision = { revision: reqStr(30), password: z.string({ error: 'Password wajib diisi untuk tanda tangan elektronik' }).min(1, 'Password wajib diisi untuk tanda tangan elektronik').max(200) }
export const SubmitDto = z.object({ note: str(1000) })
export const ApproveDto = z.object({ ...decision, note: str(1000) })
export const DecisionDto = z.object({ ...decision, note: z.string({ error: 'Wajib diisi' }).trim().min(5, 'Minimal 5 karakter').max(1000) })
export type ApproveInput = z.infer<typeof ApproveDto>
export type DecisionInput = z.infer<typeof DecisionDto>

export const LabelFilterDto = z.object({ scope: z.enum(['tasks', 'all']).catch('all') })
