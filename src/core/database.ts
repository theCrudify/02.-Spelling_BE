import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (see .env.example)')

// Keep DATE columns as 'YYYY-MM-DD' strings instead of JS Date (avoids timezone shifts).
pg.types.setTypeParser(1082, (v) => v)
// COUNT(*) is bigint; our counts fit in a JS number.
pg.types.setTypeParser(20, (v) => Number(v))

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 6 }) // 5 for requests + 1 kept by listenMasterChanges

// shortcut: untyped Kysely, generate a DB interface with kysely-codegen if the schema keeps growing.
export const db = new Kysely<any>({ dialect: new PostgresDialect({ pool }) })
