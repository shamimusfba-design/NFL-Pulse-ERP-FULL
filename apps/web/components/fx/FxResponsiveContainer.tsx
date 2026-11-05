'use client';

import React from 'react';
import { ResponsiveContainer } from 'recharts';
import { useInView } from './useInView';

type Dim = number | `${number}%` | string;

/**
 * Drop-in replacement for Recharts' <ResponsiveContainer>.
 * The chart is mounted only when it scrolls into view, so its built-in animation
 * (bars rising, donut sweeping, lines drawing) plays exactly when the person sees it,
 * and plays again from zero when they scroll away and come back.
 *
 * Usage is identical:  <ResponsiveContainer width="100%" height={260}> ... </ResponsiveContainer>
 * (import { FxResponsiveContainer as ResponsiveContainer } from '<path>/components/fx')
 */
export function FxResponsiveContainer({
  width = '100%',
  height = '100%',
  replay = true,
  children,
  ...rest
}: {
  width?: Dim;
  height?: Dim;
  replay?: boolean;
  children: React.ReactElement;
  [k: string]: any;
}) {
  const { ref, inView, plays } = useInView<HTMLDivElement>({ replay });
  return (
    <div ref={ref} className="fx-chart-slot" style={{ width: width as any, height: height as any, minWidth: 0 }}>
      {inView && (
        <ResponsiveContainer key={plays} width="100%" height="100%" {...rest}>
          {children}
        </ResponsiveContainer>
      )}
    </div>
  );
}
