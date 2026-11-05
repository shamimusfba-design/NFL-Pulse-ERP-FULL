# NOS Chart & Card Motion Standard

One formula for **every** chart, KPI number and card in the ERP. Written so that anyone (a developer,
Claude Code, Google AI Studio) adding or fixing a chart gets the same effect automatically.

## What the user sees

| Element | Effect |
|---|---|
| Any chart | Nothing plays until it scrolls into view; then it draws itself. Scroll away and back → plays again from zero. |
| Donut | Sweeps clockwise from 12 o'clock; centre number counts up. Hover: the hovered slice pops out with a shadow, the rest dim. |
| KPI / summary card | Rises and fades in with a stagger when it scrolls into view (automatic for any framed card that holds a KPI number). |
| Any div / i bar or progress bar | Grows from its base automatically (FxEnhancer detects coloured bars sized by inline width/height). Mark a container `data-fx-ignore` to opt out. |
| Column / bar | Gradient fill; bars rise from the baseline one after another; a bar whose value changes (filter) rebuilds from zero. Hover: hovered bar brightens, others dim. |
| Line / area | The line draws left → right, area fades in, points pop, value labels rise. |
| KPI number | Counts up from 0 (keeps commas, decimals, %, units). When a filter changes the value it glides old → new. |
| Horizontal CSS bars (`.hbar-list`) | Grow from the left with a stagger — automatic. |
| Tooltip | Glass (blurred) tooltip + soft crosshair, same on every Recharts chart, day and night mode. |
| Reduced motion (OS setting) | Everything is shown instantly, no animation. |

Timing lives in one place: `components/fx/motion.ts` (`FX`) and the `--fx-*` variables / `fx*` keyframes
in the last block of `app/globals.css`.

## Rules for new charts

### 1. Recharts charts
```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { FX_SERIES, FX_BAR, FX_PIE, FxResponsiveContainer as ResponsiveContainer } from '<path>/components/fx';

<ResponsiveContainer width="100%" height={260}>
  <BarChart data={rows}>
    <Bar {...FX_BAR} dataKey="value" />      {/* every <Bar> */}
  </BarChart>
</ResponsiveContainer>
<Pie {...FX_PIE} … />                       {/* every <Pie> */}
<Line {...FX_SERIES} … />                   {/* every Line / Area / Radar / Scatter */}
```
* **Never** import `ResponsiveContainer` from `recharts` — use `FxResponsiveContainer` (it handles scroll-in + replay).
* `FX_BAR` = gradient + staggered rise shape, `FX_PIE` = clockwise sweep + hover pop-out, `FX_SERIES` = standard draw timing.

### 2. Hand-built SVG / div charts
```tsx
const fx = useFxScope();
<div ref={fx.ref} data-fx={fx['data-fx']}> … </div>
```
Tag the marks (all defined in `globals.css`):

| Mark | Class | Notes |
|---|---|---|
| vertical bar (div or rect) | `fx-bar` | `style={{ '--fx-i': index }}` for stagger |
| horizontal bar | `fx-hbar` | |
| line / polyline / path | `fx-line` | add `pathLength={1}` |
| area under a line | `fx-area` | |
| point | `fx-dot` | `--fx-i` = index |
| value label | `fx-label` | `--fx-i` = index |
| donut segment (`<circle>` stroke) | `fx-donut-seg` | `style={{ '--fx-dash': segmentLength, '--fx-c': circumference, '--fx-i': i }}` |
| donut centre text | `fx-donut-center` | |

### 3. KPI numbers
Automatic for any standalone number with font-size ≥ 18px (e.g. `989 <span>Tons</span>`), and when the number sits in one of the known KPI containers (`FxEnhancer.tsx → KPI_SELECTORS`:
`.ie-kpi-row strong`, `.overview-card-grid strong`, `.summary-metric-grid strong`, `.metric-value`, …).
For a custom card add `data-fx-count` to the element that holds the number. In React code you can also
use `<CountUp value={…} />`.

### 4. Cards / panels
`<Reveal delay={n}>…</Reveal>` gives a staggered scroll-in. (Existing `.erp-chart-card`, `.metric-card`, `.panel` hover lift stays.)

### 5. CSS-only bar lists
Use `.hbar-list > .hbar-row > div > i` (as in NPT Management). `FxEnhancer` animates them automatically.
Any other block can opt in with `data-fx-scope`.

## Enforcement
`npm run check:charts` (also runs before `npm run build`) lists charts that break the rules above.
Use `node scripts/check-chart-standard.mjs --strict` in CI to fail instead of warn.

## Files
* `apps/web/components/fx/` — `motion.ts`, `useInView.ts`, `FxResponsiveContainer.tsx`, `Reveal.tsx`, `CountUp.tsx`, `FxEnhancer.tsx`
* `apps/web/app/globals.css` — block "NOS CHART & CARD MOTION STANDARD"
* `apps/web/scripts/check-chart-standard.mjs`

## Not covered (by design)
Large data tables are never animated. Static HTML modules under `apps/web/public/*/index.html`
(merchandising, sample-room, yarn-knitting) are separate pages and do not use these components.
