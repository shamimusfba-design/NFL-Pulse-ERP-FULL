import { BestsellerParser } from '../src/order-import/bestseller.parser';
import { OvsParser } from '../src/order-import/ovs.parser';
import { UtgParser } from '../src/order-import/utg.parser';
import { ExcelCsvParser } from '../src/order-import/excel-csv.parser';
import * as XLSX from 'xlsx';

console.log('=== TEST SUITE: PO IMPORT PARSERS & RECONCILIATION ===\n');

const bestseller = new BestsellerParser();
const ovs = new OvsParser();
const utg = new UtgParser();
const excelCsv = new ExcelCsvParser();

// 1. Real Bestseller PO 1
console.log('TEST 1: Real Bestseller PO NOF4754678 (48 pcs)');
const bsPo1 = `
PURCHASE ORDER
NORTHERN FASHION LTD.
Order no. NOF4754678
Collection 2027 1_SPRING1 ( 2027 01-03 )
Order stat. type MAIN
Creation date August 13, 2026
Issuer of the co. BESTSELLER Wholesale Canada Inc.- CANADA
Destination CANADA
Style Information
No: 15323159
EAN: 5715513457153
Name: ONLRILEY O-NECK L/S TOP JRS NOOS
Quantity: 48 PCS.
Price per item: 2.90 USD
Total amount: 139.20 USD
DATES
# 1 WHS CANADA Cargo closing date (CCD) 2026-11-02 Cancel date 2026-11-16
SUMMING UP THE PRODUCTION
ORDER TOTAL Total
Cornflower Blue Box Drop 2 4 4 4 2 16
Italian Straw Box Drop 2 4 4 4 2 16
Sweet Dreams Box Drop 2 4 4 4 2 16
Total 6 12 12 12 6 48
Colour Variant name Size/Length Colour code EAN-No.
Cornflower Blue XS 16-4031 TCX 5715994392660
Cornflower Blue S 16-4031 TCX 5715994392677
Cornflower Blue M 16-4031 TCX 5715994392684
Cornflower Blue L 16-4031 TCX 5715994392691
Cornflower Blue XL 16-4031 TCX 5715994392707
Italian Straw XS 13-0917 TCX 5715998599393
Italian Straw S 13-0917 TCX 5715998599386
Italian Straw M 13-0917 TCX 5715998599409
Italian Straw L 13-0917 TCX 5715998599416
Italian Straw XL 13-0917 TCX 5715998599379
Sweet Dreams XS 13-2809 TCX 5715994392714
Sweet Dreams S 13-2809 TCX 5715994392721
Sweet Dreams M 13-2809 TCX 5715994392738
Sweet Dreams L 13-2809 TCX 5715994392745
Sweet Dreams XL 13-2809 TCX 5715994392752
`;
const res1 = bestseller.parse(bsPo1, 'NOF4754678.pdf', 'ONLY');
if (res1.styles[0].totalQty !== 48 || res1.validation.status !== 'VALIDATED') {
  throw new Error(`Test 1 Failed: expected 48 pcs and VALIDATED, got ${res1.styles[0].totalQty} and ${res1.validation.status}`);
}
console.log('✓ Test 1 Passed: 48 pcs extracted, 100% reconciled.\n');

