import { CrudController } from '../../core/crud.ts'
import { GlossaryTermDto, type GlossaryTermInput } from './glossary-terms.dto.ts'
import type { GlossaryTermService } from './glossary-terms.service.ts'

export class GlossaryTermController extends CrudController<GlossaryTermInput> {
  constructor(service: GlossaryTermService) {
    super(service, GlossaryTermDto)
  }
}
