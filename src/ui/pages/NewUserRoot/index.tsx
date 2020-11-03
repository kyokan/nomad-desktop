import React, {ReactElement, useCallback, useState} from "react";
import "./new-user-root.scss";
import "../index.scss";
import AddNewUserHeader from "../../components/Header/AddNewUserHeader";
import {Redirect, Route, Switch} from "react-router";
import WelcomePage from "./Welcome";
import TLDInstruction from "./TLDInstruction";
import TLDInput from "./TLDInput";
import {generateNewCompressedKey} from "../../../app/util/key";
import LoginPage from "./Login";
import {postIPCMain} from "../../helpers/ipc";
import {IPCMessageRequestType} from "../../../app/types";
import {MessagePort} from "../../components/SystemMessage";
import {useDispatch} from "react-redux";
import {addSystemMessage} from "../../ducks/app";
import {dotName} from "../../helpers/user";

export default function NewUserRoot (): ReactElement {
  const [userTld, onUserTLDChange] = useState('');
  const [tld, onTLDChange] = useState('');
  const [subdomain, onSubdomainChange] = useState('');
  const [email, onEmailChange] = useState('');
  const [password, onPasswordChange] = useState('');
  const [confirmPassword, onConfirmPasswordChange] = useState('');
  const [compressedKey, setCompressedKey] = useState(generateNewCompressedKey());
  const [isSending, setSending] = useState(false);
  const dispatch = useDispatch();

  const isSubdomainFormValid = !(!tld || !subdomain || !email || !password || (password !== confirmPassword));

  const resetCompressedKey = useCallback(() => {
    setCompressedKey(generateNewCompressedKey());
  }, []);

  const onSubdomainLogin = useCallback(async () => {
    if (isSending) return;

    setSending(true);

    if (!subdomain || !tld || !password) {
      dispatch(addSystemMessage({
        text: 'Form is invalid',
        type: 'error',
      }));
      setSending(false);
      return;
    }

    try {
      const resp = await postIPCMain({
        type: IPCMessageRequestType.ADD_EXISTING_SUBDOMAIN_IDENTITY,
        payload: {
          tld,
          subdomain,
          password,
        },
      }, true);

      if (resp.error) {
        dispatch(addSystemMessage({
          text: resp.payload,
          type: 'error',
        }));
        setSending(false);
        return;
      }

      dispatch(addSystemMessage({
        text: 'User Logged In',
        type: 'success',
      }));

      setTimeout(() => {
        window.close();
      }, 1000);
    } catch (e) {
      dispatch(addSystemMessage({
        text: e.message,
        type: 'error',
      }));
      setSending(false);
    }
  }, [dispatch, subdomain, tld, password]);

  const onSubdomainSignup = useCallback(async () => {
    if (isSending) return;

    setSending(true);

    if (!isSubdomainFormValid) {
      dispatch(addSystemMessage({
        text: 'Form is invalid',
        type: 'error',
      }));
      setSending(false);
      return;
    }

    try {
      const resp = await postIPCMain({
        type: IPCMessageRequestType.ADD_SUBDOMAIN_IDENTITY,
        payload: {
          tld: `${tld}.`,
          subdomain,
          email,
          password,
        },
      }, true);

      if (resp.error) {
        dispatch(addSystemMessage({
          text: resp.payload,
          type: 'error',
        }));
        setSending(false);

        return;
      }

      dispatch(addSystemMessage({
        text: 'User Created',
        type: 'success',
      }));

      setTimeout(() => {
        window.close();
      }, 1000);
    } catch (e) {
      dispatch(addSystemMessage({
        text: e.message,
        type: 'error',
      }));
      setSending(false);
    }

  }, [postIPCMain, tld, subdomain, email, password, confirmPassword, isSending]);

  const onNewTLDSubmit = useCallback(async () => {
    if (isSending) return;

    if (!userTld || !password || password !== confirmPassword) {
      dispatch(addSystemMessage({
        text: 'Form is invalid',
        type: 'error',
      }));
      setSending(false);
      return;
    }

    setSending(true);

    const resp = await postIPCMain({
      type: IPCMessageRequestType.ADD_TLD_IDENTITY,
      payload: {
        tld: dotName(userTld),
        password: password,
        privateKey: compressedKey.privateKey.toString('hex'),
      },
    }, true);

    if (resp.error) {
      dispatch(addSystemMessage({
        text: resp.payload,
        type: 'error',
      }));
      setSending(false);
      return;
    }

    dispatch(addSystemMessage({
      text: 'TLD Added',
      type: 'success',
    }));

    setTimeout(() => {
      window.close();
    }, 1000);
  }, [userTld, password, confirmPassword, dispatch, postIPCMain]);

  return (
    <div className="new-user">
      <AddNewUserHeader />
      <div className="new-user__content">
        <Switch>
          <Route path="/onboarding/welcome">
            <WelcomePage
              onTLDChange={onTLDChange}
              onSubdomainChange={onSubdomainChange}
              onEmailChange={onEmailChange}
              onPasswordChange={onPasswordChange}
              onConfirmPasswordChange={onConfirmPasswordChange}
              onSubdomainSignup={onSubdomainSignup}
              isSending={isSending}
            />
          </Route>
          <Route path="/onboarding/login">
            <LoginPage
              onTLDChange={onTLDChange}
              onSubdomainChange={onSubdomainChange}
              onPasswordChange={onPasswordChange}
              onSubdomainLogin={onSubdomainLogin}
              isSending={isSending}
            />
          </Route>
          <Route path="/onboarding/tld_input">
            <TLDInput
              tld={userTld}
              password={password}
              confirmPassword={confirmPassword}
              onTLDChange={onUserTLDChange}
              onPasswordChange={onPasswordChange}
              onConfirmPasswordChange={onConfirmPasswordChange}
            />
          </Route>
          <Route path="/onboarding/pubkey_gen">
            <TLDInstruction
              tld={userTld}
              compressedKey={compressedKey}
              resetCompressedKey={resetCompressedKey}
              onNewTLDSubmit={onNewTLDSubmit}
              isSending={isSending}
            />
          </Route>
          <Route>
            <Redirect to="/onboarding/welcome" />
          </Route>
        </Switch>
      </div>
      <MessagePort/>
    </div>
  );
}
