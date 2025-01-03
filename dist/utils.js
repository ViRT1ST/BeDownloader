import * as stream from 'node:stream';
import * as path from 'node:path';
import * as util from 'node:util';
import * as fs from 'node:fs';
import { transliterate } from 'transliteration';
import piexif, { TagValues } from 'piexif-ts';
import fetch from 'node-fetch';
/* =============================================================
Electron utils
============================================================= */
// Send message to renderer (script attached to electron frontend ui)
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
function getBreakLine() {
    return '\r\n';
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
// Convert string to latinized words with dash separator (URL-friendly)
export function convertToLatinizedKebab(string) {
    string = convertToLatinized(string);
    string = replaceNonEnglishBySymbol(string, '-');
    string = removeMultipleDashes(string);
    return string.toLowerCase();
}
// Correct Behance URLs if domain is not included and remove URL params
export function makeValidBehanceUrl(url) {
    if (!url.includes('behance.net/')) {
        url = `https://www.behance.net${url}`;
    }
    return url.split('?')[0];
}
// Format supported Behance URLs for display in UI status
export function formatUrlForUi(url, max) {
    try {
        const parts = url.split('/');
        if (parts.length < 5) {
            return url;
        }
        ;
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
Filepaths creating utils
============================================================= */
// Generate file path for image that will be downloaded
export function generateFilePathForImage(projectData, imageUrl, index, folderPath) {
    const { projectTitle, projectOwners } = projectData;
    const prefix = 'behance-';
    const firstOwner = convertToLatinizedKebab(projectOwners.split(', ')[0]);
    const title = convertToLatinizedKebab(projectTitle);
    const number = addZeroForNumberLessTen(index);
    const extension = imageUrl.split('.').pop();
    let filename = `${prefix}-${firstOwner}-${title}-${number}.${extension}`;
    filename = removeMultipleDashes(filename);
    return path.join(folderPath, filename);
}
/* =============================================================
Files utils
============================================================= */
// Create directory if not exists
export function createDirectoryIfNotExists(filepath) {
    if (!fs.existsSync(filepath)) {
        fs.mkdirSync(filepath, { recursive: true });
    }
}
// Create file if not exists
export function createFileIfNotExists(filepath) {
    if (!fs.existsSync(filepath)) {
        fs.writeFileSync(filepath, '', 'utf8');
    }
}
// Read text file to array
export function readTextFileToArray(filename) {
    let linesArray = [];
    try {
        const fileContent = fs.readFileSync(filename, 'utf-8');
        linesArray = fileContent.trim().split(getBreakLine());
    }
    catch (error) {
        console.log(`Error reading text file to array | ${error?.message}`);
    }
    return linesArray;
}
// Write array to text file
export function writeArrayToTextFile(filename, array) {
    try {
        const lines = array.join(getBreakLine()).trim();
        fs.writeFileSync(filename, lines);
    }
    catch (error) {
        console.log(`Error writing array to text file | ${error?.message}`);
    }
}
// Download file and save it to destination filepath
export async function downloadFileToDisk(url, filepath) {
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
        await streamPipeline(res.body, fs.createWriteStream(filepath));
    }
    catch (error) {
        console.log(`Error downloading file | ${error?.message}`);
    }
}
function getFileSizeInKB(filepath) {
    try {
        const sizeInBytes = fs.statSync(filepath).size;
        return (sizeInBytes / 1024).toFixed(2);
    }
    catch (error) {
        return '';
    }
}
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
export function writeJsonIntoImageDescription(json, filepath) {
    if (typeof json !== 'string' || !/\.jpe?g$/i.test(filepath)) {
        return;
    }
    try {
        // Read EXIF data from file
        const fileAsBase64String = fs.readFileSync(filepath).toString('binary');
        let exifData = piexif.load(fileAsBase64String);
        // Create new fields with project information if there is no EXIF data at all
        if (Object.keys(exifData).length === 0) {
            const newZeroth = {};
            newZeroth[TagValues.ImageIFD.ImageDescription] = json;
            newZeroth[TagValues.ImageIFD.Software] = 'BeDownloader app by ViRT1ST';
            exifData = { '0th': newZeroth };
            // Otherwise update the "ImageDescription" tag only 
        }
        else {
            const existingZeroth = exifData['0th'];
            existingZeroth[TagValues.ImageIFD.ImageDescription] = json;
        }
        // Dump updated EXIF data and insert it into the image
        const newExifBinary = piexif.dump(exifData);
        const newPhotoData = piexif.insert(newExifBinary, fileAsBase64String);
        // Write updated image back to file
        const fileBuffer = Buffer.from(newPhotoData, 'binary');
        fs.writeFileSync(filepath, fileBuffer);
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
            const newFilename = `${existFilePatternStr}-${nextDigit}${ext}`;
            const newFilepath = path.join(path.dirname(imageFilePath), newFilename);
            fs.renameSync(tempFilePath, newFilepath);
        }
    }
    catch (error) {
        console.log(`Error processing downloaded image | ${error?.message}`);
    }
}
