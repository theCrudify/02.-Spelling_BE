import { Hono } from 'hono'
import type { Env } from '../../core/auth.ts'
import { db } from '../../core/database.ts'
import { FileController } from './files.controller.ts'
import { FileRepository } from './files.repository.ts'
import { FileService } from './files.service.ts'

/** Shared instance: other modules store their attachments through it. */
export const fileService = new FileService(new FileRepository(db))

export const filesRoutes = new Hono<Env>().get('/:id', new FileController(fileService).download)
