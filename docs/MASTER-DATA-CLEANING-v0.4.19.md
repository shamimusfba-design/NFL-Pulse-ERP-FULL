# Master Data Cleaner — current rules in v0.4.21

Approved import behavior:

- Buyer: 12 canonical buyers; known spellings/GBX/GT/BS aliases normalize to the canonical buyer.
- Sewing line: 91 approved physical Gantt lines in the current factory model: NFL 52 + NCL 39.
- NFL A/B shift aliases collapse only for approved shifting pairs. Main shifting lines: D1,D2,E1,E2,F,G1,G2,H1,H2,U,V1,V2,W1,W2,ZA1,ZA2.
- NFL shifting main lines = one Gantt row, 8h A + 8h B = 16h/day, no OT.
- NCL A/B is part of the physical line name: 8A and 8B (etc.) remain separate lines.
- `CB` is corrected to `C2`; `ZA1A/ZA1B -> ZA1`; `ZA2A/ZA2B -> ZA2`.
- Merchandiser: exactly the 37 user-approved names; unknown names stay for review instead of becoming dropdown values.
- Present status: all 16 approved statuses are retained, including Need Cut FB / Size Set Run PC / Emb / Print / Rib Due / Fab Due.
- Factory: GTA and Giant-Tex are separate. Obvious spelling variants like DB Tec -> DB Tex are corrected. Combined values are split.
- GSM and Width/Dia are NOT dropdown masters; raw report values are preserved.
- Job No: full source form is preserved, including ordinal short forms such as `48551 1st` / `26827 49th`.
- Raw source value is always preserved in import rows and normalization audit fields.
- Summary/subtotal/Left Over/non-job rows do not create masters because job rows must begin with a numeric job number.
