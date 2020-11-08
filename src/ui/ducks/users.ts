import {shallowEqual, useDispatch, useSelector} from "react-redux";
import {postIPCMain} from "../helpers/ipc";
import {IPCMessageRequestType, IPCMessageResponse} from "../../app/types";
import {ThunkAction, ThunkDispatch} from "redux-thunk";
// @ts-ignore
import {Pageable} from '../../../../external/indexer/dao/Pageable';
import {CustomViewProps, UserData} from "../../app/controllers/userData";
import {useCallback} from "react";
import {extendFilter} from "../helpers/filter";
import {serializeUsername} from "../helpers/user";
import {INDEXER_API} from "../../../external/universal/utils/api";
import {Envelope as DomainEnvelope} from '../../../external/indexer/domain/Envelope';
import {Post as DomainPost} from '../../../external/indexer/domain/Post';
import {Connection as DomainConnection} from '../../../external/indexer/domain/Connection';

type User = {
  name: string;
  followings: {
    [username: string]: string;
  };
  likes: {
    [postHash: string]: string;
  };
  blocks: {
    [username: string]: string;
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

enum UsersActionType {
  ADD_USER = 'app/users/addUser',
  ADD_IDENTITY = 'app/users/addIdentity',
  SET_CURRENT_USER = 'app/users/setCurrentUser',
  SET_CURRENT_LIKES = 'app/users/setCurrentLikes',
  ADD_CURRENT_LIKES = 'app/users/addCurrentLikes',
  SET_USER_LIKES = 'app/users/setUserLikes',
  ADD_USER_LIKES = 'app/users/addUserLikes',
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
    offset: 0,
  },
  identities: {},
  map: {},
};

type FetchIdentityIPCResponse = IPCMessageResponse<{
  users: string[];
  currentUser: string;
}>

export const fetchIdentity = () => (dispatch: ThunkDispatch<any, any, any>) => {
  const ipcEvt = {
    type: IPCMessageRequestType.GET_IDENTITY,
    payload: {},
  };

  postIPCMain(ipcEvt, true)
    .then((resp: FetchIdentityIPCResponse) => {
      const { users, currentUser } = resp.payload;
      users.forEach(name => dispatch({
        type: UsersActionType.ADD_IDENTITY,
        payload: name,
      }));

      if (currentUser) {
        dispatch({
          type: UsersActionType.UPDATE_CURRENT_USER,
          payload: currentUser,
        });

        dispatch(fetchCurrentUserLikes());
        dispatch(fetchUserFollowings(currentUser));
        dispatch(fetchUserBlockee(currentUser));
      }

      dispatch(fetchCurrentUserData());
    });
};

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

export const fetchCurrentUserData = () => async (dispatch: ThunkDispatch<any, any, any>, getState: () => { users: UsersState }) => {
  const resp: IPCMessageResponse<UserData | string> = await postIPCMain({
    type: IPCMessageRequestType.GET_USER_DATA,
    payload: {},
  }, true);

  if (resp.error) {
    throw new Error(resp.payload as string);
  }

  dispatch({
    type: UsersActionType.SET_CURRENT_USER_DATA,
    payload: resp.payload,
  });
};

export const fetchCurrentUserLikes = () => async (dispatch: ThunkDispatch<any, any, any>, getState: () => { users: UsersState }) => {
  const { currentUser } = getState().users;
  dispatch(setCurrentLikes({}));
  await queryLikes();

  async function queryLikes(start?: number) {
    const resp = await fetch(`${INDEXER_API}/users/${currentUser}/likes?limit=100${start ? '&offset=' + start : ''}`);
    const json: IPCMessageResponse<Pageable<DomainEnvelope<DomainPost>, number>> = await resp.json();

    if (!json.error) {
      dispatch(
        addUserLikes(
          currentUser,
          json.payload.items.reduce((acc: {[h: string]: string}, env: DomainEnvelope<DomainPost>) => {
            acc[env.refhash] = env.refhash;
            return acc;
          }, {})
        )
      );

      // @ts-ignore
      if (json.payload.next > -1) {
        // @ts-ignore
        setTimeout(() => queryLikes(json.payload.next), 200);
      }
    }
  }
};

export const fetchUserLikes = (username: string) => async (dispatch: ThunkDispatch<any, any, any>, getState: () => { users: UsersState }) => {
  dispatch(setUserLikes(name, {}));
  await queryLikes();

  async function queryLikes(start?: number) {
    const resp = await fetch(`${INDEXER_API}/users/${username}/likes?limit=100${start ? '&offset=' + start : ''}`);
    const json: IPCMessageResponse<Pageable<DomainEnvelope<DomainPost>, number>> = await resp.json();

    if (!json.error) {
      dispatch(
        addUserLikes(
          username,
          json.payload.items.reduce((acc: {[h: string]: string}, env: DomainEnvelope<DomainPost>) => {
            acc[env.refhash] = env.refhash;
            return acc;
          }, {})
        )
      );

      // @ts-ignore
      if (json.payload.next > -1) {
        // @ts-ignore
        setTimeout(() => queryLikes(json.payload.next), 200);
      }
    }
  }
};

export const fetchUserFollowings = (username: string) => async (dispatch: ThunkDispatch<any, any, any>, getState: () => { users: UsersState }) => {
  dispatch(setUserFollowings(name, {}));
  await queryFollowings(0);

  async function queryFollowings(start: number) {
    const resp = await fetch(`${INDEXER_API}/users/${username}/followees?limit=100${start ? '&offset=' + start : ''}`);
    const json: IPCMessageResponse<Pageable<DomainConnection, number>> = await resp.json();

    if (!json.error) {
      dispatch(
        addUserFollowings(
          name,
          json.payload.items.reduce((acc: {[h: string]: string}, env: DomainConnection) => {
            acc[env.tld] = env.tld;
            return acc;
          }, {})
        )
      );

      if (json.payload.next > -1) {
        setTimeout(() => queryFollowings(json.payload.next), 200);
      }
    }
  }
};

export const fetchUserBlockee = (username: string) => async (dispatch: ThunkDispatch<any, any, any>, getState: () => { users: UsersState }) => {
  dispatch(setUserBlocks(name, {}));
  await queryBlockeeByUsername(0);

  async function queryBlockeeByUsername(start: number) {
    const resp = await fetch(`${INDEXER_API}/users/${username}/blockees?limit=100${start ? '&offset=' + start : ''}`);
    const json: IPCMessageResponse<Pageable<DomainConnection, number>> = await resp.json();

    if (!json.error) {
      dispatch(
        addUserBlocks(
          username,
          json.payload.items.reduce((acc: {[h: string]: string}, env: DomainConnection) => {
            const {subdomain, tld} = env;
            const username = serializeUsername(subdomain, tld);
            acc[username] = username;
            return acc;
          }, {})
        )
      );

      if (json.payload.next > -1) {
        setTimeout(() => queryBlockeeByUsername(json.payload.next), 200);
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

export const setCurrentUser = (name: string, password: string) => async (dispatch: ThunkDispatch<any, any, any>) => {
  const ipcEvt = {
    type: IPCMessageRequestType.SET_CURRENT_USER,
    payload: {name, password},
  };

  const resp = await postIPCMain(ipcEvt, true);

  dispatch(fetchCurrentUserData());
  dispatch(fetchUserBlockee(name));
  dispatch(fetchUserFollowings(name));
  dispatch(fetchCurrentUserLikes());

  if (!resp.error) {
    dispatch({
      type: UsersActionType.SET_CURRENT_USER_PUB_KEY,
      payload: resp.payload.publicKey,
    });
  }

  return resp;
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
    case UsersActionType.ADD_USER_BLOCKS:
      return reducerAddUserBlocks(state, action);
    case UsersActionType.SET_USER_LIKES:
      return reducerSetUserLikes(state, action);
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
      [action.payload]: {
        name: action.payload,
        followings: {},
        likes: {},
        blocks: {},
      },
    },
  };
}

function reducerAddIdentity(state: UsersState = initialState, action: UsersAction<string>): UsersState {
  const user = state.map[action.payload] || {};
  return {
    ...state,
    map: {
      ...state.map,
      [action.payload]: {
        name: action.payload,
        followings: user.followings || {},
        likes: user.likes || {},
        blocks: user.blocks || {},
      },
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
      [name]: {
        ...user,
        likes,
      },
    },
  };
}

function reducerAddUserLikes(state: UsersState = initialState, action: UsersAction<{name: string; likes: {[username: string]: string}}>): UsersState {
  const { name, likes } = action.payload;
  const user = state.map[name] || {};

  return {
    ...state,
    map: {
      ...state.map,
      [name]: {
        ...user,
        likes: {
          ...user.likes || {},
          ...likes,
        },
      },
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
      [name]: {
        ...user,
        followings,
      },
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
      [name]: {
        ...user,
        blocks,
      },
    },
  };
}

function reducerAddUserFollowings(state: UsersState = initialState, action: UsersAction<{name: string; followings: {[username: string]: string}}>): UsersState {
  const { name, followings } = action.payload;
  const user = state.map[name] || {};

  return {
    ...state,
    map: {
      ...state.map,
      [name]: {
        ...user,
        followings: {
          ...user.followings || {},
          ...followings,
        },
      },
    },
  };
}

function reducerAddUserBlocks(state: UsersState = initialState, action: UsersAction<{name: string; blocks: {[username: string]: string}}>): UsersState {
  const { name, blocks } = action.payload;
  const user = state.map[name] || {};

  return {
    ...state,
    map: {
      ...state.map,
      [name]: {
        ...user,
        blocks: {
          ...user.blocks || {},
          ...blocks,
        },
      },
    },
  };
}

// Selector Hooks
export const useCurrentUser = (): User => {
  return useSelector((state:  { users: UsersState }): User => {
    const {
      users: {
        currentUser,
        map,
      },
    } = state;

    const user = map[currentUser];

    if (!user) {
      return {
        name: '',
        followings: {},
        likes: {},
        blocks: {},
      };
    }

    return user;
  }, shallowEqual);
};

export const useUsers = (): {users: string[]; currentUser: string} => {
  return useSelector((state: { users: UsersState}) => {
    return {
      users: Object.keys(state.users.map),
      currentUser: state.users.currentUser,
    };
  }, (a, b) => {
    return (
      a.currentUser === b.currentUser &&
      a.users.join() === b.users.join()
    );
  });
};

export const useIdentity = (): {identities: UsersState["identities"], currentUser: string} => {
  return useSelector((state: { users: UsersState}) => {
    return {
      identities: state.users.identities,
      currentUser: state.users.currentUser,
    };
  }, shallowEqual);
};

export const useIdentities = (): string[] => {
  return useSelector((state: { users: UsersState}) => {
    return Object.keys(state.users.identities);
  }, shallowEqual);
};

export const useUsersMap = (): UsersState["map"] => {
  return useSelector((state: { users: UsersState}) => {
    return state.users.map;
  }, shallowEqual);
};

export const useUser = (name: string): User | undefined => {
  return useSelector((state: { users: UsersState}) => {
    return state.users.map[name];
  }, (a, b) => {
    return a.name === b.name
      && Object.keys(a.followings).join(',') === Object.keys(b.followings).join(',')
      && Object.keys(a.likes).join(',') === Object.keys(b.likes).join(',');
  });
};

export const useCurrentLikes = (): UsersState["currentUserLikes"] => {
  return useSelector((state: { users: UsersState}) => {
    return state.users.currentUserLikes || [];
  }, (a, b) => {
    return Object.keys(a).join(',') === Object.keys(b).join(',');
  });
};

const empty = {};
export const useCurrentFollowings = (): User["followings"] => {
  return useSelector((state: { users: UsersState}) => {
    return state.users.map[state.users.currentUser]?.followings || empty;
  }, (a, b) => {
    return Object.keys(a).join(',') === Object.keys(b).join(',');
  });
};

export const useCurrentBlocks = (): User["blocks"] => {
  return useSelector((state: { users: UsersState}) => {
    return state.users.map[state.users.currentUser]?.blocks || empty;
  }, (a, b) => {
    return Object.keys(a).join(',') === Object.keys(b).join(',');
  });
};

export const userCurrentMutedNames = (): UserData["mutedNames"] => {
  return useSelector((state: { users: UsersState}) => {
    return state.users.currentUserData.mutedNames || [];
  }, (a, b) => {
    return a.join(',') === b.join(',');
  });
};

export const userCurrentUserData = (): UserData => {
  return useSelector((state: { users: UsersState}) => {
    return state.users.currentUserData;
  }, (a, b) => {
    return JSON.stringify(a) === JSON.stringify(b);
  });
};

export const userCurrentSavedViews = (): UserData["savedViews"] => {
  return useSelector((state: { users: UsersState}) => {
    const { savedViews } = state.users.currentUserData;
    return savedViews || [];
  }, shallowEqual);
};

export const muteUser = (username: string) => async (dispatch: ThunkDispatch<any, any, any>) => {
  await postIPCMain({
    type: IPCMessageRequestType.MUTE_NAME,
    payload: username,
  }, true);

  await dispatch(fetchCurrentUserData());
};

export const unmuteUser = (username: string) => async (dispatch: ThunkDispatch<any, any, any>) => {
  await postIPCMain({
    type: IPCMessageRequestType.UNMUTE_NAME,
    payload: username,
  }, true);

  await dispatch(fetchCurrentUserData());
};

export const useCreateNewView = () => {
  const dispatch = useDispatch();
  return useCallback(async (view: CustomViewProps) => {
    await postIPCMain({
      type: IPCMessageRequestType.SAVE_VIEW,
      payload: view,
    }, true);
    await dispatch(fetchCurrentUserData());
  }, [postIPCMain]);
};

export const useDeleteFilterByIndex = () => {
  const dispatch = useDispatch();
  return useCallback(async (index: number) => {
    await postIPCMain({
      type: IPCMessageRequestType.DELETE_FILTER_BY_INDEX,
      payload: index,
    }, true);
    await dispatch(fetchCurrentUserData());
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
    await dispatch(fetchCurrentUserData());
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
    await dispatch(fetchCurrentUserData());
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
    await dispatch(fetchCurrentUserData());
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
    await dispatch(fetchCurrentUserData());
  }, [postIPCMain, dispatch, savedViews]);
};
