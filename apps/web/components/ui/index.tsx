'use client';
// NOS shared UI components (docs/UX-STANDARD.md). Same card, button, badge and bar on every page.
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/* ---------------- Card ---------------- */
export function Card({ title, action, children, className = '', style }: {
  title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <section className={`nos-card ${className}`} style={style}>
      {(title || action) && (
        <div className="nos-card-hd">
          <b>{title}</b>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------------- KPI card: label, big number, delta, sparkline ---------------- */
export function KpiCard({ label, value, unit, delta, deltaDirection, series = [], onClick, onDoubleClick }: {
  label: string; value: string | number; unit?: string;
  delta?: string; deltaDirection?: 'up' | 'down' | 'flat';
  series?: number[]; onClick?: (e: React.MouseEvent<HTMLDivElement>) => void; onDoubleClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const dir = deltaDirection ?? 'flat';
  const colour = dir === 'up' ? 'var(--nos-done)' : dir === 'down' ? 'var(--nos-balance)' : 'var(--nos-ink-3)';
  const points = useMemo(() => {
    if (series.length < 2) return '';
    const min = Math.min(...series), max = Math.max(...series), span = max - min || 1;
    return series.map((v, i) => `${(i / (series.length - 1)) * 76 + 2},${22 - ((v - min) / span) * 18}`).join(' ');
  }, [series]);
  return (
    <div
      className="nos-card nos-kpi"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={onClick || onDoubleClick ? { cursor: 'pointer' } : undefined}
    >
      <span className="nos-kpi-l">{label}</span>
      <span className="nos-kpi-v">{value}{unit ? <span className="u">{unit}</span> : null}</span>
      <span className="nos-kpi-f">
        <span className={dir === 'up' ? 'nos-up' : dir === 'down' ? 'nos-down' : 'nos-flat'}>{delta ?? ''}</span>
        {points && (
          <svg width="80" height="24" viewBox="0 0 80 24" aria-hidden="true">
            <polyline points={points} fill="none" stroke={colour} strokeWidth="1.6" />
          </svg>
        )}
      </span>
    </div>
  );
}

/* ---------------- Button ---------------- */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; size?: 'md' | 'sm';
};
export function Button({ variant = 'secondary', size = 'md', className = '', ...rest }: BtnProps) {
  return <button {...rest} className={`nos-btn nos-btn-${variant} ${size === 'sm' ? 'nos-btn-sm' : ''} ${className}`} />;
}

/* ---------------- Badge ---------------- */
export function Badge({ tone = 'quiet', children }: { tone?: 'done' | 'balance' | 'mid' | 'info' | 'quiet'; children: React.ReactNode }) {
  return <span className={`nos-badge nos-badge-${tone}`}>{children}</span>;
}

/* ---------------- Command bar: New / Save / Print / Export, same place everywhere ---------------- */
export function CommandBar({ left, right }: { left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="nos-cmdbar">
      {left}
      <span className="spacer" />
      {right}
    </div>
  );
}

/* ---------------- One-line alert (never a teaching banner) ---------------- */
export function Alert({ tone = 'info', children, action }: { tone?: 'warn' | 'danger' | 'info'; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className={`nos-alert nos-alert-${tone}`} role={tone === 'danger' ? 'alert' : undefined}>
      <span>{children}</span>
      <span className="spacer" />
      {action}
    </div>
  );
}

/* ---------------- Skeleton ---------------- */
export function Skeleton({ width = '100%', height = 14, style }: { width?: number | string; height?: number | string; style?: React.CSSProperties }) {
  return <span className="nos-sk" style={{ display: 'block', width, height, ...style }} aria-hidden="true" />;
}
export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, gap: 8, padding: '6px 0' }}>
          {Array.from({ length: cols }).map((__, c) => <Skeleton key={c} height={12} />)}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Empty state ---------------- */
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="nos-empty">
      <b>{title}</b>
      {hint && <span>{hint}</span>}
      {action}
    </div>
  );
}

/* ---------------- Toast ---------------- */
type Toast = { id: number; tone: 'ok' | 'err' | 'info'; text: string };
const ToastCtx = createContext<{ show: (text: string, tone?: Toast['tone']) => void }>({ show: () => {} });
export function useToast() { return useContext(ToastCtx); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const show = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, tone, text }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);
  const value = useMemo(() => ({ show }), [show]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="nos-toasts" role="status" aria-live="polite">
        {items.map((t) => <div key={t.id} className={`nos-toast nos-toast-${t.tone}`}>{t.text}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

export { default as DataGrid } from './DataGrid';
export type { GridColumn, DataGridProps, Align } from './DataGrid';
export { default as RecordPanel } from './RecordPanel';
export type { Field, RecordSection, RecordHistoryEntry, RecordPanelProps } from './RecordPanel';
export {
  CrossFilterProvider,
  useCrossFilter,
  CrossFilterChips,
  SlicerBar,
  getDefaultSlicerState,
  DrillPopup,
  useChartDrillGesture,
  ChartBox,
  NOS_CHART_COLORS,
  ActiveFiltersBar,
  CrossFilterBar,
  rechartsClick,
  rechartsChartClick,
} from './DashboardKit';
export type {
  CrossFilterItem,
  SlicerState,
  SlicerBarProps,
  DrillBreakdownDimension,
  DrillDatum,
  DrillPopupTarget,
  DrillTarget,
  DrillBreakdown,
  DrillChartKind,
  DrillColour,
  DrillSlice,
  DrillJobRow,
  DrillSourceFilter,
  DrillPopupSpec,
} from './DashboardKit';
export { default as SectionNav } from './SectionNav';
export type { SectionNavItem, SectionNavProps } from './SectionNav';
