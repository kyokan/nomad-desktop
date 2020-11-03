export enum PostType {
  ORIGINAL = 'original',
  COMMENT = 'comment',
  REPOST = 'repost',
}

export type RelayerPostModel = {
  title: string;
  parent: string;
  context: string;
  content: string;
  topic: string;
  tags: string[];
}
