'use client';

import Shell from '../../../components/Shell';

export default function YarnKnittingPage() {
  return (
    <Shell title="Yarn Store & Knitting" eyebrow="Godown Stock, Yarn Requisition, Circular Knitting & Machine Allocation">
      <iframe
        src="/yarn-knitting/index.html"
        title="Yarn Store & Knitting"
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
