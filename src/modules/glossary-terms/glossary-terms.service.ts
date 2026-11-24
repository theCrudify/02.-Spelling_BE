import { CrudService } from '../../core/crud.ts'
import type { GlossaryTermInput } from './glossary-terms.dto.ts'
import type { GlossaryTermRepository } from './glossary-terms.repository.ts'

export class GlossaryTermService extends CrudService<GlossaryTermInput> {
  constructor(repo: GlossaryTermRepository) {
    super(repo, 'Istilah glossary')
  }
}
