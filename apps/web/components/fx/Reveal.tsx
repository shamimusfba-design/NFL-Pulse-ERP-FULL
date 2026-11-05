'use client';

import React from 'react';
import { useInView } from './useInView';

/**
 * Scroll-in reveal for any card / panel / block.
 *   <Reveal delay={2}>…card…</Reveal>      (delay = stagger slot, 0-10)
 */
export function Reveal({
  children,
  delay = 0,
  replay = false,
  as: Tag = 'div',
  className = '',
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  replay?: boolean;
  as?: any;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ replay, threshold: 0.1 });
  return (
    <Tag
      ref={ref}
      data-fx={inView ? 'in' : 'out'}
      className={`fx-reveal ${className}`.trim()}
      style={{ ['--fx-i' as any]: delay, ...style }}
    >
      {children}
    </Tag>
  );
}
