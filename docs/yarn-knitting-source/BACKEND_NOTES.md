# Notes for the Yarn Store & Knitting backend

- Knitting plan = one ordered queue per machine. Store per line: machine id, queue position, optional "not before" date.
  Start = previous line's finish (or the not-before date); finish = start + balance kg / machine kg per day.
  Drag & drop and "move earlier / later" only change machine, position and not-before date. The API must take
  these three and re-calculate the whole machine queue in one transaction.
- HOLD / Y-NILL lines keep their machine but are out of the queue until released.
- Machines (34) and kg/day come from "Machine wise Knitting Program-2026.xlsx", Summary sheet.
- List plan export must keep the sheet's columns (Date Production … T&A Delay Days).
- Every table filter is client-side today; the API should support the same filters server-side for large data.
