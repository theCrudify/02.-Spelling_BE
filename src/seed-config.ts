// Default configuration rows. Everything here can be changed later from the admin screens (it lives in the database).

const row = (i: number, r: Record<string, unknown>) => ({ id: i + 1, sort_order: (i + 1) * 10, is_active: true, ...r })

export const settings = [
  ['file_max_mb', '200', 'number', 'Ukuran maksimal satu file artwork (MB)'],
  ['ocr_min_confidence', '0.80', 'number', 'Hasil OCR di bawah nilai ini ditandai "cek manual" (0–1)'],
  ['render_dpi', '200', 'number', 'Resolusi render halaman PDF/AI untuk OCR & viewer (dpi)'],
  ['ocr_rotations', 'true', 'boolean', 'OCR juga membaca teks yang diputar 90°/180°/270° (4× lebih lama)'],
  ['ocr_stale_minutes', '30', 'number', 'Job OCR yang berjalan lebih lama dari ini dianggap macet dan diulang'],
  ['admin_can_approve', 'true', 'boolean', 'Administrator boleh memutuskan tahap approval mana pun (kecuali label yang diajukannya sendiri)'],
  ['ocr_detection_model', 'PP-OCRv5_mobile_det', 'text', 'Model deteksi teks PaddleOCR (mobile = ringan untuk CPU, server = lebih teliti)'],
  ['worker_poll_seconds', '2', 'number', 'Jeda worker OCR memeriksa antrian saat kosong (detik)'],
  ['master_diff_similarity', '0.6', 'number', 'Beda vs master: kemiripan minimal (0–1) agar kata salah dipasangkan dengan kata master sebagai saran'],
  ['glossary_similarity', '0.8', 'number', 'Glossary: kemiripan minimal (0–1) agar kata dianggap mirip istilah glossary'],
  ['glossary_min_length', '4', 'number', 'Glossary: panjang kata minimal yang dicek kemiripannya'],
  ['spelling_min_length', '2', 'number', 'Salah ketik: panjang kata minimal yang dicek ke kamus'],
  ['language_min_letters', '20', 'number', 'Bahasa tak terdaftar: jumlah huruf minimal dalam satu baris agar dinilai'],
  ['language_min_confidence', '0.7', 'number', 'Bahasa tak terdaftar: keyakinan minimal (0–1) terhadap bahasa yang terdeteksi'],
  ['language_max_declared_confidence', '0.15', 'number', 'Bahasa tak terdaftar: keyakinan maksimal (0–1) terhadap bahasa yang terdaftar di label'],
  ['session_hours', '8', 'number', 'Lama sesi login (jam)'],
  ['login_max_fails', '5', 'number', 'Jumlah gagal login sebelum akun dikunci sementara'],
  ['login_lock_minutes', '15', 'number', 'Lama kunci setelah terlalu banyak gagal login (menit)'],
  ['password_min_length', '8', 'number', 'Panjang minimal password baru'],
  ['password_require_letter_digit', 'true', 'boolean', 'Password baru wajib mengandung huruf dan angka'],
  ['csv_max_rows', '5000', 'number', 'Import CSV: jumlah baris maksimal per file'],
  ['csv_max_mb', '5', 'number', 'Import CSV: ukuran file maksimal (MB)'],
  ['dashboard_trend_months', '6', 'number', 'Dashboard: jumlah bulan pada grafik tren'],
  ['list_max_page_size', '100', 'number', 'Batas maksimal baris per halaman pada semua daftar'],
  ['search_max_terms', '5', 'number', 'Jumlah kata maksimal yang dipakai pencarian'],
  ['task_queue_oldest_first', 'true', 'boolean', 'Task List diurutkan dari label yang paling lama menunggu'],
].map(([key, value, value_type, description], i) => ({ id: i + 1, key, value, value_type, description }))

// ------------------------------------------------------------------ lists
type F = [key: string, label: string, column: string, opts?: { show?: boolean; sort?: boolean; filter?: string; source?: string; nullLabel?: string; primary?: boolean }]
type R = { code: string; name: string; sort: string; dir: 'asc' | 'desc'; search: string[]; fields: F[]; pageSize?: number }

