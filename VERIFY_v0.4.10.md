# v0.4.10 Gantt interaction hotfix

Root cause fixed:
- Popup edited only `selected`, while rendered bars used `rows`; therefore Start Date changes did not move the visible bar.
- Native HTML `draggable` on the Gantt button was unreliable and behaved like a ghost/image drag instead of a real planning bar.

Fixes:
1. Popup edits now update the rendered Gantt row immediately (live preview).
2. Start Date recalculates Finish Date and visibly shifts/resizes the job bar immediately.
3. Finish Date manual change also updates bar width immediately.
4. Save Review now persists BOTH startDate and finishDate.
5. Native HTML drag replaced by Pointer Events.
6. Bar follows pointer horizontally and vertically during drag.
7. Horizontal movement snaps to day columns on release.
8. Vertical release detects target line and previews reassignment.
9. Drop creates an optimistic visible move plus a Confirm Move panel.
10. Cancel restores the original line/dates; Confirm persists through the planning API.
11. touch-action:none added to job bars for mouse/touch pointer dragging.

Validation note:
- Static TypeScript parse reached this file without syntax/parser errors.
- Full `tsc --noEmit` cannot complete in the unpacked ZIP because node_modules / React / Next type packages are not bundled in the source archive; resulting errors are dependency/type-resolution errors rather than this patch's syntax.
