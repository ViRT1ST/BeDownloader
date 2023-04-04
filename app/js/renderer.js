const { ipcRenderer } = require('electron');

const path = require('path');
const os = require('os');

const form = document.getElementById('form');
const urlsInput = document.getElementById('urls-input');
const destInput = document.getElementById('destination-input');
const infoStatus = document.getElementById('information-status');
const infoCompleted = document.getElementById('information-completed');
const button = document.getElementById('submit-btn');

destInput.value = path.join(os.homedir(), 'behance-downloads');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const dest = destInput.value.replace(/\\+/g, '/');
  const urls = urlsInput.value.split('\n').filter((item) => {
    return /.net\/gallery\/|.net\/collection\//g.test(item);
  });

  ipcRenderer.send('form:start', { dest, urls });
});

ipcRenderer.on('puppeteer:start', (e, { start }) => {
  if (start) {
    button.classList.add('disabled');
  } else {
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
  button.classList.remove('disabled');
});

