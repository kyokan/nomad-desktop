import React, {
  ChangeEvent,
  ChangeEventHandler,
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import "./new-post-root.scss";
import "../index.scss";
import "./styles/app.scss";
import "./styles/menu.scss";
import NewPostHeader from "../../components/Header/NewPostHeader";
import {addTag, EditorMode, removeTag, useDraftPost} from '../../ducks/drafts';
import {useDispatch, useSelector} from "react-redux";
import {NewPostRootState} from "../../store/configureNewPostStore";
import {DraftPost} from "../../ducks/drafts/type";
import Spinner from "../../components/Spinner";
import {MessagePort} from "../../components/SystemMessage";
import {fetchCurrentUserData, fetchIdentity, updateCurrentUser, useCurrentUser} from "../../ducks/users";
import {ipcRenderer} from "electron";
import {IPCMessageRequest, IPCMessageRequestType} from "../../../app/types";
import {useUpdateDraft} from "../../../../external/universal/ducks/drafts";
import MarkdownEditor from "../../../../external/universal/components/MarkdownEditor";
import {useFetchUser} from "../../../../external/universal/ducks/users";
import Attachments from "../../../../external/universal/components/Attachments";

export default function NewPostRoot (): ReactElement {
  const dispatch = useDispatch();
  const draftPost = useDraftPost();
  const _updateDraft = useUpdateDraft();
  const updateDraft = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    _updateDraft({
      ...draftPost,
      content: e.target.value,
    });
  }, [
    _updateDraft,
    draftPost.attachments.join(','),
    draftPost.parent,
    draftPost.context,
    draftPost.tags.join(','),
    draftPost.timestamp,
    draftPost.type,
    draftPost.topic,
  ]);

  const {
    isSendingPost,
    draftMode,
  } = useSelector((state: NewPostRootState) => ({
    isSendingPost: state.drafts.isSendingPost,
    draftMode: state.drafts.draftMode,
  }));

  const { name } = useCurrentUser();
  const fetchUser = useFetchUser();

  useEffect(function onNewPostRootMount() {
    dispatch(fetchIdentity());
    ipcRenderer.on('pushMessage', (_: any, message: IPCMessageRequest<any>) => {
      switch (message.type) {
        case IPCMessageRequestType.CURRENT_IDENTITY_CHANGED:
          dispatch(updateCurrentUser(message.payload));
          dispatch(fetchCurrentUserData());
          return;
        default:
          return;
      }
    });
  }, [dispatch]);

  useEffect(() => {
    (async function onNewPostRootUpdate() {
      if (name) {
        fetchUser(name);
      }
    }());
  }, [name, fetchUser]);


  const [isShowingMarkdownPreview, setMarkdownPreview] = useState(false);
  const [draftTag, setDraftTag] = useState('');
  const [isEditing, setEditing] = useState(false);
  const onBlur = useCallback(() => {
    if (draftTag) {
      dispatch(addTag(draftTag));
      setDraftTag('');
    }
    setEditing(false);
  }, [draftTag]);

  return (
    <div className="new-post">
      <NewPostHeader
        onPreviewToggle={() => setMarkdownPreview(!isShowingMarkdownPreview)}
        isPreviewing={isShowingMarkdownPreview}
      />
      <div className="content">
        { renderEditor(draftMode, isSendingPost, updateDraft, isShowingMarkdownPreview, draftPost) }
        {
          isSendingPost && (
            <div className="loading-overlay">
              <Spinner/>
            </div>
          )
        }
        <MessagePort/>
      </div>
      <Attachments
        attachments={draftPost.attachments}
        onClick={() => {
          _updateDraft({
            ...draftPost,
            attachments: [],
          });
        }}
      />
      <div className="new-post__tags">
        {
          draftPost.tags.map(tag => (
            <div
              key={`#${tag}`}
              className="new-post__tags__draft-tag"
              onClick={() => dispatch(removeTag(tag))}
            >
              #{tag}
            </div>
          ))
        }
        <div
          className="new-post__tags__input-container"
          onClick={() => setEditing(true)}
        >
          {isEditing ? `#` : ''}
          {isEditing && (
            <div className="new-post__tags__tag-input">
              {`${draftTag}`}
            </div>
          )}
          {!isEditing && (
            <div className="new-post__tags__tag">
              + Add New Tag
            </div>
          )}
          {isEditing && (
            <input
              className="new-post__tags__input"
              type="text"
              onBlur={onBlur}
              onChange={(e) => {
                setDraftTag(e.target.value);
              }}
              autoFocus
            />
          )}
        </div>
      </div>
    </div>
  );
}

function renderEditor(draftMode: EditorMode, isSendingPost: boolean, updateDraft: ChangeEventHandler, isShowingMarkdownPreview: boolean, draftPost: DraftPost): ReactNode {
  switch(draftMode) {
    case EditorMode.MARKDOWN:
      return (
        <MarkdownEditor
          className="new-post__md-editor"
          onChange={updateDraft}
          disabled={isSendingPost}
          isShowingMarkdownPreview={isShowingMarkdownPreview}
          value={draftPost.content}
          attachments={[]}
        />
      );
    default:
      return null;
  }
}
