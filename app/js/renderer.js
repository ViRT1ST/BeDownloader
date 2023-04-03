const { ipcRenderer } = require('electron');

const path = require('path');
const os = require('os');

const form = document.getElementById('app-form');
const userList = document.getElementById('urls-list');
const userDest = document.getElementById('dest-input');
const infoStatus = document.getElementById('info-status');
const infoCompleted = document.getElementById('info-completed');

userDest.value = path.join(os.homedir(), 'behance-downloads');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const dest = userDest.value.replace(/\\+/g, '/');
  const urls = userList.value.split('\n').filter((item) => {
    return /.net\/gallery\/|.net\/collection\//g.test(item);
  });

  ipcRenderer.send('form:start', { dest, urls });
});

ipcRenderer.on('puppeteer:start', (e, { start }) => {
  if (!start) {
    infoStatus.innerHTML = '[error] list is empty';
  }
});

ipcRenderer.on('moodboard:loading', (e, { id }) => {
  infoStatus.innerHTML = `loading moodboard ${id} ...`;
});

ipcRenderer.on('moodboard:scrolling', (e, { id }) => {
  infoStatus.innerHTML = `scrolling moodboard ${id} to get all projects ...`;
});

ipcRenderer.on('completed:update', (e, { done, total }) => {
  infoCompleted.innerHTML = `${done}/${total}`;
});

ipcRenderer.on('project:loading', (e, { id }) => {
  infoStatus.innerHTML = `loading project ${id} ...`;
});

ipcRenderer.on('project:download', (e, { id, current, total }) => {
  infoStatus.innerHTML = `downloading project ${id}, image: ${current}/${total}`;
});

ipcRenderer.on('form:done', () => {
  infoStatus.innerHTML = 'all images downloaded successfully.';
});

