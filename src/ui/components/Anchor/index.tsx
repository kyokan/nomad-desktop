import React, {AnchorHTMLAttributes, MouseEvent, ReactElement, useCallback} from "react";

type Props = {
  openLink?: (link: string) => void;
};

export default function Anchor(props: Props & AnchorHTMLAttributes<HTMLAnchorElement>): ReactElement {
  const onClick = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    if (props.href && props.openLink) {
      props.openLink(props.href);
    }

    if (props.onClick) {
      props.onClick(e);
    }
  }, []);

  return (
    <a
      {...props}
      onClick={onClick}
    />
  );
}


