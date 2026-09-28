# v0.4.12 — T&A Data + Real Sewing Line Wiring

What changed:
- Keeps all v0.4.11 Gantt planner-intelligence features.
- Loads all 1,251 Sept-Oct-Nov 2026 T&A rows on first one-click startup.
- Preserves real source line labels such as N/1, N/3, ZA1, T1, G2, etc.
- Creates T&A sewing line masters automatically so the Gantt has visible lines even on a fresh local database.
- Raises Gantt API order scan limit from 500 to 5,000 so the reference dataset is not silently truncated.
- Root START-NFL-PULSE.bat performs first-run DB setup and data seeding automatically, then normal daily startup is one double-click.

Important:
- Keep/copy your working `apps/api/.env` into this build. It is not packaged because it contains local database credentials.
- Put START-NFL-PULSE.bat beside the `apps` folder, not inside it.
