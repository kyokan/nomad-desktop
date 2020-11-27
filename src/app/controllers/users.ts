import fs from 'fs';
import {encrypt} from 'nomad-universal/lib/utils/key';
import {dirExists} from '../util/fs';
import {joinAppDataPath} from '../util/paths';
import * as path from 'path';
import {IPCMessageRequest, IPCMessageRequestType, RelayerLoginResponse, RelayerSignupResponse} from "../types";
import {isSubdomain, parseUsername, serializeUsername} from "../../ui/helpers/user";

type Identity = {
  tld: string;
  subdomain: string | null;
  encryptedKey?: string;
  relayerToken?: string;
}

type IdentityMap = {
  [name: string]: Identity;
}

type Opts = {
  dispatchMain: (msg: IPCMessageRequest<any>) => void;
  dispatchNewPost: (msg: IPCMessageRequest<any>) => void;
}

const identityDir = joinAppDataPath('.identity');
export const RELAYER_API = '';

export default class UsersManager {
  identity: IdentityMap;

  dispatchMain: (msg: IPCMessageRequest<any>) => void;

  dispatchNewPost: (msg: IPCMessageRequest<any>) => void;

  private currentUser: string;


  constructor (opts: Opts) {
    this.identity = {};
    this.currentUser = '';
    this.dispatchMain = opts.dispatchMain;
    this.dispatchNewPost = opts.dispatchNewPost;
  }

  async init () {
    await this.loadDB();
  }

  async loadDB () {
    const exists = await dirExists(identityDir);
    if (!exists) {
      await fs.promises.mkdir(identityDir);
    }

    const files = await fs.promises.readdir(identityDir);
    for (const filename of files) {
      if (/keystore/.test(filename)) {
        const username = filename
          .replace('.keystore', '')
          .replace('@', '.');
        const { tld, subdomain } = parseUsername(username);
        const data = await fs.promises.readFile(path.join(identityDir, filename));

        if (isSubdomain(username)) {
          this.identity[username] = {
            tld,
            subdomain,
            relayerToken: data.toString('utf-8'),
          };
        } else {
          this.identity[username] = {
            tld,
            subdomain: null,
            encryptedKey: data.toString('utf-8'),
          };
        }
      }
    }
  }

  async setCurrentUser (name: string) {
    if (!this.identity[name]) {
      throw new Error(`Cannot find ${identityDir}/${name}`);
    }

    const evt = {
      type: IPCMessageRequestType.CURRENT_IDENTITY_CHANGED,
      payload: name,
    };

    this.dispatchMain(evt);
    this.dispatchNewPost(evt);
    this.currentUser = name;
  }

  unsetCurrentUser = async () => {
    const currentUser = this.currentUser;
    const { tld, subdomain } = parseUsername(currentUser);

    if (isSubdomain(currentUser)) {
      this.identity[currentUser] = {
        tld,
        subdomain,
        relayerToken: undefined,
      };
      const filePath = path.join(identityDir, dotKeystore(`${subdomain}@${tld}`));
      await fs.promises.writeFile(filePath, '');
    }

    this.currentUser = '';

    const evt = {
      type: IPCMessageRequestType.CURRENT_IDENTITY_CHANGED,
      payload: '',
    };

    this.dispatchMain(evt);
  };

  async getCurrentUser (): Promise<string> {
    if (this.currentUser) {
      return this.currentUser;
    }

    return '';
  }

  getUserKeystore = (name: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (this.identity[name]) {
        resolve(this.identity[name].encryptedKey);
      } else {
        reject(new Error(`User ${name} does not exist.`));
      }
    });
  };

  getUserRelayerToken = (name: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (this.identity[name]) {
        resolve(this.identity[name].relayerToken);
      } else {
        reject(new Error(`User ${name} does not exist.`));
      }
    });
  };

  subdomainLogin = async (subdomain: string, tld: string, password: string): Promise<RelayerLoginResponse> => {
    const resp = await fetch(`${RELAYER_API}/login`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tld,
        username: subdomain,
        password,
      }),
    });
    const json: RelayerLoginResponse = await resp.json();

    if (resp.status !== 200) {
      throw new Error((json as any).message);
    }

    const username = serializeUsername(subdomain, tld);
    const filePath = path.join(identityDir, dotKeystore(`${subdomain}@${tld}`));
    await fs.promises.writeFile(filePath, json.token);
    this.identity[username] = {
      tld: tld,
      subdomain: subdomain,
      relayerToken: json.token,
    };

    return json;
  };

  addTLDIdentity = async (tld: string, privateKey: string, password: string): Promise<Identity> => {
    const backup = `${encrypt(privateKey, password)}`;
    const filePath = path.join(identityDir, `${tld}.keystore`);

    await fs.promises.writeFile(filePath, backup);

    this.identity[tld] = {
      tld,
      subdomain: null,
      encryptedKey: backup,
    };

    const evt = {
      type: IPCMessageRequestType.NEW_USER_ADDED,
      payload: serializeUsername(null, tld),
    };
    this.dispatchMain(evt);
    this.dispatchNewPost(evt);
    this.setCurrentUser(tld);

    return this.identity[tld];
  };

  addExistingSubdomainIdentity = async (subdomain: string, tld: string, password: string): Promise<Identity> => {
    const { token } = await this.subdomainLogin(subdomain, tld, password);
    const username = serializeUsername(subdomain, tld);
    const filePath = path.join(identityDir, `${subdomain}@${tld}.keystore`);
    await fs.promises.writeFile(filePath, token);

    this.identity[username] = {
      tld,
      subdomain,
      relayerToken: token,
    };

    const evt = {
      type: IPCMessageRequestType.NEW_USER_ADDED,
      payload: username,
    };
    this.dispatchMain(evt);
    this.dispatchNewPost(evt);
    this.setCurrentUser(username);

    return this.identity[username];
  };

  addSubdomainIdentity = async (subdomain: string, tld: string, email: string, password: string): Promise<Identity> => {
    const resp = await fetch(`${RELAYER_API}/users`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tld,
        username: subdomain,
        email,
        password,
      }),
    });


    if (resp.status !== 204) {
      const json: RelayerSignupResponse = await resp.json();
      throw new Error((json as any).message);
    }

    const { token } = await this.subdomainLogin(subdomain, tld, password);

    const username = serializeUsername(subdomain, tld);

    this.identity[username] = {
      tld: tld,
      subdomain: subdomain,
      relayerToken: token,
    };

    const evt = {
      type: IPCMessageRequestType.NEW_USER_ADDED,
      payload: username,
    };
    this.dispatchMain(evt);
    this.dispatchNewPost(evt);
    this.setCurrentUser(username);

    return this.identity[username];
  };
}

function dotKeystore(name: string): string {
  return `${name}.keystore`;
}

function undotKeystore(name: string): string {
  return name.replace('.keystore', '');
}
