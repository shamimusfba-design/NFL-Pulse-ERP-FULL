'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FX, prefersReducedMotion } from './motion';
import { useInView } from './useInView';
import { easeOutExpo, formatNumberLike, parseNumberText } from './countUpCore';

/**
 * Animated number. Accepts a number or an already formatted string ("12,450", "85.4%", "1.2K pcs").
 * Counts up from 0 when it scrolls into view, keeps the original formatting.
 */
export function CountUp({ value, duration = FX.countDuration }: { value: number | string; duration?: number }) {
  const text = typeof value === 'number' ? String(value) : value;
  const parsed = parseNumberText(text);
  const { ref, inView, plays } = useInView<HTMLSpanElement>({ replay: true, threshold: 0.4 });
  const [shown, setShown] = useState<string>(parsed && !prefersReducedMotion() ? formatNumberLike(parsed, 0) : text);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!parsed || prefersReducedMotion()) { setShown(text); return; }
    if (!inView) { setShown(formatNumberLike(parsed, 0)); return; }
    let t0 = -1;
    const tick = (now: number) => {
      if (t0 < 0) t0 = now;
      const k = Math.min(1, (now - t0) / duration);
      setShown(formatNumberLike(parsed, parsed.value * easeOutExpo(k)));
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, inView, plays, duration]);

  return <span ref={ref} className="fx-num">{shown}</span>;
}
