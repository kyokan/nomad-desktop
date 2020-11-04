import React, {ReactElement, ReactNode, useState, useEffect} from "react";
import { withRouter, RouteComponentProps} from "react-router";
import {useDispatch} from "react-redux";
import "./user-panels.scss";
import {fetchUserFollowings, useFetchUser, useUser} from "../../ducks/users";
import {parseUsername, serializeUsername} from "../../utils/user";
import Avatar from "../Avatar";
import {INDEXER_API} from "../../utils/api";
import {IPCMessageResponse} from "../../../../src/app/types";
import {Pageable} from '../../../indexer/dao/Pageable';
import {Connection as DomainConnection} from '../../../indexer/domain/Connection';

function UserPanels(props: RouteComponentProps<{username: string}>): ReactElement {
  const username = props.match.params.username;
  const fetchUser = useFetchUser();

  useEffect(() => {
    fetchUser(username);
  }, [fetchUser, username]);


  return (
    <div className="user-panels">
      {/*{renderFileUploads(props)}*/}
      {renderFollowings(props)}
      {renderFollowers(props)}
      {renderBlocks(props)}
    </div>
  )
}

export default withRouter(UserPanels);

function renderFollowings(props: RouteComponentProps<{username: string}>): ReactNode {
  const dispatch = useDispatch();
  const username = props.match.params.username;
  const user = useUser(props.match.params.username);
  const followings = Object.keys(user?.followings || {});
  const totalFollowing = user?.stats?.followings || 0;

  useEffect(() => {
    dispatch(fetchUserFollowings(username, 10));
  }, [dispatch, username]);

  return (
    <div className="user-panel">
      <div className="user-panel__title">
        {`Following (${totalFollowing})`}
      </div>
      {
        followings.length
          ? (
            followings.slice(0, 3).map(username => (
              <UserFollowingRow
                username={username}
              />
            ))
          )
          : <div className="user-panel__empty">No Following</div>
      }
      {
        !!totalFollowing && (
          <div
            className="trending-view-all"
            onClick={() => props.history.push(`/users/${username}/following`)}
          >
            View All
          </div>
        )
      }
    </div>
  )
}

function renderFollowers(props: RouteComponentProps<{username: string}>): ReactNode {
  const dispatch = useDispatch();
  const username = props.match.params.username;
  const [followers, setFollowers] = useState<string[]>([]);
  const user = useUser(props.match.params.username);
  const totalFollowers = user?.stats?.followers || 0;

  useEffect(() => {
    (async function onFollowersPanelMount () {
      const resp = await fetch(`${INDEXER_API}/users/${username}/followers?limit=10`);
      const json: IPCMessageResponse<Pageable<DomainConnection, number>> = await resp.json();

      if (!json.error) {
        const newFollowers = json.payload.items
          .map(({ tld, subdomain }: DomainConnection) => serializeUsername(subdomain, tld));
        setFollowers(Array.from(new Set(newFollowers)));
      }
    })()
  }, [dispatch, username]);

  return (
    <div className="user-panel">
      <div className="user-panel__title">
        {`Followers (${totalFollowers})`}
      </div>
      {
        followers.length
          ? (
            followers.slice(0, 3).map((username: string) => (
              <UserFollowingRow
                username={username}
              />
            ))
          )
          : <div className="user-panel__empty">No Followers</div>
      }
      {
        !!totalFollowers && (
          <div
            className="trending-view-all"
            onClick={() => props.history.push(`/users/${username}/followers`)}
          >
            View All
          </div>
        )
      }
    </div>
  )
}

function renderBlocks(props: RouteComponentProps<{username: string}>): ReactNode {
  const dispatch = useDispatch();
  const username = props.match.params.username;
  const [blockees, setBlockees] = useState<string[]>([]);
  const user = useUser(props.match.params.username);
  const totalBlocks = user?.stats?.blockings || 0;

  useEffect(() => {
    (async function onBlocksPanelMount () {
      const resp = await fetch(`${INDEXER_API}/users/${username}/blockees?limit=10`);
      const json: IPCMessageResponse<Pageable<DomainConnection, number>> = await resp.json();

      if (!json.error) {
        const newFollowers = json.payload.items
          .map(({ tld, subdomain }: DomainConnection) => serializeUsername(subdomain, tld));
        setBlockees(Array.from(new Set(newFollowers)));
      }
    })()
  }, [dispatch, username]);

  return (
    <div className="user-panel">
      <div className="user-panel__title">
        {`🚫 Blocks (${totalBlocks})`}
      </div>
      {
        blockees.length
          ? (
            blockees.slice(0, 3).map((username: string) => (
              <UserFollowingRow
                username={username}
              />
            ))
          )
          : <div className="user-panel__empty">No Blocks</div>
      }
      {
        !!totalBlocks && (
          <div
            className="trending-view-all"
            onClick={() => props.history.push(`/users/${username}/blocks`)}
          >
            View All
          </div>
        )
      }
    </div>
  )
}

export const UserFollowingRow = withRouter(_UserFollowingRow);
function _UserFollowingRow(props: {username: string} & RouteComponentProps): ReactElement {
  const username = props.username;
  const user = useUser(username);
  const {tld, subdomain} = parseUsername(username);
  const { displayName, stats } = user || {};

  return (
    <div
      className="user-panel__row"
      onClick={() => props.history.push(`/users/${username}/timeline`)}
    >
      <Avatar username={username} />
      <div className="user-panel__row__info">
        <div className="user-panel__row__info__name">
          <div className="user-panel__row__info__display-name">
            {displayName || subdomain || tld}
          </div>
          <div className="user-panel__row__info__username">
            {`@${username}`}
          </div>
        </div>
        <div className="user-panel__row__info__stats">
          <div className="user-panel__row__info__stats__number">
            {stats?.followings || 0}
          </div>
          <div className="user-panel__row__info__stats__unit">Following</div>
          <div className="user-panel__row__info__stats__divider" />
          <div className="user-panel__row__info__stats__number">
            {stats?.followers || 0}
          </div>
          <div className="user-panel__row__info__stats__unit">Followers</div>
        </div>
      </div>
    </div>
  );
}
