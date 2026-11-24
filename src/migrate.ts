import { pool } from './core/database.ts'

/*
 * Idempotent schema. Design rules (same as SJH Halal):
 *  - Every business option is a master row referenced by FK (codes: ON UPDATE CASCADE; in-use rows cannot be deleted).
 *  - Lists (filters, columns, sorting, search), numeric rules and navigation are configuration tables.
 *  - Column comments are the labels the admin UI shows.
 * Spelling specifics:
 *  - Label status kinds are fixed in code (workflow_states.kind), their names / colours are data.
 *  - Approval steps are NOT global: approval_routes + approval_route_steps are matched per label and copied
 *    (snapshot) into label_approval_steps on submit, so editing a route never changes a running approval.
 *  - The Python OCR worker picks label_versions with ocr_status = 'queued' and writes text_blocks + findings.
 */

const MASTER_COLS = `
  id serial primary key,
  code varchar(60) not null unique,
  name varchar(150) not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()`
const SOFT_COLS = `
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz`
const HARD_COLS = `
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()`
// Colours the UI theme provides (components/ui.tsx TONES); a new colour needs CSS, so this list is code.
const TONE = `varchar(10) not null default 'neutral' check (tone in ('neutral', 'blue', 'amber', 'orange', 'violet', 'green', 'red', 'teal', 'rose'))`
const ref = (table: string, nullable = true) => `varchar(60) ${nullable ? '' : 'not null '}references ${table}(code) on update cascade`
const fk = (table: string, nullable = true) => `int ${nullable ? '' : 'not null '}references ${table}(id)`

