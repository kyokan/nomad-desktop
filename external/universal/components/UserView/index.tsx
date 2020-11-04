import React, {ReactElement, ReactNode, useCallback, useEffect, useState} from 'react';
import {withRouter, RouteComponentProps} from "react-router";
import {Envelope as DomainEnvelope} from '../../../indexer/domain/Envelope';
import {Post as DomainPost} from '../../../indexer/domain/Post';
import {Pageable} from '../../../indexer/dao/Pageable';

import CustomView from "../CustomView";
import {
  useCurrentBlocks,
  useCurrentFollowings,
  useCurrentUsername, useFetchUser, userCurrentMutedNames,
  useUsersMap
} from "../../ducks/users";
import {dotName, parseUsername, serializeUsername, undotName} from "../../utils/user";
import {
  updateRawPost,
  usePostsMap,
} from "../../ducks/posts";
import {
  submitCoverImage,
  submitProfilePicture,
  updateCoverImage,
  updateProfilePicture,
} from "../../ducks/drafts";
import {useDispatch} from "react-redux";
import uniq from "lodash.uniq";
import {useMuteUser, useUnmuteUser} from "../../ducks/blocklist";
import './user-view.scss';
import Menuable from "../Menuable";
import {IPCMessageResponse} from "../../../../src/app/types";
import {mapDomainEnvelopeToPost} from "../../utils/posts";
import {INDEXER_API} from "../../utils/api";
import Avatar from "../Avatar";

const postIPCMain = async (a: any, b?: any): Promise<IPCMessageResponse<any>> => {
  return {
    id: 0,
    payload: {},
  };
};

type Props = {
  onLikePost: (postHash: string) => void;
  onSendReply: (postHash: string) => void;
  onBlockUser: (postHash: string) => void;
  onFollowUser: (postHash: string) => void;
} & RouteComponentProps<{username: string; viewType?: string; postHash?: string}>;

