import DDRPDClient from "fn-client/lib/fnd/FootnoteClient";
import {BufferedReader} from "fn-client/lib/io/BufferedReader";
import {BlobReader} from "fn-client/lib/fnd/BlobReader";
import {
  asyncIterateAllEnvelopes,
  isSubdomainBlob,
  iterateAllSubdomains,
} from "fn-client/lib/wire/streams";
import {Envelope as WireEnvelope} from "fn-client/lib/wire/Envelope";
import {Envelope as DomainEnvelope} from 'fn-client/lib/application/Envelope';
import {Post as DomainPost} from 'fn-client/lib/application/Post';
import {
  Connection as DomainConnection,
  Follow as DomainFollow,
  Block as DomainBlock,
} from 'fn-client/lib/application/Connection';
import {Moderation as DomainModeration} from 'fn-client/lib/application/Moderation';
import {Post} from "fn-client/lib/wire/Post";
import {Connection} from "fn-client/lib/wire/Connection";
import {Moderation} from "fn-client/lib/wire/Moderation";
import {PostsDAOImpl} from './PostsDAO';
import {ConnectionsDAOImpl} from './ConnectionsDAO';
import {ModerationsDAOImpl} from './ModerationsDAO';
import {SqliteEngine, Row} from './Engine';
import {Pageable} from './Pageable';
import * as path from 'path';
import * as fs from "fs";
import logger from "../../util/logger";
import {UserProfile} from "../../constants";
import {Express, Request, Response} from "express";
import {makeResponse} from "../../util/rest";
import bodyParser from "body-parser";
const jsonParser = bodyParser.json();
import Avatars from '@dicebear/avatars';
import Identicon from '@dicebear/avatars-identicon-sprites';
import Gridy from '@dicebear/avatars-gridy-sprites';
import Avataaars from '@dicebear/avatars-avataaars-sprites';
import Bottts from '@dicebear/avatars-bottts-sprites';
import Jdenticon from '@dicebear/avatars-jdenticon-sprites';
import {dotName, parseUsername, serializeUsername} from "../../util/user";
import {extendFilter, Filter} from "../../util/filter";
import {trackAttempt} from "../../util/matomo";
const appDataPath = './build';
const dbPath = path.join(appDataPath, 'nomad.db');
import {mapWireToEnvelope} from "../../util/envelope";
import {SubdomainDBRow} from "../subdomains";
import PostgresAdapter from "../../db/PostgresAdapter";

const SPRITE_TO_SPRITES: {[sprite: string]: any} = {
  identicon: Identicon,
  bottts: Bottts,
  avataaars: Avataaars,
  gridy: Gridy,
  jdenticon: Jdenticon,
};

const TLD_CACHE: {
  [tld: string]: string;
} = {};

const IMAGE_CACHE: {
  [hash: string]: {
    type: string;
    filename: string;
    data: Buffer;
  };
} = {};

const AVATAR_CACHE: {
  [spriteSeed: string]: string;
} = {};

export class IndexerManager {
  postsDao?: PostsDAOImpl;
  connectionsDao?: ConnectionsDAOImpl;
  moderationsDao?: ModerationsDAOImpl;
  client: DDRPDClient;
  engine: SqliteEngine;
  pgClient?: PostgresAdapter;
  dbPath: string;
  resourcePath: string;

  constructor(opts?: {
    dbPath?: string;
    namedbPath?: string;
    resourcePath?: string;
    pgClient?: PostgresAdapter;
  }) {
    const client = new DDRPDClient('127.0.0.1:9098');
    this.client = client;

    this.pgClient = opts?.pgClient;
    this.engine = new SqliteEngine(opts?.dbPath || dbPath);
    this.dbPath = opts?.dbPath || dbPath;
    this.resourcePath = opts?.resourcePath || 'resources';
  }

