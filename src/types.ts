import { BrowserWindow } from 'electron';
import { Browser, Page } from 'puppeteer';

export type AppState = {
  electronWindow: BrowserWindow | null;
  browser: Browser | null;
  page: Page | null;
  projects: string[];
  projectsTotal: number;
  projectsSkipped: number;
  projectsCompleted: number;
  historyList: string[];
  isAborted: boolean;
};

export type UserState = {
  isLinux: boolean;
  isMac: boolean;
  isWin: boolean;
  settingsFolder: string;
  configFile: string;
  historyFile: string;
  downloadFolder: string;
  skipProjectsByHistory: boolean;
  showBrowser: boolean;
  betweenImagesDelay: number;
  localStorageToken: string;
};

export type UserStateIni = {
  downloadFolder: string;
  skipProjectsByHistory: boolean;
  showBrowser: boolean;
  betweenImagesDelay: number;
  localStorageToken: string;
};

export type ProjectData = {
  projectTitle: string;
  projectOwners: string;
  projectUrl: string;
  projectId: string;
  projectImages: string[];
};
