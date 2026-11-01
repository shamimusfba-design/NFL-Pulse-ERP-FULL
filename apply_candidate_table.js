const fs = require('fs');
let html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');

const newCode = `
/* ================= CANDIDATE SUGGESTION REGISTER LOGIC ================= */
const TP_SUG = {
  relax: { q: '', fl: 'ALL', pe: 'ALL', fab: 'ALL', page: 0, pageSize: 20 },
  daily: { q: '', fl: 'ALL', pe: 'ALL', fab: 'ALL', page: 0, pageSize: 20 }
};

function getWk(dStr) {
  if (!dStr) return '';
  try {
    const d = new Date(dStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    const start = new Date(d.getFullYear(), 0, 1);
    const days = Math.floor((d - start) / 86400000);
    return 'W' + Math.ceil((days + start.getDay() + 1) / 7);
  } catch(e) { return ''; }
}

function calcFabDetail(r) {
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

  const hasP = /P/.test(r.pe || '');
  const hasE = /E/.test(r.pe || '');
  const isPEBoth = hasP && hasE;

  const pcd = r.pcd || (r.ss ? addDays(r.ss, -5) : (r.ccd ? addDays(r.ccd, -3) : addDays(r.sd || TODAY, -18)));
  const ccd = r.ccd || (r.ss ? addDays(r.ss, -2) : addDays(r.sd || TODAY, -14));

  return {
    oq, cut, cutBal,
    bodyReq, bodyRecv, bodyBal, bodyPct,
    ribReq, ribRecv, ribBal, ribPct,
    hasP, hasE, isPEBoth,
    pcd, ccd
  };
}

function planItemToTable(kind, itemIndex, targetTable, pcs) {
  if (!['Cutting','Cutting Reporter'].includes(role())) {
    return toast('Cutting planner edits this plan');
  }
  const r = L[itemIndex];
  if (!r) return;
  const det = calcFabDetail(r);
  const q = pcs ? Math.max(1, +pcs) : (det.cutBal > 0 ? det.cutBal : r.oq);
  const e = { i: r.i, q };
  if (kind === 'relax') e.st = 'Requested';
  else e.src = fabricState(r).inh ? 'relaxed' : 'other';

  const st = TP[kind];
  const box = kind === 'relax' ? S.relax : S.daily;
  const day = box[st.d] = box[st.d] || {};
  (day[targetTable] = day[targetTable] || []).push(e);
  save();
  toast('Added ' + r.j + ' (' + r.c + ') to ' + targetTable + ' (' + kgs(q) + ' pcs)');
  renderTP(kind);
}

function renderTPSuggestionTable(kind) {
  const panel = $('#' + kind + '-sug-panel');
  if (!panel) return;
  const sug = TP_SUG[kind];
  const st = TP[kind];

  // Filter dataset
  const qLower = (sug.q || '').trim().toLowerCase();
  let pool = L.filter(r => {
    if (!inMod(r)) return false;
    const det = calcFabDetail(r);
    if (det.cutBal <= 0) return false;

    // Search query
    if (qLower) {
      const match = (r.j || '').toLowerCase().includes(qLower) ||
                    (r.b || '').toLowerCase().includes(qLower) ||
                    (r.st || '').toLowerCase().includes(qLower) ||
                    (r.c || '').toLowerCase().includes(qLower);
      if (!match) return false;
    }

    // Floor filter
    const fl = r.fl || floor(r);
    if (sug.fl !== 'ALL') {
      if (sug.fl === 'Y/D' && !r.yd && fl !== 'Y/D') return false;
      if (sug.fl !== 'Y/D' && fl !== sug.fl) return false;
    }

    // Print / Emb filter
    if (sug.pe !== 'ALL') {
      if (sug.pe === 'PE_BOTH' && !det.isPEBoth) return false;
      if (sug.pe === 'PRINT' && !det.hasP) return false;
      if (sug.pe === 'EMB' && !det.hasE) return false;
      if (sug.pe === 'SOLID' && (det.hasP || det.hasE || r.pe === 'AOP')) return false;
    }

    // Fabric Readiness filter
    if (sug.fab !== 'ALL') {
      if (sug.fab === 'READY' && (det.bodyPct < 95 || det.ribPct < 90)) return false;
      if (sug.fab === 'RIB_PENDING' && (det.bodyPct < 95 || det.ribPct >= 90)) return false;
      if (sug.fab === 'SHORT' && det.bodyPct >= 95) return false;
    }

    return true;
  });

  // Sort: Critical P+E first, nearest PCD, then highest balance
  pool.sort((a,b) => {
    const da = calcFabDetail(a), db = calcFabDetail(b);
    if (da.isPEBoth !== db.isPEBoth) return db.isPEBoth ? 1 : -1;
    const pa = da.pcd || '9999', pb = db.pcd || '9999';
    if (pa !== pb) return pa.localeCompare(pb);
    return db.cutBal - da.cutBal;
  });

  const totalCount = pool.length;
  const totalBalPcs = pool.reduce((acc, r) => acc + calcFabDetail(r).cutBal, 0);
  const peBothCount = pool.filter(r => calcFabDetail(r).isPEBoth).length;
  const readyCount = pool.filter(r => { const d = calcFabDetail(r); return d.bodyPct >= 95 && d.ribPct >= 90; }).length;

  const totalPages = Math.max(1, Math.ceil(totalCount / sug.pageSize));
  sug.page = Math.min(sug.page, totalPages - 1);
  const pagedRows = pool.slice(sug.page * sug.pageSize, (sug.page + 1) * sug.pageSize);

  panel.innerHTML = \`
    <div class="ct-sug-panel">
      <div class="ct-sug-head">
        <div>
          <h3>📋 Master Cuttable Planning Register &amp; Candidate Suggestions</h3>
          <div style="font-size:12px;color:var(--ink-2);margin-top:2px">
            Color-wise cutting balance, separate <b>Body vs Rib</b> fabric readiness, T&amp;A PCD, Print/Emb criticality &amp; One-Click Table Planning.
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span class="pill info">\${kgs(totalCount)} Candidate Colours</span>
          <span class="pill warn">\${kgs(totalBalPcs)} Bal Pcs</span>
          \${peBothCount ? \`<span class="pill bad">🔥 \${peBothCount} P+E (Critical)</span>\` : ''}
          <span class="pill good">✅ \${readyCount} 100% Ready</span>
        </div>
      </div>

      <!-- FILTER TOOLBAR -->
      <div class="ct-toolbar">
        <div class="ct-search">
          <input type="text" id="\${kind}-sug-q" value="\${esc(sug.q)}" placeholder="Search Job # (e.g. 48077), Style, Buyer, or Colour...">
        </div>
        <select class="ct-filter-sel" id="\${kind}-sug-fl">
          <option value="ALL" \${sug.fl==='ALL'?'selected':''}>All Floors (S1, S2, S3, Y/D)</option>
          <option value="S3" \${sug.fl==='S3'?'selected':''}>Floor S3 (Tables 1, 2)</option>
          <option value="S2" \${sug.fl==='S2'?'selected':''}>Floor S2 (Tables 3, 4)</option>
          <option value="S1" \${sug.fl==='S1'?'selected':''}>Floor S1 (Tables 5, 6)</option>
          <option value="Y/D" \${sug.fl==='Y/D'?'selected':''}>Yarn-Dyed (Table Y/D)</option>
        </select>
        <select class="ct-filter-sel" id="\${kind}-sug-pe">
          <option value="ALL" \${sug.pe==='ALL'?'selected':''}>All Print / Emb</option>
          <option value="PE_BOTH" \${sug.pe==='PE_BOTH'?'selected':''}>🔥 P+E Both (Critical Lead Time)</option>
          <option value="PRINT" \${sug.pe==='PRINT'?'selected':''}>🖨️ Print Only</option>
          <option value="EMB" \${sug.pe==='EMB'?'selected':''}>🧵 Embroidery Only</option>
          <option value="SOLID" \${sug.pe==='SOLID'?'selected':''}>⚪ Solid (No Print/Emb)</option>
        </select>
        <select class="ct-filter-sel" id="\${kind}-sug-fab">
          <option value="ALL" \${sug.fab==='ALL'?'selected':''}>All Fabric Status</option>
          <option value="READY" \${sug.fab==='READY'?'selected':''}>✅ Body &amp; Rib 100% Ready</option>
          <option value="RIB_PENDING" \${sug.fab==='RIB_PENDING'?'selected':''}>⚠️ Rib Pending (Body Ready)</option>
          <option value="SHORT" \${sug.fab==='SHORT'?'selected':''}>🛑 Short / Awaiting Fabric</option>
        </select>
        \${sug.q || sug.fl!=='ALL' || sug.pe!=='ALL' || sug.fab!=='ALL' ? \`<button class="btn sm" id="\${kind}-sug-clr">Reset Filters</button>\` : ''}
      </div>

      <!-- MASTER TABLE -->
      <div class="ct-tbl-wrap">
        <table class="ct-table">
          <thead>
            <tr>
              <th style="min-width:110px">Plan to Table</th>
              <th>Buyer · Job #</th>
              <th>Style</th>
              <th>Colour</th>
              <th>Floor</th>
              <th style="text-align:right">Order Pcs</th>
              <th style="text-align:right">Cut Done</th>
              <th style="text-align:right">Cut Balance</th>
              <th style="min-width:140px">Body Fabric (Req / Recv / Bal)</th>
              <th style="min-width:140px">Rib Fabric (Req / Recv / Bal)</th>
              <th>PCD (T&amp;A)</th>
              <th>CCD</th>
              <th>Ship Date</th>
              <th>Print / Emb</th>
              <th>Readiness</th>
            </tr>
          </thead>
          <tbody>
            \${pagedRows.map(r => {
              const det = calcFabDetail(r);
              const fl = r.fl || floor(r);
              const defTable = fl==='S3'?'T1':fl==='S2'?'T3':fl==='S1'?'T5':'Y/D';
              const wk = getWk(r.sd);

              let peBadge = '<span class="ct-badge solid">Solid</span>';
              if (det.isPEBoth) peBadge = '<span class="ct-badge crit" title="Print + Embroidery takes extra 3-5 days lead time!">🔥 P+E (Both)</span>';
              else if (det.hasP) peBadge = '<span class="ct-badge print">🖨️ Print</span>';
              else if (det.hasE) peBadge = '<span class="ct-badge emb">🧵 Emb</span>';
              else if (r.pe==='AOP') peBadge = '<span class="ct-badge print">🎨 AOP</span>';

              let statusBadge = '<span class="ct-badge ready">Ready</span>';
              if (det.bodyPct >= 95 && det.ribPct < 90) statusBadge = '<span class="ct-badge warn" title="Rib is missing!">⚠️ Rib Gap</span>';
              else if (det.bodyPct < 95) statusBadge = '<span class="ct-badge bad">Short Fab</span>';

              const isRel = relaxOf(r.key).some(x => x.st === 'In-house');
              if (isRel) statusBadge += ' <span class="ct-badge ready" style="margin-left:2px">In Relax</span>';

              return \`
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:4px">
                      <button class="ct-plan-btn" data-plan="\${r.i}|\${defTable}" title="Plan balance directly to \${defTable}">+ \${defTable}</button>
                      <select class="ct-filter-sel" style="padding:2px 4px;font-size:11px" data-optsel="\${r.i}">
                        <option value="">Table ▾</option>
                        \${TBL.map(([t]) => \`<option value="\${t}">\${t}</option>\`).join('')}
                      </select>
                    </div>
                  </td>
                  <td><b>\${esc(r.j)}</b> <span style="font-size:11px;color:var(--ink-2)">(\${esc(r.b)})</span></td>
                  <td style="font-family:monospace;font-size:11.5px">\${esc(r.st)}</td>
                  <td><b>\${esc(r.c)}</b></td>
                  <td><span class="pill info" style="font-size:10.5px">\${esc(fl)}</span></td>
                  <td style="text-align:right">\${kgs(det.oq)}</td>
                  <td style="text-align:right;color:var(--ink-2)">\${kgs(det.cut)}</td>
                  <td style="text-align:right"><b style="color:var(--warn)">+\${kgs(det.cutBal)}</b></td>
                  <td>
                    <div class="ct-fab-box">
                      <span class="kg-val">\${kgs(det.bodyRecv)}</span> / \${kgs(det.bodyReq)} kg 
                      <span class="ct-badge \${det.bodyPct>=95?'ready':det.bodyPct>=60?'warn':'bad'}" style="margin-left:2px">\${det.bodyPct}%</span>
                      <div class="kg-sub">Bal: \${kgs(det.bodyBal)} kg</div>
                    </div>
                  </td>
                  <td>
                    <div class="ct-fab-box">
                      <span class="kg-val">\${kgs(det.ribRecv)}</span> / \${kgs(det.ribReq)} kg 
                      <span class="ct-badge \${det.ribPct>=90?'ready':'warn'}" style="margin-left:2px">\${det.ribPct}%</span>
                      <div class="kg-sub">Bal: \${kgs(det.ribBal)} kg</div>
                    </div>
                  </td>
                  <td><span style="white-space:nowrap;font-size:11.5px">\${fd(det.pcd)}</span></td>
                  <td><span style="white-space:nowrap;font-size:11.5px;color:var(--ink-2)">\${fd(det.ccd)}</span></td>
                  <td><span style="white-space:nowrap;font-size:11.5px">\${fd(r.sd)} \${wk?\`<span class="muted">(\${wk})</span>\`:''}</span></td>
                  <td>\${peBadge}</td>
                  <td>\${statusBadge}</td>
                </tr>
              \`;
            }).join('') || \`<tr><td colspan="15" style="text-align:center;padding:18px;color:var(--ink-2)">No candidate orders match current filters. Try searching with another keyword or resetting filters.</td></tr>\`}
          </tbody>
        </table>
      </div>

      <!-- PAGER -->
      <div class="ct-pager">
        <div>Showing \${totalCount ? (sug.page * sug.pageSize + 1) : 0} - \${Math.min((sug.page + 1) * sug.pageSize, totalCount)} of \${totalCount} candidate colours</div>
        <div style="display:flex;gap:6px;align-items:center">
          <button id="\${kind}-sug-prev" \${sug.page<=0?'disabled':''}>◀ Prev</button>
          <span>Page \${sug.page + 1} of \${totalPages}</span>
          <button id="\${kind}-sug-next" \${sug.page>=totalPages-1?'disabled':''}>Next ▶</button>
        </div>
      </div>
    </div>
  \`;

  // Bind toolbar events
  const qInput = $('#' + kind + '-sug-q');
  if (qInput) {
    qInput.oninput = () => { sug.q = qInput.value; sug.page = 0; renderTPSuggestionTable(kind); };
  }
  const flSel = $('#' + kind + '-sug-fl');
  if (flSel) {
    flSel.onchange = () => { sug.fl = flSel.value; sug.page = 0; renderTPSuggestionTable(kind); };
  }
  const peSel = $('#' + kind + '-sug-pe');
  if (peSel) {
    peSel.onchange = () => { sug.pe = peSel.value; sug.page = 0; renderTPSuggestionTable(kind); };
  }
  const fabSel = $('#' + kind + '-sug-fab');
  if (fabSel) {
    fabSel.onchange = () => { sug.fab = fabSel.value; sug.page = 0; renderTPSuggestionTable(kind); };
  }
  const clrBtn = $('#' + kind + '-sug-clr');
  if (clrBtn) {
    clrBtn.onclick = () => {
      sug.q = ''; sug.fl = 'ALL'; sug.pe = 'ALL'; sug.fab = 'ALL'; sug.page = 0;
      renderTPSuggestionTable(kind);
    };
  }

  // Pager events
  const prevBtn = $('#' + kind + '-sug-prev');
  if (prevBtn) prevBtn.onclick = () => { if (sug.page > 0) { sug.page--; renderTPSuggestionTable(kind); } };
  const nextBtn = $('#' + kind + '-sug-next');
  if (nextBtn) nextBtn.onclick = () => { if (sug.page < totalPages - 1) { sug.page++; renderTPSuggestionTable(kind); } };

  // Plan button actions
  panel.querySelectorAll('[data-plan]').forEach(btn => {
    btn.onclick = () => {
      const [iStr, tbl] = btn.dataset.plan.split('|');
      planItemToTable(kind, +iStr, tbl);
    };
  });
  panel.querySelectorAll('select[data-optsel]').forEach(sel => {
    sel.onchange = () => {
      const tbl = sel.value;
      if (!tbl) return;
      const iStr = sel.dataset.optsel;
      planItemToTable(kind, +iStr, tbl);
      sel.value = '';
    };
  });
}
`;

