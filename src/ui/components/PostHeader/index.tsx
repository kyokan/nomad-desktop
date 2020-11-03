import React, {ChangeEvent, MouseEventHandler, ReactElement, ReactNode, useCallback, useState} from "react";
import Icon from "../Icon";
import TagIcon from "../../../../static/assets/icons/tag.png";
import {usePostId} from "../../ducks/posts";
import moment from "moment";
import "./post-header.scss";
import {useCurrentUser} from "../../ducks/users";
import ProfilePicture from "../ProfilePicture";
import Topic from "../Topic";
import classNames from "classnames";

type PostHeaderProps = {
  className?: string;
  hash?: string;
  editing?: boolean;
  onTagChange?: (tag: string) => void;
  onNameClick?: MouseEventHandler;
}

export default function PostHeader(props: PostHeaderProps): ReactElement {
  const {
    className = '',
    hash,
    editing,
    onTagChange,
    onNameClick,
  } = props;

  let name = '';
  let tag = '';
  let timestamp = 0;
  let timeAgoText = '';
  let description = 'Posted By';

  if (hash) {
    const { creator, topic: t, timestamp: ts } = usePostId(hash);
    name = creator.split('.')[0];
    tag = t;
    timestamp = ts;
  } else if (editing) {
    const { name: currentUserName } = useCurrentUser();
    name = currentUserName;
    timeAgoText = 'Now';
    description = 'Drafted By';
  }

  const time = moment(new Date(timestamp).toISOString());

  if (tag[0] === '.') {
    tag = '';
  }

  return (
    <div className={`post-header ${className}`}>
      { editing ? renderTagInput(onTagChange) : renderTag(tag) }
      <div className='post-header__posted-by'>
        <span>{description}</span>
        <ProfilePicture name={`${name}.`} />
        <div
          className={classNames('post-header__posted-by__name', {
            'post-header__posted-by__name--pointer': onNameClick,
          })}
          onClick={onNameClick}
        >
          {name.split('.')[0]}
        </div>
      </div>
      <div className="post-header__divider" />
      <div className='post-header__time-ago' title={time.toISOString()}>
        { timeAgoText || time.fromNow() }
      </div>
    </div>
  );
}

function renderTag(tag: string): ReactNode[] {
  return !tag ? [] : [
    <Topic key={`topic-${tag}`} text={tag} className='post-header__tag' />,
    <div key="tag-divider" className="post-header__divider" />,
  ]
}

function renderTagInput(onTagChange?: (tag: string) => void): ReactNode[] {
  const [isEditingTag, setEditingTag] = useState<boolean>(false);
  const [tag, setTag] = useState<string>('');

  const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTag(val);
    onTagChange && onTagChange(val);
  }, [onTagChange]);

  const onBlur = useCallback(() => {
    setEditingTag(false);
  }, [setEditingTag]);

  return [
    <button
      key="tag-btn"
      className={`post-header__tag ${isEditingTag && 'post-header__tag--editing'}`}
      onClick={e => {
        setEditingTag(!isEditingTag);
      }}
    >
      <Icon url={TagIcon} width={17} />
      {
        (tag || isEditingTag) && (
          <div className={`post-header__tag__text`}>
            {tag}
          </div>
        )
      }
      {
        isEditingTag && (
          <input
            className='post-header__tag__input'
            type="text"
            value={tag}
            onChange={onChange}
            onBlur={onBlur}
            onClick={e => e.stopPropagation()}
            autoFocus
          />
        )
      }
    </button>,
    <div key="tag-divider" className="post-header__divider" />
  ];
}
