import WindowsController from './windows';
import {Envelope as DomainEnvelope} from '../../../external/indexer/domain/Envelope';
import {Connection as DomainConnection} from '../../../external/indexer/domain/Connection';
import {Media as DomainMedia} from '../../../external/indexer/domain/Media';
import {Moderation as DomainModeration, ModerationType} from '../../../external/indexer/domain/Moderation';
import UsersController from './users';
import SignerManager from './signer';
import FavsManager from './favorites';
import BlocklistManager from './blocklist';
import electron, {ipcMain, IpcMainEvent} from 'electron';
import {API_KEY, APP_DATA_EVENT_TYPES, IPCMessageRequest, IPCMessageRequestType, IPCMessageResponse} from '../types';
import {DraftPost} from '../../ui/ducks/drafts/type';
import {mapDraftToDomainPost} from '../util/posts';
import FNDController from './fnd';
import UserDataManager from './userData';
import {decrypt} from "../util/key";
import logger from "../util/logger";
import LocalServer from "./local-server";
import {isSubdomain, isTLD, parseUsername} from "../../ui/helpers/user";
import * as path from "path";
import {resourcesPath} from "../util/paths";
import {
  getAppStatus,
  getHandshakeBlockInfo,
  initializeApp,
  isAppInitialized,
  resetApp,
  writeLastSync
} from "../util/appData";
import {IndexerManager} from "../../../external/nomad-api/src/services/indexer";
import {extendFilter} from "../../../external/nomad-api/src/util/filter";
import {serializeUsername} from "../../../external/universal/utils/user";
import crypto from "crypto";
import HSDService, {HSD_API_KEY} from "./hsd";

const ECKey = require('eckey');
const conv = require('binstring');
const dbPath = path.join(electron.app.getPath('userData'), 'nomad.db');
const namedbPath = path.join(electron.app.getPath('userData'), 'names.db');
const rp = resourcesPath();

export default class AppManager {
  hsdManager: HSDService;
  indexerManager: IndexerManager;
  signerManager: SignerManager;
  windowsController: WindowsController;
  usersController: UsersController;
  userDataManager: UserDataManager;
  fndController: FNDController;
  favsManager: FavsManager;
  blocklistManager: BlocklistManager;
  localServer: LocalServer;

  constructor () {
    this.hsdManager = new HSDService({
      dispatchMain: this.dispatchMain,
    });
    this.indexerManager = new IndexerManager({
      dbPath,
      namedbPath,
      resourcePath: rp,
    });
    this.windowsController = new WindowsController();
    this.usersController = new UsersController({
      dispatchMain: this.dispatchMain,
      dispatchNewPost: this.dispatchNewPost,
    });
    this.favsManager = new FavsManager();
    this.userDataManager = new UserDataManager({
      dispatchMain: this.dispatchMain,
      dispatchSetting: this.dispatchSetting,
      usersController: this.usersController,
    });
    this.blocklistManager = new BlocklistManager({
      dispatchMain: this.dispatchMain,
      dispatchSetting: this.dispatchSetting,
    });
    this.fndController = new FNDController({
      dispatchMain: this.dispatchMain,
      dispatchSetting: this.dispatchSetting,
      dispatchNewPost: this.dispatchNewPost,
      userDataManager: this.userDataManager,
    });
    this.fndController.subscribe(this.onDDRPLogUpdate);
    this.signerManager = new SignerManager({
      usersController: this.usersController,
      fndController: this.fndController,
      indexerManager: this.indexerManager,
      userDataManager: this.userDataManager,
    });
    this.localServer = new LocalServer({
      indexerManager: this.indexerManager,
    });
  }

  onDDRPLogUpdate = (log: string) => {
    this.dispatchSetting({
      type: IPCMessageRequestType.NEW_FND_LOG_ADDED,
      payload: log,
    });

    this.dispatchMain({
      type: IPCMessageRequestType.NEW_FND_LOG_ADDED,
      payload: log,
    });
  };

  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  sendResponse = (ipcEvt: IpcMainEvent, id?: number, payload: any, error?: boolean) => {
    const resp: IPCMessageResponse<any> = {
      id: id || 0,
      payload,
      error: !!error,
    };

    logger.info(`[app manager] Sending response for event #${id}`);

    if (error) {
      logger.error(`[app manager] Error from response #${id} - ${payload}`);
      logger.error(new Error(payload));
    }

    ipcEvt.sender.send(`response-${id}`, resp);
  };

