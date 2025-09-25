import * as stream from 'node:stream';
import * as path from 'node:path';
import * as util from 'node:util';
import * as fs from 'node:fs';
import * as os from 'node:os';

import { BrowserWindow } from 'electron';
import { Page, BrowserContext } from 'playwright';
import { transliterate } from 'transliteration';
import piexif, { TagValues, IExifElement, IExif } from 'piexif-ts';
import fetch from 'node-fetch';

import type { ProjectData, UserState, BehanceConstants, AppState } from './types.js';

/* =============================================================
Promises utils
============================================================= */

// Waiting function for delaying between actions
export async function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/* =============================================================
Electron utils
============================================================= */

// Send message to renderer (electron frontend ui)
export function sendToRenderer(electronWindow: BrowserWindow, channel: string, data: any) {
  if (electronWindow) {
    electronWindow.webContents.send(channel, data);
  }
}

/* =============================================================
Playwright utils
============================================================= */

// Get path of installed Chrome executable (Windows only)
export function getInstalledChromeExecutablePath() {
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];

  for (const path of paths) {
    if (fs.existsSync(path)) {
      return path;
    }
  }

  return null;
}

// Get path of installed Chrome user profile (Windows only)
export function getInstalledChromeUserProfilePath() {
  const path = `C:\\Users\\${os.userInfo().username}\\AppData\\Local\\Google\\Chrome\\User Data`;
  return fs.existsSync(path) ? path : null;
}

// Prefer way to close browser
export async function closeBrowser(browser: BrowserContext) {
  if (browser) {
    try {
      await browser.close();

    } catch (error: any) {
      console.log(`Failed to close browser | ${error?.message}`);
    }
  }
}

// Disable unwanted requests for current page
export async function disableUnwantedRequests(page: Page | null) {
  if (!page) {
    return;
  }

  try {
    await page.route('**/*', route => {
      const type = route.request().resourceType();
      const blocked = ['image', 'media', 'stylesheet', 'font'];
      if (blocked.includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    })

  } catch (error: any) {
    console.log(`Failed to disable unwanted requests for current page | ${error?.message}`);
  }
}

// Set extra HTTP headers for current page
export async function setExtraHTTPHeaders(page: Page | null) {
  if (!page) {
    return;
  }

  try {
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });

  } catch (error: any) {
    console.log(`Failed to disable unwanted requests for current page | ${error?.message}`);
  }
}

/* =============================================================
Common arrays utils
============================================================= */

// Remove duplicates from array
export function removeDuplicatesFromArray(array: any[]) {
  return [...new Set(array)];
}

// Remove items from array
export function removeItemsFromArray<T>(array: T[], itemsToRemove: T[]) {
  return array.filter((item) => !itemsToRemove.includes(item));
}

/* =============================================================
Arrays with urls utils
============================================================= */

// Get project images only from all parsed images of project page
export function getProjectImagesFromParsedImages(parsedImages: string[]) {
  function checkImageUrl(url: string) {
    const badUrls = [
      'static.kuula.io',
      'files.kuula.io/users/',
      'files.kuula.io/profiles/',
      'cdn.cp.adobe.io'
    ];
  
    if (typeof url !== 'string') {
      return false;
    }
  
    const jpegOrPngOrGif = /\.jpe?g|png|gif$/i.test(url);
    const notBadUrl = !badUrls.some((item) => url.includes(item));
    const notBase64 = !/base64/i.test(url);
    const projectModule = /\/project_modules\//i.test(url);
    const externalImage = !/behance\.net/i.test(url);
    const goodSource = (projectModule || externalImage);
  
    return jpegOrPngOrGif && notBadUrl && notBase64 && goodSource;
  }

  const projectImages = parsedImages
    .filter(checkImageUrl)
    .map((item) => item.split('?')[0])
    .map((item) => item.includes('/project_modules/')
        ? item.replace(/([\w.-]+)(\/[\w.-]+)$/, 'source$2')
        : item
    );

  return [...new Set(projectImages)];
}

/* =============================================================
String formating utils
============================================================= */

// Get new line symbol for Windows
function getNewLineSymbol() {
  return os.EOL;
}

// Format number to string with two digits
export function addZeroForNumberLessTen(number: number) {
  return number.toLocaleString('en-US', { minimumIntegerDigits: 2 });
}

