const path = require('path');
const os = require('os');
const fs = require('fs');
const ini = require('ini');

const { createDirIfNotExists } = require('./utils');

const isDevMode = false;

const platform = process.platform.toString();
const isMac = platform === 'darwin';
const isWin = platform === 'win32';

const appFolderName = isWin ? '.bedownloader' : 'bedownloader';

const config = {
  isMac,
  isWin,
  settingsFolder: path.join(os.homedir(), appFolderName),
  settingsFile: path.join(os.homedir(), appFolderName, 'config.ini'),
  downloadFolder: path.join(os.homedir(), appFolderName, 'downloads'),
  historyFile: path.join(os.homedir(), appFolderName, 'history.txt'),
  skipProjectsByHistory: true,
  scrollingTimeout: 10000,
  betweenImagesDelay: 500,
  isAborted: false,
};

function loadOption(name, value) {
  if (value.toString() !== 'undefined') {
    config[name] = value;
  }
}

function loadConfig() {
  try {
    const { main } = ini.parse(fs.readFileSync(config.settingsFile, 'utf-8'));
    loadOption('downloadFolder', main.downloadFolder);
    loadOption('skipProjectsByHistory', main.skipProjectsByHistory);
    loadOption('scrollingTimeout', main.scrollingTimeout);
    loadOption('betweenImagesDelay', main.betweenImagesDelay);
    loadOption('authKey', main.authKey);
    loadOption('authVal', main.authVal);
  } catch (err) { /* ignore */ }
}

function saveConfig() {
  createDirIfNotExists(config.settingsFolder);
  const configToSave = {
    downloadFolder: config.downloadFolder,
    skipProjectsByHistory: config.skipProjectsByHistory,
    scrollingTimeout: config.scrollingTimeout,
    betweenImagesDelay: config.betweenImagesDelay,
    authKey: config.authKey,
    authVal: config.authVal
  };
  fs.writeFileSync(config.settingsFile, ini.stringify(configToSave, { section: 'main' }));
}

function getPuppeteerSettings() {
  const chromeApp = {
    // darwin: './[chrome-darwin-110876]/Chromium.app/Contents/MacOS/Chromium',
    darwin: null,
    linux: './[chrome-linux-110876]/chrome',
    win32: './[chrome-win64-110876]/chrome.exe'
  };

  return {
    args: ['--start-maximized'],
    defaultViewport: { width: 1920, height: 1080 },
    headless: false,
    executablePath: isDevMode ? null : chromeApp[platform]
  };
}

function getElectronSettings() {
  return {
    title: 'BeDownloader 1.1.0',
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

loadConfig();
saveConfig();

module.exports.config = config;
module.exports.saveConfig = saveConfig;
module.exports.getPuppeteerSettings = getPuppeteerSettings;
module.exports.getPuppeteerSettings = getPuppeteerSettings;
module.exports.getElectronSettings = getElectronSettings;
