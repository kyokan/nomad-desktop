import {postIPCMain} from "./ipc";
import {IPCMessageRequestType, IPCMessageResponse} from "../../app/types";
import {PostWithMeta} from '../../../../external/indexer/dao/PostWithMeta';
import {mapRawToPost} from "../ducks/posts";
import {mapPostWithMetaToPost} from "../../app/util/posts";
import moment, {Moment} from "moment";
import {uniq} from "./uniq";
import OpenLinkIcon from "../../../static/assets/icons/external_link.svg";
import LinkIcon from "../../../static/assets/icons/link.svg";
import VideoIcon from "../../../static/assets/icons/video.svg";
import ImageIcon from "../../../static/assets/icons/image.svg";
import CommentBlackIcon from "../../../static/assets/icons/comment-black.svg";
import {DATA_IMAGE_REGEX, IMG_EXT_REGEX, OTHER_VIDEO_SITES_REGEX, YOUTUBE_REGEX} from "./rte";
import {GlobalMeta} from "../../app/controllers/signer";

export const isImageUrl = (text: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.src = text;
    img.onerror = () => resolve(false);
    img.onload = () => resolve(true);
  });
};

export type LinkPreviewData = {
  title: string | null;
  description: string | null;
  img: string | null;
  video: string | null;
  favicon?: string;
  timestamp?: Moment;
}

const store: { [key: string]: LinkPreviewData } = {};

export const fetchLinkPreview = (url: string): Promise<LinkPreviewData> => {
  return new Promise(async (resolve, reject) => {
    setTimeout(async () => {
      try {
        if (store[url]) {
          resolve(store[url]);
          return;
        }

        const wrappedURL = new URL(url);

        const resp: IPCMessageResponse<string> = await postIPCMain({
          type: IPCMessageRequestType.FETCH_LINK_PREVIEW,
          payload: url,
        }, true);

        const wbResp = await postIPCMain({
          type: IPCMessageRequestType.FETCH_LINK_PREVIEW,
          payload: `http://archive.org/wayback/available?url=${encodeURIComponent(wrappedURL.href)}&timestamp=1990`,
        }, true);

        let timestamp: Moment | undefined;

        if (wbResp.payload) {
          const json = JSON.parse(wbResp.payload);
          if (json?.archived_snapshots?.closest?.timestamp) {
            timestamp = moment(json?.archived_snapshots?.closest?.timestamp, 'YYYYMMDDhhmmss');
          }
        }

        const html = resp.payload;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const faviconTag: HTMLLinkElement | null = doc.querySelector('link[rel="shortcut icon"]') || doc.querySelector('link[rel="icon"]');
        const favicon = faviconTag ? faviconTag?.href : undefined;

        const titleTag = doc.querySelector('title') || { textContent: '' };
        const titleMeta = doc.querySelector('meta[property="og:title"]');
        const title = !titleMeta || !titleMeta.getAttribute
          ? titleTag.textContent
          : titleMeta.getAttribute('content');

        const imgTag = doc.querySelector('meta[property="og:image"]');
        const img = imgTag && imgTag.getAttribute
          ? imgTag.getAttribute('content')
          : '';

        //
        const descriptionTag = doc.querySelector('meta[property="description"]') || { textContent: '' };
        const descriptionMeta = doc.querySelector('meta[property="og:description"]');
        const description = !descriptionMeta || !descriptionMeta.getAttribute
          ? descriptionTag.textContent
          : descriptionMeta.getAttribute('content');

        const videoTag = doc.querySelector('meta[property="og:video:url"]');
        const video = videoTag && videoTag.getAttribute
          ? videoTag.getAttribute('content')
          : '';

        let faviconUrl = '';

        if (favicon) {
          const favUrl = new URL(favicon);

          if (favUrl.hostname === 'localhost') {
            faviconUrl = `${wrappedURL.protocol}//${wrappedURL.hostname}${favUrl.pathname}`;
          } else {
            faviconUrl = favUrl.href;
          }
        } else {
          faviconUrl = `${wrappedURL.protocol}//${wrappedURL.hostname}/favicon.ico`;
        }

        store[url] = { title,  description, img, video, favicon: faviconUrl, timestamp };
        resolve({ title,  description, img, video, favicon: faviconUrl, timestamp });
      } catch (e) {
        // reject(e);
      }
    }, 0);
  });
};

