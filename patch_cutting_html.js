const fs = require('fs');
let html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');

// 1. Ensure panels exist in HTML
if (!html.includes('id="relax-sug-panel"')) {
  html = html.replace(
    '<div class="tgrid" id="relax-grid"></div>',
    '<div class="tgrid" id="relax-grid"></div><div id="relax-sug-panel" style="margin-top:16px"></div>'
  );
}
if (!html.includes('id="daily-sug-panel"')) {
  html = html.replace(
    '<div class="tgrid" id="daily-grid"></div>',
    '<div class="tgrid" id="daily-grid"></div><div id="daily-sug-panel" style="margin-top:16px"></div>'
  );
}

// 2. Add custom CSS styles for the Candidate Table
const candidateCSS = `
/* Master Cuttable Candidate Table Styles */
.ct-sug-panel{background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:14px;margin-top:16px;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
.ct-sug-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;border-bottom:1px solid var(--line);padding-bottom:10px}
.ct-sug-head h3{margin:0;font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px}
.ct-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
.ct-search{flex:1;min-width:240px;position:relative}
.ct-search input{width:100%;padding:6px 10px 6px 28px;border:1px solid var(--line);border-radius:6px;background:var(--paper);font-size:12.5px}
.ct-search::before{content:"🔍";position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:12px;opacity:0.6}
.ct-filter-sel{border:1px solid var(--line);border-radius:6px;padding:6px 8px;background:var(--paper);font-size:12px;color:var(--ink)}
.ct-tbl-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:6px}
.ct-table{width:100%;border-collapse:collapse;font-size:12px;text-align:left}
.ct-table th{background:var(--chip);color:var(--ink-2);font-weight:600;padding:8px 10px;border-bottom:1px solid var(--line);white-space:nowrap}
.ct-table td{padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:middle}
.ct-table tr:hover td{background:var(--sel)}
.ct-badge{display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap}
.ct-badge.crit{background:#fee2e2;color:#b91c1c;border:1px solid #f87171}
.ct-badge.print{background:#fef3c7;color:#92400e;border:1px solid #fcd34d}
.ct-badge.emb{background:#e0e7ff;color:#3730a3;border:1px solid #a5b4fc}
.ct-badge.solid{background:var(--chip);color:var(--ink-2);border:1px solid var(--line)}
.ct-badge.ready{background:var(--good-bg);color:var(--good);border:1px solid var(--good)}
.ct-badge.warn{background:var(--warn-bg);color:var(--warn);border:1px solid var(--warn)}
.ct-badge.bad{background:var(--bad-bg);color:var(--bad);border:1px solid var(--bad)}
.ct-fab-box{font-size:11px;line-height:1.3}
.ct-fab-box .kg-val{font-weight:700}
.ct-fab-box .kg-sub{color:var(--ink-2);font-size:10.5px}
.ct-plan-btn{background:var(--indigo);color:#fff;border:none;border-radius:4px;padding:4px 8px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;transition:opacity .15s}
.ct-plan-btn:hover{opacity:0.85}
.ct-pager{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:10px;font-size:12px;color:var(--ink-2)}
.ct-pager button{padding:4px 10px;border:1px solid var(--line);background:var(--paper);border-radius:4px;cursor:pointer;font-weight:600}
.ct-pager button:disabled{opacity:0.4;cursor:not-allowed}
`;

if (!html.includes('/* Master Cuttable Candidate Table Styles */')) {
  html = html.replace('</style>', candidateCSS + '\n</style>');
}

fs.writeFileSync('apps/web/public/cutting/index.html', html, 'utf8');
console.log('HTML and CSS updated successfully');
