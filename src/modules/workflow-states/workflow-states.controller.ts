import { CrudController } from '../../core/crud.ts'
import { WorkflowStateDto, type WorkflowStateInput } from './workflow-states.dto.ts'
import type { WorkflowStateService } from './workflow-states.service.ts'

export class WorkflowStateController extends CrudController<WorkflowStateInput> {
  constructor(service: WorkflowStateService) {
    super(service, WorkflowStateDto)
  }
}
