'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { DataGrid } from '../../../components/ui';
import type { GridColumn } from '../../../components/ui';
import { api } from '../../../lib/api';
import { fmtDate, fmtNum } from '../../../lib/format';

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const num = (v: any) => fmtNum(Number(v || 0), 1);

export default function QcoPage() {
  const [from, setFrom] = useState(monthStart()),
    [to, setTo] = useState(today()),
    [floor, setFloor] = useState(''),
    [rows, setRows] = useState<any[]>([]),
    [rules, setRules] = useState<any[]>([]),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState(''),
    [error, setError] = useState(''),
    [canManage, setCanManage] = useState(false);
  const [entry, setEntry] = useState<any>({
    date: today(),
    lineCode: '',
    jobNo: '',
    styleNo: '',
    smv: '',
    actualStartTime: '',
    firstGoodOutputTime: '',
    failureReason: '',
    responsibleDeptPerson: '',
    remarks: ''
  });

  async function load() {
    const q = `from=${from}&to=${to}${floor ? `&floor=${encodeURIComponent(floor)}` : ''}`;
    const [a, b] = await Promise.all([api(`/ie-ops/qco?${q}`), api('/ie-ops/qco/rules')]);
    setRows(a);
    setRules(b);
  }

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('nfl_user') || '{}');
      setCanManage((u.roles || []).some((r: string) => ['ADMIN', 'IE'].includes(r)));
    } catch {}
    load().catch((e: any) => setError(e.message));
  }, []);

  async function lookupJob() {
    const q = String(entry.jobNo || '').trim();
    if (!q) return;
    try {
      const f = await api(`/ie-ops/jobs/search?q=${encodeURIComponent(q)}`);
      if (f?.length) {
        const j = f[0];
        setEntry((p: any) => ({ ...p, jobNo: j.jobNo, styleNo: j.styleNo || '', smv: Number(j.smv || 0) }));
      }
    } catch {}
  }

  async function addQuick() {
    if (!String(entry.lineCode).trim()) return setError('Line required.');
    if (!String(entry.actualStartTime).trim() || !String(entry.firstGoodOutputTime).trim()) {
      return setError('Start time and First Good Output time required.');
    }
    setBusy(true);
    setError('');
    try {
      const r = await api('/ie-ops/qco', { method: 'POST', body: JSON.stringify({ ...entry, smv: Number(entry.smv || 0) }) });
      setMsg(`✓ ${entry.lineCode} QCO saved · ${num(r.actualMinutes)} min.`);
      setEntry((p: any) => ({
        ...p,
        jobNo: '',
        styleNo: '',
        smv: '',
        actualStartTime: '',
        firstGoodOutputTime: '',
        failureReason: '',
        responsibleDeptPerson: '',
        remarks: ''
      }));
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api('/ie-ops/qco/import', { method: 'POST', body: fd });
      setMsg(`${r.rows} QCO rows imported.`);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveRules() {
    setBusy(true);
    try {
      await api('/ie-ops/qco/rules', { method: 'PUT', body: JSON.stringify({ rows: rules }) });
      setMsg('QCO SMV standard master updated.');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const validActual = rows.filter((x) => Number(x.actualMinutes) > 0);
  const avg = rows.length ? rows.reduce((s, x) => s + Number(x.actualMinutes || 0), 0) / rows.length : 0,
    onTime = rows.length ? (rows.filter((x) => Number(x.actualMinutes || 0) <= Number(x.standardMinutes || 0)).length / rows.length) * 100 : 0,
    totalLoss = rows.reduce((s, x) => s + Math.max(0, Number(x.lossMinutes || 0)), 0);

  const qcoColumns = useMemo<GridColumn<any>[]>(
    () => [
      { key: 'date', header: 'Date', value: (r) => fmtDate(r.date) },
      { key: 'lineCode', header: 'Line', value: (r) => r.lineCode, render: (r) => <strong>{r.lineCode}</strong> },
      { key: 'jobNo', header: 'Job', value: (r) => r.jobNo || '—' },
      { key: 'smv', header: 'SMV', numeric: true, decimals: 2, value: (r) => Number(r.smv || 0) },
      { key: 'machineQty', header: 'M/C', numeric: true, total: true, value: (r) => Number(r.machineQty || 0) },
      { key: 'standardMinutes', header: 'Std Min', numeric: true, total: true, unit: 'min', value: (r) => Number(r.standardMinutes || 0) },
      { key: 'actualMinutes', header: 'Actual Min', numeric: true, total: true, unit: 'min', value: (r) => Number(r.actualMinutes || 0) },
      { key: 'lossMinutes', header: 'Loss', numeric: true, total: true, unit: 'min', value: (r) => Number(r.lossMinutes || 0) },
      {
        key: 'achievementPct',
        header: 'Achieve %',
        numeric: true,
        decimals: 1,
        unit: '%',
        value: (r) => Number(r.achievementPct || 0),
        render: (r) => `${num(r.achievementPct)}%`
      },
      { key: 'failureReason', header: 'Failure Reason', value: (r) => r.failureReason || '—' },
      { key: 'responsibleDeptPerson', header: 'Responsible', value: (r) => r.responsibleDeptPerson || '—' },
      { key: 'remarks', header: 'Remarks', value: (r) => r.remarks || '—' }
    ],
    []
  );

  return (
    <Shell title="Quick Changeover">
      {msg && <div className="notice success-notice">{msg}</div>}
      {error && <div className="notice">{error}</div>}
      <section className="panel mobile-entry-panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Quick QCO Entry</div>
            <div className="panel-sub">Phone-friendly direct entry. Failure/Responsible/Remarks only when relevant.</div>
          </div>
        </div>
        <div className="mobile-entry-grid qco-entry-grid">
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
            <span>Job</span>
            <input
              value={entry.jobNo}
              placeholder="Search Job"
              onChange={(e) => setEntry({ ...entry, jobNo: e.target.value })}
              onBlur={lookupJob}
            />
          </label>
          <div className="auto-field compact">
            <span>Style · AUTO</span>
            <strong>{entry.styleNo || '—'}</strong>
          </div>
          <label>
            <span>SMV</span>
            <input
              type="number"
              step="0.01"
              value={entry.smv}
              placeholder="Auto / fallback"
              onChange={(e) => setEntry({ ...entry, smv: e.target.value })}
            />
          </label>
          <label>
            <span>Actual Start</span>
            <input type="time" value={entry.actualStartTime} onChange={(e) => setEntry({ ...entry, actualStartTime: e.target.value })} />
          </label>
          <label>
            <span>First Good Output</span>
            <input
              type="time"
              value={entry.firstGoodOutputTime}
              onChange={(e) => setEntry({ ...entry, firstGoodOutputTime: e.target.value })}
            />
          </label>
          <label>
            <span>Failure Reason</span>
            <input
              value={entry.failureReason}
              placeholder="Only if failed/delayed"
              onChange={(e) => setEntry({ ...entry, failureReason: e.target.value })}
            />
          </label>
          <label>
            <span>Responsible</span>
            <input
              value={entry.responsibleDeptPerson}
              placeholder="Dept / person"
              onChange={(e) => setEntry({ ...entry, responsibleDeptPerson: e.target.value })}
            />
          </label>
          <label className="entry-wide">
            <span>Remarks</span>
            <input value={entry.remarks} placeholder="Optional" onChange={(e) => setEntry({ ...entry, remarks: e.target.value })} />
          </label>
          <button className="btn btn-primary entry-save" disabled={busy} onClick={addQuick}>
            {busy ? 'Saving…' : 'Save Changes'}
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
            Apply Filters
          </button>
          {canManage && (
            <>
              <label className="file-inline">
                QCO workbook
                <input type="file" accept=".xlsx,.xlsm,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
              <button className="btn btn-primary" disabled={!file || busy} onClick={upload}>
                {busy ? 'Importing…' : 'Import Data'}
              </button>
            </>
          )}
        </div>
      </section>
      <section className="ie-kpi-row">
        <div>
          <span>Total Changeover</span>
          <strong>{fmtNum(rows.length)}</strong>
        </div>
        <div>
          <span>Avg C/O Time</span>
          <strong>{num(avg)} min</strong>
        </div>
        <div>
          <span>On-time %</span>
          <strong>{num(onTime)}%</strong>
        </div>
        <div>
          <span>Total Lost Min</span>
          <strong>{num(totalLoss)}</strong>
        </div>
        <div>
          <span>Best Actual</span>
          <strong>{validActual.length ? num(Math.min(...validActual.map((x) => Number(x.actualMinutes)))) : '—'}</strong>
        </div>
      </section>
      {canManage && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">SMV-wise Standard C/O Master</div>
              <div className="panel-sub">IE/Admin only. Effective rule can be customized for future.</div>
            </div>
            <button className="btn btn-primary" disabled={busy} onClick={saveRules}>
              Save Changes
            </button>
          </div>
          <div className="table-scroll">
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>Min SMV</th>
                  <th>Max SMV</th>
                  <th>Standard Min</th>
                  <th>Label</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r: any, idx: number) => (
                  <tr key={r.id || idx}>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={r.minSmv}
                        onChange={(e) => setRules((p) => p.map((x, i) => (i === idx ? { ...x, minSmv: Number(e.target.value) } : x)))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={r.maxSmv ?? ''}
                        placeholder="No max"
                        onChange={(e) =>
                          setRules((p) =>
                            p.map((x, i) => (i === idx ? { ...x, maxSmv: e.target.value === '' ? null : Number(e.target.value) } : x))
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={r.standardMin}
                        onChange={(e) =>
                          setRules((p) => p.map((x, i) => (i === idx ? { ...x, standardMin: Number(e.target.value) } : x)))
                        }
                      />
                    </td>
                    <td>
                      <input
                        value={r.label || ''}
                        onChange={(e) => setRules((p) => p.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">QCO Performance</div>
            <div className="panel-sub">No corrective-action or separate manpower/machine-delay reason fields.</div>
          </div>
        </div>
        <DataGrid
          rows={rows}
          columns={qcoColumns}
          rowKey={(r) => r.id}
          storageKey="ie-qco-performance-v1"
          exportName="ie-qco-performance"
          frozenColumns={2}
          emptyText="No QCO records found for the selected date range."
        />
      </section>
    </Shell>
  );
}