// 2. Real Bestseller PO 2 with different quantities
console.log('TEST 2: Different Bestseller PO NOF4754793 (7,926 pcs)');
const bsPo2 = `
PURCHASE ORDER
NORTHERN FASHION LTD.
Order no. NOF4754793
Collection 2027 1_SPRING1 ( 2027 01-03 )
Order stat. type KEY ACCOUNT
Creation date August 13, 2026
Issuer of the co. Bestseller A/S-DENMARK
Destination DENMARK
Style Information
No: 15323159
EAN: 5715513457153
Name: ONLRILEY O-NECK L/S TOP JRS NOOS
Quantity: 7926 PCS.
Price per item: 2.90 USD
Total amount: 22,985.40 USD
DATES
# 1 E-COM CB CENTRAL Cargo closing date (CCD) 2026-10-28 Cancel date 2026-11-11
SUMMING UP THE PRODUCTION
ORDER TOTAL Total
Balsam Green Collection 99 264 396 297 165 33 33 1287
Bitter Chocolate Box Drop 62 144 206 144 82 20 20 678
Black Basic NOOS 52 118 170 118 66 14 14 552
Cloud Dancer Basic NOOS 70 163 233 163 93 23 23 768
Dusk Box Drop 62 144 206 144 82 20 20 678
Italian Straw Box Drop 46 115 161 115 69 23 23 552
Light Grey Melange Basic NOOS 34 75 109 75 41 7 7 348
Mauve Mist Box Drop 66 165 231 165 99 33 33 792
Pumice Stone Collection 99 264 396 297 165 33 33 1287
Wild Orchid Collection 82 205 287 205 123 41 41 984
Total 672 1657 2395 1723 985 247 247 7926
Colour Variant name Size/Length Colour code EAN-No.
Balsam Green XS 18-5606 TCX 5715999953828
Balsam Green S 18-5606 TCX 5715999953767
Balsam Green M 18-5606 TCX 5715999953798
Balsam Green L 18-5606 TCX 5715999953804
Balsam Green XL 18-5606 TCX 5715999953774
Balsam Green XXL 18-5606 TCX 5715999953811
Balsam Green XXXL 18-5606 TCX 5715999953781
Bitter Chocolate XS 19-1317 TCX 5715998599331
Bitter Chocolate S 19-1317 TCX 5715950862190
Bitter Chocolate M 19-1317 TCX 5715950862176
Bitter Chocolate L 19-1317 TCX 5715998599324
Bitter Chocolate XL 19-1317 TCX 5715998599317
Bitter Chocolate XXL 19-1317 TCX 5715998599577
Bitter Chocolate XXXL 19-1317 TCX 5715998599584
Black XS C-N10 5715514013938
Black S C-N10 5715514013945
Black M C-N10 5715514013952
Black L C-N10 5715514013969
Black XL C-N10 5715514013976
Black XXL C-N10 5715611029726
Black XXXL C-N10 5715611026398
Cloud Dancer XS 11-4201 TCX 5715514013983
Cloud Dancer S 11-4201 TCX 5715514013990
Cloud Dancer M 11-4201 TCX 5715514014003
Cloud Dancer L 11-4201 TCX 5715514014010
Cloud Dancer XL 11-4201 TCX 5715514014027
Cloud Dancer XXL 11-4201 TCX 5715611029719
Cloud Dancer XXXL 11-4201 TCX 5715611026350
Dusk XS 17-3812 TCX 5715998599362
Dusk S 17-3812 TCX 5715950862206
Dusk M 17-3812 TCX 5715950862183
Dusk L 17-3812 TCX 5715998599348
Dusk XL 17-3812 TCX 5715998599355
Dusk XXL 17-3812 TCX 5715998599638
Dusk XXXL 17-3812 TCX 5715998599645
Italian Straw XS 13-0917 TCX 5715998599393
Italian Straw S 13-0917 TCX 5715998599386
Italian Straw M 13-0917 TCX 5715998599409
Italian Straw L 13-0917 TCX 5715998599416
Italian Straw XL 13-0917 TCX 5715998599379
Italian Straw XXL 13-0917 TCX 5715998599591
Italian Straw XXXL 13-0917 TCX 5715998599607
Light Grey Melange XS BS000086 5715514014034
Light Grey Melange S BS000086 5715514014041
Light Grey Melange M BS000086 5715514014058
Light Grey Melange L BS000086 5715514014065
Light Grey Melange XL BS000086 5715514014072
Light Grey Melange XXL BS000086 5715611029702
Light Grey Melange XXXL BS000086 5715611026282
Mauve Mist XS 15-3207 TCX 5715831440103
Mauve Mist S 15-3207 TCX 5715831440110
Mauve Mist M 15-3207 TCX 5715831440127
Mauve Mist L 15-3207 TCX 5715831440134
Mauve Mist XL 15-3207 TCX 5715831440141
Mauve Mist XXL 15-3207 TCX 5715998599614
Mauve Mist XXXL 15-3207 TCX 5715998599621
Pumice Stone XS 14-0002 TCX 5715999953835
Pumice Stone S 14-0002 TCX 5715999953866
Pumice Stone M 14-0002 TCX 5715999953873
Pumice Stone L 14-0002 TCX 5715999953842
Pumice Stone XL 14-0002 TCX 5715999953859
Pumice Stone XXL 14-0002 TCX 5715999953880
Pumice Stone XXXL 14-0002 TCX 5715999953897
Wild Orchid XS 16-2120 TCX 5715999953958
Wild Orchid S 16-2120 TCX 5715999953941
Wild Orchid M 16-2120 TCX 5715999953965
Wild Orchid L 16-2120 TCX 5715999953903
Wild Orchid XL 16-2120 TCX 5715999953910
Wild Orchid XXL 16-2120 TCX 5715999953927
Wild Orchid XXXL 16-2120 TCX 5715999953934
`;
const res2 = bestseller.parse(bsPo2, 'NOF4754793.pdf', 'ONLY');
if (res2.styles[0].totalQty !== 7926 || res2.validation.status !== 'VALIDATED') {
  throw new Error(`Test 2 Failed: expected 7926 pcs, got ${res2.styles[0].totalQty}`);
}
console.log('✓ Test 2 Passed: 7,926 pcs extracted, 100% reconciled.\n');

