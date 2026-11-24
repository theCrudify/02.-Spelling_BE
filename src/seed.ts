// Demo data. WIPES all tables. Usage: npm run db:seed   (add -- --force when NODE_ENV=production)
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { sql } from 'kysely'
import { hashPassword } from './core/auth.ts'
import { db, pool } from './core/database.ts'
import { migrate, resetSchema } from './migrate.ts'
import { STORAGE_DIR } from './modules/files/files.service.ts'
import { listFields, listResources, menus, settings } from './seed-config.ts'

if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
  console.error('Refusing to wipe a production database. Re-run with --force if you are sure.')
  process.exit(1)
}

const M = (rows: (string | number | boolean | string[] | null)[][], cols: string[]): Record<string, any>[] =>
  rows.map((r, i) => ({ id: i + 1, sort_order: (i + 1) * 10, is_active: true, ...Object.fromEntries(cols.map((c, j) => [c, r[j]])) }))

// ---------------------------------------------------------------- masters
const sites = M([['SKB', 'Sukabumi'], ['KJY', 'Kejayan']], ['code', 'name'])
const plants = M([['1201', 'Sukabumi', 'SKB'], ['1203', 'Kejayan', 'KJY']], ['code', 'name', 'site_code'])
const roles = M(
  [
    ['ADMIN', 'Administrator', ['admin']],
    ['DESIGNER', 'Designer / Packaging', ['label.edit']],
    ['CHECKER', 'Checker / Regulatory', ['label.edit', 'label.review']],
    ['REG', 'Regulatory Affairs', []],
    ['QA', 'Quality Assurance', []],
    ['PLANT_HEAD', 'Plant Head', []],
  ],
  ['code', 'name', 'permissions'],
)
const brands = M([['POCARI', 'Pocari Sweat'], ['SOYJOY', 'SOYJOY'], ['IONESSENCE', 'Ionessence']], ['code', 'name'])
const labelTypes = M([['PRIMARY', 'Kemasan primer'], ['SECONDARY', 'Kemasan sekunder (karton)'], ['LEAFLET', 'Leaflet / brosur']], ['code', 'name'])
// ocr_lang = PaddleOCR language code; dictionary = Hunspell file in 02.-Spelling_OCR/dictionaries (null = no spell check).
const languages = M(
  [
    ['id', 'Indonesia', 'id', 'id_ID'],
    ['en', 'English', 'en', 'en_US'],
    ['ms', 'Melayu', 'ms', null],
    ['vi', 'Tiếng Việt', 'vi', 'vi_VN'],
    ['ar', 'العربية (Arab)', 'ar', 'ar'],
    ['th', 'ไทย (Thai)', 'th', null],
    ['zh', '中文 (Mandarin)', 'ch', null],
    ['ja', '日本語 (Jepang)', 'japan', null],
  ],
  ['code', 'name', 'ocr_lang', 'dictionary'],
)
const fileTypes = M(
  [
    ['pdf', 'PDF', 'application/pdf'],
    ['ai', 'Adobe Illustrator (PDF compatible)', 'application/pdf'],
    ['png', 'PNG', 'image/png'],
    ['jpg', 'JPEG', 'image/jpeg'],
    ['jpeg', 'JPEG', 'image/jpeg'],
    ['tif', 'TIFF', 'image/tiff'],
    ['tiff', 'TIFF', 'image/tiff'],
    ['psd', 'Adobe Photoshop', 'image/vnd.adobe.photoshop'],
    ['eps', 'EPS / PostScript', 'application/postscript'],
  ],
  ['code', 'name', 'mime'],
)
const severities = M([['high', 'Tinggi', 'red'], ['medium', 'Sedang', 'amber'], ['low', 'Rendah', 'blue']], ['code', 'name', 'tone'])
// The codes are the checks implemented by the OCR worker; name, severity and on/off are data.
const checkTypes = M(
  [
    ['master_diff', 'Beda vs teks master', 'high', 'Kata di label yang tidak sesuai teks master (salah ketik, angka berbeda, kata tambahan)'],
    ['master_missing', 'Teks master tidak ada di label', 'high', 'Kata / kalimat teks master yang tidak ditemukan di label'],
    ['master_absent', 'Belum ada teks master', 'low', 'Bahasa di label yang belum punya teks master, sehingga hanya dicek typo & glossary'],
    ['spelling', 'Salah ketik (kamus)', 'medium', 'Kata yang tidak ada di kamus bahasa terkait'],
    ['glossary', 'Mirip istilah glossary', 'medium', 'Kata yang sangat mirip, tapi tidak sama, dengan istilah glossary'],
    ['rule', 'Elemen wajib negara', 'high', 'Elemen wajib per negara yang tidak ditemukan (tingkat mengikuti aturannya)'],
    ['language', 'Bahasa tidak terdaftar', 'medium', 'Teks dalam bahasa yang tidak didaftarkan pada label'],
    ['low_confidence', 'OCR kurang yakin', 'low', 'Kata hasil OCR dengan keyakinan di bawah pengaturan ocr_min_confidence'],
  ],
  ['code', 'name', 'severity', 'description'],
)
const findingResolutions = M([['open', 'Belum direview', 'open', 'neutral'], ['valid', 'Harus diperbaiki', 'blocking', 'red'], ['false_positive', 'Bukan masalah', 'cleared', 'green']], ['code', 'name', 'kind', 'tone'])
// Codes written by the application; label, icon and colour are data.
const historyActions = M(
  [
    ['Upload', 'Mengunggah versi baru', 'upload', 'neutral'],
    ['Recheck', 'Memeriksa ulang', 'scan-text', 'neutral'],
    ['Submit', 'Mengajukan approval', 'send', 'blue'],
    ['Approve', 'Menyetujui', 'check', 'green'],
    ['Approved', 'Approval selesai', 'shield-check', 'green'],
    ['Revision', 'Meminta revisi', 'corner-up-left', 'orange'],
    ['Reject', 'Menolak', 'circle-x', 'red'],
  ],
  ['code', 'name', 'icon', 'tone'],
)
const workflow = M(
  [
    ['DRAFT', 'Draft', 'draft', 'neutral'],
    ['PROCESSING', 'Sedang diperiksa mesin', 'processing', 'blue'],
    ['REVIEW', 'Review temuan', 'review', 'amber'],
    ['APPROVAL', 'Menunggu approval', 'approval', 'violet'],
    ['APPROVED', 'Approved', 'approved', 'green'],
    ['REVISION', 'Perlu revisi', 'revision', 'orange'],
    ['REJECTED', 'Ditolak', 'rejected', 'red'],
  ],
  ['code', 'name', 'kind', 'tone'],
)

