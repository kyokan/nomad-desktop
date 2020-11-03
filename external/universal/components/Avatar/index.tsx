// @ts-ignore
import React, {ReactElement, useEffect} from "react";
import {useFetchUser, useUser} from "../../ducks/users";
import {
  getImageURLFromAvatarType,
  getImageURLFromPostHash
} from "../../utils/posts";
import "./avatar.scss";

export default function Avatar(props: {username: string, className?: string}): ReactElement {
  const user = useUser(props.username);

  const fetchUser = useFetchUser();

  useEffect(() => {
    if (!user) {
      fetchUser(props.username);
    }
  }, [user, props.username]);

  return (
    <img
      className={`avatar ${props.className}`}
      src={user?.profilePicture
        ? getImageURLFromPostHash(user.profilePicture)
        : getImageURLFromAvatarType(user?.avatarType || '', props.username)}
    />
  )
}
