import Database from 'better-sqlite3';

/**
 * A database row, represented as a map of column
 * names to values.
 */
export type Row = { [k: string]: any }

/**
 * An abstract database engine.
 */
export interface Engine {
  /**
   * Connects to the database.
   */
  open (): void

  /**
   * Disconnects from the database.
   */
  close (): void

  /**
   * Executes the given `sql` with bound `params`. Does not return any
   * results.
   *
   * @param sql
   * @param params
   */
  exec (sql: string, params: { [k: string]: any }): void

  /**
   * Executes the provided callback for each result after executing
   * the query `sql` with bound `params.
   *
   * @param sql
   * @param params
   * @param cb
   */
  each (sql: string, params: { [k: string]: any }, cb: (row: Row) => void): void

  /**
   * Returns the first row in the resultset after executing the query `sql`
   * with bound `params`.
   *
   * @param sql
   * @param params
   */
  first (sql: string, params: { [k: string]: any }): Row | null

  /**
   * Runs all queries executed in the callback inside a transaction.
   */
  withTx (cb: () => void): void
}

/**
 * A Sqlite3 database engine. See [[Engine]] for more information.
 */
export class SqliteEngine implements Engine {
  private readonly path: string;

  private client: Database.Database | null = null;

  constructor (path: string) {
    this.path = path;
  }

  async open (): Promise<void> {
    this.client = new Database(this.path, {
      fileMustExist: true,
    });
  }

  close (): void {
    this.ensureOpen();
    this.client!.close();
    this.client = null;
  }

  exec (sql: string, params: { [k: string]: any }) {
    this.ensureOpen();
    const st = this.client!.prepare(sql);
    st.run(params);
  }

  each (sql: string, params: { [k: string]: any }, cb: (row: Row) => void) {
    this.ensureOpen();
    const st = this.client!.prepare(sql);
    const iter = st.iterate(params);
    for (const row of iter) {
      cb(row);
    }
  }

  first (sql: string, params: { [k: string]: any }): Row | null {
    this.ensureOpen();
    const st = this.client!.prepare(sql);
    return st.get(params);
  }

  withTx (cb: () => void) {
    this.ensureOpen();
    this.client!.transaction(cb)();
  }

  private ensureOpen () {
    if (!this.client) {
      throw new Error('not open');
    }
  }
}
