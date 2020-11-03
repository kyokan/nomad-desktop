import React, {ReactElement} from "react";
import './spinner.scss';

export default function Spinner(): ReactElement {
  return (
    <div className="lds-ring">
      <div />
      <div />
      <div />
      <div />
    </div>
  );
}
