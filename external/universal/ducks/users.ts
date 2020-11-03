// @ts-ignore
import {shallowEqual, useDispatch, useSelector} from "react-redux";
import {
  IPCMessageRequestType,
  IPCMessageResponse,
  RelayerLoginResponse,
  RelayerSignupResponse
} from "../../electron/src/app/types";
// @ts-ignore
import {ThunkDispatch} from "redux-thunk";
// @ts-ignore
import {Pageable} from 'ddrp-indexer/dist/dao/Pageable';
import {CustomViewProps, UserData} from "../../electron/src/app/controllers/userData";
// @ts-ignore
import {useCallback} from "react";
import {extendFilter} from "../../electron/src/ui/helpers/filter";
import {INDEXER_API, RELAYER_API} from "../utils/api";
import {
  addSavedIdentity,
  getIdentity,
  getSavedIdentities,
  removeIdentity,
  setIdentity
} from "../../web-client/src/utils/localStorage";
import {mapDomainEnvelopeToPost} from "../utils/posts";
import {UserProfile} from "../../indexer-api/src/constants";
import {dotName, parseUsername, serializeUsername} from "../utils/user";
// @ts-ignore
import {Envelope as DomainEnvelope} from 'ddrp-indexer/dist/domain/Envelope';
// @ts-ignore
import {Post as DomainPost} from 'ddrp-indexer/dist/domain/Post';
// @ts-ignore
import {Connection as DomainConnection} from 'ddrp-indexer/dist/domain/Connection';
import {updatePost, updateRawPost} from "./posts";

const postIPCMain = async (a: any, b: any): Promise<IPCMessageResponse<any>> => {
  return {
    id: 0,
    payload: {},
  };
};

export type User = {
  name: string;
  profilePicture: string;
  coverImage: string;
  avatarType: string;
  bio: string;
  displayName: string;
  followings: {
    [username: string]: string;
  };
  likes: {
    [postHash: string]: string;
  };
  blocks: {
    [username: string]: string;
  };
  stats: {
    blockers: number;
    blockings: number;
    followers: number;
    followings: number;
  };
  channels: {
    [channelHash: string]: string;
  };
}

type UserOpts = {
  name?: string;
  profilePicture?: string;
  coverImage?: string;
  avatarType?: string;
  bio?: string;
  displayName?: string;
  followings?: {
    [username: string]: string;
  };
  likes?: {
    [postHash: string]: string;
  };
  blocks?: {
    [username: string]: string;
  };
  channels?: {
    [channelHash: string]: string;
  };
  stats?: {
    blockers: number;
    blockings: number;
    followers: number;
    followings: number;
  };
}

export type UsersState = {
  currentUser: string;
  currentUserLikes: {
    [postHash: string]: string;
  };
  currentUserData: UserData;
  currentUserPublicKey: string;
  identities: {
    [name: string]: string;
  };
  map: {
    [name: string]: User;
  };
}

export enum UsersActionType {
  ADD_USER = 'app/users/addUser',
  ADD_IDENTITY = 'app/users/addIdentity',
  SET_CURRENT_USER = 'app/users/setCurrentUser',
  SET_USER_PROFILE = 'app/users/setUserProfile',
  SET_CURRENT_LIKES = 'app/users/setCurrentLikes',
  ADD_CURRENT_LIKES = 'app/users/addCurrentLikes',
  SET_USER_LIKES = 'app/users/setUserLikes',
  ADD_USER_LIKES = 'app/users/addUserLikes',
  SET_USER_CHANNELS = 'app/users/setUserChannels',
  ADD_USER_CHANNELS = 'app/users/addUserChannels',
  UPDATE_CURRENT_USER = 'app/users/updateCurrentUser',
  SET_USER_FOLLOWINGS = 'app/users/setUserFollowings',
  ADD_USER_FOLLOWINGS = 'app/users/addUserFollowings',
  SET_USER_BLOCKS = 'app/users/setUserBlocks',
  ADD_USER_BLOCKS = 'app/users/addUserBlocks',
  SET_CURRENT_USER_PUB_KEY = 'app/users/setCurrentUserPubKey',
  SET_CURRENT_USER_DATA = 'app/users/setCurrentUserData',
  UPDATE_CURRENT_LAST_FLUSHED = 'app/users/updateCurrentLastFlushed',
  UPDATE_CURRENT_UPDATE_QUEUE = 'app/users/updateCurrentUpdateQueue',
}