  dispatchMain = (message: IPCMessageRequest<any>) => {
    this.windowsController.main.webContents.send('pushMessage', message);
  };

  dispatchSetting = (message: IPCMessageRequest<any>) => {
    if (this.windowsController.setting) {
      this.windowsController.setting.webContents.send('pushMessage', message);
    }
  };

  dispatchPostViewer = (message: IPCMessageRequest<any>) => {
    if (this.windowsController.postViewer) {
      this.windowsController.postViewer.webContents.send('pushMessage', message);
    }
  };

  dispatchNewPost = (message: IPCMessageRequest<any>) => {
    if (this.windowsController.newPost) {
      this.windowsController.newPost.webContents.send('pushMessage', message);
    }
  };

  handleEvents = (evt: IpcMainEvent, req: IPCMessageRequest<any>) => {
    logger.info(`[app manager] Incoming Event # ${req.id} - ${req.type}`);
    switch (req.type) {
      case IPCMessageRequestType.GET_API_KEY:
        return this.handleRequest(async () => API_KEY, evt, req);
      case APP_DATA_EVENT_TYPES.GET_APP_STATUS:
        return this.handleGetAppStatus(evt, req);
      case APP_DATA_EVENT_TYPES.INITIALIZE_APP:
        return this.handleRequest(initializeApp, evt, req);
      case APP_DATA_EVENT_TYPES.RESET_APP:
        return this.handleRequest(resetApp, evt, req);
      case IPCMessageRequestType.SEND_UPDATE_FOR_CURRENT_USER:
        return this.usersController.getCurrentUser()
          .then(async currentUser => this.fndController.sendUpdate(currentUser)  )
          .then(resp => this.sendResponse(evt, req.id, resp, false))
          .catch(err => this.sendResponse(evt, req.id, err.message, true));
      case IPCMessageRequestType.SEND_UPDATE_FOR_NAME:
        return this.handleRequest(
          this.fndController.sendUpdate.bind(
            this,
            req.payload,
          ),
          evt, req,
        );
      case IPCMessageRequestType.PROXY:
        return this.handleRequest(async () => {
          try {
            const resp = await fetch(req.payload);
            return await resp.json();
          } catch (e) {
            return null;
          }
        }, evt, req);
      case IPCMessageRequestType.FETCH_LINK_PREVIEW:
        return this.handleRequest(async () => {
          const resp = await fetch(req.payload);
          const html = await resp.text();
          return html;
        }, evt, req);
      case IPCMessageRequestType.OPEN_POST_VIEWER_WINDOW:
        return this.windowsController.openPostViewerWindow(req.payload);
      case IPCMessageRequestType.OPEN_NEW_POST_WINDOW:
        return this.windowsController.openNewPostWindow(req.payload);
      case IPCMessageRequestType.OPEN_NEW_USER_WINDOW:
        return this.windowsController.openNewUserWindow();
      case IPCMessageRequestType.SET_POST_VIEWER_HASH:
        return this.dispatchPostViewer({
          type: IPCMessageRequestType.SET_POST_VIEWER_HASH,
          payload: req.payload,
        });
      case IPCMessageRequestType.OPEN_SETTING_WINDOW:
        return this.windowsController.openSettingWindow();
      case IPCMessageRequestType.SCAN_ALL_NAMES:
        return this.handleRequest(async () => {
          await this.indexerManager.streamAllBlobs();
          return await this.indexerManager.scanMetadata();
        }, evt, req);
      case IPCMessageRequestType.BAN_FND_PEER:
        return this.handleRequest(
          this.fndController.banPeer.bind(this, req.payload.peerId, req.payload.durationMS),
          evt, req,
        );
      case IPCMessageRequestType.SET_HSD_API_KEY:
        return this.handleRequest(async () => {
          await this.hsdManager.setAPIKey(req.payload);
          await this.fndController.setAPIKey(req.payload);
        }, evt, req);
      case IPCMessageRequestType.SET_HSD_BASE_PATH:
        return this.handleRequest(async () => {
          await this.hsdManager.setBasePath(req.payload);
          await this.fndController.setBasePath(req.payload);
        }, evt, req);
      case IPCMessageRequestType.SET_HSD_HOST:
        return this.handleRequest(async () => {
          await this.hsdManager.setHost(req.payload);
          await this.fndController.setHost(req.payload);
        }, evt, req);
      case IPCMessageRequestType.SET_HSD_CONN_TYPE:
        return this.handleRequest(async () => {
          await this.hsdManager.setConnectionType(req.payload);
        }, evt, req);
      case IPCMessageRequestType.SET_HSD_PORT:
        return this.handleRequest(async () => {
          await this.hsdManager.setPort(req.payload);
          await this.fndController.setPort(req.payload);
        }, evt, req);
      case IPCMessageRequestType.GET_FND_LOG_LEVEL:
        return this.handleRequest(this.fndController.getLogLevel, evt, req);
      case IPCMessageRequestType.GET_FND_PEERS:
        return this.handleRequest(
          this.fndController.getPeers.bind(
            this,
            req.payload.includeConnected,
            req.payload.includeStored,
            req.payload.includeBanned,
          ),
          evt, req,
        );
      case IPCMessageRequestType.UNBAN_FND_PEER:
        return this.handleRequest(
          this.fndController.unbanPeer.bind(this, req.payload.peerId),
          evt, req,
        );
      case IPCMessageRequestType.SEND_NEW_POST:
        return this.handleSendNewPost(evt, req);
      case IPCMessageRequestType.SEND_NEW_MEDIA:
        return this.handSendNewMedia(evt, req);
      case IPCMessageRequestType.SEND_NEW_REACTION:
        return this.handleReactPost(evt, req);
      case IPCMessageRequestType.FOLLOW_USER:
        return this.handleFollow(evt, req);
      case IPCMessageRequestType.BLOCK_USER:
        return this.handleBlockUser(evt, req);
      case IPCMessageRequestType.GET_POST_BY_HASH:
        return this.handleRequest(
          this.indexerManager.getPostByHash.bind(
            this,
            req.payload.hash,
          ),
          evt, req,
        );
      case IPCMessageRequestType.QUERY_POSTS_WITH_PARENT:
        return this.handleRequest(
          this.indexerManager.getCommentsByHash.bind(
            this,
            req.payload.parent,
            req.payload.order,
            req.payload.start,
          ),
          evt, req,
        );
      case IPCMessageRequestType.QUERY_POPULAR_POSTS:
        return this.handleRequest(
          this.indexerManager.getPosts.bind(
            this,
            // new Date(req.payload.after),
            req.payload.order,
            req.payload.offset,
          ),
          evt, req,
        );
      case IPCMessageRequestType.QUERY_POST_HASHES_FOR_FILTER:
        return this.handleRequest(
          this.indexerManager.getPostsByFilter.bind(
            this,
            req.payload.filter,
            req.payload.order,
            req.payload.offset,
          ),
          evt, req,
        );
      case IPCMessageRequestType.QUERY_POSTS_FOR_NAME:
        return this.handleRequest(
          this.indexerManager.getPostsByFilter.bind(
            this,
            extendFilter({
              postedBy: [req.payload.name],
              allowedTags: [],
            }),
            req.payload.order,
            req.payload.start,
          ),
          evt, req,
        );
      case IPCMessageRequestType.QUERY_LIKES_FOR_NAME:
        return this.handleRequest(
          this.indexerManager.getPostsByFilter.bind(
            this,
            extendFilter({
              likedBy: [serializeUsername(req.payload.subdomain, req.payload.tld)],
            }),
            req.payload.order,
            req.payload.start,
          ),
          evt, req,
        );
      case IPCMessageRequestType.QUERY_FOLLOWINGS_FOR_NAME:
        return this.handleRequest(
          this.indexerManager.getUserFollowings.bind(
            this,
            req.payload.name,
            req.payload.order,
            req.payload.start,
          ),
          evt, req,
        );
      case IPCMessageRequestType.QUERY_BLOCKEE_FOR_NAME:
        return this.handleRequest(
          this.indexerManager.getUserBlocks.bind(
            this,
            req.payload.name,
            req.payload.order,
            req.payload.start,
          ),
          evt, req,
        );
      case IPCMessageRequestType.SET_CURRENT_USER:
        return this.handleSetCurrentUser(evt, req);
      case IPCMessageRequestType.UNSET_CURRENT_USER:
        return this.handleUnsetCurrentUser(evt, req);
      case IPCMessageRequestType.GET_USER_KEYSTORE:
        return this.handleRequest(this.usersController.getUserKeystore.bind(this, req.payload), evt, req);
      case IPCMessageRequestType.GET_IDENTITY:
        return this.handleGetIdentity(evt, req);
      case IPCMessageRequestType.START_HSD:
        return this.handleRequest(async () => {
          await this.hsdManager.setConnectionType('P2P');
          await this.fndController.setPort('12037');
          await this.fndController.setHost('http://127.0.0.1');
          await this.fndController.setBasePath('');
          await this.fndController.setAPIKey(HSD_API_KEY);
          await this.dispatchMain({
            type: IPCMessageRequestType.HSD_CONN_TYPE_UPDATED,
            payload: 'P2P',
          });
          await this.dispatchSetting({
            type: IPCMessageRequestType.HSD_CONN_TYPE_UPDATED,
            payload: 'P2P',
          });
          return await this.hsdManager.start();
        }, evt, req);
      case IPCMessageRequestType.STOP_HSD:
        return this.handleRequest(async () => {
          const conn = await this.hsdManager.getConnection();
          await this.hsdManager.setConnectionType('CUSTOM');
          await this.fndController.setPort(`${conn.port || ''}`);
          await this.fndController.setHost(conn.host);
          await this.fndController.setBasePath(conn.basePath);
          await this.fndController.setAPIKey(conn.apiKey);
          await this.dispatchMain({
            type: IPCMessageRequestType.HSD_CONN_TYPE_UPDATED,
            payload: 'CUSTOM',
          });
          await this.dispatchSetting({
            type: IPCMessageRequestType.HSD_CONN_TYPE_UPDATED,
            payload: 'CUSTOM',
          });
          return await this.hsdManager.stop();
        }, evt, req);
      case IPCMessageRequestType.START_FND:
        return this.handleRequest(this.fndController.startDaemon, evt, req);
      case IPCMessageRequestType.STOP_FND:
        return this.handleRequest(this.fndController.stopDaemon, evt, req);
      case IPCMessageRequestType.GET_HSD_CONN:
        return this.handleRequest(this.hsdManager.getConnection, evt, req);
      case IPCMessageRequestType.GET_FND_INFO:
        return this.handleGetDDRPInfo(evt, req);
      case IPCMessageRequestType.SET_FND_INFO:
        return this.handleSetFNDInfo(evt, req);
      case IPCMessageRequestType.DOWNLOAD_FND_LOG:
        return this.handleRequest(this.fndController.getDDRPLog, evt, req);
      case IPCMessageRequestType.SET_FND_LOG_LEVEL:
        return this.handleRequest(this.fndController.setLogLevel.bind(this, req.payload), evt, req);
      case IPCMessageRequestType.GET_BOOKMARKS:
        return this.handleRequest(
          this.favsManager.getBookmarks.bind(
            this,
            req.payload,
          ),
          evt, req,
        );
      case IPCMessageRequestType.ADD_BOOKMARK:
        return this.handleRequest(
          this.favsManager.addBookmark.bind(
            this,
            req.payload,
          ),
          evt, req,
        );
      case IPCMessageRequestType.REMOVE_BOOKMARK:
        return this.handleRequest(
          this.favsManager.removeBookmark.bind(
            this,
            req.payload,
          ),
          evt, req,
        );
      case IPCMessageRequestType.ADD_TOPIC_TO_FAVORITE:
        return this.handleRequest(
          this.favsManager.addTopic.bind(
            this,
            req.payload,
          ),
          evt, req,
        );
      case IPCMessageRequestType.REMOVE_TOPIC_TO_FAVORITE:
        return this.handleRequest(
          this.favsManager.removeTopic.bind(
            this,
            req.payload,
          ),
          evt, req,
        );
      case IPCMessageRequestType.ADD_USER_TO_FAVORITE:
        return this.handleRequest(
          this.favsManager.addUser.bind(
            this,
            req.payload,
          ),
          evt, req,
        );
      case IPCMessageRequestType.REMOVE_USER_TO_FAVORITE:
        return this.handleRequest(
          this.favsManager.removeUser.bind(
            this,
            req.payload,
          ),
          evt, req,
        );
      case IPCMessageRequestType.GET_FAVORITES:
        return this.handleRequest(async () => {
          return {
            topics: await this.favsManager.getTopics(),
            users: await this.favsManager.getUsers(),
          };
        }, evt, req);
      case IPCMessageRequestType.GET_MUTE_LIST:
        return this.handleRequest(async () => {
          return {
            users: await this.blocklistManager.getUsers(),
          };
        }, evt, req);
      case IPCMessageRequestType.MUTE_USER:
        return this.handleRequest(
          this.blocklistManager.addUser.bind(
            this,
            req.payload,
          ),
          evt, req,
        );
      case IPCMessageRequestType.UNMUTE_USER:
        return this.handleRequest(
          this.blocklistManager.removeUser.bind(
            this,
            req.payload,
          ),
          evt, req,
        );
      case IPCMessageRequestType.GET_USER_DATA:
        return this.handleRequest(this.userDataManager.getUserData.bind(this), evt, req);
      case IPCMessageRequestType.HIDE_POST:
        return this.handleRequest(this.userDataManager.hidePost.bind(this, req.payload), evt, req);
      case IPCMessageRequestType.MUTE_NAME:
        return this.handleRequest(this.userDataManager.muteName.bind(this, req.payload), evt, req);
      case IPCMessageRequestType.SAVE_VIEW:
        return this.handleRequest(this.userDataManager.saveView.bind(this, req.payload), evt, req);
      case IPCMessageRequestType.UNMUTE_NAME:
        return this.handleRequest(this.userDataManager.unmuteName.bind(this, req.payload), evt, req);
      case IPCMessageRequestType.UNHIDE_POST:
        return this.handleRequest(this.userDataManager.unhidePost.bind(this, req.payload), evt, req);
      case IPCMessageRequestType.DELETE_FILTER_BY_INDEX:
        return this.handleRequest(this.userDataManager.deleteFilterByIndex.bind(this, req.payload), evt, req);
      case IPCMessageRequestType.UPDATE_FILTER_BY_INDEX:
        return this.handleRequest(
          this.userDataManager.updateFilterByIndex.bind(
            this,
            req.payload.view,
            req.payload.index,
          ),
          evt, req,
        );
      case IPCMessageRequestType.SUBDOMAIN_LOGIN:
        return this.handleRequest(
          this.usersController.subdomainLogin.bind(
            this,
            req.payload.subdomain,
            req.payload.tld,
            req.payload.password,
          ),
          evt, req,
        );
      case IPCMessageRequestType.ADD_EXISTING_SUBDOMAIN_IDENTITY:
        return this.handleRequest(
          this.usersController.addExistingSubdomainIdentity.bind(
            this,
            req.payload.subdomain,
            req.payload.tld,
            req.payload.password,
          ),
          evt, req,
        );
      case IPCMessageRequestType.ADD_SUBDOMAIN_IDENTITY:
        return this.handleRequest(
          this.usersController.addSubdomainIdentity.bind(
            this,
            req.payload.subdomain,
            req.payload.tld,
            req.payload.email,
            req.payload.password,
          ),
          evt, req,
        );
      case IPCMessageRequestType.ADD_TLD_IDENTITY:
        return this.handleAddTLDIdentity(evt, req);
      default:
        return;
    }
  };