// 3. Real OVS Product Brief
console.log('TEST 3: OVS Product Brief 271PJA416SP-903 (43,366 pcs with 6 markets)');
const ovsBrief = `
Style Code: 271PJA416SP-903 Style Description: 416PJA SHORT+ SCRITTA Creation Season: 20271
PM: CCASADOR Commodity: 90 PYJAMAS Buying Office: OVS BD
Department: 903 NIGHTWEAR WOMAN Theme: APRILE SP FISSI Main Supplier: 46626 NORTHERN FASHION LTD.
Year Period: 20271 Supply Lot: 1 Shipment Date: 14 Dec 2026 Status: 160 Style Coll Id: 6084236
Total Quantity: 43366 Means of Transport: SEA In Store Date: 15 Mar 2027
Total quantities per color size
Swatch Color Option Description Item Code S M L XL XXL Total 1 OVS ITALY 2 OVS WARM 21 OVS INDIA 24 OVS MIDDLE EAST 25 OVS COLD 26 REPL. HUB DUBAI
2118 16-3920 TCX LAVENDER LUSTRE LAVENDER LUSTRE 2961621 2646 2665 1352 1329 1315 9307 9105 70 14 42 56 20
3439 19-3932 TCX NAVAL ACADEMY NAVAL ACADEMY 2961626 2688 2707 1373 1350 1336 9454 9105 161 21 42 105 20
3694 13-2705 TCX FLUSHING PINK FLUSHING 2961631 2679 2697 1366 1344 1334 9420 9105 147 21 42 105 0
3131 12-2907 TCX PINK MARSHMELLOW PINK MARSHMELLOW 2961636 2328 2347 1193 1170 1156 8194 8090 49 0 35 0 20
1355 11-0601 TCX BRIGHT WHITE BRIGHT WHITE 2961641 1985 2003 1019 997 987 6991 6676 147 21 42 105 0
12326 12419 6303 6190 6128 43366 42081 574 77 203 371 60
TECHNICAL OPTIONS
ID Description Color Swatch Supplier Opt. Description Subject Subject Description
1 LAVENDER LUSTRE 2118 16-3920 TCX LAVENDER LUSTRE LAVENDER LUSTRE
2 NAVAL ACADEMY 3439 19-3932 TCX NAVAL ACADEMY NAVAL ACADEMY
3 FLUSHING 3694 13-2705 TCX FLUSHING PINK FLUSHING
4 PINK MARSHMELLOW 3131 12-2907 TCX PINK MARSHMELLOW PINK MARSHMELLOW
5 BRIGHT WHITE 1355 11-0601 TCX BRIGHT WHITE BRIGHT WHITE
\f
HEADING : 1 OVS ITALY YEAR PERIOD: 20271
COLLECTION STYLE : 6084236 LOT : 1 LOT STATUS : 160 ORDERED
Delivery/color Net Cost Means of Transport Shipment Date In Store Date Packing Type S M L XL XXL Total
LAVENDER LUSTRE 3,41 $ SEA 14 Dec 2026 15 Mar 2027 Kit 2530 2530 1265 1265 1265 8855
NAVAL ACADEMY 3,41 $ SEA 14 Dec 2026 15 Mar 2027 Kit 2530 2530 1265 1265 1265 8855
FLUSHING 3,41 $ SEA 14 Dec 2026 15 Mar 2027 Kit 2530 2530 1265 1265 1265 8855
PINK MARSHMELLOW 3,41 $ SEA 14 Dec 2026 15 Mar 2027 Kit 2240 2240 1120 1120 1120 7840
BRIGHT WHITE 3,41 $ SEA 14 Dec 2026 15 Mar 2027 Kit 1836 1836 918 918 918 6426
\f
Delivery/color Net Cost Means of Transport Shipment Date In Store Date Packing Type S M L XL XXL Total
LAVENDER LUSTRE 3,41 $ SEA 14 Dec 2026 15 Mar 2027 Piece 59 77 56 34 24 250
NAVAL ACADEMY 3,41 $ SEA 14 Dec 2026 15 Mar 2027 Piece 59 77 56 34 24 250
FLUSHING 3,41 $ SEA 14 Dec 2026 15 Mar 2027 Piece 59 77 56 34 24 250
PINK MARSHMELLOW 3,41 $ SEA 14 Dec 2026 15 Mar 2027 Piece 59 77 56 34 24 250
BRIGHT WHITE 3,41 $ SEA 14 Dec 2026 15 Mar 2027 Piece 59 77 56 34 24 250
TOTAL 11961 12051 6113 6003 5953 42081
\f
HEADING : 21 OVS INDIA YEAR PERIOD: 20271
Delivery/color Net Cost Means of Transport Shipment Date In Store Date Packing Type S M L XL XXL Total
LAVENDER LUSTRE 3,17 $ SEA 14 Dec 2026 27 Feb 2027 Kit 4 4 2 2 2 14
NAVAL ACADEMY 3,17 $ SEA 14 Dec 2026 27 Feb 2027 Kit 6 6 3 3 3 21
FLUSHING 3,17 $ SEA 14 Dec 2026 27 Feb 2027 Kit 6 6 3 3 3 21
BRIGHT WHITE 3,17 $ SEA 14 Dec 2026 27 Feb 2027 Kit 6 6 3 3 3 21
TOTAL 22 22 11 11 11 77
\f
HEADING : 2 OVS WARM YEAR PERIOD: 20271
Delivery/color Net Cost Means of Transport Shipment Date In Store Date Packing Type S M L XL XXL Total
LAVENDER LUSTRE 3,41 $ SEA 14 Dec 2026 29 Mar 2027 Kit 20 20 10 10 10 70
NAVAL ACADEMY 3,41 $ SEA 14 Dec 2026 29 Mar 2027 Kit 46 46 23 23 23 161
FLUSHING 3,41 $ SEA 14 Dec 2026 29 Mar 2027 Kit 42 42 21 21 21 147
PINK MARSHMELLOW 3,41 $ SEA 14 Dec 2026 29 Mar 2027 Kit 14 14 7 7 7 49
BRIGHT WHITE 3,41 $ SEA 14 Dec 2026 29 Mar 2027 Kit 42 42 21 21 21 147
TOTAL 164 164 82 82 82 574
\f
HEADING : 24 OVS MIDDLE EAST YEAR PERIOD: 20271
Delivery/color Net Cost Means of Transport Shipment Date In Store Date Packing Type S M L XL XXL Total
LAVENDER LUSTRE 3,41 $ SEA 14 Dec 2026 02 Mar 2027 Kit 12 12 6 6 6 42
NAVAL ACADEMY 3,41 $ SEA 14 Dec 2026 02 Mar 2027 Kit 12 12 6 6 6 42
FLUSHING 3,41 $ SEA 14 Dec 2026 02 Mar 2027 Kit 12 12 6 6 6 42
PINK MARSHMELLOW 3,41 $ SEA 14 Dec 2026 02 Mar 2027 Kit 10 10 5 5 5 35
BRIGHT WHITE 3,41 $ SEA 14 Dec 2026 02 Mar 2027 Kit 12 12 6 6 6 42
TOTAL 58 58 29 29 29 203
\f
HEADING : 25 OVS COLD YEAR PERIOD: 20271
Delivery/color Net Cost Means of Transport Shipment Date In Store Date Packing Type S M L XL XXL Total
LAVENDER LUSTRE 3,41 $ SEA 14 Dec 2026 29 Mar 2027 Kit 16 16 8 8 8 56
NAVAL ACADEMY 3,41 $ SEA 14 Dec 2026 29 Mar 2027 Kit 30 30 15 15 15 105
FLUSHING 3,41 $ SEA 14 Dec 2026 29 Mar 2027 Kit 30 30 15 15 15 105
BRIGHT WHITE 3,41 $ SEA 14 Dec 2026 29 Mar 2027 Kit 30 30 15 15 15 105
TOTAL 106 106 53 53 53 371
\f
HEADING : 26 REPL. HUB DUBAI YEAR PERIOD: 20271
Delivery/color Net Cost Means of Transport Shipment Date In Store Date Packing Type S M L XL XXL Total
NAVAL ACADEMY 3,41 $ SEA 14 Dec 2026 15 Mar 2027 Piece 5 6 5 4 0 20
PINK MARSHMELLOW 3,41 $ SEA 14 Dec 2026 15 Mar 2027 Piece 5 6 5 4 0 20
LAVENDER LUSTRE 3,41 $ SEA 14 Dec 2026 15 Mar 2027 Piece 5 6 5 4 0 20
TOTAL 15 18 15 12 0 60
`;
const resOvs = ovs.parse(ovsBrief, 'OVS_Brief_271PJA416SP-903.pdf', 'OVS');
if (resOvs.styles[0].totalQty !== 43366 || resOvs.styles[0].orderReferences.length !== 6 || resOvs.validation.status !== 'VALIDATED') {
  throw new Error(`Test 3 Failed: OVS expected 43,366 pcs and 6 markets, got ${resOvs.styles[0].totalQty}`);
}
console.log('✓ Test 3 Passed: OVS 43,366 pcs across 6 markets (ITALY, WARM, INDIA, MIDDLE EAST, COLD, DUBAI), 100% reconciled.\n');

