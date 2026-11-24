import { CrudController } from '../../core/crud.ts'
import { HistoryActionDto, type HistoryActionInput } from './history-actions.dto.ts'
import type { HistoryActionService } from './history-actions.service.ts'

export class HistoryActionController extends CrudController<HistoryActionInput> {
  constructor(service: HistoryActionService) {
    super(service, HistoryActionDto)
  }
}
