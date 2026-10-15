'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type MerchandiserPersona = {
  id: string;
  name: string;
  role: 'MERCHANDISER' | 'HEAD_MERCHANDISER' | 'ADMIN';
  assignedBuyer: string; // 'ONLY', 'OVS', 'Name It', 'UTG', 'ALL'
  email: string;
  avatar: string;
  department: string;
};

export const PRESET_PERSONAS: MerchandiserPersona[] = [
  {
    id: 'user-shamim',
    name: 'Shamim Hossain',
    role: 'MERCHANDISER',
    assignedBuyer: 'ONLY',
    email: 'shamim.h@northernfashions.com',
    avatar: 'SH',
    department: 'Team ONLY / Carmakoma / Kids'
  },
  {
    id: 'user-imran',
    name: 'Md. Imran Khan',
    role: 'MERCHANDISER',
    assignedBuyer: 'ONLY',
    email: 'imran.k@northernfashions.com',
    avatar: 'IK',
    department: 'Team ONLY (Bulk)'
  },
  {
    id: 'user-basir',
    name: 'Basir Hossain',
    role: 'MERCHANDISER',
    assignedBuyer: 'OVS',
    email: 'basir.h@northernfashions.com',
    avatar: 'BH',
    department: 'Team OVS Italy'
  },
  {
    id: 'user-haider',
    name: 'Haider Ali',
    role: 'MERCHANDISER',
    assignedBuyer: 'Name It',
    email: 'haider.a@northernfashions.com',
    avatar: 'HA',
    department: 'Team Name It (Bestseller)'
  },
  {
    id: 'user-rony',
    name: 'Rony Ahmed',
    role: 'MERCHANDISER',
    assignedBuyer: 'UTG',
    email: 'rony.a@northernfashions.com',
    avatar: 'RA',
    department: 'Team UTG UK'
  },
  {
    id: 'user-morad',
    name: 'Morad Hossain',
    role: 'MERCHANDISER',
    assignedBuyer: "New Look",
    email: 'morad.h@northernfashions.com',
    avatar: 'MH',
    department: 'Team New Look / Miss Selfridge'
  },
  {
    id: 'user-head',
    name: 'Tariqul Islam',
    role: 'HEAD_MERCHANDISER',
    assignedBuyer: 'ALL',
    email: 'tariqul.gm@northernfashions.com',
    avatar: 'TI',
    department: 'Central Merchandising Control'
  }
];

export const NOS_NAV_ITEMS = [
  { no: '01', label: 'Pre-Order / Costing', href: '/merchandising/costing', short: 'CS', icon: '💵' },
  { no: '02', label: 'Bulk Merchandising', href: '/merchandising', short: 'BM', icon: '⚡' },
  { no: '03', label: 'Order & PO Management', href: '/merchandising/order-po', short: 'PO', icon: '📦' },
  { no: '04', label: 'T&A / Critical Path', href: '/merchandising/ta', short: 'TA', icon: '⏱️' },
  { no: '05', label: 'BOM & Material Follow-up', href: '/merchandising/bom-material', short: 'MT', icon: '🧵' },
  { no: '06', label: 'Sample & Approval', href: '/merchandising/sample-approval', short: 'SA', icon: '✨' },
  { no: '07', label: 'Production Follow-up', href: '/merchandising/production', short: 'PR', icon: '🏭' },
  { no: '08', label: 'Shipment & Order Closing', href: '/merchandising/shipment-closing', short: 'SH', icon: '🚢' },
  { no: '09', label: 'Reports & Documents', href: '/merchandising/reports-docs', short: 'RP', icon: '📑' }
];

export function useActivePersona() {
  const [persona, setPersona] = useState<MerchandiserPersona>(PRESET_PERSONAS[1]); // Default to Md. Imran Khan

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nos_active_persona');
      const userRaw = localStorage.getItem('nfl_user');
      let baseUser: any = null;
      if (userRaw) {
        try { baseUser = JSON.parse(userRaw); } catch {}
      }

      if (stored) {
        const parsed = JSON.parse(stored);
        const found = PRESET_PERSONAS.find(p => p.id === parsed.id || (baseUser && p.email === baseUser.email)) || parsed;
        setPersona(found);
      } else if (baseUser) {
        const found = PRESET_PERSONAS.find(p => p.email === baseUser.email || p.name.includes(baseUser.name) || (baseUser.merchandiserName === 'Imran' && p.id === 'user-imran'));
        if (found) {
          setPersona(found);
          localStorage.setItem('nos_active_persona', JSON.stringify(found));
        }
      }
    } catch (e) {
      // fallback
    }

    const handlePersonaChange = (e: any) => {
      if (e.detail) setPersona(e.detail);
    };
    window.addEventListener('nos-persona-changed', handlePersonaChange);
    return () => window.removeEventListener('nos-persona-changed', handlePersonaChange);
  }, []);

  const switchPersona = (p: MerchandiserPersona) => {
    setPersona(p);
    try {
      localStorage.setItem('nos_active_persona', JSON.stringify(p));
      const userObj = {
        id: p.id,
        name: p.name,
        email: p.email,
        role: p.role,
        roles: [p.role, 'MERCH_BULK'],
        merchandiserName: p.name.includes('Imran') ? 'Imran' : p.name.split(' ')[0],
        assignedBuyer: p.assignedBuyer,
        department: p.department
      };
      localStorage.setItem('nfl_user', JSON.stringify(userObj));
      window.dispatchEvent(new CustomEvent('nos-persona-changed', { detail: p }));
    } catch (e) {
      // ignore
    }
  };

  return { persona, switchPersona };
}

