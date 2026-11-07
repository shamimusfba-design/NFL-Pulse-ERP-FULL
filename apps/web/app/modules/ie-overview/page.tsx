'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { DataGrid, DrillPopup } from '../../../components/ui';
import type { GridColumn, DrillTarget } from '../../../components/ui';
import { api } from '../../../lib/api';
import { fmtDate, fmtNum } from '../../../lib/format';

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const num = (v: any) => fmtNum(Number(v || 0), 1);

export default function IeOverview() {
  const [date, setDate] = useState(today());
  const [floor, setFloor] = useState('');
  const [data, setData] = useState<any>(null);
  const [linePerf, setLinePerf] = useState<any>({ lines: [] });
  const [error, setError] = useState('');
  const [drill, setDrill] = useState<DrillTarget | null>(null);

  async function load() {
    setError('');
    try {
      const fp = floor ? `&floor=${encodeURIComponent(floor)}` : '';
      const [ov, lp] = await Promise.all([
        api(`/ie-ops/overview?date=${date}${fp}`),
        api(`/ie-ops/line-performance?from=${date}&to=${date}${fp}`).catch(() => ({ lines: [] }))
      ]);
      setData(ov);
      setLinePerf(lp || { lines: [] });
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const c = data?.cards || {};

  function openEfficiencyDrill(e: React.MouseEvent, floorFocus?: string) {
    const rect = e.currentTarget.getBoundingClientRect();
    const lines = linePerf?.lines || [];
    const byLine = lines
      .map((l: any) => {
        const pt = (l.points || [])[0] || {};
        return {
          label: l.lineCode,
          value: Number(Number(pt.efficiencyPct || 0).toFixed(1)),
          filterValue: l.lineCode
        };
      })
      .filter((x: any) => x.value > 0)
      .sort((a: any, b: any) => b.value - a.value);
    const byFloor = (data?.floorRows || []).map((r: any) => ({
      label: r.floor,
      value: Number(Number(r.efficiency || 0).toFixed(1)),
      filterValue: r.floor
    }));
    setDrill({
      title: `${floorFocus ? `${floorFocus} ` : ''}Sewing Efficiency — By Line`,
      subtitle: `${byLine.length || byFloor.length} units on ${fmtDate(data?.date || date)} (double-click drill)`,
      unit: '%',
      tone: 'blue',
      anchorRect: rect,
      chartType: 'bar',
      byFactory: byLine.length ? byLine : byFloor,
      byBuyer: byFloor,
      filterLabel: 'Show Floor Performance →'
    });
  }

  const floorColumns = useMemo<GridColumn<any>[]>(
    () => [
      { key: 'floor', header: 'Floor', value: (r) => r.floor, render: (r) => <strong>{r.floor}</strong> },
      { key: 'target', header: 'Target', numeric: true, total: true, unit: 'pcs', value: (r) => Number(r.target || 0) },
      { key: 'actual', header: 'Actual', numeric: true, total: true, unit: 'pcs', value: (r) => Number(r.actual || 0) },
      {
        key: 'efficiency',
        header: 'Efficiency %',
        numeric: true,
        decimals: 1,
        unit: '%',
        value: (r) => Number(r.efficiency || 0),
        render: (r) => <strong>{num(r.efficiency)}%</strong>
      },
      { key: 'smv', header: 'SMV', numeric: true, decimals: 2, value: (r) => Number(r.smv || 0) },
      { key: 'manpower', header: 'MP', numeric: true, total: true, value: (r) => Number(r.manpower || 0) },
      { key: 'ot', header: 'OT (hr)', numeric: true, total: true, decimals: 1, value: (r) => Number(r.ot || 0) }
    ],
    []
  );

  return (
    <Shell title="IE Overview">
      {error && <div className="notice">{error}</div>}
      <section className="panel">
        <div className="ta-filter-row">
          <label>
            Date <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Floor{' '}
            <select value={floor} onChange={(e) => setFloor(e.target.value)}>
              <option value="">All</option>
              <option>Sewing-01</option>
              <option>Sewing-02</option>
              <option>Sewing-03</option>
            </select>
          </label>
          <button className="btn btn-primary" onClick={load}>
            Refresh
          </button>
          {data?.date && data.date !== data.requestedDate && (
            <span className="status-pill warn">Showing latest MIS date {fmtDate(data.date)}</span>
          )}
        </div>
      </section>
      <section className="overview-card-grid">
        <div>
          <span>Today Target</span>
          <strong>{num(c.todayTarget)}</strong>
        </div>
        <div>
          <span>Actual Output</span>
          <strong>{num(c.actualOutput)}</strong>
        </div>
        <div>
          <span>Achievement</span>
          <strong>{num(c.achievementPct)}%</strong>
        </div>
        <div
          onDoubleClick={(e) => openEfficiencyDrill(e)}
          style={{ cursor: 'pointer' }}
          title="Double-click to drill down by line"
        >
          <span>Efficiency (Double-click)</span>
          <strong style={{ color: '#2563EB' }}>{num(c.efficiencyPct)}%</strong>
        </div>
        <div>
          <span>Avg SMV</span>
          <strong>{num(c.avgSmv)}</strong>
        </div>
        <div>
          <span>Manpower</span>
          <strong>{num(c.manpower)}</strong>
        </div>
        <div>
          <span>OT</span>
          <strong>{num(c.otHours)} hr</strong>
        </div>
        <div>
          <span>NPT</span>
          <strong>{num(c.nptMinutes)} min</strong>
        </div>
        <div>
          <span>Avg QCO</span>
          <strong>{num(c.avgQcoMinutes)} min</strong>
        </div>
        <div>
          <span>Pending Bulletin</span>
          <strong>{num(c.pendingBulletin)}</strong>
        </div>
        <div>
          <span>Open Short Job</span>
          <strong>{num(c.openShort)}</strong>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Floor Performance</div>
            <div className="panel-sub">
              Target, output, efficiency, SMV, manpower and OT from MIS/IE data. Double-click any floor card for line breakdown.
            </div>
          </div>
        </div>
        <div className="floor-performance-grid" style={{ marginBottom: 14 }}>
          {(data?.floorRows || []).map((r: any) => (
            <div
              className="floor-card"
              key={r.floor}
              onDoubleClick={(e) => openEfficiencyDrill(e, r.floor)}
              style={{ cursor: 'pointer' }}
              title="Double-click to drill down by line"
            >
              <strong>{r.floor}</strong>
              <div>
                <span>Target</span>
                <b>{num(r.target)}</b>
              </div>
              <div>
                <span>Actual</span>
                <b>{num(r.actual)}</b>
              </div>
              <div>
                <span>Efficiency</span>
                <b>{num(r.efficiency)}%</b>
              </div>
              <div>
                <span>SMV</span>
                <b>{num(r.smv)}</b>
              </div>
              <div>
                <span>MP</span>
                <b>{num(r.manpower)}</b>
              </div>
              <div>
                <span>OT</span>
                <b>{num(r.ot)}</b>
              </div>
            </div>
          ))}
        </div>
        <DataGrid
          rows={data?.floorRows || []}
          columns={floorColumns}
          rowKey={(r) => r.floor}
          storageKey="ie-overview-floors-v1"
          exportName="ie-overview-floors"
          frozenColumns={2}
          emptyMessage="No floor performance records for this date."
        />
      </section>
      <section className="grid-2">
        <a className="panel action-panel" href="/modules/ie-bulletin">
          <strong>Bulletin Follow-up + Weekly Machine Plan</strong>
          <span>Pending/Missing bulletin and next 7 days type-wise machine shortage.</span>
        </a>
        <a className="panel action-panel" href="/modules/ie-line-performance">
          <strong>Line-wise Performance</strong>
          <span>Any month/custom date · SMV vs Efficiency with NPT/QCO hover.</span>
        </a>
        <a className="panel action-panel" href="/modules/kpi-board">
          <strong>KPI Board</strong>
          <span>Auto + manual monthly KPI readiness and board graphs.</span>
        </a>
        <a className="panel action-panel" href="/modules/kaizen">
          <strong>Kaizen</strong>
          <span>Submit → implement → sustain/spread → KPI saving.</span>
        </a>
      </section>
      <DrillPopup
        target={drill}
        onClose={() => setDrill(null)}
        onApplyFilter={(val) => {
          if (val.value.startsWith('Sewing-')) setFloor(val.value);
          setDrill(null);
        }}
      />
    </Shell>
  );
}

