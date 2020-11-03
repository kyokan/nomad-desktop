import {ThunkDispatch} from "redux-thunk";
import {Action} from "redux";
import {createNewDraft, DraftPost} from "./type";
import {shallowEqual, useDispatch, useSelector} from "react-redux";
import {setUserCoverImage, setUserProfilePicture} from "../posts";
import {useCallback} from "react";
import {IPCMessageRequestType, IPCMessageResponse, RelayerNewPostResponse} from "../../../../src/app/types";
import {INDEXER_API} from "../../utils/api";
import {mapDraftToPostPayload} from "../../utils/posts";
const postIPCMain = async (a: any, b?: any): Promise<IPCMessageResponse<any>> => {
  return {
    id: 0,
    payload: {},
  };
};

export enum EditorMode {
  SIMPLE = 'simple_editor',
  RICH_TEXT = 'rich_text_editor',
  MARKDOWN = 'markdown_editor',
}

enum DraftsActionType {
  UPDATE_DRAFT = 'app/posts/updateDraft',
  UPDATE_PROFILE_PICTURE = 'app/posts/updateProfilePicture',
  UPDATE_COVER_IMAGE = 'app/posts/updateCoverImage',
  SET_SENDING_POST = 'app/posts/setSendingPost',
  SET_EDITOR_MODE = 'app/posts/setEditorMode',
  ADD_TAG = 'app/posts/addTag',
  REMOVE_TAG = 'app/posts/removeTag',
}

type DraftsAction<payload> = {
  type: DraftsActionType;
  payload: payload;
  meta?: any;
  error?: boolean;
}

type DraftsState = {
  post: DraftPost;
  isSendingPost: boolean;
  draftMode: EditorMode;
  profilePictureUrl: string;
  coverImage: string;
}

const initialState = {
  post: createNewDraft(),
  profilePictureUrl: '',
  coverImage: '',
  isSendingPost: false,
  draftMode: EditorMode.MARKDOWN,
};

export const useSendNewPost = () => {
  const dispatch = useDispatch();
  const token = '';
  const draft = useDraftPost();
  const payload = mapDraftToPostPayload(draft);

  return useCallback(async () => {
    dispatch(setSendingPost(true));

    const resp = await fetch(`${INDEXER_API}/subdomains/posts`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Token': token || '',
      },
      body: JSON.stringify({
        title: '',
        body: payload.content,
        reference: payload.parent,
        topic: payload.topic,
        tags: payload.tags,
      }),
    });
    const json: RelayerNewPostResponse = await resp.json();

    if (resp.status !== 200) {
      throw new Error((json as any).message);
    }

    if (resp.status !== 200) {
      throw new Error(json.message);
    }

    dispatch(updateDraft(createNewDraft()));
    dispatch(setSendingPost(false));

  }, [dispatch, token, payload.content, draft.content, draft, payload]);
};

export const addAttachment = (hash: string) => (dispatch: ThunkDispatch<any, any, Action>, getState: () => any) => {
  const drafts = getState().drafts;
  const post = drafts.post;

  if (post?.attachments?.includes(hash)) {
    return;
  }

  const draft = createNewDraft({
    ...post || {},
    attachments: post?.attachments?.length
      ? [...post.attachments, hash]
      : [hash],
  });

  dispatch(updateDraft(draft));
};

export const updateDraft = (post: DraftPost): DraftsAction<DraftPost> => ({
  type: DraftsActionType.UPDATE_DRAFT,
  payload: post,
});

export const addTag = (tag: string): DraftsAction<string> => ({
  type: DraftsActionType.ADD_TAG,
  payload: tag,
});

export const removeTag = (tag: string): DraftsAction<string> => ({
  type: DraftsActionType.REMOVE_TAG,
  payload: tag,
});


export const submitProfilePicture = () => (dispatch: ThunkDispatch<any, any, Action>, getState: () => any): Promise<IPCMessageResponse<any>> => {
  const {
    drafts: {
      profilePictureUrl,
    },
    users: {
      currentUser,
    },
  } = getState();
  const draft = createNewDraft({
    content: profilePictureUrl,
    topic: '.profile_picture_url',
  });

  return postIPCMain({
    type: IPCMessageRequestType.SEND_NEW_POST,
    payload: {
      draft,
      truncate: false,
    },
  }, true)
    .then(() => {
      dispatch(setUserProfilePicture(currentUser, profilePictureUrl));
      return postIPCMain({
        type: IPCMessageRequestType.SEND_UPDATE_FOR_CURRENT_USER,
      }, true);
    });
};

