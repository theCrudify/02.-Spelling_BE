import type { Context } from 'hono'
import type { Env } from '../../core/auth.ts'
import { idParam } from '../../core/http.ts'
import type { FileService } from './files.service.ts'

export class FileController {
  constructor(private readonly service: FileService) {}

  download = async (c: Context<Env>) => {
    const file = await this.service.download(idParam(c), c.get('user'))
    return c.body(new Uint8Array(file.data), 200, {
      'content-type': file.mime,
      'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      'cache-control': 'private, max-age=3600',
      'x-content-type-options': 'nosniff',
    })
  }
}
