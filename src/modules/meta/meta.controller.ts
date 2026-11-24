import type { Context } from 'hono'
import type { Env } from '../../core/auth.ts'
import type { MetaService } from './meta.service.ts'

export class MetaController {
  constructor(private readonly service: MetaService) {}

  all = async (c: Context<Env>) => c.json(await this.service.all(c.get('user')))
}
