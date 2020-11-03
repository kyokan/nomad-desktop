import {PostType} from "../../types/posts";

export type DraftPost = {
  type: PostType;
  timestamp: number;
  title: string;
  content: string;
  topic: string;
  tags: string[];
  context: string;
  parent: string;
  attachments: string[];
}

export type DraftPostOpts = {
  type?: PostType;
  timestamp?: number;
  title?: string;
  content?: string;
  topic?: string;
  tags?: string[];
  attachments?: string[];
  context?: string;
  parent?: string;
}

export const createNewDraft = (draft?: DraftPostOpts): DraftPost => {
  return {
    type: PostType.ORIGINAL,
    timestamp: 0,
    title: '',
    content: '',
    topic: '',
    tags: [],
    context: '',
    parent: '',
    attachments: [],
    ...draft || {},
  };
};
