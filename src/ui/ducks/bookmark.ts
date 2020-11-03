import {shallowEqual, useSelector} from "react-redux";
import {Dispatch} from "redux";
import {postIPCMain} from "../helpers/ipc";
import {IPCMessageRequestType, IPCMessageResponse} from "../../app/types";
import uniq from "lodash.uniq";

enum BookmarkActionType {
  ADD_BOOKMARK = 'app/bookmark/addBookmark',
  SELECT_BOOKMARK = 'app/bookmark/selectBookmark',
  REMOVE_BOOKMARK = 'app/bookmark/removeBookmark',
  SET_BOOKMARKS = 'app/bookmark/setBookmarks',
}

type BookmarkAction<payload> = {
  type: BookmarkActionType;
  payload: payload;
  meta?: any;
  error?: boolean;
}

export type BookmarkState = {
  selectedBookmark: string;
  order: string[];
  map: {
    [url: string]: BookmarkProps;
  };
};

export type BookmarkProps = {
  url: string;
  meta?: any;
}

type BookmarkOpts = {
  url: string;
  meta?: any;
}

const initialState: BookmarkState = {
  selectedBookmark: '',
  order: [],
  map: {},
};

export const fetchBookmarks = () => async (dispatch: Dispatch) => {
  const resp: IPCMessageResponse<BookmarkProps[]> = await postIPCMain({
    type: IPCMessageRequestType.GET_BOOKMARKS,
  }, true);

  if (!resp.error) {
    dispatch(setBookmarks(resp.payload));
  }
};

const setBookmarks = (bookmarks: BookmarkProps[]): BookmarkAction<BookmarkProps[]> => {
  return {
    type: BookmarkActionType.SET_BOOKMARKS,
    payload: bookmarks,
  };
};

const _addBookmark = (bookmark: BookmarkOpts): BookmarkAction<BookmarkOpts> => {
  return {
    type: BookmarkActionType.ADD_BOOKMARK,
    payload: bookmark,
  };
};

export const addBookmark = (bookmark: BookmarkOpts) => async (dispatch: Dispatch) => {
  const resp = await postIPCMain({
    type: IPCMessageRequestType.ADD_BOOKMARK,
    payload: bookmark,
  }, true);

  if (resp.error) {
    return;
  }

  dispatch(_addBookmark(bookmark));
};

export const selectBookmark = (url: string): BookmarkAction<string> => ({
  type: BookmarkActionType.SELECT_BOOKMARK,
  payload: url,
});

export const removeBookmark = (bookmarkId: string): BookmarkAction<string> => {
  return {
    type: BookmarkActionType.REMOVE_BOOKMARK,
    payload: bookmarkId,
  };
};

export default function bookmarkReducer(state: BookmarkState = initialState, action: BookmarkAction<any>): BookmarkState {
  switch (action.type) {
    case BookmarkActionType.ADD_BOOKMARK:
      return handleAddBookmark(state, action);
    case BookmarkActionType.REMOVE_BOOKMARK:
      return handleRemoveBookmark(state, action);
    case BookmarkActionType.SET_BOOKMARKS:
      return handleSetBookmarks(state, action);
    case BookmarkActionType.SELECT_BOOKMARK:
      return {
        ...state,
        selectedBookmark: action.payload,
      };
    default:
      return state;
  }
}

function handleSetBookmarks(state: BookmarkState = initialState, action: BookmarkAction<BookmarkProps[]>): BookmarkState {
  const accumulator: {[url: string]: BookmarkProps} = {};
  return {
    ...state,
    order: uniq(action.payload.map(({ url }) => url)),
    map: action.payload.reduce((acc, bookmark) => {
      acc[bookmark.url] = bookmark;
      return acc;
    }, accumulator),
  }
}

function handleAddBookmark(state: BookmarkState = initialState, action: BookmarkAction<BookmarkProps>): BookmarkState {
  return {
    ...state,
    order: [...state.order, action.payload.url],
    map: {
      ...state.map,
      [action.payload.url]: action.payload,
    },
  }
}

function handleRemoveBookmark(state: BookmarkState = initialState, action: BookmarkAction<string>): BookmarkState {
  const newMap = {
    ...state.map,
  };

  delete newMap[action.payload];

  return {
    ...state,
    order: state.order.filter(url => url === action.payload),
    map: newMap,
  }
}

export const useBookmarks = () => {
  return useSelector((state: { bookmark: BookmarkState }) => {
    return state.bookmark || { order: [], map: {}};
  }, shallowEqual);
};

export const useBookmarkId = (id: string) => {
  return useSelector((state: { bookmark: BookmarkState }) => {
    return state.bookmark.map[id] || {};
  }, shallowEqual);
};