  handlers = {
    '/channel-posts': async (req: Request, res: Response) => {
      trackAttempt('Get All Channel Posts', req);
      try {
        const { order, offset, limit } = req.query || {};
        const posts = await this.getChannelPosts(order, limit, offset);
        res.send(makeResponse(posts));
      } catch (e) {
        res.status(500).send(makeResponse(e.message, true));
      }
    },

    '/posts': async (req: Request, res: Response) => {
      trackAttempt('Get All Posts', req);
      try {
        const { order, offset, limit } = req.query || {};
        const posts = await this.getPosts(order, limit, offset);
        res.send(makeResponse(posts));
      } catch (e) {
        res.status(500).send(makeResponse(e.message, true));
      }
    },

    '/posts/:hash': async (req: Request, res: Response) =>  {
      try {
        trackAttempt('Get One Post', req, req.params.hash);
        const post = await this.getPostByHash(req.params.hash);
        res.send(makeResponse(post));
      } catch (e) {
        res.status(500).send(makeResponse(e.message, true));
      }
    },

    '/posts/:hash/comments': async (req: Request, res: Response) =>  {
      trackAttempt('Get Post Comments', req, req.params.hash);
      const { order, offset } = req.query || {};
      const post = await this.getCommentsByHash(req.params.hash, order, offset);
      res.send(makeResponse(post));
    },
    //
    '/filter': async (req: Request, res: Response) =>  {
      trackAttempt('Get Posts by Filter', req);
      const { order, limit, offset } = req.query || {};
      const { filter } = req.body;
      const post = await this.getPostsByFilter(filter, order, limit, offset);
      res.send(makeResponse(post));
    },

    '/tlds': async (req: Request, res: Response) => {
      trackAttempt('Get All TLDs', req);
      const tlds = await this.readAllTLDs();
      res.send(makeResponse(tlds));
    },

    '/tags': async (req: Request, res: Response) => {
      trackAttempt('Get Posts by Tags', req);
      const { order, limit, offset, tags } = req.query || {};
      const posts = await this.getPostsByFilter(extendFilter({
        postedBy: ['*'],
        allowedTags: Array.isArray(tags) ? tags : [tags],
      }), order, limit, offset);
      res.send(makeResponse(posts));
    },

    '/users/:username/timeline': async (req: Request, res: Response) => {
      trackAttempt('Get Timeline by User', req, req.params.username);
      const { order, limit, offset } = req.query || {};
      const {tld, subdomain} = parseUsername(req.params.username);

      const posts = await this.getPostsByFilter(extendFilter({
        postedBy: [serializeUsername(subdomain, tld)],
      }), order, limit, offset);

      res.send(makeResponse(posts));
    },

    '/users/:username/likes': async (req: Request, res: Response) => {
      trackAttempt('Get Likes by User', req, req.params.username);
      const { order, limit, offset } = req.query || {};
      const {tld, subdomain} = parseUsername(req.params.username);
      const posts = await this.getPostsByFilter(extendFilter({
        likedBy: [serializeUsername(subdomain, tld)],
      }), order, limit, offset);
      res.send(makeResponse(posts));
    },

    '/users/:username/comments': async (req: Request, res: Response) => {
      trackAttempt('Get Comments by User', req, req.params.username);
      const { order, limit, offset } = req.query || {};
      const {tld, subdomain} = parseUsername(req.params.username);
      const posts = await this.getPostsByFilter(extendFilter({
        repliedBy: [serializeUsername(subdomain, tld)],
      }), order, limit, offset);
      res.send(makeResponse(posts));
    },

    '/users/:username/followees': async (req: Request, res: Response) => {
      trackAttempt('Get Followees by User', req, req.params.username);
      const { order, limit, offset } = req.query || {};
      const posts = await this.getUserFollowings(req.params.username, order, limit, offset);
      res.send(makeResponse(posts));
    },

    '/users/:username/followers': async (req: Request, res: Response) => {
      trackAttempt('Get Followers by User', req, req.params.username);
      const { order, limit, offset } = req.query || {};
      const posts = await this.getUserFollowers(req.params.username, order, limit, offset);
      res.send(makeResponse(posts));
    },

    '/users/:username/blockees': async (req: Request, res: Response) => {
      trackAttempt('Get Blockees by User', req, req.params.username);
      const { order, limit, offset } = req.query || {};
      const posts = await this.getUserBlocks(req.params.username, order, limit, offset);
      res.send(makeResponse(posts));
    },

    // '/users/:username/uploads': async (req: Request, res: Response) => {
    //   trackAttempt('Get uploads by User', req, req.params.username);
    //   const { order, limit, offset } = req.query || {};
    //   const posts = await this.getUserUploads(req.params.username, order, limit, offset);
    //   res.send(makeResponse(posts));
    // },

    '/users/:username/profile': async (req: Request, res: Response) => {
      trackAttempt('Get User Profile', req, req.params.username);
      const hash = await this.getUserProfile(req.params.username);
      res.send(makeResponse(hash));
    },

    '/users/:username/channels': async (req: Request, res: Response) => {
      trackAttempt('Get User Channels', req, req.params.username);
      const { order, limit, offset } = req.query || {};
      const posts = await this.getUserChannels(req.params.username, order, limit, offset);
      res.send(makeResponse(posts));
    },

    '/channels': async (req: Request, res: Response) => {
      trackAttempt('Get Channels', req);
      const { order, limit, offset } = req.query || {};
      const posts = await this.getChannels(order, limit, offset);
      res.send(makeResponse(posts));
    },

    '/avatars/:sprite/:seed.svg': async (req: Request, res: Response) => {
      try {
        const { sprite, seed } = req.params;
        const sprites: any = SPRITE_TO_SPRITES[sprite];

        if (AVATAR_CACHE[sprite + seed]) {
          res.set({ 'Content-Type': 'image/svg+xml' });
          res.send(AVATAR_CACHE[seed]);
          return;
        }

        const avatars = new Avatars(sprites, {
          margin: 12,
          width: 100,
          height: 100,
        });
        const svg = avatars.create(seed);
        AVATAR_CACHE[seed] = svg;
        res.set({ 'Content-Type': 'image/svg+xml' });
        res.send(AVATAR_CACHE[seed]);
      } catch (e) {
        res.status(500);
        res.send(e.message);
      }
    },

    '/media/:refhash': async (req: Request, res: Response) => {
      try {
        const { refhash } = req.params;

        if (IMAGE_CACHE[refhash]) {
          // res.set('Content-Disposition', `attachment; filename=${encodeURI(IMAGE_CACHE[refhash].filename)}`);
          res.set({'Content-Type': IMAGE_CACHE[refhash].type});
          res.send(IMAGE_CACHE[refhash].data);
          return;
        }

        const media = await this.getMediaByHash(refhash);

        if (!media) {
          return res.status(404).send();
        }

        // res.set('Content-Disposition', `attachment; filename=${encodeURI(media.filename)}`);
        res.set({'Content-Type': media.mime_type});
        res.send(media.content);
      } catch (e) {
        res.status(500);
        res.send(e.message);
      }
    },

    '/trending/tags': async (req: Request, res: Response) => {
      try {
        trackAttempt('Get Trending Tags', req);
        const { limit, offset } = req.query || {};
        const tags = await this.queryTrendingTags(limit, offset);
        res.send(makeResponse(tags));
      } catch (e) {
        res.status(500);
        res.send(e.message);
      }
    },

    '/trending/users': async (req: Request, res: Response) => {
      try {
        trackAttempt('Get Trending Posters', req);
        const { limit, offset } = req.query || {};
        const tags = await this.queryTrendingPosters(limit, offset);
        res.send(makeResponse(tags));
      } catch (e) {
        res.status(500);
        res.send(e.message);
      }
    },
  };

