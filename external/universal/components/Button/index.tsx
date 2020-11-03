import React, {ButtonHTMLAttributes, ReactElement} from "react";
import classNames from "classnames";
import "./button.scss";

type Props = {
  className?: string;
  loading?: boolean;
  color?: 'green' | 'default';
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button (props: Props): ReactElement {
  const {
    className,
    loading,
    children,
    color = 'default',
    ...btnProps
  } = props;

  return (
    <button
      className={classNames('button', className, {
        'button--loading': loading,
        'button--green': color === 'green',
      })}
      {...btnProps}
    >
      { loading && <div className="loader">Loading...</div> }
      {children}
    </button>
  )
}
