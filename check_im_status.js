const fs = require('fs');
const html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');

// Check normLine
console.log('Contains normLine:', html.includes('function normLine'));

// Check DATA.P for any Sew
const sIdx = html.indexOf('const DATA=');
const eIdx = html.indexOf(';', sIdx);
const DATA = JSON.parse(html.slice(sIdx + 'const DATA='.length, eIdx));

const sewLines = DATA.P.filter(p => (p.ln || '').toLowerCase().includes('sew'));
console.log('DATA.P with ln containing sew:', sewLines.length);

// Check if Sew-01 or Sew-02 or Sew-03 appears anywhere in table or filter
const matches = [...html.matchAll(/"ln":"(Sew-[^"]+)"/g)];
console.log('Any "ln":"Sew-..." in JSON?', matches.map(m => m[1]));

// Check single-row line status HTML in script
console.log('Has line-status-bar in HTML/CSS/JS:', html.includes('line-status-bar'));
console.log('Has compact dgrid in HTML/CSS/JS:', html.includes('dgrid compact'));
