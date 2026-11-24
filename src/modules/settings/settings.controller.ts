import { CrudController } from '../../core/crud.ts'
import { SettingDto, type SettingInput } from './settings.dto.ts'
import type { SettingService } from './settings.service.ts'

export class SettingController extends CrudController<SettingInput> {
  constructor(service: SettingService) {
    super(service, SettingDto)
  }
}
