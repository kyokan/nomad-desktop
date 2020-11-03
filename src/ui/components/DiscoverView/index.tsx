import React, {ReactElement, useCallback, useEffect, useState} from "react";
import {withRouter, RouteComponentProps} from "react-router";
import {PostWithMeta} from 'ddrp-indexer/dist/dao/PostWithMeta';
import {Pageable} from 'ddrp-indexer/dist/dao/Pageable';
import {ReactionType} from 'ddrp-indexer/dist/social/ReactionType';
// @ts-ignore
import CustomView from "../CustomView";
import {useDispatch} from "react-redux";
import {addLikeCount, updateRawPost, usePostsMap, useSelectPost} from "../../ducks/posts";
import {mapPostWithMetaToPost} from "../../../app/util/posts";
import uniq from "lodash.uniq";
import {postIPCMain} from "../../helpers/ipc";
import {IPCMessageRequestType} from "../../../app/types";
import {useCurrentBlocks, userCurrentUserData} from "../../ducks/users";
import {serializeUsername} from "../../helpers/user";
import {useLikePage} from "../../helpers/hooks";

type DiscoverViewProps = {

} & RouteComponentProps<{ postHash?: string }>;

function DiscoverView(props: DiscoverViewProps): ReactElement {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<string[]>([]);
  const [next, setNext] = useState<number | null>(0);
  const postMap = usePostsMap();

  const dispatch = useDispatch();

  const userData = userCurrentUserData();

  const blockedMap = useCurrentBlocks();
  const muted = userData.mutedNames.reduce((acc: {[n: string]: string}, name) => {
    acc[name] = name;
    return acc;
  }, blockedMap);

  const query = useCallback(async (reset?: boolean) => {
    setLoading(true);
    if (typeof next !== 'number') {
      setLoading(false);
      return;
    }

    const payload = await queryNext(reset ? null : next ,[], muted);
    setLoading(false);
    if (reset) {
      // dispatch(scanGlobalMeta());
    }

    const hashes: string[] = [];

    payload.items.map(postWithMeta => {
      const post = mapPostWithMetaToPost(postWithMeta);
      if (!postMap[post.hash]) {
        dispatch(updateRawPost(post));
      }
      hashes.push(post.hash);
    });

    const newList = reset ? uniq(hashes) : uniq(list.concat(hashes));
    setList(newList);
    setNext(payload.next);
  }, [list, next, userData.mutedNames.join(',')]);

  const onSelectPost = useCallback((hash) => {
    props.history.push(`/posts/${hash}`);
  }, []);

  const onLikePost = useLikePage();

  useEffect(() => {
    (function onDiscoveryViewMount() {
      setTimeout(() => query(true), 0);
    }())
  }, [userData.mutedNames.join(',')]);

  return (
    <CustomView
      loading={loading}
      // heroImageUrl="https://picsum.photos/800/160"
      title="Explore Nomad"
      selectedHash={props.match.params.postHash}
      hashes={list}
      onSelectPost={onSelectPost}
      onLikePost={onLikePost}
      onScrolledToBottom={typeof next === 'number' ? query : undefined}
      onTagClick={(tagName: string) => props.history.push(`/tags/${tagName}`)}
      // onUpdateAvatarUrl={() => null}
      // onAvatarUrlChange={() => null}
      panels={[]}
      // hideCoverImage
    />
  );
}

export default withRouter(DiscoverView);

async function queryNext(next: number | null, list: PostWithMeta[] = [], muted: {[u: string]: string} = {}): Promise<Pageable<PostWithMeta, number>> {
  const resp = await postIPCMain({
    type: IPCMessageRequestType.QUERY_POPULAR_POSTS,
    payload: {
      after: 0,
      offset: next,
    }
  }, true);


  if (resp.error) {
    return Promise.reject(resp.error);
  }

  const payload = resp.payload as Pageable<PostWithMeta, number>;
  list = list.concat(payload.items)
    .filter(({ post }) => {
      return !muted[serializeUsername(post.subdomain, post.tld)] && !post.parent && (!post.topic || post.topic[0] !== '.');
    });

  if (list.length < 20 && payload.next) {
    return await queryNext(payload.next, list, muted);
  } else {
    return {
      items: list,
      next: payload.next,
    };
  }
}
