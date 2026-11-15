'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { DataGrid } from '../../../components/ui';
import type { GridColumn } from '../../../components/ui';
import { api } from '../../../lib/api';
import { fmtDate } from '../../../lib/format';

const init = {
  floorCode: 'Sewing-02',
  areaCode: '',
  lineCode: '',
  department: 'Production',
  role: 'Area Responsible',
  personName: '',
  effectiveFrom: '2026-09-25',
  effectiveTo: '',
  source: 'Manual'
};

export default function ResponsibilityPage() {
  const [floor, setFloor] = useState(''),
    [department, setDepartment] = useState(''),
    [rows, setRows] = useState<any[]>([]),
    [form, setForm] = useState<any>(init),
    [msg, setMsg] = useState(''),
    [error, setError] = useState('');

  async function load() {
    setRows(
      await api(
        `/ie-ops/responsibility?${floor ? `floor=${encodeURIComponent(floor)}&` : ''}${department ? `department=${encodeURIComponent(department)}` : ''}`
      )
    );
  }

  useEffect(() => {
    load().catch((e: any) => setError(e.message));
  }, []);

  async function save() {
    try {
      await api('/ie-ops/responsibility', { method: 'POST', body: JSON.stringify(form) });
      setMsg('Responsibility saved.');
      setForm({ ...init, floorCode: form.floorCode });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const columns = useMemo<GridColumn<any>[]>(
    () => [
      { key: 'floorCode', header: 'Floor', value: (r) => r.floorCode },
      { key: 'areaCode', header: 'Area', value: (r) => r.areaCode || '—' },
      { key: 'lineCode', header: 'Line', value: (r) => r.lineCode || '—' },
      { key: 'department', header: 'Department', value: (r) => r.department },
      { key: 'role', header: 'Role', value: (r) => r.role },
      { key: 'personName', header: 'Responsible', value: (r) => r.personName, render: (r) => <strong>{r.personName}</strong> },
      { key: 'effectiveFrom', header: 'From', value: (r) => fmtDate(r.effectiveFrom) },
      { key: 'effectiveTo', header: 'To', value: (r) => (r.effectiveTo ? fmtDate(r.effectiveTo) : 'Current') },
      { key: 'source', header: 'Source', value: (r) => r.source || '—' }
    ],
    []
  );

  return (
    <Shell title="Responsible Person Master">
      {msg && <div className="notice success-notice">{msg}</div>}
      {error && <div className="notice">{error}</div>}
      <section className="panel">
        <div className="ta-filter-row">
          <label>
            Floor{' '}
            <select value={floor} onChange={(e) => setFloor(e.target.value)}>
              <option value="">All</option>
              <option>Sewing-01</option>
              <option>Sewing-02</option>
              <option>Sewing-03</option>
            </select>
          </label>
          <label>
            Department{' '}
            <select value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">All</option>
              <option>Production</option>
              <option>Quality</option>
              <option>IE</option>
            </select>
          </label>
          <button className="btn btn-secondary" onClick={() => load().catch((e: any) => setError(e.message))}>
            Apply
          </button>
        </div>
      </section>
      <section className="panel">
        <div className="panel-title">Add / Change Responsibility</div>
        <div className="responsibility-form">
          <label>
            Floor
            <select value={form.floorCode} onChange={(e) => setForm({ ...form, floorCode: e.target.value })}>
              <option>Sewing-01</option>
              <option>Sewing-02</option>
              <option>Sewing-03</option>
            </select>
          </label>
          <label>
            Area
            <input value={form.areaCode} onChange={(e) => setForm({ ...form, areaCode: e.target.value })} placeholder="J/K/L" />
          </label>
          <label>
            Line
            <input value={form.lineCode} onChange={(e) => setForm({ ...form, lineCode: e.target.value })} placeholder="optional" />
          </label>
          <label>
            Department
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
              <option>Production</option>
              <option>Quality</option>
              <option>IE</option>
            </select>
          </label>
          <label>
            Role
            <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </label>
          <label>
            Person
            <input value={form.personName} onChange={(e) => setForm({ ...form, personName: e.target.value })} />
          </label>
          <label>
            Effective From
            <input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} />
          </label>
          <label>
            Effective To
            <input type="date" value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} />
          </label>
          <button className="btn btn-primary" onClick={save}>
            Save
          </button>
        </div>
      </section>
      <section className="panel">
        <DataGrid
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          storageKey="ie-responsibility-v1"
          exportName="ie-responsibility"
          frozenColumns={2}
          emptyText="No responsibility mapping records found."
        />
      </section>
    </Shell>
  );
}

