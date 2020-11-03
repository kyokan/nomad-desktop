// @ts-ignore
import React, {ReactElement, ReactNode, useCallback, useState} from "react";
// @ts-ignore
import {withRouter, RouteComponentProps, Redirect} from "react-router";
// @ts-ignore
import c from 'classnames';
import Input from "../Input";
import Icon from "../Icon";
import {OnboardingViewType} from "./index";

type FindADomainProps = {
  username: string;
  onUsernameChange: (username: string) => void;
  setViewType: (viewType: OnboardingViewType) => void;
} & RouteComponentProps;

export default withRouter(FindADomain);
function FindADomain(props: FindADomainProps): ReactElement {
  const {
    username,
    onUsernameChange,
    setViewType,
    history,
  } = props;

  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setLoading] = useState(false);

  const onNext = useCallback(() => {
    setViewType(OnboardingViewType.SUBDOMAIN_RESULTS);
  }, [username]);

  const onKeydown = useCallback((e) => {
    if (e.key === 'Enter') {
      onNext();
    }
  }, [onNext]);

  return (
    <div className="onboarding">
      <div className="onboarding__panel">
        <div className="onboarding__panel__title">
          Welcome to Nomad! ✌️
        </div>
        <div className="onboarding__panel__subtitle">
          First, let's find you a domain name! (It's free)
        </div>
        <Input
          className={c('onboarding__input', {
            'onboarding__input--error': errorMessage,
          })}
          type="text"
          onChange={e => onUsernameChange(e.target.value.replace(/\./g, ''))}
          value={username}
          onKeyDown={onKeydown}
          placeholder="Find your domain name"
          iconFn={() => {
            return (
              <Icon
                material="search"
                width={18}
                disabled={isLoading || !username}
                onClick={onNext}
              />
            )
          }}
        />
        <a
          className="onboarding__panel__subtitle"
          onClick={() => history.push('/login')}
        >
          I already have a domain name
        </a>
        {
          renderWhy(
            'Why?',
            'All Nomad users need a Handshake domain because it gives you an online identity that can be used anywhere.',
          )
        }
        <div className="onboarding__panel__error-message">
          {errorMessage}
        </div>
      </div>
    </div>
  );
}

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
            ? <Icon material="keyboard_arrow_up" width={20} />
            : <Icon material="keyboard_arrow_down" width={20} />
        }
      </div>
      <div className="onboarding__why__content">
        { showWhy && content }
      </div>
    </div>
  );
}
