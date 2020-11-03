import React, {memo, MouseEventHandler, ReactElement, ReactNode, useCallback, useEffect, useState} from 'react';
import PostButton from '../PostButton';
import CommentIcon from '../../../../static/assets/icons/comment-black.svg';
import ReplyIcon from '../../../../static/assets/icons/reply-black.svg';
import ShareIcon from '../../../../static/assets/icons/share-black.svg';
import ThumbsUpIcon from '../../../../static/assets/icons/thumbs-up.svg';
import ThumbsDownIcon from '../../../../static/assets/icons/thumbs-down.svg';
import './post.scss';
import {mapRawToPost, Post as P, updateComments, updatePost, usePostId} from "../../ducks/posts";
import RichTextEditor from "../RichTextEditor";
import PostHeader from "../PostHeader";
import c from 'classnames';
import {shallowEqual, useDispatch, useSelector} from "react-redux";
import {DraftPost} from "../../ducks/drafts/type";
import * as repliesActions from "../../ducks/drafts/replies";
import {useReplies, useReplyId} from "../../ducks/drafts/replies";
import {useIdentity, UsersState} from "../../ducks/users";
import {postIPCMain} from "../../helpers/ipc";
import {IPCMessageRequestType, ResponsePost} from "../../../app/types";
import Markup from "../Markup";
import Menuable from "../Menuable";
import {MenuPortal, MenuPortalable} from "../Menuable/menu-portal";
import {shell} from "electron";

type ComponentProps = {
  hash: string;
  className?: string;
  onCommentClick?: MouseEventHandler;
  onNameClick?: MouseEventHandler;
  noComments?: boolean;
}

type Props = ComponentProps

function Post(props: Props): ReactElement {
  const post = usePostId(props.hash);
  const {
    title,
    content,
    hash,
    id,
    creator,
    meta: {
      replyCount,
    },
  } = post;

  const {
    className = '',
    onCommentClick,
    onNameClick,
    noComments,
  } = props;

  const [isShowingReply, setShowingReply] = useState<boolean>(false);
  const dispatch = useDispatch();

  useEffect(() => {
    if (noComments) return;
    (async function onThreadedPostMount() {
      const resp = await postIPCMain({
        type: IPCMessageRequestType.QUERY_POSTS_WITH_PARENT,
        payload: {
          parent: hash,
        },
      }, true);

      if (resp.error) {
        return;
      }

      const payload = resp.payload as ResponsePost[];

      const comentHashes = payload.map(post => {
        dispatch(updatePost(mapRawToPost(post)));
        return post.hash;
      });

      dispatch(updateComments(hash, comentHashes));
    }())
  }, [hash]);

  const onReplyClick = useCallback(
    () => setShowingReply(!isShowingReply),
    [isShowingReply, setShowingReply],
  );

  return (
    <div className={`post ${className}`}>
      <PostHeader hash={hash} className="post__top" onNameClick={onNameClick} />
      { renderContent(title, content) }
      { renderFooter(id, creator, replyCount, onReplyClick, onCommentClick)}
      { renderQuickReplyEditor(post, isShowingReply, setShowingReply) }
    </div>
  );
}

export default memo(Post);

function renderContent(title: string, content: string): ReactNode {
  return (
    <div className="post__content">
      { title && <div className="post__title">{title.slice(2)}</div> }
      <Markup content={content} />
    </div>
  );
}

export function PostFooter(props: {className?: string; id: string; creator: string; numOfComments: number; previewUrl?: string; onReplyClick: MouseEventHandler; onCommentClick?: MouseEventHandler}): ReactElement {
  return <div className={props.className}>{renderFooter(props.id, props.creator, props.numOfComments, props.onReplyClick, props.onCommentClick, props.previewUrl)}</div>;
}

