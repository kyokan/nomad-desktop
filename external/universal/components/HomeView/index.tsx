import React, {ReactElement, useCallback, useEffect, useState} from 'react';
import {RouteComponentProps, withRouter} from 'react-router';
import {Envelope as DomainEnvelope} from 'fn-client/lib/application/Envelope';
import {Post as DomainPost} from 'fn-client/lib/application/Post';
import {Pageable} from  '../../../external/indexer/dao/Pageable';
import CustomView from "../CustomView";
import {
  useCurrentFollowings,
  useCurrentUser, userCurrentMutedNames,
} from "../../ducks/users";
import {updateRawPost, usePostsMap} from "../../ducks/posts";
// @ts-ignore
import {useDispatch} from "react-redux";
// @ts-ignore
import uniq from "lodash.uniq";
import {CustomViewPanelType} from "../CustomView/CustomViewPanel";
import {mapDomainEnvelopeToPost} from "../../utils/posts";
import {INDEXER_API} from "../../utils/api";
import {Filter} from "../../utils/filter";
import {serializeUsername} from "../../utils/user";
import {addTag} from "../../ducks/search";
type Props = {
  onLikePost: (hash: string) => void;
  onSendReply: (hash: string) => void;
  onBlockUser: (hash: string) => void;
  onFollowUser: (hash: string) => void;
} & RouteComponentProps;

function HomeView(props: Props): ReactElement {
  const { name: currentUser } = useCurrentUser();
  const mutedNames = userCurrentMutedNames();
  const muted = (mutedNames || []).reduce((acc: {[n: string]: boolean}, name) => {
    acc[name] = !!name;
    return acc;
  }, {});
  const dispatch = useDispatch();

  const onSelectPost = useCallback((postHash: string) => {
    props.history.push(`/posts/${postHash}`);
  }, [props.history]);

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<string[]>([]);
  const [next, setNext] = useState<number | null>(0);
  const [showPosts, setShowPosts] = useState(true);
  const [showLikes, setShowLikes] = useState(true);
  const [showReplies, setShowReplies] = useState(true);
  const postMap = usePostsMap();

  const followings = useCurrentFollowings();

  const query = useCallback(async (reset?: boolean) => {
    setLoading(true);
    if (typeof next !== "number" && !reset) {
      setLoading(false);
      return;
    }

    if (!Object.keys(followings).length) {
      setList([]);
      setLoading(false);
      return ;
    }
    if (!showReplies && !showLikes && !showPosts)  {
      setLoading(false);
      setList([]);
      return
    }

    const payload = await queryNext({
      postedBy: showPosts ? Object.keys(followings) : [],
      likedBy: [],
      repliedBy: [],
      postHashes: [],
      parentHashes: [],
      allowedTags: [],
    }, next, [], muted);
    setLoading(false);
    const hashes: string[] = [];

    payload.items.map((envelope: DomainEnvelope<DomainPost>) => {
      const post = mapDomainEnvelopeToPost(envelope);
      if (!postMap[post.hash]) {
        dispatch(updateRawPost(post));
      }
      hashes.push(post.hash);
    });

    if (reset) {
      setList(uniq(hashes));
    } else {
      setList(uniq(list.concat(hashes)));
    }
    setNext(payload.next);
  }, [list, currentUser, next, muted, followings, showPosts, showLikes, showReplies]);

  useEffect(() => {
    (async function onHomeViewMount() {
      // dispatch(fetchUserFollowings(currentUser));
      // dispatch(fetchCurrentUserLikes());
    }())
  }, [currentUser]);

  useEffect(() => {
    (async function onFollowingsUpdateMount() {
      Object.keys(followings)
        .forEach(name => {
          // dispatch(fetchUserLikes(name));
        })
    }())
  }, [followings, showPosts, showLikes, showReplies]);

  useEffect(() => {
    (async function onListRefresh() {
      await query(true);
    }())
  }, [currentUser, showPosts, showLikes, showReplies, followings]);

  const onTagClick = useCallback((tagName: string) => {
    dispatch(addTag(tagName));
    props.history.push(`/search`);
  }, [dispatch]);

  return (
    <CustomView
      title="Home"
      hashes={list}
      onLikePost={props.onLikePost}
      onSendReply={props.onSendReply}
      onBlockUser={props.onBlockUser}
      onFollowUser={props.onFollowUser}
      onSelectPost={onSelectPost}
      onTagClick={onTagClick}
      onScrolledToBottom={typeof next === 'number' ? query : undefined}
      loading={loading}
      panels={[
        {
          type: CustomViewPanelType.FEED_CONTROL,
          // @ts-ignore
          panelProps: {
            isShowingReplies: showReplies,
            isShowingPosts: showPosts,
            isShowingLikes: showLikes,
            onToggleReplies: () => {
              setShowReplies(!showReplies);
              setNext(0);
            },
            onTogglePosts: () => {
              setShowPosts(!showPosts);
              setNext(0);
            },
            onToggleLikes: () => {
              setShowLikes(!showLikes);
              setNext(0);
            },
          },
        },
      ]}
    />
  );
}

export default withRouter(HomeView);

async function queryNext(filter: Filter, next: number | null, list: DomainEnvelope<DomainPost>[] = [], muted: {[u: string]: boolean} = {}): Promise<Pageable<DomainEnvelope<DomainPost>, number>> {
  const resp = await fetch(`${INDEXER_API}/filter?order=DESC&limit=20${next ? '&offset=' + next : ''}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({filter}),
  });
  const json = await resp.json();

  if (json.error) {
    return Promise.reject(json.error);
  }

  const payload = json.payload as Pageable<DomainEnvelope<DomainPost>, number>;
  list = list.concat(payload.items)
    .filter((env) => {
      return (
        !muted[serializeUsername(env.subdomain, env.tld)] &&
        !env.message.reference &&
        (!env.message.topic || env.message.topic[0] !== '.')
      );
    });

  if (list.length < 20 && payload.next && payload.next > -1) {
    return await queryNext(filter, payload.next, list);
  } else {
    return {
      items: list,
      next: payload.next,
    };
  }
}
