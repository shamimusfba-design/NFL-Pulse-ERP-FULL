'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import factoryKpiMasterRaw from '../data/factory-kpi-master.json';

export function FactoryKpiPhysicalBoard() {
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('aug');

  const monthlyReport = (factoryKpiMasterRaw as any)?.monthlyReport || {};
  const lostReasons = (factoryKpiMasterRaw as any)?.knittingLostTimeReasons || [];

  // Monthly months
  const months = [
    { key: 'jan', label: 'Jan' },
    { key: 'feb', label: 'Feb' },
    { key: 'mar', label: 'Mar' },
    { key: 'apr', label: 'Apr' },
    { key: 'may', label: 'May' },
    { key: 'jun', label: 'Jun' },
    { key: 'jul', label: 'Jul' },
    { key: 'aug', label: 'Aug' }
  ];

  // Trend data for Line Chart (Jan - Aug)
  const sewingEffTrend = months.map(m => ({
    label: m.label,
    value: Number((monthlyReport.sewing?.find((p: any) => p.particular.includes('Efficiency')) as any)?.[m.key] || 70)
  }));

  const dyeingRftTrend = months.map(m => ({
    label: m.label,
    value: Number((monthlyReport.dyeing?.find((p: any) => p.particular.includes('Right First Time')) as any)?.[m.key] || 68)
  }));

  const qualityDhuTrend = months.map(m => ({
    label: m.label,
    value: Number((monthlyReport.quality?.find((p: any) => p.particular.includes('In-Line DHU')) as any)?.[m.key] || 9.5)
  }));

  // Column chart data: Section volume (scaled)
  const sectionOutputs = [
    { section: 'Knitting', value: 206, unit: 'Ton', target: 220, source: 'Auto-pulled: Knitting M/C Program' },
    { section: 'Dyeing', value: 293, unit: 'Ton', target: 310, source: 'Auto-pulled: Dyeing Batch Logs' },
    { section: 'Cutting', value: 1427, unit: 'k Pcs', target: 1500, source: 'Auto-pulled: CAD & Spreading' },
    { section: 'Sewing', value: 1478, unit: 'k Pcs', target: 1550, source: 'Auto-pulled: Line End Audit' },
    { section: 'Printing', value: 827, unit: 'k Pcs', target: 850, source: 'Auto-pulled: Screen Print Store' },
    { section: 'Finishing', value: 1450, unit: 'k Pcs', target: 1520, source: 'Auto-pulled: Carton Packing' }
  ];

  const maxVal = Math.max(...sectionOutputs.map(s => Math.max(s.value, s.target)));

  type ChartSegment = { label: string; value: number; color: string };

  // Donut chart segments (Factory Departmental Load Distribution)
  const donutSegments: ChartSegment[] = [
    { label: 'Sewing Output', value: 45, color: '#2563eb' },
    { label: 'Cutting Floor', value: 25, color: '#0ea5e9' },
    { label: 'Dyeing Fabric', value: 18, color: '#8b5cf6' },
    { label: 'Screen Print', value: 12, color: '#f59e0b' }
  ];

  // Pie chart segments (Knitting Lost Time Pareto Breakdown)
  const pieSegments: ChartSegment[] = lostReasons.slice(0, 5).map((r: any, idx: number) => {
    const colors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6'];
    return {
      label: r.reason,
      value: Number(r.percentage || 0),
      color: colors[idx % colors.length]
    };
  });

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
            <span style={{ fontSize: '18px' }}>📋</span>
            <strong style={{ fontSize: '16px', letterSpacing: '0.02em' }}>Factory Central KPI Physical Board</strong>
            <span style={{ fontSize: '10px', background: '#22c55e', color: '#000', padding: '2px 7px', borderRadius: '12px', fontWeight: 800 }}>
              AUTO-PULLED LIVE
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Central factory display data aggregated from Knitting, Dyeing, Cutting, Sewing, Printing and Quality.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1' }}>
            <span>Month:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              style={{ background: '#334155', color: '#fff', border: '1px solid #475569', borderRadius: '6px', padding: '4px 8px', fontSize: '11px' }}
            >
              {months.map(m => (
                <option key={m.key} value={m.key}>{m.label} 2026</option>
              ))}
            </select>
          </div>
          <Link
            href="/modules/kpi-board"
            className="btn btn-primary"
            style={{ fontSize: '11px', padding: '6px 12px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 700 }}
          >
            IE KPI Data Entry Form →
          </Link>
        </div>
      </div>

      {/* SECTION AUTO-PULL STATUS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        {/* Knitting */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Knitting</span>
            <span style={{ fontSize: '9px', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '8px', fontWeight: 700 }}>Auto-Pulled</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>223,647 kg</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            <span>Efficiency: <b>41.0%</b></span>
            <span>OTD: <b>75.0%</b></span>
          </div>
          <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px' }}>Source: Circular & Flat Knitting Store</div>
        </div>

        {/* Dyeing */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Dyeing</span>
            <span style={{ fontSize: '9px', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '8px', fontWeight: 700 }}>Auto-Pulled</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>292,001 kg</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            <span>R.F.T: <b style={{ color: '#16a34a' }}>68.3%</b></span>
            <span>Avg Load: <b>67.0%</b></span>
          </div>
          <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px' }}>Source: Dyeing Batch Log & Lab</div>
        </div>

        {/* Cutting */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Cutting</span>
            <span style={{ fontSize: '9px', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '8px', fontWeight: 700 }}>Auto-Pulled</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>1,335,210 pcs</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            <span>Efficiency: <b>82.2%</b></span>
            <span>Wastage: <b>2.49%</b></span>
          </div>
          <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px' }}>Source: Auto Spreading & CAD Plotted</div>
        </div>

        {/* Sewing */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Sewing</span>
            <span style={{ fontSize: '9px', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '8px', fontWeight: 700 }}>Auto-Pulled</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>1,173,904 pcs</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            <span>Efficiency: <b style={{ color: '#16a34a' }}>74.7%</b></span>
            <span>Avg SMV: <b>9.85m</b></span>
          </div>
          <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px' }}>Source: Line Production & Hourly Track</div>
        </div>

        {/* Quality */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Quality</span>
            <span style={{ fontSize: '9px', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '8px', fontWeight: 700 }}>Auto-Pulled</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>In-Line: 9.12 DHU</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            <span>End-Line: <b>3.41</b></span>
            <span>Final: <b>6.63</b></span>
          </div>
          <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px' }}>Source: QA Audit & Inspection App</div>
        </div>

        {/* HR & Kaizen */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>HR & Kaizen</span>
            <span style={{ fontSize: '9px', background: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: '8px', fontWeight: 700 }}>IE Entry</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', marginTop: '4px' }}>59 Kaizens Sustained</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            <span>Attendance: <b>93.8%</b></span>
            <span>Happiness: <b>74.2%</b></span>
          </div>
          <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px' }}>Source: Biometric Punch & HR/IE Desk</div>
        </div>
      </div>

      {/* CHARTS ROW 1: Column Chart (Section Output vs Target) & Line Chart (Efficiency & RFT Trends) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px' }}>
        {/* COLUMN CHART: Target vs Actual Output by Section */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Department Output vs Target (Column Chart)</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Actual volume achieved vs budgeted floor capacity</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: '#475569' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><span style={{ width: 8, height: 8, background: '#cbd5e1', borderRadius: 2 }}></span> Target</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><span style={{ width: 8, height: 8, background: '#2563eb', borderRadius: 2 }}></span> Actual</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '10px', height: '160px', padding: '10px 0 24px', borderBottom: '1px solid #e2e8f0' }}>
            {sectionOutputs.map(s => {
              const targetH = Math.max(12, Math.round((s.target / maxVal) * 120));
              const actualH = Math.max(12, Math.round((s.value / maxVal) * 120));
              const pct = Math.round((s.value / s.target) * 100);

              return (
                <div key={s.section} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }} title={`${s.section}: Actual ${s.value} ${s.unit} / Target ${s.target} ${s.unit} (${pct}%)`}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
                    <div style={{ width: '14px', height: `${targetH}px`, background: '#cbd5e1', borderRadius: '3px 3px 0 0' }}></div>
                    <div style={{ width: '14px', height: `${actualH}px`, background: pct >= 100 ? '#16a34a' : '#2563eb', borderRadius: '3px 3px 0 0' }}></div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#1e293b', marginTop: '6px' }}>{s.section}</span>
                  <span style={{ fontSize: '9px', color: pct >= 100 ? '#16a34a' : '#d97706', fontWeight: 700 }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* LINE CHART: Monthly Efficiency & Quality Trends */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Monthly Efficiency & RFT Performance (Line Chart)</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Jan – Aug 2026 performance trends across factory</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: '#475569' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><span style={{ width: 8, height: 8, background: '#2563eb', borderRadius: 2 }}></span> Sewing Eff %</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><span style={{ width: 8, height: 8, background: '#10b981', borderRadius: 2 }}></span> Dyeing RFT %</span>
            </div>
          </div>

          {/* SVG Line representation */}
          <div style={{ height: '160px', width: '100%', position: 'relative' }}>
            <svg viewBox="0 0 320 120" style={{ width: '100%', height: '120px', overflow: 'visible' }}>
              <line x1="0" y1="20" x2="320" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="60" x2="320" y2="60" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="100" x2="320" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

              {/* Sewing Eff Line */}
              <polyline
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                points={sewingEffTrend.map((pt, i) => `${(i / (sewingEffTrend.length - 1)) * 320},${120 - ((pt.value - 60) / 20) * 100}`).join(' ')}
              />
              {sewingEffTrend.map((pt, i) => {
                const cx = (i / (sewingEffTrend.length - 1)) * 320;
                const cy = 120 - ((pt.value - 60) / 20) * 100;
                return (
                  <circle key={`sew-${i}`} cx={cx} cy={cy} r="3" fill="#2563eb">
                    <title>{`Sewing Eff ${pt.label}: ${pt.value}%`}</title>
                  </circle>
                );
              })}

              {/* Dyeing RFT Line */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="4 2"
                points={dyeingRftTrend.map((pt, i) => `${(i / (dyeingRftTrend.length - 1)) * 320},${120 - ((pt.value - 55) / 30) * 100}`).join(' ')}
              />
              {dyeingRftTrend.map((pt, i) => {
                const cx = (i / (dyeingRftTrend.length - 1)) * 320;
                const cy = 120 - ((pt.value - 55) / 30) * 100;
                return (
                  <circle key={`dye-${i}`} cx={cx} cy={cy} r="2.5" fill="#10b981">
                    <title>{`Dyeing RFT ${pt.label}: ${pt.value}%`}</title>
                  </circle>
                );
              })}
            </svg>

            {/* X-axis labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', marginTop: '6px' }}>
              {months.map(m => (
                <span key={m.key}>{m.label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS ROW 2: Donut Chart (Section Output Distribution) & Pie Chart (Lost Time Pareto) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px' }}>
        {/* DONUT CHART: Section Output / Production Share */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Factory Output Share (Donut Chart)</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>Relative volume contribution by department</div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '12px' }}>
            {/* SVG Donut */}
            <div style={{ position: 'relative', width: 120, height: 120 }}>
              <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="60" cy="60" r="45" fill="none" stroke="#f1f5f9" strokeWidth="18" />
                {(() => {
                  let accumulated = 0;
                  const c = 2 * Math.PI * 45;
                  return donutSegments.map((seg, idx) => {
                    const strokeDasharray = `${(seg.value / 100) * c} ${c}`;
                    const strokeDashoffset = -accumulated * c;
                    accumulated += seg.value / 100;
                    return (
                      <circle
                        key={idx}
                        cx="60"
                        cy="60"
                        r="45"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="18"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                      />
                    );
                  });
                })()}
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>100%</span>
                <span style={{ fontSize: '8px', color: '#64748b' }}>Operations</span>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {donutSegments.map((seg, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                  <span style={{ width: 8, height: 8, background: seg.color, borderRadius: '50%' }}></span>
                  <span style={{ color: '#475569', minWidth: '95px' }}>{seg.label}</span>
                  <strong style={{ color: '#1e293b' }}>{seg.value}%</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PIE CHART: Knitting & Machine Lost Time Pareto */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Machine Lost Time Pareto (Pie Chart)</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>Top root causes for non-productive time in Knitting/Sewing</div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '12px' }}>
            {/* SVG Pie Chart */}
            <div style={{ position: 'relative', width: 120, height: 120 }}>
              <svg width="120" height="120" viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }}>
                {(() => {
                  let cumulativePercent = 0;
                  const total = pieSegments.reduce((s: number, p: ChartSegment) => s + p.value, 0);

                  return pieSegments.map((slice: ChartSegment, i: number) => {
                    const startPercent = cumulativePercent;
                    cumulativePercent += slice.value / total;
                    const endPercent = cumulativePercent;

                    const [startX, startY] = [Math.cos(2 * Math.PI * startPercent), Math.sin(2 * Math.PI * startPercent)];
                    const [endX, endY] = [Math.cos(2 * Math.PI * endPercent), Math.sin(2 * Math.PI * endPercent)];
                    const largeArcFlag = slice.value / total > 0.5 ? 1 : 0;
                    const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

                    return <path key={i} d={pathData} fill={slice.color} />;
                  });
                })()}
              </svg>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {pieSegments.map((seg: ChartSegment, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                  <span style={{ width: 8, height: 8, background: seg.color, borderRadius: '50%' }}></span>
                  <span style={{ color: '#475569', minWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={seg.label}>
                    {seg.label}
                  </span>
                  <strong style={{ color: '#1e293b' }}>{seg.value}%</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
