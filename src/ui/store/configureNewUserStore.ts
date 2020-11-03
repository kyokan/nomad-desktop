import {createStore, applyMiddleware, combineReducers} from "redux";
import thunk from "redux-thunk";
import { createLogger } from "redux-logger";
import {PostsActionType} from "../../../external/universal/ducks/posts";
import app, {AppActionType} from "../ducks/app";

const rootReducer = combineReducers({
  app,
});

export type NewUserRootState = ReturnType<typeof rootReducer>;

export default function configureNewUserStore() {
  return createStore(
    rootReducer,
    process.env.NODE_ENV === 'development'
      ? applyMiddleware(thunk, createLogger({
        collapsed: (getState, action = {}) => [
          PostsActionType.UPDATE_COMMENTS,
          PostsActionType.UPDATE_POST,
          AppActionType.UPDATE_FOOTER,
        ].includes(action.type),
      }))
      : applyMiddleware(thunk),
  );
}
