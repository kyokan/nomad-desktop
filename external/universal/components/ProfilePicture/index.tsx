// @ts-ignore
import React, {ReactElement} from "react";
import './profile-pic.scss';
import {useGlobalMeta} from "../../ducks/posts";
import {getCSSImageURLFromPostHash} from "../../utils/posts";
import {isHex} from "../../utils/hex";
import {useUsersMap} from "../../ducks/users";

type Props = {
  name: string;
}

export default function ProfilePicture(props: Props): ReactElement {
  const map = useUsersMap();
  const user = map[props.name];

  return !user?.profilePicture
    ? <div className="profile-pic profile-pic--empty" />
    : (
      <div
        className="profile-pic"
        style={{
          backgroundImage: isHex(user.profilePicture)
            ? getCSSImageURLFromPostHash(user.profilePicture || '')
            : `url(${user.profilePicture})`,
        }}
      />
    );
}
