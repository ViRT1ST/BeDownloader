const puppeteer = require('puppeteer');

const {
  autoScroll,
  disableImagesLoading,
  getMoodboardLinks,
  getDataFromProject,
  updateProjectData,
} = require('./services');

const userConfig = {
  dynamicLoadingTimeout: 10000,
  urls: [
    'https://www.behance.net/collection/202865305/TEST',
    'https://www.behance.net/gallery/166160265/Koala-House'
  ],
};

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


async function runBrowser() {
  const { urls, dynamicLoadingTimeout } = userConfig;

  const browser = await puppeteer.launch(browserOptions[mode]);
  const page = await browser.newPage();

  await disableImagesLoading(page);

  async function parseMoodboardProjects(url) {
    await page.goto(url);
    await page.waitForSelector('.Collection-wrapper-LHa');

    console.log('Scrolling moodboard to page end: begin ...');
    await autoScroll(page, dynamicLoadingTimeout);
    console.log('Scrolling moodboard to page end: ended.');

    console.log('Parsing links from moodboard: begin ...');
    const moodboardProjects = await getMoodboardLinks(page);
    console.log('Parsing links from moodboard: ended.');

    return moodboardProjects;
  }

  async function generateProjectsList() {
    let projects = [];

    for (const url of urls) {
      if (url.includes('behance.net/collection/')) {
        const moodboardProjects = await parseMoodboardProjects(url);
        projects = [...projects, ...moodboardProjects];
      } else {
        projects.push(url);
      }
    }

    return projects;
  }

  async function parseProjectData(url) {
    const data = await getDataFromProject(page, url);
    const updatedData = await updateProjectData(data);
    return updatedData;
  }

  async function parseDataFromAllProjects(urls) {
    const allData = [];

    for (const url of urls) {
      const projectData = await parseProjectData(url);
      allData.push(projectData);
    }

    return allData;
  }

  const projectsUrls = await generateProjectsList();
  console.log(projectsUrls);
  const allData = await parseDataFromAllProjects(projectsUrls);
  console.log(allData);


  setTimeout(() => {
    browser.close();
  }, 1000);

}


runBrowser();