// Insert newCode right before `function renderTP(kind){`
if (!html.includes('/* ================= CANDIDATE SUGGESTION REGISTER LOGIC ================= */')) {
  html = html.replace('function renderTP(kind){', newCode + '\nfunction renderTP(kind){');
}

// In renderTP(kind), call renderTPSuggestionTable(kind) at the end!
const targetInRenderTP = 'bindAdd(kind,day);\n}';
const replaceInRenderTP = 'bindAdd(kind,day);\n  renderTPSuggestionTable(kind);\n}';
if (html.includes(targetInRenderTP)) {
  html = html.replace(targetInRenderTP, replaceInRenderTP);
} else {
  console.log('Target in renderTP not matched directly, checking alternative');
  html = html.replace('bindAdd(kind,day);', 'bindAdd(kind,day); renderTPSuggestionTable(kind);');
}

// Also upgrade addForm to show rich details (Body vs Rib, Cut Bal, P+E, PCD)
const oldAddForm = `function addForm(kind,t,fl){const st=TP[kind],sug=suggestions(kind,fl);const rs=st.job?L.filter(r=>r.j===st.job):[];
  return \`<div class="form" style="padding:6px;border-top:1px solid var(--line)"><div class="row"><span>Job no</span><input id="ad-j" list="ad-jl" value="\${esc(st.job||'')}" placeholder="Search or pick a suggestion"><datalist id="ad-jl">\${sug.map(j=>\`<option value="\${esc(j)}">\`).join('')}</datalist></div>
   \${sug.length&&!st.job?\`<div class="ks muted">Suggested: \${sug.slice(0,6).map(j=>\`<a href="#" data-sj="\${esc(j)}">\${esc(j)}</a>\`).join(' · ')}</div>\`:''}
   \${rs.length?\`<table><thead><tr><th></th><th>Colour</th><th class="n">Cut bal</th><th>Fabric</th></tr></thead><tbody>\${rs.map(r=>{const f=fabricState(r);return \`<tr><td><input type="radio" name="ad-c" value="\${r.i}" \${cutBal(r)>0?'':'disabled'}></td><td>\${esc(r.c)}</td><td class="n">\${kgs(cutBal(r))}</td><td>\${pill(f.t,f.c)}</td></tr>\`}).join('')}</tbody></table>
   <div class="row"><span>Pcs</span><input type="number" id="ad-q"></div>\`:''}
   <div><button class="btn sm pri" id="ad-ok">Add</button> <button class="btn sm" id="ad-cx">Cancel</button></div></div>\`}`;

