import {createStore, applyMiddleware, combineReducers} from "redux";
import thunk from "redux-thunk";
import {createLogger} from "redux-logger";
import posts, {PostsActionType} from "../ducks/posts";
import users from "../ducks/users";
import fav from "../ducks/fav";
import drafts from "../ducks/drafts";
import replies from "../ducks/drafts/replies";
import bookmark from "../ducks/bookmark";
import blocklist from "../ducks/blocklist";
import preview from "../ducks/preview";
import app, {AppActionType} from "../ducks/app";

const postViewerReducer = combineReducers({
  posts,
  users,
  replies,
  app,
  fav,
  bookmark,
  blocklist,
  preview,
  drafts,
});

export type PostViewerState = ReturnType<typeof postViewerReducer>;

export default function configureAppStore() {
  return createStore(
    postViewerReducer,
    process.env.NODE_ENV === 'development'
      ? applyMiddleware(thunk, createLogger({
        collapsed: (getState, action = {}) => [
          PostsActionType.UPDATE_COMMENTS,
          PostsActionType.UPDATE_POST,
          PostsActionType.APPEND_NEW_POST,
          PostsActionType.APPEND_NEW_COMMENT,
          AppActionType.UPDATE_FOOTER,
        ].includes(action.type),
      }))
      : applyMiddleware(thunk),
  );
}

