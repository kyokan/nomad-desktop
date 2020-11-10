// @ts-ignore
import React, {ReactElement, ReactNode, useCallback, useEffect, useState, UIEvent} from 'react';
// @ts-ignore
import {withRouter, RouteComponentProps} from "react-router";
// @ts-ignore
import {Envelope as DomainEnvelope} from 'fn-client/lib/application/Envelope';
// @ts-ignore
import {Connection as DomainConnection} from 'fn-client/lib/application/Connection';;
// @ts-ignore
import {Pageable} from '../../../external/indexer/dao/Pageable';
import "./following-view.scss";
import {useUser} from "../../ducks/users";
import UserCard from "../UserCard";
import {INDEXER_API} from "../../utils/api";
import {serializeUsername} from "../../utils/user";
// @ts-ignore
import debounce from "lodash.debounce";

type Props = {
  onFollowUser: (postHash: string) => void;
} & RouteComponentProps<{username: string}>

function FollowersView (props: Props): ReactElement {
  const username = props.match.params.username;
  const [next, setNext] = useState<number | null>(0);
  const [followings, setFollowings] = useState<string[]>([]);
  const [scrollLoading, setScrollLoading] = useState(false);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement>();

  const query = useCallback(async () => {
    if (next === -1) {
      return;
    }

    const resp = await queryNext(username, next);
    const list = resp.items.map(({tld, subdomain}: any) => serializeUsername(subdomain, tld));

    setFollowings(Array.from(new Set([...followings, ...list])));
    setNext(resp.next);
  }, [followings, next]);

  useEffect(() => {
    (async function () {
      const resp = await queryNext(username, next);
      const list = resp.items.map(({tld, subdomain}: any) => serializeUsername(subdomain, tld));
      setFollowings(Array.from(new Set(list)));
      setNext(resp.next);
    })()
  }, [username]);



  const _onScroll = useCallback(async (e: UIEvent<HTMLDivElement>) => {

    if (scrollLoading || !scrollEl) {
      return;
    }

    // @ts-ignore
    if (scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight * .65) {
      setScrollLoading(true);
      await query();
      setScrollLoading(false);
    }
  }, [scrollLoading, scrollEl, query]);

  const onScroll = debounce(_onScroll, 50, { leading: true });

  return (
    <div
      className="custom-view following-view"
      ref={setScrollEl}
      onScroll={onScroll}
    >
      {renderHeaders(props)}
      {followings.map((username: string) => (
        <UserCard
          key={username}
          username={username}
          onFollowUser={props.onFollowUser}
        />
      ))}
    </div>
  )
}

export default withRouter(FollowersView);

function renderHeaders(props: Props): ReactNode {
  const username = props.match.params.username;

  return (
    <div className="alt-user-header">
      <button
        className="alt-user-header__tab"
        onClick={() => props.history.push(`/users/${username}/following`)}
      >
        Following
      </button>
      <button
        className="alt-user-header__tab alt-user-header__tab--selected"
        onClick={() => props.history.push(`/users/${username}/followers`)}
      >
        Followers
      </button>
      <button
        className="alt-user-header__tab"
        onClick={() => props.history.push(`/users/${username}/blocks`)}
      >
        Blocks
      </button>
    </div>
  )
}

async function queryNext(username: string, next: number | null): Promise<Pageable<DomainEnvelope<DomainConnection>, number>> {
  if (next !== null &&  next < 0) {
    return {
      items: [],
      next: -1,
    };
  }

  const resp = await fetch(`${INDEXER_API}/users/${username}/followers?limit=20${next ? '&offset=' + next : ''}`);
  const json = await resp.json();

  if (json.error) {
    return Promise.reject(json.error);
  }

  return json.payload as Pageable<DomainEnvelope<DomainConnection>, number>;
}
