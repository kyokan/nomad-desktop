import React, {ReactElement, useCallback} from "react";
import { withRouter, RouteComponentProps } from "react-router";
import {
  addUserFollowings,
  useCurrentFollowings,
  useCurrentUser,
  useUser,
} from "../../ducks/users";
import {useDispatch} from "react-redux";
import {useGlobalMeta} from "../../ducks/posts";
import ProfilePicture from "../ProfilePicture";
import "./user-card.scss";
import {undotName} from "../../helpers/user";
import classNames from "classnames";
import moment from "moment";
import {getCSSImageURLFromPostHash} from "nomad-universal/lib/utils/posts";
import {isHex} from "nomad-universal/lib/utils/hex";
import {useFollowUser} from "nomad-universal/lib/ducks/posts";

type UserCardProps = {
  name: string;
} & RouteComponentProps<any>;

function UserCard(props: UserCardProps): ReactElement {
  const dispatch = useDispatch();
  const user = useUser(props.name);
  const currentUser = useCurrentUser();
  const currentFollowings = useCurrentFollowings();
  const globalMeta = useGlobalMeta();
  const {
    posts,
    profilePictureUrl,
    coverImageUrl,
    lastActivity,
  } = globalMeta.users[props.name] || {};

  const goToUserProfile = useCallback(() => {
    props.history.push(`/users/${props.name}/timeline`);
  }, [props.history]);

  const onFollowUser = useFollowUser();
  const followUser = useCallback(async () => {
    if (currentFollowings[props.name]) {
      dispatch(addUserFollowings(currentUser.name, {
        [props.name]: props.name,
      }));
      return;
    }

    await onFollowUser(props.name);
  }, [props.name, currentUser.name]);

  return (
    <div className="user-card">
      <div
        className="user-card__cover-image"
        style={{
          backgroundImage: isHex(coverImageUrl)
            ? getCSSImageURLFromPostHash(coverImageUrl || '')
            : `url(${coverImageUrl})`,
        }}
      />
      <div className="user-card__info">
        <ProfilePicture name={props.name} />
        <div
          className="user-card__info__name"
          onClick={goToUserProfile}
        >
          @{undotName(props.name)}
        </div>
        <button
          className={classNames("button", 'user-card__button', {
            'user-card__button--followed': currentFollowings[props.name],
          })}
          onClick={followUser}
        >
          {currentFollowings[props.name] ? 'Followed' : 'Follow'}
        </button>
      </div>
      <div className="user-card__footer">
        <div className="user-card__footer__group">
          <div>{posts}</div>
          <div>Posts</div>
        </div>
        <div className="user-card__footer__group">
          <div>{ (!user || !user.followings) ? 0 : Object.keys(user.followings).length}</div>
          <div>Followers</div>
        </div>
        <div className="user-card__footer__group">
          <div>{moment(lastActivity).fromNow()}</div>
          <div>Last Active</div>
        </div>
      </div>
    </div>
  )
}

export default withRouter(UserCard);
