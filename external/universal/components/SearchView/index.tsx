// @ts-ignore
import React, {ReactElement, useEffect, useCallback} from "react";
// @ts-ignore
import { withRouter, RouteComponentProps } from "react-router";
// @ts-ignore
import { useDispatch } from 'react-redux';
import CustomFilterView from "../CustomFilterView";
import {extendFilter} from "../../utils/filter";
import {addTag, resetSearchParams, useSearchParams} from "../../ducks/search";

type Props = {
  onLikePost: (postHash: string) => void;
  onSendReply: (postHash: string) => void;
  onBlockUser: (postHash: string) => void;
  onFollowUser: (postHash: string) => void;
} & RouteComponentProps<{tagName: string}>;

function SearchView (props: Props): ReactElement {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();

  const users = searchParams.users.length
    ? searchParams.users
    : searchParams.tags.length ? ['*'] : [];

  useEffect(() => {
    return () => {
      dispatch(resetSearchParams());
    };
  }, []);

  const onTagClick = useCallback((tag: string) => {
    dispatch(addTag(tag));
  }, [dispatch]);

  return (
    <CustomFilterView
      title=""
      heroImageUrl=""
      filter={extendFilter({
        postedBy: users,
        repliedBy: [],
        likedBy: [],
        allowedTags: searchParams.tags,
      })}
      headerActions={[]}
      onLikePost={props.onLikePost}
      onSendReply={props.onSendReply}
      onBlockUser={props.onBlockUser}
      onFollowUser={props.onFollowUser}
      onTagClick={onTagClick}
    />
  )
}

export default withRouter(SearchView);
