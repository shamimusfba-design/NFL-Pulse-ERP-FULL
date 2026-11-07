'use client';

import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { DataGrid } from '../../../components/ui';
import type { GridColumn } from '../../../components/ui';
import { api } from '../../../lib/api';
import { displayJobNo } from '../../../lib/display';
import { fmtDate, fmtNum } from '../../../lib/format';

type FollowStatus = 'ALL' | 'MISSING' | 'PENDING' | 'REVISED' | 'DONE';
type WeeklyFilter = 'ALL' | 'SHORTAGE';
type MachineRequirement = { machineType: string; qty: string };
type FormState = {
  bulletinDate: string;
  revision: string;
  smv: string;
  dailyTarget: string;
  operator: string;
  helper: string;
  finishingManpower: string;
  totalManpower: string;
  machineQty: string;
  achievableEfficiency: string;
  remarks: string;
  machineRequirements: MachineRequirement[];
};
const emptyForm: FormState = {
  bulletinDate: '',
  revision: '1',
  smv: '',
  dailyTarget: '',
  operator: '',
  helper: '',
  finishingManpower: '',
  totalManpower: '',
  machineQty: '',
  achievableEfficiency: '65',
  remarks: '',
  machineRequirements: []
};
function dateInput(v: any) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function tone(status: string) {
  return status === 'DONE' ? 'good' : status === 'REVISED' ? 'warn' : status === 'MISSING' ? 'bad' : 'neutral';
}
function machineTotal(rows: MachineRequirement[]) {
  return rows.reduce((s, x) => s + Math.max(0, Number(x.qty || 0)), 0);
}
function mpTotal(f: FormState) {
  const split = Number(f.operator || 0) + Number(f.helper || 0) + Number(f.finishingManpower || 0);
  return Number(f.totalManpower || 0) || split;
}
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function weeklyTone(status: string) {
  return status === 'SHORTAGE' ? 'bad' : status === 'AVAILABLE' ? 'good' : 'neutral';
}
function affectedJobs(jobs: any[]) {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const j of jobs || []) {
    const key = `${j.line}|${j.jobNo}|${j.styleNo}`;
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(`${j.line} · ${j.jobNo}/${j.styleNo}`);
  }
  return parts.join(' · ');
}

