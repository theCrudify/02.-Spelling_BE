import type { Context } from 'hono'
import type { Env } from '../../core/auth.ts'
import { bodyDto } from '../../core/http.ts'
import { ChangePasswordDto, LoginDto } from './auth.dto.ts'
import type { AuthService } from './auth.service.ts'

export class AuthController {
  constructor(private readonly service: AuthService) {}

  login = async (c: Context) => c.json(await this.service.login(await bodyDto(c, LoginDto)))
  me = (c: Context<Env>) => c.json(c.get('user'))
  changePassword = async (c: Context<Env>) => c.json(await this.service.changePassword(c.get('user'), await bodyDto(c, ChangePasswordDto)))
}
