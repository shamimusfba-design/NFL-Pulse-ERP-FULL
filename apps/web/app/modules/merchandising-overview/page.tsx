'use client';

/**
 * Sales & Merchandising — Dashboard.
 *
 * This is the merchandiser's own dashboard: it shows ONLY the jobs belonging to the
 * merchandiser who is logged in, never the whole factory. The factory-wide view lives on the
 * Executive and Management dashboards.
 *
 * Layout follows docs/UX-STANDARD.md: white cards with no coloured edge, one even grid,
 * stage donuts in a single group box (green = done, red = balance), and a filtered table
 * at the bottom. Year and Month filters drive everything.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';
import demo2000DataRaw from '../../../data/demo-2000-master.json';
import { displayJobNo } from '../../../lib/display';
import { fmtNum } from '../../../lib/format';
import { Card, KpiCard, DataGrid, GridColumn } from '../../../components/ui';

/* ------------------------------------------------------------------ data */

type StageBlock = Record<string, unknown>;
type JobRow = {
  id: string;
  jobNo: string;
  buyer: string;
  styleNo: string;
  orderQty: number;
  item: string;
  itemDescription?: string;
  merchandiser: string;
  presentStatus: string;
  overallStage: string;
  riskStatus: string;
  planMonth?: string;
  fabric?: StageBlock;
  knitting?: StageBlock;
  cutting?: StageBlock;
  printEmb?: StageBlock;
  sewing?: StageBlock;
  finishing?: StageBlock;
  shipment?: StageBlock;
  dates?: Record<string, string>;
};

const ALL_JOBS: JobRow[] = ((demo2000DataRaw as { jobs?: JobRow[] }).jobs ?? []) as JobRow[];

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** "05-Aug-2026" -> a real date, so Year / Month filters work. */
const parseDate = (s?: string): Date | null => {
  if (!s) return null;
  const d = new Date(s.replace(/-/g, ' '));
  return Number.isNaN(d.getTime()) ? null : d;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ------------------------------------------------------------- donut card */

function StageDonut({
  label,
  done,
  total,
  unit,
  jobs,
  onPick,
}: {
  label: string;
  done: number;
  total: number;
  unit: string;
  jobs: number;
  onPick: (part: 'done' | 'balance') => void;
}) {
  const balance = Math.max(0, total - done);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const C = 2 * Math.PI * 30;
  const donePart = total > 0 ? (done / total) * C : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 500, color: 'var(--nos-ink)' }}>{label}</span>
      <svg width="78" height="78" viewBox="0 0 78 78" role="img" aria-label={`${label} ${pct}% done`}>
        <circle r="30" cx="39" cy="39" fill="none" stroke="var(--nos-balance)" strokeWidth="11" opacity={0.85} />
        <circle
          r="30"
          cx="39"
          cy="39"
          fill="none"
          stroke="var(--nos-done)"
          strokeWidth="11"
          strokeDasharray={`${donePart} ${C - donePart}`}
          transform="rotate(-90 39 39)"
          style={{ cursor: 'pointer' }}
          onClick={() => onPick('done')}
        />
        <text x="39" y="38" textAnchor="middle" style={{ fontSize: 15, fontWeight: 500, fill: 'var(--nos-ink)' }}>
          {pct}%
        </text>
        <text x="39" y="51" textAnchor="middle" style={{ fontSize: 10, fill: 'var(--nos-ink-2)' }}>
          {fmtNum(jobs)} jobs
        </text>
      </svg>
      <button
        type="button"
        onClick={() => onPick('done')}
        style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontSize: 'var(--fs-xs)', color: 'var(--nos-done)' }}
      >
        {fmtNum(done)} {unit}
      </button>
      <button
        type="button"
        onClick={() => onPick('balance')}
        style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontSize: 'var(--fs-xs)', color: 'var(--nos-balance)' }}
      >
        {fmtNum(balance)} {unit} left
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ page */

