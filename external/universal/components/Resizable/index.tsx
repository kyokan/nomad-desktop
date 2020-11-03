// @ts-ignore
import React, {Component, MouseEvent, UIEvent, ReactNode} from 'react';
import c from "classnames";
// @ts-ignore
import debounce from "lodash.debounce";
import "./resizable.scss";

type State = {
  width?: number;
  height?: number;
  isDragging: boolean;
}

type Props = {
  scrollRef?: (el: HTMLDivElement) => void;
  className: string;
  children: ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  disabled?: boolean;
  vertical?: boolean;
  onScroll?: (e: UIEvent<HTMLDivElement>) => void;
}

export default class Resizable extends Component<Props, State> {
  parent?: HTMLDivElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      width: props.defaultWidth,
      height: props.defaultHeight,
      isDragging: false,
    }
  }

  setWidth = (width: number) => {
    this.setState({ width });
  };

  setHeight = (height: number) => {
    this.setState({ height });
  };

  onMouseDown = () => {
    this.setState({ isDragging: true });
  };

  onMouseUp = () => {
    this.setState({ isDragging: false });
  };

  private _onMouseMove =  debounce((clientY, clientX) => {
    if (this.state.isDragging && this.parent) {
      if (this.props.vertical) {
        this.setHeight(clientY - this.parent.offsetTop);
      } else {
        this.setWidth(clientX - this.parent.offsetLeft);
      }
    }
  }, 50, { leading: true, maxWait: 50 });

  onMouseMove =(e: MouseEvent) => {
    this._onMouseMove(e.clientY, e.clientX);
  };

  onMouseOut = (e: MouseEvent) => {
    this.setState({ isDragging: false });
  };

  render() {
    const { width, isDragging } = this.state;
    const { disabled, vertical, onScroll } = this.props;

    if (vertical) {
      return this.renderVertical();
    }

    return (
      <div
        className={c(this.props.className, {
          'resizable': !disabled,
          "resizable--dragging": isDragging,
        })}
        style={(disabled || !width) ? {} : { width: `${width}px` }}
        ref={el => {
          this.parent = el ? el : undefined;
          if (this.props.scrollRef) {
            this.props.scrollRef(el);
          }
        }}
        onScroll={onScroll}
      >
        { this.props.children }
        <div
          className="resizable__drag-area"
          onMouseDown={this.onMouseDown}
          onMouseUp={this.onMouseUp}
          onMouseMove={this.onMouseMove}
          onMouseOut={this.onMouseOut}
        />
      </div>
    );
  }

  renderVertical(): ReactNode {
    const { height, isDragging } = this.state;
    const { disabled } = this.props;

    return (
      <div
        className={c(this.props.className, {
          'resizable resizable--vertical': !disabled,
          "resizable--dragging": isDragging,
        })}
        style={(disabled || !height) ? {} : { height: `${height}px` }}
        ref={el => {
          this.parent = el ? el : undefined;
          if (this.props.scrollRef) {
            this.props.scrollRef(el);
          }
        }}
      >
        { this.props.children }
        <div
          className="resizable__drag-area"
          onMouseDown={this.onMouseDown}
          onMouseUp={this.onMouseUp}
          onMouseMove={this.onMouseMove}
          onMouseOut={this.onMouseOut}
        />
      </div>
    );
  }
}
