export interface Filter {
  postedBy: string[];
  likedBy: string[];
  repliedBy: string[];
  postHashes: string[];
  parentHashes: string[];
  allowedTags: string[];
}

export type FilterOpts = {
  postedBy?: string[];
  likedBy?: string[];
  repliedBy?: string[];
  postHashes?: string[];
  parentHashes?: string[];
  allowedTags?: string[];
};

export const extendFilter = (opts: FilterOpts): Filter => {
  return {
    postedBy: [],
    repliedBy: [],
    likedBy: [],
    postHashes: [],
    parentHashes: [],
    allowedTags: [],
    ...opts,
  }
};
