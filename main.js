const puppeteer = require('puppeteer');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');

const { config, getPuppeteerSettings, getElectronSettings, saveConfig } = require('./app/js/config');

const {
  interceptImageRequests,
  generateProjectsList,
  downloadProjects,
} = require('./app/js/puppeteer');

/* ========================================================= */
/* Puppeteer                                                 */
/* ========================================================= */

async function runPuppeteer() {
  const settings = getPuppeteerSettings();
  const browser = await puppeteer.launch(settings);
  const page = await browser.newPage();

  config.browserPID = browser.process().pid;
  config.page = page;

  try {
    await interceptImageRequests();
    await generateProjectsList();
    await downloadProjects();
    browser.close();
  } catch (err) { /* ignore */ }
}

/* ========================================================= */
/* Electron                                                  */
/* ========================================================= */

let mainWindow;

function createMainWindow() {
  const settings = getElectronSettings();
  mainWindow = new BrowserWindow(settings);
  mainWindow.loadFile('./app/index.html');
  config.mainWindow = mainWindow;
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
  config.mainWindow.webContents.send('settings:dest', { dest });
});

ipcMain.on('task:start', (e, { dest, urls }) => {
  config.isAborted = false;
  config.userUrls = urls;
  config.downloadFolder = dest;
  runPuppeteer();
});

ipcMain.on('task:abort', () => {
  config.isAborted = true;
  process.kill(config.browserPID);
});

ipcMain.on('dialog:directory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (!canceled) {
    const dest = filePaths[0];
    config.downloadFolder = dest;
    config.mainWindow.webContents.send('task:dest', { dest });
  }
});


