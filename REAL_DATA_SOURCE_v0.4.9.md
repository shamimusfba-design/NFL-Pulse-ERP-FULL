# Real planning source — v0.4.9

Source files supplied by the user:
- T&A Plan & Execution Summary(3).xlsx
- 18.09.26 Finish Fabric Plan & Execution Status(1).xlsm
- Cutting, Print & Input Summary(1).xlsx

Selected Gantt population:
- Sewing plan overlaps 2026-09-01 through 2026-11-30
- Sewing Start + Sewing End present
- Line + Floor present
- 1,103 rows selected

Sewing-start month count:
- 2026-08 carry-over: 6
- 2026-09: 405
- 2026-10: 422
- 2026-11: 270

Reported floor count:
- NFL1: 223
- NFL2: 252
- NFL3: 410
- NCL: 218

Buyer short-code count:
- ONL: 319
- ONS: 75
- NMT: 334
- OVS: 166
- UTG: 117
- GBX: 92

Execution enrichment matches:
- Finish Fabric report matched: 480
- Cutting / Print / Input report matched: 417

Source-derived: Job, buyer source, style, order qty, fabric kg, item description where available, sewing start/end, CCD, ex-factory, line, floor, merchandiser, present status, print/emb description and available execution quantities.

Estimated only: per-Job Machine Need where source reports do not provide a machine count. This is stored with `machineCountSource = ESTIMATED_FROM_TA_DURATION` and remains planner-editable.
