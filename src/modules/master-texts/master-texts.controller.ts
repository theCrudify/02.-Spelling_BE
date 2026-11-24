import { CrudController } from '../../core/crud.ts'
import { MasterTextDto, type MasterTextInput } from './master-texts.dto.ts'
import type { MasterTextService } from './master-texts.service.ts'

export class MasterTextController extends CrudController<MasterTextInput> {
  constructor(service: MasterTextService) {
    super(service, MasterTextDto)
  }
}
