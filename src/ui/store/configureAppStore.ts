import {createStore, applyMiddleware, combineReducers} from "redux";
import thunk from "redux-thunk";
import {createLogger} from "redux-logger";
import posts, {PostsActionType} from "../../../external/universal/ducks/posts";
import users from "../../../external/universal/ducks/users";
import fav from "../ducks/fav";
import drafts from "../ducks/drafts";
import replies from "../ducks/drafts/replies";
import bookmark from "../ducks/bookmark";
import blocklist from "../ducks/blocklist";
import preview from "../ducks/preview";
import app, {AppActionType} from "../ducks/app";
import search from "../../../external/universal/ducks/search";
import views from "../../../external/universal/ducks/views";


const rootReducer = combineReducers({
  posts,
  users,
  replies,
  app,
  fav,
  bookmark,
  blocklist,
  preview,
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

