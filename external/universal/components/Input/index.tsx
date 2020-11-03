// @ts-ignore
import React, {InputHTMLAttributes, ReactElement, ReactNode, useState, useCallback} from "react";
// @ts-ignore
import c from 'classnames';
import './index.scss';
import Icon from "../Icon";

type Props = {
  iconFn?: () => ReactNode;
} & InputHTMLAttributes<any>;

export default function Input(props: Props): ReactElement {
  const {
    className,
    type = 'text',
    iconFn,
    disabled,
    onChange,
    onKeyDown,
    value,
    placeholder,
    autoFocus,
    defaultValue,
  } = props;

  const [file, setFile] = useState<File | undefined>(undefined);
  const onFileChange = useCallback((e: any) => {
    const file = e.target.files[0];
    setFile(file);
    onChange && onChange(e);
  }, []);

  if (type === 'file') {
    return (
      <div className="file-upload">
        {(
          // @ts-ignore
          <Icon
            material="publish"
            width={18}
          />
        )}
        <div className="file-upload__text">
          {file ? `Selected: ${file.name}` : 'Selected File'}
        </div>
        <input
          type="file"
          onChange={onFileChange}
        />
      </div>
    )
  }

  return (
    <div
      className={c('input-container', className, {
        'input-container--disabled': disabled,
      })}
    >
      <input
        type={type}
        disabled={disabled}
        onChange={onChange}
        onKeyDown={onKeyDown}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        defaultValue={defaultValue}
      />
      { iconFn && iconFn() }
    </div>
  )
}
