import { CrudController } from '../../core/crud.ts'
import { ListResourceDto, type ListResourceInput } from './list-resources.dto.ts'
import type { ListResourceService } from './list-resources.service.ts'

export class ListResourceController extends CrudController<ListResourceInput> {
  constructor(service: ListResourceService) {
    super(service, ListResourceDto)
  }
}
