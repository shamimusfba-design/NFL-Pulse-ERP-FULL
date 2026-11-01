const fs = require('fs');
const html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');

const sIdx = html.indexOf('function renderTP(kind){');
const eIdx = html.indexOf('function renderSM()', sIdx);
const block = html.slice(sIdx, eIdx);

const fnMatches = block.match(/function\s+[a-zA-Z0-9_]+\s*\(/g);
console.log('Functions in renderTP region:', fnMatches);
