import React, {MouseEventHandler} from "react";
import c from "classnames";
import Icon from '../Icon';

type Props = {
  iconUrl: string;
  title: string;
  unreads?: number;
  selected?: boolean;
  onClick: MouseEventHandler;
}

export default function NavRow(props: Props) {
  const {
    iconUrl,
    title,
    unreads,
    onClick,
    selected,
  } = props;

  return (
    <div
      tabIndex={1}
      className={c('nav__row', {
        'nav__row--no-badge': !unreads,
        'nav__row--selected': selected,
      })}
      onClick={onClick}
    >
      <Icon url={iconUrl} width={14} />
      <div className="nav__row__title">{title}</div>
      <div className="nav__row__unreads">{unreads ? unreads : ''}</div>
    </div>
  )
}
