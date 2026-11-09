'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { DataGrid } from '../../../components/ui';
import type { GridColumn } from '../../../components/ui';
import { api } from '../../../lib/api';
import { fmtDate, fmtNum } from '../../../lib/format';
import { useFxScope } from '../../../components/fx';

function monthBounds(v: string) {
  const [y, m] = v.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    from: `${y}-${String(m).padStart(2, '0')}-01`,
    to: `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  };
}
function curMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
const num = (v: any) => fmtNum(Number(v || 0), 1);

function shortDate(v: string) {
  const p = String(v || '').split('-');
  return p.length === 3 ? `${Number(p[2])}/${Number(p[1])}` : v;
}

function Trend({ line }: { line: any }) {
  const fx = useFxScope();
  const pts = line.points || [];
  const [hover, setHover] = useState<any>(null);
  const w = 560,
    h = 255,
    pL = 42,
    pR = 44,
    pT = 24,
    pB = 38;
  const eff = pts.map((x: any) => Number(x.efficiencyPct || 0)),
    smv = pts.map((x: any) => Number(x.smv || 0));
  const maxEff = Math.max(100, ...eff),
    minEff = Math.min(30, ...eff.filter(Boolean));
  const maxSmv = Math.max(1, ...smv) * 1.08,
    minSmv = Math.max(0, Math.min(...smv.filter(Boolean), 5) - 0.5);
  const x = (i: number) => pL + (pts.length <= 1 ? 0 : (i * (w - pL - pR)) / (pts.length - 1));
  const yEff = (v: number) => pT + ((maxEff - v) / (maxEff - minEff || 1)) * (h - pT - pB),
    ySmv = (v: number) => pT + ((maxSmv - v) / (maxSmv - minSmv || 1)) * (h - pT - pB);
  const poly = (arr: number[], f: (v: number) => number) => arr.map((v, i) => `${x(i)},${f(v)}`).join(' ');
  const labelStep = Math.max(1, Math.ceil(pts.length / 10));
  return (
    <div className="trend-card" ref={fx.ref} data-fx={fx['data-fx']}>
      <div className="trend-head">
        <div>
          <strong>Line {line.lineCode}</strong>
          <small>Daily SMV vs Efficiency</small>
        </div>
        <span>
          {pts.length} day{pts.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="trend-wrap">
        <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Line ${line.lineCode} SMV and efficiency trend`}>
          <line x1={pL} x2={pL} y1={pT} y2={h - pB} className="axis" />
          <line x1={w - pR} x2={w - pR} y1={pT} y2={h - pB} className="axis" />
          <line x1={pL} x2={w - pR} y1={h - pB} y2={h - pB} className="axis" />
          <text x={8} y={pT + 4} className="chart-axis-label">
            SMV
          </text>
          <text x={w - 38} y={pT + 4} className="chart-axis-label">
            Eff%
          </text>
          <polyline points={poly(smv, ySmv)} className="smv-line fx-line" pathLength={1} style={{ ['--fx-i' as any]: 1 }} />
          <polyline points={poly(eff, yEff)} className="eff-line fx-line" pathLength={1} />
          {pts.map((pt: any, i: number) => {
            const show = i % labelStep === 0 || i === pts.length - 1;
            return (
              <g key={`${pt.date}-${i}`}>
                <circle cx={x(i)} cy={ySmv(Number(pt.smv || 0))} r="3.6" className="smv-dot fx-dot" style={{ ['--fx-i' as any]: i }} />
                <circle
                  cx={x(i)}
                  cy={yEff(Number(pt.efficiencyPct || 0))}
                  r="5"
                  className="eff-dot fx-dot"
                  style={{ ['--fx-i' as any]: i }}
                  onMouseEnter={() => setHover({ ...pt, x: x(i), y: yEff(Number(pt.efficiencyPct || 0)) })}
                  onMouseLeave={() => setHover(null)}
                />
                {show && (
                  <>
                    <text x={x(i)} y={Math.max(pT + 9, ySmv(Number(pt.smv || 0)) - 8)} textAnchor="middle" className="chart-value smv-value">
                      {Number(pt.smv || 0).toFixed(2)}
                    </text>
                    <text
                      x={x(i)}
                      y={Math.min(h - pB - 8, yEff(Number(pt.efficiencyPct || 0)) + 15)}
                      textAnchor="middle"
                      className="chart-value eff-value"
                    >
                      {Number(pt.efficiencyPct || 0).toFixed(1)}%
                    </text>
                    <text x={x(i)} y={h - 14} textAnchor="middle" className="chart-date">
                      {shortDate(pt.date)}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
        {hover && (
          <div
            className="chart-pop"
            style={{ left: `${Math.min(78, Math.max(10, (hover.x / w) * 100))}%`, top: `${Math.max(7, (hover.y / h) * 100 - 3)}%` }}
          >
            <strong>
              {fmtDate(hover.date)} · Line {line.lineCode}
            </strong>
            <span>Efficiency: {num(hover.efficiencyPct)}%</span>
            <span>SMV: {num(hover.smv)}</span>
            <span>
              Target: {num(hover.target)} · Actual: {num(hover.actual)}
            </span>
            <span>Major NPT: {hover.majorNpt ? `${hover.majorNpt.type} · ${num(hover.majorNpt.minutes)} min` : 'None recorded'}</span>
            <span>
              QCO: {num(hover.qcoMinutes)} min · OT: {num(hover.otHours)} hr
            </span>
          </div>
        )}
      </div>
      <div className="trend-legend">
        <span>
          <i className="legend-smv"></i>SMV
        </span>
        <span>
          <i className="legend-eff"></i>Efficiency %
        </span>
      </div>
    </div>
  );
}

export default function LinePerformancePage() {
  const [month, setMonth] = useState(curMonth()),
    [floor, setFloor] = useState(''),
    [line, setLine] = useState(''),
    [custom, setCustom] = useState(false),
    [from, setFrom] = useState(monthBounds(curMonth()).from),
    [to, setTo] = useState(monthBounds(curMonth()).to),
    [data, setData] = useState<any>({ lines: [] }),
    [error, setError] = useState('');

  async function load(a = from, b = to) {
    setError('');
    try {
      const fp = floor ? `&floor=${encodeURIComponent(floor)}` : '';
      setData(await api(`/ie-ops/line-performance?from=${a}&to=${b}${fp}${line ? `&line=${encodeURIComponent(line)}` : ''}`));
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  function applyMonth(v: string) {
    setMonth(v);
    const b = monthBounds(v);
    setFrom(b.from);
    setTo(b.to);
    setCustom(false);
    setTimeout(() => load(b.from, b.to), 0);
  }

  const allPoints = useMemo(() => data.lines?.flatMap((x: any) => x.points) || [], [data]);
  const avgEff = allPoints.length ? allPoints.reduce((s: any, x: any) => s + Number(x.efficiencyPct || 0), 0) / allPoints.length : 0,
    avgSmv = allPoints.length ? allPoints.reduce((s: any, x: any) => s + Number(x.smv || 0), 0) / allPoints.length : 0,
    totalOt = allPoints.reduce((s: any, x: any) => s + Number(x.otHours || 0), 0),
    totalNpt = allPoints.reduce((s: any, x: any) => s + Number(x.nptMinutes || 0), 0);

  const detailColumns = useMemo<GridColumn<any>[]>(
    () => [
      { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
      { key: 'lineCode', header: 'Line', value: (r) => r.lineCode, render: (r) => <strong>{r.lineCode}</strong> },
      { key: 'jobNo', header: 'Job', value: (r) => r.jobNo || '—' },
      { key: 'smv', header: 'SMV', numeric: true, decimals: 2, value: (r) => Number(r.smv || 0) },
      { key: 'target', header: 'Target', numeric: true, total: true, unit: 'pcs', value: (r) => Number(r.target || 0) },
      { key: 'actual', header: 'Actual', numeric: true, total: true, unit: 'pcs', value: (r) => Number(r.actual || 0) },
      {
        key: 'performancePct',
        header: 'Performance%',
        numeric: true,
        decimals: 1,
        unit: '%',
        value: (r) => Number(r.performancePct || 0),
        render: (r) => `${num(r.performancePct)}%`
      },
      {
        key: 'efficiencyPct',
        header: 'Efficiency%',
        numeric: true,
        decimals: 1,
        unit: '%',
        value: (r) => Number(r.efficiencyPct || 0),
        render: (r) => <strong>{num(r.efficiencyPct)}%</strong>
      },
      { key: 'manpower', header: 'MP', numeric: true, total: true, value: (r) => Number(r.manpower || 0) },
      { key: 'otHours', header: 'OT', numeric: true, total: true, decimals: 1, value: (r) => Number(r.otHours || 0) },
      { key: 'nptMinutes', header: 'NPT', numeric: true, total: true, unit: 'min', value: (r) => Number(r.nptMinutes || 0) },
      {
        key: 'majorNpt',
        header: 'Major NPT',
        value: (r) => (r.majorNpt ? `${r.majorNpt.type} · ${num(r.majorNpt.minutes)}` : '—')
      },
      { key: 'qcoMinutes', header: 'QCO', numeric: true, total: true, unit: 'min', value: (r) => Number(r.qcoMinutes || 0) },
      { key: 'productivity', header: 'Productivity', numeric: true, decimals: 2, value: (r) => Number(r.productivity || 0) }
    ],
    []
  );

  return (
    <Shell title="Line-wise Performance">
      {error && <div className="notice">{error}</div>}
      <section className="panel">
        <div className="performance-filter">
          <label>
            Floor / Section{' '}
            <select value={floor} onChange={(e) => setFloor(e.target.value)}>
              <option value="">All Floors</option>
              <option value="Sewing-01">Sewing-1</option>
              <option value="Sewing-02">Sewing-2</option>
              <option value="Sewing-03">Sewing-3</option>
            </select>
          </label>
          <label>
            Line <input value={line} onChange={(e) => setLine(e.target.value)} placeholder="All lines" />
          </label>
          <label>
            Month <input type="month" value={month} onChange={(e) => applyMonth(e.target.value)} />
          </label>
          <label className="check-inline">
            <input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} /> Custom Date
          </label>
          {custom && (
            <>
              <label>
                From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label>
                To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
            </>
          )}
          <button className="btn btn-primary" onClick={() => load()}>
            Apply
          </button>
        </div>
      </section>
      <section className="ie-kpi-row">
        <div>
          <span>Avg SMV</span>
          <strong>{num(avgSmv)}</strong>
        </div>
        <div>
          <span>Avg Efficiency</span>
          <strong>{num(avgEff)}%</strong>
        </div>
        <div>
          <span>Total OT</span>
          <strong>{num(totalOt)} hr</strong>
        </div>
        <div>
          <span>Total NPT</span>
          <strong>{num(totalNpt)} min</strong>
        </div>
        <div>
          <span>Lines</span>
          <strong>{data.lines?.length || 0}</strong>
        </div>
      </section>
      <section className="trend-grid">
        {(data.lines || []).map((x: any) => (
          <Trend key={x.lineCode} line={x} />
        ))}
      </section>
      <section className="panel">
        <div className="panel-title" style={{ marginBottom: 10 }}>
          Daily Performance Detail
        </div>
        <DataGrid
          rows={allPoints}
          columns={detailColumns}
          rowKey={(r) => `${r.lineCode}-${r.date}-${r.jobNo || 'job'}`}
          storageKey="ie-line-performance-detail-v1"
          exportName="ie-line-performance-detail"
          frozenColumns={2}
          emptyText="No line performance records found for this filter."
        />
      </section>
    </Shell>
  );
}