function UserView(props: Props): ReactElement {
  const {
    match: {
      params: {
        username: _username,
        viewType: _viewType,
      },
    },
    onFollowUser,
    onBlockUser,
  } = props;
  const username = dotName(_username);
  const currentUser = useCurrentUsername();
  const blockedMap = useCurrentBlocks();
  const mutedNames = userCurrentMutedNames();
  const mutedMap = mutedNames.reduce((acc: {[n: string]: string}, name) => {
    acc[name] = name;
    return acc;
  }, {});
  const userMap = useUsersMap();
  const postMap = usePostsMap();
  const fetchUser = useFetchUser();
  const user = userMap[username];
  const silenced = { ...blockedMap, ...mutedMap };
  const isUserSilienced = !!silenced[username];

  const dispatch = useDispatch();
  const isCurrentUser = username === currentUser;
  const { tld, subdomain } = parseUsername(username);

  useEffect(() => {
    if (username) {
      fetchUser(username);
    }
  }, [fetchUser, username]);

  const onAvatarUrlChange = useCallback((avatarUrl: string) => {
    dispatch(updateProfilePicture(avatarUrl));
  }, [dispatch]);

  const onUpdateAvatarUrl = useCallback((e: any) => {
    e.stopPropagation();
    dispatch(submitProfilePicture());
    dispatch(updateProfilePicture(''));
  }, [postIPCMain]);

  const onCoverImageChange = useCallback((coverImage: string) => {
    dispatch(updateCoverImage(coverImage));
  }, [dispatch]);

  const onTagClick = useCallback((tagName: string) => {
    props.history.push(`/tags/${tagName}`);
  }, []);

  const onUpdateCoverImage = useCallback((e: any) => {
    e.stopPropagation();
    dispatch(submitCoverImage());
    dispatch(updateCoverImage(''));
  }, [postIPCMain]);

  const onSelectPost = useCallback((hash: string) => {
    props.history.push(`/posts/${hash}`);
  }, []);

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<string[]>([]);
  const [next, setNext] = useState<number | null>(0);
  const [showPosts, setShowPosts] = useState(true);
  const [showLikes, setShowLikes] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const resetViewState = useCallback(() => {
    setShowPosts(true);
    setShowLikes(false);
    setShowReplies(false);
    setList([]);
  }, [
    setShowPosts,
    setShowLikes,
    setShowReplies,
    setList,
  ]);

  const setView = useCallback((viewType: 'posts' | 'replies' | 'likes') => {
    setShowPosts(viewType === 'posts');
    setShowLikes(viewType === 'likes');
    setShowReplies(viewType === 'replies');
    setNext(0);
  }, [
    setShowPosts,
    setShowLikes,
    setShowReplies,
    setList,
    setNext,
  ]);

  const query = useCallback(async (reset?: boolean) => {
    setLoading(true);

    if ((!username || typeof next !== 'number') && !reset) {
      setLoading(false);
      return;
    }

    const payload = await queryNext(
      username,
      reset ? 0 : next,
      [],
      silenced,
      showPosts,
      showLikes,
      showReplies,
      isCurrentUser,
    );

    setLoading(false);
    const hashes = payload.items.map((envelope: DomainEnvelope<DomainPost>) => {
      const post = mapDomainEnvelopeToPost(envelope);
      if (!postMap[post.hash]) {
        dispatch(updateRawPost(post));
      }
      return post.hash;
    });

    if (reset) {
      setList(uniq(hashes));
    } else {
      setList(uniq(list.concat(hashes)));
    }
    if (payload.next) {
      setNext(+payload.next);
    } else {
      setNext(null);
    }
  }, [list, username, next, silenced, showPosts, showReplies, showLikes, isCurrentUser]);

  useEffect(() => {
    (async function onUserViewMount() {
      if (username) {
        // dispatch(fetchUserFollowings(username));
        fetchUser(username);
      }
      resetViewState();
      await query(true);
    }())
  }, [username]);

  useEffect(() => {
    (async function onUserViewMount() {
      await query(true);
    }())
  }, [showPosts, showReplies, showLikes]);

  useEffect(() => {
    switch (_viewType) {
      case 'timeline':
        return setView('posts');
      case 'comments':
        return setView('replies');
      case 'likes':
        return setView('likes');
      default:
        return setView('posts');
    }
  }, [_viewType]);

  const onMuteUser = useMuteUser();
  const onUnmuteUser = useUnmuteUser();
  // const onCreateNewView = useCreateNewView();
   const currentFollowings = useCurrentFollowings();
  const currentBlockedMap = useCurrentBlocks();
  // const addUserToViewIndex = useAddUserToViewIndex();
  // const removeUserFromViewIndex = useRemoveUserFromViewIndex();
  const followUser = useCallback(async () => {
    if (isUserSilienced || currentFollowings[username]) {
      return;
    }
    await onFollowUser(username);
  }, [username, currentFollowings[username]]);
  const validFollowings = Object.keys(user?.followings || {})
    .filter(name => {
      if (silenced[name]) {
        return false;
      }  else {
        return !!name;
      }
    });
  const numOfFollows = validFollowings.length;

  const headerItems = [
    {
      text: `Posts`,
      className: showPosts ? 'user-view__tab--active' : '',
      onClick: () => {
        props.history.push(`/users/${username}/timeline`);
      },
    },
    {
      text: `Replies`,
      className: showReplies ? 'user-view__tab--active' : '',
      onClick: () => {
        props.history.push(`/users/${username}/comments`);
      },
    },
    {
      text: `Likes`,
      className: showLikes ? 'user-view__tab--active' : '',
      onClick: () => {
        props.history.push(`/users/${username}/likes`);
      },
    },
  ];

  const headerActions = [];

  if (!isCurrentUser && !!currentUser) {
    headerActions.push({
      text: blockedMap[username]
        ? 'Blocked'
        : mutedMap[username]
          ? 'Muted'
          : currentFollowings[username]
            ? 'Followed'
            : 'Follow',
      className: isUserSilienced || currentFollowings[username]
          ? 'follow-btn follow-btn--followed'
          : 'follow-btn',
      onClick: followUser,
    })
  }


  headerActions.push({
    text: 'more',
    className: 'more-btn',
    render: useCallback((): ReactNode => {
      return (!isCurrentUser && !!currentUser && !currentBlockedMap[username]) && (
        // @ts-ignore
        <Menuable
          className="more-btn__menu"
          items={[
            // {
            //   text: `Add @${undotName(username)} to...`,
            //   items: [
            //     {
            //       text: 'Create New List',
            //       onClick: useCallback(async () => {
            //         const view: CustomViewProps = {
            //           title: `View # ${userData.savedViews.length + 1}`,
            //           heroImageUrl: '',
            //           iconUrl: '',
            //           filter: {
            //             postHashes: [],
            //             likedBy: [username],
            //             repliedBy: [username],
            //             postedBy: [username],
            //             parentHashes: [],
            //             allowedTags: ['*'],
            //           },
            //         };
            //
            //         await onCreateNewView(view);
            //       }, [userData.savedViews.length]),
            //
            //     },
            //
            //     ...userData.savedViews.map((savedView, i): MenuProps | null => {
            //       if (savedView.filter.postedBy.includes(username)) {
            //         return null;
            //       }
            //       return {
            //         text: savedView.title,
            //         onClick: async () => {
            //           await addUserToViewIndex(username, i);
            //         },
            //       }
            //     }),
            //   ]
            // },
            // {
            //   text: `Remove @${undotName(username)} from...`,
            //   items: userData.savedViews.map((savedView, i): MenuProps | null => {
            //     if (!savedView.filter.postedBy.includes(username)) {
            //       return null;
            //     }
            //     return {
            //       text: savedView.title,
            //       onClick: async () => {
            //         await removeUserFromViewIndex(username, i);
            //       },
            //     };
            //   }),
            // },
            //
            // isCurrentUser ?  null : { divider: true },

            // isCurrentUser
            //   ? null
            //   : {
            //     text: `${mutedMap[username] ? 'Unmute' : 'Mute'} @${undotName(username)}`,
            //     onClick: async () => {
            //       if (mutedMap[username]) {
            //         await onUnmuteUser(username);
            //       } else {
            //         await onMuteUser(username);
            //       }
            //     },
            //   },

            (isCurrentUser || !currentUser || currentBlockedMap[username])
              ? null
              : {
                text: `Block @${undotName(username)}`,
                onClick: async () => {
                  await onBlockUser(username);
                }
              },

          ]}
        >
          <button className="button more-btn">
            ...
          </button>
        </Menuable>
      );
    }, [isCurrentUser, currentUser, isUserSilienced]),
    onClick: () => null,
  });

  const panelActions: any[] = [];

  return (
    <CustomView
      className="user-view"
      loading={loading}
      title=""
      titleFn={() => (
        <div className="user-view__title-row">
          <Avatar
            className="user-view__avatar"
            username={username}
          />
          <div className="user-view__name">
            <div className="user-view__name__nickname">
              {user?.displayName || subdomain || tld}
            </div>
            <div className="user-view__name__username">
              @{undotName(username)}
            </div>
            {
              !!user?.bio && (
                <div className="user-view__name__bio">
                  {user?.bio}
                </div>
              )
            }
          </div>
        </div>
      )}
      headerItems={headerItems}
      headerActions={headerActions}
      heroImageUrl={user?.coverImage}
      canUploadHero={isCurrentUser}
      canUploadAvatar={isCurrentUser}
      selectedHash={props.match.params?.postHash}
      hashes={list}
      onLikePost={props.onLikePost}
      onSendReply={props.onSendReply}
      onBlockUser={props.onBlockUser}
      onFollowUser={props.onFollowUser}
      onSelectPost={onSelectPost}
      onScrolledToBottom={typeof next === 'number' ? query : undefined}
      onUpdateAvatarUrl={onUpdateAvatarUrl}
      onAvatarUrlChange={onAvatarUrlChange}
      onUpdateCoverImage={onUpdateCoverImage}
      onCoverImageChange={onCoverImageChange}
      onTagClick={onTagClick}
      // @ts-ignore
      panels={panelActions}
    />
  );
}

export default withRouter(UserView);

async function queryNext(
  username: string,
  next: number | null,
  list: DomainEnvelope<DomainPost>[] = [],
  blockedUsers: {[u: string]: string} = {},
  showPosts: boolean,
  showLikes: boolean,
  showReplies: boolean,
  isCurrentUser: boolean
): Promise<Pageable<DomainEnvelope<DomainPost>, number>> {
  const filter = {
    postedBy: showPosts ? [username] : [],
    likedBy: showLikes ? [username] : [],
    repliedBy: showReplies ? [username] : [],
    postHashes: [],
    parentHashes: [],
    allowedTags: [],
  };
  const resp = await fetch(`${INDEXER_API}/filter?limit=10&order=DESC${next ? '&offset=' + next : ''}`, {
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
    .filter((envelope) => {
      if (blockedUsers[username] && serializeUsername(envelope.subdomain, envelope.tld) !== username) return false;
      return (!envelope.message.topic || (envelope.message.topic[0] !== '.'));
    });

  if (list.length < 10 && payload.next && payload.next > -1) {
    return await queryNext(username, payload.next, list, blockedUsers, showPosts, showLikes, showReplies, isCurrentUser);
  } else {
    return {
      items: list,
      next: payload.next,
    };
  }
}
