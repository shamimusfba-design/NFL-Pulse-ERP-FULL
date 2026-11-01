'use client';

import Shell from '../../../components/Shell';

export default function GreigeStorePage() {
  return (
    <Shell title="Greige Fabric Store" eyebrow="Knitted Rolls Receiving, Weight Audit, Bin Location & Dyeing Allocation">
      <iframe
        src="/greige-store/index.html"
        title="Greige Fabric Store"
        style={{
          width: '100%',
          height: 'calc(100vh - 140px)',
          border: '1px solid var(--line, #e1e5ec)',
          borderRadius: 12,
          background: '#ffffff'
        }}
      />
    </Shell>
  );
}
