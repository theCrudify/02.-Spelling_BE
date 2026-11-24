import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class ApprovalRouteRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'approval_routes', mode: 'master', uniqueColumn: 'code', resource: 'approval_routes' }
}
