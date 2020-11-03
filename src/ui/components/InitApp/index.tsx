import React, {ReactElement, ReactNode, useCallback, useState} from "react";
import {Redirect, Route, RouteComponentProps, Switch, withRouter} from "react-router";
import "./init-app.scss";
import Icon from "../../../../external/universal/components/Icon";
import Logo from "../../../../static/assets/icons/logo.svg";
import Button from "../../../../external/universal/components/Button";
import {useStartDDRP, useStopDDRP} from "../../helpers/hooks";
import {
  useDDRPStatus,
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
      <Route path="/onboarding/connection">{renderConnection(props)}</Route>
      <Route path="/onboarding/done">{renderDone(props)}</Route>
      {/*<Route path="/onboarding/terms">{renderTerms(props)}</Route>*/}
      <Route>
        <Redirect to="/onboarding/welcome" />
      </Route>
    </Switch>
  )
}

export default withRouter(InitApp);

function renderWelcome(props: RouteComponentProps) {
  const startDDRP = useStartDDRP();
  const endHeight = useHandshakeEndHeight();
  const startHeight = useHandshakeStartHeight();
  const ddrpStatus = useDDRPStatus();

  const next = useCallback(async () => {
    if (ddrpStatus !== 'on') {
      startDDRP();
    }
    props.history.push('/onboarding/connection')
  }, [startDDRP, props.history.push, ddrpStatus]);

  if (endHeight && endHeight === startHeight && ddrpStatus === 'on') {
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
          Nomad is a peer-to-peer, ownerless social network built on top of Handshake and DDRP. It allows you to view and interact with content from owners of Handshake TLDs or Subdomains.
        </div>
      </div>
      <div className="init-app__footer">
        <Button onClick={next}>
          Let's get started
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
          Nomad Explorer will automatically synchronize with the peer-to-peer network on start up. Initial synchronization with the network will take about 5 - 15 minutes.
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
  const startDDRP = useStartDDRP();
  const stopDDRP = useStopDDRP();
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
          onClick={() => props.history.push('/onboarding/terms')}
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
