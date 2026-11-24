import { CrudService } from '../../core/crud.ts'
import type { SeverityInput } from './severities.dto.ts'
import type { SeverityRepository } from './severities.repository.ts'

export class SeverityService extends CrudService<SeverityInput> {
  constructor(repo: SeverityRepository) {
    super(repo, 'Tingkat temuan')
  }
}
