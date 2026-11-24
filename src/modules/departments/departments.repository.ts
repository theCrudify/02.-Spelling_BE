import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class DepartmentRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'departments', mode: 'soft', uniqueColumn: 'code', resource: 'departments' }
}
