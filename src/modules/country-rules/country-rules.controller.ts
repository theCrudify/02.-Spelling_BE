import { CrudController } from '../../core/crud.ts'
import { CountryRuleDto, type CountryRuleInput } from './country-rules.dto.ts'
import type { CountryRuleService } from './country-rules.service.ts'

export class CountryRuleController extends CrudController<CountryRuleInput> {
  constructor(service: CountryRuleService) {
    super(service, CountryRuleDto)
  }
}
