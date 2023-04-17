const fs = require('fs');
const path = require('path');

const puppeteer = require('puppeteer');
const { config, getPuppeteerSettings } = require('./config');

const {
  addZeroForNumberLessTen,
  removeMultipleDashes,
  convertToLatinized,
  convertToLatinizedKebab,
  shortenUrl,
  createDirIfNotExists,
  downloadFile,
  saveObjectIntoImageExif,
  readFileToArray,
  writeArrayToFile
} = require('./utils');

let browser;
let browserPID;
let page;

let projects;
let projectsTotal;
let projectsPassedByHistory;
let projectsToDownload;
let projectsCompleted;

let imagesFromRequests;
let historyList;

let electronWindow;

function setElectronWindow(mainWindow) {
  electronWindow = mainWindow;
}

async function interceptImageRequests() {
  await page.setRequestInterception(true);

  page.on('request', (req) => {
    const url = req.url();
    const resourceType = req.resourceType();

    if (resourceType === 'image') {
      imagesFromRequests.push(url);
      req.abort();
    } else if (req.resourceType === 'media') {
      req.abort();
    } else {
      req.continue();
    }
  });
}

async function initPuppeteer() {
  const settings = getPuppeteerSettings();
  browser = await puppeteer.launch(settings);
  page = await browser.newPage();
  browserPID = browser.process().pid;

  projects = [];
  projectsTotal = 0;
  projectsPassedByHistory = 0;
  projectsToDownload = 0;
  projectsCompleted = 0;

  imagesFromRequests = [];

  await interceptImageRequests();
}

function killPuppeteer() {
  process.kill(browserPID);
}

function closePuppeteer() {
  browser.close();
}

async function pageScroller() {
  const { scrollingTimeout: timeout } = config;

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
  electronWindow.webContents.send(dest, data);
}

function getIdByUrl(url) {
  return url.split('/')[4];
}

async function getPageProjects(url) {
  const shortUrl = shortenUrl(url, 45);

  sendToRenderer('page:loading', { shortUrl });
  await page.goto(url, { waitUntil: 'load', timeout: 0 });

  sendToRenderer('page:scrolling', { shortUrl });
  await pageScroller(page);

  return page.evaluate(async () => {
    const selector = '.js-project-cover-image-link';
    const elements = Array.from(document.querySelectorAll(selector));
    const urls = elements.map((item) => item.getAttribute('href'));
    return urls;
  });
}

async function generateProjectsList(urls) {
  const { historyFile, skipProjectsByHistory } = config;

  historyList = readFileToArray(historyFile);

  projects = [];
  projectsPassedByHistory = 0;

  for (const url of urls) {
    if (url.includes('behance.net/gallery/')) {
      projects.push(url);
    } else {
      const pageProjects = await getPageProjects(url);
      projects = [...projects, ...pageProjects];
    }

    projectsTotal = projects.length;
    sendToRenderer('completed:update', {
      done: 0, total: projectsTotal, skip: 0
    });
  }

  projects = projects.map((item) => item.split('?')[0]);

  if (skipProjectsByHistory) {
    projects = projects.filter((item) => !historyList.includes(item));
  }

  projectsToDownload = projects.length;
  projectsPassedByHistory = projectsTotal - projectsToDownload;

  sendToRenderer('completed:update', {
    done: 0, total: projectsTotal, skip: projectsPassedByHistory
  });
}

async function parseProjectData(url) {
  const id = getIdByUrl(url);

  imagesFromRequests = [];
  sendToRenderer('project:loading', { id });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });
  await page.waitForTimeout(3000);

  return page.evaluate(async (id) => {
    function getMetaProperty(propertyName) {
      return document.head.querySelector(`meta[property="${propertyName}"]`)
        .getAttribute('content');
    }

    function getImagesFromJson() {
      let images = [];

      try {
        const jsonElement = document.getElementById('beconfig-store_state');
        const jsonObj = JSON.parse(jsonElement.innerHTML);
        const { modules } = jsonObj.project.project;

        for (let i = 0; i < modules.length; i++) {
          const { components, src } = modules[i];

          if (typeof components === 'object') {
            images = [...images, ...components.map((item) => item.src)];
          }

          if (typeof src === 'string') {
            images = [...images, src];
          }
        }
      } catch (error) { /* ignore */ }

      return images;
    }

    const title = getMetaProperty('og:title');
    const owners = getMetaProperty('og:owners');
    const url = getMetaProperty('og:url');

    const elements = Array.from(document.querySelectorAll('img'));
    const imagesFromDom = elements.map((item) => item.getAttribute('src'));
    const imagesFromJson = getImagesFromJson();
    const images = imagesFromDom.concat(imagesFromJson);

    return { title, owners, url, id, images };
  }, id);
}

