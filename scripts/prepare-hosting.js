const fs = require('fs');
const path = require('path');

const outDir = path.resolve('.firebase/nfl-erp/hosting');
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

// 1. Copy public directory
const pubDir = path.resolve('apps/web/public');
if (fs.existsSync(pubDir)) {
  fs.cpSync(pubDir, outDir, { recursive: true });
  console.log('[prepare-hosting] Copied public assets');
}

// 2. Copy .next/static to _next/static
const staticSrc = path.resolve('apps/web/.next/static');
const staticDest = path.join(outDir, '_next/static');
if (fs.existsSync(staticSrc)) {
  fs.mkdirSync(path.join(outDir, '_next'), { recursive: true });
  fs.cpSync(staticSrc, staticDest, { recursive: true });
  console.log('[prepare-hosting] Copied static chunks to _next/static');
}

// 3. Copy html files from .next/server/app
const serverApp = path.resolve('apps/web/.next/server/app');
function copyHtml(dir, targetSub) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory() && !item.name.endsWith('.segments')) {
      copyHtml(full, path.join(targetSub, item.name));
    } else if (item.isFile() && item.name.endsWith('.html')) {
      const destPath = path.join(outDir, targetSub, item.name);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(full, destPath);
    }
  }
}
if (fs.existsSync(serverApp)) {
  copyHtml(serverApp, '');
  console.log('[prepare-hosting] Copied pre-rendered HTML routes');
}

console.log('[prepare-hosting] Firebase Hosting bundle ready at .firebase/nfl-erp/hosting');
