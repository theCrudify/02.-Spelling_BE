import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { FileTypeController } from './file-types.controller.ts'
import { FileTypeRepository } from './file-types.repository.ts'
import { FileTypeService } from './file-types.service.ts'

export const fileTypesRoutes = crudRoutes(new FileTypeController(new FileTypeService(new FileTypeRepository(db))))
