import { CrudController } from '../../core/crud.ts'
import { ProductDto, type ProductInput } from './products.dto.ts'
import type { ProductService } from './products.service.ts'

export class ProductController extends CrudController<ProductInput> {
  constructor(service: ProductService) {
    super(service, ProductDto)
  }
}
