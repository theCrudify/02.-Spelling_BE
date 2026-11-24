import { CrudController } from '../../core/crud.ts'
import { DepartmentDto, type DepartmentInput } from './departments.dto.ts'
import type { DepartmentService } from './departments.service.ts'

export class DepartmentController extends CrudController<DepartmentInput> {
  constructor(service: DepartmentService) {
    super(service, DepartmentDto)
  }
}
