// @ts-ignore
import React, {ReactElement, useCallback, ChangeEvent} from 'react';
import './custom-view-panel.scss';
// @ts-ignore
import moment from "moment";
import Topic from "../../Topic";
import {Filter} from "../../../utils/filter";
import {undotName} from "../../../utils/user";

export enum CustomViewPanelType {
  USER_INFO = 'user_info',
  TOPIC_LIST = 'topic_list',
  FEED_CONTROL = 'feed_control',
  FILTER_SUMMARY = 'filter_summary',
}

export type GenericViewPanelProps = UserInfoPanelProps | TopicListPanelProps | FeedControlPanelProps | FilterSummaryPanelProps;

export type CustomViewPanelProps = {
  type: CustomViewPanelType;
  panelProps: GenericViewPanelProps;
}

type UserInfoPanelProps = {
  posts: number;
  comments: number;
  firstActivity: number;
  lastActivity: number;
};

type FeedControlPanelProps = {
  isShowingPosts?: boolean;
  isShowingLikes: boolean;
  isShowingReplies: boolean;
  onTogglePosts?: () => void;
  onToggleLikes: () => void;
  onToggleReplies: () => void;
};

type TopicListPanelProps = {
  topics: {
    [topic: string]: number;
  };
};

type FilterSummaryPanelProps = {
  filter: Filter;
  userOverrides: {[name: string]: boolean};
  tagOverrides: {[tagName: string]: boolean};
  onUserOverrideChange: (userOverrides: {[name: string]: boolean}) => void;
  onTagOverrideChange: (tagOverrides: {[tagName: string]: boolean}) => void;
}

function CustomViewPanel(props: CustomViewPanelProps): ReactElement {
  switch (props.type) {
    case CustomViewPanelType.USER_INFO:
      return <UserInfoPanel {...props.panelProps as UserInfoPanelProps} />;
    case CustomViewPanelType.TOPIC_LIST:
      return <TopicListPanel {...props.panelProps as TopicListPanelProps} />;
    case CustomViewPanelType.FEED_CONTROL:
      return <FeedControlPanel {...props.panelProps as FeedControlPanelProps} />;
    case CustomViewPanelType.FILTER_SUMMARY:
      return <FilterSummaryPanel {...props.panelProps as FilterSummaryPanelProps} />;
    default:
      return <></>;
  }
}

function UserInfoPanel(props: UserInfoPanelProps): ReactElement {
  const {
    firstActivity,
    lastActivity,
    posts,
    comments,
  } = props;

  const mFirst = moment(firstActivity);
  const mLast = moment(lastActivity);

  return (
    <div className="custom-view-panel user-info-panel">
      <div className="custom-view-panel__content">
        <div className="user-info-panel__row">
          <div>First Activity</div>
          <div title={mFirst.fromNow()}>{ firstActivity ? mFirst.format('YYYY-MM-DD') : ' - '}</div>
        </div>
        <div className="user-info-panel__row">
          <div>Last Activity</div>
          <div title={mLast.fromNow()}>{ lastActivity ? mLast.format('YYYY-MM-DD') : ' - '}</div>
        </div>
        <div className="user-info-panel__row">
          <div>Total Posts</div>
          <div>{posts}</div>
        </div>
        <div className="user-info-panel__row">
          <div>Total Comments</div>
          <div>{comments}</div>
        </div>
      </div>
    </div>
  );
}

function TopicListPanel(props: TopicListPanelProps): ReactElement {
  const { topics } = props;
  const list = Object.entries(topics)
    .sort((a, b) => a[1] > b[1] ? -1 : 1)
    .slice(0, 5);

  if (!list.length) return <></>;

  return (
    <div className="custom-view-panel topic-list-panel">
      <div className="custom-view-panel__title">Most Active Topics</div>
      <div className="custom-view-panel__content">
        {
          list.map(([topic, sum ]) => (
              <div
                key={`active-group-${topic}:${sum}`}
                className="topic-list-panel__row"
              >
                <Topic text={topic} />
                <span>x {sum}</span>
              </div>
            ))
        }
      </div>
    </div>
  )
}