export const fetchDDRPLinkPreview = (href: string, title: string, text: string, level = 0, expandAll = false): string => {
  const id = uniq();

  let icon = LinkIcon;
  let url: URL | null = null;
  try {
    url = new URL(href);
  } catch (e) {
    //
  }

  if (YOUTUBE_REGEX.test(href) || OTHER_VIDEO_SITES_REGEX.test(href)) {
    icon = VideoIcon;
  } else if (IMG_EXT_REGEX.test(href) || DATA_IMAGE_REGEX.test(href)) {
    icon = ImageIcon;
  } else if (url && url.protocol === 'ddrp:') {
    replaceDDRPFooterHTML(id, url, level, expandAll);
  }

  const shortenedUrl = href.length > 40 ? `${href.slice(0, 24)}...${href.slice(-12)}` : href;

  if (expandAll) {
    setTimeout(() => {
      const el: HTMLDivElement | null = document.querySelector(`#lnk-preview--${id}`);
      const list = el?.querySelectorAll('.md-preview') || [];
      Array.prototype.forEach.call(list, (node) => {
        node.click();
      })
    }, 0);
  }

  return `
    <div id="lnk-preview--${id}" class="lnk-preview lnk-preview--unloaded" data-href="${href}">
      <div  class="md-preview" title="${title || shortenedUrl}" data-href="${href}">
        <img class="md-preview__img" src="${icon}" data-href="${href}"/>
        <div class="md-preview__text" data-href="${href}">${text || shortenedUrl}</div>
      </div>
      <div class="lnk-preview__info lnk-preview__info--first">
        ${getPreviewFooterHTML(url)}
      </div>
    </div>
  `;
};

async function replaceDDRPFooterHTML(elementId: number, url: URL, level: number, expandAll: boolean) {
  const parts = url.pathname?.split('/') || [];
  const href = url.href;
  const creator = parts[2];
  const guid = parts[3];
  const resp = await postIPCMain({
    type: IPCMessageRequestType.GET_POST,
    payload: {
      name: creator + '.',
      guid,
    },
  }, true);

  const { payload: { users } }: IPCMessageResponse<GlobalMeta> = await postIPCMain({
    type: IPCMessageRequestType.GET_GLOBAL_META,
  }, true);

  if (resp.error || !resp.payload) return;
  const { title, content, timestamp } = mapRawToPost(mapPostWithMetaToPost(resp.payload));
  const el: HTMLDivElement | null = document.querySelector(`#lnk-preview--${elementId}`);
  let previewHtml = '';
  const titleHtml = title ? `<div class="lnk-preview__info__title" data-href="${url.href}">${title.slice(2, title.length)}</div>` : '';
  const descHtml = content ? `<div class="lnk-preview__info__description" data-href="${url.href}">${content.slice(0, 500)}</div>` : '';

  const { payload: { meta }}: IPCMessageResponse<PostWithMeta> = await postIPCMain({
    type: IPCMessageRequestType.GET_POST,
    payload: {
      name: creator + '.',
      guid,
    },
  }, true);

  if (level <= 1) {
    const lines = content.split('\n');
    lines.forEach((line) => {
      if (previewHtml) return;
      const parsed = line.match(/!\[.*\](\(.*\))/);

      if (parsed) {
        const link = parsed[1].split(' ')[0].replace(/\(|\)/g, '');
        previewHtml = fetchDDRPLinkPreview(link.trim(), '', '', level + 1, expandAll);
      }
    });
  }
  const profilePic = users[creator + '.'].profilePictureUrl;
  const img = profilePic ? `<img class="lnk-preview__info__profile-pic" src="${profilePic}"/>` : '';
  const cmt = `
    <button class="post-button post__action-btn" data-href="${url.href}" data-opendiscusshref="${url.href}">
      <div class="icon" style="background-image: url('${CommentBlackIcon}'); width: 14px; height: 14px;" data-href="${url.href}" data-opendiscusshref="${url.href}"></div>
      <div class="post-button__text" data-opendiscusshref="${url.href}">${meta.replyCount}</div>
    </button>
  `;

  if (!el) return;
  el.className = 'lnk-preview lnk-preview__ddrp';
  el.innerHTML = `
    ${previewHtml}
    <div class="lnk-preview__info" data-href="${href}">
      ${titleHtml}
      ${descHtml}
      <div class="lnk-preview__info__footer"  data-href="${href}">
        <div>Posted by</div>
        ${img}
        <div class="lnk-preview__info__username">
          ${creator}
        </div>
        <div>${moment(timestamp).fromNow()}</div>
        <div class="lnk-preview__info__footer__actions">
          ${cmt}
        </div>
      </div>
    </div>
  `;
}

