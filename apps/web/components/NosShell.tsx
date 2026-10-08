'use client';

import React from 'react';
import NosTopNav from './NosTopNav';

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
  return (
    <div style={{ minHeight: '100vh', background: '#f3f6fb', color: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      <NosTopNav />

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
  );
}
