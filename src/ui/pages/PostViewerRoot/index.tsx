import React, {ReactElement, useEffect, useState} from "react";
import PostViewerHeader from "../../components/Header/PostViewerHeader";
import './post-viewer.scss';
import "../index.scss";
import {useDispatch} from "react-redux";
import {fetchPost, scanGlobalMeta} from "../../ducks/posts";
import {fetchIdentity} from "../../ducks/users";
import {ipcRenderer} from "electron";
import {IPCMessageRequest, IPCMessageRequestType} from "../../../app/types";
import DetailPane from "../../../../../universal/components/DetailPane";

export default function PostViewerRoot (): ReactElement {
  const [postHash, setPostHash] = useState('');
  const dispatch = useDispatch();

  ipcRenderer.on('pushMessage', (_: any, message: IPCMessageRequest<any>) => {
    switch (message.type) {
      case IPCMessageRequestType.SET_POST_VIEWER_HASH:
        setPostHash(message.payload.postHash);
        return;
    }
  });

  useEffect(() => {
    (async function onNewPostRootMount() {
      dispatch(fetchIdentity());
      // TODO: cached scanned result cross windows
      dispatch(scanGlobalMeta());
    })();
  }, [postHash]);

  return (
    <div className="post-viewer">
      <PostViewerHeader />
      <DetailPane postHash={postHash} />
    </div>
  )
}
