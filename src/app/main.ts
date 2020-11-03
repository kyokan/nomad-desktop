require('isomorphic-fetch');

import { app, dialog } from 'electron';
import AppManager from './controllers/app';

// Disable error dialogs by overriding
// FIX: https://goo.gl/YsDdsS
dialog.showErrorBox = function(title, content) {
    console.log(`${title}\n${content}`);
};

let appManager: AppManager;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    // eslint-disable-line global-require
    closeApp();
    app.quit();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', initApp);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        closeApp();
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app.tsx when the
    // dock icon is clicked and there are no other windows open.
    if (!appManager) {
        initApp();
    }
});

function initApp() {
    try {
        appManager =  new AppManager();
        appManager.init()
          .catch(e => console.log(e));
    } catch (e) {
        console.log(e);
    }
}

function closeApp() {
    if (appManager) {
        appManager.quit();
    }
}
