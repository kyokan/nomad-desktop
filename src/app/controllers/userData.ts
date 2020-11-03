import fs from 'fs';
import {joinAppDataPath} from "../util/paths";
import {dirExists} from "../util/fs";
import {IPCMessageRequest} from "../types";
import UsersManager from "./users";
import {Filter} from "../../../external/nomad-api/src/util/filter";

const userDataDir = joinAppDataPath('.userData');

type UserDataManagerOpts = {
  dispatchMain: (msg: IPCMessageRequest<any>) => void;
  dispatchSetting: (msg: IPCMessageRequest<any>) => void;
  usersController: UsersManager;
}

export type CustomViewProps = {
  title: string;
  iconUrl: string;
  heroImageUrl: string;
  filter: Filter;
}

export type UserData = {
  mutedNames: string[];
  hiddenPostHashes: string[];
  savedViews: CustomViewProps[];
  lastFlushed: number;
  updateQueue: string[];
  offset: number;
}

export type UserDataOpts = {
  mutedNames?: string[];
  hiddenPostHashes?: string[];
  savedViews?: CustomViewProps[];
  lastFlushed?: number;
  updateQueue?: string[];
  offset?: number;
}


function extendUserData(old: UserData, opts: UserDataOpts): UserData {
  return {
    mutedNames: opts.mutedNames || old.mutedNames,
    hiddenPostHashes: opts.hiddenPostHashes || old.hiddenPostHashes,
    savedViews: opts.savedViews || old.savedViews,
    lastFlushed: opts.lastFlushed || old.lastFlushed,
    updateQueue: opts.updateQueue || old.updateQueue,
    offset: opts.offset || old.offset,
  };
}

export default class UserDataManager {
  dispatchMain: (msg: IPCMessageRequest<any>) => void;
  dispatchSetting: (msg: IPCMessageRequest<any>) => void;
  usersController: UsersManager;

  constructor(opts: UserDataManagerOpts) {
    this.dispatchMain = opts.dispatchMain;
    this.dispatchSetting = opts.dispatchSetting;
    this.usersController = opts.usersController;
  }

  broadcast = (msg: IPCMessageRequest<any>) => {
    this.dispatchMain(msg);
    this.dispatchSetting(msg);
  };

  private getUserPath = async (): Promise<string> => {
    const currentUser = await this.usersController.getCurrentUser();
    return `${userDataDir}/${currentUser || 'default'}`;
  };

  async init () {
    this.ensureDir(userDataDir);
  }

  async ensureDir (dir: string) {
    const exists = await dirExists(dir);
    if (!exists) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
  }

  getUserData = async (): Promise<UserData> => {
    try {
      const userPath = await this.getUserPath();
      const resp = await fs.promises.readFile(userPath);
      const userDataJson = resp.toString('utf-8');
      const userData: any = JSON.parse(userDataJson);
      const {
        mutedNames = [],
        hiddenPostHashes = [],
        savedViews = [],
        updateQueue = [],
        lastFlushed = 0,
        offset = 0,
      } = userData || {};
      return {
        mutedNames: mutedNames.filter((name: any) => typeof name === 'string'),
        hiddenPostHashes: hiddenPostHashes.filter((name: any) => typeof name === 'string'),
        savedViews: savedViews.filter((filter: any) => filter),
        updateQueue: updateQueue.filter((hash: any) => typeof hash === 'string'),
        lastFlushed,
        offset,
      };
    } catch (err) {
      return {
        mutedNames: [],
        hiddenPostHashes: [],
        savedViews: [],
        updateQueue: [],
        lastFlushed: 0,
        offset: 0,
      };
    }
  };

  setUserData = async (newUserData: UserData): Promise<void> => {
    const userPath = await this.getUserPath();
    const jsonString = JSON.stringify({
      mutedNames: newUserData.mutedNames,
      hiddenPostHashes: newUserData.hiddenPostHashes,
      savedViews: newUserData.savedViews,
      lastFlushed: newUserData.lastFlushed,
    });
    await fs.promises.writeFile(userPath, jsonString);
  };

