'use client';
/**
 * NOS DataGrid — the one table used across the app (docs/UX-STANDARD.md).
 *
 * Frozen header row, frozen Job/Style columns, Excel-style column filters,
 * Group By with subtotals, a totals row, column chooser, density, saved views,
 * row selection with a bulk action bar, CSV export, and a horizontal scrollbar
 * that stays visible at the bottom of the screen.
 *
 * The page keeps ONE vertical scroll: the grid never puts the table in its own
 * scroll box, so rows are never half cut and no empty space is left underneath.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './datagrid.css';

export type Align = 'left' | 'right' | 'center';

export type GridColumn<T> = {
  key: string;
  header: string;
  /** value used for filtering, grouping, sorting and export */
  value?: (row: T) => string | number | null | undefined;
  /** what the cell shows; defaults to value() */
  render?: (row: T) => React.ReactNode;
  width?: number;
  align?: Align;
  /** column of numbers: right aligned, can be totalled */
  numeric?: boolean;
  /** show a sum of this column in the totals row */
  total?: boolean;
  /** decimals for the total */
  decimals?: number;
  /** unit appended in the totals row, e.g. "t", "kg", "pcs" */
  unit?: string;
  /** off = no filter dropdown on this column */
  filterable?: boolean;
  /** hidden until the user turns it on in the column chooser */
  hiddenByDefault?: boolean;
};

export type DataGridProps<T> = {
  columns: GridColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** columns frozen on the left — usually Job and Style */
  frozenColumns?: number;
  /** px from the top of the viewport where the sticky header rests */
  stickyTop?: number;
  onRowClick?: (row: T) => void;
  selectedRowKey?: string | null;
  /** turn on tick boxes and the bulk action bar */
  selectable?: boolean;
  bulkActions?: (selected: T[]) => React.ReactNode;
  /** keeps saved views, column choice and density per user; unique per page */
  storageKey?: string;
  exportName?: string;
  emptyText?: string;
  /** same thing under the name some pages use */
  emptyMessage?: string;
  /** extra controls shown on the toolbar's left */
  toolbarLeft?: React.ReactNode;
  loading?: boolean;
};

type ColFilter = { picked: Set<string> };
type SortState = { key: string; dir: 'asc' | 'desc' } | null;
type SavedView = { name: string; filters: Record<string, string[]>; sort: SortState; groupBy: string | null; hidden: string[]; density: 'compact' | 'comfortable' };

