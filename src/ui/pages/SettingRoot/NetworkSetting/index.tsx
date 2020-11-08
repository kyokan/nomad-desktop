import React, {ReactElement, ReactNode, useCallback, useEffect, useState} from "react";
import {RouteComponentProps, withRouter} from "react-router-dom";
import {FNDPeer, IPCMessageRequestType, IPCMessageResponse} from "../../../../app/types";
import {postIPCMain} from "../../../helpers/ipc";
import "./network-setting.scss";
import Button from "../../../../../external/universal/components/Button";
import {
  useSetAPIKey,
  useSetBasePath,
  useSetHost, useSetHSDConnectionType,
  useSetPort,
  useStartFND,
  useStartHSD,
  useStopFND, useStopHSD
} from "../../../helpers/hooks";
import {useFNDStatus, useFetchAppData, useAppData} from "../../../ducks/app";
import {INDEXER_API} from "../../../../../external/universal/utils/api";

let watch: any | null;

function NetworkSetting(props: RouteComponentProps): ReactElement {
  const fetchAppData = useFetchAppData();
  const fndStatus = useFNDStatus();
  const saveHost = useSetHost();
  const savePort = useSetPort();
  const saveApiKey = useSetAPIKey();
  const saveBasePath = useSetBasePath();

  const [connectedPeers, setConnectedPeers] = useState<FNDPeer[]>([]);
  const [bannedPeers] = useState<FNDPeer[]>([]);

  const [rpcUrl, setRpcUrl] = useState('');
  const [rpcKey, setRpcKey] = useState('');
  const [port, setPort] = useState(12037);
  const [basePath, setBasePath] = useState('');

  const [dirty, setDirty] = useState(false);

  const [isUpdatingFNDInfo, setUpdatingFNDInfo] = useState(false);
  const [stopped, setNodeStopped] = useState<boolean | null>(null);

  const [discoveredTLDs, setDiscoveredTLDs] = useState<number>(0);
  const [startHeight, setStartHeight] = useState(0);
  const [endHeight, setEndHeight] = useState(0);

  const [defaultRpcUrl, setDefaultRpcUrl] = useState('');
  const [defaultRpcKey, setDefaultRpcKey] = useState('');
  const [defaultPort, setDefaultPort] = useState(0);
  const [defaultBasePath, setDefaultBasePath] = useState('');

  useEffect(() => {
    (async function() {
      if (fndStatus !== 'on' && watch) {
        clearInterval(watch);
        watch = null;
        return;
      }

      if (fndStatus === 'on') {
        if (watch) {
          clearInterval(watch);
        }

        setConnectedPeers(await queryPeers(true, false, false));

        watch = setInterval(async () => {
          setConnectedPeers(await queryPeers(true, false, false));
        }, 15000);
      }
    })()
  }, [fndStatus]);

  const setFNDInfo = useCallback(async () => {
    if (isUpdatingFNDInfo) return;
    setUpdatingFNDInfo(true);

    await saveApiKey(rpcKey);
    await saveHost(rpcUrl);
    await savePort(`${port || ''}`);
    await saveBasePath(basePath);

    setDefaultRpcUrl(rpcUrl);
    setDefaultRpcKey(rpcKey);
    setDefaultBasePath(basePath);
    setDefaultPort(port);

    setUpdatingFNDInfo(false);
    setDirty(false);
  }, [rpcUrl, rpcKey, basePath, port, isUpdatingFNDInfo]);

  useEffect(() => {
    (async function onPeerInfoGroupMount() {
      console.log('hi')
      await fetchAppData();
      const json: IPCMessageResponse<{
        startHeight: number;
        endHeight: number;
      }> = await postIPCMain({
        type: IPCMessageRequestType.GET_FND_INFO,
        payload: null,
      }, true);

      const {payload: conn}: IPCMessageResponse<{
        type: 'P2P' | 'CUSTOM' | '';
        host: string;
        port: number;
        apiKey: string;
        basePath: string;
      }> = await postIPCMain({
        type: IPCMessageRequestType.GET_HSD_CONN,
        payload: null,
      }, true);

      console.log(conn);

      setRpcUrl(conn.host);
      setRpcKey(conn.apiKey);
      setBasePath(conn.basePath);
      setPort(conn.port);

      setDefaultRpcUrl(conn.host);
      setDefaultRpcKey(conn.apiKey);
      setDefaultBasePath(conn.basePath);
      setDefaultPort(conn.port);

      setStartHeight(json.payload.startHeight);
      setEndHeight(json.payload.endHeight);

      const resp = await fetch(`${INDEXER_API}/tlds`);
      const json2 = await resp.json();
      setDiscoveredTLDs(json2?.payload?.length || 0);
    }());
  }, [postIPCMain]);

  return (
    <div className="network-setting">
      <div className="network-setting__groups">
        {renderEditables({
          isConnected: fndStatus === 'on',
          rpcKey: dirty && (rpcKey !== defaultRpcKey) ? rpcKey : defaultRpcKey,
          rpcUrl: dirty && (rpcUrl !== defaultRpcUrl) ? rpcUrl : defaultRpcUrl,
          basePath: dirty && (basePath !== defaultBasePath) ? basePath : defaultBasePath,
          port: dirty && (port !== defaultPort) ? port : defaultPort,
          stopped,
          setRpcKey,
          setRpcUrl,
          setDirty,
          setNodeStopped,
          setPort,
          setBasePath,
        })}
        {renderNetworkInfoGroup(discoveredTLDs, startHeight, endHeight)}
        {renderPeerInfoGroup(connectedPeers, bannedPeers)}
      </div>
      <div className="network-setting__footer">
        <Button
          disabled={!dirty}
          onClick={setFNDInfo}
          loading={isUpdatingFNDInfo}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}

export default withRouter(NetworkSetting);

type EditableOpts = {
  isConnected: boolean;
  port: number;
  setPort: (port: number) => void;
  basePath: string;
  setBasePath: (basePath: string) => void;
  rpcUrl: string;
  setRpcUrl: (rpcUrl: string) => void;
  rpcKey: string;
  setRpcKey: (rpcKey: string) => void;
  stopped: boolean | null;
  setDirty: (dirty: boolean) => void;
  setNodeStopped: (stopped: boolean | null) => void;
}

function renderEditables(opts: EditableOpts): ReactNode {
  const startFND = useStartFND();
  const stopFND = useStopFND();
  const startHSD = useStartHSD();
  const stopHSD = useStopHSD();
  const appData = useAppData();
  const [isHSDLoading, setHSDLoading] = useState(false);

  const isHSDRunning = appData.handshakeConnectionType === 'P2P';

  const restartFND = useCallback(async () => {
    await stopFND();
    setTimeout(startFND, 500);
  }, [startFND, stopFND]);

  return (
    <div className="setting__group network-setting__controls">
      <div className="setting__group__title">General</div>
      <div className="network-setting__network-info-row">
        <div className="network-setting__network-info-row__label">
          Footnote Daemon
        </div>
        <div className="network-setting__network-info-row__value">
          <Button disabled={opts.isConnected} onClick={startFND}>
            Start
          </Button>
          <Button disabled={!opts.isConnected} onClick={stopFND}>
            Stop
          </Button>
          <Button disabled={!opts.isConnected} onClick={restartFND}>
            Restart
          </Button>
        </div>
      </div>
      <div className="network-setting__network-info-row">
        <div className="network-setting__network-info-row__label">
          Handshake Daemon
        </div>
        <div className="network-setting__network-info-row__value">
          <Button
            disabled={isHSDRunning || isHSDLoading}
            onClick={async () => {
              setHSDLoading(true);
              await startHSD();
              setHSDLoading(false);
            }}
          >
            Start
          </Button>
          <Button
            disabled={!isHSDRunning || isHSDLoading}
            onClick={async () => {
              setHSDLoading(true);
              await stopHSD();
              setHSDLoading(false);
            }}
          >
            Stop
          </Button>
          <Button
            disabled={!isHSDRunning || isHSDLoading}
            onClick={async () => {
              setHSDLoading(true);
              await stopHSD();
              await new Promise((r: Function) => setTimeout(r, 3000));
              await startHSD();
              setHSDLoading(false);
            }}
          >
            Restart
          </Button>
        </div>
      </div>
      <div className="network-setting__network-info-row">
        <div className="network-setting__network-info-row__label">
          Handshake RPC Host
        </div>
        <div className="network-setting__network-info-row__value">
          <input
            type="text"
            value={opts.rpcUrl}
            disabled={opts.isConnected || isHSDRunning}
            onChange={e => {
              opts.setRpcUrl(e.target.value);
              opts.setDirty(true);
            }}
          />
        </div>
      </div>
      <div className="network-setting__network-info-row">
        <div className="network-setting__network-info-row__label">
          Handshake RPC API Key (Optional)
        </div>
        <div className="network-setting__network-info-row__value">
          <input
            type="text"
            value={opts.rpcKey}
            disabled={opts.isConnected || isHSDRunning}
            onChange={e => {
              opts.setRpcKey(e.target.value);
              opts.setDirty(true);
            }}
          />
        </div>
      </div>
      <div className="network-setting__network-info-row">
        <div className="network-setting__network-info-row__label">
          Handshake RPC Port (Optional)
        </div>
        <div className="network-setting__network-info-row__value">
          <input
            type="text"
            value={opts.port || ''}
            disabled={opts.isConnected || isHSDRunning}
            onChange={e => {
              opts.setPort(Number(e.target.value));
              opts.setDirty(true);
            }}
          />
        </div>
      </div>
      <div className="network-setting__network-info-row">
        <div className="network-setting__network-info-row__label">
          Handshake RPC Base Path (Optional)
        </div>
        <div className="network-setting__network-info-row__value">
          <input
            type="text"
            value={opts.basePath}
            disabled={opts.isConnected || isHSDRunning}
            onChange={e => {
              opts.setBasePath(e.target.value);
              opts.setDirty(true);
            }}
          />
        </div>
      </div>
    </div>
  )
}

async function queryPeers(includeConnected: boolean, includeStored: boolean, includeBanned: boolean): Promise<FNDPeer[]> {
  let resolved = false;
  return new Promise(async (resolve) => {
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve([]);
      }
    }, 1000);

    const json: IPCMessageResponse<FNDPeer[]> = await postIPCMain({
      type: IPCMessageRequestType.GET_FND_PEERS,
      payload: {
        includeConnected,
        includeStored,
        includeBanned,
      },
    }, true);

    clearTimeout(timeout);

    if (!resolved) {
      resolved = true;
      resolve(json.payload);
    }
  })
}

