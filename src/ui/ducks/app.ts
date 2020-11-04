import {shallowEqual, useDispatch, useSelector} from "react-redux";
import {Dispatch} from "redux";
import {useCallback} from "react";
import {postIPCMain} from "../helpers/ipc";
import {APP_DATA_EVENT_TYPES, IPCMessageRequestType, IPCMessageResponse} from "../../app/types";
import {INDEXER_API} from "../../../external/universal/utils/api";

export enum AppActionType {
  INIT = 'app/init',
  UPDATE_FOOTER = 'app/updateFooter',
  ADD_SYSTEM_MESSAGE = 'app/addSystemMessage',
  REMOVE_SYSTEM_MESSAGE = 'app/removeSystemMessage',
  ADD_FND_LOG = 'app/addFNDLog',
  SET_APP_DATA = 'app/setAppData',
  SET_HANDSHAKE_START_HEIGHT = 'app/setHandshakeStartHeight',
  SET_HANDSHAKE_END_HEIGHT = 'app/setHandshakeEndHeight',
  SET_LAST_SYNC = 'app/setLastSync',
  SET_FND_STATUS = 'app/setFNDStatus',
  SET_HYDRATED = 'app/setHydrated',
  SET_INITIALIZED = 'app/setInitialized',
}

type AppAction<payload> = {
  type: AppActionType;
  payload: payload;
  error?: boolean;
  meta?: any;
}

export type SystemMessage<meta> = {
  text: string;
  type: 'info' | 'error' | 'success';
  meta?: meta;
}

type AppState = {
  hydrated: boolean;
  initialized: boolean;
  handshakeStartHeight: number;
  handshakeEndHeight: number;
  discoveredTLDs: string[];
  connectedPeers: number;
  lastSync: number;
  footerText: string;
  footerTextColor: string;
  messages: SystemMessage<any>[];
  fndLogs: string[];
  fndStatus: 'on' | 'off' | 'error';
}

const initialState: AppState = {
  hydrated: false,
  initialized: false,
  handshakeStartHeight: 0,
  handshakeEndHeight: 0,
  discoveredTLDs: [],
  connectedPeers: 0,
  lastSync: 0,
  footerText: '',
  footerTextColor: '',
  messages: [],
  fndLogs: [],
  fndStatus: 'off',
};

type AppData = {
  initialized: boolean;
  handshakeStartHeight: number;
  handshakeEndHeight: number;
  discoveredTLDs: string[];
  connectedPeers: number;
  fndStatus: 'on' | 'off' | 'error';
};

export const setAppData = (appData: AppData): AppAction<AppData> => {
  return {
    type: AppActionType.SET_APP_DATA,
    payload: appData,
  }
};

export const updateFooter = (text: string, color: string): AppAction<{text: string; color: string}> => {
  return {
    type: AppActionType.UPDATE_FOOTER,
    payload: { text, color },
  };
};

export const addSystemMessage = (message: SystemMessage<any>) => (dispatch: Dispatch<any>) => {
  dispatch({
    type: AppActionType.ADD_SYSTEM_MESSAGE,
    payload: message,
  });
};

export const removeSystemMessage = (message: SystemMessage<any>): AppAction<SystemMessage<any>> => {
  return {
    type: AppActionType.REMOVE_SYSTEM_MESSAGE,
    payload: message,
  };
};

export const addDDRPLog = (log: string): AppAction<string> => {
  return {
    type: AppActionType.ADD_FND_LOG,
    payload: log,
  };
};

export const setHandshakeStartHeight = (startHeight: number): AppAction<number> => {
  return {
    type: AppActionType.SET_HANDSHAKE_START_HEIGHT,
    payload: startHeight,
  };
};

export const setHandshakeEndHeight = (endHeight: number): AppAction<number> => {
  return {
    type: AppActionType.SET_HANDSHAKE_END_HEIGHT,
    payload: endHeight,
  };
};

export const setInitialized = (initialized: boolean): AppAction<boolean> => {
  return {
    type: AppActionType.SET_INITIALIZED,
    payload: initialized,
  };
};

export const setHydrated = (hydrated: boolean): AppAction<boolean> => {
  return {
    type: AppActionType.SET_HYDRATED,
    payload: hydrated,
  };
};

export const setLastSync = (lastSync: number): AppAction<number> => {
  return {
    type: AppActionType.SET_LAST_SYNC,
    payload: lastSync,
  };
};

export const setFNDStatus = (ddrpStatus: 'on' | 'off' | 'error'): AppAction<'on' | 'off' | 'error'> => {
  return {
    type: AppActionType.SET_FND_STATUS,
    payload: ddrpStatus,
  };
};

