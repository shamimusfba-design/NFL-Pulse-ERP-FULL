'use client';

import Shell from '../components/Shell';

// Wraps the Sample / Bulk Merchandising prototype screen inside the common ERP shell,
// so the sidebar stays visible. The screen itself is /merchandising/index.html (unchanged).
export function MerchFrame({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <Shell title={title} eyebrow={eyebrow}>
      <iframe
        src="/merchandising/index.html"
        title={title}
        style={{ width: '100%', height: 'calc(100vh - 140px)', border: '1px solid var(--line, #e1e5ec)', borderRadius: 12, background: '#fff' }}
      />
    </Shell>
  );
}
