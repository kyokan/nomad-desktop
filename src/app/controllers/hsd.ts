import path from "path";
import fs from "fs";
import crypto from "crypto";
import {EventEmitter} from "events";
import {app} from "electron";

const FullNode = require('hsd/lib/node/fullnode');
const {NodeClient} = require('hs-client');
const {Network} = require('hsd');
const NameState = require('hsd/lib/covenants/namestate');
const dirPath = path.join(app.getPath('userData'), 'hsd_data');

export const HSD_API_KEY = crypto.randomBytes(20).toString('hex');

export enum HSDEvents {
  NEW_NAME_STATE =  'NEW_NAME_STATE',
}

const appDataPath = path.join(app.getPath('userData'), 'appData');
const hsdDataPath = path.join(appDataPath, 'hsd');
const connectionTypePath = path.join(hsdDataPath, 'TYPE');
const hostPath = path.join(hsdDataPath, 'HOST');
const basePath = path.join(hsdDataPath, 'BASE_PATH');
const portPath = path.join(hsdDataPath, 'PORT');
const apiKeyPath = path.join(hsdDataPath, 'API_KEY');

export default class HSDService extends EventEmitter {
  hsd?: typeof FullNode;
  client?: typeof NodeClient;

  private async _ensureDir(dir: string) {
    const exists = fs.existsSync(dir);
    if (!exists) {
      await fs.promises.mkdir(dir, {recursive: true });
    }
  }

  private async ensurePath() {
    await this._ensureDir(dirPath);
    await this._ensureDir(appDataPath);
    await this._ensureDir(hsdDataPath);
  }

  async getConnectionType(): Promise<'P2P' | 'CUSTOM' | ''> {
    try {
      const type = await this.readFile(connectionTypePath);

      switch (type) {
        case 'P2P':
          return 'P2P';
        case 'CUSTOM':
          return 'CUSTOM';
        default:
          return '';
      }
    } catch (e) {
      return '';
    }
  }

  async readFile(filepath: string): Promise<string> {
    try {
      const buf = await fs.promises.readFile(filepath);
      return buf.toString('utf-8');
    } catch (e) {
      return '';
    }
  }

  async writeFile(filepath: string, value: Buffer): Promise<void> {
    return fs.promises.writeFile(filepath, value);
  }

  async setConnectionType(type: 'P2P' | 'CUSTOM' | ''): Promise<void> {
    return fs.promises.writeFile(connectionTypePath, type);
  }

  async setHost(host: string) {
    return this.writeFile(hostPath, Buffer.from(host, 'utf-8'));
  }

  async setPort(port: string) {
    return this.writeFile(portPath, Buffer.from(port, 'utf-8'));
  }

  async setAPIKey(apiKey: string) {
    return this.writeFile(apiKeyPath, Buffer.from(apiKey, 'utf-8'));
  }

  async setBasePath(base: string) {
    return this.writeFile(basePath, Buffer.from(base, 'utf-8'));
  }

  getConnection = async (): Promise<{
    type: 'P2P' | 'CUSTOM' | '';
    host: string;
    port: number;
    apiKey: string;
    basePath: string;
  }> => {
    const type = await this.getConnectionType();
    const host = await this.readFile(hostPath);
    const port = await this.readFile(portPath);
    const apiKey = await this.readFile(apiKeyPath);
    const bp = await this.readFile(basePath);

    return {
      type: type,
      host: host,
      port: Number(port),
      apiKey: apiKey,
      basePath: bp,
    }
  }

  async init() {
    await this.ensurePath();
  }


  async startNode() {
    if (this.hsd) {
      return;
    }

    const hsd = new FullNode({
      config: true,
      argv: true,
      env: true,
      logFile: true,
      logConsole: false,
      logLevel: 'debug',
      memory: false,
      workers: false,
      network: 'main',
      loader: require,
      prefix: dirPath,
      listen: true,
      bip37: true,
      indexAddress: true,
      indexTX: true,
      // apiKey: HSD_API_KEY,
    });

    await hsd.ensure();
    await hsd.open();
    await hsd.connect();
    await hsd.startSync();

    this.hsd = hsd;
  }

  async setHSDLocalClient() {
    const network = Network.get('main');
    const client = new NodeClient({
      network: network,
      port: network.rpcPort,
      apiKey: HSD_API_KEY,
    });
    await retry(() => client.getInfo(), 20, 200);
    this.client = client;
  }

  async setCustomRPCClient() {
    const conn = await this.getConnection();
    const {
      port,
      host,
      basePath,
      apiKey,
    } = conn;

    const network = Network.get('main');
    this.client = new NodeClient({
      network: network,
      apiKey: apiKey,
      port: port,
      host: host,
      path: basePath,
    });
  }

  async start() {
    const conn = await this.getConnection();

    switch (conn.type) {
      case 'CUSTOM':
        await this.setCustomRPCClient();
        return;
      case 'P2P':
      default:
        await this.startNode();
        await this.setHSDLocalClient();
        return;
    }
  }

  async stop() {
    await this.hsd!.close();
  }

  private _ensureClient() {
    if (!this.client || !this.client.execute || !this.hsd) {
      throw new Error('HSD has not started.');
    }
  }

  async iterateNames(cb?: (ns: typeof NameState) => void) {
    const hsd = this.hsd;
    const network = hsd.network;
    const height = hsd.chain.height;
    const txn = hsd.chain.db.txn;

    const iter = txn.iterator();

    while (await iter.next()) {
      const {key, value} = iter;
      const ns = NameState.decode(value);
      ns.nameHash = key;

      const info = ns.getJSON(height, network);

      if (cb) {
        cb(info);
      }

      this.emit(HSDEvents.NEW_NAME_STATE, info);
    }
  }

  async execute(methodName: string, params: any[] = []) {
    this._ensureClient();
    return await this.client.execute(methodName, params);
  }
}

async function retry(action: Function, attempts = 10, interval = 200) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      await action();
      return;
    } catch (e) {
      lastErr = e;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  console.error('Last err in retry:', lastErr);
  throw new Error('timed out');
}
