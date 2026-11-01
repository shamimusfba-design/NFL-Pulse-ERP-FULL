const fs = require('fs');
const html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');

const idx = html.indexOf('function fabricState');
console.log('=== fabricState ===\n', html.slice(idx, idx + 600));

const sampleRecordMatch = html.match(/const DATA=\{"L":\[(\{.*?\})/);
if (sampleRecordMatch) {
  console.log('=== sample record ===\n', sampleRecordMatch[1]);
}
