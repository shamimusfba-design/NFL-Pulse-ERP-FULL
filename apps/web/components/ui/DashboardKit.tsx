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
  /** alias of field, used by some pages */
  key?: string;
  field?: string;
  value: string;
  label?: string;
}

interface CrossFilterContextValue {
  filters: CrossFilterItem[];
  toggle: (fieldOrItem: string | CrossFilterItem, value?: string, label?: string) => void;
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

  const toggle = useCallback((fieldOrItem: string | CrossFilterItem, valueArg?: string, labelArg?: string) => {
    const isItem = typeof fieldOrItem !== 'string';
    const field: string = isItem ? ((fieldOrItem as CrossFilterItem).field || (fieldOrItem as CrossFilterItem).key || '') : fieldOrItem;
    const value: string = isItem ? (fieldOrItem as CrossFilterItem).value : (valueArg ?? '');
    const label = isItem ? (fieldOrItem as CrossFilterItem).label : labelArg;
    setFilters((prev) => {
      const exists = prev.some((f) => f.field === field && f.value === value);
      if (exists) return prev.filter((f) => !(f.field === field && f.value === value));
      const next: CrossFilterItem = label ? { field, value, label } : { field, value };
      return [...prev.filter((f) => f.field !== field), next];
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
        const rv = row[f.field ?? f.key ?? ''];
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
          onClick={() => remove(f.field ?? f.key ?? '', f.value)}
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
export type DrillBreakdownDimension = 'factory' | 'buyer' | 'job' | 'time' | 'reason' | 'line' | 'item' | 'other';
export type DrillChartKind = 'donut' | 'bar' | 'line' | 'jobs';
export type DrillColour = 'blue' | 'green' | 'red' | 'amber' | 'grey';

/** One clickable part of a breakdown (a factory, a buyer, a day …). */
export interface DrillSlice {
  key: string;
  label: string;
  value: number;
  jobs?: number;
  /** second series, used by the line chart (e.g. actual against plan) */
  value2?: number;
  /** value written into the page filter when this slice is picked */
  filterValue?: string;
}

export interface DrillJobRow {
  jobNo: string;
  buyer?: string;
  style?: string;
  qty: number;
  unit?: string;
  status?: string;
}

/** One way of breaking the clicked figure down. A target may offer several. */
export interface DrillBreakdown {
  dimension: DrillBreakdownDimension;
  label: string;
  /** leave out and the kit picks by shape: 2–5 slices → donut, 6+ → bar, time → line */
  chart?: DrillChartKind;
  unit?: string;
  colour?: DrillColour | string;
  color?: DrillColour | string;
  filterField?: string;
  slices?: DrillSlice[];
  jobRows?: DrillJobRow[];
  /** extras some pages pass */
  total?: number;
  tone?: DrillColour | 'neutral';
  factoryLabel?: string;
  [key: string]: unknown;
}

export interface DrillSourceFilter {
  field: string;
  value: string;
  label?: string;
}

export interface DrillTarget {
  title: string;
  subtitle?: string;
  /** where the clicked mark is, so the bubble can point at it */
  anchorRect?: { left: number; top: number; width: number; height: number } | DOMRect | null;
  anchorX?: number;
  anchorY?: number;
  sourceFilter?: DrillSourceFilter;
  breakdowns?: DrillBreakdown[];
  /** older shape, still used by some pages — turned into breakdowns automatically */
  byFactory?: DrillDatum[];
  byBuyer?: DrillDatum[];
  byTime?: DrillDatum[];
  byReason?: DrillDatum[];
  jobs?: { jobNo: string; buyer?: string; style?: string; qty: number; unit?: string; status?: string }[];
  unit?: string;
  /** extras some pages pass */
  defaultDim?: DrillBreakdownDimension | string;
  colour?: DrillColour | string;
  color?: DrillColour | string;
  factoryLabel?: string;
  filterField?: string;
  [key: string]: unknown;
}

/** Name some pages use for the same object. */
export type DrillPopupSpec = DrillTarget;

/** Older name kept so existing pages keep compiling. */
export type DrillPopupTarget = DrillTarget;
export interface DrillDatum {
  /** either naming works */
  name?: string;
  label?: string;
  key?: string;
  qty?: number;
  value?: number;
  jobsCount?: number;
  jobs?: number;
  style?: string;
  filterValue?: string;
  [k: string]: unknown;
}

const DRILL_COLOUR: Record<DrillColour, string> = {
  blue: 'var(--nos-required, #2563eb)',
  green: 'var(--nos-done, #16a34a)',
  red: 'var(--nos-balance, #dc2626)',
  amber: 'var(--nos-mid, #d97706)',
  grey: 'var(--nos-ink-3, #6b7280)',
};

/**
 * Single click cross-filters, double click opens the drill popup.
 * Recharts hands the data entry and the mouse event to onClick, so both are passed on.
 */
export function useChartDrillGesture<T = any>(handlers: {
  onSingleClick?: (entry: T, event?: any) => void;
  onDoubleClick?: (entry: T, rect: DOMRect | { left: number; top: number; width: number; height: number }) => void;
  delay?: number;
} = {}) {
  const { onSingleClick, onDoubleClick, delay = 280 } = handlers;
  const timer = useRef<number | null>(null);
  const last = useRef<{ key: string; time: number } | null>(null);

  const rectOf = (event: any) => {
    const t = event?.currentTarget || event?.target;
    if (t && typeof t.getBoundingClientRect === 'function') return t.getBoundingClientRect();
    const x = typeof event?.clientX === 'number' ? event.clientX : (typeof window !== 'undefined' ? window.innerWidth / 2 : 640);
    const y = typeof event?.clientY === 'number' ? event.clientY : 340;
    return { left: x, top: y, width: 1, height: 1 };
  };

  const handleClick = useCallback((entry: T, event?: any) => {
    const key = JSON.stringify((entry as any)?.name ?? (entry as any)?.key ?? entry ?? '');
    const now = Date.now();
    const rect = rectOf(event);
    if (last.current && last.current.key === key && now - last.current.time < delay) {
      if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
      last.current = null;
      onDoubleClick?.(entry, rect);
      return;
    }
    last.current = { key, time: now };
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { timer.current = null; onSingleClick?.(entry, event); }, delay);
  }, [onSingleClick, onDoubleClick, delay]);

  const handleDoubleClick = useCallback((entry: T, event?: any) => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    onDoubleClick?.(entry, rectOf(event));
  }, [onDoubleClick]);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  /** Older call style kept so existing pages keep working:
   *  handleMarkInteraction(key, event, onSingle, onDouble(x, y)) */
  const handleMarkInteraction = useCallback((
    key: string,
    event: { clientX?: number; clientY?: number } | any,
    onSingle: () => void,
    onDouble: (anchorX: number, anchorY: number) => void,
  ) => {
    const now = Date.now();
    const r = rectOf(event);
    const x = r.left + (r.width || 0) / 2;
    const y = r.top;
    if (last.current && last.current.key === key && now - last.current.time < delay) {
      if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
      last.current = null;
      onDouble(x, y);
      return;
    }
    last.current = { key, time: now };
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { timer.current = null; onSingle(); }, delay);
  }, [delay]);

  return { handleClick, handleDoubleClick, handleMarkInteraction, onClick: handleClick, onDoubleClick: handleDoubleClick };
}

function pickChart(b: DrillBreakdown): DrillChartKind {
  if (b.chart) return b.chart;
  if (b.jobRows && b.jobRows.length && !(b.slices || []).length) return 'jobs';
  if (b.dimension === 'time') return 'line';
  const n = (b.slices || []).length;
  return n >= 2 && n <= 5 ? 'donut' : 'bar';
}

const nf = (v: number, d = 0) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * Drill popup: a square bubble pointing at the clicked mark, in front of everything.
 * Opens above the mark; below only when there is no room. A bottom sheet on phones.
 */
export function DrillPopup({
  target,
  spec,
  anchorRect,
  onClose,
  onShowInTable,
  // Pages use these names; they are the same two actions under friendlier names.
  onApplyFilter,
  onShowJobsInTable,
}: {
  onApplyFilter?: (filter: { field: string; key: string; value: string }) => void;
  onShowJobsInTable?: (jobs: DrillJobRow[]) => void;
  target?: DrillTarget | null;
  /** same thing under the name some pages use */
  spec?: DrillTarget | null;
  /** passed separately by some pages instead of inside the target */
  anchorRect?: DOMRect | { left: number; top: number; width: number; height: number } | null;
  onClose: () => void;
  onShowInTable?: (field: string, value: string, breakdown?: DrillBreakdown) => void;
}) {
  const given = target ?? spec ?? null;
  const resolved: DrillTarget | null = given
    ? (anchorRect && !given.anchorRect ? { ...given, anchorRect } : given)
    : null;
  const boxRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; arrow: number; below: boolean } | null>(null);
  const [phone, setPhone] = useState(false);

  useEffect(() => { setIdx(0); }, [resolved]);

  useEffect(() => {
    const check = () => setPhone(typeof window !== 'undefined' && window.innerWidth <= 640);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // close on Esc and on a click outside
  useEffect(() => {
    if (!resolved) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown, true);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown, true); };
  }, [resolved, onClose]);

