# Buyer PO Import Acceptance Baselines

These values were used to test the parser logic against the actual buyer PDFs supplied during requirements analysis.

## BESTSELLER / ONLY sample
Source: `15323159 PO dated on 13.08.26.pdf`
- Style: 15323159
- Total: 49,292 pcs
- PO count: 14
- Size totals: XS 5,835 | S 11,663 | M 14,623 | L 10,449 | XL 6,228 | XXL 247 | XXXL 247
- Color totals:
  - Cloud Dancer 17,706
  - Black 10,270
  - Italian Straw 3,488
  - Sweet Dreams 3,449
  - Black Coffee 3,040
  - Cornflower Blue 2,936
  - Balsam Green 1,287
  - Pumice Stone 1,287
  - Bitter Chocolate 1,272
  - Mauve Mist 1,188
  - Dusk 1,092
  - Wild Orchid 984
  - Light Grey Melange 780
  - Flint Stone 513

Parser text-logic test result: VALIDATED; no arithmetic warnings.

## OVS sample
Source: `271PJA416SP-903 416PJA SHORT+ SCRITTA - Product Brief Supplier.pdf`
- Style: 271PJA416SP-903
- Collection Style: 6084236
- Supply Lot: 1
- Shipment Date: 14-Dec-2026
- Total: 43,366 pcs
- Sizes: S 12,326 | M 12,419 | L 6,303 | XL 6,190 | XXL 6,128
- Colors:
  - Lavender Lustre 9,307
  - Naval Academy 9,454
  - Flushing 9,420
  - Pink Marshmellow 8,194
  - Bright White 6,991

Parser text-logic test result: VALIDATED; no arithmetic warnings.

OVS Product Brief allocation acceptance:
- The PDF has no conventional PO number. The six operational references are market/country headings, imported as MARKET references rather than fabricated PO numbers.
- Expected market totals from the page-1 summary: ITALY 42,081 | WARM 574 | INDIA 77 | MIDDLE EAST 203 | COLD 371 | DUBAI 60.
- Market allocation sum: 43,366 pcs, matching the style total.
- Expected reference labels in the import preview: ITALY, WARM, INDIA, MIDDLE EAST, COLD, DUBAI. The original PDF heading is retained in metadata for traceability.
- Expected market Color × Size rows come from the delivery/color sections; repeated Kit and Piece allocations for a market must be summed, not treated as separate POs.

## UTG
Only a Production Card photo was supplied at this stage. The draft parser is deliberately marked Need Review until a full UTG PDF is supplied and tested.
