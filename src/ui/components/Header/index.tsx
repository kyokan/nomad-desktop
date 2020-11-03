import React, {memo, ReactElement, ReactNode} from 'react';
import './header.scss';

type Props = {
  title: string;
  children?: ReactNode;
  className?: string;
  topOnly?: boolean;
}

function Header(props: Props): ReactElement {
  return (
    <div className={`header ${props.className || ''}`}>
      <div className="header__top">
        {props.title}
      </div>
      {
        !props.topOnly && (
          <div className="header__bottom">
            {props.children}
          </div>
        )
      }
    </div>
  );
}

export default memo(Header);
