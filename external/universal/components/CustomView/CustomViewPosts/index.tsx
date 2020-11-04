import React, {ReactElement, ReactNode, useCallback, useEffect} from "react";
import {useDispatch} from "react-redux";
import { withRouter, RouteComponentProps } from "react-router";
import {
  fetchPostByHash,
  Post,
  useFetchMoreComments,
  usePostId
} from "../../../ducks/posts";
import PostCard from "../../PostCard";
import classNames from "classnames";
import {useFetchUser, useUser} from "../../../ducks/users";

type CustomViewPostsProps = {
  indexerAPI?: string;
  hashes: string[];
  onSelectPost?: (hash: string, creator: string, id: string) => void;
  onLikePost?: (hash: string) => void;
  onBlockUser?: (hash: string) => void;
  onSendReply?: (hash: string) => void;
  onFollowUser?: (hash: string) => void;
  onScrolledToBottom?: () => void;
  onTagClick?: (tagName: string) => void;
  loading: boolean;
  children: ReactNode;
} & RouteComponentProps;

export default withRouter(CustomViewPosts);
function CustomViewPosts(props: CustomViewPostsProps): ReactElement {
  const {
    hashes,
    onSelectPost,
    onLikePost,
    onBlockUser,
    onSendReply,
    onFollowUser,
    onTagClick,
    history,
    loading: loadingPosts,
    children,
  } = props;

  const onNameClick = useCallback((name: string) => {
    history.push(`/users/${name}/timeline`);
  }, [history]);

  return (
    <div className="custom-view__content__posts__resizable">
      <div
        className={classNames("custom-view__content__posts", {
          'custom-view__content__posts--loading': loadingPosts,
        })}
      >
        {children}
        {
          !hashes.length && (
            <span className="custom-view__content__posts__empty-text">
              No Posts
            </span>
          )
        }
        {
          hashes.map((hash: string): ReactNode => {
            return (
              <RegularPost
                key={hash}
                hash={hash}
                onSelectPost={onSelectPost}
                onLikePost={onLikePost}
                onBlockUser={onBlockUser}
                onSendReply={onSendReply}
                onNameClick={onNameClick}
                onTagClick={onTagClick}
                onFollowUser={onFollowUser}
                canReply
              />
            );
          })
        }
      </div>
    </div>
  );
}


type RegularPostProps = {
  hash: string;
  shouldFetchCommentsOnMount?: boolean;
  className?: string;
  canReply?: boolean;
  onSelectPost?: (hash: string, creator: string, id: string) => void;
  onLikePost?: (hash: string) => void;
  onBlockUser?: (hash: string) => void;
  onSendReply?: (hash: string) => void;
  onFollowUser?: (name: string) => void;
  onNameClick?: (name: string) => void;
  onTagClick?: (tagName: string) => void;
  selected?: boolean;
}

export function RegularPost(props: RegularPostProps): ReactElement {
  const dispatch = useDispatch();
  const fetchUser = useFetchUser();
  const post = usePostId(props.hash);
  const user = useUser(post.creator);
  const loadMoreComments = useFetchMoreComments(props.hash);

  useEffect(() => {
    fetchUser(post.creator);
  }, [fetchUser, user]);

  useEffect(() => {
    (async function onRegularPostMount() {
      if (post.pending) return;

      if (!post.id) {
        setTimeout(() => {
          dispatch(fetchPostByHash(props.hash));
        }, 0)
      }

      if (!props.shouldFetchCommentsOnMount) {
        return;
      }

      if (post.meta.replyCount && post.meta.replyCount > post.comments.length) {
        await loadMoreComments();
      }
    }())
  }, [props.hash]);

  return !post
    ? <></>
    : (
      <RawPost
        {...post}
        className={props.className}
        avatar={user?.profilePicture || ''}
        onSelectPost={post.pending ? undefined : props.onSelectPost}
        onLikePost={post.pending ? undefined : props.onLikePost}
        onBlockUser={post.pending ? undefined : props.onBlockUser}
        onSendReply={post.pending ? undefined : props.onSendReply}
        onFollowUser={post.pending ? undefined : props.onFollowUser}
        onNameClick={props.onNameClick}
        canReply={post.pending ? undefined : props.canReply}
        onTagClick={props.onTagClick}
        selected={props.selected}
      />
    );
}

type RawPostProps = {
  onSelectPost?: (hash: string, creator: string, id: string) => void;
  onLikePost?: (hash: string) => void;
  onSendReply?: (hash: string) => void;
  onBlockUser?: (hash: string) => void;
  onFollowUser?: (hash: string) => void;
  onNameClick?: (name: string) => void;
  onTagClick?: (tagName: string) => void;
  avatar: string;
  canReply?: boolean;
  className?: string;
  selected?: boolean;
  pending?: boolean;
} & Post;

export function RawPost(props: RawPostProps): ReactElement {
  const {
    title,
    content,
    timestamp,
    creator,
    topic,
    attachments,
    onSelectPost,
    onLikePost,
    onBlockUser,
    onFollowUser,
    onSendReply,
    onNameClick,
    onTagClick,
    hash,
    id,
    avatar,
    parent,
    meta,
    canReply,
    tags,
    className = '',
    selected,
    pending,
  } = props;

  return (
    <PostCard
      type="card"
      className={className}
      id={id}
      hash={hash}
      avatar={avatar}
      title={title}
      creator={creator}
      content={content}
      parent={parent}
      topic={topic}
      meta={meta}
      timestamp={new Date(timestamp).getTime()}
      onSelectPost={onSelectPost}
      onLikePost={onLikePost}
      onSendReply={onSendReply}
      onBlockUser={onBlockUser}
      onFollowUser={onFollowUser}
      onNameClick={onNameClick}
      onTagClick={onTagClick}
      canReply={canReply}
      attachments={attachments}
      tags={tags}
      selected={selected}
      pending={pending}
    />
  );
}

