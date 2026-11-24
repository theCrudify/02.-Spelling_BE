import { CrudController } from '../../core/crud.ts'
import { LanguageDto, type LanguageInput } from './languages.dto.ts'
import type { LanguageService } from './languages.service.ts'

export class LanguageController extends CrudController<LanguageInput> {
  constructor(service: LanguageService) {
    super(service, LanguageDto)
  }
}
