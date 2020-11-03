// @ts-ignore
import React, {ReactElement, useEffect, useState} from 'react';
import './detail.scss';
// @ts-ignore
import {RouteComponentProps, withRouter} from "react-router";
// @ts-ignore
import {Envelope as DomainEnvelope} from '../../../external/indexer/domain/Envelope';
// @ts-ignore
import {Post as DomainPost} from '../../../external/indexer/domain/Post';
import {
  useCommentsFromParentId,
  useFetchMoreComments,
} from "../../ducks/posts";
import {RegularPost} from "../CustomView/CustomViewPosts";
import {mapDomainEnvelopeToPost} from "../../utils/posts";
import {IPCMessageResponse} from "../../../../src/app/types";
import Thread from "../Thread";
import {INDEXER_API} from "../../utils/api";

type Props = {
  postHash?: string;
  onLikePost?: (hash: string) => void;
  onSendReply?: (hash: string) => void;
  onBlockUser?: (hash: string) => void;
  onFollowUser?: (hash: string) => void;
} & RouteComponentProps<{ username?: string; postHash: string }>;

function DetailPane (props: Props): ReactElement {
  // @ts-ignore
  const postHash = props.postHash || window?.JSON_GLOBAL?.postHash || '';

  const [isLoading, setLoading] = useState(false);
  const [parents, setParents] = useState<string[]>([]);
  const comments = useCommentsFromParentId(postHash);
  // const post = usePostId(postHash);
  // const postsMap = usePostsMap();
  // const dispatch = useDispatch();
  const loadMore = useFetchMoreComments(postHash);

  useEffect(() => {
    (async function onDetailPaneUpdate() {
      setLoading(true);
      const results = await queryParents(postHash);
      loadMore();
      setParents(results);
      setLoading(false);
    }())
  }, [postHash]);


  const onSelectPost = (hash: string) => {
    props.history.push(`/posts/${hash}`);
  };

  const onNameClick = (username: string) => {
    props.history.push(`/users/${username}/timeline`);
  };

  const onTagClick = (tag: string) => {
    props.history.push(`/tags/${tag}`);
  };

  return !postHash ? <noscript /> : (
    <div className="detail">
      <div className="detail__header" />
      <div className="detail__content">
        {
          !!parents.length && !isLoading && (
            <div className="detail__parents">
              {parents.map((parentHash: string) => (
                <RegularPost
                  key={parentHash}
                  hash={parentHash}
                  onLikePost={props.onLikePost}
                  onSendReply={props.onSendReply}
                  onBlockUser={props.onBlockUser}
                  onFollowUser={props.onFollowUser}
                  onSelectPost={onSelectPost}
                  onNameClick={onNameClick}
                  onTagClick={onTagClick}
                  canReply
                />
              ))}
            </div>
          )
        }
        {
          !isLoading && (
            <RegularPost
              key={postHash}
              hash={postHash}
              onLikePost={props.onLikePost}
              onSendReply={props.onSendReply}
              onBlockUser={props.onBlockUser}
              onFollowUser={props.onFollowUser}
              onSelectPost={onSelectPost}
              onNameClick={onNameClick}
              onTagClick={onTagClick}
              shouldFetchCommentsOnMount
              canReply
              selected
            />
          )
        }
        <div className="detail__header" />
        <div className="detail__content__thread">
          {
            !isLoading && comments.map(hash => (
              <Thread
                key={hash}
                hash={hash}
                onLikePost={props.onLikePost}
                onSendReply={props.onSendReply}
                onBlockUser={props.onBlockUser}
                onFollowUser={props.onFollowUser}
              />
            ))
          }
          {
            !!comments.length && !(comments.length % 20) && (
              <button
                className="button detail__load-more-btn"
                disabled={isLoading}
                onClick={loadMore}
              >
                Load More
              </button>
            )
          }
        </div>
      </div>
    </div>
  );
}

export default withRouter(DetailPane);

const queryParents = async (postHash: string, ret: string[] = []): Promise<string[]> => {
  const resp = await fetch(`${INDEXER_API}/posts/${postHash}`);
  const json: IPCMessageResponse<DomainEnvelope<DomainPost> | null> = await resp.json();

  if (json.error || !json.payload) {
    return ret;
  }

  const post = mapDomainEnvelopeToPost(json.payload);

  if (post.parent && parent.length < 25) {
    const newRet = [post.parent, ...ret];
    return queryParents(post.parent, newRet);
  }

  return ret;
};
