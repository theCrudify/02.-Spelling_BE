import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { ListResourceController } from './list-resources.controller.ts'
import { ListResourceRepository } from './list-resources.repository.ts'
import { ListResourceService } from './list-resources.service.ts'

export const listResourcesRoutes = crudRoutes(new ListResourceController(new ListResourceService(new ListResourceRepository(db))))
