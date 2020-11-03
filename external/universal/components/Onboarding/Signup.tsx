// @ts-ignore
import React, {ReactElement, useCallback, useState} from "react";
// @ts-ignore
import {withRouter, RouteComponentProps, Redirect} from "react-router";
// @ts-ignore
import c from 'classnames';
import {parseUsername} from "../../utils/user";
import Icon from "../Icon";
import Input from "../Input";
import Button from "../Button";
import {OnboardingViewType} from "./index";

type SignupProps = {
  username: string;
  onSubdomainSignup: (tld: string, subdomain: string, email: string, password: string) => Promise<void>;
  setViewType: (viewType: OnboardingViewType) => void;
} & RouteComponentProps;

export default withRouter(Signup);
function Signup(props: SignupProps): ReactElement {
  const {
    onSubdomainSignup,
    username,
  } = props;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const onNext = useCallback(async () => {
    const { tld, subdomain } = parseUsername(username);

    if (!tld || !subdomain || !password || password !== confirmPassword || !email) {
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      await onSubdomainSignup(tld, subdomain, email, password);
      props.history.push(`/discover`);
    } catch (err) {
      setErrorMessage(err.message);
    }

    setLoading(false);
  }, [username, password, confirmPassword, email]);

  const onKeydown = useCallback((e) => {
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
            onClick={() => props.setViewType(OnboardingViewType.SUBDOMAIN_RESULTS)}
          />
          {`${username} is available!`}
        </div>
        <div className="onboarding__panel__subtitle">
          Please fill out the form below.
        </div>
        <Input
          className="onboarding__input"
          type="text"
          onChange={e => {
            setEmail(e.target.value);
            setErrorMessage('');
          }}
          placeholder="Email Address"
          autoFocus
        />
        <Input
          className="onboarding__input"
          type="password"
          onChange={e => {
            setPassword(e.target.value);
            setErrorMessage('');
          }}
          placeholder="Password"
          autoFocus
        />
        <Input
          className="onboarding__input"
          type="password"
          onChange={e => {
            setConfirmPassword(e.target.value);
            setErrorMessage('');
          }}
          placeholder="Confirm Password"
          autoFocus
        />
        <div className="onboarding__panel__error-message">
          {errorMessage}
        </div>
        <div className="onboarding__panel__footer">
          <Button
            disabled={!!errorMessage || isLoading || !password || password !== confirmPassword || !email}
            onClick={onNext}
            loading={isLoading}
          >
            Next
          </Button>
        </div>
      </div>

    </div>
  );
}
