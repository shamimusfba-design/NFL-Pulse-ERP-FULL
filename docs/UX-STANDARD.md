# NOS UX Standard (all pages, all future work)

Owner-approved rules (Nov 2026). Every new or corrected page must follow them. Related: `CHART-STANDARD.md`
(chart motion), `MOBILE-STANDARD.md` (phone + PWA). Full requirement notes: the "NOS ERP — UX & Merchandising
Requirements" document.

## Header & navigation
- One compact header on every page: page title only (no eyebrow / descriptive line), job search, user, Day/Night.
  The header and the module sub-menu scroll away; they are not frozen.
- One hamburger menu only (in the header). The sidebar has no menu button of its own.
- Dashboard pages: the page's section buttons stay frozen while scrolling, highlight left→right with the current
  section, and jump to a section on click (Job 360 pattern). Data-only dashboards are one long page.
- A separate tab row only where the kind of work differs or there is data entry.
- No duplicate buttons doing the same job (e.g. a sub-menu and the same buttons again inside the page).
- No teaching text, no Bengali text and no demo / prototype text on working screens. An urgent alert is one line
  plus one button.

## Tables
- The section's main table: full width, as tall as the screen allows, one vertical scroll; when scrolling only the
  table header row stays frozen. No half-cut rows, no empty space under the table. Small tables sit in the page.
- Excel-style filter in every column header (values with tick boxes and counts, search, A→Z); values never overlap.
  Filters drive cards, charts and the table together; active filters show as chips.
- Clicking a row opens a right-side edit panel (fields top to bottom in two columns; long values full width).
  Quantities/values change only after pressing Edit.
- As little left-right scrolling as possible, but table text never below 12px; Job and Style columns frozen on the
  left; the horizontal scrollbar always visible at the bottom of the screen; one scrollbar style everywhere.

## Look
- Cards, charts, tables and buttons look the same on every page (sizes, borders, fonts).
- Day mode: light surfaces, dark text. Night mode: dark surfaces, light text — cards and tables turn dark too.
  Implemented in `app/globals.css` ("NOS READABILITY STANDARD" and "NOS NIGHT MODE STANDARD"). New pages should use
  Tailwind slate/neutral classes or CSS variables instead of hard-coded inline colours, so both modes work without
  extra rules.
- One date format: `01.07.26`. Numbers always with thousands commas and a unit (t, kg, pcs).

## Charts
- Not cards-only: pick the chart for the data (time → trend line; compare items → column/bar; 2–5 parts → donut/pie;
  vs target → progress bar; day × line → heatmap). Only the important charts, compact, no lopsided empty space.
- Per section: first a list of possible charts, then a recommendation, then the owner chooses — then build.
- Hover is calm: only the hovered mark is highlighted; the other marks never dim or flash.
- No label or number overlaps anything (checked at 1366px, 1920px and phone width).
- Minimal chart text, short labels ("NFL"); if crowded, 2–3 small charts in one box.
- Colours: blue = required/load/plan, green = delivered/done, red = balance, amber = in-between state.
- Always show number of jobs and quantity with its unit.

## Drill-down popup charts
- Clicking any value opens a square bubble directly above it (below only when there is no room at the top of the
  page), in front of everything, closed by outside click / Esc / ×; a bottom sheet on phones.
- Inner chart chosen by the data (2–5 parts → donut, many → sorted bar, over time → trend, last step → job list);
  2–3 buttons to switch the breakdown (Factory / Buyer / Job); "Show these jobs in the table"; never a popup in a popup.

## Settings
- Company settings (admin, for everyone): master lists, rules & targets, users & access, default appearance.
- My settings (each user, only for themselves): text sizes per element, card/chart size, table density, Day/Night.
- Admin can lock or limit any appearance setting; colour rules, date format and master lists are always locked.

## How work is verified
- Nothing is called fixed until the real hosting bundle is tested under Firebase rules (hosting emulator), on desktop
  and phone, in Day and Night mode.
- Find the root cause first; change only what was asked; show screenshots and get approval before pushing.
