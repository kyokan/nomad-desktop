import React, {
  ReactElement,
  useState,
  MouseEventHandler,
  useCallback,
  ChangeEvent,
  MouseEvent,
  KeyboardEvent,
  ReactNode,
  // @ts-ignore
} from "react";
// @ts-ignore
import { withRouter, RouteComponentProps} from "react-router";
// @ts-ignore
import {useDispatch} from "react-redux";
// @ts-ignore
import c from "classnames";
import "./index.scss";
import Dropdown from "../Dropdown";

function ComposeViewPanels(): ReactElement {

  return (
    <div className="compose-panels">
      <div className="compose-panel">
        <div className="compose-panel__title">Choose Topic</div>

      </div>
    </div>
  );
}

export default withRouter(ComposeViewPanels);
