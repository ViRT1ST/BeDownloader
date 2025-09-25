import { app, BrowserWindow, ipcMain, dialog } from 'electron';

import {
  userState,
  createUserFilesIfTheyDontExist,
  loadUserSettingsFromFile,
  saveUserSettingsToFile
} from './states/user.js';

import { electronSettings, pathToIndexHtml } from './configs/electron.js';
import { appState } from './states/app.js';
import { launchProcessingTask  } from './download-pw.js';
import { closeBrowser } from './utils.js';

/* =============================================================
First actions on app start
============================================================= */

createUserFilesIfTheyDontExist();
loadUserSettingsFromFile();
saveUserSettingsToFile();

/* =============================================================
Electron | Create window
============================================================= */

function createElectronWindow() {
  appState.electronWindow = new BrowserWindow(electronSettings);
  appState.electronWindow.loadFile(pathToIndexHtml);
  appState.electronWindow.on('closed', () => { appState.electronWindow = null; });
}

/* =============================================================
Electron | Internal events
============================================================= */

// Invokes after app initialization
app.on('ready', () => {
  createElectronWindow();
});

// Invokes when app is closing
app.on('window-all-closed', () => {
  if (!userState.isMac) {
    app.quit();
  }
});

// Invokes when app becomes active
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createElectronWindow();
  }
});

/* =============================================================
Electron | Custom events
============================================================= */

// Invokes right after app start to update download folder 
ipcMain.on('update-destination-folder', () => {
  const electronWindow = appState.electronWindow;

  if (!electronWindow) {
    return;
  }

  electronWindow.webContents.send('update-destination-folder', {
    path: userState.downloadFolder
  });
});

// Invokes after download button click
ipcMain.on('start-download-task', (event, { urls }) => {
  launchProcessingTask(urls);
});

// Invokes after cancel button click
ipcMain.on('abort-download-task', async (event) => {
  appState.isAborted = true;

  if (appState.browser) {
    await closeBrowser(appState.browser);
  }
});

// Invokes after destination button click
ipcMain.on('open-select-directory-dialog', async (event) => {
  const electronWindow = appState.electronWindow;

  if (!electronWindow) {
    return;
  }

  const { canceled, filePaths } = await dialog.showOpenDialog(electronWindow, {
    properties: ['openDirectory']
  });

  if (canceled) {
    return;
  }

  userState.downloadFolder = filePaths[0];
  saveUserSettingsToFile();
  electronWindow.webContents.send('update-destination-folder', {
    path: userState.downloadFolder
  });
});

