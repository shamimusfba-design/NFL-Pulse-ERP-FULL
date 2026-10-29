# Planning approvals API

Central Planning and Sample Planning approval desk. Base path `/planning/approvals` (login required).

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/queue?month=YYYY-MM` | PLANNING, SAMPLE | Central Planning sees bulk jobs waiting for it; Sample Planning sees sample sheets waiting for TNA with quota use, plus the monthly quota board. Each row has `nextAction` and `ageDays`. |
| PUT | `/jobs/:styleId/signed-copy` | PLANNING | `{ doc: FABRIC_SHEET \| TNA, note? }` — records that the signed physical copy reached Planning. |
| POST | `/jobs/:styleId/return` | PLANNING | `{ doc, reason }` — sends the document back to the merchandiser (step back to READY, task to the merchandiser). The task closes when they send it again. |
| GET | `/jobs/:styleId/release-draft` | PLANNING | Suggested knitting lines: colour qty ÷ 12 × CAD consumption, per fabric part, with colour codes from the fabric order sheet. |
| POST | `/jobs/:styleId/release` | PLANNING | `{ lines: [{ colour, colourCode?, part?, fabric, gsm?, composition?, finishKg }] }` — after both approvals, creates the knitting job (`PENDING_PLANNING`) and a "Plan knitting" task for the knitting planner. Once only. |
| GET | `/jobs/:styleId/reuse` | PLANNING, bulk merch | Reuse fabric matching the job, hold state, reservations (see FABRIC_REUSE_API.md). |
| PUT | `/jobs/:styleId/reuse-hold` | PLANNING | `{ note? }` — hold the fabric order sheet approval until the reuse fabric is checked. |
| POST | `/jobs/:styleId/reuse-decision` | PLANNING | `{ decision: USE \| NOT_SUITABLE, note?, reserve? }` — reserve reuse kg or record why not suitable. |
| GET | `/jobs/:styleId/history` | PLANNING, SAMPLE | Approval history from the audit log. |

Approve / generate / description actions stay where they were: `/merch/bulk/jobs/:id/fabric-sheet/approve`, `/tna/generate`, `/tna`, `/tna/approve`, `/descriptions`, and `/merch/sample/sheets/:id/tna` and `/return` for samples.

## Rules
- **Reuse hold**: fabric order sheet approval is refused while a reuse check is on hold.
- **Signed copy first** (agreed rule): fabric order sheet approval and TNA approval are refused until the signed physical copy is recorded.
- Planning's next action order: receive signed fabric sheet → approve it → generate TNA → receive signed TNA → approve it → release to knitting → write item and print/emb description.
- Release total may not be more than 5% above the approved fabric order sheet finish kg; a difference above 1% is saved as a warning.
- Release goes to Knitting only. Dyeing, grey and finished fabric store requirement records are not built yet.
- Sample quota: a sheet is flagged over quota when the buyer line's used styles this month exceed its quota.

## Tests
- `npm run test:pa` — rule tests (5).
- `npm run test:merch` — bulk flow now includes return, signed copy gate and release.
- `npm run test:pa:db` with `DATABASE_URL` — 2 end-to-end tests on PostgreSQL.
