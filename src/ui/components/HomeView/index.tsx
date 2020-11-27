import React, {ReactElement, useCallback, useEffect, useState} from 'react';
import {RouteComponentProps, withRouter} from 'react-router';
import {Pageable} from '../../../../external/nomad-api/src/services/indexer/Pageable';
import {Filter} from '../../../../external/nomad-api/src/services/indexer/Filter';
import {PostWithMeta} from '../../../../external/nomad-api/src/services/indexer/PostWithMeta';
import {
  fetchCurrentUserLikes,
  fetchUserFollowings,
  fetchUserLikes,
  useCurrentFollowings,
  useCurrentUser, userCurrentUserData
} from "../../ducks/users";
import {updateRawPost, useLikePage, usePostsMap} from "../../ducks/posts";
import {useDispatch} from "react-redux";
import {postIPCMain} from "../../helpers/ipc";
import {IPCMessageRequestType} from "../../../app/types";
import uniq from "lodash.uniq";
import {useMutedUser} from "../../ducks/blocklist";
import {mapPostWithMetaToPost} from "../../../app/util/posts";
import CustomView from "nomad-universal/lib/components/CustomView";
import {CustomViewPanelType} from "nomad-universal/lib/components/CustomView/CustomViewPanel";


type Props = {

} & RouteComponentProps;

function HomeView(props: Props): ReactElement {
  const { name: currentUser } = useCurrentUser();
  const userData = userCurrentUserData();
  const muted = userData.mutedNames.reduce((acc: {[n: string]: boolean}, name) => {
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
      likedBy: showLikes ? Object.keys(followings) : [],
      repliedBy: showReplies ? Object.keys(followings) : [],
      postHashes: [],
      parentHashes: [],
      allowedTags: ['*'],
    }, next, [], muted);
    setLoading(false);
    const hashes: string[] = [];

    payload.items.map((postWithMeta: PostWithMeta) => {
      const post = mapPostWithMetaToPost(postWithMeta);
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
      // dispatch(fetchUserLikes(currentUser));
    }())
  }, [currentUser]);

  useEffect(() => {
    (async function onFollowingsUpdateMount() {
      // Object.keys(followings)
      //   .forEach(name => {
      //     dispatch(fetchUserLikes(name));
      //   })
    }())
  }, [followings, showPosts, showLikes, showReplies]);

  useEffect(() => {
    (async function onListRefresh() {
      await query(true);
    }())
  }, [currentUser, showPosts, showLikes, showReplies, followings]);

  const onLikePost = useLikePage();

  const onTagClick = useCallback(tagName => {
    props.history.push(`/tags/${tagName}`);
  }, []);

  return (
    <CustomView
      title="Home"
      hashes={list}
      onLikePost={onLikePost}
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

async function queryNext(filter: Filter, next: number | null, list: PostWithMeta[] = [], muted: {[u: string]: boolean} = {}): Promise<Pageable<PostWithMeta, number>> {
  // if (blockedUsers[username]) {
  //   return {
  //     items: [],
  //     next: null,
  //   };
  // }
  const resp = await postIPCMain({
    type: IPCMessageRequestType.QUERY_POST_HASHES_FOR_FILTER,
    payload: {
      filter: filter,
      order: 'DESC',
      offset: next,
    },
  }, true);

  if (resp.error) {
    return Promise.reject(resp.error);
  }

  const payload = resp.payload as Pageable<PostWithMeta, number>;
  list = list.concat(payload.items)
    .filter(({ post }) => {
      return !muted[post.tld] && (!post.topic || post.topic[0] !== '.');
    });

  if (list.length < 20 && payload.next) {
    return await queryNext(filter, payload.next, list);
  } else {
    return {
      items: list,
      next: payload.next,
    };
  }
}
