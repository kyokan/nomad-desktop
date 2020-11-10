import React, {ReactElement, ReactNode, useCallback, useEffect, MouseEvent} from "react";
import {RouteComponentProps, withRouter, Switch, Route} from "react-router-dom";
import {postIPCMain} from "../../../helpers/ipc";
import {IPCMessageRequestType} from "../../../../app/types";
import "./app-header.scss";
import {useDispatch} from "react-redux";
import {fetchIdentity, useIdentities} from "../../../ducks/users";
import Logo from "../../../../../static/assets/icons/logo-green.svg";
import Icon from "../../../../../external/universal/components/Icon";
import {useCurrentUsername, useUser} from "../../../../../external/universal/ducks/users";
import Button from "../../../../../external/universal/components/Button";
import Avatar from "../../../../../external/universal/components/Avatar";
import Menuable from "../../../../../external/universal/components/Menuable";
import {parseUsername} from "../../../../../external/universal/utils/user";
import {useAppData} from "../../../ducks/app";

function AppHeader(props: RouteComponentProps): ReactElement {
  const dispatch = useDispatch();

  useEffect(() => dispatch<any>(fetchIdentity()), []);

  return (
    <div className="app-header">
      <div className="app-header__content">
        <div className="app-header__content__l">
          {renderLeft(props)}
        </div>
        {renderRight(props)}
      </div>
    </div>
  );
}

export default withRouter(AppHeader);

function renderLeft(props: RouteComponentProps): ReactNode {
  return (
    <Switch>
      <Route path="/posts/:postHash">
        <Back />
      </Route>
      <Route path="/users/:username">
        <UserHeader />
      </Route>
      <Route>
        {(
          // @ts-ignore
          <Icon url={Logo} width={28} />
        )}
      </Route>
    </Switch>
  )
}

function renderRight(props: RouteComponentProps): ReactNode {
  const onSetting = useCallback(() => postIPCMain({
    type: IPCMessageRequestType.OPEN_SETTING_WINDOW,
    payload: null,
  }), []);

  const onCreate = useCallback(() => {
    props.history.push('/write');
  }, []);

  const onLogout = useCallback(async () => {
    await postIPCMain({
      type: IPCMessageRequestType.UNSET_CURRENT_USER,
      payload: null,
    }, true);
  }, []);

  const identities = useIdentities();
  const currentUsername = useCurrentUsername();

  if (!identities.length && !currentUsername) {
    return renderNoKnownUsers(props, onSetting);
  } else if (identities.length && !currentUsername) {
    return renderUnauthenticatedKnownUsers(
      props,
      onSetting,
      identities,
    );
  }

  return (
    <div className="app-header__content__r">
      <Icon
        material="home"
        width={28}
        onClick={() => props.history.push('/home')}
      />
      <Icon
        material="public"
        width={28}
        onClick={() => props.history.push('/discover')}
      />
      <Icon
        material="edit"
        width={28}
        onClick={onCreate}
      />
      <Menuable
        className="app-header__content__r__account-circle"
        items={[
          {
            forceRender: (closeModal) => renderMainAccount(props, currentUsername, true, closeModal, onLogout),
          },
          {divider: true,},
          ...identities
            .filter(username => username !== currentUsername)
            .map(username => ({
              forceRender: () => renderSwitchAccount(props, username),
            })),
          { forceRender: () => renderAddAnother(props) },
          {divider: true},
          {
            text: 'Download Keystore',
            onClick: (e: any) => {
              if (e.stopPropagation) e.stopPropagation();
              postIPCMain({
                type: IPCMessageRequestType.GET_USER_KEYSTORE,
                payload: currentUsername,
              }, true)
                .then(resp => {
                  const element = document.createElement('a');
                  element.setAttribute(
                    'href',
                    'data:text/plain;charset=utf-8,' + encodeURIComponent(resp.payload)
                  );
                  element.setAttribute('download', `${currentUsername}.key`);

                  element.style.display = 'none';
                  document.body.appendChild(element);

                  element.click();

                  document.body.removeChild(element);
                });
            },
          },
          {
            text: 'Settings',
            onClick: onSetting,
          },
        ]}
      >
        <Avatar username={currentUsername} />
      </Menuable>
    </div>
  );
}

const Back = withRouter(_Back);
function _Back(props: RouteComponentProps): ReactElement {
  return (
    // @ts-ignore
    <Icon
      className="app-header__content__l__back"
      material="keyboard_backspace"
      onClick={() => {
        if (props.history.length > 1) {
          props.history.goBack();
        } else {
          props.history.push('/home');
        }
      }}
      width={28}
    />
  )
}

