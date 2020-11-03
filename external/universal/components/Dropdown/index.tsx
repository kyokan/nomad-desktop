// @ts-ignore
import React, {ReactElement, useState} from "react";
import "./dropdown.scss";
import classNames from "classnames";

type DropdownItemProps = {
  text: string;
}

type DropdownProps = {
  selectedIndex: number;
  items: DropdownItemProps[];
  onChange: (index: number) => void;
  className?: string;
  disabled?: boolean;
}

function Dropdown(props: DropdownProps): ReactElement {
  const { selectedIndex, items, className = '', onChange, disabled } = props;
  const [ opened, setOpened ] = useState(false);
  const currentItem = items[selectedIndex];

  return (
    <div
      className={classNames('dropdown', className, {
        'dropdown--opened': opened,
        'dropdown--disabled': disabled,
      })}
    >
      <div
        className="dropdown__display"
        onClick={() => !disabled && setOpened(!opened)}
      >
        {currentItem?.text}
      </div>
      <div className="dropdown__list">
        {items.map(({ text }, i) => (
          <div
            key={text}
            className="dropdown__list__item"
            onClick={() => {
              onChange(i);
              setOpened(false);
            }}
          >
            {text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dropdown;
