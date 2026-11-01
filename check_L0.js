const fs = require('fs');
const html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');

const sIdx = html.indexOf('const L0=');
if (sIdx !== -1) {
  console.log(html.slice(sIdx, sIdx + 500));
} else {
  const s2 = html.indexOf('DATA.L');
  console.log(html.slice(s2, s2 + 500));
}
