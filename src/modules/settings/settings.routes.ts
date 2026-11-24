import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { SettingController } from './settings.controller.ts'
import { SettingRepository } from './settings.repository.ts'
import { SettingService } from './settings.service.ts'

export const settingsRoutes = crudRoutes(new SettingController(new SettingService(new SettingRepository(db))))
