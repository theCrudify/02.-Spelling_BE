import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class ListResourceRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'list_resources', mode: 'master', uniqueColumn: 'code', resource: 'list_resources' }
}
