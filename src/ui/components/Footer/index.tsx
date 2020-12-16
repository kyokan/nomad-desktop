import React, {ReactElement, ReactNode, useCallback, useState} from "react";
import c from "classnames";
import "./footer.scss";
import {useAppData, useFNDStatus, useHandshakeEndHeight, useHandshakeStartHeight, useLastSync} from "../../ducks/app";
import moment from "moment";
import Icon from "nomad-universal/lib/components/Icon";
import {postIPCMain} from "../../helpers/ipc";
import {IPCMessageRequestType} from "../../../app/types";

export default function Footer(props: {showingFallback: boolean}): ReactElement {
  return (
    <div className="footer">
      <div className="footer__message">
        {renderFooterStatus(props.showingFallback)}
      </div>
    </div>
  );
}

function renderFooterStatus(showingFallback: boolean): ReactNode {
  // const connectedPeers = useConnectedPeers();
  const lastSync = useLastSync();
  const startHeight = useHandshakeStartHeight();
  const endHeight = useHandshakeEndHeight();
  const ddrpStatus = useFNDStatus();
  const appData = useAppData();
  const isHSDRunning = appData.handshakeConnectionType === 'P2P';

  let displayText = '';

  if (ddrpStatus === 'on') {
    displayText = 'Connected';
  }

  if (ddrpStatus === 'on' && lastSync) {
    displayText = `Last synchronized ${moment(lastSync).fromNow()}`;
  }

  if (ddrpStatus === 'on' && (startHeight < endHeight)) {
    displayText = `Processing name records (${((startHeight/endHeight) * 100).toFixed(2)}%)...`
  }

  if (ddrpStatus === 'off') {
    displayText = '';
  }

  if (isHSDRunning && appData.handshakeSyncProgress < 1) {
    displayText = `Synchronizing with Handshake (${((appData.handshakeSyncProgress) * 100).toFixed(2)}%)...`;
  }

  // if (ddrpStatus === 'on' && !endHeight) {
  //   displayText = `Fetching Handshake info...`;
  // }
  const [loading, setLoading] = useState(false);
  const scan = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    await postIPCMain({
      type: IPCMessageRequestType.SEND_UPDATE_FOR_CURRENT_USER,
      payload: {},
    }, true);
    await postIPCMain({
      type: IPCMessageRequestType.SCAN_ALL_NAMES,
      payload: null,
    }, true);
    setLoading(false);
  }, [loading]);

  return (
    <>
      <div
        className={c('footer__message__status', {
          'footer__message__status--green': ddrpStatus === 'on',
          'footer__message__status--yellow': showingFallback
            || (isHSDRunning && appData.handshakeSyncProgress < 1)
            || (startHeight < endHeight || !endHeight) && ddrpStatus === 'on',
        })}
      />
      <div
        className={c('footer__message__text', {
        })}
      >
        {displayText}
      </div>
      <div
        className="footer__message__fallback-api"
      >
        {
          showingFallback
            ? 'Connected via https://api.nmd.co'
            : loading ? <div className="loader" /> : (
              <Icon
                material="refresh"
                width={16}
                onClick={scan}
              />
            )
        }
      </div>
    </>
  )
}

// time="2020-02-21T21:16:32-08:00" level=info msg="gossipped message" count=4 message_type=Update module=peer-manager
// time="2020-02-21T21:16:32-08:00" level=info msg="committed blob" module=rpc-server name=hikingallday. recipient_count=0

