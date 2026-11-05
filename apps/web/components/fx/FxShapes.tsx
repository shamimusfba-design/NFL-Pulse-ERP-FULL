'use client';

import React from 'react';
import { Rectangle, Sector } from 'recharts';
import { FX, FX_SERIES } from './motion';

/**
 * Bar shape used by every Recharts <Bar> (via FX_BAR):
 * - soft gradient fill in the bar's own colour
 * - each bar rises from the baseline one after another (stagger by index)
 * - when a bar's value changes (filter), that bar rebuilds from zero
 * Works for vertical and horizontal (layout="vertical") bar charts and stacked bars.
 */
export function FxBarShape(props: any) {
  const { x, y, width, height, fill, index = 0, background } = props;
  if (![x, y, width, height].every(v => typeof v === 'number' && Number.isFinite(v))) return null;
  const horizontal =
    !!background &&
    Math.abs((background.height ?? 0) - Math.abs(height)) < 1 &&
    (background.width ?? 0) > Math.abs(width) + 1;
  const color = typeof fill === 'string' && !fill.startsWith('url(') ? fill : '#2563eb';
  const id = `fxg-${color.replace(/[^a-zA-Z0-9]/g, '')}-${horizontal ? 'h' : 'v'}`;
  return (
    <g
      key={`${index}-${Math.round(width)}-${Math.round(height)}`}
      className={horizontal ? 'fx-rbar fx-rbar-h' : 'fx-rbar'}
      style={{ ['--fx-i' as any]: Math.min(index, 24) }}
    >
      <defs>
        {horizontal ? (
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={0.6} />
            <stop offset="100%" stopColor={color} stopOpacity={1} />
          </linearGradient>
        ) : (
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={1} />
            <stop offset="100%" stopColor={color} stopOpacity={0.6} />
          </linearGradient>
        )}
      </defs>
      <Rectangle {...props} fill={`url(#${id})`} />
    </g>
  );
}

/** Hovered donut / pie slice grows outwards with a soft shadow. */
export function FxActiveSector(props: any) {
  return (
    <Sector
      {...props}
      outerRadius={(props.outerRadius || 0) + 7}
      style={{ filter: 'drop-shadow(0 6px 10px rgba(15, 23, 42, 0.28))', cursor: 'pointer' }}
    />
  );
}

/** Spread on every <Bar>:  <Bar {...FX_BAR} dataKey="x" />  (CSS does the staggered rise) */
export const FX_BAR = { isAnimationActive: false, shape: FxBarShape } as const;

/** Spread on every <Pie>:  clockwise sweep from 12 o'clock + hover pop-out */
export const FX_PIE = {
  ...FX_SERIES,
  animationBegin: 120,
  animationDuration: FX.duration + 300,
  startAngle: 90,
  endAngle: -270,
  activeShape: FxActiveSector,
} as const;
