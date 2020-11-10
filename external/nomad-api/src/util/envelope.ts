const blake2b = require('blake2b');
import {Envelope as WireEnvelope} from "fn-client/lib/wire/Envelope";
import {Post as WirePost, RefType} from "fn-client/lib/wire/Post";
import {Connection as WireConnection} from "fn-client/lib/wire/Connection";
import {Moderation as WireModeration} from "fn-client/lib/wire/Moderation";
import {createRefhash} from "fn-client/lib/wire/refhash";
import {Envelope as DomainEnvelope} from 'fn-client/lib/application/Envelope';
import {Post as DomainPost} from 'fn-client/lib/application/Post';
import {
  Connection as DomainConnection,
  ConnectionType as DomainConnectionType,
} from 'fn-client/lib/application/Connection';
import {
  Moderation as DomainModeration,
  ModerationType as DomainModerationType,
} from 'fn-client/lib/application/Moderation';
import {ConnectionBody, MediaBody, ModerationBody, PostBody,} from "../constants";
import crypto from "crypto";

export const mapWireToEnvelope = async (
  tld: string,
  subdomain: string,
  wire: WireEnvelope
): Promise<DomainEnvelope<DomainPost|DomainConnection|DomainModeration>> => {
  let {
    timestamp,
    message,
    additionalData,
  } = wire;

  timestamp = new Date(Math.floor(timestamp.getTime() / 1000) * 1000);

  const refhashBuf = await createRefhash(wire, '', tld);
  const refhash = refhashBuf.toString('hex');
  const createdAt = new Date(timestamp);

  const msgType = message.type.toString('utf-8');

  switch (msgType) {
    case WirePost.TYPE.toString('utf-8'):
      return new DomainEnvelope(
        0,
        tld,
        subdomain,
        '',
        refhash,
        createdAt,
        mapWirePostToDomainPost(message as WirePost),
        additionalData,
      );
    case WireConnection.TYPE.toString('utf-8'):
      return new DomainEnvelope(
        0,
        tld,
        subdomain,
        '',
        refhash,
        createdAt,
        mapWireConnectionToDomainConnection(message as WireConnection),
        additionalData,
      );
    case WireModeration.TYPE.toString('utf-8'):
      return new DomainEnvelope(
        0,
        tld,
        subdomain,
        '',
        refhash,
        createdAt,
        mapWireModerationToDomainModeration(message as WireModeration),
        additionalData,
      );
    default:
      return Promise.reject(new Error(`cannot find message type ${msgType}`));
  }
};

function mapWirePostToDomainPost(wirePost: WirePost): DomainPost {
  let reference = null;
  let title = null;

  if (wirePost.reference) {
    if (wirePost.refType === RefType.REPLY) {
      reference = wirePost.reference.toString('hex');
    } else if (wirePost.refType === RefType.TOPIC) {
      title = wirePost.reference.toString('utf-8');
    }
  }

  return new DomainPost(
    0,
    wirePost.body,
    wirePost.title,
    reference,
    title,
    [],
    0,
    0,
    0,
  );
}


function mapWireConnectionToDomainConnection(wireConnection: WireConnection): DomainConnection {
  return new DomainConnection(
    0,
    wireConnection.tld,
    wireConnection.subdomain,
    wireConnection.connectionType() as DomainConnectionType,
  );
}

function mapWireModerationToDomainModeration(wireModeration: WireModeration): DomainModeration {
  return new DomainModeration(
    0,
    wireModeration.reference.toString('hex'),
    wireModeration.moderationType() as DomainModerationType,
  );
}

export type WriterEnvelopeParams = {
  post?: PostBody;
  connection?: ConnectionBody;
  moderation?: ModerationBody;
  media?: MediaBody;
  refhash?: string;
  networkId?: string;
  createAt?: Date;
  nameIndex?: number;
}

