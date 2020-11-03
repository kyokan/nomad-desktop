// @ts-ignore
import React, {ReactElement} from "react";
// @ts-ignore
import {RouteComponentProps, withRouter} from "react-router";
import {OnboardingViewType} from "./index";

type TLDOptionsProps = {
  username: string;
  setViewType: (viewType: OnboardingViewType) => void;
} & RouteComponentProps;

export default withRouter(TLDOptions);
function TLDOptions(props: TLDOptionsProps): ReactElement {
  return (
    <div className="onboarding">
      <div className="onboarding__panel">
        <div className="onboarding__panel__title">
          I would like to:
        </div>
        <div
          className="onboarding__panel__tld-option"
          onClick={() => props.setViewType(OnboardingViewType.SET_TLD_PASSWORD)}
        >
          Generate new secret
        </div>
        <div
          className="onboarding__panel__tld-option"
          onClick={() => props.setViewType(OnboardingViewType.IMPORT_KEYSTORE)}
        >
          Import keystore
        </div>
        <div
          className="onboarding__panel__tld-option"
          onClick={() => props.setViewType(OnboardingViewType.IMPORT_PRIVATE_KEY)}
        >
          Import private key
        </div>
      </div>
    </div>
  )
}
