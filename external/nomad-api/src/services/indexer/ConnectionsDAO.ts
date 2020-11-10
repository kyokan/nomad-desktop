import {Pageable} from './Pageable';
import {Envelope} from 'fn-client/lib/application/Envelope';
import {Block, Connection, Follow} from 'fn-client/lib/application/Connection';
import {Engine} from './Engine';
import {insertEnvelope} from './PostsDAO';

export interface ConnectionsDAO {
  getFollowees (tld: string, subdomain: string | null, start?: number): Pageable<Follow, number>

  getFollowers (tld: string, subdomain: string | null, start?: number): Pageable<Follow, number>

  getBlockees (tld: string, subdomain: string, start?: number): Pageable<Block, number>

  getBlockers (tld: string, subdomain: string, start?: number): Pageable<Block, number>

  insertConnection (connection: Envelope<Connection>): void
}

export class ConnectionsDAOImpl implements ConnectionsDAO {
  private readonly engine: Engine;

  constructor (engine: Engine) {
    this.engine = engine;
  }

  public getFollowees (tld: string, subdomain: string | null, limit = 20, start: number = 0): Pageable<Follow, number> {
    const follows: Follow[] = [];
    let lastId = -1;
    this.engine.each(`
        SELECT c.id, c.tld, c.subdomain
        FROM connections c
                 JOIN envelopes e ON c.envelope_id = e.id
        WHERE e.tld = @tld AND e.subdomain = @subdomain AND c.id > @start AND c.connection_type = 'FOLLOW'
        ORDER BY c.id ASC
        LIMIT @limit
    `, {
      tld,
      subdomain,
      start,
      limit,
    }, (row) => {
      follows.push({
        tld: row.tld,
        subdomain: row.subdomain,
      });
      lastId = row.id;
    });
    if (!follows.length) {
      return new Pageable<Follow, number>([], -1);
    }
    return new Pageable<Follow, number>(follows, lastId);
  }

  public getFollowers (tld: string, subdomain: string | null, limit = 20, start: number = 0): Pageable<Follow, number> {
    const follows: Follow[] = [];
    let lastId = -1;
    this.engine.each(`
        SELECT c.id, e.tld, e.subdomain
        FROM connections c
                 JOIN envelopes e ON c.envelope_id = e.id
        WHERE c.tld = @tld AND c.subdomain = @subdomain AND c.id > @start AND c.connection_type = 'FOLLOW'
        ORDER BY c.id ASC
        LIMIT @limit
    `, {
      tld,
      subdomain,
      start,
      limit,
    }, (row) => {
      follows.push({
        tld: row.tld,
        subdomain: row.subdomain,
      });
      lastId = row.id;
    });
    if (!follows.length) {
      return new Pageable<Follow, number>([], -1);
    }
    return new Pageable<Follow, number>(follows, lastId);
  }

  public getBlockees (tld: string, subdomain: string, limit = 20, start: number = 0): Pageable<Block, number> {
    const blocks: Block[] = [];
    let lastId = -1;
    this.engine.each(`
        SELECT c.id, c.tld, c.subdomain
        FROM connections c
                 JOIN envelopes e ON c.envelope_id = e.id
        WHERE e.tld = @tld AND e.subdomain = @subdomain AND c.id > @start AND c.connection_type = 'BLOCK'
        ORDER BY c.id ASC
        LIMIT @limit
    `, {
      tld,
      subdomain,
      start,
      limit,
    }, (row) => {
      blocks.push({
        tld: row.tld,
        subdomain: row.subdomain,
      });
      lastId = row.id;
    });
    if (!blocks.length) {
      return new Pageable<Block, number>([], -1);
    }
    return new Pageable<Block, number>(blocks, lastId);
  }

  public getBlockers (tld: string, subdomain: string, limit = 20, start: number = 0): Pageable<Block, number> {
    const blocks: Block[] = [];
    let lastId = -1;
    this.engine.each(`
        SELECT c.id, e.tld, e.subdomain
        FROM connections c
                 JOIN envelopes e ON c.envelope_id = e.id
        WHERE c.tld = @tld AND c.subdomain = @subdomain AND c.id > @start AND c.connection_type = 'BLOCK'
        ORDER BY c.id ASC
        LIMIT @limit
    `, {
      tld,
      subdomain,
      start,
      limit,
    }, (row) => {
      blocks.push({
        tld: row.tld,
        subdomain: row.subdomain,
      });
      lastId = row.id;
    });
    if (!blocks.length) {
      return new Pageable<Block, number>([], -1);
    }
    return new Pageable<Block, number>(blocks, lastId);
  }

  public insertConnection (connection: Envelope<Connection>): void {
    this.engine.withTx(() => {
      const exists = this.engine.first('SELECT EXISTS(SELECT 1 FROM envelopes WHERE refhash = @refhash) AS result', {
        refhash: connection.refhash,
      });
      if (exists!.result) {
        return;
      }

      const envelopeId: number = insertEnvelope(this.engine, connection);
      this.engine.exec(`
          INSERT INTO connections (envelope_id, tld, subdomain, connection_type)
          VALUES (@envelopeId, @tld, @subdomain, @type)
      `, {
        envelopeId,
        tld: connection.message.tld,
        subdomain: connection.message.subdomain,
        type: connection.message.type
      });
    });
  }
}
