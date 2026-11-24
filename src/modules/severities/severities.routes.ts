import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { SeverityController } from './severities.controller.ts'
import { SeverityRepository } from './severities.repository.ts'
import { SeverityService } from './severities.service.ts'

export const severitiesRoutes = crudRoutes(new SeverityController(new SeverityService(new SeverityRepository(db))))
