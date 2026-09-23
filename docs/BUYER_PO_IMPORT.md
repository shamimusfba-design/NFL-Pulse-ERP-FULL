# Buyer PO Import — Canonical Design

## Goal
When a user uploads a supported buyer PO PDF during Order Entry, the ERP must auto-populate the order instead of requiring manual re-entry.

Core auto-populated result:
- Buyer/Brand
- Merchandiser (user selects if not inferable)
- Internal Job No. (generated only after confirm)
- Style No. / Style Description
- Collection / Season when present
- Style Total Qty
- Color-wise + Size-wise Qty
- PO / Buyer Order Reference
- PO Qty
- CCD or buyer-native Shipment Date (never silently relabel one as the other)

Rich source fields (color code, EAN, destination/market, cancel date, transport, packing, in-store dates, lot etc.) are stored as metadata and shown in details, not forced into the simple main entry screen.

## Import Flow
Upload full PDF -> choose/detect buyer parser -> extract -> auto-populate preview -> validate -> Need Review if required -> Confirm -> create Order/Job.

`Need Review` does NOT mean blank data. Parsed values remain populated and only suspicious/mismatched fields are highlighted.

## Validation
1. Size sum = Color total
2. Color sum = Style total
3. PO/order-reference sum = Style total (when references are additive)
4. Source totals are compared with parsed totals

## Parser Families

### BESTSELLER v1
Brands using this parser: ONLY, NAME IT, ONLY & SONS.
Validated source example: `15323159 PO dated on 13.08.26.pdf`.
Parses: Style, PO number, PO qty, CCD, Cancel Date, Destination, Collection, Order Type, Color, Size, Color Code, EAN.

### OVS v1
Validated source example: `271PJA416SP-903 416PJA SHORT+ SCRITTA - Product Brief Supplier.pdf`.
Parses: Style Code, Style Description, Season, Collection Style, Supply Lot, Total Qty, Color x Size, Shipment Date, Supplier Agreed Date, In Store Date, Transport and Departure Port.
Important: current OVS source has no explicit PO No.; Collection Style is preserved as the buyer order reference. Shipment Date is stored as Shipment Date, not silently converted to CCD.

### UTG draft
Based on the provided Production Card photo. Parses planned identifiers and XS-XL breakdown where text extraction is available.
Must be tested against a full UTG PDF before production release. UTG date-to-CCD mapping is intentionally not assumed.

## New buyers
Each new buyer gets a versioned parser. Existing parsers remain unchanged when another buyer is added or a buyer changes layout.
