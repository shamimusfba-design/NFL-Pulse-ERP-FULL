NFL PULSE ERP v0.4.21 — FLOOR/LINE + GANTT PERFORMANCE + 2,000 JOB MASTER IMPORT

WHAT IS FIXED
1) Correct factory/floor/line master
   NFL / Sewing-01:
     General: A1,A2,B,B2,C,C2
     Shifting main lines: D1,D2,E1,E2,F,G1,G2,H1,H2
   NFL / Sewing-02:
     General: J1,J2,K1,K2,L1,L2,M1,M2,N1,N2,O1,O2,P1,P2,Q1,Q2,R1,R2,R3
   NFL / Sewing-03:
     General: S1,S2,T1,T2,U1,U2,X1,Y1,Y2,Z1,Z2
     Shifting main lines: U,V1,V2,W1,W2,ZA1,ZA2
   NCL / S-01: 1..7 (separate general lines)
   NCL / S-02: 8A,8B ... 15A,15B (each A/B is a separate physical line)
   NCL / S-03: 16A,16B ... 23A,23B (each A/B is a separate physical line)

   Total physical Gantt lines = 91: NFL 52 + NCL 39.
   NFL shifting main lines use one Gantt row, 8h A + 8h B = 16h/day, OT forced to 0.
   NFL general and all NCL lines support normal configurable hours (8–13h typical).
   Legacy typo CB is normalized to C2.
   ZA1A/ZA1B collapse to ZA1; ZA2A/ZA2B collapse to ZA2.

2) Gantt speed improvements
   - Browser requests only the selected 30/60/90-day window.
   - API reads Style rows directly instead of loading every Order with all Styles.
   - Floor/day and line/day machine load is indexed once per window instead of recalculating across every job repeatedly.
   - Jobs are indexed by line for rendering.
   - Search can find a Job outside the current window and jump to its date/factory.
   - Editing SMV/manpower/efficiency/hours remains local until Save Review/Confirm Move.

3) Canonical ERP Master Import
   Data Import recognizes sheet: ERP_MASTER_IMPORT
   The file fans one job row into:
   Merchandising, T&A, Yarn Store, Yarn Dyeing, Knitting, Greige, Dyeing, Fabric Finishing,
   Finished Fabric, Cutting, Printing, Embroidery, IE Bulletin, Sewing Planning, Sewing,
   Finishing/Packing and Shipment projections.

DEMO WORKBOOK
  demo-import\NFL_Pulse_ERP_2000_Job_Realistic_Demo_Aug-Nov_2026.xlsx
  - 2,000 unique jobs
  - 500 jobs each in Aug/Sep/Oct/Nov 2026
  - 127 fields per job
  - Real source backbone for buyer/job/style/order/item/merchandiser/T&A where available
  - Missing execution/IE/capacity values are realistic demo/derived and are tagged in Data_Quality
  - ERP Created dates span 01-Apr-2026 to 20-Sep-2026 to give the feel of ~6 months of ERP history
  - T&A is APPROVED; IE is APPROVED/RELEASED; Gantt plan is imported as official APPROVED with source release status preserved.

RECOMMENDED CLEAN START
A) Extract this ZIP into a NEW folder. Do not overwrite the old folder.
B) Copy your working apps\api\.env into this new folder.
C) If you want a completely clean operational DB, run RESET-ALL-ERP-DATA-KEEP-USERS.bat from the root and type RESET.
D) Run START-NFL-PULSE.bat. It seeds the approved master dropdowns AND all 91 physical lines.
E) Open Data Import and upload the demo workbook above.
F) Analyze & Preview. It should detect: NFL Pulse ERP Master Demo / Canonical Import.
G) Confirm 2,000 valid rows, then Import to ERP.
H) Open Sewing Planning. Use Aug/Sep/Oct/Nov month jump and 30/60/90 day views.

IMPORTANT
This demo workbook intentionally combines real factory source data with model-generated realistic execution data.
Use Data_Quality / IE_Data_Source / other source fields to distinguish real, distributed, shifted and demo values.
It is for ERP workflow/UI testing, not an official production record.
