import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { GlossaryTermController } from './glossary-terms.controller.ts'
import { GlossaryTermRepository } from './glossary-terms.repository.ts'
import { GlossaryTermService } from './glossary-terms.service.ts'

export const glossaryTermsRoutes = crudRoutes(new GlossaryTermController(new GlossaryTermService(new GlossaryTermRepository(db))), 'label.review') // checkers maintain the checking references
