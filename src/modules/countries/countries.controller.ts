import { CrudController } from '../../core/crud.ts'
import { CountryDto, type CountryInput } from './countries.dto.ts'
import type { CountryService } from './countries.service.ts'

export class CountryController extends CrudController<CountryInput> {
  constructor(service: CountryService) {
    super(service, CountryDto)
  }
}
