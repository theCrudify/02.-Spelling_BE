import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { z } from 'zod'
import { requireAuth, type Env } from './core/auth.ts'
import { masters } from './core/masters.ts'
import { approvalRouteStepsRoutes } from './modules/approval-route-steps/approval-route-steps.routes.ts'
import { approvalRoutesRoutes } from './modules/approval-routes/approval-routes.routes.ts'
import { authRoutes } from './modules/auth/auth.routes.ts'
import { brandsRoutes } from './modules/brands/brands.routes.ts'
import { countriesRoutes } from './modules/countries/countries.routes.ts'
import { countryRulesRoutes } from './modules/country-rules/country-rules.routes.ts'
import { departmentsRoutes } from './modules/departments/departments.routes.ts'
import { checkTypesRoutes } from './modules/check-types/check-types.routes.ts'
import { fileTypesRoutes } from './modules/file-types/file-types.routes.ts'
import { findingResolutionsRoutes } from './modules/finding-resolutions/finding-resolutions.routes.ts'
import { historyActionsRoutes } from './modules/history-actions/history-actions.routes.ts'
import { severitiesRoutes } from './modules/severities/severities.routes.ts'
import { filesRoutes } from './modules/files/files.routes.ts'
import { glossaryTermsRoutes } from './modules/glossary-terms/glossary-terms.routes.ts'
import { labelTypesRoutes } from './modules/label-types/label-types.routes.ts'
import { labelsRoutes } from './modules/labels/labels.routes.ts'
import { languagesRoutes } from './modules/languages/languages.routes.ts'
import { listFieldsRoutes } from './modules/list-fields/list-fields.routes.ts'
import { listResourcesRoutes } from './modules/list-resources/list-resources.routes.ts'
import { masterTextsRoutes } from './modules/master-texts/master-texts.routes.ts'
import { menusRoutes } from './modules/menus/menus.routes.ts'
import { metaRoutes } from './modules/meta/meta.routes.ts'
import { plantsRoutes } from './modules/plants/plants.routes.ts'
import { productsRoutes } from './modules/products/products.routes.ts'
import { rolesRoutes } from './modules/roles/roles.routes.ts'
import { settingsRoutes } from './modules/settings/settings.routes.ts'
import { sitesRoutes } from './modules/sites/sites.routes.ts'
import { usersRoutes } from './modules/users/users.routes.ts'
import { workflowStatesRoutes } from './modules/workflow-states/workflow-states.routes.ts'

export const app = new Hono<Env>()

app.use(logger())
app.use(secureHeaders())
app.use('/api/*', cors({ origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','), credentials: true }))
// One artwork file (setting file_max_mb) + form fields.
app.use('/api/*', (c, next) => bodyLimit({ maxSize: (masters.number('file_max_mb', 200) + 10) * 1024 * 1024 })(c, next))

app.get('/', (c) => c.json({ name: 'Label Spelling API', status: 'ok' }))
app.get('/api/health', (c) => c.json({ status: 'ok' }))
app.route('/api/auth', authRoutes)

const api = new Hono<Env>()
api.use(requireAuth)
api.route('/meta', metaRoutes)
api.route('/labels', labelsRoutes)
api.route('/files', filesRoutes)
api.route('/users', usersRoutes)
api.route('/departments', departmentsRoutes)
api.route('/countries', countriesRoutes)
api.route('/products', productsRoutes)
// masters & configuration (generic admin pages)
api.route('/master-texts', masterTextsRoutes)
api.route('/glossary-terms', glossaryTermsRoutes)
api.route('/country-rules', countryRulesRoutes)
api.route('/approval-routes', approvalRoutesRoutes)
api.route('/approval-route-steps', approvalRouteStepsRoutes)
api.route('/brands', brandsRoutes)
api.route('/label-types', labelTypesRoutes)
api.route('/languages', languagesRoutes)
api.route('/file-types', fileTypesRoutes)
api.route('/severities', severitiesRoutes)
api.route('/check-types', checkTypesRoutes)
api.route('/finding-resolutions', findingResolutionsRoutes)
api.route('/history-actions', historyActionsRoutes)
api.route('/list-resources', listResourcesRoutes)
api.route('/list-fields', listFieldsRoutes)
api.route('/menus', menusRoutes)
api.route('/settings', settingsRoutes)
api.route('/sites', sitesRoutes)
api.route('/plants', plantsRoutes)
api.route('/roles', rolesRoutes)
api.route('/workflow-states', workflowStatesRoutes)
app.route('/api', api)

app.notFound((c) => c.json({ message: 'Endpoint tidak ditemukan' }, 404))

app.onError((err, c) => {
  if (err instanceof z.ZodError) {
    const { fieldErrors, formErrors } = z.flattenError(err)
    return c.json({ message: formErrors[0] ?? 'Data tidak valid, periksa kembali isian', errors: fieldErrors }, 422)
  }
  if (err instanceof HTTPException) return c.json({ message: err.message }, err.status)
  const code = (err as { code?: string }).code
  if (code === '23505') return c.json({ message: 'Data dengan kode / nomor tersebut sudah ada' }, 409)
  if (code === '23503') return c.json({ message: 'Data terkait tidak ditemukan atau masih dipakai' }, 409)
  // A list configuration (list_fields.column_ref / list_resources.search_refs) points to an unknown column.
  if (code === '42703' || code === '42P01') return c.json({ message: 'Konfigurasi daftar tidak valid: kolom tidak dikenal. Periksa List fields / List resources.' }, 422)
  console.error(err)
  return c.json({ message: 'Terjadi kesalahan pada server' }, 500)
})
