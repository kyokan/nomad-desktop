import {ThunkDispatch} from "redux-thunk";
import {Envelope as DomainEnvelope} from '../../indexer/domain/Envelope';
import {Post as DomainPost} from '../../indexer/domain/Post';
import {Pageable} from '../../indexer/dao/Pageable';
import {shallowEqual, useDispatch, useSelector} from "react-redux";
import {Dispatch} from "redux";
import {useCallback} from "react";
import {PostType} from "../types/posts";
import uniq from "lodash.uniq";
import {addUserBlocks, addUserFollowings, addUserLikes, useCurrentUser, useCurrentUsername} from "./users";
import {INDEXER_API} from "../utils/api";
import {dotName, parseUsername, serializeUsername} from "../utils/user";
import {createNewDraft, DraftPost} from "./drafts/type";
import {mapDomainEnvelopeToPost, mapDraftToPostPayload} from "../utils/posts";
import {TopicMeta} from "../../../src/app/controllers/signer";
import {
  IPCMessageRequestType,
  IPCMessageResponse, RelayerNewBlockResponse, RelayerNewFollowResponse,
  RelayerNewPostResponse,
  RelayerNewReactionResponse,
  ResponsePost
} from "../../../src/app/types";

const postIPCMain = async (a: any, b?: any): Promise<any> => {
  return {
    id: 0,
    payload: {},
  };
};

export enum PostsActionType {
  UPDATE_ORDER = 'app/posts/updateOrder',
  UPDATE_POST = 'app/posts/updatePost',
  UPDATE_POST_LIKE_COUNT = 'app/posts/updatePostLikeCount',
  UPDATE_COMMENTS = 'app/posts/updateComments',
  APPEND_NEW_POST = 'app/posts/appendNewPost',
  APPEND_NEW_COMMENT = 'app/posts/appendNewComment',
  UPDATE_GLOBAL_META = 'app/posts/updateGlobalMeta',
  SET_USER_PROFILE_PICTURE = 'app/posts/setUserProfilePicture',
  SET_USER_COVER_IMAGE = 'app/posts/setUserCoverImage',
}

export type PostMeta = {
  replyCount: number;
  likeCount: number;
  pinCount: number;
};

export type Post = {
  hash: string;
  id: string;
  type: PostType;
  creator: string;
  timestamp: number;
  title: string;
  content: string;
  topic: string;
  tags: string[];
  context: string;
  meta: PostMeta;
  comments: string[];
  parent: string;
  attachments: string[];
  next?: number | null;
  pending?: boolean;
}

export type PostOpts = {
  hash?: string;
  id?: string;
  type?: PostType;
  creator?: string;
  timestamp?: number;
  title?: string;
  content?: string;
  topic?: string;
  tags?: string[];
  context?: string;
  meta?: PostMeta;
  comments?: string[];
  parent?: string;
  attachments?: string[];
  pending?: boolean;
}

export type GlobalMeta = {
  topics: {
    [topicName: string]: TopicMeta;
  };
  users: {
    [username: string]: {
      posts: number;
      comments: number;
      profilePictureUrl?: string;
      lastProfilePictureUpdate?: number;
      coverImageUrl?: string;
      lastCoverImageUpdate?: number;
      firstActivity: number;
      lastActivity: number;
      topics: {
        [topic: string]: number;
      };
    };
  };
  lastScanned: number;
}

export type PostsState = {
  map: {
    [id: string]: Post;
  };
  order: string[];
  meta: GlobalMeta;
}

type PostsAction<payload> = {
  type: PostsActionType;
  payload: payload;
  meta?: any;
  error?: boolean;
}

const initState: PostsState = {
  map: {
  },
  order: [],
  meta: {
    topics: {},
    users: {},
    lastScanned: 0,
  },
};


type UpdatePostAction = PostsAction<Post>;
type UpdateCommentsAction = PostsAction<{
  hash: string;
  next: number | null;
  items: string[];
}>

