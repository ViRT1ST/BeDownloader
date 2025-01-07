import { BrowserWindow } from 'electron';
import { Browser, Page } from 'puppeteer';

export type AppState = {
  electronWindow: BrowserWindow | null;
  browser: Browser | null;
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
