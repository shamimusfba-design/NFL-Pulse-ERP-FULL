const fs = require('fs');
const html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');
const idx = html.indexOf('function renderTP');
const endIdx = html.indexOf('function renderSM', idx);
console.log(html.slice(idx, endIdx));