  private handleRequest = async (promise: () => Promise<any>, ipcEvt: IpcMainEvent, e: IPCMessageRequest<any>) => {
    try {
      const resp = await promise();
      this.sendResponse(ipcEvt, e.id, resp);
    } catch (err) {
      this.sendResponse(ipcEvt, e.id, err.message, true);
    }
  };

  private handleSetFNDInfo = async (evt: IpcMainEvent, req: IPCMessageRequest<any>) => {
    try {
      const {
        rpcUrl = '',
        rpcKey = '',
        heartbeatUrl = '',
        moniker = '',
        basePath = '',
        port = 12037,
      } = req.payload;

      const resp = await this.fndController.setFNDInfo(rpcUrl, rpcKey, heartbeatUrl, moniker, basePath, port);
      this.sendResponse(evt, req.id, resp);
    } catch (err) {
      this.sendResponse(evt, req.id, err.message, true);
    }
  };

  private handleGetAppStatus = async (evt: IpcMainEvent, req: IPCMessageRequest<any>) => {
    const {
      initialized,
      handshakeStartHeight,
      handshakeEndHeight,
      lastSync,
    } = await getAppStatus();
    const connType = await this.hsdManager.getConnectionType();
    const syncProgress = await this.hsdManager.getSyncProgress();
    this.sendResponse(evt, req.id, {
      initialized,
      handshakeConnectionType: connType,
      handshakeStartHeight,
      handshakeEndHeight,
      lastSync,
      ddrpStatus: this.fndController.nodeStatus,
      handshakeSyncProgress: syncProgress,
    });
  };

