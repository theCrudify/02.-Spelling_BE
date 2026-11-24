import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class MasterTextRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'master_texts', mode: 'soft', uniqueColumn: 'note', resource: 'master_texts' }
}
