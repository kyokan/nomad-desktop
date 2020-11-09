import React, {ReactElement, ReactNode, useCallback, useEffect, useState} from "react";
import {Redirect, Route, RouteComponentProps, Switch, withRouter} from "react-router";
import c from 'classnames';
import "./init-app.scss";
import Icon from "../../../../external/universal/components/Icon";
import Logo from "../../../../static/assets/icons/logo-green.svg";
import Button from "../../../../external/universal/components/Button";
import {
  useGetConnection,
  useSetAPIKey,
  useSetBasePath,
  useSetHost, useSetHSDConnectionType,
  useSetPort,
  useStartFND,
  useStartHSD,
  useStopFND, useStopHSD
} from "../../helpers/hooks";
import {
  useFNDStatus,
  useFetchAppData,
  useHandshakeEndHeight,
  useHandshakeStartHeight, useAppData,
} from "../../ducks/app";
import {postIPCMain} from "../../helpers/ipc";
import {APP_DATA_EVENT_TYPES} from "../../../app/types";

type Props = {
  setBrowsing: (isBrowsing: boolean) => void;
} & RouteComponentProps;

function InitApp(props: Props): ReactElement {
  return (
    <Switch>
      <Route path="/onboarding/welcome">{renderWelcome(props)}</Route>
      <Route path="/onboarding/setup-hsd">{renderHSDConfig(props)}</Route>
      <Route path="/onboarding/connection">{renderConnection(props)}</Route>
      <Route path="/onboarding/done">{renderDone(props)}</Route>
      <Route path="/onboarding/terms">{renderTerms(props)}</Route>
      <Route>
        <Redirect to="/onboarding/welcome" />
      </Route>
    </Switch>
  )
}

export default withRouter(InitApp);

function renderWelcome(props: RouteComponentProps) {
  const endHeight = useHandshakeEndHeight();
  const startHeight = useHandshakeStartHeight();
  const fndStatus = useFNDStatus();
  const appData = useAppData();

  if (endHeight && endHeight === startHeight && fndStatus === 'on') {
    return <Redirect to="/onboarding/done" />
  }

  if (endHeight) {
    return <Redirect to="/onboarding/connection" />
  }

  if (appData.handshakeConnectionType === "P2P") {
    return <Redirect to="/onboarding/connection" />
  }

  return (
    <div className="init-app">
      <div className="init-app__header__title">
        <Icon
          url={Logo}
          width={24}
        />
        Welcome to Nomad
      </div>
      <div className="init-app__content">
        <div className="init-app__header__paragraph">
          Nomad is a peer-to-peer, ownerless social network built on top of Handshake and Footnote. It allows you to view and interact with content from owners of Handshake names.
        </div>
      </div>
      <div className="init-app__footer">
        <Button onClick={() => props.history.push('/onboarding/terms')}>
          Let's get started
        </Button>
      </div>
    </div>
  )
}

