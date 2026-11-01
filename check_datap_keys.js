const fs = require('fs');
const html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');

const sIdx = html.indexOf('const DATA=');
const eIdx = html.indexOf(';', sIdx);
const DATA = JSON.parse(html.slice(sIdx + 'const DATA='.length, eIdx));

console.log('DATA.P length:', DATA.P.length);
console.log('Sample P[0]:', DATA.P[0]);

const allPKeys = new Set();
DATA.P.forEach(p => Object.keys(p).forEach(k => allPKeys.add(k)));
console.log('All keys in DATA.P:', [...allPKeys]);
