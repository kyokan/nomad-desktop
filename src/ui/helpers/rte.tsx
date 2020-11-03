import React from "react";
import {CompositeDecorator, convertFromRaw, EditorState} from "draft-js";
import Anchor from "../components/Anchor";
import {DraftPost} from "../ducks/drafts/type";
import marked from "marked";
import DOMPurify from "dompurify";
import {hash} from "../../../external/universal/utils/hash";

const { markdownToDraft } = require('markdown-draft-js');
const hljs = require('highlight.js');

export const YOUTUBE_REGEX = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
export const OTHER_VIDEO_SITES_REGEX = /^(https?\:\/\/)?(www\.)?(pornhub\.com)\/.+$/;
export const IMG_EXT_REGEX = /\.(jpeg|jpg|gif|png)$/;
export const DATA_IMAGE_REGEX = /^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i;

export const decorator = new CompositeDecorator([
  {
    strategy: findLinkEntities,
    component: (props: any) => {
      const {url} = props.contentState.getEntity(props.entityKey).getData();
      return (
        <Anchor href={url}>{props.children}</Anchor>
      );
    },
  },
]);

export const customStyleMap = {
  CODE: {
    backgroundColor: '#f6f6f6',
    color: '#1c1e21',
    padding: '2px 4px',
    margin: '0 2px',
    borderRadius: '2px',
    fontFamily: 'Roboto Mono, monospace',
  },
};

function findLinkEntities(contentBlock: any, callback: any, contentState: any) {
  contentBlock.findEntityRanges(
    (character: any) => {
      const entityKey = character.getEntity();
      return (
        entityKey !== null &&
        contentState.getEntity(entityKey).getType() === 'LINK'
      );
    },
    callback
  );
}

export const mapDraftToEditorState = (draft?: DraftPost): EditorState => {
  if (!draft) {
    return EditorState.createEmpty(decorator);
  }

  return EditorState.createWithContent(convertFromRaw(markdownToDraft(draft.content, {
    preserveNewlines: true,
    blockTypes: {
      // eslint-disable-next-line @typescript-eslint/camelcase
      table_open: function (item: any) {
        return {
          type: "table",
          mutability: "IMMUTABLE",
          data: {
            table: {
              ...item,
            },
          },
        };
      }
    },
    remarkableOptions: {
      html: false,
      xhtmlOut: false,
      breaks: true,
      enable: {
        block: 'table',
      },
      highlight: function (str: string, lang: string) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(lang, str).value;
          } catch (err) {
            //
          }
        }

        try {
          return hljs.highlightAuto(str).value;
        } catch (err) {
          //
        }

        return ''; // use external default escaping
      }
    }
  })), decorator);
};

const renderer = new marked.Renderer({
  pedantic: false,
  gfm: true,
  breaks: true,
  sanitize: true,
  smartLists: true,
  smartypants: false,
  xhtml: false,
});


renderer.link = (href: string, title: string, text: string, level = 0): string => {
  try {
    const {protocol} = new URL(href);
    const url = href.replace(`${protocol}//`, '');
    const linkText = url.length > 48
      ? url.slice(0, 48) + '...'
      : url;

    return `<a href="${href}" title="${text || href}">${linkText}</a>`
  } catch (e) {
    //
    return '';
  }
};

renderer.image = (href: string, title: string, text: string, level = 0): string => {
  try {
    const {protocol} = new URL(href);
    const url = href.replace(`${protocol}//`, '');
    const linkText = url.length > 48
      ? url.slice(0, 48) + '...'
      : url;

    return `<a href="${href}" title="${text || href}">${linkText}</a>`
  } catch (e) {
    //
    return '';
  }
};

const MARKUP_CACHE: {
  [contentHash: string]: string;
} = {};

renderer.html = (html: string): string => {
  const contentHash = hash(html, '');

  if (MARKUP_CACHE[contentHash]) {
    return MARKUP_CACHE[contentHash];
  }

  const parser = new DOMParser();
  const dom = parser.parseFromString(html, 'text/html');
  const returnHTML = Array.prototype.map
    .call(dom.body.childNodes, el => {
      return el.dataset.imageFileHash
        ? el.outerHTML
        : el.innerText;
    })
    .join('');
  MARKUP_CACHE[contentHash] = returnHTML;
  return returnHTML;
};

export function markup(content: string): string {
  let html = '';

  if (content) {
    const contentHash = hash(content, '');

    if (MARKUP_CACHE[contentHash]) {
      html = MARKUP_CACHE[contentHash];
    } else {
      const dirty = marked(content, {
        renderer,
        highlight: function (str: string, lang: string) {
          if (lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(lang, str).value;
            } catch (err) {
              //
            }
          }

          try {
            return hljs.highlightAuto(str).value;
          } catch (err) {
            //
          }

          return ''; // use external default escaping
        }
      });

      html = DOMPurify.sanitize(dirty);
      MARKUP_CACHE[contentHash] = html;
    }
  }

  return html;
}
