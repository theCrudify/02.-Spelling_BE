import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { MasterTextController } from './master-texts.controller.ts'
import { MasterTextRepository } from './master-texts.repository.ts'
import { MasterTextService } from './master-texts.service.ts'

export const masterTextsRoutes = crudRoutes(new MasterTextController(new MasterTextService(new MasterTextRepository(db))), 'label.review') // checkers maintain the checking references
