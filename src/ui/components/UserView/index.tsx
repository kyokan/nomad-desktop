import React, {ReactElement, ReactNode, useCallback, useEffect, useState} from 'react';
import {RouteComponentProps, withRouter} from 'react-router';
import {Post} from '../../../../external/indexer/domain/Post';
import {Pageable} from '../../../../external/indexer/dao/Pageable';
import CustomView from "../../../../external/universal/components/CustomView";
import {
  fetchUserBlockee,
  fetchUserFollowings, useAddUserToViewIndex, useCreateNewView, useCurrentBlocks,
  useCurrentFollowings,
  useCurrentUser, userCurrentMutedNames, userCurrentUserData, useRemoveUserFromViewIndex,
  useUsersMap
} from "../../ducks/users";
import {dotName, isTLD, undotName} from "../../helpers/user";
import {
  updateRawPost,
  useGlobalMeta,
  usePostsMap,
} from "../../ducks/posts";
import {
  submitCoverImage,
  submitProfilePicture,
  updateCoverImage,
  updateProfilePicture, useDraftCoverImage,
  useDraftProfilePicture
} from "../../ducks/drafts";
import {useDispatch} from "react-redux";
import {postIPCMain} from "../../helpers/ipc";
import {IPCMessageRequestType} from "../../../app/types";
import {mapPostWithMetaToPost} from "../../../app/util/posts";
import uniq from "lodash.uniq";
import {useMuteUser, useUnmuteUser} from "../../ducks/blocklist";
import {CustomViewPanelType} from "../../../../external/universal/components/CustomView/CustomViewPanel";
import './user-view.scss';
import UserCard from "../UserCard";
import Menuable, {MenuProps} from "../Menuable";
import {CustomViewProps} from "../../../app/controllers/userData";
import MediaView from "./MediaView";
import {FullScreenModal} from "../FullScreenModal";
import {useBlockUser, useFollowUser, useLikePage, useQueryMediaForName} from "../../helpers/hooks";
import {getImageURLFromPostHash} from "../../../../external/universal/utils/posts";
import {Envelope} from "../../../../external/indexer/domain/Envelope";

type Props = {

} & RouteComponentProps<{username: string; postHash?: string}>;

