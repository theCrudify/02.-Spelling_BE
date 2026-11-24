import { sql, type SelectQueryBuilder } from 'kysely'
import { z } from 'zod'
import { masters } from './masters.ts'

/*
 * One list contract for every endpoint: ?page=&pageSize=&search=&sortBy=&sortDir=&<filter keys>.
 * What is searchable, sortable and filterable, the default sort and the page size all come from
 * list_resources / list_fields (database), not from code.
 */

export type ListConfig = {
  searchable: string[] // column refs
  sortable: Record<string, string> // public sort key -> column ref
  defaultSort: [string, 'asc' | 'desc']
  defaultPageSize?: number
  tieBreaker?: string // unique column so pages never overlap, default 'id'
}

export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => '\\' + m)

/** Unknown sort keys fall back to the default. 'relevance' is valid only while searching. */
export function resolveSort(cfg: ListConfig, sortBy?: string, sortDir?: 'asc' | 'desc', searching = false) {
  if (sortBy && sortBy in cfg.sortable) return { sortBy, sortDir: sortDir ?? 'asc' }
  if (searching && (!sortBy || sortBy === 'relevance')) return { sortBy: 'relevance', sortDir: 'desc' as const }
  return { sortBy: cfg.defaultSort[0], sortDir: cfg.defaultSort[1] }
}

/** Search words (max from settings): every word must match at least one searchable column. */
export const searchTokens = (search?: string) =>
  (search ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, masters.number('search_max_terms', 5))

/** List config of a resource, read from list_resources + list_fields. */
export function listConfig(resource: string, tieBreaker: string): ListConfig {
  const r = masters.resource(resource)
  const fields = masters.listFields(resource)
  return {
    searchable: r.search_refs,
    sortable: Object.fromEntries(fields.filter((f) => f.sortable).map((f) => [f.key, f.column_ref])),
    defaultSort: [r.default_sort, r.default_dir],
    defaultPageSize: r.page_size,
    tieBreaker,
  }
}

/** Applies every filter configured for the resource whose key is present in the query. */
export function applyFilters<Q extends SelectQueryBuilder<any, any, any>>(qb: Q, resource: string, query: Record<string, string | undefined>): Q {
  for (const f of masters.listFields(resource)) {
    const value = query[f.key]
    if (!f.filter_type || !value) continue
    const col = sql.ref(f.column_ref)
    switch (f.filter_type) {
      case 'master':
      case 'relation':
        qb = (value === '__none' ? qb.where(col, 'is', null) : qb.where(col, '=', value)) as Q
        break
      case 'site':
        qb = qb.where(col, 'in', [...masters.plantsOfSite(value), '-']) as Q
        break
      case 'values':
        qb = qb.where(col, '=', value) as Q
        break
      case 'year':
        qb = qb.where(sql`extract(year from ${col})`, '=', Number(value)) as Q
        break
    }
  }
  return qb
}

export async function paginate(qb: SelectQueryBuilder<any, any, any>, query: Record<string, string | undefined>, cfg: ListConfig) {
  const maxPage = masters.number('list_max_page_size', 100)
  const p = z
    .object({
      page: z.coerce.number().int().min(1).catch(1),
      pageSize: z.coerce.number().int().min(1).max(maxPage).catch(cfg.defaultPageSize ?? 10),
      search: z.string().trim().max(100).optional().catch(undefined),
      sortBy: z.string().optional().catch(undefined),
      sortDir: z.enum(['asc', 'desc']).optional().catch(undefined),
    })
    .parse(query)
  const tokens = searchTokens(p.search)
  for (const t of tokens) {
    const term = `%${escapeLike(t)}%`
    qb = qb.where((eb) => eb.or(cfg.searchable.map((c) => eb(sql.ref(c), 'ilike', term))))
  }
  const { sortBy, sortDir } = resolveSort(cfg, p.sortBy, p.sortDir, tokens.length > 0)
  // Relevance: best trigram word-similarity of the whole query against any searchable column.
  const order =
    sortBy === 'relevance'
      ? sql`greatest(${sql.join(cfg.searchable.map((c) => sql`word_similarity(${p.search}, ${sql.ref(c)})`))}) desc nulls last`
      : sql`${sql.ref(cfg.sortable[sortBy] ?? cfg.tieBreaker ?? 'id')} ${sql.raw(sortDir)} nulls last`

  const [{ total }, data] = await Promise.all([
    qb.clearSelect().clearOrderBy().select((eb) => eb.fn.countAll<number>().as('total')).executeTakeFirstOrThrow(),
    qb
      .orderBy(order)
      .orderBy(sql.ref(cfg.tieBreaker ?? 'id'), 'desc')
      .limit(p.pageSize)
      .offset((p.page - 1) * p.pageSize)
      .execute(),
  ])

  return {
    data: data.map(({ search_text, ...row }) => row), // internal index column, not part of the API
    meta: {
      page: p.page,
      pageSize: p.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
      search: p.search ?? '',
      sortBy,
      sortDir,
    },
  }
}

/** Configured list of a resource: filters + search + sort + paging, all from the database. */
export const paginateResource = (qb: SelectQueryBuilder<any, any, any>, query: Record<string, string | undefined>, resource: string, tieBreaker: string) =>
  paginate(applyFilters(qb, resource, query), query, listConfig(resource, tieBreaker))
