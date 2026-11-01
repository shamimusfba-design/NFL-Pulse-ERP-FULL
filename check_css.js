const fs = require('fs');
const html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');

const sIdx = html.indexOf('<style>');
const eIdx = html.indexOf('</style>');
console.log('Style length:', eIdx - sIdx);

// Check classes for badges, tables, panels
const css = html.slice(sIdx, eIdx);
['.badge', '.pill', '.btn', '.panel', '.tpan', '.tgrid', '.subtabs'].forEach(c => {
  const i = css.indexOf(c);
  console.log(c, i !== -1 ? css.slice(i, i + 80) : 'not found');
});