function formatBytes(bytes: number): string {
  if (bytes / (1024 * 1024) >= 1) {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  }

  return (bytes / 1024).toFixed(2) + ' KB'
}

function renderNetworkInfoGroup(discoveredTLDs: number, startHeight: number, endHeight: number): ReactNode {
  return (
    <div className="setting__group">
      <div className="setting__group__title">Network Info</div>
      <div className="setting__group__content">
        <div className="network-setting__network-info-row">
          <div className="network-setting__network-info-row__label">
            Handshake Blocks Scanned
          </div>
          <div className="network-setting__network-info-row__value">
            {endHeight}
          </div>
        </div>
        <div className="network-setting__network-info-row">
          <div className="network-setting__network-info-row__label">
            Handshake Names Discovered
          </div>
          <div className="network-setting__network-info-row__value">
            {discoveredTLDs}
          </div>
        </div>
      </div>
    </div>
  )
}

function renderPeerInfoGroup(connectedPeers: FNDPeer[], bannedPeers: FNDPeer[]): ReactNode {
  return (
    <div className="setting__group">
      <div className="table network-setting__peers-table">
        <div className="table__header-row">
          <div className="table__cell">Status</div>
          <div className="table__cell">ID</div>
          <div className="table__cell">Address</div>
          <div className="table__cell">Received</div>
          <div className="table__cell">Sent</div>
        </div>
        {connectedPeers
          .sort((a, b) => {
            if (a.peerId < b.peerId) return -1;
            if (a.peerId > b.peerId) return 1;
            return 0;
          })
          .map((peer) => {
            return !peer.isBanned && peer.isConnected && (
              <div
                key={peer.peerId}
                className="table__row"
              >
                <div className="table__cell">
                  <div className="network-setting__peer-status network-setting__peer-status--connected" />
                  <div className="network-setting__peer-status-text network-setting__peer-status-text--connected">
                    Connected
                  </div>
                </div>
                <div className="table__cell">{peer.peerId}</div>
                <div className="table__cell">{peer.ip}</div>
                <div className="table__cell">{formatBytes(peer.rxBytes)}</div>
                <div className="table__cell">{formatBytes(peer.txBytes)}</div>
              </div>
            )
          })
        }
        {bannedPeers
          .sort((a, b) => {
            if (a.peerId < b.peerId) return -1;
            if (a.peerId > b.peerId) return 1;
            return 0;
          })
          .map((peer) => {
            return (
              <div key={peer.peerId} className="table__row network-setting__banned-peer">
                <div className="table__cell">
                  <div className="network-setting__peer-status network-setting__peer-status--banned" />
                  <div className="network-setting__peer-status-text network-setting__peer-status-text--banned">
                    Banned
                  </div>
                </div>
                <div className="table__cell">{peer.peerId}</div>
                <div className="table__cell">{peer.ip}</div>
                <div className="table__cell">{formatBytes(peer.rxBytes)}</div>
                <div className="table__cell">{formatBytes(peer.txBytes)}</div>
              </div>
            )
          })
        }
      </div>
    </div>
  );
}
