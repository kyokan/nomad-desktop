import React, { Component, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  title: string;
}

export default class NavGroup extends Component<Props> {
  render() {
    const {
      children,
      title,
    } = this.props;

    return (
      <div className="nav__group">
        <div className="nav__group__header">
          <div className="nav__group__title">{title}</div>
          {/*<div className="nav-group__title">{title}</div>*/}
        </div>
        {children}
      </div>
    )
  }
}
