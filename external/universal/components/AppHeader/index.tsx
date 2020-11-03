// @ts-ignore
import React, {ReactElement, ReactNode, useCallback, useEffect, MouseEvent} from "react";
// @ts-ignore
import {RouteComponentProps, withRouter, Switch, Route} from "react-router-dom";
import "./app-header.scss";
// @ts-ignore
import {useDispatch} from "react-redux";
import Icon from "../Icon";
import {fetchIdentity, useCurrentUsername, useUser, useIdentities, setCurrentUser} from "../../ducks/users";
import Button from "../Button";
import Avatar from "../Avatar";
import Menuable from "../Menuable";
import {parseUsername} from "../../utils/user";

type Props = { logoUrl: string } & RouteComponentProps;
function AppHeader(props: Props): ReactElement {
  const dispatch = useDispatch();

  useEffect(() => dispatch(fetchIdentity()), []);

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

function renderLeft(props: Props): ReactNode {
  return (
    <Switch>
      <Route path="/posts/:postHash">
        <Back />
      </Route>
      <Route path="/search">
        <Back />
      </Route>
      <Route path="/write">
        <Back />
      </Route>
      <Route path="/users/:username/:viewType?">
        <UserHeader />
      </Route>
      <Route>
        {(
          // @ts-ignore
          <Icon className="app-logo" url={props.logoUrl} width={28} />
        )}
      </Route>
    </Switch>
  )
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

function renderRight(props: RouteComponentProps): ReactNode {
  const dispatch = useDispatch();
  const onSetting = useCallback(() => props.history.push(`/settings`), []);

  const onCreate = useCallback(() => props.history.push(`/write`), []);

  const onLogout = useCallback(async () => {
    localStorage.removeItem('nomad_token');
    dispatch(setCurrentUser(''));
  }, [dispatch]);

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
        onClick={(e: MouseEvent) => {
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
      {(
        // @ts-ignore
        <Icon material="person_add" width={18} />
      )}
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
      {/*<Icon*/}
      {/*  material="settings"*/}
      {/*  width={28}*/}
      {/*  onClick={onSetting}*/}
      {/*/>*/}
      {/*<Button*/}
      {/*  className="header-button"*/}
      {/*  onClick={() => props.history.push('/login')}*/}
      {/*>*/}
      {/*  Login*/}
      {/*</Button>*/}
      {/*<Button*/}
      {/*  className="header-button"*/}
      {/*  onClick={() => props.history.push('/signup')}*/}
      {/*>*/}
      {/*  Sign Up*/}
      {/*</Button>*/}
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
          // {forceRender: () => renderAddAnother(props)},
          // {divider: true,},
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