export default function NosTopNav() {
  const pathname = usePathname();
  const { persona, switchPersona } = useActivePersona();
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  return (
    <header className="nos-top-nav">
      {/* Top Identity Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link href="/merchandising" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <span className="nos-brand-badge">NOS</span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Northern Operating System
              </div>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Merchandising Control Tower · Phase 01
              </div>
            </div>
          </Link>

          <div style={{ height: '22px', width: '1px', background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />

          {/* Factory Context Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700 }}>FACTORIES:</span>
            <span style={{ fontSize: '11px', fontWeight: 800, background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '2px 8px', borderRadius: '4px' }}>
              NFL (Knitting & Dyeing · Unit 1)
            </span>
            <span style={{ fontSize: '11px', fontWeight: 800, background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '4px' }}>
              NCL (Unit 2)
            </span>
          </div>
        </div>

        {/* Right Tools & Role Authorization Persona */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Active Merchandiser Scope Badge */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                background: persona.role === 'HEAD_MERCHANDISER' ? 'rgba(234, 179, 8, 0.12)' : 'rgba(37, 99, 235, 0.15)',
                border: persona.role === 'HEAD_MERCHANDISER' ? '1px solid rgba(234, 179, 8, 0.35)' : '1px solid rgba(59, 130, 246, 0.35)',
                borderRadius: '8px',
                padding: '5px 11px',
                color: '#ffffff',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              title="Click to switch Merchandiser profile or inspect role-based buyer isolation"
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: persona.role === 'HEAD_MERCHANDISER' ? '#ca8a04' : '#2563eb',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 900,
                display: 'grid',
                placeItems: 'center'
              }}>
                {persona.avatar}
              </div>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {persona.name}
                  {persona.role === 'HEAD_MERCHANDISER' ? (
                    <span style={{ fontSize: '9.5px', background: '#eab308', color: '#0f172a', padding: '1px 5px', borderRadius: '3px', fontWeight: 900 }}>ALL BUYERS</span>
                  ) : (
                    <span style={{ fontSize: '9.5px', background: '#3b82f6', color: '#ffffff', padding: '1px 5px', borderRadius: '3px', fontWeight: 800 }}>BUYER: {persona.assignedBuyer}</span>
                  )}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                  {persona.role === 'HEAD_MERCHANDISER' ? 'Head of Merchandising (Cross-Account)' : `Assigned Merchandiser · Strict Scope`} ▾
                </div>
              </div>
            </button>

            {/* Persona Switcher Dropdown */}
            {showPersonaMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  width: '320px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                  zIndex: 100,
                  overflow: 'hidden',
                  padding: '8px 0'
                }}
              >
                <div style={{ padding: '8px 14px', borderBottom: '1px solid #1e293b', fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Select Merchandiser Account (Role Testing)
                </div>
                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  {PRESET_PERSONAS.map((p) => {
                    const isSelected = p.id === persona.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          switchPersona(p);
                          setShowPersonaMenu(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          border: 'none',
                          background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                          color: '#fff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.12s'
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '5px',
                          background: p.role === 'HEAD_MERCHANDISER' ? '#ca8a04' : '#2563eb',
                          color: '#fff',
                          fontSize: '10.5px',
                          fontWeight: 900,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0
                        }}>
                          {p.avatar}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{p.name}</span>
                            <span style={{
                              fontSize: '9px',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              background: p.role === 'HEAD_MERCHANDISER' ? '#eab308' : '#1e3a8a',
                              color: p.role === 'HEAD_MERCHANDISER' ? '#0f172a' : '#93c5fd',
                              fontWeight: 800
                            }}>
                              {p.assignedBuyer === 'ALL' ? 'ALL ACCOUNTS' : `ONLY ${p.assignedBuyer}`}
                            </span>
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>{p.department}</div>
                        </div>
                        {isSelected && <span style={{ color: '#38bdf8', fontSize: '13px' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
                <div style={{ padding: '8px 14px', borderTop: '1px solid #1e293b', background: 'rgba(0,0,0,0.2)', fontSize: '10px', color: '#64748b' }}>
                  🔒 <em>Normal merchandisers are strictly scoped to their assigned buyer. No unauthorized cross-data access.</em>
                </div>
              </div>
            )}
          </div>

          {/* Quick link back to Full ERP Floor System */}
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '7px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#cbd5e1',
              fontSize: '11px',
              fontWeight: 700,
              textDecoration: 'none'
            }}
            title="Open Factory Floor & Full ERP Overview"
          >
            <span>🏭</span>
            <span>Full ERP System</span>
          </Link>
        </div>
      </div>

      {/* 10 Module NOS Navigation Strip */}
      <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', padding: '0 18px', background: '#0b162b', scrollbarWidth: 'none' }}>
        {NOS_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/merchandising' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.no}
              href={item.href}
              className={`nos-tab-link ${isActive ? 'active' : ''}`}
              title={item.label}
            >
              <span style={{ fontSize: '10px', opacity: 0.6, fontWeight: 800 }}>{item.no}</span>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
