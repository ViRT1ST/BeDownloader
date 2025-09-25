import * as path from 'node:path';

export const electronSettings = {
  title: 'BeDownloader 3.0.0',
  width: 800,
  height: 600,
  icon: path.join(process.cwd(), 'dist', 'static', 'icons', 'Icon_128x128.png'),
  resizable: true,
  autoHideMenuBar: true,
  webPreferences: {
    contextIsolation: false,
    nodeIntegration: true,
  }
};

export const pathToIndexHtml = path.join(process.cwd(), 'dist', 'static', 'index.html');