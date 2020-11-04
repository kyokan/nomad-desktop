import React, {ReactElement, useState} from "react";
import { withRouter, RouteComponentProps, Redirect } from "react-router";
import copy from "copy-to-clipboard";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ECKey = require('eckey');
import "./tld-instruction.scss";
import RefreshIcon from "../../../../../static/assets/icons/refresh.svg";
import CopyIcon from "../../../../../static/assets/icons/copy.svg";
import Icon from "../../../components/Icon";
import Button from "../../../../../external/universal/components/Button";
import Anchor from "../../../components/Anchor";

type Props = {
  tld: string;
  compressedKey: typeof ECKey;
  resetCompressedKey: () => void;
  onNewTLDSubmit: () => void;
  isSending: boolean;
} & RouteComponentProps;

function TLDInstruction(props: Props): ReactElement {
  const {
    tld,
    compressedKey,
    resetCompressedKey,
    onNewTLDSubmit,
  } = props;
  const pubkey = compressedKey.publicKey.toString('hex');

  if (!tld) {
    return <Redirect to="/onboarding/welcome" />
  }

  return (
    <div className="onboarding__tld">
      <div className="onboarding__tld__title">
        Update Your Handshake Name
      </div>
      <div className="onboarding__tld__content">
        <div className="onboarding__tld__content__subtitle">
          {`Please add the following key as TXT record in ${tld}.`}
        </div>
        <div className="onboarding__tld__content__pubkey">
          <input
            type="text"
            value={`f${pubkey}`}
          />
          <div className="onboarding__tld__content__pubkey__icon">
            <Button
              onClick={() => copy(`f${pubkey}`)}
            >
              <Icon
                url={CopyIcon}
              />
            </Button>

          </div>
          <div className="onboarding__tld__content__pubkey__icon">
            <Button
              onClick={resetCompressedKey}
            >
              <Icon
                className="onboarding__tld__content__pubkey__icon"
                url={RefreshIcon}
              />
            </Button>

          </div>
        </div>
        <div className="onboarding__tld__content__paragraph">
          It takes about 32 Handshake blocks (~8 hours) to discover your name after your text record is confirmed. Please see <Anchor href="https://ddrp.network/quick_start.html#step-5-update-your-handshake-name">DDRP documentation</Anchor> for more details.
        </div>
      </div>
      <div className="onboarding__tld__footer">
        <div className="onboarding__tld__footer__l">
          <Button
            className="button"
            onClick={() => props.history.push(`/onboarding/tld_input`)}
            disabled={props.isSending}
          >
            Back
          </Button>
        </div>
        <div className="onboarding__tld__footer__r">
          <Button
            className="button"
            onClick={onNewTLDSubmit}
            loading={props.isSending}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

export default withRouter(TLDInstruction);
