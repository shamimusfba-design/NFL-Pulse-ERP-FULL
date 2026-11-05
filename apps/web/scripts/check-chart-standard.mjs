// NOS chart standard check — run automatically before `next build` (prints warnings) and on demand:
//   npm run check:charts            -> warnings only
//   node scripts/check-chart-standard.mjs --strict   -> exit 1 if anything violates the standard
// Rules (see docs/CHART-STANDARD.md):
//   1. Never import ResponsiveContainer from 'recharts' — use FxResponsiveContainer from components/fx.
//   2. Every Recharts <Bar>/<Line>/<Area>/<Pie>/<Radar>/<Scatter> must spread {...FX_SERIES}.
//   3. Hand-built SVG donuts/lines must use useFxScope + fx-* classes.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const strict = process.argv.includes('--strict');
const problems = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === 'fx') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|jsx)$/.test(name) && !/Icon\.tsx$/.test(name) && !p.includes('/app/login/')) check(p); // icons / login art are not charts
  }
}

function check(file) {
  const src = readFileSync(file, 'utf8');
  const rel = relative(root, file);
  const rc = src.match(/import\s*\{([^}]*)\}\s*from\s*['"]recharts['"]/);
  if (rc) {
    if (/\bResponsiveContainer\b/.test(rc[1])) {
      problems.push(`${rel}: imports ResponsiveContainer from 'recharts' — use FxResponsiveContainer from components/fx`);
    }
    for (const tag of ['Bar', 'Line', 'Area', 'Pie', 'Radar', 'Scatter']) {
      const re = new RegExp(`<${tag}(\\s[^>]*)?>`, 'g');
      let m;
      while ((m = re.exec(src))) {
        // multi-line tags: look ahead up to the closing '>' of this tag
        const end = src.indexOf('>', m.index);
        const chunk = src.slice(m.index, end + 1);
        if (!chunk.includes('FX_SERIES')) {
          const line = src.slice(0, m.index).split('\n').length;
          problems.push(`${rel}:${line}: <${tag}> is missing {...FX_SERIES}`);
        }
      }
    }
  }
  const handDonut = /<circle[^>]*strokeDasharray/.test(src) || /strokeDasharray=\{[^}]*\}\s*[\r\n]/.test(src);
  if (handDonut && !/fx-donut-seg/.test(src)) problems.push(`${rel}: hand-built SVG donut without fx-donut-seg / useFxScope`);
  if (/<polyline|<path[^>]*stroke=/.test(src) && /viewBox/.test(src) && !/useFxScope|data-fx|fx-line/.test(src) && !rc) {
    problems.push(`${rel}: hand-built SVG line chart without useFxScope / fx-line (ignore if it is an icon)`);
  }
}

walk(join(root, 'app'));
walk(join(root, 'components'));

if (problems.length) {
  console.log(`\n[chart-standard] ${problems.length} item(s) not following the NOS chart & card motion standard:`);
  for (const p of problems) console.log('  - ' + p);
  console.log('  See docs/CHART-STANDARD.md\n');
  if (strict) process.exit(1);
} else {
  console.log('[chart-standard] OK — all charts follow the NOS motion standard.');
}
