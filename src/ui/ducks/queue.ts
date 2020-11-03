import {useDispatch} from "react-redux";
import {useCallback} from "react";
import {ThunkDispatch} from "redux-thunk";
import {IPCMessageRequestType} from "../../app/types";
import {postIPCMain} from "../helpers/ipc";

const THROTTLED_TIMER = 2 * 60 * 1000;

enum QueueActionType {
  SET_FLUSH_STATUS = 'app/queue/setFlushing',
  SET_LAST_FLUSHED = 'app/queue/setLastFlushed',
}

type QueueAction<payload> = {
  type: QueueActionType;
  payload?: payload;
  meta?: any;
  error?: boolean;
}

type QueueState = {
  isFlushing: boolean;
  lastFlushed: number;
}

const initialState: QueueState = {
  isFlushing: false,
  lastFlushed: 0,
};

export const setFlushStatus = (isFlushing: boolean) => ({
  type: QueueActionType.SET_FLUSH_STATUS,
  payload: isFlushing,
});

export const setLastFlushed = (lastFlushed: number) => ({
  type: QueueActionType.SET_LAST_FLUSHED,
  payload: lastFlushed,
});

export const flush = (name: string) => async (dispatch: ThunkDispatch<any, any, QueueAction<any>>, getState: () => {queue: QueueState}) => {
  const {lastFlushed} = getState().queue;

  if (Date.now() - lastFlushed < THROTTLED_TIMER) {
    return;
  }

  await postIPCMain({
    type: IPCMessageRequestType.SEND_UPDATE_FOR_NAME,
    payload: name,
  }, true);
};

export default function queueReducer(state: QueueState = initialState, action: QueueAction<any>): QueueState {
  switch (action.type) {
    case QueueActionType.SET_FLUSH_STATUS:
      return { ...state, isFlushing: action.payload };
    case QueueActionType.SET_LAST_FLUSHED:
      return { ...state, lastFlushed: action.payload };
    default:
      return state;
  }
}

// Callback
export const useSetFlushStatus = () => {
  const dispatch = useDispatch();
  return useCallback((isFlushing: boolean) => {
    dispatch(setFlushStatus(isFlushing));
  }, [dispatch])
};

export const useSetLastFlushed = () => {
  const dispatch = useDispatch();
  return useCallback((lastFlushed: number) => {
    dispatch(setLastFlushed(lastFlushed));
  }, [dispatch])
};
