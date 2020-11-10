import * as path from "path";
import {SqliteEngine} from '../indexer/Engine';
import logger from "../../util/logger";
import * as fs from "fs";
import {Express, Request, Response} from "express";
import bodyParser from "body-parser";
import {makeResponse} from "../../util/rest";
const jsonParser = bodyParser.json();
const appDataPath = './build';
const namedbPath = path.join(appDataPath, 'names.db');
import {Envelope as DomainEnvelope} from 'fn-client/lib/application/Envelope';
import {Post as DomainPost} from 'fn-client/lib/application/Post';
import {
  Connection as DomainConnection,
} from 'fn-client/lib/application/Connection';
import {
  Moderation as DomainModeration,
} from 'fn-client/lib/application/Moderation';
import {ConnectionBody, MediaBody, PostBody} from "../../constants";
const bcrypt = require('bcrypt');
import {Writer} from "../writer";
const config = {};
import {
  hashConnectionBody,
  hashMediaBody,
  hashModerationBody,
  hashPostBody,
  mapBodyToEnvelope, mapWireToEnvelope
} from "../../util/envelope";
import secp256k1 from 'secp256k1';
import {IndexerManager} from "../indexer";
import {parseUsername, serializeUsername} from "../../util/user";
import {createSessionKey, hashPassword} from "../../util/key";
import PostgresAdapter from "../../db/PostgresAdapter";

export type SubdomainDBRow = {
  name: string;
  public_key?: string;
  tld: string;
  email?: string;
}

export class SubdomainManager {
  nameDB: SqliteEngine;
  namedbPath: string;
  resourcePath: string;
  writer?: Writer;
  indexer: IndexerManager;
  pgClient?: PostgresAdapter;

  constructor(opts: {
    dbPath?: string;
    namedbPath?: string;
    resourcePath?: string;
    pendingDbPath?: string;
    indexer: IndexerManager;
    pgClient?: PostgresAdapter;
  }) {
    this.pgClient = opts.pgClient;
    this.nameDB = new SqliteEngine(opts.namedbPath || namedbPath);
    this.namedbPath = opts.namedbPath || namedbPath;
    this.resourcePath = opts.resourcePath || 'resources';
    this.indexer = opts.indexer;
  }

  async start () {
    const exists = await this.dbExists();

    if (!exists) {
      logger.info('[subdomains manager] Copying database');
      await this.copyDB();
      logger.info('[subdomains manager] Copied database');
    }

    await this.nameDB.open();
  }

  private async dbExists () {
    try {
      await fs.promises.access(this.namedbPath, fs.constants.F_OK);
    } catch (e) {
      logger.error(new Error(`${this.namedbPath} does not exist`));
      return false;
    }

    logger.info(`[indexer manager] ${this.namedbPath} exists`);
    return true;
  }

  private async copyDB () {
    const nameSrc = path.join(this.resourcePath, 'names.db');
    await fs.promises.copyFile(nameSrc, this.namedbPath);
  }

  async getNameIndex(subdomain: string | null, tld: string, oldSubs: SubdomainDBRow[] = []): Promise<number> {
    if (!subdomain) return 0;
    const subs = await this.getSubdomainByTLD(tld);
    const ret = subs.length ? subs : oldSubs;
    return ret.map(({ name }) => name).indexOf(subdomain) + 1;
  }

  async getSubdomainByTLD(tld: string): Promise<SubdomainDBRow[]> {
    if (this.pgClient) return this.pgClient.getSubdomainByTLD(tld);

    const rows: SubdomainDBRow[] = [];

    this.nameDB!.each(`
      SELECT * FROM names
      WHERE tld = @tld
      ORDER BY name
    `, {
      tld,
    }, (row) => {
      rows.push(row as SubdomainDBRow);
    });
    return rows.reverse();
  }

  async getSubdomain(tld: string, subdomain: string): Promise<SubdomainDBRow | null> {
    if (this.pgClient) return this.pgClient.getSubdomain(tld, subdomain);

    let sub: SubdomainDBRow | null = null;

    this.nameDB!.each(`
      SELECT * FROM names
      WHERE tld = @tld AND name = @subdomain
    `, { tld, subdomain }, row => {
      sub = row as SubdomainDBRow;
    });

    return sub;
  }

