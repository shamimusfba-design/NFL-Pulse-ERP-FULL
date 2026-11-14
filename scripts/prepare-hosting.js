const fs = require('fs');
const path = require('path');

const outDir = path.resolve('.firebase/nfl-erp/hosting');
try {
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
} catch (e) {
  console.warn('[prepare-hosting] Note: rmSync non-fatal warning:', e.message);
}
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

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
const fromPublic = new Set();
(function collect(dir, sub) {
  if (!fs.existsSync(dir)) return;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.isDirectory()) collect(path.join(dir, item.name), path.join(sub, item.name));
    else fromPublic.add(path.join(outDir, sub, item.name));
  }
})(pubDir, '');
const safeCopy = (src, dest) => {
  if (fromPublic.has(dest)) {
    return;
  }
  try {
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  } catch (err) {
    // non-fatal warning
  }
};

const serverApp = path.resolve('apps/web/.next/server/app');
function copyHtml(dir, targetSub) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory() && !item.name.endsWith('.segments')) {
      copyHtml(full, path.join(targetSub, item.name));
    } else if (item.isFile() && item.name.endsWith('.html')) {
      const destPath = path.join(outDir, targetSub, item.name);
      safeCopy(full, destPath);

      // Also create folder/index.html for cleanUrls / trailing-slash compatibility
      if (item.name !== 'index.html' && !item.name.startsWith('_')) {
        const folderName = item.name.replace(/\.html$/, '');
        const folderIndex = path.join(outDir, targetSub, folderName, 'index.html');
        safeCopy(full, folderIndex);
      }
    }
  }
}
if (fs.existsSync(serverApp)) {
  copyHtml(serverApp, '');
  console.log('[prepare-hosting] Copied pre-rendered HTML routes');
}

// Ensure root index.html exists
const rootIndex = path.join(outDir, 'index.html');
if (!fs.existsSync(rootIndex) && fs.existsSync(serverApp)) {
  const serverIndex = path.join(serverApp, 'index.html');
  if (fs.existsSync(serverIndex)) {
    fs.copyFileSync(serverIndex, rootIndex);
    console.log('[prepare-hosting] Copied server root index.html to hosting root');
  }
}

// Ensure 404.html exists
const notFoundHtml = path.join(outDir, '404.html');
if (!fs.existsSync(notFoundHtml)) {
  const nf = path.join(outDir, '_not-found.html');
  if (fs.existsSync(nf)) {
    fs.copyFileSync(nf, notFoundHtml);
  } else if (fs.existsSync(rootIndex)) {
    fs.copyFileSync(rootIndex, notFoundHtml);
  }
  console.log('[prepare-hosting] Created 404.html for SPA fallback');
}

console.log('[prepare-hosting] Firebase Hosting bundle ready at .firebase/nfl-erp/hosting');
