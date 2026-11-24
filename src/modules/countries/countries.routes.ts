import { db } from '../../core/database.ts'
import { crudRoutes } from '../../core/crud.ts'
import { CountryController } from './countries.controller.ts'
import { CountryRepository } from './countries.repository.ts'
import { CountryService } from './countries.service.ts'

export const countriesRoutes = crudRoutes(new CountryController(new CountryService(new CountryRepository(db))))
