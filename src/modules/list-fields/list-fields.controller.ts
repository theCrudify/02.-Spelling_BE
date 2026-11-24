import { CrudController } from '../../core/crud.ts'
import { ListFieldDto, type ListFieldInput } from './list-fields.dto.ts'
import type { ListFieldService } from './list-fields.service.ts'

export class ListFieldController extends CrudController<ListFieldInput> {
  constructor(service: ListFieldService) {
    super(service, ListFieldDto)
  }
}