export const submitCoverImage = () => (dispatch: ThunkDispatch<any, any, Action>, getState: () => any): Promise<IPCMessageResponse<any>> => {
  const {
    drafts: {
      coverImage,
    },
    users: {
      currentUser,
    },
  } = getState();

  const draft = createNewDraft({
    content: coverImage,
    topic: '.cover_image',
  });

  return postIPCMain({
    type: IPCMessageRequestType.SEND_NEW_POST,
    payload: {
      draft,
      truncate: false,
    },
  }, true)
    .then(() => {
      dispatch(setUserCoverImage(currentUser, coverImage));
      return postIPCMain({
        type: IPCMessageRequestType.SEND_UPDATE_FOR_CURRENT_USER,
      }, true);
    });
};

export const updateProfilePicture = (profilePicture: string): DraftsAction<string> => ({
  type: DraftsActionType.UPDATE_PROFILE_PICTURE,
  payload: profilePicture,
});

export const updateCoverImage = (coverImage: string): DraftsAction<string> => ({
  type: DraftsActionType.UPDATE_COVER_IMAGE,
  payload: coverImage,
});

export const setSendingPost = (isSendingPost: boolean): DraftsAction<boolean> => ({
  type: DraftsActionType.SET_SENDING_POST,
  payload: isSendingPost,
});

export const setEditorMode = (mode: EditorMode): DraftsAction<EditorMode> => ({
  type: DraftsActionType.SET_EDITOR_MODE,
  payload: mode,
});



const reduceSetEditorMode = (state: DraftsState, action: DraftsAction<EditorMode>): DraftsState => {
  return {
    ...state,
    draftMode: action.payload,
  };
};

const reduceUpdateDraft = (state: DraftsState, action: DraftsAction<DraftPost>): DraftsState => {
  return {
    ...state,
    post: action.payload,
  };
};

const reduceSendingPost = (state: DraftsState, action: DraftsAction<boolean>): DraftsState => {
  return {
    ...state,
    isSendingPost: action.payload,
  };
};

export default function draftsReducer(state: DraftsState = initialState, action: DraftsAction<any>): DraftsState {
  switch (action.type) {
    case DraftsActionType.UPDATE_DRAFT:
      return reduceUpdateDraft(state, action);
    case DraftsActionType.UPDATE_PROFILE_PICTURE:
      return {
        ...state,
        profilePictureUrl: action.payload,
      };
    case DraftsActionType.UPDATE_COVER_IMAGE:
      return {
        ...state,
        coverImage: action.payload,
      };
    case DraftsActionType.SET_SENDING_POST:
      return reduceSendingPost(state, action);
    case DraftsActionType.SET_EDITOR_MODE:
      return reduceSetEditorMode(state, action);
    case DraftsActionType.ADD_TAG:
      return reduceAddTag(state, action);
    case DraftsActionType.REMOVE_TAG:
      return reduceRemoveTag(state, action);
    default:
      return state;
  }
}

function reduceAddTag(state: DraftsState = initialState, action: DraftsAction<string>): DraftsState {
  return {
    ...state,
    post: {
      ...state.post,
      tags: Array.from(new Set([...state.post.tags, action.payload])),
    },
  };
}

function reduceRemoveTag(state: DraftsState = initialState, action: DraftsAction<string>): DraftsState {
  return {
    ...state,
    post: {
      ...state.post,
      tags: state.post.tags.filter(tag => tag !== action.payload),
    },
  };
}

export const useUpdateDraft = () => {
  const dispatch = useDispatch();
  return useCallback((draft: DraftPost) => {
    dispatch(updateDraft(draft));
  }, [dispatch]);
}

/**
 *   type: PostType;
 timestamp: number;
 title: string;
 content: string;
 topic: string;
 tags: string[];
 context: string;
 parent: string;
 attachments: string[];
 */
export const useDraftPost = (): DraftPost => {
  return useSelector((state: { drafts: DraftsState }) => {
    return state.drafts.post;
  }, (a: DraftsState["post"], b: DraftsState["post"]) => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.content === b.content
      && a.attachments.join(',') === b.attachments.join(',')
      && a.tags.join(',') === b.tags.join(',');
  });
};

export const useDraftProfilePicture = (): string => {
  return useSelector((state: { drafts: DraftsState }) => {
    return state.drafts?.profilePictureUrl;
  }, shallowEqual);
};

export const useDraftCoverImage = (): string => {
  return useSelector((state: { drafts: DraftsState }) => {
    return state.drafts?.coverImage;
  }, shallowEqual);
};

export const useUpdateCurrentBlob = () => {
  return useCallback(async () => {
    return await postIPCMain({
      type: IPCMessageRequestType.SEND_UPDATE_FOR_CURRENT_USER,
    }, true);
  }, [postIPCMain]);
};
