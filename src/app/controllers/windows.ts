import {BrowserWindow} from 'electron';
import {joinAppRootPath} from '../util/paths';

const isDev = process.env.NODE_ENV === 'development';

export default class WindowsController {
  main: BrowserWindow;
  newPost?: BrowserWindow;
  newUser?: BrowserWindow;
  setting?: BrowserWindow;
  postViewer?: BrowserWindow;

  constructor () {
    this.main = createWindow('index.html', 1024, 768, isDev);
  }

  openNewPostWindow (opts: { previewUrl: string }) {
    if (!this.newPost) {
      this.newPost = createWindow(`new_post.html`, 600, 600, isDev);
      this.newPost.on('closed', () => {
        this.newPost = undefined;
      });
    } else {
      this.newPost.focus();
    }
  }

  openNewUserWindow () {
    if (!this.newUser) {
      this.newUser = createWindow('new_user.html', 500, 530, isDev);
      this.newUser.on('closed', () => {
        this.newUser = undefined;
      });
    } else {
      this.newUser.focus();
    }
  }

  openSettingWindow () {
    if (!this.setting) {
      this.setting = createWindow('setting.html', 900, 680, isDev);
      this.setting.on('closed', () => {
        this.setting = undefined;
      });
    } else {
      this.setting.focus();
    }
  }

  openPostViewerWindow (opts: {postHash: string; creator: string; id: string}) {
    if (!this.postViewer) {
      this.postViewer = createWindow(`post_viewer.html`, 600, 680, isDev);
      this.postViewer.on('focus', () => {
        if (this.postViewer)
        this.postViewer.webContents.executeJavaScript(`
          document.body.className = "focus";
          window.JSON_GLOBAL = {
            postHash: "${opts.postHash}"
          };
        `);
      });
      this.postViewer.on('closed', () => {
        this.postViewer = undefined;
      });
      this.postViewer.focus();
    } else {
      this.postViewer.focus();
    }
  }
}

function createWindow (url: string, width = 800, height = 600, openDevTools?: boolean): BrowserWindow {
  // Create the browser window.
  const window = new BrowserWindow({
    width,
    height,
    // titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true,
    },
  });

  // if (process.env.NODE_ENV === 'development') {
  //   // and load the index.dev.html of the app.tsx.
  //   window.loadURL(`http://localhost:8080/${url}`);
  // } else {
    window.loadFile(joinAppRootPath(url));
  // }

  // Open the DevTools.
  if (openDevTools) {
    window.webContents.openDevTools();
  }

  window.on('focus', () => {
    window.webContents.executeJavaScript(`document.body.className = "focus";`);

  });
  window.on('blur', () => {
    window.webContents.executeJavaScript(`document.body.className = "blur";`);
  });

  return window;
};
