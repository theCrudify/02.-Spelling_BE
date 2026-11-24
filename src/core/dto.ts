import { z } from 'zod'
import { masters, type MasterTable } from './masters.ts'

// Indonesian validation messages for every DTO.
z.config(z.locales.id())

// Field builders shared by every DTO. Form fields arrive as strings and '' means "not filled".
const blank = (v: unknown) => (v === '' || v === undefined ? null : v)

export const str = (max = 255) => z.preprocess(blank, z.string().trim().max(max).nullable())
export const reqStr = (max = 255) => z.string({ error: 'Wajib diisi' }).trim().min(1, 'Wajib diisi').max(max)
export const isoDate = () => z.string({ error: 'Wajib diisi' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Wajib diisi (YYYY-MM-DD)')
export const optDate = () => z.preprocess(blank, isoDate().nullable())
export const optInt = () => z.preprocess(blank, z.coerce.number().int().nullable())
export const bool = () => z.preprocess((v) => v === true || v === 'true' || v === '1' || v === 'on', z.boolean())
const enumError = (iss: { input?: unknown }) => (iss.input === '' || iss.input === undefined || iss.input === null ? 'Wajib dipilih' : 'Pilihan tidak valid')
/** Fixed system values only (e.g. request_type New/Change). Business options use master(). */
export const oneOf = <T extends readonly [string, ...string[]]>(values: T) => z.enum(values, { error: enumError })

/** Code of an active row in a master table (validated against the master snapshot loaded per request). */
export const master = (t: MasterTable) =>
  z.string({ error: 'Wajib dipilih' }).trim().min(1, 'Wajib dipilih').refine((v) => masters.has(t, v), 'Pilihan tidak valid atau sudah nonaktif')
export const optMaster = (t: MasterTable) => z.preprocess(blank, master(t).nullable())
/** Repeated form keys or a comma separated string -> number[]. */
export const intList = () =>
  z.preprocess((v) => (v == null || v === '' ? [] : Array.isArray(v) ? v : String(v).split(',')), z.array(z.coerce.number().int()))
/** Colours the UI theme provides (same list as the tone CHECK in migrate.ts and TONES in the frontend). */
export const tone = () => oneOf(['neutral', 'blue', 'amber', 'orange', 'violet', 'green', 'red', 'teal', 'rose'])
/** New passwords: at least 8 characters with a letter and a digit. */
export const newPassword = () =>
  z.string().max(200).superRefine((v, ctx) => {
    // Policy = settings password_min_length / password_require_letter_digit (read when the value is checked).
    const min = masters.number('password_min_length', 8)
    if (v.length < min) ctx.addIssue({ code: 'custom', message: `Minimal ${min} karakter` })
    if (masters.bool('password_require_letter_digit', true) && !(/[A-Za-z]/.test(v) && /\d/.test(v))) ctx.addIssue({ code: 'custom', message: 'Harus mengandung huruf dan angka' })
  })
/** Uploaded file field: a non-empty File, or undefined. Type/size are checked by FileService. */
export const upload = () => z.preprocess((v) => (v instanceof File && v.size > 0 ? v : undefined), z.instanceof(File).optional())
