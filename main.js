const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { config, getElectronSettings, saveConfig } = require('./app/js/config');

const {
  setElectronWindow,
  initPuppeteer,
  killPuppeteer,
  closePuppeteer,
  generateProjectsList,
  downloadProjects,
} = require('./app/js/puppeteer');

/* ========================================================= */
/* Puppeteer                                                 */
/* ========================================================= */

async function runPuppeteer(urls) {
  await initPuppeteer();
  await generateProjectsList(urls);
  await downloadProjects();
  await closePuppeteer();

  // try {
  //   await initPuppeteer();
  //   await generateProjectsList(urls);
  //   await downloadProjects();
  //   closePuppeteer();
  // } catch (err) { /* ignore */ }
}

/* ========================================================= */
/* Electron                                                  */
/* ========================================================= */

let mainWindow;

function createMainWindow() {
  const settings = getElectronSettings();
  mainWindow = new BrowserWindow(settings);
  mainWindow.loadFile('./app/index.html');
  setElectronWindow(mainWindow);
}

app.on('ready', () => {
  createMainWindow();
  mainWindow.on('ready', () => {
    mainWindow = null;
  });
});

app.on('window-all-closed', () => {
  saveConfig();
  if (!config.isMac) {
    app.quit();
  }
});

app.whenReady().then(() => {
  if (config.isMac && BrowserWindow.getAllWindows().length === 0) {
    app.on('activate', createMainWindow);
  }
});

ipcMain.on('settings:dest', () => {
  const dest = config.downloadFolder;
  mainWindow.webContents.send('settings:dest', { dest });
});

ipcMain.on('task:start', (e, { dest, urls }) => {
  config.isAborted = false;
  config.downloadFolder = dest;
  runPuppeteer(urls);
});

ipcMain.on('task:abort', () => {
  config.isAborted = true;
  killPuppeteer();
});

ipcMain.on('dialog:directory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (!canceled) {
    const dest = filePaths[0];
    config.downloadFolder = dest;
    mainWindow.webContents.send('task:dest', { dest });
  }
});
