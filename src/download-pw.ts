import { chromium } from 'playwright';

import { userState } from './states/user.js';
import { contextOptions, behanceConstants } from './configs/playwright.js';
import { appState, resetPlaywrightDataInState } from './states/app.js';
import { ProjectLink, LaunchPersistentContextOptions } from './types.js';
import {
  wait,
  sendToRenderer,
  closeBrowser,
  disableUnwantedRequests,
  getProjectImagesFromParsedImages,
  makeValidBehanceUrl,
  formatUrlForUi,
  createDirectoryIfNotExists,
  readTextFileToArray,
  generateFilePathForImage,
  addProjectUrlToHistoryFile,
  downloadImage,
} from './utils.js';

const {
  mainPageUrl,
  gridSelectors,
  projectSelectors,
  authLocalStorageKey
} = behanceConstants;

/* =============================================================
Electron: update completed info in UI
============================================================= */

function updateCompletedInfo() {
  const ew = appState.electronWindow;

  if (!ew) {
    return;
  }

  sendToRenderer(ew, 'update-completed-info', {
    total: appState.projectsTotal,
    done: appState.projectsCompleted,
    skip: appState.projectsSkipped,
    fail: appState.projectsFailed
  });
}

/* =============================================================
Electron: update status info in UI
============================================================= */

function updateStatusInfo(message: string) {
  const ew = appState.electronWindow;

  if (!ew) {  
    return;
  }

  console.log(message);
  sendToRenderer(ew, 'update-status-info', { message });
}

/* =============================================================
Playwright: Create and launch browser
============================================================= */

export async function launchBrowser() {
  const options: LaunchPersistentContextOptions = { ...contextOptions };

  if (userState.showBrowser) {
    options.headless = false;
  }

  appState.browser = await chromium.launchPersistentContext('', options);
  appState.page = await appState.browser.newPage();

  await disableUnwantedRequests(appState.page);
}

/* =============================================================
Playwright: Load Behance main page
============================================================= */

