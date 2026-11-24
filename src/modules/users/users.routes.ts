import { Hono } from 'hono'
import { requirePermission, type Env } from '../../core/auth.ts'
import { db } from '../../core/database.ts'
import { UserController } from './users.controller.ts'
import { UserRepository } from './users.repository.ts'
import { UserService } from './users.service.ts'

const controller = new UserController(new UserService(new UserRepository(db)))

// Admin only.
export const usersRoutes = new Hono<Env>()
  .use(requirePermission('admin'))
  .get('/', controller.list)
  .get('/options', controller.options)
  .get('/:id', controller.get)
  .post('/', controller.create)
  .put('/:id', controller.update)
  .delete('/:id', controller.remove)
