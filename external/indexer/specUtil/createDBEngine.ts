import tmp from 'tmp';
import path from 'path';
import {Engine, Row, SqliteEngine} from '../dao/Engine';
import * as fs from 'fs';
import * as util from 'util';
import * as DBMigrate from 'db-migrate';

interface DBJSONConfig {
  dev: {
    driver: 'sqlite3',
    filename: string,
  }
}

const write = util.promisify(fs.writeFile);

export async function createDBEngine (): Promise<Engine> {
  const [tmpPath, cleanup] = await new Promise((resolve, reject) => {
    tmp.dir((err, tmpPath, cleanup) => {
      if (err) {
        return reject(err);
      }

      resolve([tmpPath, cleanup]);
    });
  });

  const dbPath = path.join(tmpPath, 'test.db');
  const config: DBJSONConfig = {
    dev: {
      driver: 'sqlite3',
      filename: dbPath,
    }
  };
  const configPath = path.join(tmpPath, 'database.json');
  await write(configPath, JSON.stringify(config));
  const dbm = DBMigrate.getInstance(true, {
    env: 'dev',
    config: configPath,
    cwd: path.resolve(path.join(__dirname, '../../')),
  });
  await dbm.up();
  return new LoggingDeletingEngine(cleanup, new SqliteEngine(dbPath));
}

export class LoggingDeletingEngine implements Engine {
  private readonly cleanup: () => void;

  private readonly backend: Engine;

  constructor (cleanup: () => void, backend: Engine) {
    this.cleanup = cleanup;
    this.backend = backend;
  }

  async close (): Promise<void> {
    await this.backend.close();
    this.cleanup();
  }

  each (sql: string, params: { [p: string]: any }, cb: (row: Row) => void) {
    console.log('[each] executing sql:', sql, params);
    return this.backend.each(sql, params, cb);
  }

  exec (sql: string, params: { [p: string]: any }) {
    console.log('[exec] executing sql:', sql, params);
    return this.backend.exec(sql, params);
  }

  first (sql: string, params: { [p: string]: any }): Row | null {
    console.log('[first] executing sql:', sql, params);
    return this.backend.first(sql, params);
  }

  withTx (cb: () => void) {
    return this.backend.withTx(() => {
      console.log('starting tx');
      cb();
      console.log('ending tx');
    });
  }

  open (): void {
    return this.backend.open();
  }
}