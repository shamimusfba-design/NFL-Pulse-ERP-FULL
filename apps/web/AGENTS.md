<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- NOS CHART STANDARD -->
## NOS chart & card motion standard (mandatory)

Every chart, KPI number and card must follow `docs/CHART-STANDARD.md` (shared code in `components/fx/`):
* Recharts: use `FxResponsiveContainer` (import as `ResponsiveContainer` from `components/fx`) and spread `{...FX_BAR}` on every `Bar`, `{...FX_PIE}` on every `Pie`, `{...FX_SERIES}` on every `Line/Area/Radar/Scatter`. Never import `ResponsiveContainer` from `recharts`.
* Hand-built SVG/div charts: `useFxScope()` on the root + `fx-*` classes on the marks.
* KPI numbers: `data-fx-count` or one of the KPI container classes.
* Run `npm run check:charts` before committing.
<!-- END NOS CHART STANDARD -->

<!-- NOS MOBILE STANDARD -->
## NOS phone & PWA standard (mandatory)
Every page must stay usable on a phone (≤760px) without changing desktop: follow `docs/MOBILE-STANDARD.md`
(responsive grids, card layout for floor-used tables, no fixed-width sections, pop-ups as `fixed inset-0` overlays).
Never cache data or API responses in `public/sw.js`.
<!-- END NOS MOBILE STANDARD -->

<!-- NOS UX STANDARD -->
## NOS UX standard (mandatory)
Follow `docs/UX-STANDARD.md` for every page: compact header (title only), one hamburger menu, no duplicate buttons,
no Bengali / teaching / demo text on screens, main table full width with only its header frozen, Excel-style column
filters, right-side edit panel, calm chart hover (never dim other marks), chart colours blue/green/red, Day + Night mode
both readable (prefer Tailwind or CSS variables over inline colours). Run `npm run check:ux` before committing.
Verify under Firebase rules (hosting emulator) before calling anything fixed.
<!-- END NOS UX STANDARD -->
