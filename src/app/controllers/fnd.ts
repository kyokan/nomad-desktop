import fs from 'fs';
import path from 'path';
import {app} from 'electron';
import {ChildProcess, execFile, spawn} from 'child_process';
import FNDClient from 'fn-client/lib/fnd/FootnoteClient';
import {resourcesPath} from '../util/paths';
import net from 'net';
import {loggers} from "../util/logger";
import UserDataManager from "./userData";
import {
  APP_DATA_EVENT_TYPES,
  FND_EVENT_TYPES,
  DEFAULT_FLUSH_TIMEOUT,
  IPCMessageRequest,
  IPCMessageRequestType
} from "../types";
import {dotName, isSubdomain} from "../../ui/helpers/user";
import logger from "../../../external/nomad-api/src/util/logger";
import {
  getEndHeightFromLog,
  getHeightFromLog,
  getModuleFromLog,
  getMsgFromLog,
  getNameFromLog,
  getStartHeightFromLog,
  getSyncedHeightFromLog,
} from "../../../external/nomad-api/src/services/fnd";
import throttle from "lodash.throttle";
import {initializeApp, isAppInitialized} from "../util/appData";
import Timeout = NodeJS.Timeout;
import {HSD_API_KEY} from "./hsd";

const userDataPath = app.getPath('userData');
const appDataPath = path.join(userDataPath, 'appData');
const hsdDataPath = path.join(appDataPath, 'fnd');
const fndHome = path.join(userDataPath, 'fnd_data');
const fndPath = path.join(appDataPath, 'fndbin');
export const fndVersionPath = path.join(hsdDataPath, 'VERSION');
const fndInitNoncePath = path.join(hsdDataPath, 'INIT_NONCE');
export const handshakeStartHeight = path.join(hsdDataPath, 'START_HEIGHT');
export const handshakeEndHeight = path.join(hsdDataPath, 'END_HEIGHT');
const logDir = path.join(hsdDataPath, 'logs');

const LOG_LEVEL_LINE = 14;
const MONIKER_LINE = 20;
const HEARTBEAT_LINE = 22;
const API_KEY_LINE = 29;
const BASE_PATH_LINE = 31;
const HOST_LINE = 33;
const PORT_LINE = 35;

const CURRENT_INIT_NONCE = '1';
const FND_VERSION = '0.3.0';

const flushTimeoutMap: {
  [name: string]: Timeout | null;
} = {};

type Opts = {
  userDataManager: UserDataManager;
  dispatchMain: (msg: IPCMessageRequest<any>) => void;
  dispatchNewPost: (msg: IPCMessageRequest<any>) => void;
  dispatchSetting: (msg: IPCMessageRequest<any>) => void;
}

const handleImportedBlock = throttle(async function(log: string, dispatchMain: (msg: IPCMessageRequest<any>) => void) {
  const height = getHeightFromLog(log);
  if (height) {
    await fs.promises.writeFile(handshakeStartHeight, height);
    dispatchMain({
      type: APP_DATA_EVENT_TYPES.START_HEIGHT_UPDATED,
      payload: Number(height),
    });
  }
}, 500);

const handleImportingBlocks = throttle(async function(log: string, dispatchMain: (msg: IPCMessageRequest<any>) => void, cb: (s: string, e: string) => void) {
  const endHeightFromLog = getEndHeightFromLog(log);
  const startHeightFromLog = getStartHeightFromLog(log);
  if (endHeightFromLog && startHeightFromLog) {
    await fs.promises.writeFile(handshakeStartHeight, startHeightFromLog);
    await fs.promises.writeFile(handshakeEndHeight, endHeightFromLog);
    dispatchMain({
      type: APP_DATA_EVENT_TYPES.START_HEIGHT_UPDATED,
      payload: Number(startHeightFromLog),
    });
    dispatchMain({
      type: APP_DATA_EVENT_TYPES.END_HEIGHT_UPDATED,
      payload: Number(endHeightFromLog),
    });

    cb(startHeightFromLog, endHeightFromLog);
  }
}, 500);

