const { ipcRenderer } = require('electron');

const path = require('path');
const os = require('os');

const form = document.getElementById('image-form');

const userList = document.getElementById('urls-list');
const userDest = document.getElementById('destination-input');

const infoLinks = document.getElementById('info-links');
const infoCompleted = document.getElementById('info-completed');
const infoImages = document.getElementById('info-images');
const infoAction = document.getElementById('info-action');

const defaultDest = path.join(os.homedir(), 'behance-downloads');
userDest.placeholder = defaultDest;

form.addEventListener('submit', (e) => {
  e.preventDefault();

  if (userDest.value === '') {
    userDest.value = defaultDest;
  }

  const dest = userDest.value.replace(/\\+/g, '/');
  const urls = userList.value.split('\n').filter((item) => {
    const regex = /.net\/gallery\/|.net\/collection\//g;
    return regex.test(item);
  });

  ipcRenderer.send('action:start', { dest, urls });
});

function getLinksCounts() {
  const counts = {
    moodborads: 0,
    projects: 0,
    total: 0,
  };

  const urls = userList.value.split('\n');
  urls.forEach((url) => {
    if (url.includes('behance.net/collection/')) {
      counts.moodborads += 1;
      counts.total += 1;
    }
    if (url.includes('behance.net/gallery/')) {
      counts.projects += 1;
      counts.total += 1;
    }
  });

  return counts;
}

userList.addEventListener('input', () => {
  const counts = getLinksCounts();
  if (counts.total > 0) {
    infoLinks.innerHTML = `${counts.total} [
      moodboards: ${counts.moodborads},
      projects: ${counts.projects}
    ]`;
  } else {
    infoLinks.innerHTML = 'none';
  }
});

ipcRenderer.on('action:puppeteer', (e, data) => {
  if (data.start) {
    infoAction.innerHTML = 'launching headless browser for parsing ...';
  } else {
    infoAction.innerHTML = '[error] list is empty';
  }
});

ipcRenderer.on('action:mbloading', (e, data) => {
  infoAction.innerHTML = `loading moodboard ${data.id} ...`;
});

ipcRenderer.on('action:mbscrolling', (e, data) => {
  infoAction.innerHTML = `scrolling moodboard ${data.id} to get all projects ...`;
});

ipcRenderer.on('action:completed', (e, data) => {
  const { done, total } = data;

  infoCompleted.innerHTML = `${done}/${total}`;
});

ipcRenderer.on('action:images', (e, data) => {
  infoImages.innerHTML = data.count;
});

ipcRenderer.on('action:prloading', (e, data) => {
  infoAction.innerHTML = `loading project ${data.id} ...`;
});

ipcRenderer.on('action:prdownload', (e, data) => {
  const { id, current, total } = data;
  infoAction.innerHTML = `downloading project ${id}, image: ${current}/${total}`;
});

ipcRenderer.on('action:done', () => {
  infoAction.innerHTML = 'all images downloaded successfully.';
});

