const fs = require('fs');
const fetch = require('node-fetch');
const piexif = require('piexifjs');
const { transliterate } = require('transliteration');

const breakLine = '\r\n';

function addZeroForNumberLessTen(number) {
  return number.toLocaleString('en-US', { minimumIntegerDigits: 2 });
}

function replaceNonEnglishBySymbol(string, symbol) {
  return string.replace(/[^a-zA-Z0-9]/g, symbol);
}

function removeMultipleDashes(string) {
  return string.replace(/-+/g, '-');
}

function convertToLatinized(string) {
  return transliterate(string);
}

function convertToLatinizedKebab(string) {
  string = convertToLatinized(string);
  string = replaceNonEnglishBySymbol(string, '-');
  string = removeMultipleDashes(string);
  return string.toLowerCase();
}

const shortenUrl = (url, max) => {
  url = url.split('/').slice(3).join('/');
  return url.length <= max ? `[${url}]` : `[${url.slice(0, max)}...]`;
};

async function downloadFile(url, filepath) {
  const res = await fetch(url);
  const fileStream = fs.createWriteStream(filepath);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', resolve);
  });
}

function createDirIfNotExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getBase64DataFromJpegFile(filepath) {
  return fs.readFileSync(filepath).toString('binary');
}

function getExifFromJpegFile(filepath) {
  return piexif.load(getBase64DataFromJpegFile(filepath));
}

function saveObjectIntoImageExif(obj, filepath) {
  if (/\.jpe?g$/i.test(filepath)) {
    try {
      const exifData = getExifFromJpegFile(filepath);
      const imageData = getBase64DataFromJpegFile(filepath);
      const jsonData = JSON.stringify(obj);

      exifData['0th'][piexif.ImageIFD.ImageDescription] = jsonData;

      const newExifBinary = piexif.dump(exifData);
      const newPhotoData = piexif.insert(newExifBinary, imageData);

      const fileBuffer = Buffer.from(newPhotoData, 'binary');
      fs.writeFileSync(filepath, fileBuffer);
    } catch (error) { /* ignore */ }
  }
}

function readFileToArray(filename) {
  try {
    const fileContent = fs.readFileSync(filename, 'utf-8');
    const linesArray = fileContent.trim().split(breakLine);
    return linesArray;
  } catch (error) {
    return [];
  }
}

function writeArrayToFile(filename, array) {
  try {
    const lines = array.join(breakLine);
    fs.writeFileSync(filename, lines);
  } catch (error) { /* ignore */ }
}

module.exports.addZeroForNumberLessTen = addZeroForNumberLessTen;
module.exports.replaceNonEnglishBySymbol = replaceNonEnglishBySymbol;
module.exports.removeMultipleDashes = removeMultipleDashes;
module.exports.convertToLatinized = convertToLatinized;
module.exports.convertToLatinizedKebab = convertToLatinizedKebab;
module.exports.shortenUrl = shortenUrl;
module.exports.createDirIfNotExists = createDirIfNotExists;
module.exports.downloadFile = downloadFile;
module.exports.saveObjectIntoImageExif = saveObjectIntoImageExif;
module.exports.readFileToArray = readFileToArray;
module.exports.writeArrayToFile = writeArrayToFile;