export const createNewPost = (post?: PostOpts): Post => {
  const empty: Post = {
    hash: '',
    id: '',
    type: PostType.ORIGINAL,
    creator: '',
    timestamp: 0,
    title: '',
    content: '',
    topic: '',
    context: '',
    comments: [],
    tags: [],
    parent: '',
    attachments: [],
    meta: {
      replyCount: 0,
      likeCount: 0,
      pinCount: 0,
    },
  };

  return {
    ...empty,
    ...post || {},
  };
};

export const updatePost = (post: Post): UpdatePostAction => ({
  type: PostsActionType.UPDATE_POST,
  payload: post,
});

export const appendNewPost = (postId: string) => ({
  type: PostsActionType.APPEND_NEW_POST,
  payload: postId,
});


export const appendNewComment = (parentHash: string, commentId: string, shouldIncrement?: boolean) => ({
  type: PostsActionType.APPEND_NEW_COMMENT,
  payload: { parentHash, commentId },
  meta: { shouldIncrement },
});

const _updateComments = (hash: string, next: number | null, items: string[]): UpdateCommentsAction => ({
  type: PostsActionType.UPDATE_COMMENTS,
  payload: {
    hash,
    next,
    items,
  },
});

export const updateComments = (hash: string, next: number | null, items: string[]) => (dispatch: Dispatch) => {
  setTimeout(() => {
    dispatch(_updateComments(hash, next, items));
  }, 0);
};

export const addLikeCount = (hash: string, additionalLikeCounts: number): PostsAction<{hash: string; additionalLikeCounts: number}> => {
  return {
    type: PostsActionType.UPDATE_POST_LIKE_COUNT,
    payload: {
      hash,
      additionalLikeCounts,
    },
  };
};

export const setUserProfilePicture = (name: string, profilePictureUrl: string): PostsAction<{ name: string; profilePictureUrl: string }> => {
  return {
    type: PostsActionType.SET_USER_PROFILE_PICTURE,
    payload: {
      name,
      profilePictureUrl,
    },
  };
};

export const setUserCoverImage = (
  name: string,
  coverImage: string
): PostsAction<{ name: string; coverImage: string }> => {
  return {
    type: PostsActionType.SET_USER_COVER_IMAGE,
    payload: {
      name,
      coverImage,
    },
  };
};

export const mapRawToPost = (rawPost: ResponsePost): Post => {
  const content = rawPost.content;

  return createNewPost({
    hash: rawPost.hash,
    type: rawPost.parent ? PostType.COMMENT : PostType.ORIGINAL,
    creator: rawPost.name,
    timestamp: new Date(rawPost.timestamp).getTime(),
    title: rawPost.title,
    content,
    topic: rawPost.topic,
    tags: rawPost.tags,
    context: rawPost.context,
    parent: rawPost.parent,
    comments: [],
    attachments: [],
    meta: rawPost.meta,
  });
};

export const updateRawPost = (rawPost: ResponsePost): UpdatePostAction => {
  return updatePost(mapRawToPost(rawPost));
};

const _reduceUpdatePost = (state: PostsState, action: UpdatePostAction): PostsState => {
  const old = state.map[action.payload.hash] || { comments: null };

  return {
    ...state,
    map: {
      ...state.map,
      [action.payload.hash]: {
        ...old,
        ...action.payload,
        comments: old.comments ? old.comments : action.payload.comments,
      },
    },
  }
};

const reduceUpdateComments = (state: PostsState, action: UpdateCommentsAction): PostsState => {
  const old = state.map[action.payload.hash];

  return {
    ...state,
    map: {
      ...state.map,
      [action.payload.hash]: {
        ...old,
        comments: uniq((old?.comments || []).concat(action.payload.items)),
        next: action.payload.next,
      },
    },
  }
};

export const fetchPostByHash = (hash: string) => async (dispatch: ThunkDispatch<{}, {}, PostsAction<any>>) => {
  if (!hash) {
    return;
  }

  const resp = await fetch(`${INDEXER_API}/posts/${hash}`);
  const json: IPCMessageResponse<DomainEnvelope<DomainPost> | null> = await resp.json();

  if (!json.error && json.payload) {
    dispatch(updateRawPost(mapDomainEnvelopeToPost(json.payload)));
  }
};


