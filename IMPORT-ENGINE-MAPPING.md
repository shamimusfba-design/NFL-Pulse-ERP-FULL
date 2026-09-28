# Smart Factory Import Engine — current mapping in v0.4.21

## Auto-detected source reports
1. T&A Plan & Execution Summary
2. Cutting, Print & Input Summary
3. Finish Fabric Plan & Execution Status
4. IE Bulletin Summary
5. NFL Pulse ERP Canonical Master Import (`ERP_MASTER_IMPORT`)

## Controlled dropdown / master data
- Buyer: 12 approved canonical buyers with alias correction.
- Sewing Line: 91 physical lines: NFL 52 + NCL 39, factory/floor aware.
- Merchandiser: 37 approved names.
- Present Status: 16 approved status values.
- NFL floors: Sewing-01, Sewing-02, Sewing-03.
- NCL floors: S-01, S-02, S-03.
- Factory/process factory: approved factory set; GTA is NOT Giant-Tex.
- Additional Process: controlled multi-value process set.
- Print/Embroidery type: Printing, Embroidery.

## Line semantics
- NFL shifting main lines collapse A/B shift labels to one physical Gantt row and use 16h capacity without OT.
- NCL A/B names are separate physical lines and never collapse.
- `CB -> C2`; ZA shift aliases normalize to ZA1/ZA2.

## Not dropdown masters
GSM, Width/Dia, Color, Fabric Description, Job No, Style No, Batch No, Remarks stay as normal/searchable source data.

## Typo/alias policy
Known aliases and obvious spelling mistakes are corrected to the approved master. Raw source text is preserved in the import row and normalization audit. Unknown/ambiguous values are not silently added to dropdowns; they are marked for review.

## Canonical master fan-out
The `ERP_MASTER_IMPORT` sheet is one row per job and fans out to Merchandising, T&A, Yarn Store, Yarn Dyeing, Knitting, Greige, Dyeing, Fabric Finishing, Finished Fabric, Cutting, Printing, Embroidery, IE Bulletin, Sewing Planning, Sewing, Finishing and Shipment projections.

## Job number policy
Full factory job value is retained, including ordinal suffixes/short forms (e.g. `26827 49th`, `48551 1st`).

## Row quality guard
Only rows with a numeric-leading job number are treated as production rows. Summary/G.Total/factory/process rows do not become ERP masters.
