# NFL Pulse ERP v0.4.8 — T&A + Global UI Corrections (Cumulative)

This ZIP contains the cumulative `apps` folder through v0.4.8. It is designed to be copied over the existing project without deleting the project.

## Apply on Windows
1. Stop the dev server with `Ctrl + C`.
2. Extract this ZIP.
3. Copy the extracted `apps` folder into:
   `C:\Users\shamim\Documents\NFL Pulse\NFL-Pulse-ERP-FULL`
4. Choose **Replace the files in the destination**.
5. From the project folder run:
   `npm.cmd run dev`
6. In the browser press `Ctrl + F5`.

No Prisma migration or seed is required for this patch.

## Main corrections included
- T&A: fixed CCD backward planning; generated first planned process is based on tomorrow as the earliest new start; dynamic shortage compression; quantity/process/IE-aware lead-time baseline; capacity heatmap remains approval control.
- T&A layout: one serial table with Process / Start Date / End Date / Lead Time / Slack Time; single-date milestones stay single-date; print T&A uses the same serial structure.
- Job No: buyer short code is included before the running number (`ONL`, `ONS`, `NMT`, `OVS`, `UTG`). New imported/manual jobs and refreshed demo jobs use the prefix.
- Job tables: compact font/rows, buyer full-name column removed where Job No already identifies buyer, mixed giant cells replaced by narrower relevant columns.
- Filters: section-specific relevant filters rather than one fixed filter set everywhere.
- Wide tables/Gantt: a synchronized sticky horizontal scrollbar stays at the bottom of the viewport while a horizontally scrollable area is active.
- Sidebar: clicking every main category opens that category's Overview/Dashboard; the arrow expands its operational child pages; duplicate Overview child rows are not needed.
- Section dashboards: relevant KPI cards and chart/visual blocks are shown per main section; content differs by section.

## Demo data note
Existing old demo records can still be displayed with the buyer prefix in the UI. To make the stored demo Job No itself use the new format, use the Admin demo reset/load control when convenient.
