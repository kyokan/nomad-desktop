import React, {InputHTMLAttributes, MouseEventHandler, ReactElement, ReactNode, useEffect} from "react";
import { withRouter, RouteComponentProps } from "react-router";
import "./welcome.scss";
import Button from "../../../../../external/universal/components/Button";
import SubdomainInput from "../../../../../external/universal/components/SubdomainInput";

type Props = {
  onTLDChange: (tld: string) => void;
  onSubdomainChange: (subdomain: string) => void;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (confirmPassword: string) => void;
  onSubdomainSignup: MouseEventHandler;
  isSending: boolean;
} & RouteComponentProps;

function WelcomePage(props: Props): ReactElement {
  const {
    onConfirmPasswordChange,
    onEmailChange,
    onPasswordChange,
    onSubdomainChange,
    onSubdomainSignup,
    onTLDChange,
    isSending,
  } = props;

  return (
    <div className="onboarding__welcome">
      <div className="onboarding__welcome__title">
        Create A New Account
      </div>
      <div className="onboarding__welcome__content">
        <div className="onboarding__welcome__content__subtitle">
          <span>Already have an account?</span>
          <a
            onClick={() => {
              props.onSubdomainChange('');
              props.onTLDChange('');
              props.onPasswordChange('');
              props.onConfirmPasswordChange('');
              props.onEmailChange('');
              props.history.push('/onboarding/login');
            }}
          >
            Login
          </a>
        </div>
        <div className="onboarding__welcome__content__paragraph">
          <div className="onboarding__welcome__content__input-group">
            <div className="onboarding__welcome__content__input-group__label">
              Username
            </div>
            <SubdomainInput
              className="onboarding__welcome__content__subdomain-input"
              onTLDChange={onTLDChange}
              onSubdomainChange={onSubdomainChange}
              disabled={isSending}
            />
          </div>
          {renderInputGroup("Email", {
            type: "text",
            onChange: e => onEmailChange(e.target.value),
            disabled: isSending,
          })}
          {renderInputGroup("Password", {
            type: "password",
            onChange: e => onPasswordChange(e.target.value),
            disabled: isSending,
          })}
          {renderInputGroup("Confirm Password", {
            type: "password",
            onChange: e => onConfirmPasswordChange(e.target.value),
            disabled: isSending,
          })}
        </div>
      </div>
      <div className="onboarding__welcome__footer">
        <div className="onboarding__welcome__footer__l">
          <a onClick={() => {
            props.onSubdomainChange('');
            props.onTLDChange('');
            props.onPasswordChange('');
            props.onConfirmPasswordChange('');
            props.onEmailChange('');
            props.history.push('/onboarding/tld_input')
          }}>
            I own a Handshake TLD
          </a>
        </div>
        <div className="onboarding__welcome__footer__r">
          <Button
            className="button"
            loading={isSending}
            onClick={onSubdomainSignup}
          >
            Sign Up
          </Button>
        </div>
      </div>
    </div>
  );
}

export default withRouter(WelcomePage);

function renderInputGroup(label: string, inputProps: InputHTMLAttributes<HTMLInputElement>): ReactNode {
  return (
    <div className="onboarding__welcome__content__input-group">
      <div className="onboarding__welcome__content__input-group__label">
        {label}
      </div>
      <input
        className="onboarding__welcome__content__input"
        {...inputProps}
      />
    </div>
  )
}