type UsersAction<payload> = {
  type: UsersActionType;
  payload: payload;
  meta?: any;
  error?: boolean;
}

const initialState: UsersState = {
  currentUser: '',
  currentUserPublicKey: '',
  currentUserLikes: {},
  currentUserData: {
    mutedNames: [],
    savedViews: [],
    hiddenPostHashes: [],
    lastFlushed: 0,
    updateQueue: [],
  },
  identities: {},
  map: {},
};

type FetchIdentityIPCResponse = IPCMessageResponse<{
  users: string[];
  currentUser: string;
}>

export const fetchIdentity = () => (dispatch: ThunkDispatch<any, any, any>, getState: () => { users: UsersState }) => {
  const identities = getSavedIdentities();

  console.log({identities})

  identities!.forEach(name => dispatch({
    type: UsersActionType.ADD_IDENTITY,
    payload: name,
  }));
}

export const updateCurrentUser = (username: string): UsersAction<string> => ({
  type: UsersActionType.UPDATE_CURRENT_USER,
  payload: username,
});

export const addIdentity = (name: string): UsersAction<string> => ({
  type: UsersActionType.ADD_IDENTITY,
  payload: name,
});

export const updateCurrentLastFlushed = (lastFlushed: number) => ({
  type: UsersActionType.UPDATE_CURRENT_LAST_FLUSHED,
  payload: lastFlushed,
});

export const setCurrentUpdateQueue = (lastFlushed: number) => ({
  type: UsersActionType.UPDATE_CURRENT_UPDATE_QUEUE,
  payload: lastFlushed,
});

export const fetchCurrentUserLikes = () => (dispatch: ThunkDispatch<any, any, any>, getState: () => { users: UsersState }) => {
  const { currentUser } = getState().users;
  return fetchUserLikes(currentUser);
};

export const fetchUserLikes = (name: string) => async (dispatch: ThunkDispatch<any, any, any>, getState: () => { users: UsersState }) => {
  dispatch(setUserLikes(name, {}));
  await queryLikes(0, {});

  async function queryLikes(start: number, likes: {[hash: string]: string}) {
    const resp = await fetch(`${INDEXER_API}/users/${name}/likes?order=ASC${start ? '&offset=' + start : ''}`);
    const json: IPCMessageResponse<Pageable<DomainEnvelope<DomainPost>, number>> = await resp.json();
    if (!json.error) {
      json.payload.items.forEach((postWithMeta: DomainEnvelope<DomainPost>) => {
        const post = mapDomainEnvelopeToPost(postWithMeta);
        likes[post.hash] = post.hash;
      });

      if (json.payload.next > -1) {
        setTimeout(() => queryLikes(json.payload.next, likes), 200);
      } else {
        dispatch(addUserLikes(name, likes));
      }
    }
  }
};

export const fetchUserChannels = (name: string, limit = 20, offset?: number) => async (dispatch: ThunkDispatch<any, any, any>, getState: () => { users: UsersState }) => {
  dispatch(setUserFollowings(name, {}));

  const resp = await fetch(`${INDEXER_API}/users/${name}/channels?order=ASC&limit=${limit}${offset ? '&offset=' + offset : ''}`);
  const json: IPCMessageResponse<Pageable<DomainPost, number>> = await resp.json();

  if (!json.error) {
    const newChannels = json.payload.items
      // @ts-ignore
      .reduce((acc: {[h: string]: string}, env) => {
        const post = mapDomainEnvelopeToPost(env);
        dispatch(updateRawPost(post));
        acc[post.hash] = post.content;
        return acc;
      }, {});
    dispatch(addUserChannels(name, newChannels));
  }
};

