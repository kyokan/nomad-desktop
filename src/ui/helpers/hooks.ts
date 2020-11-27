import {Dispatch, useCallback} from "react";
import {remote} from "electron";
import fs from "fs";
import {fromFile} from "file-type";
import {useDispatch} from "react-redux";
import {
  addUserFollowings,
  fetchCurrentUserLikes,
  fetchUserBlocks,
  fetchUserFollowings,
  useCurrentUser
} from "nomad-universal/lib/ducks/users";
import {IPCMessageRequestType, IPCMessageResponse, RelayerNewPostResponse} from "../../app/types";
import {postIPCMain} from "./ipc";
import {addLikeCount} from "nomad-universal/lib/ducks/posts";
import {
  addUserBlocks,
  addUserLikes,
  useCurrentUsername,
  UsersActionType,
  UsersState
} from "nomad-universal/lib/ducks/users";
import {setSendingReplies} from "nomad-universal/lib/ducks/drafts/replies";
import {appendNewComment, createNewPost, updatePost} from "nomad-universal/lib/ducks/posts";
import {PostType} from "nomad-universal/lib/types/posts";
import {parseUsername, serializeUsername} from "nomad-universal/lib/utils/user";
import {ThunkDispatch} from "redux-thunk";
import {Action} from "redux";
import {INDEXER_API} from "nomad-universal/lib/utils/api";
import {Envelope as DomainEnvelope} from 'fn-client/lib/application/Envelope';
import {Post as DomainPost} from 'fn-client/lib/application/Post';
import {Pageable} from 'nomad-api/lib/services/indexer/Pageable';
import {CustomViewProps, UserData} from "../../app/controllers/userData";
import {DraftPost} from "nomad-universal/lib/ducks/drafts/type";
import {AppActionType} from "../ducks/app";

type RepliesState = {
  map: {
    [parentId: string]: DraftPost;
  };
  isSendingReplies: boolean;
}

export const useFileUpload = (): () => Promise<string> => {
  const dispatch = useDispatch();
  const uploadImage = useUploadImage();
  const currentUser = useCurrentUser();

  return useCallback(async (): Promise<string> => {
    const selected = await remote.dialog.showOpenDialog({
      filters: [
        { name: 'Images', extensions: ['jpg', 'png', 'gif', 'jpeg', 'tiff', 'bmp', 'svg'] },
      ],
      properties: ['openFile'],
    });
    const {filePaths: [filePath]} = selected;
    const parts = filePath!.split('/');
    const fileName = parts[parts.length - 1];
    const file = await fs.promises.readFile(filePath);
    const fileType = await fromFile(filePath);

    if (!fileType?.mime) {
      return Promise.reject(new Error('unknown mime type'));
    }
    // console.log(fileName, file, fileType)
    const json: IPCMessageResponse<any> = await uploadImage(fileName, file, fileType?.mime);

    if (json.error) {
      return Promise.reject(json.payload);
    }

    return json.payload.refhash;
  }, [dispatch, uploadImage, currentUser.name]);
};

// Callback
export const useStartHSD = () => {
  return useCallback(async (): Promise<void> => {
    return await postIPCMain({
      type: IPCMessageRequestType.START_HSD,
      payload: null,
    }, true);
  }, [postIPCMain]);
};

export const useStopHSD = () => {
  return useCallback(async (): Promise<void> => {
    return await postIPCMain({
      type: IPCMessageRequestType.STOP_HSD,
      payload: null,
    }, true);
  }, [postIPCMain]);
};

export const useGetConnection = () => {
  const dispatch = useDispatch();
  return useCallback(async (): Promise<{
    type: 'P2P' | 'CUSTOM' | '';
    host: string;
    port: number;
    apiKey: string;
    basePath: string;
  }> => {
    const {payload: conn} = await postIPCMain({
      type: IPCMessageRequestType.GET_HSD_CONN,
      payload: null,
    }, true);

    dispatch({
      type: AppActionType.SET_CONN_TYPE,
      payload: conn.type,
    });
    return conn;
  }, [postIPCMain, dispatch]);
};

export const useSetHost = () => {
  return useCallback(async (host: string): Promise<void> => {
    return await postIPCMain({
      type: IPCMessageRequestType.SET_HSD_HOST,
      payload: host,
    }, true);
  }, [postIPCMain]);
};

