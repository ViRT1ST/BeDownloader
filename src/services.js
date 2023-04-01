const fs = require('fs');
const fetch = require('node-fetch');
const piexif = require('piexifjs');
const { transliterate } = require('transliteration');

let appConfig = {
  inMoodboardTimeout: 10000,
  betweenProjectsDelay: 1000,
  betweenDownloadsDelay: 500,
  page: null,
  outputDir: null,
  userUrls: [],
  projects: []
};

function addUserConfigToAppConfig(userConfig) {
  appConfig = { ...appConfig, ...userConfig };
}

async function disableImagesLoading() {
  const { page } = appConfig;

  await page.setRequestInterception(true);

  page.on('request', (interceptedRequest) => {
    if (interceptedRequest.resourceType() === 'image') {
      interceptedRequest.abort();
    } else {
      interceptedRequest.continue();
    }
  });
}

async function enableImagesLoading() {
  const { page } = appConfig;

  await page.setRequestInterception(false);
}

async function autoScroll() {
  const { inMoodboardTimeout, page } = appConfig;

  await page.evaluate(async (inMoodboardTimeout) => {
    await new Promise((resolve) => {
      const scrollStepTime = 500;
      const scrollStepHeight = 500;

      const scrollCheckTime = 1000;
      const maxScrollMatches = inMoodboardTimeout / scrollCheckTime;
      let currentScrollMatches = 0;
      let lastScrollPosition = 0;

      const scroller = setInterval(() => {
        lastScrollPosition = window.pageYOffset;
        window.scrollBy(0, scrollStepHeight);
      }, scrollStepTime);

      const checker = setInterval(() => {
        currentScrollMatches = window.pageYOffset === lastScrollPosition
          ? currentScrollMatches += 1
          : 0;

        if (currentScrollMatches === maxScrollMatches) {
          clearInterval(scroller);
          clearInterval(checker);
          resolve();
        }
      }, scrollCheckTime);
    });
  }, inMoodboardTimeout);
}

async function getMoodboardLinks(url) {
  const { page } = appConfig;

  await page.goto(url);
  await page.waitForSelector('.Collection-wrapper-LHa');

  console.log('Scrolling moodboard to page end: begin ...');
  await autoScroll(page);
  console.log('Scrolling moodboard to page end: ended.');

  return page.evaluate(() => {
    console.log('Parsing links from moodboard: begin ...');

    const selector = '.js-project-cover-title-link';
    const items = Array.from(document.querySelectorAll(selector));
    const urls = items.map((item) => item.getAttribute('href'));

    console.log('Parsing links from moodboard: ended.');
    return urls;
  });
}

async function generateProjectsList() {
  const { userUrls } = appConfig;

  let projects = [];

  for (const url of userUrls) {
    if (url.includes('behance.net/collection/')) {
      const moodboardProjects = await getMoodboardLinks(url);
      projects = [...projects, ...moodboardProjects];
    } else {
      projects.push(url);
    }
  }

  appConfig.projects = projects;
  console.log(appConfig.projects);
}

function transliterateString(string) {
  return transliterate(string);
}

function replaceNonEnglishBySymbol(string, symbol) {
  return string.replace(/[^a-zA-Z0-9]/g, symbol);
}

function removeMultipleDashes(string) {
  return string.replace(/-+/g, '-');
}

function convertToLatinized(string) {
  return transliterateString(string);
}

function convertToKebabCase(string) {
  string = convertToLatinized(string);
  string = replaceNonEnglishBySymbol(string, '-');
  string = removeMultipleDashes(string);
  return string.toLowerCase();
}

async function parseProjectData(url) {
  const { page } = appConfig;

  await page.goto(url);
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

async function downloadFile(url, path) {
  const res = await fetch(url);
  const fileStream = fs.createWriteStream(path);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', resolve);
  });
}

function addZeroForNumberLessTen(number) {
  return number < 10 ? `0${number}` : number.toString();
}

function addProjectDataToExif(filename, data) {
  if (/\.jpe?g$/i.test(filename)) {
    const getBase64DataFromJpegFile = (filename) => fs.readFileSync(filename).toString('binary');
    const getExifFromJpegFile = (filename) => piexif.load(getBase64DataFromJpegFile(filename));

    const exifData = getExifFromJpegFile(filename);
    const imageData = getBase64DataFromJpegFile(filename);
    const jsonData = JSON.stringify(data);

    exifData['0th'][piexif.ImageIFD.ImageDescription] = jsonData;

    const newExifBinary = piexif.dump(exifData);
    const newPhotoData = piexif.insert(newExifBinary, imageData);

    const fileBuffer = Buffer.from(newPhotoData, 'binary');
    fs.writeFileSync(filename, fileBuffer);
  }
}

function generateFilePath(counter, url, projectData) {
  const { outputDir } = appConfig;
  const { owners, title } = projectData;

  const normalizedOwner = convertToKebabCase(owners.split(', ')[0]);
  const normalizedTitle = convertToKebabCase(title);

  const prefix = 'behance-';
  const number = addZeroForNumberLessTen(counter);
  const extension = url.split('.').pop();
  const template = `${prefix}-${normalizedOwner}-${normalizedTitle}-${number}`;
  const filename = removeMultipleDashes(`${template}.${extension}`);
  const path = `${outputDir}/${filename}`;

  return path;
}

async function downloadProjects() {
  const { betweenProjectsDelay, betweenDownloadsDelay, page, projects } = appConfig;

  for (const project of projects) {
    const projectData = await getProjectData(project);

    const { id, url, owners, title, images } = projectData;

    let counter = 1;
    for (const image of images) {
      const path = generateFilePath(counter, image, projectData);
      await downloadFile(image, path);
      console.log(path);

      const imageData = {
        site: 'Behance',
        id,
        owners: convertToLatinized(owners),
        title: convertToLatinized(title),
        url,
        image
      };
      addProjectDataToExif(path, imageData);

      await page.waitForTimeout(betweenDownloadsDelay);
      counter += 1;
    }

    await page.waitForTimeout(betweenProjectsDelay);
  }
}

module.exports.addUserConfigToAppConfig = addUserConfigToAppConfig;
module.exports.disableImagesLoading = disableImagesLoading;
module.exports.enableImagesLoading = enableImagesLoading;
module.exports.generateProjectsList = generateProjectsList;
module.exports.downloadProjects = downloadProjects;
