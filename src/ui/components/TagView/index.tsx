import React, {ReactElement} from "react";
import { withRouter, RouteComponentProps } from "react-router";
import CustomFilterView from "../CustomFilterView";
import {extendFilter} from "../../helpers/filter";

type Props = {

} & RouteComponentProps<{tagName: string}>;

function TagView(props: Props): ReactElement {
  const {
    match: { params: { tagName } },
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
    />
  )
}

export default withRouter(TagView);
