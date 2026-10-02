'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ExecutionRow {
  buyer: string;
  jobNo: string;
  styleNo?: string;
  colour: string;
  fabricDescription?: string;
  reqBody: number;
  reqLRib: number;
  reqSJersey: number;
  totalRequire: number;
  greyBodyRcvd?: number;
  greyLRibRcvd?: number;
  greySJerseyRcvd?: number;
  dyeingBody?: number;
  dyeingLRib?: number;
  dyeingSJersey?: number;
}

interface Props {
  executionRows: ExecutionRow[];
}

const COMPONENT_COLORS = {
  body: '#2563eb',     // Royal Blue
  rib: '#f59e0b',      // Amber
  sjersey: '#10b981',  // Emerald Green
  total: '#6366f1'     // Indigo
};

const PIE_COLORS = ['#2563eb', '#f59e0b', '#10b981'];

export default function FabricComponentUsageChart({ executionRows }: Props) {
  const [mounted, setMounted] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState('ALL');
  const [chartMode, setChartMode] = useState<'stacked' | 'grouped'>('stacked');
  const [metricView, setMetricView] = useState<'required' | 'execution'>('required');
  const [topCount, setTopCount] = useState<number>(10);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Distinct buyers
  const buyers = useMemo(() => {
    const set = new Set<string>();
    executionRows.forEach(r => {
      if (r.buyer) set.add(r.buyer);
    });
    return Array.from(set).sort();
  }, [executionRows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return executionRows.filter(r => {
      if (selectedBuyer !== 'ALL' && r.buyer !== selectedBuyer) return false;
      return true;
    });
  }, [executionRows, selectedBuyer]);

  // Aggregate stats
  const totals = useMemo(() => {
    let bodyReq = 0;
    let ribReq = 0;
    let sjerseyReq = 0;
    let bodyDye = 0;
    let ribDye = 0;
    let sjerseyDye = 0;

    filteredRows.forEach(r => {
      bodyReq += r.reqBody || 0;
      ribReq += r.reqLRib || 0;
      sjerseyReq += r.reqSJersey || 0;
      bodyDye += r.dyeingBody || 0;
      ribDye += r.dyeingLRib || 0;
      sjerseyDye += r.dyeingSJersey || 0;
    });

    const totalReq = bodyReq + ribReq + sjerseyReq;
    const bodyPct = totalReq > 0 ? ((bodyReq / totalReq) * 100).toFixed(1) : '0';
    const ribPct = totalReq > 0 ? ((ribReq / totalReq) * 100).toFixed(1) : '0';
    const sjerseyPct = totalReq > 0 ? ((sjerseyReq / totalReq) * 100).toFixed(1) : '0';

    return {
      bodyReq,
      ribReq,
      sjerseyReq,
      totalReq,
      bodyPct,
      ribPct,
      sjerseyPct,
      bodyDye,
      ribDye,
      sjerseyDye,
      ratio: ribReq > 0 ? (bodyReq / ribReq).toFixed(1) : 'N/A'
    };
  }, [filteredRows]);

  // Bar chart dataset: Grouped by Job No
  const barChartData = useMemo(() => {
    // Consolidate by Job No if a job has multiple colors
    const map = new Map<string, {
      jobNo: string;
      buyer: string;
      label: string;
      bodyReq: number;
      ribReq: number;
      sjerseyReq: number;
      bodyDye: number;
      ribDye: number;
      sjerseyDye: number;
      totalReq: number;
    }>();

    filteredRows.forEach(r => {
      const key = r.jobNo || 'Unknown';
      if (!map.has(key)) {
        map.set(key, {
          jobNo: key,
          buyer: r.buyer,
          label: `Job ${key}`,
          bodyReq: 0,
          ribReq: 0,
          sjerseyReq: 0,
          bodyDye: 0,
          ribDye: 0,
          sjerseyDye: 0,
          totalReq: 0
        });
      }
      const item = map.get(key)!;
      item.bodyReq += r.reqBody || 0;
      item.ribReq += r.reqLRib || 0;
      item.sjerseyReq += r.reqSJersey || 0;
      item.bodyDye += r.dyeingBody || 0;
      item.ribDye += r.dyeingLRib || 0;
      item.sjerseyDye += r.dyeingSJersey || 0;
      item.totalReq += r.totalRequire || ((r.reqBody || 0) + (r.reqLRib || 0) + (r.reqSJersey || 0));
    });

    const arr = Array.from(map.values());
    // Sort descending by total requirement
    arr.sort((a, b) => b.totalReq - a.totalReq);
    return arr.slice(0, topCount);
  }, [filteredRows, topCount]);

  // Donut chart dataset
  const pieChartData = useMemo(() => {
    return [
      { name: 'Body Fabric', value: totals.bodyReq, pct: totals.bodyPct, color: COMPONENT_COLORS.body },
      { name: 'L Rib (1x1 / 2x2 / Lurex)', value: totals.ribReq, pct: totals.ribPct, color: COMPONENT_COLORS.rib },
      { name: 'S.Jersey (Neckband / Binding)', value: totals.sjerseyReq, pct: totals.sjerseyPct, color: COMPONENT_COLORS.sjersey }
    ].filter(d => d.value > 0);
  }, [totals]);

  // Custom Tooltip for Bar Chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: '#ffffff',
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid #cbd5e1',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          fontSize: 12
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: '#0f172a' }}>
            {data.label} · <span style={{ color: '#64748b' }}>{data.buyer}</span>
          </div>
          <div style={{ display: 'grid', gap: 3 }}>
            <div style={{ color: COMPONENT_COLORS.body }}>
              <strong>Body:</strong> {data.bodyReq.toLocaleString()} KG
              {metricView === 'execution' && ` (Dyed: ${data.bodyDye.toLocaleString()} KG)`}
            </div>
            <div style={{ color: COMPONENT_COLORS.rib }}>
              <strong>L Rib:</strong> {data.ribReq.toLocaleString()} KG
              {metricView === 'execution' && ` (Dyed: ${data.ribDye.toLocaleString()} KG)`}
            </div>
            <div style={{ color: COMPONENT_COLORS.sjersey }}>
              <strong>S.Jersey:</strong> {data.sjerseyReq.toLocaleString()} KG
              {metricView === 'execution' && ` (Dyed: ${data.sjerseyDye.toLocaleString()} KG)`}
            </div>
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 4, fontWeight: 700, color: '#334155' }}>
              Total Requirement: {data.totalReq.toLocaleString()} KG
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Pie Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div style={{
          background: '#ffffff',
          padding: '8px 12px',
          borderRadius: 6,
          border: '1px solid #cbd5e1',
          fontSize: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <strong style={{ color: data.payload.color }}>{data.name}</strong>
          <div>{data.value.toLocaleString()} KG ({data.payload.pct}%)</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Control Header & KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
        <div style={{ padding: 12, borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>Body Fabric Share</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1d4ed8', marginTop: 4 }}>
            {totals.bodyReq.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 500 }}>KG</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{totals.bodyPct}% of total fabric booking</div>
        </div>

        <div style={{ padding: 12, borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>L Rib Usage</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706', marginTop: 4 }}>
            {totals.ribReq.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 500 }}>KG</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{totals.ribPct}% of total · Body/Rib: {totals.ratio}:1</div>
        </div>

        <div style={{ padding: 12, borderRadius: 8, background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>S.Jersey Neckband / Binding</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', marginTop: 4 }}>
            {totals.sjerseyReq.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 500 }}>KG</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{totals.sjerseyPct}% of total requirement</div>
        </div>

        <div style={{ padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Total Fabric Booking</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
            {totals.totalReq.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 500 }}>KG</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Across {filteredRows.length} active style runs</div>
        </div>
      </div>

      {/* Filter and View Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: '#f8fafc',
        borderRadius: 8,
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Filter Buyer:</label>
          <select
            value={selectedBuyer}
            onChange={e => setSelectedBuyer(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
          >
            <option value="ALL">All Buyers ({executionRows.length} rows)</option>
            {buyers.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginLeft: 8 }}>Top Jobs:</label>
          <select
            value={topCount}
            onChange={e => setTopCount(Number(e.target.value))}
            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
          >
            <option value={8}>Top 8 Jobs</option>
            <option value={12}>Top 12 Jobs</option>
            <option value={20}>Top 20 Jobs</option>
            <option value={50}>Top 50 Jobs</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 6, padding: 2 }}>
            <button
              type="button"
              onClick={() => setChartMode('stacked')}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                background: chartMode === 'stacked' ? '#ffffff' : 'transparent',
                color: chartMode === 'stacked' ? '#0f172a' : '#64748b',
                boxShadow: chartMode === 'stacked' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Stacked Total
            </button>
            <button
              type="button"
              onClick={() => setChartMode('grouped')}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                background: chartMode === 'grouped' ? '#ffffff' : 'transparent',
                color: chartMode === 'grouped' ? '#0f172a' : '#64748b',
                boxShadow: chartMode === 'grouped' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Side-by-Side
            </button>
          </div>

          <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 6, padding: 2 }}>
            <button
              type="button"
              onClick={() => setMetricView('required')}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                background: metricView === 'required' ? '#ffffff' : 'transparent',
                color: metricView === 'required' ? '#0f172a' : '#64748b',
                boxShadow: metricView === 'required' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Required KG
            </button>
            <button
              type="button"
              onClick={() => setMetricView('execution')}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                background: metricView === 'execution' ? '#ffffff' : 'transparent',
                color: metricView === 'execution' ? '#0f172a' : '#64748b',
                boxShadow: metricView === 'execution' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Dyeing Output
            </button>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 2.2fr) minmax(280px, 1fr)', gap: 16 }}>
        {/* Left: Recharts Bar Chart across Jobs */}
        <div className="panel" style={{ padding: 16 }}>
          <div className="panel-head" style={{ marginBottom: 12 }}>
            <div>
              <div className="panel-title">Component Breakdown Across Active Jobs</div>
              <div className="panel-sub">
                Comparative analysis of Body vs Rib vs S.Jersey consumption per Job order ({chartMode === 'stacked' ? 'Stacked' : 'Grouped'} view)
              </div>
            </div>
            <span className="status-pill neutral">{barChartData.length} Jobs Displayed</span>
          </div>

          <div style={{ width: '100%', height: 350 }}>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 10, right: 15, left: 10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="jobNo"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    unit=" kg"
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
                  />
                  {metricView === 'required' ? (
                    <>
                      <Bar
                        dataKey="bodyReq"
                        name="Body Required"
                        stackId={chartMode === 'stacked' ? 'a' : undefined}
                        fill={COMPONENT_COLORS.body}
                        radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="ribReq"
                        name="L Rib Required"
                        stackId={chartMode === 'stacked' ? 'a' : undefined}
                        fill={COMPONENT_COLORS.rib}
                        radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="sjerseyReq"
                        name="S.Jersey Required"
                        stackId={chartMode === 'stacked' ? 'a' : undefined}
                        fill={COMPONENT_COLORS.sjersey}
                        radius={[4, 4, 0, 0]}
                      />
                    </>
                  ) : (
                    <>
                      <Bar
                        dataKey="bodyDye"
                        name="Body Dyed"
                        stackId={chartMode === 'stacked' ? 'a' : undefined}
                        fill={COMPONENT_COLORS.body}
                        radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="ribDye"
                        name="L Rib Dyed"
                        stackId={chartMode === 'stacked' ? 'a' : undefined}
                        fill={COMPONENT_COLORS.rib}
                        radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="sjerseyDye"
                        name="S.Jersey Dyed"
                        stackId={chartMode === 'stacked' ? 'a' : undefined}
                        fill={COMPONENT_COLORS.sjersey}
                        radius={[4, 4, 0, 0]}
                      />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                Loading visualization...
              </div>
            )}
          </div>
        </div>

        {/* Right: Recharts Donut Distribution Chart */}
        <div className="panel" style={{ padding: 16 }}>
          <div className="panel-head" style={{ marginBottom: 12 }}>
            <div>
              <div className="panel-title">Component Fabric Distribution</div>
              <div className="panel-sub">Overall percentage share across active bookings</div>
            </div>
          </div>

          <div style={{ width: '100%', height: 240 }}>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          {/* Custom Pie Legend with Detailed Metrics */}
          <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
            {pieChartData.map(item => (
              <div
                key={item.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  background: '#f8fafc',
                  borderRadius: 6,
                  border: '1px solid #f1f5f9',
                  fontSize: 11
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                  <strong>{item.name}</strong>
                </div>
                <div>
                  <strong>{item.value.toLocaleString()} KG</strong>
                  <span style={{ color: '#64748b', marginLeft: 6 }}>({item.pct}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparative Ratio & Technical Details Grid */}
      <div className="panel" style={{ padding: 14 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title">Component Zero-Collapse Production Matrix</div>
            <div className="panel-sub">
              Every job strictly separates Body, Rib, and Neckband line items with individual dyeing execution and delivery tracking.
            </div>
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table compact-table">
            <thead>
              <tr>
                <th>Job No</th>
                <th>Buyer</th>
                <th>Color / Combo</th>
                <th>Fabric Details</th>
                <th>Body Req</th>
                <th>L Rib Req</th>
                <th>S.Jersey Req</th>
                <th>Total Req</th>
                <th>Body %</th>
                <th>Rib %</th>
                <th>Execution Status</th>
              </tr>
            </thead>
            <tbody>
              {barChartData.slice(0, 10).map((row, idx) => {
                const total = row.totalReq || 1;
                const bPct = ((row.bodyReq / total) * 100).toFixed(1);
                const rPct = ((row.ribReq / total) * 100).toFixed(1);
                const match = filteredRows.find(r => r.jobNo === row.jobNo);
                return (
                  <tr key={row.jobNo || idx}>
                    <td><strong>{row.jobNo}</strong></td>
                    <td>{row.buyer}</td>
                    <td>{match?.colour || 'Standard Shade'}</td>
                    <td><small>{match?.fabricDescription || 'Single Jersey / Rib'}</small></td>
                    <td><strong style={{ color: COMPONENT_COLORS.body }}>{row.bodyReq.toLocaleString()} kg</strong></td>
                    <td><strong style={{ color: COMPONENT_COLORS.rib }}>{row.ribReq.toLocaleString()} kg</strong></td>
                    <td><strong style={{ color: COMPONENT_COLORS.sjersey }}>{row.sjerseyReq.toLocaleString()} kg</strong></td>
                    <td><strong>{row.totalReq.toLocaleString()} kg</strong></td>
                    <td><span className="status-pill neutral">{bPct}%</span></td>
                    <td><span className="status-pill neutral">{rPct}%</span></td>
                    <td>
                      <span className={`status-pill ${row.bodyDye > 0 ? 'good' : 'warn'}`}>
                        {row.bodyDye > 0 ? 'In-Dyeing / Passed' : 'Awaiting Greige'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
