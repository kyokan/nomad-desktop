import {ipcRenderer} from 'electron';
import {IPCMessageRequest, IPCMessageResponse} from "../../app/types";

let ipcId = 0;

export function postIPCMain (event: IPCMessageRequest<any>, hasResponse?: boolean): Promise<any> {
  return new Promise((resolve, reject) => {
    ipcRenderer.send('postMessage', {
      ...event,
      id: ipcId,
    });

    if (hasResponse) {
      ipcRenderer.once(`response-${ipcId}`, (_, resp: IPCMessageResponse<any>) => {
        if (resp.error) {
          reject(new Error(resp.payload));
          return;
        }
        resolve(resp);
      });
    } else {
      resolve();
    }


    ipcId++;
  });
}
