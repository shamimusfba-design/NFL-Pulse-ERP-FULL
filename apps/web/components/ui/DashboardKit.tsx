'use client';
// NOS DashboardKit — CrossFilterProvider, SlicerBar, DrillPopup & standardized 180/260 chart boxes (docs/UX-STANDARD.md §6, §7)
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { FxResponsiveContainer as ResponsiveContainer, FX_BAR, FX_PIE, FX_SERIES } from '../fx';
import { fmtJobsQty, fmtNum } from '../../lib/format';
import './dashboard.css';

/* ============================================================================
 * 2d. Locked Meaning Colours & Chart Heights
 * ============================================================================ */
export const NOS_CHART_COLORS = {
  required: 'var(--nos-required)', // #2563EB blue
  done: 'var(--nos-done)',         // #16A34A green
  balance: 'var(--nos-balance)',   // #DC2626 red
  mid: 'var(--nos-mid)',           // #D97706 amber
  ink: 'var(--nos-ink-2)',
  palette: ['#2563EB', '#16A34A', '#D97706', '#DC2626'],
};

export function ChartBox({
  size = 'sm',
  children,
  jobsCount,
  qty,
  unit,
  legend,
  onDoubleClick,
}: {
  size?: 'sm' | 'lg';
  children: React.ReactNode;
  jobsCount?: number;
  qty?: number;
  unit?: string;
  legend?: { label: string; color: string }[];
  onDoubleClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div onDoubleClick={onDoubleClick}>
      <div className={size === 'lg' ? 'nos-chart-lg' : 'nos-chart-sm'}>{children}</div>
      {(legend || (jobsCount !== undefined && qty !== undefined && unit)) && (
        <div className="nos-chart-meta">
          <div className="nos-chart-legend">
            {(legend || []).map((l) => (
              <span key={l.label} className="nos-chart-legend-item">
                <span className="nos-chart-swatch" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
          {jobsCount !== undefined && qty !== undefined && unit && (
            <strong>{fmtJobsQty(jobsCount, qty, unit)}</strong>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 2a. CrossFilterProvider
 * ============================================================================ */
export interface CrossFilterItem {
  field: string;
  value: string;
  label?: string;
}

interface CrossFilterContextValue {
  filters: CrossFilterItem[];
  toggle: (field: string, value: string, label?: string) => void;
  setFilter: (field: string, value: string, label?: string) => void;
  remove: (field: string, value?: string) => void;
  clear: () => void;
  isSelected: (field: string, value: string) => boolean;
  /** Returns 1 if no filter is active on `field` OR if `value` is selected; returns 0.3 on click-dimmed marks (never on hover) */
  getMarkOpacity: (field: string, value: string) => number;
  matches: (row: Record<string, unknown>) => boolean;
}

const CrossFilterCtx = createContext<CrossFilterContextValue>({
  filters: [],
  toggle: () => {},
  setFilter: () => {},
  remove: () => {},
  clear: () => {},
  isSelected: () => false,
  getMarkOpacity: () => 1,
  matches: () => true,
});

export function useCrossFilter() {
  return useContext(CrossFilterCtx);
}

export function CrossFilterProvider({
  children,
  initialFilters = [],
}: {
  children: React.ReactNode;
  initialFilters?: CrossFilterItem[];
}) {
  const [filters, setFilters] = useState<CrossFilterItem[]>(initialFilters);

  const toggle = useCallback((field: string, value: string, label?: string) => {
    setFilters((prev) => {
      const exists = prev.some((f) => f.field === field && f.value === value);
      if (exists) return prev.filter((f) => !(f.field === field && f.value === value));
      return [...prev.filter((f) => f.field !== field), { field, value, label }];
    });
  }, []);

  const setFilter = useCallback((field: string, value: string, label?: string) => {
    setFilters((prev) => {
      if (!value || value === 'ALL') return prev.filter((f) => f.field !== field);
      return [...prev.filter((f) => f.field !== field), { field, value, label }];
    });
  }, []);

  const remove = useCallback((field: string, value?: string) => {
    setFilters((prev) =>
      prev.filter((f) => (value ? !(f.field === field && f.value === value) : f.field !== field)),
    );
  }, []);

  const clear = useCallback(() => setFilters([]), []);

  const isSelected = useCallback(
    (field: string, value: string) => filters.some((f) => f.field === field && f.value === value),
    [filters],
  );

  const getMarkOpacity = useCallback(
    (field: string, value: string) => {
      const fieldFilters = filters.filter((f) => f.field === field);
      if (fieldFilters.length === 0) return 1;
      return fieldFilters.some((f) => String(f.value).toLowerCase() === String(value).toLowerCase()) ? 1 : 0.3;
    },
    [filters],
  );

  const matches = useCallback(
    (row: Record<string, unknown>) => {
      if (filters.length === 0) return true;
      return filters.every((f) => {
        const rv = row[f.field];
        if (rv === undefined || rv === null) return true;
        return String(rv).toLowerCase() === String(f.value).toLowerCase();
      });
    },
    [filters],
  );

  const ctxVal = useMemo(
    () => ({ filters, toggle, setFilter, remove, clear, isSelected, getMarkOpacity, matches }),
    [filters, toggle, setFilter, remove, clear, isSelected, getMarkOpacity, matches],
  );

  return <CrossFilterCtx.Provider value={ctxVal}>{children}</CrossFilterCtx.Provider>;
}

export function CrossFilterChips() {
  const { filters, remove, clear } = useCrossFilter();
  if (filters.length === 0) return null;
  return (
    <div className="nos-cf-chips" role="region" aria-label="Active filters">
      <span style={{ fontWeight: 600, color: 'var(--nos-ink-2)' }}>Filtered by:</span>
      {filters.map((f) => (
        <button
          key={`${f.field}:${f.value}`}
          type="button"
          className="nos-cf-chip"
          onClick={() => remove(f.field, f.value)}
          title="Remove filter"
        >
          <span>
            {f.label || f.field}: {f.value}
          </span>
          <span aria-hidden="true">✕</span>
        </button>
      ))}
      <button type="button" className="nos-cf-clear" onClick={clear}>
        Clear all
      </button>
    </div>
  );
}

/* ============================================================================
 * 2b. SlicerBar (Year, Month, Shipment week, Planning slot, Buyer, Factory)
 * ============================================================================ */
export interface SlicerState {
  year: string;
  month: string;
  week: string;
  slot: string;
  buyer: string;
  factory: string;
}

export function getDefaultSlicerState(defaultMonth?: string): SlicerState {
  const now = new Date();
  const y = String(now.getFullYear());
  const m = defaultMonth || `${y}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return {
    year: y,
    month: m,
    week: 'ALL',
    slot: 'ALL',
    buyer: 'ALL',
    factory: 'ALL',
  };
}

export interface SlicerBarProps {
  value: SlicerState;
  onChange: (next: SlicerState) => void;
  years?: string[];
  months?: { value: string; label: string }[];
  weeks?: string[];
  slots?: string[];
  buyers?: string[];
  factories?: string[];
  rightSlot?: React.ReactNode;
}

const DEFAULT_MONTHS = [
  { value: 'ALL', label: 'All Months' },
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-06', label: 'Jun 2026' },
  { value: '2026-07', label: 'Jul 2026' },
  { value: '2026-08', label: 'Aug 2026' },
  { value: '2026-09', label: 'Sep 2026' },
  { value: '2026-10', label: 'Oct 2026' },
  { value: '2026-11', label: 'Nov 2026' },
  { value: '2026-12', label: 'Dec 2026' },
];

const DEFAULT_SLOTS = ['ALL', 'Slot 1 (1–10)', 'Slot 2 (11–20)', 'Slot 3 (21–30)'];
const DEFAULT_WEEKS = ['ALL', 'W1', 'W2', 'W3', 'W4'];
const DEFAULT_FACTORIES = ['ALL', 'NFL', 'NCL', 'Sub-con'];

export function SlicerBar({
  value,
  onChange,
  years = ['ALL', '2026', '2025'],
  months = DEFAULT_MONTHS,
  weeks = DEFAULT_WEEKS,
  slots = DEFAULT_SLOTS,
  buyers = ['ALL', 'ONLY', 'OVS', 'H&M', 'ZARA', 'NEXT', 'C&A'],
  factories = DEFAULT_FACTORIES,
  rightSlot,
}: SlicerBarProps) {
  const { setFilter } = useCrossFilter();

  const update = (key: keyof SlicerState, val: string) => {
    const next = { ...value, [key]: val };
    onChange(next);
    if (key === 'buyer') setFilter('buyer', val, 'Buyer');
    if (key === 'factory') setFilter('factory', val, 'Factory');
    if (key === 'slot') setFilter('slot', val, 'Planning slot');
    if (key === 'month') setFilter('month', val, 'Shipment month');
  };

  return (
    <div className="nos-slicerbar" role="region" aria-label="Dashboard filters">
      <div className="nos-slicer-item">
        <span className="nos-slicer-label">Year</span>
        <select
          className="nos-slicer-select"
          value={value.year}
          onChange={(e) => update('year', e.target.value)}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y === 'ALL' ? 'All Years' : y}
            </option>
          ))}
        </select>
      </div>

      <div className="nos-slicer-item">
        <span className="nos-slicer-label">Shipment Month</span>
        <select
          className="nos-slicer-select"
          value={value.month}
          onChange={(e) => update('month', e.target.value)}
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="nos-slicer-item">
        <span className="nos-slicer-label">Shipment Week</span>
        <select
          className="nos-slicer-select"
          value={value.week}
          onChange={(e) => update('week', e.target.value)}
        >
          {weeks.map((w) => (
            <option key={w} value={w}>
              {w === 'ALL' ? 'All Weeks' : w}
            </option>
          ))}
        </select>
      </div>

      <div className="nos-slicer-item">
        <span className="nos-slicer-label">Planning Slot</span>
        <select
          className="nos-slicer-select"
          value={value.slot}
          onChange={(e) => update('slot', e.target.value)}
        >
          {slots.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All 10-Day Slots' : s}
            </option>
          ))}
        </select>
      </div>

      <div className="nos-slicer-item">
        <span className="nos-slicer-label">Buyer</span>
        <select
          className="nos-slicer-select"
          value={value.buyer}
          onChange={(e) => update('buyer', e.target.value)}
        >
          {buyers.map((b) => (
            <option key={b} value={b}>
              {b === 'ALL' ? 'All Buyers' : b}
            </option>
          ))}
        </select>
      </div>

      <div className="nos-slicer-item">
        <span className="nos-slicer-label">Factory</span>
        <select
          className="nos-slicer-select"
          value={value.factory}
          onChange={(e) => update('factory', e.target.value)}
        >
          {factories.map((f) => (
            <option key={f} value={f}>
              {f === 'ALL' ? 'All Factories' : f}
            </option>
          ))}
        </select>
      </div>

      {rightSlot && <div style={{ marginLeft: 'auto' }}>{rightSlot}</div>}
    </div>
  );
}

/* ============================================================================
 * 2c. DrillPopup (Square bubble ABOVE clicked mark, opens on DOUBLE-CLICK,
 *     auto chart type: 2-5 donut, >=6 sorted horizontal bar, time -> trend line,
 *     last level -> job list; 2-3 breakdown switchers; outside click + Esc + ×)
 * ============================================================================ */
export type DrillBreakdownDimension = 'factory' | 'buyer' | 'time' | 'job';

export interface DrillDatum {
  name: string;
  qty: number;
  jobsCount?: number;
  style?: string;
  color?: string;
  filterField?: string;
  filterValue?: string;
}

export interface DrillPopupTarget {
  title: string;
  unit: string;
  anchorX: number;
  anchorY: number;
  filterField?: string;
  filterValue?: string;
  factoryLabel?: string;
  buyerLabel?: string;
  timeLabel?: string;
  byFactory?: DrillDatum[];
  byBuyer?: DrillDatum[];
  byTime?: DrillDatum[];
  jobs?: { jobNo: string; buyer: string; style?: string; qty: number }[];
  defaultDim?: DrillBreakdownDimension;
}

/**
 * Helper hook for charts: single-click triggers cross-filter (`onSingleClick`),
 * double-click (two clicks within 260ms OR native dblclick) opens `DrillPopup` (`onDoubleClick`).
 */
export function useChartDrillGesture() {
  const clickTimerRef = useRef<{ time: number; key: string; x: number; y: number } | null>(null);

  const handleMarkInteraction = useCallback(
    (
      key: string,
      event: { clientX?: number; clientY?: number } | React.MouseEvent | undefined,
      onSingleClick: () => void,
      onDoubleClick: (anchorX: number, anchorY: number) => void,
    ) => {
      const now = Date.now();
      const x =
        event && typeof event.clientX === 'number' && event.clientX > 0
          ? event.clientX
          : typeof window !== 'undefined'
          ? window.innerWidth / 2
          : 640;
      const y =
        event && typeof event.clientY === 'number' && event.clientY > 0
          ? event.clientY
          : 340;

      const prev = clickTimerRef.current;
      if (prev && prev.key === key && now - prev.time < 320) {
        clickTimerRef.current = null;
        onDoubleClick(x, y);
      } else {
        clickTimerRef.current = { time: now, key, x, y };
        onSingleClick();
      }
    },
    [],
  );

  return { handleMarkInteraction };
}

export function DrillPopup({
  target,
  onClose,
  onShowInTable,
}: {
  target: DrillPopupTarget | null;
  onClose: () => void;
  onShowInTable?: (filterField?: string, filterValue?: string) => void;
}) {
  const { setFilter } = useCrossFilter();
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState<DrillBreakdownDimension>('factory');

  const availableDims = useMemo(() => {
    if (!target) return [] as { id: DrillBreakdownDimension; label: string }[];
    const list: { id: DrillBreakdownDimension; label: string }[] = [];
    if (target.byFactory && target.byFactory.length > 0) {
      list.push({ id: 'factory', label: target.factoryLabel || 'Factory' });
    }
    if (target.byBuyer && target.byBuyer.length > 0) {
      list.push({ id: 'buyer', label: target.buyerLabel || 'Buyer' });
    }
    if (target.byTime && target.byTime.length > 0) {
      list.push({ id: 'time', label: target.timeLabel || 'Time' });
    }
    if (target.jobs && target.jobs.length > 0) {
      list.push({ id: 'job', label: 'Job' });
    }
    return list;
  }, [target]);

  useEffect(() => {
    if (!target) return;
    if (target.defaultDim && availableDims.some((d) => d.id === target.defaultDim)) {
      setDim(target.defaultDim);
    } else if (availableDims.length > 0) {
      setDim(availableDims[0].id);
    } else {
      setDim('job');
    }
  }, [target, availableDims]);

  // Close on Escape and outside click
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onMouseDown = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [target, onClose]);

  if (!target) return null;

  const currentItems: DrillDatum[] =
    dim === 'factory'
      ? target.byFactory || []
      : dim === 'buyer'
      ? target.byBuyer || []
      : dim === 'time'
      ? target.byTime || []
      : (target.jobs || []).map((j) => ({
          name: `${j.buyer} ${j.jobNo}`,
          qty: j.qty,
          jobsCount: 1,
          style: j.style,
          filterField: 'jobNo',
          filterValue: j.jobNo,
        }));

  const totalQty = currentItems.reduce((s, d) => s + (Number(d.qty) || 0), 0);
  const totalJobs =
    (target.jobs && target.jobs.length) ||
    currentItems.reduce((s, d) => s + (d.jobsCount ?? 0), 0);

  // Square bubble directly ABOVE clicked mark unless there is no room at the top of the page
  const bubbleSize = 330;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1366;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const placeAbove = target.anchorY >= bubbleSize + 18;
  const left = Math.max(12, Math.min(vw - bubbleSize - 12, target.anchorX - bubbleSize / 2));
  const top = placeAbove
    ? Math.max(12, target.anchorY - bubbleSize - 12)
    : Math.min(vh - bubbleSize - 12, target.anchorY + 14);
  const arrowLeft = Math.max(18, Math.min(bubbleSize - 24, target.anchorX - left - 5));

  const formatDatumSummary = (d: DrillDatum) => {
    const valStr = `${fmtNum(Number(d.qty.toFixed(1)))} ${target.unit}`;
    if (d.jobsCount !== undefined && d.jobsCount > 0) {
      return `${ fmtJobsQty(d.jobsCount, Number(d.qty.toFixed(1)), target.unit) }`;
    }
    return valStr;
  };

  // Never a popup inside a popup: clicking inside the popup filters the table and closes
  const handleInnerItemClick = (item: DrillDatum) => {
    const fField =
      item.filterField ||
      (dim === 'buyer' ? 'buyer' : dim === 'factory' ? target.filterField || 'factory' : target.filterField);
    const fVal = item.filterValue || item.name;
    if (fField && fVal) {
      setFilter(fField, fVal, item.name);
      onShowInTable?.(fField, fVal);
    } else if (target.filterField && target.filterValue) {
      setFilter(target.filterField, target.filterValue, target.title);
      onShowInTable?.(target.filterField, target.filterValue);
    } else {
      onShowInTable?.(fField, fVal);
    }
    onClose();
  };

  const handleShowInTableClick = () => {
    if (target.filterField && target.filterValue) {
      setFilter(target.filterField, target.filterValue, target.title);
    }
    onShowInTable?.(target.filterField, target.filterValue);
    if (typeof document !== 'undefined') {
      const gridEl = document.querySelector('.nos-grid-wrap');
      if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    onClose();
  };

  const sortedBars = [...currentItems].sort((a, b) => b.qty - a.qty).slice(0, 8);

  return (
    <div className="nos-drill-backdrop" onClick={onClose}>
      <div
        ref={bubbleRef}
        className={`nos-drill-bubble ${placeAbove ? 'above' : 'below'}`}
        style={{ left, top }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={target.title}
      >
        <span className="nos-drill-arrow" style={{ left: arrowLeft }} />

        <div className="nos-drill-hd">
          <div>
            <div className="nos-drill-title">{target.title}</div>
            <div className="nos-drill-sub">
              {totalJobs > 0
                ? fmtJobsQty(totalJobs, Number(totalQty.toFixed(1)), target.unit)
                : `${fmtNum(Number(totalQty.toFixed(1)))} ${target.unit}`}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 0,
              color: 'var(--nos-ink-3)',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              padding: '2px 4px',
            }}
            aria-label="Close popup"
          >
            ×
          </button>
        </div>

        {/* 2-3 small buttons at the top switch the breakdown (only showing ones that have data) */}
        {availableDims.length > 1 && (
          <div className="nos-drill-switch" role="tablist">
            {availableDims.map((d) => (
              <button
                key={d.id}
                type="button"
                className={dim === d.id ? 'active' : ''}
                onClick={() => setDim(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}

        {/* Inner chart chosen by shape of the data:
            - dim === 'job' -> short job list
            - dim === 'time' -> trend line
            - 2..5 parts -> donut
            - 6 or more parts (or 1 part) -> sorted horizontal bar, biggest first */}
        <div className="nos-drill-body">
          {dim === 'job' ? (
            <div className="nos-drill-jobs">
              {(target.jobs || []).slice(0, 12).map((j, i) => (
                <button
                  key={`${j.jobNo}-${i}`}
                  type="button"
                  className="nos-drill-job-row"
                  onClick={() => {
                    setFilter('jobNo', j.jobNo, `${j.buyer} ${j.jobNo}`);
                    onShowInTable?.('jobNo', j.jobNo);
                    onClose();
                  }}
                >
                  <div style={{ textAlign: 'left', minWidth: 0 }}>
                    <strong>
                      {j.buyer} · {j.jobNo}
                    </strong>
                    {j.style && (
                      <span style={{ color: 'var(--nos-ink-3)', marginLeft: 6 }}>{j.style}</span>
                    )}
                  </div>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    1 job · {fmtNum(Number(j.qty.toFixed(1)))} {target.unit}
                  </span>
                </button>
              ))}
            </div>
          ) : dim === 'time' ? (
            <div style={{ width: '100%', height: 185 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={currentItems}
                  margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
                  onClick={(state: { activePayload?: { payload?: DrillDatum }[] }) => {
                    const p = state?.activePayload?.[0]?.payload;
                    if (p) handleInnerItemClick(p);
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(_v: unknown, _n: unknown, item: { payload?: DrillDatum }) => [
                      item?.payload ? formatDatumSummary(item.payload) : '',
                      target.title,
                    ]}
                  />
                  <Line
                    {...FX_SERIES}
                    type="monotone"
                    dataKey="qty"
                    stroke="#2563EB"
                    strokeWidth={2.2}
                    dot={{ r: 3.5, fill: '#2563EB' }}
                    activeDot={{ r: 5, fill: '#2563EB' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : currentItems.length >= 2 && currentItems.length <= 5 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, alignItems: 'center', height: 185 }}>
              <div style={{ width: '100%', height: 150 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      {...FX_PIE}
                      data={currentItems}
                      dataKey="qty"
                      nameKey="name"
                      innerRadius={32}
                      outerRadius={54}
                      onClick={(data: DrillDatum) => {
                        if (data) handleInnerItemClick(data);
                      }}
                    >
                      {currentItems.map((entry, idx) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color || NOS_CHART_COLORS.palette[idx % NOS_CHART_COLORS.palette.length]}
                          cursor="pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(_v: unknown, n: unknown, item: { payload?: DrillDatum }) => [
                        item?.payload ? formatDatumSummary(item.payload) : '',
                        String(n),
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto', maxHeight: 175 }}>
                {currentItems.map((item, idx) => (
                  <button
                    key={item.name}
                    type="button"
                    className="nos-drill-job-row"
                    onClick={() => handleInnerItemClick(item)}
                    style={{ padding: '4px 6px' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                      <span
                        className="nos-chart-swatch"
                        style={{
                          background: item.color || NOS_CHART_COLORS.palette[idx % NOS_CHART_COLORS.palette.length],
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11, color: 'var(--nos-ink-2)', whiteSpace: 'nowrap' }}>
                      {formatDatumSummary(item)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', height: 185 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sortedBars}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 6, bottom: 4 }}
                  onClick={(state: { activePayload?: { payload?: DrillDatum }[] }) => {
                    const p = state?.activePayload?.[0]?.payload;
                    if (p) handleInnerItemClick(p);
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={84} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(_v: unknown, _n: unknown, item: { payload?: DrillDatum }) => [
                      item?.payload ? formatDatumSummary(item.payload) : '',
                      'Breakdown',
                    ]}
                  />
                  <Bar
                    {...FX_SERIES}
                    {...FX_BAR}
                    dataKey="qty"
                    fill="#2563EB"
                    radius={[0, 3, 3, 0]}
                    cursor="pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="nos-drill-ft">
          <button
            type="button"
            className="nos-drill-link"
            onClick={handleShowInTableClick}
          >
            Show these jobs in the table →
          </button>
        </div>
      </div>
    </div>
  );
}
