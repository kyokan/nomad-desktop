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
import {decrypt} from "../../../electron/src/app/util/key";

type ImportKeystoreProps = {
  onAddTLD: (tld: string, password: string, privateKey: string) => Promise<void>;
  setViewType: (viewType: OnboardingViewType) => void;
} & RouteComponentProps;

export default withRouter(ImportKeystore);
function ImportKeystore(props: ImportKeystoreProps): ReactElement {
  const [password, setPassword] = useState('');
  const [tld, setTLD] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [keystore, setKeystore] = useState<File | undefined>(undefined);

  const onFileUpload = useCallback(async (e) => {
    const file = e.target.files[0];

    setKeystore(file);
  }, [setKeystore]);

  const onNext = useCallback(async () => {
    if (!tld || !password || !keystore) {
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const ciphertext = await (new Response(keystore)).text();
      const privateKey = decrypt(ciphertext, password);

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

  }, [tld, password, keystore]);

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
          Import Keystore
        </div>
        <div
          className={c("file-upload", {
            'file-upload--selected': keystore,
          })}
        >
          <Icon
            material="publish"
            width={18}
          />
          <div className="file-upload__text">
            {keystore ? `Uploaded: ${keystore.name}` : 'Upload Keystore'}
          </div>
          <input
            type="file"
            onChange={onFileUpload}
          />
        </div>
        <Input
          type="text"
          className="onboarding__input"
          onChange={e => {
            setTLD(e.target.value);
            setErrorMessage('');
          }}
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
          placeholder="Password"
          autoFocus
        />
        <div className="onboarding__panel__error-message">
          {errorMessage}
        </div>
        <div className="onboarding__panel__footer">
          <Button
            disabled={!!errorMessage || isLoading || !password}
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
