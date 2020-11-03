import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {Provider} from "react-redux";
import NewUserRoot from "./pages/NewUserRoot";
import configureNewUserStore from "./store/configureNewUserStore";
import {MemoryRouter} from "react-router-dom";

const store = configureNewUserStore();

ReactDOM.render(
  <Provider store={store}>
    <MemoryRouter>
      <NewUserRoot />
    </MemoryRouter>
  </Provider>,
  document.getElementById('root'),
);

if ((module as any).hot) {
  (module as any).hot.accept();
}