// ---------------------------------------------------------------- reference data
const departments = [
  ['PKG', 'Packaging Development', 'R&D'],
  ['REG', 'Regulatory Affairs', 'Quality'],
  ['QA', 'Quality Assurance', 'Quality'],
  ['PRD', 'Production', 'Plant'],
  ['IT', 'Information Technology', 'Corporate'],
].map(([code, name, section], i) => ({ id: i + 1, code, name, section }))
const dept = (code: string) => departments.find((d) => d.code === code)!.id

const PASSWORD = process.env.SEED_PASSWORD ?? 'Spelling@2026' // demo accounts only
const hash = hashPassword(PASSWORD)
const users = [
  ['admin', 'Administrator', 'ADMIN', 'IT', null],
  ['10001', 'Rina Marlina', 'DESIGNER', 'PKG', 'SKB'],
  ['10002', 'Dedi Kurniawan', 'CHECKER', 'REG', null],
  ['10003', 'Siti Nurhaliza', 'REG', 'REG', null],
  ['10004', 'Ahmad Fauzi', 'QA', 'QA', null],
  ['10005', 'Maya Puspita', 'QA', 'QA', 'SKB'],
  ['10006', 'Bayu Pratama', 'PLANT_HEAD', 'PRD', 'SKB'],
].map(([employee_code, name, role, d, site], i) => ({
  id: i + 1,
  employee_code,
  name,
  email: `${name!.toLowerCase().replace(/[^a-z]+/g, '.')}@example.co.id`,
  password_hash: hash,
  role,
  department_id: dept(d!),
  site,
  is_active: true,
}))
const userId = (nik: string) => users.find((u) => u.employee_code === nik)!.id

