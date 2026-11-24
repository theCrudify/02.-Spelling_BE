import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class SettingRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'settings', mode: 'master', uniqueColumn: 'key', resource: 'settings' }
}
