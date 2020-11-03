import {createStore, applyMiddleware, combineReducers} from "redux";
import thunk from "redux-thunk";
import { createLogger } from "redux-logger";
import drafts from "../ducks/drafts";
import users from "../../../../universal/ducks/users";
import app, {AppActionType} from "../ducks/app";
import posts, {PostsActionType} from "../ducks/posts";

const rootReducer = combineReducers({
  drafts,
  users,
  app,
  posts,
});

export type NewPostRootState = ReturnType<typeof rootReducer>;

export default function configureNewPostStore() {
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
