import {PostMeta} from "../../external/universal/ducks/posts";
import crypto from "crypto";

export const API_KEY = crypto.randomBytes(20).toString('hex');

export enum IPCMessageRequestType {
  PLACEHOLDER = 'ipc/placeholder',
  PROXY = 'ipc/proxy',
  GET_API_KEY = 'ipc/GET_API_KEY',
  GET_HSD_CONN = 'ipc/getHSDConnection',
  GET_FND_INFO = 'ipc/getFNDInfo',
  SET_FND_INFO = 'ipc/setFNDInfo',
  SET_POST_VIEWER_HASH = 'ipc/setPostViewHash',
  FETCH_LINK_PREVIEW = 'ipc/fetchLinkPreview',
  OPEN_NEW_POST_WINDOW = 'ipc/openNewPostWindow',
  OPEN_POST_VIEWER_WINDOW = 'ipc/openPostViewerWindow',
  OPEN_NEW_USER_WINDOW = 'ipc/openNewUserWindow',
  OPEN_SETTING_WINDOW = 'ipc/openSettingWindow',
  GET_POST = 'ipc/getPost',
  GET_POST_BY_HASH = 'ipc/getPostByHash',
  QUERY_POSTS = 'ipc/queryPosts',
  SEND_NEW_POST = 'ipc/sendNewPost',
  SEND_NEW_MEDIA = 'ipc/sendNewMedia',
  SEND_NEW_REACTION = 'ipc/sendNewReaction',
  FOLLOW_USER = 'ipc/followUser',
  NEW_POST_UPDATE = 'ipc/newPostUpdate', // Main -> Renderer
  QUERY_POSTS_WITH_PARENT = 'ipc/queryPostsWithParent',
  QUERY_POSTS_FOR_NAME = 'ipc/getPostsForName',
  QUERY_POST_HASHES_FOR_FILTER = 'ipc/getPostHashsForFilter',
  QUERY_POPULAR_POSTS = 'ipc/getPopularTopLevelPostsAfter',
  QUERY_LIKES_FOR_NAME = 'ipc/getLikesForName',
  QUERY_FOLLOWINGS_FOR_NAME = 'ipc/queryFollowingsForName',
  START_AUTO_SCAN = 'ipc/startAutoScan',
  STOP_AUTO_SCAN = 'ipc/stopAutoScan',
  SCAN_ALL_NAMES = 'ipc/scanAllNames',
  GET_GLOBAL_META = 'ipc/getGlobalMeta',
  SET_CURRENT_USER = 'ipc/setCurrentUser',
  UNSET_CURRENT_USER = 'ipc/unsetCurrentUser',
  GET_IDENTITY = 'ipc/getIdentity',
  NEW_INDEXER_LOG_ENTRY = 'ipc/newIndexerLogEntry',
  GET_USER_KEYSTORE = 'ipc/getUserKeystore',
  START_HSD = 'ipc/startHSD',
  STOP_HSD = 'ipc/stopHSD',
  SET_HSD_HOST = 'ipc/setHSDHost',
  SET_HSD_PORT = 'ipc/setHSDPort',
  SET_HSD_API_KEY = 'ipc/setHSDAPIKey',
  SET_HSD_BASE_PATH = 'ipc/setHSDBasePath',
  SET_HSD_CONN_TYPE = 'ipc/SET_HSD_CONN_TYPE',
  HSD_CONN_TYPE_UPDATED = 'ipc/HSD_CONN_TYPE_UPDATED',
  START_FND = 'ipc/startFND',
  STOP_FND = 'ipc/stopFND',
  SET_FND_LOG_LEVEL = 'ipc/setFNDLogLevel',
  GET_FND_LOG_LEVEL = 'ipc/getFNDLogLevel',
  DOWNLOAD_FND_LOG = 'ipc/downloadFNDLog',
  GET_FND_STATUS = 'ipc/getFNDStatus',
  NEW_FND_LOG_ADDED = 'ipc/newFNDLogAdded', // Main -> Renderer
  GET_FND_PEERS = 'ipc/getFNDPeers',
  BAN_FND_PEER = 'ipc/banFNDPeer',
  UNBAN_FND_PEER = 'ipc/unbanFNDPeer',
  GET_FAVORITES = 'ipc/getFavorites',
  GET_BOOKMARKS = 'ipc/getBookmarks',
  ADD_BOOKMARK = 'ipc/addBookmark',
  REMOVE_BOOKMARK = 'ipc/removeBookmark',
  ADD_TOPIC_TO_FAVORITE = 'ipc/addTopicToFavorite',
  REMOVE_TOPIC_TO_FAVORITE = 'ipc/removeTopicToFavorite',
  ADD_USER_TO_FAVORITE = 'ipc/addUserToFavorite',
  REMOVE_USER_TO_FAVORITE = 'ipc/removeUserToFavorite',
  // Block list
  GET_MUTE_LIST = 'ipc/getBlockList',
  MUTE_USER = 'ipc/blockUser',
  UNMUTE_USER = 'ipc/unblockUser',
  MUTE_USER_UPDATED = 'ipc/blockUserUpdated', // Main -> Renderer
  // User Data
  GET_USER_DATA = 'ipc/getUserData',
  MUTE_NAME = 'ipc/muteName',
  HIDE_POST = 'ipc/hidePost',
  SAVE_VIEW = 'ipc/saveView',
  UNMUTE_NAME = 'ipc/unmuteName',
  UNHIDE_POST = 'ipc/unhidePost',
  UPDATE_FILTER_BY_INDEX = 'ipc/updateFilterByIndex',
  DELETE_FILTER_BY_INDEX = 'ipc/deleteFilterByIndex',

