import React, {InputHTMLAttributes, MouseEventHandler, ReactElement, ReactNode, useEffect} from "react";
import { withRouter, RouteComponentProps } from "react-router";
import "./login.scss";
import SubdomainInput from "nomad-universal/lib/components/SubdomainInput";
import Button from "nomad-universal/lib/components/Button";

type Props = {
  onTLDChange: (tld: string) => void;
  onSubdomainChange: (subdomain: string) => void;
  onPasswordChange: (password: string) => void;
  onSubdomainLogin: MouseEventHandler;
  isSending: boolean;
} & RouteComponentProps;

function LoginPage(props: Props): ReactElement {

  return (
    <div className="onboarding__login">
      <div className="onboarding__login__title">
        Login to Your Account
      </div>
      <div className="onboarding__login__content">
        <div className="onboarding__login__content__subtitle">
          <span>Don't have an account?</span>
          <a
            onClick={() => {
              props.onPasswordChange('');
              props.onTLDChange('');
              props.onSubdomainChange('');
              props.history.push('/onboarding/welcome');
            }}
          >
            Sign Up
          </a>
        </div>
        <div className="onboarding__login__content__paragraph">
          <div className="onboarding__login__content__input-group">
            <div className="onboarding__login__content__input-group__label">
              Username
            </div>
            <SubdomainInput
              className="onboarding__login__content__subdomain-input"
              onTLDChange={props.onTLDChange}
              onSubdomainChange={props.onSubdomainChange}
              disabled={props.isSending}
            />
          </div>
          {renderInputGroup("Password", {
            type: "password",
            onChange: e => props.onPasswordChange(e.target.value),
            disabled: props.isSending,
          })}
        </div>
      </div>
      <div className="onboarding__login__footer">
        <div className="onboarding__login__footer__l">
          <a onClick={() => {
            props.onPasswordChange('');
            props.onTLDChange('');
            props.onSubdomainChange('');
            props.history.push('/onboarding/tld_input');
          }}>
            I own a Handshake TLD
          </a>
        </div>
        <div className="onboarding__login__footer__r">
          <Button
            className="button"
            onClick={props.onSubdomainLogin}
            loading={props.isSending}
          >
            Login
          </Button>
        </div>
      </div>
    </div>
  );
}

export default withRouter(LoginPage);

function renderInputGroup(label: string, inputProps: InputHTMLAttributes<HTMLInputElement>): ReactNode {
  return (
    <div className="onboarding__login__content__input-group">
      <div className="onboarding__login__content__input-group__label">
        {label}
      </div>
      <input
        className="onboarding__login__content__input"
        {...inputProps}
      />
    </div>
  )
}