  // place the bubble above the mark, or below when there is no room
  useEffect(() => {
    if (!resolved || phone) { setPos(null); return; }
    const el = boxRef.current; if (!el) return;
    const r: any = resolved.anchorRect;
    const ax = r ? r.left + (r.width || 0) / 2 : (resolved.anchorX ?? window.innerWidth / 2);
    const ay = r ? r.top : (resolved.anchorY ?? 300);
    const ab = r ? r.top + (r.height || 0) : (resolved.anchorY ?? 300);
    const w = el.offsetWidth || 320;
    const h = el.offsetHeight || 260;
    const below = ay - h - 14 < 8;
    let left = ax - w / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    const top = below ? Math.min(ab + 14, window.innerHeight - h - 8) : ay - h - 14;
    setPos({ left, top: Math.max(8, top), arrow: Math.max(12, Math.min(ax - left, w - 12)), below });
  }, [resolved, idx, phone]);

  if (!resolved) return null;
  const fromDatum = (d: DrillDatum[], dim: DrillBreakdownDimension, label: string, chart?: DrillChartKind): DrillBreakdown => ({
    dimension: dim, label, chart, unit: resolved.unit,
    slices: d.map((x, i) => {
      const nm = String(x.label ?? x.name ?? x.key ?? i);
      return { key: String(x.key ?? nm), label: nm, value: Number(x.value ?? x.qty ?? 0),
               jobs: Number(x.jobs ?? x.jobsCount ?? 0) || undefined, filterValue: String(x.filterValue ?? nm) };
    }),
  });
  const legacy: DrillBreakdown[] = [];
  if (resolved.byFactory?.length) legacy.push(fromDatum(resolved.byFactory, 'factory', 'By factory'));
  if (resolved.byBuyer?.length) legacy.push(fromDatum(resolved.byBuyer, 'buyer', 'By buyer'));
  if (resolved.byReason?.length) legacy.push(fromDatum(resolved.byReason, 'reason', 'By reason'));
  if (resolved.byTime?.length) legacy.push(fromDatum(resolved.byTime, 'time', 'Over time', 'line'));
  if (resolved.jobs?.length) legacy.push({ dimension: 'job', label: 'Jobs', chart: 'jobs', unit: resolved.unit,
    jobRows: resolved.jobs.map((j) => ({ jobNo: j.jobNo, buyer: j.buyer, style: j.style, qty: j.qty, unit: j.unit, status: j.status })) });
  const list = (resolved.breakdowns && resolved.breakdowns.length ? resolved.breakdowns : legacy);
  const b = list[Math.min(idx, Math.max(0, list.length - 1))];
  if (!b) return null;

