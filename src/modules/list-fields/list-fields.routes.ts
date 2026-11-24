import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { ListFieldController } from './list-fields.controller.ts'
import { ListFieldRepository } from './list-fields.repository.ts'
import { ListFieldService } from './list-fields.service.ts'

export const listFieldsRoutes = crudRoutes(new ListFieldController(new ListFieldService(new ListFieldRepository(db))))
