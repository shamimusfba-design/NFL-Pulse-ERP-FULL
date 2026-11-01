const fs = require('fs');
const html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');

const sIdx = html.indexOf('function renderTP(kind){');
const eIdx = html.indexOf('function smDefault(', sIdx);
console.log(html.slice(sIdx, eIdx));