const handleFullySyncedBlocks = throttle(async function(log: string, dispatchMain: (msg: IPCMessageRequest<any>) => void, cb: (s: string, e: string) => void) {
  const syncedHeightFromLog = getSyncedHeightFromLog(log);
  if (syncedHeightFromLog) {
    await fs.promises.writeFile(handshakeStartHeight, syncedHeightFromLog);
    await fs.promises.writeFile(handshakeEndHeight, syncedHeightFromLog);
    dispatchMain({
      type: APP_DATA_EVENT_TYPES.START_HEIGHT_UPDATED,
      payload: Number(syncedHeightFromLog),
    });
    dispatchMain({
      type: APP_DATA_EVENT_TYPES.END_HEIGHT_UPDATED,
      payload: Number(syncedHeightFromLog),
    });
    cb(syncedHeightFromLog, syncedHeightFromLog);
  }
}, 500);



const deleteFolderRecursive = function(dir: string) {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach((file, index) => {
      const curPath = path.join(dir, file);
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dir);
  }
};

export default class FNDController {
  private daemon: ChildProcess | null = null;
  private subscribers: ((log: string) => void)[];
  client: FNDClient;
  userDataManager: UserDataManager;
  dispatchMain: (msg: IPCMessageRequest<any>) => void;
  dispatchSetting: (msg: IPCMessageRequest<any>) => void;
  dispatchNewPost: (msg: IPCMessageRequest<any>) => void;
  onNameSyncedCallback?: (tld: string) => void;
  nodeStatus: 'on' | 'off' | 'error';

  constructor(opts: Opts) {
    this.userDataManager = opts.userDataManager;
    this.dispatchMain = opts.dispatchMain;
    this.dispatchSetting = opts.dispatchSetting;
    this.dispatchNewPost = opts.dispatchNewPost;
    this.subscribers = [];
    this.client = new FNDClient('127.0.0.1:9098');
    this.nodeStatus = 'off';
  }

  private async _ensureDir(dir: string) {
    const exists = fs.existsSync(dir);
    if (!exists) {
      await fs.promises.mkdir(dir, {recursive: true });
    }
  }

  private async ensurePath() {
    await this._ensureDir(appDataPath);
    await this._ensureDir(hsdDataPath);
    await this._ensureDir(logDir);
  }

  async init () {
    await this.ensurePath();
    await this.initDDRP();
  }

  onNameSynced = (cb: (tld: string) => void) => {
    this.onNameSyncedCallback = cb;
  };

  updateDDRPStatus(ddrpStatus: 'on' | 'off' | 'error') {
    this.nodeStatus = ddrpStatus;
    this.dispatchMain({
      type: FND_EVENT_TYPES.NODE_STATUS_CHANGED,
      payload: this.nodeStatus,
    });
    this.dispatchSetting({
      type: FND_EVENT_TYPES.NODE_STATUS_CHANGED,
      payload: this.nodeStatus,
    });
  }

  dispatchLogUpdate(log: string) {
    this.subscribers.forEach((sub) => {
      sub(log);
    });
  }

