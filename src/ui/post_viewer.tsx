import * as React from 'react';
import * as ReactDOM from 'react-dom';
import PostViewerRoot from './pages/PostViewerRoot';
import {Provider} from "react-redux";
import {MemoryRouter} from "react-router-dom";
import configurePostViewerStore from "./store/configurePostViewerStore";
import {ipcRenderer} from "electron";
import {IPCMessageRequest, IPCMessageRequestType} from "../app/types";

const store = configurePostViewerStore();

ReactDOM.render(
  <Provider store={store}>
    <MemoryRouter>
      <PostViewerRoot />
    </MemoryRouter>
  </Provider>,
  document.getElementById('root'),
);

if ((module as any).hot) {
  (module as any).hot.accept();
}
