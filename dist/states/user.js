import * as path from 'node:path';
import * as fs from 'node:fs';
import * as ini from 'ini';
import { createDirectoryIfNotExists, createFileIfNotExists } from '../utils.js';
const platform = process.platform.toString();
/* =============================================================
User state
============================================================= */
export const userState = {
    isLinux: platform === 'linux',
    isMac: platform === 'darwin',
    isWin: platform === 'win32',
    settingsFolder: path.join(process.cwd(), 'settings'),
    configFile: path.join(process.cwd(), 'settings', 'config.ini'),
    historyFile: path.join(process.cwd(), 'settings', 'history.txt'),
    downloadFolder: path.join(process.cwd(), 'downloads'),
    skipProjectsByHistory: false,
    showBrowser: false,
    localStorageToken: 'none',
};
/* =============================================================
Functions for loading and saving user state
============================================================= */
// Reading user-modifiable fields from config file
export function loadUserSettingsFromFile() {
    try {
        const isConfigFileExists = fs.existsSync(userState.configFile);
        if (!isConfigFileExists) {
            return;
        }
        const settingsFileData = fs.readFileSync(userState.configFile, 'utf-8');
        // ini.parse() parses all values as strings, except booleans and null
        const iniObject = ini.parse(settingsFileData);
        const mainSection = iniObject.main;
        // load user fields
        if (typeof mainSection.downloadFolder === 'string') {
            const userSavedDownloadFolder = mainSection.downloadFolder;
            if (fs.existsSync(userSavedDownloadFolder)) {
                userState.downloadFolder = mainSection.downloadFolder;
            }
        }
        if (typeof mainSection.skipProjectsByHistory === 'boolean') {
            userState.skipProjectsByHistory = mainSection.skipProjectsByHistory;
        }
        if (typeof mainSection.showBrowser === 'boolean') {
            userState.showBrowser = mainSection.showBrowser;
        }
        if (typeof mainSection.localStorageToken === 'string') {
            userState.localStorageToken = mainSection.localStorageToken;
        }
    }
    catch (error) {
        console.log(error.message);
    }
}
;
// Saving user-modifiable fields to config file
export function saveUserSettingsToFile() {
    createDirectoryIfNotExists(userState.settingsFolder);
    const configToSave = {
        downloadFolder: userState.downloadFolder,
        skipProjectsByHistory: userState.skipProjectsByHistory,
        showBrowser: userState.showBrowser,
        localStorageToken: userState.localStorageToken
    };
    const stringsToSave = ini.stringify(configToSave, { section: 'main' });
    fs.writeFileSync(userState.configFile, stringsToSave);
}
// Create user files if they don't exist
export function createUserFilesIfTheyDontExist() {
    if (!fs.existsSync(userState.configFile)) {
        saveUserSettingsToFile();
    }
    if (!fs.existsSync(userState.historyFile)) {
        createFileIfNotExists(userState.historyFile);
    }
}
