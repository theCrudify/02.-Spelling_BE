import { CrudService } from '../../core/crud.ts'
import type { HistoryActionInput } from './history-actions.dto.ts'
import type { HistoryActionRepository } from './history-actions.repository.ts'

export class HistoryActionService extends CrudService<HistoryActionInput> {
  constructor(repo: HistoryActionRepository) {
    super(repo, 'Aksi riwayat')
  }
}
