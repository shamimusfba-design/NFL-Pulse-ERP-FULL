const fs = require('fs');
const html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');

const idx = html.indexOf('const c=document.querySelector(\'input[name=ad-c]:checked\')');
console.log(html.slice(idx, idx + 400));
