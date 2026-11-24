import { crudRoutes } from '../../core/crud.ts'
import { db } from '../../core/database.ts'
import { HistoryActionController } from './history-actions.controller.ts'
import { HistoryActionRepository } from './history-actions.repository.ts'
import { HistoryActionService } from './history-actions.service.ts'

export const historyActionsRoutes = crudRoutes(new HistoryActionController(new HistoryActionService(new HistoryActionRepository(db))))