function getPreviewFooterHTML(url: URL | null): string {
  if (!url) return '';

  const id = uniq();

  async function fetchPreviewFooterData() {
    const el: HTMLDivElement | null = document.querySelector(`#lnk-preview--${id}`);

    if (!el || !url) return;

    const { favicon, timestamp } = await fetchLinkPreview(url.href);
    const { payload: { topics } }: IPCMessageResponse<GlobalMeta> = await postIPCMain({
      type: IPCMessageRequestType.GET_GLOBAL_META,
    }, true);

    const img = favicon ? `<img class="lnk-preview__info__favicon" src=${favicon} />` : '';
    const time = timestamp ? `<div class="lnk-preview__info__timestamp">${moment(timestamp).fromNow()}</div>` : '';
    const { posts = 0 } = topics[`.discuss="${url.href}"`] || {};

    const cmt = `
      <button class="post-button post__action-btn" data-href="${url.href}" data-opendiscusshref="${url.href}">
        <div class="icon" style="background-image: url('${CommentBlackIcon}'); width: 14px; height: 14px;" data-href="${url.href}" data-opendiscusshref="${url.href}"></div>
        <div class="post-button__text" data-opendiscusshref="${url.href}">${posts}</div>
      </button>
    `;

    el.innerHTML = `
      ${img}
      <div class="lnk-preview__info__hostname">${url.hostname}</div>
      ${time}
      <div class="lnk-preview__info__footer__actions">
        ${cmt}
        <button class="post-button post__action-btn post-button--blue" data-href="${url.href}" data-openhref="${url.href}">
          <div class="icon" style="background-image: url('${OpenLinkIcon}'); width: 14px; height: 14px;" data-href="${url.href}" data-openhref="${url.href}"></div>
        </button>
      </div>
    `
  }

  setTimeout(fetchPreviewFooterData, 0);

  return `
    <div id="lnk-preview--${id}"  class="lnk-preview__info__footer">
      <a href=${url.href} class="lnk-preview__info__hostname" data-href="${url.href}">${url.hostname}</a>
      <div class="lnk-preview__info__footer__actions">
        <button class="post-button post__action-btn" data-href="${url.href}" data-opendiscusshref="${url.href}">
          <div class="icon" style="background-image: url('${CommentBlackIcon}'); width: 14px; height: 14px;" data-href="${url.href}" data-opendiscusshref="${url.href}"></div>
          <div class="post-button__text" data-opendiscusshref="${url.href}"></div>
        </button>
        <button class="post-button post__action-btn post-button--blue" data-href="${url.href}" data-openhref="${url.href}">
          <div class="icon" style="background-image: url('${OpenLinkIcon}'); width: 14px; height: 14px;" data-href="${url.href}" data-openhref="${url.href}"></div>
        </button>
      </div>
    </div>
  `
}
