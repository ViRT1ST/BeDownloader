const path = require('path');
const os = require('os');
const fs = require('fs');
const ini = require('ini');

const { createDirIfNotExists } = require('./utils');

const isDevMode = false;

const appFolderName = '.bedownloader';

const config = {
  isMac: process.platform === 'darwin',
  settingsFolder: path.join(os.homedir(), appFolderName),
  settingsFile: path.join(os.homedir(), appFolderName, 'config.ini'),
  downloadFolder: path.join(os.homedir(), appFolderName, 'downloads'),
  historyFile: path.join(os.homedir(), appFolderName, 'history.txt'),
  skipProjectsByHistory: true,
  inMoodboardTimeout: 10000,
  betweenImagesDelay: 500,
  isAborted: false,
  mainWindow: null,
};

function loadConfig() {
  try {
    const { main } = ini.parse(fs.readFileSync(config.settingsFile, 'utf-8'));
    if (main) {
      config.downloadFolder = main.downloadFolder;
      config.skipProjectsByHistory = main.skipProjectsByHistory;
      config.inMoodboardTimeout = main.inMoodboardTimeout;
      config.betweenImagesDelay = main.betweenImagesDelay;
    }
  } catch (err) { /* ignore */ }
}

loadConfig();

function saveConfig() {
  createDirIfNotExists(config.settingsFolder);
  const configToSave = {
    downloadFolder: config.downloadFolder,
    skipProjectsByHistory: config.skipProjectsByHistory,
    inMoodboardTimeout: config.inMoodboardTimeout,
    betweenImagesDelay: config.betweenImagesDelay,
  };
  fs.writeFileSync(config.settingsFile, ini.stringify(configToSave, { section: 'main' }));
}

function getPuppeteerSettings() {
  const chrome = './.cache/puppeteer/chrome/win64-1108766/chrome-win/chrome.exe';

  if (isDevMode) {
    return {
      args: [],
      defaultViewport: null,
      headless: false,
      executablePath: chrome,
    };
  }

  return {
    args: ['--start-maximized'],
    defaultViewport: { width: 1920, height: 1080 },
    headless: true,
    executablePath: chrome,
  };
}

function getElectronSettings() {
  return {
    title: 'BeDownloader 1.0.6',
    width: 800,
    height: 600,
    icon: './app/img/icons/Icon_512x512.png',
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  };
}

module.exports.config = config;
module.exports.saveConfig = saveConfig;
module.exports.getPuppeteerSettings = getPuppeteerSettings;
module.exports.getPuppeteerSettings = getPuppeteerSettings;
module.exports.getElectronSettings = getElectronSettings;
