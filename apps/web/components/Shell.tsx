'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, useRef } from 'react';
import { api } from '../lib/api';
import { displayJobNo } from '../lib/display';
import GlobalStickyScrollbar from './GlobalStickyScrollbar';

interface SidebarItem {
  id: string;
  name: string;
  href: string;
  badge?: string | number;
  badgeType?: 'primary' | 'danger';
  requiresManagement?: boolean;
  matchPrefixes?: string[];
}

interface NavSubItem {
  name: string;
  href: string;
}

interface DepartmentNavConfig {
  deptId: string;
  deptName: string;
  matchPrefixes: string[];
  subItems: NavSubItem[];
}

// Exactly the 4 Main Navigation items
const MAIN_NAVIGATION_ITEMS: SidebarItem[] = [
  { id: 'management', name: 'Management Dashboard', href: '/management', requiresManagement: true },
  { id: 'executive', name: 'Executive Dashboard', href: '/' },
  { id: 'job360', name: 'Job 360', href: '/jobs', badge: '2,000', badgeType: 'primary' },
  { id: 'tasks', name: 'My Pending Work', href: '/tasks' },
];

// Exactly the 18 Department Navigation items in exact requested order
const DEPARTMENT_NAVIGATION_ITEMS: SidebarItem[] = [
  { id: 'merchandising', name: 'Sales & Merchandising', href: '/merchandising-bulk', matchPrefixes: ['/merchandising-bulk', '/merchandising-sample', '/modules/merchandising-overview', '/modules/merchandising', '/merchandising'] },
  { id: 'sample-room', name: 'Sample Room', href: '/modules/sample-room', matchPrefixes: ['/modules/sample-room'] },
  { id: 'trims', name: 'Trims & Accessories Store', href: '/modules/trims', matchPrefixes: ['/modules/trims'] },
  { id: 'central-planning', name: 'Central Planning', href: '/modules/central-planning', matchPrefixes: ['/modules/central-planning', '/modules/ta', '/modules/planning-approvals', '/modules/capacity', '/modules/sewing-planning', '/modules/subcontract'] },
  { id: 'yarn-knitting', name: 'Yarn Store & Knitting', href: '/modules/yarn-knitting', matchPrefixes: ['/modules/yarn-knitting', '/modules/yarn', '/modules/yarn-store', '/modules/knitting'] },
  { id: 'greige-store', name: 'Greige Fabric Store', href: '/modules/greige-store', matchPrefixes: ['/modules/greige-store'] },
  { id: 'dyeing', name: 'Dyeing', href: '/modules/dyeing', matchPrefixes: ['/modules/dyeing', '/modules/dyeing-machine-loading', '/modules/fabric-finishing'] },
  { id: 'finished-fabric', name: 'Finished Fabric Store', href: '/modules/finished-fabric', matchPrefixes: ['/modules/finished-fabric'] },
  { id: 'cad', name: 'CAD', href: '/modules/cad', matchPrefixes: ['/modules/cad'] },
  { id: 'technical', name: 'Technical', href: '/modules/technical', matchPrefixes: ['/modules/technical'] },
  { id: 'cutting', name: 'Cutting & Input Management', href: '/modules/cutting', matchPrefixes: ['/modules/cutting'] },
  { id: 'printing', name: 'Printing', href: '/modules/printing', matchPrefixes: ['/modules/printing'] },
  { id: 'embroidery', name: 'Embroidery', href: '/modules/embroidery', matchPrefixes: ['/modules/embroidery'] },
  { id: 'sewing', name: 'Sewing & Finishing', href: '/modules/sewing', matchPrefixes: ['/modules/sewing', '/modules/finishing'] },
  { id: 'quality', name: 'Garments Quality', href: '/quality', matchPrefixes: ['/quality', '/modules/garment-quality', '/modules/quality-history'] },
  { id: 'ie', name: 'Industrial & Production Engineering', href: '/modules/ie-overview', matchPrefixes: ['/modules/ie-overview', '/modules/kpi-board', '/modules/ie-bulletin', '/modules/ie-daily-target', '/modules/ie-mis-import', '/modules/ie-npt', '/modules/ie-qco', '/modules/ie-line-performance', '/modules/ie-responsibility', '/modules/ie-skill-matrix', '/modules/ie-production-checkpoints', '/modules/ie-reports'] },
  { id: 'mis-it', name: 'MIS & IT', href: '/modules/mis-it', matchPrefixes: ['/modules/mis-it', '/floor-display', '/modules/reports', '/modules/data-import', '/modules/maintenance'] },
  { id: 'hr-compliance', name: 'HR Admin & Compliance', href: '/modules/hr-admin-compliance', matchPrefixes: ['/modules/hr-admin-compliance', '/modules/administration', '/modules/masters', '/modules/shipment'] },
];