const countries = [
  ['ID', 'Indonesia'],
  ['MY', 'Malaysia'],
  ['SA', 'Arab Saudi'],
  ['AE', 'Uni Emirat Arab'],
  ['TH', 'Thailand'],
  ['VN', 'Vietnam'],
  ['PH', 'Filipina'],
  ['CN', 'Tiongkok'],
  ['JP', 'Jepang'],
].map(([code, name], i) => ({ id: i + 1, code, name }))
const country = (code: string) => countries.find((c) => c.code === code)!.id

const products = [
  ['PCS-500', 'Pocari Sweat PET 500 ml', 'POCARI'],
  ['PCS-350C', 'Pocari Sweat Can 330 ml', 'POCARI'],
  ['SJ-STR-30', 'SOYJOY Strawberry 30 g', 'SOYJOY'],
  ['ION-500', 'Ionessence PET 500 ml', 'IONESSENCE'],
].map(([code, name, brand], i) => ({ id: i + 1, code, name, brand }))
const product = (code: string) => products.find((p) => p.code === code)!.id

// ---------------------------------------------------------------- checking references
const masterTexts = [
  [
    'PCS-500', 'ID', 'id',
    'POCARI SWEAT Minuman isotonik untuk menggantikan cairan dan elektrolit tubuh. Kocok sebelum diminum. Simpan di tempat sejuk dan kering, hindarkan dari sinar matahari langsung. Isi bersih 500 ml. BPOM RI MD 265210001234. Diproduksi oleh PT Amerta Indah Otsuka, Sukabumi, Indonesia. Halal.',
  ],
  ['PCS-500', 'ID', 'en', 'Isotonic drink to replace body fluids and electrolytes. Net volume 500 ml.'],
  ['SJ-STR-30', 'MY', 'ms', 'SOYJOY Strawberry. Bar soya bakar dengan buah strawberi. Kandungan bersih 30 g. Simpan di tempat yang sejuk dan kering. Halal.'],
  ['SJ-STR-30', 'MY', 'en', 'Baked soy bar with strawberry. Net weight 30 g. Store in a cool and dry place.'],
].map(([p, c, language, text], i) => ({ id: i + 1, product_id: product(p), country_id: country(c), language, text }))

const glossary = ['POCARI', 'SWEAT', 'Otsuka', 'Amerta', 'Indah', 'Sukabumi', 'BPOM', 'RI', 'MD', 'SOYJOY', 'Ionessence', 'isotonik'].map((term, i) => ({ id: i + 1, term, is_active: true }))

const countryRules = [
  ['Nomor registrasi BPOM', 'ID', 'BPOM\\s*RI\\s*(MD|ML)\\s*\\d{12}', 'high'],
  ['Isi bersih / netto', 'ID', '(isi\\s+bersih|netto)\\s*\\d+', 'high'],
  ['Keterangan halal', 'ID', '\\bhalal\\b', 'high'],
  ['Kandungan bersih', 'MY', 'kandungan\\s+bersih\\s*\\d+', 'high'],
].map(([name, c, pattern, severity], i) => ({ id: i + 1, name, country_id: country(c), pattern, severity, is_active: true }))

// ---------------------------------------------------------------- approval routes (custom mapping)
const routes = [
  { code: 'DEFAULT', name: 'Default (semua label)', sort_order: 999 },
  { code: 'ID_PRIMARY', name: 'Indonesia – kemasan primer', sort_order: 10, country_id: country('ID'), label_type: 'PRIMARY' },
  { code: 'EXPORT_SA', name: 'Ekspor Arab Saudi', sort_order: 20, country_id: country('SA') },
].map((r, i) => ({ id: i + 1, is_active: true, country_id: null, brand: null, label_type: null, plant: null, ...r }))
const routeSteps = [
  ['DEFAULT', 1, 'Review Regulatory', 'REG', null, 1, 2],
  ['DEFAULT', 2, 'Persetujuan QA', 'QA', null, 1, 3],
  ['ID_PRIMARY', 1, 'Review Regulatory', 'REG', null, 1, 2],
  ['ID_PRIMARY', 2, 'Persetujuan QA (semua QA)', 'QA', null, null, 3], // min_approvals empty = everyone eligible
  ['ID_PRIMARY', 3, 'Persetujuan Plant Head', 'PLANT_HEAD', null, 1, 2],
  ['EXPORT_SA', 1, 'Review Regulatory', 'REG', null, 1, 3],
  ['EXPORT_SA', 2, 'Persetujuan QA', 'QA', null, 1, 3],
  ['EXPORT_SA', 3, 'Persetujuan Plant Head (Bayu)', null, userId('10006'), 1, 3],
].map(([route_code, step_no, name, role_code, user_id, min_approvals, sla_days], i) => ({ id: i + 1, route_code, step_no, name, role_code, user_id, min_approvals, sla_days }))

