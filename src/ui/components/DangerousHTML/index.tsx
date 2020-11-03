import React, {ReactElement} from "react";
import {markup} from "../../helpers/rte";

function DangerousHTML(props: { html: string }): ReactElement {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: props.html,
      }}
    />
  )
}

export default React.memo(DangerousHTML);
