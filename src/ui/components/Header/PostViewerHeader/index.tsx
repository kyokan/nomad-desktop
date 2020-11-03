import React, {ReactElement} from "react";
import Header from "../index";

function PostViewerHeader(): ReactElement {
  return (
    <Header className="post-viewer__header" title="Post Viewer" topOnly />
  );
}

export default PostViewerHeader;
