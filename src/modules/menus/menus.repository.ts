import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class MenuRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'menus', mode: 'master', uniqueColumn: 'code', resource: 'menus' }
}
