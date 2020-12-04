import React, {ReactElement, ReactNode, useCallback, useEffect, useState} from "react";
import {Redirect, Route, Switch, withRouter, RouteComponentProps} from "react-router";
import Footer from '../../components/Footer';
import "./root.scss";
import "../railcasts.scss";
import "../index.scss";
import "./styles/menu.scss";
import {MessagePort} from "../../components/SystemMessage";
import {CustomViewContainer} from "nomad-universal/lib/components/CustomFilterView";
import UserView from "nomad-universal/lib/components/UserView";
import DiscoverView from "nomad-universal/lib/components/DiscoverView";
import UserDirectoryView from "nomad-universal/lib/components/UserDirectoryView";
import {
  fetchUserFollowings,
  fetchUserLikes,
  useCurrentUsername,
  useFetchUser
} from "nomad-universal/lib/ducks/users";
import {useDispatch} from "react-redux";
import HomeView from "nomad-universal/lib/components/HomeView";
import {
  sendReply,
  useBlockUser,
  useCreateNewView,
  useFollowUser,
  useLikePage,
  useSaveCustomView,
  fetchCurrentUserData,
  useFileUpload,
  useSendPost, fetchIdentity,
} from "../../helpers/hooks";
import {useFetchAppData, useHydrated, useInitialized} from "../../ducks/app";
import InitApp from "../../components/InitApp";
import DiscoverPanels from "nomad-universal/lib/components/DiscoverPanels";
import UserPanels from "nomad-universal/lib/components/UserPanels";
import Onboarding, {OnboardingViewType} from "nomad-universal/lib/components/Onboarding";
import {postIPCMain} from "../../helpers/ipc";
import {IPCMessageRequestType} from "../../../app/types";
import SearchView from "nomad-universal/lib/components/SearchView";
import SearchPanels from "nomad-universal/lib/components/SearchPanels";
import SavedView from "nomad-universal/lib/components/SavedView";
import SavedViewPanels from "nomad-universal/lib/components/SavedViewPanels";
import BlocksView from "nomad-universal/lib/components/UserView/BlocksView";
import FollowingView from "nomad-universal/lib/components/UserView/FollowingView";
import FollowersView from "nomad-universal/lib/components/UserView/FollowersView";
import ComposeView from "nomad-universal/lib/components/ComposeView";
import AppHeader from "nomad-universal/lib/components/AppHeader";
import {FullScreenModal} from "nomad-universal/lib/components/FullScreenModal";
import Icon from "nomad-universal/lib/components/Icon";
import Logo from "../../../../static/assets/icons/logo-green.svg";
import Button from "nomad-universal/lib/components/Button";
import {shell} from 'electron';

function Root(props: RouteComponentProps): ReactElement {
  const dispatch = useDispatch();
  const currentUsername = useCurrentUsername();
  const fetchUser = useFetchUser();
  const fetchAppData = useFetchAppData();
  const initialized = useInitialized();
  const hydrated = useHydrated();
  const [isBrowsing, setBrowsing] = useState<boolean>(false);
  const [isClosed, closeModal] = useState<boolean>(true);

  const onSetting = useCallback(() => postIPCMain({
    type: IPCMessageRequestType.OPEN_SETTING_WINDOW,
    payload: null,
  }), []);

  const onLogout = useCallback(async () => {
    await postIPCMain({
      type: IPCMessageRequestType.UNSET_CURRENT_USER,
      payload: null,
    }, true);
  }, []);

  useEffect(() => dispatch<any>(fetchIdentity()), []);

  useEffect(() => {
    (async function onAppMount() {
      await fetchAppData();
      if (currentUsername) {
        await fetchUser(currentUsername);
        dispatch(fetchUserLikes(currentUsername));
        dispatch(fetchUserFollowings(currentUsername));
        dispatch(fetchCurrentUserData());
      }
    }());
  }, [currentUsername, fetchUser, dispatch]);

  const summary = renderSummary();
  const panels = renderPanels();

  const showContent = initialized || isBrowsing;

  return (
    <div className="app">
      <AppHeader
        signup={() => props.history.push('/signup')}
        signupText="Add User"
        logoUrl={Logo}
        onSetting={onSetting}
        onLogout={onLogout}
        multiAccount
      />
      <div className="content">
        <div className="content__body">
          { showContent && summary }
          { showContent && panels }
          { !showContent && hydrated && <InitApp setBrowsing={setBrowsing} /> }
        </div>
      </div>
      <Footer showingFallback={!initialized && isBrowsing}/>
      <MessagePort/>
      {
        !isClosed && (
          <FullScreenModal onClose={() => closeModal(true)}>
            <div className="init-app">
              <div className="init-app__header__title">
                <Icon
                  url={Logo}
                  width={24}
                />
                Welcome to Nomad! ✌
              </div>
              <div className="init-app__content">
                <div className="init-app__header__paragraph">
                  This a pre-release version of Nomad and will not be supported after 60 days. Stay tune for stable release in the next few weeks!
                </div>
              </div>
              <div className="init-app__footer">
                <Button onClick={() => closeModal(true)}>
                  Got it
                </Button>
              </div>
            </div>
          </FullScreenModal>
        )
      }

    </div>
  );
}