  async addSubdomain(tld: string, subdomain: string, email = '', publicKey: string | null, password = ''): Promise<void> {
    if (this.pgClient) return this.pgClient.addSubdomain(tld, subdomain, email, publicKey, password);

    // @ts-ignore
    const tldData = config.signers[tld];

    if (!tldData || !tldData.privateKey) throw new Error(`cannot find singer for ${tld}`);

    this.nameDB!.exec(`
        INSERT INTO names (name, public_key, tld, email, password)
        VALUES (@subdomain, @publicKey, @tld, @email, @password)
    `, {
      tld,
      subdomain,
      publicKey: publicKey || '',
      email,
      password,
    });

    // this.writer?.reconstructSubdomainSectors(tld, new Date(), true);
  }

  async getSubdomainPassword(tld: string, subdomain: string): Promise<string> {
    if (this.pgClient) return this.pgClient.getSubdomainPassword(tld, subdomain);

    let password = '';

    this.nameDB!.each(`
      SELECT password FROM names
      WHERE tld = @tld AND name = @subdomain
    `, {
      tld,
      subdomain,
    }, row => {
      password = row.password;
    });

    return password;
  }

  handleSubdomainPost = async (req: Request, res: Response) => {
    const {
      tags = [],
      title = null,
      body,
      topic = null,
      reference = null,
      sig,
      timestamp,
      broadcast,
    } = req.body;

    const sessionToken = req.headers['x-api-token'];
    const sessionName = await this.verifySession(sessionToken);

    const { tld: sessionTLD, subdomain: sessionSubdomain } = parseUsername(sessionName);
    const { tld: signedTLD, subdomain: signedSubdomain, signature } = sig || {};
    const post: PostBody = {
      tags,
      title,
      body,
      topic,
      reference,
    };

    const tld = sessionName ? sessionTLD :  signedTLD;
    const subdomain = sessionName ? sessionSubdomain : signedSubdomain;

    try {
      const { public_key = '' } = await this.getSubdomain(tld, subdomain) || {};
      const nameIndex = await this.getNameIndex(subdomain, tld);

      if (!nameIndex) {
        return res.status(403).send(makeResponse('cannot find subdomain', true));
      }

      if (!body) {
        return res.status(400).send(makeResponse('invalid request', true));
      }

      const createAt = timestamp ? new Date(timestamp) : new Date(Math.floor(Date.now()/1000));

      if (!sessionName) {
        if (signature && public_key) {
          const hash = hashPostBody(post, createAt);
          // @ts-ignore
          const verfied = secp256k1.verify(
            hash,
            Buffer.from(signature, 'hex'),
            Buffer.from(public_key, 'hex')
          );

          if (!verfied) {
            return res.status(403).send(makeResponse('not authorized'));
          }
        } else {
          return res.status(403).send(makeResponse('not authorized'));
        }
      }

      const env = await mapBodyToEnvelope(tld, {
        post: {
          tags,
          title,
          body,
          topic,
          reference,
        },
        createAt,
        nameIndex,
      });



      if (!env) {
        return res.status(403).send(makeResponse('invalid post', true));
      }

      const subs = await this.getSubdomainByTLD(tld);
      await this.indexer.insertPost(tld, env, [{ name: '', tld, public_key: '' }, ...subs]);

      const mappedPost = await mapWireToEnvelope(tld, subdomain, env) as DomainEnvelope<DomainPost>;
      return res.send(makeResponse({
        id: mappedPost.id,
        network_id: mappedPost.networkId,
        refhash: mappedPost.refhash,
        username: mappedPost.subdomain,
        tld: mappedPost.tld,
        timestamp: mappedPost.createdAt.getTime(),
        title: mappedPost.message.title,
        reference: mappedPost.message.reference,
        body: mappedPost.message.body,
        topic: mappedPost.message.topic,
        tags: mappedPost.message.tags,
      }));
    } catch (e) {
      res.status(500).send(makeResponse(e.message, true));
    }
  };

