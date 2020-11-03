import React, { Component, MouseEventHandler } from 'react';
import './post-button.scss';
import Icon from '../Icon';
import c from "classnames";

type Props = {
  iconUrl: string;
  text?: string;
  className?: string;
  title?: string;
  onClick?: MouseEventHandler;
  color?: "blue" | "black";
  active?: boolean;
}

export default class PostButton extends Component<Props> {
  render() {
    const {
      iconUrl,
      text = '',
      className = '',
      onClick,
      color,
      title,
      active,
    } = this.props;

    return (
      <button
        className={c('post-button', className, {
          'post-button--blue': color === 'blue',
          'post-button--active': active,
        })}
        onClick={active ? undefined : onClick}
        tabIndex={onClick && 1}
        title={title}
      >
        <Icon url={iconUrl} width={24} />
        {
          text && (
            <div className="post-button__text">
              {text}
            </div>
          )
        }
      </button>
    );
  }
}