const UserHeader = withRouter(_UserHeader);
function _UserHeader(props: RouteComponentProps<{username: string}>): ReactElement {
  const username = props.match.params.username;
  const { tld, subdomain } = parseUsername(username);
  const user = useUser(username);

  return (
    <div className="user-header__wrapper">
      {(
        // @ts-ignore
        <Icon
          className="app-header__content__l__back"
          material="keyboard_backspace"
          onClick={() => {
            if (props.history.length > 1) {
              props.history.goBack();
            } else {
              props.history.push('/home');
            }
          }}
          width={28}
        />
      )}
      <div
        className="user-header"
        onClick={() => props.history.push(`/users/${username}/timeline`)}
      >
        {/*<Avatar username={username} />*/}
        <div className="user-header__info">
          <div className="user-header__info__name">
            <div className="user-header__info__display-name">
              {user?.displayName || subdomain || tld}
            </div>
            <div className="user-header__info__username">
              {`@${username}`}
            </div>
          </div>
          <div className="user-header__info__stats">
            <div className="user-header__info__stats__number">
              {user?.stats?.followings || 0}
            </div>
            <div className="user-header__info__stats__unit">Following</div>
            <div className="user-header__info__stats__divider" />
            <div className="user-header__info__stats__number">
              {user?.stats?.followers || 0}
            </div>
            <div className="user-header__info__stats__unit">Followers</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderMainAccount(props: RouteComponentProps, username: string, isLoggedIn: boolean, closeModal?: () => void, onLogout?: () => void): ReactNode {
  const { tld, subdomain } = parseUsername(username);
  const user = useUser(username);

  return (
    <div
      className="main-account"
      onClick={() => props.history.push(`/users/${username}/timeline`)}
    >
      <Avatar username={username} />
      <div className="main-account__info">
        <div className="main-account__info__display-name">
          { user?.displayName || subdomain || tld }
        </div>
        <div className="main-account__info__username">
          {`@${username}`}
        </div>
      </div>
      <Button
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          if (isLoggedIn) {
            onLogout && onLogout();
          } else {
            props.history.push(`/login/${username}`);
          }
          closeModal && closeModal();
        }}
      >
        { isLoggedIn ? `Logout @${username}` : `Login @${username}` }
      </Button>
    </div>
  )
}

function renderSwitchAccount(props: RouteComponentProps, username: string): ReactNode {
  const { tld, subdomain } = parseUsername(username);
  const user = useUser(username);

  return (
    <div
      className="switch-account"
      onClick={() => props.history.push(`/login/${username}`)}
    >
      <Avatar username={username} />
      <div className="switch-account__info">
        <div className="switch-account__info__display-name">
          { user?.displayName || subdomain || tld }
        </div>
        <div className="switch-account__info__username">
          {`@${username}`}
        </div>
      </div>
    </div>
  )
}

function renderAddAnother(props: RouteComponentProps): ReactNode {
  return (
    <div className="add-account" onClick={() => props.history.push('/signup')}>
      <Icon material="person_add" width={18} />
      <div className="add-account__info">
        Add another domain name
      </div>
    </div>
  )
}

function renderNoKnownUsers(props: RouteComponentProps, onSetting: () => void) {
  return (
    <div className="app-header__content__r">
      <Icon
        material="public"
        width={28}
        onClick={() => props.history.push('/discover')}
      />
      <Icon
        material="settings"
        width={28}
        onClick={onSetting}
      />
      <Button
        className="header-button"
        onClick={() => props.history.push('/signup')}
      >
        Add User
      </Button>
    </div>
  );
}

function renderUnauthenticatedKnownUsers(props: RouteComponentProps, onSetting: () => void, identities: string[]) {
  const currentUsername = identities[0];
  return (
    <div className="app-header__content__r">
      <Icon
        material="home"
        width={28}
        onClick={() => props.history.push('/home')}
      />
      <Icon
        material="public"
        width={28}
        onClick={() => props.history.push('/discover')}
      />
      <Icon
        material="edit"
        width={28}
        onClick={() => undefined}
        disabled
      />
      <Menuable
        className="app-header__content__r__account-circle"

        items={[
          {
            forceRender: (closeModal) => {
              return renderMainAccount(
                props,
                currentUsername,
                false,
                closeModal,
                () => undefined,
              );
            },
          },
          {divider: true,},
          ...identities.slice(1).map(username => ({
            forceRender: () => renderSwitchAccount(props, username),
          })),
          {forceRender: () => renderAddAnother(props)},
          {divider: true,},
          {
            text: 'Settings',
            onClick: onSetting,
          },
        ]}
      >
        <Avatar username={currentUsername} />
      </Menuable>
    </div>
  );
}
