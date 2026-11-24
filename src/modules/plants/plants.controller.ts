import { CrudController } from '../../core/crud.ts'
import { PlantDto, type PlantInput } from './plants.dto.ts'
import type { PlantService } from './plants.service.ts'

export class PlantController extends CrudController<PlantInput> {
  constructor(service: PlantService) {
    super(service, PlantDto)
  }
}
