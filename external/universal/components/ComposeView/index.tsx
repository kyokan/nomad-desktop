import React, {ChangeEvent, ReactElement, useCallback, useState} from "react";
import {withRouter, RouteComponentProps} from "react-router";
import MarkdownEditor from "../../components/MarkdownEditor";
import "./compose.scss";
import {addTag, removeTag, useDraftPost, useUpdateDraft} from "../../ducks/drafts";
import Button from "../../components/Button";
import {useDispatch} from "react-redux";
import ReactRTE from "react-rte";
import {createNewDraft, DraftPost} from "../../ducks/drafts/type";
import {RelayerNewPostResponse} from "../../../../src/app/types";
import {INDEXER_API} from "../../utils/api";

type Props = {
  onSendPost: (draft: DraftPost) => Promise<RelayerNewPostResponse>;
  onFileUpload: (file: File) => Promise<string>;
  onFileUploadButtonClick?: () => any;
} & RouteComponentProps;

function ComposeView(props: Props): ReactElement {
  const dispatch = useDispatch();
  const updateDraft = useUpdateDraft();
  // const onSubmitNewPost = useSendNewPost();
  const draft = useDraftPost();
  const rows = draft.content.split('\n').length;
  const [isPreviewing, setPreviewing] = useState(false);
  const [isSending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [draftTag, setDraftTag] = useState('');
  const [isEditing, setEditing] = useState(false);
  const [draftState, setDraftState] = useState(ReactRTE.createValueFromString(draft.content, 'markdown'));

  const onBlur = useCallback(() => {
    if (draftTag) {
      dispatch(addTag(draftTag));
      setDraftTag('');
    }
    setEditing(false);
  }, [draftTag]);

  const onInsertFile = useCallback(async (file: File) => {
    const refhash = await props.onFileUpload(file);
    const newContent = `${draft.content}\n\n![](${INDEXER_API}/media/${refhash})\n\n`;

    updateDraft({
      ...draft,
      content: newContent ,
    });

    setDraftState(ReactRTE.createValueFromString(newContent, 'markdown'));

  }, [draft]);

  const onSelectAndInsertFile = useCallback(async () => {
    if (props.onFileUploadButtonClick) {
      const refhash = await props.onFileUploadButtonClick();
      const newContent = `${draft.content}\n\n![](${INDEXER_API}/media/${refhash})\n\n`;

      updateDraft({
        ...draft,
        content: newContent,
      });

      setDraftState(ReactRTE.createValueFromString(newContent, 'markdown'));
    }
  }, [draft]);

  const togglePreview = useCallback(() => {
    setPreviewing(!isPreviewing)
  }, [isPreviewing]);

  const onDraftChange = useCallback(async (value: any ) => {
    setDraftState(value);
    updateDraft({
      ...draft,
      content: value.toString('markdown'),
    });
    setErrorMessage('');
  }, [draft]);

  const onMarkdownChangeChange = useCallback(async (e: ChangeEvent<HTMLTextAreaElement> ) => {
    setDraftState(ReactRTE.createValueFromString(draft.content, 'markdown'));
    updateDraft({
      ...draft,
      content: e.target.value,
    });
    setErrorMessage('');
  }, [draft]);

  const send = useCallback(async () => {
    if (isSending || success) return;

    setSending(true);

    draft.content = draft.content.replace(
      new RegExp(`${INDEXER_API}/media/`, 'gi'),
      'ddrpref://'
    );

    try {
      await props.onSendPost(draft);
      setSuccess(true);
      setErrorMessage('');
      updateDraft(createNewDraft());
      setTimeout(() => {
        props.history.push('/');
      }, 500);
    } catch (e) {
      setErrorMessage(e.message);
    } finally {
      setSending(false);
    }
  }, [isSending, success, draft.content, draft.attachments.join(','), draft.tags.join(',')]);

  return (
    <div className="compose-container">
      <div className="compose">
        <div className="compose__header">
          <div className="compose__header__title">
            Create Post
          </div>
        </div>
        {
          !isPreviewing
            ? (
              <ReactRTE
                value={draftState}
                onChange={onDraftChange}
                toolbarConfig={{
                  // Optionally specify the groups to display (displayed in the order listed).
                  display: [
                    'INLINE_STYLE_BUTTONS',
                    'BLOCK_TYPE_BUTTONS',
                    'LINK_BUTTONS',
                    'BLOCK_TYPE_DROPDOWN',
                    'HISTORY_BUTTONS',
                  ],
                  INLINE_STYLE_BUTTONS: [
                    {label: 'Bold', style: 'BOLD', className: 'custom-css-class'},
                    {label: 'Italic', style: 'ITALIC'},
                    {label: 'Underline', style: 'UNDERLINE'}
                  ],
                  BLOCK_TYPE_DROPDOWN: [
                    {label: 'Normal', style: 'unstyled'},
                    {label: 'Heading Large', style: 'header-one'},
                    {label: 'Heading Medium', style: 'header-two'},
                    {label: 'Heading Small', style: 'header-three'}
                  ],
                  BLOCK_TYPE_BUTTONS: [
                    {label: 'UL', style: 'unordered-list-item'},
                    {label: 'OL', style: 'ordered-list-item'},
                  ],
                }}
                // customControls={[
                //   () => {
                //     return (
                //       <div className="custom-rte-btn">
                //         {(
                //           // @ts-ignore
                //           <Icon
                //             className="custom-rte-btn__icon"
                //             material="image"
                //             onClick={props.onFileUploadButtonClick && onSelectAndInsertFile}
                //           />
                //         )}
                //         {
                //           !props.onFileUploadButtonClick && (
                //             <input
                //               type="file"
                //               onChange={e => onInsertFile(e.target.files![0])}
                //             />
                //           )
                //         }
                //       </div>
                //
                //     )
                //   }
                // ]}
              />
            )
            : (
              <MarkdownEditor
                onChange={onMarkdownChangeChange}
                value={draft.content}
                isShowingMarkdownPreview={!isPreviewing}
                rows={Math.max(rows, 12)}
                attachments={[]}
                disabled={isSending || success}
              />
            )
        }
        <div className="compose__error-message">{errorMessage}</div>
        <div className="compose__actions">
          <div className="compose__actions__l">
            <div className="compose__tags">
              {
                draft.tags.map(tag => (
                  <div
                    key={`#${tag}`}
                    className="compose__tags__draft-tag"
                    onClick={() => dispatch(removeTag(tag))}
                  >
                    #{tag}
                  </div>
                ))
              }
              <div
                className="compose__tags__input-container"
                onClick={() => setEditing(true)}
              >
                {isEditing ? `#` : ''}
                {isEditing && (
                  <div className="compose__tags__tag-input">
                    {`${draftTag}`}
                  </div>
                )}
                {!isEditing && (
                  <div className="compose__tags__tag">
                    + Add New Tag
                  </div>
                )}
                {isEditing && (
                  <input
                    className="compose__tags__input"
                    type="text"
                    onBlur={onBlur}
                    onKeyPress={e => {
                      if (e.key === 'Enter') {
                        onBlur();
                      }
                    }}
                    onChange={(e) => {
                      setDraftTag(e.target.value.replace(/ /g, ''));
                    }}
                    value={draftTag}
                    autoFocus
                  />
                )}
              </div>
            </div>
          </div>
          <div className="compose__actions__r">
            <a onClick={togglePreview}>
              {isPreviewing ? 'Switch to Editor' : 'Switch to Markdown' }
            </a>
            <Button
              color={success ? "green" : undefined}
              onClick={send}
              loading={isSending}
            >
              { success ? "Posted" : "Post" }
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default withRouter(ComposeView);

type RichTextEditorProps = {
  className?: string;
  onFileUpload?: (file: File) => Promise<string>;
  content: string;
  onChange: (content: string) => void;
  isShowingMarkdown?: boolean;
  disabled?: boolean;
} & RouteComponentProps;

export const RichTextEditor = withRouter(_RichTextEditor);

function _RichTextEditor(props: RichTextEditorProps): ReactElement {
  const {
    className = '',
    content = '',
    isShowingMarkdown,
    disabled,
  } = props;
  const rows = content.split('\n').length;
  const [draftState, setDraftState] = useState(ReactRTE.createValueFromString(content, 'markdown'));

  const onInsertFile = useCallback(async (file: File) => {
    if (props.onFileUpload) {
      const refhash = await props.onFileUpload(file);
      const newContent = `${content}\n\n![](${INDEXER_API}/media/${refhash})\n\n`;
      props.onChange(newContent);
    }
  }, [content]);

  const onDraftChange = useCallback(async (value: any ) => {
    setDraftState(value);

    props.onChange(value.toString('markdown'));
  }, [content]);

  const onMarkdownChangeChange = useCallback(async (e: ChangeEvent<HTMLTextAreaElement> ) => {
    setDraftState(ReactRTE.createValueFromString(content, 'markdown'));
    props.onChange(e.target.value);
  }, [content]);

  return (
    <div className={`rte ${className}`}>
      {
        !isShowingMarkdown
          ? (
            <ReactRTE
              value={draftState}
              onChange={onDraftChange}
              toolbarConfig={{
                // Optionally specify the groups to display (displayed in the order listed).
                display: [
                  'INLINE_STYLE_BUTTONS',
                  'BLOCK_TYPE_BUTTONS',
                  'LINK_BUTTONS',
                  'BLOCK_TYPE_DROPDOWN',
                  'HISTORY_BUTTONS',
                ],
                INLINE_STYLE_BUTTONS: [
                  {label: 'Bold', style: 'BOLD', className: 'custom-css-class'},
                  {label: 'Italic', style: 'ITALIC'},
                  {label: 'Underline', style: 'UNDERLINE'}
                ],
                BLOCK_TYPE_DROPDOWN: [
                  {label: 'Normal', style: 'unstyled'},
                  {label: 'Heading Large', style: 'header-one'},
                  {label: 'Heading Medium', style: 'header-two'},
                  {label: 'Heading Small', style: 'header-three'}
                ],
                BLOCK_TYPE_BUTTONS: [
                  {label: 'UL', style: 'unordered-list-item'},
                  {label: 'OL', style: 'ordered-list-item'},
                ],
              }}
              // customControls={[
              //   () => {
              //     return (
              //       <div className="custom-rte-btn">
              //         {(
              //           // @ts-ignore
              //           <Icon
              //             className="custom-rte-btn__icon"
              //             material="image"
              //             onClick={() => null}
              //           />
              //         )}
              //         <input
              //           type="file"
              //           onChange={e => onInsertFile(e.target.files![0])}
              //         />
              //       </div>
              //
              //     )
              //   }
              // ]}
            />
          )
          : (
            <MarkdownEditor
              onChange={onMarkdownChangeChange}
              value={content}
              isShowingMarkdownPreview={!isShowingMarkdown}
              rows={Math.max(rows, 12)}
              attachments={[]}
              disabled={disabled}
            />
          )
      }
    </div>
  );
}
