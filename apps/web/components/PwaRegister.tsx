'use client';

import { useEffect, useState } from 'react';

/** Registers the service worker and shows a small bar when a new version of the app is ready. */
export default function PwaRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then(reg => {
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          nw?.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) setWaiting(nw);
          });
        });
        // check for a new version when the app comes back to the foreground
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
      })
      .catch(() => {});
  }, []);

  if (!waiting) return null;
  return (
    <div className="pwa-update-bar" role="status">
      <span>A new version of NFL ERP is ready.</span>
      <button type="button" onClick={() => waiting.postMessage('SKIP_WAITING')}>Refresh now</button>
    </div>
  );
}
