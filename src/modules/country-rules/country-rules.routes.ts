import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { CountryRuleController } from './country-rules.controller.ts'
import { CountryRuleRepository } from './country-rules.repository.ts'
import { CountryRuleService } from './country-rules.service.ts'

export const countryRulesRoutes = crudRoutes(new CountryRuleController(new CountryRuleService(new CountryRuleRepository(db))), 'label.review') // checkers maintain the checking references
