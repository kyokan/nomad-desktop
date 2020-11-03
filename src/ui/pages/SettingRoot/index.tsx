import React, {ChangeEvent, ReactElement, ReactNode, useCallback, useEffect, useState} from "react";
import {Switch, Route, Redirect, withRouter, RouteComponentProps} from "react-router-dom";
import c from "classnames";
import "./setting-root.scss";
import "../index.scss";
import SettingHeader from "../../components/Header/SettingHeader";
import NetworkSetting from "./NetworkSetting";
import LogSetting from "./LogSetting";
import ProfileSetting from "./ProfileSetting";
import {useCurrentUsername} from "../../../../../universal/ducks/users";
import {fetchIdentity} from "../../ducks/users";
import {useDispatch} from "react-redux";

function SettingRoot (props: RouteComponentProps): ReactElement {
  const dispatch = useDispatch();
  // @ts-ignore
  useEffect(() => {
    dispatch(fetchIdentity())
  }, []);

  return (
    <div className="setting">
      {renderSettingNav(props)}
      {renderSettingContent()}
    </div>
  )
}

export default withRouter(SettingRoot);

function renderSettingNav(props: RouteComponentProps): ReactElement {
  const {
    location: { pathname },
    history: { push },
  } = props;

  const currentUsername = useCurrentUsername();

  return (
    <div className="setting__nav">
      <div
        className={c('setting__nav__row', {
          'setting__nav__row--active': /network/g.test(pathname),
        })}
        onClick={() => push('/settings/network')}
      >
        Network
      </div>
      <div
        className={c('setting__nav__row', {
          'setting__nav__row--active': /logs/g.test(pathname),
        })}
        onClick={() => push('/settings/logs')}
      >
        Logs
      </div>
      {
        !!currentUsername && (
          <div
            className={c('setting__nav__row', {
              'setting__nav__row--active': /profile/g.test(pathname),
            })}
            onClick={() => push('/settings/profile')}
          >
            Profile
          </div>
        )
      }
    </div>
  )
}

function renderSettingContent(): ReactElement {
  return (
    <div className="setting__content">
      <Switch>
        <Route path="/settings/network">
          <NetworkSetting />
        </Route>
        <Route path="/settings/logs">
          <LogSetting />
        </Route>
        <Route path="/settings/profile">
          <ProfileSetting />
        </Route>
        <Route>
          <Redirect to="/settings/network" />
        </Route>
      </Switch>
    </div>
  );
}

