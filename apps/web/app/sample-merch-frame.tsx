'use client';

import { useEffect, useRef, useState } from 'react';
import Shell from '../components/Shell';

// Wraps the Sample / Bulk Merchandising screen inside the common ERP shell, so the sidebar stays visible.
// The screen itself is public/merchandising/index.html.
export function MerchFrame({ title, eyebrow, app }: { title: string; eyebrow: string; app: 'sample' | 'bulk' }) {
  const [src, setSrc] = useState<string | null>(null);
  const [nested, setNested] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    // Safety: if this page was itself loaded inside a same-origin frame, never open another copy (prevents page-in-page loops on Firebase Hosting)
    try {
      if (window.self !== window.top && window.parent.location.origin === window.location.origin) {
        setNested(true);
        return;
      }
    } catch {
      // Cross-origin parent (e.g. preview container) is safe
    }
    const firebase = /\.(web\.app|firebaseapp\.com)$/i.test(window.location.hostname);
    setSrc(firebase ? `/merchandising?app=${app}` : `/merchandising/index.html?app=${app}`);
  }, [app]);

  const syncThemeToIframe = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const isDark =
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        localStorage.getItem('nos-theme') === 'dark';
      doc.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      if (doc.body) {
        doc.body.classList.toggle('dark', isDark);
        doc.body.classList.toggle('theme-dark', isDark);
      }
    } catch {
      // Ignore cross-origin or unmounted errors
    }
  };

  useEffect(() => {
    const observer = new MutationObserver(() => syncThemeToIframe());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('storage', syncThemeToIframe);
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', syncThemeToIframe);
    };
  }, []);

  if (nested) {
    return <div style={{ padding: 24, fontFamily: 'system-ui', color: '#0f172a' }}>The merchandising screen could not be loaded here.</div>;
  }

  return (
    <Shell title={title} eyebrow={eyebrow}>
      {src && (
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          onLoad={syncThemeToIframe}
          style={{ width: '100%', height: 'calc(100vh - 120px)', border: 'none', borderRadius: 0, background: '#fff' }}
        />
      )}
    </Shell>
  );
}

