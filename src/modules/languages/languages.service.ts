import { CrudService } from '../../core/crud.ts'
import type { LanguageInput } from './languages.dto.ts'
import type { LanguageRepository } from './languages.repository.ts'

export class LanguageService extends CrudService<LanguageInput> {
  constructor(repo: LanguageRepository) {
    super(repo, 'Bahasa')
  }
}
