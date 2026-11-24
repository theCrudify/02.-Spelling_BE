import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class ApprovalRouteStepRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'approval_route_steps', mode: 'hard', uniqueColumn: 'id', resource: 'approval_route_steps' }
}
