const fs = require('fs');
let html = fs.readFileSync('apps/web/public/cutting/index.html', 'utf8');

// 1. Add CSS for Colorful Separable Upper 7 Tables & Freeze System
const colorfulTablesCSS = `
/* Colorful Easily Separable 7 Upper Tables */
.tpan{border-radius:8px;border:1px solid var(--line);overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);transition:box-shadow .2s,border-color .2s}
.tpan:hover{box-shadow:0 3px 8px rgba(0,0,0,0.08)}
.tpan.tbl-s3{border-top:3.5px solid #0284c7;background:linear-gradient(to bottom,rgba(2,132,199,0.04),var(--paper) 40px)}
.tpan.tbl-s2{border-top:3.5px solid #059669;background:linear-gradient(to bottom,rgba(5,150,105,0.04),var(--paper) 40px)}
.tpan.tbl-s1{border-top:3.5px solid #7c3aed;background:linear-gradient(to bottom,rgba(124,58,237,0.04),var(--paper) 40px)}
.tpan.tbl-yd{border-top:3.5px solid #d97706;background:linear-gradient(to bottom,rgba(217,119,6,0.04),var(--paper) 40px)}

.tpan h3{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;margin:0;font-size:13.5px;font-weight:700;border-bottom:1px solid var(--line)}
.tbl-badge{display:inline-block;padding:1px 6px;border-radius:4px;font-size:11px;font-weight:700;margin-left:6px;letter-spacing:0.3px}
.tbl-badge.s3{background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd}
.tbl-badge.s2{background:#dcfce7;color:#15803d;border:1px solid #bbf7d0}
.tbl-badge.s1{background:#f3e8ff;color:#6b21a8;border:1px solid #e9d5ff}
.tbl-badge.yd{background:#fef3c7;color:#92400e;border:1px solid #fde68a}

:root[data-theme="dark"] .tpan.tbl-s3{border-top-color:#38bdf8;background:linear-gradient(to bottom,rgba(56,189,248,0.1),var(--paper) 40px)}
:root[data-theme="dark"] .tpan.tbl-s2{border-top-color:#34d399;background:linear-gradient(to bottom,rgba(52,211,153,0.1),var(--paper) 40px)}
:root[data-theme="dark"] .tpan.tbl-s1{border-top-color:#a78bfa;background:linear-gradient(to bottom,rgba(167,139,250,0.1),var(--paper) 40px)}
:root[data-theme="dark"] .tpan.tbl-yd{border-top-color:#fbbf24;background:linear-gradient(to bottom,rgba(251,191,36,0.1),var(--paper) 40px)}

:root[data-theme="dark"] .tbl-badge.s3{background:#082f49;color:#7dd3fc;border-color:#0369a1}
:root[data-theme="dark"] .tbl-badge.s2{background:#052e16;color:#86efac;border-color:#15803d}
:root[data-theme="dark"] .tbl-badge.s1{background:#3b0764;color:#d8b4fe;border-color:#6b21a8}
:root[data-theme="dark"] .tbl-badge.yd{background:#451a03;color:#fde68a;border-color:#92400e}

.tpan table{width:100%;border-collapse:collapse}
.tpan table tr{border-bottom:1px solid var(--line)}
.tpan table tr:hover td{background:var(--sel)}
.tpan table td{padding:6px 10px;vertical-align:middle}
.tpan table tfoot th{padding:6px 10px;background:var(--chip)}

/* Freeze System (Sticky Columns) for Candidate Table */
.ct-table th.fz-0, .ct-table td.fz-0{position:sticky;left:0;z-index:3;min-width:100px;max-width:100px;background:var(--paper);box-shadow:1px 0 0 var(--line)}
.ct-table th.fz-1, .ct-table td.fz-1{position:sticky;left:100px;z-index:3;min-width:145px;max-width:145px;background:var(--paper);box-shadow:1px 0 0 var(--line)}
.ct-table th.fz-2, .ct-table td.fz-2{position:sticky;left:245px;z-index:3;min-width:130px;max-width:130px;background:var(--paper);box-shadow:2px 0 4px rgba(0,0,0,0.06)}
.ct-table th.fz-0, .ct-table th.fz-1, .ct-table th.fz-2{background:var(--chip);z-index:5}
.ct-table tr:hover td.fz-0, .ct-table tr:hover td.fz-1, .ct-table tr:hover td.fz-2{background:var(--sel)}

.ct-tbl-wrap{max-height:480px;overflow-x:auto;overflow-y:auto;border:1px solid var(--line);border-radius:6px;scrollbar-width:thin}
.ct-table thead th{position:sticky;top:0;z-index:4;background:var(--chip)}

.ct-table td{text-align:left}
.ct-table td.num-cell{text-align:left;font-variant-numeric:tabular-nums}
`;

if (!html.includes('/* Colorful Easily Separable 7 Upper Tables */')) {
  html = html.replace('</style>', colorfulTablesCSS + '\n</style>');
}

fs.writeFileSync('apps/web/public/cutting/index.html', html, 'utf8');
console.log('Added Colorful Tables and Freeze Column CSS');
