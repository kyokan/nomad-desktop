// @ts-ignore
import React, {ReactElement, useCallback, useState} from "react";
import Dropdown from "../Dropdown";
import "./subdomain-input.scss";

type Props = {
  className?: string;
  onTLDChange: (tld: string) => void;
  onSubdomainChange: (subdomain: string) => void;
  disabled?: boolean;
}

export const TLDS_FOR_SUBS = [
  { text: '2062' },
  { text: '5404' },
  { text: '6371' },
  { text: '9411' },
  { text: '9764' },
];

export default function SubdomainInput(props: Props): ReactElement {
  const {
    className = '',
    onSubdomainChange,
    onTLDChange,
    disabled,
  } = props;
  const [tldIndex, setTLDIndex] = useState(-1);
  const [subdomain, setSubdomain] = useState('');
  const _onTLDChange = useCallback((i) => {
    setTLDIndex(i);
    onTLDChange(TLDS_FOR_SUBS[i]?.text);
  }, [tldIndex, onTLDChange]);
  const _onSubdomainChange = useCallback((e) => {
    const val = e.target.value;
    setSubdomain(val);
    onSubdomainChange(val);
  }, [onSubdomainChange]);

  return (
    <div className={`subdomain-input ${className}`}>
      <input
        type="text"
        value={subdomain}
        onChange={_onSubdomainChange}
        disabled={disabled}
      />
      <div className="subdomain-input__at">@</div>
      <Dropdown
        className="subdomain-input__dropdown"
        selectedIndex={tldIndex}
        onChange={_onTLDChange}
        items={TLDS_FOR_SUBS}
        disabled={disabled}
      />
    </div>
  )
}
