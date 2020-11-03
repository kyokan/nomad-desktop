import React, {Component, MouseEventHandler} from "react";
import './icon.scss';

type Props = {
  url?: string;
  className?: string;
  width?: number;
  onClick?: MouseEventHandler;
  disabled?: boolean;
}

export default class Icon extends Component<Props> {
  render() {
    const {
      url,
      width = 12,
      className = '',
      onClick,
      disabled,
    } = this.props;

    return onClick
      ? (
        <button
          className={`icon ${className}`}
          style={{
            backgroundImage: `url(${url})`,
            width: `${width}px`,
            height: `${width}px`,
          }}
          onClick={onClick}
          disabled={disabled}
        />
      )
      : (
      <div
        className={`icon ${className} ${disabled ? 'icon--disabled' : ''}`}
        style={{
          backgroundImage: `url(${url})`,
          width: `${width}px`,
          height: `${width}px`,
        }}
      />
    )
  }
}
