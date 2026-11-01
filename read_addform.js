const fs = require('fs');
const html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');
const idx = html.indexOf('function addForm');
const endIdx = html.indexOf('function bindAdd', idx);
console.log(html.slice(idx, endIdx + 500));
