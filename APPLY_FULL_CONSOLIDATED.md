# NFL Pulse ERP — Full Consolidated Pilot Build

This package consolidates the current agreed NFL Pulse ERP implementation into one codebase. It replaces the need to apply the earlier v0.3.x patches one-by-one.

## Safe update on the current Windows project

1. Stop the current dev server with `Ctrl + C`.
2. Keep Docker Desktop running.
3. Back up the current project folder if you want a rollback copy.
4. Extract this ZIP.
5. Copy **all files and folders inside the extracted project root** into the current project root:

   `C:\Users\User\Documents\NFL Pulse\NFL-Pulse-ERP-STARTER\NFL-Pulse-ERP-STARTER`

6. Choose **Replace the files in the destination**. Do **not** delete the current project folder first. The ZIP does not contain `.env`, `node_modules`, or `.git`, so those existing local items remain.
7. In the project terminal run:

```powershell
npm.cmd run db:seed
npm.cmd run dev
```

No new Prisma schema migration is required for this consolidated build.

## Load the full 50-job demo set

Login as:
- `admin@nfl.local`
- password `ChangeMe123!`

On the Management Overview click **Load / Reset 50 Demo Jobs**.

This recreates demo jobs `990001`–`990050` with connected data across Merchandising, CAD, IE, T&A, Yarn, Procurement, Yarn Store, Yarn Dyeing, Knitting, Greige Store, Dyeing, Lab/Testing, Fabric Finishing, Finished Fabric, Cutting, Printing, Embroidery, Special Process, Sewing, Finishing/Packing, Quality, Shipment, Job 360 and histories.

Admin can later click **Delete All Demo Data**. The delete routine only removes records marked as NFL demo data; real jobs are not selected by that routine.

CLI alternatives:

```powershell
npm.cmd run demo:seed
npm.cmd run demo:clear
```

## Central Planning test flow

1. Login `planning@nfl.local` / `ChangeMe123!`.
2. Open **Central Planning → Time & Action Planning**.
3. Click **Auto Generate All Pending T&A**.
4. Review the suggested dates and the Capacity Heatmap.
5. Adjust dates if needed.
6. Click **Approve & Release** when capacity is acceptable. An authorized override is available for an intentional overload.
7. Approved T&A releases the relevant dates to Merchandising and automatically creates a Sewing Gantt draft.
8. Open **Central Planning → Sewing Line Planning**.
9. Review the auto-loaded jobs, use the Job / Item / Present Status / Buyer / Style / Risk / Plan vs Actual views, adjust lines/dates as needed, and save the review.
10. Click **Approve Official Plan** (or approve all reviewed drafts). Central Planning is the authority for the official future line plan.

## Demo/test users

All development users use password `ChangeMe123!`.

- admin@nfl.local
- planning@nfl.local
- ie@nfl.local
- cad@nfl.local
- quality@nfl.local
- merch@nfl.local
- samplemerch@nfl.local
- bothmerch@nfl.local
- merchhead@nfl.local
- sample@nfl.local
- yarn@nfl.local
- scm@nfl.local
- yarnstore@nfl.local
- yarndyeing@nfl.local
- knitting@nfl.local
- dyeing@nfl.local
- lab@nfl.local
- cutting@nfl.local
- printing@nfl.local
- embroidery@nfl.local
- sewing@nfl.local
- finishing@nfl.local
- shipment@nfl.local

## Intentionally pending exact print skins

The data flow and print-entry points for Fabric Order Sheet, T&A Plan and outside Work Order are present, but the exact company Excel layouts are intentionally not claimed as final. Replace those print skins after the factory supplies the exact Excel templates. The business data flow does not need to be redesigned for that change.
