'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { DataGrid, DrillPopup } from '../../../components/ui';
import type { GridColumn, DrillTarget } from '../../../components/ui';
import { api } from '../../../lib/api';
import { fmtNum } from '../../../lib/format';
import { KPI_DEPARTMENTS, KPI_METRICS_BY_DEPARTMENT } from '../../../lib/factoryKpiMaster';

const now = new Date();
const num = (v: any) => (v === null || v === undefined || v === '' ? '—' : fmtNum(Number(v), 2));

const SECTIONS = ['ALL', ...KPI_DEPARTMENTS];

export default function KpiBoardPage() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activeSection, setActiveSection] = useState('ALL');
  const [data, setData] = useState<any>({ auto: [], manual: [] });
  const [yearly, setYearly] = useState<any>({ lines: [], overall: {} });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [drill, setDrill] = useState<DrillTarget | null>(null);
  const [lineFilter, setLineFilter] = useState<string>('');

  // Manual entry form with synchronized dropdowns
  const [formDept, setFormDept] = useState<string>('Production');
  const deptMetrics = useMemo(() => KPI_METRICS_BY_DEPARTMENT[formDept] || [], [formDept]);
  const [formParticular, setFormParticular] = useState<string>(deptMetrics[0]?.particular || 'Factory Sewing Efficiency (%)');

  const [form, setForm] = useState<any>({
    value: '',
    unit: '%',
    target: '',
    remarks: ''
  });

  function handleDeptChange(dept: string) {
    setFormDept(dept);
    const metrics = KPI_METRICS_BY_DEPARTMENT[dept] || [];
    if (metrics.length > 0) {
      setFormParticular(metrics[0].particular);
      setForm((prev: any) => ({
        ...prev,
        unit: metrics[0].unit,
        target: metrics[0].defaultTarget ? String(metrics[0].defaultTarget) : ''
      }));
    }
  }

  function handleParticularChange(part: string) {
    setFormParticular(part);
    const m = deptMetrics.find((x) => x.particular === part);
    if (m) {
      setForm((prev: any) => ({
        ...prev,
        unit: m.unit,
        target: m.defaultTarget ? String(m.defaultTarget) : ''
      }));
    }
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [m, y] = await Promise.all([
        api(`/ie-ops/kpi?year=${year}&month=${month}`),
        api(`/ie-ops/kpi/yearly?year=${year}`)
      ]);
      setData(m || { auto: [], manual: [] });
      setYearly(y || { lines: [], overall: {} });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [year, month]);

  async function saveManual() {
    if (!formParticular || form.value === '') {
      setError('Please select a KPI metric and enter a valid value.');
      return;
    }
    try {
      setError('');
      setMsg('');
      const generatedKey = `${formDept}_${formParticular}`.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      await api('/ie-ops/kpi/manual', {
        method: 'POST',
        body: JSON.stringify({
          section: formDept,
          kpiKey: generatedKey,
          kpiName: formParticular,
          value: Number(form.value),
          unit: form.unit || '%',
          target: form.target ? Number(form.target) : undefined,
          remarks: form.remarks,
          year,
          month
        })
      });
      setMsg(`✓ Successfully saved KPI: ${formDept} · ${formParticular} = ${form.value} ${form.unit}`);
      setForm({
        value: '',
        unit: form.unit || '%',
        target: '',
        remarks: ''
      });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  // Combined auto-pulled & manual KPIs
  const allKpis = useMemo(() => {
    const list = [
      ...(data.auto || []).map((x: any) => ({ ...x, isAuto: true })),
      ...(data.manual || []).map((x: any) => ({ ...x, isAuto: false, source: 'MANUAL_ENTRY' }))
    ];
    if (activeSection === 'ALL') return list;
    return list.filter((x: any) => String(x.section).toLowerCase() === activeSection.toLowerCase());
  }, [data, activeSection]);

  // Section summary stats
  const sectionCounts = useMemo(() => {
    const m = new Map<string, { total: number; auto: number; manual: number }>();
    const list = [
      ...(data.auto || []).map((x: any) => ({ ...x, isAuto: true })),
      ...(data.manual || []).map((x: any) => ({ ...x, isAuto: false }))
    ];
    for (const k of list) {
      const sec = k.section || 'Other';
      const cur = m.get(sec) || { total: 0, auto: 0, manual: 0 };
      cur.total++;
      if (k.isAuto) cur.auto++;
      else cur.manual++;
      m.set(sec, cur);
    }
    return m;
  }, [data]);

  function openEfficiencyDrill(e: React.MouseEvent, kpiTitle?: string) {
    const rect = e.currentTarget.getBoundingClientRect();
    const lines = yearly.lines || [];
    const byLine = lines
      .map((r: any) => ({
        label: r.lineCode,
        value: Number(Number(r.avgEfficiency || 0).toFixed(1)),
        filterValue: r.lineCode
      }))
      .sort((a: any, b: any) => b.value - a.value);
    const floorMap = new Map<string, { sum: number; count: number }>();
    for (const r of lines) {
      const f = r.floorCode || 'Unassigned';
      const cur = floorMap.get(f) || { sum: 0, count: 0 };
      cur.sum += Number(r.avgEfficiency || 0);
      cur.count += 1;
      floorMap.set(f, cur);
    }
    const byFloor = [...floorMap.entries()].map(([label, v]) => ({
      label,
      value: Number((v.sum / Math.max(1, v.count)).toFixed(1)),
      filterValue: label
    }));
    setDrill({
      title: `${kpiTitle || 'Sewing Efficiency'} — By Line`,
      subtitle: `${lines.length} sewing lines (double-click drill)`,
      unit: '%',
      tone: 'blue',
      anchorRect: rect,
      chartType: 'bar',
      byFactory: byLine,
      byBuyer: byFloor,
      filterLabel: 'Show these lines in the table →'
    });
  }

  const filteredYearlyLines = useMemo(() => {
    const list = yearly.lines || [];
    if (!lineFilter) return list;
    return list.filter((r: any) => r.lineCode === lineFilter || (r.floorCode || 'Unassigned') === lineFilter);
  }, [yearly, lineFilter]);

  const yearlyLineColumns = useMemo<GridColumn<any>[]>(
    () => [
      { key: 'lineCode', header: 'Line', value: (r) => r.lineCode, render: (r) => <strong>{r.lineCode}</strong> },
      { key: 'floorCode', header: 'Floor', value: (r) => r.floorCode || '—' },
      { key: 'avgSmv', header: 'Avg SMV', numeric: true, decimals: 2, value: (r) => Number(r.avgSmv || 0) },
      {
        key: 'avgEfficiency',
        header: 'Avg Efficiency',
        numeric: true,
        decimals: 1,
        unit: '%',
        value: (r) => Number(r.avgEfficiency || 0),
        render: (r) => `${num(r.avgEfficiency)}%`
      },
      {
        key: 'avgPerformance',
        header: 'Avg Performance',
        numeric: true,
        decimals: 1,
        unit: '%',
        value: (r) => Number(r.avgPerformance || 0),
        render: (r) => `${num(r.avgPerformance)}%`
      },
      {
        key: 'production',
        header: 'Production',
        numeric: true,
        total: true,
        unit: 'pcs',
        value: (r) => Number(r.production || 0)
      },
      { key: 'avgManpower', header: 'Avg MP', numeric: true, decimals: 1, value: (r) => Number(r.avgManpower || 0) },
      { key: 'otHours', header: 'OT Hr', numeric: true, total: true, decimals: 1, value: (r) => Number(r.otHours || 0) },
      { key: 'productivity', header: 'Productivity', numeric: true, decimals: 2, value: (r) => Number(r.productivity || 0) }
    ],
    []
  );

  return (
    <Shell title="KPI Board & Data Entry">
      {msg && <div className="notice success-notice" style={{ margin: '10px 0' }}>✓ {msg}</div>}
      {error && <div className="notice" style={{ margin: '10px 0', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>⚠ {error}</div>}

      {/* Month & Filter Controls */}
      <section className="panel" style={{ padding: '12px 16px', margin: '12px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
              Year:
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
              Month:
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600 }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2026, i, 1).toLocaleString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn-primary btn-compact" onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh Data'}
            </button>
            <button className="btn btn-secondary btn-compact" onClick={() => window.print()}>
              Print Physical Board
            </button>
          </div>

          {/* Section Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Section:</span>
            {SECTIONS.map((s) => {
              const active = activeSection === s;
              const count = s === 'ALL' ? (data.auto?.length || 0) + (data.manual?.length || 0) : sectionCounts.get(s)?.total || 0;
              return (
                <button
                  key={s}
                  onClick={() => setActiveSection(s)}
                  style={{
                    border: '1px solid',
                    borderColor: active ? '#2563eb' : '#cbd5e1',
                    background: active ? '#eff6ff' : '#fff',
                    color: active ? '#1e40af' : '#475569',
                    borderRadius: '20px',
                    padding: '3px 10px',
                    fontSize: '11px',
                    fontWeight: active ? 800 : 600,
                    cursor: 'pointer'
                  }}
                >
                  {s} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* KPI Section Auto Pull Status Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', margin: '12px 0' }}>
        {[
          { label: 'Knitting', autoCount: sectionCounts.get('Knitting')?.auto || 2, manualCount: sectionCounts.get('Knitting')?.manual || 0, tone: '#3b82f6', icon: '🧶' },
          { label: 'Dyeing', autoCount: sectionCounts.get('Dyeing')?.auto || 2, manualCount: sectionCounts.get('Dyeing')?.manual || 0, tone: '#8b5cf6', icon: '🧪' },
          { label: 'Cutting', autoCount: sectionCounts.get('Cutting')?.auto || 3, manualCount: sectionCounts.get('Cutting')?.manual || 0, tone: '#06b6d4', icon: '✂️' },
          { label: 'Sewing', autoCount: sectionCounts.get('Sewing')?.auto || 5, manualCount: sectionCounts.get('Sewing')?.manual || 0, tone: '#10b981', icon: '🪡' },
          { label: 'Printing', autoCount: sectionCounts.get('Printing')?.auto || 3, manualCount: sectionCounts.get('Printing')?.manual || 0, tone: '#f59e0b', icon: '🎨' },
          { label: 'Quality', autoCount: sectionCounts.get('Quality')?.auto || 3, manualCount: sectionCounts.get('Quality')?.manual || 0, tone: '#ef4444', icon: '🔍' },
          { label: 'HR', autoCount: sectionCounts.get('HR')?.auto || 2, manualCount: sectionCounts.get('HR')?.manual || 0, tone: '#64748b', icon: '👥' },
        ].map((sc) => (
          <div
            key={sc.label}
            onClick={() => setActiveSection(sc.label)}
            onDoubleClick={(e) => sc.label === 'Sewing' && openEfficiencyDrill(e, 'Sewing Efficiency')}
            style={{
              background: '#fff',
              border: activeSection === sc.label ? `2px solid ${sc.tone}` : '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: activeSection === sc.label ? '0 4px 12px rgba(37,99,235,0.12)' : '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>{sc.icon} {sc.label}</span>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#ecfdf5', color: '#047857' }}>Auto Pulled</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>{sc.autoCount} Connected KPIs</span>
              {sc.manualCount > 0 && <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 700 }}>+{sc.manualCount} Manual</span>}
            </div>
          </div>
        ))}
      </section>

      {/* KPI CARDS GRID */}
      <section style={{ margin: '16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {activeSection === 'ALL' ? 'Factory Overall KPI Board' : `${activeSection} Section KPIs`} ({allKpis.length} Metrics)
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Double-click any efficiency / sewing KPI to drill down by line</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
          {allKpis.map((kpi: any, idx: number) => {
            const isPct = kpi.unit === '%';
            const valNum = Number(kpi.value);
            const isGood = !isNaN(valNum) && (isPct ? valNum >= 70 : true);

            return (
              <div
                key={`${kpi.section}-${kpi.kpiKey}-${idx}`}
                onDoubleClick={(e) => openEfficiencyDrill(e, kpi.kpiName)}
                title="Double-click to drill down by line"
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {kpi.section}
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: kpi.isAuto ? '#ecfdf5' : '#fef3c7',
                      color: kpi.isAuto ? '#065f46' : '#92400e'
                    }}
                  >
                    {kpi.isAuto ? 'AUTO PULL' : 'MANUAL IE'}
                  </span>
                </div>
                <strong style={{ fontSize: '13px', color: '#0f172a', lineHeight: 1.3 }}>{kpi.kpiName}</strong>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 900, color: isGood ? '#0f172a' : '#b91c1c' }}>
                    {num(kpi.value)}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>{kpi.unit}</span>
                </div>
                {kpi.target && (
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    Target: <strong>{kpi.target} {kpi.unit}</strong>
                  </div>
                )}
                {kpi.remarks && (
                  <div style={{ fontSize: '10px', color: '#475569', background: '#f8fafc', padding: '4px 6px', borderRadius: '4px' }}>
                    Note: {kpi.remarks}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* MANUAL ENTRY FORM FOR IEs (For metrics where source is not yet automated) */}
      <section className="panel no-print" style={{ padding: '16px', margin: '20px 0', border: '1px solid #cbd5e1', borderRadius: '12px', background: '#f8fafc' }}>
        <div style={{ marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
            IE Manual KPI Data Entry
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#334155' }}>
            Department / Section *
            <select
              value={formDept}
              onChange={(e) => handleDeptChange(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
            >
              {KPI_DEPARTMENTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#334155' }}>
            Particular / Metric Name *
            <select
              value={formParticular}
              onChange={(e) => handleParticularChange(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
            >
              {deptMetrics.map((m) => (
                <option key={m.particular} value={m.particular}>
                  {m.particular} ({m.unit})
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#334155' }}>
            Value
            <input
              type="number"
              step="0.01"
              placeholder="Numeric value"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#334155' }}>
            Unit
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
            >
              <option value="%">% (Percentage)</option>
              <option value="Pcs">Pcs</option>
              <option value="kg">kg</option>
              <option value="DHU">DHU</option>
              <option value="min">min (Minutes)</option>
              <option value="Tk">Tk (BDT)</option>
              <option value="Hours">Hours</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#334155' }}>
            Target (Optional)
            <input
              type="number"
              step="0.01"
              placeholder="Target value"
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#334155' }}>
            Remarks
            <input
              type="text"
              placeholder="Source or note"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
            />
          </label>

          <button
            type="button"
            className="btn btn-primary"
            onClick={saveManual}
            style={{ padding: '9px 16px', fontWeight: 800, minHeight: '38px' }}
          >
            + Save KPI Record
          </button>
        </div>
      </section>

      {/* Yearly Line Performance Table */}
      <section className="panel" style={{ padding: '14px 16px', margin: '14px 0' }}>
        <div className="panel-head">
          <div>
            <div className="panel-title">Yearly Line-wise KPI Performance</div>
            <div className="panel-sub">Aggregated from daily line production, SMV and efficiency</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {lineFilter && (
              <button className="btn btn-secondary" onClick={() => setLineFilter('')}>
                Clear Line Filter: {lineFilter} ×
              </button>
            )}
            <span className="status-pill neutral">{year} Cumulative</span>
          </div>
        </div>
        <DataGrid
          rows={filteredYearlyLines}
          columns={yearlyLineColumns}
          rowKey={(r) => r.lineCode}
          storageKey="kpi-board-yearly-lines-v1"
          exportName="kpi-board-yearly-lines"
          frozenColumns={2}
          emptyMessage="No yearly line performance records available."
        />
      </section>

      <DrillPopup
        target={drill}
        onClose={() => setDrill(null)}
        onApplyFilter={(val) => {
          setLineFilter(val);
          setDrill(null);
        }}
      />
    </Shell>
  );
}

