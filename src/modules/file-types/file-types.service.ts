import { CrudService } from '../../core/crud.ts'
import type { FileTypeInput } from './file-types.dto.ts'
import type { FileTypeRepository } from './file-types.repository.ts'

export class FileTypeService extends CrudService<FileTypeInput> {
  constructor(repo: FileTypeRepository) {
    super(repo, 'Tipe file')
  }
}
