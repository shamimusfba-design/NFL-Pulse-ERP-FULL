'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { DataGrid, DrillPopup } from '../../../components/ui';
import type { GridColumn, DrillTarget } from '../../../components/ui';
import { api } from '../../../lib/api';
import { fmtDate, fmtNum } from '../../../lib/format';
import { useFxScope } from '../../../components/fx';

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const num = (v: any) => fmtNum(Number(v || 0), 1);

function Trend({
  rows,
  leftKey = 'value',
  rightKey = 'value',
  labelLeft,
  labelRight
}: {
  rows: any[];
  leftKey?: string;
  rightKey?: string;
  labelLeft: string;
  labelRight: string;
}) {
  const fx = useFxScope();
  const w = 680,
    h = 220,
    p = 28;
  const lm = Math.max(1, ...rows.map((x) => Number(x[leftKey] || 0))),
    rm = Math.max(1, ...rows.map((x) => Number(x[rightKey] || 0)));
  const pts = (k: string, m: number) =>
    rows
      .map((x, i) => `${p + (rows.length <= 1 ? 0 : (i * (w - 2 * p)) / (rows.length - 1))},${h - p - (Number(x[k] || 0) / m) * (h - 2 * p)}`)
      .join(' ');
  return (
    <div className="mini-trend" ref={fx.ref} data-fx={fx['data-fx']}>
      <div className="chart-legend">
        <span>{labelLeft}</span>
        <span>{labelRight}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${labelLeft} and ${labelRight} trend`}>
        <line x1={p} y1={h - p} x2={w - p} y2={h - p} />
        <polyline className="series-a fx-line" pathLength={1} points={pts(leftKey, lm)} />
        <polyline className="series-b fx-line" style={{ ['--fx-i' as any]: 1 }} pathLength={1} points={pts(rightKey, rm)} />
        {rows.map((x, i) => {
          const xx = p + (rows.length <= 1 ? 0 : (i * (w - 2 * p)) / (rows.length - 1));
          return (
            <g key={x.name || i}>
              <circle
                className="series-a-dot fx-dot"
                style={{ ['--fx-i' as any]: i }}
                cx={xx}
                cy={h - p - (Number(x[leftKey] || 0) / lm) * (h - 2 * p)}
                r="4"
              >
                <title>{`${x.name}: ${labelLeft} ${num(x[leftKey])}; ${labelRight} ${num(x[rightKey])}`}</title>
              </circle>
              <text x={xx} y={h - 6} textAnchor="middle">
                {String(x.name || '').slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function NptPage() {
  const [from, setFrom] = useState(monthStart()),
    [to, setTo] = useState(today()),
    [floor, setFloor] = useState(''),
    [summary, setSummary] = useState<any>(null),
    [rows, setRows] = useState<any[]>([]),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState(''),
    [error, setError] = useState(''),
    [canManage, setCanManage] = useState(false);
  const [entry, setEntry] = useState<any>({
    date: today(),
    lineCode: '',
    nptType: '',
    totalMinutes: '',
    responsiblePerson: '',
    remarks: ''
  });
  const [drill, setDrill] = useState<DrillTarget | null>(null);
  const [filterReason, setFilterReason] = useState<string>('');
  const [filterLine, setFilterLine] = useState<string>('');

  async function load() {
    const q = `from=${from}&to=${to}${floor ? `&floor=${encodeURIComponent(floor)}` : ''}`;
    const [s, r] = await Promise.all([api(`/ie-ops/npt/summary?${q}`), api(`/ie-ops/npt?${q}`)]);
    setSummary(s);
    setRows(r);
  }

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('nfl_user') || '{}');
      setCanManage((u.roles || []).some((r: string) => ['ADMIN', 'IE'].includes(r)));
    } catch {}
    load().catch((e: any) => setError(e.message));
  }, []);

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api('/ie-ops/npt/import', { method: 'POST', body: fd });
      setMsg(`${r.nptRows} NPT + ${r.machineBreakdownRows} breakdown rows imported.`);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function addQuick() {
    if (!String(entry.lineCode).trim()) return setError('Line required.');
    if (!String(entry.nptType).trim()) return setError('NPT type required.');
    if (Number(entry.totalMinutes) <= 0) return setError('NPT minutes required.');
    setBusy(true);
    setError('');
    try {
      await api('/ie-ops/npt', {
        method: 'POST',
        body: JSON.stringify({ ...entry, totalMinutes: Number(entry.totalMinutes) })
      });
      setMsg(`✓ ${entry.lineCode} NPT saved.`);
      setEntry((p: any) => ({ ...p, nptType: '', totalMinutes: '', responsiblePerson: '', remarks: '' }));
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function openNptDrill(e: React.MouseEvent, focusReason?: string, focusLine?: string) {
    const rect = e.currentTarget.getBoundingClientRect();
    const subset = rows.filter((r: any) => {
      const reason = r.recordKind === 'MACHINE_BREAKDOWN' ? `${r.machineType || 'M/C'} · ${r.processName || ''}` : r.nptType;
      if (focusReason && reason !== focusReason && r.nptType !== focusReason) return false;
      if (focusLine && r.lineCode !== focusLine) return false;
      return true;
    });
    const byReasonMap = new Map<string, number>();
    const byLineMap = new Map<string, number>();
    for (const r of subset) {
      const reason = r.nptType || r.machineType || 'Unspecified';
      byReasonMap.set(reason, (byReasonMap.get(reason) || 0) + Number(r.totalMinutes || 0));
      const ln = r.lineCode || 'Unassigned';
      byLineMap.set(ln, (byLineMap.get(ln) || 0) + Number(r.totalMinutes || 0));
    }
    const byReason = [...byReasonMap.entries()]
      .map(([label, value]) => ({ label, value, filterValue: label }))
      .sort((a, b) => b.value - a.value);
    const byLine = [...byLineMap.entries()]
      .map(([label, value]) => ({ label, value, filterValue: label }))
      .sort((a, b) => b.value - a.value);

    setDrill({
      title: `Lost Time (NPT) — ${focusReason || focusLine || 'By Reason & Line'}`,
      subtitle: `${fmtNum(subset.reduce((s, r) => s + Number(r.totalMinutes || 0), 0))} mins across ${subset.length} records`,
      unit: 'min',
      tone: 'red',
      anchorRect: rect,
      chartType: 'bar',
      byBuyer: byReason,
      byFactory: byLine,
      filterLabel: 'Show these NPT records in the table →'
    });
  }

  const max = Math.max(1, ...(summary?.byType || []).map((x: any) => x.value)),
    lineMax = Math.max(1, ...(summary?.byLine || []).map((x: any) => x.value)),
    machineMax = Math.max(1, ...(summary?.machineBreakdown || []).map((x: any) => x.total));
  const daily = useMemo(() => summary?.byDate || [], [summary]);

  const filteredRows = useMemo(() => {
    return rows.filter((r: any) => {
      if (filterReason && r.nptType !== filterReason && r.machineType !== filterReason) return false;
      if (filterLine && r.lineCode !== filterLine) return false;
      return true;
    });
  }, [rows, filterReason, filterLine]);

  const nptColumns = useMemo<GridColumn<any>[]>(
    () => [
      { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
      { key: 'lineCode', header: 'Line', value: (r) => r.lineCode, render: (r) => <strong>{r.lineCode}</strong> },
      { key: 'recordKind', header: 'Kind', value: (r) => r.recordKind },
      {
        key: 'nptType',
        header: 'NPT / Machine',
        value: (r) => (r.recordKind === 'MACHINE_BREAKDOWN' ? `${r.machineType || 'M/C'} · ${r.processName || ''}` : r.nptType)
      },
      {
        key: 'totalMinutes',
        header: 'Minutes',
        numeric: true,
        total: true,
        unit: 'min',
        value: (r) => Number(r.totalMinutes || 0)
      },
      {
        key: 'waitingMinutes',
        header: 'Waiting',
        numeric: true,
        total: true,
        unit: 'min',
        value: (r) => Number(r.waitingMinutes || 0)
      },
      {
        key: 'repairMinutes',
        header: 'Repair',
        numeric: true,
        total: true,
        unit: 'min',
        value: (r) => Number(r.repairMinutes || 0)
      },
      { key: 'responsiblePerson', header: 'Responsible', value: (r) => r.responsiblePerson || '—' },
      { key: 'ieName', header: 'IE', value: (r) => r.ieName || '—' }
    ],
    []
  );

  return (
    <Shell title="IE NPT">
      {msg && <div className="notice success-notice">{msg}</div>}
      {error && <div className="notice">{error}</div>}
      <section className="panel mobile-entry-panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Quick NPT Entry</div>
            <div className="panel-sub">Direct shop floor entry. Line and floor codes auto-inferred.</div>
          </div>
        </div>
        <div className="mobile-entry-grid npt-entry-grid">
          <label>
            <span>Date</span>
            <input type="date" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} />
          </label>
          <label>
            <span>Line</span>
            <input
              value={entry.lineCode}
              placeholder="e.g. N1"
              onChange={(e) => setEntry({ ...entry, lineCode: e.target.value.toUpperCase() })}
            />
          </label>
          <label>
            <span>NPT Type</span>
            <input
              value={entry.nptType}
              placeholder="Reason / type"
              onChange={(e) => setEntry({ ...entry, nptType: e.target.value })}
            />
          </label>
          <label>
            <span>Minutes</span>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={entry.totalMinutes}
              onChange={(e) => setEntry({ ...entry, totalMinutes: e.target.value })}
            />
          </label>
          <label>
            <span>Responsible</span>
            <input
              value={entry.responsiblePerson}
              placeholder="Dept / person"
              onChange={(e) => setEntry({ ...entry, responsiblePerson: e.target.value })}
            />
          </label>
          <label className="entry-wide">
            <span>Remarks</span>
            <input
              value={entry.remarks}
              placeholder="Optional"
              onChange={(e) => setEntry({ ...entry, remarks: e.target.value })}
            />
          </label>
          <button className="btn btn-primary entry-save" disabled={busy} onClick={addQuick}>
            {busy ? 'Saving…' : 'Save NPT'}
          </button>
        </div>
      </section>
      <section className="panel">
        <div className="ta-filter-row">
          <label>
            From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
          <button className="btn btn-secondary" onClick={() => load().catch((e: any) => setError(e.message))}>
            Apply
          </button>
          {(filterReason || filterLine) && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setFilterReason('');
                setFilterLine('');
              }}
            >
              Clear Filter ({filterReason || filterLine}) ×
            </button>
          )}
          {canManage && (
            <>
              <label className="file-inline">
                Import NPT
                <input type="file" accept=".xlsx,.xlsm,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
              <button className="btn btn-primary" disabled={!file || busy} onClick={upload}>
                {busy ? 'Importing…' : 'Import'}
              </button>
            </>
          )}
        </div>
      </section>
      <section className="ie-kpi-row">
        <div
          onDoubleClick={(e) => openNptDrill(e)}
          style={{ cursor: 'pointer' }}
          title="Double-click to drill down by reason and line"
        >
          <span>Total NPT Min (Double-click)</span>
          <strong style={{ color: '#DC2626' }}>{num(summary?.totalMinutes)}</strong>
        </div>
        <div>
          <span>Lost Money</span>
          <strong>{num(summary?.lostMoney)}</strong>
        </div>
        <div>
          <span>Machine Breakdown Min</span>
          <strong>{num(summary?.breakdownMinutes)}</strong>
        </div>
        <div>
          <span>Top Reason</span>
          <strong>{summary?.byType?.[0]?.name || '—'}</strong>
        </div>
        <div>
          <span>Highest NPT Line</span>
          <strong>{summary?.byLine?.[0]?.name || '—'}</strong>
        </div>
      </section>
      <section className="grid-2">
        <div className="panel">
          <div className="panel-title">1. NPT Type Pareto (Single-click filter · Double-click drill)</div>
          <div className="hbar-list">
            {(summary?.byType || []).slice(0, 10).map((x: any) => {
              const active = !filterReason || filterReason === x.name;
              return (
                <div
                  className="hbar-row"
                  key={x.name}
                  onClick={() => setFilterReason((prev) => (prev === x.name ? '' : x.name))}
                  onDoubleClick={(e) => openNptDrill(e, x.name)}
                  style={{ cursor: 'pointer', opacity: active ? 1 : 0.3 }}
                >
                  <span>{x.name}</span>
                  <div>
                    <i style={{ width: `${Math.max(2, (x.value / max) * 100)}%` }}></i>
                  </div>
                  <b>{num(x.value)}</b>
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel">
          <div className="panel-title">2. Line-wise NPT (Single-click filter · Double-click drill)</div>
          <div className="hbar-list">
            {(summary?.byLine || []).slice(0, 12).map((x: any) => {
              const active = !filterLine || filterLine === x.name;
              return (
                <div
                  className="hbar-row"
                  key={x.name}
                  onClick={() => setFilterLine((prev) => (prev === x.name ? '' : x.name))}
                  onDoubleClick={(e) => openNptDrill(e, undefined, x.name)}
                  style={{ cursor: 'pointer', opacity: active ? 1 : 0.3 }}
                >
                  <span>{x.name}</span>
                  <div>
                    <i style={{ width: `${Math.max(2, (x.value / lineMax) * 100)}%` }}></i>
                  </div>
                  <b>{num(x.value)}</b>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section className="grid-2">
        <div className="panel">
          <div className="panel-title">3. Daily NPT Trend</div>
          <Trend rows={daily.map((x: any) => ({ ...x, zero: 0 }))} leftKey="value" rightKey="zero" labelLeft="NPT Min" labelRight="Baseline" />
        </div>
        <div className="panel">
          <div className="panel-title">4. NPT vs Efficiency</div>
          <Trend rows={daily} leftKey="value" rightKey="efficiency" labelLeft="NPT Min" labelRight="Efficiency %" />
        </div>
      </section>
      <section className="panel">
        <div className="panel-title">5. Machine Breakdown Analysis</div>
        <div className="hbar-list stacked-breakdown">
          {(summary?.machineBreakdown || []).slice(0, 15).map((x: any) => (
            <div className="hbar-row" key={x.name} onDoubleClick={(e) => openNptDrill(e, x.name)} style={{ cursor: 'pointer' }}>
              <span>{x.name}</span>
              <div>
                <i className="wait" style={{ width: `${Math.max(1, (x.waiting / machineMax) * 100)}%` }}></i>
                <i className="repair" style={{ width: `${Math.max(1, (x.repair / machineMax) * 100)}%` }}></i>
              </div>
              <b>
                {num(x.total)}m{' '}
                <small>
                  W {num(x.waiting)} / R {num(x.repair)}
                </small>
              </b>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">NPT Detail</div>
            <div className="panel-sub">Machine breakdown keeps process, machine, waiting and repair time separately.</div>
          </div>
        </div>
        <DataGrid
          rows={filteredRows}
          columns={nptColumns}
          rowKey={(r) => r.id}
          storageKey="ie-npt-detail-v1"
          exportName="ie-npt-detail"
          frozenColumns={2}
          emptyMessage="No NPT records match the current filter."
        />
      </section>
      <DrillPopup
        target={drill}
        onClose={() => setDrill(null)}
        onApplyFilter={(val) => {
          const isLine = rows.some((r: any) => r.lineCode === val);
          if (isLine) setFilterLine(val);
          else setFilterReason(val);
          setDrill(null);
        }}
      />
    </Shell>
  );
}

