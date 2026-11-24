import { CrudService } from '../../core/crud.ts'
import type { CountryInput } from './countries.dto.ts'
import type { CountryRepository } from './countries.repository.ts'

export class CountryService extends CrudService<CountryInput> {
  constructor(repo: CountryRepository) {
    super(repo, 'Negara')
  }
}
