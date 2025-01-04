import * as path from 'node:path';
import * as fs from 'node:fs';
import { WaitForOptions } from 'puppeteer';

function getExecutablePath() {
  const portablePath = path.join(process.cwd(), '[chrome-win64-131.0.6778.204]', 'chrome.exe');
  return fs.existsSync(portablePath) ? portablePath : undefined;
} 
  
export const puppeteerLaunchConfig = {
  args: ['--start-maximized'],
  defaultViewport: { width: 1920, height: 1080 },
  executablePath: getExecutablePath()
};

export const behanceConstants = {
  mainPageUrl: 'https://www.behance.net/',
  pageSelectorToWait: '.SearchTypeahead-searchInput-BMV',
  pageTimeToWait: { timeout: 60000 },
  pageWaitOptions: { waitUntil: 'networkidle0', timeout: 0 } as WaitForOptions,
  betweenImagesDelay: 500,
  projectSelectors: [
    '.GridItem-coverLink-YQ8',            // Moodboard items
    '.e2e-ProjectCoverNeue-link',         // Profile items
    '.ContentGrid-gridItem-XZq',          // Liked items
    '.ImageModuleContent-mainImage-IG1'   // Image items
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
