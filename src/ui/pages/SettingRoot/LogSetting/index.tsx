import React, {ChangeEvent, ReactElement, useCallback, useEffect, useState} from "react";
import {RouteComponentProps, withRouter} from "react-router-dom";
import "./log-setting.scss";
import {ipcRenderer} from "electron";
import {IPCMessageRequest, IPCMessageRequestType} from "../../../../app/types";
import {postIPCMain} from "../../../helpers/ipc";
import Button from "../../../../../external/universal/components/Button";

const LOGS_CACHE: string[] = [];
let listened = false;


function LogSetting(props: RouteComponentProps): ReactElement {
  const [logLevel, setLogLevel] = useState<'info' | 'trace' | ''>('');
  const [logs, setLogs] = useState<string[]>([]);

  const appendLog = useCallback(() => {
    setLogs(LOGS_CACHE.slice(-200));
  }, []);

  useEffect(() => {
    (async function onLogSettingMount() {
      const json = await postIPCMain({
        type: IPCMessageRequestType.GET_FND_LOG_LEVEL,
        payload: null,
      }, true);

      setLogLevel(json.payload);
    })();
  }, []);

  useEffect(() => {
    (async function onLogSettingMount() {
      appendLog();
      ipcRenderer.on('pushMessage', (_: any, message: IPCMessageRequest<any>) => {
        if (IPCMessageRequestType.NEW_FND_LOG_ADDED && !message.error) {
          appendLog();
        }
      });
      if (listened) return;
      ipcRenderer.on('pushMessage', (_: any, message: IPCMessageRequest<any>) => {
        if (IPCMessageRequestType.NEW_FND_LOG_ADDED && !message.error) {
          LOGS_CACHE.push(message.payload);
        }
      });
      listened = true;
    })();
  }, [appendLog]);

  const toggleVerbose = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;

    await postIPCMain({
      type: IPCMessageRequestType.SET_FND_LOG_LEVEL,
      payload: checked ? 'trace' : 'info',
    }, true);

    setLogLevel(checked ? 'trace' : 'info');

    await postIPCMain({
      type: IPCMessageRequestType.STOP_FND,
      payload: null,
    }, true);

    setTimeout(async () => {
      await postIPCMain({
        type: IPCMessageRequestType.START_FND,
        payload: null,
      }, true)
    }, 50);
  }, [postIPCMain]);


  const downloadLog = useCallback(async () => {
    const json = await postIPCMain({
      type: IPCMessageRequestType.DOWNLOAD_FND_LOG,
      payload: null,
    }, true);
    download('nomad.log', 'text/log', json.payload.toString('utf-8'));
  }, [postIPCMain]);

  return (
    <div className="log-setting">
      <div className="setting__group">
        <div className="setting__group__title">Logs</div>
        <div className="log-setting__row">
          <div className="log-setting__row__label">
            Debug mode
            <div className="log-setting__row__label__sub">
              This will set log level to trace
            </div>
          </div>
          <div className="log-setting__row__value">
            { !!logLevel && (
              <input
                type="checkbox"
                onChange={toggleVerbose}
                defaultChecked={logLevel === 'trace'}
              />
            )}
          </div>
        </div>
        <div className="log-setting__row">
          <div className="log-setting__row__label">
            Download Log
          </div>
          <div className="log-setting__row__value">
            <Button onClick={downloadLog}>Download Log</Button>
          </div>
        </div>
      </div>
      <div className="log-setting__log-viewer">
        {logs.reverse().map(log => {
          return <div key={log} className="log-setting__log-viewer__log">{log}</div>
        })}
      </div>
    </div>
  );
}

export default withRouter(LogSetting);

function download(filename: string, fileType: string, text: string) {
  const blob = new Blob([text], { type: fileType });

  const a = document.createElement('a');
  a.download = filename;
  a.href = URL.createObjectURL(blob);
  a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 1500);
}
