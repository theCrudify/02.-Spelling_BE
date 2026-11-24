import { CrudService } from '../../core/crud.ts'
import type { SettingInput } from './settings.dto.ts'
import type { SettingRepository } from './settings.repository.ts'

export class SettingService extends CrudService<SettingInput> {
  constructor(repo: SettingRepository) {
    super(repo, 'Pengaturan')
  }
}
