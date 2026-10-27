# Sample Room module

Status: prototype UI agreed with the sample team owner (27 Oct 2026). Data is kept in the browser only; nothing is saved to PostgreSQL yet.

- Screen: `apps/web/public/sample-room/index.html`, opened from `/modules/sample-room`
- Replaces the earlier Sample Follow-up module (`/modules/sample-merchandising`), which has been removed
- Data used: October-26 sheets (SMS, PPS, Others) of *Garments Sample Production & Delivery Schedule*, 1,430 style × colour rows, report date 09.10.26
- Converter: `scripts/sample-room/import_schedule.py`

## Pages

**Sample follow-up**
- Sample type buttons: All, Offer, Development, Proto, Fit, SMS, PP, APP, Photo, BPS, Test, AR and every other type found in the data. One button changes cards, charts, quota and table.
- Filters: buyer, sub-brand, merchandiser, Coll #, delivery month, delivery status, present status, Print/Solid/Emb, sewing place, delay reason, search.
- Cards (click = filter): samples and pcs, delivered, pending, delivery date passed, delivery %, due in 7 days, fabric due.
- Compact charts: delivery status donut, buyer-wise table, quota by sub-brand, delay reason donut, present-status chips.
- Main table: present status and delivery status first, then all Excel columns, plus fabric requirement, knitting kg and dyeing kg for SMS/PP/APP.
- Row click opens an update panel: one-click steps (Fabric ok, Cut ok, Sent to print/emb, Sewing ok, Sent to buyer, Buyer comments ok, Revised), quantities, dates, delay reason, history.

**New sample entry**
- Quota on top, follows the sample type chosen in the form; warns when a sub-brand's quota is full.
- Form = Sample Fabric & Sample Garment Order Sheet: sample type + add-on types, buyer, sub-brand, merchandiser, style, Coll #, buyer sample order no, garment, size, Print/Solid/Emb, colours with qty (one row per colour), fabric parts and kg (SMS/PP/APP only), Sample T&A (Knitting, Dyeing, AOP, Cutting, Print, Sewing), ex-factory date.
- Main table below; new rows appear on top.

## Business rules captured
- Buyer is shown as ONLY, ONLY & SONS, NAME IT (not "Bestseller"); sub-brands (ONL-JRSY, NMT-Baby…) stay as their own column.
- A combined type such as "PP+Photo" is stored as separate types and counted under each.
- Offer / Development / Fit use available fabric; SMS and PP need knitting and dyeing, so fabric kg is tracked.
- Delivery due = Sewing close date for imported rows (Excel has no separate due date); new entries use the ex-factory date.
- Present status "Cmmts due", "PP ok/Approved" and "Revised" count as delivered to the buyer.
- Present status text (50–90 spellings a month) is normalised to 14 statuses; the original text is kept.
- Sewing place = Sample room / Line / Line B / NCL (from "(Line)", "(LineB)", "(NCL)" in the status text).

## Open items
- Quota sheet lines ↔ sub-brand codes are an assumption (e.g. NAME IT Basic Needs = NMT-Main, LMTD/Boy = NMT-Kids). Confirm with planning.
- Knitting and dyeing kg are demo numbers until the Knitting and Dyeing sample sub-modules provide them by style.
- Season master (Bestseller seasons) not added yet.

## Next build steps
1. Prisma models: `SampleOrderSheet` (header + T&A), `SampleLine` (one per colour), `SampleEvent` (history), `SampleQuota` (sub-brand × month × group).
2. NestJS endpoints: list with filters, create order sheet, update line, add event, quota usage.
3. Replace the browser storage in the prototype with these endpoints, then move the screen into React.
