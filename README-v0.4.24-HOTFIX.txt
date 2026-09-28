NFL Pulse ERP v0.4.24 BUILD HOTFIX

1) Extract this ZIP.
2) Paste all extracted files/folders into your existing NFL Pulse ERP main/root folder (the same level where apps exists).
3) Choose Replace / Yes to All.
4) Run START-NFL-PULSE.bat again.

No database reset is required.
No demo workbook needs to be re-imported for this build fix.

Fixes TS2459: commitReportBatch existed in src/imports.ts but was not exported while factory-report-seed.ts imported it.
