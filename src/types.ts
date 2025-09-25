import { BrowserWindow } from 'electron';
import { BrowserType, chromium, BrowserContext, Page } from 'playwright';

export type LaunchPersistentContextOptions =
  Parameters<(typeof chromium)['launchPersistentContext']>[1];

export type AppState = {
  electronWindow: BrowserWindow | null;
  browser: BrowserContext | null;
  page: Page | null;
  projects: ProjectLink[];
  projectsTotal: number;
  projectsSkipped: number;
  projectsCompleted: number;
  projectsFailed: number;
  historyList: string[];
  isAborted: boolean;
};

export type UserState = {
  isWindows: boolean;
  isLinux: boolean;
  isMac: boolean;
  settingsFolder: string;
  configFile: string;
  historyFile: string;
  downloadFolder: string;
  skipProjectsByHistory: boolean;
  downloadModulesAsGalleries: boolean;
  showBrowser: boolean;
  useSystemInstalledChrome: boolean;
  turboMode: boolean;
  timeoutBetweenPagesInTurboMode: number;
  localStorageToken: string;
};

export type UserStateIni = {
  downloadFolder: string;
  skipProjectsByHistory: boolean;
  showBrowser: boolean;
  localStorageToken: string;
};

export type ProjectLink = {
  projectVariant: 'gallery' | 'image';
  projectUrl: string;
  projectImage: string;
};

export type ProjectData = {
  projectTitle: string;
  projectOwners: string;
  projectUrl: string;
  projectId: string;
  projectImages: string[];
};

export type BehanceConstants = {
  mainPageUrl: string
  pageSelectorToWaitForMoodboards: string;
  pageSelectorToWaitForProjects: string;
  pageSelectorTimeout: { timeout: number };
  // pageWaitOptionsMainPage: WaitForOptions;
  // pageWaitOptionsDefault: WaitForOptions,
  // pageWaitOptionsTurbo: WaitForOptions,
  betweenPagesDelayDefault: number;
  betweenImagesDelay: number;
  gridSelectors: string[];
  projectSelectors: string[];
  authLocalStorageKey: string;
};

