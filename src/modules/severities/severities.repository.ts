import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class SeverityRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'severities', mode: 'master', uniqueColumn: 'code', resource: 'severities' }
}