  setRoutes = (app: Express) => {
    // app.get('/channel-posts', this.handlers['/channel-posts']);
    app.get('/posts', this.handlers['/posts']);
    app.get('/posts/:hash', this.handlers['/posts/:hash']);
    app.get('/posts/:hash/comments', this.handlers['/posts/:hash/comments']);
    app.post('/filter', jsonParser, this.handlers['/filter']);
    app.get('/tlds', this.handlers['/tlds']);
    app.get('/tags', this.handlers['/tags']);
    app.get('/users/:username/timeline', this.handlers['/users/:username/timeline']);
    app.get('/users/:username/likes', this.handlers['/users/:username/likes']);
    app.get('/users/:username/comments', this.handlers['/users/:username/comments']);
    app.get('/users/:username/followees', this.handlers['/users/:username/followees']);
    app.get('/users/:username/followers', this.handlers['/users/:username/followers']);
    app.get('/users/:username/blockees', this.handlers['/users/:username/blockees']);
    // app.get('/users/:username/uploads', this.handlers['/users/:username/uploads']);
    app.get('/users/:username/profile', this.handlers['/users/:username/profile']);
    // app.get('/users/:username/channels', this.handlers['/users/:username/channels']);
    // app.get('/channels', this.handlers['/channels']);
    app.get('/avatars/:sprite/:seed.svg', this.handlers['/avatars/:sprite/:seed.svg']);
    app.get('/media/:refhash', this.handlers['/media/:refhash']);
    app.get('/trending/tags', this.handlers['/trending/tags']);
    app.get('/trending/users', this.handlers['/trending/users']);

    // app.get('/ipfs/:ipfsHash', async (req: Request, res: Response) => {
    //   try {
    //     const { ipfsHash } = req.params;
    //     const ipfs = await getNode();
    //
    //     const chunks = [];
    //     for await (const chunk of ipfs.cat(ipfsHash)) {
    //       chunks.push(chunk)
    //     }
    //
    //     const buf = Buffer.concat(chunks);
    //     const { mime } = FileType(buf) || {};
    //
    //     if (!chunks.length) {
    //       return res.status(404).send();
    //     }
    //
    //     // res.set('Content-Disposition', `attachment; filename=${ipfsHash}.${ext}`);
    //     res.set({'Content-Type': mime });
    //     res.send(buf);
    //   } catch (e) {
    //     res.status(500);
    //     res.send(e.message);
    //   }
    // })
    //
    // app.post('/video/upload', async (req, res) => {
    //   try {
    //     const {
    //       filename,
    //     } = req.body;
    //     // @ts-ignore
    //     const files = req.files || {};
    //     const file = files.file;
    //
    //     const ipfs = await addFileToIPFS(filename, file.data);
    //
    //     const magnet = await addFileToWebTorrent(filename, file.data);
    //
    //     res.send(makeResponse({
    //       ipfs,
    //       magnet,
    //     }));
    //   } catch (e) {
    //     console.log(e);
    //     res.status(500).send(makeResponse(e.message, true));
    //   }
    //
    // });
  };

  getUserBlocks = async (username: string, order: 'ASC' | 'DESC' = 'ASC', limit = 20, start = 0): Promise<Pageable<DomainBlock, number>> => {
    if (this.pgClient) return this.pgClient.getUserConnectees(username, 'BLOCK', order, limit, start);
    const { tld, subdomain } = parseUsername(username);
    return this.connectionsDao!.getBlockees(tld, subdomain || '', limit, start);
  };

  getUserFollowings = async (username: string, order: 'ASC' | 'DESC' = 'ASC', limit = 20, start = 0): Promise<Pageable<DomainFollow, number>> => {
    if (this.pgClient) return this.pgClient.getUserConnectees(username, 'FOLLOW', order, limit, start);
    const { tld, subdomain } = parseUsername(username);
    return this.connectionsDao!.getFollowees(tld, subdomain || '', limit, start);
  };

  getUserFollowers = async (username: string, order: 'ASC' | 'DESC' = 'ASC', limit = 20, start = 0): Promise<Pageable<DomainFollow, number>> => {
    if (this.pgClient) return this.pgClient.getUserConnecters(username, 'FOLLOW', order, limit, start);
    const { tld, subdomain } = parseUsername(username);
    return this.connectionsDao!.getFollowers(tld, subdomain || '', limit, start);
  };

  getPostByHash = async (refhash: string): Promise<DomainEnvelope<DomainPost> | null>  => {
    if (this.pgClient) {
      return this.pgClient.getPostByRefhashTags(refhash, true);
    }
    return this.postsDao!.getPostByRefhash(refhash);
  };

  getPostsByFilter = async (f: Filter, order: 'ASC' | 'DESC' = 'DESC', limit= 20, defaultOffset?: number): Promise<Pageable<DomainEnvelope<DomainPost>, number>> => {
    if (this.pgClient) return this.pgClient.getPostsByFilter(f, order, limit, defaultOffset);

    const envelopes: DomainEnvelope<DomainPost>[] = [];
    const {
      postedBy,
      repliedBy,
      likedBy,
      allowedTags,
    } = extendFilter(f);

    let postedByQueries = '';
    let repliedByQueries = '';
    let postedBySelect = '';
    let repliedBySelect = '';
    let allowedTagsJoin = '';
    let likedBySelect = '';
    let likedByQueries = '';

    const offset = order === 'ASC'
      ? defaultOffset || 0
      : defaultOffset || 999999999999999999999;

    // if (allowedTags.includes('*')) {
    //   allowedTagsJoin = `
    //     JOIN tags_posts tp ON p.id = tp.post_id AND (p.topic NOT LIKE ".%" OR p.topic is NULL)
    //   `
    // } else
    if (allowedTags.length && !allowedTags.includes('*')) {
      allowedTagsJoin = `
        JOIN (tags_posts tp JOIN tags t ON t.id = tp.tag_id)
            ON t.name IN (${allowedTags.map(t => `"${t}"`).join(',')}) AND p.id = tp.post_id AND (p.topic NOT LIKE ".%" OR p.topic is NULL)
      `
    }

    if (postedBy.length) {
      postedBySelect = `
        SELECT e.id as envelope_id, p.id as post_id, e.tld, e.subdomain, e.network_id, e.refhash, e.created_at, p.body,
            p.title, p.reference, p.topic, p.reply_count, p.like_count, p.pin_count
        FROM posts p
        JOIN envelopes e ON p.envelope_id = e.id
        ${allowedTagsJoin}
      `;

      if (!postedBy.includes('*')) {
        postedByQueries = `(${postedBy
          .map(username => {
            const { tld, subdomain } = parseUsername(username);
            return `(e.tld = "${tld}" AND subdomain = "${subdomain}" AND p.reference is NULL AND (p.topic NOT LIKE ".%" OR p.topic is NULL))`;
          })
          .join(' OR ')} AND p.id ${order === 'DESC' ? '<' : '>'} ${offset})`;
      } else {
        postedByQueries = `(p.reference is NULL AND (p.topic NOT LIKE ".%" OR p.topic is NULL) AND p.id ${order === 'DESC' ? '<' : '>'} ${offset})`;
      }

      postedBySelect = postedBySelect + ' WHERE ' + postedByQueries
    }

    if (repliedBy.length) {
      repliedBySelect = `
        SELECT e.id as envelope_id, p.id as post_id, e.tld, e.subdomain, e.network_id, e.refhash, e.created_at, p.body,
            p.title, p.reference, p.topic, p.reply_count, p.like_count, p.pin_count
        FROM posts p
        JOIN envelopes e ON p.envelope_id = e.id
        ${allowedTagsJoin}
      `;

      if (!repliedBy.includes('*')) {
        repliedByQueries = `(${repliedBy
          .map(username => {
            const { tld, subdomain } = parseUsername(username);
            return `(e.tld = "${tld}" AND subdomain = "${subdomain}" AND p.reference is not NULL AND (p.topic NOT LIKE ".%" OR p.topic is NULL))`;
          })
          .join(' OR ')} AND p.id ${order === 'DESC' ? '<' : '>'} ${offset})`;
      } else {
        repliedByQueries = `(p.reference is not NULL AND (p.topic NOT LIKE ".%" OR p.topic is NULL) AND p.id ${order === 'DESC' ? '<' : '>'} ${offset})`;
      }

      repliedBySelect = repliedBySelect + ' WHERE ' + repliedByQueries
    }

    if (likedBy.length) {
      likedBySelect = `
        SELECT e.id as envelope_id, p.id as post_id, e.tld, e.subdomain, e.network_id, e.refhash, e.created_at, p.body,
            p.title, p.reference, p.topic, p.reply_count, p.like_count, p.pin_count
        FROM posts p
        LEFT JOIN envelopes e ON p.envelope_id = e.id
        ${allowedTagsJoin}
        JOIN (moderations mod JOIN envelopes env ON mod.envelope_id = env.id)
        ON mod.reference = e.refhash
      `;

      if (!likedBy.includes('*')) {
        likedByQueries = `(${likedBy
          .map(username => {
            const { tld, subdomain } = parseUsername(username);
            return `(env.tld = "${tld}" AND env.subdomain = "${subdomain}" AND p.reference is NULL AND (p.topic NOT LIKE ".%" OR p.topic is NULL))`;
          })
          .join(' OR ')} AND p.id ${order === 'DESC' ? '<' : '>'} ${offset})`;
      } else {
        likedByQueries = `(p.reference is NULL AND (p.topic NOT LIKE ".%" OR p.topic is NULL) AND p.id ${order === 'DESC' ? '<' : '>'} ${offset})`;
      }

      likedBySelect = likedBySelect + ' WHERE ' + likedByQueries
    }

    this.engine.each(`
        ${[postedBySelect, repliedBySelect, likedBySelect].filter(d => !!d).join('UNION')}
        ORDER BY p.id ${order === 'ASC' ? 'ASC' : 'DESC'}
        LIMIT @limit
    `, {
      limit,
    }, (row) => {
      envelopes.push(this.mapPost(row, true));
    });


    if (!envelopes.length) {
      return new Pageable<DomainEnvelope<DomainPost>, number>([], -1);
    }

    return new Pageable<DomainEnvelope<DomainPost>, number>(
      envelopes,
      envelopes[envelopes.length - 1].message.id,
    );
  };