export const fetchUserFollowings = (name: string, limit = 20, offset?: number) => async (dispatch: ThunkDispatch<any, any, any>, getState: () => { users: UsersState }) => {
  dispatch(setUserFollowings(name, {}));

  const resp = await fetch(`${INDEXER_API}/users/${name}/followees?order=ASC&limit=${limit}${offset ? '&offset=' + offset : ''}`);
  const json: IPCMessageResponse<Pageable<DomainConnection, number>> = await resp.json();

  if (!json.error) {
    const newFollowings = json.payload.items
      // @ts-ignore
      .reduce((acc: {[h: string]: string}, { tld, subdomain }) => {
        const username = serializeUsername(subdomain, tld);
        acc[username] = username;
        return acc;
      }, {});
    dispatch(addUserFollowings(name, newFollowings));
  }
};

export const fetchUserBlockee = (username: string) => (dispatch: ThunkDispatch<any, any, any>, getState: () => { users: UsersState }) => {
  dispatch(setUserBlocks(username, {}));
  queryBlockeeByUsername(0);

  async function queryBlockeeByUsername(start: number) {
    const resp = await fetch(`${INDEXER_API}/users/${username}/blockees?order=ASC${start ? '&offset=' + start : ''}`);
    const json: IPCMessageResponse<Pageable<DomainEnvelope<DomainPost>, number>> = await resp.json();

    if (!json.error) {
      // @ts-ignore
      dispatch(addUserBlocks(username, json.payload.items.reduce((acc: {[h: string]: string}, { tld, subdomain }) => {
        const username = serializeUsername(subdomain, tld);
        acc[username] = username;
        return acc;
      }, {})));
      if (json.payload.next > -1) {
        // @ts-ignore
        setTimeout(() => queryBlockeeByUsername(resp.payload.next), 200);
      }
    }
  }
};

export const setCurrentLikes = (likes: {[postHash: string]: string}) => ({
  type: UsersActionType.SET_CURRENT_LIKES,
  payload: likes,
});

export const setUserLikes = (name: string, likes: {[postHash: string]: string}) => ({
  type: UsersActionType.SET_USER_LIKES,
  payload: {name, likes},
});


export const addUserLikes = (name: string, likes: {[postHash: string]: string}) => ({
  type: UsersActionType.ADD_USER_LIKES,
  payload: {name, likes},
});

export const setUserChannels = (name: string, channels: {[channelHash: string]: string}) => ({
  type: UsersActionType.SET_USER_CHANNELS,
  payload: {name, channels},
});


export const addUserChannels = (name: string, channels: {[channelHash: string]: string}) => ({
  type: UsersActionType.ADD_USER_CHANNELS,
  payload: {name, channels},
});

export const addUserFollowings = (name: string, followings: {[username: string]: string}) => ({
  type: UsersActionType.ADD_USER_FOLLOWINGS,
  payload: { name, followings },
});

export const setUserFollowings = (name: string, followings: {[username: string]: string}) => ({
  type: UsersActionType.SET_USER_FOLLOWINGS,
  payload: { name, followings },
});

export const addUserBlocks = (name: string, blocks: {[username: string]: string}) => ({
  type: UsersActionType.ADD_USER_BLOCKS,
  payload: { name, blocks },
});

export const setUserBlocks = (name: string, blocks: {[username: string]: string}) => ({
  type: UsersActionType.SET_USER_BLOCKS,
  payload: { name, blocks },
});

export const addCurrentLikes = (likes: {[postHash: string]: string}) => ({
  type: UsersActionType.ADD_CURRENT_LIKES,
  payload: likes,
});

export const addUser = (name: string): UsersAction<string> => ({
  type: UsersActionType.ADD_USER,
  payload: name,
});

export const setCurrentUser = (name: string) => async (dispatch: ThunkDispatch<any, any, any>) => {
  // dispatch(fetchCurrentUserData());
  dispatch(updateCurrentUser(name));
  // dispatch(fetchUserBlockee(name));
  // dispatch(fetchUserFollowings(name));
  // dispatch(fetchUserLikes(name));
};

