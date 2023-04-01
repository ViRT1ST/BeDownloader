const puppeteer = require('puppeteer');

const {
  addUserConfigToAppConfig,
  disableImagesLoading,
  generateProjectsList,
  downloadProjects,
} = require('./services');

const mode = 'development';

const browserOptions = {
  development: {
    args: [],
    headless: false,
    defaultViewport: null
  },
  production: {
    args: ['--start-maximized'],
    headless: true,
    defaultViewport: { width: 1920, height: 1080 }
  }
};

const userConfig = {
  inMoodboardTimeout: 10000,
  betweenProjectsDelay: 1000,
  betweenDownloadsDelay: 1000,
  page: null,
  outputDir: 'E:/Downloads',
  userUrls: [
    // 'https://www.behance.net/collection/202865305/TEST',
    // 'https://www.behance.net/gallery/166160265/Koala-House'
    'https://www.behance.net/gallery/155176025/Private-Offices'
  ],
};

async function runBrowser() {
  const browser = await puppeteer.launch(browserOptions[mode]);
  const page = await browser.newPage();

  userConfig.page = page;
  addUserConfigToAppConfig(userConfig);

  await disableImagesLoading();

  await generateProjectsList();

  await downloadProjects();



  browser.close();
}


runBrowser();
