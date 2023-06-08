function makeValidUrl(url) {
  return url.includes('behance.net/')
    ? url
    : `https://www.behance.net${url}`;
}

const x = makeValidUrl('/gallery/13044253/Evax');
console.log(x);
