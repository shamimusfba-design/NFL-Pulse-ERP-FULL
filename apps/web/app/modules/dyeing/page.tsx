'use client';

import Shell from '../../../components/Shell';

export default function DyeingPage() {
  return (
    <Shell title="Dyeing Operations & Machine Loading" eyebrow="Batch Scheduling, Vessel Capacity, First-Time-Pass (RFT) & Finishing">
      <iframe
        src="/dyeing/index.html"
        title="Dyeing Operations"
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
