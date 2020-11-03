import React, {MouseEvent, ReactElement, ReactNode, useCallback, useState} from "react";
import './post-card.scss';
import Markup from "../Markup";
import PostButton from "../PostButton";
import CommentBlackIcon from "../../../../static/assets/icons/reply-black.svg";
import HeartIcon from "../../../../static/assets/icons/heart.svg";
import MoreSmallIcon from "../../../../static/assets/icons/more.svg";
import classNames from "classnames";
import {PostMeta, usePostId} from "../../ducks/posts";
import {
  useCurrentBlocks,
  useCurrentFollowings,
  useCurrentLikes, useCurrentUser, useIdentity, userCurrentMutedNames,
  useUsersMap
} from "../../ducks/users";
import RichTextEditor from "../RichTextEditor";
import {sendReply, updateReplies, useReplies, useReplyId} from "../../ducks/drafts/replies";
import {useDispatch} from "react-redux";
import {DraftPost} from "../../ducks/drafts/type";
import {postIPCMain} from "../../helpers/ipc";
import {IPCMessageRequestType} from "../../../app/types";
import Icon from "../Icon";
import {undotName} from "../../helpers/user";
import PostCardHeader from "./PostCardHeader";
import Attachments from "../Attachments";
import Menuable from "../Menuable";
import {useMuteUser, useUnmuteUser} from "../../ducks/blocklist";
import {useBlockUser} from "../../helpers/hooks";

type Props = {
  type: 'card' | 'compact' | 'title';
  id: string;
  className?: string;
  hash: string;
  title: string;
  topic: string;
  avatar: string;
  creator: string;
  content: string;
  parent: string;
  timestamp: number;
  attachments: string[];
  tags: string[];
  onSelectPost?: (hash: string, creator: string, id: string) => void;
  onLikePost?: (hash: string) => void;
  onNameClick?: (name: string) => void;
  onTagClick?: (tagName: string) => void;
  meta?: PostMeta;
  canReply?: boolean;
  selected?: boolean;
};

export default function PostCard(props: Props): ReactElement {
  const {
    type = 'card',
  } = props;

  switch (type) {
    case "card":
      return <Card {...props} />;
    case "compact":
    case "title":
    default:
      return <></>;
  }
}

function Card(props: Props): ReactElement {
  const {
    hash,
    className,
    creator,
    timestamp,
    avatar,
    onSelectPost,
    onLikePost,
    onNameClick,
    onTagClick,
    meta,
    canReply,
    attachments,
    tags,
    selected,
  } = props;

  const { replyCount, likeCount } = meta || {};
  const [isContentOverflow, setContentOverflow] = useState(false);
  const [isShowingReply, setShowingReply] = useState<boolean>(false);
  const currentLikes = useCurrentLikes();
  const onBlockUser = useBlockUser();
  const onMuteUser = useMuteUser();
  const onUnmuteUser = useUnmuteUser();
  const blockedMap = useCurrentBlocks();
  const mutedNames = userCurrentMutedNames();
  const { name: currentUser } = useCurrentUser();
  const isCurrentUser = creator === currentUser;
  const mutedMap = mutedNames.reduce((acc: {[n: string]: string}, name) => {
    acc[name] = name;
    return acc;
  }, {});

  const likePost = useCallback(() => {
    if (onLikePost) {
      onLikePost(hash);
    }
  }, [hash]);
  const openPost = useOpenPost(props);

  return (
    <div
      tabIndex={onSelectPost ? 1 : undefined}
      // @ts-ignore
      ref={el => setContentOverflow(el?.clientHeight >= 445)}
      className={classNames('post-card', className, {
        'post-card--selectable': onSelectPost,
        'post-card--avatarless': !avatar,
        'post-card--content-overflow': isContentOverflow,
        'post-card--has-attachment': attachments.length,
        'post-card--selected': selected,
      })}
    >
      { renderLikedBy(hash, creator) }
      <PostCardHeader
        avatar={avatar}
        creator={creator}
        timestamp={timestamp}
        onNameClick={onNameClick}
      />
      { renderContent(props) }
      {
        !!tags.length && (
          <div className="post-card__tags">
            {tags.map(tag => (
              <div
                key={tag}
                className="post-card__tags__tag"
                onClick={() => onTagClick && onTagClick(tag)}
              >
                #{tag}
              </div>
            ))}
          </div>
        )
      }
      <div className="post-card__footer">
        {
          !!onLikePost && (
            <PostButton
              iconUrl={HeartIcon}
              text={`${likeCount}`}
              onClick={likePost}
              active={!!currentLikes[hash]}
            />
          )
        }
        {
          !!canReply && (
            <PostButton
              iconUrl={CommentBlackIcon}
              text={`${replyCount}`}
              onClick={() => setShowingReply(!isShowingReply)}
              title={`Reply`}
            />
          )
        }
        {
          (selected && isCurrentUser) ? null : (
            <Menuable
              items={[
                selected ? null : {
                  text: 'Open Post',
                  onClick: openPost,
                },
                (selected || isCurrentUser) ? null : {
                  divider: true,
                },
                isCurrentUser ? null : {
                  text: `${mutedMap[creator] ? 'Unmute' : 'Mute'} @${undotName(creator)}`,
                  onClick: async () => {
                    if (mutedMap[creator]) {
                      await onUnmuteUser(creator);
                    } else {
                      await onMuteUser(creator);
                    }
                  },
                },
                (isCurrentUser || blockedMap[creator]) ? null : {
                  text: `Block @${undotName(creator)}`,
                  onClick: async () => {
                    await onBlockUser(creator);
                  }
                }
              ]}
            >
              <PostButton
                iconUrl={MoreSmallIcon}
                title="More"
              />
            </Menuable>
          )
        }
      </div>
      {renderQuickReplyEditor(hash, isShowingReply, setShowingReply)}
    </div>
  );
}

