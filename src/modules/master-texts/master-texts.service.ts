import { CrudService } from '../../core/crud.ts'
import type { MasterTextInput } from './master-texts.dto.ts'
import type { MasterTextRepository } from './master-texts.repository.ts'

export class MasterTextService extends CrudService<MasterTextInput> {
  constructor(repo: MasterTextRepository) {
    super(repo, 'Teks master')
  }
}
