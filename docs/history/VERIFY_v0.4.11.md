# Verification — v0.4.11 Gantt Planner Intelligence

After starting API and Web, open Sewing Line Planning and verify:

1. Drag an unlocked primary job bar left/right. It physically follows pointer and opens Move Preview on release.
2. Drag to another line and Confirm Move. Reload and confirm line/date persisted.
3. Open a job, change Sewing Start. Bar position moves immediately before save.
4. Change SMV / Manpower / Efficiency / Hours / OT. Daily Target, Required Days and Forecast Finish recalculate live.
5. Set Actual Qty to 50% of Order Qty. Plan & Actual bar shows approximately 50% green progress.
6. Increase capacity inputs until an overloaded job resolves; red overload styling disappears when floor capacity is no longer exceeded.
7. Readiness section displays Fabric, Cutting, Print/Embroidery where applicable, Trims and IE states.
8. Smart line recommendation shows best-fit lines and conflict-day counts.
9. Use Auto Re-plan Best Line and confirm the line selection changes in the editor/chart.
10. Add a split allocation to a second line. A dashed SPLIT bar appears on the second line and persists after Save Review + reload.
11. Approve a job, revise it later, and enable Baseline. Original approved baseline remains visible as a dashed baseline bar.
12. Freeze a plan. Job cannot be dragged and planning fields are disabled. Unlock + Save allows editing again.
13. Save at least two revisions, then use Undo Last Saved Change. Previous saved Gantt state is restored.
14. Month jump / Start Date / 30-60-90 day timeline continue to work.
15. Search Job / Style / Item and press Enter. Timeline jumps near the job and popup opens.
16. CSV export downloads visible plan rows; Snapshot / Print opens browser print flow.

Note: source ZIP does not contain node_modules. Install dependencies in your normal environment before full npm build/runtime verification.
