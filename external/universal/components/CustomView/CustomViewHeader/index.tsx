import React, {MouseEventHandler, ReactElement, ReactNode, useCallback, MouseEvent, useState} from 'react';
import './custom-view-header.scss';
import c from 'classnames';
import {getCSSImageURLFromPostHash} from "../../../utils/posts";
import {isHex} from "../../../utils/hex";

type Props = {
  title?: string;
  titleFn?: () => ReactElement;
  heroImageUrl?: string;
  nameDecoration?: string;
  avatarUrl?: string;
  canUploadHero?: boolean;
  canUploadAvatar?: boolean;
  hideCoverImage?: boolean;
  titleEditable?: boolean;
  onUpdateAvatarUrl?: MouseEventHandler;
  onAvatarUrlChange?: (newAvatarUrl: string) => void;
  onUpdateCoverImage?: MouseEventHandler;
  onCoverImageChange?: (newAvatarUrl: string) => void;
  onTitleUpdate?: (title: string) => void;
  items?: CustomViewHeaderItemProps[];
  actions?: CustomViewHeaderActionProps[];
}


export type CustomViewHeaderItemProps = {
  text: string;
  onClick: MouseEventHandler;
  className?: string;
};

export type CustomViewHeaderActionProps = {
  text: string;
  render?: () => ReactNode;
  className?: string;
  onClick: MouseEventHandler;
};

function CustomViewHeader(props: Props): ReactElement {
  const {
    title,
    titleFn,
    heroImageUrl,
    avatarUrl,
    canUploadHero,
    canUploadAvatar,
    onTitleUpdate,
    hideCoverImage,
    items,
    actions,
    titleEditable,
  } = props;

  return (
    <div className={c("custom-view-header", {
      'custom-view-header--no-avatar': !avatarUrl && !canUploadAvatar,
    })}>
      {/*<CoverImage*/}
      {/*  heroImageUrl={heroImageUrl}*/}
      {/*  uploadable={canUploadHero}*/}
      {/*  hideCoverImage={hideCoverImage}*/}
      {/*  onTitleUpdate={onTitleUpdate}*/}
      {/*  titleEditable={titleEditable}*/}
      {/*/>*/}
      {titleFn && titleFn()}
      {
        actions && (
          <div className="custom-view-header__actions">
            {actions.map(({ text, render, onClick, className = '' }, i) => render ? render() : (
              <button key={'header-action-btn' + text + i} className={`button ${className}`} onClick={onClick}>
                {text}
              </button>
            ))}
          </div>
        )
      }
      {
        items && (
          <div className="custom-view-header__tabs">
            {items.map(({ text, onClick, className }, i) => (
              <button
                key={text + i}
                className={`custom-view-header__tab ${className}`}
                onClick={onClick}
              >
                {text}
              </button>
            ))}
          </div>
        )
      }
    </div>
  )
}

export default CustomViewHeader;


type CoverImageProps = {
  heroImageUrl?: string;
  uploadable?: boolean;
  title?: string;
  hideCoverImage?: boolean;
  onUpdateCoverImage?: MouseEventHandler;
  onCoverImageChange?: (newAvatarUrl: string) => void;
  titleEditable?: boolean;
  onTitleUpdate?: (title: string) => void;
  titleFn?: () => ReactElement;
}

