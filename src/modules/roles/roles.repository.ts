import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class RoleRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'roles', mode: 'master', uniqueColumn: 'code', resource: 'roles' }
}
