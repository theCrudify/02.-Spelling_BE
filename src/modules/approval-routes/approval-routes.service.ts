import { CrudService } from '../../core/crud.ts'
import type { ApprovalRouteInput } from './approval-routes.dto.ts'
import type { ApprovalRouteRepository } from './approval-routes.repository.ts'

export class ApprovalRouteService extends CrudService<ApprovalRouteInput> {
  constructor(repo: ApprovalRouteRepository) {
    super(repo, 'Rute approval')
  }
}