function CoverImage(props: CoverImageProps): ReactElement {
  const {
    heroImageUrl,
    uploadable,
    title,
    hideCoverImage,
    onUpdateCoverImage,
    onCoverImageChange,
    titleEditable,
    onTitleUpdate,
    titleFn,
  } = props;

  const [draftTitle, setDraftTitle] = useState(title);
  let titleElement = titleEditable
    ? (
      <input
        className="custom-view-header__cover-img__title__input"
        value={draftTitle}
        onChange={e => setDraftTitle(e.target.value)}
        onKeyPress={e => {
          if (e.key === 'Enter') {
            if (onTitleUpdate) onTitleUpdate(draftTitle || title || '');
          }
        }}
        autoFocus
      />
    )
    : <span>{title}</span>;

  if (titleFn) {
    titleElement = titleFn();
  }

  if (hideCoverImage) return <></>;

  // if (uploadable) {
  //   return (
  //     <div
  //       className={c("custom-view-header__cover-img", {
  //         'custom-view-header__cover-img--uploadable': uploadable,
  //         'custom-view-header__cover-img--blank': !heroImageUrl,
  //       })}
  //       style={{
  //         backgroundImage: isHex(heroImageUrl)
  //           ? getCSSImageURLFromPostHash(heroImageUrl || '')
  //           : `url(${heroImageUrl})`,
  //       }}
  //     >
  //       <MediaPickerMenuable
  //         key={`cover-image-picker`}
  //         queryMediaByName={() => null}
  //         onMediaUploadClick={() => undefined}
  //         onCancel={async (e: MouseEvent) => {
  //           e.stopPropagation();
  //           if (onCoverImageChange) {
  //             await onCoverImageChange('');
  //           }
  //         }}
  //         onConfirm={async (e: MouseEvent) => {
  //           e.stopPropagation();
  //           if (onUpdateCoverImage) {
  //             await onUpdateCoverImage(e);
  //           }
  //         }}
  //         onMediaHashUpdate={async (hash) => {
  //           if (onCoverImageChange) {
  //             await onCoverImageChange(hash);
  //           }
  //         }}
  //       >
  //         <button className="custom-view-header__cover-img__no-image">
  //           <Icon url={CameraIcon} />
  //           <span>Edit Cover Image</span>
  //         </button>
  //       </MediaPickerMenuable>
  //       <div className="custom-view-header__cover-img__title">
  //         {titleElement}
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <div
      className={c("custom-view-header__cover-img", {
        'custom-view-header__cover-img--blank': !heroImageUrl && !uploadable,
      })}
      style={{
        backgroundImage: isHex(heroImageUrl)
          ? getCSSImageURLFromPostHash(heroImageUrl || '')
          : `url(${heroImageUrl})`,
      }}
    >
      <div className="custom-view-header__cover-img__title">
        {titleElement}
      </div>
    </div>
  )
}

type AvatarImageProps = {
  avatarUrl?: string;
  uploadable?: boolean;
  onUpdateAvatarUrl?: MouseEventHandler;
  onAvatarUrlChange?: (newAvatarUrl: string) => void;
}

function AvatarImage(props: AvatarImageProps): ReactElement {
  const {
    avatarUrl,
    uploadable,
    onUpdateAvatarUrl,
    onAvatarUrlChange,
  } = props;


  if (!avatarUrl && !uploadable) {
    return <></>;
  }

  // if (uploadable && onUpdateAvatarUrl) {
  //   return (
  //     <MediaPickerMenuable
  //       className={c("custom-view-header__avatar-img", {
  //         'custom-view-header__avatar-img--uploadable': uploadable,
  //         'custom-view-header__avatar-img--no-image': !avatarUrl && uploadable,
  //       })}
  //       style={{
  //         backgroundImage: isHex(avatarUrl)
  //           ? getCSSImageURLFromPostHash(avatarUrl || '')
  //           : `url(${avatarUrl})`,
  //       }}
  //       queryMediaByName={() => null}
  //       onMediaUploadClick={() => null}
  //       onCancel={async (e: MouseEvent) => {
  //         e.stopPropagation();
  //         if (onAvatarUrlChange) {
  //           await onAvatarUrlChange('');
  //         }
  //       }}
  //       onConfirm={async (e: MouseEvent) => {
  //         e.stopPropagation();
  //         if (onUpdateAvatarUrl) {
  //           await onUpdateAvatarUrl(e);
  //         }
  //       }}
  //       onMediaHashUpdate={async (hash) => {
  //         if (onAvatarUrlChange) {
  //           await onAvatarUrlChange(hash);
  //         }
  //       }}
  //     >
  //       <Icon url={CameraIcon} />
  //     </MediaPickerMenuable>
  //   );
  // }

  return (
    <div
      className={c("custom-view-header__avatar-img", {
        'custom-view-header__avatar-img--no-image': !avatarUrl && uploadable,
      })}
      style={{
        backgroundImage: isHex(avatarUrl)
          ? getCSSImageURLFromPostHash(avatarUrl || '')
          : `url(${avatarUrl})`,
      }}
    />
  )
}

function renderUrlInput(props: AvatarImageProps, closeMenu?: () => void): ReactNode {
  const {
    onUpdateAvatarUrl,
  } = props;
  const onChange = useOnAvatarUrlChange(props);

  return (
    <div
      key="profile-pic-input"
      className="profile-pic-input__container"
      onClick={e => e.stopPropagation()}
    >
      <input
        type="text"
        className="profile-pic-input"
        placeholder="https://..."
        onChange={onChange}
      />
      <button
        className="button profile-pic-input__button"
        onClick={async (e) => {
          if (onUpdateAvatarUrl) {
            await onUpdateAvatarUrl(e);
          }
          closeMenu && closeMenu();
        }}
      >
        Submit
      </button>
    </div>
  );
}

function useOnAvatarUrlChange(props: AvatarImageProps) {
  const {
    onAvatarUrlChange,
  } = props;
  return useCallback(e => {
    if (onAvatarUrlChange) {
      onAvatarUrlChange(e.target.value);
    }
  }, [onAvatarUrlChange]);
}
