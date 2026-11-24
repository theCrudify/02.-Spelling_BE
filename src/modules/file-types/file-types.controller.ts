import { CrudController } from '../../core/crud.ts'
import { FileTypeDto, type FileTypeInput } from './file-types.dto.ts'
import type { FileTypeService } from './file-types.service.ts'

export class FileTypeController extends CrudController<FileTypeInput> {
  constructor(service: FileTypeService) {
    super(service, FileTypeDto)
  }
}
