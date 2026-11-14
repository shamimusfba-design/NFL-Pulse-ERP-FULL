const XLSX = require('C:/Users/shamim/Documents/NFL Pulse/NFL-Pulse-ERP-FULL/node_modules/xlsx');
const fs = require('fs');
const path = require('path');

const wb = XLSX.readFile('C:/Users/shamim/Desktop/finish fabric stock.xlsx');
const sheet = wb.Sheets['December-26 (2)'];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const buyerSections = [
  { minRow: 6, maxRow: 72, buyerName: 'Only & Sons', buyerShort: 'BS-ONS', prefix: 'BSONS' },
  { minRow: 73, maxRow: 669, buyerName: 'Only', buyerShort: 'BS-ONL', prefix: 'BSONL' },
  { minRow: 670, maxRow: 1146, buyerName: 'Name It', buyerShort: 'BS-NMT', prefix: 'BSNMT' },
  { minRow: 1147, maxRow: 1269, buyerName: 'UTG', buyerShort: 'UTG', prefix: 'UTG' },
  { minRow: 1270, maxRow: 1287, buyerName: 'Miss Selfridge', buyerShort: 'GBX- Miss Selfridge', prefix: 'MS' },
  { minRow: 1288, maxRow: 1416, buyerName: 'New Look', buyerShort: 'GBX- New Look', prefix: 'NL' },
  { minRow: 1417, maxRow: 1427, buyerName: "Sainsburry's", buyerShort: "GBX- Sainsburry's", prefix: 'SAIN' },
  { minRow: 1428, maxRow: 1571, buyerName: 'OVS', buyerShort: 'OVS', prefix: 'OVS' },
  { minRow: 1572, maxRow: 1585, buyerName: 'Maurices', buyerShort: 'GBX- Maurices', prefix: 'MAU' },
  { minRow: 1586, maxRow: 1625, buyerName: 'T.M Lewin', buyerShort: 'GBX- T-M Lewin', prefix: 'TML' },
];

function getSectionForIndex(rowIdx) {
  const rowNum = rowIdx + 1;
  for (const s of buyerSections) {
    if (rowNum >= s.minRow && rowNum <= s.maxRow) return s;
  }
  return buyerSections[0];
}

