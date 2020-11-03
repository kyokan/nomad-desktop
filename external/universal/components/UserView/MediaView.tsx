// @ts-ignore
import React, {ReactElement, MouseEvent, useCallback, useEffect, useState} from 'react';
import {RouteComponentProps, withRouter} from 'react-router';
import {PostWithMeta} from '../../../external/indexer/dao/PostWithMeta';
import {Pageable} from '../../../external/indexer/dao/Pageable';
import {updateRawPost} from "../../ducks/posts";
// @ts-ignore
import uniq from "lodash.uniq";
import {useDispatch} from "react-redux";
import './media-view.scss';
import {getCSSImageURLFromPostHash, mapDomainEnvelopeToPost} from "../../utils/posts";
type Props = {
  queryNext: (username: string, next: number | null, list: PostWithMeta[]) => Promise<Pageable<PostWithMeta, number>>;
  username?: string;
  onSelectMedia?: (e: MouseEvent<HTMLDivElement>, hash: string) => void;
} & RouteComponentProps<{username: string}>;

function MediaView(props: Props): ReactElement {
  const {
    match: { params: { username: _username = '' } },
    onSelectMedia,
  } = props;

  const username = props.username || _username;

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<string[]>([]);
  const [next, setNext] = useState<number | null>(0);
  const dispatch = useDispatch();

  const query = useCallback(async (reset?: boolean) => {
    setLoading(true);

    if ((!username || typeof next !== 'number') && !reset) {
      setLoading(false);
      return;
    }

    const payload = await props.queryNext(
      username,
      reset ? 0 : next,
      [],
    );

    setLoading(false);
    const hashes = payload.items.map(postWithMeta => {
      const post = mapDomainEnvelopeToPost(postWithMeta);
      dispatch(updateRawPost(post));
      return post.hash;
    });

    if (reset) {
      setList(uniq(hashes));
    } else {
      setList(uniq(list.concat(hashes)));
    }
    setNext(payload.next);
  }, [props.username, _username, next]);

  useEffect(() => {
    (async function onMediaViewUpdate() {
       await query(true);
    }());
  }, [props.username, _username]);

  return !list.length
    ? (
      <div className="media-view__empty">
        No Media
      </div>
    )
    : (
      <div
        className="media-view"
      >
        {
          list.map(hash => (
            <div
              key={hash}
              className="media-view__image"
              onClick={e => {
                if (onSelectMedia) onSelectMedia(e, hash);
              }}
              style={{
                backgroundImage: getCSSImageURLFromPostHash(hash),
              }}
            />
          ))
        }
      </div>
    );
}

export default withRouter(MediaView);

// async function queryNext(username: string, next: number | null, list: PostWithMeta[] = []): Promise<Pageable<PostWithMeta, number>> {
//   const resp = await postIPCMain({
//     type: IPCMessageRequestType.QUERY_POSTS_FOR_NAME,
//     payload: {
//       name: username,
//       order: 'DESC',
//       start: next,
//     },
//   }, true);
//
//   if (resp.error) {
//     return Promise.reject(resp.error);
//   }
//
//   const payload = resp.payload as Pageable<PostWithMeta, number>;
//   list = list.concat(payload.items)
//     .filter((postWithMeta) => {
//       const { post } = postWithMeta;
//       return post.topic === '.imageFile';
//     });
//
//   if (list.length < 40 && payload.next) {
//     return await queryNext(username, payload.next, list);
//   } else {
//     return {
//       items: list,
//       next: payload.next,
//     };
//   }
// }