// Global Department Top Sub-Navigation configuration
const DEPARTMENT_TOP_NAVS: DepartmentNavConfig[] = [
  {
    deptId: 'merchandising',
    deptName: 'Sales & Merchandising',
    matchPrefixes: ['/merchandising-bulk', '/merchandising-sample', '/modules/merchandising-overview', '/modules/merchandising', '/merchandising'],
    subItems: [
      { name: 'Dashboard', href: '/modules/merchandising-overview' },
      { name: 'Bulk Merchandising', href: '/merchandising-bulk' },
      { name: 'Sample Merchandising', href: '/merchandising-sample' },
    ]
  },
  {
    deptId: 'central-planning',
    deptName: 'Central Planning',
    matchPrefixes: ['/modules/central-planning', '/modules/ta', '/modules/planning-approvals', '/modules/capacity', '/modules/sewing-planning', '/modules/subcontract'],
    subItems: [
      { name: 'Overview', href: '/modules/central-planning' },
      { name: 'Time & Action', href: '/modules/ta' },
      { name: 'Approvals & Release', href: '/modules/planning-approvals' },
      { name: 'Capacity & Calendar', href: '/modules/capacity' },
      { name: 'Sewing Line Gantt', href: '/modules/sewing-planning' },
      { name: 'Subcontract Follow-up', href: '/modules/subcontract' },
    ]
  },
  {
    deptId: 'yarn-knitting',
    deptName: 'Yarn Store & Knitting',
    matchPrefixes: ['/modules/yarn-knitting', '/modules/yarn', '/modules/yarn-store', '/modules/knitting'],
    subItems: [
      { name: 'Overview', href: '/modules/yarn-knitting' },
      { name: 'Yarn Purchasing', href: '/modules/yarn' },
      { name: 'Yarn Store & Inventory', href: '/modules/yarn-store' },
      { name: 'Knitting Operations', href: '/modules/knitting' },
    ]
  },
  {
    deptId: 'dyeing',
    deptName: 'Dyeing',
    matchPrefixes: ['/modules/dyeing', '/modules/dyeing-machine-loading', '/modules/fabric-finishing'],
    subItems: [
      { name: 'Dyeing Planning', href: '/modules/dyeing' },
      { name: 'Machine Loading Plan', href: '/modules/dyeing-machine-loading' },
      { name: 'Finish Fabric Plan', href: '/modules/fabric-finishing' },
    ]
  },
  {
    deptId: 'sewing',
    deptName: 'Sewing & Finishing',
    matchPrefixes: ['/modules/sewing', '/modules/finishing'],
    subItems: [
      { name: 'Sewing Operations', href: '/modules/sewing' },
      { name: 'Finishing & Packing', href: '/modules/finishing' },
    ]
  },
  {
    deptId: 'quality',
    deptName: 'Garments Quality',
    matchPrefixes: ['/quality', '/modules/garment-quality', '/modules/quality-history'],
    subItems: [
      { name: 'Quality Management & DHU', href: '/quality' },
      { name: 'Job Quality History', href: '/modules/quality-history' },
    ]
  },
  {
    deptId: 'ie',
    deptName: 'Industrial & Production Engineering',
    matchPrefixes: [
      '/modules/ie-overview', '/modules/kpi-board', '/modules/ie-bulletin',
      '/modules/ie-daily-target', '/modules/ie-mis-import', '/modules/ie-npt',
      '/modules/ie-qco', '/modules/ie-line-performance', '/modules/ie-responsibility',
      '/modules/ie-skill-matrix', '/modules/ie-production-checkpoints', '/modules/ie-reports'
    ],
    subItems: [
      { name: 'Overview', href: '/modules/ie-overview' },
      { name: 'KPI Board', href: '/modules/kpi-board' },
      { name: 'IE Bulletin', href: '/modules/ie-bulletin' },
      { name: 'Daily Targets', href: '/modules/ie-daily-target' },
      { name: 'Daily MIS Import', href: '/modules/ie-mis-import' },
      { name: 'NPT Loss', href: '/modules/ie-npt' },
      { name: 'QCO', href: '/modules/ie-qco' },
      { name: 'Line Performance', href: '/modules/ie-line-performance' },
      { name: 'Responsibility', href: '/modules/ie-responsibility' },
      { name: 'Skill Matrix', href: '/modules/ie-skill-matrix' },
      { name: 'Checkpoints', href: '/modules/ie-production-checkpoints' },
      { name: 'IE Reports', href: '/modules/ie-reports' },
    ]
  },
  {
    deptId: 'mis-it',
    deptName: 'MIS & IT',
    matchPrefixes: ['/modules/mis-it', '/floor-display', '/modules/reports', '/modules/data-import', '/modules/maintenance'],
    subItems: [
      { name: 'Overview', href: '/modules/mis-it' },
      { name: 'Floor TV Live Display', href: '/floor-display' },
      { name: 'Reports & Analytics', href: '/modules/reports' },
      { name: 'Excel Import', href: '/modules/data-import' },
      { name: 'Machine Engineering', href: '/modules/maintenance' },
    ]
  },
  {
    deptId: 'hr-compliance',
    deptName: 'HR Admin & Compliance',
    matchPrefixes: ['/modules/hr-admin-compliance', '/modules/administration', '/modules/masters', '/modules/shipment'],
    subItems: [
      { name: 'Overview', href: '/modules/hr-admin-compliance' },
      { name: 'Users & Permissions', href: '/modules/administration' },
      { name: 'Masters & Config', href: '/modules/masters' },
      { name: 'Shipment & Commercial', href: '/modules/shipment' },
    ]
  }
];

