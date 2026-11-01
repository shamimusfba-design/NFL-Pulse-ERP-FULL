const fs = require('fs');
const html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');

const sIdx = html.indexOf('function dashInput');
console.log('dashInput index:', sIdx);
console.log(html.slice(sIdx, sIdx + 1500));
