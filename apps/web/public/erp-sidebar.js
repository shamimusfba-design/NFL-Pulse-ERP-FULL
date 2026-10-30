(function () {
  'use strict';
  if (document.getElementById('nos-erp-sidebar')) return;

  var GROUPS = [
    {
      label: 'Management',
      overview: '/modules/management',
      items: [
        { slug: 'job-360', short: 'J3', name: 'Job 360', href: '/modules/job-360' },
        { slug: 'kpi-board', short: 'KP', name: 'KPI Board', href: '/modules/kpi-board' },
        { slug: 'kaizen', short: 'KZ', name: 'Kaizen', href: '/modules/kaizen' }
      ]
    },
    {
      label: 'Merchandising',
      overview: '/modules/merchandising-overview',
      items: [
        { slug: 'merchandising', short: '⚡', name: 'Bulk Merchandising Dashboard', href: '/merchandising', highlight: 'blue' },
        { slug: 'order-entry', short: 'PO', name: 'Order Entry & PO Import', href: '/merchandising/order-po', highlight: 'amber' },
        { slug: 'bulk-followup', short: 'BF', name: 'Bulk Follow-up & Revisions', href: '/modules/merchandising?view=LEGACY_REGISTER' },
        { slug: 'production-lots', short: 'PL', name: 'PO / Market Production Lots', href: '/modules/production-lots' },
        { slug: 'projection', short: 'PR', name: 'Merchandising Projection', href: '/modules/projection' },
        { slug: 'sample-room', short: 'SR', name: 'Sample Room', href: '/sample-room/index.html' },
        { slug: 'forms-print', short: 'FM', name: 'Forms & Print Documents', href: '/modules/forms-print' }
      ]
    },
    {
      label: 'Sample / CAD / Technical',
      overview: '/modules/sample-cad-technical',
      items: [
        { slug: 'central-sample', short: 'CS', name: 'Central Sample Department', href: '/modules/central-sample' },
        { slug: 'sample-fabric-store', short: 'SF', name: 'Sample Finish Fabric Store', href: '/modules/sample-fabric-store' },
        { slug: 'cad', short: 'CD', name: 'CAD / Consumption / Pattern', href: '/modules/cad' },
        { slug: 'technical', short: 'TC', name: 'Technical / File Handover', href: '/modules/technical' }
      ]
    },
    {
      label: 'Central Planning',
      overview: '/modules/central-planning',
      items: [
        { slug: 'ta', short: 'TA', name: 'Time & Action & Control Tower', href: '/modules/ta' },
        { slug: 'planning-approvals', short: 'AD', name: 'Approval Desk & Release', href: '/modules/planning-approvals' },
        { slug: 'capacity', short: 'CB', name: 'Capacity & Holiday Calendar', href: '/modules/capacity' },
        { slug: 'sewing-planning', short: 'LP', name: 'Sewing Line Gantt', href: '/modules/sewing-planning' },
        { slug: 'subcontract', short: 'SC', name: 'Subcontract / Print-Emb Follow-up', href: '/modules/subcontract' },
        { slug: 'lead-time-history', short: 'LT', name: 'Lead Time & Delivery History', href: '/modules/lead-time-history' }
      ]
    },
    {
      label: 'Yarn Store & Knitting',
      overview: '/yarn-knitting/index.html',
      items: [
        { slug: 'yarn-knitting', short: 'YK', name: 'Yarn Store & Knitting', href: '/yarn-knitting/index.html' }
      ]
    },
    {
      label: 'Greige Fabric Store',
      overview: '/greige-store/index.html',
      items: [
        { slug: 'greige-store', short: 'GS', name: 'Greige Fabric Store', href: '/greige-store/index.html' }
      ]
    },
    {
      label: 'Dyeing',
      overview: '/dyeing/index.html',
      items: [
        { slug: 'dyeing', short: 'DY', name: 'Dyeing', href: '/dyeing/index.html' }
      ]
    },
    {
      label: 'Lab & Testing',
      overview: '/modules/lab',
      items: [
        { slug: 'lab', short: 'LB', name: 'Lab & Testing', href: '/modules/lab' }
      ]
    },
    {
      label: 'Fabric Finishing',
      overview: '/modules/fabric-finishing',
      items: [
        { slug: 'fabric-finishing', short: 'FF', name: 'Fabric Finishing', href: '/modules/fabric-finishing' }
      ]
    },
    {
      label: 'Finished Fabric Store',
      overview: '/finished-fabric/index.html',
      items: [
        { slug: 'finished-fabric', short: 'FS', name: 'Finished Fabric Store', href: '/finished-fabric/index.html' }
      ]
    },
    {
      label: 'Garment Production',
      overview: '/modules/garment-production',
      items: [
        { slug: 'cutting', short: 'CT', name: 'Cutting & Input Management', href: '/modules/cutting' },
        { slug: 'printing', short: 'PT', name: 'Printing Operations', href: '/modules/printing' },
        { slug: 'embroidery', short: 'EM', name: 'Embroidery Operations', href: '/modules/embroidery' },
        { slug: 'special-process', short: 'SP', name: 'Special Processes', href: '/modules/special-process' },
        { slug: 'sewing', short: 'SW', name: 'Sewing', href: '/modules/sewing' },
        { slug: 'finishing', short: 'FP', name: 'Finishing & Packing', href: '/modules/finishing' }
      ]
    },
    {
      label: 'IE / Industrial Engineering',
      overview: '/modules/ie-overview',
      items: [
        { slug: 'kpi-board', short: 'KP', name: 'KPI Data Entry & Board', href: '/modules/kpi-board' },
        { slug: 'ie-bulletin', short: 'IB', name: 'IE Bulletin & Follow-up', href: '/modules/ie-bulletin' },
        { slug: 'ie-daily-target', short: 'TG', name: 'Target Giving', href: '/modules/ie-daily-target' },
        { slug: 'ie-mis-import', short: 'MI', name: 'Daily MIS Import', href: '/modules/ie-mis-import' },
        { slug: 'ie-npt', short: 'NP', name: 'NPT', href: '/modules/ie-npt' },
        { slug: 'ie-qco', short: 'QC', name: 'Quick Changeover', href: '/modules/ie-qco' },
        { slug: 'ie-line-performance', short: 'LP', name: 'Line-wise Performance', href: '/modules/ie-line-performance' },
        { slug: 'ie-responsibility', short: 'RP', name: 'Responsible Person Master', href: '/modules/ie-responsibility' },
        { slug: 'ie-skill-matrix', short: 'SK', name: 'Skill Matrix', href: '/modules/ie-skill-matrix' },
        { slug: 'ie-production-checkpoints', short: 'PC', name: 'Production Checkpoints', href: '/modules/ie-production-checkpoints' },
        { slug: 'ie-reports', short: 'IR', name: 'IE Reports', href: '/modules/ie-reports' }
      ]
    },
    {
      label: 'Quality & Stores',
      overview: '/modules/quality-stores',
      items: [
        { slug: 'quality', short: 'QM', name: 'Quality Management', href: '/modules/quality' },
        { slug: 'quality-history', short: 'QH', name: 'Job Quality History', href: '/modules/quality-history' },
        { slug: 'trims', short: 'TR', name: 'Trims & Accessories Store', href: '/modules/trims' },
        { slug: 'inventory', short: 'IN', name: 'General Stores & Inventory', href: '/modules/inventory' }
      ]
    },
    {
      label: 'Maintenance & Engineering',
      overview: '/modules/maintenance',
      items: [
        { slug: 'maintenance', short: 'MT', name: 'Machine Utilization & Requirement', href: '/modules/maintenance' }
      ]
    },
    {
      label: 'Shipment & System',
      overview: '/modules/shipment-system',
      items: [
        { slug: 'shipment', short: 'SH', name: 'Shipment & Commercial', href: '/modules/shipment' },
        { slug: 'reports', short: 'RA', name: 'Reports & Analytics', href: '/modules/reports' },
        { slug: 'floor-display', short: 'TV', name: 'Floor / TV Live Display', href: '/modules/floor-display' },
        { slug: 'masters', short: 'MC', name: 'Masters & Configuration', href: '/modules/masters' },
        { slug: 'data-import', short: 'XL', name: 'Excel Import & Running Data', href: '/modules/data-import' },
        { slug: 'administration', short: 'AD', name: 'Users, Roles & Permissions', href: '/modules/administration' }
      ]
    }
  ];

  var style = document.createElement('style');
  style.textContent = [
    ':root { --erp-sb-w: 256px; }',
    'body.has-erp-sidebar { padding-left: var(--erp-sb-w) !important; transition: padding-left 0.18s ease; }',
    'body.has-erp-sidebar.erp-sidebar-collapsed { padding-left: 0 !important; }',
    '#nos-erp-sidebar { position: fixed; top: 0; left: 0; bottom: 0; width: var(--erp-sb-w); background: linear-gradient(180deg, #0b1424 0%, #0d1829 100%); color: #e7edf7; padding: 14px 11px 14px; overflow-y: auto; overflow-x: hidden; border-right: 1px solid rgba(255,255,255,0.08); z-index: 120; font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 12.5px; line-height: 1.35; transition: transform 0.18s ease; box-sizing: border-box; }',
    'body.erp-sidebar-collapsed #nos-erp-sidebar { transform: translateX(-100%); }',
    '#nos-erp-sidebar * { box-sizing: border-box; }',
    '#nos-erp-sidebar::-webkit-scrollbar { width: 6px; }',
    '#nos-erp-sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.16); border-radius: 4px; }',
    '.erp-sb-brand { display: flex; align-items: center; gap: 9px; padding: 2px 6px 12px; border-bottom: 1px solid rgba(255,255,255,0.07); margin-bottom: 10px; }',
    '.erp-sb-logo { width: 32px; height: 32px; border-radius: 8px; object-fit: cover; background: #fff; flex-shrink: 0; }',
    '.erp-sb-title { font-size: 13.5px; font-weight: 800; color: #fff; letter-spacing: -0.02em; line-height: 1.15; }',
    '.erp-sb-sub { font-size: 10px; color: #8491a7; margin-top: 2px; }',
    '.erp-sb-close { margin-left: auto; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); color: #cbd5e1; width: 26px; height: 26px; border-radius: 6px; cursor: pointer; display: grid; place-items: center; font-size: 13px; flex-shrink: 0; padding: 0; }',
    '.erp-sb-close:hover { background: rgba(255,255,255,0.16); color: #fff; }',
    '.erp-sb-search { height: 32px; display: flex; align-items: center; gap: 6px; margin: 0 4px 10px; padding: 0 9px; border: 1px solid rgba(255,255,255,0.09); background: rgba(255,255,255,0.045); border-radius: 8px; }',
    '.erp-sb-search span { color: #8fa0bb; font-size: 12px; }',
    '.erp-sb-search input { border: 0 !important; outline: 0 !important; color: #e8edf7 !important; background: transparent !important; width: 100%; font-size: 12px !important; padding: 0 !important; min-height: 0 !important; height: auto !important; }',
    '.erp-sb-search input::placeholder { color: #71819b; }',
    '.erp-sb-link { display: flex; align-items: center; gap: 8px; min-height: 33px; padding: 5px 8px; border-radius: 8px; margin: 2px 0; color: #bac5d6; text-decoration: none; font-size: 12.5px; transition: background 0.12s ease, color 0.12s ease; }',
    '.erp-sb-link:hover { background: rgba(255,255,255,0.07); color: #fff; }',
    '.erp-sb-link.active { background: linear-gradient(90deg, rgba(37,99,235,0.32), rgba(37,99,235,0.14)); color: #fff; box-shadow: inset 3px 0 0 #4d86ff; font-weight: 600; }',
    '.erp-sb-icon { flex: 0 0 25px; height: 22px; display: grid; place-items: center; border-radius: 6px; background: rgba(255,255,255,0.07); color: #aebbd1; font-size: 9px; font-weight: 800; letter-spacing: 0.03em; }',
    '.erp-sb-link.active .erp-sb-icon { background: #2c64d8; color: #fff; }',
    '.erp-sb-group { margin-top: 6px; }',
    '.erp-sb-gtoggle { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 30px; padding: 4px 8px; border-radius: 7px; color: #7d8da7; cursor: pointer; user-select: none; transition: 0.12s ease; }',
    '.erp-sb-gtoggle:hover { background: rgba(255,255,255,0.05); color: #dce5f2; }',
    '.erp-sb-gtoggle.has-active { color: #93c5fd; }',
    '.erp-sb-glabel { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: inherit; text-decoration: none; flex: 1; }',
    '.erp-sb-chev { font-size: 12px; width: 20px; height: 20px; display: grid; place-items: center; border-radius: 5px; transform: rotate(-90deg); transition: transform 0.15s ease; color: #7e8da4; background: transparent; border: 0; cursor: pointer; padding: 0; }',
    '.erp-sb-group.open .erp-sb-chev { transform: rotate(0deg); color: #d8e2f1; background: rgba(255,255,255,0.06); }',
    '.erp-sb-gitems { display: none; padding-left: 4px; padding-top: 1px; }',
    '.erp-sb-group.open .erp-sb-gitems { display: block; }',
    '.erp-sb-foot { display: flex; align-items: center; gap: 8px; margin: 14px 4px 0; padding: 9px 10px; border-radius: 8px; background: rgba(255,255,255,0.04); color: #b8c2d2; font-size: 10.5px; }',
    '.erp-sb-dot { width: 7px; height: 7px; border-radius: 50%; background: #27c169; box-shadow: 0 0 0 3px rgba(39,193,105,0.15); flex-shrink: 0; }',
    '.erp-ham-btn { display: inline-flex; align-items: center; justify-content: center; gap: 5px; background: rgba(255,255,255,0.14) !important; border: 1px solid rgba(255,255,255,0.28) !important; color: #fff !important; border-radius: 7px !important; padding: 5px 10px !important; cursor: pointer; font-weight: 600 !important; font-size: 13px !important; line-height: 1; flex-shrink: 0; }',
    '.erp-ham-btn:hover { background: rgba(255,255,255,0.24) !important; }',
    '@media print { #nos-erp-sidebar, .erp-ham-btn { display: none !important; } body.has-erp-sidebar { padding-left: 0 !important; } }'
  ].join('\n');
  document.head.appendChild(style);

  var path = location.pathname || '';
  var isActiveHref = function (href) {
    if (!href) return false;
    var cleanHref = href.split('?')[0];
    if (cleanHref === '/') return path === '/';
    return path === cleanHref || path.indexOf(cleanHref.replace('/index.html', '')) === 0;
  };

  var openGroups = {};
  GROUPS.forEach(function (g) {
    var active = isActiveHref(g.overview) || g.items.some(function (it) { return isActiveHref(it.href); });
    if (active) openGroups[g.label] = true;
  });

  var sb = document.createElement('aside');
  sb.id = 'nos-erp-sidebar';
  sb.setAttribute('aria-label', 'ERP Left Navigation');

  function renderSidebar(q) {
    q = (q || '').trim().toLowerCase();
    var html = '';
    GROUPS.forEach(function (g) {
      var items = q
        ? g.items.filter(function (it) { return (it.name + ' ' + g.label).toLowerCase().indexOf(q) !== -1; })
        : g.items;
      if (q && !items.length) return;
      var hasAct = isActiveHref(g.overview) || g.items.some(function (it) { return isActiveHref(it.href); });
      var isSingleDirect = g.items.length === 1 && g.items[0].href === g.overview;
      if (isSingleDirect && !q) {
        var single = g.items[0];
        var act = isActiveHref(single.href);
        html += '<div class="erp-sb-group" style="margin-top:4px">' +
          '<a class="erp-sb-link ' + (act ? 'active' : '') + '" href="' + single.href + '">' +
          '<span class="erp-sb-icon">' + single.short + '</span>' +
          '<span>' + single.name + '</span>' +
          '</a></div>';
        return;
      }
      var isOpen = q.length > 0 || !!openGroups[g.label];
      html += '<div class="erp-sb-group ' + (isOpen ? 'open' : '') + '" data-group="' + g.label + '">' +
        '<div class="erp-sb-gtoggle ' + (hasAct ? 'has-active' : '') + '">' +
        '<a class="erp-sb-glabel" href="' + g.overview + '">' + g.label + '</a>' +
        '<button type="button" class="erp-sb-chev" data-gtog="' + g.label + '" aria-label="Toggle ' + g.label + '">⌄</button>' +
        '</div>' +
        '<div class="erp-sb-gitems">' +
        items.map(function (it) {
          var act = isActiveHref(it.href);
          return '<a class="erp-sb-link ' + (act ? 'active' : '') + '" href="' + it.href + '">' +
            '<span class="erp-sb-icon">' + it.short + '</span>' +
            '<span>' + it.name + '</span>' +
            '</a>';
        }).join('') +
        '</div></div>';
    });
    var navEl = sb.querySelector('#erp-sb-nav-groups');
    if (navEl) {
      navEl.innerHTML = html;
      navEl.querySelectorAll('[data-gtog]').forEach(function (btn) {
        btn.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();
          var lbl = btn.getAttribute('data-gtog');
          openGroups[lbl] = !openGroups[lbl];
          renderSidebar(sb.querySelector('#erp-sb-q').value);
        };
      });
    }
  }

  sb.innerHTML =
    '<div class="erp-sb-brand">' +
      '<img class="erp-sb-logo" src="/branding/northern-fashions-logo.jpg" alt="NFL" onerror="this.style.display=\'none\'">' +
      '<div style="min-width:0"><div class="erp-sb-title">Northern Fashions</div><div class="erp-sb-sub">NFL Pulse ERP · Control</div></div>' +
      '<button type="button" class="erp-sb-close" id="erp-sb-hide" title="Hide left menu">«</button>' +
    '</div>' +
    '<div class="erp-sb-search"><span>⌕</span><input type="search" id="erp-sb-q" placeholder="Find module..." aria-label="Find module"></div>' +
    '<nav>' +
      '<a class="erp-sb-link" href="/"><span class="erp-sb-icon">👑</span><span>Executive KPI Board</span></a>' +
      '<a class="erp-sb-link" href="/tasks"><span class="erp-sb-icon">TK</span><span>My Pending Tasks</span></a>' +
      '<a class="erp-sb-link" href="/jobs"><span class="erp-sb-icon">📋</span><span>All Jobs & Stages</span></a>' +
      '<div id="erp-sb-nav-groups"></div>' +
    '</nav>' +
    '<div class="erp-sb-foot"><div class="erp-sb-dot"></div><div><strong style="display:block;color:#e2e8f0">Connected ERP</strong><span style="color:#71819b">All Process Sections</span></div></div>';

  function mount() {
    document.body.classList.add('has-erp-sidebar');
    var collapsed = false;
    try {
      collapsed = localStorage.getItem('nos_sidebar_collapsed') === '1';
    } catch (e) {}
    if (collapsed) document.body.classList.add('erp-sidebar-collapsed');

    document.body.insertBefore(sb, document.body.firstChild);
    renderSidebar('');

    var qInput = sb.querySelector('#erp-sb-q');
    if (qInput) {
      qInput.addEventListener('input', function () {
        renderSidebar(qInput.value);
      });
    }

    function toggleSidebar() {
      var isCol = document.body.classList.toggle('erp-sidebar-collapsed');
      try {
        localStorage.setItem('nos_sidebar_collapsed', isCol ? '1' : '0');
      } catch (e) {}
      updateHamBtn();
    }

    var hideBtn = sb.querySelector('#erp-sb-hide');
    if (hideBtn) hideBtn.onclick = toggleSidebar;

    var topHeader = document.querySelector('header.top, .top');
    var hamBtn = document.createElement('button');
    hamBtn.type = 'button';
    hamBtn.className = 'erp-ham-btn';
    hamBtn.title = 'Show / Hide Left Menu';
    hamBtn.onclick = toggleSidebar;

    function updateHamBtn() {
      var isCol = document.body.classList.contains('erp-sidebar-collapsed');
      hamBtn.innerHTML = '☰ <span style="font-size:11.5px">' + (isCol ? 'Menu' : 'Hide menu') + '</span>';
      hamBtn.setAttribute('aria-expanded', isCol ? 'false' : 'true');
    }
    updateHamBtn();

    if (topHeader) {
      topHeader.insertBefore(hamBtn, topHeader.firstChild);
    } else {
      hamBtn.style.cssText = 'position:fixed;top:10px;left:10px;z-index:130;background:#1f3a5f!important;';
      document.body.appendChild(hamBtn);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
