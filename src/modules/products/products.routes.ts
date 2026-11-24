import { db } from '../../core/database.ts'
import { crudRoutes } from '../../core/crud.ts'
import { ProductController } from './products.controller.ts'
import { ProductRepository } from './products.repository.ts'
import { ProductService } from './products.service.ts'

export const productsRoutes = crudRoutes(new ProductController(new ProductService(new ProductRepository(db))))
