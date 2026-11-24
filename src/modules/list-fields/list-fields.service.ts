import { CrudService } from '../../core/crud.ts'
import type { ListFieldInput } from './list-fields.dto.ts'
import type { ListFieldRepository } from './list-fields.repository.ts'

export class ListFieldService extends CrudService<ListFieldInput> {
  constructor(repo: ListFieldRepository) {
    super(repo, 'Kolom & filter daftar')
  }
}
