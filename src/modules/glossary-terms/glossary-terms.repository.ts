import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class GlossaryTermRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'glossary_terms', mode: 'hard', uniqueColumn: 'id', resource: 'glossary_terms' }
}
