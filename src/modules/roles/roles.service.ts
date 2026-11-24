import { CrudService } from '../../core/crud.ts'
import type { RoleInput } from './roles.dto.ts'
import type { RoleRepository } from './roles.repository.ts'

export class RoleService extends CrudService<RoleInput> {
  constructor(repo: RoleRepository) {
    super(repo, 'Role')
  }
}
