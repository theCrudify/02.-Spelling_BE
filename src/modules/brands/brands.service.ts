import { CrudService } from '../../core/crud.ts'
import type { BrandInput } from './brands.dto.ts'
import type { BrandRepository } from './brands.repository.ts'

export class BrandService extends CrudService<BrandInput> {
  constructor(repo: BrandRepository) {
    super(repo, 'Brand')
  }
}
