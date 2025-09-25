// @ts-nocheck
import puppeteer from 'puppeteer';
import { userState } from './states/user.js';
import { puppeteerLaunchOptions, behanceConstants } from './configs/puppeteer.js';
import { appState, resetPuppeteerDataInState } from './states/app.js';
import { wait, sendToRenderer, getInstalledChromeExecutablePath, getInstalledChromeUserProfilePath, closeBrowser, disableRequestsForMediaFiles, closeAllOtherTabs, 
// openNewTabAndSetAsActive,
navigateToUrl, getProjectImagesFromParsedImages, makeValidBehanceUrl, formatUrlForUi, createDirectoryIfNotExists, readTextFileToArray, generateFilePathForImage, addProjectUrlToHistoryFile, downloadImage, } from './utils.js';
/* =============================================================
Destructed Behance constants
============================================================= */
const { mainPageUrl, betweenPagesDelayDefault, gridSelectors, projectSelectors, betweenImagesDelay, authLocalStorageKey } = behanceConstants;
/* =============================================================
Create and launch browser
============================================================= */
export async function launchBrowser() {
    const options = { ...puppeteerLaunchOptions };
    if (userState.showBrowser) {
        options.headless = false;
    }
    // Windows only and if user wants to use system installed Chrome
    const useInstalledChrome = userState.useSystemInstalledChrome;
    const winChromeExePath = getInstalledChromeExecutablePath();
    const winChromeProfilePath = getInstalledChromeUserProfilePath();
    if (useInstalledChrome && winChromeExePath && winChromeProfilePath) {
        options.executablePath = winChromeExePath;
        options.userDataDir = winChromeProfilePath;
    }
    appState.browser = await puppeteer.launch(options);
    appState.page = await appState.browser.newPage();
    await appState.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9'
    });
}
/* =============================================================
Electron update UI actions
============================================================= */
// Refresh completed info in electron UI with info from appState
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
// Update status info in electron UI with new message
function updateStatusInfo(message) {
    const ew = appState.electronWindow;
    if (!ew) {
        return;
    }
    console.log(message);
    sendToRenderer(ew, 'update-status-info', { message });
}
/* =============================================================
Puppeteer actions
============================================================= */
// Load main page
async function goToMainPage() {
    const ew = appState.electronWindow;
    const browser = appState.browser;
    const page = appState.page;
    if (!ew || !browser || !page) {
        return;
    }
    try {
        // await wait(1000);
        // await closeAllOtherTabs(browser, page);
        // await wait(1000);
        // Go to main page
        updateStatusInfo('loading Behance main page... (please wait)');
        await navigateToUrl(page, mainPageUrl, userState, behanceConstants);
        // await closeAllOtherTabs(appState);
    }
    catch (error) {
        return;
    }
}
// Authenticate if user has token in config file
async function auth() {
    const { turboMode, timeoutBetweenPagesInTurboMode } = userState;
    const ew = appState.electronWindow;
    const page = appState.page;
    const tokenKey = authLocalStorageKey;
    const tokenValue = userState.localStorageToken;
    if (!ew || !page || !tokenValue || !tokenValue.includes('REAUTH_SCOPE')) {
        return;
    }
    try {
        const timeout = turboMode ? timeoutBetweenPagesInTurboMode : betweenPagesDelayDefault;
        // Use user token
        updateStatusInfo('authenticating by user token... (please wait)');
        await page.evaluate(async (tokenKey, tokenValue) => {
            try {
                localStorage.setItem(tokenKey, tokenValue);
                location.reload();
            }
            catch (error) {
                return;
            }
        }, tokenKey, tokenValue);
        await wait(timeout);
    }
    catch (error) {
        return;
    }
}
// Scroll to bottom for moodboard/profiles/likes pages
async function scrollToBottom() {
    const page = appState.page;
    if (!page) {
        return;
    }
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
        }
        catch (error) {
            return;
        }
    });
    await wait(1000);
}
// Get projects urls from moodboard/profiles/likes pages
async function collectProjectsUrlsFromPage(url) {
    // await openNewTabAndSetAsActive(appState);
    await wait(500);
    const { downloadModulesAsGalleries } = userState;
    const ew = appState.electronWindow;
    const page = appState.page;
    if (!ew || !page) {
        return;
    }
    try {
        // Go to page
        updateStatusInfo(`loading page [${formatUrlForUi(url, 45)}] ...`);
        await navigateToUrl(page, url, userState, behanceConstants);
        // Scrolling
        updateStatusInfo(`scrolling moodboard to get all projects (can take some time)...`);
        await scrollToBottom();
        await wait(1000);
        // Getting projects urls
        const projectsUrls = await page.evaluate(async (gridSelectors, projectSelectors, downloadModulesAsGalleries) => {
            try {
                const foundProjects = [];
                // Get all grid elements
                const allFoundGrids = [];
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
                const projectElements = [];
                for (const selector of projectSelectors) {
                    const foundProjects = allFoundGrids
                        .flatMap((parent) => Array.from(parent.querySelectorAll(selector)));
                    projectElements.push(...foundProjects);
                }
                // Create object for each project
                for (const element of projectElements) {
                    const parent = element.parentElement;
                    const projectUrl = parent.querySelector('a')?.getAttribute('href');
                    const projectImage = parent.querySelector('img')?.getAttribute('src');
                    // Skip if project data is invalid
                    if (!projectUrl || !projectImage || !projectUrl.includes('/gallery/')) {
                        continue;
                    }
                    // Project object
                    const projectLink = {
                        projectVariant: 'gallery',
                        projectUrl,
                        projectImage
                    };
                    // sometimes projects are just one image and not are galleries
                    if (element.tagName === 'DIV' && parent.tagName !== 'ARTICLE') {
                        projectLink.projectVariant = 'image';
                    }
                    // if forced download modules as galleries
                    if (downloadModulesAsGalleries) {
                        projectLink.projectVariant = 'gallery';
                    }
                    foundProjects.push(projectLink);
                }
                return foundProjects;
            }
            catch (error) {
                // console.log(error.message);        
                return;
            }
        }, gridSelectors, projectSelectors, downloadModulesAsGalleries);
        // await closeAllOtherTabs(appState);
        return projectsUrls;
    }
    catch (error) {
        return;
    }
}
// Collect projects only URLs from all URLs pasted by user in input form
export async function generateProjectsList(urls) {
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
        }
        else {
            // Collect projects from moodbard/profile/likes page
            let projects = await collectProjectsUrlsFromPage(url);
            if (!projects) {
                appState.projectsFailed += 1;
                // console.log('collectProjectsUrlsFromPage(): failed');
                // console.log('collectProjectsUrlsFromPage():', projects);
            }
            else {
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
        const filteredProjects = [];
        for (const project of appState.projects) {
            const isInHistory = appState.historyList.includes(project.projectUrl);
            const isProjectVariantIsGallery = project.projectVariant === 'gallery';
            if (isInHistory && isProjectVariantIsGallery) {
                appState.projectsSkipped += 1;
            }
            else {
                filteredProjects.push(project);
            }
        }
        appState.projects = filteredProjects;
        // Update skipped count
        appState.projectsSkipped = appState.projectsTotal - appState.projects.length;
        updateCompletedInfo();
    }
}
// Go to project page and collect data
async function gotoProjectPageAndCollectData(projectLink) {
    await openNewTabAndSetAsActive(appState);
    await wait(500);
    const ew = appState.electronWindow;
    const page = appState.page;
    const id = projectLink.projectUrl.split('/')[4];
    if (!ew || !page || !id) {
        return;
    }
    try {
        // Go to project page
        updateStatusInfo(`loading project page [${id}] to collect its data and images...`);
        await navigateToUrl(page, projectLink.projectUrl, userState, behanceConstants);
        // Collect project data
        const projectData = await page.evaluate(async (id, projectLink) => {
            try {
                const { projectVariant, projectUrl, projectImage } = projectLink;
                function getMetaProperty(propertyName) {
                    const selector = document.head.querySelector(`meta[property="${propertyName}"]`);
                    return selector ? selector.getAttribute('content') : '';
                }
                // Adult content protection
                if (document.body.classList.contains('is-locked')) {
                    return;
                }
                const projectTitle = getMetaProperty('og:title') || '';
                const projectOwners = getMetaProperty('og:owners') || '';
                const projectImages = [];
                if (projectVariant === 'image') {
                    projectImages.push(projectImage);
                }
                else {
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
            }
            catch (error) {
                return;
            }
        }, id, projectLink);
        await closeAllOtherTabs(appState);
        return projectData;
    }
    catch (error) {
        return;
    }
}
async function taskEnding() {
    const ew = appState.electronWindow;
    if (!ew) {
        return;
    }
    const { isAborted, projectsTotal, projectsCompleted, projectsSkipped, projectsFailed } = appState;
    let finalStatus = '';
    if (isAborted) {
        finalStatus = 'process is aborted by user';
    }
    else if (projectsTotal === 0) {
        finalStatus = 'no projects to download';
    }
    else if (projectsTotal === projectsSkipped) {
        finalStatus = 'all projects skipped by download history';
    }
    else if (projectsTotal === projectsCompleted + projectsSkipped) {
        finalStatus = 'all projects were downloaded successfully!';
    }
    else if (projectsFailed > 0) {
        finalStatus = 'some projects were failed to download';
    }
    else {
        finalStatus = 'unknown error...';
    }
    updateCompletedInfo();
    updateStatusInfo(finalStatus);
    sendToRenderer(ew, 'update-ui-as-ready', null);
    await closeBrowser(appState.browser);
}
export async function downloadProjects() {
    const { downloadFolder } = userState;
    const ew = appState.electronWindow;
    if (!ew) {
        return;
    }
    for (const project of appState.projects) {
        if (appState.isAborted)
            break;
        try {
            let projectData = await gotoProjectPageAndCollectData(project);
            // Skip project if no data (can be caused by network errors)
            if (!projectData) {
                appState.projectsFailed += 1;
                updateCompletedInfo();
                console.log('gotoProjectPageAndCollectData(): Failed (projectData is undefined)');
                console.log('gotoProjectPageAndCollectData(): This can happen if project is for adults');
                console.log('gotoProjectPageAndCollectData(): Use your Behance token and try again');
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
                await wait(betweenImagesDelay);
            }
            if (!appState.isAborted) {
                appState.projectsCompleted += 1;
                updateCompletedInfo();
                if (project.projectVariant === 'gallery') {
                    appState.historyList.push(projectUrl);
                    addProjectUrlToHistoryFile(projectUrl, userState.historyFile);
                }
            }
        }
        catch (error) {
            console.log('Unknown error in downloadProjects():', error?.message);
        }
    }
}
/* =============================================================
Run download task
============================================================= */
export async function runDownloadTask(urls) {
    resetPuppeteerDataInState();
    appState.historyList = readTextFileToArray(userState.historyFile);
    createDirectoryIfNotExists(userState.downloadFolder);
    await launchBrowser();
    await disableRequestsForMediaFiles(appState.page);
    await goToMainPage();
    await auth();
    await generateProjectsList(urls);
    await downloadProjects();
    await taskEnding();
}
