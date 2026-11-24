import { CrudService } from '../../core/crud.ts'
import type { ProductInput } from './products.dto.ts'
import type { ProductRepository } from './products.repository.ts'

export class ProductService extends CrudService<ProductInput> {
  constructor(repo: ProductRepository) {
    super(repo, 'Produk')
  }
}
