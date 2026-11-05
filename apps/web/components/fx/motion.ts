// NOS chart & card motion standard — single source of truth.
// Every chart, KPI number and card in the app takes its timing from here (and from the
// matching --fx-* variables in globals.css). Change it once, the whole app follows.

export const FX = {
  /** Main chart draw / grow duration (ms) */
  duration: 1100,
  /** Delay between sibling elements, e.g. bars / donut segments (ms) */
  stagger: 70,
  /** Count-up duration for KPI numbers (ms) */
  countDuration: 1200,
  /** CSS easing used by Recharts animations */
  easing: 'ease-out' as const,
  /** Fraction of the chart that must be visible before it plays */
  enterThreshold: 0.25,
};

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Spread onto every Recharts <Bar>, <Line>, <Area>, <Pie>, <Radar> ... :
 *   <Line {...FX_SERIES} dataKey="x" />   (Bar uses FX_BAR, Pie uses FX_PIE — see FxShapes.tsx)
 * Charts only mount client-side (after they scroll into view), so reading
 * matchMedia at module load is safe — no hydration mismatch.
 */
export const FX_SERIES = {
  isAnimationActive: !prefersReducedMotion(),
  animationDuration: FX.duration,
  animationEasing: FX.easing,
};