  getCommentsByHash = async (reference: string | null, order?: 'ASC' | 'DESC', limit = 20,  defaultOffset?: number): Promise<Pageable<DomainEnvelope<DomainPost>, number>> => {
    if (this.pgClient) {
      return this.pgClient.getCommentsByHash(reference, order, limit, defaultOffset);
    }

    const envelopes: DomainEnvelope<DomainPost>[] = [];
    const offset = order === 'ASC'
      ? defaultOffset || 0
      : defaultOffset || 999999999999999999999;
    this.engine.each(`
        SELECT e.id as envelope_id, p.id as post_id, e.tld, e.subdomain, e.network_id, e.refhash, e.created_at, p.body,
            p.title, p.reference, p.topic, p.reply_count, p.like_count, p.pin_count
        FROM posts p JOIN envelopes e ON p.envelope_id = e.id
        WHERE p.reference = @reference AND (p.topic NOT LIKE ".%" OR p.topic is NULL) AND p.id ${order === 'DESC' ? '<' : '>'} @start
        ORDER BY p.id ${order === 'ASC' ? 'ASC' : 'DESC'}
        LIMIT @limit
    `, {
      start: offset,
      limit,
      reference,
    }, (row) => {
      envelopes.push(this.mapPost(row, true));
    });

    if (!envelopes.length) {
      return new Pageable<DomainEnvelope<DomainPost>, number>([], -1);
    }

    return new Pageable<DomainEnvelope<DomainPost>, number>(
      envelopes,
      envelopes[envelopes.length - 1].message.id,
    );
  };

  private getMediaByHash = async (refhash: string): Promise<any|undefined> => {
    if (this.pgClient) return this.pgClient.getMediaByHash(refhash);

    const row = this.engine.first(`
      SELECT e.created_at, m.filename, m.mime_type, m.content
      FROM media m JOIN envelopes e ON m.envelope_id = e.id
      WHERE e.refhash = @refhash
      ORDER BY e.created_at DESC
    `, {
      refhash,
    });


    return row;
  };

  private getUserDisplayName = async (username: string): Promise<string> => {
    const { tld, subdomain } = parseUsername(username);

    const displayName = this.engine.first(`
      SELECT e.created_at, p.body
      FROM posts p JOIN envelopes e ON p.envelope_id = e.id
      WHERE tld = @tld AND subdomain = @subdomain AND topic = ".display_name"
      ORDER BY e.created_at DESC
    `, {
      tld: dotName(tld),
      subdomain,
    });


    return displayName?.body || '';
  };

  private getUserBio = async (username: string): Promise<string|undefined> => {
    const { tld, subdomain } = parseUsername(username);

    const displayName = this.engine.first(`
      SELECT e.created_at, p.body
      FROM posts p JOIN envelopes e ON p.envelope_id = e.id
      WHERE tld = @tld AND subdomain = @subdomain AND topic = ".user_bio"
      ORDER BY e.created_at DESC
    `, {
      tld: dotName(tld),
      subdomain,
    });


    return displayName?.body || '';
  };

  private getUserAvatarType = async (username: string): Promise<string|undefined> => {
    const { tld, subdomain } = parseUsername(username);

    const displayName = this.engine.first(`
      SELECT e.created_at, p.body
      FROM posts p JOIN envelopes e ON p.envelope_id = e.id
      WHERE tld = @tld AND subdomain = @subdomain AND topic = ".avatar_type"
      ORDER BY e.created_at DESC
    `, {
      tld: dotName(tld),
      subdomain,
    });


    return displayName?.body || '';
  };