// ---------------------------------------------------------------- demo artwork (PDF with a text layer)
/** Minimal one-page PDF (Helvetica), so the worker reads its text layer. */
function pdf(lines: [size: number, text: string][]) {
  const esc = (t: string) => t.replace(/[\\()]/g, (m) => '\\' + m).replace(/[^\x20-\x7e]/g, '?')
  let y = 560
  const stream = lines.map(([size, text]) => `BT /F1 ${size} Tf 40 ${(y -= size + 12)} Td (${esc(text)}) Tj ET`).join('\n')
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 600] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ]
  let out = '%PDF-1.4\n'
  const offsets = objs.map((o, i) => {
    const at = out.length
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
    return at
  })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}

// Pocari ID: deliberate errors (typo "elektorlit", 500 → 50 ml, missing "Kocok sebelum diminum", EN typo "electrolites").
const artworks = [
  {
    name: 'pocari-500ml-id-v1.pdf',
    lines: [
      [26, 'POCARI SWEAT'],
      [12, 'Minuman isotonik untuk menggantikan cairan dan elektorlit tubuh.'],
      [12, 'Simpan di tempat sejuk dan kering, hindarkan dari sinar matahari langsung.'],
      [12, 'Isi bersih 50 ml'],
      [10, 'BPOM RI MD 265210001234'],
      [10, 'Diproduksi oleh PT Amerta Indah Otsuka, Sukabumi, Indonesia. Halal.'],
      [11, 'Isotonic drink to replace body fluids and electrolites. Net volume 500 ml.'],
    ] as [number, string][],
  },
  {
    name: 'soyjoy-strawberry-my-v1.pdf',
    lines: [
      [24, 'SOYJOY Strawberry'],
      [12, 'Bar soya bakar dengan buah strawberi.'],
      [12, 'Kandungan bersih 30 g. Simpan di tempat yang sejuk dan kering. Halal.'],
      [11, 'Baked soy bar with strawberry. Net weight 30 g. Store in a cool and dry place.'],
    ] as [number, string][],
  },
]

// ---------------------------------------------------------------- write
async function insertChunks(table: string, rows: any[]) {
  for (let i = 0; i < rows.length; i += 200) await db.insertInto(table).values(rows.slice(i, i + 200)).execute()
}

await resetSchema()
await migrate()
for (const [table, rows] of Object.entries({
  sites, plants, roles, brands, label_types: labelTypes, languages, file_types: fileTypes, severities, check_types: checkTypes,
  finding_resolutions: findingResolutions, history_actions: historyActions, workflow_states: workflow,
  settings, list_resources: listResources, list_fields: listFields, menus,
  departments, users, countries, products, master_texts: masterTexts, glossary_terms: glossary, country_rules: countryRules,
  approval_routes: routes, approval_route_steps: routeSteps,
})) await insertChunks(table, rows)