export const useSetPort = () => {
  return useCallback(async (port: string): Promise<void> => {
    return await postIPCMain({
      type: IPCMessageRequestType.SET_HSD_PORT,
      payload: port,
    }, true);
  }, [postIPCMain]);
};

export const useSetAPIKey = () => {
  return useCallback(async (apiKey: string): Promise<void> => {
    return await postIPCMain({
      type: IPCMessageRequestType.SET_HSD_API_KEY,
      payload: apiKey,
    }, true);
  }, [postIPCMain]);
};

export const useSetHSDConnectionType = () => {
  return useCallback(async (type: 'P2P' | 'CUSTOM' | ''): Promise<void> => {
    return await postIPCMain({
      type: IPCMessageRequestType.SET_HSD_CONN_TYPE,
      payload: type,
    }, true);
  }, [postIPCMain]);
};

export const useSetBasePath = () => {
  return useCallback(async (basePath: string): Promise<void> => {
    return await postIPCMain({
      type: IPCMessageRequestType.SET_HSD_BASE_PATH,
      payload: basePath,
    }, true);
  }, [postIPCMain]);
};

export const useStartFND = () => {
  return useCallback(async (): Promise<void> => {
    return await postIPCMain({
      type: IPCMessageRequestType.START_FND,
      payload: null,
    }, true);
  }, [postIPCMain]);
};

export const useStopFND = () => {
  return useCallback(async (): Promise<void> => {
    return await postIPCMain({
      type: IPCMessageRequestType.STOP_FND,
      payload: null,
    }, true);
  }, [postIPCMain]);
};

