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
  useCurrentLikes, useCurrentUsername, useIdentity, userCurrentMutedNames,
  useUsersMap
} from "../../ducks/users";
import {updateReplies, useReplies, useReplyId} from "../../ducks/drafts/replies";
import {useDispatch} from "react-redux";
import Icon from "../Icon";
import PostCardHeader from "./PostCardHeader";
import Attachments from "../Attachments";
import Menuable, {MenuProps} from "../Menuable";
import {useMuteUser, useUnmuteUser} from "../../ducks/blocklist";
import {parseUsername, undotName} from "../../utils/user";
import Button from "../Button";
import {createNewDraft} from "../../ducks/drafts/type";
import {RichTextEditor} from "../ComposeView";

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
  onBlockUser?: (username: string) => void;
  onFollowUser?: (username: string) => void;
  onSendReply?: (hash: string) => void;
  onNameClick?: (name: string) => void;
  onTagClick?: (tagName: string) => void;
  meta?: PostMeta;
  canReply?: boolean;
  selected?: boolean;
  pending?: boolean;
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
    onSendReply,
    pending,
  } = props;

  const { replyCount = 0, likeCount = 0 } = meta || {};
  const [isContentOverflow, setContentOverflow] = useState(false);
  const [isShowingReply, setShowingReply] = useState<boolean>(false);
  const currentLikes = useCurrentLikes();
  // const onMuteUser = useMuteUser();
  // const onUnmuteUser = useUnmuteUser();
  // const blockedMap = useCurrentBlocks();
  const mutedNames = userCurrentMutedNames();
  const currentUser = useCurrentUsername();
  // const isCurrentUser = creator === currentUser;

  // const mutedMap = (mutedNames || []).reduce((acc: {[n: string]: string}, name) => {
  //   acc[name] = name;
  //   return acc;
  // }, {});

  const likePost = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    if (onLikePost) {
      onLikePost(hash);
    }
  }, [hash, onLikePost]);
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
        'post-card--pending': pending,
      })}
      onClick={openPost}
    >
      { renderLikedBy(hash, creator) }
      <PostCardHeader
        avatar={avatar}
        creator={creator}
        timestamp={pending ? 'pending' : timestamp}
        onNameClick={onNameClick}
      />
      { renderContent(props) }
      {
        !!tags?.length && (
          <div className="post-card__tags">
            {Array.from(new Set(tags)).map(tag => !!tag && (
              <div
                key={tag}
                className="post-card__tags__tag"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTagClick) onTagClick(tag)
                }}
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
            // @ts-ignore
            <PostButton
              iconUrl={HeartIcon}
              text={`${likeCount}`}
              onClick={likePost}
              active={!!currentLikes[hash]}
              disabled={!currentUser}
            />
          )
        }
        {
          !!canReply && (
            // @ts-ignore
            <PostButton
              className={classNames({
                'post-card__footer__reply-btn--opened': isShowingReply,
              })}
              iconUrl={CommentBlackIcon}
              text={`${replyCount}`}
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
                setShowingReply(!isShowingReply)
              }}
              title={`Reply`}
              disabled={!currentUser}
            />
          )
        }
        { renderPostMenu(props) }
      </div>
      {renderQuickReplyEditor(hash, isShowingReply, setShowingReply, onSendReply)}
    </div>
  );
}

