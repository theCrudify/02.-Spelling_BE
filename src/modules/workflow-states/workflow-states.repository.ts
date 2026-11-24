import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class WorkflowStateRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'workflow_states', mode: 'master', uniqueColumn: 'code', resource: 'workflow_states' }

}