function renderHSDConfig(props: Props): ReactNode {
  const startHSD = useStartHSD();
  const stopHSD = useStopHSD();
  const setHost = useSetHost();
  const setPort = useSetPort();
  const setApiKey = useSetAPIKey();
  const setBasePath = useSetBasePath();
  const startFND = useStartFND();
  const [isLoading, setLoading] = useState(false);
  const [hasAPI, setHasAPI] = useState(false);
  const [_host, setHostDraft] = useState('');
  const [_port, setPortDraft] = useState('');
  const [_apiKey, setApiKeyDraft] = useState('');
  const [_base, setBaseDraft] = useState('');

  const next = useCallback(async () => {
    setLoading(true);
    if (!hasAPI) {
      await startHSD();
    } else {
      await setHost(_host);
      await setPort(_port);
      await setApiKey(_apiKey);
      await setBasePath(_base);
      await stopHSD();
    }
    await startFND();
    props.history.push('/onboarding/connection');
  }, [
    startHSD,
    props.history.push,
    _host,
    _port,
    _apiKey,
    _base,
  ]);

  return (
    <div className="init-app hsd-config">
      <div className="init-app__header__title">
        <Icon
          url={Logo}
          width={24}
        />
        Network Setting
      </div>
      <div className="init-app__content">
        <div className="init-app__paragraph">
          In order to verify name ownership, Nomad need API access to retrieve name records from a Handshake daemon.
        </div>
        <div className="init-app__paragraph">
          Do you already have API access to a Handshake node?
        </div>
        <div className="init-app__paragraph">
          <div
            className={c("init-app__hsd-form", {
              "init-app__hsd-form--disabled": !hasAPI,
            })}
          >
            <div className="init-app__row init-app__hsd-row">
              <input
                className="init-app__checkbox"
                type="radio"
                checked={!hasAPI}
                onClick={() => setHasAPI(!hasAPI)}
              />
              <div className="init-app__checkbox-label">No - run a HSD daemon for me</div>
            </div>
            <div className="init-app__row init-app__hsd-row">
              <input
                className="init-app__checkbox"
                type="radio"
                checked={hasAPI}
                onClick={() => setHasAPI(!hasAPI)}
              />
              <div className="init-app__checkbox-label">Yes - I will provide API information</div>
            </div>
            <div className={c("init-app__rpc-form", {
              "init-app__rpc-form--disabled": !hasAPI,
            })}>
              <div className="init-app__rpc-form-row">
                <div className="init-app__rpc-form-row__label">
                  Host
                </div>
                <input
                  type="text"
                  disabled={!hasAPI}
                  value={_host}
                  placeholder="http://127.0.0.1"
                  onChange={e => {
                    const val = e.target.value;
                    setHostDraft(val);
                  }}
                />
              </div>
              <div className="init-app__rpc-form-row">
                <div className="init-app__rpc-form-row__label">
                  Port
                </div>
                <input
                  type="text"
                  disabled={!hasAPI}
                  value={_port}
                  placeholder="12037"
                  onChange={e => {
                    const val = e.target.value;
                    setPortDraft(val.replace(/\D/g,''));
                  }}
                />
              </div>
              <div className="init-app__rpc-form-row">
                <div className="init-app__rpc-form-row__label">
                  API Key
                </div>
                <input
                  type="text"
                  disabled={!hasAPI}
                  value={_apiKey}
                  onChange={e => {
                    const val = e.target.value;
                    setApiKeyDraft(val);
                  }}
                />
              </div>
              <div className="init-app__rpc-form-row">
                <div className="init-app__rpc-form-row__label">
                  Base
                </div>
                <input
                  type="text"
                  disabled={!hasAPI}
                  value={_base}
                  onChange={e => {
                    const val = e.target.value;
                    setBaseDraft(val);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="init-app__footer">
        <Button
          onClick={next}
          disabled={isLoading || (hasAPI && !_host)}
          loading={isLoading}
        >
          Next Step
        </Button>
      </div>
    </div>
  )
}

function renderConnection(props: Props): ReactNode {
  const appData = useAppData();
  let remainingTimeText = 'Initial synchronization with the network will take about 5 - 15 minutes.';

  if (appData.handshakeConnectionType === 'P2P' && appData.handshakeSyncProgress < 1) {
    remainingTimeText = 'Initial synchronization with the network will take about 6 - 8 hours.';
  }

  return (
    <div className="init-app">
      <div className="init-app__header__title">
        <Icon
          url={Logo}
          width={24}
        />
        Initial Synchronization
      </div>
      <div className="init-app__content">
        <div className="init-app__paragraph">
          {`Nomad Desktop will automatically synchronize with Footnote on start up. ${remainingTimeText}`}
        </div>
        {/*<div className="init-app__paragraph">*/}
        {/*  You can start browsing using our hosted Nomad API as a fallback. Nomad Desktop will prompt you to switch back to peer-to-peer mode when synchronization is completed.*/}
        {/*</div>*/}
      </div>
      <div className="init-app__footer">
        {/*<Button onClick={() => props.setBrowsing(true)}>*/}
        {/*  Start Browsing*/}
        {/*</Button>*/}
      </div>
    </div>
  )
}

function renderDone(props: Props): ReactNode {
  const [loading, setLoading] = useState(false);
  const fetchAppData = useFetchAppData();
  const startFND = useStartFND();
  const stopFND = useStopFND();
  const restartDDRP = useCallback(async () => {
    if (loading) return;
    await stopFND();
    await wait(1000);
    startFND();
  }, [startFND, stopFND, loading]);

  const done = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    await postIPCMain({
      type: APP_DATA_EVENT_TYPES.INITIALIZE_APP,
      payload: null,
    }, true);

    await restartDDRP();
    await fetchAppData();
  }, [postIPCMain, fetchAppData, loading]);
  return (
    <div className="init-app">
      <div className="init-app__header__title">
        <Icon
          url={Logo}
          width={24}
        />
        Shynchronization Complete
      </div>
      <div className="init-app__content">
        <div className="init-app__paragraph">
          Nomad Explorer is ready to use!
        </div>
      </div>
      <div className="init-app__footer">
        <Button
          onClick={done}
          loading={loading}
          disabled={loading}
        >
          Start Browsing
        </Button>
      </div>
    </div>
  )
}

function renderTerms(props: RouteComponentProps): ReactNode {
  const [accepted, accept] = useState(false);
  return (
    <div className="init-app">
      <div className="init-app__header__title">
        <Icon
          url={Logo}
          width={24}
        />
        Terms of Service
      </div>
      <div className="init-app__content">
        <div className="init-app__paragraph">
          <div className="init-app__paragraph__list">1. Nomad is a peer-to-peer network without an owner.</div>
          <div className="init-app__paragraph__list">2. You own all the content you create.</div>
          <div className="init-app__paragraph__list">3. Please don't be malicious, abusive, or do anything illegal.</div>
          <div className="init-app__paragraph__list">4. Have fun 😃!</div>
        </div>
      </div>
      <div className="init-app__row">
        <input
          className="init-app__checkbox" type="checkbox"
          onChange={e => accept(e.target.checked)}
        />
        <div className="init-app__checkbox-label">I accept the terms of service</div>
      </div>
      <div className="init-app__footer">
        <Button
          onClick={() => props.history.push('/onboarding/setup-hsd')}
          disabled={!accepted}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function wait(ms= 0): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
}
