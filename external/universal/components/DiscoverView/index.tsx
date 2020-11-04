import React, {ReactElement, useCallback, useEffect, useState} from "react";
import {withRouter, RouteComponentProps} from "react-router";
import {Envelope as DomainEnvelope} from '../../../indexer/domain/Envelope';
import {Post as DomainPost} from '../../../indexer/domain/Post';
import {Pageable} from '../../../indexer/dao/Pageable';
import CustomView from "../CustomView";
import {useDispatch} from "react-redux";
import {updateRawPost, usePostsMap} from "../../ducks/posts";
import uniq from "lodash.uniq";
import {useCurrentBlocks, userCurrentUserData} from "../../ducks/users";
import {mapDomainEnvelopeToPost} from "../../utils/posts";
import {serializeUsername} from "../../utils/user";
import {INDEXER_API} from "../../utils/api";
import {addTag, addUser} from "../../ducks/search";


type DiscoverViewProps = {
 onLikePost: (postHash: string) => void;
 onSendReply: (postHash: string) => void;
 onBlockUser: (postHash: string) => void;
 onFollowUser: (postHash: string) => void;
} & RouteComponentProps<{ postHash?: string }>;

function DiscoverView(props: DiscoverViewProps): ReactElement {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<string[]>([]);
  const [next, setNext] = useState<number | null>(0);
  const postMap = usePostsMap();

  const dispatch = useDispatch();

  const userData = userCurrentUserData();

  const blockedMap = useCurrentBlocks();
  const muted = (userData?.mutedNames || []).reduce((acc: {[n: string]: string}, name) => {
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

    const hashes: string[] = [];

    payload.items.map((postWithMeta: DomainEnvelope<DomainPost>) => {
      const post = mapDomainEnvelopeToPost(postWithMeta);
      if (!postMap[post.hash]) {
        dispatch(updateRawPost(post));
      }
      hashes.push(post.hash);
    });

    const newList = reset ? uniq(hashes) : uniq(list.concat(hashes));
    setList(newList);
    setNext(payload.next);
  }, [list, next, Object.keys(muted).join(',')]);

  const onSelectPost = useCallback((hash: string) => {
    props.history.push(`/posts/${hash}`);
  }, []);

  const onTagClick = useCallback((tag: string) => {
    dispatch(addTag(tag));
    dispatch(addUser('*'));
    props.history.push(`/search`);
  }, [dispatch]);

  useEffect(() => {
    (function onDiscoveryViewMount() {
      setTimeout(() => query(true), 0);
    }())
  }, [Object.keys(muted).join(',')]);

  useEffect(() => {
    return () => {
      stop();
    }
  }, []);

  return (
    <CustomView
      loading={loading}
      title="Explore Nomad"
      selectedHash={props.match.params.postHash}
      hashes={list}
      onSelectPost={onSelectPost}
      onLikePost={props.onLikePost}
      onSendReply={props.onSendReply}
      onBlockUser={props.onBlockUser}
      onFollowUser={props.onFollowUser}
      onScrolledToBottom={typeof next === 'number' && next > -1 ? query : undefined}
      onTagClick={onTagClick}
      // onUpdateAvatarUrl={() => null}
      // onAvatarUrlChange={() => null}
      panels={[]}
      // hideCoverImage
    />
  );
}

export default withRouter(DiscoverView);

async function queryNext(next: number | null, list: DomainEnvelope<DomainPost>[] = [], muted: {[u: string]: string} = {}): Promise<Pageable<DomainEnvelope<DomainPost>, number>> {
  if (next !== null &&  next < 0) {
    return {
      items: [],
      next: -1,
    };
  }

  const resp = await fetch(`${INDEXER_API}/posts?order=DESC&limit=10${next ? '&offset=' + next : ''}`);
  const json = await resp.json();

  if (json.error) {
    return Promise.reject(json.error);
  }

  const payload = json.payload as Pageable<DomainEnvelope<DomainPost>, number>;
  list = list.concat(payload.items)
    .filter(env => {
      return (
        !muted[serializeUsername(env.subdomain, env.tld)] &&
        !env.message.reference &&
        (!env.message.topic || env.message.topic[0] !== '.')
      );
    });

  if (list.length < 10 && payload.next && payload.next > -1) {
    return await queryNext(payload.next, list, muted);
  } else {
    return {
      items: list,
      next: payload.next,
    };
  }
}