  private getUserProfilePicture = async (username: string): Promise<string|undefined> => {
    const { tld, subdomain } = parseUsername(username);

    const displayName = this.engine.first(`
      SELECT e.created_at, p.reference
      FROM posts p JOIN envelopes e ON p.envelope_id = e.id
      WHERE tld = @tld AND subdomain = @subdomain AND topic = ".profile_picture_refhash"
      ORDER BY e.created_at DESC
    `, {
      tld: dotName(tld),
      subdomain,
    });

    return displayName?.reference || '';
  };

  private getUserCoverImage = async (username: string): Promise<string|undefined> => {
    const { tld, subdomain } = parseUsername(username);

    const displayName = this.engine.first(`
      SELECT e.created_at, p.reference
      FROM posts p JOIN envelopes e ON p.envelope_id = e.id
      WHERE tld = @tld AND subdomain = @subdomain AND topic = ".cover_image_refhash"
      ORDER BY e.created_at DESC
    `, {
      tld: dotName(tld),
      subdomain,
    });

    return displayName?.reference || '';
  };

  private getFollowingCounts = async (username: string): Promise<number> => {
    const { tld, subdomain } = parseUsername(username);

    const followings = this.engine.first(`
        SELECT COUNT(*)
        FROM connections c
        JOIN envelopes e ON c.envelope_id = e.id
        WHERE e.tld = @tld AND e.subdomain = @subdomain AND c.connection_type = "FOLLOW"
    `, {
      tld: dotName(tld),
      subdomain,
    });

    return followings ? followings['COUNT(*)'] : 0;
  };

  private getFollowerCounts = async (username: string): Promise<number> => {
    const { tld, subdomain } = parseUsername(username);

    const followers = this.engine.first(`
        SELECT COUNT(*)
        FROM connections c
        JOIN envelopes e ON c.envelope_id = e.id
        WHERE c.tld = @tld AND c.subdomain = @subdomain AND c.connection_type = "FOLLOW"
    `, {
      tld: dotName(tld),
      subdomain,
    });

    return followers ? followers['COUNT(*)'] : 0;
  };

  private getBlockingCounts = async (username: string): Promise<number> => {
    const { tld, subdomain } = parseUsername(username);

    const blockings = this.engine.first(`
        SELECT COUNT(*)
        FROM connections c
        JOIN envelopes e ON c.envelope_id = e.id
        WHERE e.tld = @tld AND e.subdomain = @subdomain AND c.connection_type = "BLOCK"
    `, {
      tld: dotName(tld),
      subdomain,
    });

    return blockings ? blockings['COUNT(*)'] : 0;
  };

  private getBlockerCounts = async (username: string): Promise<number> => {
    const { tld, subdomain } = parseUsername(username);

    const blockers = this.engine.first(`
        SELECT COUNT(*)
        FROM connections c
        JOIN envelopes e ON c.envelope_id = e.id
        WHERE c.tld = @tld AND c.subdomain = @subdomain AND c.connection_type = "BLOCK"
    `, {
      tld: dotName(tld),
      subdomain,
    });

    return blockers ? blockers['COUNT(*)'] : 0;
  };

  getUserProfile = async (username: string): Promise<UserProfile> => {
    if (this.pgClient) return this.pgClient.getUserProfile(username);

    const profilePicture = await this.getUserProfilePicture(username) || '';
    const coverImage = await this.getUserCoverImage(username) || '';
    const bio = await this.getUserBio(username) || '';
    const avatarType = await this.getUserAvatarType(username) || '';
    const displayName = await this.getUserDisplayName(username) || '';
    const followings = await this.getFollowingCounts(username);
    const followers = await this.getFollowerCounts(username);
    const blockings = await this.getBlockingCounts(username);
    const blockers = await this.getBlockerCounts(username);

    return {
      profilePicture,
      coverImage,
      bio,
      avatarType,
      displayName,
      followings,
      followers,
      blockings,
      blockers,
    };
  };

  getChannelPosts = async (order: 'ASC' | 'DESC' = 'DESC', limit= 20, defaultOffset?: number): Promise<Pageable<DomainEnvelope<DomainPost>, number>> => {
    if (this.pgClient) return this.pgClient.getChannelPosts(order, limit, defaultOffset);
    const envelopes: DomainEnvelope<DomainPost>[] = [];
    const offset = defaultOffset || 0;

    this.engine.each(`
        SELECT e.id as envelope_id, p.id as post_id, e.tld, e.subdomain, e.network_id, e.refhash, e.created_at, p.body,
            p.title, p.reference, p.topic, p.reply_count, p.like_count, p.pin_count
        FROM posts p JOIN envelopes e ON p.envelope_id = e.id
        WHERE (p.reference is NULL AND p.topic = 'channelpost')
        ORDER BY e.created_at ${order === 'ASC' ? 'ASC' : 'DESC'}
        LIMIT @limit OFFSET @start
    `, {
      start: offset,
      limit,
    }, (row) => {
      envelopes.push(this.mapPost(row, true));
    });

    if (!envelopes.length) {
      return new Pageable<DomainEnvelope<DomainPost>, number>([], -1);
    }

    return new Pageable<DomainEnvelope<DomainPost>, number>(
      envelopes,
      envelopes.length + Number(offset),
    );
  };

  getPosts = async (order: 'ASC' | 'DESC' = 'DESC', limit= 20, defaultOffset?: number): Promise<Pageable<DomainEnvelope<DomainPost>, number>> => {
    if (this.pgClient) return this.pgClient.getPosts(order, limit, defaultOffset);
    const envelopes: DomainEnvelope<DomainPost>[] = [];
    const offset = defaultOffset || 0;

    this.engine.each(`
        SELECT e.id as envelope_id, p.id as post_id, e.tld, e.subdomain, e.network_id, e.refhash, e.created_at, p.body,
            p.title, p.reference, p.topic, p.reply_count, p.like_count, p.pin_count
        FROM posts p JOIN envelopes e ON p.envelope_id = e.id
        WHERE (p.reference is NULL AND (p.topic NOT LIKE ".%" OR p.topic is NULL))
        ORDER BY e.created_at ${order === 'ASC' ? 'ASC' : 'DESC'}
        LIMIT @limit OFFSET @start
    `, {
      start: offset,
      limit,
    }, (row) => {
      envelopes.push(this.mapPost(row, true));
    });

    if (!envelopes.length) {
      return new Pageable<DomainEnvelope<DomainPost>, number>([], -1);
    }

    return new Pageable<DomainEnvelope<DomainPost>, number>(
      envelopes,
      envelopes.length + Number(offset),
    );
  };

