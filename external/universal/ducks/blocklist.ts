import {Dispatch} from "redux";
import {useDispatch, useSelector} from "react-redux";
import {useCallback} from "react";
import {fetchCurrentUserData} from "./users";
import {ThunkDispatch} from "redux-thunk";
import {IPCMessageRequestType, IPCMessageResponse} from "../../electron/src/app/types";

const postIPCMain = async (a: any, b?: any): Promise<IPCMessageResponse<any>> => {
  return {
    id: 0,
    payload: {},
  };
};

enum BlocklistActionType {
  SET_MUTELIST = 'app/blocklist/setMutelist',
  SET_MUTE_USER = 'app/blocklist/setMuteUser',
  MUTE_USER = 'app/blocklist/muteUser',
  UNMUTE_USER = 'app/blocklist/unmuteUser',
}

type BlocklistAction<payload> = {
  type: BlocklistActionType;
  payload: payload;
  meta?: any;
  error?: boolean;
}

type BlocklistState = {
  users: {
    [username: string]: true;
  };
}

const initialState: BlocklistState = {
  users: {},
};


export const fetchMutelist = () => async (dispatch: Dispatch) => {
  const resp: IPCMessageResponse<string[]> = await postIPCMain({
    type: IPCMessageRequestType.GET_MUTE_LIST,
  }, true);

  dispatch({
    type: BlocklistActionType.SET_MUTELIST,
    payload: resp.payload || [],
  });
};

export const setMuteUser = (username: string) => ({
  type: BlocklistActionType.MUTE_USER,
  payload: username,
});

export const setUnmuteUser = (username: string) => ({
  type: BlocklistActionType.UNMUTE_USER,
  payload: username,
});

export const muteUser = (username: string) => async (dispatch: ThunkDispatch<any, any, any>) => {
  await postIPCMain({
    type: IPCMessageRequestType.MUTE_NAME,
    payload: username,
  }, true);

  dispatch(fetchCurrentUserData());
};

export const unmuteUser = (username: string) => async (dispatch: ThunkDispatch<any, any, any>) => {
  await postIPCMain({
    type: IPCMessageRequestType.UNMUTE_NAME,
    payload: username,
  }, true);

  dispatch(fetchCurrentUserData());
};

export default function mutelistReducer(state: BlocklistState = initialState, action: BlocklistAction<any>): BlocklistState {
  switch (action.type) {
    case BlocklistActionType.MUTE_USER:
      return {
        ...state,
        users: {
          ...state.users || {},
          [action.payload]: true,
        },
      };
    case BlocklistActionType.UNMUTE_USER:
      return {
        ...state,
        users: {
          ...state.users || {},
          [action.payload]: false,
        },
      };
    case BlocklistActionType.SET_MUTELIST:
      return {
        ...state,
        users: action.payload.users.reduce((acc: {[u: string]: boolean}, username: string) => {
          acc[username] = true;
          return acc;
        }, {}),
      };
    default:
      return state;
  }
}

export const useMutedUser = () => {
  return useSelector((state: { blocklist: BlocklistState }) => {
    return state.blocklist.users;
  }, (a, b) => {
    return Object.entries(a).map(([ name, isBlocked ]) => `${name}:${isBlocked}`).join(',')
      === Object.entries(b).map(([ name, isBlocked ]) => `${name}:${isBlocked}`).join(',');
  });
};

export const useMuteUser = (): (name: string) => void => {
  const dispatch = useDispatch();
  return useCallback((name: string) => {
    dispatch(muteUser(name));
  }, [dispatch])
};

export const useUnmuteUser = (): (name: string) => void => {
  const dispatch = useDispatch();
  return useCallback((name: string) => {
    dispatch(unmuteUser(name));
  }, [dispatch])
};
