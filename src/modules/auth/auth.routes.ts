import { Hono } from 'hono'
import { requireAuth, type Env } from '../../core/auth.ts'
import { db } from '../../core/database.ts'
import { AuthController } from './auth.controller.ts'
import { AuthRepository } from './auth.repository.ts'
import { AuthService } from './auth.service.ts'

const controller = new AuthController(new AuthService(new AuthRepository(db)))

export const authRoutes = new Hono<Env>()
  .post('/login', controller.login)
  .get('/me', requireAuth, controller.me)
  .post('/change-password', requireAuth, controller.changePassword)
