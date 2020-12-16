import {PostsDAOImpl} from 'nomad-api/lib/services/indexer/PostsDAO';
import {ModerationsDAOImpl} from 'nomad-api/lib/services/indexer/ModerationsDAO';
import {ConnectionsDAOImpl} from 'nomad-api/lib/services/indexer/ConnectionsDAO';
import {SqliteEngine} from 'nomad-api/lib/services/indexer/Engine';
import SECP256k1Signer from 'fn-client/lib/crypto/signer'
import {Envelope as DomainEnvelope} from 'fn-client/lib/application/Envelope';
import {Post as DomainPost} from 'fn-client/lib/application/Post';
import {Connection as DomainConnection} from 'fn-client/lib/application/Connection';
import {Moderation as DomainModeration} from 'fn-client/lib/application/Moderation';

import electron from 'electron';
import * as path from 'path';
import fs from 'fs';
import {resourcesPath} from '../util/paths';
import logger from "../util/logger";
import UsersManager from "./users";
import FNDController, {fndVersionPath} from "./fnd";
import {isTLD, parseUsername} from "nomad-api/lib/util/user";
import {IndexerManager} from "nomad-api/lib/services/indexer";
import {Writer} from "nomad-api/lib/services/writer";
import UserDataManager from "./userData";
import {isAppInitialized} from "../util/appData";

const NOT_INITIALIZED_ERROR = new Error('Indexer Manager is not initialized.');
const NO_CURRENT_USER = new Error('No Creator.');

const dbPath = path.join(electron.app.getPath('userData'), 'appData', 'nomad.db');
const namedbPath = path.join(electron.app.getPath('userData'), 'appData', 'names.db');
const indexerVersionPath = fndVersionPath;

export type TopicMeta = {
  postOrder: {
    name: string;
    guid: string;
    hash: string;
  }[];
  posts: number;
  comments: number;
}

export type GlobalMeta = {
  topics: {
    [topicName: string]: TopicMeta;
  };
  users: {
    [username: string]: {
      posts: number;
      comments: number;
      profilePictureUrl?: string;
      lastProfilePictureUpdate?: number;
      coverImageUrl?: string;
      lastCoverImageUpdate?: number;
      firstActivity: number;
      lastActivity: number;
      topics: {
        [topic: string]: number;
      };
    };
  };
  lastScanned: number;
}

export default class SignerManager {
  pkHex: string;
  postsDao?: PostsDAOImpl;
  moderationsDao?: ModerationsDAOImpl;
  connectionsDao?: ConnectionsDAOImpl;
  writer?: Writer;
  signer?: SECP256k1Signer;
  usersController: UsersManager;
  fndController: FNDController;
  indexerManager: IndexerManager;
  userDataManager: UserDataManager;

  constructor (opts: {
    usersController: UsersManager;
    fndController: FNDController;
    indexerManager: IndexerManager;
    userDataManager: UserDataManager;
    writer: Writer;
  }) {
    this.pkHex = '';
    this.userDataManager = opts.userDataManager;
    this.usersController = opts.usersController;
    this.fndController = opts.fndController;
    this.indexerManager = opts.indexerManager;
    this.writer = opts.writer;
  }

  async init () {
    logger.info('[indexer manager] Copying database');
    await this.copyDB();
    logger.info('[indexer manager] Copied database');

    const engine = new SqliteEngine(dbPath);
    await engine.open();
    this.postsDao = new PostsDAOImpl(engine);
    this.moderationsDao = new ModerationsDAOImpl(engine);
    this.connectionsDao = new ConnectionsDAOImpl(engine);
    this.setIngestor('');
  }

  private async shouldUpdateNomadDB (): Promise<boolean> {
    try {
      const resp = await fs.promises.readFile(indexerVersionPath);
      return resp.toString('utf-8') !== '0.0.55';
    } catch (e) {
      return true;
    }
  }

  private async copyDB () {
    const src = path.join(resourcesPath(), 'nomad.db');
    const nameSrc = path.join(resourcesPath(), 'names.db');
    if (!fs.existsSync(dbPath)) {
      await fs.promises.copyFile(src, dbPath);
    }

    if (!fs.existsSync(namedbPath)) {
      await fs.promises.copyFile(nameSrc, namedbPath);
    }
  }