function formatJobNo(rawJob, sec) {
  let j = String(rawJob || '').trim().replace(/#/g, '');
  if (!j) return '';
  
  if (sec.prefix === 'BSONL') {
    if (/^\d+/.test(j) && !j.startsWith('BSONL')) return `BSONL ${j}`;
    return j;
  }
  if (sec.prefix === 'BSNMT') {
    if (/^\d+/.test(j) && !j.startsWith('BSNMT')) return `BSNMT ${j}`;
    return j;
  }
  if (sec.prefix === 'BSONS') {
    if (/^\d+/.test(j) && !j.startsWith('BSONS')) return `BSONS ${j}`;
    return j;
  }
  if (sec.prefix === 'UTG') {
    if (j.startsWith('UT ')) return j.replace(/^UT\s+/, 'UTG ');
    if (/^\d+/.test(j) && !j.startsWith('UTG')) return `UTG ${j}`;
    return j;
  }
  if (sec.prefix === 'NL') {
    if (j.startsWith('GT ')) return j.replace(/^GT\s+/, 'NL ');
    if (/^\d+/.test(j) && !j.startsWith('NL')) return `NL ${j}`;
    return j;
  }
  if (sec.prefix === 'TML') {
    if (j.startsWith('GT ')) return j.replace(/^GT\s+/, 'TML ');
    if (/^\d+/.test(j) && !j.startsWith('TML')) return `TML ${j}`;
    return j;
  }
  if (sec.prefix === 'OVS') {
    if (/^\d+/.test(j) && !j.startsWith('OVS')) return `OVS ${j}`;
    return j;
  }
  return j;
}

const linesF = [];
let currentJob = '';
let currentStyle = '';
let currentComp = '';
let currentFabric = '';
let currentGsm = '';
let currentDia = '';
let currentProc = '';

for (let i = 5; i < rows.length; i++) {
  const r = rows[i];
  if (!r) continue;

  const rawSL = r[0];
  const rawJob = r[1];
  const rawStyle = r[2];
  const rawFabric = r[3];
  const rawComp = r[4];
  const rawProc = r[5];
  const rawGsm = r[6];
  const rawDia = r[7];
  const rawColor = r[8];

  const colStr = (r || []).join(' ');
  if (colStr.includes('Total >>') || colStr.includes('TOTAL') || colStr.includes('Excess Qty')) continue;

  const sec = getSectionForIndex(i);

  // Skip section header rows
  if (rawJob && typeof rawJob === 'string' && /Bestseller|GBX|OVS|United|UTG|Styllent|Name It|Maurices|Lewin|New Look|Sainsburry|Selfridge/i.test(rawJob) && !rawStyle) {
    continue;
  }

  // Check if valid row
  const colorName = rawColor ? String(rawColor).trim() : '';
  const qSum = (Number(r[9])||0) + (Number(r[10])||0) + (Number(r[11])||0) + (Number(r[12])||0) + (Number(r[13])||0) + (Number(r[14])||0) + (Number(r[15])||0) + (Number(r[16])||0) + (Number(r[17])||0) + (Number(r[18])||0) + (Number(r[19])||0);
  
  if (!rawJob && !rawStyle && !colorName && qSum === 0) {
    continue;
  }

  // Update current context
  if (rawJob && String(rawJob).trim() !== '') {
    currentJob = formatJobNo(rawJob, sec);
  }
  if (rawStyle && String(rawStyle).trim() !== '') {
    currentStyle = String(rawStyle).trim();
  }
  if (rawFabric && String(rawFabric).trim() !== '') {
    currentFabric = String(rawFabric).trim();
  }
  if (rawComp && String(rawComp).trim() !== '') {
    currentComp = String(rawComp).trim();
  }
  if (rawProc && String(rawProc).trim() !== '') {
    currentProc = String(rawProc).trim();
  }
  if (rawGsm && String(rawGsm).trim() !== '') {
    currentGsm = String(rawGsm).trim();
  }
  if (rawDia && String(rawDia).trim() !== '') {
    currentDia = String(rawDia).trim();
  }

  const rb = Number(r[9]) || 0;
  const rl = Number(r[10]) || 0;
  const rs = Number(r[11]) || 0;

  const vb = Number(r[12]) || 0;
  const vl = Number(r[13]) || 0;
  const vs = Number(r[14]) || 0;

  const ib = Number(r[15]) || 0;
  const il = Number(r[16]) || 0;
  const isQty = Number(r[17]) || 0;

  const sb = Number(r[18]) || 0;
  const sl_kg = Number(r[19]) || 0;
  const ss = Math.max(0, vs - isQty);

  let loc = String(r[20] || '').trim();
  if (!loc || loc === '0' || loc === 'undefined') loc = '';

  linesF.push({
    id: `f-${linesF.length + 1}`,
    sl: String(rawSL || linesF.length + 1),
    m: 'December-26',
    b: sec.buyerName,
    bShort: sec.buyerShort,
    j: currentJob,
    st: rawStyle ? String(rawStyle).trim() : currentStyle,
    f: rawFabric ? String(rawFabric).trim() : currentFabric,
    comp: rawComp ? String(rawComp).trim() : currentComp,
    ap: rawProc ? String(rawProc).trim() : currentProc,
    gsm: rawGsm ? String(rawGsm).trim() : currentGsm,
    dia: rawDia ? String(rawDia).trim() : currentDia,
    c: colorName, // real color string, empty if not given
    rb,
    rl,
    rs,
    vb,
    vl,
    vs,
    ib,
    il,
    is: isQty,
    sb,
    sl_kg,
    ss,
    loc: loc || 'F.ST'
  });
}

const outputPath = 'C:/Users/shamim/Documents/NFL Pulse/NFL-Pulse-ERP-FULL/apps/web/public/data/finished-bootstrap.json';
const payload = {
  user: "Northern Fashions Limited",
  asOf: new Date().toISOString(),
  lines: {
    F: linesF
  }
};

fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
console.log(`Successfully generated ${linesF.length} records into ${outputPath}`);
