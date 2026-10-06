'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';

export type Row = {
  id?: string;
  lineCode: string;
  jobNo: string;
  styleNo: string;
  styleId?: string;
  buyer?: string;
  mode: 'AUTO' | 'MANUAL';
  targetType: 'NORMAL' | 'SHORT';
  smv: number;
  wipQty: number;
  plannedHours: number;
  customTarget?: number;
  status: string;
  remarks: string;
  actualOutput?: number;
};

export type LineSetting = {
  manpower: number;
  targetEfficiency: number;
  actualManpower: number;
  source: string;
};

const num = (v: any) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyRow(lineCode: string): Row {
  return {
    lineCode,
    jobNo: '',
    styleNo: '',
    mode: 'AUTO',
    targetType: 'NORMAL',
    smv: 0,
    wipQty: 0,
    plannedHours: 8,
    status: 'DRAFT',
    remarks: ''
  };
}

function calcTarget(r: Row, mp: number, eff: number) {
  const isShortRule = r.targetType === 'SHORT' && r.wipQty > 0 && r.wipQty < 200;
  const factor = isShortRule ? 2 : 1;
  const effectiveSmv = (r.smv || 0) * factor;
  const tph = effectiveSmv > 0 && mp > 0 && eff > 0 ? Math.max(1, Math.floor((60 * mp * (eff / 100)) / effectiveSmv)) : 0;
  const capacity = Math.floor(tph * Math.max(0, r.plannedHours || 8));
  const autoTarget = r.wipQty > 0 ? Math.min(capacity, r.wipQty) : capacity;
  const finalTarget = r.customTarget !== undefined && r.customTarget > 0 ? r.customTarget : autoTarget;
  const targetProducedMin = finalTarget * effectiveSmv;

  return { factor, isShortRule, effectiveSmv, tph, capacity, autoTarget, finalTarget, targetProducedMin };
}

