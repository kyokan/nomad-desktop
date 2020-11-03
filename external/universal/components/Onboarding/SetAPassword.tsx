// @ts-ignore
import React, {ReactElement, useCallback, useState} from "react";
// @ts-ignore
import {withRouter, RouteComponentProps, Redirect} from "react-router";
// @ts-ignore
import c from 'classnames';
import Icon from "../Icon";
import Input from "../Input";
import Button from "../Button";
import {OnboardingViewType} from "./index";


type SetAPasswordProps = {
  username: string;
  setViewType: (viewType: OnboardingViewType) => void;
  onPasswordChange: (password: string) => void;
} & RouteComponentProps;

export default withRouter(SetAPassword);
function SetAPassword(props: SetAPasswordProps): ReactElement {
  const {username} = props;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const onNext = useCallback(async () => {
    if (!password || password !== confirmPassword) {
      return;
    }
    props.onPasswordChange(password);
    props.setViewType(OnboardingViewType.ADD_A_TLD);
  }, [password, confirmPassword]);

  return (
    <div className="onboarding">
      <div className="onboarding__panel">
        <div className="onboarding__panel__title">
          <Icon
            material="arrow_back"
            width={18}
            onClick={() => props.setViewType(OnboardingViewType.LOGIN)}
          />
          {`Create a password for ${username}`}
        </div>
        <div className="onboarding__panel__subtitle">
          We will use this password to encrypt your local keystore.
        </div>
        <Input
          className="onboarding__input"
          type="password"
          onChange={e => {
            setPassword(e.target.value);
          }}
          placeholder="Password"
          autoFocus
        />
        <Input
          className="onboarding__input"
          type="password"
          onChange={e => {
            setConfirmPassword(e.target.value);
          }}
          placeholder="Confirm Password"
        />
        <div className="onboarding__panel__footer">
          <Button
            disabled={!password || password !== confirmPassword}
            onClick={onNext}
          >
            Next
          </Button>
        </div>
      </div>

    </div>
  );
}
