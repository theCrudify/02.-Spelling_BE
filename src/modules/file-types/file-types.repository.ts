import { CrudRepository, type CrudConfig } from '../../core/crud.ts'

export class FileTypeRepository extends CrudRepository {
  protected readonly config: CrudConfig = { table: 'file_types', mode: 'master', uniqueColumn: 'code', resource: 'file_types' }
}