// Replace all non english symbols by another symbol
export function replaceNonEnglishBySymbol(string: string, symbol: string) {
  return string.replace(/[^a-zA-Z0-9]/g, symbol);
}

// Remove multiple dashes
export function removeMultipleDashes(string: string) {
  return string.replace(/-+/g, '-');
}

// Transliterate to latin
export function convertToLatinized(string: string) {
  return transliterate(string);
}

// Convert string to latinized words with dash separator (url-friendly)
export function convertToLatinizedKebab(string: string) {
  string = convertToLatinized(string);
  string = replaceNonEnglishBySymbol(string, '-');
  string = removeMultipleDashes(string);
  return string.toLowerCase();
}

// Correct behance urls if domain is not included and remove url params
export function makeValidBehanceUrl(url: string) {
  if (!url.includes('behance.net/')) {
    url = `https://www.behance.net${url}`;
  }

  return url.split('?')[0];
}

// Format supported behance urls for display in ui status
export function formatUrlForUi(url: string, max: number): string {
  try {
    const parts = url.split('/');

    if (parts.length < 5) {
      return url;
    }

    let urlFormattedForUi = parts.slice(3).join('/').split('?')[0];

    if (urlFormattedForUi.length >= max) {
      urlFormattedForUi = urlFormattedForUi.substring(0, max - 3) + '...';
    } 

    return urlFormattedForUi;

  } catch (error) {
    return url;
  }
}

/* =============================================================
Files utils
============================================================= */

// Create directory if not exists
export function createDirectoryIfNotExists(filePath: string) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath, { recursive: true });
  }
}

// Create file if not exists
export function createFileIfNotExists(filePath: string) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf8');
  }
}

// Read text file to array
export function readTextFileToArray(filePath: string) {
  let linesArray: string[] = [];

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    linesArray = fileContent.trim().split(getNewLineSymbol());

  } catch (error: any) {
    console.log(`Error reading text file to array | ${error?.message}`);
  }

  return linesArray;
}

// Write array to text file
export function writeArrayToTextFile(fileName: string, array: any[]) {
  try {
    const lines = array.join(getNewLineSymbol()).trim();
    fs.writeFileSync(fileName, lines);

  } catch (error: any) {
    console.log(`Error writing array to text file | ${error?.message}`);
  }
}

// Generate file path for download image
export function generateFilePathForImage(
  projectData: ProjectData,
  imageUrl: string,
  index: number,
  folderPath: string
) {
  const { projectTitle, projectOwners } = projectData;

  const prefix = 'behance-';
  const firstOwner = convertToLatinizedKebab(projectOwners.split(', ')[0]);
  const title = convertToLatinizedKebab(projectTitle);
  const number = addZeroForNumberLessTen(index);
  const extension = imageUrl.split('.').pop();

  let fileName = `${prefix}-${firstOwner}-${title}-${number}.${extension}`;
  fileName = removeMultipleDashes(fileName);

  return path.join(folderPath, fileName);
}

// Download file and save it on disk
export async function downloadFileToDisk(url: string, filePath: string) {
  try {
    const streamPipeline = util.promisify(stream.pipeline);
    const res = await fetch(url);
  
    // Check if the response is ok
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }
  
    // Check if the response has a body
    if (!res.body) {
      throw new Error(`Response body is null for ${url}`);
    }
  
    // Save response body to the file
    await streamPipeline(res.body, fs.createWriteStream(filePath));

  } catch (error: any) {
    console.log(`Error downloading file | ${error?.message}`);
  }
}

function getFileSizeInKB(filePath: string) {
  try {
    const sizeInBytes = fs.statSync(filePath).size;
    return (sizeInBytes / 1024).toFixed(2);

  } catch (error) {
    return '';
  }
}

// Save project url in history file
export function addProjectUrlToHistoryFile(projectUrl: string, historyFile: string) {
  const currentHistoryUrls = readTextFileToArray(historyFile);

  if (!currentHistoryUrls.includes(projectUrl)) {
    currentHistoryUrls.push(projectUrl);
    writeArrayToTextFile(historyFile, currentHistoryUrls);
  }
}

/* =============================================================
Images utils
============================================================= */

