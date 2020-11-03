// @ts-ignore
import {shallowEqual, useDispatch, useSelector} from "react-redux";
import {Filter} from "../utils/filter";
import {UsersState} from "./users";

export type CustomViewProps = {
  title: string;
  iconUrl: string;
  heroImageUrl: string;
  filter: Filter;
}

enum ViewsActionType {
  ADD_USER_TO_VIEW = 'app/views/addUserToView',
  REMOVE_USER_FROM_VIEW = 'app/views/removeUserFromView',
  ADD_TAG_TO_VIEW = 'app/views/addTagToView',
  REMOVE_TAG_FROM_VIEW = 'app/views/removeTagFromView',
  SET_NEW_TITLE = 'app/views/setNewTitleAtViewIndex',
  RESET_VIEW_INDEX = 'app/views/resetViewIndex',
}

type ViewsState = {
  newTitles: string[];
  overrides: {
    users: string[];
    tags: string[];
  }[];
  subtracts: {
    users: string[];
    tags: string[];
  }[];
}

type ViewsAction<payload> = {
  type: ViewsActionType;
  payload: payload;
  meta?: any;
  error?: boolean;
}

const initialState: ViewsState = {
  newTitles: [],
  subtracts: [],
  overrides: [],
};


export const resetViewIndex = (viewIndex: number): ViewsAction<{viewIndex: number}> => ({
  type: ViewsActionType.RESET_VIEW_INDEX,
  payload: { viewIndex },
});

export const addTagToView = (tag: string, viewIndex: number): ViewsAction<{tag: string; viewIndex: number}> => ({
  type: ViewsActionType.ADD_TAG_TO_VIEW,
  payload: { tag, viewIndex },
});

export const addUserToView = (user: string, viewIndex: number): ViewsAction<{user: string; viewIndex: number}> => ({
  type: ViewsActionType.ADD_USER_TO_VIEW,
  payload: { user, viewIndex },
});

export const removeTagFromView = (tag: string, viewIndex: number): ViewsAction<{tag: string; viewIndex: number}> => ({
  type: ViewsActionType.REMOVE_TAG_FROM_VIEW,
  payload: { tag, viewIndex },
});

export const removeUserFromView = (user: string, viewIndex: number): ViewsAction<{user: string; viewIndex: number}> => ({
  type: ViewsActionType.REMOVE_USER_FROM_VIEW,
  payload: { user, viewIndex },
});

export const setTitleAtViewIndex = (title: string, viewIndex: number): ViewsAction<{title: string; viewIndex: number}> => ({
  type: ViewsActionType.SET_NEW_TITLE,
  payload: { title, viewIndex },
});

export default function viewsReducer (state = initialState, action: ViewsAction<any>): ViewsState {
  switch (action.type) {
    case ViewsActionType.ADD_TAG_TO_VIEW:
      return reduceAddTag(state, action);
    case ViewsActionType.ADD_USER_TO_VIEW:
      return reduceAddUser(state, action);
    case ViewsActionType.REMOVE_TAG_FROM_VIEW:
      return reduceRemoveTag(state, action);
    case ViewsActionType.REMOVE_USER_FROM_VIEW:
      return reduceRemoveUser(state, action);
    case ViewsActionType.SET_NEW_TITLE:
      return reduceNewTitles(state, action);
    case ViewsActionType.RESET_VIEW_INDEX:
      return reduceResetViewIndex(state, action);
    default:
      return state;
  }
}

function reduceResetViewIndex (state: ViewsState, action: ViewsAction<{viewIndex: number}>): ViewsState {
  const { viewIndex } = action.payload;
  const { newTitles: titles, overrides, subtracts } = state;
  const newTitles = [ ...titles ];
  const newSubtracts = [...subtracts];
  const newOverrides = [...overrides];

  newOverrides[viewIndex] = { users: [], tags: [] };
  newSubtracts[viewIndex] = { users: [], tags: [] };
  newTitles[viewIndex] = '';

  return {
    ...state,
    newTitles: newTitles,
    subtracts: newSubtracts,
    overrides: newOverrides,
  };
}

function reduceNewTitles (state: ViewsState, action: ViewsAction<{title: string; viewIndex: number}>): ViewsState {
  const { title, viewIndex } = action.payload;
  const { newTitles } = state;
  const titles = [ ...newTitles ];
  titles[viewIndex] = title;
  return {
    ...state,
    newTitles: titles,
  };
}

