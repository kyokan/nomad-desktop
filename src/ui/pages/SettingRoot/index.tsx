import React, {ReactElement, useEffect} from "react";
import {Switch, Route, Redirect, withRouter, RouteComponentProps} from "react-router-dom";
import c from "classnames";
import "nomad-universal/lib/components/UserPanels/user-panels.scss";
import "nomad-universal/lib/components/Setting/settings.scss";
import "./setting-root.scss";
import "../index.scss";
import NetworkSetting from "./NetworkSetting";
import LogSetting from "./LogSetting";
import {version} from "../../../../package.json";
import {useCurrentUsername, useFetchUser, UsersActionType} from "nomad-universal/lib/ducks/users";
import DomainSetting from "nomad-universal/lib/components/DomainSetting";
import ProfileSetting from "nomad-universal/lib/components/ProfileSetting";
import ModerationSetting from "nomad-universal/lib/components/ModerationSetting";

import {useDispatch} from "react-redux";
import {fetchIdentity, useFileUpload, useSendPost} from "../../helpers/hooks";
import {INDEXER_API} from "nomad-universal/lib/utils/api";

function SettingRoot (props: RouteComponentProps): ReactElement {
  const dispatch = useDispatch();

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
  const fetchUser = useFetchUser();
  const dispatch = useDispatch();

  useEffect(() => {
    (async function() {
      if (currentUsername) {
        await fetchUser(currentUsername);
        const resp = await fetch(`${INDEXER_API}/blob/${currentUsername}/info`);
        const {
          payload: {
            publicKey,
          },
        } = await resp.json();
        dispatch({
          type: UsersActionType.SET_USER_PUBLIC_KEY,
          payload: {
            name: currentUsername,
            publicKey: publicKey,
          },
        });
      }
    })();
  }, [currentUsername, fetchUser, dispatch]);

  return (
    <div className="setting__nav">
      {
        !!currentUsername && (
          <div
            className={c('setting__nav__row', {
              'setting__nav__row--active': /domain/g.test(pathname),
            })}
            onClick={() => push('/settings/domain')}
          >
            Domain
          </div>
        )
      }
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
      <div
        className={c('setting__nav__row', {
          'setting__nav__row--active': /moderation/g.test(pathname),
        })}
        onClick={() => push('/settings/moderation')}
      >
        Moderation
      </div>
      <div className="setting__nav__version">
        Version {version}
      </div>
    </div>
  )
}

function renderSettingContent(): ReactElement {
  const onSendPost = useSendPost();
  const onFileUpload = useFileUpload();
  return (
    <div className="setting__content">
      <Switch>
        <Route path="/settings/domain">
          <DomainSetting
            sendPost={onSendPost}
          />
        </Route>
        <Route path="/settings/network">
          <NetworkSetting />
        </Route>
        <Route path="/settings/logs">
          <LogSetting />
        </Route>
        <Route path="/settings/profile">
          <ProfileSetting
            sendPost={onSendPost}
            onFileUpload={onFileUpload}
          />
        </Route>
        <Route path="/settings/moderation">
          <ModerationSetting />
        </Route>
        <Route>
          <Redirect to="/settings/domain" />
        </Route>
      </Switch>
    </div>
  );
}

