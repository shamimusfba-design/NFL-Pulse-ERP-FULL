'use client';

import React, { useRef, useEffect, useState } from 'react';
import Shell from '../../../components/Shell';

export default function TechnicalModulePage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeSrc, setIframeSrc] = useState('/technical/index.html');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      setIframeSrc(`/technical/index.html${window.location.hash}`);
    }

    const onHash = () => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.location.hash = window.location.hash;
      }
    };
    window.addEventListener('hashchange', onHash);

    const syncThemeAndRole = () => {
      try {
        const theme =
          localStorage.getItem('nos-theme') ||
          (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({ theme }, '*');
        }
        if (iframeRef.current?.contentDocument) {
          iframeRef.current.contentDocument.documentElement.dataset.theme = theme;
        }
      } catch (e) {
        // cross-origin safe
      }
    };

    syncThemeAndRole();
    const interval = setInterval(syncThemeAndRole, 800);
    return () => {
      window.removeEventListener('hashchange', onHash);
      clearInterval(interval);
    };
  }, []);

  return (
    <Shell
      title="Technical / Size Set"
      eyebrow="Sample Room, Tech Pack, Size Set & Bulk Production File Handover"
    >
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        title="Technical and File Handover Operations"
        style={{
          width: '100%',
          height: 'calc(100vh - 130px)',
          border: '1px solid var(--line, #e1e5ec)',
          borderRadius: 10,
          background: 'var(--paper, #fff)',
        }}
        onLoad={() => {
          try {
            const theme =
              localStorage.getItem('nos-theme') ||
              (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
            if (iframeRef.current?.contentWindow) {
              iframeRef.current.contentWindow.postMessage({ theme }, '*');
            }
            if (iframeRef.current?.contentDocument) {
              iframeRef.current.contentDocument.documentElement.dataset.theme = theme;
            }
          } catch (e) {}
        }}
      />
    </Shell>
  );
}
