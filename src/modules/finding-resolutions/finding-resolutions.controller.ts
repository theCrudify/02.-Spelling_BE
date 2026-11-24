import { CrudController } from '../../core/crud.ts'
import { FindingResolutionDto, type FindingResolutionInput } from './finding-resolutions.dto.ts'
import type { FindingResolutionService } from './finding-resolutions.service.ts'

export class FindingResolutionController extends CrudController<FindingResolutionInput> {
  constructor(service: FindingResolutionService) {
    super(service, FindingResolutionDto)
  }
}
