import { CrudController } from '../../core/crud.ts'
import { ApprovalRouteDto, type ApprovalRouteInput } from './approval-routes.dto.ts'
import type { ApprovalRouteService } from './approval-routes.service.ts'

export class ApprovalRouteController extends CrudController<ApprovalRouteInput> {
  constructor(service: ApprovalRouteService) {
    super(service, ApprovalRouteDto)
  }
}
