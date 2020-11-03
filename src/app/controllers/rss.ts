import logger from "../util/logger";
import * as path from "path";
import electron from "electron";
import fs from "fs";
import Database, { Database as DatabaseType } from 'better-sqlite3';
import {resourcesPath} from "../util/paths";

const dbPath = path.join(electron.app.getPath('userData'), 'rss.db');

class RSSManager {
  db?: DatabaseType;

  constructor() {
    this.init();
  }

  async init () {
    const exists = await this.dbExists();
    if (!exists) {
      logger.info('[indexer manager] Copying database');
      await this.copyDB();
      logger.info('[indexer manager] Copied database');
    }

    // eslint-disable-next-line no-console
    this.db = new Database(dbPath, { verbose: console.log });
  }

  private async dbExists () {
    try {
      await fs.promises.access(dbPath, fs.constants.F_OK);
    } catch (e) {
      logger.error(new Error(`${dbPath} does not exist`));
      return false;
    }

    logger.info(`[rss manager] ${dbPath} exists`);
    return true;
  }

  private async copyDB () {
    const src = path.join(resourcesPath(), 'nomad.db');
    await fs.promises.copyFile(src, dbPath);
  }

}
