import { CrudController } from '../../core/crud.ts'
import { MenuDto, type MenuInput } from './menus.dto.ts'
import type { MenuService } from './menus.service.ts'

export class MenuController extends CrudController<MenuInput> {
  constructor(service: MenuService) {
    super(service, MenuDto)
  }
}
