import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class CountryRuleRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'country_rules', mode: 'hard', uniqueColumn: 'id', resource: 'country_rules' }
}
