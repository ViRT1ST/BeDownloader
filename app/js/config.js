const isDevMode = false;

const config = {
  isMac: process.platform === 'darwin',
  inMoodboardTimeout: 10000,
  inProjectTimeout: 5000,
  betweenProjectsDelay: 1000,
  betweenDownloadsDelay: 500,
  mainWindow: null,
  page: null,
  outputDir: null,
  userUrls: [],
  projects: [],
};

function getPuppeteerSettings() {
  return {
    args: isDevMode ? [] : ['--start-maximized'],
    defaultViewport: isDevMode ? null : { width: 1920, height: 1080 },
    headless: !isDevMode,
  };
}

function getElectronSettings() {
  return {
    title: 'ImageShrink',
    width: 600,
    height: 650,
    icon: './app/img/icons/Icon_256x256.png',
    backgroundColor: 'white',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    resizable: true,
    autoHideMenuBar: true,
  };
}



module.exports.config = config;
module.exports.getPuppeteerSettings = getPuppeteerSettings;
module.exports.getElectronSettings = getElectronSettings;