  private handleGetDDRPInfo = async (evt: IpcMainEvent, req: IPCMessageRequest<any>) => {
    try {
      const rpcUrl = await this.fndController.getHost();
      const rpcKey = await this.fndController.getAPIKey();
      const heartbeatUrl = await this.fndController.getHeartbeat();
      const ddrpStatus = await this.fndController.nodeStatus;
      const moniker = await this.fndController.getMoniker();
      const port = await this.fndController.getPort();
      const basePath = await this.fndController.getBasePath();
      const { startHeight, endHeight } = await this.fndController.getHandshakeBlockInfo();

      this.sendResponse(evt, req.id, {
        rpcUrl,
        rpcKey,
        heartbeatUrl,
        moniker,
        startHeight,
        endHeight,
        ddrpStatus,
        port,
        basePath,
      });
    } catch (err) {
      this.sendResponse(evt, req.id, err.message, true);
    }
  };

  private handleGetIdentity(evt: IpcMainEvent, req: IPCMessageRequest<any>) {
    return this.usersController.loadDB()
      .then(() => this.usersController.getCurrentUser())
      .then(currentUser => {
        this.sendResponse(evt, req.id, {
          users: Object.keys(this.usersController.identity),
          currentUser,
        });
      })
      .catch(err => this.sendResponse(evt, req.id, err.message, true));
  }

