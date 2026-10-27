/**
 * Fails when apps/web/lib/live-gateway.ts LIVE_ROUTES drifts from the routes
 * actually declared in apps/api/src controllers.
 * Run: npx tsx scripts/verify-live-routes.ts
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { LIVE_ROUTES, isLiveRoute } from '../apps/web/lib/live-gateway';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
}

const declared = new Set<string>();
for (const file of walk(join(__dirname, '../apps/api/src'))) {
  const src = readFileSync(file, 'utf8');
  const blocks = src.split(/(?=@Controller\()/).filter((b) => b.startsWith('@Controller('));
  for (const block of blocks) {
    const base = (block.match(/^@Controller\((?:'([^']*)')?\)/) || [])[1] || '';
    for (const m of block.matchAll(/@(Get|Post|Patch|Put|Delete)\((?:'([^']*)')?\)/g)) {
      const path = [base, m[2] || ''].filter(Boolean).join('/').replace(/^\/+/, '');
      declared.add(`${m[1].toUpperCase()} ${path}`);
    }
  }
}
const listed = new Set(LIVE_ROUTES.map(([m, p]) => `${m} ${p}`));
const missing = [...declared].filter((r) => !listed.has(r));
const extra = [...listed].filter((r) => !declared.has(r));
if (missing.length || extra.length) {
  console.error('LIVE_ROUTES out of sync.\nMissing:', missing, '\nNot in API:', extra);
  process.exit(1);
}
const checks: Array<[string, string, boolean]> = [
  ['POST', 'orders/import/preview', true],
  ['GET', 'orders/abc123', true],
  ['GET', 'kaizen/projects', false],
  ['DELETE', 'orders', false],
  ['GET', 'orders/a/b', false],
];
for (const [m, p, expected] of checks) {
  if (isLiveRoute(m, p) !== expected) { console.error(`isLiveRoute(${m} ${p}) expected ${expected}`); process.exit(1); }
}
console.log(`OK: ${declared.size} API routes match LIVE_ROUTES; matcher checks passed.`);
