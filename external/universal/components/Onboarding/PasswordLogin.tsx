import React, {ReactElement, useCallback, useState} from "react";
import {withRouter, RouteComponentProps, Redirect} from "react-router";
import c from 'classnames';
import {parseUsername, RELAYER_TLDS} from "../../utils/user";
import Icon from "../Icon";
import Input from "../Input";
import {OnboardingViewType} from "./index";

type PasswordLoginProps = {
  username: string;
  setViewType: (viewType: OnboardingViewType) => void;
  onSubdomainLogin: (tld: string, subdomain: string, password: string) => Promise<void>;
  onTLDLogin: (tld: string, password: string) => Promise<void>;
} & RouteComponentProps;

function PasswordLogin(props: PasswordLoginProps): ReactElement {
  const {
    username,
    onSubdomainLogin,
    onTLDLogin,
    history,
  } = props;

  const [password, setPassword] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const onNext = useCallback(async () => {
    const { tld, subdomain } = parseUsername(username);
    setLoading(true);
    setErrorMessage('');

    try {
      if (subdomain && RELAYER_TLDS[tld]) {
        await onSubdomainLogin(tld, subdomain, password);
        history.push('/discover');
      } else if (tld && !subdomain) {
        await onTLDLogin(tld, password);
        history.push('/discover');
      }
    } catch (err) {
      setErrorMessage(err.message);
      setLoading(false);
    }

  }, [username, password, onSubdomainLogin, history.push]);

  const onChange = useCallback((e) => {
    setPassword(e.target.value);
    setErrorMessage('');
  }, [setPassword]);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      onNext();
    }
  }, [onNext]);

  return (
    <div className="onboarding">
      <div className="onboarding__panel">
        <div className="onboarding__panel__title">
          <Icon
            material="arrow_back"
            width={18}
            onClick={() => {
              props.setViewType(OnboardingViewType.LOGIN);
            }}
          />
          {`Login to ${username}`}
        </div>
        <div className="onboarding__panel__subtitle">
          Please enter your password
        </div>
        <Input
          className={c('onboarding__input', {
            'onboarding__input--error': errorMessage,
          })}
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={onChange}
          onKeyDown={onKeyDown}
          disabled={isLoading}
          iconFn={() => {
            if (isLoading) {
              return <div className="loader" />;
            }

            return (
              <Icon
                material="arrow_right_alt"
                width={18}
                onClick={onNext}
                disabled={!password || isLoading}
              />
            )
          }}
          autoFocus
        />
        <div className="onboarding__panel__error-message">
          {errorMessage}
        </div>
      </div>
    </div>
  );
}

export default withRouter(PasswordLogin);
