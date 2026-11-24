import { CrudService } from '../../core/crud.ts'
import type { LabelTypeInput } from './label-types.dto.ts'
import type { LabelTypeRepository } from './label-types.repository.ts'

export class LabelTypeService extends CrudService<LabelTypeInput> {
  constructor(repo: LabelTypeRepository) {
    super(repo, 'Tipe label')
  }
}