// 4. Real UTG Production Card
console.log('TEST 4: UTG Production Card (800 pcs)');
const utgDoc = `
Production Card
UTG
No. 56469 Photosample
Order No. BAD2855E
Item No. 119777 AN6_FW23_2-1-C_009
Customers Order No. PO2405033C
Planned Start 24.09.26
Expected Date 21.01.27
Pcs. 800
Price 4,85 USD
XS S M L XL 2XL 3XL
8735 Sea Spray 17-6212 tcx 63 168 248 182 139 AN621C1XH-M11
`;
const resUtg = utg.parse(utgDoc, 'UTG_Production_Card.pdf', 'UTG');
if (resUtg.styles[0].totalQty !== 800 || resUtg.validation.status !== 'VALIDATED') {
  throw new Error(`Test 4 Failed: UTG expected 800 pcs, got ${resUtg.styles[0].totalQty}`);
}
console.log('✓ Test 4 Passed: UTG 800 pcs extracted and 100% reconciled.\n');

// 5. Excel Multi-Style & Multi-PO Workbook
console.log('TEST 5: Excel Multi-Style & Multi-PO Workbook');
const wb = XLSX.utils.book_new();
const wsData = [
  ['Style No', 'Item Description', 'PO Number', 'Color', 'Color Code', 'XS', 'S', 'M', 'L', 'XL', 'Delivery Date', 'Destination'],
  ['15323159', 'ONLRILEY O-NECK L/S TOP', 'PO-9001', 'Cloud Dancer', '11-4201', 50, 100, 150, 100, 50, '2026-11-15', 'GERMANY'],
  ['15323159', 'ONLRILEY O-NECK L/S TOP', 'PO-9002', 'Black', 'C-N10', 40, 80, 120, 80, 40, '2026-11-20', 'FRANCE'],
  ['ST-99881', 'V-Neck Cotton Tee', 'PO-9003', 'Navy', '19-4010', 20, 40, 60, 40, 20, '2026-12-01', 'ITALY'],
];
const ws = XLSX.utils.aoa_to_sheet(wsData);
XLSX.utils.book_append_sheet(wb, ws, 'Orders');
const excelBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
const resXls = excelCsv.parse(excelBuf, 'Multi_Style_Orders.xlsx', 'BESTSELLER');
if (resXls.styles.length !== 2 || resXls.styles[0].totalQty !== 810 || resXls.styles[1].totalQty !== 180) {
  throw new Error(`Test 5 Failed: Excel multi-style mismatch`);
}
console.log('✓ Test 5 Passed: Excel multi-style & multi-PO extracted (Style 1: 810 pcs, Style 2: 180 pcs).\n');

