import React, {MouseEvent, ReactElement, ReactNode, useCallback, useEffect, useState} from "react";
import Header from "./index";
import PaperPlaneIcon from "../../../../static/assets/icons/paper-plane.svg";
import HeaderButton from "../HeaderButton";
import Menuable from "../Menuable";
import SettingIcon from "../../../../static/assets/icons/setting.svg";
import TickIcon from "../../../../static/assets/icons/tick.svg";
import AttachIcon from "../../../../static/assets/icons/attach.svg";
import './new-post-header.scss';
import {shallowEqual, useDispatch, useSelector} from "react-redux";
import {NewPostRootState} from "../../store/configureNewPostStore";
import * as draftsActions from '../../ducks/drafts';
import {addAttachment, EditorMode, updateDraft, useDraftPost} from '../../ducks/drafts';
import * as appActions from '../../ducks/app';
import {ThunkDispatch} from "redux-thunk";
import {Action} from "redux";
import {createNewDraft, DraftPost} from "../../ducks/drafts/type";
import c from 'classnames';
import MediaPickerMenuable from "../MediaPickerMenuable";
import {useFileUpload, useQueryMediaForName} from "../../helpers/hooks";
import {useCurrentUsername} from "../../../../../universal/ducks/users";
import {undotName} from "../../../../../universal/utils/user";

type Props = {
  onPreviewToggle?: () => void;
  isPreviewing?: boolean;
}

export default function NewPostHeader(props: Props): ReactElement {
  const {
    post,
    isSendingPost,
    draftMode,
  } = useSelector((state: NewPostRootState) => ({
    post: state.drafts.post,
    isSendingPost: state.drafts.isSendingPost,
    draftMode: state.drafts.draftMode,
  }), shallowEqual);

  const dispatch = useDispatch<ThunkDispatch<any, any, Action>>();
  const currentUsername = useCurrentUsername();

  const sendNewPost = useCallback(async () => {
    dispatch(draftsActions.setSendingPost(true));
    try {
      await dispatch(draftsActions.sendNewPost());
      dispatch(draftsActions.setSendingPost(false));
      window.close();
    } catch (e) {

      dispatch(appActions.addSystemMessage({
        text: (/leveldb: not found/gi).test(e.message)
          ? `${undotName(currentUsername)} has not been discovered`
          : e.message,
        type: 'error',
      }));
      dispatch(draftsActions.setSendingPost(false));
    }
  }, [dispatch, currentUsername]);

  const selectMarkdownEditor = useCallback((e: MouseEvent) => {
    dispatch(draftsActions.setEditorMode(EditorMode.MARKDOWN));
  }, [dispatch]);

  const onAddAttachment = useCallback((hash: string) => {
    dispatch(addAttachment(hash));
  }, [dispatch]);
  //
  // const onClearBlob = useCallback(async () => {
  //   await postIPCMain({
  //     type: IPCMessageRequestType.SEND_NEW_POST,
  //     payload: {
  //       draft: createNewDraft({
  //         content: '',
  //         topic: '.truncate',
  //       }),
  //       truncate: true,
  //     },
  //   });
  //   await postIPCMain({
  //     type: IPCMessageRequestType.SEND_UPDATE_FOR_CURRENT_USER,
  //     payload: {},
  //   });
  // }, [postIPCMain]);

  const fileUpload = useFileUpload();
  const queryMediaByName = useQueryMediaForName();

  return (
    <Header
      title="New Post"
      className="new-post-header"
    >
      <HeaderButton
        iconUrl={PaperPlaneIcon}
        onClick={sendNewPost}
        disabled={!isPostSendable(draftMode, isSendingPost, post)}
      />
      {/*<HeaderButton*/}
      {/*  iconUrl={TrashIcon}*/}
      {/*  onClick={onClearBlob}*/}
      {/*>*/}
      {/*  Clear Blob*/}
      {/*</HeaderButton>*/}
      <div className="header__flex" />
      {renderNewPostActions(props, draftMode)}
      {/*<MediaPickerMenuable*/}
      {/*  mediaPickerClassName="new-post-header__media-picker"*/}
      {/*  queryMediaByName={queryMediaByName}*/}
      {/*  onMediaUploadClick={fileUpload}*/}
      {/*  onMediaHashUpdate={onAddAttachment}*/}
      {/*>*/}
      {/*  <HeaderButton*/}
      {/*    iconUrl={AttachIcon}*/}
      {/*    showCaret*/}
      {/*  >*/}
      {/*    Attach*/}
      {/*  </HeaderButton>*/}
      {/*</MediaPickerMenuable>*/}
      {/*<Menuable*/}
      {/*  items={[*/}
      {/*    // {*/}
      {/*    //   iconUrl: draftMode === EditorMode.SIMPLE ? TickIcon : '',*/}
      {/*    //   text: 'Simple Editor',*/}
      {/*    //   onClick: selectSimpleEditor,*/}
      {/*    // },*/}
      {/*    // {*/}
      {/*    //   iconUrl: draftMode === EditorMode.RICH_TEXT ? TickIcon : '',*/}
      {/*    //   text: 'Rich Text Editor',*/}
      {/*    //   onClick: selectRichTextEditor,*/}
      {/*    // },*/}
      {/*    {*/}
      {/*      iconUrl: draftMode === EditorMode.MARKDOWN ? TickIcon : '',*/}
      {/*      text: 'Markdown Editor',*/}
      {/*      onClick: selectMarkdownEditor,*/}
      {/*    },*/}
      {/*  ]}*/}
      {/*>*/}
      {/*  <HeaderButton iconUrl={SettingIcon} showCaret />*/}
      {/*</Menuable>*/}
    </Header>
  )
}

function isPostSendable(draftMode: EditorMode, isSendingPost: boolean, post?: DraftPost): boolean {
  if (isSendingPost) {
    return false;
  }

  if (!post) {
    return false;
  }

  if (!post.title && !post.content) {
    return false;
  }

  return true;
}

function renderNewPostActions(props: Props, draftMode: EditorMode): ReactNode {
  const [link, setLink] = useState('');
  const dispatch = useDispatch();

  const draftPost = useDraftPost() || createNewDraft();

  switch (draftMode) {
    case EditorMode.SIMPLE:
      return (
        <>
          <Menuable
            items={[
              {
                forceRender: (closeMenu) => {
                  return (
                    <div
                      className="new-post-header__add-link-wrapper"
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={link}
                        onChange={e => setLink(e.target.value)}
                      />
                      <button
                        className="button"
                        disabled={!link}
                        onClick={() => {
                          dispatch(updateDraft({
                            ...draftPost,
                            content: `![](${link})`,
                          }));
                          setLink('');
                          if (closeMenu) closeMenu();
                        }}
                      >
                        Confirm
                      </button>
                    </div>
                  )
                },
              }
            ]}
          >
            <button
              className={c('button header-button', {
                'button--active': props.isPreviewing,
              })}
              // onClick={props.onPreviewToggle}
            >
              Add Link
            </button>
          </Menuable>
        </>
      )
    case EditorMode.MARKDOWN:
      return (
        <button
          className={c('header-button', {
            // 'button--active': !props.isPreviewing,
          })}
          onClick={props.onPreviewToggle}
        >
          {!props.isPreviewing ? 'Preview' : 'Switch to Markdown'}
        </button>
      );
    default:
      return null;
  }
}
