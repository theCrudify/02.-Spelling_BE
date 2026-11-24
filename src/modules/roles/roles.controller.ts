import { CrudController } from '../../core/crud.ts'
import { RoleDto, type RoleInput } from './roles.dto.ts'
import type { RoleService } from './roles.service.ts'

export class RoleController extends CrudController<RoleInput> {
  constructor(service: RoleService) {
    super(service, RoleDto)
  }
}
