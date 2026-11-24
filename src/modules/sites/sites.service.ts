import { CrudService } from '../../core/crud.ts'
import type { SiteInput } from './sites.dto.ts'
import type { SiteRepository } from './sites.repository.ts'

export class SiteService extends CrudService<SiteInput> {
  constructor(repo: SiteRepository) {
    super(repo, 'Site')
  }
}
