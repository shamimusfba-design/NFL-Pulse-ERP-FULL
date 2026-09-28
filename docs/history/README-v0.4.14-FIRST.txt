NFL PULSE ERP v0.4.14 — FACTORY DATA HEALTH HOTFIX

Why this build exists
- Fixes Gantt showing Factories (0 lines), empty floor/line/buyer dropdowns, and only seed/demo jobs.

First run
1. Extract to a NEW folder.
2. Copy your working apps/api/.env into this build.
3. Double-click START-NFL-PULSE.bat.
4. First setup loads base masters + reference dropdowns + real Sept-Nov T&A Gantt data + factory report imports.

If Gantt ever shows 0 lines
- Close API/Web windows.
- Double-click REPAIR-FACTORY-DATA.bat once.
- When DATA REPAIR COMPLETE appears, run START-NFL-PULSE.bat again.

Expected after repair
- Real T&A sewing-line master populated (source labels preserved).
- Sept/Oct/Nov T&A jobs available in Gantt.
- Buyer and report-driven reference/dropdown masters populated.
- Factory report import engine remains available.
