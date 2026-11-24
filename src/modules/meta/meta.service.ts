import { can, type User } from '../../core/auth.ts'
import { MASTER_TABLES, masters, PERMISSIONS } from '../../core/masters.ts'
import type { MetaResponse } from './meta.dto.ts'
import type { MetaRepository } from './meta.repository.ts'

export class MetaService {
  constructor(private readonly repo: MetaRepository) {}

  async all(user: User): Promise<MetaResponse> {
    const fields = masters.listFields()
    const relationTables = [...new Set(fields.filter((f) => f.filter_type === 'relation' && f.filter_source).map((f) => f.filter_source!))]
    const relationRows = await Promise.all(relationTables.map((t) => this.repo.relationOptions(t)))
    const lists: MetaResponse['lists'] = {}
    for (const f of fields) (lists[f.resource] ??= []).push(f)

    return {
      masters: Object.fromEntries(MASTER_TABLES.map((t) => [t, masters.all(t)])) as MetaResponse['masters'],
      lists,
      relations: Object.fromEntries(relationTables.map((t, i) => [t, relationRows[i]])),
      settings: Object.fromEntries(masters.settings().map((s) => [s.key, s.value])),
      permissions: PERMISSIONS,
      me: { role: user.role, site: user.site, permissions: Object.keys(PERMISSIONS).filter((p) => can(user, p)) },
      menu: masters.active('menus').filter((m) => !m.permission || can(user, m.permission)),
      shortcuts: [],
    }
  }
}
