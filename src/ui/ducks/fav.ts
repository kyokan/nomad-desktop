import {shallowEqual, useSelector} from "react-redux";
import {Dispatch} from "redux";
import {postIPCMain} from "../helpers/ipc";
import {IPCMessageRequestType, IPCMessageResponse} from "../../app/types";
import {ThunkDispatch} from "redux-thunk";

type FavState = {
  topics: string[];
  users: string[];
}

const initialState: FavState = {
  topics: [],
  users: [],
};

enum FavActionType {
  ADD_FAVORITE_USER = 'app/fav/addFavoriteUser',
  ADD_FAVORITE_TOPIC = 'app/fav/addFavoriteTopic',
  SET_FAVORITE_TOPICS = 'app/fav/setFavoriteTopics',
  REMOVE_FAVORITE_USER = 'app/fav/removeFavoriteUser',
  REMOVE_FAVORITE_TOPIC = 'app/fav/removeFavoriteTopic',
}

type FavAction<payload> = {
  type: FavActionType;
  payload: payload;
  meta?: any;
  error?: boolean;
}

export const fetchFavorites = () => async (dispatch: Dispatch) => {
  try {
    const resp: IPCMessageResponse<{ topics: string[] }> = await postIPCMain({ type: IPCMessageRequestType.GET_FAVORITES }, true);
    dispatch({
      type: FavActionType.SET_FAVORITE_TOPICS,
      payload: resp.payload.topics,
    });
  } catch (err) {
    //
    console.error(err);
  }
};

export const addFavoriteUser = (user: string) => async (dispatch: Dispatch) => {
  await postIPCMain({
    type: IPCMessageRequestType.ADD_USER_TO_FAVORITE,
    payload: user,
  });

  dispatch({
    type: FavActionType.ADD_FAVORITE_USER,
    payload: user
  });
};

export const addFavoriteTopic = (topic: string) => async (dispatch: Dispatch) => {
  await postIPCMain({
    type: IPCMessageRequestType.ADD_TOPIC_TO_FAVORITE,
    payload: topic,
  }, true);

  dispatch({
    type: FavActionType.ADD_FAVORITE_TOPIC,
    payload: topic,
  });
};

export const removeFavoriteUser = (user: string) => ({
  type: FavActionType.REMOVE_FAVORITE_USER,
  payload: user,
});

export const removeFavoriteTopic = (topic: string) => async (dispatch: Dispatch) => {
  await postIPCMain({
    type: IPCMessageRequestType.REMOVE_TOPIC_TO_FAVORITE,
    payload: topic,
  }, true);

  dispatch({
    type: FavActionType.REMOVE_FAVORITE_TOPIC,
    payload: topic,
  });
};

export default function favReducer(state: FavState = initialState, action: any): FavState {
  switch (action.type) {
    case FavActionType.ADD_FAVORITE_USER:
      return {
        ...state,
        // @ts-ignore
        users: (state.users.filter(user => user !== action.payload).concat(action.payload)),
      };
    case FavActionType.ADD_FAVORITE_TOPIC:
      return {
        ...state,
        // @ts-ignore
        topics: state.topics.filter(topic => topic !== action.payload).concat(action.payload),
      };
    case FavActionType.REMOVE_FAVORITE_TOPIC:
      return {
        ...state,
        // @ts-ignore
        topics: state.topics.filter(topic => topic !== action.payload),
      };
    case FavActionType.REMOVE_FAVORITE_USER:
      return {
        ...state,
        // @ts-ignore
        users: state.users.filter(user => user !== action.payload),
      };
    case FavActionType.SET_FAVORITE_TOPICS:
      return {
        ...state,
        topics: action.payload,
      };
    default:
      return state;
  }
}

export const useTopics = () => {
  return useSelector((state: { fav: FavState }) => {
    return state.fav.topics;
  }, shallowEqual);
};
