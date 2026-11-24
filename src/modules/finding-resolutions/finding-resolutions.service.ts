import { CrudService } from '../../core/crud.ts'
import type { FindingResolutionInput } from './finding-resolutions.dto.ts'
import type { FindingResolutionRepository } from './finding-resolutions.repository.ts'

export class FindingResolutionService extends CrudService<FindingResolutionInput> {
  constructor(repo: FindingResolutionRepository) {
    super(repo, 'Hasil review temuan')
  }
}
