import { CrudController } from '../../core/crud.ts'
import { LabelTypeDto, type LabelTypeInput } from './label-types.dto.ts'
import type { LabelTypeService } from './label-types.service.ts'

export class LabelTypeController extends CrudController<LabelTypeInput> {
  constructor(service: LabelTypeService) {
    super(service, LabelTypeDto)
  }
}
