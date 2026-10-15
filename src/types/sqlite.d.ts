declare module 'node:sqlite' {
  export interface RunResult {
    changes: number | bigint
    lastInsertRowid: number | bigint
  }

  export interface ColumnDescription {
    name: string
    column: string | null
    table: string | null
    database: string | null
    type: string | null
  }

  export class StatementSync {
    all(...params: unknown[]): unknown[]
    get(...params: unknown[]): unknown | undefined
    run(...params: unknown[]): RunResult
    iterate(...params: unknown[]): IterableIterator<unknown>
    columns(): ColumnDescription[]
    setAllowBareNamedParameters?(allow: boolean): void
    setAllowUnknownNamedParameters?(allow: boolean): void
    setReadBigInts?(readBigInts: boolean): void
    setReturnArrays?(returnArrays: boolean): void
  }

  export interface DatabaseSyncOptions {
    open?: boolean
    readOnly?: boolean
    enableForeignKeyConstraints?: boolean
  }

  export class DatabaseSync {
    constructor(location: string, options?: DatabaseSyncOptions)
    close(): void
    open(): void
    exec(sql: string): void
    prepare(sql: string): StatementSync
    function(name: string, fn: (...args: unknown[]) => unknown): void
    aggregate?(name: string, options: Record<string, unknown>): void
  }
}

