'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { MODULE_GROUPS, ModuleGroup } from '../lib/modules';

function roleFilteredGroups(groups: ModuleGroup[], roles: string[]): ModuleGroup[] {
  if (!roles.length || roles.includes('ADMIN')) return groups;
  const allowed: Record<string, string[]> = {};
  const add = (group: string, slugs: string[]) => { allowed[group] = [...(allowed[group] || []), ...slugs]; };

  if (roles.includes('MERCH_BULK')) add('Merchandising', ['merchandising']);
  if (roles.includes('MERCH_SAMPLE')) add('Merchandising', ['sample-merchandising']);
  if (roles.includes('MERCH_BOTH')) add('Merchandising', ['merchandising', 'sample-merchandising']);
  if (roles.includes('MERCH_HEAD')) { add('Merchandising', ['merchandising', 'projection', 'sample-merchandising']); add('Sample / CAD / Technical', ['central-sample', 'sample-fabric-store', 'cad', 'technical']); }
  if (roles.includes('IE')) add('Industrial Production Engineering', ['ie-overview', 'ie-bulletin', 'ie-daily-target', 'ie-npt', 'ie-skill-matrix', 'ie-production-checkpoints', 'ie-reports']);
  if (roles.includes('CAD')) add('Sample / CAD / Technical', ['cad', 'technical']);
  if (roles.includes('SAMPLE')) add('Sample / CAD / Technical', ['central-sample', 'sample-fabric-store']);
  if (roles.includes('PLANNING')) { add('Central Planning', ['ta', 'capacity', 'sewing-planning', 'subcontract', 'lead-time-history']); add('Management', ['job-360']); }
  if (roles.includes('MANAGEMENT')) { add('Management', ['management', 'job-360']); add('Central Planning', ['capacity', 'lead-time-history']); add('Quality & Stores', ['quality', 'quality-history']); add('Shipment & System', ['reports']); }
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
  if (roles.includes('SEWING')) add('Garment Production', ['sewing']);
  if (roles.includes('FINISHING')) add('Garment Production', ['finishing']);
  if (roles.includes('TRIMS_STORE')) add('Quality & Stores', ['trims']);
  if (roles.includes('SHIPMENT')) add('Shipment & System', ['shipment', 'reports']);

  if (!Object.keys(allowed).length) return groups;
  return groups.map((group) => ({ ...group, items: group.items.filter((item) => (allowed[group.label] || []).includes(item.slug)) })).filter((group) => group.items.length);
}

export default function Shell({ children, title, eyebrow }: { children: React.ReactNode; title: string; eyebrow?: string }) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const token = localStorage.getItem('nfl_access_token');
    const raw = localStorage.getItem('nfl_user');
    if (!token) location.href = '/login';
    else if (raw) setUser(JSON.parse(raw));
  }, []);

  const roleGroups = useMemo(() => roleFilteredGroups(MODULE_GROUPS, user?.roles || []), [user]);

  useEffect(() => {
    const current = roleGroups.find((group) =>
      group.items.some((item) => pathname.startsWith(`/modules/${item.slug}`)),
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
          <div className="brand-mark">NP</div>
          <div><div className="brand">NFL Pulse ERP</div><div className="brand-sub">Operations Control</div></div>
        </div>

        <div className="sidebar-search">
          <span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find module..." aria-label="Find module" />
        </div>

        <nav className="nav">
          {!query && <>
            <Link className={active('/') ? 'nav-link active' : 'nav-link'} href="/"><span className="nav-icon">OV</span><span>Overview</span></Link>
            <Link className={active('/tasks') ? 'nav-link active' : 'nav-link'} href="/tasks"><span className="nav-icon">TK</span><span>My Pending Tasks</span></Link>
            {canEnterOrders && <Link className={active('/orders/new') ? 'nav-link active' : 'nav-link'} href="/orders/new"><span className="nav-icon">PO</span><span>Order Entry / PO Import</span></Link>}
          </>}

          {groups.map((group) => {
            const isOpen = query.length > 0 || !!openGroups[group.label];
            const hasActive = group.items.some((item) => active(`/modules/${item.slug}`));
            return <div className={`nav-group ${isOpen ? 'open' : ''}`} key={group.label}>
              <button type="button" className={`nav-group-toggle ${hasActive ? 'has-active' : ''}`} onClick={() => toggleGroup(group.label)} aria-expanded={isOpen}>
                <span className="nav-group-title">{group.label}</span>
                <span className={`nav-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true">⌄</span>
              </button>
              <div className={`nav-group-items ${isOpen ? 'open' : ''}`}>
                {group.items.map((item) => {
                  const href = `/modules/${item.slug}`;
                  return <Link className={active(href) ? 'nav-link active' : 'nav-link'} href={href} key={item.slug} title={item.description}>
                    <span className="nav-icon">{item.short}</span><span className="nav-text">{item.name}</span>
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
          <div className="top-actions">
            <button className="icon-btn" title="Notifications">●</button>
            <div className="user-chip"><div className="avatar">{(user?.name || 'A').slice(0, 1).toUpperCase()}</div><div className="user-meta"><strong>{user?.name || 'NFL Pulse User'}</strong><span>{user?.roles?.join(', ') || 'Authorized user'}</span></div></div>
            <button className="btn btn-secondary" onClick={logout}>Logout</button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
