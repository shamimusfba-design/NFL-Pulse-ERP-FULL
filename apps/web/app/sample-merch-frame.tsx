'use client';

import { useEffect, useState } from 'react';
import Shell from '../components/Shell';

// Wraps the Sample / Bulk Merchandising screen inside the common ERP shell, so the sidebar stays visible.
// The screen itself is public/merchandising/index.html.
//
// Address of the screen:
//  - on Firebase Hosting (cleanUrls on) it is /merchandising?app=… — requesting /merchandising/index.html there
//    triggers a clean-URL redirect to /merchandising, so we ask for that address directly (no redirect step at all)
//  - everywhere else (next dev / next start / VPS) the file is served as /merchandising/index.html?app=…
// Never point anything else at /merchandising (no page route, no redirect) — see scripts/prepare-hosting.js.
export function MerchFrame({ title, eyebrow, app }: { title: string; eyebrow: string; app: 'sample' | 'bulk' }) {
  const [src, setSrc] = useState<string | null>(null);
  const [nested, setNested] = useState(false);

  useEffect(() => {
    // Safety: if this page was itself loaded inside a frame, never open another copy (prevents page-in-page loops)
    if (window.self !== window.top) { setNested(true); return; }
    const firebase = /\.(web\.app|firebaseapp\.com)$/i.test(window.location.hostname);
    setSrc(firebase ? `/merchandising?app=${app}` : `/merchandising/index.html?app=${app}`);
  }, [app]);

  if (nested) {
    return <div style={{ padding: 24, fontFamily: 'system-ui', color: '#0f172a' }}>The merchandising screen could not be loaded here.</div>;
  }

  return (
    <Shell title={title} eyebrow={eyebrow}>
      {src && (
        <iframe
          src={src}
          title={title}
          style={{ width: '100%', height: 'calc(100vh - 140px)', border: '1px solid var(--line, #e1e5ec)', borderRadius: 12, background: '#fff' }}
        />
      )}
    </Shell>
  );
}