  getUserChannels = async (username: string, order: 'ASC' | 'DESC' = 'DESC', limit= 20, defaultOffset?: number): Promise<Pageable<DomainEnvelope<DomainPost>, number>> => {
    if (this.pgClient) return this.pgClient.getUserChannels(username, order, limit, defaultOffset);
    const { tld, subdomain } = parseUsername(username);
    const envelopes: DomainEnvelope<DomainPost>[] = [];
    const offset = defaultOffset || 0;

    this.engine.each(`
        SELECT e.id as envelope_id, p.id as post_id, e.tld, e.subdomain, e.network_id, e.refhash, e.created_at, p.body,
            p.title, p.reference, p.topic, p.reply_count, p.like_count, p.pin_count
        FROM posts p JOIN envelopes e ON p.envelope_id = e.id
        WHERE (p.reference is NULL AND p.topic = '.channel' AND e.tld = @tld AND e.subdomain = @subdomain)
        ORDER BY e.created_at ${order === 'ASC' ? 'ASC' : 'DESC'}
        LIMIT @limit OFFSET @start
    `, {
      start: offset,
      limit,
      tld,
      subdomain,
    }, (row) => {
      envelopes.push(this.mapPost(row, true));
    });

    if (!envelopes.length) {
      return new Pageable<DomainEnvelope<DomainPost>, number>([], -1);
    }

    return new Pageable<DomainEnvelope<DomainPost>, number>(
      envelopes,
      envelopes.length + Number(offset),
    );
  };

  getChannels = async (order: 'ASC' | 'DESC' = 'DESC', limit= 20, defaultOffset?: number): Promise<Pageable<DomainEnvelope<DomainPost>, number>> => {
    if (this.pgClient) return this.pgClient.getChannels(order, limit, defaultOffset);
    const envelopes: DomainEnvelope<DomainPost>[] = [];
    const offset = defaultOffset || 0;

    this.engine.each(`
        SELECT e.id as envelope_id, p.id as post_id, e.tld, e.subdomain, e.network_id, e.refhash, e.created_at, p.body,
            p.title, p.reference, p.topic, p.reply_count, p.like_count, p.pin_count
        FROM posts p JOIN envelopes e ON p.envelope_id = e.id
        WHERE (p.reference is NULL AND (p.topic = '.channel'))
        ORDER BY e.created_at ${order === 'ASC' ? 'ASC' : 'DESC'}
        LIMIT @limit OFFSET @start
    `, {
      start: offset,
      limit,
    }, (row) => {
      envelopes.push(this.mapPost(row, true));
    });

    if (!envelopes.length) {
      return new Pageable<DomainEnvelope<DomainPost>, number>([], -1);
    }

    return new Pageable<DomainEnvelope<DomainPost>, number>(
      envelopes,
      envelopes.length + Number(offset),
    );
  };

  async getUserConnections (username: string): Promise<DomainEnvelope<DomainConnection>[]> {
    const { tld, subdomain } = parseUsername(username);

    const envelopes: DomainEnvelope<DomainConnection>[] = [];

    if (subdomain) return envelopes;

    this.engine.each(`
      SELECT e.id as envelope_id, c.id as connection_id, e.tld, e.subdomain, e.network_id, e.refhash, e.created_at,
        c.tld as connection_tld, c.subdomain as connection_subdomain, c.connection_type
      FROM connections c JOIN envelopes e ON c.envelope_id = e.id
      WHERE e.tld = @tld
    `, { tld, subdomain }, row => {
      // if (!row.connection_subdomain) return;

      envelopes.push(new DomainEnvelope<DomainConnection>(
        row.envelope_id,
        row.tld,
        row.subdomain,
        row.network_id,
        row.refhash,
        new Date(row.created_at * 1000),
        new DomainConnection(
          row.connection_id,
          row.connection_tld,
          row.connection_subdomain,
          row.connection_type,
        ),
        null
      ));
    });

    return envelopes;
  }

  async getUserModerations (username: string): Promise<DomainEnvelope<DomainModeration>[]> {
    const { tld, subdomain } = parseUsername(username);

    const envelopes: DomainEnvelope<DomainModeration>[] = [];

    if (subdomain) return envelopes;

    this.engine.each(`
      SELECT e.id as envelope_id, m.id as moderation_id, e.tld, e.subdomain, e.network_id, e.refhash, e.created_at,
        m.reference, m.moderation_type
      FROM moderations m JOIN envelopes e ON m.envelope_id = e.id
      WHERE e.tld = @tld
    `, { tld, subdomain }, row => {
      envelopes.push(new DomainEnvelope<DomainModeration>(
        row.envelope_id,
        row.tld,
        row.subdomain,
        row.network_id,
        row.refhash,
        new Date(row.created_at * 1000),
        new DomainModeration(
          row.moderation_id,
          row.reference,
          row.moderation_type,
        ),
        null
      ));
    });

    return envelopes;
  }

  async getUserPosts (username: string): Promise<DomainEnvelope<DomainPost>[]> {
    const { tld, subdomain } = parseUsername(username);

    const envelopes: DomainEnvelope<DomainPost>[] = [];

    if (subdomain) return envelopes;

    this.engine.each(`
      SELECT e.id as envelope_id, p.id as post_id, e.tld, e.subdomain, e.network_id, e.refhash, e.created_at, p.body,
              p.title, p.reference, p.topic, p.reply_count, p.like_count, p.pin_count
      FROM posts p JOIN envelopes e ON p.envelope_id = e.id
      WHERE e.tld = @tld
    `, { tld, subdomain }, row => {
      envelopes.push(this.mapPost(row, true));
    });

    return envelopes;
  }

  async getUserEnvelopes (username: string, source: 'sqlite' | 'postgres' = 'sqlite'): Promise<DomainEnvelope<any>[]> {
    if (source === "postgres" && this.pgClient) return this.pgClient?.getUserEnvelopes(username);

    const posts = await this.getUserPosts(username);
    const mods = await this.getUserModerations(username);
    const conns = await this.getUserConnections(username);
    const envelopes: DomainEnvelope<any>[] = [
      ...mods,
      ...conns,
      ...posts,
    ].sort((a, b) => {
      if (a.createdAt > b.createdAt) return 1;
      if (a.createdAt < b.createdAt) return -1;
      return 0;
    });
    return envelopes;
  }