async function loadMainPage(refreshAfterAuth: boolean) {
  const ew = appState.electronWindow;
  const browser = appState.browser;
  const page = appState.page;
  const tokenValue = userState.localStorageToken;
  
  if (!ew || !browser || !page) {
    return;
  }

  // No need to refresh main page if user token is not provided
  if (refreshAfterAuth && !tokenValue.includes('REAUTH_SCOPE')) {
    return;
  }

  const message = refreshAfterAuth
    ? 'refreshing Behance main page after authentication... (please wait)'
    : 'loading Behance main page... (please wait)';

  updateStatusInfo(message);

  try {
    await page.goto(mainPageUrl, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (error) {
    return;
  }
}

/* =============================================================
Playwright: Authenticate if user has token in config file
============================================================= */

async function auth() {
  const ew = appState.electronWindow;
  const page = appState.page;
  
  const tokenKey = authLocalStorageKey;
  const tokenValue = userState.localStorageToken;

  if (!ew || !page || !tokenValue || !tokenValue.includes('REAUTH_SCOPE')) {
    return;
  }

  updateStatusInfo('authenticating by user token... (please wait)');

  try {
    await page.evaluate(async ({ tokenKey, tokenValue }) => {
      try {
        localStorage.setItem(tokenKey, tokenValue);
      } catch (error) {
        return;
      }
    }, { tokenKey, tokenValue });

  } catch (error) {
    return;
  }
}

/* =============================================================
Playwright: Wait after authentication
============================================================= */

async function waitAfterAuth() {
  const tokenValue = userState.localStorageToken;

  if (!tokenValue.includes('REAUTH_SCOPE')) {
    return;
  }

  updateStatusInfo('waiting 20 seconds after authentication... (please wait)');
  await wait(20000);
}

/* =============================================================
Playwright: Scroll page to bottom (for moodboard/profiles/likes pages)
============================================================= */

async function scrollPageToBottom() {
  const page = appState.page;
  
  if (!page) {
    return;
  }

  updateStatusInfo('scrolling page to get all projects (can take some time)...');

  await page.evaluate(async () => {
    try {
      const scrollStep = 500; 
      const delayBetweenScrolls = 200;
      let reachedBottomTimes = 0;
      
      while (true) {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  
        // Scroll down
        window.scrollBy(0, scrollStep);
  
        // Delay
        await new Promise((resolve) => setTimeout(resolve, delayBetweenScrolls));
  
        // Exit if scroll has reached the bottom 50 times
        if (scrollTop + clientHeight >= scrollHeight - 1) {
          reachedBottomTimes += 1;
          if (reachedBottomTimes >= 50) {
            break;
          }
        }
      }
    } catch (error) {
      return;
    }
  });
}

/* =============================================================
Playwright: Get projects (urls) from moodboard/profiles/likes pages
============================================================= */
 
async function collectProjectsUrlsFromPage(url: string) {
  const { downloadModulesAsGalleries } = userState;
  const ew = appState.electronWindow;
  const page = appState.page;

  if (!ew || !page) {
    return;
  }

  // Loading page (moodboard/profiles/likes page)
  updateStatusInfo(`loading page [${formatUrlForUi(url, 45)}] ...`);
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  } catch (error: any) {
    console.log(`Error loading page: ${url} | ${error?.message}`);
  }

  // Scrolling
  await scrollPageToBottom();
  
  // Parsing projects urls
  try {
    const projectsUrls = await page.evaluate(async ({
      gridSelectors, projectSelectors, downloadModulesAsGalleries
    }) => {
      try {
        const foundProjects: ProjectLink[] = [];

        // Get all grid elements
        const allFoundGrids: Element[] = [];
        for (const selector of gridSelectors) {
          const gridElements = Array.from(document.querySelectorAll(selector));
          for (const gridElement of gridElements) {
            allFoundGrids.push(gridElement);
            // At moodboards pages only first grid needed
            // Second is "Projects we think you might like"
            if (window.location.href.includes('/moodboard/')) {
              break;
            }
          }
        }

        // Get all projects elements
        const projectElements: Element[] = [];
        for (const selector of projectSelectors) {
          const foundProjects = allFoundGrids
            .flatMap((parent) => Array.from(parent.querySelectorAll(selector)));
          projectElements.push(...foundProjects);
        }
        
        // Create object for each project
        for (const element of projectElements) {
          const parent = element.parentElement as Element;
          const projectUrl = parent.querySelector('a')?.getAttribute('href');
          const projectImage = parent.querySelector('img')?.getAttribute('src');

          // Skip if project data is invalid
          if (!projectUrl || !projectImage || !projectUrl.includes('/gallery/')) {
            continue;
          }

          // Project object
          const projectLink: ProjectLink = {
            projectVariant: 'gallery',
            projectUrl,
            projectImage
          };

          // Sometimes projects are just one image and not are galleries
          if (element.tagName === 'DIV' && parent.tagName !== 'ARTICLE') {
            projectLink.projectVariant = 'image';
          }

          // If forced download modules as galleries
          if (downloadModulesAsGalleries) {
            projectLink.projectVariant = 'gallery';
          }

          foundProjects.push(projectLink);
        }

        return foundProjects;

      } catch (error: any) {       
        return;
      }
    }, { gridSelectors, projectSelectors, downloadModulesAsGalleries });

    return projectsUrls;

  } catch (error) {
    return;
  }
}

/* =============================================================
Playwright: Collect projects only URLs from all URLs pasted by user in input form
============================================================= */

export async function generateProjectsList(urls: string[]) {
  const { skipProjectsByHistory } = userState;
  const ew = appState.electronWindow;

  if (!ew) {
    return;
  }

  // Cycle all user URLs and grabing projects from them
  for (const url of urls) {
    if (url.includes('behance.net/gallery/')) {
      appState.projects.push({
        projectVariant: 'gallery',
        projectUrl: makeValidBehanceUrl(url),
        projectImage: ''
      });

    } else {
      // Collect projects from moodbard/profile/likes page
      let projects: ProjectLink[] | undefined = await collectProjectsUrlsFromPage(url);

      if (!projects) {
        appState.projectsFailed += 1;
        // console.log('collectProjectsUrlsFromPage(): failed');
        // console.log('collectProjectsUrlsFromPage():', projects);

      } else {
        projects = projects.map((item) => {
          return {
            projectVariant: item.projectVariant,
            projectUrl: makeValidBehanceUrl(item.projectUrl),
            projectImage: item.projectImage
          };
        });

        appState.projects = [...appState.projects, ...projects];
      }
    }

    // Update total count and UI
    appState.projectsTotal = appState.projects.length;
    updateCompletedInfo();
  }

  // Remove projects that are in history
  if (skipProjectsByHistory) {
    const filteredProjects: ProjectLink[] = [];

    for (const project of appState.projects) {
      const isInHistory = appState.historyList.includes(project.projectUrl);
      const isProjectVariantIsGallery = project.projectVariant === 'gallery';

      if (isInHistory && isProjectVariantIsGallery) {
        appState.projectsSkipped += 1;
      } else {
        filteredProjects.push(project);
      }
    }

    appState.projects = filteredProjects;

    // Update skipped count
    appState.projectsSkipped = appState.projectsTotal - appState.projects.length;
    updateCompletedInfo();
  }
}

/* =============================================================
Playwright: Load project page and collect its data
============================================================= */
 
async function gotoProjectPageAndCollectData(projectLink: ProjectLink) {
  const ew = appState.electronWindow;
  const page = appState.page;
  const url = projectLink.projectUrl;
  const id = projectLink.projectUrl.split('/')[4];

  if (!ew || !page || !url|| !id) {
    return;
  }

  // Loading project page
  updateStatusInfo(`loading project page [${id}] to collect its data and images...`);

  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  } catch (error: any) {
    console.log(`Error loading page: ${url} | ${error?.message}`);
  }

  // Parse project data
  const projectData = await page.evaluate(async ({ id, projectLink }) => {
    try {
      const { projectVariant, projectUrl, projectImage } = projectLink;

      function getMetaProperty(propertyName: string) {
        const selector = document.head.querySelector(`meta[property="${propertyName}"]`);
        return selector ? selector.getAttribute('content') : '';
      }

      // Adult content protection
      if (document.body.classList.contains('is-locked')) {
        return;
      }

      const projectTitle = getMetaProperty('og:title') || '';
      const projectOwners = getMetaProperty('og:owners') || '';
      const projectImages: string[] = [];

      if (projectVariant === 'image') {
        projectImages.push(projectImage);

      } else {
        Array.from(document.querySelectorAll('img')).forEach((item) => {
          const src = item.getAttribute('src');
          if (src !== null) {
            projectImages.push(src);
          }
        });
      }

      return {
        projectId: id,
        projectTitle,
        projectOwners,
        projectImages,
        projectUrl
      };

    } catch (error) {
      return;
    }
  }, { id, projectLink });

  return projectData;
}

