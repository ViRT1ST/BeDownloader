const { ipcRenderer } = require('electron');

const urlsInput = document.getElementById('urls-input');
const destInput = document.getElementById('destination-input');
const destButton = document.getElementById('destination-btn');
const infoStatus = document.getElementById('information-status');
const infoCompleted = document.getElementById('information-completed');
const button = document.getElementById('start-btn');

function updateUiAsRunning() {
  urlsInput.classList.add('disabled');
  destInput.classList.add('disabled');
  destButton.classList.add('disabled');
  button.innerHTML = 'Cancel';
  button.classList.add('working');
}

function updateUiAsReady() {
  urlsInput.classList.remove('disabled');
  destInput.classList.remove('disabled');
  destButton.classList.remove('disabled');
  button.innerHTML = 'Download';
  button.classList.remove('working');
}

function getCorrectedPath() {
  return navigator.userAgentData.platform !== 'Windows'
    ? destInput.value.replace(/\\+/g, '/')
    : destInput.value;
}

button.addEventListener('click', (e) => {
  if (e.target.classList.contains('working')) {
    infoStatus.innerHTML = '[failure] interrupted by user';
    ipcRenderer.send('task:abort');
    updateUiAsReady();
  } else {
    const dest = getCorrectedPath();
    const urls = urlsInput.value.split('\n')
      .filter((item) => item.includes('behance.net'))
      .map((item) => item.split('?')[0]);

    if (urls.length === 0) {
      infoStatus.innerHTML = '[error] list is empty';
    } else {
      infoCompleted.innerHTML = `
        total projects: ... | completed: ... | skipped by history: ...
      `;
      infoStatus.innerHTML = 'launching browser (takes 10-20 seconds if auth token used) ...';
      ipcRenderer.send('task:start', { dest, urls });
      updateUiAsRunning();
    }
  }
});

destButton.addEventListener('click', () => {
  ipcRenderer.send('dialog:directory');
});

ipcRenderer.send('settings:dest');

ipcRenderer.on('settings:dest', (e, { dest }) => {
  destInput.value = dest;
});

ipcRenderer.on('task:dest', (e, { dest }) => {
  destInput.value = dest;
});

ipcRenderer.on('page:loading', (e, { shortUrl }) => {
  infoStatus.innerHTML = `loading page ${shortUrl} ...`;
});

ipcRenderer.on('page:scrolling', (e, { shortUrl }) => {
  infoStatus.innerHTML = `scrolling page ${shortUrl} to get all projects ...`;
});

ipcRenderer.on('completed:update', (e, { done, total, skip }) => {
  infoCompleted.innerHTML = `
    total projects: ${total} | completed: ${done} | skipped by history: ${skip}
  `;
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

ipcRenderer.on('task:skipped', () => {
  infoStatus.innerHTML = '[error] no projects to download (all skipped by download history)';
  updateUiAsReady();
});
