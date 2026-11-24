import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { ApprovalRouteStepController } from './approval-route-steps.controller.ts'
import { ApprovalRouteStepRepository } from './approval-route-steps.repository.ts'
import { ApprovalRouteStepService } from './approval-route-steps.service.ts'

export const approvalRouteStepsRoutes = crudRoutes(new ApprovalRouteStepController(new ApprovalRouteStepService(new ApprovalRouteStepRepository(db))))