export default function usersReducer(state: UsersState = initialState, action: UsersAction<any>): UsersState {
  switch (action.type) {
    case UsersActionType.ADD_USER:
      return reducerAddUser(state, action);
    case UsersActionType.SET_CURRENT_USER:
      return {
        ...state,
        currentUser: action.payload,
      };
    case UsersActionType.SET_CURRENT_USER_PUB_KEY:
      return {
        ...state,
        currentUserPublicKey: action.payload,
      };
    case UsersActionType.UPDATE_CURRENT_USER:
      return {
        ...state,
        currentUser: action.payload,
      };
    case UsersActionType.SET_CURRENT_LIKES:
      return {
        ...state,
        currentUserLikes: action.payload,
      };
    case UsersActionType.ADD_CURRENT_LIKES:
      return {
        ...state,
        currentUserLikes: {
          ...state.currentUserLikes,
          ...action.payload,
        },
      };
    case UsersActionType.UPDATE_CURRENT_LAST_FLUSHED:
      return {
        ...state,
        currentUserData: {
          ...state.currentUserData,
          lastFlushed: action.payload,
        },
      };
    case UsersActionType.UPDATE_CURRENT_UPDATE_QUEUE:
      return {
        ...state,
        currentUserData: {
          ...state.currentUserData,
          updateQueue: action.payload,
        },
      };
    case UsersActionType.SET_USER_FOLLOWINGS:
      return reducerSetUserFollowings(state, action);
    case UsersActionType.ADD_USER_FOLLOWINGS:
      return reducerAddUserFollowings(state, action);
    case UsersActionType.SET_USER_BLOCKS:
      return reducerSetUserBlocks(state, action);
    case UsersActionType.SET_USER_CHANNELS:
      return reducerSetUserChannels(state, action);
    case UsersActionType.ADD_USER_BLOCKS:
      return reducerAddUserBlocks(state, action);
    case UsersActionType.ADD_USER_CHANNELS:
      return reducerAddUserChannels(state, action);
    case UsersActionType.SET_USER_LIKES:
      return reducerSetUserLikes(state, action);
    case UsersActionType.SET_USER_PROFILE:
      return reducerSetUserProfile(state, action);
    case UsersActionType.ADD_USER_LIKES:
      return reducerAddUserLikes(state, action);
    case UsersActionType.ADD_IDENTITY:
      return reducerAddIdentity(state, action);
    case UsersActionType.SET_CURRENT_USER_DATA:
      return {
        ...state,
        currentUserData: action.payload,
      };
    default:
      return state;
  }
}

function reducerAddUser(state: UsersState = initialState, action: UsersAction<string>): UsersState {
  return {
    ...state,
    map: {
      ...state.map,
      [action.payload]: makeUser({
        name: action.payload,
        followings: {},
        likes: {},
        blocks: {},
      }),
    },
  };
}

function reducerAddIdentity(state: UsersState = initialState, action: UsersAction<string>): UsersState {
  const user = state.map[action.payload];
  return {
    ...state,
    map: {
      ...state.map,
      [action.payload]: makeUser({
        name: action.payload,
        followings: user?.followings || {},
        likes: user?.likes || {},
        blocks: user?.blocks || {},
      }),
    },
    identities: {
      ...state.identities,
      [action.payload]: action.payload,
    },
  };
}

function reducerSetUserLikes(state: UsersState = initialState, action: UsersAction<{name: string; likes: {[username: string]: string}}>): UsersState {
  const { name, likes } = action.payload;
  const user = state.map[name] || {};

  return {
    ...state,
    map: {
      ...state.map,
      [name]: makeUser({
        ...user,
        likes,
      }),
    },
  };
}