const schema = /* sql */ `
-- ===================================================================== business masters
create table if not exists sites (${MASTER_COLS});
create table if not exists plants (${MASTER_COLS}, site_code ${ref('sites', false)});
create table if not exists roles (${MASTER_COLS}, permissions text[] not null default '{}');
create table if not exists brands (${MASTER_COLS});
create table if not exists label_types (${MASTER_COLS});
-- ocr_lang: PaddleOCR language / model code; dictionary: Hunspell file name (without .dic); script 'char' = no spaces (CJK, Thai).
create table if not exists languages (
  ${MASTER_COLS},
  ocr_lang varchar(30) not null,
  dictionary varchar(30)
);
-- Artwork formats users may upload: code = file extension. (How each format is read is detected from the file itself.)
create table if not exists file_types (${MASTER_COLS}, mime varchar(100) not null);
-- Finding severities: order = sort_order (most severe first).
create table if not exists severities (${MASTER_COLS}, tone ${TONE});
-- One row per check the worker knows (the code = the algorithm). Name, severity and on/off are data.
create table if not exists check_types (${MASTER_COLS}, severity ${ref('severities', false)}, description text);
-- Review outcomes of a finding. kind drives the rules: 'open' = not reviewed (exactly one row), 'blocking' = must be
-- fixed before submit, 'cleared' = accepted. Any number of blocking / cleared outcomes may be added.
create table if not exists finding_resolutions (
  ${MASTER_COLS},
  kind varchar(10) not null check (kind in ('open', 'blocking', 'cleared')),
  tone ${TONE}
);
create unique index if not exists finding_resolutions_one_open on finding_resolutions (kind) where kind = 'open';
-- Actions written to the history by the application (codes are fixed by code); label, icon and colour are data.
create table if not exists history_actions (${MASTER_COLS}, icon varchar(60) not null default 'circle', tone ${TONE});
-- One row per kind; the kinds drive the state machine in code.
create table if not exists workflow_states (
  ${MASTER_COLS},
  kind varchar(12) not null unique check (kind in ('draft', 'processing', 'review', 'approval', 'approved', 'revision', 'rejected')),
  tone ${TONE}
);

-- ===================================================================== configuration
create table if not exists settings (
  id serial primary key,
  key varchar(60) not null unique,
  value text not null,
  value_type varchar(10) not null check (value_type in ('number', 'text', 'list', 'boolean')),
  description text not null,
  updated_at timestamptz not null default now()
);
create table if not exists list_resources (
  ${MASTER_COLS},
  default_sort varchar(60) not null,
  default_dir varchar(4) not null default 'asc' check (default_dir in ('asc', 'desc')),
  page_size int not null default 10,
  search_refs text[] not null default '{}'
);
create table if not exists list_fields (
  id serial primary key,
  resource ${ref('list_resources', false)},
  key varchar(60) not null,
  label varchar(100) not null,
  column_ref varchar(100) not null,
  show_in_table boolean not null default true,
  sortable boolean not null default true,
  filter_type varchar(20) check (filter_type in ('master', 'relation', 'site', 'values', 'year')),
  filter_source varchar(100),
  null_label varchar(60),
  filter_primary boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (resource, key)
);
create table if not exists menus (
  ${MASTER_COLS},
  group_name varchar(60),
  path varchar(200) not null,
  icon varchar(60) not null default 'circle',
  permission varchar(60),
  badge varchar(20) check (badge in ('tasks')),
  expand_shortcuts boolean not null default false
);

-- ===================================================================== reference data
create table if not exists departments (id serial primary key, code varchar(30) not null unique, name varchar(150) not null, section varchar(150), ${SOFT_COLS});
create table if not exists users (
  id serial primary key,
  employee_code varchar(30) not null unique,
  name varchar(150) not null,
  email varchar(150),
  password_hash text not null,
  role ${ref('roles', false)},
  department_id ${fk('departments')},
  site ${ref('sites')},
  is_active boolean not null default true,
  ${SOFT_COLS}
);
create table if not exists countries (id serial primary key, code varchar(3) not null unique, name varchar(100) not null, ${SOFT_COLS});
create table if not exists products (id serial primary key, code varchar(30) not null unique, name varchar(150) not null, brand ${ref('brands', false)}, ${SOFT_COLS});

-- Approval routes: null condition = any. The most specific active match wins, ties by sort_order (priority).
create table if not exists approval_routes (
  ${MASTER_COLS},
  country_id ${fk('countries')},
  brand ${ref('brands')},
  label_type ${ref('label_types')},
  plant ${ref('plants')}
);
create table if not exists approval_route_steps (
  id serial primary key,
  route_code ${ref('approval_routes', false)},
  step_no int not null,
  name varchar(100) not null,
  role_code ${ref('roles')},
  user_id ${fk('users')},
  min_approvals int check (min_approvals >= 1), -- approvals needed from the role; empty = everyone eligible
  sla_days int not null default 3,
  ${HARD_COLS},
  unique (route_code, step_no),
  check ((role_code is null) <> (user_id is null))
);

-- Approved copy per product × country × language: the reference for the "beda vs teks master" check.
create table if not exists master_texts (
  id serial primary key,
  product_id ${fk('products', false)},
  country_id ${fk('countries', false)},
  language ${ref('languages', false)},
  text text not null,
  note varchar(255),
  ${SOFT_COLS}
);
create unique index if not exists master_texts_identity on master_texts (product_id, country_id, language) where deleted_at is null;

-- Words that are never reported as typos (brand names, ingredients, regulatory terms). language/brand null = all.
create table if not exists glossary_terms (
  id serial primary key,
  term varchar(200) not null,
  language ${ref('languages')},
  brand ${ref('brands')},
  note varchar(255),
  is_active boolean not null default true,
  ${HARD_COLS}
);
create unique index if not exists glossary_terms_identity on glossary_terms (lower(term), coalesce(language, ''), coalesce(brand, ''));

-- Mandatory elements per country: the label must contain a match of the (case-insensitive) regex.
create table if not exists country_rules (
  id serial primary key,
  name varchar(150) not null,
  country_id ${fk('countries', false)},
  label_type ${ref('label_types')},
  pattern text not null,
  severity ${ref('severities', false)},
  is_active boolean not null default true,
  ${HARD_COLS}
);

-- Artwork files live on disk (STORAGE_DIR, shared with the OCR worker); this table keeps metadata only.
create table if not exists files (
  id serial primary key,
  name varchar(255) not null,
  mime varchar(100) not null,
  size bigint not null,
  path varchar(255) not null,
  sha256 char(64) not null,
  created_by ${fk('users')},
  created_at timestamptz not null default now()
);

-- ===================================================================== transactions
create table if not exists labels (
  id serial primary key,
  code varchar(60) not null unique,
  name varchar(200) not null,
  product_id ${fk('products', false)},
  country_id ${fk('countries', false)},
  label_type ${ref('label_types', false)},
  plant ${ref('plants', false)},
  languages text[] not null,
  status ${ref('workflow_states', false)},
  current_version int not null default 0,
  round int not null default 0, -- approval round, +1 on every submit
  current_step int,
  route_code ${ref('approval_routes')},
  submitted_by ${fk('users')},
  created_by ${fk('users')},
  ${SOFT_COLS}
);
create index if not exists labels_filter on labels (plant, status) where deleted_at is null;

create table if not exists label_versions (
  id serial primary key,
  label_id ${fk('labels', false)},
  version int not null,
  file_id ${fk('files', false)},
  note text,
  ocr_status varchar(10) not null default 'queued' check (ocr_status in ('queued', 'running', 'done', 'failed')),
  ocr_error text,
  ocr_started_at timestamptz,
  ocr_finished_at timestamptz,
  locked_at timestamptz, -- set when the label is approved: this exact file is the approved artwork
  created_by ${fk('users')},
  created_at timestamptz not null default now(),
  unique (label_id, version)
);
create index if not exists label_versions_queue on label_versions (id) where ocr_status = 'queued';

create table if not exists label_pages (
  version_id ${fk('label_versions', false)} on delete cascade,
  page_no int not null,
  image_path varchar(255) not null,
  width int not null,
  height int not null,
  primary key (version_id, page_no)
);

-- bbox = [x0, y0, x1, y1] in pixels of the rendered page image.
create table if not exists text_blocks (
  id bigserial primary key,
  version_id ${fk('label_versions', false)} on delete cascade,
  page_no int not null,
  seq int not null,
  text text not null,
  lang varchar(60),
  bbox real[] not null,
  confidence real not null,
  source varchar(10) not null check (source in ('text_layer', 'ocr'))
);
create index if not exists text_blocks_version on text_blocks (version_id, page_no, seq);

create table if not exists findings (
  id bigserial primary key,
  version_id ${fk('label_versions', false)} on delete cascade,
  check_type ${ref('check_types', false)},
  severity ${ref('severities', false)},
  page_no int,
  bbox real[],
  found text,
  expected text,
  message text not null,
  lang varchar(60),
  resolution ${ref('finding_resolutions', false)},
  resolved_by ${fk('users')},
  resolved_at timestamptz,
  note text
);
create index if not exists findings_version on findings (version_id);

-- Training data for our own OCR model: page crop (version + page + bbox) and the correct text.
create table if not exists ocr_corrections (
  id serial primary key,
  version_id ${fk('label_versions', false)},
  page_no int not null,
  bbox real[] not null,
  lang varchar(60),
  wrong_text text not null,
  correct_text text not null,
  user_id ${fk('users', false)},
  created_at timestamptz not null default now(),
  unique (version_id, page_no, bbox) -- one correction per word: saving again replaces it
);

-- Snapshot of the matched route, per approval round.
create table if not exists label_approval_steps (
  id serial primary key,
  label_id ${fk('labels', false)},
  round int not null,
  step_no int not null,
  name varchar(100) not null,
  role_code ${ref('roles')},
  user_id ${fk('users')},
  required int not null default 1, -- approvals needed in this round (min_approvals capped by the eligible users at submit)
  sla_days int not null,
  status varchar(10) not null default 'pending' check (status in ('pending', 'approved', 'returned', 'rejected')),
  started_at timestamptz,
  completed_at timestamptz,
  unique (label_id, round, step_no)
);

create table if not exists approval_histories (
  id serial primary key,
  label_id ${fk('labels', false)},
  version_id ${fk('label_versions')},
  round int,
  step_no int,
  action ${ref('history_actions', false)},
  from_status ${ref('workflow_states')},
  to_status ${ref('workflow_states', false)},
  user_id ${fk('users', false)},
  role ${ref('roles', false)},
  note text,
  signed boolean not null default false, -- electronic signature: the actor re-entered their password for this decision
  created_at timestamptz not null default now()
);
create index if not exists approval_histories_label on approval_histories (label_id);
`

