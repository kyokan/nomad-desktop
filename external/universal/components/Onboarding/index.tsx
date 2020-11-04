import React, {ReactElement, ReactNode, useCallback, useEffect, useState} from "react";
import {withRouter, RouteComponentProps, Redirect} from "react-router";
import './onboarding.scss';
import Login from "./Login";
import PasswordLogin from "./PasswordLogin";
import SubdomainResults from "./SubdomainResults";
import FindADomain from "./FindADomain";
import TLDOptions from "./TLDOptions";
import AddATLD from "./AddATLD";
import SetAPassword from "./SetAPassword";
import Signup from "./Signup";
import ImportKeystore from "./ImportKeystore";
import ImportPrivateKey from "./ImportPrivateKey";

export enum OnboardingViewType {
  LOGIN,
  FIND_A_DOMAIN,
  RELAYER_SUBDOMAIN_PASSWORD,
  SUBDOMAIN_RESULTS,
  SIGNUP,
  TLD_OPTIONS,
  SET_TLD_PASSWORD,
  ADD_A_TLD,
  IMPORT_KEYSTORE,
  IMPORT_PRIVATE_KEY,
}

type Props = {
  type: OnboardingViewType;
  onSubdomainLogin: (tld: string, subdomain: string, password: string) => Promise<void>;
  onTLDLogin: (name: string, password: string) => Promise<void>;
  onAddTLD: (tld: string, password: string, privateKey: string) => Promise<void>;
  onSubdomainSignup: (tld: string, subdomain: string, email: string, password: string) => Promise<void>;
  onSearch: (username: string) => Promise<string[]>;
} & RouteComponentProps<{username?: string}>;

function Onboarding(props: Props): ReactElement {
  const {
    match: {
      params,
    },
  } = props;

  const [viewType, setViewType] = useState<OnboardingViewType>(props.type);
  const [username, onUsernameChange] = useState(params?.username || '');
  const [query, onQueryChange] = useState('');
  const [addTLDPassword, setAddTLDPassword] = useState('');

  useEffect(() => {
    if (props.type === OnboardingViewType.LOGIN && params?.username) {
      onUsernameChange(params?.username);
      setViewType(OnboardingViewType.RELAYER_SUBDOMAIN_PASSWORD);
      return;
    }
    setViewType(props.type);
  }, [props.type, params?.username]);

  switch (viewType) {
    case OnboardingViewType.LOGIN:
      return (
        <Login
          username={username}
          onUsernameChange={onUsernameChange}
          setViewType={setViewType}
        />
      );
    case OnboardingViewType.RELAYER_SUBDOMAIN_PASSWORD:
      return (
        <PasswordLogin
          username={username}
          setViewType={setViewType}
          onSubdomainLogin={props.onSubdomainLogin}
          onTLDLogin={props.onTLDLogin}
        />
      );
    case OnboardingViewType.SUBDOMAIN_RESULTS:
      return (
        <SubdomainResults
          query={query}
          onQueryChange={onQueryChange}
          onUsernameChange={onUsernameChange}
          onSearch={props.onSearch}
          setViewType={setViewType}
        />
      );
    case OnboardingViewType.FIND_A_DOMAIN:
      return (
        <FindADomain
          username={query}
          onUsernameChange={onQueryChange}
          setViewType={setViewType}
        />
      );
    case OnboardingViewType.SIGNUP:
      return (
        <Signup
          username={username}
          onSubdomainSignup={props.onSubdomainSignup}
          setViewType={setViewType}
        />
      );
    case OnboardingViewType.SET_TLD_PASSWORD:
      return (
        <SetAPassword
          username={username}
          onPasswordChange={setAddTLDPassword}
          setViewType={setViewType}
        />
      );
    case OnboardingViewType.ADD_A_TLD:
      return (
        <AddATLD
          onAddTLD={props.onAddTLD}
          setViewType={setViewType}
          username={username}
          password={addTLDPassword}
        />
      );
    case OnboardingViewType.TLD_OPTIONS:
      return (
        <TLDOptions
          username={username}
          setViewType={setViewType}
        />
      );
    case OnboardingViewType.IMPORT_KEYSTORE:
      return (
        <ImportKeystore
          onAddTLD={props.onAddTLD}
          setViewType={setViewType}
        />
      );
    case OnboardingViewType.IMPORT_PRIVATE_KEY:
      return (
        <ImportPrivateKey
          onAddTLD={props.onAddTLD}
          setViewType={setViewType}
        />
      );
    default:
      return (
        <Redirect to="/discover" />
      );
  }
}

export default withRouter(Onboarding);
