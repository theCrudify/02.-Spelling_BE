import type { Context } from 'hono'
import type { Env } from '../../core/auth.ts'
import { bodyDto, idParam } from '../../core/http.ts'
import { CreateUserDto, UpdateUserDto } from './users.dto.ts'
import type { UserService } from './users.service.ts'

export class UserController {
  constructor(private readonly service: UserService) {}

  list = async (c: Context<Env>) => c.json(await this.service.list(c.req.query()))
  options = async (c: Context<Env>) => c.json(await this.service.options())
  get = async (c: Context<Env>) => c.json(await this.service.get(idParam(c)))
  create = async (c: Context<Env>) => c.json(await this.service.create(await bodyDto(c, CreateUserDto)), 201)
  update = async (c: Context<Env>) => c.json(await this.service.update(c.get('user'), idParam(c), await bodyDto(c, UpdateUserDto)))
  remove = async (c: Context<Env>) => c.json(await this.service.remove(c.get('user'), idParam(c)))
}
