// @ts-ignore
import React, {ReactElement} from "react";
import { withRouter, RouteComponentProps } from "react-router";
import CustomFilterView from "../CustomFilterView";
import {extendFilter} from "../../utils/filter";

type Props = {
  onLikePost: (postHash: string) => void;
  onSendReply: (postHash: string) => void;
  onBlockUser: (postHash: string) => void;
  onFollowUser: (postHash: string) => void;
} & RouteComponentProps<{tagName: string}>;

function TagView(props: Props): ReactElement {
  const {
    match: { params: { tagName } },
    onLikePost,
    onSendReply,
    onBlockUser,
    onFollowUser,
  } = props;

  return (
    <CustomFilterView
      title={`#${tagName}`}
      heroImageUrl=""
      filter={extendFilter({
        postedBy: ['*'],
        repliedBy: ['*'],
        likedBy: ['*'],
        allowedTags: [tagName],
      })}
      headerActions={[]}
      onLikePost={onLikePost}
      onSendReply={onSendReply}
      onBlockUser={onBlockUser}
      onFollowUser={onFollowUser}
    />
  )
}

export default withRouter(TagView);