const newAddForm = `function addForm(kind,t,fl){
  const st=TP[kind], sug=suggestions(kind,fl); const rs=st.job?L.filter(r=>r.j===st.job):[];
  return \`<div class="form" style="padding:8px;border-top:1px solid var(--line);background:var(--sel);border-radius:4px;margin-top:6px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <b>Add to \${t} (\${fl==='Y/D'?'Yarn-dyed':'for '+fl})</b>
      <a href="#\${kind}-sug-panel" style="font-size:11.5px;color:var(--indigo);text-decoration:none" onclick="TP_SUG['\${kind}'].fl='\${fl}';renderTPSuggestionTable('\${kind}');">↓ View all \${fl} orders below</a>
    </div>
    <div class="row">
      <span>Job no</span>
      <input id="ad-j" list="ad-jl" value="\${esc(st.job||'')}" placeholder="Type Job # or pick candidate...">
      <datalist id="ad-jl">\${sug.map(j=>\`<option value="\${esc(j)}">\`).join('')}</datalist>
    </div>
    \${sug.length && !st.job ? \`<div class="ks muted" style="margin:4px 0">Suggested for \${fl}: \${sug.slice(0,6).map(j=>\`<a href="#" data-sj="\${esc(j)}" style="font-weight:600">\${esc(j)}</a>\`).join(' · ')}</div>\` : ''}
    \${rs.length ? \`
      <div style="overflow-x:auto;margin:6px 0">
        <table style="width:100%;font-size:11.5px">
          <thead>
            <tr>
              <th></th>
              <th>Colour</th>
              <th style="text-align:right">Order</th>
              <th style="text-align:right">Cut Bal</th>
              <th>Body Fab</th>
              <th>Rib Fab</th>
              <th>P+E</th>
              <th>PCD</th>
            </tr>
          </thead>
          <tbody>
            \${rs.map(r => {
              const det = calcFabDetail(r);
              return \`
                <tr>
                  <td><input type="radio" name="ad-c" value="\${r.i}" \${det.cutBal>0?'':'disabled'}></td>
                  <td><b>\${esc(r.c)}</b></td>
                  <td style="text-align:right">\${kgs(det.oq)}</td>
                  <td style="text-align:right"><b style="color:var(--warn)">+\${kgs(det.cutBal)}</b></td>
                  <td>\${det.bodyRecv}/\${det.bodyReq}kg (\${det.bodyPct}%)</td>
                  <td>\${det.ribRecv}/\${det.ribReq}kg (\${det.ribPct}%)</td>
                  <td>\${det.isPEBoth?'🔥 P+E':det.hasP?'🖨️ P':det.hasE?'🧵 E':'⚪ Solid'}</td>
                  <td>\${fd(det.pcd)}</td>
                </tr>
              \`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="row"><span>Planned Pcs</span><input type="number" id="ad-q"></div>
    \` : ''}
    <div style="display:flex;gap:6px;margin-top:6px">
      <button class="btn sm pri" id="ad-ok">Add to \${t}</button>
      <button class="btn sm" id="ad-cx">Cancel</button>
    </div>
  </div>\`;
}`;

if (html.includes('function addForm(kind,t,fl){const st=TP[kind]')) {
  html = html.replace(oldAddForm, newAddForm);
} else {
  console.log('Did not match old addForm directly, will replace by index range');
  const afStart = html.indexOf('function addForm(kind,t,fl){');
  const afEnd = html.indexOf('function bindAdd(kind,day){', afStart);
  if (afStart !== -1 && afEnd !== -1) {
    html = html.slice(0, afStart) + newAddForm + '\n' + html.slice(afEnd);
    console.log('Replaced addForm by index range successfully');
  }
}

fs.writeFileSync('apps/web/public/cutting/index.html', html, 'utf8');
console.log('Updated apps/web/public/cutting/index.html successfully');
