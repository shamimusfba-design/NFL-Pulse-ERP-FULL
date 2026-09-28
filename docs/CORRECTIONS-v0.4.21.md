# NFL Pulse ERP v0.4.21 corrections

## Approved physical line model
- NFL: A/B suffix in approved shift pairs is a shift, not a second Gantt physical row.
- NFL shifting main lines: D1, D2, E1, E2, F, G1, G2, H1, H2, U, V1, V2, W1, W2, ZA1, ZA2.
- Each shifting main line = 8h A + 8h B = 16h capacity, no OT.
- NFL general lines use configurable 8–13h working time.
- `CB` normalizes to `C2`.
- `ZA1A/ZA1B -> ZA1`; `ZA2A/ZA2B -> ZA2`.
- NCL: A/B is part of the physical line name; e.g. `8A != 8B` and both render separately.

## Performance
The Gantt now window-loads data, uses indexed floor/line loads, and indexes jobs by line. Server-side exact search can locate a job outside the selected date window.

## Canonical demo import
The `ERP_MASTER_IMPORT` profile supports the supplied 2,000-job wide workbook and fans it into all relevant module projections.
