import React, {
  ReactElement,
  useState,
  useEffect,
  MouseEventHandler,
  useCallback,
  ChangeEvent,
  KeyboardEvent,
  ReactNode,
  // @ts-ignore
} from "react";
// @ts-ignore
import { withRouter, RouteComponentProps} from "react-router";
// @ts-ignore
import {useDispatch} from "react-redux";
// @ts-ignore
import c from "classnames";
import "./index.scss";
import Input from "../Input";
import {addUser, addTag, removeTag, removeUser, useSearchParams} from "../../ducks/search";
import Icon from "../Icon";
import Button from "../Button";
import {CustomViewProps, UserData} from "../../../../src/app/controllers/userData";
import {extendFilter} from "../../utils/filter";
import {userCurrentUserData} from "../../ducks/users";

type Props = {
  onCreateNewView: (view: CustomViewProps) => Promise<void>
} & RouteComponentProps;

function SearchPanels (props: Props): ReactElement {
  const {
    users: defaultUsers,
    tags: defaultTags,
  } = useSearchParams();

  const [users, setUsers] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [query, setQuery] = useState('');
  const currentUserData = userCurrentUserData();
  const { savedViews = [] } = currentUserData || {};

  const dispatch = useDispatch();

  useEffect(() => {
    setUsers(defaultUsers);
  }, [defaultUsers.join('')]);

  useEffect(() => {
    setTags(defaultTags);
  }, [defaultTags.join('')]);

  const onSaveView = useCallback(async () => {
    const newIndex = savedViews.length;
    await props.onCreateNewView({
      title: `Filter # ${newIndex + 1}`,
      heroImageUrl: '',
      iconUrl: '',
      filter: extendFilter({
        postedBy: users,
        allowedTags: tags,
      }),
    });
    props.history.push(`/views/${newIndex}`);
  }, [users, tags, savedViews.length]);

  const onUpdateQuery = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setErrorMessage('');
  }, []);

  const onSubmitQuery = useCallback((e: KeyboardEvent) => {
    const firstLetter = query[0];
    const value = query.slice(1);

    if (e.key === 'Enter') {
      switch (firstLetter) {
        case '@':
          setQuery('');
          dispatch(addUser(value));
          break;
        // case '#':
        //   setQuery('');
        //   dispatch(addTag(value));
        //   break;
        default:
          setErrorMessage('start with @');
          break;
      }

      if (props.location.pathname.includes('/home')) {
        props.history.push(`/search`);
      }
    }
  }, [query, dispatch, props.history, props.location.pathname.includes('/home')]);

  return (
    <div className="search-panels">
      <div className="search-panel">
        <div className="search-panel__title">Search Filters</div>
        <Input
          className={c("search-panel__input", {
            'search-panel__input--error': errorMessage,
          })}
          type="text"
          placeholder="Add @username"
          onChange={onUpdateQuery}
          onKeyDown={onSubmitQuery}
          value={query}
        />
        {renderUsersGroup(users)}
        {renderTagsGroup(tags)}
      </div>

      {
        (tags.length || users.length)
          ? (
            <div className="search-panel">
              <div className="search-panel__row">
                <span>Like this view?</span>
                <Button
                  className="search-panel__cta"
                  onClick={onSaveView}
                >
                  Save
                </Button>
              </div>
            </div>
          )
          : null
      }

      {
        !!savedViews.length && (
          <div className="search-panel saved-views-panels">
            <div className="search-panel__title">
              Saved Filters
            </div>
            {savedViews.map((savedView, i) => renderSaveViewRow(savedView, i, props))}
          </div>
        )
      }

    </div>
  );
}

export default withRouter(SearchPanels);

function renderSaveViewRow(saveView: CustomViewProps, index: number, props: Props): ReactNode {
  const onClick = () => props.history.push(`/views/${index}`);

  return (
    <div className="saved-view-row" onClick={onClick} key={saveView.title + index}>
      <div className="saved-view-row__title">{saveView.title}</div>
      <div className="saved-view-row__stats">
        <div className="saved-view-row__stats__number">
          {saveView.filter?.postedBy?.length}
        </div>
        <div className="saved-view-row__stats__unit">People</div>
        <div className="saved-view-row__stats__divider" />
        <div className="saved-view-row__stats__number">
          {saveView.filter?.allowedTags?.length}
        </div>
        <div className="saved-view-row__stats__unit">Tags</div>
      </div>
    </div>
  )
}

function renderUsersGroup(users: string[]): ReactNode {
  const dispatch = useDispatch();

  const includeAll = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      dispatch(addUser('*'));
    } else {
      dispatch(removeUser('*'));
    }
  }, []);

  if (!users.length) {
    return <></>;
  }

  return (
    <div className="search-param-group">
      <div className="search-param-group__title">
        <div className="search-param-group__title__text">People</div>
        <div className="search-param-group__title__action">
          <input
            type="checkbox"
            // @ts-ignore
            checked={users.includes('*')}
            onChange={includeAll}
          />
          <span>Include All</span>
        </div>
      </div>
      <div className="search-param-group__boxes">
        {
          users.map((username: string) => username !== '*' && (
            <Pill
              // @ts-ignore
              key={username}
              text={`@${username}`}
              onClick={() => dispatch(removeUser(username))}
            />
          ))
        }
      </div>
    </div>
  )
}

function renderTagsGroup(tags: string[]): ReactNode {
  const dispatch = useDispatch();

  const includeAll = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      dispatch(addTag('*'));
    } else {
      dispatch(removeTag('*'));
    }
  }, []);

  if (!tags.length) {
    return <></>;
  }

  return (
    <div className="search-param-group">
      <div className="search-param-group__title">
        <div className="search-param-group__title__text">Tags</div>
        <div className="search-param-group__title__action">
          <input
            type="checkbox"
            // @ts-ignore
            checked={tags.includes('*')}
            onChange={includeAll}
          />
          <span>Include All</span>
        </div>
      </div>
      <div className="search-param-group__boxes">
        {tags.map((tagname: string) => tagname !== '*' && (
          <Pill
            // @ts-ignore
            key={tagname}
            text={`#${tagname}`}
            onClick={() => dispatch(removeTag(tagname))}
          />
        ))}
      </div>
    </div>
  );
}

type PillProps = {
  text: string;
  onClick: MouseEventHandler;
}
function Pill (props: PillProps): ReactElement {
  return (
    <div
      className="pill"
      onClick={props.onClick}
    >
      <div className="pill__text">{props.text}</div>
      {(
        // @ts-ignore
        <Icon
          material="close"
        />
      )}
    </div>
  );
}
