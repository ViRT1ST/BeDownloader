const path = require('path');
const fs = require('fs');
const ini = require('ini');

const { createDirIfNotExists } = require('./utils');

const title = 'BeDownloader 1.4.0';

const isDevMode = false;
const isBrowserHidden = true;

const platform = process.platform.toString();
const isMac = platform === 'darwin';
const isWin = platform === 'win32';

const settingsFolder = 'settings';
const downloadFolder = 'downloads';

const config = {
  isMac,
  isWin,
  downloadFolder: path.join(process.cwd(), downloadFolder),
  settingsFolder: path.join(process.cwd(), settingsFolder),
  settingsFile: path.join(process.cwd(), settingsFolder, 'config.ini'),
  historyFile: path.join(process.cwd(), settingsFolder, 'history.txt'),
  skipProjectsByHistory: false,
  scrollingTimeout: 10000,
  betweenImagesDelay: 500,
  localStorageToken: 'none',
  isAborted: false,
};

function loadOption(name, value) {
  const badValues = /undefined|none|null/;
  if (!badValues.test(String(value))) {
    config[name] = value;
  }
}

function loadConfig() {
  const { main } = ini.parse(fs.readFileSync(config.settingsFile, 'utf-8'));
  const userValues = [
    'downloadFolder',
    'skipProjectsByHistory',
    'scrollingTimeout',
    'betweenImagesDelay',
    'localStorageToken'
  ];

  userValues.forEach((value) => {
    try {
      loadOption(value, main[value]);
    } catch (err) {
      /* ignore */
    }
  });
}

function saveConfig() {
  createDirIfNotExists(config.settingsFolder);
  const configToSave = {
    downloadFolder: config.downloadFolder,
    skipProjectsByHistory: config.skipProjectsByHistory,
    scrollingTimeout: config.scrollingTimeout,
    betweenImagesDelay: config.betweenImagesDelay,
    localStorageToken: config.localStorageToken
  };
  fs.writeFileSync(config.settingsFile, ini.stringify(configToSave, { section: 'main' }));
}

function getPuppeteerSettings() {
  const portableApp = {
    darwin: './[chrome-darwin-110876]/Chromium.app/Contents/MacOS/Chromium',
    linux: './[chrome-linux-110876]/chrome',
    win32: './[chrome-win64-110876]/chrome.exe'
  };

  return {
    args: ['--start-maximized'],
    defaultViewport: { width: 1920, height: 1080 },
    headless: isBrowserHidden,
    executablePath: isDevMode ? null : portableApp[platform]
  };
}

function getElectronSettings() {
  return {
    title,
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
