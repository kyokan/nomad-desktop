import React, {
  ReactElement,
  useState,
  MouseEventHandler,
  useCallback,
  ChangeEvent,
  MouseEvent,
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
import Icon from "../Icon";
import Button from "../Button";
import {CustomViewProps} from "../../../../src/app/controllers/userData";
import {userCurrentUserData} from "../../ducks/users";
import {
  addTagToView,
  addUserToView,
  removeTagFromView,
  removeUserFromView, resetViewIndex, setTitleAtViewIndex, useNewTitleByIndex,
  useViewOverrideByIndex, useViewSubtractByIndex
} from "../../ducks/views";
import {extendFilter} from "../../utils/filter";

type Props = {
  onUpdateView: (view: CustomViewProps, index: number) => Promise<void>
} & RouteComponentProps<{viewIndex: string}>;

function SavedViewPanels (props: Props): ReactElement {
  const dispatch = useDispatch();
  const viewIndex = Number(props.match.params.viewIndex);

  const currentUserData = userCurrentUserData();
  const override = useViewOverrideByIndex(viewIndex);
  const subtract = useViewSubtractByIndex(viewIndex);

  const { savedViews = [] } = currentUserData || {};
  const savedView = savedViews[viewIndex];
  const filter = savedView?.filter;

  const overrideUsers = override.users || [];
  const overrideTags = override.tags || [];

  const userSet = new Set(overrideUsers);
  const tagSet = new Set(overrideTags);

  filter?.postedBy?.forEach(u => userSet.add(u));
  filter?.allowedTags?.forEach(t => tagSet.add(t));
  subtract.users.forEach(u => userSet.delete(u));
  subtract.tags.forEach(t => tagSet.delete(t));

  const users = Array.from(userSet);
  const tags = Array.from(tagSet);

  const [errorMessage, setErrorMessage] = useState('');
  const [query, setQuery] = useState('');

  const onUpdateQuery = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setErrorMessage('');
  }, []);

  const onAddTagOverride = useCallback((tag: string) => {
    dispatch(addTagToView(tag, viewIndex));
  }, [dispatch, viewIndex]);

  const onAddUserOverride = useCallback((username: string) => {
    dispatch(addUserToView(username, viewIndex));
  }, [dispatch, viewIndex]);

  const onRemoveTagOverride = useCallback((tag: string) => {
    dispatch(removeTagFromView(tag, viewIndex));
  }, [dispatch, viewIndex]);

  const onRemoveUserOverride = useCallback((username: string) => {
    dispatch(removeUserFromView(username, viewIndex));
  }, [dispatch, viewIndex]);

  const onSubmitQuery = useCallback((e: KeyboardEvent) => {
    const firstLetter = query[0];
    const value = query.slice(1);

    if (e.key === 'Enter') {
      switch (firstLetter) {
        case '@':
          setQuery('');
          return onAddUserOverride(value);
        case '#':
          setQuery('');
          return onAddTagOverride(value);
        default:
          setErrorMessage('start with @ or #');
          return;
      }
    }
  }, [
    query,
    dispatch,
    onAddUserOverride,
    onAddTagOverride,
  ]);

  return (
    <div className="search-panels">
      {renderSaveViewInfo(viewIndex, props.onUpdateView)}
      <div className="search-panel">
        <div className="search-panel__title">Search Filters</div>
        <Input
          className={c("search-panel__input", {
            'search-panel__input--error': errorMessage,
          })}
          type="text"
          placeholder="Add @username or #tag"
          onChange={onUpdateQuery}
          onKeyDown={onSubmitQuery}
          value={query}
        />
        {renderUsersGroup(users, onAddUserOverride, onRemoveUserOverride)}
        {renderTagsGroup(tags, onAddTagOverride, onRemoveTagOverride)}
      </div>

      {
        !!savedViews?.length && (
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

export default withRouter(SavedViewPanels);

function renderSaveViewInfo(viewIndex: number, onUpdateView: (view: CustomViewProps, index: number) => Promise<void>): ReactNode {
  const currentUserData = userCurrentUserData();
  const { savedViews = [] } = currentUserData || {};
  const savedView = savedViews[viewIndex];

  const dispatch = useDispatch();

  const [editing, setEditing] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>(savedView?.title);

  const updatedView = useUpdateViewProps(viewIndex);
  const title = updatedView?.title || savedView?.title || `Filter # ${viewIndex + 1}`;

  const onReset = useCallback(() => {
    dispatch(resetViewIndex(viewIndex));
  }, [viewIndex]);

  const onSaveView = useCallback(() => {
    if (!updatedView) {
      return null;
    }

    const view = {
      ...updatedView,
    };

    onUpdateView(view, viewIndex);
  }, [updatedView, viewIndex]);

  const onUpdateTitle = useCallback(() => {
    dispatch(setTitleAtViewIndex(newTitle, viewIndex));
    setEditing(false);
  }, [dispatch, viewIndex, newTitle]);

  return (
    <div className="search-panel">
      <div className="search-panel__row">
        {
          editing
            ? (
              <Input
                type="text"
                className="saved-view-row__input"
                onChange={(e: MouseEvent) => setNewTitle(e.target.value)}
                // value={newTitle}
                defaultValue={savedView?.title}
                iconFn={() => (
                  // @ts-ignore
                  <Icon
                    material="check"
                    onClick={onUpdateTitle}
                    width={16}
                  />
                )}
                autoFocus
              />
            )
            : (
              <span>{title}</span>
            )
        }
        {
          !editing && (
            // @ts-ignore
            <Icon
              material="edit"
              onClick={() => setEditing(true)}
              width={16}
            />
          )
        }
      </div>
      <div className="saved-view-panel__actions">
        <Button
          className="saved-view-panel__actions__cta"
          onClick={onReset}
          disabled={!updatedView}
        >
          Clear
        </Button>
        <Button
          className="saved-view-panel__actions__cta"
          onClick={onSaveView}
          disabled={!updatedView}
        >
          Save Change
        </Button>
      </div>
    </div>
  );
}

function renderSaveViewRow(saveView: CustomViewProps, index: number, props: Props): ReactNode {
  const onClick = () => props.history.push(`/views/${index}`);

  return (
    <div className="saved-view-row" onClick={onClick}>
      <div className="saved-view-row__title">{saveView.title}</div>
      <div className="saved-view-row__stats">
        <div className="saved-view-row__stats__number">
          {saveView?.filter?.postedBy?.length}
        </div>
        <div className="saved-view-row__stats__unit">People</div>
        <div className="saved-view-row__stats__divider" />
        <div className="saved-view-row__stats__number">
          {saveView?.filter?.allowedTags?.length}
        </div>
        <div className="saved-view-row__stats__unit">Tags</div>
      </div>
    </div>
  )
}

function renderUsersGroup(
  users: string[],
  onAddUser: (u: string) => void,
  onRemoveUser: (u: string) => void,
): ReactNode {
  const dispatch = useDispatch();

  const includeAll = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onAddUser('*');
    } else {
      onRemoveUser('*');
    }
  }, [onAddUser, onRemoveUser]);

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
              onClick={() => onRemoveUser(username)}
            />
          ))
        }
      </div>
    </div>
  )
}

