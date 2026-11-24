import { CrudService } from '../../core/crud.ts'
import type { CheckTypeInput } from './check-types.dto.ts'
import type { CheckTypeRepository } from './check-types.repository.ts'

export class CheckTypeService extends CrudService<CheckTypeInput> {
  constructor(repo: CheckTypeRepository) {
    super(repo, 'Jenis pengecekan')
  }
}
