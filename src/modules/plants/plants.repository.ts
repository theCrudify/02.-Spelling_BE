import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class PlantRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'plants', mode: 'master', uniqueColumn: 'code', resource: 'plants' }

  protected override base() {
    return this.db
      .selectFrom('plants as t')
      .leftJoin('sites as s', 's.code', 't.site_code').selectAll('t').select('s.name as site_name')
  }
}
