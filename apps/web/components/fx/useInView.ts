'use client';

import { useEffect, useRef, useState } from 'react';
import { FX, prefersReducedMotion } from './motion';

/**
 * Scroll-aware visibility. `inView` becomes true once enough of the element is on screen and
 * false again only when it has fully left the viewport — so scrolling away and back replays the
 * animation from zero. `plays` increments every time it enters (use it as a React `key`).
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(opts?: { replay?: boolean; threshold?: number }) {
  const replay = opts?.replay ?? true;
  const threshold = opts?.threshold ?? FX.enterThreshold;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const [plays, setPlays] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      setPlays(1);
      return;
    }
    let visible = false;
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (!visible && e.intersectionRatio >= threshold) {
            visible = true;
            setInView(true);
            setPlays(p => p + 1);
            if (!replay) io.disconnect();
          } else if (visible && !e.isIntersecting) {
            visible = false;
            setInView(false);
          }
        }
      },
      { threshold: [0, threshold] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [replay, threshold]);

  return { ref, inView, plays };
}

/**
 * For hand-built SVG/CSS charts. Put `ref` and `data-fx={state}` on the chart root;
 * the .fx-* classes in globals.css animate everything inside when state === 'in'.
 */
export function useFxScope<T extends HTMLElement = HTMLDivElement>(opts?: { replay?: boolean }) {
  const { ref, inView } = useInView<T>(opts);
  return { ref, 'data-fx': inView ? 'in' : 'out' } as const;
}
