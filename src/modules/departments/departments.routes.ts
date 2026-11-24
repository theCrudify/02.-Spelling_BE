import { db } from '../../core/database.ts'
import { crudRoutes } from '../../core/crud.ts'
import { DepartmentController } from './departments.controller.ts'
import { DepartmentRepository } from './departments.repository.ts'
import { DepartmentService } from './departments.service.ts'

export const departmentsRoutes = crudRoutes(new DepartmentController(new DepartmentService(new DepartmentRepository(db))))
