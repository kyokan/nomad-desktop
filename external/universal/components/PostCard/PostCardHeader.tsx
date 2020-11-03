// @ts-ignore
import React, {ReactElement, useCallback} from "react";
// @ts-ignore
import moment from "moment";
import {useGlobalMeta, usePostId} from "../../ducks/posts";
import {parseUsername, undotName} from "../../utils/user";
import {isHex} from "../../utils/hex";
import {getImageURLFromPostHash} from "../../utils/posts";
import {useUser, useUsersMap} from "../../ducks/users";
import Avatar from "../Avatar";

type Props = {
  hash?: string;
  avatar?: string;
  creator?: string;
  timestamp?: number | string;
  onNameClick?: (name: string) => void;
  hideInfo?: boolean;
}

export default function PostCardHeader(props: Props): ReactElement {
  const {
    hash = '',
    creator = "_",
    timestamp,
    onNameClick,
    hideInfo,
  } = props;

  // const post = usePostId(hash);
  const usersMap = useUsersMap();
  const user = usersMap[creator];
  const { subdomain, tld } = parseUsername(creator);

  // useEffect(() => {
  //   (async function onPostCardHeaderMount() {
  //     if (hash && !post.id) {
  //       dispatch(fetchPostByHash(hash));
  //     }
  //   }())
  // }, [hash]);

  const goToUser = useCallback((e) => {
    if (onNameClick) {
      e.stopPropagation();
      onNameClick(creator);
    }
  }, [creator]);

  return (
    <div className="post-card__header">
      {
        !hideInfo && (
          <Avatar
            className="post-card__header__avatar"
            username={creator || "_"}
          />
        )
      }
      {
        !hideInfo && (
          <div className="post-card__header__info">
            <div className="post-card__header__name-group" onClick={goToUser}>
              <span
                className="post-card__header__creator"
              >
                {user?.displayName || subdomain || tld}
              </span>
                <span
                  className="post-card__header__username"
                >
                @{undotName(creator)}
              </span>
            </div>
            <span
              className="post-card__header__timestamp"
              title={moment(timestamp).toISOString()}
            >
              {
                typeof timestamp === 'string'
                  ? timestamp
                  : moment(timestamp).fromNow()
              }
            </span>
          </div>
        )
      }
    </div>
  );
}