export default function IeBulletinPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [filter, setFilter] = useState<FollowStatus>('ALL');
  const [q, setQ] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [weekly, setWeekly] = useState<any>(null);
  const [weeklyStart, setWeeklyStart] = useState(localToday());
  const [weeklyFactory, setWeeklyFactory] = useState('NFL');
  const [weeklyFilter, setWeeklyFilter] = useState<WeeklyFilter>('ALL');
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState('');

  async function load(preferred?: string) {
    setLoading(true);
    setError('');
    try {
      const data = await api('/ie/workqueue');
      setRows(data || []);
      const next =
        preferred ||
        selectedId ||
        data?.find((x: any) => x.followUp?.status !== 'DONE')?.style?.id ||
        data?.[0]?.style?.id ||
        '';
      setSelectedId(next);
      const row = data?.find((x: any) => x.style?.id === next);
      if (row) hydrate(row);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  async function loadWeekly() {
    setWeeklyLoading(true);
    setWeeklyError('');
    try {
      setWeekly(
        await api(
          `/maintenance/weekly-requirement?startDate=${encodeURIComponent(weeklyStart)}&factory=${encodeURIComponent(weeklyFactory)}`
        )
      );
    } catch (e: any) {
      setWeeklyError(e.message);
    } finally {
      setWeeklyLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    loadWeekly();
  }, [weeklyStart, weeklyFactory]);

  function hydrate(row: any) {
    const b = row?.style?.ieBulletin || {};
    const req = Array.isArray(b.machineRequirements) ? b.machineRequirements : [];
    setForm({
      bulletinDate: dateInput(b.bulletinDate || b.releaseDate || b.updatedAt),
      revision: String(b.revision || 1),
      smv: b.smv ? String(b.smv) : '',
      dailyTarget: b.dailyTarget ? String(b.dailyTarget) : '',
      operator: b.operator !== undefined && b.operator !== null ? String(b.operator) : '',
      helper: b.helper !== undefined && b.helper !== null ? String(b.helper) : '',
      finishingManpower: b.finishingManpower !== undefined && b.finishingManpower !== null ? String(b.finishingManpower) : '',
      totalManpower: b.manpower ? String(b.manpower) : '',
      machineQty: b.machineQty ? String(b.machineQty) : '',
      achievableEfficiency: String(b.achievableEfficiencyPct || b.achievableEfficiency || 65),
      remarks: b.remarks || '',
      machineRequirements: req.map((x: any) => ({ machineType: x.machineType || '', qty: String(x.qty ?? '') }))
    });
  }

  const selected = useMemo(() => rows.find((x: any) => x.style?.id === selectedId) || null, [rows, selectedId]);
  const visible = useMemo(
    () =>
      rows.filter((r: any) => {
        const status = r.followUp?.status || 'MISSING';
        if (filter !== 'ALL' && status !== filter) return false;
        const s = q.trim().toLowerCase();
        return !s || `${r.jobNo} ${r.style?.styleNo} ${r.style?.itemDescription || ''} ${r.followUp?.line || ''}`.toLowerCase().includes(s);
      }),
    [rows, filter, q]
  );
  const counts = useMemo(
    () => ({
      total: rows.length,
      done: rows.filter((x) => x.followUp?.status === 'DONE').length,
      pending: rows.filter((x) => x.followUp?.status === 'PENDING').length,
      missing: rows.filter((x) => x.followUp?.status === 'MISSING').length,
      revised: rows.filter((x) => x.followUp?.status === 'REVISED').length
    }),
    [rows]
  );
  const weeklyRows = useMemo(() => {
    const all = (weekly?.days || []).flatMap((d: any) =>
      (d.rows || []).map((r: any) => ({ ...r, date: d.date, dayLabel: d.dayLabel, dayShortageQty: d.shortageQty }))
    );
    return weeklyFilter === 'SHORTAGE' ? all.filter((r: any) => Number(r.shortageQty) > 0) : all;
  }, [weekly, weeklyFilter]);

  function choose(row: any) {
    setSelectedId(row.style.id);
    hydrate(row);
    setMsg('');
    setError('');
  }
  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function updateMachine(i: number, key: keyof MachineRequirement, value: string) {
    setForm((prev) => ({
      ...prev,
      machineRequirements: prev.machineRequirements.map((x, n) => (n === i ? { ...x, [key]: value } : x))
    }));
  }
  function addMachine() {
    setForm((prev) => ({ ...prev, machineRequirements: [...prev.machineRequirements, { machineType: '', qty: '' }] }));
  }
  function removeMachine(i: number) {
    setForm((prev) => ({ ...prev, machineRequirements: prev.machineRequirements.filter((_, n) => n !== i) }));
  }

  async function save(action: 'SAVE_DRAFT' | 'RELEASE') {
    if (!selected) return;
    setBusy(true);
    setMsg('');
    setError('');
    try {
      const reqs = form.machineRequirements
        .filter((x) => x.machineType.trim() && Number(x.qty) > 0)
        .map((x) => ({ machineType: x.machineType.trim(), qty: Number(x.qty) }));
      const totalMachine = Number(form.machineQty || 0) || machineTotal(form.machineRequirements);
      const totalManpower = mpTotal(form);
      if (!Number(form.smv) || !Number(form.dailyTarget) || !totalManpower || !totalMachine) {
        throw new Error('SMV, standard target, required manpower and required machine are required.');
      }
      await api(`/ie/styles/${selected.style.id}/bulletin`, {
        method: 'PUT',
        body: JSON.stringify({
          action,
          bulletinDate: form.bulletinDate || undefined,
          revision: Number(form.revision || 1),
          smv: Number(form.smv),
          dailyTarget: Number(form.dailyTarget),
          operator: Number(form.operator || 0),
          helper: Number(form.helper || 0),
          finishingManpower: Number(form.finishingManpower || 0),
          totalManpower,
          manpower: totalManpower,
          machineQty: totalMachine,
          machineRequirements: reqs,
          achievableEfficiency: Number(form.achievableEfficiency || 65),
          workingHours: 8,
          remarks: form.remarks
        })
      });
      setMsg(action === 'RELEASE' ? 'IE Bulletin released to Planning/Gantt.' : 'IE Bulletin draft saved.');
      await load(selected.style.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function bulkImport() {
    if (!files.length) return;
    setBusy(true);
    setMsg('');
    setError('');
    let ok = 0;
    const failed: string[] = [];
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('reportType', 'IE_BULLETIN');
        const preview = await api('/imports/preview', { method: 'POST', body: fd });
        if (preview.reportType !== 'IE_BULLETIN' || !preview.validRows) throw new Error('IE Bulletin data not detected');
        await api(`/imports/${preview.batchId}/commit`, { method: 'POST' });
        ok++;
      } catch (e: any) {
        failed.push(`${file.name}: ${e.message}`);
      }
    }
    if (ok) setMsg(`${ok} IE Bulletin file(s) imported and released to ERP.`);
    if (failed.length) setError(failed.join(' · '));
    setFiles([]);
    await load();
    setBusy(false);
  }

  const weeklyColumns = useMemo<GridColumn<any>[]>(
    () => [
      { key: 'date', header: 'Date', value: (r) => r.dayLabel || fmtDate(r.date), render: (r) => <strong>{r.dayLabel || fmtDate(r.date)}</strong> },
      { key: 'machineType', header: 'Machine Type', value: (r) => r.machineType, render: (r) => <strong>{r.machineType}</strong> },
      { key: 'requiredQty', header: 'Required', numeric: true, total: true, value: (r) => Number(r.requiredQty || 0) },
      { key: 'totalQty', header: 'Factory Total', numeric: true, total: true, value: (r) => Number(r.totalQty || 0) },
      { key: 'breakdownQty', header: 'Breakdown', numeric: true, total: true, value: (r) => Number(r.breakdownQty || 0) },
      { key: 'rentQty', header: 'Rent', numeric: true, total: true, value: (r) => Number(r.rentQty || 0) },
      {
        key: 'netAvailableQty',
        header: 'Net Available',
        numeric: true,
        total: true,
        value: (r) => Number(r.netAvailableQty || 0),
        render: (r) => <strong>{fmtNum(r.netAvailableQty)}</strong>
      },
      {
        key: 'status',
        header: 'Short / Available',
        value: (r) => (r.shortageQty > 0 ? `Short ${r.shortageQty}` : r.surplusQty > 0 ? `Available ${r.surplusQty}` : 'Balanced'),
        render: (r) => (
          <span className={`status-pill ${weeklyTone(r.status)}`}>
            {r.shortageQty > 0 ? `Short ${fmtNum(r.shortageQty)}` : r.surplusQty > 0 ? `Available ${fmtNum(r.surplusQty)}` : 'Balanced'}
          </span>
        )
      },
      { key: 'affectedJobs', header: 'Affected Line / Job', value: (r) => affectedJobs(r.jobs) || '—' },
      { key: 'source', header: 'Maintenance Data', value: (r) => fmtDate(r.maintenanceSourceDate) || 'Machine Master' }
    ],
    []
  );

  const followColumns = useMemo<GridColumn<any>[]>(
    () => [
      {
        key: 'jobNo',
        header: 'Job',
        value: (r) => displayJobNo(r.jobNo, r.buyer?.code || r.buyer?.name),
        render: (r) => <strong>{displayJobNo(r.jobNo, r.buyer?.code || r.buyer?.name)}</strong>
      },
      { key: 'styleNo', header: 'Style', value: (r) => r.style.styleNo },
      { key: 'line', header: 'Line', value: (r) => r.followUp?.line || '—' },
      { key: 'planMonth', header: 'Plan Month', value: (r) => r.followUp?.planMonth || '—' },
      { key: 'bulletinDate', header: 'Bulletin Date', value: (r) => fmtDate(r.followUp?.bulletinDate) },
      { key: 'revision', header: 'Rev', numeric: true, value: (r) => Number(r.followUp?.revision || 1) },
      { key: 'smv', header: 'SMV', numeric: true, decimals: 2, value: (r) => Number(r.style.ieBulletin?.smv || 0) },
      {
        key: 'dailyTarget',
        header: 'Std. Target',
        numeric: true,
        total: true,
        unit: 'pcs',
        value: (r) => Number(r.style.ieBulletin?.dailyTarget || 0)
      },
      { key: 'manpower', header: 'Req. MP', numeric: true, total: true, value: (r) => Number(r.style.ieBulletin?.manpower || 0) },
      { key: 'machineQty', header: 'Req. M/C', numeric: true, total: true, value: (r) => Number(r.style.ieBulletin?.machineQty || 0) },
      {
        key: 'status',
        header: 'Status',
        value: (r) => r.followUp?.status || 'MISSING',
        render: (r) => <span className={`status-pill ${tone(r.followUp?.status)}`}>{r.followUp?.status || 'MISSING'}</span>
      },
      { key: 'pendingDays', header: 'Pending Days', numeric: true, value: (r) => Number(r.followUp?.pendingDays ?? 0) }
    ],
    []
  );

  return (
    <Shell title="IE Bulletin">
      {msg && <div className="notice success-notice">{msg}</div>}
      {error && <div className="notice">{error}</div>}

      <section className="ie-kpi-row">
        <div>
          <span>Total Jobs</span>
          <strong>{fmtNum(counts.total)}</strong>
        </div>
        <div>
          <span>Done</span>
          <strong>{fmtNum(counts.done)}</strong>
        </div>
        <div>
          <span>Pending</span>
          <strong>{fmtNum(counts.pending)}</strong>
        </div>
        <div>
          <span>Missing</span>
          <strong>{fmtNum(counts.missing)}</strong>
        </div>
        <div>
          <span>Revised</span>
          <strong>{fmtNum(counts.revised)}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Weekly Machine Requirement Plan · Next 7 Days</div>
          </div>
          <span className={`status-pill ${Number(weekly?.summary?.shortageTypes || 0) > 0 ? 'bad' : 'good'}`}>
            {weeklyLoading ? 'Loading…' : `${weekly?.summary?.shortageTypes || 0} shortage type(s)`}
          </span>
        </div>
        {weeklyError && <div className="notice">{weeklyError}</div>}
        <div className="ta-filter-row">
          <label>
            Start Date <input type="date" value={weeklyStart} onChange={(e) => setWeeklyStart(e.target.value)} />
          </label>
          <label>
            Factory{' '}
            <select value={weeklyFactory} onChange={(e) => setWeeklyFactory(e.target.value)}>
              <option value="NFL">NFL</option>
              <option value="NCL">NCL</option>
            </select>
          </label>
          {(['ALL', 'SHORTAGE'] as WeeklyFilter[]).map((x) => (
            <button key={x} className={weeklyFilter === x ? 'mini-tab active' : 'mini-tab'} onClick={() => setWeeklyFilter(x)}>
              {x === 'ALL' ? 'All Required Types' : 'Shortage Only'}
            </button>
          ))}
          <button className="btn btn-secondary" disabled={weeklyLoading} onClick={loadWeekly}>
            Refresh Data
          </button>
        </div>
        <section className="ie-kpi-row maintenance-kpi-row">
          <div>
            <span>Shortage Types</span>
            <strong>{fmtNum(weekly?.summary?.shortageTypes)}</strong>
          </div>
          <div>
            <span>Peak Daily Shortage</span>
            <strong>{fmtNum(weekly?.summary?.peakShortageQty)}</strong>
          </div>
          <div>
            <span>Days with Shortage</span>
            <strong>{fmtNum(weekly?.summary?.daysWithShortage)}</strong>
          </div>
          <div>
            <span>Affected Lines</span>
            <strong>{fmtNum(weekly?.summary?.affectedLines)}</strong>
          </div>
          <div>
            <span>Affected Jobs</span>
            <strong>{fmtNum(weekly?.summary?.affectedJobs)}</strong>
          </div>
        </section>
        <DataGrid
          rows={weeklyRows}
          columns={weeklyColumns}
          rowKey={(r) => `${r.date}-${r.normalizedKey}-${r.machineType}`}
          storageKey="ie-bulletin-weekly-req-v1"
          exportName="ie-bulletin-weekly-req"
          frozenColumns={2}
          emptyMessage="No Gantt machine requirement found for this 7-day window."
        />
      </section>

      <section className="panel import-panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Monthly / bulk IE Bulletin upload</div>
          </div>
          <span className="status-pill neutral">{files.length} file(s)</span>
        </div>
        <div className="import-grid">
          <label>
            IE Bulletin files
            <input type="file" multiple accept=".xls,.xlsx,.xlsm" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
          </label>
          <button className="btn btn-primary" disabled={busy || !files.length} onClick={bulkImport}>
            {busy ? 'Importing…' : 'Import Data'}
          </button>
        </div>
        {!!files.length && (
          <div className="panel-note">
            {files
              .slice(0, 6)
              .map((x) => x.name)
              .join(' · ')}
            {files.length > 6 ? ` · +${files.length - 6} more` : ''}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Central IE Bulletin Follow-up Tracker</div>
            <div className="panel-sub">Planning job list vs imported/released IE Bulletin.</div>
          </div>
          <span className="status-pill neutral">{loading ? 'Loading…' : visible.length}</span>
        </div>
        <div className="ta-filter-row">
          {(['ALL', 'MISSING', 'PENDING', 'REVISED', 'DONE'] as FollowStatus[]).map((x) => (
            <button key={x} className={filter === x ? 'mini-tab active' : 'mini-tab'} onClick={() => setFilter(x)}>
              {x}
            </button>
          ))}
          <input
            style={{ minWidth: 220 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Job / Style / Line"
          />
        </div>
        <DataGrid
          rows={visible}
          columns={followColumns}
          rowKey={(r) => r.style.id}
          storageKey="ie-bulletin-followup-v1"
          exportName="ie-bulletin-followup"
          frozenColumns={2}
          onRowClick={(r) => choose(r)}
          emptyMessage="No matching jobs."
        />
      </section>

      {selected && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">
                {displayJobNo(selected.jobNo, selected.buyer?.code || selected.buyer?.name)} · {selected.style.styleNo}
              </div>
              <div className="panel-sub">
                Operational IE summary · source file: {selected.followUp?.sourceFileName || 'manual / legacy'}
              </div>
            </div>
            <span className={`status-pill ${tone(selected.followUp?.status)}`}>{selected.followUp?.status}</span>
          </div>
          <div className="gantt-detail-grid">
            <label>
              <span>Bulletin Date</span>
              <input type="date" value={form.bulletinDate} onChange={(e) => set('bulletinDate', e.target.value)} />
            </label>
            <label>
              <span>Revision</span>
              <input type="number" min="1" value={form.revision} onChange={(e) => set('revision', e.target.value)} />
            </label>
            <label>
              <span>SMV</span>
              <input type="number" min="0.01" step="0.01" value={form.smv} onChange={(e) => set('smv', e.target.value)} />
            </label>
            <label>
              <span>Standard Daily Target</span>
              <input type="number" min="1" value={form.dailyTarget} onChange={(e) => set('dailyTarget', e.target.value)} />
            </label>
            <label>
              <span>Operator</span>
              <input type="number" min="0" value={form.operator} onChange={(e) => set('operator', e.target.value)} />
            </label>
            <label>
              <span>Helper</span>
              <input type="number" min="0" value={form.helper} onChange={(e) => set('helper', e.target.value)} />
            </label>
            <label>
              <span>Finishing Manpower</span>
              <input
                type="number"
                min="0"
                value={form.finishingManpower}
                onChange={(e) => set('finishingManpower', e.target.value)}
              />
            </label>
            <label>
              <span>Total Required Manpower</span>
              <input
                type="number"
                min="1"
                value={form.totalManpower}
                onChange={(e) => set('totalManpower', e.target.value)}
                placeholder={String(mpTotal(form) || 0)}
              />
            </label>
            <label>
              <span>Total Required Machine</span>
              <input
                type="number"
                min="1"
                value={form.machineQty}
                onChange={(e) => set('machineQty', e.target.value)}
                placeholder={String(machineTotal(form.machineRequirements) || 0)}
              />
            </label>
            <label>
              <span>Benchmark Efficiency %</span>
              <input
                type="number"
                min="1"
                max="100"
                step="0.1"
                value={form.achievableEfficiency}
                onChange={(e) => set('achievableEfficiency', e.target.value)}
              />
            </label>
            <label className="gantt-remark-field">
              <span>Remarks</span>
              <textarea value={form.remarks} onChange={(e) => set('remarks', e.target.value)} placeholder="IE remarks" />
            </label>
          </div>
          <div className="planner-popup-section compact-section">
            <div className="panel-head">
              <div>
                <div className="panel-title">Machine type-wise requirement</div>
                <div className="panel-sub">Used for maintenance changeover and machine requirement calculations.</div>
              </div>
              <button type="button" className="btn btn-secondary" onClick={addMachine}>
                Add Machine Type
              </button>
            </div>
            <div className="table-scroll">
              <table className="data-table compact-table">
                <thead>
                  <tr>
                    <th>Machine Type</th>
                    <th>Qty</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {form.machineRequirements.map((x, i) => (
                    <tr key={i}>
                      <td>
                        <input
                          value={x.machineType}
                          onChange={(e) => updateMachine(i, 'machineType', e.target.value)}
                          placeholder="SNLS / 4T OL / Flatlock…"
                        />
                      </td>
                      <td>
                        <input type="number" min="0" value={x.qty} onChange={(e) => updateMachine(i, 'qty', e.target.value)} />
                      </td>
                      <td>
                        <button className="btn btn-secondary" type="button" onClick={() => removeMachine(i)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!form.machineRequirements.length && (
                    <tr>
                      <td colSpan={3}>No type-wise machine detail imported yet. Total machine can still be saved.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="module-actions">
            <button className="btn btn-secondary" disabled={busy} onClick={() => save('SAVE_DRAFT')}>
              Save Changes
            </button>
            <button className="btn btn-primary" disabled={busy} onClick={() => save('RELEASE')}>
              Submit for Approval
            </button>
          </div>
        </section>
      )}
    </Shell>
  );
}

