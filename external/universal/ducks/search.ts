// @ts-ignore
import {shallowEqual, useDispatch, useSelector} from "react-redux";

type SearchState = {
  tags: string[],
  users: string[],
}

export enum SearchActionType {
  ADD_TAG = 'app/search/addTag',
  REMOVE_TAG = 'app/search/removeTag',
  ADD_USER = 'app/search/addUser',
  REMOVE_USER = 'app/search/removeUser',
  RESET_SEARCH_PARAMS = 'app/search/resetSearchParams',
}

type SearchAction<payload> = {
  type: SearchActionType;
  payload: payload;
  meta?: any;
  error?: boolean;
}

const initialState: SearchState = {
  tags: [],
  users: [],
};

export const addTag = (tag: string): SearchAction<string> => ({
  type: SearchActionType.ADD_TAG,
  payload: tag,
});

export const removeTag = (tag: string): SearchAction<string> => ({
  type: SearchActionType.REMOVE_TAG,
  payload: tag,
});

export const addUser = (user: string): SearchAction<string> => ({
  type: SearchActionType.ADD_USER,
  payload: user,
});

export const removeUser = (user: string): SearchAction<string> => ({
  type: SearchActionType.REMOVE_USER,
  payload: user,
});

export const resetSearchParams = (): SearchAction<undefined> => ({
  type: SearchActionType.RESET_SEARCH_PARAMS,
  payload: undefined,
});

export default function searchReducer (state: SearchState = initialState, action: SearchAction<any>) {
  switch (action.type) {
    case SearchActionType.ADD_TAG:
      return {
        ...state,
        // @ts-ignore
        tags: Array.from(new Set(state.tags.concat(action.payload))),
      };
    case SearchActionType.ADD_USER:
      return {
        ...state,
        // @ts-ignore
        users: Array.from(new Set(state.users.concat(action.payload))),
      };
    case SearchActionType.REMOVE_TAG:
      return {
        ...state,
        // @ts-ignore
        tags: Array.from(new Set(state.tags.filter(t => t !== action.payload))),
      };
    case SearchActionType.REMOVE_USER:
      return {
        ...state,
        // @ts-ignore
        users: Array.from(new Set(state.users.filter(t => t !== action.payload))),
      };
    case SearchActionType.RESET_SEARCH_PARAMS:
      return initialState;
    default:
      return state;
  }
}

export type SearchParams = { tags: string[]; users: string[] };
export const useSearchParams = (): SearchParams => {
  return useSelector((state: { search: SearchState }): SearchParams => {
    return {
      tags: state.search.tags,
      users: state.search.users,
    };
  }, (a: SearchParams, b: SearchParams) => {
    return a.tags.join(',') === b.tags.join(',') &&
      a.users.join(',') === b.users.join(',');
  });
};

