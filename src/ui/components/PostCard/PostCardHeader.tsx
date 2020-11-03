import React, {ReactElement, useCallback} from "react";
import {undotName} from "../../helpers/user";
import moment from "moment";
import {useGlobalMeta, usePostId} from "../../ducks/posts";
import {isHex} from "../../../../../universal/utils/hex";
import {getImageURLFromPostHash} from "../../../../../universal/utils/posts";

type Props = {
  hash?: string;
  avatar?: string;
  creator?: string;
  timestamp?: number | string;
  onNameClick?: (name: string) => void;
}

export default function PostCardHeader(props: Props): ReactElement {
  const {
    hash = '',
    creator: _creator,
    timestamp: _timestamp,
    avatar: _avatar,
    onNameClick,
  } = props;

  const post = usePostId(hash);
  // const dispatch = useDispatch();

  const creator = post.creator || _creator || '';
  const timestamp = post.timestamp || _timestamp;
  const {users} = useGlobalMeta();

  const avatar = users[creator]?.profilePictureUrl || _avatar;
  const avatarUrl = isHex(avatar) ? getImageURLFromPostHash(avatar || '') : avatar;
  // useEffect(() => {
  //   (async function onPostCardHeaderMount() {
  //     if (hash && !post.id) {
  //       dispatch(fetchPostByHash(hash));
  //     }
  //   }())
  // }, [hash]);

  const goToUser = useCallback(() => {
    if (onNameClick) {
      onNameClick(creator);
    }
  }, [creator]);

  return (
    <div className="post-card__header">
      {
        avatar
          ? <img className="post-card__header__avatar" src={avatarUrl} />
          : <div className="post-card__header__avatar post-card__header__avatar--no-avatar" />
      }
      <div className="post-card__header__info">
          <span
            className="post-card__header__creator"
            onClick={goToUser}
          >
            @{undotName(creator)}
          </span>
        <span className="post-card__header__timestamp" title={moment(timestamp).toISOString()}>
            {
              typeof timestamp === 'string'
                ? timestamp
                : moment(timestamp).fromNow()
            }
          </span>
      </div>
    </div>
  );
}
