import {ResponsePost} from "../../../src/app/types";
import {Envelope as DomainEnvelope} from '../../../external/indexer/domain/Envelope';
import {Post as DomainPost} from '../../../external/indexer/domain/Post';
import {serializeUsername} from "../../../src/ui/helpers/user";
import {INDEXER_API} from "./api";
import {DraftPost} from "../../../src/ui/ducks/drafts/type";
import {RelayerPostModel} from "../types/posts";

export function getCSSImageURLFromPostHash (hash: string): string {
  return `url(${INDEXER_API}/media/${hash})`;
}

export function getCSSImageURLFromAvatarType (avatarType: string, username: string) {
  if (avatarType === '_') {
    return `url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAVAAAAEYAQMAAAAwLTybAAAAA1BMVEXy8vJkA4prAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAI0lEQVRoge3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAA4McALwgAAQoNfCUAAAAASUVORK5CYII=')`;
  }
  return `url(${INDEXER_API}/avatars/${avatarType || 'identicon'}/${username}.svg)`
}

export function getImageURLFromPostHash (hash: string): string {
  return `${INDEXER_API}/media/${hash}`;
}

export function getImageURLFromAvatarType (avatarType: string, username: string): string {
  if (avatarType === '_') {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAVAAAAEYAQMAAAAwLTybAAAAA1BMVEXy8vJkA4prAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAI0lEQVRoge3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAA4McALwgAAQoNfCUAAAAASUVORK5CYII=';
  }
  return `${INDEXER_API}/avatars/${avatarType || 'identicon'}/${username}.svg`;
}

export const mapDomainEnvelopeToPost = (env: DomainEnvelope<DomainPost>): ResponsePost => {
  return {
    title: env.message.title || '',
    content: env.message.body || '',
    name: serializeUsername(env.subdomain, env.tld),
    timestamp: env.createdAt || 0,
    parent: env.message.reference || '',
    context: '',
    topic: env.message.topic || '',
    tags: env.message.tags || [],
    hash: env.refhash,
    meta: {
      replyCount: env.message.replyCount,
      likeCount: env.message.likeCount,
      pinCount: env.message.pinCount,
    },
  };
};

export const mapDraftToPostPayload = (draft?: DraftPost): RelayerPostModel => {
  if (!draft) {
    return {
      parent: '',
      context: '',
      content: '',
      topic: '',
      tags: [],
      title: '',
    };
  }

  let content = draft.content;

  if (draft.attachments) {
    content = content + '\n';
    content = content + draft.attachments.map(h => `<div data-image-file-hash="${h}"></div>`).join('');
  }

  return {
    parent: draft.parent,
    context: draft.context,
    content: content,
    topic: draft.topic,
    tags: draft.tags,
    title: draft.title,
  };
};
