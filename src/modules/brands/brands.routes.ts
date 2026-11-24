import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { BrandController } from './brands.controller.ts'
import { BrandRepository } from './brands.repository.ts'
import { BrandService } from './brands.service.ts'

export const brandsRoutes = crudRoutes(new BrandController(new BrandService(new BrandRepository(db))))