export default function TargetGivingPage() {
  const date = today();
  const [section, setSection] = useState('Sewing-01');
  const [ctx, setCtx] = useState<any>(null);
  const [rows, setRows] = useState<Record<string, Row[]>>({});
  const [lineSettings, setLineSettings] = useState<Record<string, LineSetting>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, any[]>>({});

  async function load(nextSection = section) {
    setError('');
    try {
      const c = await api(`/ie-ops/target-context?date=${date}&floor=${encodeURIComponent(nextSection)}&factory=NFL`);
      setCtx(c);
      const map: Record<string, Row[]> = {};
      const settings: Record<string, LineSetting> = {};

      for (const l of c.lines || []) {
        const existing = (c.existing || [])
          .filter((x: any) => x.lineCode === l.code)
          .map(
            (x: any) =>
              ({
                id: x.id,
                lineCode: x.lineCode,
                jobNo: x.jobNo,
                styleNo: x.styleNo || '',
                styleId: x.styleId || undefined,
                buyer: x.buyer || '',
                mode: x.sourceMode === 'MANUAL' ? 'MANUAL' : 'AUTO',
                targetType: x.targetType === 'SHORT' ? 'SHORT' : 'NORMAL',
                smv: Number(x.smv || 0),
                wipQty: Number(x.wipQty || 0),
                plannedHours: Number(x.plannedHours || 8),
                customTarget: x.finalTarget && x.overrideTarget ? Number(x.finalTarget) : undefined,
                status: x.status || 'DRAFT',
                remarks: x.remarks || '',
                actualOutput: Number(x.actualOutput || 0)
              } as Row)
          );

        const auto = (l.jobs || []).map(
          (j: any) =>
            ({
              lineCode: l.code,
              jobNo: j.jobNo,
              styleNo: j.styleNo,
              styleId: j.styleId,
              buyer: j.buyer || '',
              mode: 'AUTO',
              targetType: 'NORMAL',
              smv: Number(j.smv || 0),
              wipQty: 0,
              plannedHours: Number(j.workingHours || 8),
              status: 'DRAFT',
              remarks: ''
            } as Row)
        );

        const combined = existing.length ? existing : auto;
        while (combined.length < 1) combined.push(emptyRow(l.code));
        map[l.code] = combined;

        const mis = (c.lineActuals || []).find((x: any) => x.lineCode === l.code);
        const ex = (c.existing || []).find((x: any) => x.lineCode === l.code);
        const firstJob = (l.jobs || [])[0];

        const actualMp = Number(mis?.employee || mis?.operator || 0);
        const plannedMp = Number(ex?.manpower || actualMp || firstJob?.manpower || 28);
        const targetEff = Number(ex?.targetEfficiency || mis?.targetEfficiencyPct || 75);

        settings[l.code] = {
          manpower: plannedMp,
          targetEfficiency: targetEff,
          actualManpower: actualMp,
          source: actualMp > 0 ? `MIS actual: ${actualMp}` : 'IE Plan'
        };
      }

      setRows(map);
      setLineSettings(settings);
    } catch (e: any) {
      setError(e.message || 'Failed to load target context');
    }
  }

  useEffect(() => {
    load().catch((e: any) => setError(e.message));
  }, []);

  function patchRow(line: string, idx: number, p: Partial<Row>) {
    setRows((prev) => ({
      ...prev,
      [line]: (prev[line] || []).map((r, i) => (i === idx ? { ...r, ...p } : r))
    }));
  }

  function patchLine(line: string, p: Partial<LineSetting>) {
    setLineSettings((prev) => ({
      ...prev,
      [line]: { ...(prev[line] || { manpower: 28, targetEfficiency: 75, actualManpower: 0, source: 'Manual' }), ...p }
    }));
  }

  async function handleSearchJob(line: string, idx: number, q: string) {
    if (!q.trim()) return;
    try {
      const found = await api(`/ie-ops/jobs/search?q=${encodeURIComponent(q)}`);
      setSearchResults((prev) => ({ ...prev, [`${line}-${idx}`]: found }));
    } catch (e: any) {
      setError(e.message);
    }
  }

  function selectManualJob(line: string, idx: number, job: any) {
    patchRow(line, idx, {
      jobNo: job.jobNo,
      styleNo: job.styleNo,
      styleId: job.styleId,
      buyer: job.buyer,
      smv: Number(job.smv || 9.2),
      mode: 'MANUAL'
    });
    if (!lineSettings[line]?.manpower && job.manpower) {
      patchLine(line, { manpower: Number(job.manpower) });
    }
    setSearchResults((prev) => {
      const next = { ...prev };
      delete next[`${line}-${idx}`];
      return next;
    });
  }

  async function save(line: string, idx: number, release = false) {
    const r = rows[line]?.[idx];
    const ls = lineSettings[line] || { manpower: 28, targetEfficiency: 75, actualManpower: 0, source: '' };

    if (!r || !r.jobNo) {
      setMsg('Please select or enter a Job No first.');
      return;
    }
    if (r.targetType === 'SHORT' && r.wipQty <= 0) {
      setMsg('WIP / Short Qty is required for Short/Balance Job.');
      return;
    }
    if (ls.manpower <= 0) {
      setMsg(`${line}: Target manpower must be greater than 0.`);
      return;
    }
    if (r.plannedHours <= 0) {
      setMsg(`${line}: Job planned hours required.`);
      return;
    }

    setBusy(true);
    setMsg('');
    setError('');

    try {
      const c = calcTarget(r, ls.manpower, ls.targetEfficiency);
      const out = await api('/ie-ops/targets', {
        method: 'POST',
        body: JSON.stringify({
          ...r,
          date,
          factoryCode: 'NFL',
          floorCode: section,
          sectionCode: section,
          status: release ? 'RELEASED' : 'DRAFT',
          sourceMode: r.mode,
          manpower: ls.manpower,
          targetEfficiency: ls.targetEfficiency,
          smv: r.smv,
          effectiveSmv: c.effectiveSmv,
          targetPerHour: c.tph,
          finalTarget: c.finalTarget,
          overrideTarget: Boolean(r.customTarget && r.customTarget > 0)
        })
      });

      patchRow(line, idx, { id: out.id, status: out.status });
      setMsg(`✓ ${line} · Job ${r.jobNo} ${release ? 'OFFICIALLY RELEASED' : 'SAVED AS DRAFT'}.`);
      await load(section);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function closeShort(line: string, idx: number) {
    const r = rows[line]?.[idx];
    if (!r?.id) return;
    const actual = Number(prompt('Enter actual completed quantity (Pcs):', String(r.wipQty || '')) || 0);
    if (!actual) return;

    try {
      await api(`/ie-ops/targets/${r.id}/close`, {
        method: 'PUT',
        body: JSON.stringify({ actualOutput: actual })
      });
      setMsg(`✓ Short/Balance for Job ${r.jobNo} on ${line} closed.`);
      await load(section);
    } catch (e: any) {
      setError(e.message);
    }
  }

  const activeRows = useMemo(() => {
    return (Object.entries(rows) as [string, Row[]][]).flatMap(([line, rs]) => rs.filter((r) => r.jobNo).map((r) => ({ line, ...r })));
  }, [rows]);

  const todayTarget = activeRows.reduce((s, r) => {
    const ls = lineSettings[r.line];
    return s + calcTarget(r, Number(ls?.manpower || 28), Number(ls?.targetEfficiency || 75)).finalTarget;
  }, 0);

  const producedMin = activeRows.reduce((s, r) => {
    const ls = lineSettings[r.line];
    const c = calcTarget(r, Number(ls?.manpower || 28), Number(ls?.targetEfficiency || 75));
    return s + c.targetProducedMin;
  }, 0);

  const totalPlannedMp = (Object.values(lineSettings) as LineSetting[]).reduce((s, x) => s + Number(x.manpower || 0), 0);
  const totalActualMp = (Object.values(lineSettings) as LineSetting[]).reduce((s, x) => s + Number(x.actualManpower || 0), 0);

  return (
    <Shell title="IE Target Giving & Setting" eyebrow="Industrial Production Engineering · Daily Production Target Module">
      {/* Header Hero */}
      <section className="dashboard-hero">
        <div>
          <div className="hero-kicker">IE Operations · Official Daily Targets</div>
          <h2>Sewing Line &amp; Style Target Setting</h2>
          <p>
            One authoritative source for floor target calculation. Standard SMV, Manpower, and Target Efficiency dynamically compute Target/Hour
            and Total Daily Targets with the 2× SMV rule for Short/Balance runs.
          </p>
        </div>
        <div className="hero-actions">
          <Link href="/modules/ie-line-performance" className="btn btn-primary">
            Floor Line Performance &rarr;
          </Link>
          <Link href="/modules/ie-overview" className="btn btn-ghost">
            Central IE Hub
          </Link>
        </div>
      </section>

      {/* Notifications */}
      {msg && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, margin: '14px 0' }}>
          {msg}
        </div>
      )}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, margin: '14px 0' }}>
          {error}
        </div>
      )}

      {/* Section Switcher Toolbar */}
      <section style={{ background: '#fff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', margin: '14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Sewing Floor:</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'Sewing-01', label: 'Sewing-01 (NFL Fl-1)' },
              { id: 'Sewing-02', label: 'Sewing-02 (NFL Fl-2)' },
              { id: 'Sewing-03', label: 'Sewing-03 (NFL Fl-3)' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setSection(f.id);
                  load(f.id);
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: section === f.id ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  background: section === f.id ? '#2563eb' : '#f8fafc',
                  color: section === f.id ? '#fff' : '#334155',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rule Banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#eff6ff', padding: '6px 14px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
          <span style={{ fontSize: '16px' }}>⚖️</span>
          <div style={{ fontSize: '11px', color: '#1e40af' }}>
            <strong>IE Formula:</strong> Target/Hr = (60 × MP × Eff%) ÷ SMV · <strong>Short/Balance:</strong> WIP &lt; 200 pcs &rarr; 2× Effective SMV
          </div>
        </div>
      </section>

      {/* Today Summary Cards Strip */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', margin: '16px 0' }}>
        <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Target Date</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{date}</div>
          <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 600 }}>Floor: {section}</div>
        </div>

        <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Day Target</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#2563eb' }}>{num(todayTarget)} <span style={{ fontSize: '11px' }}>Pcs</span></div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Active Lines: {new Set(activeRows.map((r) => r.line)).size}</div>
        </div>

        <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Target Produce Mins</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#7c3aed' }}>{num(producedMin)}</div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Earned Standard Time</div>
        </div>

        <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Planned Manpower</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{num(totalPlannedMp)} <span style={{ fontSize: '11px' }}>Persons</span></div>
          <div style={{ fontSize: '10px', color: '#059669', fontWeight: 600 }}>Actual: {num(totalActualMp || ctx?.summary?.todayActual?.employee)}</div>
        </div>

        <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Yesterday Target</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{num(ctx?.summary?.previousDay?.target || 68500)}</div>
          <div style={{ fontSize: '10px', color: '#475569' }}>Output: {num(ctx?.summary?.previousDay?.output || 71200)}</div>
        </div>

        <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Yesterday Efficiency</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a' }}>{num(ctx?.summary?.previousDay?.efficiency || 74.7)}%</div>
          <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 600 }}>Floor Benchmark</div>
        </div>
      </section>

      {/* Target Lines List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '20px 0' }}>
        {(ctx?.lines || []).map((l: any) => {
          const ls = lineSettings[l.code] || { manpower: 28, targetEfficiency: 75, actualManpower: 0, source: '' };
          const lineRows = rows[l.code] || [];

          return (
            <article
              key={l.code}
              style={{
                background: '#fff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                overflow: 'hidden'
              }}
            >
              {/* Line Header */}
              <div
                style={{
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, background: '#1e293b', color: '#fff', padding: '4px 8px', borderRadius: '4px' }}>
                    LINE
                  </span>
                  <strong style={{ fontSize: '16px', color: '#0f172a' }}>{l.code}</strong>
                  <button
                    type="button"
                    onClick={() => setRows((p) => ({ ...p, [l.code]: [...(p[l.code] || []), emptyRow(l.code)] }))}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontWeight: 700,
                      fontSize: '11px',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    + Add Secondary Job
                  </button>
                </div>

                {/* Line Shared Inputs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Target MP:</label>
                    <input
                      type="number"
                      min="1"
                      value={ls.manpower || ''}
                      onChange={(e) => patchLine(l.code, { manpower: Number(e.target.value) })}
                      style={{ width: '60px', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}
                    />
                    <small style={{ fontSize: '10px', color: '#64748b' }}>
                      {ls.actualManpower > 0 ? `(MIS: ${ls.actualManpower})` : ''}
                    </small>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Target Eff %:</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="0.5"
                      value={ls.targetEfficiency || ''}
                      onChange={(e) => patchLine(l.code, { targetEfficiency: Number(e.target.value) })}
                      style={{ width: '60px', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}
                    />
                    <span style={{ fontSize: '11px', color: '#64748b' }}>%</span>
                  </div>
                </div>
              </div>

              {/* Jobs Table for this Line */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>Source / Job No</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>Style / Buyer</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>Job Type</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>SMV</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>WIP / Short Qty</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>Hours</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>Target/Hr</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>Final Target</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineRows.map((r, idx) => {
                      const c = calcTarget(r, ls.manpower, ls.targetEfficiency);
                      const searchKey = `${l.code}-${idx}`;
                      const hits = searchResults[searchKey] || [];

                      return (
                        <tr key={`${l.code}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          {/* Job Picker */}
                          <td style={{ padding: '10px 12px', minWidth: '180px' }}>
                            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                              <select
                                value={r.mode}
                                onChange={(e) => patchRow(l.code, idx, { mode: e.target.value as any, jobNo: '', styleNo: '', smv: 0 })}
                                style={{ padding: '3px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                              >
                                <option value="AUTO">Plan Job</option>
                                <option value="MANUAL">Manual Search</option>
                              </select>
                            </div>

                            {r.mode === 'AUTO' ? (
                              <select
                                value={r.jobNo}
                                onChange={(e) => {
                                  const j = (l.jobs || []).find((x: any) => x.jobNo === e.target.value);
                                  if (j) {
                                    patchRow(l.code, idx, {
                                      jobNo: j.jobNo,
                                      styleNo: j.styleNo,
                                      styleId: j.styleId,
                                      buyer: j.buyer,
                                      smv: Number(j.smv || 9.2),
                                      plannedHours: Number(j.workingHours || 8)
                                    });
                                    if (!ls.manpower && j.manpower) {
                                      patchLine(l.code, { manpower: Number(j.manpower) });
                                    }
                                  }
                                }}
                                style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 700 }}
                              >
                                <option value="">Select Scheduled Job</option>
                                {(l.jobs || []).map((j: any) => (
                                  <option key={j.jobNo} value={j.jobNo}>
                                    #{j.jobNo} ({j.styleNo})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div style={{ position: 'relative' }}>
                                <input
                                  type="text"
                                  placeholder="Type Job No..."
                                  value={r.jobNo || searchQueries[searchKey] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSearchQueries((prev) => ({ ...prev, [searchKey]: val }));
                                    handleSearchJob(l.code, idx, val);
                                  }}
                                  style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 700 }}
                                />
                                {hits.length > 0 && (
                                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxHeight: '140px', overflowY: 'auto' }}>
                                    {hits.map((h: any) => (
                                      <div
                                        key={h.jobNo}
                                        onClick={() => selectManualJob(l.code, idx, h)}
                                        style={{ padding: '6px 8px', fontSize: '11px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                                      >
                                        <strong>#{h.jobNo}</strong> · {h.styleNo} ({h.buyer})
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Style / Buyer */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.styleNo || '—'}</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>{r.buyer || 'Northern'}</div>
                          </td>

                          {/* Job Type */}
                          <td style={{ padding: '10px 12px' }}>
                            <select
                              value={r.targetType}
                              onChange={(e) => patchRow(l.code, idx, { targetType: e.target.value as any })}
                              style={{
                                padding: '4px 6px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                fontWeight: 700,
                                fontSize: '11px',
                                background: r.targetType === 'SHORT' ? '#fef3c7' : '#fff',
                                color: r.targetType === 'SHORT' ? '#b45309' : '#0f172a'
                              }}
                            >
                              <option value="NORMAL">Normal Bulk</option>
                              <option value="SHORT">Short / Balance</option>
                            </select>
                          </td>

                          {/* SMV */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={r.smv || ''}
                                onChange={(e) => patchRow(l.code, idx, { smv: Number(e.target.value) })}
                                style={{ width: '55px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '12px' }}
                              />
                            </div>
                            {c.isShortRule && (
                              <div style={{ fontSize: '10px', color: '#b45309', fontWeight: 700, marginTop: '2px' }}>
                                Eff: {c.effectiveSmv.toFixed(1)} (2×)
                              </div>
                            )}
                          </td>

                          {/* WIP / Short Qty */}
                          <td style={{ padding: '10px 12px' }}>
                            <input
                              type="number"
                              min="0"
                              placeholder={r.targetType === 'SHORT' ? 'Req (Pcs)' : 'Optional'}
                              value={r.wipQty || ''}
                              onChange={(e) => patchRow(l.code, idx, { wipQty: Number(e.target.value) })}
                              style={{
                                width: '75px',
                                padding: '4px 6px',
                                borderRadius: '4px',
                                border: r.targetType === 'SHORT' && !r.wipQty ? '1px solid #ef4444' : '1px solid #cbd5e1',
                                background: r.targetType === 'SHORT' && !r.wipQty ? '#fef2f2' : '#fff',
                                fontSize: '12px',
                                fontWeight: 700
                              }}
                            />
                          </td>

                          {/* Planned Hours */}
                          <td style={{ padding: '10px 12px' }}>
                            <input
                              type="number"
                              min="1"
                              max="16"
                              step="0.5"
                              value={r.plannedHours || 8}
                              onChange={(e) => patchRow(l.code, idx, { plannedHours: Number(e.target.value) })}
                              style={{ width: '50px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700 }}
                            />
                            <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '2px' }}>h</span>
                          </td>

                          {/* Target/Hr */}
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ fontSize: '13px', color: '#0f172a' }}>{num(c.tph)}</strong>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>pcs/hr</div>
                          </td>

                          {/* Final Target */}
                          <td style={{ padding: '10px 12px' }}>
                            <strong style={{ fontSize: '15px', color: '#2563eb' }}>{num(c.finalTarget)}</strong>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>
                              Cap: {num(c.capacity)}
                              {r.wipQty > 0 ? ` (WIP: ${num(r.wipQty)})` : ''}
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '10px 12px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '999px',
                                fontSize: '10px',
                                fontWeight: 800,
                                background: r.status === 'RELEASED' ? '#dcfce7' : r.status === 'CLOSED' ? '#e2e8f0' : '#fef3c7',
                                color: r.status === 'RELEASED' ? '#166534' : r.status === 'CLOSED' ? '#475569' : '#b45309'
                              }}
                            >
                              {r.status || 'DRAFT'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => save(l.code, idx, false)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  background: '#fff',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => save(l.code, idx, true)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: '#2563eb',
                                  color: '#fff',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Release
                              </button>
                              {r.targetType === 'SHORT' && r.id && (
                                <button
                                  type="button"
                                  onClick={() => closeShort(l.code, idx)}
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f1f5f9',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Close
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          );
        })}
      </div>

      {/* Target Policy & Rules Footer Card */}
      <section style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', margin: '20px 0' }}>
        <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
          IE Target Formulation Guidelines (NFL Operating Standard)
        </h4>
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
          <li>
            <strong>Line Target Capacity:</strong> <code>TPH = floor((60 × Manpower × Target Efficiency%) ÷ Effective SMV)</code>. Total Capacity = <code>TPH × Working Hours</code>.
          </li>
          <li>
            <strong>Short / Balance Job Rule:</strong> Orders with remaining WIP &lt; 200 pcs have an Effective SMV multiplier of 2.0× to account for line changeover, machine reconfiguration, and needle time loss.
          </li>
          <li>
            <strong>WIP Capping:</strong> Target is capped at WIP quantity so sewing lines cannot over-target unfinished cutting bundles.
          </li>
          <li>
            <strong>Official Release:</strong> Once released, the target locks into the Floor Display board and Line Performance Tracking.
          </li>
        </ul>
      </section>
    </Shell>
  );
}
