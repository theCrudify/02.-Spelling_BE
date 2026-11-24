import { CrudService } from '../../core/crud.ts'
import type { ListResourceInput } from './list-resources.dto.ts'
import type { ListResourceRepository } from './list-resources.repository.ts'

export class ListResourceService extends CrudService<ListResourceInput> {
  constructor(repo: ListResourceRepository) {
    super(repo, 'Daftar (list)')
  }
}