  private handleFollow(ipcEvt: IpcMainEvent, req: IPCMessageRequest<{ tld: string; subdomain: string | null; truncate?: boolean }>) {
    this.usersController.getCurrentUser()
      .then(async creator => {
        const { tld, subdomain } = parseUsername(creator);
        const networkId = crypto.randomBytes(8).toString('hex');
        return this.signerManager.sendNewPost(
          creator,
          await DomainEnvelope.createWithMessage(
            0,
            tld,
            subdomain || null,
            networkId,
            new DomainConnection(
              0,
              req.payload.tld,
              req.payload.subdomain,
              'FOLLOW',
            ),
          ),
          !!req.payload?.truncate,
        );
      })
      // @ts-ignore
      .then(() => this.sendResponse(
        ipcEvt, req.id,
        new DomainConnection(
          0,
          req.payload.tld,
          req.payload.subdomain,
          'FOLLOW',
        ),
      ))
      .catch(err => this.sendResponse(ipcEvt, req.id, err.message, true));
  }

  private handleBlockUser(ipcEvt: IpcMainEvent, req: IPCMessageRequest<{ tld: string; subdomain: string | null; truncate?: boolean }>) {
    this.usersController.getCurrentUser()
      .then(async creator => {
        const { tld, subdomain } = parseUsername(creator);
        const networkId = crypto.randomBytes(8).toString('hex');
        return this.signerManager.sendNewPost(
          creator,
          await DomainEnvelope.createWithMessage(
            0,
            tld,
            subdomain || null,
            networkId,
            new DomainConnection(
              0,
              req.payload.tld,
              req.payload.subdomain,
              'BLOCK',
            ),
          ),
          !!req.payload?.truncate,
        );
      })
      // @ts-ignore
      .then(() => this.sendResponse(
        ipcEvt, req.id,
        new DomainConnection(
          0,
          req.payload.tld,
          req.payload.subdomain,
          'BLOCK',
        ),
      ))
      .catch(err => this.sendResponse(ipcEvt, req.id, err.message, true));
  }

