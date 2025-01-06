'use strict';

const { ipcRenderer } = window.require('electron');

const urlsInput = document.getElementById('urls-input') as HTMLTextAreaElement;
const destInput = document.getElementById('destination-input') as HTMLInputElement;
const destButton = document.getElementById('destination-btn') as HTMLButtonElement;
const infoStatus = document.getElementById('information-status') as HTMLSpanElement;
const infoCompleted = document.getElementById('information-completed') as HTMLSpanElement;
const submitButton = document.getElementById('start-btn') as HTMLButtonElement;

let isTaskRunning = false;

function updateUiAsReady() {
  urlsInput.classList.remove('disabled');
  destInput.classList.remove('disabled');
  destButton.classList.remove('disabled');
  submitButton.classList.remove('working');
  submitButton.innerHTML = 'Download';
}

function updateUiAsRunning() {
  urlsInput.classList.add('disabled');
  destInput.classList.add('disabled');
  destButton.classList.add('disabled');
  submitButton.classList.add('working');
  submitButton.innerHTML = 'Cancel';
}

function getCorrectedPathForOs(dest: string) {
  return !window.navigator.userAgent.includes('Windows')
    ? dest.replace(/\\+/g, '/')
    : dest;
}

function buildInfoCompleted(total: string, done: string, skip: string, fail: string) {
  const message = [
    `total projects: ${total}`,
    `completed: ${done}`,
    `skipped by history: ${skip}`,
    `skipped by errors: ${fail}`
  ].join(' | ');

  return message;
}

function handleStartClick() {
  isTaskRunning = true;

  const urls = urlsInput.value.split('\n')
    .filter((item) => item.includes('behance.net'));
  
  if (urls.length === 0) {
    infoStatus.innerHTML = 'no Behance URLs in the list';
    return;
  }

  infoStatus.innerHTML = 'launching browser ...';
  infoCompleted.innerHTML = buildInfoCompleted('...', '...', '...', '...');
  ipcRenderer.send('start-download-task', { urls });
  updateUiAsRunning();
}

function handleAbortClick() {
  isTaskRunning = false;
  
  infoStatus.innerHTML = 'downloading process interrupted by user';
  ipcRenderer.send('abort-download-task');
  updateUiAsReady();
}

/* =============================================================
Button listeners
============================================================= */

destButton.addEventListener('click', (event: MouseEvent) => {
  ipcRenderer.send('open-select-directory-dialog');
});

submitButton.addEventListener('click', (event: MouseEvent) => {
  if (isTaskRunning) {
    handleAbortClick();
  } else {
    handleStartClick();
  }
});

/* =============================================================
Sending events on UI load
============================================================= */

ipcRenderer.send('update-destination-folder');

/* =============================================================
Incoming events
============================================================= */

ipcRenderer.on('update-destination-folder', (event, { path }) => {
  destInput.value = getCorrectedPathForOs(path);
});

ipcRenderer.on('update-status-info', (event, { message }) => {
  infoStatus.innerHTML = message;
});

ipcRenderer.on('update-completed-info', (event, { total, done, skip, fail }) => {
  infoCompleted.innerHTML = buildInfoCompleted(total, done, skip, fail);
});

ipcRenderer.on('update-ui-as-ready', (event) => {
  isTaskRunning = false;
  updateUiAsReady();
});
