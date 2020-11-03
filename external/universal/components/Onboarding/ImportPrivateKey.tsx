import React, {ReactElement, useCallback, useState} from "react";
import {withRouter, RouteComponentProps} from "react-router";
import Icon from "../Icon";
import Input from "../Input";
import Button from "../Button";
import {OnboardingViewType} from "./index";

type ImportPrivateKeyProps = {
  onAddTLD: (tld: string, password: string, privateKey: string) => Promise<void>;
  setViewType: (viewType: OnboardingViewType) => void;
} & RouteComponentProps;

const BASE64_VALIDATE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export default withRouter(ImportPrivateKey);
function ImportPrivateKey(props: ImportPrivateKeyProps): ReactElement {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tld, setTLD] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [privateKey, setPrivateKey] = useState('');

  const onNext = useCallback(async () => {
    if (!tld || !password || !privateKey || password !== confirmPassword) {
      return;
    }

    if (!BASE64_VALIDATE.test(privateKey) && privateKey.length !== 44) {
      setErrorMessage('Invalid private key');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      if (!privateKey) {
        setErrorMessage('Invalid password');
        setLoading(false);
        return;
      }
      await props.onAddTLD(tld, password, privateKey);
      setLoading(false);
      props.history.push('/discover');
    } catch (err) {
      setErrorMessage('Invalid password');
      setLoading(false);
    }

  }, [tld, password, privateKey, confirmPassword]);

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
            onClick={() => props.setViewType(OnboardingViewType.LOGIN)}
          />
          Import Private Key
        </div>
        <Input
          type="text"
          className="onboarding__input"
          onChange={e => {
            setPrivateKey(e.target.value);
            setErrorMessage('');
          }}
          value={privateKey}
          placeholder="Private Key"
          autoFocus
        />
        <Input
          type="text"
          className="onboarding__input"
          onChange={e => {
            setTLD(e.target.value);
            setErrorMessage('');
          }}
          value={tld}
          placeholder="Domain name"
          autoFocus
        />
        <Input
          className="onboarding__input"
          type="password"
          onChange={e => {
            setPassword(e.target.value);
            setErrorMessage('');
          }}
          value={password}
          placeholder="Password"
        />
        <Input
          className="onboarding__input"
          type="password"
          onChange={e => {
            setConfirmPassword(e.target.value);
            setErrorMessage('');
          }}
          value={confirmPassword}
          placeholder="Confirm Password"
        />
        <div className="onboarding__panel__error-message">
          {errorMessage}
        </div>
        <div className="onboarding__panel__footer">
          <Button
            disabled={!!errorMessage || isLoading || !password || !tld || password !== confirmPassword || !privateKey}
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