  const kind = pickChart(b);
  const unit = b.unit || resolved.unit || '';
  const colour = DRILL_COLOUR[((b.colour || b.color || 'blue') as string) as DrillColour] || String(b.colour || b.color || DRILL_COLOUR.blue);
  const slices = (b.slices || []).slice();
  const maxV = Math.max(1, ...slices.map((s) => Math.abs(s.value)));
  const totalV = slices.reduce((a, s) => a + (s.value || 0), 0) || 1;

  const pick = (filterValue?: string, label?: string) => {
    const field = b.filterField || b.dimension;
    const value = String(filterValue ?? label ?? '');
    onShowInTable?.(field, value, b);
    onApplyFilter?.({ field, key: field, value });
  };

  const style: React.CSSProperties = phone
    ? { position: 'fixed', left: 0, right: 0, bottom: 0, maxHeight: '70vh' }
    : { position: 'fixed', left: pos?.left ?? -9999, top: pos?.top ?? -9999, width: 340 };

  return (
    <div ref={boxRef} className={`nos-drill ${phone ? 'nos-drill-sheet' : ''}`} style={style} role="dialog" aria-label={resolved.title}>
      {!phone && pos && (
        <span className={`nos-drill-arrow ${pos.below ? 'up' : 'down'}`} style={{ left: pos.arrow }} aria-hidden="true" />
      )}
      <div className="nos-drill-hd">
        <div>
          <b>{resolved.title}</b>
          {resolved.subtitle && <span className="nos-drill-sub">{resolved.subtitle}</span>}
        </div>
        <button type="button" className="nos-drill-x" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {list.length > 1 && (
        <div className="nos-drill-tabs" role="tablist">
          {list.map((x, i) => (
            <button key={x.dimension + i} type="button" role="tab" aria-selected={i === idx}
              className={i === idx ? 'on' : ''} onClick={() => setIdx(i)}>
              {x.label}
            </button>
          ))}
        </div>
      )}

      <div className="nos-drill-body">
        {kind === 'jobs' && (
          <ul className="nos-drill-jobs">
            {(b.jobRows || []).slice(0, 12).map((j, i) => (
              <li key={j.jobNo + i}>
                <button type="button" onClick={() => pick(j.jobNo, j.jobNo)}>
                  <span className="j">{j.jobNo}</span>
                  <span className="m">{[j.buyer, j.style, j.status].filter(Boolean).join(' · ')}</span>
                  <span className="v">{nf(j.qty)} {j.unit || unit}</span>
                </button>
              </li>
            ))}
            {(b.jobRows || []).length > 12 && <li className="nos-drill-more">+ {(b.jobRows || []).length - 12} more</li>}
          </ul>
        )}

        {kind === 'donut' && (() => {
          const R = 34, C = 2 * Math.PI * R; let off = 0;
          const shades = [colour, 'var(--nos-done, #16a34a)', 'var(--nos-mid, #d97706)', 'var(--nos-balance, #dc2626)', 'var(--nos-ink-3, #6b7280)'];
          return (
            <div className="nos-drill-donut">
              <svg width="92" height="92" viewBox="0 0 92 92" role="img" aria-label={b.label}>
                {slices.map((s, i) => {
                  const len = (Math.abs(s.value) / totalV) * C;
                  const el = (
                    <circle key={s.key} r={R} cx="46" cy="46" fill="none" stroke={shades[i % shades.length]}
                      strokeWidth="13" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off}
                      transform="rotate(-90 46 46)" style={{ cursor: 'pointer' }}
                      onClick={() => pick(s.filterValue, s.label)} />
                  );
                  off += len; return el;
                })}
              </svg>
              <ul className="nos-drill-legend">
                {slices.map((s, i) => (
                  <li key={s.key}>
                    <button type="button" onClick={() => pick(s.filterValue, s.label)}>
                      <i style={{ background: shades[i % shades.length] }} />
                      <span>{s.label}</span>
                      <b>{nf(s.value)} {unit}{s.jobs ? ` · ${s.jobs} jobs` : ''}</b>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {kind === 'bar' && (
          <ul className="nos-drill-bars">
            {slices.slice(0, 10).map((s) => (
              <li key={s.key}>
                <button type="button" onClick={() => pick(s.filterValue, s.label)}>
                  <span className="l">{s.label}</span>
                  <span className="t"><i style={{ width: `${(Math.abs(s.value) / maxV) * 100}%`, background: colour }} /></span>
                  <span className="v">{nf(s.value)} {unit}{s.jobs ? ` · ${s.jobs}` : ''}</span>
                </button>
              </li>
            ))}
            {slices.length > 10 && <li className="nos-drill-more">+ {slices.length - 10} more</li>}
          </ul>
        )}

        {kind === 'line' && (() => {
          const w = 300, h = 110, pad = 6;
          const vals = slices.flatMap((s) => [s.value, s.value2 ?? s.value]);
          const min = Math.min(0, ...vals), max = Math.max(1, ...vals), span = max - min || 1;
          const xy = (v: number, i: number) => `${pad + (i / Math.max(1, slices.length - 1)) * (w - pad * 2)},${h - pad - ((v - min) / span) * (h - pad * 2)}`;
          const line1 = slices.map((s, i) => xy(s.value, i)).join(' ');
          const line2 = slices.some((s) => s.value2 !== undefined) ? slices.map((s, i) => xy(s.value2 ?? 0, i)).join(' ') : '';
          return (
            <div className="nos-drill-line">
              <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label={b.label}>
                {line2 && <polyline points={line2} fill="none" stroke="var(--nos-ink-3, #6b7280)" strokeWidth="1.6" strokeDasharray="4 3" />}
                <polyline points={line1} fill="none" stroke={colour} strokeWidth="2" />
                {slices.map((s, i) => {
                  const [cx, cy] = xy(s.value, i).split(',');
                  return <circle key={s.key} cx={cx} cy={cy} r="3" fill={colour} style={{ cursor: 'pointer' }}
                    onClick={() => pick(s.filterValue, s.label)}><title>{`${s.label}: ${nf(s.value)} ${unit}`}</title></circle>;
                })}
              </svg>
              <div className="nos-drill-xaxis">
                <span>{slices[0]?.label}</span><span>{slices[slices.length - 1]?.label}</span>
              </div>
            </div>
          );
        })()}
      </div>

      {(onShowInTable || onShowJobsInTable) && resolved.sourceFilter && (
        <button type="button" className="nos-drill-link"
          onClick={() => {
            onShowInTable?.(resolved.sourceFilter!.field, resolved.sourceFilter!.value, b);
            onShowJobsInTable?.(b.jobRows ?? []);
          }}>
          Show these jobs in the table →
        </button>
      )}
    </div>
  );
}

/** Names some pages import for the same chip bar. */
export const ActiveFiltersBar = CrossFilterChips;
export const CrossFilterBar = CrossFilterChips;

/**
 * Recharts' click prop types do not match the arguments it actually passes
 * (datum, index, event). This adapter keeps the page's own types and casts only
 * at the recharts boundary, so no page needs `any`.
 */
export function rechartsClick<T>(fn: (datum: T, index: number, event: React.MouseEvent) => void) {
  return fn as unknown as never;
}
export function rechartsChartClick<T>(fn: (state: T, event: React.MouseEvent) => void) {
  return fn as unknown as never;
}
