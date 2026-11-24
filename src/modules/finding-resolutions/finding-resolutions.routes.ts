import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { FindingResolutionController } from './finding-resolutions.controller.ts'
import { FindingResolutionRepository } from './finding-resolutions.repository.ts'
import { FindingResolutionService } from './finding-resolutions.service.ts'

export const findingResolutionsRoutes = crudRoutes(new FindingResolutionController(new FindingResolutionService(new FindingResolutionRepository(db))))
