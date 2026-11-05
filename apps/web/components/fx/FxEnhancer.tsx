'use client';

import { useEffect } from 'react';
import { FX, prefersReducedMotion } from './motion';
import { easeOutExpo, formatNumberLike, parseNumberText } from './countUpCore';

/**
 * Global count-up for KPI numbers. Mounted once in app/layout.tsx.
 *
 * Any element matching KPI_SELECTORS (or carrying data-fx-count) counts up from 0 when it
 * scrolls into view, replays when it comes back into view, and glides from the old value to the
 * new one when its data changes (e.g. after a filter). Future KPI cards get this automatically
 * if they use these class names or add data-fx-count.
 *
 * Safety: only the existing text node's nodeValue is touched (React keeps owning the node),
 * and an animation aborts itself if anything else changes the text mid-flight.
 */
export const KPI_SELECTORS = [
  '[data-fx-count]',
  '.ie-kpi-row strong',
  '.overview-card-grid strong',
  '.summary-metric-grid strong',
  '.metric-card .metric-value',
  '.metric-value',
  '.nos-kpi-card .kpi-value',
  '.kpi-board-card strong',
  '.donut-center-val',
].join(',');

export const SCOPE_SELECTORS = '.hbar-list, [data-fx-scope]';

type State = { node: Text; final: string; last: string; raf: number; seen: boolean; shownOnce: boolean };

export default function FxEnhancer() {
  useEffect(() => {
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;

    const states = new Map<Element, State>();

    const textNodeOf = (el: Element): Text | null => {
      for (const n of Array.from(el.childNodes)) {
        if (n.nodeType === Node.TEXT_NODE && /\d/.test(n.nodeValue || '')) return n as Text;
      }
      return null;
    };

    const stop = (s: State) => { if (s.raf) cancelAnimationFrame(s.raf); s.raf = 0; };

    const play = (el: Element, from?: number) => {
      const s = states.get(el);
      if (!s) return;
      const parsed = parseNumberText(s.final);
      if (!parsed) return;
      stop(s);
      const start = from ?? 0;
      const t0 = performance.now();
      const tick = (now: number) => {
        if (s.last !== '' && s.node.nodeValue !== s.last) { s.raf = 0; return; } // someone else changed it
        const k = Math.min(1, (now - t0) / FX.countDuration);
        const v = start + (parsed.value - start) * easeOutExpo(k);
        const out = k >= 1 ? s.final : formatNumberLike(parsed, v);
        s.last = out;
        s.node.nodeValue = out;
        s.raf = k < 1 ? requestAnimationFrame(tick) : 0;
      };
      s.last = '';
      s.raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          const s = states.get(e.target);
          if (!s) continue;
          if (e.intersectionRatio >= 0.4 && !s.seen) {
            s.seen = true;
            s.shownOnce = true;
            play(e.target);
          } else if (!e.isIntersecting && s.seen) {
            s.seen = false;
            stop(s);
            const pz = parseNumberText(s.final);
            const zero = pz ? formatNumberLike(pz, 0) : s.final;
            s.last = zero;
            s.node.nodeValue = zero; // reset off-screen so the next entry counts up from 0
          }
        }
      },
      { threshold: [0, 0.4] }
    );

    const register = (el: Element) => {
      if (states.has(el)) return;
      const node = textNodeOf(el);
      if (!node) return;
      const final = node.nodeValue || '';
      if (!parseNumberText(final)) return;
      const pz = parseNumberText(final)!;
      const zero = formatNumberLike(pz, 0);
      const st: State = { node, final, last: zero, raf: 0, seen: false, shownOnce: false };
      states.set(el, st);
      node.nodeValue = zero; // start at 0 so there is no flash of the final value
      io.observe(el);
    };

    // scroll scopes for CSS-only charts (e.g. .hbar-list): toggle data-fx so the CSS plays on entry / replays on re-entry
    const scopeIO = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.intersectionRatio >= 0.2) el.setAttribute('data-fx', 'in');
          else if (!e.isIntersecting) el.setAttribute('data-fx', 'out');
        }
      },
      { threshold: [0, 0.2] }
    );
    const scoped = new WeakSet<Element>();
    const registerScope = (el: Element) => {
      if (scoped.has(el) || el.hasAttribute('data-fx')) return; // React-driven scopes (useFxScope) manage themselves
      scoped.add(el);
      el.setAttribute('data-fx', 'out');
      scopeIO.observe(el);
    };

    const scan = (root: ParentNode) => {
      root.querySelectorAll(KPI_SELECTORS).forEach(register);
      root.querySelectorAll(SCOPE_SELECTORS).forEach(registerScope);
    };

    const mo = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'childList') {
          m.addedNodes.forEach(n => {
            if (n.nodeType !== Node.ELEMENT_NODE) return;
            const el = n as Element;
            if (el.matches?.(KPI_SELECTORS)) register(el);
            if (el.matches?.(SCOPE_SELECTORS)) registerScope(el);
            scan(el);
          });
        } else if (m.type === 'characterData') {
          const parent = (m.target as Text).parentElement;
          if (!parent) continue;
          const s = states.get(parent);
          if (!s) { if (parent.matches?.(KPI_SELECTORS)) register(parent); continue; }
          const now = (m.target as Text).nodeValue || '';
          if (now === s.last) continue;           // our own write
          if (s.raf && now !== s.final) { /* React rewrote it mid-animation */ }
          const prev = parseNumberText(s.final);
          s.node = m.target as Text;
          s.final = now;
          if (s.seen && parseNumberText(now)) play(parent, prev?.value ?? 0); // glide old → new
        }
      }
    });

    scan(document);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => { mo.disconnect(); io.disconnect(); scopeIO.disconnect(); states.forEach(stop); states.clear(); };
  }, []);

  return null;
}