function checkImageUrl(url) {
  const badUrls = [
    'static.kuula.io',
    'files.kuula.io/users/',
    'files.kuula.io/profiles/'
  ];

  if (typeof url === 'string') {
    const jpegOrPng = /\.jpe?g|png$/i.test(url);
    const notBadUrl = !badUrls.some((item) => url.includes(item));
    const notBase64 = !/base64/i.test(url);
    const projectModule = /\/project_modules\//i.test(url);
    const externalImage = !/behance\.net/i.test(url);

    const goodSource = (projectModule || externalImage);
    return jpegOrPng && notBadUrl && notBase64 && goodSource;
  }

  return false;
}

function correctProjectData(data) {
  const { images } = data;

  const allImages = images.concat(imagesFromRequests);
  const filteredImages = allImages.filter(checkImageUrl);

  const correctedImages = filteredImages.map((item) => {
    return item.includes('/project_modules/')
      ? item.replace(/([\w.-]+)(\/[\w.-]+)$/, 'source$2')
      : item;
  });

  return { ...data, images: [...new Set(correctedImages)] };
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

function saveProjectToHistory(url) {
  const { historyFile } = config;
  if (!historyList.includes(url)) {
    historyList.push(url);
    writeArrayToFile(historyFile, historyList);
  }
}

async function downloadImage(url, projectData, filepath) {
  const tempFileExt = path.parse(filepath).ext;

  const tempFile = path.join(path.dirname(filepath), `temp-image${tempFileExt}`);
  await downloadFile(url, tempFile);

  const imageData = createImageData(projectData, url);
  saveObjectIntoImageExif(imageData, tempFile);

  let pathToSave = filepath;

  if (fs.existsSync(tempFile) && fs.existsSync(filepath)) {
    const tempFileSize = (fs.statSync(tempFile).size / 1024).toFixed(2);
    const existFileSize = (fs.statSync(filepath).size / 1024).toFixed(2);

    if (tempFileSize !== existFileSize) {

      const existFilePatternArr = path.parse(filepath).name.split('-').slice(0, -1);
      const existFilePattern = existFilePatternArr.join('-');

      const existFilesWithPattern = fs
        .readdirSync(path.dirname(filepath))
        .filter((item) => item.startsWith((existFilePattern)));

      const lastFile = existFilesWithPattern.pop();
      const { name, ext } = path.parse(lastFile);
      const lastDigit = parseInt(name.split('-').pop(), 10);
      const nextDigit = addZeroForNumberLessTen(lastDigit + 1);
      const newFilename = `${existFilePattern}-${nextDigit}${ext}`;
      const newFilepath = path.join(path.dirname(filepath), newFilename);

      pathToSave = newFilepath;
    } else {
      fs.unlinkSync(filepath);
    }
  }

  fs.renameSync(tempFile, pathToSave);
  console.log(pathToSave);
}


async function downloadProjects() {
  const { downloadFolder, betweenImagesDelay } = config;

  createDirIfNotExists(downloadFolder);

  for (const project of projects) {
    if (config.isAborted) {
      break;
    }

    const projectData = await getProjectData(project);
    const { id, url: projectUrl, images: imageUrls } = projectData;
    console.log(imageUrls);

    for (let i = 0; i < imageUrls.length; i++) {
      if (config.isAborted) {
        break;
      }

      sendToRenderer('project:download', {
        id,
        current: i + 1,
        total: imageUrls.length });

      const url = imageUrls[i];
      const path = generateFilePath(projectData, url, i + 1);
      await downloadImage(url, projectData, path);

      await page.waitForTimeout(betweenImagesDelay);
    }

    if (!config.isAborted) {
      saveProjectToHistory(projectUrl);
      projectsCompleted += 1;
      sendToRenderer('completed:update', {
        total: projectsTotal,
        done: projectsCompleted,
        skip: projectsPassedByHistory
      });
    }
  }

  if (projectsToDownload === 0) {
    sendToRenderer('task:skipped', null);
  }

  if (projectsToDownload !== 0 && !config.isAborted) {
    sendToRenderer('task:done', null);
  }
}

module.exports.setElectronWindow = setElectronWindow;
module.exports.interceptImageRequests = interceptImageRequests;
module.exports.initPuppeteer = initPuppeteer;
module.exports.killPuppeteer = killPuppeteer;
module.exports.closePuppeteer = closePuppeteer;
module.exports.generateProjectsList = generateProjectsList;
module.exports.downloadProjects = downloadProjects;
