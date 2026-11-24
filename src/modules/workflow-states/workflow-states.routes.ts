import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { WorkflowStateController } from './workflow-states.controller.ts'
import { WorkflowStateRepository } from './workflow-states.repository.ts'
import { WorkflowStateService } from './workflow-states.service.ts'

export const workflowStatesRoutes = crudRoutes(new WorkflowStateController(new WorkflowStateService(new WorkflowStateRepository(db))))
