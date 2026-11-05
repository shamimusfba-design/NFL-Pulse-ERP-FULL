'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Settings,
  X,
  TrendingUp,
  Boxes,
} from 'lucide-react';

function fmt(n: any) {
  return Number(n || 0).toLocaleString();
}

function statusPill(loadPct: number, thresholds = { greenMax: 85, amberMax: 100 }) {
  if (loadPct > thresholds.amberMax) {
    return {
      bg: '#FEF2F2',
      border: '#FECACA',
      text: '#991B1B',
      bar: '#DC2626',
      label: 'OVERLOAD',
    };
  }
  if (loadPct > thresholds.greenMax) {
    return {
      bg: '#FFFBEB',
      border: '#FDE68A',
      text: '#92400E',
      bar: '#D97706',
      label: 'ATTENTION',
    };
  }
  return {
    bg: '#ECFDF5',
    border: '#A7F3D0',
    text: '#065F46',
    bar: '#059669',
    label: 'NORMAL',
  };
}

export default function CapacityPage() {
  const [month, setMonth] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [policies, setPolicies] = useState<any>(null);
  const [editingPolicies, setEditingPolicies] = useState(false);
  const [editingHolidays, setEditingHolidays] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayFactor, setNewHolidayFactor] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ section: string; slot: any } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeChartBar, setActiveChartBar] = useState<number | null>(null);

  async function load(targetMonth?: string) {
    setError('');
    try {
      const q = targetMonth ? `?month=${encodeURIComponent(targetMonth)}` : '';
      const [hm, pol] = await Promise.all([
        api(`/planning/capacity/heatmap${q}`),
        api('/planning/capacity/policies'),
      ]);
      setData(hm);
      if (!targetMonth && hm?.month) setMonth(hm.month);
      setPolicies(pol);
    } catch (e: any) {
      setError(e.message || 'Failed to load capacity heatmap');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function savePolicies() {
    if (!policies) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api('/planning/capacity/policies', {
        method: 'POST',
        body: JSON.stringify(policies),
      });
      setMessage('Capacity policies and holiday schedule saved. Heatmaps recalculated.');
      setEditingPolicies(false);
      setEditingHolidays(false);
      await load(month);
    } catch (e: any) {
      setError(e.message || 'Failed to save policies');
    } finally {
      setSaving(false);
    }
  }

  function updateBulkCap(section: string, val: number) {
    setPolicies((prev: any) => ({
      ...prev,
      bulk: {
        ...(prev?.bulk || {}),
        [section]: {
          ...(prev?.bulk?.[section] || {}),
          dailyCapacity: val,
        },
      },
    }));
  }

  function updateSamplePol(sec: string, field: string, val: any) {
    setPolicies((prev: any) => ({
      ...prev,
      sample: {
        ...(prev?.sample || {}),
        [sec]: {
          ...(prev?.sample?.[sec] || {}),
          [field]: val,
        },
      },
    }));
  }

  function addHoliday() {
    if (!newHolidayDate) return;
    const name = newHolidayName.trim() || 'Factory Closure';
    const nextList = [...(policies?.holidays || [])];
    const idx = nextList.findIndex((h: any) => h.date === newHolidayDate);
    if (idx >= 0) {
      nextList[idx] = { date: newHolidayDate, name, factor: newHolidayFactor };
    } else {
      nextList.push({ date: newHolidayDate, name, factor: newHolidayFactor });
    }
    nextList.sort((a, b) => a.date.localeCompare(b.date));
    setPolicies((prev: any) => ({ ...prev, holidays: nextList }));
    setNewHolidayDate('');
    setNewHolidayName('');
  }

  function removeHoliday(dt: string) {
    const nextList = (policies?.holidays || []).filter((h: any) => h.date !== dt);
    setPolicies((prev: any) => ({ ...prev, holidays: nextList }));
  }

  const rows = data?.rows || [];
  const thresholds = policies?.thresholds || { greenMax: 85, amberMax: 100 };
  const sampleRows = data?.sampleRows || [];
  const holidays = policies?.holidays || data?.holidays || [];
  const monthHolidays = holidays.filter((h: any) => !month || String(h.date || '').startsWith(month));

  // Overload slots count
  const overloadCount = useMemo(() => {
    let count = 0;
    rows.forEach((r: any) => {
      (r.slots || []).forEach((sl: any) => {
        if (sl.loadPct > thresholds.greenMax) count++;
      });
    });
    return count;
  }, [rows, thresholds]);

  // Chart data: section-by-section monthly load percentage
  const chartData = useMemo(() => {
    return rows.map((r: any) => {
      const pill = statusPill(r.monthLoadPct, thresholds);
      return {
        name: r.label,
        loadPct: r.monthLoadPct,
        demand: r.monthDemand,
        capacity: r.monthCapacity,
        unit: r.unit,
        color: pill.bar,
        fill: pill.bg,
      };
    });
  }, [rows, thresholds]);

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div
          style={{
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '10px 14px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            border: '1px solid #334155',
            fontSize: '12px',
            lineHeight: 1.4,
            minWidth: '170px',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 700, color: d.color, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color }}></span>
            {d.name}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span style={{ color: '#94A3B8' }}>Load:</span>
            <span style={{ fontWeight: 700, color: d.color }}>{d.loadPct}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span style={{ color: '#94A3B8' }}>Booked Demand:</span>
            <span style={{ fontWeight: 700 }}>{fmt(d.demand)} {d.unit}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span style={{ color: '#94A3B8' }}>Total Capacity:</span>
            <span style={{ fontWeight: 700 }}>{fmt(d.capacity)} {d.unit}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Shell
      title="3. Capacity Balancing & Holiday Calendar (Bulk & Sample)"
      eyebrow="Central Planning • Sunday Weekly Off & Holiday Calendar"
    >
      <div className="erp-page-entrance" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Module Header & Top Control Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: '#FFFFFF',
            padding: '12px 18px',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284C7, #0369A1)',
                display: 'grid',
                placeItems: 'center',
                color: '#FFFFFF',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
              }}
            >
              <Layers size={18} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F274E', letterSpacing: '-0.01em' }}>
                Factory Capacity Balancing &amp; Holiday Calendar
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                10-day slot heatmaps, Sunday weekly off (Knitting 50%), and Eid / national closures
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: '#EEF2FF',
                border: '1px solid #C7D2FE',
                color: '#4338CA',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 650,
              }}
            >
              Sunday: Knitting 50% · Others Off
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#64748B' }}>
              <span>Target:</span>
              <input
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  load(e.target.value);
                }}
                style={{
                  height: '30px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '11.5px',
                  outline: 'none',
                  background: '#FFFFFF',
                }}
              />
            </div>
            <button
              onClick={() => setEditingHolidays((v) => !v)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 650,
                border: '1px solid #D97706',
                background: editingHolidays ? '#D97706' : '#FFFBEB',
                color: editingHolidays ? '#FFFFFF' : '#B45309',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {editingHolidays ? 'Close Holiday Calendar' : `Holiday Calendar (${holidays.length})`}
            </button>
            <button
              onClick={() => setEditingPolicies((v) => !v)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 650,
                border: '1px solid #0284C7',
                background: editingPolicies ? '#0284C7' : '#F0F9FF',
                color: editingPolicies ? '#FFFFFF' : '#0284C7',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {editingPolicies ? 'Close Capacity Settings' : 'Customize Capacities'}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {message && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#065F46',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} />
            {message}
          </div>
        )}
        {error && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* Trims & Accessories Store Standard KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px',
          }}
        >
          {/* Card 1: Target Month */}
          <div
            style={{
              background: '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>
              Target Plan Month
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F274E', margin: '2px 0' }}>
              {data?.month || month || '2026-10'}
            </div>
            <div style={{ fontSize: '11.5px', color: '#0284C7', fontWeight: 600 }}>
              Production horizon
            </div>
          </div>

          {/* Card 2: Monitored Sections */}
          <div
            style={{
              background: '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>
              Mill Sections Monitored
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F274E', margin: '2px 0' }}>
              {rows.length} Sections
            </div>
            <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
              Knitting to Finishing
            </div>
          </div>

          {/* Card 3: Overload / Attention Slots */}
          <div
            style={{
              background: overloadCount > 0 ? '#FFFBEB' : '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '8px',
              border: overloadCount > 0 ? '2px solid #D97706' : '1px solid #E2E8F0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '11px', color: '#D97706', fontWeight: 650, textTransform: 'uppercase' }}>
              Overload Attention Slots
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#B45309', margin: '2px 0' }}>
              {overloadCount} Slots
            </div>
            <div style={{ fontSize: '11.5px', color: '#B45309', fontWeight: 600 }}>
              &gt; {thresholds.greenMax}% capacity load
            </div>
          </div>

          {/* Card 4: Sunday Weekly Off Policy */}
          <div
            style={{
              background: '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>
              Weekly Off Policy
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#4338CA', margin: '2px 0' }}>
              SUNDAY
            </div>
            <div style={{ fontSize: '11.5px', color: '#6366F1', fontWeight: 600 }}>
              Knitting 0.5x · Others 0x
            </div>
          </div>

          {/* Card 5: Factory Closures */}
          <div
            style={{
              background: '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>
              Month Closures &amp; Holidays
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F274E', margin: '2px 0' }}>
              {monthHolidays.length} Days
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B' }}>
              Scheduled in {month || 'this month'}
            </div>
          </div>
        </div>

        {/* Compact Interactive Recharts Chart: Section Capacity Utilization */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            padding: '14px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 750, color: '#0F274E' }}>
                Section Monthly Capacity Utilization vs Booked Demand
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                Hover over bars to inspect booked demand vs full capacity across knitting, dyeing, sewing and finishing
              </div>
            </div>
            <span
              style={{
                background: '#F0F9FF',
                color: '#0284C7',
                border: '1px solid #BAE6FD',
                padding: '3px 9px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 650,
              }}
            >
              Capacity Analytics
            </span>
          </div>

          <div style={{ width: '100%', height: '150px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11, fontWeight: 550 }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(2, 132, 199, 0.06)' }} />
                <Bar
                  dataKey="loadPct"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                  onMouseEnter={(_, index) => setActiveChartBar(index)}
                  onMouseLeave={() => setActiveChartBar(null)}
                >
                  {chartData.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={activeChartBar === index ? entry.color : entry.fill}
                      stroke={entry.color}
                      strokeWidth={1.5}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Modal: Holiday Calendar Editor */}
        {editingHolidays && policies && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #D97706',
              padding: '16px',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F274E' }}>
                  Factory Holiday &amp; Closure Calendar
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                  Weekly holiday is fixed to Sunday. Any date listed below reduces slot working days automatically.
                </div>
              </div>
              <button
                onClick={savePolicies}
                disabled={saving}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#D97706',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '11.5px',
                  cursor: 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save & Recalculate'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '12px' }}>
              <input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                style={{ padding: '6px 8px', borderRadius: '5px', border: '1px solid #CBD5E1', fontSize: '11.5px' }}
              />
              <input
                type="text"
                placeholder="Holiday Name (e.g. Eid Closure)"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                style={{ padding: '6px 8px', borderRadius: '5px', border: '1px solid #CBD5E1', fontSize: '11.5px' }}
              />
              <select
                value={newHolidayFactor}
                onChange={(e) => setNewHolidayFactor(Number(e.target.value))}
                style={{ padding: '6px 8px', borderRadius: '5px', border: '1px solid #CBD5E1', fontSize: '11.5px' }}
              >
                <option value={0}>Full Closure (0% Cap)</option>
                <option value={0.5}>Half Day (50% Cap)</option>
              </select>
              <button
                type="button"
                onClick={addHoliday}
                style={{
                  padding: '6px 12px',
                  borderRadius: '5px',
                  border: '1px solid #0284C7',
                  background: '#F0F9FF',
                  color: '#0284C7',
                  fontWeight: 700,
                  fontSize: '11.5px',
                  cursor: 'pointer',
                }}
              >
                + Add Date
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
              {holidays.map((h: any) => (
                <div
                  key={h.date}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    fontSize: '11.5px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#B45309', fontFamily: 'monospace' }}>{h.date}</div>
                    <div style={{ color: '#0F274E' }}>{h.name}</div>
                  </div>
                  <button
                    onClick={() => removeHoliday(h.date)}
                    style={{ border: 'none', background: 'transparent', color: '#DC2626', cursor: 'pointer', fontSize: '12px' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal: Capacity Policy Editor */}
        {editingPolicies && policies && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #0284C7',
              padding: '16px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F274E' }}>
                  Customizable Section Daily Capacities
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                  Adjust daily factory section targets. Changes recalculate 10-day slot heatmaps immediately.
                </div>
              </div>
              <button
                onClick={savePolicies}
                disabled={saving}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#0284C7',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '11.5px',
                  cursor: 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save Capacities'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {Object.entries(policies.bulk || {}).map(([key, val]: [string, any]) => (
                <div key={key} style={{ padding: '10px', borderRadius: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '11.5px' }}>
                  <div style={{ color: '#64748B', fontWeight: 650 }}>{val.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <input
                      type="number"
                      value={val.dailyCapacity || 0}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => updateBulkCap(key, Number(e.target.value))}
                      style={{ width: '100px', padding: '4px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700 }}
                    />
                    <span style={{ color: '#94A3B8' }}>{val.unit}/day</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Heatmap Table */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F274E' }}>
                1. Bulk Production 10-Day Slot Heatmap ({data?.month || month})
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                Slot 1 (Days 1–10) · Slot 2 (Days 11–20) · Slot 3 (Days 21–End). Click slot to inspect contributing jobs.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', fontSize: '11px' }}>
              <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontWeight: 700 }}>
                Normal ≤ {thresholds.greenMax}%
              </span>
              <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', fontWeight: 700 }}>
                Attention {thresholds.greenMax + 1}–{thresholds.amberMax}%
              </span>
              <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontWeight: 700 }}>
                Overload &gt; {thresholds.amberMax}%
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>Section</th>
                  <th style={{ padding: '8px 10px' }}>Daily Policy</th>
                  <th style={{ padding: '8px 10px' }}>Slot 1 (Days 1–10)</th>
                  <th style={{ padding: '8px 10px' }}>Slot 2 (Days 11–20)</th>
                  <th style={{ padding: '8px 10px' }}>Slot 3 (Days 21–End)</th>
                  <th style={{ padding: '8px 10px' }}>Month Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => {
                  const mPill = statusPill(r.monthLoadPct, thresholds);
                  return (
                    <tr key={r.section} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 800, color: '#0F274E' }}>{r.label}</div>
                        <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>
                          Unit: {r.unit} · Sunday: {Number(r.sundayFactor || 0) * 100}%
                        </div>
                      </td>
                      <td style={{ padding: '10px', fontFamily: 'monospace', color: '#475569' }}>
                        {fmt(r.dailyCapacity)} {r.unit}/d
                      </td>
                      {(r.slots || []).map((sl: any) => {
                        const pill = statusPill(sl.loadPct, thresholds);
                        return (
                          <td key={sl.slot} style={{ padding: '8px' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedCell({ section: r.label, slot: sl })}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: `1px solid ${pill.border}`,
                                background: pill.bg,
                                textAlign: 'left',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 800, color: pill.text, fontSize: '13px' }}>{sl.loadPct}%</span>
                                <span style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase' }}>
                                  {sl.jobs} jobs
                                </span>
                              </div>
                              <div style={{ height: '4px', width: '100%', borderRadius: '2px', background: '#E2E8F0', overflow: 'hidden', margin: '4px 0' }}>
                                <div style={{ height: '100%', width: `${Math.min(100, sl.loadPct)}%`, background: pill.bar }} />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748B' }}>
                                <span>Demand: {fmt(sl.demand)}</span>
                                <span>Cap: {fmt(sl.capacity)}</span>
                              </div>
                            </button>
                          </td>
                        );
                      })}
                      <td style={{ padding: '10px' }}>
                        <div style={{ padding: '8px', borderRadius: '6px', background: mPill.bg, border: `1px solid ${mPill.border}` }}>
                          <div style={{ fontWeight: 800, color: mPill.text }}>{r.monthLoadPct}% ({mPill.label})</div>
                          <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                            {fmt(r.monthDemand)} / {fmt(r.monthCapacity)} {r.unit}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Slot Contributing Jobs Drawer */}
        {selectedCell && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #BAE6FD',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F274E' }}>
                  {selectedCell.section} — Slot {selectedCell.slot.slot} Contributing Jobs
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                  Load: {selectedCell.slot.loadPct}% ({selectedCell.slot.workDays} Working Days) · Demand: {fmt(selectedCell.slot.demand)} vs Cap: {fmt(selectedCell.slot.capacity)}
                </div>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                style={{ border: 'none', background: '#F1F5F9', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
              {(selectedCell.slot.topJobs || []).map((j: any, i: number) => (
                <div key={i} style={{ padding: '10px', borderRadius: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '11.5px' }}>
                  <div style={{ fontWeight: 800, color: '#0284C7' }}>Job #{j.jobNo} · {j.styleNo}</div>
                  <div style={{ color: '#64748B', fontSize: '10.5px' }}>{j.buyer}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontWeight: 650 }}>
                    <span>Demand: {fmt(j.demand)}</span>
                    <span style={{ color: '#059669' }}>Due: {j.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
