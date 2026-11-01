const fs = require('fs');
const html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');

const sIdx = html.indexOf('function renderIM');
console.log('renderIM index:', sIdx);
console.log(html.slice(sIdx, sIdx + 1200));
