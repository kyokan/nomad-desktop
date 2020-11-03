import fs from 'fs';
import {joinAppDataPath} from "../util/paths";
import {dirExists} from "../util/fs";
import {IPCMessageRequest, IPCMessageRequestType} from "../types";

const blocklistDir = joinAppDataPath('.blocklist');
const usersPath = `${blocklistDir}/.users`;
const topicsPath = `${blocklistDir}/.topics`;

type BlocklistManagerOpts = {
  dispatchMain: (msg: IPCMessageRequest<any>) => void;
  dispatchSetting: (msg: IPCMessageRequest<any>) => void;
}

export default class BlocklistManager {
  bannedUsers: { [u: string]: boolean };
  dispatchMain: (msg: IPCMessageRequest<any>) => void;
  dispatchSetting: (msg: IPCMessageRequest<any>) => void;

  constructor(opts: BlocklistManagerOpts) {
    this.bannedUsers = {};
    this.dispatchMain = opts.dispatchMain;
    this.dispatchSetting = opts.dispatchSetting;
  }

  broadcast = (msg: IPCMessageRequest<any>) => {
    this.dispatchMain(msg);
    this.dispatchSetting(msg);
  };

  async init () {
    this.ensureDir(blocklistDir);
  }

  async ensureDir (dir: string) {
    const exists = await dirExists(dir);
    if (!exists) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
  }

  getUsers = async (): Promise<string[]> => {
    try {
      const resp = await fs.promises.readFile(usersPath);
      const userlist = resp.toString('utf-8').split('\n');

      userlist.forEach(user => {
        this.bannedUsers[user] = true;
      });

      return userlist;
    } catch (err) {
      return [];
    }
  };

  addUser = async (user: string): Promise<string[]> => {
    const users = await this.getUsers();

    if (users.includes(user)) {
      return Promise.reject(`${user} is already added.`);
    }

    const newUsers = users.concat(user);

    await fs.promises.writeFile(usersPath, newUsers.join('\n'));
    this.broadcast({
      type: IPCMessageRequestType.MUTE_USER_UPDATED,
      payload: {
        name: user,
        blocked: true,
      },
    });
    this.bannedUsers[user] = true;
    return newUsers;
  };

  removeUser = async (user: string): Promise<string[]> => {
    const users = await this.getUsers();

    const newUsers = users.filter(u => u !== user);

    await fs.promises.writeFile(usersPath, newUsers.join('\n'));
    this.broadcast({
      type: IPCMessageRequestType.MUTE_USER_UPDATED,
      payload: {
        name: user,
        blocked: false,
      },
    });
    this.bannedUsers[user] = false;
    return newUsers;
  };

  isUserBanned = (user: string): boolean => {
    return !!this.bannedUsers[user];
  }
}
