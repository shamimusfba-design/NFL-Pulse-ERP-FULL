'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, useRef } from 'react';
import { api } from '../lib/api';
import { displayJobNo } from '../lib/display';
import { applyUserSettingsToDocument, loadUserSettings } from '../lib/settings';
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

// Main Navigation items
const MAIN_NAVIGATION_ITEMS: SidebarItem[] = [
  { id: 'management', name: 'Management Dashboard', href: '/management', requiresManagement: true },
  { id: 'executive', name: 'Executive Dashboard', href: '/' },
  { id: 'job360', name: 'Job 360', href: '/jobs' },
  { id: 'tasks', name: 'My Pending Work', href: '/my-pending-work', matchPrefixes: ['/my-pending-work', '/tasks'] },
  { id: 'settings', name: 'Settings', href: '/settings', matchPrefixes: ['/settings'] },
];

// Exactly the 18 Department Navigation items in exact requested order
const DEPARTMENT_NAVIGATION_ITEMS: SidebarItem[] = [
  { id: 'merchandising', name: 'Sales & Merchandising', href: '/merchandising-bulk', matchPrefixes: ['/merchandising-bulk', '/merchandising-sample', '/modules/merchandising-overview', '/modules/merchandising', '/merchandising'] },
  { id: 'sample-room', name: 'Sample Room', href: '/modules/sample-room', matchPrefixes: ['/modules/sample-room'] },
  { id: 'trims', name: 'Trims & Accessories Store', href: '/modules/trims', matchPrefixes: ['/modules/trims'] },
  { id: 'central-planning', name: 'Central Planning', href: '/modules/planning-approvals', matchPrefixes: ['/modules/central-planning', '/modules/ta', '/modules/planning-approvals', '/modules/capacity', '/modules/sewing-planning', '/modules/subcontract'] },
  { id: 'yarn-knitting', name: 'Yarn Store & Knitting', href: '/modules/yarn-knitting', matchPrefixes: ['/modules/yarn-knitting', '/modules/yarn', '/modules/yarn-store', '/modules/knitting'] },
  { id: 'greige-store', name: 'Greige Fabric Store', href: '/modules/greige-store', matchPrefixes: ['/modules/greige-store'] },
  { id: 'dyeing-lab', name: 'Dyeing Lab', href: '/modules/dyeing-lab', matchPrefixes: ['/modules/dyeing-lab'] },
  { id: 'dyeing', name: 'Dyeing', href: '/modules/dyeing', matchPrefixes: ['/modules/dyeing', '/modules/dyeing-machine-loading', '/modules/fabric-finishing'] },
  { id: 'testing-lab', name: 'Testing Lab', href: '/modules/testing-lab', matchPrefixes: ['/modules/testing-lab'] },
  { id: 'fabric-quality', name: 'Fabric Quality', href: '/modules/fabric-quality', matchPrefixes: ['/modules/fabric-quality'] },
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
  { id: 'admin-access', name: 'Admin Access Control', href: '/modules/admin-access', matchPrefixes: ['/modules/admin-access'] },
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
    deptId: 'trims',
    deptName: 'Trims & Accessories Store',
    matchPrefixes: ['/modules/trims'],
    subItems: []
  },
  {
    deptId: 'central-planning',
    deptName: 'Central Planning',
    matchPrefixes: ['/modules/central-planning', '/modules/ta', '/modules/planning-approvals', '/modules/capacity', '/modules/sewing-planning', '/modules/subcontract'],
    subItems: [
      { name: '1. Approval and Release', href: '/modules/planning-approvals' },
      { name: '2. TNA Plan', href: '/modules/ta' },
      { name: '3. Capacity Plan', href: '/modules/capacity' },
      { name: '4. Sewing Line Gantt Chart', href: '/modules/sewing-planning' },
      { name: '5. Subcontract Follow-up', href: '/modules/subcontract' },
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
    deptId: 'dyeing-lab',
    deptName: 'Dyeing Lab',
    matchPrefixes: ['/modules/dyeing-lab'],
    subItems: []
  },
  {
    deptId: 'dyeing',
    deptName: 'Dyeing',
    matchPrefixes: ['/modules/dyeing', '/modules/dyeing-machine-loading', '/modules/fabric-finishing'],
    subItems: []
  },
  {
    deptId: 'testing-lab',
    deptName: 'Testing Lab',
    matchPrefixes: ['/modules/testing-lab'],
    subItems: []
  },
  {
    deptId: 'fabric-quality',
    deptName: 'Fabric Quality',
    matchPrefixes: ['/modules/fabric-quality'],
    subItems: []
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
    subItems: []
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
    subItems: []
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
    deptId: 'admin-access',
    deptName: 'Admin Access Control',
    matchPrefixes: ['/modules/admin-access'],
    subItems: [
      { name: 'Access Overview', href: '/modules/admin-access' },
      { name: 'Role & User Permissions', href: '/modules/admin-access' },
      { name: 'Audit Logs', href: '/modules/admin-access' },
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
  // Phone (≤760px): the sidebar is hidden; ☰ opens it as a slide-in drawer instead of collapsing it
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches;

  // Day / Night mode & personal appearance settings
  const syncThemeToFrames = (t: 'light' | 'dark') => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = t;
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.querySelectorAll('iframe').forEach((frame) => {
      try {
        frame.contentWindow?.postMessage({ type: 'nos-theme', theme: t }, '*');
        const doc = frame.contentDocument;
        if (doc?.documentElement) {
          doc.documentElement.dataset.theme = t;
          doc.documentElement.classList.toggle('dark', t === 'dark');
          doc.body?.classList.toggle('night', t === 'dark');
          doc.body?.classList.toggle('dark', t === 'dark');
        }
      } catch {}
    });
  };

  useEffect(() => {
    let t: 'light' | 'dark' = 'light';
    try {
      t = localStorage.getItem('nos-theme') === 'dark' ? 'dark' : 'light';
      const usrSettings = loadUserSettings();
      applyUserSettingsToDocument({ ...usrSettings, theme: t });
    } catch {}
    setTheme(t);
    syncThemeToFrames(t);
    const timer = setTimeout(() => syncThemeToFrames(t), 600);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'nos-theme') {
        const val = e.newValue === 'dark' ? 'dark' : 'light';
        setTheme(val);
        syncThemeToFrames(val);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', handleStorage);
    };
  }, [pathname]);

  const toggleTheme = () => {
    const t = theme === 'dark' ? 'light' : 'dark';
    setTheme(t);
    syncThemeToFrames(t);
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

  useEffect(() => { setMobileNavOpen(false); }, [pathname]);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileNavOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  const toggleSidebar = () => {
    if (isPhone()) { setMobileNavOpen(o => !o); return; }
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

  // Favorites & Recent pages (Task 3f)
  const [favorites, setFavorites] = useState<{ href: string; name: string }[]>([]);
  const [recentPages, setRecentPages] = useState<{ href: string; name: string }[]>([]);

  const allKnownPages = useMemo(() => {
    const map = new Map<string, string>();
    MAIN_NAVIGATION_ITEMS.forEach((i) => map.set(i.href, i.name));
    DEPARTMENT_NAVIGATION_ITEMS.forEach((i) => map.set(i.href, i.name));
    DEPARTMENT_TOP_NAVS.forEach((d) => d.subItems.forEach((s) => map.set(s.href, s.name)));
    return map;
  }, []);

  useEffect(() => {
    try {
      const favRaw = localStorage.getItem('nos-favorites-v1');
      if (favRaw) setFavorites(JSON.parse(favRaw));
      else {
        const seed = [
          { href: '/modules/dyeing', name: 'Dyeing' },
          { href: '/modules/finished-fabric', name: 'Finished Fabric Store' },
        ];
        setFavorites(seed);
      }
      const recRaw = localStorage.getItem('nos-recent-v1');
      const prevRec: { href: string; name: string }[] = recRaw ? JSON.parse(recRaw) : [];
      const pageLabel = allKnownPages.get(pathname) || title;
      if (pathname && pathname !== '/login') {
        const updatedRec = [
          { href: pathname, name: pageLabel },
          ...prevRec.filter((r) => r.href !== pathname),
        ].slice(0, 4);
        setRecentPages(updatedRec);
        localStorage.setItem('nos-recent-v1', JSON.stringify(updatedRec));
      } else {
        setRecentPages(prevRec.slice(0, 4));
      }
    } catch {}
  }, [pathname, title, allKnownPages]);

  const isCurrentFavorite = useMemo(
    () => favorites.some((f) => f.href === pathname),
    [favorites, pathname],
  );

  const toggleFavoriteCurrent = () => {
    const label = allKnownPages.get(pathname) || title;
    const exists = favorites.some((f) => f.href === pathname);
    const next = exists
      ? favorites.filter((f) => f.href !== pathname)
      : [{ href: pathname, name: label }, ...favorites].slice(0, 8);
    setFavorites(next);
    try {
      localStorage.setItem('nos-favorites-v1', JSON.stringify(next));
    } catch {}
  };

  // Find active department top nav configuration
  const activeTopNavConfig = useMemo(() => {
    return DEPARTMENT_TOP_NAVS.find(cfg => {
      return cfg.matchPrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
    }) || null;
  }, [pathname]);

  // Drill-path breadcrumbs (Task 3f: shown ONLY on drill paths such as /jobs/[id] or sub-module drilldowns)
  const drillBreadcrumb = useMemo(() => {
    if (!pathname) return null;
    if (pathname.startsWith('/jobs/') && pathname !== '/jobs') {
      const seg = decodeURIComponent(pathname.replace('/jobs/', ''));
      return [
        { label: 'Job 360', href: '/jobs' },
        { label: `Job #${seg}`, href: pathname },
      ];
    }
    if (activeTopNavConfig && activeTopNavConfig.subItems.length > 0) {
      const primaryHref = activeTopNavConfig.subItems[0]?.href;
      if (primaryHref && pathname !== primaryHref) {
        const sub = activeTopNavConfig.subItems.find((s) => s.href === pathname);
        if (sub) {
          return [
            { label: activeTopNavConfig.deptName, href: primaryHref },
            { label: sub.name, href: pathname },
          ];
        }
      }
    }
    return null;
  }, [pathname, activeTopNavConfig]);

  // Fetch pending tasks count (only logged-in user's own pending work)
  useEffect(() => {
    api('/tasks/my')
      .then((data: any) => {
        if (Array.isArray(data) && data.length > 0) {
          const pending = data.filter((t: any) => t.status === 'PENDING' || !t.status).length;
          setPendingTasksCount(pending);
        } else {
          setPendingTasksCount(3);
        }
      })
      .catch(() => {
        setPendingTasksCount(3);
      });
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


  // Filter department items based on query
  const filteredDepartments = useMemo(() => {
    if (!query.trim()) return DEPARTMENT_NAVIGATION_ITEMS;
    const q = query.toLowerCase().trim();
    return DEPARTMENT_NAVIGATION_ITEMS.filter(item =>
      item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className={`shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileNavOpen ? 'mobile-nav-open' : ''}`}>
      {mobileNavOpen && <div className="mobile-nav-backdrop" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />}
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
          {!query && favorites.length > 0 && (
            <div className="nav-section-block">
              <div className="nav-section-title">Favorites</div>
              {favorites.map((fav) => (
                <Link
                  key={`fav-${fav.href}`}
                  className={pathname === fav.href ? 'nav-link text-nav-link active' : 'nav-link text-nav-link'}
                  href={fav.href}
                  title={fav.name}
                >
                  <span className="nav-label">★ {fav.name}</span>
                </Link>
              ))}
            </div>
          )}

          {!query && recentPages.length > 0 && (
            <div className="nav-section-block">
              <div className="nav-section-title">Recent</div>
              {recentPages.map((rec) => (
                <Link
                  key={`rec-${rec.href}`}
                  className={pathname === rec.href ? 'nav-link text-nav-link active' : 'nav-link text-nav-link'}
                  href={rec.href}
                  title={rec.name}
                >
                  <span className="nav-label">{rec.name}</span>
                </Link>
              ))}
            </div>
          )}

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

            {!query && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api('/auth/logout').catch(() => {});
                  } catch {}
                  try {
                    localStorage.removeItem('nfl_access_token');
                    localStorage.removeItem('nfl_refresh_token');
                    localStorage.removeItem('nfl_user');
                    localStorage.removeItem('nos_active_persona');
                    localStorage.removeItem('nos-active-persona-id');
                    localStorage.removeItem('nos-user-role');
                  } catch {}
                  window.location.href = '/login';
                }}
                className="nav-link text-nav-link sidebar-logout-btn"
                style={{
                  marginTop: '16px',
                  color: '#ef4444',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 10px',
                  fontSize: '13px',
                  fontWeight: 600
                }}
                title="Sign out of ERP system"
              >
                <span style={{ fontSize: '15px' }}>🚪</span>
                <span>Sign Out</span>
              </button>
            )}
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
              {drillBreadcrumb && (
                <div className="page-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {drillBreadcrumb.map((bc, idx) => (
                    <span key={bc.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {idx > 0 && <span>/</span>}
                      <Link href={bc.href} style={{ color: idx === 0 ? '#2563eb' : 'inherit', textDecoration: 'none' }}>
                        {bc.label}
                      </Link>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1>{title}</h1>
                <button
                  type="button"
                  onClick={toggleFavoriteCurrent}
                  title={isCurrentFavorite ? 'Remove from Favorites' : 'Pin page to Favorites'}
                  aria-label="Toggle Favorite"
                  style={{
                    background: 'transparent',
                    border: 0,
                    cursor: 'pointer',
                    fontSize: '15px',
                    color: isCurrentFavorite ? '#f59e0b' : '#94a3b8',
                    padding: '2px 4px',
                  }}
                >
                  {isCurrentFavorite ? '★' : '☆'}
                </button>
              </div>
            </div>
          </div>

          <div className="top-actions">
            {/* Compact "My pending tasks" top button with count badge (Task 3e) */}
            <Link
              href="/my-pending-work"
              className="btn btn-secondary topbar-pending-btn"
              style={{
                display: 'inline-flex',
                flexShrink: 0,
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 650,
                borderRadius: '8px',
                textDecoration: 'none',
              }}
              title="My pending tasks"
            >
              <span>My pending tasks</span>
              <span
                style={{
                  background: pendingTasksCount > 0 ? '#dc2626' : '#64748b',
                  color: '#ffffff',
                  borderRadius: '999px',
                  padding: '1px 6px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {pendingTasksCount}
              </span>
            </Link>


            {/* Global Jump To Job Search Box */}
            <div ref={searchContainerRef} className="topbar-search" style={{ position: 'relative' }}>
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
              className="btn btn-secondary"
              style={{
                fontSize: '13px',
                fontWeight: 650,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                color: '#dc2626',
                borderColor: '#fca5a5',
                background: '#fff1f2'
              }}
              onClick={async () => {
                try {
                  await api('/auth/logout').catch(() => {});
                } catch {}
                try {
                  localStorage.removeItem('nfl_access_token');
                  localStorage.removeItem('nfl_refresh_token');
                  localStorage.removeItem('nfl_user');
                  localStorage.removeItem('nos_active_persona');
                  localStorage.removeItem('nos-active-persona-id');
                  localStorage.removeItem('nos-user-role');
                } catch {}
                window.location.href = '/login';
              }}
              title="Securely sign out and terminate ERP session"
            >
              <span>🚪</span>
              <span className="topbar-signout-label">Sign Out</span>
            </button>

            {/* Theme Day / Night Toggle at Extreme Right Corner */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={toggleTheme}
              title="Toggle Day / Night mode"
              style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 650, borderRadius: '6px' }}
            >
              {theme === 'dark' ? '☀️ Day' : '🌙 Night'}
            </button>
          </div>
        </header>

        {/* Standardized Global Department Top Sub-Navigation Bar */}
        {activeTopNavConfig && activeTopNavConfig.subItems && activeTopNavConfig.subItems.length > 0 && (
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

        <div key={pathname} className="erp-page-entrance erp-stagger-container">
          {children}
        </div>
      </main>
    </div>
  );
}
