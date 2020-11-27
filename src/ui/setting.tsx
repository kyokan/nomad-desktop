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
import {Provider} from "react-redux";
import SettingRoot from "./pages/SettingRoot";
import configureSettingStore from "./store/configureSettingStore";
import {MemoryRouter} from "react-router-dom";
import {ipcRenderer} from "electron";
import {APP_DATA_EVENT_TYPES, FND_EVENT_TYPES, IPCMessageRequest, IPCMessageRequestType} from "../app/types";
import {AppActionType, setFNDStatus, setHandshakeEndHeight, setHandshakeStartHeight, setLastSync} from "./ducks/app";

const store = configureSettingStore();

ReactDOM.render(
  <Provider store={store}>
    <MemoryRouter>
      <SettingRoot />
    </MemoryRouter>
  </Provider>,
  document.getElementById('root'),
);

ipcRenderer.on('pushMessage', (_: any, message: IPCMessageRequest<any>) => {
  switch (message.type) {
    case IPCMessageRequestType.HSD_CONN_TYPE_UPDATED:
      store.dispatch({
        type: AppActionType.SET_CONN_TYPE,
        payload: message.payload,
      });
      return;
    case APP_DATA_EVENT_TYPES.START_HEIGHT_UPDATED:
      return store.dispatch(setHandshakeStartHeight(message.payload));
    case APP_DATA_EVENT_TYPES.END_HEIGHT_UPDATED:
      return store.dispatch(setHandshakeEndHeight(message.payload));
    case APP_DATA_EVENT_TYPES.LAST_SYNC_UPDATED:
      return store.dispatch(setLastSync(message.payload));
    case FND_EVENT_TYPES.NODE_STATUS_CHANGED:
      return store.dispatch(setFNDStatus(message.payload));
  }
});

if ((module as any).hot) {
  (module as any).hot.accept();
}
