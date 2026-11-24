import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { RoleController } from './roles.controller.ts'
import { RoleRepository } from './roles.repository.ts'
import { RoleService } from './roles.service.ts'

export const rolesRoutes = crudRoutes(new RoleController(new RoleService(new RoleRepository(db))))