// Prepare json with project information for saving it into jpeg file
function createImageDescriptionForExif(projectData: ProjectData, imageUrl: string) {
  return JSON.stringify({
    site: 'Behance',
    id: projectData.projectId,
    title: convertToLatinized(projectData.projectTitle),
    owners: convertToLatinized(projectData.projectOwners),
    url: projectData.projectUrl,
    image: imageUrl
  });
}

// Write json into jpeg file
export function writeJsonIntoImageDescription(json: string, filePath: string) {
  if (typeof json !== 'string' || !/\.jpe?g$/i.test(filePath)) {
    return;
  }

  try {
    // Read exif data from file
    const fileAsBinaryString = fs.readFileSync(filePath).toString('binary');
    let exifData: IExif = piexif.load(fileAsBinaryString);

     // Create new fields with project information if there is no exif data at all
    if (Object.keys(exifData).length === 0) {
      const newZeroth: IExifElement = {};
      newZeroth[TagValues.ImageIFD.ImageDescription] = json;
      newZeroth[TagValues.ImageIFD.Software] = 'BeDownloader app by ViRT1ST';
      exifData = {'0th': newZeroth};

    // Otherwise update the description tag only 
    } else {
      const existingZeroth = exifData['0th'] as IExifElement;
      existingZeroth[TagValues.ImageIFD.ImageDescription] = json;
    }

    // Dump updated exif data and insert it into the image
    const newExifBinary = piexif.dump(exifData);
    const newPhotoData = piexif.insert(newExifBinary, fileAsBinaryString);

    // Write updated image back to file
    const fileBuffer = Buffer.from(newPhotoData, 'binary');
    fs.writeFileSync(filePath, fileBuffer);

  } catch (error: any) {
    console.log(`Error updating image with new EXIF data | ${error?.message}`);
  }
}

// Download image and save it to destination folder
export async function downloadImage(
  projectData: ProjectData,
  imageUrl: string,
  imageFilePath: string
) {
  try {
    // Create temp file path 
    const tempFileExt = path.parse(imageFilePath).ext;
    const tempFilePath = path.join(path.dirname(imageFilePath), `temp-image${tempFileExt}`);

    // Download image as temp file
    await downloadFileToDisk(imageUrl, tempFilePath);

    // Create json with project information and write it into temp file 
    const jsonData = createImageDescriptionForExif(projectData, imageUrl);
    writeJsonIntoImageDescription(jsonData, tempFilePath);

    // Booleans for checking
    const isTempFileExists = fs.existsSync(tempFilePath);
    const isImageFileExists = fs.existsSync(imageFilePath);
    const tempFileSize = getFileSizeInKB(tempFilePath);
    const imageFileSize = getFileSizeInKB(imageFilePath);
    const isTempFileSameSizeAsImageFile = tempFileSize === imageFileSize;

    // If destination file doesn't exist
    // Rename temp file to destination file
    if (isTempFileExists && !isImageFileExists) {
      fs.renameSync(tempFilePath, imageFilePath);
      return;
    }

    // If destination file and temp file both exists and have same size
    // Delete existing file and rename temp file to destination file
    if (isTempFileExists && isImageFileExists && isTempFileSameSizeAsImageFile) {
      fs.unlinkSync(imageFilePath);
      fs.renameSync(tempFilePath, imageFilePath);
      return;
    }

    // If destination file and temp file both exists and have not same size
    // Rename temp file to destination file with next ending number
    if (isTempFileExists && isImageFileExists && !isTempFileSameSizeAsImageFile) {
      const existFilePatternArr = path.parse(imageFilePath).name.split('-').slice(0, -1);
      const existFilePatternStr = existFilePatternArr.join('-');

      const existFilesWithPattern = fs
        .readdirSync(path.dirname(imageFilePath))
        .filter((item) => item.startsWith((existFilePatternStr)));

      const lastFile = existFilesWithPattern.pop()!;
      const { name, ext } = path.parse(lastFile);
      const lastDigit = parseInt(name.split('-').pop()!, 10);
      const nextDigit = addZeroForNumberLessTen(lastDigit + 1);
      const newFileName = `${existFilePatternStr}-${nextDigit}${ext}`;
      const newFilePath = path.join(path.dirname(imageFilePath), newFileName);

      fs.renameSync(tempFilePath, newFilePath);
    }
  } catch (error: any) {
    console.log(`Error processing downloaded image | ${error?.message}`);
  }
}