  private mapPost (row: Row, includeTags: boolean): DomainEnvelope<DomainPost> {
    const tags: string[] = [];

    if (includeTags) {
      this.engine.each(`
          SELECT name as tag 
          FROM tags t JOIN tags_posts tp ON t.id = tp.tag_id
          WHERE tp.post_id = @postID
        `,
        {
          postID: row.post_id,
        },
        (row) => {
          tags.push(row.tag);
        },
      );
    }

    return new DomainEnvelope<DomainPost>(
      row.envelope_id,
      row.tld,
      row.subdomain,
      row.network_id,
      row.refhash,
      new Date(row.created_at * 1000),
      new DomainPost(
        row.post_id,
        row.body,
        row.title,
        row.reference,
        row.topic,
        tags,
        row.reply_count,
        row.like_count,
        row.pin_count,
      ),
      null
    );
  }

  insertPost = async (tld: string, wire: WireEnvelope, subdomains: SubdomainDBRow[] = []): Promise<any> => {
    const nameIndex = wire.nameIndex;
    const subdomain = subdomains[nameIndex];

    if (nameIndex > 0 && !subdomain) {
      logger.error(`cannot find subdomain`, {
        tld: tld,
        nameIndex: nameIndex,
      });
      return;
    }

    logger.info(`inserting message`, {
      tld: tld,
      subdomain: subdomain?.name || '',
    });

    try {
      const message = wire.message;
      const domainEnvelope = await mapWireToEnvelope(tld, subdomain?.name || '', wire);

      switch (message.type.toString('utf-8')) {
        case Post.TYPE.toString('utf-8'):
          this.pgClient
            ? await this.pgClient.insertPost(domainEnvelope as DomainEnvelope<DomainPost>)
            : await this.postsDao?.insertPost(domainEnvelope as DomainEnvelope<DomainPost>);
          return domainEnvelope;
        case Connection.TYPE.toString('utf-8'):
          this.pgClient
            ? await this.pgClient.insertConnection(domainEnvelope as DomainEnvelope<DomainConnection>)
            : await this.connectionsDao?.insertConnection(domainEnvelope as DomainEnvelope<DomainConnection>);
          return domainEnvelope;
        case Moderation.TYPE.toString('utf-8'):
          this.pgClient
            ? await this.pgClient.insertModeration(domainEnvelope as DomainEnvelope<DomainModeration>)
            : await this.moderationsDao?.insertModeration(domainEnvelope as DomainEnvelope<DomainModeration>);
          return domainEnvelope;
        default:
          return;
      }
    } catch (err) {
      logger.error(`cannot insert message ${serializeUsername(subdomain?.name, tld)}}`);
      logger.error(err?.message);
    }
  };

  scanCommentCounts = async (): Promise<{[parent: string]: number}> => {
    const sql = `
        SELECT e.id as envelope_id, p.id as post_id, e.tld, e.subdomain, e.network_id, e.refhash, e.created_at, p.body,
        p.title, p.reference, p.topic, p.reply_count, p.like_count, p.pin_count
        FROM posts p JOIN envelopes e ON p.envelope_id = e.id
    `;

    const commentCounts: {[parent: string]: number} = {};

    this.engine.each(sql, {}, row => {
      if (row.reference) {
        commentCounts[row.reference] = commentCounts[row.reference] || 0;
        commentCounts[row.reference]++;
      }
    });

    return commentCounts;
  };

  scanLikeCounts = async (): Promise<{[parent: string]: number}> => {
    const sql = `
        SELECT * FROM moderations m
        LEFT JOIN envelopes e ON m.envelope_id = e.id
    `;

    const likeCounts: {[parent: string]: number} = {};

    this.engine.each(sql, {}, row => {
      if (row.reference && row.moderation_type === 'LIKE') {
        likeCounts[row.reference] = likeCounts[row.reference] || 0;
        likeCounts[row.reference]++;
      }
    });

    return likeCounts;
  };

  private getPostersOfTag = (tagName: string): {tld: string; subdomain: string; count: number}[] => {
    const sql = `
      SELECT e.tld, e.subdomain
      FROM posts p
      JOIN envelopes e ON p.envelope_id = e.id
      JOIN (tags_posts tp JOIN tags t ON t.id = tp.tag_id)
      ON t.name = @tagName AND p.id = tp.post_id AND (p.topic NOT LIKE ".%" OR p.topic is NULL)
      GROUP BY e.tld, e.subdomain
    `;
    const params = { tagName };
    const rows: { tld: string; subdomain: string; count: number}[] = [];

    try {
      this.engine.each(sql, params, (row: any) => {
        rows.push(row);
      });

      return rows;
    } catch (e) {
      return [];
    }

  };

  queryTrendingTags = async (limit = 20, offset = 0): Promise<Pageable<{name: string; count: number; posterCount: number}, number>> => {
    if (this.pgClient) return this.pgClient.queryTrendingTags(limit, offset);

    const rows: {name: string; count: number; posterCount: number}[] = [];

    this.engine.each(`
      SELECT t.name, COUNT(post_id) as count FROM tags_posts tp
      JOIN tags t WHERE t.id = tp.tag_id
      GROUP BY tag_id
      ORDER BY count DESC LIMIT @limit OFFSET @offset
    `, { limit, offset }, (row: any) => {
      const posterCount = this.getPostersOfTag(row.name).length;
      rows.push({
        ...row,
        posterCount,
      });
    });

    if (!rows.length) {
      return {
        items: [],
        next: -1,
      };
    }

    return {
      items: rows,
      next: rows.length + Number(offset),
    };
  };

  queryTrendingPosters = async (limit = 20, offset = 0): Promise<Pageable<{username: string; count: number}, number>> => {
    if (this.pgClient) return this.pgClient.queryTrendingPosters(limit, offset);

    const rows: {username: string; count: number}[] = [];

    this.engine.each(`
      SELECT COUNT(p.id) as count, e.tld, e.subdomain
      FROM posts p JOIN envelopes e ON p.envelope_id = e.id
      WHERE (p.reference is NULL AND (p.topic NOT LIKE ".%" OR p.topic is NULL))
      GROUP BY e.tld, e.subdomain
      ORDER BY count DESC LIMIT @limit OFFSET @offset
    `, { limit, offset }, (row: any) => {
      rows.push(row);
    });

    if (!rows.length) {
      return {
        items: [],
        next: -1,
      };
    }

    return {
      items: rows,
      next: rows.length + Number(offset),
    };
  };

