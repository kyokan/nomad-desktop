import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {Provider} from "react-redux";
import SettingRoot from "./pages/SettingRoot";
import configureSettingStore from "./store/configureSettingStore";
import {MemoryRouter} from "react-router-dom";
import {ipcRenderer} from "electron";
import {APP_DATA_EVENT_TYPES, DDRP_EVENT_TYPES, IPCMessageRequest} from "../app/types";
import {setDDRPStatus, setHandshakeEndHeight, setHandshakeStartHeight, setLastSync} from "./ducks/app";

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
    case APP_DATA_EVENT_TYPES.START_HEIGHT_UPDATED:
      return store.dispatch(setHandshakeStartHeight(message.payload));
    case APP_DATA_EVENT_TYPES.END_HEIGHT_UPDATED:
      return store.dispatch(setHandshakeEndHeight(message.payload));
    case APP_DATA_EVENT_TYPES.LAST_SYNC_UPDATED:
      return store.dispatch(setLastSync(message.payload));
    case DDRP_EVENT_TYPES.NODE_STATUS_CHANGED:
      return store.dispatch(setDDRPStatus(message.payload));
  }
});

if ((module as any).hot) {
  (module as any).hot.accept();
}
