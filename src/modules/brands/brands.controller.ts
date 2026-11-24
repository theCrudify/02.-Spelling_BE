import { CrudController } from '../../core/crud.ts'
import { BrandDto, type BrandInput } from './brands.dto.ts'
import type { BrandService } from './brands.service.ts'

export class BrandController extends CrudController<BrandInput> {
  constructor(service: BrandService) {
    super(service, BrandDto)
  }
}