function reduceAddTag (state: ViewsState, action: ViewsAction<{tag: string; viewIndex: number}>): ViewsState {
  const { subtracts, overrides } = state;
  const { tag, viewIndex } = action.payload;
  const newSubtracts = [...subtracts];
  const newOverrides = [...overrides];
  const override = newOverrides[viewIndex] || { users: [], tags: [] };
  const subtract = subtracts[viewIndex] || { users: [], tags: [] };

  newSubtracts[viewIndex] = {
    users: subtract?.users || [],
    tags: subtract?.tags.filter(t => t !== tag) || [],
  };

  newOverrides[viewIndex] = {
    users: override?.users || [],
    tags: Array.from(new Set([...override?.tags || [], tag])),
  };

  return {
    ...state,
    overrides: newOverrides,
    subtracts: newSubtracts,
  };
}

function reduceRemoveTag (state: ViewsState, action: ViewsAction<{tag: string; viewIndex: number}>): ViewsState {
  const { subtracts, overrides } = state;
  const { tag, viewIndex } = action.payload;
  const newSubtracts = [...subtracts];
  const newOverrides = [...overrides];
  const override = newOverrides[viewIndex] || { users: [], tags: [] };
  const subtract = subtracts[viewIndex] || { users: [], tags: [] };

  newSubtracts[viewIndex] = {
    users: subtract?.users || [],
    // @ts-ignore
    tags: Array.from(new Set([...subtract?.tags || [], tag])),
  };

  newOverrides[viewIndex] = {
    users: override?.users || [],
    tags: override?.tags.filter(t => t !== tag) || [],
  };

  return {
    ...state,
    overrides: newOverrides,
    subtracts: newSubtracts,
  };
}

function reduceAddUser (state: ViewsState, action: ViewsAction<{user: string; viewIndex: number}>): ViewsState {
  const { subtracts, overrides } = state;
  const { user, viewIndex } = action.payload;
  const newSubtracts = [...subtracts];
  const newOverrides = [...overrides];
  const override = newOverrides[viewIndex] || { users: [], tags: [] };
  const subtract = subtracts[viewIndex] || { users: [], tags: [] };

  newSubtracts[viewIndex] = {
    tags: subtract?.tags || [],
    users: subtract?.users.filter(u => u !== user) || [],

  };

  newOverrides[viewIndex] = {
    tags: override?.tags || [],
    users: Array.from(new Set([...override?.users || [], user])),
  };

  return {
    ...state,
    overrides: newOverrides,
    subtracts: newSubtracts,
  };
}

function reduceRemoveUser (state: ViewsState, action: ViewsAction<{user: string; viewIndex: number}>): ViewsState {
  const { subtracts, overrides } = state;
  const { user, viewIndex } = action.payload;
  const newSubtracts = [...subtracts];
  const newOverrides = [...overrides];
  const override = newOverrides[viewIndex] || { users: [], tags: [] };
  const subtract = subtracts[viewIndex] || { users: [], tags: [] };

  newSubtracts[viewIndex] = {
    tags: subtract?.tags || [],
    users: Array.from(new Set([...subtract?.users || [], user])),
  };

  newOverrides[viewIndex] = {
    tags: override?.tags || [],
    users: override?.users.filter(u => u !== user) || [],
  };

  return {
    ...state,
    overrides: newOverrides,
    subtracts: newSubtracts,
  };
}

export const useNewTitleByIndex = (viewIndex: number): string => {
  return useSelector((state: { views: ViewsState}) => {
    const newTitle = state.views.newTitles[viewIndex];
    return newTitle || '';
  }, shallowEqual);
};

export const useViewOverrideByIndex = (viewIndex: number): { users: string[]; tags: string[] } => {
  return useSelector((state: { views: ViewsState}) => {
    const override = state.views.overrides[viewIndex];
    return override || { users: [], tags: []};
  }, (a: any, b: any) => (
    a.users.join(',') === b.users.join(',') &&
    a.tags.join(',') === b.tags.join(',')
  ));
};

export const useViewSubtractByIndex = (viewIndex: number): { users: string[]; tags: string[] } => {
  return useSelector((state: { views: ViewsState}) => {
    const subtract = state.views.subtracts[viewIndex];
    return subtract || { users: [], tags: []};
  }, (a: any, b: any) => (
    a.users.join(',') === b.users.join(',') &&
    a.tags.join(',') === b.tags.join(',')
  ));
};
