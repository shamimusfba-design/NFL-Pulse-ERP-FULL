# NFL Pulse ERP v0.4.10 — Gantt Real Interaction Hotfix

Use this ZIP instead of v0.4.9.

Primary correction: Gantt bars are no longer image-like/static. Popup date edits are bound to the same state that renders the bar, and drag/drop uses Pointer Events instead of native HTML drag.

Test flow:
1. Open Sewing Line Planning.
2. Click a job.
3. Change Start date — bar should move immediately before Save.
4. Change SMV / manpower / efficiency / working hours — finish should recalculate and bar width should change.
5. Save Review — reload page and verify dates remain.
6. Drag a job left/right — bar should follow pointer and snap by day.
7. Drag vertically onto another line — move preview should show target line/date.
8. Confirm Move — reload and verify line/date persisted.
9. Cancel Move — original line/date should return.