  private async setIngestor (pkhex: string) {
    if (!this.postsDao || !this.moderationsDao || !this.connectionsDao) return;
    this.signer = SECP256k1Signer.fromHexPrivateKey(pkhex || '0000000000000000000000000000000000000000000000000000000000000000');
  }

  addSignerByHexPrivateKey (pk: string) {
    return this.setIngestor(pk);
  }

  private async appendTLDMessage(tld: string, env: DomainEnvelope<DomainPost|DomainModeration|DomainConnection>, truncate: boolean): Promise<DomainEnvelope<DomainPost|DomainModeration|DomainConnection>> {
    if (!this.signer) {
      return Promise.reject(new Error('User is not logged in.'));
    }

    const wire = env.toWire(0);
    const initialized = await isAppInitialized();
    let offset = 0;
    let post, moderation, connection;

    if (initialized) {
      await this.fndController.client.scanBlob(tld, async (type, subtype, env) => {
        const bytes = await env.toBytes();
        offset = offset + bytes.length;
        return true;
      }, 8*1024).catch(() => null);

      await this.writer?.appendEnvelope(
        tld,
        wire,
        undefined,
        false,
        offset,
        this.signer,
      );
    } else {
      const blob = await fetchBlobInfo(tld).catch(() => ({ offset: 0 }));
      offset = blob.offset;

      switch (wire.message.type.toString('utf-8')) {
        case 'PST':
          post = {
            title: (env.message as DomainPost).title,
            body: (env.message as DomainPost).body,
            reference: (env.message as DomainPost).reference,
            topic: (env.message as DomainPost).topic,
            tags: (env.message as DomainPost).tags,
          };
          break;
        case 'MOD':
          moderation = {
            reference: (env.message as DomainModeration).reference,
            type: (env.message as DomainModeration).type,
          };
          break;
        case 'CNT':
          connection = {
            tld: (env.message as DomainConnection).tld,
            type: (env.message as DomainModeration).type,
          };
          break;
        default:
          break;
      }

      const {refhash, sealedHash, envelope} = await precommit({
        tld,
        post,
        moderation,
        connection,
        offset,
      });
      const sig = this.signer.sign(Buffer.from(sealedHash, 'hex'));
      await commit({
        tld,
        post,
        moderation,
        connection,
        date: envelope.timestamp,
        sealedHash,
        sig: sig.toString('hex'),
        refhash,
        offset,
      });
    }

    // const nextOffset = await this.writer?.appendEnvelope(
    //   tld,
    //   wire,
    //   undefined,
    //   false,
    //   offset,
    //   this.signer,
    // );
    //
    // if (typeof nextOffset === "number") {
    //   await this.userDataManager.setOffset(nextOffset);
    // }

    return env;
  }

  async sendNewPost (username: string, envelope: DomainEnvelope<DomainPost|DomainModeration|DomainConnection>, truncate: boolean): Promise<any> {
    if (!username) {
      return Promise.reject(NO_CURRENT_USER);
    }

    if (!this.postsDao || !this.moderationsDao) {
      return Promise.reject(NOT_INITIALIZED_ERROR);
    }

    const { tld } = parseUsername(username);

    if (isTLD(username)) {
      if (truncate) {
        const res = await this.writer!.truncateBlob(tld, new Date(), true, this.signer);
        return res;
      }

      const res = await this.appendTLDMessage(tld, envelope, truncate);
      const env = envelope.toWire(0);
      await this.indexerManager.insertPost(tld, env, [{ name: '', tld, public_key: '' }]);
      return res;
    }

    return Promise.reject(new Error('doesn\'t support subdomains'));
  }
}

function wait(ms= 0): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
}

async function precommit(body: object) {
  const resp = await fetch(`https://api.nmd.co/relayer/precommit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 'X-API-Token': token || '',
    },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  return json.payload;
}

async function commit(body: object) {
  const resp2 = await fetch(`https://api.nmd.co/relayer/commit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json2: any = await resp2.json();

  if (json2.error) {
    throw new Error(json2.payload as string);
  }

  return json2.payload;
}

async function fetchBlobInfo(tld: string) {
  const resp = await fetch(`https://api.nmd.co/blob/${tld}/info`);
  return await resp.json();
}