function reducerSetUserProfile(state: UsersState = initialState, action: UsersAction<{username: string} & UserProfile>): UsersState {
  const {
    username,
    profilePicture,
    coverImage,
    avatarType,
    bio,
    displayName,
    followers,
    followings,
    blockers,
    blockings,
  } = action.payload;
  const user = state.map[username] || {};

  return {
    ...state,
    map: {
      ...state.map,
      [username]: makeUser({
        ...user,
        profilePicture,
        coverImage,
        avatarType,
        bio,
        displayName,
        stats: {
          followers,
          followings,
          blockers,
          blockings,
        },
      }),
    },
  };
}

function reducerAddUserLikes(state: UsersState = initialState, action: UsersAction<{name: string; likes: {[username: string]: string}}>): UsersState {
  const { name, likes } = action.payload;
  const user = state.map[name];

  return {
    ...state,
    map: {
      ...state.map,
      [name]: makeUser({
        ...user,
        likes: {
          ...user?.likes,
          ...likes,
        },
      }),
    },
  };
}

function reducerSetUserFollowings(state: UsersState = initialState, action: UsersAction<{name: string; followings: {[username: string]: string}}>): UsersState {
  const { name, followings } = action.payload;
  const user = state.map[name] || {};

  return {
    ...state,
    map: {
      ...state.map,
      [name]: makeUser({
        ...user,
        followings,
      }),
    },
  };
}


function reducerSetUserBlocks(state: UsersState = initialState, action: UsersAction<{name: string; blocks: {[username: string]: string}}>): UsersState {
  const { name, blocks } = action.payload;
  const user = state.map[name] || {};

  return {
    ...state,
    map: {
      ...state.map,
      [name]: makeUser({
        ...user,
        blocks,
      }),
    },
  };
}

function reducerSetUserChannels(state: UsersState = initialState, action: UsersAction<{name: string; channels: {[channelHash: string]: string}}>): UsersState {
  const { name, channels } = action.payload;
  const user = state.map[name] || {};

  return {
    ...state,
    map: {
      ...state.map,
      [name]: makeUser({
        ...user,
        channels,
      }),
    },
  };
}

function reducerAddUserFollowings(state: UsersState = initialState, action: UsersAction<{name: string; followings: {[username: string]: string}}>): UsersState {
  const { name, followings } = action.payload;
  const user = state.map[name];

  return {
    ...state,
    map: {
      ...state.map,
      [name]: makeUser({
        ...user,
        followings: {
          ...user?.followings,
          ...followings,
        },
      }),
    },
  };
}

function reducerAddUserBlocks(state: UsersState = initialState, action: UsersAction<{name: string; blocks: {[username: string]: string}}>): UsersState {
  const { name, blocks } = action.payload;
  const user = state.map[name];

  return {
    ...state,
    map: {
      ...state.map,
      [name]: makeUser({
        ...user,
        blocks: {
          ...user?.blocks,
          ...blocks,
        },
      }),
    },
  };
}

function reducerAddUserChannels(state: UsersState = initialState, action: UsersAction<{name: string; channels: {[channelHash: string]: string}}>): UsersState {
  const { name, channels } = action.payload;
  const user = state.map[name];

  return {
    ...state,
    map: {
      ...state.map,
      [name]: makeUser({
        ...user,
        channels: {
          ...user?.channels,
          ...channels,
        },
      }),
    },
  };
}

// Selector Hooks
export const useCurrentUsername = (): string => {
  return useSelector((state:  { users: UsersState }): string => {
    const {
      users: {
        currentUser,
      },
    } = state;

    return currentUser
  }, shallowEqual);
};

export const useCurrentUser = (): User => {
  return useSelector((state:  { users: UsersState }): User => {
    const {
      users: {
        currentUser,
        map,
      },
    } = state;
    const user = map[currentUser];

    return makeUser({
      name: currentUser,
      ...user,
    });
  }, (a: User, b: User) => {
    return JSON.stringify(a) === JSON.stringify(b);
  });
};

