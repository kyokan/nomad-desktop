// @ts-ignore
import React, {ReactElement, useCallback, useState} from "react";
// @ts-ignore
import {withRouter, RouteComponentProps, Redirect} from "react-router";
// @ts-ignore
import c from 'classnames';
import {generateNewCompressedKey} from "../../../../src/app/util/key";
import {parseUsername} from "../../utils/user";
import Icon from "../Icon";
// @ts-ignore
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
  const pubkey = compressedKey.publicKey.toString('hex');

  const onNext = useCallback(async () => {
    const { tld } = parseUsername(props.username);

    setLoading(true);

    try {
      await props.onAddTLD(tld, props.password, compressedKey.privateKey.toString('hex'));
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
          {`Please add the following key as TXT record in ${props.username}.`}
        </div>
        <div className="onboarding__tld__content__pubkey">
          <input
            type="text"
            value={`DDRPKEY:${pubkey}`}
          />
          <div className="onboarding__tld__content__pubkey__icon">
            <Icon
              width={18}
              material="file_copy"
              onClick={() => copy(`DDRPKEY:${pubkey}`)}
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
        <div className="onboarding__tld__content__paragraph">
          It takes about 32 Handshake blocks (~8 hours) to discover your name after your text record is confirmed. Please see <Anchor href="https://ddrp.network/quick_start.html#step-5-update-your-handshake-name">DDRP documentation</Anchor> for more details.
        </div>
        <div className="onboarding__panel__error-message">
          {errorMessage}
        </div>
        <div className="onboarding__panel__footer">
          <Button
            onClick={onNext}
            loading={isLoading}
          >
            Save keystore to local storage
          </Button>
        </div>
      </div>
    </div>
  );
}
