import React, {ReactElement, useEffect} from "react";
import "./nav.scss";
import DiscoverIcon from '../../../../static/assets/icons/discover.png';
import UserColorIcon from '../../../../static/assets/icons/user-color.svg';
import ConfettiIcon from '../../../../static/assets/icons/confetti.svg';
import HomeIcon from '../../../../static/assets/icons/home.svg';
import FilterIcon from '../../../../static/assets/icons/filter.svg';
import Resizable from '../Resizable';
import NavRow from './NavRow';
import NavGroup from './NavGroup';
import {RouteComponentProps, withRouter} from "react-router";
import {useDispatch} from "react-redux";
import {useCurrentUser, userCurrentSavedViews} from "../../ducks/users";

type Props = RouteComponentProps<{topic?: string; username?: string}>;

function Nav(props: Props): ReactElement {
  const currentUser = useCurrentUser();
  const savedViews = userCurrentSavedViews();

  useEffect(() => {
    (async function onNavMount() {
      // dispatch(fetchFavorites());
    }())
  }, []);

  // const topics = useTopics();
  //
  // const rows = topics.map(topic => {
  //   return (
  //     <NavRow
  //       key={topic}
  //       selected={topic === props.location.pathname.split('/')[2]}
  //       iconUrl={StarIcon}
  //       title={topic}
  //       unreads={0}
  //       onClick={() => {
  //         props.history.push(`/topics/${topic}`);
  //       }}
  //     />
  //   );
  // });

  // const {posts} = useSelector((state: AppRootState) => ({
  //   posts: state.posts,
  // }), (a, b) => Object.keys(a).join() === Object.keys(b).join());

  const pinned = [(
    <NavRow
      key={'Welcome To Nomad'}
      iconUrl={ConfettiIcon}
      title={`What's New?`}
      selected={props.location.pathname.includes('welcome-to-nomad')}
      onClick={e => {
        (e.target as any).blur();
        props.history.push('/welcome-to-nomad');
      }}
    />
  )];

  if (currentUser.name) {
    pinned.push(
      <NavRow
        key="home"
        iconUrl={HomeIcon}
        title="Home"
        selected={props.location.pathname.includes('home')}
        unreads={0}
        onClick={e => {
          (e.target as any).blur();
          props.history.push('/home');
        }}
      />
    );

    pinned.push(
      <NavRow
        key="profile"
        iconUrl={UserColorIcon}
        title="Profile"
        selected={props.location.pathname.includes(`/users/${currentUser.name}`)}
        unreads={0}
        onClick={e => {
          (e.target as any).blur();
          props.history.push(`/users/${currentUser.name}/timeline`);
        }}
      />
    );
  }

  pinned.push(
    <NavRow
      key="explore"
      iconUrl={DiscoverIcon}
      title="Explore"
      selected={props.location.pathname.includes('discover')}
      unreads={0}
      onClick={e => {
        (e.target as any).blur();
        props.history.push('/discover');
      }}
    />
  );

  return (
    <Resizable
      className="nav"
      defaultWidth={290}
    >
      <NavGroup title="Pinned">
        { pinned }
      </NavGroup>
      <NavGroup title="Saved Filters">
        {savedViews.map((view, i) => (
          <NavRow
            key={`nav-row-cv-${i}`}
            iconUrl={FilterIcon}
            title={view.title}
            selected={props.location.pathname === `/custom-view/${i}`}
            onClick={e => {
              (e.target as any).blur();
              props.history.push(`/custom-view/${i}`);
            }}
          />
        ))}
      </NavGroup>
    </Resizable>
  );

  // function renderRssRow(url: string) {
  //   const { host, pathname } = new URL(url);
  //   return (
  //     <NavRow
  //       iconUrl="https://upload.wikimedia.org/wikipedia/en/thumb/4/43/Feed-icon.svg/1200px-Feed-icon.svg.png"
  //       title={`${host}${pathname}`}
  //       // selected={props.location.pathname.includes('discover')}
  //       unreads={0}
  //       onClick={e => {
  //         (e.target as any).blur();
  //         props.history.push(`/rss/${encodeURIComponent(url)}`);
  //       }}
  //     />
  //   )
  // }
}

export default withRouter(Nav);
