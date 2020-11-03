// @ts-ignore
import React, {
  ReactElement,
  memo,
  ChangeEventHandler,
  // @ts-ignore
} from 'react';
// @ts-ignore
import c from "classnames";
import './markdown-editor.scss';

// eslint-disable-next-line @typescript-eslint/no-var-requires
import PostCardHeader from "../PostCard/PostCardHeader";
import {useCurrentUser, useCurrentUsername, useUser} from "../../ducks/users";
import Markup from "../Markup";
import Attachments from "../Attachments";


type Props = {
  className?: string;
  onChange: ChangeEventHandler;
  disabled?: boolean;
  embedded?: boolean;
  isShowingMarkdownPreview: boolean;
  rows?: number;
  attachments: string[];
  value?: string;
}

function MarkdownEditor(props: Props): ReactElement {
  const {
    className = '',
    disabled,
    onChange,
    isShowingMarkdownPreview,
    rows,
    attachments = [],
    value = '',
  } = props;

  const currentUsername = useCurrentUsername();
  // const [content, setContent] = useState<string>('');
  //
  // const onContentChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
  //   setContent(e.target.value);
  //
  //   // onChange({
  //   //   content: e.target.value,
  //   // });
  // }, []);

  return (
    <div className={c('markdown-editor', className, {
      'markdown-editor--disabled': disabled,
      'markdown-editor--auto-height': typeof rows !== "undefined",
    })}>
      <PostCardHeader
        creator={currentUsername}
        timestamp=""
        hideInfo
      />
      {
        !isShowingMarkdownPreview
          ? (
            <div className='markdown-editor__content'>
              <textarea
                className="markdown-editor__textarea"
                placeholder="Write Something..."
                onClick={e => e.stopPropagation()}
                onChange={onChange}
                disabled={disabled}
                value={value}
                rows={rows}
              />
              <Attachments attachments={attachments}/>
            </div>
          )
          : (
            <div className="markdown-editor__content markdown-editor__content--preview">
              <Markup content={value} />
              <Attachments attachments={attachments}/>
            </div>
          )
      }
      <div className='markdown-editor__footer'>
        <div className='markdown-editor__footer__button'>
        </div>
      </div>
    </div>
  )
}

export default memo(MarkdownEditor);
