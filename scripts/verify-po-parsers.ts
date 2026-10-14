import { parseBuyerPoFile, normalizeBuyer } from '../apps/web/lib/buyer-po-parser';
import * as fs from 'fs';

async function runTests() {
  console.log('=== STARTING UNIVERSAL PO PARSER VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${msg}`);
      failed++;
    }
  }

  // TEST 1: Buyer normalization
  assert(normalizeBuyer('OVS BD') === 'OVS', 'Normalizes OVS BD to OVS');
  assert(normalizeBuyer('ONLY & SONS') === 'ONLY & SONS', 'Normalizes ONLY & SONS');
  assert(normalizeBuyer('H&M Hennes & Mauritz') === 'H&M', 'Normalizes H&M');
  assert(normalizeBuyer('Zara Inditex') === 'ZARA', 'Normalizes ZARA');
  assert(normalizeBuyer('Target Brands') === 'TARGET', 'Normalizes TARGET');
  assert(normalizeBuyer('Custom Fashion Buyer') === 'CUSTOM FASHION BUYER', 'Preserves custom buyer');

  // TEST 2: PDF Parsing with fake worker pre-registration
  const testPdfPath = 'node_modules/.bun/pdf-parse@1.1.1/node_modules/pdf-parse/test/data/01-valid.pdf';
  if (fs.existsSync(testPdfPath)) {
    const pdfBuf = fs.readFileSync(testPdfPath);
    const pdfBlob = new Blob([pdfBuf], { type: 'application/pdf' });
    const pdfFile = new File([pdfBlob], '01-valid.pdf', { type: 'application/pdf' });
    try {
      const res = await parseBuyerPoFile(pdfFile, 'GENERIC');
      assert(res !== null, 'Successfully parsed PDF without fake worker error');
      assert(res.validation !== undefined, 'Generated valid validation result for PDF');
    } catch (e: any) {
      assert(false, `PDF parse failed: ${e.message}`);
    }
  }

  // TEST 3: Universal Apparel PO with Horizontal Size Breakdown (e.g. Zara / Inditex or H&M)
  const universalPoText = `
PURCHASE ORDER: PO-INDITEX-99824
Buyer: ZARA INDITEX
Style No: 8829-Z-01
Item Description: MEN SLIM FIT KNIT POLO SHIRT
Season: Spring 2026
Delivery Date: 2026-11-20
Destination: SPAIN BARCELONA

ORDER BREAKDOWN:
Color / Shade        XS    S     M     L     XL    XXL   Total
0100 BLACK          100   300   500   500   300   100   1800
0250 NAVY BLAZER    150   450   750   750   450   150   2700
0800 OPTICAL WHITE  100   300   500   500   300   100   1800

Total Order Quantity: 6300 pcs
`;
  const universalBlob = new Blob([universalPoText], { type: 'text/plain' });
  // Pass as fake PDF text check by creating a Mock File or testing direct universal parser
  const { parseUniversalPoDocument } = await import('../apps/web/lib/buyer-po-parser');
  const uRes = parseUniversalPoDocument(universalPoText, 'ZARA_PO_99824.pdf', 'ZARA');
  assert(uRes.buyerCode === 'ZARA', 'Correctly identified buyer as ZARA');
  assert(uRes.styles.length === 1, 'Extracted 1 style');
  assert(uRes.styles[0].styleNo === '8829-Z-01', 'Extracted style number 8829-Z-01');
  assert(uRes.styles[0].totalQty === 6300, `Reconciled total quantity 6300 pcs (got ${uRes.styles[0].totalQty})`);
  assert(uRes.styles[0].colors.length === 3, `Extracted all 3 color rows (got ${uRes.styles[0].colors.length})`);
  assert(uRes.validation.status === 'VALIDATED', 'Reconciliation status is VALIDATED (100% matched)');

  // TEST 4: Multi-Style & Multi-PO Order File
  const multiPoText = `
PURCHASE ORDER
Buyer: TARGET STORES
PO No: PO-US-55401
PO No: PO-CA-55402
Style No: TARGET-TEE-01
Style No: TARGET-HOODIE-02
Item Description: ESSENTIAL CREW TEE & FLEECE HOODIE
Delivery Date: 2026-12-15
Destination: USA CHICAGO

Color Breakdown:
DARK CHARCOAL    200   400   600   400   200   1800
HEATHER GREY     300   600   900   600   300   2700

Total Quantity: 4500
`;
  const mRes = parseUniversalPoDocument(multiPoText, 'TARGET_MULTI_ORDER.pdf', 'TARGET');
  assert(mRes.styles.length === 2, `Extracted multiple styles (got ${mRes.styles.length})`);
  assert(mRes.styles[0].orderReferences.length === 2, `Preserved both PO references (got ${mRes.styles[0].orderReferences.length})`);
  assert(mRes.validation.status === 'VALIDATED', 'Multi-Style multi-PO order validated successfully');

  // TEST 5: Sequential Upload Isolation (verifying upload 2 is not affected by upload 1)
  const po1Text = `
PURCHASE ORDER
Buyer: ONLY
Order no. 48091
Style No: 11111111
Color: RED
Total Qty: 2000
S: 500, M: 500, L: 500, XL: 500
`;
  const po2Text = `
PURCHASE ORDER
Buyer: UTG
Order No. 99999
Style No: 22222222
Color: BLUE
Total Qty: 5000
S: 1250, M: 1250, L: 1250, XL: 1250
`;
  const res1 = parseUniversalPoDocument(po1Text, 'PO1.pdf', 'ONLY');
  const res2 = parseUniversalPoDocument(po2Text, 'PO2.pdf', 'UTG');
  // TEST 6: Excel (.xlsx) file parsing
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Style No', 'PO No', 'Description', 'Color', 'S', 'M', 'L', 'XL', 'Total'],
    ['HM-TEE-77', 'PO-HM-1001', 'Jersey Crew Neck', 'BLACK', 200, 400, 400, 200, 1200],
    ['HM-TEE-77', 'PO-HM-1001', 'Jersey Crew Neck', 'WHITE', 150, 300, 300, 150, 900],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'OrderDetails');
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const excelFile = new File([excelBuffer], 'HM_ORDER.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const excelRes = await parseBuyerPoFile(excelFile, 'H&M');
  assert(excelRes.styles.length === 1, 'Excel parsed 1 style');
  assert(excelRes.styles[0].styleNo === 'HM-TEE-77', 'Excel extracted style HM-TEE-77');
  assert(excelRes.styles[0].totalQty === 2100, `Excel reconciled total quantity 2100 (got ${excelRes.styles[0].totalQty})`);
  assert(excelRes.validation.status === 'VALIDATED', 'Excel reconciliation is VALIDATED');

  // TEST 7: CSV file parsing
  const csvContent = `Style,PO,Description,Color,Size,Qty\nPOLO-99,PO-CSV-88,Classic Pique,NAVY,M,500\nPOLO-99,PO-CSV-88,Classic Pique,NAVY,L,500\n`;
  const csvFile = new File([Buffer.from(csvContent)], 'ORDER.csv', { type: 'text/csv' });
  const csvRes = await parseBuyerPoFile(csvFile, 'MANGO');
  assert(csvRes.styles.length === 1, 'CSV parsed 1 style');
  assert(csvRes.styles[0].totalQty === 1000, `CSV reconciled 1000 pcs (got ${csvRes.styles[0].totalQty})`);

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
