const filteredUrls = [
  'https://mir-s3-cdn-cf.behance.net/project_modules/1400_opt_1/x/cd3f02155176025.634fbdd5e09ce.jpg',
  'https://mir-s3-cdn-cf.behance.net/project_modules/1400/x/cd3f02155176025.634fbdd5e09ce.jpg',
  'https://mir-s3-cdn-cf.behance.net/project_modules/1200_max/cd3f02155176025.634fbdd5e09ce.jpg',
  'https://mir-s3-cdn-cf.behance.net/project_modules/2800_opt_1/cd3f02155176025.634fbdd5e09ce.jpg',
  'https://mir-s3-cdn-cf.behance.net/cd3f02155176025.634fbdd5e09ce.jpg',
  'https://mir-s3-cdn-cf.behance.net/project_modules/fs/cd3f02155176025.634fbdd5e09ce.jpg',
];

const goodUrls = filteredUrls.map((url) => {
  return url.includes('project_modules')
    ? url.replace(/([\w.-]+)(\/[\w.-]+)$/, 'source$2')
    : url;
});

console.log(goodUrls);
