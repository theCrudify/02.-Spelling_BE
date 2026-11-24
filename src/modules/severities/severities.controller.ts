import { CrudController } from '../../core/crud.ts'
import { SeverityDto, type SeverityInput } from './severities.dto.ts'
import type { SeverityService } from './severities.service.ts'

export class SeverityController extends CrudController<SeverityInput> {
  constructor(service: SeverityService) {
    super(service, SeverityDto)
  }
}