function renderFooter(id: string, creator: string, numOfComments: number, onReplyClick: MouseEventHandler, onCommentClick?: MouseEventHandler, previewUrl?: string): ReactNode {
  const onShareClick = useCallback(() => {
    postIPCMain({
      type: IPCMessageRequestType.OPEN_NEW_POST_WINDOW,
      payload: {
        previewUrl: previewUrl || `ddrp://${creator.slice(0, creator.length - 1)}/${id}`,
      },
    });
  }, []);
  return (
    <div className="post__bottom">
      <PostButton
        className={c("post__action-btn", {
          'post__action-btn--disabled': !numOfComments,
          'post__action-btn--hoverable': !!numOfComments,
        })}
        iconUrl={CommentIcon}
        text={String(numOfComments)}
        onClick={onCommentClick}
      />
      <PostButton
        className="post__action-btn post__action-btn--hoverable"
        iconUrl={ReplyIcon}
        text="Reply"
        onClick={onReplyClick}
      />
      <MenuPortalable
        className="post__action-btn--menuable"
        items={[
          {
            text: 'Embed in New Post',
            onClick: (e, closeMenu) => {
              e.stopPropagation();
              postIPCMain({
                type: IPCMessageRequestType.OPEN_NEW_POST_WINDOW,
                payload: {
                  previewUrl: previewUrl || `ddrp://${creator.slice(0, creator.length - 1)}/${id}`,
                },
              });

              if (closeMenu) closeMenu();
            }
          }
        ]}
      >
        <PostButton
          className="post__action-btn post__action-btn--hoverable"
          iconUrl={ShareIcon}
          text="Share"
          // onClick={onShareClick}
        />
      </MenuPortalable>
      <div className="post__bottom-right">
        <PostButton
          iconUrl={ThumbsUpIcon}
          text={String(0)}
        />
        <PostButton
          iconUrl={ThumbsDownIcon}
          text={String(0)}
        />
      </div>
    </div>
  );
}

export function renderQuickReplyEditor(post: P, isShowingReply: boolean, setShowingReply: (isShowing: boolean) => void): ReactNode {
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  const { hash } = post;
  const { isSendingReplies } = useReplies();
  const { title, content } = useReplyId(hash);
  const { identities, currentUser } = useIdentity();
  const hasIdentity = !!Object.keys(identities).length;

  const dispatch = useDispatch();

  const onChange = useCallback((draft: DraftPost) => {
    dispatch(repliesActions.updateReplies({
      ...draft,
      parent: hash,
    }));
  }, [dispatch, post.hash]);

  const onPrimaryClick = useCallback(async () => {
    try {
      await dispatch(repliesActions.sendReply(hash));
      setShowingReply(false);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }

  }, [hash]);

  const onSecondaryClick = useCallback(() => {
    setShowingReply(false);
  }, [isShowingReply, setShowingReply]);

  const onAddUser = useCallback(() => {
    if (!hasIdentity) {
      postIPCMain({
        type: IPCMessageRequestType.OPEN_NEW_USER_WINDOW,
      });
    }
  }, []);

  if (!currentUser) {
    return (
      <div
        className={c('post__no-user-container', {
          'post__no-user-container--replying': isShowingReply,
        })}
      >
        <div className="post__no-user">
          {
            hasIdentity
              ? (
                <>
                  <div className="post__no-user-text">Please login to leave a comment</div>
                </>
              )
              : (
                <>
                  <div className="post__no-user-text">Please add a user to leave a comment</div>
                  <button
                    className="button post__no-user-btn"
                    onClick={onAddUser}
                  >
                    Add User
                  </button>
                </>
              )
          }
        </div>
      </div>
    );
  }

  return (
    <div
      className={c('post__reply-editor-container', {
        'post__reply-editor-container--replying': isShowingReply,
      })}
    >
      {
        isShowingReply && (
          <RichTextEditor
            className="post__reply-editor"
            onChange={onChange}
            onSecondaryClick={onSecondaryClick}
            onPrimaryClick={onPrimaryClick}
            disabled={isSendingReplies}
            primaryBtnProps={{
              disabled: !title && !content,
              className: isSendingReplies ? 'loading' : '',
            }}
            embedded
          />
        )
      }
    </div>
  )
}
