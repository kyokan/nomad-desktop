import {DraftPost} from "nomad-universal/lib/ducks/drafts/type";
import {Envelope as DomainEnvelope} from 'fn-client/lib/application/Envelope';
import {Post as DomainPost} from 'fn-client/lib/application/Post';
import {ResponsePost} from "../types";
import {serializeUsername} from "nomad-api/lib/util/user";

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
