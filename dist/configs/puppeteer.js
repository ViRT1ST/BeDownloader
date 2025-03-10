import * as path from 'node:path';
import * as fs from 'node:fs';
function getExecutablePath() {
    const portablePath = path.join(process.cwd(), '[chrome-win64-131.0.6778.204]', 'chrome.exe');
    return fs.existsSync(portablePath) ? portablePath : undefined;
}
export const puppeteerLaunchOptions = {
    args: ['--start-maximized', '--disable-gpu'],
    defaultViewport: { width: 1920, height: 1080 },
    executablePath: getExecutablePath(),
    headless: true,
};
export const behanceConstants = {
    mainPageUrl: 'https://www.behance.net/',
    pageSelectorToWait: '.SearchTypeahead-searchInput-BMV',
    pageSelectorTimeout: { timeout: 30000 },
    pageWaitOptionsDefault: { waitUntil: 'networkidle0', timeout: 0 },
    pageWaitOptionsTurbo: { waitUntil: 'domcontentloaded', timeout: 0 },
    betweenPagesDelayDefault: 3000,
    betweenImagesDelay: 500,
    // Projects wrapper selectors
    gridSelectors: [
        '.ContentGrid-root-wzR', // in profile and likes
        '.ImageGrid-gridWrapper-TSx', // in moodboards
    ],
    // Projects items selectors
    projectSelectors: [
        '.ContentGrid-gridItem-XZq', // in profile and likes
        '.GridItem-imageWrap-Hp0', // in moodboards
    ],
    authLocalStorageKey: [
        'adobeid_ims_access_token/BehanceWebSusi1/false/AdobeID',
        'additional_info.roles',
        'be.pro2.external_client',
        'creative_cloud',
        'creative_sdk',
        'gnav',
        'openid',
        'sao.cce_private'
    ].join(',')
};