const SEARCH: Record<string, string[]> = {
  users: ['employee_code', 'name', 'email'],
  labels: ['code', 'name'],
}
const searchColumn = (t: string, cols: string[]) =>
  `alter table ${t} add column if not exists search_text text generated always as (${cols.map((c) => `coalesce(${c}, '')`).join(` || ' ' || `)}) stored`

const BTREE: [string, string][] = [
  ['labels', 'updated_at desc'],
  ['approval_histories', 'created_at desc'],
  ['label_approval_steps', 'label_id, round, status'],
  ['list_fields', 'resource, sort_order'],
]

// ------------------------------------------------------------------ labels (column comments → admin UI)
const LABELS: Record<string, Record<string, string>> = {
  _master: { code: 'Kode', name: 'Nama', sort_order: 'Urutan', is_active: 'Aktif' },
  plants: { site_code: 'Site' },
  roles: { permissions: 'Hak akses' },
  languages: { ocr_lang: 'Model OCR (kode PaddleOCR)', dictionary: 'Kamus Hunspell (nama file)' },
  file_types: { code: 'Ekstensi file', mime: 'Tipe MIME' },
  severities: { tone: 'Warna', sort_order: 'Urutan (kecil = paling berat)' },
  check_types: { severity: 'Tingkat temuan', description: 'Keterangan', is_active: 'Aktif (dijalankan worker)' },
  finding_resolutions: { kind: 'Jenis (open / blocking / cleared)', tone: 'Warna' },
  history_actions: { icon: 'Ikon (lucide)', tone: 'Warna' },
  workflow_states: { kind: 'Jenis status (tetap)', tone: 'Warna' },
  approval_routes: { sort_order: 'Prioritas (kecil = didahulukan)', country_id: 'Negara (kosong = semua)', brand: 'Brand (kosong = semua)', label_type: 'Tipe label (kosong = semua)', plant: 'Plant (kosong = semua)' },
  list_resources: { default_sort: 'Urutan default (key)', default_dir: 'Arah urutan', page_size: 'Baris per halaman', search_refs: 'Kolom pencarian' },
  menus: { group_name: 'Grup menu', path: 'Alamat halaman', icon: 'Ikon (lucide)', permission: 'Hak akses yang dibutuhkan', badge: 'Badge', expand_shortcuts: 'Pintasan (tidak dipakai)' },
  settings: { key: 'Kunci', value: 'Nilai', value_type: 'Tipe', description: 'Keterangan' },
  list_fields: {
    resource: 'Daftar',
    key: 'Kunci',
    label: 'Label',
    column_ref: 'Kolom SQL',
    show_in_table: 'Tampil di tabel',
    sortable: 'Bisa diurutkan',
    filter_type: 'Jenis filter',
    filter_source: 'Sumber opsi filter',
    null_label: 'Label untuk nilai kosong',
    filter_primary: 'Filter utama',
    sort_order: 'Urutan',
    is_active: 'Aktif',
  },
  approval_route_steps: { route_code: 'Rute', step_no: 'Tahap ke-', name: 'Nama tahap', role_code: 'Role approver', user_id: 'Atau user tertentu', min_approvals: 'Jumlah persetujuan minimal (kosong = semua yang berhak)', sla_days: 'SLA (hari)' },
  master_texts: { product_id: 'Produk', country_id: 'Negara', language: 'Bahasa', text: 'Teks master (yang sudah disetujui)', note: 'Catatan' },
  glossary_terms: { term: 'Istilah', language: 'Bahasa (kosong = semua)', brand: 'Brand (kosong = semua)', note: 'Catatan', is_active: 'Aktif' },
  country_rules: { name: 'Nama elemen wajib', country_id: 'Negara', label_type: 'Tipe label (kosong = semua)', pattern: 'Pola teks (regex, tidak peka huruf besar/kecil)', severity: 'Tingkat', is_active: 'Aktif' },
  departments: { code: 'Kode', name: 'Nama', section: 'Section' },
  countries: { code: 'Kode ISO', name: 'Nama' },
  products: { code: 'Kode produk / SKU', name: 'Nama produk', brand: 'Brand' },
}
const MASTER_TABLES = ['sites', 'plants', 'roles', 'brands', 'label_types', 'languages', 'file_types', 'severities', 'check_types', 'finding_resolutions', 'history_actions', 'workflow_states', 'approval_routes', 'list_resources', 'menus']
const comments = () => {
  const out: string[] = []
  const lit = (s: string) => `'${s.replace(/'/g, "''")}'`
  for (const t of MASTER_TABLES) for (const [c, l] of Object.entries({ ...LABELS._master, ...(LABELS[t] ?? {}) })) out.push(`comment on column ${t}.${c} is ${lit(l)}`)
  for (const [t, cols] of Object.entries(LABELS)) if (!t.startsWith('_') && !MASTER_TABLES.includes(t)) for (const [c, l] of Object.entries(cols)) out.push(`comment on column ${t}.${c} is ${lit(l)}`)
  return out
}

const indexes = () => [
  'create extension if not exists pg_trgm',
  ...Object.entries(SEARCH).flatMap(([t, cols]) => [searchColumn(t, cols), `create index if not exists ${t}_search_trgm on ${t} using gin (search_text gin_trgm_ops)`]),
  ...BTREE.map(([t, cols]) => `create index if not exists ${t}_${cols.replace(/\W+/g, '_').replace(/_+$/, '')}_idx on ${t} (${cols})`),
]

export async function migrate() {
  await pool.query(schema)
  for (const q of [...indexes(), ...comments()]) await pool.query(q)
}

/** Development only: drops every table so the schema above is recreated from scratch. */
export async function resetSchema() {
  await pool.query('drop schema public cascade; create schema public;')
}

if (import.meta.main) {
  if (process.argv.includes('--reset')) {
    if (process.env.NODE_ENV === 'production') throw new Error('Refusing to reset a production database')
    await resetSchema()
  }
  await migrate()
  console.log('Migration done')
  await pool.end()
}