// Demo labels: artwork on disk + version 1 queued for the OCR worker.
await mkdir(join(STORAGE_DIR, 'originals'), { recursive: true })
const demo = [
  { code: 'LBL-PCS500-ID-PRI', name: 'Pocari Sweat 500 ml – Indonesia (primer)', product: 'PCS-500', country: 'ID', type: 'PRIMARY', languages: ['id', 'en'] },
  { code: 'LBL-SJSTR-MY-PRI', name: 'SOYJOY Strawberry – Malaysia (primer)', product: 'SJ-STR-30', country: 'MY', type: 'PRIMARY', languages: ['ms', 'en'] },
]
for (const [i, d] of demo.entries()) {
  const data = pdf(artworks[i].lines)
  const sha256 = createHash('sha256').update(data).digest('hex')
  const path = join('originals', `${sha256}.pdf`)
  await writeFile(join(STORAGE_DIR, path), data)
  const file = await db.insertInto('files').values({ name: artworks[i].name, mime: 'application/pdf', size: data.length, path, sha256, created_by: userId('10001') }).returning('id').executeTakeFirstOrThrow()
  const label = await db
    .insertInto('labels')
    .values({ code: d.code, name: d.name, product_id: product(d.product), country_id: country(d.country), label_type: d.type, plant: '1201', languages: d.languages, status: 'PROCESSING', current_version: 1, created_by: userId('10001') })
    .returning('id')
    .executeTakeFirstOrThrow()
  const v = await db.insertInto('label_versions').values({ label_id: label.id, version: 1, file_id: file.id, created_by: userId('10001') }).returning('id').executeTakeFirstOrThrow()
  await db.insertInto('approval_histories').values({ label_id: label.id, version_id: v.id, round: 0, action: 'Upload', to_status: 'PROCESSING', user_id: userId('10001'), role: 'DESIGNER' }).execute()
}

