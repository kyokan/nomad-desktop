// @ts-ignore
import React, {Component, MouseEvent} from "react";
// @ts-ignore
import ReactDOM from "react-dom";
import "./full-screen-modal-root.scss";

const modalRoot = document.getElementById('full-screen-modal-root');

type Props = {
  className?: string;
  onClose: (e: MouseEvent) => void;
}

export class FullScreenModal extends Component<Props> {
  el: HTMLDivElement;

  constructor(props: Props) {
    super(props);
    this.el = document.createElement('div');
    this.el.className = `full-screen-modal__container ${props.className || ''}`;
  }

  componentDidMount() {
    // The portal element is inserted in the DOM tree after
    // the Modal's children are mounted, meaning that children
    // will be mounted on a detached DOM node. If a child
    // component requires to be attached to the DOM tree
    // immediately when mounted, for example to measure a
    // DOM node, or uses 'autoFocus' in a descendant, add
    // state to Modal and only render the children when Modal
    // is inserted in the DOM tree.
    if (modalRoot) {
      modalRoot.appendChild(this.el);
    }
  }

  componentWillUnmount() {
    if (modalRoot) {
      modalRoot.removeChild(this.el);
    }
  }

  render() {
    return ReactDOM.createPortal(
      <>
        <div className="full-screen-modal" onClick={e => e.stopPropagation()}>
          <div className="full-screen-modal__overlay" onClick={this.props.onClose}/>
          {this.props.children}
        </div>
      </>,
      this.el,
    );
  }
}
