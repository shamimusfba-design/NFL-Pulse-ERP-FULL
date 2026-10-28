'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, useRef } from 'react';
import { MODULE_GROUPS, ModuleGroup } from '../lib/modules';
import { api } from '../lib/api';
import { displayJobNo } from '../lib/display';
import GlobalStickyScrollbar from './GlobalStickyScrollbar';

function roleFilteredGroups(groups: ModuleGroup[], roles: string[]): ModuleGroup[] {
  if (!roles.length || roles.includes('ADMIN')) return groups;
  const allowed: Record<string, string[]> = {};
  const add = (group: string, slugs: string[]) => { allowed[group] = [...(allowed[group] || []), ...slugs]; };

  const hasRole = (targets: string[]) => roles.some(r => targets.includes(String(r).toUpperCase()));

  if (hasRole(['MERCH_BULK', 'MERCHANDISER', 'MERCH', 'MERCH_USER'])) add('Merchandising', ['merchandising', 'order-entry', 'bulk-followup', 'production-lots', 'forms-print']);
  if (hasRole(['MERCH_SAMPLE'])) add('Merchandising', ['merchandising', 'order-entry', 'sample-room', 'forms-print']);
  if (hasRole(['MERCH_BOTH'])) add('Merchandising', ['merchandising', 'order-entry', 'bulk-followup', 'production-lots', 'sample-room', 'forms-print']);
  if (hasRole(['MERCH_HEAD', 'HEAD_MERCHANDISER'])) { add('Merchandising', ['merchandising', 'order-entry', 'bulk-followup', 'production-lots', 'projection', 'sample-room', 'forms-print']); add('Sample / CAD / Technical', ['central-sample', 'sample-fabric-store', 'cad', 'technical']); }
  if (roles.includes('IE')) { add('Merchandising', ['merchandising', 'production-lots']); add('Industrial Production Engineering', ['ie-overview', 'ie-bulletin', 'ie-daily-target', 'ie-mis-import', 'ie-npt', 'ie-qco', 'ie-line-performance', 'ie-responsibility', 'ie-skill-matrix', 'ie-production-checkpoints', 'ie-reports']); add('Management', ['kpi-board','kaizen']); }
  if (roles.includes('CAD')) add('Sample / CAD / Technical', ['cad', 'technical']);
  if (roles.includes('SAMPLE')) { add('Merchandising', ['sample-room']); add('Sample / CAD / Technical', ['central-sample', 'sample-fabric-store']); }
  if (roles.includes('PLANNING')) { add('Merchandising', ['merchandising', 'order-entry', 'production-lots', 'forms-print']); add('Central Planning', ['ta', 'capacity', 'sewing-planning', 'subcontract', 'lead-time-history']); add('Management', ['job-360']); }
  if (roles.includes('MANAGEMENT')) { add('Management', ['management', 'job-360', 'kpi-board', 'kaizen']); add('Central Planning', ['capacity', 'lead-time-history']); add('Quality & Stores', ['quality', 'quality-history']); add('Shipment & System', ['reports']); }
  if (roles.includes('QUALITY')) { add('Management', ['job-360']); add('Yarn & Fabric', ['lab']); add('Quality & Stores', ['quality', 'quality-history']); }
  if (roles.includes('YARN_MANAGEMENT')) add('Yarn & Fabric', ['yarn', 'yarn-store', 'yarn-dyeing', 'knitting']);
  if (roles.includes('PROCUREMENT')) add('Yarn & Fabric', ['procurement', 'yarn']);
  if (roles.includes('YARN_STORE')) add('Yarn & Fabric', ['yarn-store', 'yarn']);
  if (roles.includes('YARN_DYEING')) add('Yarn & Fabric', ['yarn-dyeing', 'yarn-store']);
  if (roles.includes('KNITTING')) add('Yarn & Fabric', ['knitting', 'yarn']);
  if (roles.includes('GREIGE_STORE')) add('Yarn & Fabric', ['greige-store']);
  if (roles.includes('DYEING')) add('Yarn & Fabric', ['dyeing', 'greige-store', 'fabric-finishing']);
  if (roles.includes('LAB')) add('Yarn & Fabric', ['lab']);
  if (roles.includes('FABRIC_FINISHING')) add('Yarn & Fabric', ['fabric-finishing', 'finished-fabric']);
  if (roles.includes('FINISHED_FABRIC_STORE')) add('Yarn & Fabric', ['finished-fabric']);
  if (roles.includes('CUTTING')) add('Garment Production', ['cutting']);
  if (roles.includes('PRINTING')) add('Garment Production', ['printing']);
  if (roles.includes('EMBROIDERY')) add('Garment Production', ['embroidery']);
  if (roles.includes('SEWING')) { add('Garment Production', ['sewing']); add('Industrial Production Engineering', ['ie-npt', 'ie-qco']); }
  if (roles.includes('FINISHING')) add('Garment Production', ['finishing']);
  if (roles.includes('TRIMS_STORE')) add('Quality & Stores', ['trims']);
  if (roles.includes('SHIPMENT')) add('Shipment & System', ['shipment', 'reports']);
  if (roles.includes('MAINTENANCE')) add('Maintenance & Engineering', ['maintenance']);

  if (!Object.keys(allowed).length) return groups;
  return groups.map((group) => ({ ...group, items: group.items.filter((item) => (allowed[group.label] || []).includes(item.slug)) })).filter((group) => group.items.length);
}