// ---------------------------------------------------------------- sample history (so the dashboard charts have data)
// Synthetic labels spread over the last months, sharing the demo artwork file. They carry findings, approval steps
// and history but no rendered pages: "Periksa ulang" on one of them makes it a real, fully processed label.
let seedState = 20261124
const rnd = () => ((seedState = (seedState * 1664525 + 1013904223) % 4294967296) / 4294967296)
const pick = <T>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000)
const sampleFile = (await db.selectFrom('files').select('id').orderBy('id').executeTakeFirstOrThrow()).id
const TYPES: [string, string][] = [['master_diff', 'high'], ['master_missing', 'high'], ['spelling', 'medium'], ['glossary', 'medium'], ['rule', 'high'], ['language', 'medium'], ['low_confidence', 'low']]
const OUTCOMES: [string, number][] = [['APPROVED', 14], ['APPROVAL', 4], ['REVIEW', 4], ['REVISION', 2], ['REJECTED', 1]]
const outcomes = OUTCOMES.flatMap(([st, n]) => Array.from({ length: n }, () => st))
const sampleCountries = ['ID', 'ID', 'ID', 'MY', 'MY', 'SA', 'AE', 'TH', 'VN', 'PH', 'JP']
for (const [i, status] of outcomes.entries()) {
  // days ago the artwork was uploaded: finished labels spread over the months, open ones are recent
  const start = ['APPROVED', 'REJECTED'].includes(status) ? 8 + Math.floor(rnd() * 165) : 2 + Math.floor(rnd() * 9)
  const c = pick(sampleCountries)
  const prod = pick(products)
  const reworked = status === 'APPROVED' && rnd() < 0.3 // approved only after one revision round
  const round = status === 'REVIEW' ? 0 : reworked ? 2 : 1
  const version = reworked || status === 'REVISION' ? 2 : 1
  const steps = routeSteps.filter((r) => r.route_code === (c === 'SA' ? 'EXPORT_SA' : c === 'ID' ? 'ID_PRIMARY' : 'DEFAULT'))
  const label = await db
    .insertInto('labels')
    .values({
      code: `LBL-CONTOH-${String(i + 1).padStart(3, '0')}`, name: `${prod.name} – ${countries.find((x) => x.code === c)!.name} (contoh)`,
      product_id: prod.id, country_id: country(c), label_type: 'PRIMARY', plant: '1201', languages: c === 'ID' ? ['id', 'en'] : ['en'],
      status, current_version: version, round, current_step: status === 'APPROVAL' ? steps[0].step_no : null,
      route_code: round ? steps[0].route_code : null, submitted_by: round ? userId('10002') : null, created_by: userId('10001'),
      created_at: daysAgo(start), updated_at: daysAgo(Math.max(0, start - 6)),
    })
    .returning('id')
    .executeTakeFirstOrThrow()
  const hist = (action: string, to: string, d: number, nik: string, role: string, extra: Record<string, unknown> = {}) =>
    db.insertInto('approval_histories').values({ label_id: label.id, round, action, to_status: to, user_id: userId(nik), role, created_at: daysAgo(Math.max(0, d)), ...extra }).execute()
  let vId = 0
  for (let v = 1; v <= version; v++) {
    const at = daysAgo(start - (v - 1) * 4)
    vId = (await db.insertInto('label_versions').values({ label_id: label.id, version: v, file_id: sampleFile, ocr_status: 'done', ocr_started_at: at, ocr_finished_at: at, created_by: userId('10001'), created_at: at, locked_at: status === 'APPROVED' && v === version ? daysAgo(Math.max(0, start - 9)) : null }).returning('id').executeTakeFirstOrThrow()).id
    await hist('Upload', 'PROCESSING', start - (v - 1) * 4, '10001', 'DESIGNER', { version_id: vId })
    const n = v === version && status !== 'REVIEW' ? Math.floor(rnd() * 3) : 1 + Math.floor(rnd() * 6)
    for (let k = 0; k < n; k++) {
      const [check_type, severity] = pick(TYPES)
      const reviewed = !(v === version && status === 'REVIEW' && rnd() < 0.6)
      await db.insertInto('findings').values({ version_id: vId, check_type, severity, message: 'Temuan contoh (data historis seed)', resolution: reviewed ? (v < version ? 'valid' : 'false_positive') : 'open', resolved_by: reviewed ? userId('10002') : null, resolved_at: reviewed ? at : null }).execute()
    }
  }
  if (!round) continue
  const submitted = start - (version - 1) * 4 - 1
  await hist('Submit', 'APPROVAL', submitted, '10002', 'CHECKER', { version_id: vId })
  let cursor = submitted
  for (const [k, st] of steps.entries()) {
    const stuck = status !== 'APPROVED' && k === 0 // open labels stop at their first step in this sample
    const took = 0.5 + rnd() * (Number(st.sla_days) + 1.5)
    const approver = st.role_code === 'REG' ? '10003' : st.role_code === 'QA' ? '10004' : '10006'
    const stepStatus = status === 'APPROVED' ? 'approved' : stuck ? (status === 'APPROVAL' ? 'pending' : status === 'REVISION' ? 'returned' : 'rejected') : 'pending'
    await db.insertInto('label_approval_steps').values({ label_id: label.id, round, step_no: st.step_no, name: st.name, role_code: st.role_code, user_id: st.user_id, required: 1, sla_days: st.sla_days, status: stepStatus, started_at: status === 'APPROVED' || stuck ? daysAgo(Math.max(0, cursor)) : null, completed_at: stepStatus === 'pending' ? null : daysAgo(Math.max(0, cursor - took)) }).execute()
    if (stepStatus === 'approved') await hist('Approve', 'APPROVAL', cursor - took, approver, String(st.role_code ?? 'PLANT_HEAD'), { step_no: st.step_no, signed: true })
    if (stepStatus === 'returned') await hist('Revision', 'REVISION', cursor - took, approver, String(st.role_code ?? 'PLANT_HEAD'), { step_no: st.step_no, signed: true, note: 'Contoh: perbaiki klaim gizi' })
    if (stepStatus === 'rejected') await hist('Reject', 'REJECTED', cursor - took, approver, String(st.role_code ?? 'PLANT_HEAD'), { step_no: st.step_no, signed: true, note: 'Contoh: desain dibatalkan' })
    cursor -= took
    if (stuck) break
  }
  if (status === 'APPROVED') await hist('Approved', 'APPROVED', cursor, '10006', 'PLANT_HEAD', { version_id: vId })
}

for (const t of ['sites', 'plants', 'roles', 'brands', 'label_types', 'languages', 'file_types', 'severities', 'check_types', 'finding_resolutions', 'history_actions', 'workflow_states', 'settings', 'list_resources', 'list_fields', 'menus', 'departments', 'users', 'countries', 'products', 'master_texts', 'glossary_terms', 'country_rules', 'approval_routes', 'approval_route_steps']) {
  await sql`select setval(pg_get_serial_sequence(${t}, 'id'), coalesce((select max(id) from ${sql.table(t)}), 1))`.execute(db)
}
console.log(`Seed done. Login NIK admin / 10001 Designer / 10002 Checker / 10003 Regulatory / 10004, 10005 QA / 10006 Plant Head. Password: ${PASSWORD}`)
console.log(`Storage: ${STORAGE_DIR}. Start the OCR worker to process the ${demo.length} demo labels. ${outcomes.length} sample labels ("contoh") were added for the dashboard.`)
await pool.end()
