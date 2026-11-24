import type { ListField, MasterRow, MasterTable, Setting } from '../../core/masters.ts'

/** Everything the UI needs to render options, labels, colours, lists, filters, menus and permission-based visibility. */
export type MetaResponse = {
  masters: Record<MasterTable, MasterRow[]> // all rows (inactive included, for labels of old data); UI offers only active ones
  lists: Record<string, ListField[]> // list_fields per resource (columns + filters)
  relations: Record<string, { value: string; label: string }[]> // options for 'relation' filters, by source table
  settings: Record<string, string>
  permissions: Record<string, string> // capability catalog, for the role editor
  me: { role: string; site: string | null; permissions: string[] }
  menu: MasterRow[] // menus the user may see
  shortcuts: { site: string; category: string | null; total: number }[] // site × category links with data
}
