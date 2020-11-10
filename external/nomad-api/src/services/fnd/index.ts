import {ChildProcess, execFile, spawn} from "child_process";
import path from "path";
import fs from "fs";
import net from "net";
import logger from "../../util/logger";
import {dirExists} from "../../util/fs";
import {dotName} from "../../util/user";
const appDataPath = './build';
const fndHome = path.join(appDataPath, '.fnd');
const fndPath = path.join(appDataPath, 'fnd');

const LOG_LEVEL_LINE = 14;
const MONIKER_LINE = 20;
const HEARTBEAT_LINE = 22;
const API_KEY_LINE = 29;
const BASE_PATH_LINE = 31;
const HOST_LINE = 33;
const PORT_LINE = 35;
const config: any = {};

export class FNDController {
  private daemon: ChildProcess | null = null;
  onNameSyncedCallback?: (tld: string) => void;

  onNameSynced = (cb: (tld: string) => void) => {
    this.onNameSyncedCallback = cb;
  };

  async start() {
    await this.initFND();
    await this.startDaemon();
  }

  async initFND () {
    const exists = await this.fndDirExists();

    if (exists) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log('copying binary');
    await this.copyBinary();
    // eslint-disable-next-line no-console
    console.log('copied binary');
    const cmd = path.join(appDataPath, 'fnd');
    await new Promise((resolve, reject) => execFile(cmd, ['init', '--home', fndHome], async (err, stdout, stderr) => {
      if (err) {
        reject(err);
      }

      // eslint-disable-next-line no-console
      console.log('out', stdout);
      // eslint-disable-next-line no-console
      console.log('err', stderr);

      resolve();
    }));

    await this.setAPIKey(config.handshakeRPCKey);
    await this.setHost(config.handshakeRPCHost);
    await this.setMoniker(config.moniker);
    await this.setHeartbeat(config.heartbeartUrl);
    await this.setBasePath(config.handshakeBasePath);
    await this.setPort(config.handshakePort);
  }

  startDaemon = async () => {
    await this.stopDaemon();
    await new Promise(r => setTimeout(r, 5000));

    if (this.daemon) {
      return;
    }

    this.daemon = spawn(fndPath, ['start', '--home', fndHome]);
    this.daemon.stderr!.on('data', (data) => {
      const log = data.toString('utf-8');
      logger.info(log);
      const msg = getMsgFromLog(log);
      const module = getModuleFromLog(log);
      const name = getNameFromLog(log);

      if (module === 'name-syncer' && /synced name/g.test(msg)) {
        logger.info(`Streaming ${dotName(name)}`);
        this.onNameSyncedCallback!(dotName(name));
      }

      if (module === 'updater' && /name updated/g.test(log)) {
        logger.info(`Streaming ${dotName(name)}`);
        this.onNameSyncedCallback!(dotName(name));
      }
    });

    this.daemon.stdout!.on('data', (data) => {
      const log = data.toString('utf-8');
      logger.info(log);
    });

    await this.tryPort();
  };

  stopDaemon = async () => {
    if (!this.daemon) {
      return;
    }

    this.daemon.kill();
    this.daemon = null;
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
    const apiKey = apiKeyLine.slice(13, apiKeyLine.length - 1);
    return apiKey;
  };

  setDDRPInfo = async (rpcUrl: string, rpcKey: string, heartbeatUrl: string, moniker: string) => {
    const content = await fs.promises.readFile(`${fndHome}/config.toml`);
    const splits = content.toString('utf-8').split('\n');
    splits[API_KEY_LINE] = `  api_key = "${rpcKey}"`;
    splits[HOST_LINE] = `  host = "${rpcUrl}"`;
    splits[HEARTBEAT_LINE] = `  url = "${heartbeatUrl}"`;
    splits[MONIKER_LINE] = `  moniker = "${moniker}"`;
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

  setPort = async (port: string) => {
    const content = await fs.promises.readFile(`${fndHome}/config.toml`);
    const splits = content.toString('utf-8').split('\n');
    splits[PORT_LINE] = `  port = ${port}`;
    return await fs.promises.writeFile(`${fndHome}/config.toml`, splits.join('\n'));
  };

  setLogLevel = async (level: 'info' | 'trace' | 'error') => {
    const content = await fs.promises.readFile(`${fndHome}/config.toml`);
    const splits = content.toString('utf-8').split('\n');
    splits[LOG_LEVEL_LINE] = `log_level = "${level}"`;
    return await fs.promises.writeFile(`${fndHome}/config.toml`, splits.join('\n'));
  };

  private fndDirExists () {
    return dirExists(fndHome);
  }

  private async copyBinary () {
    const file = `fnd-${process.platform}-${process.arch}`;
    const src = path.join('resources', file);
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

export function getModuleFromLog(text: string) {
  try {
    // @ts-ignore
    return text.match(/module=(["a-zA-Z0-9\-"]+)/)[1];
  } catch (e) {
    return '';
  }
}

export function getNameFromLog(text: string) {
  try {
    // @ts-ignore
    return text.match(/name=([a-zA-Z0-9]+)/)[1];
  } catch (e) {
    return '';
  }
}

export function getMsgFromLog(text: string) {
  try {
    // @ts-ignore
    return text.match(/msg=("[a-zA-Z 0-9]+)/)[1];
  } catch (e) {
    return '';
  }
}

export function getStartHeightFromLog(text: string) {
  try {
    // @ts-ignore
    return text.match(/start_height=(["0-9"]+)/)[1];
  } catch (e) {
    return '';
  }
}

export function getEndHeightFromLog(text: string) {
  try {
    // @ts-ignore
    return text.match(/end_height=(["0-9"]+)/)[1];
  } catch (e) {
    return '';
  }
}

export function getSyncedHeightFromLog(text: string) {
  try {
    // @ts-ignore
    return text.match(/synced_height=(["0-9"]+)/)[1];
  } catch (e) {
    return '';
  }
}

export function getHeightFromLog(text: string) {
  try {
    // @ts-ignore
    return text.match(/height=(["0-9"]+)/)[1];
  } catch (e) {
    return '';
  }
}


