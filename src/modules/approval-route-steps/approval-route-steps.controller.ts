import { CrudController } from '../../core/crud.ts'
import { ApprovalRouteStepDto, type ApprovalRouteStepInput } from './approval-route-steps.dto.ts'
import type { ApprovalRouteStepService } from './approval-route-steps.service.ts'

export class ApprovalRouteStepController extends CrudController<ApprovalRouteStepInput> {
  constructor(service: ApprovalRouteStepService) {
    super(service, ApprovalRouteStepDto)
  }
}
