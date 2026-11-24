import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { LanguageController } from './languages.controller.ts'
import { LanguageRepository } from './languages.repository.ts'
import { LanguageService } from './languages.service.ts'

export const languagesRoutes = crudRoutes(new LanguageController(new LanguageService(new LanguageRepository(db))))
