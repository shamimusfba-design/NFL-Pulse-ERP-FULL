'use client';

import Shell from '../../../components/Shell';

export default function FinishedFabricPage() {
  return (
    <Shell title="Finished Fabric Store" eyebrow="Quality Clearance Verification, Roll Stock, Shade Lots & Cutting Issue">
      <iframe
        src="/finished-fabric/index.html"
        title="Finished Fabric Store"
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
