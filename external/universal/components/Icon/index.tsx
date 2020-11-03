import React, {Component, MouseEventHandler} from "react";
import './icon.scss';

type Props = {
  url?: string;
  material?: string;
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
      material,
    } = this.props;

    return onClick
      ? (
        <button
          className={`icon ${className}`}
          style={{
            backgroundImage: `url(${url})`,
            width: !material ? `${width}px` : undefined,
            height: !material ? `${width}px` : undefined,
            fontSize: material && `${width}px`,
          }}
          onClick={onClick}
          disabled={disabled}
        >
          {material}
        </button>
      )
      : (
      <div
        className={`icon ${className} ${disabled ? 'icon--disabled' : ''}`}
        style={{
          backgroundImage: `url(${url})`,
          width: !material ? `${width}px` : undefined,
          height: !material ? `${width}px` : undefined,
          fontSize: material && `${width}px`,
        }}
      >
        {material}
      </div>
    )
  }
}
