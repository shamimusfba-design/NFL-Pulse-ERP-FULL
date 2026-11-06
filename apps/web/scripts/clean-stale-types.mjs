// Before every production build: remove type files left by an earlier `next dev` run.
// They list every page that existed at that time; after a page is deleted they make `next build`
// fail with "Cannot find module '../../../app/<deleted page>/page.js'". next build recreates what it needs.
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const dir = fileURLToPath(new URL('../.next/dev/types', import.meta.url));
rmSync(dir, { recursive: true, force: true });
console.log('[clean-stale-types] removed .next/dev/types (if any)');
