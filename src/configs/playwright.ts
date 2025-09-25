import * as path from 'node:path';
import * as fs from 'node:fs';

import { LaunchPersistentContextOptions } from '../types';

// [chrome-win64-131.0.6778.204]
// [chrome-win64-140.0.7339.16]
function getPortableChromeExecutablePath() {
  const portablePath = path.join(process.cwd(), '[chrome-win64-140.0.7339.16]', 'chrome.exe');
  return fs.existsSync(portablePath) ? portablePath : undefined;
} 
  
export const contextOptions: LaunchPersistentContextOptions = {
  channel: 'chrome',
  executablePath: getPortableChromeExecutablePath(),
  args: ['--start-maximized', '--disable-gpu'],
  headless: true,
  viewport: null,
  locale: 'en-US'
};

export const behanceConstants = {
  mainPageUrl: 'https://www.behance.net/',
  pageSelectorToWaitForMoodboards: '.collection-page-container',
  pageSelectorToWaitForProjects: '.Project-appreciateBottomIcon-jmk',
  pageSelectorTimeout: { timeout: 30000 },
  betweenPagesDelayDefault: 3000,
  betweenImagesDelay: 500,
  // Projects wrapper selectors
  gridSelectors: [
    '.ContentGrid-root-wzR',        // in profile and likes
    '.ImageGrid-gridWrapper-TSx',   // in moodboards
  ],
  // Projects items selectors
  projectSelectors: [
    '.ContentGrid-gridItem-XZq',    // in profile and likes
    '.GridItem-imageWrap-Hp0',      // in moodboards
  ],
  authLocalStorageKey: [
    'adobeid_ims_access_token/BehanceWebSusi1/false/AdobeID',
    'additional_info.roles',
    'be.pro2.external_client',
    'creative_cloud',
    'creative_sdk',
    'gnav',
    'ims_cai.social.read',
    'ims_cai.social.workplace.read',
    'ims_cai.verifiedId.read',
    'openid',
    'sao.cce_private'
  ].join(',')
};