const PERSONAS = [
  { id: 'user-director', name: 'Managing Director / Factory Owner', role: 'DIRECTOR', assignedBuyer: 'ALL', tag: '👑 Managing Director / Owner', desc: 'Full Management Dashboard, plant governance & audit' },
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
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [pendingTasksCount, setPendingTasksCount] = useState<number>(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Day / Night mode
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

  // Sidebar Collapse Persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nos-sidebar-collapsed');
      if (saved === '1') setSidebarCollapsed(true);
    } catch {}
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('nos-sidebar-collapsed', next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  const [jobJumpNo, setJobJumpNo] = useState('');
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
  const activePersona = PERSONAS.find(p => p.id === activePersonaId) || PERSONAS[0];
  const isManagementUser = useMemo(() => {
    const rList = [...(roles || []).map((r: any) => String(r).toUpperCase()), String(user?.role || '').toUpperCase(), String(activePersona?.role || '').toUpperCase()];
    return rList.some(r => ['DIRECTOR', 'OWNER', 'MANAGEMENT_HEAD', 'MANAGEMENT', 'ADMIN'].includes(r));
  }, [roles, user, activePersona]);

  // Active link detection
  const isItemActive = (item: SidebarItem) => {
    if (item.href === '/') return pathname === '/';
    if (pathname === item.href) return true;
    if (item.matchPrefixes) {
      return item.matchPrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
    }
    return pathname.startsWith(`${item.href}/`);
  };

  // Find active department top nav configuration
  const activeTopNavConfig = useMemo(() => {
    return DEPARTMENT_TOP_NAVS.find(cfg => {
      return cfg.matchPrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
    }) || null;
  }, [pathname]);

  // Filter department items based on query
  const filteredDepartments = useMemo(() => {
    if (!query.trim()) return DEPARTMENT_NAVIGATION_ITEMS;
    const q = query.toLowerCase().trim();
    return DEPARTMENT_NAVIGATION_ITEMS.filter(item =>
      item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className={`shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <GlobalStickyScrollbar />

      {/* Persistent Enterprise Sidebar */}
      <aside className="sidebar">
        {/* Sidebar Header with Company Name & Hamburger */}
        <div className="brand-wrap">
          <img
            className="brand-logo"
            src="/branding/northern-fashions-logo.jpg"
            alt="Northern Fashions Limited"
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="brand" title="Northern Fashion Limited">Northern Fashion Limited</div>
            <div className="brand-sub">NFL Pulse ERP · Operations Control</div>
          </div>
          <button
            type="button"
            className="sidebar-hamburger-btn"
            onClick={toggleSidebar}
            title="Collapse Sidebar"
            aria-label="Collapse Sidebar"
          >
            ☰
          </button>
        </div>

        {/* Module Quick Find */}
        <div className="sidebar-search">
          <span>🔍</span>
          <input
            placeholder="Find department..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Find department"
          />
        </div>

        {/* Text-Only Enterprise Menu */}
        <nav className="nav text-only-nav">
          {!query && (
            <div className="nav-section-block">
              <div className="nav-section-title">Main Navigation</div>
              {MAIN_NAVIGATION_ITEMS.map((item) => {
                if (item.requiresManagement && !isManagementUser) return null;
                const activeClass = isItemActive(item) ? 'nav-link text-nav-link active' : 'nav-link text-nav-link';
                return (
                  <Link
                    key={item.id}
                    className={activeClass}
                    href={item.href}
                    title={item.name}
                  >
                    <span className="nav-label">{item.name}</span>
                    {item.id === 'job360' && item.badge && (
                      <span className="nav-badge-pill primary">{item.badge}</span>
                    )}
                    {item.id === 'tasks' && pendingTasksCount > 0 && (
                      <span className="nav-badge-pill danger">{pendingTasksCount}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          <div className="nav-section-block" style={{ marginTop: query ? 0 : '10px' }}>
            {!query && <div className="nav-section-title">Department Navigation</div>}
            {filteredDepartments.map((item) => {
              const activeClass = isItemActive(item) ? 'nav-link text-nav-link active' : 'nav-link text-nav-link';
              return (
                <Link
                  key={item.id}
                  className={activeClass}
                  href={item.href}
                  title={item.name}
                >
                  <span className="nav-label">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-foot">
          <span className="system-dot" />
          <div>
            <strong>Northern Fashions Live</strong>
            <span>Active Plant System</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main">
        {/* Standardized Global Top Header */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            {/* Hamburger toggle button (visible when sidebar is collapsed or on smaller screens) */}
            <button
              type="button"
              className="topbar-hamburger-btn"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label="Toggle Sidebar"
            >
              ☰
            </button>

            <div>
              {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
              <h1>{title}</h1>
            </div>
          </div>

          <div className="top-actions">
            {/* Theme Day / Night Toggle */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={toggleTheme}
              title="Toggle Day / Night mode"
              style={{ padding: '6px 10px', fontSize: '13px' }}
            >
              {theme === 'dark' ? '☀️ Day' : '🌙 Night'}
            </button>

            {/* Global Jump To Job Search Box */}
            <div ref={searchContainerRef} style={{ position: 'relative' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border, #cbd5e1)',
                borderRadius: '8px',
                padding: '2px 8px',
                height: '36px'
              }}>
                <span style={{ fontSize: '12px', color: '#64748b', marginRight: '6px' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Jump to Job # (e.g. 22041, 48093)"
                  value={jobJumpNo}
                  onChange={(e) => setJobJumpNo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && jobJumpNo.trim()) {
                      window.location.href = `/jobs?q=${encodeURIComponent(jobJumpNo.trim())}`;
                    }
                  }}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '12px',
                    width: '185px',
                    color: 'inherit'
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (jobJumpNo.trim()) {
                      window.location.href = `/jobs?q=${encodeURIComponent(jobJumpNo.trim())}`;
                    }
                  }}
                  style={{
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  GO
                </button>
              </div>

              {/* Autocomplete suggestions dropdown */}
              {showSearchDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '105%',
                  left: 0,
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

        {/* Standardized Global Department Top Sub-Navigation Bar */}
        {activeTopNavConfig && (
          <nav className="global-dept-subnav" aria-label={`${activeTopNavConfig.deptName} sub-navigation`}>
            {activeTopNavConfig.subItems.map((sub) => {
              const isActiveSub = pathname === sub.href;
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className={`dept-subnav-btn ${isActiveSub ? 'active' : ''}`}
                >
                  {sub.name}
                </Link>
              );
            })}
          </nav>
        )}

        {children}
      </main>
    </div>
  );
}