const txt = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const DEFAULT_COL_W = 130;
const WINDOW_FROM = 150;   // below this, draw every row
const OVERSCAN = 12;       // rows kept ready above and below the screen
const fmtN = (n: number, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

export function DataGrid<T>({
  columns, rows, rowKey, frozenColumns = 0, stickyTop = 0,
  onRowClick, selectedRowKey, selectable = false, bulkActions,
  storageKey, exportName = 'export', emptyText, emptyMessage,
  toolbarLeft, loading = false,
}: DataGridProps<T>) {
  const emptyLabel = emptyText ?? emptyMessage ?? 'No rows match the current filters.';
  const [filters, setFilters] = useState<Record<string, ColFilter>>({});
  const [sort, setSort] = useState<SortState>(null);
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(columns.filter(c => c.hiddenByDefault).map(c => c.key)));
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [views, setViews] = useState<SavedView[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // The grid fills from its own top to the bottom of the screen: one scroll inside it,
  // the header row frozen, no half-cut rows and no empty space underneath.
  const [scrollerH, setScrollerH] = useState<number | undefined>(undefined);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top;
      const h = Math.max(240, Math.round(window.innerHeight - top - 12));
      setScrollerH(h);
    };
    measure();
    window.addEventListener('resize', measure);
    const t = window.setInterval(measure, 800);   // toolbar chips/filters change the top
    return () => { window.removeEventListener('resize', measure); window.clearInterval(t); };
  }, []);
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const [win, setWin] = useState<{ from: number; to: number }>({ from: 0, to: 60 });
  const proxyRef = useRef<HTMLDivElement>(null);
  const [tableWidth, setTableWidth] = useState(0);
  const [needsHScroll, setNeedsHScroll] = useState(false);

  /* ---- per-user settings (server-backed later; the browser for now) ---- */
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(`nos-grid-${storageKey}`);
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s.hidden)) setHidden(new Set(s.hidden));
        if (s.density) setDensity(s.density);
        if (Array.isArray(s.views)) setViews(s.views);
      }
    } catch { /* first run */ }
  }, [storageKey]);

  const persist = useCallback((patch: Record<string, unknown>) => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(`nos-grid-${storageKey}`);
      const cur = raw ? JSON.parse(raw) : {};
      localStorage.setItem(`nos-grid-${storageKey}`, JSON.stringify({ ...cur, ...patch }));
    } catch { /* storage off */ }
  }, [storageKey]);

  const visibleCols = useMemo(() => columns.filter(c => !hidden.has(c.key)), [columns, hidden]);
  const valueOf = useCallback((c: GridColumn<T>, r: T) => (c.value ? c.value(r) : (r as Record<string, unknown>)[c.key]), []);

  /* ---- filtering: a column's own options are counted on the rows the OTHER filters leave ---- */
  const rowsExcept = useCallback((skipKey: string | null) => {
    const active = Object.entries(filters).filter(([k, f]) => k !== skipKey && f.picked.size > 0);
    if (!active.length) return rows;
    return rows.filter(r => active.every(([k, f]) => {
      const col = columns.find(c => c.key === k);
      return col ? f.picked.has(txt(valueOf(col, r))) : true;
    }));
  }, [rows, filters, columns, valueOf]);

  const filtered = useMemo(() => rowsExcept(null), [rowsExcept]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find(c => c.key === sort.key);
    if (!col) return filtered;
    const out = [...filtered];
    out.sort((a, b) => {
      const av = valueOf(col, a), bv = valueOf(col, b);
      const cmp = col.numeric ? num(av) - num(bv) : txt(av).localeCompare(txt(bv), undefined, { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [filtered, sort, columns, valueOf]);

  /* ---- grouping with subtotals ---- */
  const groups = useMemo(() => {
    if (!groupBy) return null;
    const col = columns.find(c => c.key === groupBy);
    if (!col) return null;
    const map = new Map<string, T[]>();
    for (const r of sorted) {
      const k = txt(valueOf(col, r)) || '—';
      const arr = map.get(k); if (arr) arr.push(r); else map.set(k, [r]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  }, [groupBy, sorted, columns, valueOf]);

  const totalsFor = useCallback((list: T[]) => {
    const t: Record<string, number> = {};
    for (const c of visibleCols) if (c.total) t[c.key] = list.reduce((s, r) => s + num(valueOf(c, r)), 0);
    return t;
  }, [visibleCols, valueOf]);

  const grandTotals = useMemo(() => totalsFor(sorted), [totalsFor, sorted]);
  const hasTotals = visibleCols.some(c => c.total);

  /* ---- only draw the rows on screen: 5,000-row tables stay instant ---- */
  const rowH = density === 'compact' ? 25 : 31;
  const windowed = !groupBy && sorted.length > WINDOW_FROM;

  useEffect(() => {
    if (!windowed) { setWin({ from: 0, to: sorted.length }); return; }
    // The grid scrolls inside its own box, so the row window follows that box, not the page.
    const recalc = () => {
      const sc = scrollerRef.current; if (!sc) return;
      const first = Math.floor(sc.scrollTop / rowH) - OVERSCAN;
      const count = Math.ceil(sc.clientHeight / rowH) + OVERSCAN * 2;
      const from = Math.max(0, first);
      setWin({ from, to: Math.min(sorted.length, from + count) });
    };
    recalc();
    const sc = scrollerRef.current;
    sc?.addEventListener('scroll', recalc, { passive: true });
    window.addEventListener('resize', recalc);
    return () => { sc?.removeEventListener('scroll', recalc); window.removeEventListener('resize', recalc); };
  }, [windowed, sorted.length, rowH, scrollerH]);

  const shown = windowed ? sorted.slice(win.from, win.to) : sorted;
  const padTop = windowed ? win.from * rowH : 0;
  const padBottom = windowed ? Math.max(0, (sorted.length - win.to) * rowH) : 0;

  /* ---- sticky bottom scrollbar, kept in step with the table ---- */
  useEffect(() => {
    const el = scrollerRef.current; if (!el) return;
    const measure = () => { setTableWidth(el.scrollWidth); setNeedsHScroll(el.scrollWidth > el.clientWidth + 2); };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, [visibleCols.length, sorted.length, density]);

  const syncFromProxy = () => { if (scrollerRef.current && proxyRef.current) scrollerRef.current.scrollLeft = proxyRef.current.scrollLeft; };
  const syncFromTable = () => { if (scrollerRef.current && proxyRef.current) proxyRef.current.scrollLeft = scrollerRef.current.scrollLeft; };

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement)?.closest('.nos-dg-menu,.nos-dg-fbtn')) setOpenMenu(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenMenu(null); };
    document.addEventListener('click', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', esc); };
  }, []);

  /* ---- left offset for frozen columns ---- */
  const colW = useCallback((c: GridColumn<T>) => c.width ?? DEFAULT_COL_W, []);
  const leftOffsets = useMemo(() => {
    const offs: number[] = []; let acc = selectable ? 36 : 0;
    visibleCols.forEach((c, i) => { offs[i] = acc; if (i < frozenColumns) acc += colW(c); });
    return offs;
  }, [visibleCols, frozenColumns, selectable, colW]);
  const totalW = useMemo(
    () => visibleCols.reduce((s2, c) => s2 + colW(c), selectable ? 36 : 0),
    [visibleCols, selectable, colW],
  );

  const activeChips = Object.entries(filters).filter(([, f]) => f.picked.size > 0);

  const exportCsv = () => {
    const head = visibleCols.map(c => `"${c.header}"`).join(',');
    const body = sorted.map(r => visibleCols.map(c => `"${txt(valueOf(c, r)).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`${head}\n${body}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `${exportName}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const saveView = () => {
    const name = window.prompt('Save this view as');
    if (!name) return;
    const v: SavedView = {
      name,
      filters: Object.fromEntries(Object.entries(filters).filter(([, f]) => f.picked.size).map(([k, f]) => [k, [...f.picked]])),
      sort, groupBy, hidden: [...hidden], density,
    };
    const next = [...views.filter(x => x.name !== name), v];
    setViews(next); persist({ views: next });
  };
  const applyView = (v: SavedView) => {
    setFilters(Object.fromEntries(Object.entries(v.filters).map(([k, vals]) => [k, { picked: new Set(vals) }])));
    setSort(v.sort); setGroupBy(v.groupBy); setHidden(new Set(v.hidden)); setDensity(v.density);
  };

  const selectedRows = useMemo(() => sorted.filter(r => selected.has(rowKey(r))), [sorted, selected, rowKey]);

  const renderCells = (r: T, inGroup: boolean) => visibleCols.map((c, i) => (
    <td
      key={c.key}
      className={`${i < frozenColumns ? 'nos-dg-frozen' : ''} ${c.numeric || c.align === 'right' ? 'ta-r' : c.align === 'center' ? 'ta-c' : ''}`}
      style={{ left: i < frozenColumns ? leftOffsets[i] : undefined, width: colW(c), paddingLeft: inGroup && i === 0 ? 22 : undefined }}
    >
      {c.render ? c.render(r) : txt(valueOf(c, r))}
    </td>
  ));

  const subtotalRow = (key: string, list: T[]) => {
    const t = totalsFor(list);
    return (
      <tr className="nos-dg-subtotal" key={`st-${key}`}>
        {selectable && <td />}
        {visibleCols.map((c, i) => (
          <td key={c.key} className={`${i < frozenColumns ? 'nos-dg-frozen' : ''} ${c.total ? 'ta-r' : ''}`} style={{ left: i < frozenColumns ? leftOffsets[i] : undefined }}>
            {i === 0 ? `${list.length} rows` : c.total ? `${fmtN(t[c.key] ?? 0, c.decimals ?? 0)}${c.unit ? ' ' + c.unit : ''}` : ''}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div className="nos-dg" data-nos>
      {/* toolbar: filters chips, group by, columns, density, views, export */}
      <div className="nos-dg-bar">
        {toolbarLeft}
        <label className="nos-dg-ctl">
          Group by
          <select value={groupBy ?? ''} onChange={e => setGroupBy(e.target.value || null)}>
            <option value="">None</option>
            {columns.filter(c => !c.numeric).map(c => <option key={c.key} value={c.key}>{c.header}</option>)}
          </select>
        </label>

        <div className="nos-dg-menu-wrap">
          <button type="button" className="nos-btn nos-btn-secondary nos-btn-sm nos-dg-fbtn" onClick={() => setOpenMenu(openMenu === '__cols' ? null : '__cols')}>
            Columns ({visibleCols.length}/{columns.length})
          </button>
          {openMenu === '__cols' && (
            <div className="nos-dg-menu">
              {columns.map(c => (
                <label key={c.key} className="nos-dg-opt">
                  <input
                    type="checkbox"
                    checked={!hidden.has(c.key)}
                    onChange={() => {
                      const next = new Set(hidden);
                      if (next.has(c.key)) next.delete(c.key); else next.add(c.key);
                      setHidden(next); persist({ hidden: [...next] });
                    }}
                  />
                  <span>{c.header}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <label className="nos-dg-ctl">
          Rows
          <select value={density} onChange={e => { const d = e.target.value as 'compact' | 'comfortable'; setDensity(d); persist({ density: d }); }}>
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>

        {storageKey && (
          <div className="nos-dg-menu-wrap">
            <button type="button" className="nos-btn nos-btn-secondary nos-btn-sm nos-dg-fbtn" onClick={() => setOpenMenu(openMenu === '__views' ? null : '__views')}>
              Views{views.length ? ` (${views.length})` : ''}
            </button>
            {openMenu === '__views' && (
              <div className="nos-dg-menu">
                {views.length === 0 && <div className="nos-dg-opt" style={{ color: 'var(--nos-ink-3)' }}>No saved views yet</div>}
                {views.map(v => (
                  <div key={v.name} className="nos-dg-opt">
                    <button type="button" className="nos-dg-linkbtn" onClick={() => { applyView(v); setOpenMenu(null); }}>{v.name}</button>
                    <button
                      type="button" className="nos-dg-x" aria-label={`Delete view ${v.name}`}
                      onClick={() => { const next = views.filter(x => x.name !== v.name); setViews(next); persist({ views: next }); }}
                    >×</button>
                  </div>
                ))}
                <div className="nos-dg-opt"><button type="button" className="nos-dg-linkbtn" onClick={() => { saveView(); setOpenMenu(null); }}>Save current view…</button></div>
              </div>
            )}
          </div>
        )}

        <span className="spacer" />
        <span className="nos-dg-count">{fmtN(sorted.length)} of {fmtN(rows.length)} rows</span>
        <button type="button" className="nos-btn nos-btn-secondary nos-btn-sm" onClick={exportCsv}>Export CSV</button>
      </div>

      {/* active filter chips */}
      {(activeChips.length > 0 || sort) && (
        <div className="nos-dg-chips">
          {activeChips.map(([k, f]) => {
            const col = columns.find(c => c.key === k);
            return (
              <button key={k} type="button" className="nos-dg-chip" onClick={() => { const next = { ...filters }; delete next[k]; setFilters(next); }}>
                {col?.header}: {f.picked.size === 1 ? [...f.picked][0] : `${f.picked.size} picked`} ✕
              </button>
            );
          })}
          {sort && <button type="button" className="nos-dg-chip" onClick={() => setSort(null)}>Sorted by {columns.find(c => c.key === sort.key)?.header} ✕</button>}
          {activeChips.length > 0 && <button type="button" className="nos-dg-chip" onClick={() => setFilters({})}>Clear all</button>}
        </div>
      )}

      {/* bulk action bar */}
      {selectable && selected.size > 0 && (
        <div className="nos-dg-bulk">
          <span>{selected.size} selected</span>
          <span className="spacer" />
          {bulkActions?.(selectedRows)}
          <button type="button" className="nos-btn nos-btn-quiet nos-btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {/* the table: page keeps one vertical scroll; only sideways scrolls here */}
      <div className={`nos-dg-scroller ${density}`} ref={scrollerRef} onScroll={syncFromTable} style={{ height: scrollerH }}>
        <table className="nos-dg-table" style={{ width: totalW, minWidth: '100%' }}>
          <colgroup>
            {selectable && <col style={{ width: 36 }} />}
            {visibleCols.map(c => <col key={c.key} style={{ width: colW(c) }} />)}
          </colgroup>
          <thead style={{ top: stickyTop }}>
            <tr>
              {selectable && (
                <th className="nos-dg-frozen nos-dg-tick" style={{ left: 0 }}>
                  <input
                    type="checkbox" aria-label="Select all rows"
                    checked={sorted.length > 0 && selected.size === sorted.length}
                    onChange={e => setSelected(e.target.checked ? new Set(sorted.map(rowKey)) : new Set())}
                  />
                </th>
              )}
              {visibleCols.map((c, i) => {
                // counted only while this column's menu is open, so wide tables stay fast
                const opts = (c.filterable === false || openMenu !== c.key) ? [] : (() => {
                  const counts = new Map<string, number>();
                  for (const r of rowsExcept(c.key)) { const v = txt(valueOf(c, r)) || '—'; counts.set(v, (counts.get(v) ?? 0) + 1); }
                  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
                })();
                const picked = filters[c.key]?.picked ?? new Set<string>();
                return (
                  <th
                    key={c.key}
                    className={`${i < frozenColumns ? 'nos-dg-frozen' : ''} ${c.numeric || c.align === 'right' ? 'ta-r' : ''}`}
                    style={{ left: i < frozenColumns ? leftOffsets[i] : undefined, width: colW(c), top: stickyTop }}
                  >
                    <span className="nos-dg-th">
                      <span className="nos-dg-htext" title={c.header}>{c.header}</span>
                      {c.filterable !== false && (
                        <button
                          type="button"
                          className={`nos-dg-fbtn ${picked.size ? 'on' : ''}`}
                          aria-label={`Filter ${c.header}`}
                          onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === c.key ? null : c.key); }}
                        >▾</button>
                      )}
                    </span>
                    {openMenu === c.key && (
                      <ColumnFilterMenu
                        header={c.header}
                        options={opts}
                        picked={picked}
                        onSort={dir => { setSort({ key: c.key, dir }); setOpenMenu(null); }}
                        onApply={next => {
                          const f = { ...filters };
                          if (next.size === 0 || next.size === opts.length) delete f[c.key]; else f[c.key] = { picked: next };
                          setFilters(f); setOpenMenu(null);
                        }}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody ref={bodyRef}>
            {padTop > 0 && <tr aria-hidden="true" style={{ height: padTop }}><td colSpan={visibleCols.length + (selectable ? 1 : 0)} style={{ padding: 0, border: 0 }} /></tr>}
            {loading && (
              <tr><td colSpan={visibleCols.length + (selectable ? 1 : 0)}>
                <div style={{ padding: 12 }}>{Array.from({ length: 6 }).map((_, i) => <span key={i} className="nos-sk" style={{ display: 'block', height: 12, margin: '8px 0' }} />)}</div>
              </td></tr>
            )}

            {!loading && sorted.length === 0 && (
              <tr><td colSpan={visibleCols.length + (selectable ? 1 : 0)}>
                <div className="nos-empty"><b>{emptyLabel}</b><span>Change or clear the column filters above.</span></div>
              </td></tr>
            )}

            {!loading && groups
              ? groups.map(([gname, list]) => {
                  const open = !collapsed.has(gname);
                  return (
                    <React.Fragment key={gname}>
                      <tr className="nos-dg-group">
                        <td colSpan={visibleCols.length + (selectable ? 1 : 0)}>
                          <button
                            type="button" className="nos-dg-linkbtn"
                            onClick={() => { const n = new Set(collapsed); if (open) n.add(gname); else n.delete(gname); setCollapsed(n); }}
                          >
                            {open ? '▾' : '▸'} {gname} · {list.length} rows
                          </button>
                        </td>
                      </tr>
                      {open && list.map(r => {
                        const k = rowKey(r);
                        return (
                          <tr
                            key={k}
                            className={selectedRowKey === k ? 'is-selected' : ''}
                            onClick={onRowClick ? () => onRowClick(r) : undefined}
                            style={onRowClick ? { cursor: 'pointer' } : undefined}
                          >
                            {selectable && (
                              <td className="nos-dg-frozen nos-dg-tick" style={{ left: 0 }} onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox" aria-label={`Select ${k}`} checked={selected.has(k)}
                                  onChange={() => { const n = new Set(selected); if (n.has(k)) n.delete(k); else n.add(k); setSelected(n); }}
                                />
                              </td>
                            )}
                            {renderCells(r, true)}
                          </tr>
                        );
                      })}
                      {open && hasTotals && subtotalRow(gname, list)}
                    </React.Fragment>
                  );
                })
              : !loading && shown.map(r => {
                  const k = rowKey(r);
                  return (
                    <tr
                      key={k}
                      className={selectedRowKey === k ? 'is-selected' : ''}
                      onClick={onRowClick ? () => onRowClick(r) : undefined}
                      style={onRowClick ? { cursor: 'pointer' } : undefined}
                    >
                      {selectable && (
                        <td className="nos-dg-frozen nos-dg-tick" style={{ left: 0 }} onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox" aria-label={`Select ${k}`} checked={selected.has(k)}
                            onChange={() => { const n = new Set(selected); if (n.has(k)) n.delete(k); else n.add(k); setSelected(n); }}
                          />
                        </td>
                      )}
                      {renderCells(r, false)}
                    </tr>
                  );
                })}
            {padBottom > 0 && <tr aria-hidden="true" style={{ height: padBottom }}><td colSpan={visibleCols.length + (selectable ? 1 : 0)} style={{ padding: 0, border: 0 }} /></tr>}
          </tbody>

          {hasTotals && !loading && sorted.length > 0 && (
            <tfoot>
              <tr>
                {selectable && <td className="nos-dg-frozen" style={{ left: 0 }} />}
                {visibleCols.map((c, i) => (
                  <td key={c.key} className={`${i < frozenColumns ? 'nos-dg-frozen' : ''} ${c.total ? 'ta-r' : ''}`} style={{ left: i < frozenColumns ? leftOffsets[i] : undefined }}>
                    {i === 0 ? 'Total' : c.total ? `${fmtN(grandTotals[c.key] ?? 0, c.decimals ?? 0)}${c.unit ? ' ' + c.unit : ''}` : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* horizontal scrollbar pinned to the bottom of the screen */}
      {needsHScroll && (
        <div className="nos-dg-hbar" ref={proxyRef} onScroll={syncFromProxy} aria-hidden="true">
          <div style={{ width: tableWidth, height: 1 }} />
        </div>
      )}
    </div>
  );
}

/* ---------------- Excel-style column filter ---------------- */
function ColumnFilterMenu({ header, options, picked, onApply, onSort }: {
  header: string;
  options: [string, number][];
  picked: Set<string>;
  onApply: (next: Set<string>) => void;
  onSort: (dir: 'asc' | 'desc') => void;
}) {
  const [search, setSearch] = useState('');
  const [local, setLocal] = useState<Set<string>>(() => new Set(picked.size ? picked : options.map(o => o[0])));
  const shown = useMemo(
    () => options.filter(([v]) => v.toLowerCase().includes(search.toLowerCase())),
    [options, search],
  );
  const allShownPicked = shown.length > 0 && shown.every(([v]) => local.has(v));

  return (
    <div className="nos-dg-menu nos-dg-filter" onClick={e => e.stopPropagation()}>
      <div className="nos-dg-sortrow">
        <button type="button" className="nos-dg-linkbtn" onClick={() => onSort('asc')}>Sort A → Z</button>
        <button type="button" className="nos-dg-linkbtn" onClick={() => onSort('desc')}>Z → A</button>
      </div>
      <input className="nos-dg-search" placeholder={`Search ${header}`} value={search} onChange={e => setSearch(e.target.value)} autoFocus />
      <label className="nos-dg-opt nos-dg-all">
        <input
          type="checkbox" checked={allShownPicked}
          onChange={() => {
            const n = new Set(local);
            if (allShownPicked) shown.forEach(([v]) => n.delete(v)); else shown.forEach(([v]) => n.add(v));
            setLocal(n);
          }}
        />
        <span>(Select all)</span>
        <em>{shown.length}</em>
      </label>
      <div className="nos-dg-list">
        {shown.map(([v, n]) => (
          <label key={v} className="nos-dg-opt">
            <input
              type="checkbox" checked={local.has(v)}
              onChange={() => { const s = new Set(local); if (s.has(v)) s.delete(v); else s.add(v); setLocal(s); }}
            />
            <span title={v}>{v}</span>
            <em>{n}</em>
          </label>
        ))}
        {shown.length === 0 && <div className="nos-dg-opt" style={{ color: 'var(--nos-ink-3)' }}>No match</div>}
      </div>
      <div className="nos-dg-actions">
        <button type="button" className="nos-btn nos-btn-quiet nos-btn-sm" onClick={() => onApply(new Set())}>Clear</button>
        <button type="button" className="nos-btn nos-btn-primary nos-btn-sm" onClick={() => onApply(local)}>Apply</button>
      </div>
    </div>
  );
}

export default DataGrid;