export async function mapBodyToEnvelope(tld: string, params: WriterEnvelopeParams): Promise<WireEnvelope | undefined> {
  const {
    post,
    connection,
    moderation,
    media,
    refhash,
    networkId,
    createAt,
    nameIndex = 0,
  } = params;

  if (refhash && networkId && createAt) {
    return createEnvelope(tld, params);
  }

  let envelope: DomainEnvelope<any> | undefined;

  if (post) {

    if (post.body.length > 4000) {
      return Promise.reject(new Error('post body cannot exceed 4000 characters'));
    }

    envelope = await DomainEnvelope.createWithMessage(
      0,
      tld,
      null,
      networkId || crypto.randomBytes(8).toString('hex'),
      new DomainPost(
        0,
        post.body,
        post.title || null,
        post.reference || null,
        post.topic || null,
        post.tags,
        0,
        0,
        0,
      )
    );
  }

  if (connection) {
    envelope = await DomainEnvelope.createWithMessage(
      0,
      tld,
      null,
      networkId || crypto.randomBytes(8).toString('hex'),
      new DomainConnection(
        0,
        connection.tld,
        connection.subdomain || null,
        connection.type,
      ),
    );
  }

  if (moderation) {
    envelope = await DomainEnvelope.createWithMessage(
      0,
      tld,
      null,
      networkId || crypto.randomBytes(8).toString('hex'),
      new DomainModeration(
        0,
        moderation.reference,
        moderation.type,
      ),
    )
  }

  return envelope!.toWire(nameIndex);
}

export async function createEnvelope(tld: string, params: WriterEnvelopeParams): Promise<WireEnvelope | undefined> {
  const {
    post,
    connection,
    moderation,
    media,
    networkId,
    refhash,
    createAt,
    nameIndex = 0,
  } = params;

  let envelope: DomainEnvelope<any> | undefined;

  if (!networkId || !refhash || !createAt) return undefined;

  const createdAt = new Date(createAt.toISOString().split('.')[0]+"Z");

  if (post) {
    envelope = new DomainEnvelope(
      0,
      tld,
      null,
      networkId,
      refhash,
      createdAt,
      new DomainPost(
        0,
        post.body,
        post.title || null,
        post.reference || null,
        post.topic || null,
        post.tags,
        0,
        0,
        0,
      ),
      null,
    );
  }

  if (connection) {
    envelope = new DomainEnvelope(
      0,
      tld,
      null,
      networkId,
      refhash,
      createdAt,
      new DomainConnection(
        0,
        connection.tld,
        connection.subdomain || null,
        connection.type,
      ),
      null,
    );
  }

  if (moderation) {
    envelope = new DomainEnvelope(
      0,
      tld,
      null,
      networkId,
      refhash,
      createdAt,
      new DomainModeration(
        0,
        moderation.reference,
        moderation.type,
      ),
      null,
    )
  }

  return envelope!.toWire(nameIndex);
}

export function hashPostBody(post: PostBody, date: Date): Buffer {
  const h = blake2b(32);
  h.update(Buffer.from(post.title || '', 'utf-8'));
  h.update(Buffer.from(post.body || '', 'utf-8'));
  h.update(Buffer.from(post.reference || '', 'utf-8'));
  h.update(Buffer.from(post.topic || '', 'utf-8'));
  h.update(Buffer.from(date.toISOString(), 'utf-8'));
  post.tags.forEach(tag => {
    h.update(Buffer.from(tag, 'utf-8'));
  });
  return Buffer.from(h.digest());
}

export function hashModerationBody(mod: ModerationBody, date: Date): Buffer {
  const h = blake2b(32);
  h.update(Buffer.from(mod.type, 'utf-8'));
  h.update(Buffer.from(mod.reference || '', 'utf-8'));
  h.update(Buffer.from(date.toISOString(), 'utf-8'));
  return Buffer.from(h.digest());
}

export function hashConnectionBody(conn: ConnectionBody, date: Date): Buffer {
  const h = blake2b(32);
  h.update(Buffer.from(conn.type, 'utf-8'));
  h.update(Buffer.from(conn.tld || '', 'utf-8'));
  h.update(Buffer.from(conn.subdomain || '', 'utf-8'));
  h.update(Buffer.from(date.toISOString(), 'utf-8'));
  return Buffer.from(h.digest());
}

export function hashMediaBody(media: MediaBody, date: Date): Buffer {
  const h = blake2b(32);
  h.update(Buffer.from(media.filename, 'utf-8'));
  h.update(Buffer.from(media.mimeType || '', 'utf-8'));
  h.update(Buffer.from(media.content || '', 'hex'));
  h.update(Buffer.from(date.toISOString(), 'utf-8'));
  return Buffer.from(h.digest());
}

