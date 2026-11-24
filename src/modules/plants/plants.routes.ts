import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { PlantController } from './plants.controller.ts'
import { PlantRepository } from './plants.repository.ts'
import { PlantService } from './plants.service.ts'

export const plantsRoutes = crudRoutes(new PlantController(new PlantService(new PlantRepository(db))))
