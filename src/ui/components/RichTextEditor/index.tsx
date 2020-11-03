import {PostType} from "../../ducks/posts";
import React, {
  ButtonHTMLAttributes,
  ChangeEvent,
  memo,
  MouseEventHandler,
  ReactElement,
  ReactNode,
  useCallback,
  useState
} from 'react';
import {
  convertToRaw,
  DraftHandleValue,
  Editor,
  EditorState,
  RichUtils,
  DefaultDraftBlockRenderMap,
} from "draft-js";
import c from "classnames";
import Icon from "../Icon";
import BoldIcon from "../../../../static/assets/icons/bold.svg";
import ItalicIcon from "../../../../static/assets/icons/italic.svg";
import UnderlineIcon from "../../../../static/assets/icons/underline.svg";
import StrikethroughIcon from "../../../../static/assets/icons/strikethrough.svg";
import CodeBlockIcon from "../../../../static/assets/icons/code.png";
import CodeIcon from "../../../../static/assets/icons/code.svg";
import OrderedListIcon from "../../../../static/assets/icons/list.svg";
import UnorderedListIcon from "../../../../static/assets/icons/list-2.svg";
import './rich-text-editor.scss';
import {customStyleMap, mapDraftToEditorState} from "../../helpers/rte";
import {DraftPost} from "../../ducks/drafts/type";
import PostHeader from "../PostHeader";
import {useDraftPost} from "../../ducks/drafts";
const hljs = require('highlight.js');
const TableUtils = require('draft-js-table');


// eslint-disable-next-line @typescript-eslint/no-var-requires
const { draftToMarkdown } = require('markdown-draft-js');

type Props = {
  className?: string;
  onChange: (post: DraftPost) => void;
  disabled?: boolean;
  embedded?: boolean;
  onSecondaryClick?: MouseEventHandler;
  onPrimaryClick?: MouseEventHandler;
  primaryBtnProps?: ButtonHTMLAttributes<HTMLButtonElement>;
}

function RichTextEditor(props: Props): ReactElement {
  const {
    className = '',
    disabled,
    onChange,
    embedded,
    onPrimaryClick,
    onSecondaryClick,
    primaryBtnProps,
  } = props;

  const draftPost = useDraftPost();

  const [editorState, _setEditorState] = useState<EditorState>(mapDraftToEditorState(draftPost));
  const [title, setTitle] = useState<string>(draftPost?.title || '');

  const setEditorState = useCallback((editorState: EditorState) => {
    _setEditorState(editorState);
    const currentContent = editorState.getCurrentContent();
    const markdown = draftToMarkdown(convertToRaw(currentContent), {
      preserveNewlines: true,
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
      },
    });

    onChange({
      type: PostType.ORIGINAL,
      timestamp: new Date().getTime(),
      title,
      content: currentContent.hasText() ? markdown : '',
      topic: '',
      context: '',
      parent: '',
      tags: [],
      attachments: [],
    });
  }, [editorState, onChange]);

  const handleKeyCommand: (command: string) => DraftHandleValue = useCallback((command: string): DraftHandleValue => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      setEditorState(newState);
      return 'handled';
    }
    return 'not-handled';
  }, [editorState]);

  const onBoldClick = useRTEInlineStyleCallback(editorState, 'BOLD', setEditorState, [editorState]);
  const onItalicClick = useRTEInlineStyleCallback(editorState, 'ITALIC', setEditorState, [editorState]);
  const onUnderlineClick = useRTEInlineStyleCallback(editorState, 'UNDERLINE', setEditorState, [editorState]);
  const onStrikethroughClick = useRTEInlineStyleCallback(editorState, 'STRIKETHROUGH', setEditorState, [editorState]);
  const onCodeClick = useRTEInlineStyleCallback(editorState, 'CODE', setEditorState, [editorState]);
  const onCodeBlockClick = useRTEInBlockTypeCallback(editorState, 'code-block', setEditorState, [editorState]);
  const onOrderedListClick = useRTEInBlockTypeCallback(editorState, 'ordered-list-item', setEditorState, [editorState]);
  const onUnorderedListClick = useRTEInBlockTypeCallback(editorState, 'unordered-list-item', setEditorState, [editorState]);
  const onBlockquoteClick = useRTEInBlockTypeCallback(editorState, 'blockquote', setEditorState, [editorState]);

  return (
    <div
      className={c('rich-text-editor', className, {
        'rich-text-editor--disabled': disabled,
        'rich-text-editor--embedded': embedded,
      })}
    >
      <Editor
        editorState={editorState}
        onChange={setEditorState}
        handleKeyCommand={handleKeyCommand}
        customStyleMap={customStyleMap}
        blockRenderMap={DefaultDraftBlockRenderMap.merge(TableUtils.DraftBlockRenderMap)}
        placeholder="Write here..."
      />
      <RTEControls
        onBoldClick={onBoldClick}
        onItalicClick={onItalicClick}
        onUnderlineClick={onUnderlineClick}
        onStrikethroughClick={onStrikethroughClick}
        onCodeClick={onCodeClick}
        onCodeBlockClick={onCodeBlockClick}
        onOrderedListClick={onOrderedListClick}
        onUnorderedListClick={onUnorderedListClick}
        onBlockquoteClick={onBlockquoteClick}
        onPrimaryClick={onPrimaryClick}
        onSecondaryClick={onSecondaryClick}
        embedded={embedded}
        primaryBtnProps={primaryBtnProps}
      />
    </div>
  );
}

