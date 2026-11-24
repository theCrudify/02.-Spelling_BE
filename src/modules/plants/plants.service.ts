import { CrudService } from '../../core/crud.ts'
import type { PlantInput } from './plants.dto.ts'
import type { PlantRepository } from './plants.repository.ts'

export class PlantService extends CrudService<PlantInput> {
  constructor(repo: PlantRepository) {
    super(repo, 'Plant')
  }
}