export default function appReducer(state: AppState = initialState, action: AppAction<any>): AppState {
  switch (action.type) {
    case AppActionType.UPDATE_FOOTER:
      return {
        ...state,
        footerText: action.payload.text,
        footerTextColor: action.payload.color,
      };
    case AppActionType.ADD_SYSTEM_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case AppActionType.REMOVE_SYSTEM_MESSAGE:
      return {
        ...state,
        messages: state.messages.filter(message => message !== action.payload),
      };
    case AppActionType.ADD_FND_LOG:
      return {
        ...state,
        fndLogs: [action.payload, ...state.fndLogs],
      };
    case AppActionType.SET_HANDSHAKE_START_HEIGHT:
      return {
        ...state,
        handshakeStartHeight: action.payload,
      };
    case AppActionType.SET_HANDSHAKE_END_HEIGHT:
      return {
        ...state,
        handshakeEndHeight: action.payload,
      };
    case AppActionType.SET_LAST_SYNC:
      return {
        ...state,
        lastSync: action.payload,
      };
    case AppActionType.SET_FND_STATUS:
      return {
        ...state,
        fndStatus: action.payload,
      };
    case AppActionType.SET_HYDRATED:
      return {
        ...state,
        hydrated: true,
      };
    case AppActionType.SET_INITIALIZED:
      return {
        ...state,
        initialized: true,
      };
    case AppActionType.SET_APP_DATA:
      return {
        ...state,
        hydrated: true,
        // discoveredTLDs: action.payload.discoveredTLDs,
        handshakeStartHeight: action.payload.handshakeStartHeight,
        handshakeEndHeight: action.payload.handshakeEndHeight,
        initialized: action.payload.initialized,
        // connectedPeers: action.payload.connectedPeers,
        lastSync: action.payload.lastSync,
        fndStatus: action.payload.ddrpStatus,
      };
    default:
      return state;
  }
}

export const useSystemMessages = () => {
  return useSelector((state: { app: AppState }) => {
    return state.app.messages;
  }, shallowEqual);
};

export const useInitialized = () => {
  return useSelector((state: { app: AppState }) => {
    return state.app.initialized;
  }, shallowEqual);
};

export const useLastSync = () => {
  return useSelector((state: { app: AppState }) => {
    const {
      lastSync,
    } = state.app;
    return lastSync;
  }, shallowEqual);
};

export const useHydrated = () => {
  return useSelector((state: { app: AppState }) => {
    const {
      hydrated,
    } = state.app;
    return hydrated;
  }, shallowEqual);
};

export const useAppInitialized = () => {
  return useSelector((state: { app: AppState }) => {
    const {
      initialized,
    } = state.app;
    return initialized;
  }, shallowEqual);
};

export const useFNDStatus = () => {
  return useSelector((state: { app: AppState }) => {
    const {
      fndStatus,
    } = state.app;
    return fndStatus;
  }, shallowEqual);
};

export const useHandshakeStartHeight = () => {
  return useSelector((state: { app: AppState }) => {
    const {
      handshakeStartHeight,
    } = state.app;
    return handshakeStartHeight;
  }, shallowEqual);
};

export const useHandshakeEndHeight = () => {
  return useSelector((state: { app: AppState }) => {
    const {
      handshakeEndHeight,
    } = state.app;
    return handshakeEndHeight;
  }, shallowEqual);
};

export const useConnectedPeers = () => {
  return useSelector((state: { app: AppState }) => {
    const {
      connectedPeers,
    } = state.app;
    return connectedPeers;
  }, shallowEqual);
};

export const useAppData = () => {
  return useSelector((state: { app: AppState }) => {
    const {
      handshakeEndHeight,
      handshakeStartHeight,
      discoveredTLDs,
      initialized,
      connectedPeers,
      lastSync,
      fndStatus,
    } = state.app;
    return {
      handshakeEndHeight,
      handshakeStartHeight,
      discoveredTLDs,
      initialized,
      connectedPeers,
      lastSync,
      fndStatus: fndStatus,
    };
  }, (last, next) => (
    last.handshakeEndHeight === next.handshakeEndHeight
    || last.handshakeStartHeight === next.handshakeStartHeight
    || last.discoveredTLDs.join(',') === next.discoveredTLDs.join(',')
    || last.initialized === next.initialized
    || last.connectedPeers === next.connectedPeers
    || last.lastSync === next.lastSync
    || last.fndStatus === next.fndStatus
  ));
};

async function fetchTLDs(): Promise<string[]> {
  return new Promise(async (resolve) => {
    const timeout = setTimeout(() => resolve([]), 100);
    try {
      const resp = await fetch(`${INDEXER_API}/tlds`);
      const json = await resp.json();
      resolve(json.payload);
    } catch (e) {
      resolve([]);
    } finally {
      clearTimeout(timeout);
    }

  })
}

async function fetchConnectedPeers(): Promise<number> {
  return new Promise(async (resolve) => {
    const timeout = setTimeout(() => resolve(0), 100);

    try {
      const resp = await postIPCMain({
        type: IPCMessageRequestType.GET_FND_PEERS,
        payload: {
          includeConnected: true,
          includeStored: false,
          includeBanned: false,
        }
      }, true);
      resolve(resp.payload?.length || 0);
    } catch (e) {
      resolve(0);
    } finally {
      clearTimeout(timeout);
    }
  });


}

export const useFetchAppData = () => {
  const dispatch = useDispatch();
  return useCallback(async () => {
    try {
      const ipcResp: IPCMessageResponse<AppData> = await postIPCMain({
        type: APP_DATA_EVENT_TYPES.GET_APP_STATUS,
        payload: null,
      }, true);

      dispatch(setAppData(ipcResp.payload));
    } catch (e) {
      //
    } finally {
      dispatch(setHydrated(true));
    }
  }, [dispatch, postIPCMain]);
};