/* =============================================================
Task: Update UI for downloads final result and close browser
============================================================= */

async function taskEnding() {
  const ew = appState.electronWindow;

  if (!ew) {
    return;
  }

  const {
    isAborted,
    projectsTotal,
    projectsCompleted,
    projectsSkipped,
    projectsFailed
  } = appState;

  let finalStatus = '';

  if (isAborted) {
    finalStatus = 'process is aborted by user';
  } else if (projectsTotal === 0) {
    finalStatus = 'no projects to download';
  } else if (projectsTotal === projectsSkipped) {
    finalStatus = 'all projects skipped by download history';
  } else if (projectsTotal === projectsCompleted + projectsSkipped) {
    finalStatus = 'all projects were downloaded successfully!';
  } else if (projectsFailed > 0) {
    finalStatus = 'some projects were failed to download';
  } else {
    finalStatus = 'unknown error...';
  }

  updateCompletedInfo();
  updateStatusInfo(finalStatus);
  sendToRenderer(ew, 'update-ui-as-ready', null);

  if (appState.browser) {
    await closeBrowser(appState.browser);
  }
}

/* =============================================================
Task: Download images from parsed projects
============================================================= */

export async function downloadProjects() {
  const { downloadFolder } = userState;
  const ew = appState.electronWindow;

  if (!ew) {
    return;
  }

  for (const project of appState.projects) {
    if (appState.isAborted) break;
    
    try {
      let projectData = await gotoProjectPageAndCollectData(project);

      // Skip project if no data (can be caused by network errors)
      if (!projectData) {
        appState.projectsFailed += 1;
        updateCompletedInfo();
        console.log('gotoProjectPageAndCollectData(): Failed (projectData is undefined)');
        console.log('gotoProjectPageAndCollectData(): This can happen if project is for adults', );
        console.log('gotoProjectPageAndCollectData(): Use your Behance token and try again', );
        continue;
      }
  
      // Update project data with only project images (filter out other images)
      projectData = {
        ...projectData,
        projectImages: getProjectImagesFromParsedImages(projectData.projectImages)
      };
      
      const { projectId, projectUrl, projectImages } = projectData;
  
      // Download images of current project
      for (let i = 0; i < projectImages.length; i++) {
        if (appState.isAborted) {
          updateCompletedInfo();
          break;
        }
        
        updateStatusInfo(`downloading project ${projectId}, image: ${i + 1}/${projectImages.length}`);
        const imageUrl = projectImages[i];
        const imageFilePath = generateFilePathForImage(projectData, imageUrl, i + 1, downloadFolder);
        await downloadImage(projectData, imageUrl, imageFilePath);
        await wait(500);
      }
  
      if (!appState.isAborted) {
        appState.projectsCompleted += 1;
        updateCompletedInfo();
        await wait(2000);
  
        if (project.projectVariant === 'gallery') {
          appState.historyList.push(projectUrl);
          addProjectUrlToHistoryFile(projectUrl, userState.historyFile)
        }
      }

    } catch (error: any) {
      console.log('Unknown error in downloadProjects():', error?.message);
    }
  }
}

/* =============================================================
Launch processing task
============================================================= */

export async function launchProcessingTask(urls: Array<string>) {
  resetPlaywrightDataInState();

  appState.historyList = readTextFileToArray(userState.historyFile);
  createDirectoryIfNotExists(userState.downloadFolder);

  await launchBrowser();
  await wait(1000);
  await loadMainPage(false);
  await wait(1000);
  await auth();
  await wait(3000);
  await loadMainPage(true);
  await waitAfterAuth();
  await generateProjectsList(urls);
  await downloadProjects();
  await taskEnding();
}
