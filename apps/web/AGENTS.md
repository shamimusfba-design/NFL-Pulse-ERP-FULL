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
