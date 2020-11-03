import React, {ReactElement} from "react";
import Header from "../index";
import './setting-header.scss';

function SettingHeader(): ReactElement {
  return (
    <Header className="app-header" title="Settings" topOnly />
  );
}

export default SettingHeader;
