'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';
import {
  ActiveFiltersBar,
  CrossFilterProvider,
  DataGrid,
  DrillBreakdown,
  DrillPopup,
  DrillTarget,
  GridColumn,
  RecordPanel,
  useChartDrillGesture,
} from '../../../components/ui';
import { fmtDate, fmtNum } from '../../../lib/format';

type Tab =
  | 'dashboard'
  | 'execution'
  | 'gantt'
  | 'process-loss'
  | 'yarn-req'
  | 'dead-stock'
  | 'follow-up'
  | 'outside'
  | 'daily-production';

function num(v: unknown) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n)
    ? fmtNum(n, Number.isInteger(n) ? 0 : 1)
    : String(v);
}
function dt(v: unknown) {
  if (!v) return '—';
  return fmtDate(String(v));
}

export default function KnittingModulePage() {
  return (
    <CrossFilterProvider>
      <KnittingModuleContent />
    </CrossFilterProvider>
  );
}

function KnittingModuleContent() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Execution filters for all 29 fields
  const [execFilters, setExecFilters] = useState<Record<string, string>>({});
  const [execSearch, setExecSearch] = useState('');

  // Process Loss Approval Form State
  const [plInputs, setPlInputs] = useState<Record<string, { lossPct: number; excessKg: number; approved: boolean }>>({});

  // Outside Knitting Month
  const [outsideMonth, setOutsideMonth] = useState('2026-10');

  // DrillPopup + RecordPanel state
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);
  const [selectedExecKey, setSelectedExecKey] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await api('/knitting/data');
      setData(res);
      const initialPl: Record<string, any> = {};
      for (const r of res.processLossRows || []) {
        initialPl[r.id] = { lossPct: r.processLossPct || 15, excessKg: r.excessKg || 0, approved: r.status === 'APPROVED' };
      }
      setPlInputs(initialPl);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const d = data || {};
  const kpis = d.kpis || {};
  const executionRows: any[] = d.executionRows || [];
  const dailyProductionRows: any[] = d.dailyProductionRows || [];

  const filteredExecution = useMemo(() => {
    return executionRows.filter((r) => {
      if (execSearch) {
        const q = execSearch.toLowerCase();
        const match = `${r.buyer} ${r.jobNo} ${r.colour} ${r.fabricDescription} ${r.yarnBrand} ${r.count}`.toLowerCase().includes(q);
        if (!match) return false;
      }
      for (const [key, val] of Object.entries(execFilters)) {
        if (!val.trim()) continue;
        const cell = String(r[key] ?? '').toLowerCase();
        if (!cell.includes(val.toLowerCase().trim())) return false;
      }
      return true;
    });
  }, [executionRows, execFilters, execSearch]);

  async function handleApproveProcessLoss(rowId: string) {
    const input = plInputs[rowId];
    if (!input) return;
    setMsg('');
    setError('');
    try {
      await api('/knitting/process-loss/approve', {
        method: 'POST',
        body: JSON.stringify({ id: rowId, processLossPct: Number(input.lossPct), excessKg: Number(input.excessKg) }),
      });
      setMsg(`Requirement approved for ${rowId} with ${input.lossPct}% process loss.`);
      setPlInputs((prev) => ({ ...prev, [rowId]: { ...prev[rowId], approved: true } }));
      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
  }

  function openPlanVsActualDrill(
    ev: React.MouseEvent,
    label: string,
    metric: 'planned' | 'actual' | 'inHouse' | 'outside' | 'balance'
  ) {
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const byDayMap = new Map<string, { val: number; jobs: Set<string> }>();
    for (const dp of dailyProductionRows) {
      const dayKey = fmtDate(dp.date || '');
      const target = Number(dp.s1Target || 0) + Number(dp.s2Target || 0);
      const actual = Number(dp.s1Actual || 0) + Number(dp.s2Actual || 0);
      const v = metric === 'planned' ? target : actual;
      const cur = byDayMap.get(dayKey) || { val: 0, jobs: new Set<string>() };
      cur.val += v;
      if (dp.jobNo) cur.jobs.add(String(dp.jobNo));
      byDayMap.set(dayKey, cur);
    }

    const byBuyerMap = new Map<string, { val: number; jobs: Set<string> }>();
    const byFactoryMap = new Map<string, { val: number; jobs: Set<string> }>();
    for (const r of executionRows) {
      const v =
        metric === 'planned'
          ? Number(r.orderQty || 0)
          : metric === 'balance'
          ? Number(r.prodnBalance || 0)
          : Number(r.prodn || 0);
      const buyer = String(r.buyer || 'Other');
      const bCur = byBuyerMap.get(buyer) || { val: 0, jobs: new Set<string>() };
      bCur.val += v;
      if (r.jobNo) bCur.jobs.add(String(r.jobNo));
      byBuyerMap.set(buyer, bCur);

      const fac = String(r.knitFact || 'NFL Unit-1');
      const fCur = byFactoryMap.get(fac) || { val: 0, jobs: new Set<string>() };
      fCur.val += v;
      if (r.jobNo) fCur.jobs.add(String(r.jobNo));
      byFactoryMap.set(fac, fCur);
    }

    const timeSlices = Array.from(byDayMap.entries()).map(([k, v]) => ({
      key: k,
      label: k,
      value: Math.round(v.val),
      jobs: v.jobs.size,
      filterValue: k,
    }));

    const factorySlices = Array.from(byFactoryMap.entries())
      .sort((a, b) => b[1].val - a[1].val)
      .map(([k, v]) => ({
        key: k,
        label: k,
        value: Math.round(v.val),
        jobs: v.jobs.size,
        filterValue: k,
      }));

    const buyerSlices = Array.from(byBuyerMap.entries())
      .sort((a, b) => b[1].val - a[1].val)
      .map(([k, v]) => ({
        key: k,
        label: k,
        value: Math.round(v.val),
        jobs: v.jobs.size,
        filterValue: k,
      }));

    const breakdowns: DrillBreakdown[] = [];
    if (timeSlices.length > 0) {
      breakdowns.push({
        dimension: 'time',
        label: 'By Day (Plan vs Actual)',
        chart: 'line',
        unit: 'kg',
        color: metric === 'planned' ? 'blue' : metric === 'balance' ? 'red' : 'green',
        filterField: 'date',
        slices: timeSlices,
      });
    }
    if (factorySlices.length > 0) {
      breakdowns.push({
        dimension: 'factory',
        label: 'By Factory',
        chart: factorySlices.length <= 5 ? 'donut' : 'bar',
        unit: 'kg',
        color: metric === 'planned' ? 'blue' : metric === 'balance' ? 'red' : 'green',
        filterField: 'knitFact',
        slices: factorySlices,
      });
    }
    if (buyerSlices.length > 0) {
      breakdowns.push({
        dimension: 'buyer',
        label: 'By Buyer',
        chart: buyerSlices.length <= 5 ? 'donut' : 'bar',
        unit: 'kg',
        color: metric === 'planned' ? 'blue' : metric === 'balance' ? 'red' : 'green',
        filterField: 'buyer',
        slices: buyerSlices,
      });
    }

    const totalVal =
      metric === 'planned'
        ? Number(kpis.planned || 0)
        : metric === 'inHouse'
        ? Number(kpis.inHouseLoad || 0)
        : metric === 'outside'
        ? Number(kpis.outsideLoad || 0)
        : metric === 'balance'
        ? Number(kpis.productionBalance || 0)
        : Number(kpis.production || 0);

    setDrillTarget({
      title: `Knitting — ${label}`,
      subtitle: `${num(totalVal)} kg · Double-click breakdown`,
      anchorRect: rect,
      sourceFilter: { field: 'metric', value: metric, label },
      breakdowns,
    });
  }

  return (
    <Shell title="Knitting Management">
      {msg && <div className="notice success-notice">{msg}</div>}
      {error && <div className="notice">{error}</div>}

      {/* Top Sub-Menu Tabs */}
      <div className="workspace-tabs" style={{ marginBottom: 16 }}>
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>A. Dashboard</button>
        <button className={tab === 'execution' ? 'active' : ''} onClick={() => setTab('execution')}>B. Production Execution (29 Cols)</button>
        <button className={tab === 'gantt' ? 'active' : ''} onClick={() => setTab('gantt')}>C. Machine Gantt</button>
        <button className={tab === 'process-loss' ? 'active' : ''} onClick={() => setTab('process-loss')}>D. Process Loss &amp; Approval</button>
        <button className={tab === 'yarn-req' ? 'active' : ''} onClick={() => setTab('yarn-req')}>E. Yarn Requirement</button>
        <button className={tab === 'dead-stock' ? 'active' : ''} onClick={() => setTab('dead-stock')}>F. Dead Stock (&lt;25% / 6M)</button>
        <button className={tab === 'follow-up' ? 'active' : ''} onClick={() => setTab('follow-up')}>G. Production Follow-up</button>
        <button className={tab === 'outside' ? 'active' : ''} onClick={() => setTab('outside')}>H. Outside Knitting</button>
        <button className={tab === 'daily-production' ? 'active' : ''} onClick={() => setTab('daily-production')}>I. Daily &amp; Date-wise</button>
      </div>

      <ActiveFiltersBar />

      {loading && <div className="panel"><div className="empty-state"><strong>Loading Knitting Data…</strong></div></div>}

      {!loading && tab === 'dashboard' && (
        <>
          <section className="ie-kpi-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: 16 }}>
            <div style={{ cursor: 'pointer' }} title="Double-click to drill down Plan vs Actual by Day" onDoubleClick={(e) => openPlanVsActualDrill(e, 'Total Load', 'planned')}>
              <span>Total Load</span><strong>{num(kpis.totalLoad)} KG</strong>
            </div>
            <div style={{ cursor: 'pointer' }} title="Double-click to drill down by Factory / Day" onDoubleClick={(e) => openPlanVsActualDrill(e, 'In-house Load', 'inHouse')}>
              <span>In-house Load</span><strong>{num(kpis.inHouseLoad)} KG</strong>
            </div>
            <div style={{ cursor: 'pointer' }} title="Double-click to drill down by Factory / Day" onDoubleClick={(e) => openPlanVsActualDrill(e, 'Outside Load', 'outside')}>
              <span>Outside Load</span><strong>{num(kpis.outsideLoad)} KG</strong>
            </div>
            <div style={{ cursor: 'pointer' }} title="Double-click to drill down Plan vs Actual by Day" onDoubleClick={(e) => openPlanVsActualDrill(e, 'Planned Output', 'planned')}>
              <span>Planned</span><strong>{num(kpis.planned)} KG</strong>
            </div>
            <div style={{ cursor: 'pointer' }} title="Double-click to drill down Actual Output by Day" onDoubleClick={(e) => openPlanVsActualDrill(e, 'Actual Production', 'actual')}>
              <span>Production</span><strong style={{ color: '#16a34a' }}>{num(kpis.production)} KG</strong>
            </div>
            <div style={{ cursor: 'pointer' }} title="Double-click to drill down Balance by Day / Factory" onDoubleClick={(e) => openPlanVsActualDrill(e, 'Production Balance', 'balance')}>
              <span>Prodn Balance</span><strong style={{ color: '#ea580c' }}>{num(kpis.productionBalance)} KG</strong>
            </div>
            <div><span>Delivery</span><strong>{num(kpis.delivery)} KG</strong></div>
            <div><span>Delivery Balance</span><strong>{num(kpis.deliveryBalance)} KG</strong></div>
            <div><span>Running M/C</span><strong>{kpis.runningMachines ?? 28}</strong></div>
            <div><span>Idle M/C</span><strong style={{ color: (kpis.idleMachines || 0) > 0 ? '#dc2626' : '#16a34a' }}>{kpis.idleMachines ?? 4}</strong></div>
            <div><span>Yarn Shortage</span><strong style={{ color: '#dc2626' }}>{num(kpis.yarnShortage)} KG</strong></div>
            <div><span>T&amp;A Failed</span><strong style={{ color: '#dc2626' }}>{kpis.taFailedJobs ?? 0}</strong></div>
            <div><span>Yet to Allocate</span><strong>{num(kpis.yetToAllocate)} KG</strong></div>
          </section>

          <div className="dashboard-grid two-col" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Plan vs. Actual &amp; In-house vs. Outside Load (Double-click bars for Daily Trend)</div>
                  <div className="panel-sub">Column distribution in KG</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, height: 160, padding: '16px 8px 0', borderBottom: '1px solid #e2e8f0' }}>
                <div
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                  title="Double-click for Plan vs Actual by Day"
                  onDoubleClick={(e) => openPlanVsActualDrill(e, 'In-House Planned Load', 'inHouse')}
                >
                  <div style={{ width: '80%', height: `${Math.min(100, Math.max(10, (kpis.inHouseLoad || 60000) / 800))}%`, background: '#2563eb', borderRadius: '4px 4px 0 0' }} />
                  <span style={{ fontSize: 11, marginTop: 4, fontWeight: 700 }}>In-House</span>
                  <small style={{ color: '#64748b' }}>{num(kpis.inHouseLoad)} KG</small>
                </div>
                <div
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                  title="Double-click for Plan vs Actual by Day"
                  onDoubleClick={(e) => openPlanVsActualDrill(e, 'Outside Planned Load', 'outside')}
                >
                  <div style={{ width: '80%', height: `${Math.min(100, Math.max(10, (kpis.outsideLoad || 25000) / 800))}%`, background: '#f59e0b', borderRadius: '4px 4px 0 0' }} />
                  <span style={{ fontSize: 11, marginTop: 4, fontWeight: 700 }}>Outside</span>
                  <small style={{ color: '#64748b' }}>{num(kpis.outsideLoad)} KG</small>
                </div>
                <div
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                  title="Double-click for Actual Production by Day"
                  onDoubleClick={(e) => openPlanVsActualDrill(e, 'Actual Production', 'actual')}
                >
                  <div style={{ width: '80%', height: `${Math.min(100, Math.max(10, (kpis.production || 48000) / 800))}%`, background: '#16a34a', borderRadius: '4px 4px 0 0' }} />
                  <span style={{ fontSize: 11, marginTop: 4, fontWeight: 700 }}>Done</span>
                  <small style={{ color: '#64748b' }}>{num(kpis.production)} KG</small>
                </div>
                <div
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                  title="Double-click for Balance by Day"
                  onDoubleClick={(e) => openPlanVsActualDrill(e, 'Production Balance', 'balance')}
                >
                  <div style={{ width: '80%', height: `${Math.min(100, Math.max(10, (kpis.productionBalance || 37000) / 800))}%`, background: '#ea580c', borderRadius: '4px 4px 0 0' }} />
                  <span style={{ fontSize: 11, marginTop: 4, fontWeight: 700 }}>Balance</span>
                  <small style={{ color: '#64748b' }}>{num(kpis.productionBalance)} KG</small>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Component Breakdown Proportion</div>
                  <div className="panel-sub">Body, L Rib &amp; Single Jersey (separately maintained)</div>
                </div>
              </div>
              <div style={{ padding: 12, display: 'grid', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <strong>Body Fabric</strong><span>76% · {num((kpis.totalLoad || 85000) * 0.76)} KG</span>
                  </div>
                  <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
                    <div style={{ width: '76%', height: '100%', background: '#2563eb' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <strong>L Rib / Rib</strong><span>16% · {num((kpis.totalLoad || 85000) * 0.16)} KG</span>
                  </div>
                  <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
                    <div style={{ width: '16%', height: '100%', background: '#06b6d4' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <strong>S-Jersey / Collar</strong><span>8% · {num((kpis.totalLoad || 85000) * 0.08)} KG</span>
                  </div>
                  <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
                    <div style={{ width: '8%', height: '100%', background: '#8b5cf6' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">Critical &amp; T&amp;A At-Risk Jobs</div>
                <div className="panel-sub">Jobs requiring immediate machine or yarn allocation</div>
              </div>
              <span className="status-pill bad">{d.criticalJobs?.length || 0} Alert(s)</span>
            </div>
            <DataGrid<any>
              storageKey="knitting-critical-jobs"
              exportName="knitting-critical-jobs"
              rows={(d.criticalJobs || []).map((j: any, i: number) => ({ ...j, _key: `${j.jobNo}-${j.color}-${i}` }))}
              frozenColumns={2}
              rowKey={(j) => j._key}
              columns={[
                { key: 'buyer', header: 'Buyer', width: 110, value: (j) => j.buyer, render: (j) => <strong>{j.buyer}</strong> },
                { key: 'jobNo', header: 'Job No', width: 100, value: (j) => j.jobNo, render: (j) => <strong>{j.jobNo}</strong> },
                { key: 'color', header: 'Color', width: 130, value: (j) => j.color },
                { key: 'component', header: 'Component', width: 110, value: (j) => j.component || 'Body', render: (j) => <span className="status-pill neutral">{j.component || 'Body'}</span> },
                { key: 'orderQty', header: 'Order Qty', width: 110, numeric: true, total: true, unit: 'kg', value: (j) => Number(j.orderQty || 0), render: (j) => `${num(j.orderQty)} KG` },
                { key: 'prodnBalance', header: 'Prodn Balance', width: 120, numeric: true, total: true, unit: 'kg', value: (j) => Number(j.prodnBalance || 0), render: (j) => <strong style={{ color: '#dc2626' }}>{num(j.prodnBalance)} KG</strong> },
                { key: 'tnaEnd', header: 'T&A End', width: 110, value: (j) => j.tnaEnd, render: (j) => dt(j.tnaEnd) },
                { key: 'yarnShortage', header: 'Yarn Status', width: 130, value: (j) => (j.yarnShortage ? `Short ${j.yarnShortage}` : 'Ready'), render: (j) => <span className={`status-pill ${j.yarnShortage ? 'bad' : 'good'}`}>{j.yarnShortage ? `Short ${num(j.yarnShortage)} KG` : 'Ready'}</span> },
                { key: 'machine', header: 'Machine', width: 120, value: (j) => j.machine || 'Unallocated' },
                { key: 'reason', header: 'Delay Factor / Remarks', width: 180, value: (j) => j.reason || 'Pending start', render: (j) => <span style={{ color: '#ea580c' }}>{j.reason || 'Pending start'}</span> },
              ] satisfies GridColumn<any>[]}
            />
          </div>
        </>
      )}

      {/* Section 6.B: The 29 Headings from Knitting Production Execution Summary-2026.xlsx */}
      {!loading && tab === 'execution' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Knitting Production Execution Summary (Authoritative 29 Columns)</div>
              <div className="panel-sub">
                Original Excel: <code>Knitting Production Execution Summary-2026.xlsx</code>.
                Every column is filterable. Preserves exact Job + Color + Fabric Component (Body / L Rib / S-Jersey) detail.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setExecFilters({})}>Clear Filters</button>
              <button className="btn btn-primary" onClick={() => window.print()}>Print / Export</button>
            </div>
          </div>

          <DataGrid<any>
            storageKey="knitting-execution-29cols"
            exportName="knitting-execution-summary-2026"
            rows={filteredExecution.map((r, i) => ({ ...r, _key: `${r.jobNo}-${r.colour}-${r.fabricDescription}-${i}` }))}
            frozenColumns={2}
            rowKey={(r) => r._key}
            selectedRowKey={selectedExecKey}
            onRowClick={(r) => setSelectedExecKey(r._key)}
            columns={[
              { key: 'buyer', header: '1. Buyer', width: 110, value: (r) => r.buyer, render: (r) => <strong>{r.buyer}</strong> },
              { key: 'jobNo', header: '2. Job No', width: 100, value: (r) => r.jobNo, render: (r) => <strong>{r.jobNo}</strong> },
              { key: 'count', header: '3. Count', width: 95, value: (r) => r.count },
              { key: 'countType', header: '4. Count Type', width: 110, value: (r) => r.countType },
              { key: 'yarnBrand', header: '5. Yarn Brand', width: 120, value: (r) => r.yarnBrand },
              { key: 'yarnLot', header: '6. Yarn Lot', width: 105, value: (r) => r.yarnLot },
              { key: 'fgsm', header: '7. F/GSM', width: 90, numeric: true, value: (r) => Number(r.fgsm || 0) },
              { key: 'colour', header: '8. Colour', width: 130, value: (r) => r.colour },
              { key: 'fabricDescription', header: '9. F/ Des (Component)', width: 145, value: (r) => r.fabricDescription, render: (r) => <span className="status-pill neutral">{r.fabricDescription}</span> },
              { key: 'mcDia', header: '10. M/C Dia', width: 95, value: (r) => r.mcDia },
              { key: 'fdia', header: '11. F/dia', width: 95, value: (r) => r.fdia },
              { key: 'knitFact', header: '12. Knit/Fact', width: 120, value: (r) => r.knitFact },
              { key: 'orderQty', header: '13. Order Qty', width: 115, numeric: true, total: true, unit: 'kg', value: (r) => Number(r.orderQty || 0), render: (r) => <strong>{num(r.orderQty)}</strong> },
              { key: 'todayDelivery', header: '14. Today Delivery', width: 120, numeric: true, total: true, unit: 'kg', value: (r) => Number(r.todayDelivery || 0), render: (r) => num(r.todayDelivery) },
              { key: 'prodn', header: '15. Prodn', width: 110, numeric: true, total: true, unit: 'kg', value: (r) => Number(r.prodn || 0), render: (r) => <strong style={{ color: '#16a34a' }}>{num(r.prodn)}</strong> },
              { key: 'prodnBalance', header: '16. Prodn Balance', width: 125, numeric: true, total: true, unit: 'kg', value: (r) => Number(r.prodnBalance || 0), render: (r) => <strong style={{ color: Number(r.prodnBalance) > 0 ? '#ea580c' : '#16a34a' }}>{num(r.prodnBalance)}</strong> },
              { key: 'delivery', header: '17. Delivery', width: 110, numeric: true, total: true, unit: 'kg', value: (r) => Number(r.delivery || 0), render: (r) => num(r.delivery) },
              { key: 'deliveryBalance', header: '18. Delivery Balance', width: 130, numeric: true, total: true, unit: 'kg', value: (r) => Number(r.deliveryBalance || 0), render: (r) => <strong style={{ color: Number(r.deliveryBalance) > 0 ? '#ea580c' : '#16a34a' }}>{num(r.deliveryBalance)}</strong> },
              { key: 'greigeStock', header: '19. Greige Stock', width: 115, numeric: true, total: true, unit: 'kg', value: (r) => Number(r.greigeStock || 0), render: (r) => <strong>{num(r.greigeStock)}</strong> },
              { key: 'fosRcvdDate', header: '20. FOS Rcvd Date', width: 120, value: (r) => r.fosRcvdDate, render: (r) => dt(r.fosRcvdDate) },
              { key: 'tnaStart', header: '21. Knitting T&A Start', width: 130, value: (r) => r.tnaStart, render: (r) => dt(r.tnaStart) },
              { key: 'tnaEnd', header: '22. Knitting T&A End', width: 130, value: (r) => r.tnaEnd, render: (r) => dt(r.tnaEnd) },
              { key: 'actualCompleted', header: '23. Actual Knitting Completed', width: 150, value: (r) => r.actualCompleted, render: (r) => dt(r.actualCompleted) },
              { key: 'remarks', header: '24. Remarks', width: 140, value: (r) => r.remarks || '—' },
              { key: 'season', header: '25. Season', width: 100, value: (r) => r.season },
              { key: 'shipDate', header: '26. Ship Date', width: 115, value: (r) => r.shipDate, render: (r) => dt(r.shipDate) },
              { key: 'slot', header: '27. Knitting Slot', width: 115, value: (r) => r.slot || '1st', render: (r) => <span className="status-pill neutral">{r.slot || '1st'}</span> },
              { key: 'acHolder', header: '28. AC Holder Name', width: 130, value: (r) => r.acHolder },
              { key: 'progDue', header: '29. Prog. Due', width: 110, value: (r) => r.progDue || '—' },
            ] satisfies GridColumn<any>[]}
          />
        </div>
      )}

      {/* Section 6.C: Machine-wise Knitting Gantt */}
      {!loading && tab === 'gantt' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Machine-wise Knitting Gantt &amp; Loading</div>
            </div>
          </div>

          <DataGrid<any>
            storageKey="knitting-machine-gantt"
            exportName="knitting-machine-gantt"
            rows={(d.ganttRows || []).map((m: any, i: number) => ({ ...m, _key: `${m.machineNo}-${m.jobNo}-${i}`, _seq: m.sequence || i + 1 }))}
            frozenColumns={2}
            rowKey={(m) => m._key}
            columns={[
              { key: 'sequence', header: 'M/C Seq', width: 90, value: (m) => m._seq, render: (m) => <strong>#{m._seq}</strong> },
              { key: 'machineName', header: 'Machine Name', width: 140, value: (m) => m.machineName, render: (m) => <strong>{m.machineName}</strong> },
              { key: 'diaGauge', header: 'Dia & Gauge', width: 110, value: (m) => `${m.mcDia}" × ${m.gauge}G` },
              { key: 'factory', header: 'Factory', width: 120, value: (m) => m.factory || 'NFL Unit-1' },
              { key: 'isInHouse', header: 'In/Out', width: 100, value: (m) => (m.isInHouse ? 'In-House' : 'Outside'), render: (m) => <span className={`status-pill ${m.isInHouse ? 'neutral' : 'warn'}`}>{m.isInHouse ? 'In-House' : 'Outside'}</span> },
              { key: 'jobNo', header: 'Job No', width: 100, value: (m) => m.jobNo, render: (m) => <strong>{m.jobNo}</strong> },
              { key: 'color', header: 'Color', width: 125, value: (m) => m.color },
              { key: 'fabricComponent', header: 'Component', width: 115, value: (m) => m.fabricComponent, render: (m) => <span className="status-pill neutral">{m.fabricComponent}</span> },
              { key: 'yarnDetails', header: 'Yarn Details', width: 170, value: (m) => `${m.yarnCount} ${m.yarnBrand} (Lot ${m.yarnLot})` },
              { key: 'slot', header: 'Slot', width: 90, value: (m) => m.slot },
              { key: 'startDate', header: 'Start Date', width: 110, value: (m) => m.startDate, render: (m) => dt(m.startDate) },
              { key: 'endDate', header: 'End Date', width: 110, value: (m) => m.endDate, render: (m) => dt(m.endDate) },
              { key: 'plannedKg', header: 'Planned KG', width: 115, numeric: true, total: true, unit: 'kg', value: (m) => Number(m.plannedKg || 0), render: (m) => <strong>{num(m.plannedKg)} KG</strong> },
              { key: 'dailyCapacity', header: 'Daily Cap', width: 110, numeric: true, unit: 'kg', value: (m) => Number(m.dailyCapacity || 0), render: (m) => `${num(m.dailyCapacity)} KG` },
              { key: 'status', header: 'Status', width: 110, value: (m) => m.status, render: (m) => <span className={`status-pill ${m.status === 'RUNNING' ? 'good' : m.status === 'IDLE' ? 'bad' : 'neutral'}`}>{m.status}</span> },
            ] satisfies GridColumn<any>[]}
          />
        </div>
      )}

      {/* Section 6.D: Requirement & Process Loss Approval */}
      {!loading && tab === 'process-loss' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Requirement &amp; Variable Process Loss Approval</div>
              <div className="panel-sub">
                FOS finished requirement is <strong>READ ONLY</strong>. Process loss is variable (e.g. 11%, 15%, 16%, 20%). Knitting confirms Process Loss % and Excess to compute Approved Grey / Knitting Qty.
              </div>
            </div>
          </div>

          <DataGrid<any>
            storageKey="knitting-process-loss"
            exportName="knitting-process-loss"
            rows={d.processLossRows || []}
            frozenColumns={2}
            rowKey={(r) => r.id}
            columns={[
              { key: 'jobNo', header: 'Job No', width: 100, value: (r) => r.jobNo, render: (r) => <strong>{r.jobNo}</strong> },
              { key: 'buyer', header: 'Buyer', width: 110, value: (r) => r.buyer },
              { key: 'styleNo', header: 'Style No', width: 115, value: (r) => r.styleNo },
              { key: 'color', header: 'Color', width: 120, value: (r) => r.color },
              { key: 'component', header: 'Component', width: 110, value: (r) => r.component, render: (r) => <span className="status-pill neutral">{r.component}</span> },
              { key: 'fabricDescription', header: 'Fabric Description', width: 170, value: (r) => r.fabricDescription },
              { key: 'finishedKg', header: 'FOS Finished Req (READ ONLY)', width: 155, numeric: true, total: true, unit: 'kg', value: (r) => Number(r.finishedKg || 0), render: (r) => <strong style={{ background: '#f1f5f9', padding: '3px 6px', borderRadius: 4 }}>{num(r.finishedKg)} KG</strong> },
              {
                key: 'processLossPct',
                header: 'Process Loss %',
                width: 125,
                filterable: false,
                value: (r) => plInputs[r.id]?.lossPct ?? r.processLossPct ?? 15,
                render: (r) => {
                  const input = plInputs[r.id] || { lossPct: r.processLossPct || 15, excessKg: 0, approved: r.status === 'APPROVED' };
                  return (
                    <span onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        min="0"
                        max="40"
                        step="0.5"
                        style={{ width: 72, padding: 4, borderRadius: 4, border: '1px solid #cbd5e1' }}
                        value={input.lossPct}
                        onChange={(e) => setPlInputs({ ...plInputs, [r.id]: { ...input, lossPct: Number(e.target.value) } })}
                      /> %
                    </span>
                  );
                },
              },
              {
                key: 'excessKg',
                header: 'Excess KG',
                width: 110,
                filterable: false,
                value: (r) => plInputs[r.id]?.excessKg ?? 0,
                render: (r) => {
                  const input = plInputs[r.id] || { lossPct: r.processLossPct || 15, excessKg: 0, approved: r.status === 'APPROVED' };
                  return (
                    <span onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        min="0"
                        style={{ width: 72, padding: 4, borderRadius: 4, border: '1px solid #cbd5e1' }}
                        value={input.excessKg}
                        onChange={(e) => setPlInputs({ ...plInputs, [r.id]: { ...input, excessKg: Number(e.target.value) } })}
                      />
                    </span>
                  );
                },
              },
              {
                key: 'suggestedGrey',
                header: 'Suggested Grey Qty',
                width: 135,
                numeric: true,
                total: true,
                unit: 'kg',
                value: (r) => {
                  const input = plInputs[r.id] || { lossPct: r.processLossPct || 15, excessKg: 0, approved: r.status === 'APPROVED' };
                  const loss = Number(input.lossPct) || 0;
                  const finished = Number(r.finishedKg) || 0;
                  return finished > 0 ? Math.round(finished / (1 - loss / 100)) : 0;
                },
                render: (r) => {
                  const input = plInputs[r.id] || { lossPct: r.processLossPct || 15, excessKg: 0, approved: r.status === 'APPROVED' };
                  const loss = Number(input.lossPct) || 0;
                  const finished = Number(r.finishedKg) || 0;
                  const suggested = finished > 0 ? finished / (1 - loss / 100) : 0;
                  return <strong>{num(suggested)} KG</strong>;
                },
              },
              {
                key: 'approvedTotal',
                header: 'Approved Knitting Qty',
                width: 145,
                numeric: true,
                total: true,
                unit: 'kg',
                value: (r) => {
                  const input = plInputs[r.id] || { lossPct: r.processLossPct || 15, excessKg: 0, approved: r.status === 'APPROVED' };
                  const loss = Number(input.lossPct) || 0;
                  const finished = Number(r.finishedKg) || 0;
                  const suggested = finished > 0 ? finished / (1 - loss / 100) : 0;
                  return Math.round(suggested + Number(input.excessKg || 0));
                },
                render: (r) => {
                  const input = plInputs[r.id] || { lossPct: r.processLossPct || 15, excessKg: 0, approved: r.status === 'APPROVED' };
                  const loss = Number(input.lossPct) || 0;
                  const finished = Number(r.finishedKg) || 0;
                  const suggested = finished > 0 ? finished / (1 - loss / 100) : 0;
                  const approvedTotal = suggested + Number(input.excessKg || 0);
                  return <strong style={{ color: '#16a34a' }}>{num(approvedTotal)} KG</strong>;
                },
              },
              {
                key: 'status',
                header: 'Status',
                width: 110,
                value: (r) => (plInputs[r.id]?.approved ?? (r.status === 'APPROVED') ? 'APPROVED' : 'PENDING'),
                render: (r) => {
                  const approved = plInputs[r.id]?.approved ?? (r.status === 'APPROVED');
                  return <span className={`status-pill ${approved ? 'good' : 'warn'}`}>{approved ? 'APPROVED' : 'PENDING'}</span>;
                },
              },
              {
                key: 'action',
                header: 'Action',
                width: 105,
                filterable: false,
                render: (r) => (
                  <button
                    className="btn btn-primary btn-compact"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApproveProcessLoss(r.id);
                    }}
                  >
                    Approve
                  </button>
                ),
              },
            ] satisfies GridColumn<any>[]}
          />
        </div>
      )}

      {/* Section 6.E: Yarn Requirement */}
      {!loading && tab === 'yarn-req' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Count / Type / Composition-wise Yarn Requirement</div>
            </div>
          </div>

          <DataGrid<any>
            storageKey="knitting-yarn-req"
            exportName="knitting-yarn-req"
            rows={(d.yarnReqRows || []).map((y: any, i: number) => ({ ...y, _key: `${y.count}-${y.composition}-${i}` }))}
            frozenColumns={2}
            rowKey={(y) => y._key}
            columns={[
              { key: 'count', header: 'Yarn Count', width: 105, value: (y) => y.count, render: (y) => <strong>{y.count}</strong> },
              { key: 'composition', header: 'Composition', width: 150, value: (y) => y.composition },
              { key: 'type', header: 'Type', width: 110, value: (y) => y.type },
              { key: 'knittingReq', header: 'Knitting Req (KG)', width: 130, numeric: true, total: true, unit: 'kg', value: (y) => Number(y.knittingReq || 0), render: (y) => <strong>{num(y.knittingReq)}</strong> },
              { key: 'totalRequisition', header: 'Total Requisition', width: 130, numeric: true, total: true, unit: 'kg', value: (y) => Number(y.totalRequisition || 0), render: (y) => num(y.totalRequisition) },
              { key: 'storeStock', header: 'Store Stock', width: 115, numeric: true, total: true, unit: 'kg', value: (y) => Number(y.storeStock || 0), render: (y) => num(y.storeStock) },
              { key: 'reservedStock', header: 'Reserved Stock', width: 120, numeric: true, total: true, unit: 'kg', value: (y) => Number(y.reservedStock || 0), render: (y) => num(y.reservedStock) },
              { key: 'freeStock', header: 'Free Stock', width: 115, numeric: true, total: true, unit: 'kg', value: (y) => Number(y.freeStock || 0), render: (y) => <strong style={{ color: y.freeStock < 0 ? '#dc2626' : '#16a34a' }}>{num(y.freeStock)}</strong> },
              { key: 'pipeline', header: 'Pipeline', width: 105, numeric: true, total: true, unit: 'kg', value: (y) => Number(y.pipeline || 0), render: (y) => num(y.pipeline) },
              { key: 'safetyStock', header: 'Safety Stock', width: 110, numeric: true, total: true, unit: 'kg', value: (y) => Number(y.safetyStock || 0), render: (y) => num(y.safetyStock) },
              { key: 'shortage', header: 'Shortage', width: 110, numeric: true, total: true, unit: 'kg', value: (y) => Number(y.shortage || 0), render: (y) => <strong style={{ color: y.shortage > 0 ? '#dc2626' : '#16a34a' }}>{num(y.shortage)}</strong> },
              { key: 'qtyToOrder', header: 'Qty to Order', width: 115, numeric: true, total: true, unit: 'kg', value: (y) => Number(y.qtyToOrder || 0), render: (y) => <strong style={{ color: y.qtyToOrder > 0 ? '#ea580c' : '#64748b' }}>{num(y.qtyToOrder)}</strong> },
              { key: 'requiredDate', header: 'Req. Date', width: 110, value: (y) => y.requiredDate, render: (y) => dt(y.requiredDate) },
              { key: 'relatedJobs', header: 'Related Jobs', width: 150, value: (y) => y.relatedJobs?.join(', ') || '—' },
            ] satisfies GridColumn<any>[]}
          />
        </div>
      )}

      {/* Section 6.F: Dead Stock (<25% usage in 6 months) */}
      {!loading && tab === 'dead-stock' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Dead Stock Analysis (Strict Rule: Usage &lt; 25% Over Last 6 Months)</div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="metric-card" style={{ padding: '8px 14px', minHeight: 'auto' }}>
                <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Dead Compositions</span>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{d.deadStockSummary?.deadCount || 3}</div>
              </div>
              <div className="metric-card" style={{ padding: '8px 14px', minHeight: 'auto' }}>
                <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Dead Stock Qty</span>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{num(d.deadStockSummary?.deadQty || 4280)} KG</div>
              </div>
            </div>
          </div>

          <DataGrid<any>
            storageKey="knitting-dead-stock"
            exportName="knitting-dead-stock"
            rows={(d.deadStockRows || []).map((ds: any, i: number) => ({ ...ds, _key: `${ds.composition}-${ds.count}-${i}` }))}
            frozenColumns={2}
            rowKey={(ds) => ds._key}
            columns={[
              { key: 'composition', header: 'Composition', width: 145, value: (ds) => ds.composition, render: (ds) => <strong>{ds.composition}</strong> },
              { key: 'count', header: 'Yarn Count', width: 105, value: (ds) => ds.count },
              { key: 'type', header: 'Type', width: 105, value: (ds) => ds.type },
              { key: 'brand', header: 'Brand', width: 120, value: (ds) => ds.brand },
              { key: 'color', header: 'Color / Cat', width: 120, value: (ds) => ds.color },
              { key: 'currentStock', header: 'Current Stock', width: 120, numeric: true, total: true, unit: 'kg', value: (ds) => Number(ds.currentStock || 0), render: (ds) => <strong>{num(ds.currentStock)} KG</strong> },
              { key: 'available6m', header: '6M Available', width: 115, numeric: true, total: true, unit: 'kg', value: (ds) => Number(ds.available6m || 0), render: (ds) => `${num(ds.available6m)} KG` },
              { key: 'used6m', header: '6M Used', width: 110, numeric: true, total: true, unit: 'kg', value: (ds) => Number(ds.used6m || 0), render: (ds) => `${num(ds.used6m)} KG` },
              { key: 'usagePct', header: 'Usage %', width: 95, numeric: true, value: (ds) => Number(ds.usagePct || 0), render: (ds) => <strong style={{ color: ds.usagePct < 25 ? '#dc2626' : '#16a34a' }}>{ds.usagePct}%</strong> },
              { key: 'deadQty', header: 'Dead Qty', width: 115, numeric: true, total: true, unit: 'kg', value: (ds) => Number(ds.deadQty || 0), render: (ds) => <strong style={{ color: ds.usagePct < 25 ? '#dc2626' : '#64748b' }}>{num(ds.deadQty)} KG</strong> },
              { key: 'lastIssueDate', header: 'Last Issue Date', width: 115, value: (ds) => ds.lastIssueDate, render: (ds) => dt(ds.lastIssueDate) },
              { key: 'daysIdle', header: 'Days Idle', width: 95, numeric: true, value: (ds) => Number(ds.daysIdle || 0), render: (ds) => `${ds.daysIdle} days` },
              { key: 'pipeline', header: 'Pipeline', width: 100, numeric: true, value: (ds) => Number(ds.pipeline || 0), render: (ds) => num(ds.pipeline) },
              { key: 'safetyStock', header: 'Safety Stock', width: 105, numeric: true, value: (ds) => Number(ds.safetyStock || 0), render: (ds) => num(ds.safetyStock) },
              { key: 'status', header: 'Status', width: 145, value: (ds) => (ds.usagePct < 25 ? 'DEAD STOCK (<25%)' : 'ACTIVE'), render: (ds) => <span className={`status-pill ${ds.usagePct < 25 ? 'bad' : 'good'}`}>{ds.usagePct < 25 ? 'DEAD STOCK (<25%)' : 'ACTIVE'}</span> },
            ] satisfies GridColumn<any>[]}
          />
        </div>
      )}

      {/* Section 6.G: Production Follow-up Milestones */}
      {!loading && tab === 'follow-up' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Production Follow-up Milestone Tracking</div>
            </div>
          </div>

          <DataGrid<any>
            storageKey="knitting-followup-milestones"
            exportName="knitting-followup-milestones"
            rows={(d.followUpRows || []).map((f: any, i: number) => ({ ...f, _key: `${f.jobNo}-${f.color}-${i}` }))}
            frozenColumns={2}
            rowKey={(f) => f._key}
            columns={[
              { key: 'jobNo', header: 'Job No', width: 100, value: (f) => f.jobNo, render: (f) => <strong>{f.jobNo}</strong> },
              { key: 'buyer', header: 'Buyer', width: 110, value: (f) => f.buyer },
              { key: 'colorComp', header: 'Color / Component', width: 150, value: (f) => `${f.color} ${f.component}`, render: (f) => <span>{f.color} · <span className="status-pill neutral">{f.component}</span></span> },
              { key: 'fosReceived', header: 'FOS Rcvd', width: 105, value: (f) => f.fosReceived, render: (f) => dt(f.fosReceived) },
              { key: 'reqConfirmed', header: 'Req Confirmed', width: 115, value: (f) => f.reqConfirmed, render: (f) => dt(f.reqConfirmed) },
              { key: 'planOk', header: 'Plan OK', width: 105, value: (f) => f.planOk, render: (f) => dt(f.planOk) },
              { key: 'yarnReady', header: 'Yarn Ready', width: 105, value: (f) => f.yarnReady, render: (f) => dt(f.yarnReady) },
              { key: 'mcAllocated', header: 'M/C Allocated', width: 115, value: (f) => f.mcAllocated, render: (f) => dt(f.mcAllocated) },
              { key: 'knittingRunning', header: 'Knitting Running', width: 120, value: (f) => f.knittingRunning, render: (f) => dt(f.knittingRunning) },
              { key: 'completed', header: 'Completed', width: 105, value: (f) => f.completed, render: (f) => dt(f.completed) },
              { key: 'greigeDelivered', header: 'Greige Delivered', width: 120, value: (f) => f.greigeDelivered, render: (f) => dt(f.greigeDelivered) },
              { key: 'delayDays', header: 'Delay (Days)', width: 105, numeric: true, value: (f) => Number(f.delayDays || 0), render: (f) => <strong style={{ color: f.delayDays > 0 ? '#dc2626' : '#16a34a' }}>{f.delayDays > 0 ? `+${f.delayDays}d` : '0d'}</strong> },
              { key: 'responsible', header: 'Responsible', width: 130, value: (f) => f.responsible || 'Knitting In-Charge' },
              { key: 'remarks', header: 'Remarks', width: 140, value: (f) => f.remarks || '—' },
            ] satisfies GridColumn<any>[]}
          />
        </div>
      )}

      {/* Section 6.H: Outside Knitting */}
      {!loading && tab === 'outside' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Outside Knitting Allocation &amp; Capacity Control</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Month:</label>
              <input type="month" value={outsideMonth} onChange={(e) => setOutsideMonth(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
            </div>
          </div>

          <div className="ie-kpi-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', marginBottom: 14 }}>
            <div><span>Total Load</span><strong>{num(kpis.totalLoad)} KG</strong></div>
            <div><span>In-house Load</span><strong>{num(kpis.inHouseLoad)} KG</strong></div>
            <div><span>Outside Load</span><strong>{num(kpis.outsideLoad)} KG</strong></div>
            <div><span>In-house Done</span><strong>{num(kpis.inHouseCompleted || 40000)} KG</strong></div>
            <div><span>Outside Done</span><strong>{num(kpis.outsideCompleted || 8000)} KG</strong></div>
            <div><span>Outside Balance</span><strong style={{ color: '#ea580c' }}>{num(kpis.outsideBalance || 17000)} KG</strong></div>
            <div><span>Yet to Allocate</span><strong>{num(kpis.yetToAllocate)} KG</strong></div>
          </div>

          <DataGrid<any>
            storageKey="knitting-outside-factories"
            exportName="knitting-outside-factories"
            rows={(d.outsideFactories || []).map((of: any, i: number) => ({ ...of, _key: `${of.factory}-${i}`, _month: outsideMonth }))}
            frozenColumns={2}
            rowKey={(of) => of._key}
            columns={[
              { key: 'month', header: 'Month', width: 95, value: (of) => of._month },
              { key: 'factory', header: 'Factory', width: 150, value: (of) => of.factory, render: (of) => <strong>{of.factory}</strong> },
              { key: 'projectedCapacity', header: 'Projected Capacity (KG)', width: 145, numeric: true, total: true, unit: 'kg', value: (of) => Number(of.projectedCapacity || 0), render: (of) => num(of.projectedCapacity) },
              { key: 'allocated', header: 'Allocated (KG)', width: 120, numeric: true, total: true, unit: 'kg', value: (of) => Number(of.allocated || 0), render: (of) => <strong>{num(of.allocated)}</strong> },
              { key: 'completed', header: 'Completed (KG)', width: 120, numeric: true, total: true, unit: 'kg', value: (of) => Number(of.completed || 0), render: (of) => num(of.completed) },
              { key: 'running', header: 'Running (KG)', width: 115, numeric: true, total: true, unit: 'kg', value: (of) => Number(of.running || 0), render: (of) => num(of.running) },
              { key: 'balanceAtFactory', header: 'Balance at Factory', width: 130, numeric: true, total: true, unit: 'kg', value: (of) => Number(of.balanceAtFactory || 0), render: (of) => <strong style={{ color: '#ea580c' }}>{num(of.balanceAtFactory)}</strong> },
              { key: 'availableCapacity', header: 'Available Capacity', width: 130, numeric: true, total: true, unit: 'kg', value: (of) => Number(of.availableCapacity || 0), render: (of) => <strong style={{ color: of.availableCapacity < 0 ? '#dc2626' : '#16a34a' }}>{num(of.availableCapacity)}</strong> },
              { key: 'nextPlannedLoad', header: 'Next Planned Load', width: 130, numeric: true, total: true, unit: 'kg', value: (of) => Number(of.nextPlannedLoad || 0), render: (of) => num(of.nextPlannedLoad) },
              { key: 'jobs', header: 'Jobs / Colors', width: 150, value: (of) => of.jobs?.join(', ') || '—' },
              { key: 'tnaDue', header: 'T&A Due', width: 105, value: (of) => of.tnaDue, render: (of) => dt(of.tnaDue) },
              { key: 'status', header: 'Status', width: 105, value: (of) => of.status, render: (of) => <span className={`status-pill ${of.status === 'ACTIVE' ? 'good' : 'neutral'}`}>{of.status}</span> },
            ] satisfies GridColumn<any>[]}
          />

          <div style={{ marginTop: 20 }}>
            <div className="panel-title" style={{ fontSize: 13, marginBottom: 8 }}>Challan Program &amp; Return Tracking (Sent → Running → Received → Completed)</div>
            <DataGrid<any>
              storageKey="knitting-outside-challans"
              exportName="knitting-outside-challans"
              rows={(d.outsideChallans || []).map((ch: any, i: number) => ({ ...ch, _key: `${ch.challanNo}-${i}` }))}
              frozenColumns={2}
              rowKey={(ch) => ch._key}
              columns={[
                { key: 'challanNo', header: 'Challan / Ref', width: 120, value: (ch) => ch.challanNo, render: (ch) => <strong>{ch.challanNo}</strong> },
                { key: 'factory', header: 'Outside Factory', width: 145, value: (ch) => ch.factory },
                { key: 'jobNo', header: 'Job No', width: 100, value: (ch) => ch.jobNo, render: (ch) => <strong>{ch.jobNo}</strong> },
                { key: 'color', header: 'Color', width: 120, value: (ch) => ch.color },
                { key: 'component', header: 'Component', width: 110, value: (ch) => ch.component, render: (ch) => <span className="status-pill neutral">{ch.component}</span> },
                { key: 'sendDate', header: 'Send Date', width: 105, value: (ch) => ch.sendDate, render: (ch) => dt(ch.sendDate) },
                { key: 'sendQty', header: 'Send Qty (KG)', width: 115, numeric: true, total: true, unit: 'kg', value: (ch) => Number(ch.sendQty || 0), render: (ch) => num(ch.sendQty) },
                { key: 'receiveQty', header: 'Receive Qty (KG)', width: 125, numeric: true, total: true, unit: 'kg', value: (ch) => Number(ch.receiveQty || 0), render: (ch) => num(ch.receiveQty) },
                { key: 'balance', header: 'Balance (KG)', width: 115, numeric: true, total: true, unit: 'kg', value: (ch) => Number(ch.balance || 0), render: (ch) => <strong style={{ color: Number(ch.balance) > 0 ? '#ea580c' : '#16a34a' }}>{num(ch.balance)}</strong> },
                { key: 'plannedReturn', header: 'Planned Return', width: 115, value: (ch) => ch.plannedReturn, render: (ch) => dt(ch.plannedReturn) },
                { key: 'actualReturn', header: 'Actual Return', width: 115, value: (ch) => ch.actualReturn, render: (ch) => dt(ch.actualReturn) },
                { key: 'status', header: 'Status', width: 110, value: (ch) => ch.status, render: (ch) => <span className={`status-pill ${ch.status === 'COMPLETED' ? 'good' : 'warn'}`}>{ch.status}</span> },
              ] satisfies GridColumn<any>[]}
            />
          </div>
        </div>
      )}

      {/* Section 6.I: Daily Production & Date-wise */}
      {!loading && tab === 'daily-production' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Daily Production Target &amp; Date-wise Output</div>
            </div>
          </div>

          <DataGrid<any>
            storageKey="knitting-daily-production"
            exportName="knitting-daily-production"
            rows={(d.dailyProductionRows || []).map((dp: any, i: number) => {
              const target = (dp.s1Target || 0) + (dp.s2Target || 0);
              const actual = (dp.s1Actual || 0) + (dp.s2Actual || 0);
              const diff = actual - target;
              const eff = target > 0 ? Math.round((actual / target) * 100) : 0;
              return { ...dp, _key: `${dp.date}-${dp.machine}-${i}`, target, actual, diff, eff };
            })}
            frozenColumns={2}
            rowKey={(dp) => dp._key}
            columns={[
              { key: 'date', header: 'Date', width: 110, value: (dp) => dp.date, render: (dp) => <strong>{dt(dp.date)}</strong> },
              { key: 'machine', header: 'Machine', width: 120, value: (dp) => dp.machine, render: (dp) => <strong>{dp.machine}</strong> },
              { key: 'jobNo', header: 'Job No', width: 100, value: (dp) => dp.jobNo },
              { key: 'color', header: 'Color', width: 120, value: (dp) => dp.color },
              { key: 'component', header: 'Component', width: 110, value: (dp) => dp.component, render: (dp) => <span className="status-pill neutral">{dp.component}</span> },
              { key: 's1Target', header: 'Shift 1 Target', width: 110, numeric: true, total: true, unit: 'kg', value: (dp) => Number(dp.s1Target || 0) },
              { key: 's1Actual', header: 'Shift 1 Actual', width: 110, numeric: true, total: true, unit: 'kg', value: (dp) => Number(dp.s1Actual || 0) },
              { key: 's2Target', header: 'Shift 2 Target', width: 110, numeric: true, total: true, unit: 'kg', value: (dp) => Number(dp.s2Target || 0) },
              { key: 's2Actual', header: 'Shift 2 Actual', width: 110, numeric: true, total: true, unit: 'kg', value: (dp) => Number(dp.s2Actual || 0) },
              { key: 'target', header: 'Daily Target (KG)', width: 125, numeric: true, total: true, unit: 'kg', value: (dp) => dp.target, render: (dp) => <strong>{num(dp.target)}</strong> },
              { key: 'actual', header: 'Daily Actual (KG)', width: 125, numeric: true, total: true, unit: 'kg', value: (dp) => dp.actual, render: (dp) => <strong style={{ color: '#16a34a' }}>{num(dp.actual)}</strong> },
              { key: 'diff', header: 'Variance', width: 100, numeric: true, total: true, unit: 'kg', value: (dp) => dp.diff, render: (dp) => <strong style={{ color: dp.diff < 0 ? '#dc2626' : '#16a34a' }}>{dp.diff > 0 ? `+${dp.diff}` : dp.diff}</strong> },
              { key: 'eff', header: 'Efficiency %', width: 105, numeric: true, value: (dp) => dp.eff, render: (dp) => <span className={`status-pill ${dp.eff >= 90 ? 'good' : dp.eff >= 75 ? 'neutral' : 'bad'}`}>{dp.eff}%</span> },
            ] satisfies GridColumn<any>[]}
          />
        </div>
      )}

      <DrillPopup
        target={drillTarget}
        onClose={() => setDrillTarget(null)}
        onShowInTable={(f) => {
          setTab('execution');
          setExecSearch(f.value);
          setDrillTarget(null);
        }}
      />
    </Shell>
  );
}