export default memo(RichTextEditor);

function renderHeader(onTagChange: (tag: string) => void): ReactNode {
  return (
    <PostHeader
      className="short-text-editor__header"
      onTagChange={onTagChange}
      editing
    />
  )
}

type RTEButtonProps = {
  iconUrl: string;
  onClick: MouseEventHandler;
  width?: number;
}

function RTEButton(props: RTEButtonProps): ReactElement {
  return (
    <button
      className="rich-text-editor__controls__button"
      onClick={props.onClick}
    >
      <Icon url={props.iconUrl} width={props.width} />
    </button>
  )
}

type RETControlsProps = {
  onBoldClick: () => void;
  onItalicClick: () => void;
  onUnderlineClick: () => void;
  onStrikethroughClick: () => void;
  onCodeClick: () => void;
  onCodeBlockClick: () => void;
  onOrderedListClick: () => void;
  onUnorderedListClick: () => void;
  onBlockquoteClick: () => void;
  onSecondaryClick?: MouseEventHandler;
  onPrimaryClick?: MouseEventHandler;
  embedded?: boolean;
  primaryBtnProps?: ButtonHTMLAttributes<HTMLButtonElement>;
}

function RTEControls(props: RETControlsProps): ReactElement {
  const {
    onBoldClick,
    onItalicClick,
    onUnderlineClick,
    onStrikethroughClick,
    onCodeClick,
    onCodeBlockClick,
    onOrderedListClick,
    onUnorderedListClick,
    onBlockquoteClick,
    onSecondaryClick,
    onPrimaryClick,
    embedded,
    primaryBtnProps = {},
  } = props;

  return (
    <div className="rich-text-editor__controls">
      <RTEButton
        iconUrl={BoldIcon}
        onClick={onBoldClick}
      />
      <RTEButton
        iconUrl={ItalicIcon}
        onClick={onItalicClick}
      />
      <RTEButton
        iconUrl={UnderlineIcon}
        onClick={onUnderlineClick}
      />
      <RTEButton
        iconUrl={StrikethroughIcon}
        onClick={onStrikethroughClick}
      />
      <RTEButton
        iconUrl={CodeIcon}
        onClick={onCodeClick}
      />
      <RTEButton
        iconUrl={CodeBlockIcon}
        onClick={onCodeBlockClick}
        width={16}
      />
      <RTEButton
        iconUrl={OrderedListIcon}
        onClick={onOrderedListClick}
        width={16}
      />
      <RTEButton
        iconUrl={UnorderedListIcon}
        onClick={onUnorderedListClick}
        width={16}
      />
      <RTEButton
        iconUrl={UnorderedListIcon}
        onClick={onBlockquoteClick}
        width={16}
      />
      {
        embedded && (
          <div className="rich-text-editor__controls__actions">
            <button className="button" onClick={onSecondaryClick}>Cancel</button>
            <button
              {...primaryBtnProps}
              className={`button ${primaryBtnProps.className}`}
              onClick={onPrimaryClick}
            >
              Send
            </button>
          </div>
        )
      }
    </div>
  );
}

function useRTEInlineStyleCallback(editorState: EditorState, cmd: string, cb?: (s: EditorState) => void, dep?: any[]): () => void {
  return useCallback(() => {
    const newState = RichUtils.toggleInlineStyle(editorState, cmd);
    if (cb) cb(newState);
  }, dep || []);
}

function useRTEInBlockTypeCallback(editorState: EditorState, cmd: string, cb?: (s: EditorState) => void, dep?: any[]): () => void {
  return useCallback(() => {
    const newState = RichUtils.toggleBlockType(editorState, cmd);
    if (cb) cb(newState);
  }, dep || []);
}
