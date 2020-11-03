import React, {ReactElement} from "react";
import './profile-pic.scss';
import {useGlobalMeta} from "../../ducks/posts";
import {getCSSImageURLFromPostHash} from "../../../../../universal/utils/posts";
import {isHex} from "../../../../../universal/utils/hex";

type Props = {
  name: string;
}

export default function ProfilePicture(props: Props): ReactElement {
  const { users } = useGlobalMeta();
  const user = users[props.name] || {};

  return !user.profilePictureUrl
    ? <div className="profile-pic profile-pic--empty" />
    : (
      <div
        className="profile-pic"
        style={{
          backgroundImage: isHex(user.profilePictureUrl)
            ? getCSSImageURLFromPostHash(user.profilePictureUrl || '')
            : `url(${user.profilePictureUrl})`,
        }}
      />
    );
}
