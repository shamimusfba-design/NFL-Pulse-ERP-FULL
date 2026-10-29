'use client';

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';

function num(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? (Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 1 })) : String(v);
}

export interface YarnCountMeta {
  key: string;
  name: string;
  count: string;
  color: string;
  blend: string;
  leadTimeDays: number;
  reorderPoint: number;
  currentStock: number;
  dailyBurnKg: number;
}

export const TOP_5_YARN_COUNTS: YarnCountMeta[] = [
  {
    key: 'ne30Combed',
    name: '30/1 Ne Combed Cotton',
    count: '30/1 Ne Combed',
    color: '#2563eb',
    blend: '100% Cotton BCI Certified',
    leadTimeDays: 14,
    reorderPoint: 37800,
    currentStock: 38400,
    dailyBurnKg: 1800
  },
  {
    key: 'ne26Carded',
    name: '26/1 Ne Carded Cotton',
    count: '26/1 Ne Carded',
    color: '#0d9488',
    blend: '100% Cotton Ring Spun',
    leadTimeDays: 14,
    reorderPoint: 25200,
    currentStock: 14200,
    dailyBurnKg: 1200
  },
  {
    key: 'ne34Combed',
    name: '34/1 Ne Combed Cotton',
    count: '34/1 Ne Combed',
    color: '#8b5cf6',
    blend: '100% Cotton BCI Combed',
    leadTimeDays: 14,
    reorderPoint: 23100,
    currentStock: 18200,
    dailyBurnKg: 1100
  },
  {
    key: 'cvc30Melange',
    name: '30/1 Ne CVC 60/40 Melange',
    count: '30/1 CVC Melange',
    color: '#f59e0b',
    blend: '60% Cotton / 40% Polyester',
    leadTimeDays: 21,
    reorderPoint: 26600,
    currentStock: 9500,
    dailyBurnKg: 950
  },
  {
    key: 'ne20Carded',
    name: '20/1 Ne Carded Cotton',
    count: '20/1 Ne Carded',
    color: '#ec4899',
    blend: '100% Cotton Carded',
    leadTimeDays: 14,
    reorderPoint: 17850,
    currentStock: 15600,
    dailyBurnKg: 850
  }
];

