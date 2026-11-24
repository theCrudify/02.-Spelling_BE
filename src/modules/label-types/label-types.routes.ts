import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { LabelTypeController } from './label-types.controller.ts'
import { LabelTypeRepository } from './label-types.repository.ts'
import { LabelTypeService } from './label-types.service.ts'

export const labelTypesRoutes = crudRoutes(new LabelTypeController(new LabelTypeService(new LabelTypeRepository(db))))
