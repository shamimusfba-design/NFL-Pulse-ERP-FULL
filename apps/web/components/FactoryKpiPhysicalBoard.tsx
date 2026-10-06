'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import factoryKpiMasterRaw from '../data/factory-kpi-master.json';
import { KPI_DEPARTMENTS, KPI_METRICS_BY_DEPARTMENT, MONTH_OPTIONS, KpiMetricDefinition } from '../lib/factoryKpiMaster';
import { api } from '../lib/api';

const num = (v: any, decimals = 2) => {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
};

export function FactoryKpiPhysicalBoard() {
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('aug');
  const [showEntryModal, setShowEntryModal] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  // Master KPI items
  const initialKpis = (factoryKpiMasterRaw as any)?.kpiTracker2026 || [];
  const skillUpgradation = (factoryKpiMasterRaw as any)?.skillUpgradation || [];
  const knittingLostReasons = (factoryKpiMasterRaw as any)?.knittingLostTimeReasons || [];
  const reportDate = (factoryKpiMasterRaw as any)?.reportDate || '05.09.2026';

  const [kpiList, setKpiList] = useState<any[]>(initialKpis);

  // Data entry form state with category dropdowns
  const [entryDept, setEntryDept] = useState<string>('Production');
  const currentDeptMetrics = useMemo(() => KPI_METRICS_BY_DEPARTMENT[entryDept] || [], [entryDept]);
  const [entryParticular, setEntryParticular] = useState<string>(currentDeptMetrics[0]?.particular || 'Factory Sewing Efficiency (%)');
  const [entryMonth, setEntryMonth] = useState<string>('aug');
  const [entryValue, setEntryValue] = useState<string>('');
  const [entryTarget, setEntryTarget] = useState<string>('');
  const [entryRemarks, setEntryRemarks] = useState<string>('');

  // When dept changes, reset particular to first option
  function handleDeptChange(dept: string) {
    setEntryDept(dept);
    const metrics = KPI_METRICS_BY_DEPARTMENT[dept] || [];
    if (metrics.length > 0) {
      setEntryParticular(metrics[0].particular);
      setEntryTarget(metrics[0].defaultTarget ? String(metrics[0].defaultTarget) : '');
    }
  }

  // Find metric definition
  const currentMetricDef: KpiMetricDefinition | undefined = useMemo(() => {
    return currentDeptMetrics.find((m) => m.particular === entryParticular);
  }, [currentDeptMetrics, entryParticular]);

  // Handle manual KPI submission
  async function handleSaveKpi(e: React.FormEvent) {
    e.preventDefault();
    if (!entryParticular || entryValue === '') {
      setErrorMsg('Please select a KPI metric and enter a valid value.');
      return;
    }

    setBusy(true);
    setErrorMsg('');
    setFeedbackMsg('');

    const valNum = Number(entryValue);
    const targetNum = entryTarget ? Number(entryTarget) : undefined;
    const unit = currentMetricDef?.unit || '%';
    const monthObj = MONTH_OPTIONS.find((m) => m.key === entryMonth) || MONTH_OPTIONS[7];

    try {
      await api('/ie-ops/kpi/manual', {
        method: 'POST',
        body: JSON.stringify({
          section: entryDept,
          particular: entryParticular,
          kpiName: entryParticular,
          month: monthObj.monthNum,
          year: 2026,
          value: valNum,
          unit,
          target: targetNum,
          remarks: entryRemarks
        })
      });

      // Update local state in table
      setKpiList((prev) => {
        const next = [...prev];
        const idx = next.findIndex((item) => item.department === entryDept && item.particular === entryParticular);
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            [entryMonth]: valNum
          };
        } else {
          next.push({
            department: entryDept,
            particular: entryParticular,
            unit,
            avg2025: null,
            [entryMonth]: valNum,
            average: valNum
          });
        }
        return next;
      });

      setFeedbackMsg(`✓ Successfully recorded KPI: ${entryDept} · ${entryParticular} = ${valNum} ${unit} for ${monthObj.label}!`);
      setShowEntryModal(false);
      setEntryValue('');
      setEntryRemarks('');
      setTimeout(() => setFeedbackMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save KPI entry.');
    } finally {
      setBusy(false);
    }
  }

  // Filtered rows for the table
  const filteredKpis = useMemo(() => {
    if (selectedSection === 'ALL') return kpiList;
    return kpiList.filter((k) => k.department.toLowerCase() === selectedSection.toLowerCase());
  }, [kpiList, selectedSection]);

  // Visual chart trends (Jan - Aug 2026)
  const months = MONTH_OPTIONS.slice(0, 8);

  const sewingEffTrend = months.map((m) => ({
    label: m.label.split('-')[0],
    value: Number(kpiList.find((k) => k.particular === 'Factory Sewing Efficiency (%)')?.[m.key] || 70)
  }));

  const printingEffTrend = months.map((m) => ({
    label: m.label.split('-')[0],
    value: Number(kpiList.find((k) => k.department === 'Printing' && k.particular === 'Efficiency')?.[m.key] || 91)
  }));

  const dyeingRftTrend = months.map((m) => ({
    label: m.label.split('-')[0],
    value: Number(kpiList.find((k) => k.particular.includes('Right First Time'))?.[m.key] || 68)
  }));

  const inLineDhuTrend = months.map((m) => ({
    label: m.label.split('-')[0],
    value: Number(kpiList.find((k) => k.particular === 'In Line DHU (Internal)')?.[m.key] || 9.5)
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Physical Board Banner with Direct IE Sub-Group Entry Link */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          color: '#fff',
          borderRadius: '12px',
          padding: '16px 20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📋</span>
            <strong style={{ fontSize: '17px', letterSpacing: '0.02em' }}>Northern Fashion Ltd. · Central KPI Tracker - 2026</strong>
            <span style={{ fontSize: '10px', background: '#22c55e', color: '#000', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
              OFFICIAL REPORT DATE: {reportDate}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Central factory performance board aggregated across HR, Production, Cutting, Quality, Printing, Knitting, Dyeing, Sample &amp; Kaizen.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowEntryModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>✍️</span> Enter / Update KPI (Dropdowns)
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #475569',
              background: '#1e293b',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🖨️ Print Board
          </button>
          <Link
            href="/modules/kpi-board"
            style={{
              fontSize: '12px',
              color: '#60a5fa',
              textDecoration: 'underline',
              fontWeight: 700,
              marginLeft: '4px'
            }}
          >
            Detailed Entry Module &rarr;
          </Link>
        </div>
      </div>

      {feedbackMsg && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}>
          {feedbackMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}>
          {errorMsg}
        </div>
      )}

      {/* MODAL: CATEGORY DROPDOWN KPI DATA ENTRY */}
      {showEntryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '560px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Enter KPI Record (Dropdown Selection)
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Select Department &amp; Key Particular from official factory list
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowEntryModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveKpi} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* DROPDOWN 1: DEPARTMENT / SECTION */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  1. Department / Section (Key Category) *
                </label>
                <select
                  value={entryDept}
                  onChange={(e) => handleDeptChange(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, background: '#f8fafc' }}
                >
                  {KPI_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* DROPDOWN 2: PARTICULAR / KEY METRIC */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  2. Particular / Metric Name *
                </label>
                <select
                  value={entryParticular}
                  onChange={(e) => {
                    setEntryParticular(e.target.value);
                    const def = currentDeptMetrics.find((m) => m.particular === e.target.value);
                    if (def?.defaultTarget) setEntryTarget(String(def.defaultTarget));
                  }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, background: '#fff' }}
                >
                  {currentDeptMetrics.map((m) => (
                    <option key={m.particular} value={m.particular}>
                      {m.particular} ({m.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* DROPDOWN 3: MONTH SELECTION */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    3. Report Month *
                  </label>
                  <select
                    value={entryMonth}
                    onChange={(e) => setEntryMonth(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700 }}
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* VALUE INPUT WITH AUTO-DETECTED UNIT */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    4. Value ({currentMetricDef?.unit || '%'}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`e.g. ${currentMetricDef?.unit === '%' ? '75.5' : '1500000'}`}
                    value={entryValue}
                    onChange={(e) => setEntryValue(e.target.value)}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Target / Benchmark (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Optional target"
                    value={entryTarget}
                    onChange={(e) => setEntryTarget(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Remarks / Source
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Audited by IE Floor"
                    value={entryRemarks}
                    onChange={(e) => setEntryRemarks(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  style={{ padding: '9px 20px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                >
                  {busy ? 'Saving...' : 'Save & Update Master'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXECUTIVE TREND VISUALIZATIONS & CHARTS (Top Section for Fast Decision-Making) */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        {/* Trend 1: Factory Sewing Efficiency (Jan - Aug 2026) */}
        <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Factory Sewing Efficiency (%)</span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb' }}>Avg: 70.36%</span>
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '12px' }}>
            Monthly Trend (Jan &rarr; Aug 2026) · Peak: 75.7% (Feb), Aug: 74.7%
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '110px', paddingTop: '10px' }}>
            {sewingEffTrend.map((pt) => {
              const heightPct = Math.min(100, Math.max(10, ((pt.value - 60) / 20) * 100));
              return (
                <div key={pt.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#334155', marginBottom: '2px' }}>{pt.value}%</span>
                  <div style={{ width: '100%', height: `${heightPct}%`, background: pt.value >= 72 ? '#2563eb' : '#60a5fa', borderRadius: '4px 4px 0 0' }} />
                  <span style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>{pt.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trend 2: Printing Efficiency & RFT Quality */}
        <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Printing Efficiency vs Dyeing RFT %</span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a' }}>Print Avg: 91.7%</span>
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '12px' }}>
            Print Eff (Green Bars) vs Dyeing Right First Time (Purple Indicator)
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '110px', paddingTop: '10px' }}>
            {printingEffTrend.map((pt, idx) => {
              const rftVal = dyeingRftTrend[idx]?.value || 68;
              const heightPct = Math.min(100, Math.max(10, ((pt.value - 75) / 25) * 100));
              return (
                <div key={pt.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#15803d', marginBottom: '2px' }}>{pt.value}%</span>
                  <div style={{ width: '100%', height: `${heightPct}%`, background: '#10b981', borderRadius: '4px 4px 0 0', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%)', width: '5px', height: '5px', borderRadius: '50%', background: '#8b5cf6' }} title={`Dyeing RFT: ${rftVal}%`} />
                  </div>
                  <span style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>{pt.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trend 3: Quality In-Line DHU (Lower is Better) */}
        <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>In-Line DHU (Internal Quality)</span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#d97706' }}>Avg: 9.46 DHU</span>
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '12px' }}>
            Defects Hundred Units · Best: 6.38 (Jul) · 2025 Benchmark: 10.86
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '110px', paddingTop: '10px' }}>
            {inLineDhuTrend.map((pt) => {
              const heightPct = Math.min(100, Math.max(15, (pt.value / 14) * 100));
              const isGood = pt.value < 8.0;
              return (
                <div key={pt.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: isGood ? '#166534' : '#b45309', marginBottom: '2px' }}>{pt.value}</span>
                  <div style={{ width: '100%', height: `${heightPct}%`, background: isGood ? '#86efac' : '#f59e0b', borderRadius: '4px 4px 0 0' }} />
                  <span style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>{pt.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pareto: Knitting Reason-Wise Lost Time Breakdown */}
        <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Knitting Lost Time Pareto (%)</span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444' }}>Capturing: 81%</span>
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '8px' }}>
            Top Loss Causes from Factory M/C Monitoring
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {knittingLostReasons.slice(0, 4).map((r: any) => (
              <div key={r.reason}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '2px' }}>
                  <span>{r.reason}</span>
                  <span style={{ color: '#ef4444' }}>{r.percentage}%</span>
                </div>
                <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, r.percentage * 2.5)}%`, background: '#ef4444', borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FILTER CONTROLS BAR */}
      <section style={{ background: '#fff', padding: '12px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        {/* Month Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Focus Month:</span>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {MONTH_OPTIONS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setSelectedMonth(m.key)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: selectedMonth === m.key ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  background: selectedMonth === m.key ? '#2563eb' : '#f8fafc',
                  color: selectedMonth === m.key ? '#fff' : '#334155',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {m.label.split('-')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Department Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSelectedSection('ALL')}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              border: selectedSection === 'ALL' ? '1px solid #2563eb' : '1px solid #cbd5e1',
              background: selectedSection === 'ALL' ? '#eff6ff' : '#fff',
              color: selectedSection === 'ALL' ? '#1e40af' : '#475569',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            All Sections ({kpiList.length})
          </button>
          {['Production', 'Cutting', 'Quality', 'Printing', 'Knitting', 'Dyeing', 'Sample - Garment', 'HR'].map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setSelectedSection(sec)}
              style={{
                padding: '5px 10px',
                borderRadius: '20px',
                border: selectedSection === sec ? '1px solid #2563eb' : '1px solid #cbd5e1',
                background: selectedSection === sec ? '#eff6ff' : '#fff',
                color: selectedSection === sec ? '#1e40af' : '#475569',
                fontSize: '11px',
                fontWeight: selectedSection === sec ? 800 : 600,
                cursor: 'pointer'
              }}
            >
              {sec}
            </button>
          ))}
        </div>
      </section>

      {/* COMPLETE RUNNING 2026 FACTORY KPI DATA TABLE */}
      <section style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>Key Performance Indicator (KPI) Tracker Table</strong>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Showing {filteredKpis.length} factory metrics · Focus column: <strong>{selectedMonth.toUpperCase()}-26</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowEntryModal(true)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
          >
            + Update Metric
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155', textAlign: 'right' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800 }}>Department</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800 }}>Particular / Metric</th>
                <th style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700 }}>Unit</th>
                <th style={{ padding: '10px 10px', fontWeight: 700, color: '#64748b' }}>Avg-2025</th>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map((m) => (
                  <th
                    key={m}
                    style={{
                      padding: '10px 10px',
                      fontWeight: 800,
                      background: selectedMonth === m.toLowerCase() ? '#dbeafe' : 'transparent',
                      color: selectedMonth === m.toLowerCase() ? '#1d4ed8' : '#334155'
                    }}
                  >
                    {m}-26
                  </th>
                ))}
                <th style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a', background: '#e2e8f0' }}>2026 Avg</th>
              </tr>
            </thead>
            <tbody>
              {filteredKpis.map((row, idx) => {
                const isRate = row.unit === '%';
                const currentMonthVal = row[selectedMonth];

                return (
                  <tr
                    key={`${row.department}-${row.particular}-${idx}`}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: idx % 2 === 0 ? '#fff' : '#fafafa'
                    }}
                  >
                    <td style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#1e293b' }}>
                      <span style={{ fontSize: '11px', background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px' }}>
                        {row.department}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#0f172a' }}>
                      {row.particular}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'center', color: '#64748b', fontSize: '11px' }}>
                      {row.unit || '—'}
                    </td>
                    <td style={{ padding: '10px 10px', color: '#64748b' }}>
                      {row.avg2025 !== null && row.avg2025 !== undefined ? `${num(row.avg2025)}${isRate ? '%' : ''}` : '—'}
                    </td>
                    {['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug'].map((mKey) => {
                      const val = row[mKey];
                      const isSelected = selectedMonth === mKey;
                      return (
                        <td
                          key={mKey}
                          style={{
                            padding: '10px 10px',
                            fontWeight: isSelected ? 800 : 500,
                            background: isSelected ? '#eff6ff' : 'transparent',
                            color: isSelected ? '#1d4ed8' : '#1e293b'
                          }}
                        >
                          {val !== null && val !== undefined ? `${num(val)}${isRate ? '%' : ''}` : '—'}
                        </td>
                      );
                    })}
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a', background: '#f1f5f9' }}>
                      {row.average !== null && row.average !== undefined ? `${num(row.average)}${isRate ? '%' : ''}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* SKILL UPGRADATION & PRE-PRODUCTION SUMMARY STRIP */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
        {/* Operator Skill Distribution */}
        <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Operator Skill Upgradation (1,106 Operators)</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Grade A+ to D</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {skillUpgradation.map((sk: any) => (
              <div key={sk.grade}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '2px' }}>
                  <span>Grade {sk.grade}</span>
                  <span>
                    <strong>{sk.person} Persons</strong> ({sk.percentage}%)
                  </span>
                </div>
                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, sk.percentage * 1.8)}%`,
                      background: sk.grade === 'A+' ? '#10b981' : sk.grade === 'A' ? '#3b82f6' : sk.grade === 'B' ? '#6366f1' : sk.grade === 'C' ? '#f59e0b' : '#94a3b8',
                      borderRadius: '3px'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pre-Production File Handover Feedback */}
        <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Pre-Production File Handover Satisfaction</span>
            <span style={{ fontSize: '11px', color: '#166534', fontWeight: 700 }}>56.32% Delighted</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Delighted (Exceeds expectations)', pct: 56.32, color: '#16a34a' },
              { label: 'Satisfied (On-time complete files)', pct: 20.11, color: '#2563eb' },
              { label: 'Not Satisfied (Pending trims/corrections)', pct: 24.0, color: '#ef4444' }
            ].map((st) => (
              <div key={st.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '2px' }}>
                  <span>{st.label}</span>
                  <span style={{ color: st.color }}>{st.pct}%</span>
                </div>
                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${st.pct}%`, background: st.color, borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '11px', color: '#64748b' }}>
            Zero-Defect Recognition: <strong>42 Operators</strong> and <strong>6 Quality Inspectors</strong> awarded in 2026.
          </div>
        </div>
      </section>
    </div>
  );
}
