'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { DataGrid } from '../../../components/ui';
import type { GridColumn } from '../../../components/ui';
import { api } from '../../../lib/api';
import { fmtNum } from '../../../lib/format';

const blank = {
  employeeId: '',
  employeeName: '',
  floorCode: 'Sewing-01',
  lineCode: '',
  operation: '',
  machineType: '',
  skillLevel: 3,
  proficiencyPct: 70,
  remarks: ''
};

export default function SkillMatrixPage() {
  const [floor, setFloor] = useState('Sewing-01'),
    [line, setLine] = useState(''),
    [rows, setRows] = useState<any[]>([]),
    [form, setForm] = useState<any>(blank),
    [msg, setMsg] = useState(''),
    [error, setError] = useState('');

  async function load() {
    setRows(await api(`/ie-ops/skill-matrix?floor=${encodeURIComponent(floor)}${line ? `&line=${encodeURIComponent(line)}` : ''}`));
  }

  useEffect(() => {
    load().catch((e: any) => setError(e.message));
  }, []);

  async function save() {
    try {
      await api('/ie-ops/skill-matrix', {
        method: 'POST',
        body: JSON.stringify({ ...form, floorCode: floor, lineCode: form.lineCode || line })
      });
      setMsg('Skill saved.');
      setForm({ ...blank, floorCode: floor, lineCode: line });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const people = useMemo(() => new Set(rows.map((x) => x.employeeName)).size, [rows]);
  const multi = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const r of rows) {
      const s = m.get(r.employeeName) || new Set();
      s.add(r.operation);
      m.set(r.employeeName, s);
    }
    return [...m.values()].filter((s) => s.size >= 2).length;
  }, [rows]);

  const columns = useMemo<GridColumn<any>[]>(
    () => [
      {
        key: 'employeeName',
        header: 'Employee',
        value: (r) => r.employeeName,
        render: (r) => (
          <div>
            <strong>{r.employeeName}</strong>
            {r.employeeId && <small style={{ display: 'block' }}>{r.employeeId}</small>}
          </div>
        )
      },
      { key: 'floorCode', header: 'Floor', value: (r) => r.floorCode },
      { key: 'lineCode', header: 'Line', value: (r) => r.lineCode || '—' },
      { key: 'operation', header: 'Operation', value: (r) => r.operation },
      { key: 'machineType', header: 'Machine', value: (r) => r.machineType || '—' },
      { key: 'skillLevel', header: 'Level', numeric: true, value: (r) => Number(r.skillLevel || 0), render: (r) => `${r.skillLevel}/5` },
      {
        key: 'proficiencyPct',
        header: 'Proficiency',
        numeric: true,
        decimals: 1,
        unit: '%',
        value: (r) => Number(r.proficiencyPct || 0),
        render: (r) => `${r.proficiencyPct ?? '—'}%`
      },
      { key: 'remarks', header: 'Remarks', value: (r) => r.remarks || '—' }
    ],
    []
  );

  return (
    <Shell title="IE Skill Matrix">
      {msg && <div className="notice success-notice">{msg}</div>}
      {error && <div className="notice">{error}</div>}
      <section className="panel">
        <div className="ta-filter-row">
          <label>
            Floor
            <select
              value={floor}
              onChange={(e) => {
                setFloor(e.target.value);
                setForm({ ...form, floorCode: e.target.value });
              }}
            >
              <option>Sewing-01</option>
              <option>Sewing-02</option>
              <option>Sewing-03</option>
            </select>
          </label>
          <label>
            Line
            <input value={line} onChange={(e) => setLine(e.target.value.toUpperCase())} placeholder="All / line code" />
          </label>
          <button className="btn btn-secondary" onClick={() => load().catch((e: any) => setError(e.message))}>
            Apply
          </button>
        </div>
      </section>
      <section className="ie-kpi-row">
        <div>
          <span>Skill Records</span>
          <strong>{fmtNum(rows.length)}</strong>
        </div>
        <div>
          <span>Operators</span>
          <strong>{fmtNum(people)}</strong>
        </div>
        <div>
          <span>Multi-skilled</span>
          <strong>{fmtNum(multi)}</strong>
        </div>
        <div>
          <span>Avg Proficiency</span>
          <strong>
            {rows.length ? fmtNum(rows.reduce((s, x) => s + Number(x.proficiencyPct || 0), 0) / rows.length, 1) : '0'}%
          </strong>
        </div>
      </section>
      <section className="panel">
        <div className="panel-title">Add / Update Skill</div>
        <div className="responsibility-form">
          <label>
            Employee ID
            <input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} />
          </label>
          <label>
            Employee Name
            <input value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} />
          </label>
          <label>
            Line
            <input value={form.lineCode} onChange={(e) => setForm({ ...form, lineCode: e.target.value.toUpperCase() })} />
          </label>
          <label>
            Operation
            <input value={form.operation} onChange={(e) => setForm({ ...form, operation: e.target.value })} />
          </label>
          <label>
            Machine Type
            <input value={form.machineType} onChange={(e) => setForm({ ...form, machineType: e.target.value })} />
          </label>
          <label>
            Skill Level (1-5)
            <input
              type="number"
              min="1"
              max="5"
              value={form.skillLevel}
              onChange={(e) => setForm({ ...form, skillLevel: Number(e.target.value) })}
            />
          </label>
          <label>
            Proficiency %
            <input
              type="number"
              min="0"
              max="100"
              value={form.proficiencyPct}
              onChange={(e) => setForm({ ...form, proficiencyPct: Number(e.target.value) })}
            />
          </label>
          <label>
            Remarks
            <input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </label>
          <button className="btn btn-primary" onClick={save}>
            Save Skill
          </button>
        </div>
      </section>
      <section className="panel">
        <DataGrid
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          storageKey="ie-skill-matrix-v1"
          exportName="ie-skill-matrix"
          frozenColumns={2}
          emptyText="No operator skill records found for this floor."
        />
      </section>
    </Shell>
  );
}