  SEND_UPDATE_FOR_NAME = 'ipc/sendUpdateForName',
  SEND_UPDATE_FOR_CURRENT_USER = 'ipc/sendUpdateForCurrentUser',
  LAST_FLUSHED_UPDATED = 'ipc/lastFlushedUpdated',
  UPDATE_QUEUE_UPDATED = 'ipc/updateQueueUpdated',

  ADD_TLD_IDENTITY = 'ipc/userManager/addTLDIdentity',
  ADD_SUBDOMAIN_IDENTITY = 'ipc/userManager/addSubdomainIdentity',
  ADD_EXISTING_SUBDOMAIN_IDENTITY = 'ipc/userManager/addExistingSubdomainIdentity',
  SUBDOMAIN_LOGIN = 'ipc/userManager/subdomainLogin',
  CURRENT_IDENTITY_CHANGED = 'ipc/userManager/currentIdentityChanged',
  NEW_USER_ADDED = 'ipc/newUserAdded', // Main -> Renderer

  BLOCK_USER = 'ipc/indexerManager/blockUser',
  QUERY_BLOCKEE_FOR_NAME = 'ipc/indexerManager/queryBlockeeForName',
}

export enum APP_DATA_EVENT_TYPES {
  GET_APP_STATUS = `ipc/appData/getAppStatus`,
  INITIALIZE_APP = `ipc/appData/initializeApp`,
  RESET_APP = `ipc/appData/resetApp`,
  SET_HSD_SYNC_PROGRESS = `ipc/appData/setHSDSyncProgress`,
  START_HEIGHT_UPDATED = `ipc/appData/startHeightUpdated`,
  END_HEIGHT_UPDATED = `ipc/appData/endHeightUpdated`,
  LAST_SYNC_UPDATED = 'ipc/appData/lastSyncUpdated',
  INITIALIZED_UPDATED = 'ipc/appData/initializedUpdated',
}

export enum FND_EVENT_TYPES {
  NODE_STATUS_CHANGED = 'ipc/fnd/nodeStatusChanged',
}

export type IPCMessageRequest<payload> = {
  id?: number;
  type: IPCMessageRequestType | APP_DATA_EVENT_TYPES | FND_EVENT_TYPES;
  payload: payload;
  error?: boolean;
  meta?: any;
}

export type IPCMessageResponse<payload> = {
  id: number;
  payload: payload;
  error?: boolean;
}

export type ResponsePost = {
  hash: string;
  name: string;
  timestamp: Date;
  parent: string;
  context: string;
  content: string;
  topic: string;
  tags: string[];
  meta: PostMeta;
  title: string;
};

export const DEFAULT_FLUSH_TIMEOUT = (15 * 1000);

/**
 * {"id":1,"subdomain":"jchan6","tld":"nomadsub.","email":"test6@test.com","public_key":"","created_at":"2020-03-02T17:12:17.386019Z","updated_at":"2020-03-02T17:12:17.386019Z"}
 */
export type RelayerSignupResponse = {
  id: number;
  subdomain: string;
  tld: string;
  email: string;
  public_key: string;
  created_at: string;
  updated_at: string;
  message?: string;
}

/**
 * {"expiry":1583284340,"token":"02d3ffc0d0aba25183e10f55fb744152e3de08c78038746be8e03d20804a88c4"}
 */
export type RelayerLoginResponse = {
  expiry: string;
  token: string;
  message?: string;
}

/**
 * {
 *    "content":"hello, world",
 *    "guid":"75abc951-4eac-4781-b0e2-80cd8ea527ca",
 *    "refhash":"2d5917f0cb7ededd467705ce568fa41fbec5c1a4dc581bceb20f57b0df17278c",
 *    "subdomain":"jchan6",
 *    "tags":[],
 *    "timestamp":1583184076,
 *    "tld":"nomadsub."
 * }
 */
export type RelayerNewPostResponse = {
  message?: string;
  network_id: string;
  refhash: string;
  username: string;
  tld: string;
  timestamp: number;
  reference: string;
  body: string;
  topic: string;
  tags: string[];
}

/**
 * {
 *    "guid":"19f9b860-9023-4f1a-95d1-86e44565d475",
 *    "parent":"2d5917f0cb7ededd467705ce568fa41fbec5c1a4dc581bceb20f57b0df17278c",
 *    "refhash":"bf997c0d42a678c753bb03dba0daaf1abcb0c4093e1cae4e8e51a06a35688c91",
 *    "subdomain":"asdf2",
 *    "timestamp":1583197361,
 *    "tld":"nomadsub."
 * }
 */
export type RelayerNewReactionResponse = {
  message?: string;
  id: number;
  network_id: string;
  refhash: string;
  username: string;
  tld: string;
  timestamp: number;
  reference: string;
  type: 'LIKE' | 'PIN';
}

export type RelayerNewFollowResponse = {
  message?: string;
  id: number;
  network_id: string;
  refhash: string;
  username: string;
  tld: string;
  timestamp: number;
  connectee_tld: string;
  connectee_subdomain: string;
  type: 'FOLLOW';
}

export type RelayerNewBlockResponse = {
  message?: string;
  id: number;
  network_id: string;
  refhash: string;
  username: string;
  tld: string;
  timestamp: number;
  connectee_tld: string;
  connectee_subdomain: string;
  type: 'BLOCK';
}

export type FNDPeer = {
  ip: string;
  isBanned: boolean;
  isConnected: boolean;
  peerId: string;
  rxBytes: number;
  txBytes: number;
}