const PERSONAS = [
  { id: 'user-imran', name: 'Md. Imran', role: 'MERCHANDISER', assignedBuyer: 'ONLY', tag: '⭐ Merchandiser: Imran (ONLY, 61 Jobs)', desc: 'Restricted entry to Merchandising area only' },
  { id: 'user-head', name: 'Tariqul Islam', role: 'HEAD_MERCHANDISER', assignedBuyer: 'ALL', tag: '👑 Head Merchandiser & Admin', desc: 'Full access across all 2,000 jobs' },
  { id: 'user-basir', name: 'Basir Hossain', role: 'MERCHANDISER', assignedBuyer: 'OVS', tag: 'Merchandiser: Basir (OVS, 64 Jobs)', desc: 'OVS buyer follow-up' },
  { id: 'user-cad', name: 'Rafiqul Islam', role: 'CAD_SPECIALIST', assignedBuyer: 'ALL', tag: '📐 CAD Specialist', desc: 'Marker & Consumption entry' },
  { id: 'user-ie', name: 'Engr. Kabir Hossain', role: 'IE_SPECIALIST', assignedBuyer: 'ALL', tag: '⚙️ Central IE Specialist', desc: 'Bulletin & SMV targets' },
  { id: 'user-lab', name: 'Dr. Nazrul Islam', role: 'LAB_HEAD', assignedBuyer: 'ALL', tag: '🧪 Dyeing Lab Chief', desc: 'Lab Dip shade match' },
  { id: 'user-planning', name: 'Shahidul Alam', role: 'PLANNING_HEAD', assignedBuyer: 'ALL', tag: '📅 Central Planning Head', desc: 'T&A Approval & Mill Dispatch' }
];

