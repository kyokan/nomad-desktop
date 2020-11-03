import * as React from 'react';
import * as ReactDOM from 'react-dom';
import NewPostRoot from './pages/NewPostRoot';
import configureNewPostStore from "./store/configureNewPostStore";
import {Provider} from "react-redux";
import {MemoryRouter} from "react-router-dom";

const store = configureNewPostStore();

ReactDOM.render(
  <Provider store={store}>
    <MemoryRouter>
      <NewPostRoot />
    </MemoryRouter>
  </Provider>,
  document.getElementById('root'),
);

if ((module as any).hot) {
  (module as any).hot.accept();
}
