const { config } = require('./config');

const {
  addZeroForNumberLessTen,
  removeMultipleDashes,
  convertToLatinized,
  convertToLatinizedKebab,
  createDirIfNotExists,
  downloadFile,
  saveObjectIntoImageExif
} = require('./utils');

async function disableImagesLoading() {
  const { page } = config;

  await page.setRequestInterception(true);

  page.on('request', (req) => {
    return req.resourceType() === 'image' ? req.abort() : req.continue();
  });
}

async function enableImagesLoading() {
  const { page } = config;

  await page.setRequestInterception(false);
}

function getIdByUrl(url) {
  return url.split('/')[4];
}

async function moodboardScroller() {
  const { inMoodboardTimeout: timeout, page } = config;

  await page.evaluate(async (timeout) => {
    await new Promise((resolve) => {
      const scrollSleep = 500;
      const scrollHeight = 500;
      const checkTime = 1000;

      const maxScrollMatches = timeout / checkTime;
      let currentScrollMatches = 0;
      let lastScrollPosition = 0;

      const scroller = setInterval(() => {
        lastScrollPosition = window.pageYOffset;
        window.scrollBy(0, scrollHeight);
      }, scrollSleep);

      const checker = setInterval(() => {
        if (window.pageYOffset === lastScrollPosition) {
          currentScrollMatches += 1;
        }

        if (currentScrollMatches === maxScrollMatches) {
          clearInterval(scroller);
          clearInterval(checker);
          resolve();
        }
      }, checkTime);
    });
  }, timeout);
}

async function getMoodboardLinks(url) {
  const { page, mainWindow } = config;
  const id = getIdByUrl(url);

  mainWindow.webContents.send('action:mbloading', { id });
  await page.goto(url);
  await page.waitForSelector('.Collection-wrapper-LHa');


  mainWindow.webContents.send('action:mbscrolling', { id });
  await moodboardScroller(page);

  return page.evaluate(() => {
    const selector = '.js-project-cover-title-link';
    const items = Array.from(document.querySelectorAll(selector));
    const urls = items.map((item) => item.getAttribute('href'));
    return urls;
  });
}

async function generateProjectsList() {
  const { userUrls, mainWindow } = config;

  let projects = [];

  for (const url of userUrls) {
    if (url.includes('behance.net/collection/')) {
      const moodboardProjects = await getMoodboardLinks(url);
      projects = [...projects, ...moodboardProjects];
    } else {
      projects.push(url);
    }
    mainWindow.webContents.send('action:completed', {
      done: 0,
      total: projects.length
    });
  }

  config.projects = projects;
  console.log(config.projects);
}


async function parseProjectData(url) {
  const { inProjectTimeout, page, mainWindow } = config;
  const id = getIdByUrl(url);

  mainWindow.webContents.send('action:prloading', { id });

  await page.goto(url);
  await page.waitForTimeout(inProjectTimeout);
  await page.waitForSelector('.project-content-wrap');

  return page.evaluate(() => {
    function getMetaProperty(propertyName) {
      return document.head.querySelector(`meta[property="${propertyName}"]`)
        .getAttribute('content');
    }

    const title = getMetaProperty('og:title');
    const owners = getMetaProperty('og:owners');
    const url = getMetaProperty('og:url');
    const id = url.split('/')[4];

    const imgList = Array.from(document.querySelectorAll('img'));
    const srcList = imgList.map((item) => item.getAttribute('src'));
    const imgUrls = srcList.filter((item) => item.includes('project_modules'));

    return { title, owners, url, id, imgUrls };
  });
}

function correctProjectData(data) {
  const { imgUrls } = data;

  const replacements = [
    'project_modules/2800/',
    'project_modules/2800_opt_1/',
    'project_modules/1400/',
    'project_modules/1400_opt_1/',
    'project_modules/disp/',
    'project_modules/max_1200/',
    'project_modules/fs/'
  ];

  const images = imgUrls.map((url) => {
    for (const replacement of replacements) {
      url = url.replace(replacement, 'project_modules/source/');
    }
    return url;
  });

  const correctedData = { ...data, images };
  delete correctedData.imgUrls;

  return correctedData;
}

async function getProjectData(url) {
  const data = await parseProjectData(url);
  const correctedData = await correctProjectData(data);
  return correctedData;
}

function generateFilePath(projectData, url, index) {
  const { owners: o, title: t } = projectData;

  const owner = convertToLatinizedKebab(o.split(', ')[0]);
  const title = convertToLatinizedKebab(t);
  const prefix = 'behance-';
  const number = addZeroForNumberLessTen(index);
  const extension = url.split('.').pop();
  const template = `${prefix}-${owner}-${title}-${number}`;
  const filename = removeMultipleDashes(`${template}.${extension}`);

  return `${config.outputDir}/${filename}`;
}

function createImageData(projectData, imageUrl) {
  const { id, url, owners: o, title: t } = projectData;

  const site = 'Behance';
  const image = imageUrl;
  const owners = convertToLatinized(o);
  const title = convertToLatinized(t);

  return { site, id, owners, title, url, image };
}

async function downloadProjects() {
  const { betweenDownloadsDelay, page, outputDir, projects, mainWindow } = config;
  console.log('outputDir', outputDir);

  createDirIfNotExists(outputDir);

  let completedProjects = 0;
  let completedImages = 0;

  for (const project of projects) {
    const projectData = await getProjectData(project);

    const { images } = projectData;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      const path = generateFilePath(projectData, image, i + 1);
      await downloadFile(image, path);
      console.log(path);

      const imageData = createImageData(projectData, image);
      saveObjectIntoImageExif(imageData, path);

      completedImages += 1;
      mainWindow.webContents.send('action:images', {
        count: completedImages
      });

      mainWindow.webContents.send('action:prdownload', {
        id: projectData.id,
        current: i + 1,
        total: images.length
      });

      await page.waitForTimeout(betweenDownloadsDelay);
    }

    completedProjects += 1;
    mainWindow.webContents.send('action:completed', {
      done: completedProjects,
      total: projects.length
    });
  }

  mainWindow.webContents.send('action:done');
}

module.exports.disableImagesLoading = disableImagesLoading;
module.exports.enableImagesLoading = enableImagesLoading;
module.exports.generateProjectsList = generateProjectsList;
module.exports.downloadProjects = downloadProjects;
