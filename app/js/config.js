const path = require('path');
const os = require('os');
const fs = require('fs');
const ini = require('ini');

const { createDirIfNotExists } = require('./utils');

const isDevMode = false;

const config = {
  isMac: process.platform === 'darwin',
  settingsFolder: path.join(os.homedir(), '.bedownloader'),
  downloadFolder: path.join(os.homedir(), 'behance-downloads'),
  inMoodboardTimeout: 10000,
  inProjectTimeout: 5000,
  betweenProjectsDelay: 1000,
  betweenImagesDelay: 500,
  mainWindow: null,
  browserPID: null,
  page: null,
  userUrls: [],
  projects: [],
  isAborted: false,
};

function loadConfig() {
  try {
    const path = `${config.settingsFolder}/config.ini`;
    const { main } = ini.parse(fs.readFileSync(path, 'utf-8'));
    config.downloadFolder = main.downloadFolder;
    config.inMoodboardTimeout = main.inMoodboardTimeout;
    config.inProjectTimeout = main.inProjectTimeout;
    config.betweenProjectsDelay = main.betweenProjectsDelay;
    config.betweenImagesDelay = main.betweenImagesDelay;
  } catch (err) { /* ignore */ }
}

loadConfig();

function saveConfig() {
  const path = `${config.settingsFolder}/config.ini`;
  createDirIfNotExists(config.settingsFolder);
  const configToSave = {
    downloadFolder: config.downloadFolder,
    inMoodboardTimeout: config.inMoodboardTimeout,
    inProjectTimeout: config.inProjectTimeout,
    betweenProjectsDelay: config.betweenProjectsDelay,
    betweenImagesDelay: config.betweenImagesDelay
  };
  fs.writeFileSync(path, ini.stringify(configToSave, { section: 'main' }));
}

function getPuppeteerSettings() {
  if (isDevMode) {
    return {
      args: [],
      defaultViewport: null,
      headless: false,
    };
  }

  return {
    args: ['--start-maximized'],
    defaultViewport: { width: 1920, height: 1080 },
    headless: true,
  };
}

function getElectronSettings() {
  return {
    title: 'BeDownloader',
    width: 600,
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
