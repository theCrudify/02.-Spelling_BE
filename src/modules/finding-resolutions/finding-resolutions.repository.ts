import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class FindingResolutionRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'finding_resolutions', mode: 'master', uniqueColumn: 'code', resource: 'finding_resolutions' }
}
