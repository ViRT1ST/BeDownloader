const isDevMode = true;

const config = {
  inMoodboardTimeout: 10000,
  inProjectTimeout: 5000,
  betweenProjectsDelay: 1000,
  betweenDownloadsDelay: 500,
  isMac: process.platform === 'darwin',
  isAborted: false,
  mainWindow: null,
  browserPID: null,
  page: null,
  outputDir: null,
  userUrls: [],
  projects: [],
};

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
module.exports.getPuppeteerSettings = getPuppeteerSettings;
module.exports.getElectronSettings = getElectronSettings;
