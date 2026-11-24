import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class ListFieldRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'list_fields', mode: 'master', uniqueColumn: 'key', resource: 'list_fields' }
}
