'use client';

import { useEffect, useRef, useState } from 'react';

type BarState = { left: number; width: number; scrollWidth: number; visible: boolean };

export default function GlobalStickyScrollbar() {
  const barRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const syncing = useRef(false);
  const [state, setState] = useState<BarState>({ left: 0, width: 0, scrollWidth: 0, visible: false });

  useEffect(() => {
    const selector = '.register-table-wrap, .gantt-shell, .wide-table-wrap, .table-scroll, [data-sticky-horizontal-scroll]';
    const pick = () => {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
        el => el.scrollWidth > el.clientWidth + 8 && getComputedStyle(el).display !== 'none'
      );
      let best: HTMLElement | null = null;
      let bestScore = -Infinity;
      for (const el of candidates) {
        const r = el.getBoundingClientRect();
        // Check if element is within or intersecting viewport
        const visible = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
        const near = visible > 0 ? visible * 1000 : -(Math.min(Math.abs(r.top - window.innerHeight), Math.abs(r.bottom)));
        if (near > bestScore) {
          bestScore = near;
          best = el;
        }
      }
      if (targetRef.current !== best) {
        if (targetRef.current) targetRef.current.removeEventListener('scroll', syncFromTarget);
        targetRef.current = best;
        if (best) best.addEventListener('scroll', syncFromTarget, { passive: true });
      }
      if (!best) {
        setState(s => s.visible ? { ...s, visible: false } : s);
        return;
      }
      const r = best.getBoundingClientRect();
      setState({
        left: Math.max(0, r.left),
        width: Math.min(window.innerWidth - Math.max(0, r.left), r.width),
        scrollWidth: best.scrollWidth,
        visible: true
      });
      requestAnimationFrame(syncFromTarget);
    };

    const syncFromTarget = () => {
      if (syncing.current) return;
      const target = targetRef.current;
      const bar = barRef.current;
      if (!target || !bar) return;
      syncing.current = true;
      bar.scrollLeft = target.scrollLeft;
      requestAnimationFrame(() => { syncing.current = false; });
    };

    const onScroll = () => pick();
    const mo = new MutationObserver(() => requestAnimationFrame(pick));
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', pick, { passive: true });
    pick();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', pick);
      mo.disconnect();
      targetRef.current?.removeEventListener('scroll', syncFromTarget);
    };
  }, []);

  function onBarScroll() {
    if (syncing.current) return;
    const target = targetRef.current;
    const bar = barRef.current;
    if (!target || !bar) return;
    syncing.current = true;
    target.scrollLeft = bar.scrollLeft;
    requestAnimationFrame(() => { syncing.current = false; });
  }

  function nudge(dx: number) {
    if (targetRef.current) {
      targetRef.current.scrollBy({ left: dx, behavior: 'smooth' });
    }
  }

  if (!state.visible) return null;

  return (
    <div
      className="global-sticky-hscroll-container"
      style={{
        position: 'fixed',
        bottom: 0,
        left: state.left,
        width: state.width,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        background: '#f1f5f9',
        border: '1px solid #94a3b8',
        borderBottom: 0,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.15)',
        borderRadius: '6px 6px 0 0',
        padding: '0 4px',
        height: '24px'
      }}
      aria-label="Frozen Table Horizontal Scrollbar"
    >
      <button
        type="button"
        onClick={() => nudge(-300)}
        title="Scroll table Left"
        style={{
          border: '1px solid #cbd5e1',
          background: '#fff',
          color: '#1e293b',
          fontSize: '11px',
          fontWeight: 800,
          cursor: 'pointer',
          padding: '2px 8px',
          borderRadius: '4px',
          lineHeight: 1,
          height: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          flexShrink: 0
        }}
      >
        <span>◂</span> <span style={{ fontSize: '10px' }}>Left</span>
      </button>

      <div
        ref={barRef}
        className="global-sticky-hscroll"
        onScroll={onBarScroll}
        style={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          height: '16px',
          margin: '0 4px'
        }}
      >
        <div style={{ width: state.scrollWidth, height: 1 }} />
      </div>

      <button
        type="button"
        onClick={() => nudge(300)}
        title="Scroll table Right"
        style={{
          border: '1px solid #cbd5e1',
          background: '#fff',
          color: '#1e293b',
          fontSize: '11px',
          fontWeight: 800,
          cursor: 'pointer',
          padding: '2px 8px',
          borderRadius: '4px',
          lineHeight: 1,
          height: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          flexShrink: 0
        }}
      >
        <span style={{ fontSize: '10px' }}>Right</span> <span>▸</span>
      </button>
    </div>
  );
}
