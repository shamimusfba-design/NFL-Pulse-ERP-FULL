'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';

function fmt(n: any) {
  return Number(n || 0).toLocaleString();
}

function statusPill(loadPct: number, thresholds = { greenMax: 85, amberMax: 100 }) {
  if (loadPct > thresholds.amberMax) {
    return { bg: 'bg-rose-500/20 text-rose-200 border-rose-500/40', bar: 'bg-rose-500', label: 'OVERLOAD' };
  }
  if (loadPct > thresholds.greenMax) {
    return { bg: 'bg-amber-500/20 text-amber-200 border-amber-500/40', bar: 'bg-amber-400', label: 'ATTENTION' };
  }
  return { bg: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40', bar: 'bg-emerald-500', label: 'NORMAL' };
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
      setMessage('Capacity policies and Holiday Calendar saved. Slot working days recalculated.');
      setEditingPolicies(false);
      setEditingHolidays(false);
      await load(month);
    } catch (e: any) {
      setError(e.message || 'Failed to save policies');
    } finally {
      setSaving(false);
    }
  }

  function addHoliday() {
    if (!newHolidayDate || !newHolidayName.trim()) return;
    const list = Array.isArray(policies?.holidays) ? [...policies.holidays] : [];
    const filtered = list.filter((h: any) => h.date !== newHolidayDate);
    filtered.push({
      date: newHolidayDate,
      name: newHolidayName.trim(),
      factor: Number(newHolidayFactor || 0),
    });
    filtered.sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));
    setPolicies({ ...policies, holidays: filtered });
    setNewHolidayDate('');
    setNewHolidayName('');
    setNewHolidayFactor(0);
  }

  function removeHoliday(dateStr: string) {
    const list = Array.isArray(policies?.holidays) ? policies.holidays.filter((h: any) => h.date !== dateStr) : [];
    setPolicies({ ...policies, holidays: list });
  }

  function updateBulkCap(secKey: string, val: number) {
    setPolicies((prev: any) => ({
      ...prev,
      bulk: {
        ...prev.bulk,
        [secKey]: { ...(prev.bulk?.[secKey] || {}), dailyCapacity: Number(val || 0) },
      },
    }));
  }

  function updateSamplePol(secKey: string, field: string, val: number) {
    setPolicies((prev: any) => ({
      ...prev,
      sample: {
        ...prev.sample,
        [secKey]: { ...(prev.sample?.[secKey] || {}), [field]: Number(val || 0) },
      },
    }));
  }

  const thresholds = data?.thresholds || { greenMax: 85, amberMax: 100 };
  const rows = data?.rows || [];
  const sampleRows = data?.sampleRows || [];
  const holidays = policies?.holidays || data?.holidays || [];
  const monthHolidays = holidays.filter((h: any) => !month || String(h.date || '').startsWith(month));

  return (
    <Shell
      title="Capacity Balancing & Holiday Calendar (Bulk & Sample)"
      eyebrow="Central Planning • Sunday Weekly Off & Holiday Calendar"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold uppercase tracking-wider text-slate-400">Central Planning Flow:</span>
          <Link href="/modules/ta" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-cyan-400">
            1. Time & Action (T&A)
          </Link>
          <span className="text-slate-600">→</span>
          <Link href="/modules/planning-approvals" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-cyan-400">
            2. Approval Desk & Release
          </Link>
          <span className="text-slate-600">→</span>
          <span className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-semibold text-cyan-200">
            3. Capacity & Holiday Calendar
          </span>
          <span className="text-slate-600">→</span>
          <Link href="/modules/sewing-planning" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-cyan-400">
            4. Sewing Line Gantt
          </Link>
          <span className="text-slate-600">→</span>
          <Link href="/modules/subcontract" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-cyan-400">
            5. Subcontract Follow-up
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-200">
            Weekly Holiday: SUNDAY (Knitting 50% · Other Sections Off)
          </span>
          <span className="text-slate-400">Target Month:</span>
          <input
            type="month"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              load(e.target.value);
            }}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-white"
          />
          <button
            onClick={() => setEditingHolidays((v) => !v)}
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-amber-200 hover:bg-amber-500/20"
          >
            {editingHolidays ? 'Close Holiday Calendar' : `Holiday Calendar (${holidays.length})`}
          </button>
          <button
            onClick={() => setEditingPolicies((v) => !v)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-cyan-400"
          >
            {editingPolicies ? 'Close Policy Editor' : 'Customize Section Capacities'}
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">{message}</div>
      )}
      {error && <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>}

      {editingHolidays && policies && (
        <div className="mb-4 rounded-2xl border border-amber-500/30 bg-slate-900 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white">Factory Holiday & Closure Calendar (Eid, National Holidays & Shutdowns)</h3>
              <p className="text-xs text-slate-400">
                Weekly holiday is fixed to <strong className="text-amber-200">Sunday</strong> (`getUTCDay() === 0`, Knitting 0.5x, other sections 0x). Any date listed below reduces slot working days automatically.
              </p>
            </div>
            <button
              onClick={savePolicies}
              disabled={saving}
              className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Holiday Calendar & Recalculate'}
            </button>
          </div>

          <div className="mb-4 grid gap-2 md:grid-cols-4">
            <input
              type="date"
              value={newHolidayDate}
              onChange={(e) => setNewHolidayDate(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Holiday / Closure Name (e.g., Eid-ul-Fitr Closure)"
              value={newHolidayName}
              onChange={(e) => setNewHolidayName(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white md:col-span-2"
            />
            <div className="flex gap-2">
              <select
                value={newHolidayFactor}
                onChange={(e) => setNewHolidayFactor(Number(e.target.value))}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white"
              >
                <option value={0}>Full Closure (0% Cap)</option>
                <option value={0.5}>Half Day (50% Cap)</option>
              </select>
              <button
                type="button"
                onClick={addHoliday}
                className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
              >
                + Add Date
              </button>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
            {holidays.map((h: any) => (
              <div
                key={h.date}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs"
              >
                <div>
                  <div className="font-mono font-semibold text-amber-200">{h.date}</div>
                  <div className="text-[11px] text-slate-300">{h.name}</div>
                  <div className="text-[10px] text-slate-500">{Number(h.factor || 0) === 0 ? 'Full Factory Closure' : `${Number(h.factor) * 100}% Working`}</div>
                </div>
                <button
                  onClick={() => removeHoliday(h.date)}
                  className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-300 hover:bg-rose-500/20"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingPolicies && policies && (
        <div className="mb-4 rounded-2xl border border-cyan-500/30 bg-slate-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Customizable Section Capacity Policies</h3>
              <p className="text-xs text-slate-400">
                Adjust daily bulk section capacities and sample slot policies. Changes recalculate slot heatmaps immediately.
              </p>
            </div>
            <button
              onClick={savePolicies}
              disabled={saving}
              className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Policies'}
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {Object.entries(policies.bulk || {}).map(([key, val]: [string, any]) => (
              <div key={key} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
                <div className="text-slate-400">{val.label}</div>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    value={val.dailyCapacity || 0}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => updateBulkCap(key, Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-white"
                  />
                  <span className="text-slate-500">{val.unit}/day</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-4 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="text-slate-400">Sample Knitting (Daily Kg / Colors)</div>
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  value={policies.sample?.knitting?.dailyKg || 200}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => updateSamplePol('knitting', 'dailyKg', Number(e.target.value))}
                  className="w-1/2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                />
                <input
                  type="number"
                  value={policies.sample?.knitting?.dailyColors || 20}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => updateSamplePol('knitting', 'dailyColors', Number(e.target.value))}
                  className="w-1/2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                />
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="text-slate-400">Sample Dyeing (Slot / PP / SMS)</div>
              <div className="mt-1 flex gap-1.5">
                <input
                  type="number"
                  value={policies.sample?.dyeing?.slotCapacity || 150}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => updateSamplePol('dyeing', 'slotCapacity', Number(e.target.value))}
                  className="w-1/3 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                />
                <input
                  type="number"
                  value={policies.sample?.dyeing?.ppDevelopmentSlot || 50}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => updateSamplePol('dyeing', 'ppDevelopmentSlot', Number(e.target.value))}
                  className="w-1/3 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                />
                <input
                  type="number"
                  value={policies.sample?.dyeing?.smsSlot || 100}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => updateSamplePol('dyeing', 'smsSlot', Number(e.target.value))}
                  className="w-1/3 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                />
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="text-slate-400">Sample Printing (Daily Styles / Pcs)</div>
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  value={policies.sample?.printing?.dailyStyles || 5}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => updateSamplePol('printing', 'dailyStyles', Number(e.target.value))}
                  className="w-1/2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                />
                <input
                  type="number"
                  value={policies.sample?.printing?.dailyPcs || 500}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => updateSamplePol('printing', 'dailyPcs', Number(e.target.value))}
                  className="w-1/2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                />
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="text-slate-400">Sample Making (Monthly Styles)</div>
              <div className="mt-1">
                <input
                  type="number"
                  value={policies.sample?.making?.monthlyStyles || 450}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => updateSamplePol('making', 'monthlyStyles', Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {monthHolidays.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-200">
          <span className="font-semibold">Factory Closures in {month}:</span>
          {monthHolidays.map((h: any) => (
            <span key={h.date} className="rounded border border-amber-500/40 bg-slate-950/60 px-2 py-0.5">
              {h.date} — {h.name}
            </span>
          ))}
        </div>
      )}

      {/* Bulk Capacity Heatmap */}
      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">1. Bulk Production Capacity vs Booked Load ({data?.month || month})</h2>
            <p className="text-xs text-slate-400">
              10-Day Slots: Slot 1 (1–10), Slot 2 (11–20), Slot 3 (21–End). Sunday is weekly holiday. Click any slot card to inspect top contributing jobs.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-emerald-200">
              Normal ≤ {thresholds.greenMax}%
            </span>
            <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-amber-200">
              Attention {thresholds.greenMax + 1}–{thresholds.amberMax}%
            </span>
            <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 text-rose-200">
              Overload &gt; {thresholds.amberMax}%
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2.5 pr-3">Section</th>
                <th className="py-2.5 px-2">Daily Policy</th>
                <th className="py-2.5 px-2">Slot 1 (Days 1–10)</th>
                <th className="py-2.5 px-2">Slot 2 (Days 11–20)</th>
                <th className="py-2.5 px-2">Slot 3 (Days 21–End)</th>
                <th className="py-2.5 pl-3">Monthly Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {rows.map((r: any) => {
                const mPill = statusPill(r.monthLoadPct, thresholds);
                return (
                  <tr key={r.section} className="hover:bg-slate-950/40">
                    <td className="py-3 pr-3">
                      <div className="font-semibold text-white">{r.label}</div>
                      <div className="text-[11px] text-slate-500">
                        Unit: {r.unit} · Sunday: {Number(r.sundayFactor || 0) * 100}%
                      </div>
                    </td>
                    <td className="py-3 px-2 font-mono text-slate-300">
                      {fmt(r.dailyCapacity)} {r.unit}/day
                    </td>
                    {(r.slots || []).map((sl: any) => {
                      const pill = statusPill(sl.loadPct, thresholds);
                      return (
                        <td key={sl.slot} className="py-2.5 px-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCell({ section: r.label, slot: sl })}
                            className={`w-full rounded-xl border p-2.5 text-left transition hover:brightness-110 ${pill.bg}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">{sl.loadPct}%</span>
                              <span className="text-[10px] uppercase tracking-wider">
                                {sl.jobs} jobs · {sl.workDays}d
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-950/60">
                              <div className={`h-full ${pill.bar}`} style={{ width: `${Math.min(100, sl.loadPct)}%` }} />
                            </div>
                            <div className="mt-1.5 flex justify-between text-[11px] opacity-90">
                              <span>
                                Load: {fmt(sl.demand)} {r.unit}
                              </span>
                              <span>Cap: {fmt(sl.capacity)}</span>
                            </div>
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-3 pl-3">
                      <div className={`rounded-xl border p-2.5 ${mPill.bg}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{r.monthLoadPct}%</span>
                          <span className="text-[10px]">{mPill.label}</span>
                        </div>
                        <div className="mt-1 text-[11px]">
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

      {selectedCell && (
        <div className="mb-6 rounded-2xl border border-cyan-500/30 bg-slate-900 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                {selectedCell.section} — {selectedCell.slot.slot} ({selectedCell.slot.loadPct}% Load · {selectedCell.slot.workDays} Working Days)
              </h3>
              <p className="text-xs text-slate-400">
                Booked Demand: {fmt(selectedCell.slot.demand)} vs Capacity: {fmt(selectedCell.slot.capacity)} (Balance: {fmt(selectedCell.slot.balance)})
              </p>
            </div>
            <button
              onClick={() => setSelectedCell(null)}
              className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
            >
              Close
            </button>
          </div>
          {selectedCell.slot.topJobs?.length ? (
            <div className="grid gap-2 md:grid-cols-4">
              {selectedCell.slot.topJobs.map((j: any, i: number) => (
                <div key={i} className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs">
                  <div className="font-semibold text-cyan-300">
                    Job {j.jobNo} · {j.styleNo}
                  </div>
                  <div className="text-slate-400">{j.buyer}</div>
                  <div className="mt-1 flex justify-between text-slate-300">
                    <span>Demand: {fmt(j.demand)}</span>
                    <span>Due: {j.date}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500">No jobs scheduled in this slot.</div>
          )}
        </div>
      )}

      {/* Sample Capacity Heatmap */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-white">2. Sample Section Capacity Policy & Slot Allocation</h2>
          <p className="text-xs text-slate-400">
            Standard sample capacities: Knitting 200 Kg / 20 colors per day, Dyeing 150 colors / 10-day slot (50 PP/Dev + 100 SMS), Printing 5 styles / 500 pcs per day, Sample Making 450 styles/month.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2 pr-3">Sample Section</th>
                <th className="py-2 px-2">Agreed Factory Policy</th>
                <th className="py-2 px-2">Slot 1 (1–10)</th>
                <th className="py-2 px-2">Slot 2 (11–20)</th>
                <th className="py-2 px-2">Slot 3 (21–End)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {sampleRows.map((sr: any) => (
                <tr key={sr.section}>
                  <td className="py-3 pr-3 font-semibold text-white">{sr.label}</td>
                  <td className="py-3 px-2 text-cyan-200">{sr.policyText}</td>
                  {(sr.slots || []).map((sl: any) => {
                    const pill = statusPill(sl.loadPct, thresholds);
                    return (
                      <td key={sl.slot} className="py-2.5 px-2">
                        <div className={`rounded-xl border p-2.5 ${pill.bg}`}>
                          <div className="flex justify-between font-semibold text-white">
                            <span>{sl.loadPct}%</span>
                            <span className="text-[11px]">{sl.demandText}</span>
                          </div>
                          <div className="mt-1 text-[11px] opacity-80">Cap: {sl.capacityText}</div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
