'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NosTopNav from './NosTopNav';
import { MODULE_GROUPS } from '../lib/modules';

function resolveModuleHref(slug: string): string {
  if (slug === 'merchandising') return '/merchandising';
  if (slug === 'order-entry') return '/merchandising/order-po';
  if (slug === 'bulk-followup') return '/modules/merchandising?view=LEGACY_REGISTER';
  if (slug === 'sample-room') return '/sample-room/index.html';
  if (slug === 'yarn-knitting' || slug === 'yarn' || slug === 'yarn-store' || slug === 'knitting') return '/yarn-knitting/index.html';
  if (slug === 'greige-store') return '/greige-store/index.html';
  if (slug === 'dyeing') return '/dyeing/index.html';
  if (slug === 'finished-fabric') return '/finished-fabric/index.html';
  return `/modules/${slug}`;
}

export default function NosShell({
  children,
  title,
  subtitle,
  actions
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Merchandising: true });

  useEffect(() => {
    try {
      if (localStorage.getItem('nos_sidebar_collapsed') === '1') {
        setSidebarCollapsed(true);
      }
    } catch {}
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nos_sidebar_collapsed', next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  const active = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href.split('?')[0]));

  return (
    <div className={`shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="brand-wrap">
          <img className="brand-logo" src="/branding/northern-fashions-logo.jpg" alt="Northern Fashions Limited" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="brand">Northern Fashions Limited</div>
            <div className="brand-sub">NFL Pulse ERP · Operations Control</div>
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            title="Hide left menu"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: '#cbd5e1', width: '28px', height: '28px', borderRadius: '7px', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: '14px', flexShrink: 0 }}
          >
            «
          </button>
        </div>

        <div className="sidebar-search">
          <span>⌕</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find module..." aria-label="Find module" />
        </div>

        <nav className="nav">
          {!query && (
            <>
              <Link className={active('/') ? 'nav-link active' : 'nav-link'} href="/"><span className="nav-icon">👑</span><span>Executive KPI Board</span></Link>
              <Link className={active('/tasks') ? 'nav-link active' : 'nav-link'} href="/tasks"><span className="nav-icon">TK</span><span>My Pending Tasks</span></Link>
              <Link className={active('/jobs') ? 'nav-link active' : 'nav-link'} href="/jobs"><span className="nav-icon">📋</span><span>All Jobs & Stages</span></Link>
            </>
          )}

          {MODULE_GROUPS.map((group) => {
            const q = query.trim().toLowerCase();
            const items = q ? group.items.filter((i) => `${i.name} ${group.label}`.toLowerCase().includes(q)) : group.items;
            if (q && !items.length) return null;
            const isOpen = q.length > 0 || !!openGroups[group.label];
            const overviewHref = resolveModuleHref(group.overviewSlug);
            const hasActive = active(overviewHref) || group.items.some((item) => active(resolveModuleHref(item.slug)));
            return (
              <div className={`nav-group ${isOpen ? 'open' : ''}`} key={group.label}>
                <div className={`nav-group-toggle ${hasActive ? 'has-active' : ''}`}>
                  <Link className="nav-group-overview" href={overviewHref} onClick={() => setOpenGroups((prev) => ({ ...prev, [group.label]: true }))}>
                    <span className="nav-group-title">{group.label}</span>
                  </Link>
                  <button type="button" className="nav-group-chevron-btn" onClick={() => setOpenGroups((prev) => ({ ...prev, [group.label]: !prev[group.label] }))}>
                    <span className={`nav-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true">⌄</span>
                  </button>
                </div>
                <div className={`nav-group-items ${isOpen ? 'open' : ''}`}>
                  {items.map((item) => {
                    const href = resolveModuleHref(item.slug);
                    return (
                      <Link className={active(href) ? 'nav-link active' : 'nav-link'} href={href} key={item.slug}>
                        <span className="nav-icon">{item.short}</span>
                        <span className="nav-text">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <div style={{ minHeight: '100vh', minWidth: 0, background: '#f3f6fb', color: '#0f172a', display: 'flex', flexDirection: 'column' }}>
        <NosTopNav sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} />

        {/* Optional Subheader */}
        {title && (
          <div style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  NOS MERCHANDISING
                </span>
                <span style={{ color: '#94a3b8' }}>/</span>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  {title}
                </h1>
              </div>
              {subtitle && (
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div>{actions}</div>}
          </div>
        )}

        {/* Main Body */}
        <main style={{ flex: 1, padding: '20px 24px 40px' }}>
          {children}
        </main>

        {/* Footer */}
        <footer style={{
          padding: '14px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
          fontSize: '11.5px',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <strong>NOS (Northern Operating System)</strong>
            <span>·</span>
            <span>Northern Fashions Limited & Northern Corporation Ltd.</span>
            <span>·</span>
            <span style={{ color: '#16a34a', fontWeight: 700 }}>● Merchandising Production Control v1.0</span>
          </div>
          <div>
            <span>Authorized Garment Operating Architecture · NFL / NCL</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