  handleSubdomainModeration = async (req: Request, res: Response) => {
    const {
      type = 'LIKE',
      reference,
      timestamp,
      sig,
    } = req.body;

    const sessionToken = req.headers['x-api-token'];
    const sessionName = await this.verifySession(sessionToken);
    const { tld: sessionTLD, subdomain: sessionSubdomain } = parseUsername(sessionName);
    const { tld: signedTLD, subdomain: signedSubdomain, signature } = sig || {};
    const tld = sessionName ? sessionTLD :  signedTLD;
    const subdomain = sessionName ? sessionSubdomain : signedSubdomain;

    const mod = { type, reference };
    const createAt = timestamp ? new Date(timestamp) : new Date(Math.floor(Date.now()/1000));

    try {
      const { public_key = '' } = await this.getSubdomain(tld, subdomain) || {};
      const nameIndex = await this.getNameIndex(subdomain, tld);

      if (!nameIndex) {
        return res.status(403).send(makeResponse('cannot find subdomain', true));
      }

      if (!reference) {
        return res.status(400).send(makeResponse('invalid reqest', true));
      }


      if (!sessionName) {
        if (signature && public_key) {
          const hash = hashModerationBody(mod, createAt);

          // @ts-ignore
          const verfied = secp256k1.verify(
            hash,
            Buffer.from(signature, 'hex'),
            Buffer.from(public_key, 'hex')
          );

          if (!verfied) {
            return res.status(403).send(makeResponse('not authorized', true));
          }
        } else {
          return res.status(403).send(makeResponse('not authorized', true));
        }
      }

      const env = await mapBodyToEnvelope(tld, {
        moderation: {
          type,
          reference,
        },
        createAt,
        nameIndex,
      });

      if (!env) {
        return res.status(403).send(makeResponse('invalid post', true));
      }

      const subs = await this.getSubdomainByTLD(tld);
      await this.indexer.insertPost(tld, env, [{ name: '', tld, public_key: '' }, ...subs]);

      const domainEnv = await mapWireToEnvelope(tld, subdomain, env) as DomainEnvelope<DomainModeration>;

      return res.send(makeResponse({
        id: domainEnv.id,
        network_id: domainEnv.networkId,
        refhash: domainEnv.refhash,
        username: domainEnv.subdomain,
        tld: domainEnv.tld,
        timestamp: domainEnv.createdAt.getTime(),
        reference: domainEnv.message.reference,
        type: domainEnv.message.type,
      }));
    } catch (e) {
      res.status(500).send(makeResponse(e.message, true));
    }
  };

  handleSubdomainConnections = async (req: Request, res: Response) => {
    const {
      connectee_tld,
      connectee_subdomain,
      type,
      timestamp,
      sig,
    } = req.body;

    const sessionToken = req.headers['x-api-token'];
    const sessionName = await this.verifySession(sessionToken);
    const { tld: sessionTLD, subdomain: sessionSubdomain } = parseUsername(sessionName);
    const { tld: signedTLD, subdomain: signedSubdomain, signature } = sig || {};
    const tld = sessionName ? sessionTLD :  signedTLD;
    const subdomain = sessionName ? sessionSubdomain : signedSubdomain;
    const conn: ConnectionBody = {
      tld: connectee_tld,
      subdomain: connectee_subdomain || '',
      type: type || 'FOLLOW',
    };

    const createAt = timestamp ? new Date(timestamp) : new Date(Math.floor(Date.now()/1000));

    try {
      const { public_key = '' } = await this.getSubdomain(tld, subdomain) || {};
      const nameIndex = await this.getNameIndex(subdomain, tld);

      if (!nameIndex) {
        return res.status(403).send(makeResponse('cannot find subdomain', true));
      }

      if (!connectee_tld) {
        return res.status(400).send(makeResponse('invalid request', true));
      }

      if (!sessionName) {
        if (signature && public_key) {
          const hash = hashConnectionBody(conn, createAt);

          // @ts-ignore
          const verfied = secp256k1.verify(
            hash,
            Buffer.from(signature, 'hex'),
            Buffer.from(public_key, 'hex')
          );

          if (!verfied) {
            return res.status(403).send(makeResponse('not authorized', true));
          }
        } else {
          return res.status(403).send(makeResponse('not authorized', true));
        }
      }

      const env = await mapBodyToEnvelope(tld, {
        connection: conn,
        createAt,
        nameIndex,
      });

      if (!env) {
        return res.status(403).send(makeResponse('invalid post', true));
      }

      const subs = await this.getSubdomainByTLD(tld);
      await this.indexer.insertPost(tld, env, [{ name: '', tld, public_key: '' }, ...subs]);
      const domainEnv = await mapWireToEnvelope(tld, subdomain, env) as DomainEnvelope<DomainConnection>;

      return res.send(makeResponse({
        id: domainEnv.id,
        network_id: domainEnv.networkId,
        refhash: domainEnv.refhash,
        username: domainEnv.subdomain,
        tld: domainEnv.tld,
        timestamp: domainEnv.createdAt.getTime(),
        connectee_tld: domainEnv.message.tld,
        connectee_subdomain: domainEnv.message.subdomain,
        type: domainEnv.message.type,
      }));
    } catch (e) {
      res.status(500).send(makeResponse(e.message, true));
    }
  };

