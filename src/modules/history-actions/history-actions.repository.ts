import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class HistoryActionRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'history_actions', mode: 'master', uniqueColumn: 'code', resource: 'history_actions' }
}
