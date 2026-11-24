import { CrudService } from '../../core/crud.ts'
import type { ApprovalRouteStepInput } from './approval-route-steps.dto.ts'
import type { ApprovalRouteStepRepository } from './approval-route-steps.repository.ts'

export class ApprovalRouteStepService extends CrudService<ApprovalRouteStepInput> {
  constructor(repo: ApprovalRouteStepRepository) {
    super(repo, 'Tahap rute')
  }
}
