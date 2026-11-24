import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class CountryRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'countries', mode: 'soft', uniqueColumn: 'code', resource: 'countries' }
}
