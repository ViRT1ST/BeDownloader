const urlsInput = 'https://www.behance.net/gallery/166160265/Koala-House\nhttps://www.behance.net/gallery/155176025/Private-Offices\nhttps://www.behance.net/gallery/151226985/_';

const regex = /.net\/gallery\/|.net\/collection\//;
const urls = urlsInput.split('\n').filter((item) => regex.test(item));
console.log(urls);