  private handSendNewMedia(ipcEvt: IpcMainEvent, req: IPCMessageRequest<{ fileName: string; mimeType: string; content: Buffer; truncate?: boolean}>) {
    this.usersController.getCurrentUser()
      .then(async creator => {
        const { tld, subdomain } = parseUsername(creator);
        const networkId = crypto.randomBytes(8).toString('hex');
        return this.signerManager.sendNewPost(
          creator,
          await DomainEnvelope.createWithMessage(
            0,
            tld,
            subdomain || null,
            networkId,
            new DomainMedia(
              0,
              req.payload.fileName,
              req.payload.mimeType,
              req.payload.content,
            ),
          ),
          !!req.payload?.truncate,
        );
      })
      .then((env) => {
        // @ts-ignore
        return this.sendResponse(
          ipcEvt,
          req.id,
          env,
        );
      })
      .catch(err => {
        return this.sendResponse(ipcEvt, req.id, err.message, true);
      });
  }

  private handleReactPost(ipcEvt: IpcMainEvent, req: IPCMessageRequest<{ parent: string; moderationType: ModerationType; truncate?: boolean}>) {
    this.usersController.getCurrentUser()
      .then(async creator => {
        if (req.payload.parent.length <= 32) {
          throw new Error('invalid refhash');
        }
        const { tld, subdomain } = parseUsername(creator);
        const networkId = crypto.randomBytes(8).toString('hex');

        return this.signerManager.sendNewPost(
          creator,
          await DomainEnvelope.createWithMessage(
            0,
            tld,
            subdomain || null,
            networkId,
            new DomainModeration(
              0,
              req.payload.parent,
              req.payload.moderationType || 'LIKE',
            ),
          ),
          !!req.payload?.truncate,
        );
      })
      .then(() => {
        // @ts-ignore
        return this.sendResponse(
          ipcEvt, req.id,
          new DomainModeration(
            0,
            req.payload.parent,
            req.payload.moderationType,
          ),
        );
      })
      .catch(err => {
        return this.sendResponse(ipcEvt, req.id, err.message, true);
      });
  }

