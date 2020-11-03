// @ts-ignore
import React, {ReactElement, ReactNode, useCallback, useState} from "react";
// @ts-ignore
import {RouteComponentProps, withRouter} from "react-router";
// @ts-ignore
import c from 'classnames';
import {parseUsername, RELAYER_TLDS} from "../../utils/user";
import Input from "../Input";
import Icon from "../Icon";
import {OnboardingViewType} from "./index";

type LoginProps = {
  username: string;
  onUsernameChange: (username: string) => void;
  setViewType: (viewType: OnboardingViewType) => void;
} & RouteComponentProps;

function Login(props: LoginProps): ReactElement {
  const {
    username,
    onUsernameChange,
    setViewType,
    history,
  } = props;

  const [errorMessage, setErrorMessage] = useState('');
  const [tlds, setTLDs] = useState<string[]>([]);

  const onNext = useCallback(() => {
    const { tld, subdomain } = parseUsername(username);
    if (subdomain && RELAYER_TLDS[tld]) {
      setViewType(OnboardingViewType.RELAYER_SUBDOMAIN_PASSWORD);
    } else if (subdomain) {
      setErrorMessage(`Cannot login to ${tld}`);
    } else if (!subdomain && tlds.includes(tld)) {
      setViewType(OnboardingViewType.TLD_OPTIONS);
    } else if (!subdomain && tld) {
      setViewType(OnboardingViewType.SET_TLD_PASSWORD);
    }
  }, [username, setViewType]);

  const onChange = useCallback((e) => {
    setErrorMessage('');
    onUsernameChange(e.target.value);
  }, [onUsernameChange]);

  const onKeydown = useCallback((e) => {
    if (e.key === 'Enter') {
      onNext();
    }
  }, [onNext]);

  return (
    <div className="onboarding">
      <div className="onboarding__panel">
        <div className="onboarding__panel__title">
          Enter your domain
        </div>
        <div className="onboarding__panel__subtitle">
          To continue, please enter your domain
        </div>
        <Input
          className={c('onboarding__input', {
            'onboarding__input--error': errorMessage,
          })}
          type="text"
          value={props.username}
          onChange={onChange}
          onKeyDown={onKeydown}
          placeholder="Enter your domain name"
          iconFn={() => {
            return (
              // @ts-ignore
              <Icon
                material="arrow_right_alt"
                width={18}
                onClick={onNext}
                disabled={!props.username}
              />
            )
          }}
          autoFocus
        />
        {/*<a*/}
        {/*  className="onboarding__panel__subtitle"*/}
        {/*  onClick={() => history.push('/signup')}*/}
        {/*>*/}
        {/*  I need a domain name (It's free!)*/}
        {/*</a>*/}
        <div className="onboarding__panel__error-message">
          {errorMessage}
        </div>
        {
          renderWhy(
            'Import',
            <div className="onboarding__recovery-options">
              <a
                className="onboarding__panel__subtitle"
                onClick={() => setViewType(OnboardingViewType.IMPORT_KEYSTORE)}
              >
                Import Keystore
              </a>
              <a
                className="onboarding__panel__subtitle"
                onClick={() => setViewType(OnboardingViewType.IMPORT_PRIVATE_KEY)}
              >
                Import Private key
              </a>
            </div>
          )
        }
      </div>
    </div>
  );
}

export default withRouter(Login);

function renderWhy(placeholder: string, content: any): ReactNode {
  const [showWhy, setShowingWhy] = useState(false);
  const toggle = useCallback(() => {
    setShowingWhy(!showWhy);
  }, [showWhy]);

  return (
    <div className="onboarding__why">
      <div
        className="onboarding__why__label"
        onClick={toggle}
      >
        {placeholder}
        {
          showWhy
            // @ts-ignore
            ? <Icon material="keyboard_arrow_up" width={20} />
            // @ts-ignore
            : <Icon material="keyboard_arrow_down" width={20} />
        }
      </div>
      <div className="onboarding__why__content">
        { showWhy && content }
      </div>
    </div>
  );
}
