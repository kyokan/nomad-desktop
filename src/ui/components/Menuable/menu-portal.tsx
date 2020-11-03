import React, {Component, CSSProperties, ReactElement, ReactNode, useState} from "react";
import ReactDOM from "react-dom";
import './menu-portal.scss';
import Menuable, {Menu, MenuProps} from "./index";

const ctxRoot = document.getElementById('ctx-root');

type Props = {
  className?: string;
  style?: CSSProperties;
} & MenuProps;

export class MenuPortal extends Component<Props> {
  el: HTMLDivElement;

  constructor(props: Props) {
    super(props);
    this.el = document.createElement('div');
    this.el.className = `ctx-menu ${props.className || ''}`;
  }

  componentDidMount() {
    if (ctxRoot) {
      ctxRoot.appendChild(this.el);
    }
  }

  componentWillUnmount() {
    if (ctxRoot) {
      ctxRoot.removeChild(this.el);
    }
  }

  render() {
    return ReactDOM.createPortal(
      <Menuable
        {...this.props}
        defaultOpened
      />,
      this.el,
    );
  }
}

type MenuPortalableProps = {
  children?: ReactNode;
  className?: string;
} & MenuProps;

export const MenuPortalable = (props: MenuPortalableProps): ReactElement => {
  const { children, className = '', ...restOfProps } = props;
  const [menu, setMenu] = useState(false);
  const [x, setX] = useState(-1);
  const [y, setY] = useState(-1);

  return (
    <div
      className={className}
      onClick={(e) => {
        setMenu(true);
        setX(e.pageX);
        setY(e.pageY);
      }}
    >
      {children}
      { menu && (
          <MenuPortal
            {...restOfProps}
            closeMenu={() => setMenu(false)}
            style={{
              top: `${y - 0}px`,
              left: `${x - 0}px`,
            }}
          />
        )
      }
    </div>

  );
};
