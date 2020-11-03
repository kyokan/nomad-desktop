import React, {CSSProperties, MouseEventHandler, ReactElement, ReactNode, useState} from "react";
import Menuable, {MenuProps} from "../Menuable";
// import {PostWithMeta} from 'ddrp-indexer/dist/dao/PostWithMeta';
import {Pageable} from 'ddrp-indexer/dist/dao/Pageable';
// import * as appActions from "../../ducks/app";
import {useDispatch} from "react-redux";
import {ThunkDispatch} from "redux-thunk";
import {Action} from "redux";
// import {useCurrentUser} from "../../ducks/users";
import MediaView from "../UserView/MediaView";
import "./media-picker.scss";
import Icon from "../Icon";
import CloseIcon from "../../../../static/assets/icons/close-red.svg";
import TickIcon from "../../../../static/assets/icons/tick-green.svg";
import {isTLD} from "../../helpers/user";
import {useCurrentUser} from "../../../../../universal/ducks/users";

type Props = {
  children?: ReactNode;
  className?: string;
  mediaPickerClassName?: string;
  style?: CSSProperties;
  closeMenu?: () => void;
  onMediaUploadClick: () => Promise<string>;
  onMediaHashUpdate?: (hash: string) => void;
  onClose?: () => void;
  onCancel?: MouseEventHandler;
  onConfirm?: MouseEventHandler;
  queryMediaByName: (username: string, next: number | null, list: any[]) => Promise<Pageable<any, number>>;
  items?: MenuProps[];
}

export default function MediaPickerMenuable(props: Props): ReactElement {
  const {
    children,
    className,
    style,
    closeMenu,
    mediaPickerClassName,
    onMediaUploadClick,
    onMediaHashUpdate,
    onClose,
    onConfirm,
    onCancel,
    items: ownItems = [],
  } = props;

  const currentUser = useCurrentUser();

  const {
    items,
    showMediaPicker,
    showConfirm,
    setConfirming,
    setMediaPicker,
  } = useMediaPickerMenuItems(onMediaUploadClick, onMediaHashUpdate, isTLD(currentUser.name));

  return (
    <Menuable
      className={className}
      style={style}
      closeMenu={closeMenu}
      items={[...items, ...ownItems]}
    >
      {children}
      {
        showMediaPicker && (
          <div
            className={`media-picker ${mediaPickerClassName}`}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="media-picker__overlay"
              onClick={() => {
                setMediaPicker(false);
                if (onClose) onClose();
              }}
            />
            <div className="media-picker__view-container" onClick={e => e.stopPropagation()}>
              <MediaView
                queryNext={props.queryMediaByName}
                username={currentUser.name}
                onSelectMedia={(e, hash) => {
                  if (onMediaHashUpdate) onMediaHashUpdate(hash);
                  setMediaPicker(false);
                  setConfirming(true);
                }}
              />
            </div>
          </div>
        )
      }
      {
        showConfirm && onConfirm && (
          <div className="media-picker__confirm">
            <div className="media-picker__confirm__text">Confirm?</div>
            <div className="media-picker__confirm__icons">
              <Icon
                url={CloseIcon}
                onClick={e => {
                  if (onCancel) onCancel(e);
                  setConfirming(false);
                }}
              />
              <Icon
                url={TickIcon}
                onClick={e => {
                  onConfirm(e);
                  setConfirming(false);
                }}
              />
            </div>
          </div>
        )
      }
    </Menuable>
  )
}

export const useMediaPickerMenuItems = (onMediaUploadClick: () => Promise<string>, onMediaHashUpdate?: (hash: string) => void, canUpload?: boolean): {
  items: MenuProps[];
  setMediaPicker: (bool: boolean) => void;
  setConfirming: (bool: boolean) => void;
  showMediaPicker: boolean;
  showConfirm: boolean;
} => {
  const dispatch = useDispatch<ThunkDispatch<any, any, Action>>();
  const [showMediaPicker, setMediaPicker] = useState(false);
  const [showConfirm, setConfirming] = useState(false);
  const items = [];

  if (canUpload) {
    items.push({
      text: 'Choose from Media',
      onClick: () => {
        setMediaPicker(true);
      },
    });

    items.push({
      text: 'Upload from Computer',
      onClick: async () => {
        try {
          const hash = await onMediaUploadClick();

          if (onMediaHashUpdate && hash) {
            onMediaHashUpdate(hash);
          }
          setMediaPicker(false);
          setConfirming(true);
          return;
        } catch (e) {
          // dispatch(appActions.addSystemMessage({
          //   text: e.message,
          //   type: 'error',
          // }));
        }
      }
    });
  }

  return {
    items,
    showConfirm,
    showMediaPicker,
    setConfirming,
    setMediaPicker,
  };
};