  subscribe (callback: (log: string) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  startDaemon = async () => {
    if (this.daemon) {
      return;
    }

    this.daemon = spawn(fndPath, ['start', '--home', fndHome]);

    this.updateDDRPStatus('on');

    this.daemon.stderr!.on('data', async (data) => {
      const dataString = data.toString('utf-8');
      loggers.fnd!.info(dataString);
      this.dispatchLogUpdate(dataString);
      const logs = dataString.split('\n');
      logs.forEach((log: string) => {
        const msg = getMsgFromLog(log);
        const module = getModuleFromLog(log);
        const name = getNameFromLog(log);

        if (this.onNameSyncedCallback && module === 'name-syncer' && /synced name/g.test(msg)) {
          logger.info(`Streaming ${dotName(name)}`);
          this.onNameSyncedCallback(dotName(name));
        }

        if (this.onNameSyncedCallback && module === 'updater' && /name updated/g.test(log)) {
          logger.info(`Streaming ${dotName(name)}`);
          this.onNameSyncedCallback(dotName(name));
        }

        if ((/msg="processed block"/gi).test(log) && (/module=hns-importer/gi).test(log)) {
          handleImportedBlock(log, this.dispatchMain);
        }

        if ((/msg="importing blocks"/gi).test(log) && (/module=hns-importer/gi).test(log)) {
          handleImportingBlocks(log, this.dispatchMain, async (startHeight, endHeight) => {
            if (startHeight === endHeight && !await isAppInitialized()) {
              await initializeApp();
              this.dispatchMain({
                type: APP_DATA_EVENT_TYPES.INITIALIZED_UPDATED,
                payload: null,
              });
            }
          });
        }
      });
    });

    this.daemon.stdout!.on('data', (data) => {
      const log = data.toString('utf-8');
      loggers.fnd!.info(log);
    });
    await this.tryPort();
  };

  stopDaemon = async () => {
    if (!this.daemon) {
      return;
    }

    this.daemon.kill();
    this.daemon = null;
    this.updateDDRPStatus('off');
  };

  private _sendUpdate = async (name: string) => {
    await this.client.sendUpdate(name);
    flushTimeoutMap[name] = null;
    const lastFlushed = Date.now();
    await this.userDataManager.setLastFlushed(lastFlushed);
    await this.userDataManager.emptyQueue();
    const respEvt = {
      type: IPCMessageRequestType.LAST_FLUSHED_UPDATED,
      payload: lastFlushed,
    };
    const respEvt2 = {
      type: IPCMessageRequestType.UPDATE_QUEUE_UPDATED,
      payload: [],
    };
    this.dispatchNewPost(respEvt);
    this.dispatchMain(respEvt);
    this.dispatchNewPost(respEvt2);
    this.dispatchMain(respEvt2);
  };

  sendUpdate = async (name: string) => {
    if (isSubdomain(name)) {
      return;
    }

    const userData = await this.userDataManager.getUserData();
    const lastFlushed = userData.lastFlushed;
    const now = Date.now();
    const timeGap = now - lastFlushed;

    if (timeGap > DEFAULT_FLUSH_TIMEOUT) {
      await this._sendUpdate(name);
    } else {
      if (!flushTimeoutMap[name]) {
        flushTimeoutMap[name] = setTimeout(async () => {
          await this._sendUpdate(name);
        }, DEFAULT_FLUSH_TIMEOUT - timeGap);
      }

      this.userDataManager.appendQueue('placeholder');
      const respEvt = {
        type: IPCMessageRequestType.UPDATE_QUEUE_UPDATED,
        payload: [...userData.updateQueue, 'placeholder'],
      };
      this.dispatchNewPost(respEvt);
      this.dispatchMain(respEvt);
    }
  };

  getHeartbeat = async () => {
    const content = await fs.promises.readFile(`${fndHome}/config.toml`);
    const splits = content.toString('utf-8').split('\n');
    const heartbeatLine = splits[HEARTBEAT_LINE];
    const heartbeat = heartbeatLine.slice(9, heartbeatLine.length - 1);
    return heartbeat;
  };

  setHeartbeat = async (url: string) => {
    const content = await fs.promises.readFile(`${fndHome}/config.toml`);
    const splits = content.toString('utf-8').split('\n');
    splits[HEARTBEAT_LINE] = `  url = "${url}"`;
    return await fs.promises.writeFile(`${fndHome}/config.toml`, splits.join('\n'));
  };

  getMoniker = async () => {
    const content = await fs.promises.readFile(`${fndHome}/config.toml`);
    const splits = content.toString('utf-8').split('\n');
    const monikerLine = splits[MONIKER_LINE];
    const moniker = monikerLine.slice(13, monikerLine.length - 1);
    return moniker;
  };

  setMoniker = async (moniker: string) => {
    const content = await fs.promises.readFile(`${fndHome}/config.toml`);
    const splits = content.toString('utf-8').split('\n');
    splits[MONIKER_LINE] = `  moniker = "${moniker}"`;
    return await fs.promises.writeFile(`${fndHome}/config.toml`, splits.join('\n'));
  };

  getHost = async () => {
    const content = await fs.promises.readFile(`${fndHome}/config.toml`);
    const splits = content.toString('utf-8').split('\n');
    const hostLine = splits[HOST_LINE];
    const host = hostLine.slice(10, hostLine.length - 1);
    return host;
  };

  setHost = async (host: string) => {
    const content = await fs.promises.readFile(`${fndHome}/config.toml`);
    const splits = content.toString('utf-8').split('\n');
    splits[HOST_LINE] = `  host = "${host}"`;
    return await fs.promises.writeFile(`${fndHome}/config.toml`, splits.join('\n'));
  };

  getAPIKey = async () => {
    const content = await fs.promises.readFile(`${fndHome}/config.toml`);
    const splits = content.toString('utf-8').split('\n');
    const apiKeyLine = splits[API_KEY_LINE];
    return apiKeyLine.slice(13, apiKeyLine.length - 1);
  };

  setFNDInfo = async (
    rpcUrl: string,
    rpcKey: string,
    heartbeatUrl: string,
    moniker: string,
    basePath: string,
    port: number
  ) => {
    const content = await fs.promises.readFile(`${fndHome}/config.toml`);
    const splits = content.toString('utf-8').split('\n');
    splits[API_KEY_LINE] = `  api_key = "${rpcKey}"`;
    splits[HOST_LINE] = `  host = "${rpcUrl}"`;
    splits[HEARTBEAT_LINE] = `  url = "${heartbeatUrl}"`;
    splits[MONIKER_LINE] = `  moniker = "${moniker}"`;
    splits[BASE_PATH_LINE] = `  base_path = "${basePath}"`;
    splits[PORT_LINE] = `  port = ${port}`;
    return await fs.promises.writeFile(`${fndHome}/config.toml`, splits.join('\n'));
  };

  setAPIKey = async (apiKey: string) => {
    const content = await fs.promises.readFile(`${fndHome}/config.toml`);
    const splits = content.toString('utf-8').split('\n');
    splits[API_KEY_LINE] = `  api_key = "${apiKey}"`;
    return await fs.promises.writeFile(`${fndHome}/config.toml`, splits.join('\n'));
  };

  setBasePath = async (basePath: string) => {
    const content = await fs.promises.readFile(`${fndHome}/config.toml`);
    const splits = content.toString('utf-8').split('\n');
    splits[BASE_PATH_LINE] = `  base_path = "${basePath}"`;
    return await fs.promises.writeFile(`${fndHome}/config.toml`, splits.join('\n'));
  };

  getBasePath = async () => {
    const content = await fs.promises.readFile(`${fndHome}/config.toml`);
    const splits = content.toString('utf-8').split('\n');
    const basePathLine = splits[BASE_PATH_LINE];
    return basePathLine.slice(15, basePathLine.length - 1);
  };

  getPort = async () => {
    const content = await fs.promises.readFile(`${fndHome}/config.toml`);
    const splits = content.toString('utf-8').split('\n');
    const portLine = splits[PORT_LINE];
    return portLine.slice(9, portLine.length);
  };

  setPort = async (port: string) => {
    const content = await fs.promises.readFile(`${fndHome}/config.toml`);
    const splits = content.toString('utf-8').split('\n');
    splits[PORT_LINE] = `  port = ${port || '80'}`;
    return await fs.promises.writeFile(`${fndHome}/config.toml`, splits.join('\n'));
  };

  setLogLevel = async (level: 'info' | 'trace' | 'error') => {
    const content = await fs.promises.readFile(`${fndHome}/config.toml`);
    const splits = content.toString('utf-8').split('\n');
    splits[LOG_LEVEL_LINE] = `log_level = "${level}"`;
    return await fs.promises.writeFile(`${fndHome}/config.toml`, splits.join('\n'));
  };

  getDDRPLog = async (): Promise<Buffer> => {
    const dir = await fs.promises.readdir(logDir);
    let latest = 0;
    dir.forEach(filename => {
      const [test, parsed] = filename.split('fnd-combined');

      if (!test && parsed) {
        const [v] = parsed.split('.');
        const version = v ? Number(v) : 0;
        latest = version > latest ? version : latest;
      }
    });

    return await fs.promises.readFile(`${logDir}/ddrp-combined${latest || ''}.log`);
  };

  getLogLevel = async (): Promise<'info' | 'trace'> => {
    const content = await fs.promises.readFile(`${fndHome}/config.toml`);
    const splits = content.toString('utf-8').split('\n');
    if (splits[LOG_LEVEL_LINE].includes('info')) return 'info';
    if (splits[LOG_LEVEL_LINE].includes('trace')) return 'trace';
    return 'info';
  };

  getPeers = async () => {
    return await this.client.listPeers();
  };

  banPeer = async (peerId: string, durationMS: number) => {
    return await this.client.banPeer(peerId, durationMS);
  };

  unbanPeer = async (ip: string) => {
    return await this.client.unbanPeer(ip);
  };

  private async initDDRP () {
    const shouldUpdateDDRP = await this.shouldUpdateFND();
    const shouldInitDDRP = await this.shouldInitFND();

    if (!shouldUpdateDDRP) {
      return;
    }

    // eslint-disable-next-line no-console
    logger.info('copying binary');
    await this.copyBinary();
    // eslint-disable-next-line no-console
    logger.info('copied binary');
    await fs.promises.writeFile(fndVersionPath, FND_VERSION);

    if (!shouldInitDDRP) {
      return;
    }

    try {
      // eslint-disable-next-line no-console
      logger.info('removing .fnd');
      deleteFolderRecursive(fndHome);
      logger.info('removed .fnd');
    } catch (rmdirErr) {
      //
      logger.error(rmdirErr);
      logger.error(rmdirErr.message);
      return;
    }
    const cmd = fndPath;

    await new Promise((resolve, reject) => execFile(cmd, ['init', '--home', fndHome], async (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }
      // eslint-disable-next-line no-console
      logger.info('out', stdout);
      // eslint-disable-next-line no-console
      logger.info('err', stderr);
      await this.setHost('http://127.0.0.1');
      await this.setHeartbeat('');
      await this.setMoniker('');
      await this.setAPIKey(`${HSD_API_KEY}`);
      await this.setBasePath('');
      await this.setPort('12037');

      await fs.promises.writeFile(fndInitNoncePath, CURRENT_INIT_NONCE);
      resolve();

    }));
  }

