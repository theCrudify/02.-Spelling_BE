import { Hono } from 'hono'
import { requirePermission, type Env } from '../../core/auth.ts'
import { db } from '../../core/database.ts'
import { fileService } from '../files/files.routes.ts'
import { LabelController } from './labels.controller.ts'
import { LabelRepository } from './labels.repository.ts'
import { LabelService } from './labels.service.ts'

const controller = new LabelController(new LabelService(new LabelRepository(db), fileService))
const edit = requirePermission('label.edit')
const review = requirePermission('label.review')

// Who may decide on an approval step is checked per step in LabelService (role or named user of the snapshot).
export const labelsRoutes = new Hono<Env>()
  .get('/', controller.list)
  .get('/summary', controller.summary)
  .post('/', edit, controller.create)
  .get('/:id', controller.detail)
  .get('/:id/pages/:versionId/:pageNo', controller.page)
  .post('/:id/versions', edit, controller.uploadVersion)
  .post('/:id/recheck', review, controller.recheck)
  .post('/:id/findings/:findingId', review, controller.resolveFinding)
  .post('/:id/submit', review, controller.submit)
  .post('/:id/approve', controller.approve)
  .post('/:id/revision', controller.requestRevision)
  .post('/:id/reject', controller.reject)
