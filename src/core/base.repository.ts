import type { Kysely, Transaction } from 'kysely'

export type Db = Kysely<any> | Transaction<any>

/** Every repository wraps a Kysely handle; withTx() gives a copy bound to a transaction. */
export abstract class BaseRepository {
  constructor(protected readonly db: Db) {}

  withTx(trx: Transaction<any>): this {
    const Ctor = this.constructor as new (db: Db) => this
    return new Ctor(trx)
  }

  transaction<T>(fn: (trx: Transaction<any>) => Promise<T>): Promise<T> {
    return (this.db as Kysely<any>).transaction().execute(fn)
  }
}
