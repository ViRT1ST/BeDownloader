const puppeteer = require('puppeteer');
const { app, BrowserWindow, ipcMain } = require('electron');

const { config, getPuppeteerSettings, getElectronSettings } = require('./app/js/config');

const {
  disableImagesLoading,
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

  config.page = page;

  await disableImagesLoading();
  await generateProjectsList();
  await downloadProjects();

  browser.close();
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
  if (!config.isMac) {
    app.quit();
  }
});

app.whenReady().then(() => {
  if (config.isMac && BrowserWindow.getAllWindows().length === 0) {
    app.on('activate', createMainWindow);
  }
});

ipcMain.on('form:start', (e, { dest, urls }) => {
  config.outputDir = dest;
  config.userUrls = urls;

  if (config.userUrls.length === 0) {
    mainWindow.webContents.send('puppeteer:start', { start: false });
  } else {
    mainWindow.webContents.send('puppeteer:start', { start: true });
    runPuppeteer();
  }
});






