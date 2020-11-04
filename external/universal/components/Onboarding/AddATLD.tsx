import React, {ReactElement, useCallback, useState} from "react";
import {withRouter, RouteComponentProps} from "react-router";
import {generateNewCompressedKey} from "../../../../src/app/util/key";
import {parseUsername} from "../../utils/user";
import Icon from "../Icon";
import copy from "copy-to-clipboard";
import Button from "../Button";
import {OnboardingViewType} from "./index";
import Anchor from "../../../../src/ui/components/Anchor";


type AddATLDProps = {
  username: string;
  password: string;
  setViewType: (viewType: OnboardingViewType) => void;
  onAddTLD: (tld: string, password: string, privateKey: string) => Promise<void>;
} & RouteComponentProps;

export default withRouter(AddATLD);
function AddATLD(props: AddATLDProps): ReactElement {
  const [compressedKey, setCompressedKey] = useState(generateNewCompressedKey());
  const [isLoading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const pubkey = compressedKey.publicKey.toString('base64');
  const privkey = compressedKey.privateKey.toString('base64');

  const onNext = useCallback(async () => {
    const { tld } = parseUsername(props.username);

    setLoading(true);

    try {
      await props.onAddTLD(tld, props.password, privkey);
      props.history.push('/discover');
    } catch (err) {
      setErrorMessage(err.message);
    }

    setLoading(false);
  }, [props.password]);

  return (
    <div className="onboarding">
      <div className="onboarding__panel">
        <div className="onboarding__panel__title">
          <Icon
            material="arrow_back"
            width={18}
            onClick={() => props.setViewType(OnboardingViewType.LOGIN)}
          />
          Update your domain name record
        </div>
        <div className="onboarding__panel__subtitle">
          {`Please add the following key as TXT record in ${props.username}`}
        </div>
        <div className="onboarding__tld__content__pubkey">
          <input
            type="text"
            value={`f${pubkey}`}
          />
          <div className="onboarding__tld__content__pubkey__icon">
            <Icon
              width={18}
              material="file_copy"
              onClick={() => copy(`f${pubkey}`)}
            />
          </div>
          <div className="onboarding__tld__content__pubkey__icon">
            <Icon
              width={18}
              material="refresh"
              onClick={() => setCompressedKey(generateNewCompressedKey())}
            />
          </div>
        </div>
        <div className="onboarding__panel__subtitle">
          ...and back up your private key below securely
        </div>
        <div className="onboarding__tld__content__pubkey">
          <input
            type="text"
            value={`${privkey}`}
          />
        </div>
        <div className="onboarding__tld__content__paragraph">
          It takes about 32 Handshake blocks (~8 hours) to discover your name after your text record is confirmed. Please see <Anchor href="https://github.com/kyokan/fnd/blob/master/docs/quick_start.md#step-5-update-your-handshake-name">Footnote documentation</Anchor> for more details.
        </div>
        <div className="onboarding__panel__error-message">
          {errorMessage}
        </div>
        <div className="onboarding__panel__footer">
          <Button
            onClick={onNext}
            loading={isLoading}
          >
            I have back up my private key
          </Button>
        </div>
      </div>
    </div>
  );
}