function UserView(props: Props): ReactElement {
  const {
    match: { params: { username } },
  } = props;

  const { name: currentUser } = useCurrentUser();
  const { users } = useGlobalMeta();
  const userData = userCurrentUserData();
  const blockedMap = useCurrentBlocks();
  const mutedNames = userCurrentMutedNames();
  const mutedMap = mutedNames.reduce((acc: {[n: string]: string}, name) => {
    acc[name] = name;
    return acc;
  }, {});
  const userMap = useUsersMap();
  const postMap = usePostsMap();
  const user = userMap[username];
  const silenced = { ...blockedMap, ...mutedMap };
  const isUserSilienced = !!silenced[username];

  const dispatch = useDispatch();
  const {
    firstActivity = 0,
    lastActivity = 0,
    posts = 0,
    comments = 0,
  } = users[username] || {};

  const isCurrentUser = username === currentUser;
  const draftProfilePicture = useDraftProfilePicture();
  const draftCoverImage = useDraftCoverImage();

  const onAvatarUrlChange = useCallback(avatarUrl => {
    dispatch(updateProfilePicture(avatarUrl));
  }, [dispatch]);

  const onUpdateAvatarUrl = useCallback(e => {
    e.stopPropagation();
    dispatch(submitProfilePicture());
    dispatch(updateProfilePicture(''));
  }, [postIPCMain]);

  const onCoverImageChange = useCallback(coverImage => {
    dispatch(updateCoverImage(coverImage));
  }, [dispatch]);

  const onTagClick = useCallback(tagName => {
    props.history.push(`/tags/${tagName}`);
  }, []);

  const onUpdateCoverImage = useCallback(e => {
    e.stopPropagation();
    dispatch(submitCoverImage());
    dispatch(updateCoverImage(''));
  }, [postIPCMain]);

  const onSelectPost = useCallback((hash) => {
    props.history.push(`/posts/${hash}`);
  }, []);

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<string[]>([]);
  const [next, setNext] = useState<number | null>(0);
  const [showRepliesAndLikes, setShowRepliesAndLikes] = useState(false);
  const [showFollowings, setShowFollowings] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [showLikes, setShowLikes] = useState(true);
  const [showReplies, setShowReplies] = useState(true);

  const resetViewState = useCallback(() => {
    setShowFollowings(false);
    setShowRepliesAndLikes(false);
    setShowMedia(false);
    setShowLikes(true);
    setShowReplies(true);
    setList([]);
  }, [
    setShowFollowings,
    setShowRepliesAndLikes,
    setShowMedia,
    setShowLikes,
    setShowReplies,
    setList,
  ]);

  const setView = useCallback((viewType: '' | 'repliesAndLikes' | 'followings' | 'media') => {
    setShowRepliesAndLikes(viewType === 'repliesAndLikes');
    setShowFollowings(viewType === 'followings');
    setShowMedia(viewType === 'media');
    setNext(0);
  }, [
    setShowFollowings,
    setShowRepliesAndLikes,
    setShowMedia,
    setShowLikes,
    setShowReplies,
    setList,
    setNext,
  ]);

  const query = useCallback(async (reset?: boolean) => {
    setLoading(true);

    if (!showReplies && !showLikes && showRepliesAndLikes) {
      setList([]);
      setLoading(false);
      return;
    }

    if ((!username || typeof next !== 'number') && !reset) {
      setLoading(false);
      return;
    }

    const payload = await queryNext(
      username,
      reset ? 0 : next,
      [],
      silenced,
      showRepliesAndLikes,
      showLikes,
      showReplies,
    );

    setLoading(false);
    const hashes = payload.items.map(postWithMeta => {
      const post = mapPostWithMetaToPost(postWithMeta);
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
    setNext(payload.next);
  }, [list, username, next, silenced, showRepliesAndLikes, showReplies, showLikes]);

  useEffect(() => {
    (async function onUserViewMount() {
      resetViewState();
      await query(true);
    }())
  }, [username]);

  useEffect(() => {
    (async function onUserViewMount() {
      await query(true);
    }())
  }, [showRepliesAndLikes, showReplies, showLikes]);

  const onLikePost = useLikePage();
  const onMuteUser = useMuteUser();
  const onUnmuteUser = useUnmuteUser();
  const onCreateNewView = useCreateNewView();
  const onFollowUser = useFollowUser();
  const onBlockUser = useBlockUser();
  const currentFollowings = useCurrentFollowings();
  const currentBlockedMap = useCurrentBlocks();
  const addUserToViewIndex = useAddUserToViewIndex();
  const removeUserFromViewIndex = useRemoveUserFromViewIndex();
  const followUser = useCallback(async () => {
    if (isUserSilienced || currentFollowings[username]) {
      return;
    }
    await onFollowUser(username);
  }, [username]);
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
      onClick: () => {
        setView('');
        setNext(0);
      },
    },
    {
      text: `Replies & Likes`,
      onClick: () => {
        setView('repliesAndLikes');
        setNext(0);
      },
    },
    {
      text: `${numOfFollows} Following${numOfFollows > 1 ? 's' : ''}`,
      onClick: () => {
        setView('followings');
        setNext(0);
      },
    },
  ];

  if (isTLD(username)) {
    headerItems.push(    {
      text: `Media`,
      onClick: () => {
        setView('media');
        setNext(0);
      },
    });
  }

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
      return (
        <Menuable
          className="more-btn__menu"
          items={[
            {
              text: `Add @${undotName(username)} to...`,
              items: [
                {
                  text: 'Create New List',
                  onClick: useCallback(async () => {
                    const view: CustomViewProps = {
                      title: `View # ${userData.savedViews.length + 1}`,
                      heroImageUrl: '',
                      iconUrl: '',
                      filter: {
                        postHashes: [],
                        likedBy: [username],
                        repliedBy: [username],
                        postedBy: [username],
                        parentHashes: [],
                        allowedTags: ['*'],
                      },
                    };

                    await onCreateNewView(view);
                  }, [userData.savedViews.length]),

                },

                ...userData.savedViews.map((savedView, i): MenuProps | null => {
                  if (savedView.filter.postedBy.includes(username)) {
                    return null;
                  }
                  return {
                    text: savedView.title,
                    onClick: async () => {
                      await addUserToViewIndex(username, i);
                    },
                  }
                }),
              ]
            },
            {
              text: `Remove @${undotName(username)} from...`,
              items: userData.savedViews.map((savedView, i): MenuProps | null => {
                if (!savedView.filter.postedBy.includes(username)) {
                  return null;
                }
                return {
                  text: savedView.title,
                  onClick: async () => {
                    await removeUserFromViewIndex(username, i);
                  },
                };
              }),
            },

            isCurrentUser ?  null : { divider: true },

            isCurrentUser
              ? null
              : {
                text: `${mutedMap[username] ? 'Unmute' : 'Mute'} @${undotName(username)}`,
                onClick: async () => {
                  if (mutedMap[username]) {
                    await onUnmuteUser(username);
                  } else {
                    await onMuteUser(username);
                  }
                },
              },

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

  const panelActions = [];

  if (showRepliesAndLikes) {
    panelActions.push({
      type: CustomViewPanelType.FEED_CONTROL,
      panelProps: {
        isShowingLikes: showLikes,
        isShowingReplies: showReplies,
        onToggleLikes: () => setShowLikes(!showLikes),
        onToggleReplies: () => setShowReplies(!showReplies),
      },
    })
  } else {
    panelActions.push({
      type: CustomViewPanelType.USER_INFO,
      panelProps: {
        firstActivity,
        lastActivity,
        posts,
        comments,
      },
    });
  }

  let children: ReactNode | undefined;

  if (showFollowings) {
    children = numOfFollows
      ? (
        <div className="user-view__followings">
          {validFollowings.map(name => !!name && (
            <UserCard
              key={name}
              name={name}
            />
          ))}
        </div>
      )
      : (
        <div className="user-view__empty-following">
          No Following
        </div>
      )
  }

  const [mediaHash, setMediaModal] = useState('');
  const queryMediaByUsername = useQueryMediaForName();

  if (showMedia) {
    children = (
      <>
        <MediaView
          queryNext={queryMediaByUsername}
          onSelectMedia={(e, hash) => setMediaModal(hash)}
        />
        {
          mediaHash && (
            <FullScreenModal
              onClose={(e) => {
                e.stopPropagation();
                setMediaModal('');
              }}
            >
              <img
                src={getImageURLFromPostHash(mediaHash)}
              />
            </FullScreenModal>
          )
        }
      </>
    );
  }

  const avatarUrl = draftProfilePicture
    || users[dotName(username)]?.profilePictureUrl
    || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAVAAAAEYAQMAAAAwLTybAAAAA1BMVEXy8vJkA4prAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAI0lEQVRoge3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAA4McALwgAAQoNfCUAAAAASUVORK5CYII=";

  return (
    <CustomView
      className="user-view"
      loading={loading}
      title={undotName(username)}
      headerItems={headerItems}
      headerActions={headerActions}
      heroImageUrl={draftCoverImage || users[dotName(username)]?.coverImageUrl}
      avatarUrl={avatarUrl}
      canUploadHero={isCurrentUser}
      canUploadAvatar={isCurrentUser}
      selectedHash={props.match.params.postHash}
      hashes={list}
      onLikePost={onLikePost}
      onSelectPost={onSelectPost}
      onScrolledToBottom={typeof next === 'number' ? query : undefined}
      onUpdateAvatarUrl={onUpdateAvatarUrl}
      onAvatarUrlChange={onAvatarUrlChange}
      onUpdateCoverImage={onUpdateCoverImage}
      onCoverImageChange={onCoverImageChange}
      onTagClick={onTagClick}
      // @ts-ignore
      panels={panelActions}
    >
      {children}
    </CustomView>
  );
}

export default withRouter(UserView);

async function queryNext(username: string, next: number | null, list: Envelope<Post>[] = [], blockedUsers: {[u: string]: string} = {}, showRepliesAndLikes: boolean, showLikes: boolean, showReplies: boolean): Promise<Pageable<Envelope<Post>, number>> {
  const resp = await postIPCMain({
    type: IPCMessageRequestType.QUERY_POST_HASHES_FOR_FILTER,
    payload: {
      filter: {
        postedBy: showRepliesAndLikes ? [] : [username],
        likedBy: showRepliesAndLikes && showLikes ? [username] : [],
        repliedBy: showRepliesAndLikes && showReplies ? [username] : [],
        postHashes: [],
        parentHashes: [],
        allowedTags: ['*'],
      },
      order: 'DESC',
      offset: next,
    },
  }, true);

  if (resp.error) {
    return Promise.reject(resp.error);
  }

  const payload = resp.payload as Pageable<Envelope<Post>, number>;
  list = list.concat(payload.items)
    .filter((postWithMeta) => {
      const { message: post } = postWithMeta;
      return (!post.topic || (post.topic[0] !== '.'));
    });

  if (list.length < 20 && payload.next) {
    return await queryNext(username, payload.next, list, blockedUsers, showRepliesAndLikes, showLikes, showReplies);
  } else {
    return {
      items: list,
      next: payload.next,
    };
  }
}
