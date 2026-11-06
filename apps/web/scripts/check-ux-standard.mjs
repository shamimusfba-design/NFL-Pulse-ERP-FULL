// NOS UX standard check (docs/UX-STANDARD.md) — runs before every build (warnings) and on demand:
//   npm run check:ux            -> warnings
//   node scripts/check-ux-standard.mjs --strict  -> exit 1 on problems
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const strict = process.argv.includes('--strict');
const problems = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.next', 'public'].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|jsx)$/.test(name)) check(p);
  }
}

function check(file) {
  const raw = readFileSync(file, 'utf8');
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const rel = relative(root, file);
  // 1. no Bengali text on screens (the Taka sign ৳ is allowed)
  const bn = code.match(/[\u0980-\u09F2\u09F4-\u09FF]+/g);
  if (bn) problems.push(`${rel}: Bengali text in UI (${bn.slice(0, 3).join(' ')})`);
  // 2. no second hamburger button inside the sidebar
  if (/sidebar-hamburger-btn/.test(code)) problems.push(`${rel}: sidebar hamburger button — only the header has a menu button`);
  // 3. demo / prototype wording on screens
  const demo = code.match(/>[^<{]*\b(prototype|lorem ipsum|dummy data)\b[^<]*</gi);
  if (demo) problems.push(`${rel}: demo/prototype text on screen: ${demo[0].slice(0, 60)}`);
}

// 4. calm hover: CSS must not dim the other marks on hover
const css = readFileSync(join(root, 'app/globals.css'), 'utf8');
const dim = css.match(/:has\([^)]*:hover\)[^{]*:not\(:hover\)[^{]*\{[^}]*opacity/g);
if (dim) problems.push(`app/globals.css: hover rule dims other marks (causes flicker): ${dim[0].slice(0, 80)}`);

walk(join(root, 'app'));
walk(join(root, 'components'));

if (problems.length) {
  console.log(`\n[ux-standard] ${problems.length} item(s) not following docs/UX-STANDARD.md:`);
  for (const p of problems.slice(0, 40)) console.log('  - ' + p);
  if (strict) process.exit(1);
} else {
  console.log('[ux-standard] OK');
}