function renderContent(props: Props): ReactNode {
  const {
    attachments,
    content,
    parent,
    onSelectPost,
    onNameClick,
  } = props;

  const openPost = useOpenPost(props);
  const parentPost = usePostId(parent);

  const replyTitle = parentPost.creator
    ? (
      <>
        <div className="post-card__content__title__text">Replying to</div>
        <span
          className="post-card__content__title__creator"
          onClick={e => {
            e.stopPropagation();
            if (onNameClick) onNameClick(parentPost.creator)
          }}
        >
         @{undotName(parentPost.creator)}
       </span>
      </>
    )
    : '';

  return (
    <div
      className="post-card__content"
      onClick={onSelectPost && openPost}
    >
      { (replyTitle) && (
        <div className="post-card__content__title">
          {replyTitle}
        </div>
      )}
      <Markup content={content} />
      <Attachments attachments={attachments} />
    </div>
  );
}

function useOpenPost(props: Props) {
  const {
    id,
    hash,
    creator,
    onSelectPost,
  } = props;
  return useCallback((e: MouseEvent) => {
    if (window?.getSelection()?.toString()) {
      return;
    }
    if (onSelectPost) {
      onSelectPost(hash, creator, id);
    }
  }, [onSelectPost, hash, creator, id]);
}

function renderLikedBy(hash: string, creator: string): ReactNode {
  const followings = useCurrentFollowings();
  const users = useUsersMap();

  const likedBys = Object.keys(followings)
    .reduce((acc: string[], name: string) => {
      const user = users[name];
      const { likes = {} } = user || {};
      if (likes[hash]) {
        acc.push(`@${name.slice(0, name.length - 1)}`);
      }
      return acc;
    }, []);

  const names: ReactNode[] = [];

  if (!likedBys.length) {
    return null;
  } else if (likedBys.length <= 2) {
    likedBys.forEach((text, i) => {
      names.push(
        <div
          key={'liked-by' + text + i}
          className="post-card__liked-by__username"
        >
          {text}
        </div>
      );
      if (i < likedBys.length - 1) {
        names.push(<div key='liked-by-and' className="post-card__liked-by__username__separator"> and </div>)
      }
    });
  } else if (likedBys.length === 3) {
    likedBys.forEach((text, i) => {
      names.push(
        <div
          key={'liked-by' + text + i}
          className="post-card__liked-by__username"
        >
          {text}
        </div>
      );

      if (i === 1) {
        names.push(<div key={i} className="post-card__liked-by__username__separator">and</div>)
      } else if (i < likedBys.length - 1) {
        names.push(<div key={i} className="post-card__liked-by__username__separator">,</div>)
      }
    });
  } else if (likedBys.length > 3) {
    const rest = `${likedBys.length - 2} more`;
    const firstTwo = [likedBys[0], likedBys[1], rest];
    firstTwo.forEach((text, i) => {
      names.push(
        <div
          key={text + i}
          className="post-card__liked-by__username"
        >
          {text}
        </div>
      );

      if (i === 1) {
        names.push(<div key={i} className="post-card__liked-by__username__separator">and</div>)
      } else if (i < firstTwo.length - 1) {
        names.push(<div key={i} className="post-card__liked-by__username__separator">,</div>)
      }
    });
  }

  return (
    <div className="post-card__liked-by">
      <Icon
        width={14}
        url={HeartIcon}
      />
      <div className="post-card__liked-by__text">by</div>
      {names}
    </div>
  )
}


export function renderQuickReplyEditor(hash: string, isShowingReply: boolean, setShowingReply: (isShowing: boolean) => void): ReactNode {
  const { isSendingReplies } = useReplies();
  const { title, content } = useReplyId(hash);
  const { identities, currentUser } = useIdentity();
  const hasIdentity = !!Object.keys(identities).length;

  const dispatch = useDispatch();

  const onChange = useCallback((draft: DraftPost) => {
    dispatch(updateReplies({
      ...draft,
      parent: hash,
    }));
  }, [dispatch, hash]);

  const onPrimaryClick = useCallback(async () => {
    try {
      await dispatch(sendReply(hash));
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
    postIPCMain({
      type: IPCMessageRequestType.OPEN_NEW_USER_WINDOW,
      payload: null,
    });
  }, []);

  if (!currentUser) {
    return (
      <div
        className={classNames('post__no-user-container', {
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
      className={classNames('post__reply-editor-container', {
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