  handleLogin = async (req: Request, res: Response) => {
    try {
      const {
        tld,
        subdomain,
        password,
      } = req.body;

      const username = serializeUsername(subdomain, tld);
      const userPw = await this.getSubdomainPassword(tld, subdomain);
      const verified = bcrypt.compareSync(
        password,
        Buffer.from(userPw, 'hex').toString()
      );

      if (!verified) {
        return res.status(403).send(makeResponse('not authorized', true));
      }

      const expiry = Date.now() + (1000 * 60 * 60 * 24);
      const sessionKey = await createSessionKey(username, expiry);
      await this.addSession(username, sessionKey, expiry);

      res.send(makeResponse({
        token: sessionKey,
        expiry,
      }));
    } catch (e) {
      res.status(500).send(makeResponse(e.message, true));
    }
  };

  async verifySession(sessionKey?: string | string[]): Promise<string> {
    if (typeof sessionKey !== 'string') return '';
    if (this.pgClient) return this.pgClient.verifyUserSession(sessionKey);
    throw new Error('cannot find postgres client');
  }

  async addSession(username: string, token: string, expiry: number): Promise<void> {
    const { tld, subdomain } = parseUsername(username);

    if (!subdomain) {
      throw new Error('invalid username');
    }

    if (this.pgClient) {
      return this.pgClient.updateUserSession(
        token,
        expiry,
        tld,
        subdomain,
      );
    }

    throw new Error('cannot find postgres client');
  }

  setRoutes(app: Express) {
    app.post('/subdomains/posts', jsonParser, this.handleSubdomainPost);
    app.post('/subdomains/moderations', jsonParser, this.handleSubdomainModeration);
    app.post('/subdomains/connections', jsonParser, this.handleSubdomainConnections);
    app.post('/subdomains/login', jsonParser, this.handleLogin);

    app.post('/subdomains/signup', jsonParser, async (req, res) => {
      const {
        subdomain,
        tld,
        email,
        publicKey,
        password,
      } = req.body;

      if (!subdomain || typeof subdomain !== 'string') {
        return res.status(400).send(makeResponse('invalid username', true));
      }

      // @ts-ignore
      if (!config.signers[tld || '']) {
        return res.status(400).send(makeResponse('invalid tld', true));
      }

      if (email && typeof email !== 'string') {
        return res.status(400).send(makeResponse('invalid email', true));
      }

      if (password && typeof password !== 'string') {
        return res.status(400).send(makeResponse('invalid password', true));
      }

      if (typeof publicKey === 'string' && Buffer.from(publicKey, 'hex').length !== 33) {
        return res.status(400).send(makeResponse('invalid public key', true));
      }

      try {
        const hashedPw = password ? await hashPassword(password) : '';
        await this.addSubdomain(tld, subdomain, email, publicKey, hashedPw);
        res.send(makeResponse({
          subdomain,
          tld,
          email,
          public_key: publicKey,
          created_at: new Date().getTime(),
          updated_at: new Date().getTime(),
        }));
      } catch (e) {
        res.status(500).send(makeResponse(e.message, true));
      }
    });
  }
}

