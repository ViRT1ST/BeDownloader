const { ipcRenderer } = require('electron');

const path = require('path');
const os = require('os');

const urlsInput = document.getElementById('urls-input');
const destInput = document.getElementById('destination-input');
const infoStatus = document.getElementById('information-status');
const infoCompleted = document.getElementById('information-completed');
const button = document.getElementById('start-btn');

destInput.value = path.join(os.homedir(), 'behance-downloads');

function updateUiAsRinning() {
  button.innerHTML = 'Cancel';
  button.classList.add('working');
}

function updateUiAsReady() {
  button.innerHTML = 'Download';
  button.classList.remove('working');
}

button.addEventListener('click', (e) => {
  if (e.target.classList.contains('working')) {
    infoStatus.innerHTML = '[failure] interrupted by user';
    ipcRenderer.send('task:abort');
    updateUiAsReady();
  } else {
    const dest = destInput.value.replace(/\\+/g, '/');
    const regex = /.net\/gallery\/|.net\/collection\//g;
    const urls = urlsInput.value.split('\n').filter((item) => regex.test(item));

    if (urls.length === 0) {
      infoStatus.innerHTML = '[error] list is empty';
    } else {
      infoStatus.classList = 'creating task ...';
      ipcRenderer.send('task:start', { dest, urls });
      updateUiAsRinning();
    }
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

ipcRenderer.on('task:done', () => {
  infoStatus.innerHTML = 'all images were downloaded successfully!';
  updateUiAsReady();
});


