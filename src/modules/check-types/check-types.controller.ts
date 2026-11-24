import { CrudController } from '../../core/crud.ts'
import { CheckTypeDto, type CheckTypeInput } from './check-types.dto.ts'
import type { CheckTypeService } from './check-types.service.ts'

export class CheckTypeController extends CrudController<CheckTypeInput> {
  constructor(service: CheckTypeService) {
    super(service, CheckTypeDto)
  }
}
