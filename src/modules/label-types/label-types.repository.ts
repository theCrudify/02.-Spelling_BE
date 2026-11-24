import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class LabelTypeRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'label_types', mode: 'master', uniqueColumn: 'code', resource: 'label_types' }
}
