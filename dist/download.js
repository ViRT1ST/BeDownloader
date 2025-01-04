import puppeteer from 'puppeteer';
import { userState } from './states/user.js';
import { puppeteerLaunchConfig, behanceConstants } from './configs/puppeteer.js';
import { appState, resetPuppeteerDataInState } from './states/app.js';
import { wait, sendToRenderer, formatUrlForUi, makeValidBehanceUrl, removeDuplicatesFromArray, removeItemsFromArray, getProjectImagesFromParsedImages, readTextFileToArray, closeBrowser, generateFilePathForImage, downloadImage, createDirectoryIfNotExists, disableRequestsForMediaFiles, addProjectUrlToHistoryFile, } from './utils.js';
/* =============================================================
Destructed Behance constants
============================================================= */
const { mainPageUrl, pageWaitOptions, pageSelectorToWait, pageTimeToWait, projectSelectors, betweenImagesDelay, authLocalStorageKey } = behanceConstants;
/* =============================================================
Create and launch browser
============================================================= */
export async function launchBrowser() {
    const options = {
        ...puppeteerLaunchConfig,
        headless: !userState.showBrowser,
    };
    appState.browser = await puppeteer.launch(options);
    appState.page = await appState.browser.newPage();
}
/* =============================================================
Puppeteer actions
============================================================= */
// Authenticate if user has token in config file
async function auth() {
    const ew = appState.electronWindow;
    const page = appState.page;
    const tokenKey = authLocalStorageKey;
    const tokenValue = userState.localStorageToken;
    if (!ew || !page || !tokenValue || !tokenValue.includes('REAUTH_SCOPE')) {
        return;
    }
    sendToRenderer(ew, 'update-status-info', {
        message: 'loading Behance main page...'
    });
    await page.goto(mainPageUrl, pageWaitOptions);
    await page.waitForSelector(pageSelectorToWait, pageTimeToWait);
    await wait(3000);
    sendToRenderer(ew, 'update-status-info', {
        message: 'authenticating...'
    });
    await page.evaluate((tokenKey, tokenValue) => {
        try {
            localStorage.setItem(tokenKey, tokenValue);
        }
        catch (error) {
            return;
        }
    }, tokenKey, tokenValue);
    // Reload main page
    await page.goto(mainPageUrl, pageWaitOptions);
    await wait(3000);
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
            const delayBetweenScrolls = 500;
            while (true) {
                const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
                // Scroll down
                window.scrollBy(0, scrollStep);
                // Delay
                await new Promise((resolve) => setTimeout(resolve, delayBetweenScrolls));
                // Exit if scroll has reached the bottom
                if (scrollTop + clientHeight >= scrollHeight) {
                    break;
                }
            }
        }
        catch (error) {
            return;
        }
    });
}
// Get projects urls from moodboard/profiles/likes pages
async function collectProjectsUrlsFromPage(url) {
    const ew = appState.electronWindow;
    const page = appState.page;
    if (!ew || !page) {
        return;
    }
    try {
        const shortPageUrl = `[${formatUrlForUi(url, 45)}]`;
        // Waiting page to load
        sendToRenderer(ew, 'update-status-info', {
            message: `loading page ${shortPageUrl} ...`
        });
        await page.goto(url, pageWaitOptions);
        await page.waitForSelector(pageSelectorToWait, pageTimeToWait);
        // Scrolling
        sendToRenderer(ew, 'update-status-info', {
            message: `scrolling page ${shortPageUrl} to get all projects ...`
        });
        await scrollToBottom();
        await wait(1000);
        // Getting projects urls
        return page.evaluate(async (projectSelectors) => {
            try {
                let foundUrls = [];
                for (const selector of projectSelectors) {
                    const selectorElements = Array.from(document.querySelectorAll(selector));
                    const selectorUrls = selectorElements
                        .map((element) => element.getAttribute('href'))
                        .filter((href) => href !== null)
                        .filter((href) => href.includes('/gallery/'));
                    foundUrls = [...foundUrls, ...selectorUrls];
                }
                return [...new Set(foundUrls)];
            }
            catch (error) {
                return;
            }
        }, projectSelectors);
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
            appState.projects.push(url);
        }
        else {
            const projectsUrls = await collectProjectsUrlsFromPage(url);
            if (projectsUrls) {
                const correctedUrls = projectsUrls.map((item) => makeValidBehanceUrl(item));
                appState.projects = [...appState.projects, ...correctedUrls];
            }
        }
        // Update total count
        appState.projectsTotal = appState.projects.length;
        // Update renderer
        sendToRenderer(ew, 'update-completed-info', {
            total: appState.projectsTotal,
            done: appState.projectsCompleted,
            skip: appState.projectsSkipped,
            fail: appState.projectsFailed
        });
    }
    // Remove duplicates
    appState.projects = removeDuplicatesFromArray(appState.projects);
    // Remove projects that are in history
    if (skipProjectsByHistory) {
        appState.projects = removeItemsFromArray(appState.projects, appState.historyList);
    }
    // Update skipped count
    appState.projectsSkipped = appState.projectsTotal - appState.projects.length;
    // Update renderer
    sendToRenderer(ew, 'update-completed-info', {
        total: appState.projectsTotal,
        done: appState.projectsCompleted,
        skip: appState.projectsSkipped,
        fail: appState.projectsFailed
    });
}
// Go to project page and collect data
async function gotoProjectPageAndCollectData(url) {
    const ew = appState.electronWindow;
    const page = appState.page;
    const id = url.split('/')[4];
    if (!ew || !page || !id) {
        return;
    }
    try {
        sendToRenderer(ew, 'update-status-info', {
            message: `loading project page [${id}] to collect its data and images...`
        });
        await page.goto(url, pageWaitOptions);
        await wait(3000);
        return page.evaluate((id, url) => {
            try {
                function getMetaProperty(propertyName) {
                    const selector = document.head.querySelector(`meta[property="${propertyName}"]`);
                    return selector ? selector.getAttribute('content') : '';
                }
                const projectTitle = getMetaProperty('og:title') || '';
                const projectOwners = getMetaProperty('og:owners') || '';
                const projectImages = Array.from(document.querySelectorAll('img'))
                    .map((item) => item.getAttribute('src'))
                    .filter((item) => item !== null);
                return {
                    projectTitle,
                    projectOwners,
                    projectImages,
                    projectUrl: url,
                    projectId: id,
                };
            }
            catch (error) {
                return;
            }
        }, id, url);
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
    const { isAborted, projectsTotal, projectsCompleted, projectsSkipped } = appState;
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
        finalStatus = 'all images were downloaded successfully!';
    }
    else {
        finalStatus = 'something went wrong...';
    }
    sendToRenderer(ew, 'update-status-info', { message: finalStatus });
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
        let projectData = await gotoProjectPageAndCollectData(project);
        // Skip project if no data (can be caused by network errors)
        if (!projectData) {
            appState.projectsFailed += 1;
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
            if (appState.isAborted)
                break;
            sendToRenderer(ew, 'update-status-info', {
                message: `downloading project ${projectId}, image: ${i + 1}/${projectImages.length}`
            });
            const imageUrl = projectImages[i];
            const imageFilePath = generateFilePathForImage(projectData, imageUrl, i + 1, downloadFolder);
            await downloadImage(projectData, imageUrl, imageFilePath);
            await wait(betweenImagesDelay);
        }
        if (!appState.isAborted) {
            appState.projectsCompleted += 1;
            appState.historyList.push(projectUrl);
            addProjectUrlToHistoryFile(projectUrl, userState.historyFile);
            sendToRenderer(ew, 'update-completed-info', {
                total: appState.projectsTotal,
                done: appState.projectsCompleted,
                skip: appState.projectsSkipped,
                fail: appState.projectsFailed
            });
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
    await auth();
    await generateProjectsList(urls);
    await downloadProjects();
    await taskEnding();
}
