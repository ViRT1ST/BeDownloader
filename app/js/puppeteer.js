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

const reqImages = [];

async function interceptImageRequests() {
  const { page } = config;

  await page.setRequestInterception(true);

  page.on('request', (req) => {
    if (req.resourceType() === 'image') {
      reqImages.push(req.url());
      req.abort();
    } else {
      req.continue();
    }
  });
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

function sendToRenderer(dest, data) {
  config.mainWindow.webContents.send(dest, data);
}

function getIdByUrl(url) {
  return url.split('/')[4];
}

async function getMoodboardLinks(url) {
  const { page } = config;
  const id = getIdByUrl(url);

  sendToRenderer('moodboard:loading', { id });
  await page.goto(url);
  await page.waitForSelector('.Collection-wrapper-LHa');

  sendToRenderer('moodboard:scrolling', { id });
  await moodboardScroller(page);

  return page.evaluate(() => {
    const selector = '.js-project-cover-title-link';
    const items = Array.from(document.querySelectorAll(selector));
    const urls = items.map((item) => item.getAttribute('href'));
    return urls;
  });
}

async function generateProjectsList() {
  const { userUrls } = config;

  let projects = [];

  for (const url of userUrls) {
    if (url.includes('behance.net/collection/')) {
      const moodboardProjects = await getMoodboardLinks(url);
      projects = [...projects, ...moodboardProjects];
    } else {
      projects.push(url);
    }

    sendToRenderer('completed:update', { done: 0, total: projects.length });
  }

  config.projects = projects;
  console.log(config.projects);
}

async function parseProjectData(url) {
  const { inProjectTimeout, page } = config;
  const id = getIdByUrl(url);

  reqImages.length = 0;
  sendToRenderer('project:loading', { id });

  await page.goto(url);
  await page.waitForTimeout(inProjectTimeout);
  await page.waitForSelector('.project-content-wrap');

  return page.evaluate(async (id) => {
    function getMetaProperty(propertyName) {
      return document.head.querySelector(`meta[property="${propertyName}"]`)
        .getAttribute('content');
    }

    const title = getMetaProperty('og:title');
    const owners = getMetaProperty('og:owners');
    const url = getMetaProperty('og:url');

    const imgList = Array.from(document.querySelectorAll('img'));
    const imgUrls = imgList.map((item) => item.getAttribute('src'));

    return { title, owners, url, id, imgUrls };
  }, id);
}

function checkImageUrl(url) {
  const badUrls = [
    'static.kuula.io',
    'files.kuula.io/users/',
    'files.kuula.io/profiles/'
  ];

  const jpegOrPng = /\.jpe?g|png$/i.test(url);
  const notBadUrl = !badUrls.some((item) => url.includes(item));
  const notBase64 = !/base64/i.test(url);
  const projectModule = /\/project_modules\//i.test(url);
  const externalImage = !/behance\.net/i.test(url);

  const goodSource = (projectModule || externalImage);
  return jpegOrPng && notBadUrl && notBase64 && goodSource;
}

function correctProjectData(data) {
  const { imgUrls } = data;

  const filteredUrls = imgUrls.concat(reqImages).filter(checkImageUrl);

  const correctedUrls = filteredUrls.map((url) => {
    return url.includes('/project_modules/')
      ? url.replace(/([\w.-]+)(\/[\w.-]+)$/, 'source$2')
      : url;
  });

  const correctedData = { ...data, images: [...new Set(correctedUrls)] };
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

  url = url.includes('?') ? url.split('?')[0] : url;

  const owner = convertToLatinizedKebab(o.split(', ')[0]);
  const title = convertToLatinizedKebab(t);
  const prefix = 'behance-';
  const number = addZeroForNumberLessTen(index);
  const extension = url.split('.').pop();
  const template = `${prefix}-${owner}-${title}-${number}`;
  const filename = removeMultipleDashes(`${template}.${extension}`);

  return `${config.downloadFolder}/${filename}`;
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
  const { downloadFolder, betweenImagesDelay, page, projects } = config;

  createDirIfNotExists(downloadFolder);

  let projectsCompleted = 0;

  for (const project of projects) {
    if (config.isAborted) {
      break;
    }

    const projectData = await getProjectData(project);
    const { images, id } = projectData;

    console.log(images);

    for (let i = 0; i < images.length; i++) {
      if (config.isAborted) {
        break;
      }

      sendToRenderer('project:download', { id, current: i + 1, total: images.length });

      const image = images[i];
      const path = generateFilePath(projectData, image, i + 1);
      await downloadFile(image, path);
      console.log(path);

      const imageData = createImageData(projectData, image);
      saveObjectIntoImageExif(imageData, path);

      await page.waitForTimeout(betweenImagesDelay);
    }

    if (!config.isAborted) {
      projectsCompleted += 1;
      sendToRenderer('completed:update', {
        done: projectsCompleted,
        total: projects.length
      });
    }
  }

  if (!config.isAborted) {
    sendToRenderer('task:done', null);
  }
}

module.exports.interceptImageRequests = interceptImageRequests;
module.exports.generateProjectsList = generateProjectsList;
module.exports.downloadProjects = downloadProjects;