function renderPostMenu(props: Props): ReactNode {
  const {
    onSelectPost,
    onBlockUser,
    onFollowUser,
    selected,
    creator,
  } = props;
  const postItems: MenuProps[] = [];
  const userItems: MenuProps[] = [];
  const openPost = useOpenPost(props);
  const currentUsername = useCurrentUsername();
  const currentBlocks = useCurrentBlocks();
  const currentFollowings = useCurrentFollowings();

  let items: MenuProps[] = [];

  if (!selected && onSelectPost) {
    postItems.push({
      text: 'Open Post',
      onClick: openPost,
    });
  }

  if (onBlockUser && currentUsername !== creator && !currentBlocks[creator]) {
    userItems.push({
      text: `Block @${undotName(creator)}`,
      onClick: () => {
        try {
          if (onBlockUser) onBlockUser(creator);
        } catch (err) {

        }
      }
    });
  }

  if (onFollowUser && currentUsername !== creator && !currentFollowings[creator]) {
    userItems.push({
      text: `Follow @${undotName(creator)}`,
      onClick: () => {
        if (onFollowUser) onFollowUser(creator);
      }
    });
  }

  if (postItems.length) {
    items = items.concat(postItems);
  }

  if (postItems.length && userItems.length) {
    items.push({ divider: true });
  }

  if (userItems.length) {
    items = items.concat(userItems);
  }

  return !!items.length && (
    // @ts-ignore
    <Menuable items={items}>
      {(
        // @ts-ignore
        <PostButton
          iconUrl={MoreSmallIcon}
          title="More"
        />
      )}
    </Menuable>
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
    selected,
  } = props;
  return useCallback((e: MouseEvent) => {
    e.stopPropagation();
    if (window?.getSelection()?.toString()) {
      return;
    }
    if (onSelectPost && !selected) {
      onSelectPost(hash, creator, id);
    }
  }, [onSelectPost, hash, creator, id, selected]);
}

function renderLikedBy(hash: string, creator: string): ReactNode {
  const followings = useCurrentFollowings();
  const users = useUsersMap();

  const likedBys = Object.keys(followings)
    .reduce((acc: string[], name: string) => {
      const user = users[name];
      const { likes = {} } = user || {};
      if (likes[hash]) {
        acc.push(`@${parseUsername(name).tld}`);
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
      {(
        // @ts-ignore
        <Icon
          width={14}
          url={HeartIcon}
        />
      )}

      <div className="post-card__liked-by__text">by</div>
      {names}
    </div>
  )
}


export function renderQuickReplyEditor(hash: string, isShowingReply: boolean, setShowingReply: (isShowing: boolean) => void, onSendReply?: (hash: string) => void): ReactNode {
  const { isSendingReplies } = useReplies();
  const replyDraft = useReplyId(hash);
  const content = replyDraft.content;
  const { identities, currentUser } = useIdentity();
  const hasIdentity = !!Object.keys(identities).length;

  const dispatch = useDispatch();

  const onChange = useCallback((content: string) => {
    dispatch(updateReplies({
      ...replyDraft,
      content: content,
      parent: hash,
    }));
  }, [dispatch, hash]);

  const onPrimaryClick = useCallback(async () => {
    if (isSendingReplies || !onSendReply) return;
    await onSendReply(hash);
    dispatch(updateReplies(createNewDraft({
      parent: hash,
    })));
    setShowingReply(false);
  }, [hash, isSendingReplies, onSendReply]);

  const onSecondaryClick = useCallback(() => {
    setShowingReply(false);
    dispatch(updateReplies({
      ...replyDraft,
      content: content,
      parent: hash,
    }));
  }, [isShowingReply, setShowingReply]);

  const onAddUser = useCallback(() => {
    // postIPCMain({ type: IPCMessageRequestType.OPEN_NEW_USER_WINDOW });
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
      onClick={e => e.stopPropagation()}
    >
      {
        isShowingReply && (
          <>
            <RichTextEditor
              className="post__reply-editor"
              onChange={onChange}
              content={content}
              disabled={isSendingReplies}
              isShowingMarkdown={false}
            />
            <div className="post__reply-editor__actions">
              <Button
                onClick={onSecondaryClick}
              >
                Cancel
              </Button>
              <Button
                disabled={isSendingReplies || !content}
                onClick={onPrimaryClick}
                loading={isSendingReplies}
              >
                Send
              </Button>
            </div>
          </>
        )
      }
    </div>
  )
}
