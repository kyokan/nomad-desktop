// @ts-ignore
import React, {MouseEventHandler, ReactElement, ReactNode, useCallback, useEffect, useState} from "react";
// @ts-ignore
import {Redirect, RouteComponentProps, withRouter} from "react-router";
// @ts-ignore
import {useDispatch} from "react-redux";
import CustomView from "../CustomView";
import {
  useDeleteFilterByIndex,
  userCurrentUserData,
  useRemoveUserFromViewIndex,
  useUpdateTitleByViewIndex
} from "../../ducks/users";
import {CustomViewPanelProps, CustomViewPanelType} from "../CustomView/CustomViewPanel";
import {useFullControlPanel, useQueryCustomFilter} from "../CustomView/util";
import {CustomViewHeaderActionProps} from "../CustomView/CustomViewHeader";
import Menuable from "../../../../src/ui/components/Menuable";
import {undotName} from "../../../../src/ui/helpers/user";
import "./custom-filter-view.scss";
import {Filter} from "../../utils/filter";
import {addTag} from "../../ducks/search";

export type CustomFilterViewProps = {
  title: string;
  heroImageUrl: string;
  className?: string;
  filter: Filter;
  headerActions: CustomViewHeaderActionProps[];
  titleEditable?: boolean;
  onTitleUpdate?: (title: string) => void;
  onCoverImageChange?: (hash: string) => void;
  onUpdateCoverImage?: MouseEventHandler;
  onLikePost: (postHash: string) => void;
  onSendReply: (postHash: string) => void;
  onBlockUser: (postHash: string) => void;
  onFollowUser: (postHash: string) => void;
  onTagClick?: (tagName: string) => void;
  canUploadHero?: boolean;
  canUploadAvatar?: boolean;
} & RouteComponentProps;

function _CustomFilterView(props: CustomFilterViewProps): ReactElement {
  const {
    className = '',
    title,
    heroImageUrl,
    headerActions,
    titleEditable,
    onTitleUpdate,
    canUploadHero,
    onCoverImageChange,
    onUpdateCoverImage,
    onLikePost,
    onSendReply,
    onBlockUser,
    onFollowUser,
  } = props;

  const onSelectPost = useCallback((postHash: string) => {
    props.history.push(`/posts/${postHash}`);
  }, [props.history]);

  const onTagClick = useCallback((tagName: string) => {
    setNext(0);
    if (props.onTagClick) {
      props.onTagClick(tagName);
    }
  }, [props.history, props.onTagClick]);

  const {
    list, setList,
    next, setNext,
    loading, setLoading,
    query,
  } = useQueryCustomFilter(props.filter);


  useEffect(() => {
    (async function onCustomFilterViewRefresh() {
      setLoading(false);
      setList([]);
      setNext(0);
    }())
  }, [
    props.filter.postedBy.join(','),
    props.filter.repliedBy.join(','),
    props.filter.likedBy.join(','),
    props.filter.parentHashes.join(','),
    props.filter.postHashes.join(','),
    props.filter.allowedTags.join(','),
  ]);

  useEffect(() => {
    if (next === 0) {
      setTimeout(() => query(true), 0);
    }
  }, [
    next,
    props.filter.postedBy.join(','),
    props.filter.repliedBy.join(','),
    props.filter.likedBy.join(','),
    props.filter.parentHashes.join(','),
    props.filter.postHashes.join(','),
    props.filter.allowedTags.join(','),
  ]);

  const panels: CustomViewPanelProps[] = [];

  return (
    <CustomView
      className={className}
      title={title}
      heroImageUrl={heroImageUrl}
      headerActions={headerActions}
      hashes={list}
      onLikePost={onLikePost}
      onSendReply={onSendReply}
      onSelectPost={onSelectPost}
      onBlockUser={onBlockUser}
      onFollowUser={onFollowUser}
      onScrolledToBottom={typeof next === 'number' ? query : undefined}
      loading={loading}
      panels={panels}
      titleEditable={titleEditable}
      onTitleUpdate={onTitleUpdate}
      canUploadHero={canUploadHero}
      onCoverImageChange={onCoverImageChange}
      onUpdateCoverImage={onUpdateCoverImage}
      onTagClick={onTagClick}
    />
  );
}

const CustomFilterView = withRouter(_CustomFilterView);
export default CustomFilterView;

type CustomViewContainerProps = {
  onLikePost: (postHash: string) => void;
  onSendReply: (postHash: string) => void;
  onBlockUser: (postHash: string) => void;
  onFollowUser: (postHash: string) => void;
} & RouteComponentProps<{viewIndex?: string}>

function _CustomViewContainer(props: CustomViewContainerProps): ReactElement {
  const userData = userCurrentUserData();
  const view = (userData?.savedViews || [])[Number(props.match.params.viewIndex)];
  const removeUserFromViewIndex = useRemoveUserFromViewIndex();
  const deleteFilterByIndex = useDeleteFilterByIndex();
  const updateTitleByViewIndex = useUpdateTitleByViewIndex();
  const [isEditingTitle, setEditTitle] = useState(false);

  useEffect(() => {
    setEditTitle(false);
  }, [props.match.params.viewIndex]);

  const headerActions: CustomViewHeaderActionProps[] = [
    {
      text: 'more',
      className: 'more-btn',
      render: (): ReactNode => {
        return (
          <Menuable
            className="more-btn__menu"
            items={[
              {
                text: `Edit Title`,
                onClick: (e) => {
                  setEditTitle(true);
                },
              },
              {
                text: `Delete ${view.title}`,
                onClick: () => deleteFilterByIndex(Number(props.match.params.viewIndex)),
              },
              { divider: true },
              {
                text: 'Remove User...',
                items: view.filter.postedBy.map((name, i) => {
                  return {
                    text: `@${undotName(name)}`,
                    onClick: () => removeUserFromViewIndex(name, Number(props.match.params.viewIndex)),
                  }
                }),
              }
            ]}
          >
            <button className="button more-btn">
              ...
            </button>
          </Menuable>
        );
      },
      onClick: () => null,
    }
  ];

  return !view ? <Redirect to="/discover" /> : (
    <CustomFilterView
      key={props.match.params.viewIndex}
      className="custom-view-container"
      headerActions={headerActions}
      title={view.title}
      heroImageUrl=""
      filter={{
        ...view.filter,
      }}
      titleEditable={isEditingTitle}
      onLikePost={props.onLikePost}
      onSendReply={props.onSendReply}
      onBlockUser={props.onBlockUser}
      onFollowUser={props.onFollowUser}
      onTitleUpdate={async (title: string) => {
        await updateTitleByViewIndex(title, Number(props.match.params.viewIndex));
        setEditTitle(false);
      }}
    />
  )
}

export const CustomViewContainer = withRouter(_CustomViewContainer);
