# NOS Phone & PWA Standard

The ERP is a PWA (installable on phone and desktop) and every page must work on a phone (≤760px)
without changing the desktop view.

## What is automatic (no code needed)
* `public/manifest.webmanifest`, `public/icons/*`, `public/sw.js`, `components/PwaRegister.tsx` (mounted in `app/layout.tsx`).
* Service worker rules: pages network-first (offline page only when there is no connection), `/_next/static`,
  icons and branding cached, **data and API never cached**. A "new version is ready — Refresh now" bar appears after a publish.
* Phone CSS (`app/globals.css`, block "NOS PHONE STANDARD"): ☰ opens the menu as a drawer, top bar stacks,
  wide tables scroll inside their own box, inline/Tailwind grids collapse, flex rows wrap, pop-ups become bottom sheets,
  16px inputs (no iPhone zoom), bigger tap targets.

## Rules for new or corrected pages
1. Use Tailwind responsive classes (`grid-cols-1 md:grid-cols-3`) or `repeat(auto-fill, minmax(...))` for grids.
2. Big data tables: also give a phone layout — one card per row (key fields + main action) under `md:hidden`,
   table under `hidden md:block` — when the table is used on the floor.
3. No fixed pixel widths on page sections; use `max-width` / `minmax(0,1fr)`.
4. Pop-ups: `fixed inset-0` overlay with the dialog as its direct child (the phone CSS turns it into a bottom sheet).
5. Check the page at 390px wide and at desktop width before committing.

## Not covered automatically
The static HTML screens under `apps/web/public/*/index.html` (merchandising, sample-room, yarn-knitting, cutting, ...)
have their own CSS and are adapted separately.
