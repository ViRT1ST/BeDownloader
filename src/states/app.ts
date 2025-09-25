import type { AppState } from '../types.js';

// State with initial values
export const appState: AppState = {
  electronWindow: null,
  browser: null,
  page: null,
  projects: [],
  projectsTotal: 0,
  projectsCompleted: 0,
  projectsSkipped: 0,
  projectsFailed: 0,
  historyList: [],
  isAborted: false
};

// Reset playwright and downloads related data
export function resetPlaywrightDataInState() {
  appState.browser = null;
  appState.page = null;
  appState.projects = [];
  appState.projectsTotal = 0;
  appState.projectsCompleted = 0;
  appState.projectsSkipped = 0;
  appState.projectsFailed = 0;
  appState.historyList = [];
  appState.isAborted = false;
}