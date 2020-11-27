import React, {ReactElement, useState} from "react";
import './attachments.scss';
import {FullScreenModal} from "../FullScreenModal";
import {getCSSImageURLFromPostHash, getImageURLFromPostHash} from "nomad-universal/lib/utils/posts";

export default function Attachments(props: {attachments: string[]}): ReactElement {
  const {
    attachments,
  } = props;

  if (!attachments.length) {
    return <></>;
  }

  if (attachments.length === 1) {
    return (
      <div className="attachments">
        <Attachment key={attachments[0]} hash={attachments[0]} />
      </div>
    )
  }

  if (attachments.length > 4) {
    return (
      <div className="attachments attachments--multi">
        {
          Array(3)
            .fill(null)
            .map((_, i) => attachments[i])
            .map(hash => <Attachment key={hash} hash={hash} />)
        }
        <div
          className="attachment"
          key={attachments[3]}
          style={{
            backgroundImage: getCSSImageURLFromPostHash(attachments[3]),
          }}
        >
          +{attachments.length - 4}
        </div>
      </div>
    )
  }

  return (
    <div className="attachments attachments--multi">
      {
        Array(4)
          .fill(null)
          .map((_, i) => attachments[i])
          .map(hash => <Attachment key={hash} hash={hash} />)
        })
      }
    </div>
  )
}


function Attachment(props: {hash: string}): ReactElement {
  const [showModal, setModal] = useState(false);
  return (
    <>
      <div
        className="attachment"
        onClick={(e) => {
          e.stopPropagation();
          setModal(true);
        }}
        style={{
          backgroundImage: getCSSImageURLFromPostHash(props.hash),
        }}
      />
      {
        showModal && (
          <FullScreenModal
            onClose={(e) => {
              e.stopPropagation();
              setModal(false);
            }}
          >
            <img
              src={getImageURLFromPostHash(props.hash)}
            />
          </FullScreenModal>
        )
      }
    </>
  )
}
