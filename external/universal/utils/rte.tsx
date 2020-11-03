// @ts-ignore
import React from "react";
// @ts-ignore
import marked from "marked";
// @ts-ignore
import * as DOMPurify from "dompurify";
import {hash} from "./hash";
import {INDEXER_API} from "./api";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const hljs = require('highlight.js');

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

    const displayText = text === href
      ? linkText
      : text || linkText;

    return `<a href="${href}" title="${text}" target="_blank">${displayText}</a>`
  } catch (e) {
    //
    return '';
  }
};

renderer.image = (href: string, title: string, text: string, level = 0): string => {
  try {
    const {protocol, pathname} = new URL(href);

    if (protocol === 'ddrp:') {
      const [_, __, username, hash] = pathname.split('/');
      return `<img src="${INDEXER_API}/media/${hash}" />`;
    }

    if (protocol === 'ddrpref:') {
      const [_, __, hash] = pathname.split('/');
      return `<img src="${INDEXER_API}/media/${hash}" />`;
    }

    const url = href.replace(`${protocol}//`, '');
    const linkText = url.length > 48
      ? url.slice(0, 48) + '...'
      : url;

    return `<a href="${href}" title="${text || href}" target="_blank">${linkText}</a>`
  } catch (e) {
    //
    return '';
  }
};

const MARKUP_CACHE: {
  [contentHash: string]: string;
} = {};

renderer.html = function (html: string): string {
  const contentHash = hash(html, '');

  if (MARKUP_CACHE[contentHash]) {
    return MARKUP_CACHE[contentHash];
  }

  try {
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
  } catch (e) {
    return '';
  }

};

export function markup(content: string, customRenderer?: marked.Renderer): string {
  try {
    let html = '';

    if (content) {
      const contentHash = hash(content, '');

      if (MARKUP_CACHE[contentHash]) {
        html = MARKUP_CACHE[contentHash];
      } else {
        const dirty = marked(content, {
          renderer: customRenderer || renderer,
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
  } catch (e) {
    return content;
  }

}
