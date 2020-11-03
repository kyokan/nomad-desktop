// @ts-ignore
import React, {ReactElement, ReactNode} from "react";
import "./nav.scss";
import {RouteComponentProps, withRouter} from "react-router";

type Props = {
  children: ReactNode;
} &  RouteComponentProps<{topic?: string; username?: string}>;

function Nav(props: Props): ReactElement {
  return (
    <div className="nav">
      {props.children}
    </div>
  );
}

export default withRouter(Nav);