export default function MerchandisingDashboardPage() {
  const [me, setMe] = useState<string>('');
  const [year, setYear] = useState<string>('all');
  const [month, setMonth] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<{ stage: string; part: 'done' | 'balance' } | null>(null);

  /* who is logged in — the dashboard is theirs alone */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('nfl_user');
      const u = raw ? JSON.parse(raw) : null;
      const name = u?.merchandiser || u?.name || u?.username || '';
      setMe(String(name));
    } catch {
      setMe('');
    }
  }, []);

  const merchandisers = useMemo(
    () => Array.from(new Set(ALL_JOBS.map((j) => j.merchandiser).filter(Boolean))).sort(),
    []
  );

  /** Only my jobs. If the login carries no merchandiser name yet, fall back to the first one
   *  so the page is still usable — TODO: remove the fallback once real login lands. */
  const myName = me && merchandisers.includes(me) ? me : merchandisers[0] || '';

  const mine = useMemo(() => ALL_JOBS.filter((j) => j.merchandiser === myName), [myName]);

  const years = useMemo(() => {
    const ys = new Set<string>();
    mine.forEach((j) => {
      const d = parseDate(j.dates?.exFactory);
      if (d) ys.add(String(d.getFullYear()));
    });
    return Array.from(ys).sort();
  }, [mine]);

  /* Year + Month filter, counted on the shipment (ex-factory) date */
  const filtered = useMemo(() => {
    return mine.filter((j) => {
      if (year === 'all' && month === 'all') return true;
      const d = parseDate(j.dates?.exFactory);
      if (!d) return false;
      if (year !== 'all' && String(d.getFullYear()) !== year) return false;
      if (month !== 'all' && MONTHS[d.getMonth()] !== month) return false;
      return true;
    });
  }, [mine, year, month]);

  /* cards */
  const stats = useMemo(() => {
    const shipped = (j: JobRow) => num(j.shipment?.shipQty);
    const inHand = filtered.filter((j) => shipped(j) === 0);
    const inProgress = filtered.filter((j) => shipped(j) > 0 && num(j.shipment?.shipBalance) > 0);
    const sum = (rows: JobRow[]) => rows.reduce((a, j) => a + num(j.orderQty), 0);
    return {
      totalJobs: filtered.length,
      totalQty: sum(filtered),
      inHandJobs: inHand.length,
      inHandQty: sum(inHand),
      inProgressJobs: inProgress.length,
      inProgressQty: sum(inProgress),
      delayed: filtered.filter((j) => j.riskStatus && j.riskStatus !== 'ON_TRACK').length,
    };
  }, [filtered]);

  /* stage donuts: done vs balance, with the job count behind each */
  const stages = useMemo(() => {
    const spec: { key: string; label: string; unit: string; done: (j: JobRow) => number; total: (j: JobRow) => number }[] = [
      { key: 'knitting', label: 'Knitting', unit: 'kg', done: (j) => num(j.knitting?.greyProducedKg), total: (j) => num(j.knitting?.greyReqKg) },
      { key: 'fabric', label: 'Dyeing', unit: 'kg', done: (j) => num(j.fabric?.fabricReceivedKg), total: (j) => num(j.fabric?.fabricReqKg) },
      { key: 'cutting', label: 'Cutting', unit: 'pcs', done: (j) => num(j.cutting?.cuttingQty), total: (j) => num(j.orderQty) },
      { key: 'printEmb', label: 'Print / Emb', unit: 'pcs', done: (j) => num(j.printEmb?.recvQty), total: (j) => num(j.printEmb?.reqQty) },
      { key: 'sewing', label: 'Sewing', unit: 'pcs', done: (j) => num(j.sewing?.sewingActualQty), total: (j) => num(j.orderQty) },
      { key: 'shipment', label: 'Shipment', unit: 'pcs', done: (j) => num(j.shipment?.shipQty), total: (j) => num(j.orderQty) },
    ];
    return spec
      .map((s) => {
        const rows = filtered.filter((j) => s.total(j) > 0);
        return {
          ...s,
          done: rows.reduce((a, j) => a + s.done(j), 0),
          totalV: rows.reduce((a, j) => a + s.total(j), 0),
          jobs: rows.length,
          isDone: (j: JobRow) => s.total(j) > 0 && s.done(j) >= s.total(j),
        };
      })
      .filter((s) => s.totalV > 0);
  }, [filtered]);

  /* item mix */
  const byItem = useMemo(() => {
    const m = new Map<string, { jobs: number; qty: number }>();
    filtered.forEach((j) => {
      const k = j.item || 'Other';
      const cur = m.get(k) || { jobs: 0, qty: 0 };
      m.set(k, { jobs: cur.jobs + 1, qty: cur.qty + num(j.orderQty) });
    });
    return Array.from(m.entries())
      .map(([item, v]) => ({ item, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);
  }, [filtered]);

  /* clicking a donut part filters the table below */
  const tableRows = useMemo(() => {
    if (!stageFilter) return filtered;
    const s = stages.find((x) => x.key === stageFilter.stage);
    if (!s) return filtered;
    return filtered.filter((j) => (stageFilter.part === 'done' ? s.isDone(j) : !s.isDone(j)));
  }, [filtered, stageFilter, stages]);

  const columns: GridColumn<JobRow>[] = useMemo(
    () => [
      { key: 'jobNo', header: 'Job', width: 120, render: (j) => <Link href={`/jobs/${j.jobNo}`}>{displayJobNo(j.jobNo)}</Link>, value: (j) => displayJobNo(j.jobNo) },
      { key: 'styleNo', header: 'Style', width: 150, value: (j) => j.styleNo },
      { key: 'buyer', header: 'Buyer', width: 110, value: (j) => j.buyer },
      { key: 'item', header: 'Item', width: 130, value: (j) => j.item },
      { key: 'orderQty', header: 'Order qty', width: 110, value: (j) => num(j.orderQty), numeric: true, total: true, unit: 'pcs' },
      { key: 'cut', header: 'Cut', width: 100, value: (j) => num(j.cutting?.cuttingQty), numeric: true, total: true, unit: 'pcs' },
      { key: 'sewn', header: 'Sewn', width: 100, value: (j) => num(j.sewing?.sewingActualQty), numeric: true, total: true, unit: 'pcs' },
      { key: 'shipped', header: 'Shipped', width: 100, value: (j) => num(j.shipment?.shipQty), numeric: true, total: true, unit: 'pcs' },
      { key: 'presentStatus', header: 'Present status', width: 150, value: (j) => j.presentStatus },
      { key: 'exFactory', header: 'Ex-factory', width: 120, value: (j) => j.dates?.exFactory || '' },
    ],
    []
  );

  const sel = (label: string, value: string, onChange: (v: string) => void, options: { v: string; t: string }[]) => (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-xs)', color: 'var(--nos-ink-2)' }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ fontSize: 'var(--fs-xs)', padding: '4px 8px', borderRadius: 'var(--r-sm)', border: '1px solid var(--nos-line-strong)', background: 'var(--nos-card)', color: 'var(--nos-ink)' }}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.t}</option>
        ))}
      </select>
    </label>
  );

  return (
    <Shell title="Merchandising Dashboard">
      {/* who this dashboard belongs to + the Year / Month filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap', marginBottom: 'var(--sp-3)' }}>
        <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, color: 'var(--nos-ink)' }}>
          My jobs · {myName || '—'}
        </span>
        {sel('Year', year, setYear, [{ v: 'all', t: 'All' }, ...years.map((y) => ({ v: y, t: y }))])}
        {sel('Month', month, setMonth, [{ v: 'all', t: 'All' }, ...MONTHS.map((m) => ({ v: m, t: m }))])}
        {stageFilter && (
          <button
            type="button"
            className="nos-btn nos-btn-secondary nos-btn-sm"
            onClick={() => setStageFilter(null)}
          >
            {stages.find((s) => s.key === stageFilter.stage)?.label} · {stageFilter.part === 'done' ? 'done' : 'balance'} ✕
          </button>
        )}
      </div>

      <div className="nos-grid nos-grid-4" style={{ marginBottom: 'var(--sp-3)' }}>
        <KpiCard label="My jobs" value={fmtNum(stats.totalJobs)} unit=" jobs" delta={`${fmtNum(stats.totalQty)} pcs`} deltaDirection="flat" />
        <KpiCard label="Orders in hand" value={fmtNum(stats.inHandJobs)} unit=" jobs" delta={`${fmtNum(stats.inHandQty)} pcs not shipped`} deltaDirection="flat" />
        <KpiCard label="In progress" value={fmtNum(stats.inProgressJobs)} unit=" jobs" delta={`${fmtNum(stats.inProgressQty)} pcs`} deltaDirection="flat" />
        <KpiCard label="At risk" value={fmtNum(stats.delayed)} unit=" jobs" delta={stats.delayed > 0 ? 'needs follow-up' : 'all on track'} deltaDirection={stats.delayed > 0 ? 'down' : 'up'} />
      </div>

      {/* one group box for every stage, so the page stays calm */}
      <Card title="My order progress" action={<span style={{ fontSize: 'var(--fs-xs)', color: 'var(--nos-ink-2)' }}>green done · red balance · click to filter the table</span>}>
        <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap', justifyContent: 'space-around', padding: '4px 0' }}>
          {stages.map((s) => (
            <StageDonut
              key={s.key}
              label={s.label}
              done={s.done}
              total={s.totalV}
              unit={s.unit}
              jobs={s.jobs}
              onPick={(part) => setStageFilter({ stage: s.key, part })}
            />
          ))}
        </div>
      </Card>

      <div className="nos-grid nos-grid-2" style={{ margin: 'var(--sp-3) 0' }}>
        <Card title="My items">
          <div style={{ fontSize: 'var(--fs-sm)' }}>
            {byItem.map((r) => (
              <div key={r.item} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'var(--sp-2)', padding: '5px 0', borderBottom: '1px solid var(--nos-line)' }}>
                <span style={{ color: 'var(--nos-ink)' }}>{r.item}</span>
                <span style={{ color: 'var(--nos-ink-2)' }}>{fmtNum(r.jobs)} jobs</span>
                <span style={{ color: 'var(--nos-ink)', fontWeight: 500 }}>{fmtNum(r.qty)} pcs</span>
              </div>
            ))}
            {byItem.length === 0 && <div className="nos-empty"><b>No jobs for this filter</b></div>}
          </div>
        </Card>

        <Card title="Nearest shipments">
          <div style={{ fontSize: 'var(--fs-sm)' }}>
            {filtered
              .filter((j) => num(j.shipment?.shipBalance) > 0 && j.dates?.exFactory)
              .sort((a, b) => (parseDate(a.dates?.exFactory)?.getTime() || 0) - (parseDate(b.dates?.exFactory)?.getTime() || 0))
              .slice(0, 6)
              .map((j) => (
                <div key={j.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'var(--sp-2)', padding: '5px 0', borderBottom: '1px solid var(--nos-line)' }}>
                  <Link href={`/jobs/${j.jobNo}`} style={{ color: 'var(--nos-required)' }}>{displayJobNo(j.jobNo)}</Link>
                  <span style={{ color: 'var(--nos-ink-2)' }}>{j.buyer}</span>
                  <span style={{ color: 'var(--nos-ink)' }}>{j.dates?.exFactory}</span>
                </div>
              ))}
          </div>
        </Card>
      </div>

      <DataGrid<JobRow>
        columns={columns}
        rows={tableRows}
        rowKey={(j) => j.id}
        frozenColumns={2}
        storageKey="merch-dashboard-jobs"
        exportName="my-jobs"
        emptyText="No jobs match this filter."
      />
    </Shell>
  );
}
