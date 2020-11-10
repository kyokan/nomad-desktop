import {Filter as F} from '../../../../external/nomad-api/src/services/indexer/Filter';

export type Filter = F;

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