export const fetchComments = (
  parent: string, order: 'ASC' | 'DESC' = 'DESC',
  start?: number
) => async (dispatch: ThunkDispatch<{}, {}, PostsAction<any>>) => {
  const resp = await fetch(`${INDEXER_API}/posts/${parent}/comments?order=${order}${start ? '&offset=' + start : ''}`);
  const json: IPCMessageResponse<Pageable<DomainEnvelope<DomainPost>, number>> = await resp.json();
  const comments: string[] = [];
  json.payload.items.forEach((postWithMeta: DomainEnvelope<DomainPost>) => {
    const post = mapDomainEnvelopeToPost(postWithMeta);
    comments.push(post.hash);
    dispatch(updateRawPost(post));
    dispatch(appendNewComment(parent, post.hash))
  });
  dispatch(updateComments(parent, json.payload.next, comments));
};

export const useQueryMediaForName = () => {
  return async function queryNext(
    username: string,
    next: number | null,
    list: DomainEnvelope<DomainPost>[] = []
  ): Promise<Pageable<DomainEnvelope<DomainPost>, number>> {
    const resp = await fetch(`${INDEXER_API}/users/${username}/timeline?order=DESC&next=${next}`);
    const json = await resp.json();
    if (json.error) {
      return Promise.reject(json.error);
    }

    const payload = json.payload as Pageable<DomainEnvelope<DomainPost>, number>;
    list = list.concat(payload.items)
      .filter((postWithMeta) => {
        const { message: post } = postWithMeta;
        return post.topic === '.imageFile';
      });

    if (list.length < 40 && payload.next) {
      return await queryNext(username, payload.next, list);
    } else {
      return {
        items: list,
        next: payload.next,
      };
    }
  }
};

export default function postsReducer(state: PostsState = initState, action: PostsAction<any>): PostsState {
  switch (action.type) {
    case PostsActionType.UPDATE_POST:
      return _reduceUpdatePost(state, action);
    case PostsActionType.UPDATE_POST_LIKE_COUNT:
      return reduceUpdatePostLikeCount(state, action);
    case PostsActionType.UPDATE_COMMENTS:
      return reduceUpdateComments(state, action);
    case PostsActionType.UPDATE_ORDER:
      return { ...state, order: action.payload };
    case PostsActionType.APPEND_NEW_POST:
      return { ...state, order: [action.payload, ...state.order]};
    case PostsActionType.APPEND_NEW_COMMENT:
      return reduceAppendNewComment(state, action);
    case PostsActionType.UPDATE_GLOBAL_META:
      return { ...state, meta: action.payload };
    case PostsActionType.SET_USER_PROFILE_PICTURE:
      return reduceSetUserProfilePicture(state, action);
    case PostsActionType.SET_USER_COVER_IMAGE:
      return reduceSetUserCoverImage(state, action);
    default:
      return state;
  }
}

function reduceUpdatePostLikeCount(
  state: PostsState = initState,
  action: PostsAction<{hash: string; additionalLikeCounts: number}>
): PostsState {
  const { hash, additionalLikeCounts } = action.payload;
  const post = state.map[hash];

  return !post ? state : {
    ...state,
    map: {
      ...state.map,
      [hash]: {
        ...post,
        meta: {
          ...post.meta || {
            likeCount: 0,
            replyCount: 0,
            pinCount: 0,
          },
          likeCount: additionalLikeCounts + post.meta?.likeCount || 0,
        },
      },
    },
  };
}

function reduceSetUserProfilePicture(
  state: PostsState = initState,
  action: PostsAction<{name: string; profilePictureUrl: string}>
): PostsState {
  const { name, profilePictureUrl } = action.payload;
  const users = state.meta.users;
  const selectedUser = users[name] || {
    posts: 0,
    comments: 0,
    firstActivity: 0,
    lastActivity: 0,
    topics: {},
  };

  return {
    ...state,
    meta: {
      ...state.meta,
      users: {
        ...users,
        [name]: {
          ...selectedUser,
          profilePictureUrl,
        }
      }
    },
  };
}

