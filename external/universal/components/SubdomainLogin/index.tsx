// @ts-ignore
import React, {ReactElement, useCallback, useState} from "react";
// @ts-ignore
import {withRouter, RouteComponentProps, Redirect} from "react-router";
// @ts-ignore
import c from 'classnames';
import {parseUsername, RELAYER_TLDS} from "../../utils/user";
import Icon from "../Icon";
import Input from "../Input";
import {OnboardingViewType} from "./index";

type SubdomainLoginProps = {
  onSubdomainLogin: (tld: string, subdomain: string, password: string) => Promise<void>;
} & RouteComponentProps;

function SubdomainLogin (props: SubdomainLoginProps): ReactElement {
  const {
    onSubdomainLogin,
    history,
  } = props;

  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const onNext = useCallback(async () => {
    const { tld, subdomain } = parseUsername(username);
    setLoading(true);
    setErrorMessage('');

    try {
      if (!subdomain || !password) {
        setErrorMessage(`Invalid login`);
      } else {
        await onSubdomainLogin(tld, subdomain, password);
        history.push('/discover');
      }
      setLoading(false);
    } catch (err) {
      setErrorMessage(err.message);
      setLoading(false);
    }

  }, [username, password, onSubdomainLogin, history.push]);

  const onChange = useCallback((e: any) => {
    setPassword(e.target.value);
    setErrorMessage('');
  }, [setPassword]);

  const onKeyDown = useCallback((e: any) => {
    if (e.key === 'Enter') {
      onNext();
    }
  }, [onNext]);

  return (
    <div className="onboarding">
      <div className="onboarding__panel">
        <div className="onboarding__panel__title">
          {`Login`}
        </div>
        <div className="onboarding__panel__subtitle">
          Please enter your password
        </div>
        <Input
          className="onboarding__input"
          type="Domain"
          onChange={(e: any) => {
            setUsername(e.target.value);
          }}
          placeholder="Domain name"
          autoFocus
        />
        <Input
          className={c('onboarding__input', {
            'onboarding__input--error': errorMessage,
          })}
          type="password"
          placeholder="Password"
          value={password}
          onChange={onChange}
          onKeyDown={onKeyDown}
          disabled={isLoading}
          iconFn={() => {
            if (isLoading) {
              return <div className="loader" />;
            }

            return (
              // @ts-ignore
              <Icon
                material="arrow_right_alt"
                width={18}
                onClick={onNext}
                disabled={!password || isLoading}
              />
            )
          }}
        />
        <div className="onboarding__panel__error-message">
          {errorMessage}
        </div>
      </div>
    </div>
  );
}

export default withRouter(SubdomainLogin);
