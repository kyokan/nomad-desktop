import {shallowEqual, useSelector} from "react-redux";

enum PreviewActionType {
  SET_PREVIEWS = 'app/preview/setPreviews',
  SET_CURRENT_PREVIEW = 'app/preview/setCurrentPreview',
}

type PreviewAction<payload> = {
  type: PreviewActionType;
  payload?: payload;
  meta?: any;
  error?: boolean;
}

type PreviewState = {
  links: string[];
  currentLinkIndex: number;
}

const initialState: PreviewState = {
  links: [],
  currentLinkIndex: 0,
};

export const setPreviews = (links: string[]): PreviewAction<string[]> => {
  return {
    type: PreviewActionType.SET_PREVIEWS,
    payload: links,
  };
};

export const setCurrentPreview = (currentLinkIndex: number): PreviewAction<number> => {
  return {
    type: PreviewActionType.SET_CURRENT_PREVIEW,
    payload: currentLinkIndex,
  };
};

export default function previewReducer (state: PreviewState = initialState, action: PreviewAction<any>): PreviewState {
  switch (action.type) {
    case PreviewActionType.SET_PREVIEWS:
      return {
        ...state,
        links: action.payload,
      };
    case PreviewActionType.SET_CURRENT_PREVIEW:
      return {
        ...state,
        currentLinkIndex: action.payload,
      };
    default:
      return state;
  }
}

export const usePreviewLinks = (): string[] => {
  return useSelector((state: { preview: PreviewState}) => {
    return state.preview.links;
  }, (a, b) => {
    return a.join(',') === b.join(',');
  });
};

export const useCurrentPreviewIndex = (): number => {
  return useSelector((state: { preview: PreviewState}) => {
    return state.preview.currentLinkIndex;
  }, shallowEqual);
};

export const useCurrentPreviewLink = (): string => {
  return useSelector((state: { preview: PreviewState}) => {
    return state.preview.links[state.preview.currentLinkIndex] || '';
  }, shallowEqual);
};