  scanMetadata = async (): Promise<any> => {
    if (this.pgClient) {
      return this.pgClient.scanMetadata();
    }

    const commentCounts = await this.scanCommentCounts();
    const likeCounts = await this.scanLikeCounts();

    Object.entries(commentCounts)
      .forEach(([refhash, count]) => {
        this.engine.exec(`
          UPDATE posts SET (reply_count) = @count
          WHERE envelope_id = (
            SELECT p.envelope_id
            FROM posts p JOIN envelopes e ON p.envelope_id = e.id
            WHERE e.refhash = @refhash
          )
        `, { refhash, count });
      });

    Object.entries(likeCounts)
      .forEach(([refhash, count]) => {
        this.engine.exec(`
          UPDATE posts SET (like_count) = @count
          WHERE envelope_id = (
            SELECT p.envelope_id
            FROM posts p JOIN envelopes e ON p.envelope_id = e.id
            WHERE e.refhash = @refhash
          )
        `, { refhash, count });
      });

    return {
      commentCounts,
      likeCounts,
    };
  };

  maybeStreamBlob = async (tld: string): Promise<void> => {
    logger.info(`streaming ${tld}`, { tld });

    try {
      // const blobInfo = await this.client.getBlobInfo(tld);
      // @ts-ignore
      // const lastMerkle = blobInfo.merkleRoot.toString('hex');
      // const row = await this.getBlobInfo(tld);
      // if (row && row.merkleRoot === lastMerkle) {
      //   logger.info(`${tld} already streamed`, row);
      //   return;
      // }

      const br = new BlobReader(tld, this.client);
      const r = new BufferedReader(br, 1024 * 1024);

      await this.scanBlobData(r, tld, []);

      // await this.insertOrUpdateBlobInfo(tld, lastMerkle);
    } catch (e) {
      logger.error(e);
      // return Promise.reject(e);
    }
  };

  isSubdomainBlob = (r: BufferedReader): Promise<boolean> => {
    let timeout: any | undefined;
    return new Promise((resolve, reject) => {
      timeout = setTimeout(() => resolve(false), 5000);

      try {
        isSubdomainBlob(r, (err, res) => {
          if (timeout) clearTimeout(timeout);

          if (err) {
            reject(err);
            logger.error(err.message);
            return;
          }

          resolve(!!res);
        });
      } catch (e) {
        if (timeout) clearTimeout(timeout);
        reject(e);
      }
    });
  };

  scanSubdomainData = (r: BufferedReader, tld: string): Promise<SubdomainDBRow[]> => {
    let timeout: any | undefined;
    const subdomains: SubdomainDBRow[] = [{
      name: '',
      tld,
    }];

    return new Promise((resolve, reject) => {
      logger.info(`scan subdomain data`, { tld });
      timeout = setTimeout(() => {
        resolve();
      }, 500);

      iterateAllSubdomains(r, (err, sub) => {
        if (timeout) clearTimeout(timeout);

        if (err) {
          logger.error(err);
          reject(err);
          return false;
        }

        if (sub === null) {
          resolve(subdomains);
          return false;
        }

        logger.info(`scanned subdomain data`, { name: sub?.name, index: sub?.index });


        subdomains.push({
          name: sub?.name || '',
          tld,
          public_key: sub?.publicKey?.toString('hex'),
          email: '',
        });

        timeout = setTimeout(() => resolve(subdomains), 500);
        return true;
      });
    });
  };

  private scanBlobData = async (r: BufferedReader, tld: string, subdomains: SubdomainDBRow[]) => {
    let timeout: any | undefined;

    return new Promise(async (resolve, reject) => {
      logger.info(`scan blob data`, { tld });

      timeout = setTimeout(() => {
        resolve();
      }, 10000);

      await asyncIterateAllEnvelopes(r, async (err, env) => {
        if (timeout) clearTimeout(timeout);

        if (err) {
          logger.error(err);
          reject(err);
          return false;
        }

        if (env === null) {
          resolve();
          return false;
        }

        await this.insertPost(tld, env, subdomains);

        logger.info('scanned envelope', { tld });

        timeout = setTimeout(() => {
          resolve();
        }, 500);

        return true;
      });
    });
  };

  async start () {
    const exists = await this.dbExists();

    if (!exists) {
      logger.info('[indexer manager] Copying database');
      await this.copyDB();
      logger.info('[indexer manager] Copied database');
    }

    await this.engine.open();
    this.postsDao = new PostsDAOImpl(this.engine);
    this.connectionsDao = new ConnectionsDAOImpl(this.engine);
    this.moderationsDao = new ModerationsDAOImpl(this.engine);
  }

  private async dbExists () {
    try {
      await fs.promises.access(this.dbPath, fs.constants.F_OK);
    } catch (e) {
      logger.error(new Error(`${this.dbPath} does not exist`));
      return false;
    }

    logger.info(`[indexer manager] ${this.dbPath} exists`);
    return true;
  }

  private async copyDB () {
    const nomadSrc = path.join(this.resourcePath, 'nomad.db');
    await fs.promises.copyFile(nomadSrc, this.dbPath);
  }

  async readAllTLDs(): Promise<string[]> {
    await this.streamBlobInfo();
    return Object.keys(TLD_CACHE);
  }

  async streamAllBlobs(): Promise<void> {
    const tlds = await this.readAllTLDs();

    for (let i = 0; i < tlds.length; i = i + 1) {
      const selectedTLDs = tlds.slice(i, i + 1).filter(tld => !!tld);
      await this.streamNBlobs(selectedTLDs);

    }
  }

  private async streamNBlobs(tlds: string[]): Promise<void[]> {
    return Promise.all(tlds.map(async tld => this.maybeStreamBlob(dotName(tld))));
  }

  streamBlobInfo = async (start = '', defaultTimeout?: number, shouldStreamContent?: boolean): Promise<number> => {
    let timeout: number | undefined = defaultTimeout;

    return new Promise((resolve, reject) => {
      let lastUpdate = start;
      let counter = 0;

      this.client.streamBlobInfo(start, 100, async (info) => {
        if (timeout) clearTimeout(timeout);

        TLD_CACHE[info.name] = info.merkleRoot;
        lastUpdate = info.name;
        counter++;

        timeout = setTimeout(resolve, 0);
        if (counter % 100 === 0) {
          await this.streamBlobInfo(lastUpdate, timeout);
        }
      });

      timeout = setTimeout(resolve, 500);
    })
  };
}