function renderTagsGroup(
  tags: string[],
  onAddTag: (t: string) => void,
  onRemoveTag: (t: string) => void,
): ReactNode {
  const includeAll = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onAddTag('*');
    } else {
      onRemoveTag('*');
    }
  }, [onAddTag, onRemoveTag]);

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
            onClick={() => onRemoveTag(tagname)}
          />
        ))}
      </div>
    </div>
  );
}

function useUpdateViewProps(viewIndex: number): CustomViewProps | null {
  const currentUserData = userCurrentUserData();
  const newTitle = useNewTitleByIndex(viewIndex);
  const override = useViewOverrideByIndex(viewIndex);
  const subtract = useViewSubtractByIndex(viewIndex);

  const { savedViews = [] } = currentUserData || {};
  const savedView = savedViews[viewIndex];
  const filter = savedView?.filter;

  const filterUsers = filter?.postedBy || [];
  const filterTags = filter?.allowedTags || [];
  const overrideUsers = override.users || [];
  const overrideTags = override.tags || [];

  const newUserSet = new Set(overrideUsers);
  const newTagSet = new Set(overrideTags);

  filterUsers?.forEach(u => newUserSet.add(u));
  filterTags?.forEach(t => newTagSet.add(t));
  subtract.users.forEach(u => newUserSet.delete(u));
  subtract.tags.forEach(t => newTagSet.delete(t));

  const isUsersEqual = filterUsers.length === newUserSet.size
    && filterUsers.reduce((equal, user) => (
      equal && newUserSet.has(user)
    ), true);

  const isTagsEqual = filterTags.length === newTagSet.size
    && filterTags.reduce((equal, tag) => (
      equal && newTagSet.has(tag)
    ), true);

  const isTitleEqual = !newTitle || newTitle === savedView?.title;

  if (isUsersEqual && isTagsEqual && isTitleEqual) return null;

  return {
    title: newTitle || savedView?.title,
    heroImageUrl: '',
    iconUrl: '',
    filter: extendFilter({
      postedBy: Array.from(newUserSet),
      allowedTags: Array.from(newTagSet),
    }),
  };
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