const ACTIVE: F = ['is_active', 'Aktif', 't.is_active', { filter: 'values', source: 'true:Aktif|false:Nonaktif' }]
const master = (code: string, name: string, extra: F[] = []): R => ({
  code,
  name,
  sort: 'sort_order',
  dir: 'asc',
  search: ['t.code', 't.name'],
  fields: [['code', 'Kode', 't.code'], ['name', 'Nama', 't.name'], ...extra, ['sort_order', 'Urutan', 't.sort_order'], ACTIVE, ['updated_at', 'Diperbarui', 't.updated_at', { show: false }]],
})
const soft = (code: string, name: string, extra: F[] = [], search = ['t.code', 't.name']): R => ({
  code,
  name,
  sort: 'name',
  dir: 'asc',
  search,
  fields: [['code', 'Kode', 't.code'], ['name', 'Nama', 't.name'], ...extra, ['updated_at', 'Diperbarui', 't.updated_at']],
})

const RESOURCES: R[] = [
  {
    code: 'labels',
    name: 'Label kemasan',
    sort: 'updated_at',
    dir: 'desc',
    search: ['t.search_text', 'p.name', 'p.code'],
    pageSize: 25,
    fields: [
      ['code', 'Label', 't.code'],
      ['country', 'Negara', 'c.name'],
      ['label_type', 'Tipe', 't.label_type', { filter: 'master', source: 'label_types', primary: true }],
      ['current_version', 'Versi', 't.current_version'],
      ['open_findings', 'Temuan terbuka', 'open_findings', { sort: false }],
      ['status', 'Status', 't.status', { filter: 'master', source: 'workflow_states', primary: true }],
      ['updated_at', 'Diperbarui', 't.updated_at'],
      ['country_id', 'Negara', 't.country_id', { show: false, sort: false, filter: 'relation', source: 'countries', primary: true }],
      ['brand', 'Brand', 'p.brand', { show: false, sort: false, filter: 'master', source: 'brands', primary: true }],
      ['plant', 'Plant', 't.plant', { show: false, filter: 'master', source: 'plants' }],
      ['created_at', 'Dibuat', 't.created_at', { show: false }],
    ],
  },
  {
    code: 'users',
    name: 'Users & role',
    sort: 'name',
    dir: 'asc',
    search: ['t.search_text', 'd.name'],
    fields: [
      ['employee_code', 'NIK', 't.employee_code'],
      ['name', 'Nama', 't.name'],
      ['role', 'Role', 't.role', { filter: 'master', source: 'roles', primary: true }],
      ['department', 'Departemen', 'd.name'],
      ['site', 'Site', 't.site', { filter: 'master', source: 'sites', nullLabel: 'Semua site', primary: true }],
      ['is_active', 'Status', 't.is_active', { filter: 'values', source: 'true:Aktif|false:Nonaktif', primary: true }],
      ['department_id', 'Departemen', 't.department_id', { show: false, sort: false, filter: 'relation', source: 'departments' }],
    ],
  },
  // ---- label content references
  {
    code: 'master_texts',
    name: 'Teks master',
    sort: 'updated_at',
    dir: 'desc',
    search: ['t.text', 't.note'],
    fields: [
      ['product_id', 'Produk', 't.product_id', { filter: 'relation', source: 'products', primary: true }],
      ['country_id', 'Negara', 't.country_id', { filter: 'relation', source: 'countries', primary: true }],
      ['language', 'Bahasa', 't.language', { filter: 'master', source: 'languages', primary: true }],
      ['text', 'Teks', 't.text', { sort: false }],
      ['updated_at', 'Diperbarui', 't.updated_at'],
    ],
  },
  {
    code: 'glossary_terms',
    name: 'Glossary',
    sort: 'term',
    dir: 'asc',
    search: ['t.term', 't.note'],
    pageSize: 25,
    fields: [
      ['term', 'Istilah', 't.term'],
      ['language', 'Bahasa', 't.language', { filter: 'master', source: 'languages', nullLabel: 'Semua bahasa', primary: true }],
      ['brand', 'Brand', 't.brand', { filter: 'master', source: 'brands', nullLabel: 'Semua brand', primary: true }],
      ['note', 'Catatan', 't.note', { sort: false }],
      ACTIVE,
    ],
  },
  {
    code: 'country_rules',
    name: 'Elemen wajib per negara',
    sort: 'name',
    dir: 'asc',
    search: ['t.name', 't.pattern'],
    fields: [
      ['name', 'Nama', 't.name'],
      ['country_id', 'Negara', 't.country_id', { filter: 'relation', source: 'countries', primary: true }],
      ['label_type', 'Tipe label', 't.label_type', { filter: 'master', source: 'label_types', nullLabel: 'Semua tipe' }],
      ['pattern', 'Pola (regex)', 't.pattern', { sort: false }],
      ['severity', 'Tingkat', 't.severity', { filter: 'master', source: 'severities' }],
      ACTIVE,
    ],
  },
  // ---- approval routing
  master('approval_routes', 'Rute approval', [
    ['country_id', 'Negara', 't.country_id', { filter: 'relation', source: 'countries', nullLabel: 'Semua negara', primary: true }],
    ['brand', 'Brand', 't.brand', { filter: 'master', source: 'brands', nullLabel: 'Semua brand' }],
    ['label_type', 'Tipe label', 't.label_type', { filter: 'master', source: 'label_types', nullLabel: 'Semua tipe' }],
    ['plant', 'Plant', 't.plant', { filter: 'master', source: 'plants', nullLabel: 'Semua plant' }],
  ]),
  {
    code: 'approval_route_steps',
    name: 'Tahap rute approval',
    sort: 'route_code',
    dir: 'asc',
    search: ['t.name', 't.route_code'],
    pageSize: 25,
    fields: [
      ['route_code', 'Rute', 't.route_code', { filter: 'master', source: 'approval_routes', primary: true }],
      ['step_no', 'Tahap', 't.step_no'],
      ['name', 'Nama tahap', 't.name'],
      ['role_code', 'Role', 't.role_code', { filter: 'master', source: 'roles' }],
      ['user_id', 'User', 't.user_id'],
      ['min_approvals', 'Persetujuan minimal', 't.min_approvals'],
      ['sla_days', 'SLA (hari)', 't.sla_days'],
    ],
  },
  // ---- reference data
  soft('departments', 'Departemen', [['section', 'Section', 't.section']], ['t.code', 't.name', 't.section']),
  soft('countries', 'Negara'),
  soft('products', 'Produk', [['brand', 'Brand', 't.brand', { filter: 'master', source: 'brands', primary: true }]]),
  // ---- business masters
  master('brands', 'Brand'),
  master('label_types', 'Tipe label'),
  master('languages', 'Bahasa', [['ocr_lang', 'Model OCR', 't.ocr_lang'], ['dictionary', 'Kamus', 't.dictionary']]),
  master('file_types', 'Tipe file artwork', [['mime', 'MIME', 't.mime']]),
  master('severities', 'Tingkat temuan', [['tone', 'Warna', 't.tone']]),
  master('check_types', 'Jenis pengecekan', [['severity', 'Tingkat', 't.severity', { filter: 'master', source: 'severities', primary: true }], ['description', 'Keterangan', 't.description', { sort: false }]]),
  master('finding_resolutions', 'Hasil review temuan', [['kind', 'Jenis', 't.kind'], ['tone', 'Warna', 't.tone']]),
  master('history_actions', 'Aksi riwayat', [['icon', 'Ikon', 't.icon'], ['tone', 'Warna', 't.tone']]),
  master('sites', 'Site'),
  master('plants', 'Plant', [['site_code', 'Site', 't.site_code', { filter: 'master', source: 'sites', primary: true }]]),
  master('roles', 'Role & hak akses'),
  master('workflow_states', 'Status label', [['kind', 'Jenis', 't.kind'], ['tone', 'Warna', 't.tone']]),
  // ---- configuration
  master('list_resources', 'Daftar (list)', [['default_sort', 'Urutan default', 't.default_sort'], ['page_size', 'Baris', 't.page_size']]),
  master('menus', 'Menu navigasi', [['group_name', 'Grup', 't.group_name'], ['path', 'Alamat', 't.path'], ['permission', 'Hak akses', 't.permission']]),
  {
    code: 'list_fields',
    name: 'Kolom & filter daftar',
    sort: 'resource',
    dir: 'asc',
    search: ['t.key', 't.label', 't.column_ref'],
    fields: [
      ['resource', 'Daftar', 't.resource', { filter: 'master', source: 'list_resources', primary: true }],
      ['key', 'Kunci', 't.key'],
      ['label', 'Label', 't.label'],
      ['column_ref', 'Kolom SQL', 't.column_ref'],
      ['filter_type', 'Filter', 't.filter_type', { filter: 'values', source: 'master:Master|relation:Relasi|site:Site|values:Nilai tetap|year:Tahun', primary: true }],
      ['sort_order', 'Urutan', 't.sort_order'],
      ['is_active', 'Aktif', 't.is_active', { filter: 'values', source: 'true:Aktif|false:Nonaktif' }],
    ],
  },
  {
    code: 'settings',
    name: 'Pengaturan',
    sort: 'key',
    dir: 'asc',
    search: ['t.key', 't.description'],
    fields: [
      ['key', 'Kunci', 't.key'],
      ['value', 'Nilai', 't.value'],
      ['value_type', 'Tipe', 't.value_type', { filter: 'values', source: 'number:Angka|text:Teks|list:Daftar|boolean:Ya/Tidak' }],
      ['description', 'Keterangan', 't.description', { sort: false }],
    ],
  },
]

