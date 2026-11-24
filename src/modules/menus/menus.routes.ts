import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { MenuController } from './menus.controller.ts'
import { MenuRepository } from './menus.repository.ts'
import { MenuService } from './menus.service.ts'

export const menusRoutes = crudRoutes(new MenuController(new MenuService(new MenuRepository(db))))