  appendQueue = async (hash: string): Promise<void> => {
    const userPath = await this.getUserPath();
    const userData = await this.getUserData();
    const jsonString = JSON.stringify(extendUserData(userData, {
      updateQueue: [...userData.updateQueue, hash],
    }));
    await fs.promises.writeFile(userPath, jsonString);
  };

  emptyQueue = async (): Promise<void> => {
    const userPath = await this.getUserPath();
    const userData = await this.getUserData();
    const jsonString = JSON.stringify(extendUserData(userData, {
      updateQueue: [],
    }));
    await fs.promises.writeFile(userPath, jsonString);
  };

  setLastFlushed = async (lastFlushed: number): Promise<void> => {
    const userPath = await this.getUserPath();
    const userData = await this.getUserData();
    const jsonString = JSON.stringify(extendUserData(userData, {
      lastFlushed,
    }));
    await fs.promises.writeFile(userPath, jsonString);
  };

  setOffset = async (offset: number): Promise<void> => {
    const userPath = await this.getUserPath();
    const userData = await this.getUserData();
    const jsonString = JSON.stringify(extendUserData(userData, {
      offset,
    }));
    await fs.promises.writeFile(userPath, jsonString);
  };


  muteName = async (user: string): Promise<void> => {
    const userPath = await this.getUserPath();
    const userData = await this.getUserData();
    const jsonString = JSON.stringify(extendUserData(userData, {
      mutedNames: [
        ...userData.mutedNames,
        user,
      ],
    }));
    await fs.promises.writeFile(userPath, jsonString);
  };

  unmuteName = async (user: string): Promise<void> => {
    const userPath = await this.getUserPath();
    const userData = await this.getUserData();
    const jsonString = JSON.stringify(extendUserData(userData, {
      mutedNames: userData.mutedNames.filter(name => name !== user),
    }));
    await fs.promises.writeFile(userPath, jsonString);
  };

  hidePost = async (postHash: string): Promise<void> => {
    const userPath = await this.getUserPath();
    const userData = await this.getUserData();
    const jsonString = JSON.stringify(extendUserData(userData, {
      hiddenPostHashes: [
        ...userData.hiddenPostHashes,
        postHash,
      ],
    }));
    await fs.promises.writeFile(userPath, jsonString);
  };

  unhidePost = async (user: string): Promise<void> => {
    const userPath = await this.getUserPath();
    const userData = await this.getUserData();
    const jsonString = JSON.stringify(extendUserData(userData, {
      hiddenPostHashes: userData.hiddenPostHashes.filter(name => name !== user),
    }));
    await fs.promises.writeFile(userPath, jsonString);
  };

  saveView = async (view: CustomViewProps): Promise<void> => {
    const userPath = await this.getUserPath();
    const userData = await this.getUserData();
    const jsonString = JSON.stringify(extendUserData(userData, {
      savedViews: [...userData.savedViews, view],
    }));
    await fs.promises.writeFile(userPath, jsonString);
  };

  updateFilterByIndex = async (view: CustomViewProps, filterIndex: number): Promise<void> => {
    const userPath = await this.getUserPath();
    const userData = await this.getUserData();
    const jsonString = JSON.stringify(extendUserData(userData, {
      savedViews: userData.savedViews.map((f, i) => {
        if (i === filterIndex) {
          return view;
        }
        return f;
      }),
    }));
    await fs.promises.writeFile(userPath, jsonString);
  };

  deleteFilterByIndex = async (filterIndex: number): Promise<void> => {
    const userPath = await this.getUserPath();
    const userData = await this.getUserData();
    const jsonString = JSON.stringify(extendUserData(userData, {
      savedViews: userData.savedViews.filter((f, i) => i !== filterIndex),
    }));
    await fs.promises.writeFile(userPath, jsonString);
  };
}