export const listResources = RESOURCES.map((r, i) => row(i, { code: r.code, name: r.name, default_sort: r.sort, default_dir: r.dir, page_size: r.pageSize ?? 10, search_refs: r.search }))
export const listFields = RESOURCES.flatMap((r) =>
  r.fields.map(([key, label, column_ref, o = {}], i) => ({
    resource: r.code,
    key,
    label,
    column_ref,
    show_in_table: o.show ?? true,
    sortable: o.sort ?? true,
    filter_type: o.filter ?? null,
    filter_source: o.source ?? null,
    null_label: o.nullLabel ?? null,
    filter_primary: o.primary ?? false,
    sort_order: (i + 1) * 10,
    is_active: true,
  })),
).map((f, i) => ({ id: i + 1, ...f }))

// ------------------------------------------------------------------ navigation
const CHECK_PAGES: [string, string, string][] = [
  ['check_types', 'Jenis pengecekan', 'list-filter'],
  ['severities', 'Tingkat temuan', 'signal'],
  ['finding_resolutions', 'Hasil review temuan', 'circle-check'],
]
const CONTENT_PAGES: [string, string, string][] = [
  ['master_texts', 'Teks master', 'file-text'],
  ['glossary_terms', 'Glossary', 'book-a'],
  ['country_rules', 'Elemen wajib negara', 'list-checks'],
]
const ROUTING_PAGES: [string, string, string][] = [
  ['approval_routes', 'Rute approval', 'git-branch'],
  ['approval_route_steps', 'Tahap rute', 'list-ordered'],
]
const ADMIN_PAGES: [string, string, string][] = [
  ['products', 'Produk', 'package'],
  ['brands', 'Brand', 'tag'],
  ['countries', 'Negara', 'flag'],
  ['languages', 'Bahasa & OCR', 'languages'],
  ['label_types', 'Tipe label', 'sticker'],
  ['file_types', 'Tipe file artwork', 'file-type'],
  ['departments', 'Departemen', 'building-2'],
  ['sites', 'Site', 'map-pin'],
  ['plants', 'Plant', 'warehouse'],
]
const CONFIG_PAGES: [string, string, string][] = [
  ['roles', 'Role & hak akses', 'shield-check'],
  ['workflow_states', 'Status label', 'circle-dot'],
  ['history_actions', 'Aksi riwayat', 'history'],
  ['list_resources', 'Daftar', 'table-2'],
  ['list_fields', 'Kolom & filter', 'columns-3'],
  ['menus', 'Menu', 'panel-left'],
  ['settings', 'Pengaturan', 'settings-2'],
]
type M = [code: string, name: string, group: string | null, path: string, icon: string, permission?: string | null, badge?: string | null]
const MENUS: M[] = [
  ['home', 'Ringkasan', null, '/', 'layout-grid'],
  ['tasks', 'Task List', null, '/labels?scope=tasks', 'inbox', null, 'tasks'],
  ['labels', 'Semua label', null, '/labels', 'scan-text'],
  ['new_label', 'Label baru', null, '/labels/new', 'upload', 'label.edit'],
  ...CONTENT_PAGES.map(([code, name, icon]): M => [`admin_${code}`, name, 'Referensi pengecekan', `/admin/${code}`, icon, 'label.review']),
  ...CHECK_PAGES.map(([code, name, icon]): M => [`admin_${code}`, name, 'Aturan pengecekan', `/admin/${code}`, icon, 'admin']),
  ...ROUTING_PAGES.map(([code, name, icon]): M => [`admin_${code}`, name, 'Approval', `/admin/${code}`, icon, 'admin']),
  ['users', 'Users', 'Master data', '/users', 'users', 'admin'],
  ...ADMIN_PAGES.map(([code, name, icon]): M => [`admin_${code}`, name, 'Master data', `/admin/${code}`, icon, 'admin']),
  ...CONFIG_PAGES.map(([code, name, icon]): M => [`admin_${code}`, name, 'Konfigurasi', `/admin/${code}`, icon, 'admin']),
]
export const menus = MENUS.map(([code, name, group_name, path, icon, permission = null, badge = null], i) => row(i, { code, name, group_name, path, icon, permission, badge, expand_shortcuts: false }))
