# Fabric reuse (greige + finished fabric stores)

Owner's rule (29 Oct 2026): fabric left in the stores must be used again before new knitting / dyeing.
- Greige left after a job's batches are dyed, and finished fabric left after **cutting OK + shipment date passed**, go to the reuse list.
- When a merchandiser sends a **fabric order sheet**, matching reuse stock is suggested. Central Planning sees it in the approval desk and can **hold** the approval until the fabric is checked physically, then **Use stock** (kg reserved for the job) or **Not suitable** (reason).

## Matching rule (`apps/api/src/reuse/reuse.rules.ts`)
Must match: fabric type **and** construction (1x1 / 2x2 / 2x1 rib, loop back, brushed back, slub …), GSM within ±5%, width (greige ±2"; finished same or up to 6" wider), composition when both sides record it, and colour for finished fabric (greige only for yarn-dyed / melange). AOP / print never matches. Shade always gets a physical check (different dye lot).

## API — `/api/reuse` (login required)
| Method | Path | Who | What |
|---|---|---|---|
| GET | `/stock?store&fabricType&construction&colour&status` | any | reuse stock rows + total kg available |
| GET | `/matches?fabric&gsm&dia&composition&colour&process&store` | any | ranked matches for one requirement |
| POST | `/stock` | GREIGE_STORE, FINISHED_FABRIC_STORE, FABRIC_FINISHING | add left-over fabric (source LEFT_AFTER_DYEING / LEFT_AFTER_CUTTING / GREIGE_EXCESS_LIST) |
| PATCH | `/stock/:id` | same | AVAILABLE / USED / NOT_REUSABLE (reason required) |

## Hooks into merchandising and planning
- `POST /api/merch/bulk/jobs/:styleId/fabric-sheet` now returns `reuse` (per colour × part: suggestions, matchKg counting each stock row once) and stores it on the fabric order sheet. If anything matches, Planning gets the task "Check reuse fabric before approving fabric order sheet".
- Planning approval desk (`/api/planning/approvals`): queue rows carry `reuse { matchKg, matchedLines, hold }`.
  - `GET /jobs/:styleId/reuse` — fresh suggestions, hold state, reservations (Planning, bulk merchandisers)
  - `PUT /jobs/:styleId/reuse-hold` `{ note? }` — hold; the merchandiser gets a "Check reuse fabric physically" task
  - `POST /jobs/:styleId/reuse-decision` `{ decision: USE | NOT_SUITABLE, note?, reserve?: [{ stockId, kg }] }` — USE reserves kg (cannot exceed what is left); NOT_SUITABLE needs a reason
- `POST /api/merch/bulk/jobs/:styleId/fabric-sheet/approve` is refused while the reuse hold is open.

## Data
- `ReuseStock`, `ReuseReservation` (migration `20261101090000_fabric_reuse`).
- Starting stock: `npm run prisma:reuse-seed -w @nfl/api` — 688 finished-fabric lines (166,233 kg) from the Jan-26 Fabric Store Inventory closing stock and 88 greige "useable excess" lines from the 28.09.26 greige report.

## Store pages
`/greige-store/index.html` and `/finished-fabric/index.html` are connected to `/api/stores` (STORES_API.md). Sending fabric to reuse there creates / updates the `ReuseStock` row (`ref` GREIGE:G:n / FINISHED:F:n, source LEFT_AFTER_DYEING / LEFT_AFTER_CUTTING).

## Tests
- `npm run test:reuse -w @nfl/api` — 4 rule tests.
- `npm run test:reuse:db -w @nfl/api` with `DATABASE_URL` — seed + full fabric order sheet → suggestion → hold → approval blocked → reserve → approve, on PostgreSQL.
