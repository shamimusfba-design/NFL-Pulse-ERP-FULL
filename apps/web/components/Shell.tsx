'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, useRef } from 'react';
import { MODULE_GROUPS, ModuleGroup, ModuleItem } from '../lib/modules';
import { api } from '../lib/api';
import { displayJobNo } from '../lib/display';
import GlobalStickyScrollbar from './GlobalStickyScrollbar';
import ApparelIcon from './ApparelIcon';

function getItemHref(item: { slug: string }): string {
  if (item.slug === 'management') return '/';
  if (item.slug === 'merchandising') return '/merchandising-bulk';
  if (item.slug === 'sample-merchandising') return '/merchandising-sample';
  if (item.slug === 'sample-room') return '/modules/sample-room';
  if (item.slug === 'floor-display') return '/floor-display';
  if (item.slug === 'quality') return '/quality';
  return `/modules/${item.slug}`;
}

function roleFilteredGroups(groups: ModuleGroup[], roles: string[]): ModuleGroup[] {
  if (!roles.length || roles.includes('ADMIN')) return groups;
  const allowed: Record<string, string[]> = {};
  const add = (group: string, slugs: string[]) => { allowed[group] = [...(allowed[group] || []), ...slugs]; };

  const hasRole = (targets: string[]) => roles.some(r => targets.includes(String(r).toUpperCase()));

  if (hasRole(['MERCH_BULK', 'MERCHANDISER', 'MERCH', 'MERCH_USER', 'MERCH_SAMPLE', 'MERCH_BOTH', 'MERCH_HEAD', 'HEAD_MERCHANDISER'])) {
    add('Sales & Merchandising', ['merchandising', 'sample-merchandising']);
    add('Trims & Accessories Store', ['trims']);
  }
  if (hasRole(['MERCH_HEAD', 'HEAD_MERCHANDISER'])) {
    add('Sample / CAD / Technical', ['sample-room', 'cad', 'technical']);
  }
  if (roles.includes('IE')) {
    add('Sales & Merchandising', ['merchandising']);
    add('Industrial & Production Engineering', ['kpi-board', 'ie-bulletin', 'ie-daily-target', 'ie-mis-import', 'ie-npt', 'ie-qco', 'ie-line-performance', 'ie-responsibility', 'ie-skill-matrix', 'ie-production-checkpoints', 'ie-reports']);
    add('Management', ['management']);
  }
  if (roles.includes('CAD')) add('Sample / CAD / Technical', ['cad', 'technical']);
  if (roles.includes('SAMPLE')) {
    add('Sales & Merchandising', ['sample-merchandising']);
    add('Sample / CAD / Technical', ['sample-room']);
  }
  if (hasRole(['PLANNING', 'PLANNING_HEAD'])) {
    add('Sales & Merchandising', ['merchandising']);
    add('Central Planning', ['ta', 'planning-approvals', 'capacity', 'sewing-planning', 'subcontract']);
    add('Management', ['management']);
  }
  if (roles.includes('MANAGEMENT')) {
    add('Management', ['management']);
    add('Central Planning', ['ta', 'planning-approvals', 'capacity', 'subcontract']);
    add('Garment Quality', ['quality', 'quality-history']);
    add('MIS & IT', ['reports', 'floor-display']);
  }
  if (roles.includes('QUALITY')) {
    add('Management', ['management']);
    add('Dyeing', ['dyeing']);
    add('Garment Quality', ['quality', 'quality-history']);
  }
  if (roles.includes('YARN_MANAGEMENT') || roles.includes('PROCUREMENT')) {
    add('Yarn Store & Knitting', ['yarn', 'yarn-store', 'knitting']);
  }
  if (roles.includes('YARN_STORE')) {
    add('Yarn Store & Knitting', ['yarn-store', 'yarn']);
  }
  if (roles.includes('KNITTING')) {
    add('Yarn Store & Knitting', ['knitting']);
  }
  if (roles.includes('GREIGE_STORE')) {
    add('Greige Fabric Store', ['greige-store']);
  }
  if (roles.includes('DYEING') || roles.includes('YARN_DYEING')) {
    add('Greige Fabric Store', ['greige-store']);
    add('Dyeing', ['dyeing', 'dyeing-machine-loading', 'fabric-finishing']);
  }
  if (roles.includes('FABRIC_FINISHING')) {
    add('Dyeing', ['fabric-finishing']);
    add('Finish Fabric Store', ['finished-fabric']);
  }
  if (roles.includes('FINISHED_FABRIC_STORE')) {
    add('Finish Fabric Store', ['finished-fabric']);
  }
  if (roles.includes('CUTTING')) add('Cutting & Input Management', ['cutting']);
  if (roles.includes('PRINTING')) add('Printing Operations', ['printing']);
  if (roles.includes('EMBROIDERY')) add('Embroidery Operations', ['embroidery']);
  if (roles.includes('SEWING')) {
    add('Sewing & Finishing', ['sewing', 'finishing']);
    add('Industrial & Production Engineering', ['ie-npt', 'ie-qco']);
  }
  if (roles.includes('FINISHING')) add('Sewing & Finishing', ['finishing']);
  if (roles.includes('TRIMS_STORE')) add('Trims & Accessories Store', ['trims']);
  if (roles.includes('SHIPMENT')) add('HR, Admin & Compliance', ['shipment']);
  if (roles.includes('MAINTENANCE')) add('MIS & IT', ['maintenance']);

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
  // Day / Night mode for every page (stored in the browser)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [pendingTasksCount, setPendingTasksCount] = useState<number>(0);

  useEffect(() => {
    let t: 'light' | 'dark' = 'light';
    try {
      t = localStorage.getItem('nos-theme') === 'dark' ? 'dark' : 'light';
    } catch {}
    setTheme(t);
    document.documentElement.dataset.theme = t;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'nos-theme') {
        const val = e.newValue === 'dark' ? 'dark' : 'light';
        setTheme(val);
        document.documentElement.dataset.theme = val;
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleTheme = () => {
    const t = theme === 'dark' ? 'light' : 'dark';
    setTheme(t);
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem('nos-theme', t);
    } catch {}
  };

  const [jobJumpNo, setJobJumpNo] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [personaOpen, setPersonaOpen] = useState(false);
  const [activePersonaId, setActivePersonaId] = useState('user-head');
  const personaRef = useRef<HTMLDivElement>(null);

  // Global search suggestions state
  const [searchHits, setSearchHits] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nos-active-persona-id');
      if (saved) setActivePersonaId(saved);
    } catch {}
  }, []);

  const switchPersona = (pId: string) => {
    const p = PERSONAS.find(x => x.id === pId);
    if (!p) return;
    setActivePersonaId(pId);
    try {
      localStorage.setItem('nos-active-persona-id', pId);
      localStorage.setItem('nos-active-merchandiser-id', pId);
      localStorage.setItem('nos-active-buyer-scope', p.assignedBuyer);
      localStorage.setItem('nos-user-role', p.role);
    } catch {}
    setPersonaOpen(false);
    window.location.reload();
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (personaRef.current && !personaRef.current.contains(e.target as Node)) {
        setPersonaOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch pending tasks count
  useEffect(() => {
    api('/tasks/my')
      .then((data: any) => {
        if (Array.isArray(data)) {
          const pending = data.filter((t: any) => t.status === 'PENDING' || !t.status).length;
          setPendingTasksCount(pending);
        }
      })
      .catch(() => {});
  }, [pathname]);

  // Live debounce search
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

  useEffect(() => {
    api('/auth/me').then((data: any) => {
      if (data?.user) {
        setUser(data.user);
      } else {
        const storedRole = typeof window !== 'undefined' ? (localStorage.getItem('nos-user-role') || 'ADMIN') : 'ADMIN';
        setUser({ id: 'u1', name: 'NFL Pulse Admin', email: 'admin@nflpulse.com', roles: [storedRole] });
      }
    }).catch(() => {
      const storedRole = typeof window !== 'undefined' ? (localStorage.getItem('nos-user-role') || 'ADMIN') : 'ADMIN';
      setUser({ id: 'u1', name: 'NFL Pulse Admin', email: 'admin@nflpulse.com', roles: [storedRole] });
    });
  }, []);

  const roles = user?.roles || [];
  const groups = useMemo(() => {
    const filtered = roleFilteredGroups(MODULE_GROUPS, roles);
    if (!query.trim()) return filtered;
    const q = query.toLowerCase().trim();
    return filtered.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.name.toLowerCase().includes(q) ||
        item.short.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      )
    })).filter((group) => group.items.length > 0);
  }, [roles, query]);

  const active = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  useEffect(() => {
    MODULE_GROUPS.forEach((group) => {
      const match = group.items.some((item) => active(getItemHref(item)));
      if (match || active(`/modules/${group.overviewSlug}`)) {
        setOpenGroups((prev) => ({ ...prev, [group.label]: true }));
      }
    });
  }, [pathname]);

  const activePersona = PERSONAS.find(p => p.id === activePersonaId) || PERSONAS[1];

  return (
    <div className="shell">
      <GlobalStickyScrollbar />
      <aside className="sidebar">
        <div className="brand-wrap">
          <img className="brand-logo" src="/branding/northern-fashions-logo.jpg" alt="Northern Fashions Limited" />
          <div>
            <div className="brand">Northern Fashions Limited</div>
            <div className="brand-sub">NFL Pulse ERP · Operations Control</div>
          </div>
        </div>

        <div className="sidebar-search">
          <span>🔍</span>
          <input
            placeholder="Find module..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Find module"
          />
        </div>

        <nav className="nav">
          {!query && (
            <>
              <Link className={active('/') ? 'nav-link active' : 'nav-link'} href="/">
                <span className="nav-icon"><ApparelIcon name="factory" size={16} /></span>
                <span>Executive KPI Board</span>
              </Link>
              <Link className={active('/tasks') ? 'nav-link active' : 'nav-link'} href="/tasks">
                <span className="nav-icon"><ApparelIcon name="tasks" size={16} /></span>
                <span style={{ flex: 1 }}>My Pending Tasks</span>
                {pendingTasksCount > 0 && (
                  <span style={{ background: '#dc2626', color: '#fff', fontSize: '10.5px', fontWeight: 800, padding: '1px 7px', borderRadius: '10px' }}>
                    {pendingTasksCount}
                  </span>
                )}
              </Link>
              <Link className={active('/jobs') ? 'nav-link active' : 'nav-link'} href="/jobs">
                <span className="nav-icon"><ApparelIcon name="jobs" size={16} /></span>
                <span>All Jobs &amp; Stages</span>
              </Link>
            </>
          )}

          {groups.map((group) => {
            // Standalone single-item process departments render directly as 1-click main menu links
            if (group.items.length === 1 && !query) {
              const item = group.items[0];
              const href = getItemHref(item);
              const isItemActive = active(href) || active(`/modules/${group.overviewSlug}`);
              return (
                <div key={group.label} className="nav-single-item" style={{ margin: '1px 0' }}>
                  <Link
                    className={isItemActive ? 'nav-link active' : 'nav-link'}
                    href={href}
                    title={item.description}
                  >
                    <span className="nav-icon"><ApparelIcon name={item.icon || item.slug} size={16} /></span>
                    <span className="nav-text" style={{ fontWeight: 600 }}>{item.name}</span>
                  </Link>
                </div>
              );
            }

            const isOpen = query.length > 0 || !!openGroups[group.label];
            const overviewHref = `/modules/${group.overviewSlug}`;
            const hasActive = active(overviewHref) || group.items.some((item) => active(getItemHref(item)));

            return (
              <div className={`nav-group ${isOpen ? 'open' : ''}`} key={group.label}>
                <div className={`nav-group-toggle ${hasActive ? 'has-active' : ''}`}>
                  <Link
                    className="nav-group-overview"
                    href={overviewHref}
                    title={`${group.label} overview`}
                    onClick={() => setOpenGroups((prev) => ({ ...prev, [group.label]: true }))}
                  >
                    <span className="nav-group-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                      <ApparelIcon name={group.icon || group.overviewSlug} size={15} />
                      <span>{group.label}</span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    className="nav-group-chevron-btn"
                    onClick={() => toggleGroup(group.label)}
                    aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${group.label}`}
                    aria-expanded={isOpen}
                  >
                    <span className={`nav-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true">⌄</span>
                  </button>
                </div>
                <div className={`nav-group-items ${isOpen ? 'open' : ''}`}>
                  {group.items.map((item) => {
                    const href = getItemHref(item);
                    return (
                      <Link
                        className={active(href) ? 'nav-link active' : 'nav-link'}
                        href={href}
                        key={item.slug}
                        title={item.description}
                      >
                        <span className="nav-icon">
                          <ApparelIcon name={item.icon || item.slug} size={15} />
                        </span>
                        <span className="nav-text">
                          {item.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="system-dot" />
          <div>
            <strong>Local development</strong>
            <span>PostgreSQL + Redis</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="page-eyebrow">{eyebrow || 'NFL / NCL · Connected ERP'}</div>
            <h1>{title}</h1>
          </div>
          <div className="top-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Global Day / Night Mode Switch */}
            <div className="theme-switch" role="group" aria-label="Day or night mode">
              <button
                type="button"
                className={theme === 'light' ? 'on' : ''}
                onClick={() => theme !== 'light' && toggleTheme()}
                title="Switch to Day mode"
              >
                ☀ Day
              </button>
              <button
                type="button"
                className={theme === 'dark' ? 'on' : ''}
                onClick={() => theme !== 'dark' && toggleTheme()}
                title="Switch to Night mode"
              >
                ☾ Night
              </button>
            </div>

            {/* Global Interactive Job Search with Live Suggestions */}
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
                style={{ display: 'flex', alignItems: 'center', background: 'var(--card, #f1f5f9)', borderRadius: '6px', padding: '3px 8px', border: '1px solid var(--border, #cbd5e1)' }}
              >
                <span style={{ fontSize: '13px', color: '#64748b', marginRight: '5px' }}>🔍</span>
                <input
                  value={jobJumpNo}
                  onChange={(e) => setJobJumpNo(e.target.value)}
                  onFocus={() => { if (searchHits.length > 0) setShowSearchDropdown(true); }}
                  placeholder="Jump to Job # (e.g. 22041, 48093)..."
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', width: '200px', fontWeight: 600, color: 'inherit' }}
                />
                <button type="submit" style={{ border: 'none', background: '#2563eb', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', cursor: 'pointer' }}>GO</button>
              </form>

              {/* Live Search Results Dropdown */}
              {showSearchDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '5px',
                  width: '320px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  zIndex: 100,
                  overflow: 'hidden'
                }}>
                  <div style={{ padding: '6px 10px', background: '#1e293b', borderBottom: '1px solid #334155', fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Matching Jobs ({searchHits.length})</span>
                    <span>Enter to Go</span>
                  </div>
                  {searchHits.map((h: any) => (
                    <Link
                      key={h.id || h.jobNo}
                      href={`/jobs/${encodeURIComponent(h.jobNo)}`}
                      onClick={() => setShowSearchDropdown(false)}
                      style={{
                        display: 'block',
                        padding: '8px 10px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        textDecoration: 'none',
                        color: '#fff',
                        transition: 'background 0.1s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '12px', color: '#60a5fa' }}>{displayJobNo(h.jobNo, h.buyer)}</strong>
                        <span style={{ fontSize: '10px', background: 'rgba(59,130,246,0.2)', color: '#93c5fd', padding: '1px 5px', borderRadius: '3px' }}>{h.buyer}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Style: {h.styleNo || '—'}</span>
                        <span style={{ color: '#94a3b8' }}>Order: {Number(h.orderQty || 0).toLocaleString()} pcs</span>
                      </div>
                    </Link>
                  ))}
                  {searchHits.length === 0 && (
                    <div style={{ padding: '10px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
                      No jobs matching &quot;{jobJumpNo}&quot;
                    </div>
                  )}
                  <Link
                    href={`/jobs?q=${encodeURIComponent(jobJumpNo.trim())}`}
                    onClick={() => setShowSearchDropdown(false)}
                    style={{
                      display: 'block',
                      padding: '7px',
                      textAlign: 'center',
                      background: '#1e293b',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#38bdf8',
                      textDecoration: 'none'
                    }}
                  >
                    View All Results in All Jobs →
                  </Link>
                </div>
              )}
            </div>

            <Link href="/jobs" className="btn btn-secondary">⚡ Stage Control</Link>
            <Link href="/tasks" className="btn btn-secondary">
              📋 Tasks
              {pendingTasksCount > 0 && (
                <span style={{ background: '#dc2626', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '1px 5px', borderRadius: '8px', marginLeft: '5px' }}>
                  {pendingTasksCount}
                </span>
              )}
            </Link>

            {/* Persona Switcher Dropdown */}
            <div ref={personaRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="user-badge"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: '1px solid var(--border, #cbd5e1)',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  cursor: 'pointer'
                }}
                onClick={() => setPersonaOpen(!personaOpen)}
                title="Switch factory persona / role scope"
              >
                <div className="user-avatar" style={{ background: '#2563eb', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 700 }}>
                  {activePersona.name[0]}
                </div>
                <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
                  <div style={{ fontSize: '11px', fontWeight: 700 }}>{activePersona.name} ▾</div>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>{activePersona.role}</div>
                </div>
              </button>

              {personaOpen && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  width: '280px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  zIndex: 50,
                  padding: '6px 0',
                  color: '#fff'
                }}>
                  <div style={{ padding: '6px 12px', borderBottom: '1px solid #1e293b', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>
                    Switch Factory Persona
                  </div>
                  {PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => switchPersona(p.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        background: p.id === activePersonaId ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)'
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700 }}>{p.tag}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{p.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: '11px' }}
              onClick={async () => {
                await api('/auth/logout').catch(() => {});
                window.location.href = '/login';
              }}
            >
              Sign Out
            </button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