export default function Shell({ children, title, eyebrow }: { children: React.ReactNode; title: string; eyebrow?: string }) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [jobJumpNo, setJobJumpNo] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [searchHits, setSearchHits] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Live Debounced Job Search
  useEffect(() => {
    const q = jobJumpNo.trim();
    if (!q) {
      setSearchHits([]);
      setShowSearchDropdown(false);
      return;
    }
    const timer = setTimeout(() => {
      api(`/jobs?q=${encodeURIComponent(q)}`)
        .then((res: any) => {
          if (res?.jobs && Array.isArray(res.jobs)) {
            setSearchHits(res.jobs.slice(0, 6));
            setShowSearchDropdown(true);
          }
        })
        .catch(() => {});
    }, 150);
    return () => clearTimeout(timer);
  }, [jobJumpNo]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowPersonaMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function switchActivePersona(p: any) {
    const userObj = {
      id: p.id,
      name: p.name,
      email: `${p.name.toLowerCase().replace(/[^a-z]/g, '')}@northernfashions.com`,
      role: p.role,
      roles: [p.role, 'MERCH_BULK'],
      merchandiserName: p.role === 'MERCHANDISER' ? (p.name.includes('Imran') ? 'Imran' : p.name.split(' ')[0]) : 'ALL',
      assignedBuyer: p.assignedBuyer,
      department: p.desc
    };
    localStorage.setItem('nfl_user', JSON.stringify(userObj));
    localStorage.setItem('nos_active_persona', JSON.stringify({
      id: p.id,
      name: p.name,
      role: p.role,
      assignedBuyer: p.assignedBuyer,
      email: userObj.email,
      avatar: p.name.slice(0, 2).toUpperCase(),
      department: p.desc
    }));
    setUser(userObj);
    setShowPersonaMenu(false);
    if (p.role === 'MERCHANDISER' && p.name.includes('Imran')) {
      window.location.href = '/jobs?myJobs=true';
    } else {
      window.location.reload();
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('nfl_access_token');
    const raw = localStorage.getItem('nfl_user');
    if (!token || token === 'undefined' || token === 'null') {
      location.href = '/login';
      return;
    }
    if (raw && raw !== 'undefined' && raw !== 'null') {
      try {
        setUser(JSON.parse(raw));
      } catch (err) {
        console.error('Failed to parse nfl_user:', err);
        setUser({ id: 'u-1', name: 'Authorized User', email: 'user@northernfashions.com', roles: ['ADMIN'] });
      }
    } else {
      setUser({ id: 'u-1', name: 'Authorized User', email: 'user@northernfashions.com', roles: ['ADMIN'] });
    }
  }, []);

  const roleGroups = useMemo(() => roleFilteredGroups(MODULE_GROUPS, user?.roles || []), [user]);

  useEffect(() => {
    const current = roleGroups.find((group) =>
      pathname.startsWith(`/modules/${group.overviewSlug}`) || group.items.some((item) => pathname.startsWith(`/modules/${item.slug}`)),
    );
    if (current) setOpenGroups((prev) => ({ ...prev, [current.label]: true }));
  }, [pathname, roleGroups]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roleGroups;
    return roleGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(q)),
    })).filter((group) => group.items.length);
  }, [query, roleGroups]);

  const logout = () => { localStorage.clear(); location.href = '/login'; };
  const active = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href));
  const toggleGroup = (label: string) => setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  const roles: string[] = user?.roles || [];
  const canEnterOrders = !roles.length || roles.some((r) => ['ADMIN', 'MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'].includes(r));

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-wrap">
          <img className="brand-logo" src="/branding/northern-fashions-logo.jpg" alt="Northern Fashions Limited" />
          <div><div className="brand">Northern Fashions Limited</div><div className="brand-sub">NFL Pulse ERP · Operations Control</div></div>
        </div>

        <div className="sidebar-search">
          <span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find module..." aria-label="Find module" />
        </div>

        <nav className="nav">
          {!query && <>
            <Link className={active('/') ? 'nav-link active' : 'nav-link'} href="/"><span className="nav-icon">👑</span><span>Executive KPI Board</span></Link>
            <Link className={active('/tasks') ? 'nav-link active' : 'nav-link'} href="/tasks"><span className="nav-icon">TK</span><span>My Pending Tasks</span></Link>
            <Link className={active('/jobs') ? 'nav-link active' : 'nav-link'} href="/jobs"><span className="nav-icon">📋</span><span>All Jobs & Stages</span></Link>
          </>}

          {groups.map((group) => {
            const isOpen = query.length > 0 || !!openGroups[group.label];
            const overviewHref = `/modules/${group.overviewSlug}`;
            const hasActive = active(overviewHref) || group.items.some((item) => active(item.slug === 'merchandising' ? '/merchandising' : item.slug === 'order-entry' ? '/merchandising/order-po' : `/modules/${item.slug}`));
            return <div className={`nav-group ${isOpen ? 'open' : ''}`} key={group.label}>
              <div className={`nav-group-toggle ${hasActive ? 'has-active' : ''}`}>
                <Link className="nav-group-overview" href={overviewHref} title={`${group.label} overview`} onClick={() => setOpenGroups((prev) => ({ ...prev, [group.label]: true }))}>
                  <span className="nav-group-title">{group.label}</span>
                </Link>
                <button type="button" className="nav-group-chevron-btn" onClick={() => toggleGroup(group.label)} aria-label={`${isOpen?'Collapse':'Expand'} ${group.label}`} aria-expanded={isOpen}>
                  <span className={`nav-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true">⌄</span>
                </button>
              </div>
              <div className={`nav-group-items ${isOpen ? 'open' : ''}`}>
                {group.items.map((item) => {
                  const href = item.slug === 'merchandising' ? '/merchandising' : item.slug === 'order-entry' ? '/merchandising/order-po' : item.slug === 'bulk-followup' ? '/modules/merchandising?view=LEGACY_REGISTER' : `/modules/${item.slug}`;
                  const isControlTower = item.slug === 'merchandising';
                  const isOrderEntry = item.slug === 'order-entry';
                  return <Link className={active(href) ? 'nav-link active' : 'nav-link'} href={href} key={item.slug} title={item.description} style={isControlTower ? { background: 'linear-gradient(90deg, rgba(37,99,235,0.18), rgba(30,64,175,0.06))', borderLeft: '3px solid #3b82f6' } : isOrderEntry ? { background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b' } : undefined}>
                    <span className="nav-icon" style={isControlTower ? { background: '#2563eb', color: '#fff', fontWeight: 900 } : isOrderEntry ? { background: '#f59e0b', color: '#000', fontWeight: 900 } : undefined}>
                      {isControlTower ? '⚡' : isOrderEntry ? 'PO' : item.short}
                    </span>
                    <span className="nav-text" style={isControlTower ? { fontWeight: 700, color: '#93c5fd' } : isOrderEntry ? { fontWeight: 700, color: '#fde68a' } : undefined}>
                      {item.name}
                    </span>
                    {isControlTower && <span style={{ marginLeft: 'auto', fontSize: '8px', background: '#2563eb', color: '#fff', padding: '1px 5px', borderRadius: '3px', fontWeight: 900 }}>DASHBOARD</span>}
                  </Link>;
                })}
              </div>
            </div>;
          })}
        </nav>

        <div className="sidebar-foot"><div className="system-dot" /><div><strong>Local development</strong><span>PostgreSQL + Redis</span></div></div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><div className="page-eyebrow">{eyebrow || 'NFL / NCL · Connected ERP'}</div><h1>{title}</h1></div>
          <div className="top-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* 1. Global Interactive Job Search with Live Suggestions */}
            <div ref={searchContainerRef} style={{ position: 'relative' }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const clean = jobJumpNo.trim();
                  if (!clean) return;
                  if (searchHits.length > 0) {
                    window.location.href = `/jobs/${encodeURIComponent(searchHits[0].jobNo)}`;
                  } else {
                    window.location.href = `/jobs?q=${encodeURIComponent(clean)}`;
                  }
                  setShowSearchDropdown(false);
                }}
                style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '6px', padding: '3px 8px', border: '1px solid #cbd5e1' }}
              >
                <span style={{ fontSize: '13px', color: '#64748b', marginRight: '5px' }}>🔍</span>
                <input
                  value={jobJumpNo}
                  onChange={(e) => setJobJumpNo(e.target.value)}
                  onFocus={() => { if (searchHits.length > 0) setShowSearchDropdown(true); }}
                  placeholder="Jump to Job # (e.g. 22041, 48093)..."
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', width: '210px', fontWeight: 600, color: '#0f172a' }}
                />
                <button type="submit" style={{ border: 'none', background: '#2563eb', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', cursor: 'pointer' }}>GO</button>
              </form>

              {/* Live Search Results Dropdown */}
              {showSearchDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', width: '340px', background: '#ffffff', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', border: '1px solid #cbd5e1', zIndex: 1000, overflow: 'hidden' }}>
                  <div style={{ padding: '6px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Matching Jobs ({searchHits.length})</span>
                    <span>Press Enter for Top Result</span>
                  </div>
                  {searchHits.map((h: any) => (
                    <Link
                      key={h.id || h.jobNo}
                      href={`/jobs/${encodeURIComponent(h.jobNo)}`}
                      onClick={() => setShowSearchDropdown(false)}
                      style={{ display: 'block', padding: '8px 10px', borderBottom: '1px solid #f1f5f9', textDecoration: 'none', color: '#0f172a', transition: 'background 0.1s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '12.5px', color: '#1d4ed8' }}>{displayJobNo(h.jobNo, h.buyer)}</strong>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '1px 5px', borderRadius: '3px' }}>{h.buyer}</span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#334155', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Style: <strong>{h.styleNo}</strong> · {h.itemDescription || 'Garment'}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span>Qty: {Number(h.orderQty || 0).toLocaleString()} pcs</span>
                        <span>Merch: <strong style={{ color: '#0f172a' }}>{h.merchandiser || 'Md. Jahidul Islam'}</strong></span>
                      </div>
                    </Link>
                  ))}
                  {searchHits.length === 0 && (
                    <div style={{ padding: '12px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
                      No matching jobs found for &quot;{jobJumpNo}&quot;.
                    </div>
                  )}
                  <Link
                    href={`/jobs?q=${encodeURIComponent(jobJumpNo.trim())}`}
                    onClick={() => setShowSearchDropdown(false)}
                    style={{ display: 'block', padding: '8px', textAlign: 'center', background: '#f8fafc', fontSize: '11.5px', fontWeight: 800, color: '#2563eb', textDecoration: 'none' }}
                  >
                    View All Results in All Jobs Register →
                  </Link>
                </div>
              )}
            </div>

            <Link href="/jobs?tab=preproduction" className="btn btn-secondary" style={{ fontSize: '11.5px', padding: '5px 10px', textDecoration: 'none', fontWeight: 700 }}>⚡ Stage Control</Link>
            <Link href="/tasks" className="btn btn-secondary" style={{ fontSize: '11.5px', padding: '5px 10px', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><span>📋 Tasks</span></Link>

            {/* 2. User Persona Switcher */}
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="user-chip"
                style={{ border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                title="Click to Switch User / Persona"
              >
                <div className="avatar" style={{ background: user?.name?.includes('Imran') ? '#059669' : undefined }}>
                  {(user?.name || 'A').slice(0, 1).toUpperCase()}
                </div>
                <div className="user-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <strong style={{ fontSize: '12.5px' }}>{user?.name || 'NFL Pulse User'}</strong>
                    <span style={{ fontSize: '10px', color: '#2563eb' }}>▼</span>
                  </div>
                  <span style={{ fontSize: '10.5px' }}>
                    {user?.name?.includes('Imran') ? 'Merchandiser (ONLY Buyer)' : user?.roles?.join(', ') || 'Authorized user'}
                  </span>
                </div>
              </button>

              {showPersonaMenu && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '6px', width: '280px', background: '#ffffff', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', border: '1px solid #cbd5e1', zIndex: 1000, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', background: '#0f172a', color: '#fff', fontSize: '11.5px', fontWeight: 800 }}>
                    Switch Active Persona (রোল পরিবর্তন করুন)
                  </div>
                  <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                    {PERSONAS.map(p => {
                      const isCurrent = user?.id === p.id || (p.role === 'MERCHANDISER' && p.name.includes('Imran') && user?.name?.includes('Imran'));
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => switchActivePersona(p)}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '8px 12px',
                            background: isCurrent ? '#eff6ff' : '#ffffff',
                            border: 'none',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '12.5px', color: isCurrent ? '#1d4ed8' : '#0f172a' }}>{p.name}</strong>
                            {isCurrent && <span style={{ fontSize: '10px', background: '#2563eb', color: '#fff', padding: '1px 5px', borderRadius: '3px', fontWeight: 800 }}>ACTIVE</span>}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{p.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ padding: '6px 12px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                    <Link href="/login" style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>Go to Login Page</Link>
                    <button onClick={logout} style={{ border: 'none', background: 'none', color: '#dc2626', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>Sign Out</button>
                  </div>
                </div>
              )}
            </div>

            <button className="btn btn-secondary" onClick={logout} style={{ fontSize: '11.5px', padding: '5px 10px' }}>Sign Out</button>
          </div>
        </header>

        {/* Imran Role Banner Indicator */}
        {user?.name?.includes('Imran') && (
          <div style={{ background: '#ecfdf5', borderBottom: '1px solid #a7f3d0', padding: '6px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#065f46' }}>
            <div>
              <strong>👤 Logged in as: Md. Imran (Merchandiser)</strong> · Assigned Buyer: <strong>ONLY</strong> (61 Jobs).
              <span style={{ marginLeft: '8px', color: '#047857' }}>You have data entry authorization for Merchandising Area (Fabric Order Sheet, Trims BOM, T&A, Samples). Other areas are read-only.</span>
            </div>
            <Link href="/jobs?myJobs=true" style={{ color: '#047857', fontWeight: 800, textDecoration: 'underline' }}>
              View My 61 Jobs →
            </Link>
          </div>
        )}

        {children}
        <GlobalStickyScrollbar />
      </main>
    </div>
  );
}