// 6-Month time series (May 2026 - October 2026) showing stock level and monthly depletion
export const SIX_MONTH_DEPLETION_DATA = [
  {
    month: 'May 2026',
    shortMonth: 'May',
    // Stock levels at month end (KG)
    ne30Combed_stock: 54200,
    ne26Carded_stock: 32500,
    ne34Combed_stock: 26400,
    cvc30Melange_stock: 22100,
    ne20Carded_stock: 21800,
    totalGodownStock: 157000,
    // Monthly depletion / consumption issued to knitting (KG)
    ne30Combed_depleted: 53400,
    ne26Carded_depleted: 35100,
    ne34Combed_depleted: 32800,
    cvc30Melange_depleted: 27500,
    ne20Carded_depleted: 24600,
    totalDepleted: 173400,
    // Inflow receipts (GRN)
    totalReceived: 182000,
    netChange: 8600
  },
  {
    month: 'Jun 2026',
    shortMonth: 'Jun',
    ne30Combed_stock: 48600,
    ne26Carded_stock: 27800,
    ne34Combed_stock: 24100,
    cvc30Melange_stock: 19400,
    ne20Carded_stock: 19500,
    totalGodownStock: 139400,
    ne30Combed_depleted: 55200,
    ne26Carded_depleted: 36400,
    ne34Combed_depleted: 33500,
    cvc30Melange_depleted: 28900,
    ne20Carded_depleted: 25200,
    totalDepleted: 179200,
    totalReceived: 161600,
    netChange: -17600
  },
  {
    month: 'Jul 2026',
    shortMonth: 'Jul',
    ne30Combed_stock: 41500,
    ne26Carded_stock: 21400,
    ne34Combed_stock: 21800,
    cvc30Melange_stock: 16200,
    ne20Carded_stock: 17200,
    totalGodownStock: 118100,
    ne30Combed_depleted: 54800,
    ne26Carded_depleted: 37200,
    ne34Combed_depleted: 34100,
    cvc30Melange_depleted: 29400,
    ne20Carded_depleted: 26100,
    totalDepleted: 181600,
    totalReceived: 160300,
    netChange: -21300
  },
  {
    month: 'Aug 2026',
    shortMonth: 'Aug',
    ne30Combed_stock: 46200, // received SCM PO shipment
    ne26Carded_stock: 24600,
    ne34Combed_stock: 22500,
    cvc30Melange_stock: 18000,
    ne20Carded_stock: 19800,
    totalGodownStock: 131100,
    ne30Combed_depleted: 56100,
    ne26Carded_depleted: 35800,
    ne34Combed_depleted: 32900,
    cvc30Melange_depleted: 28100,
    ne20Carded_depleted: 24900,
    totalDepleted: 177800,
    totalReceived: 190800,
    netChange: 13000
  },
  {
    month: 'Sep 2026',
    shortMonth: 'Sep',
    ne30Combed_stock: 39800,
    ne26Carded_stock: 18200,
    ne34Combed_stock: 19600,
    cvc30Melange_stock: 12800,
    ne20Carded_stock: 17100,
    totalGodownStock: 107500,
    ne30Combed_depleted: 53900,
    ne26Carded_depleted: 36900,
    ne34Combed_depleted: 33700,
    cvc30Melange_depleted: 29800,
    ne20Carded_depleted: 25800,
    totalDepleted: 180100,
    totalReceived: 156500,
    netChange: -23600
  },
  {
    month: 'Oct 2026 (MTD)',
    shortMonth: 'Oct',
    ne30Combed_stock: 38400,
    ne26Carded_stock: 14200, // critical depletion
    ne34Combed_stock: 18200,
    cvc30Melange_stock: 9500, // below reorder threshold
    ne20Carded_stock: 15600,
    totalGodownStock: 95900,
    ne30Combed_depleted: 54200,
    ne26Carded_depleted: 37100,
    ne34Combed_depleted: 34000,
    cvc30Melange_depleted: 30200,
    ne20Carded_depleted: 26000,
    totalDepleted: 181500,
    totalReceived: 169900,
    netChange: -11600
  }
];

