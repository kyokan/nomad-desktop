import {app} from 'electron';
import path from "path";
import fs from "fs";

const appDataPath = app.getPath('userData');
const initializedPath = path.join(appDataPath, 'initialized');
const handshakeStartHeight = path.join(appDataPath, 'hns_start_height');
const handshakeEndHeight = path.join(appDataPath, 'hns_end_height');
const lastSyncTime = path.join(appDataPath, 'last_sync');

export const isAppInitialized = async (): Promise<boolean> => {
  try {
    await fs.promises.readFile(initializedPath);
    return true;
  } catch (e) {
    return false;
  }
};

export const readLastSync = async (): Promise<number> => {
  try {
    const buf = await fs.promises.readFile(lastSyncTime);
    return Number(buf.toString('utf-8'));
  } catch (e) {
    return 0;
  }
};

export const writeLastSync = async (timestamp: number): Promise<void> => {
  await fs.promises.writeFile(lastSyncTime, String(timestamp));
};

export const getHandshakeBlockInfo = async (): Promise<{ handshakeStartHeight: number, handshakeEndHeight: number}> => {
  try {
    const startBuf = await fs.promises.readFile(handshakeStartHeight);
    const endBuf = await fs.promises.readFile(handshakeEndHeight);
    return {
      handshakeStartHeight: Number(startBuf.toString('utf-8') || 0),
      handshakeEndHeight: Number(endBuf.toString('utf-8') || 0),
    };
  } catch (e) {
    return {
      handshakeStartHeight: 0,
      handshakeEndHeight: 0,
    };
  }
};

export const getAppStatus = async (): Promise<any> => {
  const initialized = await isAppInitialized();
  const { handshakeStartHeight, handshakeEndHeight } = await getHandshakeBlockInfo();
  const lastSync = await readLastSync();
  return {
    initialized,
    handshakeStartHeight,
    handshakeEndHeight,
    lastSync,
  };
};

export const initializeApp = async (): Promise<void> => {
  await fs.promises.writeFile(initializedPath, 'initialized');
};

export const resetApp = async (): Promise<void> => {
  await fs.promises.unlink(initializedPath);
};
