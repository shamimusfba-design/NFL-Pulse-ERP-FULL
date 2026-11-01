const fs = require('fs');
const html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');

const idx = html.indexOf('function bindAdd');
console.log(html.slice(idx, idx + 800));