export const useUsers = (): {users: string[]; currentUser: string} => {
  return useSelector((state: { users: UsersState}) => {
    return {
      users: Object.keys(state.users.map),
      currentUser: state.users.currentUser,
    };
  }, (a: {users: string[]; currentUser: string}, b: {users: string[]; currentUser: string}) => {
    return (
      a.currentUser === b.currentUser &&
      a.users.join() === b.users.join()
    );
  });
};

export const useIdentity = (): {identities: UsersState["identities"]; currentUser: string} => {
  return useSelector((state: { users: UsersState}) => {
    return {
      identities: state.users.identities,
      currentUser: state.users.currentUser,
    };
  }, (a: {identities: UsersState["identities"]; currentUser: string}, b: {identities: UsersState["identities"]; currentUser: string}) => {
    return (
      a.currentUser === b.currentUser &&
      Object.keys(a.identities).join() === Object.keys(b.identities).join()
    );
  });
};

export const useUsersMap = (): UsersState["map"] => {
  return useSelector((state: { users: UsersState}) => {
    return state.users.map;
  }, shallowEqual);
};

export const useUser = (name: string): User | undefined => {
  return useSelector((state: { users: UsersState}) => {
    return state.users.map[name];
  }, (a: User | undefined, b: User | undefined) => {
    if (!a && !b) {
      return true;
    }

    if (!a || !b) {
      return false;
    }

    return a.name === b.name
      && a.coverImage === b.coverImage
      && a.profilePicture === b.profilePicture
      && Object.keys(a.followings).join(',') === Object.keys(b.followings).join(',')
      && Object.keys(a.likes).join(',') === Object.keys(b.likes).join(',')
      && Object.keys(a.blocks).join(',') === Object.keys(b.blocks).join(',')
      && Object.keys(a.channels).join(',') === Object.keys(b.channels).join(',')
  });
};

export const useCurrentLikes = (): UsersState["currentUserLikes"] => {
  return useSelector((state: { users: UsersState}) => {
    return state.users.map[state.users.currentUser]?.likes || empty;
  }, (a: UsersState["currentUserLikes"], b: UsersState["currentUserLikes"]) => {
    if (!a && !b) {
      return true;
    }

    if (!a || !b) {
      return false;
    }

    return Object.keys(a).join(',') === Object.keys(b).join(',');
  });
};

const empty = {};
export const useCurrentFollowings = (): User["followings"] => {
  return useSelector((state: { users: UsersState}) => {
    return state.users.map[state.users.currentUser]?.followings || empty;
  }, (a: User["followings"], b: User["followings"]) => {
    return Object.keys(a).join(',') === Object.keys(b).join(',');
  });
};

export const useCurrentBlocks = (): User["blocks"] => {
  return useSelector((state: { users: UsersState}) => {
    return state.users.map[state.users.currentUser]?.blocks || empty;
  }, (a: User["blocks"], b: User["blocks"]) => {
    return Object.keys(a).join(',') === Object.keys(b).join(',');
  });
};

export const userCurrentMutedNames = (): UserData["mutedNames"] => {
  return useSelector((state: { users: UsersState}) => {
    return state.users.currentUserData.mutedNames || [];
  }, (a: UserData["mutedNames"], b: UserData["mutedNames"]) => {
    return a.join(',') === b.join(',');
  });
};

export const userCurrentUserData = (): UserData | undefined => {
  return useSelector((state: { users: UsersState}) => {
    return state.users.currentUserData;
  }, (a: UserData, b: UserData) => {
    return JSON.stringify(a) === JSON.stringify(b);
  });
};

export const userCurrentSavedViews = (): UserData["savedViews"] => {
  return useSelector((state: { users: UsersState}) => {
    const { savedViews } = state.users.currentUserData;
    return savedViews;
  }, shallowEqual);
};

export const muteUser = (username: string) => async (dispatch: ThunkDispatch<any, any, any>) => {
  await postIPCMain({
    type: IPCMessageRequestType.MUTE_NAME,
    payload: username,
  }, true);

  // await dispatch(fetchCurrentUserData());
};

