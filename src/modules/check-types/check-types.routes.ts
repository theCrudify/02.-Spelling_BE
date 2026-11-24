import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { CheckTypeController } from './check-types.controller.ts'
import { CheckTypeRepository } from './check-types.repository.ts'
import { CheckTypeService } from './check-types.service.ts'

export const checkTypesRoutes = crudRoutes(new CheckTypeController(new CheckTypeService(new CheckTypeRepository(db))))
