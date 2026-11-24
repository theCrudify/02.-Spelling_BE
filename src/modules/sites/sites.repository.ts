import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class SiteRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'sites', mode: 'master', uniqueColumn: 'code', resource: 'sites' }
}