export const unmuteUser = (username: string) => async (dispatch: ThunkDispatch<any, any, any>) => {
  await postIPCMain({
    type: IPCMessageRequestType.UNMUTE_NAME,
    payload: username,
  }, true);

  // await dispatch(fetchCurrentUserData());
};

export const useCreateNewView = () => {
  const dispatch = useDispatch();
  return useCallback(async (view: CustomViewProps) => {
    await postIPCMain({
      type: IPCMessageRequestType.SAVE_VIEW,
      payload: view,
    }, true);
    // await dispatch(fetchCurrentUserData());
  }, [postIPCMain]);
};

export const useDeleteFilterByIndex = () => {
  const dispatch = useDispatch();
  return useCallback(async (index: number) => {
    await postIPCMain({
      type: IPCMessageRequestType.DELETE_FILTER_BY_INDEX,
      payload: index,
    }, true);
    // await dispatch(fetchCurrentUserData());
  }, [postIPCMain]);
};

export const useUpdateTitleByViewIndex = () => {
  const dispatch = useDispatch();
  const savedViews = userCurrentSavedViews();
  return useCallback(async (title: string, index: number) => {
    const oldView = savedViews[index];
    const newView: CustomViewProps = {
      title,
      heroImageUrl: oldView.heroImageUrl,
      iconUrl: oldView.iconUrl,
      filter: oldView.filter,
    };
    await postIPCMain({
      type: IPCMessageRequestType.UPDATE_FILTER_BY_INDEX,
      payload: {
        view: newView,
        index,
      },
    }, true);
    // await dispatch(fetchCurrentUserData());
  }, [postIPCMain, dispatch, savedViews]);
};

export const useUpdateHeroByViewIndex = () => {
  const dispatch = useDispatch();
  const savedViews = userCurrentSavedViews();
  return useCallback(async (heroImageUrl: string, index: number) => {
    const oldView = savedViews[index];
    const newView: CustomViewProps = {
      title: oldView.title,
      heroImageUrl,
      iconUrl: oldView.iconUrl,
      filter: oldView.filter,
    };
    await postIPCMain({
      type: IPCMessageRequestType.UPDATE_FILTER_BY_INDEX,
      payload: {
        view: newView,
        index,
      },
    }, true);
    // await dispatch(fetchCurrentUserData());
  }, [postIPCMain, dispatch, savedViews]);
};

export const useAddUserToViewIndex = () => {
  const dispatch = useDispatch();
  const savedViews = userCurrentSavedViews();
  return useCallback(async (name: string, index: number) => {
    const oldView = savedViews[index];
    const newView: CustomViewProps = {
      title: oldView.title,
      heroImageUrl: oldView.heroImageUrl,
      iconUrl: oldView.iconUrl,
      filter: extendFilter({
        postHashes: oldView.filter.postHashes,
        likedBy: [...oldView.filter.likedBy, name],
        repliedBy: [...oldView.filter.repliedBy, name],
        postedBy: [...oldView.filter.postedBy, name],
        parentHashes: oldView.filter.parentHashes,
      }),
    };
    await postIPCMain({
      type: IPCMessageRequestType.UPDATE_FILTER_BY_INDEX,
      payload: {
        view: newView,
        index,
      },
    }, true);
    // await dispatch(fetchCurrentUserData());
  }, [postIPCMain, dispatch, savedViews]);
};

export const useRemoveUserFromViewIndex = () => {
  const dispatch = useDispatch();
  const savedViews = userCurrentSavedViews();
  return useCallback(async (name: string, index: number) => {
    const oldView = savedViews[index];
    const newView: CustomViewProps = {
      title: oldView.title,
      heroImageUrl: oldView.heroImageUrl,
      iconUrl: oldView.iconUrl,
      filter: extendFilter({
        postHashes: oldView.filter.postHashes,
        likedBy: oldView.filter.likedBy.filter((n: string) => n !== name),
        repliedBy: oldView.filter.repliedBy.filter((n: string) => n !== name),
        postedBy: oldView.filter.postedBy.filter((n: string) => n !== name),
        parentHashes: oldView.filter.parentHashes,
      }),
    };

    await postIPCMain({
      type: IPCMessageRequestType.UPDATE_FILTER_BY_INDEX,
      payload: {
        view: newView,
        index,
      },
    }, true);
    // await dispatch(fetchCurrentUserData());
  }, [postIPCMain, dispatch, savedViews]);
};

