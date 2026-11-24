import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class CheckTypeRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'check_types', mode: 'master', uniqueColumn: 'code', resource: 'check_types' }
}
