import { CrudController } from '../../core/crud.ts'
import { SiteDto, type SiteInput } from './sites.dto.ts'
import type { SiteService } from './sites.service.ts'

export class SiteController extends CrudController<SiteInput> {
  constructor(service: SiteService) {
    super(service, SiteDto)
  }
}
