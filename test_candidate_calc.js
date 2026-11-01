const fs = require('fs');
const html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');

// Check if L and helper functions are defined
const sIdx = html.indexOf('const DATA=');
const eIdx = html.indexOf(';', sIdx);
const DATA = JSON.parse(html.slice(sIdx + 'const DATA='.length, eIdx));
console.log('Parsed DATA.L with', DATA.L.length, 'records');

// Test logic on sample 5 records
const sample = DATA.L.slice(0, 5);
sample.forEach((r, idx) => {
  const oq = r.oq || 0;
  const cut = r.cut || 0;
  const cutBal = Math.max(0, oq - cut);
  const totalFq = r.fq > 0 ? r.fq : Math.round(oq * 0.20);
  const bodyReq = Math.round(totalFq * 0.93);
  const bodyRecv = r.fr > 0 ? Math.round(r.fr * 0.94) : (cut > 0 ? bodyReq : Math.round(bodyReq * 0.95));
  const bodyBal = Math.max(0, bodyReq - bodyRecv);
  const bodyPct = bodyReq > 0 ? Math.min(100, Math.round(bodyRecv / bodyReq * 100)) : 100;

  const ribReq = Math.max(1, Math.round(totalFq * 0.07));
  const ribRecv = r.fr > 0 ? Math.round(r.fr * (r.fr >= r.fq ? 0.07 : 0.055)) : (cut > 0 ? ribReq : Math.round(ribReq * 0.70));
  const ribBal = Math.max(0, ribReq - ribRecv);
  const ribPct = ribReq > 0 ? Math.min(100, Math.round(ribRecv / ribReq * 100)) : 100;

  console.log(`[${idx}] Job ${r.j} - ${r.c} (${r.b})`);
  console.log(`    Order: ${oq} | Cut: ${cut} | Bal: ${cutBal}`);
  console.log(`    Body Fab: Req ${bodyReq}kg, Recv ${bodyRecv}kg, Bal ${bodyBal}kg (${bodyPct}%)`);
  console.log(`    Rib Fab:  Req ${ribReq}kg, Recv ${ribRecv}kg, Bal ${ribBal}kg (${ribPct}%)`);
  console.log(`    Print/Emb: ${r.pe || 'None'} | Ship: ${r.sd}`);
});
