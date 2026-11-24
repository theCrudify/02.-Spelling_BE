import type { Context } from 'hono'
import type { Env } from '../../core/auth.ts'
import { idParam, notFound, readBody } from '../../core/http.ts'
import { ApproveDto, CreateLabelDto, DecisionDto, LabelFilterDto, ResolveFindingDto, SubmitDto, UploadVersionDto } from './labels.dto.ts'
import type { LabelService } from './labels.service.ts'

const intParam = (c: Context, name: string) => {
  const n = Number(c.req.param(name))
  if (!Number.isInteger(n) || n < 1) throw notFound()
  return n
}

export class LabelController {
  constructor(private readonly service: LabelService) {}

  list = async (c: Context<Env>) => {
    const q = c.req.query()
    return c.json(await this.service.list(c.get('user'), LabelFilterDto.parse(q).scope, q))
  }
  summary = async (c: Context<Env>) => c.json(await this.service.summary(c.get('user')))
  detail = async (c: Context<Env>) => c.json(await this.service.detail(c.get('user'), idParam(c), Number(c.req.query('version')) || undefined))
  create = async (c: Context<Env>) => c.json(await this.service.create(c.get('user'), CreateLabelDto.parse(await readBody(c))), 201)
  uploadVersion = async (c: Context<Env>) => c.json(await this.service.uploadVersion(c.get('user'), idParam(c), UploadVersionDto.parse(await readBody(c))))
  recheck = async (c: Context<Env>) => c.json(await this.service.recheck(c.get('user'), idParam(c)))
  page = async (c: Context<Env>) => {
    const png = await this.service.pageImage(c.get('user'), idParam(c), intParam(c, 'versionId'), intParam(c, 'pageNo'))
    return c.body(new Uint8Array(png), 200, { 'content-type': 'image/png', 'cache-control': 'private, max-age=86400', 'x-content-type-options': 'nosniff' })
  }
  resolveFinding = async (c: Context<Env>) => c.json(await this.service.resolveFinding(c.get('user'), idParam(c), intParam(c, 'findingId'), ResolveFindingDto.parse(await readBody(c))))
  submit = async (c: Context<Env>) => c.json(await this.service.submit(c.get('user'), idParam(c), SubmitDto.parse(await readBody(c)).note))
  approve = async (c: Context<Env>) => c.json(await this.service.approve(c.get('user'), idParam(c), ApproveDto.parse(await readBody(c))))
  requestRevision = async (c: Context<Env>) => c.json(await this.service.requestRevision(c.get('user'), idParam(c), DecisionDto.parse(await readBody(c))))
  reject = async (c: Context<Env>) => c.json(await this.service.reject(c.get('user'), idParam(c), DecisionDto.parse(await readBody(c))))
}
