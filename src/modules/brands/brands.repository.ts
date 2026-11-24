import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class BrandRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'brands', mode: 'master', uniqueColumn: 'code', resource: 'brands' }
}
