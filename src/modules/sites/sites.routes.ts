import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { SiteController } from './sites.controller.ts'
import { SiteRepository } from './sites.repository.ts'
import { SiteService } from './sites.service.ts'

export const sitesRoutes = crudRoutes(new SiteController(new SiteService(new SiteRepository(db))))