function FeedControlPanel(props: FeedControlPanelProps): ReactElement {
  const {
    isShowingLikes,
    isShowingPosts,
    isShowingReplies,
    onToggleLikes,
    onTogglePosts,
    onToggleReplies,
  } = props;
  return (
    <div className="custom-view-panel feed-control-panel">
      <div className="custom-view-panel__title">Filter Options</div>
      <div className="custom-view-panel__content">
        {
          !!onTogglePosts && (
            <div className="feed-control-panel__row">
              <input
                type="checkbox"
                checked={isShowingPosts}
                onChange={onTogglePosts}
              />
              <div className="feed-control-panel__row__text">Show Original Posts</div>
            </div>
          )
        }
        <div className="feed-control-panel__row">
          <input
            type="checkbox"
            checked={isShowingLikes}
            onChange={onToggleLikes}
          />
          <div className="feed-control-panel__row__text">Show Likes</div>
        </div>
        <div className="feed-control-panel__row">
          <input
            type="checkbox"
            checked={isShowingReplies}
            onChange={onToggleReplies}
          />
          <div className="feed-control-panel__row__text">Show Replies</div>
        </div>
      </div>
    </div>
  )
}

function FilterSummaryPanel(props: FilterSummaryPanelProps): ReactElement {
  const {
    filter: {
      postedBy = [],
      allowedTags = [],
    },
    userOverrides = {},
    tagOverrides = {},
    onTagOverrideChange,
    onUserOverrideChange,
  } = props;

  const hasTags = !!allowedTags.length && !allowedTags.includes('*');
  const hasUsers = !!postedBy.length && !postedBy.includes('*');
  const onTagCheck = useCallback((e: ChangeEvent<HTMLInputElement>, tagName: string) => {
    const newTagOverride = {
      ...tagOverrides,
      [tagName]: e.target.checked,
    };
    onTagOverrideChange(newTagOverride);
  }, [Object.entries(tagOverrides).map(([k, v]) => `${k}:${v}`), onTagOverrideChange]);

  const onUserCheck = useCallback((e: ChangeEvent<HTMLInputElement>, name: string) => {
    const newUserOverride = {
      ...userOverrides,
      [name]: e.target.checked,
    };
    onUserOverrideChange(newUserOverride);
  }, [Object.entries(userOverrides).map(([k, v]) => `${k}:${v}`), onUserOverrideChange]);

  return (
    <div className="custom-view-panel feed-summary-panel">
      <div className="custom-view-panel__title">Filter Setting</div>
      <div className="custom-view-panel__content">
        {
          hasUsers && (
            <div className="feed-summary-panel__row">
              <div className="feed-summary-panel__row__label">
                Users
              </div>
              <div className="feed-summary-panel__row__value">
                {postedBy.map(name => {
                  if (name === '*') return null;

                  return (
                    <div key={name} className="feed-summary-panel__user-select">
                      <input
                        type="checkbox"
                        onChange={e => onUserCheck(e, name)}
                        checked={typeof userOverrides[name] === 'undefined' ? true : userOverrides[name]}
                      />
                      <div className="feed-summary-panel__user-select__label">
                        @{undotName(name)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        }
        {
          hasTags && (
            <div className="feed-summary-panel__row">
              <div className="feed-summary-panel__row__label">
                Tags
              </div>
              <div  className="feed-summary-panel__row__value">
                {allowedTags.map(tagName => {
                  return (
                    <div key={tagName} className="feed-summary-panel__user-select">
                      <input
                        type="checkbox"
                        onChange={e => onTagCheck(e, tagName)}
                        checked={typeof tagOverrides[tagName] === 'undefined' ? true : tagOverrides[tagName]}
                      />
                      <div className="feed-summary-panel__user-select__label">
                        #{tagName}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        }
      </div>
    </div>
  )
}

export default CustomViewPanel;
