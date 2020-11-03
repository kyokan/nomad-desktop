import {DraftPost} from "../../ui/ducks/drafts/type";
import {Post as WirePost} from 'ddrp-js/dist/social/Post';
import {Envelope as DomainEnvelope} from 'ddrp-indexer/dist/domain/Envelope';
import {Post as DomainPost} from 'ddrp-indexer/dist/domain/Post';
import {ResponsePost} from "../types";
import {serializeUsername} from "../../ui/helpers/user";
import {RelayerPostModel} from "../../../external/universal/types/posts";

export const mapDraftToPostPayload = (draft?: DraftPost): RelayerPostModel => {
  if (!draft) {
    return {
      title: '',
      parent: '',
      context: '',
      content: '',
      topic: '',
      tags: [],
    };
  }

  let content = draft.content;

  if (draft.attachments) {
    content = content + '\n';
    content = content + draft.attachments.map(h => `<div data-image-file-hash="${h}"></div>`).join('');
  }

  return {
    title: draft.title,
    parent: draft.parent,
    context: draft.context,
    content: content,
    topic: draft.topic,
    tags: draft.tags,
  };
};

export const mapDraftToDomainPost = (draft: DraftPost): DomainPost => {
  if (!draft) {
    return new DomainPost(
      0,
      '',
      null,
      null,
      null,
      [],
      0,
      0,
      0,
    );
  }

  const parent = draft.parent
    ? draft.parent
    : null;

  let content = draft.content;

  if (draft.attachments) {
    content = content + '\n';
    content = content + draft.attachments.map(h => `<div data-image-file-hash="${h}"></div>`).join('');
  }

  return new DomainPost(
    0,
    content,
    null,
    parent,
    draft.topic || null,
    draft.tags,
    0,
    0,
    0,
  );
};

export const mapPostWithMetaToPost = (env: DomainEnvelope<DomainPost>): ResponsePost => {
  return {
    guid: String(env.networkId) || '',
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

export function parsePreviewLinks(content: string): string[] {
  const links: string[] = [];

  try {
    const lines = content.split('\n');
    lines.forEach((line) => {
      const parsed = line.match(/!\[.*\](\(.*\))/);

      if (parsed) {
        links.push(parsed[1].split(' ')[0].replace(/\(|\)/g, ''));
      }
    });
  } catch (e) {
    //
    return links;
  }

  return links;
}