export default function YarnDepletionDashboard() {
  const [chartMode, setChartMode] = useState<'STOCK_LEVEL' | 'MONTHLY_DEPLETION' | 'NET_FLOW'>('STOCK_LEVEL');
  const [selectedCounts, setSelectedCounts] = useState<string[]>([
    'ne30Combed',
    'ne26Carded',
    'ne34Combed',
    'cvc30Melange',
    'ne20Carded'
  ]);
  const [hoveredData, setHoveredData] = useState<any | null>(null);

  function toggleCount(key: string) {
    if (selectedCounts.includes(key)) {
      if (selectedCounts.length === 1) return; // Keep at least one
      setSelectedCounts(prev => prev.filter(k => k !== key));
    } else {
      setSelectedCounts(prev => [...prev, key]);
    }
  }

  // Aggregate metrics
  const aggregateMetrics = useMemo(() => {
    let totalDepleted6M = 0;
    const countTotals: Record<string, number> = {};

    TOP_5_YARN_COUNTS.forEach(c => {
      countTotals[c.key] = 0;
    });

    SIX_MONTH_DEPLETION_DATA.forEach(row => {
      totalDepleted6M += row.totalDepleted;
      countTotals.ne30Combed += row.ne30Combed_depleted;
      countTotals.ne26Carded += row.ne26Carded_depleted;
      countTotals.ne34Combed += row.ne34Combed_depleted;
      countTotals.cvc30Melange += row.cvc30Melange_depleted;
      countTotals.ne20Carded += row.ne20Carded_depleted;
    });

    const avgMonthlyDepletion = Math.round(totalDepleted6M / 6);
    const combinedDailyBurn = TOP_5_YARN_COUNTS.reduce((sum, c) => sum + c.dailyBurnKg, 0);

    return {
      totalDepleted6M,
      avgMonthlyDepletion,
      combinedDailyBurn,
      countTotals
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Header & Summary Strip */}
      <div className="panel" style={{ border: '1px solid #cbd5e1', background: '#ffffff', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                📊 Top 5 Yarn Counts: 6-Month Stock Depletion &amp; Consumption Dashboard
              </span>
              <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                Yarn Stock Depletion Trend
              </span>
              <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                Recharts Visual Engine
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Historical consumption trajectory from May 2026 to October 2026. Identifies knitting machine burn velocity, replenishment cycles, and buffer breach risks across the 5 highest-demand counts.
            </div>
          </div>

          {/* Quick Stats Pill Group */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>6M Total Depleted</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{num(aggregateMetrics.totalDepleted6M)} KG</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Avg Monthly Burn</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#2563eb' }}>{num(aggregateMetrics.avgMonthlyDepletion)} KG/mo</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Combined Daily Burn</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#dc2626' }}>{num(aggregateMetrics.combinedDailyBurn)} KG/day</div>
            </div>
          </div>
        </div>

        {/* 2. Interactive Chart Controls Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #e2e8f0'
        }}>
          {/* Mode Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginRight: '4px' }}>Chart View:</span>
            <button
              type="button"
              onClick={() => setChartMode('STOCK_LEVEL')}
              style={{
                fontSize: '11px',
                padding: '5px 12px',
                borderRadius: '6px',
                border: chartMode === 'STOCK_LEVEL' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                background: chartMode === 'STOCK_LEVEL' ? '#2563eb' : '#ffffff',
                color: chartMode === 'STOCK_LEVEL' ? '#ffffff' : '#334155',
                fontWeight: chartMode === 'STOCK_LEVEL' ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              📈 Stock Level Trajectory (KG)
            </button>
            <button
              type="button"
              onClick={() => setChartMode('MONTHLY_DEPLETION')}
              style={{
                fontSize: '11px',
                padding: '5px 12px',
                borderRadius: '6px',
                border: chartMode === 'MONTHLY_DEPLETION' ? '1px solid #0d9488' : '1px solid #cbd5e1',
                background: chartMode === 'MONTHLY_DEPLETION' ? '#0d9488' : '#ffffff',
                color: chartMode === 'MONTHLY_DEPLETION' ? '#ffffff' : '#334155',
                fontWeight: chartMode === 'MONTHLY_DEPLETION' ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              📊 Monthly Depletion / Issues (KG)
            </button>
            <button
              type="button"
              onClick={() => setChartMode('NET_FLOW')}
              style={{
                fontSize: '11px',
                padding: '5px 12px',
                borderRadius: '6px',
                border: chartMode === 'NET_FLOW' ? '1px solid #8b5cf6' : '1px solid #cbd5e1',
                background: chartMode === 'NET_FLOW' ? '#8b5cf6' : '#ffffff',
                color: chartMode === 'NET_FLOW' ? '#ffffff' : '#334155',
                fontWeight: chartMode === 'NET_FLOW' ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              🔄 Inflow vs Depletion Net Flow
            </button>
          </div>

          {/* Yarn Count Toggle Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Filter Counts:</span>
            {TOP_5_YARN_COUNTS.map(c => {
              const active = selectedCounts.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleCount(c.key)}
                  style={{
                    fontSize: '10px',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    border: `1px solid ${active ? c.color : '#cbd5e1'}`,
                    background: active ? `${c.color}15` : '#ffffff',
                    color: active ? c.color : '#94a3b8',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? c.color : '#cbd5e1' }} />
                  {c.count}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Primary Recharts Visualization Card */}
      <div className="panel" style={{ padding: '16px 20px', background: '#ffffff', minHeight: 380 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <strong style={{ fontSize: '13px', color: '#0f172a' }}>
              {chartMode === 'STOCK_LEVEL' && '6-Month Physical Godown Stock Trajectory (KG Remaining)'}
              {chartMode === 'MONTHLY_DEPLETION' && 'Monthly Yarn Depletion to Circular & Flat Knitting Lines (KG Issued)'}
              {chartMode === 'NET_FLOW' && 'Factory Yarn Balance: Inflow Receipts (GRN) vs Outflow Depletion (KG)'}
            </strong>
            <div style={{ fontSize: '10px', color: '#64748b' }}>
              {chartMode === 'STOCK_LEVEL' && 'Notice the continuous downward slope between spinning mill arrivals, flagging buffer deficits in 26/1 Ne and 30/1 CVC.'}
              {chartMode === 'MONTHLY_DEPLETION' && 'Peak circular knitting demand observed in July & September for summer/fall export execution.'}
              {chartMode === 'NET_FLOW' && 'Net monthly balance shows whether receipts satisfied knitting burn rate.'}
            </div>
          </div>
          {hoveredData && (
            <div style={{ fontSize: '11px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', color: '#0f172a', fontWeight: 700 }}>
              Period: {hoveredData.month} · Total Depleted: {num(hoveredData.totalDepleted)} KG
            </div>
          )}
        </div>

        {/* View Mode 1: Stock Level Area / Line Chart */}
        {chartMode === 'STOCK_LEVEL' && (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={SIX_MONTH_DEPLETION_DATA}
                margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                onMouseMove={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    setHoveredData(e.activePayload[0].payload);
                  }
                }}
                onMouseLeave={() => setHoveredData(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="shortMonth" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  domain={[0, 60000]}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [`${num(val)} KG`, name]}
                  labelFormatter={(lbl) => `Month: ${lbl} 2026`}
                  contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px', border: 'none' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                {/* Reference line for 30/1 Reorder Point */}
                <ReferenceLine y={37800} stroke="#2563eb" strokeDasharray="4 4" label={{ value: '30/1 ROP (37.8k)', fill: '#2563eb', fontSize: 10, position: 'right' }} />
                <ReferenceLine y={25200} stroke="#0d9488" strokeDasharray="4 4" label={{ value: '26/1 ROP (25.2k)', fill: '#0d9488', fontSize: 10, position: 'right' }} />

                {selectedCounts.includes('ne30Combed') && (
                  <Line
                    type="monotone"
                    dataKey="ne30Combed_stock"
                    name="30/1 Ne Combed"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                )}
                {selectedCounts.includes('ne26Carded') && (
                  <Line
                    type="monotone"
                    dataKey="ne26Carded_stock"
                    name="26/1 Ne Carded"
                    stroke="#0d9488"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                )}
                {selectedCounts.includes('ne34Combed') && (
                  <Line
                    type="monotone"
                    dataKey="ne34Combed_stock"
                    name="34/1 Ne Combed"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                )}
                {selectedCounts.includes('cvc30Melange') && (
                  <Line
                    type="monotone"
                    dataKey="cvc30Melange_stock"
                    name="30/1 CVC Melange"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                )}
                {selectedCounts.includes('ne20Carded') && (
                  <Line
                    type="monotone"
                    dataKey="ne20Carded_stock"
                    name="20/1 Ne Carded"
                    stroke="#ec4899"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* View Mode 2: Monthly Depletion Bar Chart */}
        {chartMode === 'MONTHLY_DEPLETION' && (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={SIX_MONTH_DEPLETION_DATA}
                margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                onMouseMove={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    setHoveredData(e.activePayload[0].payload);
                  }
                }}
                onMouseLeave={() => setHoveredData(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="shortMonth" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [`${num(val)} KG Issued`, name]}
                  contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px', border: 'none' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                {selectedCounts.includes('ne30Combed') && (
                  <Bar dataKey="ne30Combed_depleted" name="30/1 Ne Combed" fill="#2563eb" radius={[4, 4, 0, 0]} />
                )}
                {selectedCounts.includes('ne26Carded') && (
                  <Bar dataKey="ne26Carded_depleted" name="26/1 Ne Carded" fill="#0d9488" radius={[4, 4, 0, 0]} />
                )}
                {selectedCounts.includes('ne34Combed') && (
                  <Bar dataKey="ne34Combed_depleted" name="34/1 Ne Combed" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                )}
                {selectedCounts.includes('cvc30Melange') && (
                  <Bar dataKey="cvc30Melange_depleted" name="30/1 CVC Melange" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                )}
                {selectedCounts.includes('ne20Carded') && (
                  <Bar dataKey="ne20Carded_depleted" name="20/1 Ne Carded" fill="#ec4899" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* View Mode 3: Inflow vs Outflow Net Flow */}
        {chartMode === 'NET_FLOW' && (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={SIX_MONTH_DEPLETION_DATA}
                margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorRecv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDepl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="shortMonth" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: any, name: any) => [`${num(val)} KG`, name]}
                  contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '11px', border: 'none' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="totalReceived" name="Total Inflow Receipts (GRN)" stroke="#16a34a" fillOpacity={1} fill="url(#colorRecv)" />
                <Area type="monotone" dataKey="totalDepleted" name="Total Knitting Depletion (Issued)" stroke="#dc2626" fillOpacity={1} fill="url(#colorDepl)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 4. Detailed Top 5 Count Analytics Table */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">📋 Top 5 Yarn Counts Depletion Velocity &amp; Runway Matrix</div>
            <div className="panel-sub">
              Comparison of 6-month cumulative consumption, daily burn rates, current godown physical stock, and estimated days of runway before machine starvation.
            </div>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
            Active Threshold: 7-day Buffer + Lead Time
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table compact-table" style={{ width: '100%', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Yarn Count &amp; Description</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Fiber Blend</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>6M Depleted (KG)</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>Monthly Avg (KG)</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>Daily Burn (KG/d)</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>Current Stock</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>Reorder Point</th>
                <th style={{ textAlign: 'center', padding: '8px' }}>Runway Days</th>
                <th style={{ textAlign: 'center', padding: '8px' }}>Depletion Status</th>
              </tr>
            </thead>
            <tbody>
              {TOP_5_YARN_COUNTS.map((c) => {
                const totalDepleted = aggregateMetrics.countTotals[c.key] || 0;
                const monthlyAvg = Math.round(totalDepleted / 6);
                const runwayDays = Number((c.currentStock / c.dailyBurnKg).toFixed(1));
                const isCritical = runwayDays <= 5 || c.currentStock < (c.reorderPoint * 0.45);
                const isBelowRop = c.currentStock < c.reorderPoint;

                return (
                  <tr
                    key={c.key}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: isCritical ? '#fef2f2' : isBelowRop ? '#fffbeb' : undefined
                    }}
                  >
                    <td style={{ padding: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                        <strong style={{ color: '#0f172a' }}>{c.name}</strong>
                      </div>
                    </td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{c.blend}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {num(totalDepleted)} kg
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#475569' }}>
                      {num(monthlyAvg)} kg/mo
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                      {num(c.dailyBurnKg)} kg/d
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {num(c.currentStock)} kg
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>
                      {num(c.reorderPoint)} kg
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <strong style={{ color: isCritical ? '#dc2626' : isBelowRop ? '#d97706' : '#16a34a' }}>
                        {runwayDays} days
                      </strong>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 800,
                          background: isCritical ? '#fee2e2' : isBelowRop ? '#fef3c7' : '#dcfce7',
                          color: isCritical ? '#991b1b' : isBelowRop ? '#92400e' : '#166534'
                        }}
                      >
                        {isCritical ? '🚨 CRITICAL DEPLETION' : isBelowRop ? '⚠️ BELOW ROP' : '✅ SAFE BUFFER'}
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
