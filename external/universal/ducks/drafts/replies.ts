import {useCallback} from "react";
import {createNewDraft, DraftPost} from "./type";
import {shallowEqual, useSelector, useDispatch} from "react-redux";
import {ThunkDispatch} from "redux-thunk";
import {Action} from "redux";
import {IPCMessageResponse, RelayerNewPostResponse} from "../../../../src/app/types";
import {INDEXER_API} from "../../utils/api";
import {appendNewComment, createNewPost, updatePost} from "../posts";
import {PostType} from "../../types/posts";
import {serializeUsername} from "../../utils/user";

type RepliesState = {
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

export const sendReply = (id: string) => async (dispatch: ThunkDispatch<{ replies: RepliesState }, any, Action>, getState: () => { replies: RepliesState }): Promise<void> => {
  dispatch(setSendingReplies(true));

  const token = '';
  const { replies } = getState();
  const reply = replies.map[id];

  if (!reply) {
    dispatch(setSendingReplies(false));
    return Promise.reject();
  }

  const resp = await fetch(`${INDEXER_API}/subdomains/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Token': token || '',
    },
    body: JSON.stringify({
      title: '',
      body: reply.content,
      reference: reply.parent,
      topic: reply.topic,
      tags: reply.tags,
    }),
  });

  const json: IPCMessageResponse<RelayerNewPostResponse> = await resp.json();

  if (json.error) {
    throw new Error(json.payload.message);
  }


  dispatch(updatePost(createNewPost({
    hash: json.payload.refhash,
    id: json.payload.network_id,
    type: PostType.COMMENT,
    creator: serializeUsername(json.payload.username, json.payload.tld),
    timestamp: json.payload.timestamp,
    content: json.payload.body,
    topic: json.payload.topic,
    tags: json.payload.tags,
    context: '',
    parent: json.payload.reference,
  })));

  dispatch(appendNewComment(json.payload.reference, json.payload.refhash, true));

  dispatch(setSendingReplies(false));
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
  }, (a: any, b: any) => {
    return a.parent === b.parent &&
      a.context === b.context &&
      a.content === b.content &&
      a.topic === b.topic &&
      a.attachments.join(',') === b.attachments.join(',') &&
      a.type === b.type &&
      a.title === b.title &&
      a.tags.join(',') === b.tags.join(',') &&
      a.timestamp === b.timestamp;
  });
};

export const useIsReplying = (): boolean => {
  return useSelector((state: { replies: RepliesState }): boolean => {
    return state.replies.isSendingReplies;
  }, shallowEqual);
};

export const useReplies = (): { isSendingReplies: boolean } => {
  return useSelector((state: { replies: RepliesState }): { isSendingReplies: boolean } => {
    return {
      isSendingReplies: state.replies.isSendingReplies,
    };
  }, shallowEqual);
};

export const useSendReply = () => {
  const dispatch = useDispatch();
  const isSendingReplies = useIsReplying();

  return useCallback(async (hash: string) => {
    if (isSendingReplies) return;
    await dispatch(sendReply(hash));
    dispatch(updateReplies(createNewDraft({
      parent: hash,
    })));
  }, [isSendingReplies]);
};
