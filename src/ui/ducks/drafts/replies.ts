import {createNewDraft, DraftPost} from "./type";
import {shallowEqual, useSelector} from "react-redux";
import {ThunkDispatch} from "redux-thunk";
import {Action} from "redux";
import {IPCMessageRequestType, IPCMessageResponse} from "../../../app/types";
import {postIPCMain} from "../../helpers/ipc";

export type RepliesState = {
  map: {
    [parentId: string]: DraftPost;
  };
  isSendingReplies: boolean;
}

const initialState: RepliesState = {
  map: {},
  isSendingReplies: false,
};

enum RepliesActionType {
  UPDATE_REPLIES = 'app/replies/updateReplies',
  SET_SENDING_REPLIES = 'app/posts/setSendingReplies',
}

type RepliesAction<payload> = {
  type: RepliesActionType;
  payload: payload;
  meta?: any;
  error?: boolean;
}

export const sendReply = (id: string) => async (dispatch: ThunkDispatch<{ replies: RepliesState }, any, Action>, getState: () => { replies: RepliesState }): Promise<IPCMessageResponse<any>> => {
  dispatch(setSendingReplies(true));

  const { replies } = getState();
  const reply = replies.map[id];

  const ipcMessage = {
    type: IPCMessageRequestType.SEND_NEW_POST,
    payload: {
      draft: reply,
      truncate: false,
    },
  };

  if (!reply) {
    dispatch(setSendingReplies(false));
    return Promise.reject();
  }

  const resp = await postIPCMain(ipcMessage, true);
  await postIPCMain({
    type: IPCMessageRequestType.SEND_UPDATE_FOR_CURRENT_USER,
    payload: {},
  }, true);
  dispatch(setSendingReplies(false));
  return resp;
};

export const updateReplies = (draft: DraftPost): RepliesAction<DraftPost> => ({
  type: RepliesActionType.UPDATE_REPLIES,
  payload: draft,
});

export const setSendingReplies = (isSendingReplies: boolean): RepliesAction<boolean> => ({
  type: RepliesActionType.SET_SENDING_REPLIES,
  payload: isSendingReplies,
});

const reduceSendingReplies = (state: RepliesState = initialState, action: RepliesAction<boolean>): RepliesState  => {
  const isSendingReplies = action.payload;

  return {
    ...state,
    isSendingReplies,
  };
};

const reduceUpdateReplies = (state: RepliesState = initialState, action: RepliesAction<DraftPost>): RepliesState  => {
  const draft = action.payload;

  return {
    ...state,
    map: {
      ...state.map,
      [draft.parent]: draft,
    }
  };
};

export default function repliesReducer(state: RepliesState = initialState, action: RepliesAction<any>): RepliesState {
  switch (action.type) {
    case RepliesActionType.UPDATE_REPLIES:
      return reduceUpdateReplies(state, action);
    case RepliesActionType.SET_SENDING_REPLIES:
      return reduceSendingReplies(state, action);
    default:
      return state;
  }
}

export const useReplyId = (parentId: string): DraftPost => {
  return useSelector((state: { replies: RepliesState }): DraftPost => {
    return createNewDraft(state.replies.map[parentId]);
  }, shallowEqual);
};

export const useReplyMap = () => {
  return useSelector((state: { replies: RepliesState }): RepliesState["map"] => {
    return state.replies.map;
  }, shallowEqual);
};

export const useReplies = (): { isSendingReplies: boolean } => {
  return useSelector((state: { replies: RepliesState }): { isSendingReplies: boolean } => {
    return {
      isSendingReplies: state.replies.isSendingReplies,
    };
  }, shallowEqual);
};
