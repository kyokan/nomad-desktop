import React, {InputHTMLAttributes, ReactElement, ReactNode, useEffect, useState} from "react";
import { withRouter, RouteComponentProps } from "react-router";
import "./tld-input.scss";

type Props = {
  tld: string;
  password: string;
  confirmPassword: string;
  onTLDChange: (tld: string) => void;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (confirmPassword: string) => void;
} & RouteComponentProps;

function TLDInput(props: Props): ReactElement {
  const {
    tld,
    password,
    confirmPassword,
    onTLDChange,
    onPasswordChange,
    onConfirmPasswordChange,
  } = props;

  return (
    <div className="onboarding__tld-input">
      <div className="onboarding__tld-input__title">
        Add New TLD
      </div>
      <div className="onboarding__tld-input__content">
        <div className="onboarding__tld-input__content__subtitle">
          Your password will be used to encrypt your local keystore.
        </div>
        <div className="onboarding__tld-input__content__paragraph">
          {renderInputGroup('TLD', {
            type: 'text',
            value: tld,
            onChange: e => onTLDChange(e.target.value.replace(/\./g, '')),
            autoFocus: true,
          })}
          {renderInputGroup('Password', {
            type: 'password',
            value: password,
            onChange: e => onPasswordChange(e.target.value.replace(/\./g, '')),
            autoFocus: true,
          })}
          {renderInputGroup('Confirm Password', {
            type: 'password',
            value: confirmPassword,
            onChange: e => onConfirmPasswordChange(e.target.value.replace(/\./g, '')),
            autoFocus: true,
          })}
        </div>
      </div>
      <div className="onboarding__tld-input__footer">
        <div className="onboarding__tld-input__footer__l">
          <button
            className="button"
            onClick={() => {
              props.onTLDChange('');
              props.onConfirmPasswordChange('');
              props.onPasswordChange('');
              props.history.push(`/onboarding/welcome`)
            }}
          >
            Back
          </button>
        </div>
        <div className="onboarding__tld-input__footer__r">
          <button
            className="button"
            onClick={() => {
              props.history.push(`/onboarding/pubkey_gen`);
            }}
            disabled={!tld || !password || !confirmPassword}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default withRouter(TLDInput);

function renderInputGroup(label: string, inputProps: InputHTMLAttributes<HTMLInputElement>): ReactNode {
  return (
    <div className="onboarding__tld-input__content__input-group">
      <div className="onboarding__tld-input__content__input-group__label">
        {label}
      </div>
      <input
        className="onboarding__tld-input__content__input"
        {...inputProps}
      />
    </div>
  )
}
