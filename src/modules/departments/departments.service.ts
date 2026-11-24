import { CrudService } from '../../core/crud.ts'
import type { DepartmentInput } from './departments.dto.ts'
import type { DepartmentRepository } from './departments.repository.ts'

export class DepartmentService extends CrudService<DepartmentInput> {
  constructor(repo: DepartmentRepository) {
    super(repo, 'Departemen')
  }
}