  private handleSendNewPost(ipcEvt: IpcMainEvent, req: IPCMessageRequest<{draft: DraftPost; truncate: boolean}>) {
    this.usersController.getCurrentUser()
      .then(async creator => {
        const { tld, subdomain } = parseUsername(creator);
        const networkId = crypto.randomBytes(8).toString('hex');
        return this.signerManager.sendNewPost(
          creator,
          await DomainEnvelope.createWithMessage(
            0,
            tld,
            subdomain || null,
            networkId,
            mapDraftToDomainPost(req.payload?.draft),
          ),
          !!req.payload?.truncate,
        );
      })
      .then((envelop) => {
        return this.sendResponse(ipcEvt, req.id, envelop);
      })
      .catch(err => {
        return this.sendResponse(ipcEvt, req.id, err.message, true);
      });
  }

  private handleAddTLDIdentity = async (evt: IpcMainEvent, req: IPCMessageRequest<{tld: string; privateKey: string; password: string}>) => {
    const { tld, privateKey, password } = req.payload || {};

    if (!tld || !privateKey || !password) {
      return this.sendResponse(evt, req.id, 'payload should have tld, privateKey, and password');
    }

    const resp = await this.usersController.addTLDIdentity(tld, privateKey, password);
    const pkhex = Buffer.from(privateKey, 'base64').toString('hex');
    await this.signerManager.addSignerByHexPrivateKey(pkhex);

    return this.sendResponse(evt, req.id, resp);
  };

