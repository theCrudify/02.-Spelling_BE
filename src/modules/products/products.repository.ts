import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class ProductRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'products', mode: 'soft', uniqueColumn: 'code', resource: 'products' }
}