  async getHandshakeBlockInfo (): Promise<{ startHeight: number; endHeight: number}> {
    try {
      const startBuf = await fs.promises.readFile(handshakeStartHeight);
      const endBuf = await fs.promises.readFile(handshakeEndHeight);
      return {
        startHeight: Number(startBuf.toString('utf-8') || 0),
        endHeight: Number(endBuf.toString('utf-8') || 0),
      };
    } catch (e) {
      return {
        startHeight: 0,
        endHeight: 0,
      }
    }
  }

  private async shouldUpdateFND (): Promise<boolean> {
    try {
      const resp = await fs.promises.readFile(fndVersionPath);
      return resp.toString('utf-8') !== FND_VERSION;
    } catch (e) {
      return true;
    }
  }

  private async shouldInitFND (): Promise<boolean> {
    try {
      const resp = await fs.promises.readFile(fndInitNoncePath);
      return resp.toString('utf-8') !== CURRENT_INIT_NONCE;
    } catch (e) {
      return true;
    }
  }

  private async copyBinary () {
    const file = `fnd-${process.platform}-${process.arch}`;
    const src = path.join(resourcesPath(), file);
    await fs.promises.copyFile(src, fndPath);
    await fs.promises.chmod(fndPath, 0o755);
  }

  private async tryPort (retries = 3) {
    const attempt = () => new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const onError = () => {
        socket.destroy();
        reject();
      };

      socket.setTimeout(1000);
      socket.once('error', onError);
      socket.once('timeout', onError);
      socket.connect(9098, '127.0.0.1', () => {
        socket.end();
        resolve();
      });
    });

    for (let i = 0; i < retries; i++) {
      const start = Date.now();
      try {
        await attempt();
        return;
      } catch (e) {
        await new Promise((resolve) => setTimeout(resolve, Math.ceil(3000 - (Date.now() - start))));
      }
    }
  }
}

function wait(ms= 0): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
}