/**
 * time="2020-02-21T19:03:28-08:00" level=info msg="synced name" module=name-syncer name=zzzzzz. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:27-08:00" level=info msg="synced name" module=name-syncer name=zzlain. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:27-08:00" level=info msg="synced name" module=name-syncer name=zz. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:27-08:00" level=info msg="synced name" module=name-syncer name=zwitter. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:27-08:00" level=info msg="synced name" module=name-syncer name=zombocom. nil_count=0 receipt_count=4
 time="2020-02-21T19:03:26-08:00" level=info msg="synced name" module=name-syncer name=zombo2. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:26-08:00" level=info msg="synced name" module=name-syncer name=zhugeliang2. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:26-08:00" level=info msg="synced name" module=name-syncer name=zhugeliang02. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:26-08:00" level=info msg="synced name" module=name-syncer name=zhugeliang. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:25-08:00" level=info msg="synced name" module=name-syncer name=zhuge4. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:25-08:00" level=info msg="synced name" module=name-syncer name=zhuge3. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:25-08:00" level=info msg="synced name" module=name-syncer name=z. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:25-08:00" level=info msg="synced name" module=name-syncer name=y. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:25-08:00" level=info msg="synced name" module=name-syncer name=whogonnastopme. nil_count=0 receipt_count=4
 time="2020-02-21T19:03:24-08:00" level=info msg="synced name" module=name-syncer name=whatwouldgowrog. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:24-08:00" level=info msg="synced name" module=name-syncer name=webpack. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:24-08:00" level=info msg="synced name" module=name-syncer name=u_matter_to_someone. nil_count=0 receipt_count=4
 time="2020-02-21T19:03:23-08:00" level=info msg="synced name" module=name-syncer name=tonystark. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:22-08:00" level=info msg="synced name" module=name-syncer name=test5. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:22-08:00" level=info msg="synced name" module=name-syncer name=test1. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:21-08:00" level=info msg="synced name" module=name-syncer name=taytayswift. nil_count=0 receipt_count=4
 time="2020-02-21T19:03:20-08:00" level=info msg="synced name" module=name-syncer name=shadypool. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:20-08:00" level=info msg="synced name" module=name-syncer name=sdtsui23. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:20-08:00" level=info msg="synced name" module=name-syncer name=sdtsui. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:20-08:00" level=info msg="synced name" module=name-syncer name=reinhardt. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:19-08:00" level=info msg="synced name" module=name-syncer name=redux. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:19-08:00" level=info msg="synced name" module=name-syncer name=realslimshady. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:19-08:00" level=info msg="synced name" module=name-syncer name=realdonaldtrump. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:19-08:00" level=info msg="synced name" module=name-syncer name=reactjs. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:19-08:00" level=info msg="synced name" module=name-syncer name=panicweb. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:19-08:00" level=info msg="synced name" module=name-syncer name=panicrabbit. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:18-08:00" level=info msg="synced name" module=name-syncer name=oingoboingo. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:18-08:00" level=info msg="synced name" module=name-syncer name=neverstopfidgeting. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:18-08:00" level=info msg="synced name" module=name-syncer name=magnacarta. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:18-08:00" level=info msg="synced name" module=name-syncer name=lol. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:18-08:00" level=info msg="synced name" module=name-syncer name=linux-testing. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:18-08:00" level=info msg="synced name" module=name-syncer name=kyo. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:17-08:00" level=info msg="synced name" module=name-syncer name=kingjames. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:17-08:00" level=info msg="synced name" module=name-syncer name=kamina. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:17-08:00" level=info msg="synced name" module=name-syncer name=jimmypeebles. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:17-08:00" level=info msg="synced name" module=name-syncer name=jchan2. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:17-08:00" level=info msg="synced name" module=name-syncer name=jchan. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:17-08:00" level=info msg="synced name" module=name-syncer name=jay-zzz. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:16-08:00" level=info msg="synced name" module=name-syncer name=ihategelatine. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:16-08:00" level=info msg="synced name" module=name-syncer name=hug. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:16-08:00" level=info msg="synced name" module=name-syncer name=hikingallday. nil_count=0 receipt_count=4
 time="2020-02-21T19:03:15-08:00" level=info msg="synced name" module=name-syncer name=gugod. nil_count=0 receipt_count=4
 time="2020-02-21T19:03:14-08:00" level=info msg="synced name" module=name-syncer name=electron. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:14-08:00" level=info msg="synced name" module=name-syncer name=ddrpitest3. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:14-08:00" level=info msg="synced name" module=name-syncer name=ddrpitest2. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:14-08:00" level=info msg="synced name" module=name-syncer name=ddrpitest1. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:14-08:00" level=info msg="synced name" module=name-syncer name=dan. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:13-08:00" level=info msg="synced name" module=name-syncer name=d4n. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:13-08:00" level=info msg="synced name" module=name-syncer name=d. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:13-08:00" level=info msg="synced name" module=name-syncer name=ckc. nil_count=0 receipt_count=4
 time="2020-02-21T19:03:12-08:00" level=info msg="synced name" module=name-syncer name=camino. nil_count=0 receipt_count=4
 time="2020-02-21T19:03:11-08:00" level=info msg="synced name" module=name-syncer name=bud. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:11-08:00" level=info msg="synced name" module=name-syncer name=bojanglestheclown. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:11-08:00" level=info msg="synced name" module=name-syncer name=bingobongo. nil_count=0 receipt_count=4
 time="2020-02-21T19:03:10-08:00" level=info msg="synced name" module=name-syncer name=australisinnovative. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:10-08:00" level=info msg="synced name" module=name-syncer name=arlo-e31. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:10-08:00" level=info msg="synced name" module=name-syncer name=151515. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:10-08:00" level=info msg="synced name" module=name-syncer name=14325. nil_count=4 receipt_count=0
 time="2020-02-21T19:03:09-08:00" level=info msg="refilling peers" have=4 module=peer-manager want=8
 * time="2020-02-21T19:02:40-08:00" level=info msg="added new peer" direction=Outgoing module=peer-manager peer_id=ad5cbf4de64d90587b4b625d49cccd6bdcde1f63dcc7330d70d2c087123f359d remote_addr="167.99.83.192:9097"
 time="2020-02-21T19:02:40-08:00" level=info msg="added new peer" direction=Outgoing module=peer-manager peer_id=0148c853559e71e10a47144757eba7c5de81a0218fba46726b172dac9d604474 remote_addr="159.65.33.155:9097"
 time="2020-02-21T19:02:39-08:00" level=info msg="added new peer" direction=Outgoing module=peer-manager peer_id=afc217c3e2dddb2ff988af13f3c03a946a801e582e517ef874245c9e28cf4419 remote_addr="192.241.214.251:9097"
 time="2020-02-21T19:02:39-08:00" level=info msg="added new peer" direction=Outgoing module=peer-manager peer_id=d92df3d0d6d678607935f680c66e38ec2c8286368babad5c8073276d05cd59bd remote_addr="192.241.218.147:9097"
 time="2020-02-21T19:02:39-08:00" level=info msg="created new centralized resolver" host="104.248.106.150:8080" module=centralized-resolver
 time="2020-02-21T19:02:39-08:00" level=info msg="starting peer manager" module=peer-manager peer_id=62649aecfd71bbce2789484100a7164a84d13fc21a3e7785d423d358623894df
 time="2020-02-21T19:02:39-08:00" level=info msg="discovered external IP" external_ip=73.93.36.228 internet_visible=false module=main
 time="2020-02-21T19:02:39-08:00" level=info msg="starting fnd" git_commit=ada879ff566f0b16b6c6b0a8dec3062f7f1ebba2 module=main
 * @param text
 */
function getModuleFromLog(text: string) {
  try {
    // @ts-ignore
    return text.match(/module=(["a-zA-Z0-9\-"]+)/)[1];
  } catch (e) {
    return '';
  }
}

function getPeersFromLog(text: string) {
  try {
    // @ts-ignore
    return text.match(/have=([0-9]+)/g)[0].split('=')[1];
  } catch (e) {
    return '';
  }
}

function getMsgFromLog(text: string) {
  try {
    // @ts-ignore
    return text.match(/msg=("[a-zA-Z 0-9]+)/)[1];
  } catch (e) {
    return '';
  }
}

function getNameFromLog(text: string) {
  try {
    // @ts-ignore
    return text.match(/name=([a-zA-Z0-9]+)/)[1];
  } catch (e) {
    return '';
  }
}