export const useSendPost = () => {
  const dispatch = useDispatch();

  return useCallback(async (draft: DraftPost, truncate = false): Promise<RelayerNewPostResponse> => {
    const json: IPCMessageResponse<RelayerNewPostResponse> = await postIPCMain({
      type: IPCMessageRequestType.SEND_NEW_POST,
      payload: {
        draft,
        truncate,
      },
    }, true);


    if (json.error) {
      // @ts-ignore
      throw new Error(json.payload as string);
    }

    await postIPCMain({
      type: IPCMessageRequestType.SEND_UPDATE_FOR_CURRENT_USER,
      payload: {},
    }, true);

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

export const useUploadImage = () => {
  // const dispatch = useDispatch();
  return useCallback(async (fileName: string, content: Buffer, mimeType?: string): Promise<any> => {
    return await postIPCMain({
      type: IPCMessageRequestType.SEND_NEW_MEDIA,
      payload: {
        fileName,
        content,
        mimeType,
      },
    }, true);
  }, [postIPCMain]);
};

export const useQueryMediaForName = () => {
  return async function queryNext(username: string, next: number | null, list: DomainEnvelope<DomainPost>[] = []): Promise<Pageable<DomainEnvelope<DomainPost>, number>> {
    // const resp = await postIPCMain({
    //   type: IPCMessageRequestType.QUERY_POSTS_FOR_NAME,
    //   payload: {
    //     name: username,
    //     order: 'DESC',
    //     start: next,
    //   },
    // }, true);

    const resp = await fetch(`${INDEXER_API}/users/${username}/timeline?order=DESC&offset=${next}`);
    const json: IPCMessageResponse<Pageable<DomainEnvelope<DomainPost>, number>> = await resp.json();

    if (json.error) {
      return Promise.reject(json.error);
    }

    const payload = json.payload as Pageable<DomainEnvelope<DomainPost>, number>;
    list = list.concat(payload.items)
      .filter((env) => {
        return env.message.topic === '.imageFile';
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

export const useBlockUser = () => {
  const dispatch = useDispatch();
  const currentUsername = useCurrentUsername();
  return useCallback(async (username: string) => {
    if (!currentUsername) {
      return;
    }

    const {tld, subdomain} = parseUsername(username);

    await postIPCMain({
      type: IPCMessageRequestType.BLOCK_USER,
      payload: {
        tld: tld,
        subdomain: subdomain
      },
    }, true);

    dispatch(addUserBlocks(currentUsername, {
      [username]: username,
    }));

    await postIPCMain({
      type: IPCMessageRequestType.SEND_UPDATE_FOR_CURRENT_USER,
      payload: {},
    }, true);

  }, [dispatch, postIPCMain, currentUsername])
};

export const useFollowUser = () => {
  const dispatch = useDispatch();
  const currentUser = useCurrentUser();
  return useCallback(async (username: string) => {
    const {tld, subdomain} = parseUsername(username);

    await postIPCMain({
      type: IPCMessageRequestType.FOLLOW_USER,
      payload: {
        tld,
        subdomain,
      },
    }, true);

    await postIPCMain({
      type: IPCMessageRequestType.SEND_UPDATE_FOR_CURRENT_USER,
      payload: {},
    }, true);


    dispatch(addUserFollowings(currentUser.name, {
      [username]: username,
    }));
  }, [dispatch, postIPCMain, currentUser.name])
}

export const useLikePage = () => {
  const dispatch = useDispatch();
  const currentUsername = useCurrentUsername();

  return useCallback(async (postHash: string) => {
    if (!currentUsername) {
      return;
    }
    try {
      await postIPCMain({
        type: IPCMessageRequestType.SEND_NEW_REACTION,
        payload: {
          parent: postHash,
          moderationType: 'LIKE',
        },
      }, true);

      await postIPCMain({
        type: IPCMessageRequestType.SEND_UPDATE_FOR_CURRENT_USER,
        payload: {},
      }, true);

      // dispatch(fetchCurrentUserLikes());
      dispatch(addLikeCount(postHash, 1));
      dispatch(addUserLikes(currentUsername, {
        [postHash]: postHash,
      }))
    } catch (e) {
      //
    }
  }, [postIPCMain, dispatch, currentUsername]);
};

export const sendReply = (id: string) => async (dispatch: ThunkDispatch<{ replies: RepliesState }, any, Action>, getState: () => { replies: RepliesState; users: UsersState }): Promise<IPCMessageResponse<any>> => {
  dispatch(setSendingReplies(true));

  const { replies, users: { currentUser } } = getState();
  const { tld } = parseUsername(currentUser);
  const reply = replies.map[id];

  const ipcMessage = {
    type: IPCMessageRequestType.SEND_NEW_POST,
    payload: {
      draft: reply,
      truncate: false,
    },
  };

  if (!reply || !currentUser) {
    dispatch(setSendingReplies(false));
    return Promise.reject();
  }

  const json = await postIPCMain(ipcMessage, true);

  await postIPCMain({
    type: IPCMessageRequestType.SEND_UPDATE_FOR_CURRENT_USER,
    payload: {},
  }, true);

  dispatch(setSendingReplies(false));

  const guid = String(json.payload.networkId);
  const refhash = json.payload.refhash;

  dispatch(updatePost(createNewPost({
    hash: refhash,
    id: guid,
    type: PostType.COMMENT,
    creator: currentUser,
    timestamp: new Date(json.payload.createdAt).getTime(),
    content: json.payload.message.body,
    topic: json.payload.message.topic,
    tags: json.payload.message.tags,
    context: '',
    parent: json.payload.message.reference,
  })));

  dispatch(appendNewComment(reply.parent, refhash, true));

  return json;
};

export const useCreateNewView = () => {
  const dispatch = useDispatch();

  return useCallback(async (view: CustomViewProps) => {
    await postIPCMain({
      type: IPCMessageRequestType.SAVE_VIEW,
      payload: view,
    }, true);

    await dispatch(fetchCurrentUserData());
  }, [postIPCMain, dispatch]);
};

export const useSaveCustomView = () => {
  const dispatch = useDispatch();

  return useCallback(async (view: CustomViewProps, index: number) => {
    await postIPCMain({
      type: IPCMessageRequestType.UPDATE_FILTER_BY_INDEX,
      payload: {
        view, index,
      },
    }, true);

    await dispatch(fetchCurrentUserData());
  }, [postIPCMain, dispatch]);
};

export const fetchCurrentUserData = () => async (dispatch: Dispatch<any>): Promise<void> => {
  const resp: IPCMessageResponse<UserData | string> = await postIPCMain({
    type: IPCMessageRequestType.GET_USER_DATA,
    payload: null,
  }, true);

  if (resp.error) {
    throw new Error(resp.payload as string);
  }

  dispatch({
    type: UsersActionType.SET_CURRENT_USER_DATA,
    payload: resp.payload,
  });
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
        dispatch(fetchUserBlocks(currentUser));
      }

      dispatch(fetchCurrentUserData());
    });
};
