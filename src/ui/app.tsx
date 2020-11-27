import {postIPCMain} from "./helpers/ipc";
const _fetch = fetch;
let apiKey = '';
// @ts-ignore
global.fetch = async function (url, options) {
  if (!apiKey) {
    const {payload} = await postIPCMain({
      type: IPCMessageRequestType.GET_API_KEY,
      payload: null,
    }, true);

    apiKey = payload;
  }

  if (typeof url === 'string') {
    return _fetch(url, {
      ...options || {},
      headers: {
        ...(options ? options.headers : {}),
        'X-API-Token': `${apiKey}`,
      },
    });
  }

  return _fetch({
    ...url || {},
    headers: {
      ...(url ? url.headers : {}),
      'X-API-Token': `${apiKey}`,
    },
  });

}.bind(global);
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import configureAppStore from './store/configureAppStore';
import Root from './pages/AppRoot';
import {ipcRenderer} from "electron";
import {
  APP_DATA_EVENT_TYPES,
  FND_EVENT_TYPES,
  IPCMessageRequest,
  IPCMessageRequestType,
  ResponsePost
} from "../app/types";
import * as postsActions from 'nomad-universal/lib/ducks/posts';
import {mapRawToPost} from 'nomad-universal/lib/ducks/posts';
import {MemoryRouter} from 'react-router-dom';
import {setMuteUser, setUnmuteUser} from "nomad-universal/lib/ducks/blocklist";
import {
  addIdentity, fetchUserBlocks,
  // fetchCurrentUserData,
  // fetchUserBlockee,
  fetchUserLikes,
  setCurrentUpdateQueue,
  updateCurrentLastFlushed,
  updateCurrentUser
} from "nomad-universal/lib/ducks/users";

import {
  AppActionType,
  setFNDStatus,
  setHandshakeEndHeight,
  setHandshakeStartHeight,
  setHSDSyncProgress,
  setInitialized,
  setLastSync,
} from "./ducks/app";
import {fetchUserFollowings} from "nomad-universal/lib/ducks/users";
import {fetchCurrentUserData} from "./helpers/hooks";
import {PostType} from "nomad-universal/lib/types/posts";



// const Matomo = require("matomo-tracker");
// const matomo = new Matomo(2, 'http://34.106.54.216/matomo.php');
// matomo.track({
//   url: 'nomad://electron',
//   // eslint-disable-next-line @typescript-eslint/camelcase
//   action_name: 'App Loaded',
//   ua: navigator.userAgent,
//   lang: navigator.language,
//   res: window.innerWidth + 'x' + window.innerHeight,
// });

const store = configureAppStore();

ipcRenderer.on('pushMessage', (_: any, message: IPCMessageRequest<any>) => {
  switch (message.type) {
    case IPCMessageRequestType.NEW_POST_UPDATE:
      // eslint-disable-next-line no-case-declarations
      const posts: ResponsePost[] = message.payload;
      posts.forEach(rawPost => {
        const { posts } = store.getState();
        const mapped = mapRawToPost(rawPost);
        const post = posts.map[mapped.hash];
        if (!post) {
          store.dispatch(postsActions.updateRawPost(rawPost));
          if (mapped.type === PostType.ORIGINAL) {
            store.dispatch(postsActions.appendNewPost(mapped.hash))
          } else {
            store.dispatch(postsActions.appendNewComment(mapped.parent, mapped.hash));
          }
        } else if (post.creator !== mapped.creator) {
          store.dispatch(postsActions.updateRawPost(rawPost));
        } else if (post.content !== mapped.content) {
          store.dispatch(postsActions.updateRawPost(rawPost));
        } else if (post.context !== mapped.context) {
          store.dispatch(postsActions.updateRawPost(rawPost));
        } else if (post.title !== mapped.title) {
          store.dispatch(postsActions.updateRawPost(rawPost));
        }
      });
      // return;
      return;
    case IPCMessageRequestType.HSD_CONN_TYPE_UPDATED:
      store.dispatch({
        type: AppActionType.SET_CONN_TYPE,
        payload: message.payload,
      });
      return;
    case IPCMessageRequestType.NEW_USER_ADDED:
      if (typeof message.payload !== "string") return;
      store.dispatch(addIdentity(message.payload));
      return;
    case IPCMessageRequestType.CURRENT_IDENTITY_CHANGED:
      store.dispatch(updateCurrentUser(message.payload));
      store.dispatch<any>(fetchUserFollowings(message.payload));
      store.dispatch<any>(fetchUserBlocks(message.payload));
      store.dispatch<any>(fetchUserLikes(message.payload));
      // store.dispatch<any>(fetchCurrentUserData());
      return;
    case IPCMessageRequestType.NEW_INDEXER_LOG_ENTRY:
      // store.dispatch(appActions.updateFooter(message.payload[0], ''));
      return;
    case IPCMessageRequestType.MUTE_USER_UPDATED:
      return message.payload.blocked
        ? store.dispatch(setMuteUser(message.payload.name))
        : store.dispatch(setUnmuteUser(message.payload.name));
    case IPCMessageRequestType.LAST_FLUSHED_UPDATED:
      return store.dispatch(updateCurrentLastFlushed(message.payload));
    case IPCMessageRequestType.UPDATE_QUEUE_UPDATED:
      return store.dispatch(setCurrentUpdateQueue(message.payload));
    case APP_DATA_EVENT_TYPES.SET_HSD_SYNC_PROGRESS:
      return store.dispatch(setHSDSyncProgress(message.payload));
    case APP_DATA_EVENT_TYPES.START_HEIGHT_UPDATED:
      return store.dispatch(setHandshakeStartHeight(message.payload));
    case APP_DATA_EVENT_TYPES.END_HEIGHT_UPDATED:
      return store.dispatch(setHandshakeEndHeight(message.payload));
    case APP_DATA_EVENT_TYPES.LAST_SYNC_UPDATED:
      return store.dispatch(setLastSync(message.payload));
    case APP_DATA_EVENT_TYPES.INITIALIZED_UPDATED:
      return store.dispatch(setInitialized(true));
    case FND_EVENT_TYPES.NODE_STATUS_CHANGED:
      return store.dispatch(setFNDStatus(message.payload));
    default:
      return;
  }
});

ReactDOM.render(
  <Provider store={store}>
    <MemoryRouter>
      <Root />
    </MemoryRouter>
  </Provider>,
  document.getElementById('root'),
);

if ((module as any).hot) {
  (module as any).hot.accept();
}
