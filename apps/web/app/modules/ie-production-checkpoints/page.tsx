'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { DataGrid } from '../../../components/ui';
import type { GridColumn } from '../../../components/ui';
import { api } from '../../../lib/api';
import { fmtNum } from '../../../lib/format';

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const pct = (a: any, b: any) => (Number(b || 0) > 0 ? `${fmtNum((Number(a || 0) / Number(b || 0)) * 100, 0)}%` : '—');

export default function CheckpointsPage() {
  const [date, setDate] = useState(today()),
    [floor, setFloor] = useState('Sewing-01'),
    [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState('');

  async function load() {
    setRows(await api(`/ie-ops/checkpoints?date=${date}&floor=${encodeURIComponent(floor)}`));
  }

  useEffect(() => {
    load().catch((e: any) => setError(e.message));
  }, []);

  const columns = useMemo<GridColumn<any>[]>(
    () => [
      { key: 'lineCode', header: 'Line', value: (r) => r.lineCode, render: (r) => <strong>{r.lineCode}</strong> },
      { key: 'jobNo', header: 'Job', value: (r) => r.jobNo || '—' },
      { key: 'smv', header: 'SMV', numeric: true, decimals: 2, value: (r) => Number(r.smv || 0) },
      { key: 'h1', header: '1H T/A', value: (r) => `${fmtNum(r.firstHourTarget)} / ${fmtNum(r.firstHourActual)}` },
      { key: 'h1Pct', header: '1H %', value: (r) => pct(r.firstHourActual, r.firstHourTarget) },
      { key: 'h4', header: '4H T/A', value: (r) => `${fmtNum(r.fourHourTarget)} / ${fmtNum(r.fourHourActual)}` },
      { key: 'h4Pct', header: '4H %', value: (r) => pct(r.fourHourActual, r.fourHourTarget) },
      { key: 'h8', header: '8H T/A', value: (r) => `${fmtNum(r.eightHourTarget)} / ${fmtNum(r.eightHourActual)}` },
      { key: 'h8Pct', header: '8H %', value: (r) => pct(r.eightHourActual, r.eightHourTarget) },
      { key: 'otActual', header: 'OT Actual', numeric: true, total: true, unit: 'pcs', value: (r) => Number(r.otActual || 0) },
      { key: 'daily', header: 'Daily T/A', value: (r) => `${fmtNum(r.dailyTarget)} / ${fmtNum(r.dailyActual)}` },
      {
        key: 'efficiencyPct',
        header: 'Efficiency',
        numeric: true,
        decimals: 1,
        unit: '%',
        value: (r) => Number(r.efficiencyPct || 0),
        render: (r) => `${r.efficiencyPct ?? '—'}%`
      }
    ],
    []
  );

  return (
    <Shell title="IE Production Checkpoints">
      {error && <div className="notice">{error}</div>}
      <section className="panel">
        <div className="ta-filter-row">
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Floor
            <select value={floor} onChange={(e) => setFloor(e.target.value)}>
              <option>Sewing-01</option>
              <option>Sewing-02</option>
              <option>Sewing-03</option>
            </select>
          </label>
          <button className="btn btn-primary" onClick={() => load().catch((e: any) => setError(e.message))}>
            Load
          </button>
        </div>
      </section>
      <section className="panel">
        <DataGrid
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id || `${r.lineCode}-${r.jobNo}`}
          storageKey="ie-production-checkpoints-v1"
          exportName="ie-production-checkpoints"
          frozenColumns={2}
          emptyText="No hourly production checkpoints found for this date and floor."
        />
      </section>
    </Shell>
  );
}

