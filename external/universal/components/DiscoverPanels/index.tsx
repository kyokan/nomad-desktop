import React, {ReactElement, useState, useEffect, useCallback} from "react";
import { withRouter, RouteComponentProps} from "react-router";
import { useDispatch } from "react-redux";
import { serializeUsername} from "../../utils/user";
import "./index.scss";
import {UserFollowingRow} from "../UserPanels";
import {INDEXER_API} from "../../utils/api";
import {addTag} from "../../ducks/search";

function DiscoverPanels(props: RouteComponentProps): ReactElement {
  const [trendingPeople, setPeople] = useState<string[]>([]);
  const [trendingTags, setTags] = useState<{name: string; count: number}[]>([]);

  useEffect(() => {
    (async function () {
      const tags = await fetchTrendingTags();
      const users = await fetchTrendingUsers();
      setTags(tags.map(({ name, count, posterCount }: any) => ({
        name,
        count,
        posterCount
      })));
      setPeople(users.map(({ tld, subdomain }: any) => serializeUsername(subdomain, tld)));
    })()
  }, []);

  return (
    <div className="discover-panels">
      <div className="trending-users">
        <div className="trending-users__title">Trending People</div>
        {
          trendingPeople.length
            ? (
              trendingPeople.map((username: string) => (
                <UserFollowingRow
                  key={username}
                  username={username}
                />
              ))
            )
            : <div className="user-panel__empty">No Trending People</div>
        }
      </div>
    </div>
  );
}

export default withRouter(DiscoverPanels);

type TrendingTopicProps = {
  topic: string;
  count: number;
  posterCount: number;
} & RouteComponentProps;

const TrendingTopic = withRouter(_TrendingTopic);
function _TrendingTopic(props: TrendingTopicProps): ReactElement {
  const { topic, count, posterCount } = props;
  const dispatch = useDispatch();
  const onTagClick = useCallback(() => {
    dispatch(addTag(topic));
    props.history.push(`/search`);
  }, [dispatch, topic]);

  return (
    <div className="trending-topic" onClick={onTagClick}>
      <div className="trending-topic__info">
        <div className="trending-topic__info__name">
          <div className="trending-topic__info__tag-name">
            {`#${topic}`}
          </div>
        </div>
        <div className="trending-topic__info__stats">
          <div className="trending-topic__info__stats__number">
            {count}
          </div>
          <div className="trending-topic__info__stats__unit">Posts</div>
          <div className="trending-topic__info__stats__divider" />
          <div className="trending-topic__info__stats__number">
            {posterCount}
          </div>
          <div className="trending-topic__info__stats__unit">Participants</div>
        </div>
      </div>
    </div>
  );
}

async function fetchTrendingTags() {
  const resp = await fetch(`${INDEXER_API}/trending/tags?limit=5`);
  const json = await resp.json();

  if (json.error) {
    return Promise.reject(json.error);
  }

  return json.payload.items;
}


async function fetchTrendingUsers() {
  const resp = await fetch(`${INDEXER_API}/trending/users?limit=5`);
  const json = await resp.json();

  if (json.error) {
    return Promise.reject(json.error);
  }

  return json.payload.items;
}
