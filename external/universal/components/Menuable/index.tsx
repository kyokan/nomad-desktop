import React, {Component, MouseEvent, ReactElement, ReactNode, CSSProperties} from 'react';
import c from "classnames";
import './menuable.scss';
import Icon from "../Icon";
// @ts-ignore
import RightArrowIcon from "../../../electron/static/assets/icons/right-arrow.svg";

export enum MenuTypes {
  Context = "CONTEXT",
  Normal = "NORMAL",
}

export type MenuProps = {
  iconUrl?: string;
  text?: ReactNode;
  items?: (MenuProps | null)[];
  onClick?: (e: MouseEvent, closeMenu?: () => void) => void;
  forceRender?: (cb?: () => void) => ReactNode;
  selected?: boolean;
  divider?: boolean;
  showOnHover?: boolean;
  closeMenu?: () => void;
}

type Props = {
  className?: string;
  type: MenuTypes;
  children?: ReactNode;
  items: (MenuProps | null)[];
  style?: CSSProperties;
  defaultOpened?: boolean;
  closeMenu?: () => void;
}

type State = {
  isOpened: boolean;
}

export default class Menuable extends Component<Props, State> {
  static defaultProps = {
    className: '',
    type: MenuTypes.Normal,
    items: [ { text: 'Close' } ],
  };

  constructor(props: Props) {
    super(props);

    this.state = {
      isOpened: !!props.defaultOpened,
    };
  }

  closeMenu = () => {
    this.setState({ isOpened: false });
    if (this.props.closeMenu) {
      this.props.closeMenu();
    }
  };

  onOverlayClick = (e: MouseEvent) => {
    e.stopPropagation();
    this.closeMenu();
  };

  onClick = (e: MouseEvent) => {
    e.stopPropagation();
    const { isOpened } = this.state;
    this.setState({
      isOpened: !isOpened,
    });
  };


  render() {
    const {
      className = '',
      children,
      style,
    } = this.props;

    return (
      <div
        className={c('menuable', className, {
          'menuable--opened': this.state.isOpened,
        })}
        onClick={this.onClick}
        style={style}
      >
        { children }
        { this.renderMenu() }
        { this.renderOverlay() }
      </div>
    )
  }

  renderOverlay(): ReactNode {
    return !this.state.isOpened ? null : (
      <div
        className="menu__overlay"
        onClick={this.onOverlayClick}
      />
    );
  }

  renderMenu(): ReactNode {
    return !this.state.isOpened ? null : (
      <Menu items={this.props.items} closeMenu={this.closeMenu}/>
    );
  }
}

export function Menu(props: MenuProps): ReactElement {
  const {
    items = [],
    showOnHover,
    closeMenu,
  } = props;

  if (!items.length) {
    return <noscript />;
  }

  return (
    <div
      className={c('menu', {
        'menu--children': showOnHover,
      })}
    >
      {
        items.map((menu, i) => {
          if (!menu) return null;

          if (menu.forceRender) {
            return menu.forceRender(closeMenu);
          }

          if (menu.divider) {
            return (
              <div
                key={'divider-' + i}
                className="menu__divider"
              />
            )
          }

          return (
            <div
              key={i}
              className={c("menu__row", {
                'menu__row--selected': menu.selected,
              })}
              onClick={(e) => {
                if (menu.onClick) menu.onClick(e, closeMenu);
              }}
            >
              <Icon
                className="menu__row__icon"
                url={menu.iconUrl || ''}
                width={12}
              />
              <span>{ menu.text }</span>
              <Menu
                items={menu.items}
                closeMenu={closeMenu}
                showOnHover
              />
              <Icon
                className="menu__row__arrow"
                url={menu.items ? RightArrowIcon : ''}
              />
            </div>
          )
        })
      }
    </div>
  );
}
