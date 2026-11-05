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

const BIG_NUMBER_RE = /^[৳$€£]?\s*-?\d[\d,]*(\.\d+)?\s*(%|[KkMm])?$/;

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
      let t0 = -1; // start the clock on the first painted frame, so a busy page still shows the full count
      const requested = performance.now();
      const tick = (now: number) => {
        if (t0 < 0) {
          // browser was too busy to start in time: never flash 0 late — just keep the real value
          if (now - requested > 900) { s.last = s.final; s.node.nodeValue = s.final; s.raf = 0; return; }
          t0 = now;
        }
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
      // keep the real value visible until the count actually starts (a busy page must never show 0s)
      const st: State = { node, final, last: final, raf: 0, seen: false, shownOnce: false };
      states.set(el, st);
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

    // ---------------------------------------------------------------------------------------
    // Automatic motion for any div/i bar and any KPI card in the app (no code changes needed).
    // Uses the Web Animations API only, so React-owned attributes/styles are never modified.
    // ---------------------------------------------------------------------------------------
    type Motion = { el: HTMLElement; kind: 'barY' | 'barX' | 'card'; anim: Animation | null; idx: number };
    const motions = new Map<Element, Motion>();
    const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const frames: Record<Motion['kind'], Keyframe[]> = {
      barY: [{ transform: 'scaleY(0)', transformOrigin: '50% 100%', opacity: 0.35 }, { transform: 'scaleY(1)', transformOrigin: '50% 100%', opacity: 1 }],
      barX: [{ transform: 'scaleX(0)', transformOrigin: '0 50%', opacity: 0.35 }, { transform: 'scaleX(1)', transformOrigin: '0 50%', opacity: 1 }],
      card: [{ opacity: 0, transform: 'translate3d(0, 18px, 0) scale(0.97)' }, { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }],
    };
    const arm = (m: Motion) => {
      // hold the first frame (hidden) until the element scrolls into view
      m.anim?.cancel();
      m.anim = m.el.animate(frames[m.kind], {
        duration: m.kind === 'card' ? 750 : 950,
        delay: Math.min(m.idx, 14) * (m.kind === 'card' ? 70 : 60),
        easing: EASE,
        fill: 'backwards',
      });
      m.anim.pause();
      m.anim.currentTime = 0;
    };
    const motionIO = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          const m = motions.get(e.target);
          if (!m) continue;
          if (e.intersectionRatio >= 0.15) { if (m.anim && m.anim.playState === 'paused') m.anim.play(); }
          else if (!e.isIntersecting) arm(m); // reset so it replays next time
        }
      },
      { threshold: [0, 0.15] }
    );
    const siblingIndex = (el: Element) => {
      const p = el.parentElement;
      if (!p) return 0;
      let i = 0;
      for (const c of Array.from(p.children)) { if (c === el) return i; i++; }
      return 0;
    };
    const addMotion = (el: HTMLElement, kind: Motion['kind'], idx: number) => {
      if (motions.has(el)) return;
      const m: Motion = { el, kind, anim: null, idx };
      motions.set(el, m);
      arm(m);
      motionIO.observe(el);
    };
    const coloured = (cs: CSSStyleDeclaration) => {
      const bg = cs.backgroundColor;
      return (bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bg)) || (cs.backgroundImage && cs.backgroundImage !== 'none');
    };
    const isLength = (v: string) => /^\d*\.?\d+(px|%)$/.test(v);
    const detectBar = (el: HTMLElement) => {
      if (motions.has(el) || el.closest('[data-fx-ignore], table, .recharts-wrapper, [data-fx]')) return;
      if (el.matches('.fx-bar, .fx-hbar, .hbar-row i, input, select, textarea, button, img, svg, a')) return;
      if ((el.textContent || '').trim().length > 6) return;
      const st = el.style;
      const w = st.width, h = st.height;
      const cs = getComputedStyle(el);
      if (cs.position === 'absolute' || cs.position === 'fixed' || cs.position === 'sticky') return;
      if (!coloured(cs)) return;
      if (parseFloat(cs.borderTopLeftRadius) >= 50 && cs.borderTopLeftRadius.endsWith('%')) return; // dots
      const r = el.getBoundingClientRect();
      if (r.width < 2 && r.height < 2) return;
      const vertical = isLength(h) && h !== '100%' && r.width <= 90;
      const horizontal = isLength(w) && w !== '100%' && r.height <= 22 && r.width >= 1;
      if (vertical && !(r.width <= 14 && r.height <= 14)) addMotion(el, 'barY', siblingIndex(el.closest('[style*="flex"] > *') || el));
      else if (horizontal && !(r.width <= 14 && r.height <= 14)) addMotion(el, 'barX', 0);
    };
    const cardOf = (numEl: Element): HTMLElement | null => {
      let el = numEl.parentElement;
      for (let d = 0; el && d < 5; d++, el = el.parentElement) {
        if (el.closest('table, [data-fx-ignore]')) return null;
        const cs = getComputedStyle(el);
        const framed = parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0 || cs.boxShadow !== 'none';
        if (framed && parseFloat(cs.borderTopLeftRadius) > 0) return el;
      }
      return null;
    };
    let pending = 0;
    const safeAutoScan = () => { try { autoScan(); } catch (err) { pending = 0; console.warn('[fx] auto scan skipped', err); } };
    const autoScan = () => {
      pending = 0;
      document.querySelectorAll<HTMLElement>('div[style*="width"], div[style*="height"], i[style*="width"], i[style*="height"], span[style*="height"]').forEach(detectBar);
      // big standalone numbers on cards (font ≥ 18px) count up too — covers inline-styled KPI cards
      document.querySelectorAll<HTMLElement>('span, strong, b, div, p, h2, h3, h4').forEach(el => {
        if (states.has(el) || el.firstChild?.nodeType !== Node.TEXT_NODE) return;
        // the number is the element's first text; anything after it must be small unit elements ("989 <span>Tons</span>")
        if (Array.from(el.childNodes).slice(1).some(c => c.nodeType === Node.TEXT_NODE ? /\d/.test(c.nodeValue || '') : (c as Element).children?.length > 0)) return;
        const t = (el.firstChild.nodeValue || '').trim();
        if (!BIG_NUMBER_RE.test(t) || t.length > 16) return;
        if (el.closest('table, [data-fx-ignore], select, button, .recharts-wrapper, svg')) return;
        if (parseFloat(getComputedStyle(el).fontSize) < 18) return;
        el.setAttribute('data-fx-count', '');
        register(el);
        const card = cardOf(el);
        if (card) addMotion(card, 'card', siblingIndex(card));
      });
      document.querySelectorAll(KPI_SELECTORS).forEach(n => {
        const card = cardOf(n);
        if (card) addMotion(card, 'card', siblingIndex(card));
      });
    };
    const queueAutoScan = () => { if (!pending) pending = window.setTimeout(safeAutoScan, 120); };
    (window as any).__nosFxScan = autoScan; // debugging hook

    const scan = (root: ParentNode) => {
      root.querySelectorAll(KPI_SELECTORS).forEach(register);
      root.querySelectorAll(SCOPE_SELECTORS).forEach(registerScope);
      queueAutoScan();
    };

    const mo = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'childList') {
          if (m.addedNodes.length) queueAutoScan();
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

    return () => { mo.disconnect(); io.disconnect(); scopeIO.disconnect(); motionIO.disconnect(); if (pending) clearTimeout(pending); motions.forEach(m => m.anim?.cancel()); motions.clear(); states.forEach(stop); states.clear(); };
  }, []);

  return null;
}
