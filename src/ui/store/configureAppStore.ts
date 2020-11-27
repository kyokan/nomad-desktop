import {createStore, applyMiddleware, combineReducers} from "redux";
import thunk from "redux-thunk";
import {createLogger} from "redux-logger";
import posts, {PostsActionType} from "nomad-universal/lib/ducks/posts";
import users from "nomad-universal/lib/ducks/users";
import drafts from "nomad-universal/lib/ducks/drafts";
import replies from "nomad-universal/lib/ducks/drafts/replies";
import blocklist from "nomad-universal/lib/ducks/blocklist";
import app, {AppActionType} from "../ducks/app";
import search from "nomad-universal/lib/ducks/search";
import views from "nomad-universal/lib/ducks/views";


const rootReducer = combineReducers({
  posts,
  users,
  replies,
  app,
  blocklist,
  drafts,
  search,
  views,
});

export type AppRootState = ReturnType<typeof rootReducer>;

export default function configureAppStore() {
  return createStore(
    rootReducer,
    process.env.NODE_ENV === 'development'
      ? applyMiddleware(thunk, createLogger({
        collapsed: (getState, action = {}) => [
          PostsActionType.UPDATE_COMMENTS,
          PostsActionType.UPDATE_POST,
          PostsActionType.APPEND_NEW_POST,
          PostsActionType.APPEND_NEW_COMMENT,
          AppActionType.UPDATE_FOOTER,
          AppActionType.SET_APP_DATA,
        ].includes(action.type),
      }))
      : applyMiddleware(thunk),
  );
}

