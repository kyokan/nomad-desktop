import React, {ReactElement, ReactNode, useCallback, useEffect, useState} from "react";
import {RouteComponentProps, withRouter} from "react-router-dom";
import {FNDPeer, IPCMessageRequestType, IPCMessageResponse} from "../../../../app/types";
import {postIPCMain} from "../../../helpers/ipc";
import "./network-setting.scss";
import Button from "../../../../../external/universal/components/Button";
import {useStartFND, useStopFND} from "../../../helpers/hooks";
import {useFNDStatus, useFetchAppData} from "../../../ducks/app";
import {INDEXER_API} from "../../../../../external/universal/utils/api";

let watch: any | null;

function NetworkSetting(props: RouteComponentProps): ReactElement {
  const fetchAppData = useFetchAppData();
  const ddrpStatus = useFNDStatus();
  const [connectedPeers, setConnectedPeers] = useState<FNDPeer[]>([]);
  const [bannedPeers, setBannedPeers] = useState<FNDPeer[]>([]);

  const [rpcUrl, setRpcUrl] = useState('');
  const [rpcKey, setRpcKey] = useState('');
  const [heartbeatUrl, setHeartbeatUrl] = useState('');
  const [moniker, setMoniker] = useState('Nomad Desktop');
  const [port, setPort] = useState(12037);
  const [basePath, setBasePath] = useState('');

  const [dirty, setDirty] = useState(false);

  const [isUpdatingDDRPInfo, setUpdatingDDRPInfo] = useState(false);
  const [stopped, setNodeStopped] = useState<boolean | null>(null);

  const [discoveredTLDs, setDiscoveredTLDs] = useState<number>(0);
  const [startHeight, setStartHeight] = useState(0);
  const [endHeight, setEndHeight] = useState(0);

  const [defaultRpcUrl, setDefaultRpcUrl] = useState('');
  const [defaultRpcKey, setDefaultRpcKey] = useState('');
  const [defaultHeartbeatUrl, setDefaultHeartbeatUrl] = useState('');
  const [defaultMoniker, setDefaultMoniker] = useState('');
  const [defaultPort, setDefaultPort] = useState(0);
  const [defaultBasePath, setDefaultBasePath] = useState('');

  useEffect(() => {
    (async function() {
      if (ddrpStatus !== 'on' && watch) {
        clearInterval(watch);
        watch = null;
        return;
      }

      if (ddrpStatus === 'on') {
        if (watch) {
          clearInterval(watch);
        }

        setConnectedPeers(await queryPeers(true, false, false));

        watch = setInterval(async () => {
          setConnectedPeers(await queryPeers(true, false, false));
        }, 15000);
      }
    })()
  }, [ddrpStatus]);

  const setDDRPInfo = useCallback(async () => {
    if (isUpdatingDDRPInfo) return;
    setUpdatingDDRPInfo(true);

    await postIPCMain({
      type: IPCMessageRequestType.SET_FND_INFO,
      payload: {
        rpcUrl,
        rpcKey,
        heartbeatUrl,
        moniker,
        basePath,
        port,
      },
    }, true);

    setDefaultRpcUrl(rpcUrl);
    setDefaultRpcKey(rpcKey);
    setDefaultMoniker(moniker);
    setDefaultHeartbeatUrl(heartbeatUrl);
    setDefaultBasePath(basePath);
    setDefaultPort(port);

    setUpdatingDDRPInfo(false);
    setDirty(false);
  }, [rpcUrl, rpcKey, heartbeatUrl, moniker, basePath, port, isUpdatingDDRPInfo]);

  useEffect(() => {
    (async function onPeerInfoGroupMount() {
      await fetchAppData();
      const json: IPCMessageResponse<{
        rpcUrl: string;
        rpcKey: string;
        moniker: string;
        basePath: string;
        heartbeatUrl: string;
        port: number;
        startHeight: number;
        endHeight: number;
      }> = await postIPCMain({
        type: IPCMessageRequestType.GET_FND_INFO,
        payload: null,
      }, true);

      setRpcUrl(json.payload.rpcUrl);
      setRpcKey(json.payload.rpcKey);
      setMoniker(json.payload.moniker);
      setHeartbeatUrl(json.payload.heartbeatUrl);
      setBasePath(json.payload.basePath);
      setPort(json.payload.port);

      setDefaultRpcUrl(json.payload.rpcUrl);
      setDefaultRpcKey(json.payload.rpcKey);
      setDefaultMoniker(json.payload.moniker);
      setDefaultHeartbeatUrl(json.payload.heartbeatUrl);
      setDefaultBasePath(json.payload.basePath);
      setDefaultPort(json.payload.port);

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
          isConnected: ddrpStatus === 'on',
          rpcKey: dirty && (rpcKey !== defaultRpcKey) ? rpcKey : defaultRpcKey,
          rpcUrl: dirty && (rpcUrl !== defaultRpcUrl) ? rpcUrl : defaultRpcUrl,
          heartbeatUrl: dirty && (heartbeatUrl !== defaultHeartbeatUrl) ? heartbeatUrl : defaultHeartbeatUrl,
          moniker: dirty && (moniker !== defaultMoniker) ? moniker : defaultMoniker,
          basePath: dirty && (basePath !== defaultBasePath) ? basePath : defaultBasePath,
          port: dirty && (port !== defaultPort) ? port : defaultPort,
          stopped,
          setHeartbeatUrl,
          setMoniker,
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
          onClick={setDDRPInfo}
          loading={isUpdatingDDRPInfo}
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
  heartbeatUrl: string;
  setHeartbeatUrl: (heartbeatUrl: string) => void;
  moniker: string;
  stopped: boolean | null;
  setMoniker: (moniker: string) => void;
  setDirty: (dirty: boolean) => void;
  setNodeStopped: (stopped: boolean | null) => void;
}

function renderEditables(opts: EditableOpts): ReactNode {
  const startDDRP = useStartFND();
  const stopDDRP = useStopFND();

  const restartDDRP = useCallback(async () => {
    await stopDDRP();
    setTimeout(startDDRP, 500);
  }, [startDDRP, stopDDRP]);

  return (
    <div className="setting__group network-setting__controls">
      <div className="setting__group__title">General</div>
      <div className="network-setting__network-info-row">
        <div className="network-setting__network-info-row__label">
          DDRP Node
        </div>
        <div className="network-setting__network-info-row__value">
          <Button
            disabled={opts.isConnected}
            onClick={startDDRP}
          >
            Start
          </Button>
          <Button
            disabled={!opts.isConnected}
            onClick={stopDDRP}
          >
            Stop
          </Button>
          <Button
            disabled={!opts.isConnected}
            onClick={restartDDRP}
          >
            Restart
          </Button>
        </div>
      </div>
      <div className="network-setting__network-info-row">
        <div className="network-setting__network-info-row__label">
          Handshake RPC API
        </div>
        <div className="network-setting__network-info-row__value">
          <input
            type="text"
            value={opts.rpcUrl}
            disabled={!opts.isConnected}
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
            disabled={!opts.isConnected}
            onChange={e => {
              opts.setRpcKey(e.target.value);
              opts.setDirty(true);
            }}
          />
        </div>
      </div>
      <div className="network-setting__network-info-row">
        <div className="network-setting__network-info-row__label">
          Handshake RPC API Port (Optional)
        </div>
        <div className="network-setting__network-info-row__value">
          <input
            type="text"
            value={opts.port}
            disabled={!opts.isConnected}
            onChange={e => {
              opts.setPort(Number(e.target.value));
              opts.setDirty(true);
            }}
          />
        </div>
      </div>
      <div className="network-setting__network-info-row">
        <div className="network-setting__network-info-row__label">
          Handshake RPC API Base Path (Optional)
        </div>
        <div className="network-setting__network-info-row__value">
          <input
            type="text"
            value={opts.basePath}
            disabled={!opts.isConnected}
            onChange={e => {
              opts.setBasePath(e.target.value);
              opts.setDirty(true);
            }}
          />
        </div>
      </div>
      <div className="network-setting__network-info-row">
        <div className="network-setting__network-info-row__label">
          Allow Heartbeat to DDRPScan
          <div className="network-setting__network-info-row__label__sub">
            This will publicly announce your IP address on DDRPScan
          </div>
        </div>
        <div className="network-setting__network-info-row__value">
          <input
            type="checkbox"
            checked={!!opts.heartbeatUrl}
            disabled={!opts.isConnected}
            onChange={e => {
              opts.setHeartbeatUrl(e.target.checked ? 'https://www.ddrpscan.com/heartbeat' : '');
              opts.setDirty(true);
            }}
          />
        </div>
      </div>
      {
        !!opts.heartbeatUrl && (
          <div className="network-setting__network-info-row">
            <div className="network-setting__network-info-row__label">
              Moniker
              <div className="network-setting__network-info-row__label__sub">
                This will appear as your node's name on DDRPScan
              </div>
            </div>
            <div className="network-setting__network-info-row__value">
              <input
                type="text"
                value={opts.moniker}
                disabled={!opts.isConnected}
                onChange={e => {
                  opts.setMoniker(e.target.value);
                  opts.setDirty(true);
                }}
              />
            </div>
          </div>
        )
      }
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
