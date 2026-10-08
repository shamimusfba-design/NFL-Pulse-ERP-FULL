'use client';

import React from 'react';
import Link from 'next/link';
import NosShell from './NosShell';

export default function NosModulePlaceholder({
  moduleNo,
  title,
  subtitle,
  icon,
  description,
  plannedFeatures,
  connectedExistingRoute,
  connectedExistingLabel,
  kpis
}: {
  moduleNo: string;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  plannedFeatures: string[];
  connectedExistingRoute?: string;
  connectedExistingLabel?: string;
  kpis?: { label: string; value: string; hint: string }[];
}) {
  return (
    <NosShell
      title={`${moduleNo}. ${title}`}
      subtitle={subtitle}
      actions={
        connectedExistingRoute ? (
          <Link
            href={connectedExistingRoute}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: '#2563eb',
              color: '#fff',
              borderRadius: '7px',
              fontSize: '11.5px',
              fontWeight: 800,
              textDecoration: 'none'
            }}
          >
            <span>🔗 Launch {connectedExistingLabel || 'Existing Engine'}</span>
          </Link>
        ) : null
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Module Header Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              color: '#fff',
              fontSize: '22px',
              display: 'grid',
              placeItems: 'center'
            }}>
              {icon}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="nos-brand-badge" style={{ fontSize: '11px', padding: '2px 6px' }}>
                  NOS {moduleNo}
                </span>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                  {title}
                </h2>
                <span className="nos-status-pill on-track" style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
                  Architecture Ready · Phase 01 Shell
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b', maxWidth: '640px' }}>
                {description}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Link
              href="/merchandising"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                background: '#f1f5f9',
                color: '#334155',
                borderRadius: '7px',
                fontSize: '11.5px',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              ← Back to Command Center
            </Link>
          </div>
        </div>

        {/* KPIs row */}
        {kpis && kpis.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            {kpis.map((k, i) => (
              <div key={i} className="nos-kpi-card">
                <div className="nos-kpi-bar" style={{ background: i % 2 === 0 ? '#3b82f6' : '#10b981' }} />
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  {k.label}
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
                  {k.value}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  {k.hint}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Planned Features & Architecture Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '20px' }}>
          {/* Left: Capability Blueprint */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              Functional Capabilities & Scope
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {plannedFeatures.map((feat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ color: '#2563eb', fontWeight: 900 }}>✓</span>
                  <span style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Integration & Safety Guarantee */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              Architecture & Backend Persistence
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: '#475569' }}>
              <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <strong style={{ color: '#1e40af', display: 'block', marginBottom: '3px' }}>Backend Preserved:</strong>
                All existing APIs, imported database records, business calculations, and workflows remain completely active.
              </div>
              <div style={{ padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <strong style={{ color: '#166534', display: 'block', marginBottom: '3px' }}>Enterprise Data Isolation:</strong>
                Strict user-role permission scoping enforced across all views.
              </div>
              {connectedExistingRoute && (
                <Link
                  href={connectedExistingRoute}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#2563eb',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  <span>Open {connectedExistingLabel}</span>
                  <span>→</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </NosShell>
  );
}
