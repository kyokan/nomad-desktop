import React, {Component, ReactElement} from "react";
import ReactDOM from "react-dom";
import {removeSystemMessage, useSystemMessages} from "../../ducks/app";
import CancelIcon from '../../../../static/assets/icons/cancel.svg';
import './sys-message.scss';
import Icon from "nomad-universal/lib/components/Icon";
import {useDispatch} from "react-redux";
import c from "classnames";

const modalRoot = document.getElementById('sys-message-root');

type Props = {
  className?: string;
  closeMessage: () => void;
}

export class SystemMessage extends Component<Props> {
  el: HTMLDivElement;

  constructor(props: Props) {
    super(props);
    this.el = document.createElement('div');
    this.el.className = `system-message ${props.className || ''}`;
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

    setTimeout(this.props.closeMessage, 2000);
  }

  componentWillUnmount() {
    if (modalRoot) {
      modalRoot.removeChild(this.el);
    }
  }

  render() {
    return ReactDOM.createPortal(
      this.props.children,
      this.el,
    );
  }
}

export function MessagePort(): ReactElement {
  const messages = useSystemMessages();
  const dispatch = useDispatch();

  return (
    <div className="system-messages">
      {messages.map(({ type, text }, i) => (
        <SystemMessage
          key={`${text}-${i}`}
          className={c({
            'system-message--info': type === 'info',
            'system-message--error': type === 'error',
            'system-message--success': type === 'success',
          })}
          closeMessage={() => dispatch(removeSystemMessage(messages[i]))}
        >
          {text}
          <Icon
            className="system-message__close-icon"
            url={CancelIcon}
            width={8}
            onClick={() => dispatch(removeSystemMessage(messages[i]))}
          />
        </SystemMessage>
      ))}
    </div>
  )
}

