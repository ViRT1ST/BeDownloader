const fs = require('fs');
const fetch = require('node-fetch');
const piexif = require('piexifjs');
const { transliterate } = require('transliteration');

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
    fs.mkdirSync(dir);
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
    const exifData = getExifFromJpegFile(filepath);
    const imageData = getBase64DataFromJpegFile(filepath);
    const jsonData = JSON.stringify(obj);

    exifData['0th'][piexif.ImageIFD.ImageDescription] = jsonData;

    const newExifBinary = piexif.dump(exifData);
    const newPhotoData = piexif.insert(newExifBinary, imageData);

    const fileBuffer = Buffer.from(newPhotoData, 'binary');
    fs.writeFileSync(filepath, fileBuffer);
  }
}

module.exports.addZeroForNumberLessTen = addZeroForNumberLessTen;
module.exports.replaceNonEnglishBySymbol = replaceNonEnglishBySymbol;
module.exports.removeMultipleDashes = removeMultipleDashes;
module.exports.convertToLatinized = convertToLatinized;
module.exports.convertToLatinizedKebab = convertToLatinizedKebab;
module.exports.createDirIfNotExists = createDirIfNotExists;
module.exports.downloadFile = downloadFile;
module.exports.saveObjectIntoImageExif = saveObjectIntoImageExif;
