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
function tone(v: number, mode: 'short' | 'idle' = 'short') {
  if (mode === 'short') return v > 0 ? 'bad' : 'good';
  return v > 0 ? 'good' : 'neutral';
}
function typeList(rows: any[]) {
  return (rows || []).map((x) => `${x.machineType} ${x.qty}`).join(' · ');
}

type Draft = {
  totalQty: string;
  breakdownQty: string;
  rentQty: string;
  utilizedQty: string;
  unusedQty: string;
  workingQty: string;
  remarks: string;
};

export default function MaintenancePage() {
  const [date, setDate] = useState(today());
  const [factory, setFactory] = useState('NFL');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [newType, setNewType] = useState('');
  const [newTotal, setNewTotal] = useState('');
  const [drill, setDrill] = useState<DrillTarget | null>(null);
  const [machineFilter, setMachineFilter] = useState<string>('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const x = await api(`/maintenance/dashboard?date=${encodeURIComponent(date)}&factory=${encodeURIComponent(factory)}`);
      setData(x);
      const d: Record<string, Draft> = {};
      for (const r of x.rows || []) {
        if (r.id) {
          d[r.id] = {
            totalQty: String(r.totalQty ?? 0),
            breakdownQty: String(r.breakdownQty ?? 0),
            rentQty: String(r.rentQty ?? 0),
            utilizedQty: String(r.actualUtilizedQty ?? 0),
            unusedQty: String(r.reportedUnusedQty ?? 0),
            workingQty: String(r.workingQty ?? 0),
            remarks: r.remarks || ''
          };
        }
      }
      setDrafts(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [date, factory]);

  const s = data?.summary || {};
  const attention = useMemo(() => (data?.rows || []).filter((r: any) => Number(r.shortageQty) > 0), [data]);

  function update(id: string, key: keyof Draft, value: string) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  }

  async function saveRow(row: any) {
    if (!row.id) return;
    const d = drafts[row.id];
    setBusy(true);
    setMsg('');
    setError('');
    try {
      await api(`/maintenance/master/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({ machineType: row.machineType, totalQty: Number(d.totalQty || 0) })
      });
      await api(`/maintenance/daily/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          date,
          factoryTotalQty: Number(d.totalQty || 0),
          breakdownQty: Number(d.breakdownQty || 0),
          rentQty: Number(d.rentQty || 0),
          utilizedQty: Number(d.utilizedQty || 0),
          unusedQty: Number(d.unusedQty || 0),
          workingQty: Number(d.workingQty || 0),
          remarks: d.remarks
        })
      });
      setMsg(`${row.machineType} updated for ${fmtDate(date)}.`);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function addMachine() {
    if (!newType.trim()) return;
    setBusy(true);
    setMsg('');
    setError('');
    try {
      await api('/maintenance/master', {
        method: 'POST',
        body: JSON.stringify({ factoryCode: factory, machineType: newType, totalQty: Number(newTotal || 0) })
      });
      setNewType('');
      setNewTotal('');
      setMsg('Machine type added to Maintenance Master.');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function importDaily() {
    if (!file) return;
    setBusy(true);
    setMsg('');
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('date', date);
      fd.append('factoryCode', factory);
      const r = await api('/maintenance/daily/import', { method: 'POST', body: fd });
      setMsg(r.message || 'Daily machine utilization imported.');
      setFile(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function openBreakdownDrill(e: React.MouseEvent) {
    const rect = e.currentTarget.getBoundingClientRect();
    const allRows = data?.rows || [];
    const bdRows = allRows.filter((r: any) => Number(r.breakdownQty) > 0);
    const byType = bdRows.map((r: any) => ({
      label: r.machineType,
      value: Number(r.breakdownQty || 0),
      filterValue: r.machineType
    }));
    const reasonMap = new Map<string, number>();
    for (const r of bdRows) {
      const reason = String(r.remarks || '').trim() || 'Mechanical / Unspecified';
      reasonMap.set(reason, (reasonMap.get(reason) || 0) + Number(r.breakdownQty || 0));
    }
    const byReason = [...reasonMap.entries()].map(([label, value]) => ({ label, value, filterValue: label }));
    setDrill({
      title: 'Machine Breakdowns — By Machine Type & Reason',
      subtitle: `${fmtNum(s.breakdown || 0)} machines in breakdown (double-click drill)`,
      unit: 'pcs',
      tone: 'red',
      anchorRect: rect,
      chartType: byType.length >= 2 && byType.length <= 5 ? 'donut' : undefined,
      byFactory: byType.length ? byType : [{ label: 'No breakdowns recorded', value: 0 }],
      byBuyer: byReason,
      filterLabel: 'Show these machines in the table →'
    });
  }

  const filteredMachineRows = useMemo(() => {
    const list = data?.rows || [];
    if (!machineFilter) return list;
    return list.filter(
      (r: any) =>
        r.machineType === machineFilter ||
        (String(r.remarks || '').trim() || 'Mechanical / Unspecified') === machineFilter
    );
  }, [data, machineFilter]);

  const machineColumns = useMemo<GridColumn<any>[]>(
    () => [
      {
        key: 'machineType',
        header: 'Machine Type',
        value: (r) => r.machineType,
        render: (r) => (
          <div>
            <strong>{r.machineType}</strong>
            {r.sourceFileName && <small style={{ display: 'block' }}>{r.sourceFileName}</small>}
          </div>
        )
      },
      {
        key: 'totalQty',
        header: 'Total',
        numeric: true,
        total: true,
        value: (r) => Number(r.totalQty || 0),
        render: (r) => {
          const d = r.id ? drafts[r.id] : null;
          return d ? (
            <input
              className="compact-number"
              type="number"
              min="0"
              value={d.totalQty}
              onChange={(e) => update(r.id, 'totalQty', e.target.value)}
            />
          ) : (
            fmtNum(r.totalQty)
          );
        }
      },
      {
        key: 'breakdownQty',
        header: 'Breakdown',
        numeric: true,
        total: true,
        value: (r) => Number(r.breakdownQty || 0),
        render: (r) => {
          const d = r.id ? drafts[r.id] : null;
          return d ? (
            <input
              className="compact-number"
              type="number"
              min="0"
              value={d.breakdownQty}
              onChange={(e) => update(r.id, 'breakdownQty', e.target.value)}
            />
          ) : (
            fmtNum(r.breakdownQty)
          );
        }
      },
      {
        key: 'rentQty',
        header: 'Rent',
        numeric: true,
        total: true,
        value: (r) => Number(r.rentQty || 0),
        render: (r) => {
          const d = r.id ? drafts[r.id] : null;
          return d ? (
            <input
              className="compact-number"
              type="number"
              min="0"
              value={d.rentQty}
              onChange={(e) => update(r.id, 'rentQty', e.target.value)}
            />
          ) : (
            fmtNum(r.rentQty)
          );
        }
      },
      {
        key: 'availableQty',
        header: 'Available',
        numeric: true,
        total: true,
        value: (r) => Number(r.availableQty || 0),
        render: (r) => <strong>{fmtNum(r.availableQty)}</strong>
      },
      {
        key: 'actualUtilizedQty',
        header: 'Actual Utilized',
        numeric: true,
        total: true,
        value: (r) => Number(r.actualUtilizedQty || 0),
        render: (r) => {
          const d = r.id ? drafts[r.id] : null;
          return d ? (
            <input
              className="compact-number"
              type="number"
              min="0"
              value={d.utilizedQty}
              onChange={(e) => update(r.id, 'utilizedQty', e.target.value)}
            />
          ) : (
            fmtNum(r.actualUtilizedQty)
          );
        }
      },
      {
        key: 'requiredQty',
        header: 'IE Running Req.',
        numeric: true,
        total: true,
        value: (r) => Number(r.requiredQty || 0),
        render: (r) => <strong>{fmtNum(r.requiredQty)}</strong>
      },
      {
        key: 'idleQty',
        header: 'Idle',
        numeric: true,
        total: true,
        value: (r) => Number(r.idleQty || 0),
        render: (r) => <span className={`status-pill ${tone(r.idleQty, 'idle')}`}>{fmtNum(r.idleQty)}</span>
      },
      {
        key: 'shortageQty',
        header: 'Shortage',
        numeric: true,
        total: true,
        value: (r) => Number(r.shortageQty || 0),
        render: (r) => <span className={`status-pill ${tone(r.shortageQty)}`}>{fmtNum(r.shortageQty)}</span>
      },
      {
        key: 'sew01',
        header: 'Sew-01',
        numeric: true,
        total: true,
        value: (r) => Number(r.floorUsage?.['Sewing-01'] || 0)
      },
      {
        key: 'sew02',
        header: 'Sew-02',
        numeric: true,
        total: true,
        value: (r) => Number(r.floorUsage?.['Sewing-02'] || 0)
      },
      {
        key: 'sew03',
        header: 'Sew-03',
        numeric: true,
        total: true,
        value: (r) => Number(r.floorUsage?.['Sewing-03'] || 0)
      },
      {
        key: 'action',
        header: 'Action',
        filterable: false,
        value: (r) => (r.id ? 'Save' : 'Missing'),
        render: (r) =>
          r.id ? (
            <button className="btn btn-secondary" disabled={busy} onClick={() => saveRow(r)}>
              Save
            </button>
          ) : (
            <span className="status-pill bad">Add to Master</span>
          )
      }
    ],
    [drafts, busy]
  );

  const runningJobColumns = useMemo<GridColumn<any>[]>(
    () => [
      { key: 'line', header: 'Line', value: (r) => r.line, render: (r) => <strong>{r.line}</strong> },
      { key: 'jobNo', header: 'Job', value: (r) => r.jobNo },
      { key: 'styleNo', header: 'Style', value: (r) => r.styleNo },
      { key: 'floor', header: 'Floor', value: (r) => r.floor || '—' },
      {
        key: 'status',
        header: 'Plan Status',
        value: (r) => r.status || 'PLANNED',
        render: (r) => <span className="status-pill neutral">{r.status || 'PLANNED'}</span>
      },
      { key: 'totalMachine', header: 'Total Req. M/C', numeric: true, total: true, value: (r) => Number(r.totalMachine || 0) },
      {
        key: 'machineRequirements',
        header: 'Machine Requirement',
        value: (r) => typeList(r.machineRequirements) || 'IE type breakdown missing'
      }
    ],
    []
  );

  return (
    <Shell title="Maintenance">
      {msg && <div className="notice success-notice">{msg}</div>}
      {error && <div className="notice">{error}</div>}

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Daily machine picture</div>
          </div>
          <div className="module-actions">
            {machineFilter && (
              <button className="btn btn-secondary" onClick={() => setMachineFilter('')}>
                Clear Filter: {machineFilter} ×
              </button>
            )}
            <a className="btn btn-secondary" href="/modules/ie-bulletin">
              IE Bulletin
            </a>
            <a className="btn btn-secondary" href="/modules/sewing-planning">
              Sewing Gantt
            </a>
          </div>
        </div>
        <div className="ta-filter-row">
          <label>
            Date <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Factory{' '}
            <select value={factory} onChange={(e) => setFactory(e.target.value)}>
              <option value="NFL">NFL</option>
              <option value="NCL">NCL</option>
            </select>
          </label>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </section>

      <section className="ie-kpi-row maintenance-kpi-row">
        <div>
          <span>Total Machine</span>
          <strong>{loading ? '…' : fmtNum(s.total)}</strong>
        </div>
        <div
          onDoubleClick={openBreakdownDrill}
          style={{ cursor: 'pointer' }}
          title="Double-click to drill down by machine type / reason"
        >
          <span>Breakdown (Double-click)</span>
          <strong style={{ color: '#DC2626' }}>{fmtNum(s.breakdown)}</strong>
        </div>
        <div>
          <span>Available + Rent</span>
          <strong>{fmtNum(s.available)}</strong>
        </div>
        <div>
          <span>IE Running Req.</span>
          <strong>{fmtNum(s.required)}</strong>
        </div>
        <div>
          <span>Idle</span>
          <strong>{fmtNum(s.idle)}</strong>
        </div>
        <div>
          <span>Shortage</span>
          <strong>{fmtNum(s.shortage)}</strong>
        </div>
      </section>

      <section className="panel import-panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Daily Machine Utilization import</div>
            <div className="panel-sub">
              Existing .xls / .xlsx / .xlsm daily machine use statement can be imported. Factory Total, Breakdown, Rent,
              Utilized, Unused and Sewing-01/02/03 usage are picked where present.
            </div>
          </div>
        </div>
        <div className="import-grid">
          <label>
            Report file
            <input type="file" accept=".xls,.xlsx,.xlsm" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <button className="btn btn-primary" disabled={!file || busy} onClick={importDaily}>
            {busy ? 'Working…' : 'Import Daily Machine Report'}
          </button>
        </div>
        {file && (
          <div className="panel-note">
            {file.name} · report date will be saved as {fmtDate(date)}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Machine type-wise utilization & load</div>
          </div>
          <span className={`status-pill ${attention.length ? 'bad' : 'good'}`}>{attention.length} shortage type(s)</span>
        </div>
        <DataGrid
          rows={filteredMachineRows}
          columns={machineColumns}
          rowKey={(r) => `${r.id || 'missing'}-${r.machineType}`}
          storageKey="maintenance-utilization-v1"
          exportName="maintenance-utilization"
          frozenColumns={2}
          emptyMessage="No Maintenance Machine Master data yet. Add machine types below or import the daily report."
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Machine Master</div>
          </div>
        </div>
        <div className="import-grid">
          <label>
            Machine Type
            <input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder="SNLS / 4 Thread OL / Flatlock…"
            />
          </label>
          <label>
            Factory Total
            <input type="number" min="0" value={newTotal} onChange={(e) => setNewTotal(e.target.value)} />
          </label>
          <button className="btn btn-primary" disabled={busy || !newType.trim()} onClick={addMachine}>
            Add / Update Machine Type
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Running Job machine requirement · {fmtDate(date)}</div>
          </div>
          <span className="status-pill neutral">{data?.runningJobs?.length || 0} running job(s)</span>
        </div>
        <DataGrid
          rows={data?.runningJobs || []}
          columns={runningJobColumns}
          rowKey={(r) => r.styleId || `${r.line}-${r.jobNo}`}
          storageKey="maintenance-running-jobs-v1"
          exportName="maintenance-running-jobs"
          frozenColumns={2}
          emptyMessage="No Gantt running job found on this date."
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Upcoming changeover machine action</div>
            <div className="panel-sub">Next 7 days · old Job vs new Job IE machine type difference.</div>
          </div>
          <span className="status-pill neutral">{data?.changeovers?.length || 0}</span>
        </div>
        <div className="table-scroll">
          <table className="data-table compact-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Line</th>
                <th>Old Job / Style</th>
                <th>New Job / Style</th>
                <th>Machine Action</th>
              </tr>
            </thead>
            <tbody>
              {(data?.changeovers || []).map((c: any, i: number) => (
                <tr key={`${c.line}-${c.date}-${i}`}>
                  <td>{fmtDate(c.date)}</td>
                  <td>
                    <strong>{c.line}</strong>
                  </td>
                  <td>
                    {c.oldJob} · {c.oldStyle}
                  </td>
                  <td>
                    {c.newJob} · {c.newStyle}
                  </td>
                  <td>
                    {(c.changes || []).map((x: any) => (
                      <span
                        key={x.machineType}
                        className={`status-pill ${x.action === 'ADD' ? 'bad' : 'warn'}`}
                        style={{ marginRight: 6 }}
                      >
                        {x.machineType} {x.action === 'ADD' ? '+' : ''}
                        {x.delta}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
              {!data?.changeovers?.length && (
                <tr>
                  <td colSpan={5}>No machine change action found for the next 7 days.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <DrillPopup
        target={drill}
        onClose={() => setDrill(null)}
        onApplyFilter={(val) => {
          setMachineFilter(val);
          setDrill(null);
        }}
      />
    </Shell>
  );
}