// 6. CSV File Parsing
console.log('TEST 6: CSV File Parsing');
const csvStr = `Style,Description,PO,Color,Size,Qty,Shipment Date,Market\n` +
  `271PJA416SP-903,SHORT SET,ITALY,LAVENDER LUSTRE,S,2646,2026-12-14,ITALY\n` +
  `271PJA416SP-903,SHORT SET,ITALY,LAVENDER LUSTRE,M,2665,2026-12-14,ITALY\n` +
  `271PJA416SP-903,SHORT SET,WARM,LAVENDER LUSTRE,S,20,2026-12-14,WARM\n`;
const resCsv = excelCsv.parse(Buffer.from(csvStr), 'OVS_Market.csv', 'OVS');
if (resCsv.styles[0].totalQty !== 5331 || resCsv.styles[0].orderReferences.length !== 2) {
  throw new Error(`Test 6 Failed: CSV mismatch`);
}
console.log('✓ Test 6 Passed: CSV parsed (5,331 pcs across 2 markets).\n');

// 7. Sequential Upload Test: Two different files uploaded sequentially
console.log('TEST 7: Sequential Upload (Verifying no state contamination between files)');
const runA = bestseller.parse(bsPo1, 'file_A.pdf', 'ONLY');
const runB = bestseller.parse(bsPo2, 'file_B.pdf', 'ONLY');
if (runA.sourceFileName === runB.sourceFileName) throw new Error('File names contaminated');
if (runA.styles[0].totalQty === runB.styles[0].totalQty) throw new Error('Quantities contaminated');
if (runA.styles[0].totalQty !== 48 || runB.styles[0].totalQty !== 7926) throw new Error('Sequential results mismatch');
console.log(`✓ Test 7 Passed: File A (${runA.styles[0].totalQty} pcs) and File B (${runB.styles[0].totalQty} pcs) are completely isolated.\n`);

// 8. Invalid / Unreadable File Test
console.log('TEST 8: Invalid / Unreadable file handling (Zero silent demo substitution)');
let caughtError = false;
try {
  excelCsv.parse(Buffer.from('corrupted garbage binary data not an excel or csv'), 'corrupt.xlsx');
} catch (e: any) {
  caughtError = true;
}
if (!caughtError) throw new Error('Test 8 Failed: corrupt .xlsx was accepted instead of rejected');
const garbageCsv = excelCsv.parse(Buffer.from('hello,world\nfoo,bar'), 'random.csv');
if (garbageCsv.styles.length !== 0 || garbageCsv.validation.status === 'VALIDATED') {
  throw new Error('Test 8 Failed: unrelated CSV produced order styles (possible demo substitution)');
}
console.log('✓ Test 8 Passed: corrupt .xlsx rejected; unrelated CSV yields zero styles and NEED_REVIEW.\n');

console.log('====================================================');
console.log('>>> ALL 8 PO IMPORT ACCEPTANCE TESTS PASSED 100% <<<');
console.log('====================================================');
