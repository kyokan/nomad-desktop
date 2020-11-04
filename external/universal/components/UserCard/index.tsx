// @ts-ignore
import React, {ReactElement, useCallback, useEffect} from "react";
// @ts-ignore
import { withRouter, RouteComponentProps } from "react-router";
import {
  addUserFollowings,
  fetchUserFollowings,
  useCurrentFollowings,
  useCurrentUser, useCurrentUsername,
  useUser,
} from "../../ducks/users";
// @ts-ignore
import {useDispatch} from "react-redux";
import {useFollowUser} from "../../ducks/posts";
import "./user-card.scss";
import {parseUsername, undotName} from "../../utils/user";
// @ts-ignore
import classNames from "classnames";
// @ts-ignore
import moment from "moment";
import {
  getCSSImageURLFromAvatarType,
  getCSSImageURLFromPostHash,
  getImageURLFromAvatarType,
  getImageURLFromPostHash
} from "../../utils/posts";
import Markup from "../Markup";
import Avatar from "../Avatar";

type UserCardProps = {
  username: string;
  onFollowUser: (postHash: string) => void;
} & RouteComponentProps<any>;

function UserCard(props: UserCardProps): ReactElement {
  const dispatch = useDispatch();
  const { username, onFollowUser } = props;
  const user = useUser(username);
  const currentUsername = useCurrentUsername();
  const currentFollowings = useCurrentFollowings();
  const { tld, subdomain } = parseUsername(username);

  const goToUserProfile = useCallback(() => {
    props.history.push(`/users/${username}/timeline`);
  }, [props.history]);

  const followUser = useCallback(async (e: any) => {
    e.stopPropagation();

    if (currentFollowings[username]) {
      dispatch(addUserFollowings(currentUsername, {
        [username]: username,
      }));
      return;
    }

    await onFollowUser(username);
  }, [username, currentUsername]);

  return (
    <div
      className="user-card"
      onClick={goToUserProfile}
    >
      <div className="user-card__info">
        <Avatar username={username} />
        <div className="user-card__content">
          <div
            className="user-card__info__name"
          >
            <div className="user-card__info__name__nickname">
              {user?.displayName || subdomain || tld}
            </div>
            <div className="user-card__info__name__username">
              @{undotName(username)}
            </div>
          </div>
          <div className="user-card__info__bio">
            {user?.bio}
          </div>
          <div className="user-card__info__footer">
            <div className="user-card__info__footer__number">
              {user?.stats?.followings || 0}
            </div>
            <div className="user-card__info__footer__unit">Following</div>
            <div className="user-card__info__footer__divider" />
            <div className="user-card__info__footer__number">
              {user?.stats?.followers || 0}
            </div>
            <div className="user-card__info__footer__unit">Followers</div>
          </div>
        </div>
        <button
          className={classNames("button", 'user-card__button', {
            'user-card__button--followed': currentFollowings[username],
          })}
          onClick={followUser}
        >
          {currentFollowings[username] ? 'Followed' : 'Follow'}
        </button>
      </div>

    </div>
  )
}

export default withRouter(UserCard);

type RawUserCardProps = {
  alias: string;
  username: string;
  profilePictureUrl: string;
  avatarType: string;
  coverImageUrl: string;
  bio: string;
}
export const RawUserCard = (props: RawUserCardProps) => {
  const {
    alias,
    username,
    coverImageUrl,
    profilePictureUrl,
    avatarType = '',
    bio,
  } = props;
  return (
    <div className="user-card">
      {/*<div*/}
      {/*  className="user-card__cover-image"*/}
      {/*  style={{*/}
      {/*    backgroundImage: getCSSImageURLFromPostHash(coverImageUrl || ''),*/}
      {/*  }}*/}
      {/*/>*/}
      <div className="user-card__info">
        <img
          className="avatar"
          src={
            profilePictureUrl
              ? getImageURLFromPostHash(profilePictureUrl)
              : getImageURLFromAvatarType(avatarType, username)
          }
        />
        <div className="user-card__info__content">
          <div className="user-card__info__name">
            <div className="user-card__info__name__nickname">
              {alias}
            </div>
            <div className="user-card__info__name__username">
              @{undotName(username)}
            </div>
          </div>

          <div className="user-card__info__bio">
            {bio && (
              <Markup content={bio} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
};
