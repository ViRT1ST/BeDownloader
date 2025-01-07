import * as stream from 'node:stream';
import * as path from 'node:path';
import * as util from 'node:util';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { transliterate } from 'transliteration';
import piexif, { TagValues } from 'piexif-ts';
import fetch from 'node-fetch';
/* =============================================================
Electron utils
============================================================= */
// Send message to renderer (electron frontend ui)
export function sendToRenderer(electronWindow, channel, data) {
    if (electronWindow) {
        electronWindow.webContents.send(channel, data);
    }
}
/* =============================================================
Puppeteer utils
============================================================= */
// Kill browser process (causing errors in console)
export async function killPuppeteer(browser) {
    try {
        const browserProcess = browser?.process();
        if (browserProcess) {
            browserProcess.kill();
        }
    }
    catch (error) {
        console.log(`Failed to kill browser process | ${error?.message}`);
    }
}
// Prefer way to close browser
export async function closeBrowser(browser) {
    if (browser) {
        try {
            await browser.close();
        }
        catch (error) {
            console.log(`Failed to close browser | ${error?.message}`);
        }
    }
}
// Disable requests for media files for current page
export async function disableRequestsForMediaFiles(page) {
    if (!page) {
        return;
    }
    try {
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (/^(image|media)$/.test(req.resourceType())) {
                req.abort();
            }
            else {
                req.continue();
            }
        });
    }
    catch (error) {
        console.log(`Failed to disable requests for media files | ${error?.message}`);
    }
}
/* =============================================================
Promises utils
============================================================= */
// Waiting function for delaying between actions
export async function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
/* =============================================================
Common arrays utils
============================================================= */
// Remove duplicates from array
export function removeDuplicatesFromArray(array) {
    return [...new Set(array)];
}
// Remove items from array
export function removeItemsFromArray(array, itemsToRemove) {
    return array.filter((item) => !itemsToRemove.includes(item));
}
/* =============================================================
Arrays with urls utils
============================================================= */
// Get project images only from all parsed images of project page
export function getProjectImagesFromParsedImages(parsedImages) {
    function checkImageUrl(url) {
        const badUrls = [
            'static.kuula.io',
            'files.kuula.io/users/',
            'files.kuula.io/profiles/',
            'cdn.cp.adobe.io'
        ];
        if (typeof url !== 'string') {
            return false;
        }
        const jpegOrPng = /\.jpe?g|png$/i.test(url);
        const notBadUrl = !badUrls.some((item) => url.includes(item));
        const notBase64 = !/base64/i.test(url);
        const projectModule = /\/project_modules\//i.test(url);
        const externalImage = !/behance\.net/i.test(url);
        const goodSource = (projectModule || externalImage);
        return jpegOrPng && notBadUrl && notBase64 && goodSource;
    }
    const projectImages = parsedImages
        .filter(checkImageUrl)
        .map((item) => item.split('?')[0])
        .map((item) => item.includes('/project_modules/')
        ? item.replace(/([\w.-]+)(\/[\w.-]+)$/, 'source$2')
        : item);
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
export function addZeroForNumberLessTen(number) {
    return number.toLocaleString('en-US', { minimumIntegerDigits: 2 });
}
// Replace all non english symbols by another symbol
export function replaceNonEnglishBySymbol(string, symbol) {
    return string.replace(/[^a-zA-Z0-9]/g, symbol);
}
// Remove multiple dashes
export function removeMultipleDashes(string) {
    return string.replace(/-+/g, '-');
}
// Transliterate to latin
export function convertToLatinized(string) {
    return transliterate(string);
}
// Convert string to latinized words with dash separator (url-friendly)
export function convertToLatinizedKebab(string) {
    string = convertToLatinized(string);
    string = replaceNonEnglishBySymbol(string, '-');
    string = removeMultipleDashes(string);
    return string.toLowerCase();
}
// Correct behance urls if domain is not included and remove url params
export function makeValidBehanceUrl(url) {
    if (!url.includes('behance.net/')) {
        url = `https://www.behance.net${url}`;
    }
    return url.split('?')[0];
}
// Format supported behance urls for display in ui status
export function formatUrlForUi(url, max) {
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
    }
    catch (error) {
        return url;
    }
}
/* =============================================================
Files utils
============================================================= */
// Create directory if not exists
export function createDirectoryIfNotExists(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
    }
}
// Create file if not exists
export function createFileIfNotExists(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '', 'utf8');
    }
}
// Read text file to array
export function readTextFileToArray(fileName) {
    let linesArray = [];
    try {
        const fileContent = fs.readFileSync(fileName, 'utf-8');
        linesArray = fileContent.trim().split(getNewLineSymbol());
    }
    catch (error) {
        console.log(`Error reading text file to array | ${error?.message}`);
    }
    return linesArray;
}
// Write array to text file
export function writeArrayToTextFile(fileName, array) {
    try {
        const lines = array.join(getNewLineSymbol()).trim();
        fs.writeFileSync(fileName, lines);
    }
    catch (error) {
        console.log(`Error writing array to text file | ${error?.message}`);
    }
}
// Generate file path for download image
export function generateFilePathForImage(projectData, imageUrl, index, folderPath) {
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
export async function downloadFileToDisk(url, filePath) {
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
    }
    catch (error) {
        console.log(`Error downloading file | ${error?.message}`);
    }
}
function getFileSizeInKB(filePath) {
    try {
        const sizeInBytes = fs.statSync(filePath).size;
        return (sizeInBytes / 1024).toFixed(2);
    }
    catch (error) {
        return '';
    }
}
// Save project url in history file
export function addProjectUrlToHistoryFile(projectUrl, historyFile) {
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
function createImageDescriptionForExif(projectData, imageUrl) {
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
export function writeJsonIntoImageDescription(json, filePath) {
    if (typeof json !== 'string' || !/\.jpe?g$/i.test(filePath)) {
        return;
    }
    try {
        // Read exif data from file
        const fileAsBinaryString = fs.readFileSync(filePath).toString('binary');
        let exifData = piexif.load(fileAsBinaryString);
        // Create new fields with project information if there is no exif data at all
        if (Object.keys(exifData).length === 0) {
            const newZeroth = {};
            newZeroth[TagValues.ImageIFD.ImageDescription] = json;
            newZeroth[TagValues.ImageIFD.Software] = 'BeDownloader app by ViRT1ST';
            exifData = { '0th': newZeroth };
            // Otherwise update the description tag only 
        }
        else {
            const existingZeroth = exifData['0th'];
            existingZeroth[TagValues.ImageIFD.ImageDescription] = json;
        }
        // Dump updated exif data and insert it into the image
        const newExifBinary = piexif.dump(exifData);
        const newPhotoData = piexif.insert(newExifBinary, fileAsBinaryString);
        // Write updated image back to file
        const fileBuffer = Buffer.from(newPhotoData, 'binary');
        fs.writeFileSync(filePath, fileBuffer);
    }
    catch (error) {
        console.log(`Error updating image with new EXIF data | ${error?.message}`);
    }
}
// Download image and save it to destination folder
export async function downloadImage(projectData, imageUrl, imageFilePath) {
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
            const lastFile = existFilesWithPattern.pop();
            const { name, ext } = path.parse(lastFile);
            const lastDigit = parseInt(name.split('-').pop(), 10);
            const nextDigit = addZeroForNumberLessTen(lastDigit + 1);
            const newFileName = `${existFilePatternStr}-${nextDigit}${ext}`;
            const newFilePath = path.join(path.dirname(imageFilePath), newFileName);
            fs.renameSync(tempFilePath, newFilePath);
        }
    }
    catch (error) {
        console.log(`Error processing downloaded image | ${error?.message}`);
    }
}
