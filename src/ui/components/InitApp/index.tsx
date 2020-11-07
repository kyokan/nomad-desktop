import React, {ReactElement, ReactNode, useCallback, useState} from "react";
import {Redirect, Route, RouteComponentProps, Switch, withRouter} from "react-router";
import c from 'classnames';
import "./init-app.scss";
import Icon from "../../../../external/universal/components/Icon";
import Logo from "../../../../static/assets/icons/logo.svg";
import Button from "../../../../external/universal/components/Button";
import {useStartFND, useStartHSD, useStopFND} from "../../helpers/hooks";
import {
  useFNDStatus,
  useFetchAppData,
  useHandshakeEndHeight,
  useHandshakeStartHeight,
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

  if (endHeight && endHeight === startHeight && fndStatus === 'on') {
    return <Redirect to="/onboarding/done" />
  }

  if (endHeight) {
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
  const start = useStartHSD();
  const [hasAPI, setHasAPI] = useState(false);
  const next = useCallback(async () => {
    await start();
    props.history.push('/onboarding/connection')
  }, [start, props.history.push]);

  return (
    <div className="init-app hsd-config">
      <div className="init-app__header__title">
        <Icon
          url={Logo}
          width={24}
        />
        Configure Handshake
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
                <input type="text" disabled={!hasAPI}/>
              </div>
              <div className="init-app__rpc-form-row">
                <div className="init-app__rpc-form-row__label">
                  Port
                </div>
                <input type="text" disabled={!hasAPI}/>
              </div>
              <div className="init-app__rpc-form-row">
                <div className="init-app__rpc-form-row__label">
                  API Key
                </div>
                <input type="text" disabled={!hasAPI}/>
              </div>
              <div className="init-app__rpc-form-row">
                <div className="init-app__rpc-form-row__label">
                  Base
                </div>
                <input type="text" disabled={!hasAPI}/>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="init-app__footer">
        <Button onClick={next}>
          Next Step
        </Button>
      </div>
    </div>
  )
}

function renderConnection(props: Props): ReactNode {
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
          Nomad Explorer will automatically synchronize with Footnote on start up. Initial synchronization with the network will take about 5 - 15 minutes.
        </div>
        <div className="init-app__paragraph">
          You can start browsing using Nomad API as a fallback. Nomad Explorer will prompt you to switch back to peer-to-peer mode when synchronization is completed.
        </div>
      </div>
      <div className="init-app__footer">
        <Button onClick={() => props.setBrowsing(true)}>
          Start Browsing
        </Button>
      </div>
    </div>
  )
}

function renderDone(props: Props): ReactNode {
  const [loading, setLoading] = useState(false);
  const fetchAppData = useFetchAppData();
  const startDDRP = useStartFND();
  const stopDDRP = useStopFND();
  const restartDDRP = useCallback(async () => {
    if (loading) return;
    await stopDDRP();
    await wait(1000);
    startDDRP();
  }, [startDDRP, stopDDRP, loading]);

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