function reduceSetUserCoverImage(
  state: PostsState = initState,
  action: PostsAction<{name: string; coverImage: string}>
): PostsState {
  const { name, coverImage } = action.payload;
  const users = state.meta.users;
  const selectedUser = users[name] || {
    posts: 0,
    comments: 0,
    firstActivity: 0,
    lastActivity: 0,
    topics: {},
  };

  return {
    ...state,
    meta: {
      ...state.meta,
      users: {
        ...users,
        [name]: {
          ...selectedUser,
          coverImageUrl: coverImage,
        }
      }
    },
  };
}

function reduceAppendNewComment(
  state: PostsState = initState,
  action: PostsAction<{parentHash: string; commentId: string}>
): PostsState {
  const { parentHash, commentId } = action.payload;
  const shouldIncrement = action.meta?.shouldIncrement;
  const parent = state.map[parentHash];
  const oldComments = parent.comments;
  const newComments = Array.from(new Set([commentId, ...parent.comments]));

  if (!parent || oldComments.length === newComments.length) {
    return state;
  }

  return {
    ...state,
    map: {
      ...state.map,
      [parentHash]: {
        ...parent,
        comments: newComments,
        meta: {
          ...parent.meta,
          replyCount: shouldIncrement
            ? parent.meta.replyCount + 1
            : parent.meta.replyCount,
        }
      },
    },
  };
}

// Selector Hooks
export const usePostId = (id: string): Post => {
  return useSelector((state: { posts: PostsState }): Post => {
    return createNewPost(state.posts.map[id]);
  }, shallowEqual);
};

export const usePostsMap = (): PostsState["map"] => {
  return useSelector((state: { posts: PostsState }): PostsState["map"] => {
    return state.posts.map;
  }, shallowEqual);
};


export const useCommentsFromParentId = (id: string): string[] => {
  return useSelector((state: { posts: PostsState }): string[] => {
    return state.posts.map[id] ? state.posts.map[id].comments : [];
  }, (a: string[], b: string[]) => {
    return a.join(',') === b.join(',');
  });
};

export const useGlobalMeta = (): GlobalMeta => {
  return useSelector((state: { posts: PostsState }): GlobalMeta => {
    return state.posts.meta || {
      topics: {},
      users: {},
      lastScanned: 0,
    };
  }, shallowEqual);
};

// Callback
export const useUploadImage = (updateAfter?: boolean) => {
  // const dispatch = useDispatch();
  return useCallback(async (imageString: string): Promise<IPCMessageResponse<DomainEnvelope<DomainPost>>> => {
    const draft = createNewDraft({
      content: imageString,
      topic: '.imageFile',
    });

    const res: IPCMessageResponse<DomainEnvelope<DomainPost>> = await postIPCMain({
      type: IPCMessageRequestType.SEND_NEW_POST,
      payload: {
        draft,
        truncate: false,
      },
    }, true);

    if (updateAfter) {
      await postIPCMain({
        type: IPCMessageRequestType.SEND_UPDATE_FOR_CURRENT_USER,
      }, true);
    }

    return res;
  }, [postIPCMain]);
};

