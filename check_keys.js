const fs = require('fs');
const html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');

const sIdx = html.indexOf('const DATA=');
const eIdx = html.indexOf(';', sIdx);
const jsonStr = html.slice(sIdx + 'const DATA='.length, eIdx);
const DATA = JSON.parse(jsonStr);

console.log('Total records in DATA.L:', DATA.L.length);
const keys = new Set();
DATA.L.forEach(r => Object.keys(r).forEach(k => keys.add(k)));
console.log('All keys in DATA.L:', [...keys]);

// Sample 5 records
console.log('Sample 3 records with most keys:');
const sortedByKeys = [...DATA.L].sort((a,b) => Object.keys(b).length - Object.keys(a).length);
console.log(sortedByKeys.slice(0, 3));