export const useSubdomainLogout = () => {
  const dispatch = useDispatch();
  return useCallback(async () => {
    await removeIdentity();
    await dispatch(setCurrentUser(''));
  }, [dispatch]);
};

export const useSubdomainLogin = () => {
  const dispatch = useDispatch();
  return useCallback(async (tld: string, subdomain: string, password: string) => {
    const resp = await fetch(`${INDEXER_API}/subdomains/login`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tld: dotName(tld),
        subdomain,
        password,
      }),
    });

    const json: IPCMessageResponse<RelayerLoginResponse | string> = await resp.json();

    if (json.error) {
      throw new Error(json.payload as string);
    }

    const { token, expiry } = (json?.payload as RelayerLoginResponse) || {};

    await setIdentity(tld, subdomain, token, expiry);
    await addSavedIdentity(tld, subdomain);
    dispatch(setCurrentUser(serializeUsername(subdomain, tld)));
  }, [dispatch])
};

export const useSubdomainSignup = () => {

  const login = useSubdomainLogin();
  return useCallback(async (tld: string, subdomain: string, email: string, password: string) => {
    const resp = await fetch(`${INDEXER_API}/subdomains/signup`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tld: dotName(tld),
        subdomain,
        password,
        email,
      }),
    });

    const json: IPCMessageResponse<RelayerSignupResponse | string> = await resp.json();

    if (json.error) {
      throw new Error(json.payload as string);
    }

    await login(tld, subdomain, password);
  }, [login])
};

const USER_FETCHED_STATUS: {
  [username: string]: boolean,
} = {};

export const useFetchUser = () => {
  const dispatch = useDispatch();
  return useCallback(async (username: string) => {
    if (USER_FETCHED_STATUS[username]) {
      return;
    }

    USER_FETCHED_STATUS[username] = true;
    const resp = await fetch(`${INDEXER_API}/users/${username}/profile`);
    const json: IPCMessageResponse<UserProfile> = await resp.json();

    dispatch({
      type: UsersActionType.SET_USER_PROFILE,
      payload: {
        username,
        profilePicture: json.payload?.profilePicture,
        coverImage: json.payload?.coverImage,
        avatarType: json.payload?.avatarType,
        bio: json.payload?.bio,
        blockers: json.payload?.blockers,
        followers: json.payload?.followers,
        blockings: json.payload?.blockings,
        followings: json.payload?.followings,
        displayName: json.payload?.displayName,
      },
    });

    // dispatch(fetchUserFollowings(username));
    // USER_FETCHED_STATUS[username] = false;
    setTimeout(() => {
      USER_FETCHED_STATUS[username] = false;
    }, 5000);
  }, [dispatch]);
};

function makeUser(userOpts: UserOpts): User {
  const {
    name = '',
    profilePicture = '',
    coverImage = '',
    avatarType = '',
    bio = '',
    displayName = '',
    followings = {},
    likes = {},
    blocks = {},
    stats = {
      blockers: 0,
      blockings: 0,
      followers: 0,
      followings: 0,
    },
    channels = {},
  } = userOpts;

  return {
    name,
    profilePicture,
    coverImage,
    followings,
    likes,
    blocks,
    avatarType,
    bio,
    displayName,
    stats,
    channels,
  };
}

export const useDisplayName = (username: string): string => {
  const user = useUser(username);
  const {tld, subdomain} = parseUsername(username);
  return user?.displayName || subdomain || tld;
};

export const useIdentities = (): string[] => {
  return useSelector(() => {
    const identities = getSavedIdentities();
    return identities;
  }, (a: any, b: any) => a.join('') === b.join(''));
};
