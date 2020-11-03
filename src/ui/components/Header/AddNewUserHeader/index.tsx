import React, {ReactElement} from "react";
import Header from "../index";
import "./new-user-header.scss";

function AddNewUserHeader(): ReactElement {
  return (
    <Header className="app-header" title="" topOnly />
  );
}

export default AddNewUserHeader;
