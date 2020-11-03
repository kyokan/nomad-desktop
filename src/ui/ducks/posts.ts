import {ThunkDispatch} from "redux-thunk";
import {PostWithMeta} from 'ddrp-indexer/dist/dao/PostWithMeta';
import {postIPCMain} from "../helpers/ipc";
import {IPCMessageRequestType, IPCMessageResponse, ResponsePost} from "../../app/types";
import {shallowEqual, useDispatch, useSelector} from "react-redux";
import {GlobalMeta} from "../../app/controllers/signer";
import {Dispatch} from "redux";
import {mapPostWithMetaToPost} from "../../app/util/posts";
import {useCallback} from "react";
import {addUserFollowings, useCurrentUser} from "./users";
import {markup} from "../helpers/rte";
import {Pageable} from 'ddrp-indexer/dist/dao/Pageable';
import {parseUsername} from "../helpers/user";
import uniq from "lodash.uniq";

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

export enum PostType {
  ORIGINAL = 'original',
  COMMENT = 'comment',
  REPOST = 'repost',
}

export type PostMeta = PostWithMeta["meta"];

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
  meta?: PostWithMeta["meta"];
  comments?: string[];
  parent?: string;
  attachments?: string[];
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

export const appendNewComment = (parentHash: string, commentId: string) => ({
  type: PostsActionType.APPEND_NEW_COMMENT,
  payload: { parentHash, commentId },
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

export const scanGlobalMeta = () => async (dispatch: Dispatch) => {
  const resp: IPCMessageResponse<GlobalMeta> = await postIPCMain({
    type: IPCMessageRequestType.SCAN_ALL_NAMES,
    payload: {},
  }, true);

  if (resp.error) {
    return Promise.reject(resp.payload);
  }
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

export const setUserCoverImage = (name: string, coverImage: string): PostsAction<{ name: string; coverImage: string }> => {
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

  const attachments: string[] = [];
  try {
    const parser = new DOMParser();
    const dom = parser.parseFromString(markup(content), 'text/html');
    const elements = dom.body.querySelectorAll('div[data-image-file-hash]');
    Array.prototype.forEach.call(elements, (element: HTMLDivElement) => {
      const dataSet = element.dataset;
      if (dataSet.imageFileHash) {
        attachments.push(dataSet.imageFileHash);
      }
    });
  } catch (e) {
    //
  }

  return createNewPost({
    hash: rawPost.hash,
    id: rawPost.guid,
    type: rawPost.parent ? PostType.COMMENT : PostType.ORIGINAL,
    creator: rawPost.name,
    timestamp: new Date(rawPost.timestamp).getTime(),
    title: '',
    content,
    topic: rawPost.topic,
    tags: rawPost.tags,
    context: rawPost.context,
    parent: rawPost.parent,
    comments: [],
    attachments,
    meta: rawPost.meta,
  });
};

export const updateRawPost = (rawPost: ResponsePost): UpdatePostAction => {
  return updatePost(mapRawToPost(rawPost));
};

const _reduceUpdatePost = (state: PostsState, action: UpdatePostAction): PostsState => {
  const old = state.map[action.payload.hash] || {};

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
  const old = state.map[action.payload.hash] || { comments: [] };

  return {
    ...state,
    map: {
      ...state.map,
      [action.payload.hash]: {
        ...old,
        comments: uniq(old.comments.concat(action.payload.items)),
        next: action.payload.next,
      },
    },
  }
};

export const fetchPost = (name: string, guid: string) => async (dispatch: ThunkDispatch<{}, {}, PostsAction<any>>) => {
  if (!name || !guid) {
    return;
  }

  const resp: IPCMessageResponse<PostWithMeta> = await postIPCMain({
    type: IPCMessageRequestType.GET_POST,
    payload: { name, guid },
  }, true);


  if (!resp.error) {
    dispatch(updateRawPost(mapPostWithMetaToPost(resp.payload)));
  }
};

export const fetchPostByHash = (hash: string) => async (dispatch: ThunkDispatch<{}, {}, PostsAction<any>>) => {
  if (!hash) {
    return;
  }

  const resp: IPCMessageResponse<PostWithMeta> = await postIPCMain({
    type: IPCMessageRequestType.GET_POST_BY_HASH,
    payload: { hash },
  }, true);

  if (!resp.error) {
    dispatch(updateRawPost(mapPostWithMetaToPost(resp.payload)));
  }
};


export const fetchComments = (parent: string, order: 'ASC' | 'DESC' = 'DESC', start?: number) => (dispatch: ThunkDispatch<{}, {}, PostsAction<any>>) => {
  const msg = {
    type: IPCMessageRequestType.QUERY_POSTS_WITH_PARENT,
    payload: {
      parent,
      order,
      start,
    },
  };

  return postIPCMain(msg, true)
    .then((resp: IPCMessageResponse<Pageable<PostWithMeta, number>>) => {
      const comments: string[] = [];
      resp.payload.items.forEach(postWithMeta => {
        const post = mapPostWithMetaToPost(postWithMeta);
        comments.push(post.hash);
        dispatch(updateRawPost(post));
        // dispatch(appendNewComment(parent, post.hash))
      });
      dispatch(updateComments(parent, resp.payload.next, comments));
    });
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

function reduceUpdatePostLikeCount(state: PostsState = initState, action: PostsAction<{hash: string; additionalLikeCounts: number}>): PostsState {
  const { hash, additionalLikeCounts } = action.payload;
  const post = state.map[hash];

  return !post ? state : {
    ...state,
    map: {
      ...state.map,
      [hash]: {
        ...post,
        meta: {
          ...post.meta || {},
          likeCount: additionalLikeCounts + post.meta?.likeCount || 0,
        },
      },
    },
  };
}

function reduceSetUserProfilePicture(state: PostsState = initState, action: PostsAction<{name: string; profilePictureUrl: string}>): PostsState {
  const { name, profilePictureUrl } = action.payload;
  const users = state.meta.users;
  const selectedUser = users[name] || {};

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

function reduceSetUserCoverImage(state: PostsState = initState, action: PostsAction<{name: string; coverImage: string}>): PostsState {
  const { name, coverImage } = action.payload;
  const users = state.meta.users;
  const selectedUser = users[name] || {};

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

function reduceAppendNewComment(state: PostsState = initState, action: PostsAction<{parentHash: string; commentId: string}>): PostsState {
  const { parentHash, commentId } = action.payload;
  const parent = state.map[parentHash];

  return !parent ? state : {
    ...state,
    map: {
      ...state.map,
      [parentHash]: {
        ...parent,
        comments: uniq([...parent.comments, commentId]),
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
  }, (a, b) => {
    return a.join(',') === b.join(',');
  });
};

export const useGlobalMeta = (): GlobalMeta => {
  return useSelector((state: { posts: PostsState }): GlobalMeta => {
    return state.posts.meta;
  }, shallowEqual);
};

// Callback
// export const useLikePage = () => {
//   const dispatch = useDispatch();
//   return useCallback(async (postHash) => {
//     try {
//       await postIPCMain({
//         type: IPCMessageRequestType.SEND_NEW_REACTION,
//         payload: {
//           parent: postHash,
//           reactionType: ReactionType.LIKE,
//         },
//       }, true);
//
//       await postIPCMain({
//         type: IPCMessageRequestType.SEND_UPDATE_FOR_CURRENT_USER,
//         payload: {},
//       }, true);
//
//       dispatch(fetchCurrentUserLikes());
//       dispatch(addLikeCount(postHash, 1));
//     } catch (e) {
//       //
//     }
//   }, [postIPCMain]);
// };

// export const useFollowUser = () => {
//   const dispatch = useDispatch();
//   const currentUser = useCurrentUser();
//   return useCallback(async (username: string) => {
//     await postIPCMain({
//       type: IPCMessageRequestType.FOLLOW_USER,
//       payload: {
//         tld: username,
//       },
//     }, true);
//
//     await postIPCMain({
//       type: IPCMessageRequestType.SEND_UPDATE_FOR_CURRENT_USER,
//       payload: {},
//     }, true);
//
//
//     dispatch(addUserFollowings(currentUser.name, {
//       [username]: username,
//     }));
//   }, [dispatch, postIPCMain, currentUser.name])
// }

// export const useBlockUser = () => {
//   const dispatch = useDispatch();
//   const currentUser = useCurrentUser();
//   return useCallback(async (username: string) => {
//     const {tld, subdomain} = parseUsername(username);
//     await postIPCMain({
//       type: IPCMessageRequestType.BLOCK_USER,
//       payload: {
//         tld: tld,
//         subdomain: subdomain
//       },
//     }, true);
//
//     await postIPCMain({
//       type: IPCMessageRequestType.SEND_UPDATE_FOR_CURRENT_USER,
//       payload: {},
//     }, true);
//
//   }, [dispatch, postIPCMain, currentUser.name])
// }

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
