import { CrudService } from '../../core/crud.ts'
import type { CountryRuleInput } from './country-rules.dto.ts'
import type { CountryRuleRepository } from './country-rules.repository.ts'

export class CountryRuleService extends CrudService<CountryRuleInput> {
  constructor(repo: CountryRuleRepository) {
    super(repo, 'Aturan negara')
  }
}
