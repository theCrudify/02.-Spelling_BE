import { Hono } from 'hono'
import type { Env } from '../../core/auth.ts'
import { db } from '../../core/database.ts'
import { MetaController } from './meta.controller.ts'
import { MetaRepository } from './meta.repository.ts'
import { MetaService } from './meta.service.ts'

export const metaRoutes = new Hono<Env>().get('/', new MetaController(new MetaService(new MetaRepository(db))).all)
