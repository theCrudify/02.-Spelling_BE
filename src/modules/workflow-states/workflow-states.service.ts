import { CrudService } from '../../core/crud.ts'
import type { WorkflowStateInput } from './workflow-states.dto.ts'
import type { WorkflowStateRepository } from './workflow-states.repository.ts'

export class WorkflowStateService extends CrudService<WorkflowStateInput> {
  constructor(repo: WorkflowStateRepository) {
    super(repo, 'Status workflow')
  }
}