export const useSendPost = () => {
  const dispatch = useDispatch();

  return useCallback(async (draft: DraftPost): Promise<RelayerNewPostResponse> => {
    const payload = mapDraftToPostPayload(draft);
    const token = '';

    const resp = await fetch(`${INDEXER_API}/subdomains/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Token': token || '',
      },
      body: JSON.stringify({
        title: payload.title,
        body: payload.content,
        reference: payload.parent,
        topic: payload.topic,
        tags: payload.tags,
      }),
    });

    const json: IPCMessageResponse<RelayerNewPostResponse> = await resp.json();

    if (json.error) {
      // @ts-ignore
      throw new Error(json.payload as string);
    }

    dispatch(updatePost(createNewPost({
      hash: json.payload.refhash,
      id: json.payload.network_id,
      type: PostType.ORIGINAL,
      creator: serializeUsername(json.payload.username, json.payload.tld),
      timestamp: json.payload.timestamp * 1000,
      content: json.payload.body,
      topic: json.payload.topic,
      tags: json.payload.tags,
      context: '',
      parent: json.payload.reference,
    })));

    return json.payload;
  }, [dispatch]);
};


export const useLikePage = () => {
  const dispatch = useDispatch();
  return useCallback(async (postHash: string) => {
    try {
      const token = '';

      const resp = await fetch(`${INDEXER_API}/subdomains/moderations`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': token || '',
        },
        body: JSON.stringify({
          reference: postHash,
          type: 'LIKE',
        }),
      });
      const json: IPCMessageResponse<RelayerNewReactionResponse> = await resp.json();

      if (resp.status !== 200) {
        throw new Error((json as any).message);
      }

      dispatch(addUserLikes(
        serializeUsername(json.payload.username, json.payload.tld),
        {
          [json.payload.reference]: json.payload.reference,
        }
      ));

      dispatch(addLikeCount(postHash, 1));
    } catch (e) {
      //
    }
  }, [dispatch]);
};

export const useFollowUser = () => {
  const dispatch = useDispatch();
  const currentUsername = useCurrentUsername();

  return useCallback(async (username: string) => {
    const token = '';
    const parsed = parseUsername(username);
    const tld = dotName(parsed.tld);
    const subdomain = parsed.subdomain;
    const resp = await fetch(`${INDEXER_API}/subdomains/connections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Token': token || '',
      },
      body: JSON.stringify({
        type: 'FOLLOW',
        // eslint-disable-next-line @typescript-eslint/camelcase
        connectee_tld: tld,
        // eslint-disable-next-line @typescript-eslint/camelcase
        connectee_subdomain: subdomain || undefined,
      }),
    });

    const json: IPCMessageResponse<RelayerNewFollowResponse> = await resp.json();

    if (resp.status !== 200) {
      throw new Error(json.payload.message);
    }

    dispatch(addUserFollowings(currentUsername, {
      [username]: username,
    }));
  }, [dispatch, postIPCMain, currentUsername])
};

export const useBlockUser = () => {
  const dispatch = useDispatch();
  const currentUser = useCurrentUser();

  return useCallback(async (username: string) => {
    const token = '';
    const parsed = parseUsername(username);
    const tld = dotName(parsed.tld);
    const subdomain = parsed.subdomain;
    const resp = await fetch(`${INDEXER_API}/subdomains/connections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Token': token || '',
      },
      body: JSON.stringify({
        type: 'BLOCK',
        // eslint-disable-next-line @typescript-eslint/camelcase
        connectee_tld: tld,
        // eslint-disable-next-line @typescript-eslint/camelcase
        connectee_subdomain: subdomain || undefined,
      }),
    });

    const json: IPCMessageResponse<RelayerNewBlockResponse> = await resp.json();

    if (resp.status !== 200) {
      throw new Error(json.payload.message);
    }

    dispatch(addUserBlocks(currentUser.name, {
      [username]: username,
    }));

  }, [dispatch, currentUser.name])
}

export const useSelectPost = () => {
  return useCallback((postHash: string) => {
    postIPCMain({
      type: IPCMessageRequestType.OPEN_POST_VIEWER_WINDOW,
      payload: {
        postHash,
      },
    });

    setTimeout(() => {
      postIPCMain({
        type: IPCMessageRequestType.SET_POST_VIEWER_HASH,
        payload: {
          postHash,
        },
      });
    }, 30)
  }, [postIPCMain]);

};

export const useFetchMoreComments = (parentHash: string) => {
  const { next } = usePostId(parentHash);
  const dispatch = useDispatch();
  return useCallback(async () => {
    if (next === null) {
      return;
    }

    return dispatch(fetchComments(parentHash, 'DESC', next));
  }, [next, dispatch, parentHash]);
};