  private handleUnsetCurrentUser = async (ipcEvt: IpcMainEvent, req: IPCMessageRequest<any>) => {
    try {
      await this.usersController.unsetCurrentUser();
      await this.signerManager.addSignerByHexPrivateKey('');
      return this.sendResponse(ipcEvt, req.id, null);
    } catch (err) {
      this.sendResponse(ipcEvt, req.id, err.message, true);
    }
  };

  private handleSetCurrentUser = async (ipcEvt: IpcMainEvent, e: IPCMessageRequest<{name: string; password: string}>) => {
    const { name = '', password = '' } = e.payload || {};
    const { tld, subdomain } = parseUsername(name);

    try {
      if (isSubdomain(name) && subdomain) {
        await this.usersController.subdomainLogin(subdomain, tld, password);
        await this.usersController.setCurrentUser(name);
        this.sendResponse(ipcEvt, e.id, { tld, subdomain });
      } else if (isTLD(name)) {
        const cipher = this.usersController.identity[name].encryptedKey || '';
        const pkb64 = decrypt(cipher, password);
        if (!pkb64  || pkb64.length < 44) {
          throw new Error('Invalid password');
        }
        const pk = Buffer.from(pkb64, 'base64').toString('hex');
        await this.usersController.setCurrentUser(name);
        await this.signerManager.addSignerByHexPrivateKey(pk);
        this.sendResponse(ipcEvt, e.id, {
          publicKey: derivePublicKey(pk),
          tld,
          subdomain,
        });
      }
    } catch (err) {
      this.sendResponse(ipcEvt, e.id, err.message, true);
    }
  };

  async init () {
    const initialized = await isAppInitialized();

    await this.hsdManager.init();
    await this.fndController.init();

    const conn = await this.hsdManager.getConnection();
    const type = conn.type;

    this.dispatchMain({
      type: IPCMessageRequestType.HSD_CONN_TYPE_UPDATED,
      payload: type,
    });

    if (type) {
      if (type === 'P2P') {
        await this.fndController.setAPIKey(HSD_API_KEY);
        await this.fndController.setHost('http://127.0.0.1');
        await this.fndController.setBasePath('');
        await this.fndController.setPort('12037');
      } else if (type === 'CUSTOM') {
        await this.fndController.setAPIKey(conn.apiKey);
        await this.fndController.setHost(conn.host);
        await this.fndController.setBasePath(conn.basePath);
        await this.fndController.setPort(`${conn.port}`);
      }

      await this.hsdManager.start()
        .catch(async () =>{
          await this.hsdManager.setConnectionType('CUSTOM');
          await this.fndController.setAPIKey(conn.apiKey);
          await this.fndController.setHost(conn.host);
          await this.fndController.setBasePath(conn.basePath);
          await this.fndController.setPort(`${conn.port}`);
        });
    }

    const { handshakeEndHeight } = await getHandshakeBlockInfo();

    if (initialized || handshakeEndHeight) {
      await this.fndController.startDaemon();
    }

    await this.indexerManager.start();

    await this.usersController.init();
    await this.userDataManager.init();
    await this.signerManager.init();
    await this.favsManager.init();
    await this.blocklistManager.init();
    await this.localServer.init();

    this.fndController.onNameSynced(async (tld) => {
      this.indexerManager.maybeStreamBlob(tld);
      const now = Date.now();
      await writeLastSync(now);
      this.dispatchMain({
        type: APP_DATA_EVENT_TYPES.LAST_SYNC_UPDATED,
        payload: now,
      });
    });

    ipcMain.on('postMessage', this.handleEvents);
  }

  quit () {
    //
  }
}

function derivePublicKey(privateKey: string): string {
  const key = new ECKey(conv(privateKey, {in: 'hex', out: 'buffer'}), true);
  return key.publicKey.toString('hex');
}
