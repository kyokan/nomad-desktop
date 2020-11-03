import React, {MouseEvent, ReactElement, useCallback, useEffect, useState} from "react";
import {shell} from "electron";
import {DATA_IMAGE_REGEX, IMG_EXT_REGEX, markup, OTHER_VIDEO_SITES_REGEX, YOUTUBE_REGEX} from "../../helpers/rte";
import {MenuPortal} from "../Menuable/menu-portal";
import copy from "copy-to-clipboard";
import {fetchLinkPreview} from "../../helpers/url";
import {uniq} from "../../helpers/uniq";
import { withRouter, RouteComponentProps } from "react-router";
import './markup.scss';
import {parsePreviewLinks} from "../../../app/util/posts";
import {useDispatch} from "react-redux";

type Props = {
  content: string;
  html?: string;
  handleOpenDiscuss?: () => void;
} & RouteComponentProps;

function Markup(props: Props): ReactElement {
  const [menu, setMenu] = useState(false);
  const [href, setHref] = useState('');
  const [x, setX] = useState(-1);
  const [y, setY] = useState(-1);
  const links = parsePreviewLinks(props.content);

  const onContextMenuClick = useCallback(e => {
    // @ts-ignore
    const { tagName, href, dataset } = e.target || {};

    if (dataset.href) {
      e.stopPropagation();
      e.preventDefault();
      setMenu(true);
      setHref(dataset.href);
      setX(e.pageX);
      setY(e.pageY);
      return;
    }

    if (tagName === 'A') {
      e.stopPropagation();
      e.preventDefault();
      setMenu(true);
      setHref(href);
      setX(e.pageX);
      setY(e.pageY);
      return;
    }
  }, [x, y, menu, href]);

  const dispatch = useDispatch();

  const menuItems = [
    {
      text: 'Open Link in Browser',
      onClick: () => {
        shell.openExternal(href);
        setMenu(false);
      },
    },
    { divider: true },
    {
      text: `Copy Link Address`,
      onClick: () => {
        copy(href);
        setMenu(false);
      },
    },
  ];

  const onClick = useCallback(async (e: MouseEvent<HTMLDivElement>) => {
    // @ts-ignore
    const { tagName, href, dataset } = e.target;

    if (dataset?.openhref) {
      e.stopPropagation();
      e.preventDefault();
      shell.openExternal(dataset?.openhref);
      return;
    }

    if (tagName === 'A') {
      e.stopPropagation();
      e.preventDefault();
      shell.openExternal(href);
      return;
    }
  }, [links]);

  return (
    <>
      <div
        className="marked"
        onClick={onClick}
        onContextMenu={onContextMenuClick}
      >
        <DangerousHTML content={props.content} html={props.html} />
      </div>
      {
        menu && (
          <MenuPortal
            items={menuItems}
            closeMenu={() => {
              setMenu(false);
            }}
            style={{
              top: `${y - 0}px`,
              left: `${x - 0}px`,
            }}
          />
        )
      }
    </>
  )
}

export default withRouter(Markup);

function getYoutubeId(rawUrl: string): string {
  let ID = '';
  let url: string[] = [];
  url = rawUrl.replace(/(>|<)/gi,'').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
  if(url[2] !== undefined) {
    // eslint-disable-next-line no-useless-escape
    ID = url[2].split(/[^0-9a-z_\-]/i)[0];
  } else {
    ID = rawUrl;
  }
  return ID;
}

function getPornhubId(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    // @ts-ignore
    return url.searchParams.get('viewkey');
  } catch (e) {
    return '';
  }
}


function getPreviewHTML(element: HTMLDivElement): string {
  const { dataset } = element;
  const { href = '' } = dataset || {};
  if (YOUTUBE_REGEX.test(href)) {
    return `
      <iframe class="yt-preview" src="https://www.youtube.com/embed/${getYoutubeId(href)}"></iframe>
    `;
  } else if (OTHER_VIDEO_SITES_REGEX.test(href)) {
    return `
      <iframe class="yt-preview" src="https://www.pornhub.com/embed/${getPornhubId(href)}"></iframe>
    `
  } else if (IMG_EXT_REGEX.test(href) || DATA_IMAGE_REGEX.test(href)) {
    return `
      <img src="${dataset.href}" data-href="${href}" async/>
    `;
  } else {
    const id = uniq();
    fetchLinkPreview(href)
      .then(({ title, description, img }) => {
        const el: HTMLDivElement | null = document.querySelector(`#lnk-preview--${id}`);
        const imgHtml = img ? `<img class="lnk-preview__img" src="${img}" data-href="${img}" async/>` : '';
        const titleHtml = title ? `<div class="lnk-preview__info__title" data-href="${href}">${title}</div>` : '';
        const descHtml = description ? `<div class="lnk-preview__info__description" data-href="${href}">${description}</div>` : '';

        if (!el) return;
        el.className = 'link-preview';
        el.innerHTML = `
          ${imgHtml}
          <div class="lnk-preview__info" data-href="${href}">
            ${titleHtml}
            ${descHtml}
          </div>
        `;
      });
    return `
      <div id="lnk-preview--${id}" class="lnk-preview--loading" data-href="${href}">
        Fetching Preview...
      </div>
    `;
  }
}

function _DangerousHTML(props: { html?: string; content: string }): ReactElement {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: props.html || markup(props.content),
      }}
    />
  )
}

const DangerousHTML = React.memo(_DangerousHTML);
