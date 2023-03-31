const { transliterate } = require('transliteration');

async function disableImagesLoading(page) {
  await page.setRequestInterception(true);
  page.on('request', (interceptedRequest) => {
    if (interceptedRequest.resourceType() === 'image') {
      interceptedRequest.abort();
    } else {
      interceptedRequest.continue();
    }
  });
}

async function enableImagesLoading(page) {
  await page.setRequestInterception(false);
}

async function getMoodboardLinks(page) {
  return page.evaluate(() => {
    const selector = '.js-project-cover-title-link';
    const items = Array.from(document.querySelectorAll(selector));
    const urls = items.map((item) => item.getAttribute('href'));
    return urls;
  });
}



async function getDataFromProject(page, url) {
  await page.goto(url);
  await page.waitForSelector('.project-content-wrap');

  return page.evaluate(() => {
    function getMetaProperty(propertyName) {
      return document.head.querySelector(`meta[property="${propertyName}"]`)
        .getAttribute('content');
    }

    function getProjectmages() {
      const replacements = [
        'project_modules/2800/',
        'project_modules/2800_opt_1/',
        'project_modules/1400/',
        'project_modules/1400_opt_1/',
        'project_modules/disp/',
        'project_modules/max_1200/',
        'project_modules/fs/'
      ];

      const elements = Array.from(document.querySelectorAll('img'));
      const urls = elements.map((item) => item.getAttribute('src'));

      const urlsLQ = urls.filter((item) => item.includes('project_modules'));
      const urlsHQ = urlsLQ.map((url) => {
        for (const replacement of replacements) {
          url = url.replace(replacement, 'project_modules/source/');
        }
        return url;
      });

      return urlsHQ;
    }

    const title = getMetaProperty('og:title');
    const owners = getMetaProperty('og:owners');
    const projectImages = getProjectmages();
    const url = getMetaProperty('og:url');
    const id = url.split('/')[4];

    console.log('projectImages: ', projectImages);

    return { title, owners, url, id, projectImages };
  });
}


async function autoScroll(page, dynamicLoadingTimeout) {
  await page.evaluate(async (dynamicLoadingTimeout) => {
    await new Promise((resolve) => {
      const scrollStepTime = 500;
      const scrollStepHeight = 500;

      const scrollCheckTime = 1000;
      const maxScrollMatches = dynamicLoadingTimeout / scrollCheckTime;
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
  }, dynamicLoadingTimeout);
}


function transliterateString(string) {
  return transliterate(string);
}

function replaceNonEnglishBySymbol(string, symbol) {
  return string.replace(/[^a-zA-Z0-9]/g, symbol);
}

function convertToKebabCase(string) {
  return replaceNonEnglishBySymbol(transliterateString(string), '-')
    .toLowerCase().replace(/--/g, '-');
}

function updateProjectData(object) {
  const updatedData = JSON.parse(JSON.stringify(object));
  const { title, owners } = updatedData;
  updatedData.normalizedTitle = convertToKebabCase(title);
  updatedData.normalizedOwners = convertToKebabCase(owners);
  return updatedData;
}


module.exports.disableImagesLoading = disableImagesLoading;
module.exports.enableImagesLoading = enableImagesLoading;
module.exports.getMoodboardLinks = getMoodboardLinks;
module.exports.getDataFromProject = getDataFromProject;
module.exports.updateProjectData = updateProjectData;
module.exports.autoScroll = autoScroll;
