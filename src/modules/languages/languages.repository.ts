import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class LanguageRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'languages', mode: 'master', uniqueColumn: 'code', resource: 'languages' }
}
