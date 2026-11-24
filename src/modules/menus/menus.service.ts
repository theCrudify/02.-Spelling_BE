import { CrudService } from '../../core/crud.ts'
import type { MenuInput } from './menus.dto.ts'
import type { MenuRepository } from './menus.repository.ts'

export class MenuService extends CrudService<MenuInput> {
  constructor(repo: MenuRepository) {
    super(repo, 'Menu navigasi')
  }
}
