import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { ApprovalRouteController } from './approval-routes.controller.ts'
import { ApprovalRouteRepository } from './approval-routes.repository.ts'
import { ApprovalRouteService } from './approval-routes.service.ts'

export const approvalRoutesRoutes = crudRoutes(new ApprovalRouteController(new ApprovalRouteService(new ApprovalRouteRepository(db))))
