import React, {Component, MouseEvent, MouseEventHandler, ReactNode} from 'react';
import c from 'classnames';
import Icon from '../Icon';
import CaretDownIcon from '../../../../static/assets/icons/arrow-down.svg';
import './header-button.scss';

type Props = {
  iconUrl?: string;
  showCaret?: boolean;
  onClick?: MouseEventHandler;
  disabled?: boolean;
  children?: ReactNode;
}

export default class HeaderButton extends Component<Props> {
  el?: HTMLButtonElement;

  render() {
    const {
      iconUrl,
      showCaret,
      onClick,
      disabled,
      children,
    } = this.props;

    return (
      <button
        className={c('header-button', {
          'header-button--disabled': disabled,
          'header-button--iconText': iconUrl && children,
        })}
        ref={(el: HTMLButtonElement) => {
          this.el = el;
        }}
        onClick={(e: MouseEvent) => {
          if (this.el) {
            this.el.blur();
          }

          if (!disabled && onClick) onClick(e);
        }}
        disabled={disabled}
      >
        { iconUrl && <Icon url={iconUrl} width={13} /> }
        { children }
        {
          showCaret
            ? (
              <Icon
                className="header-button__caret"
                url={CaretDownIcon}
                width={8}
              />
            )
            : null
        }
      </button>
    )
  }
}
