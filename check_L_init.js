const fs = require('fs');
const html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');

const sIdx = html.indexOf('const L=');
console.log(html.slice(sIdx, sIdx + 1200));