function renderSummary(): ReactNode {
  const onLikePost = useLikePage();
  const onBlockUser = useBlockUser();
  const onFollowUser = useFollowUser();
  const dispatch = useDispatch();
  // const initialized = useInitialized();

  const onSendReply = useCallback(async (postHash: string) => {
    dispatch(sendReply(postHash));
  }, [dispatch]);

  const onSubdomainLogin = useCallback(async (tld: string, subdomain: string, password: string) => {
    return postIPCMain({
      type: IPCMessageRequestType.ADD_EXISTING_SUBDOMAIN_IDENTITY,
      payload: {
        tld,
        subdomain,
        password,
      },
    }, true);
  }, [postIPCMain]);

  const onSubdomainSignup = useCallback(async (tld: string, subdomain: string, email: string, password: string) => {
    return postIPCMain({
      type: IPCMessageRequestType.ADD_SUBDOMAIN_IDENTITY,
      payload: {
        tld,
        subdomain,
        email,
        password,
      },
    }, true);
  }, [postIPCMain]);

  const onTLDLogin = useCallback(async (tld: string, password: string) => {
    return postIPCMain({
      type: IPCMessageRequestType.SET_CURRENT_USER,
      payload: {
        name: tld,
        password,
      },
    }, true);
  }, [postIPCMain]);

  const onAddTLD = useCallback(async (tld: string, password: string, privateKey: string) => {
    return postIPCMain({
      type: IPCMessageRequestType.ADD_TLD_IDENTITY,
      payload: {
        tld,
        password,
        privateKey,
      },
    }, true);
  }, [postIPCMain]);

  const onSearch = useCallback(async (username: string) => {
    return [];
  }, []);

  const sendPost = useSendPost();
  const fileUpload = useFileUpload();

  const onOpenLink = useCallback((url: string) => {
    shell.openExternal(url);
  }, []);
  return (
    <Switch>
      <Route path="/directory">
        <UserDirectoryView
          onFollowUser={onFollowUser}
        />
      </Route>
      <Route path="/posts/:postHash">
        <DiscoverView
          onLikePost={onLikePost}
          onSendReply={onSendReply}
          onBlockUser={onBlockUser}
          onFollowUser={onFollowUser}
          onOpenLink={onOpenLink}
        />
      </Route>
      <Route path="/users/:username/blocks">
        <BlocksView
          onFollowUser={onFollowUser}
        />
      </Route>
      <Route path="/users/:username/following">
        <FollowingView
          onFollowUser={onFollowUser}
        />
      </Route>
      <Route path="/users/:username/followers">
        <FollowersView
          onFollowUser={onFollowUser}
        />
      </Route>
      <Route path="/users/:username/:viewType?">
        <UserView
          onLikePost={onLikePost}
          onSendReply={onSendReply}
          onBlockUser={onBlockUser}
          onFollowUser={onFollowUser}
          onOpenLink={onOpenLink}
        />
      </Route>
      <Route path="/discover">
        <DiscoverView
          onLikePost={onLikePost}
          onSendReply={onSendReply}
          onBlockUser={onBlockUser}
          onFollowUser={onFollowUser}
          onOpenLink={onOpenLink}
        />
      </Route>
      <Route path="/views/:viewIndex">
        <SavedView
          onLikePost={onLikePost}
          onSendReply={onSendReply}
          onBlockUser={onBlockUser}
          onFollowUser={onFollowUser}
          onOpenLink={onOpenLink}
        />
      </Route>
      <Route path="/search">
        <SearchView
          onLikePost={onLikePost}
          onSendReply={onSendReply}
          onBlockUser={onBlockUser}
          onFollowUser={onFollowUser}
          onOpenLink={onOpenLink}
        />
      </Route>
      <Route path="/home">
        <HomeView
          onLikePost={onLikePost}
          onSendReply={onSendReply}
          onBlockUser={onBlockUser}
          onFollowUser={onFollowUser}
          onOpenLink={onOpenLink}
        />
      </Route>
      <Route path="/custom-view/:viewIndex">
        <CustomViewContainer
          onLikePost={onLikePost}
          onSendReply={onSendReply}
          onBlockUser={onBlockUser}
          onFollowUser={onFollowUser}
          onOpenLink={onOpenLink}
        />
      </Route>
      <Route path="/login/:username?">
        <Onboarding
          type={OnboardingViewType.LOGIN}
          onSubdomainLogin={onSubdomainLogin}
          onSubdomainSignup={onSubdomainSignup}
          onTLDLogin={onTLDLogin}
          onSearch={onSearch}
          onAddTLD={onAddTLD}
        />
      </Route>
      <Route path="/signup">
        <Onboarding
          type={OnboardingViewType.LOGIN}
          onSubdomainLogin={onSubdomainLogin}
          onSubdomainSignup={onSubdomainSignup}
          onTLDLogin={onTLDLogin}
          onSearch={onSearch}
          onAddTLD={onAddTLD}
        />
      </Route>
      <Route path="/write">
        <ComposeView
          onFileUpload={() => Promise.reject('not supported')}
          onSendPost={sendPost}
          onOpenLink={onOpenLink}
        />
      </Route>
      <Route>
        <Redirect to="/discover" />
      </Route>
    </Switch>
  )
}

function renderPanels(): ReactNode {
  const onCreateNewView = useCreateNewView();
  const onSaveCustomView = useSaveCustomView();
  return (
      <Switch>
        <Route path="/discover">
          <div className="panels">
            <DiscoverPanels />
          </div>
        </Route>
        <Route path="/views/:viewIndex">
          <div className="panels">
            <SavedViewPanels
              onUpdateView={onSaveCustomView}
            />
          </div>
        </Route>
        <Route path="/search">
          <div className="panels">
            <SearchPanels
              onCreateNewView={onCreateNewView}
            />
          </div>
        </Route>
        <Route path="/directory">
          <div className="panels" />
        </Route>
        <Route path="/home">
          <div className="panels">
          </div>
        </Route>
        <Route path="/posts/:postHash">
          <div className="panels">
          </div>
        </Route>
        <Route path="/users/:username">
          <div className="panels">
            <UserPanels />
          </div>
        </Route>
      </Switch>
  )
}

export default withRouter(Root);

