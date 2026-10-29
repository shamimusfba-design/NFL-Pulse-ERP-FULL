'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';
import { displayJobNo } from '../../../lib/display';

function d(val?: string | null) {
  if (!val) return '';
  return String(val).slice(0, 10);
}

// Bug Fix: Sort all POs and return the EARLIEST CCD across all POs, matching the backend
function firstCcd(style: any): string | null {
  const pos = (style?.purchaseOrders || [])
    .map((p: any) => d(p?.ccd || p?.shipmentDate))
    .filter(Boolean) as string[];
  if (!pos.length) return null;
  pos.sort();
  return pos[0];
}

function diffDays(fromIso?: string | null, toIso?: string | null): number | null {
  if (!fromIso || !toIso) return null;
  const a = new Date(`${fromIso.slice(0, 10)}T00:00:00Z`).getTime();
  const b = new Date(`${toIso.slice(0, 10)}T00:00:00Z`).getTime();
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

function addDays(iso: string, delta: number): string {
  const dt = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

const PROCESS_ROWS = [
  { key: 'orderConfirm', label: 'Order Confirm', section: 'MERCH', startField: 'orderConfirmDate', endField: 'orderConfirmDate', toggleKey: null, canOutside: false },
  { key: 'yarnInhouse', label: 'Yarn In-house', section: 'YARN STORE', startField: 'yarnInhouseDate', endField: 'yarnInhouseDate', toggleKey: null, canOutside: false },
  { key: 'yarnDyeing', label: 'Yarn Dyeing (Y/D)', section: 'YARN DYEING', startField: 'yarnDyeingStart', endField: 'yarnDyeingEnd', toggleKey: 'yarnDyeing', canOutside: true },
  { key: 'knitting', label: 'Knitting (Greige)', section: 'KNITTING', startField: 'knittingStart', endField: 'knittingEnd', toggleKey: 'knitting', canOutside: true },
  { key: 'dyeing', label: 'Dyeing & Finishing', section: 'DYEING', startField: 'dyeingFinishingStart', endField: 'dyeingFinishingEnd', toggleKey: 'dyeing', canOutside: true },
  { key: 'trimsInhouse', label: 'Trims & Accessories In-house *', section: 'TRIMS STORE', startField: 'trimsInhouseDate', endField: 'trimsInhouseDate', toggleKey: null, canOutside: false },
  { key: 'ppSample', label: 'PP Sample Approval', section: 'SAMPLE', startField: 'ppSampleApprovalDate', endField: 'ppSampleApprovalDate', toggleKey: null, canOutside: false },
  { key: 'fileHandover', label: 'File Handover to Production *', section: 'MERCH / CAD', startField: 'fileHandoverDate', endField: 'fileHandoverDate', toggleKey: null, canOutside: false },
  { key: 'ppMeeting', label: 'PP Meeting', section: 'QUALITY / IE', startField: 'ppMeetingDate', endField: 'ppMeetingDate', toggleKey: null, canOutside: false },
  { key: 'testCutting', label: 'Test Cutting / Size Set', section: 'CUTTING', startField: 'testCuttingDate', endField: 'testCuttingDate', toggleKey: null, canOutside: false },
  { key: 'cutting', label: 'Bulk Cutting', section: 'CUTTING', startField: 'cuttingStart', endField: 'cuttingEnd', toggleKey: null, canOutside: false },
  { key: 'printing', label: 'Printing', section: 'PRINTING', startField: 'printingStart', endField: 'printingEnd', toggleKey: 'printing', canOutside: true },
  { key: 'embroidery', label: 'Embroidery', section: 'EMBROIDERY', startField: 'embroideryStart', endField: 'embroideryEnd', toggleKey: 'embroidery', canOutside: true },
  { key: 'sewing', label: 'Sewing Line Input & Output *', section: 'SEWING', startField: 'sewingStartDate', endField: 'sewingEndDate', toggleKey: null, canOutside: false },
  { key: 'wash', label: 'Garment Wash', section: 'WASH', startField: 'washStart', endField: 'washEnd', toggleKey: 'wash', canOutside: true },
  { key: 'finishing', label: 'Finishing & Packing', section: 'FINISHING', startField: 'finishingStart', endField: 'finishingEnd', toggleKey: null, canOutside: false },
  { key: 'finalInspection', label: 'Final Inspection (FRI)', section: 'QUALITY', startField: 'finalInspection', endField: 'finalInspection', toggleKey: null, canOutside: false },
  { key: 'exFactory', label: 'Ex-Factory', section: 'SHIPMENT', startField: 'exFactoryDate', endField: 'exFactoryDate', toggleKey: null, canOutside: false },
  { key: 'ccd', label: 'Cargo Closing Date (Earliest CCD)', section: 'SHIPMENT', startField: 'cargoClosingDate', endField: 'cargoClosingDate', toggleKey: null, canOutside: false },
] as const;

export default function TaPage() {
  const [activeTab, setActiveTab] = useState<'TNA' | 'RISK_LIST' | 'FABRIC_TRIMS' | 'SAMPLE_PLAN' | 'SHIPMENT_MTG'>('TNA');
  const [queue, setQueue] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [order, setOrder] = useState<any>(null);
  const [plans, setPlans] = useState<Record<string, any>>({});
  const [replanReason, setReplanReason] = useState<string>('');
  const [capacityOverride, setCapacityOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overloadedSlots, setOverloadedSlots] = useState<any[]>([]);
  const [showBaselineCompare, setShowBaselineCompare] = useState(false);

  // Control Tower Data (Risk List, Fabric/Trims, Sample Planning, Shipment Meetings)
  const [controlTower, setControlTower] = useState<any>(null);
  const [editingFabTrims, setEditingFabTrims] = useState<any>(null);
  const [editingSample, setEditingSample] = useState<any>(null);
  const [editingMeeting, setEditingMeeting] = useState<any>(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadQueue() {
    setError('');
    try {
      const [data, ct] = await Promise.all([
        api('/planning/ta/workqueue'),
        api('/planning/control-tower'),
      ]);
      const list = Array.isArray(data) ? data : [];
      setQueue(list);
      setControlTower(ct);
      if (!selectedOrderId && list[0]?.order?.id) {
        await selectOrder(list[0].order.id);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load T&A workqueue');
    }
  }

  async function selectOrder(orderId: string) {
    setSelectedOrderId(orderId);
    setError('');
    setMessage('');
    setOverloadedSlots([]);
    try {
      const res = await api(`/planning/ta/orders/${orderId}`);
      setOrder(res.order);
      const next: Record<string, any> = {};
      for (const s of res.order.styles || []) {
        const p = s.taPlan || s.autoPlan || {};
        const ccd = firstCcd(s) || d(p.cargoClosingDate);
        next[s.id] = {
          styleId: s.id,
          taStatus: p.taStatus || 'DRAFT',
          taVersion: Number(p.taVersion || 1),
          orderConfirmDate: d(p.orderConfirmDate),
          taPlanDate: d(p.taPlanDate) || new Date().toISOString().slice(0, 10),
          yarnInhouseDate: d(p.yarnInhouseDate),
          yarnDyeingStart: d(p.yarnDyeingStart),
          yarnDyeingEnd: d(p.yarnDyeingEnd),
          knittingStart: d(p.knittingStart),
          knittingEnd: d(p.knittingEnd),
          dyeingFinishingStart: d(p.dyeingFinishingStart),
          dyeingFinishingEnd: d(p.dyeingFinishingEnd),
          printingStart: d(p.printingStart),
          printingEnd: d(p.printingEnd),
          embroideryStart: d(p.embroideryStart),
          embroideryEnd: d(p.embroideryEnd),
          washStart: d(p.washStart),
          washEnd: d(p.washEnd),
          trimsInhouseDate: d(p.trimsInhouseDate),
          ppSampleApprovalDate: d(p.ppSampleApprovalDate),
          fileHandoverDate: d(p.fileHandoverDate),
          ppMeetingDate: d(p.ppMeetingDate),
          testCuttingDate: d(p.testCuttingDate),
          cuttingStart: d(p.cuttingStart),
          cuttingEnd: d(p.cuttingEnd),
          sewingStartDate: d(p.sewingStartDate),
          sewingEndDate: d(p.sewingEndDate),
          finishingStart: d(p.finishingStart),
          finishingEnd: d(p.finishingEnd),
          finalInspection: d(p.finalInspection),
          exFactoryDate: d(p.exFactoryDate),
          cargoClosingDate: ccd,
          fabricRequiredKg: Number(p.fabricRequiredKg || 500),
          applicableProcesses: p.applicableProcesses || {
            yarnDyeing: false,
            knitting: true,
            dyeing: true,
            printing: false,
            embroidery: false,
            wash: false,
          },
          outsidePlan: p.outsidePlan || {},
          actualDates: p.actualDates || {},
          activityTracking: p.activityTracking || {},
          baselinePlan: p.baselinePlan || null,
          replanHistory: Array.isArray(p.replanHistory) ? p.replanHistory : [],
          remarks: p.remarks || '',
        };
      }
      setPlans(next);
    } catch (e: any) {
      setError(e.message || 'Failed to load order T&A');
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      const ord = item.order;
      if (!ord) return false;
      const styles = ord.styles || [];
      const allApproved = styles.length > 0 && styles.every((s: any) => s.sourceMetadata?.planning?.taStatus === 'APPROVED');
      if (statusFilter === 'APPROVED' && !allApproved) return false;
      if (statusFilter === 'PENDING' && allApproved) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const hay = `${ord.jobNo || ''} ${ord.buyer?.name || ''} ${styles.map((s: any) => s.styleNo).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [queue, search, statusFilter]);

  function setStyleField(styleId: string, field: string, value: any) {
    setPlans((prev) => ({
      ...prev,
      [styleId]: { ...(prev[styleId] || { styleId }), [field]: value },
    }));
  }

  function setActualDate(styleId: string, endField: string, rowKey: string, value: string) {
    setPlans((prev) => {
      const cur = prev[styleId] || { styleId };
      const nextActuals = { ...(cur.actualDates || {}), [endField]: value };
      const curTrack = cur.activityTracking?.[rowKey] || {};
      const plannedEnd = cur[endField];
      const variance = plannedEnd && value ? diffDays(plannedEnd, value) : null;
      const autoStatus = value
        ? variance !== null && variance > 0
          ? 'DELAYED'
          : 'DONE'
        : curTrack.status || 'PENDING';
      return {
        ...prev,
        [styleId]: {
          ...cur,
          actualDates: nextActuals,
          activityTracking: {
            ...(cur.activityTracking || {}),
            [rowKey]: {
              ...curTrack,
              actualFinish: value,
              status: autoStatus,
            },
          },
        },
      };
    });
  }

  function setActivityTracking(styleId: string, rowKey: string, field: string, value: any) {
    setPlans((prev) => {
      const cur = prev[styleId] || { styleId };
      const curTrack = cur.activityTracking?.[rowKey] || {};
      return {
        ...prev,
        [styleId]: {
          ...cur,
          activityTracking: {
            ...(cur.activityTracking || {}),
            [rowKey]: {
              ...curTrack,
              [field]: value,
            },
          },
        },
      };
    });
  }

  function toggleProcess(styleId: string, procKey: string, enabled: boolean) {
    setPlans((prev) => {
      const cur = prev[styleId] || { styleId };
      return {
        ...prev,
        [styleId]: {
          ...cur,
          applicableProcesses: { ...(cur.applicableProcesses || {}), [procKey]: enabled },
        },
      };
    });
  }

  function updateOutside(styleId: string, procKey: string, patch: Record<string, any>) {
    setPlans((prev) => {
      const cur = prev[styleId] || { styleId };
      const existing = cur.outsidePlan?.[procKey] || { outside: false, vendor: '', dailyCapacity: 4000 };
      return {
        ...prev,
        [styleId]: {
          ...cur,
          outsidePlan: {
            ...(cur.outsidePlan || {}),
            [procKey]: { ...existing, ...patch },
          },
        },
      };
    });
  }

  async function autoCalculateStyle(styleId: string) {
    if (!order) return;
    setError('');
    setMessage('');
    try {
      const cur = plans[styleId] || {};
      const res = await api('/planning/ta/auto-plan', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.id,
          styleId,
          overrides: {
            orderConfirmDate: cur.orderConfirmDate,
            fabricRequiredKg: cur.fabricRequiredKg,
            applicableProcesses: cur.applicableProcesses,
            outsidePlan: cur.outsidePlan,
          },
        }),
      });
      const generated = res.plans?.[0]?.plan;
      if (generated) {
        setPlans((prev) => ({
          ...prev,
          [styleId]: {
            ...prev[styleId],
            ...generated,
            styleId,
          },
        }));
        setMessage('Backward T&A schedule (including Test Cutting / Size Set) recalculated from earliest CCD.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to auto-calculate T&A');
    }
  }

  async function save(approve: boolean) {
    if (!order) return;
    setSaving(true);
    setError('');
    setMessage('');
    setOverloadedSlots([]);
    try {
      const stylesPayload = Object.values(plans).map((p: any) => ({
        ...p,
        replanReason: replanReason.trim() || p.replanReason || undefined,
      }));
      const res = await api('/planning/ta', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.id,
          approve,
          capacityOverride,
          overrideReason: overrideReason || undefined,
          replanReason: replanReason.trim() || undefined,
          styles: stylesPayload,
        }),
      });
      setOrder(res.order);
      if (res.capacityCheck?.overloadedSlots?.length) {
        setOverloadedSlots(res.capacityCheck.overloadedSlots);
      }
      setMessage(
        approve
          ? `T&A approved for ${displayJobNo(order.jobNo)}. Downstream section tasks created (Knitting, Dyeing, Trims, CAD, Test Cutting, Bulk Cutting, Sewing, Finishing) & Gantt auto-loaded.`
          : `T&A saved for ${displayJobNo(order.jobNo)}.`
      );
      setReplanReason('');
      await loadQueue();
    } catch (e: any) {
      setError(e.message || 'Failed to save T&A');
    } finally {
      setSaving(false);
    }
  }

  async function saveFabricTrimsModal() {
    if (!editingFabTrims) return;
    setSaving(true);
    setError('');
    try {
      await api('/planning/fabric-trims-followup', {
        method: 'POST',
        body: JSON.stringify(editingFabTrims),
      });
      setMessage(`Weekly Fabric & Trims follow-up updated for Job #${editingFabTrims.jobNo}.`);
      setEditingFabTrims(null);
      await loadQueue();
    } catch (e: any) {
      setError(e.message || 'Failed to save Fabric & Trims follow-up');
    } finally {
      setSaving(false);
    }
  }

  async function saveSampleModal() {
    if (!editingSample) return;
    setSaving(true);
    setError('');
    try {
      await api('/planning/sample-planning', {
        method: 'POST',
        body: JSON.stringify(editingSample),
      });
      setMessage(`Sample TNA & Dispatch updated for Job #${editingSample.jobNo}.`);
      setEditingSample(null);
      await loadQueue();
    } catch (e: any) {
      setError(e.message || 'Failed to save Sample Planning');
    } finally {
      setSaving(false);
    }
  }

  async function saveMeetingModal() {
    if (!editingMeeting) return;
    setSaving(true);
    setError('');
    try {
      await api('/planning/shipment-meetings', {
        method: 'POST',
        body: JSON.stringify(editingMeeting),
      });
      setMessage(`Shipment Meeting decision & action items recorded for Job #${editingMeeting.jobNo}.`);
      setEditingMeeting(null);
      await loadQueue();
    } catch (e: any) {
      setError(e.message || 'Failed to save Shipment Meeting record');
    } finally {
      setSaving(false);
    }
  }

  const riskList = controlTower?.riskList || [];
  const fabricTrimsList = controlTower?.fabricTrimsTracker || [];
  const samplePlanningList = controlTower?.samplePlanning || [];
  const shipmentMeetings = controlTower?.shipmentMeetings || [];
  const buyerQuota = controlTower?.buyerQuota || [];

  return (
    <Shell
      title="Time & Action (T&A) & Planning Control Tower"
      eyebrow="Central Planning • Backward Schedule, Plan vs Actual, Critical Path & Follow-up"
    >
      {/* Top Flow Navigation & Tab Switcher */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold uppercase tracking-wider text-slate-400">Central Planning Flow:</span>
          <span className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-semibold text-cyan-200">
            1. Time & Action (T&A)
          </span>
          <span className="text-slate-600">→</span>
          <Link href="/modules/planning-approvals" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-cyan-400">
            2. Approval Desk & Release
          </Link>
          <span className="text-slate-600">→</span>
          <Link href="/modules/capacity" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-cyan-400">
            3. Capacity & Holiday Calendar
          </Link>
          <span className="text-slate-600">→</span>
          <Link href="/modules/sewing-planning" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-cyan-400">
            4. Sewing Line Gantt
          </Link>
          <span className="text-slate-600">→</span>
          <Link href="/modules/subcontract" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-cyan-400">
            5. Subcontract Follow-up
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'TNA', label: '1. Bulk T&A (Plan vs Actual)' },
            { id: 'RISK_LIST', label: `2. Critical Path & Risk List (${riskList.filter((r: any) => r.riskLevel !== 'ON_TRACK').length})` },
            { id: 'FABRIC_TRIMS', label: '3. Fabric & Trims Follow-up' },
            { id: 'SAMPLE_PLAN', label: '4. Sample Planning & Quota' },
            { id: 'SHIPMENT_MTG', label: `5. Shipment Meetings (${shipmentMeetings.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`rounded-xl px-3 py-1.5 font-semibold transition ${
                activeTab === t.id
                  ? 'bg-cyan-500 text-slate-950'
                  : 'border border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">{message}</div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>
      )}

      {/* TAB 1: BULK T&A SCHEDULE (PLAN VS ACTUAL, RE-PLAN VERSIONING & TEST CUTTING) */}
      {activeTab === 'TNA' && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Workqueue */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 lg:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Planning Workqueue</h2>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">{filteredQueue.length} jobs</span>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Job, Buyer, Style..."
              className="mb-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            />
            <div className="mb-3 flex gap-1 text-[11px]">
              {(['ALL', 'PENDING', 'APPROVED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`flex-1 rounded-lg py-1 font-medium ${
                    statusFilter === st ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="max-h-[680px] space-y-2 overflow-y-auto pr-1">
              {filteredQueue.map((task) => {
                const ord = task.order;
                const styles = ord?.styles || [];
                const allApproved = styles.length > 0 && styles.every((s: any) => s.sourceMetadata?.planning?.taStatus === 'APPROVED');
                const earliestOrderCcd = styles.map((s: any) => firstCcd(s)).filter(Boolean).sort()[0] || '—';
                const ver = styles[0]?.sourceMetadata?.planning?.taVersion || 1;
                return (
                  <button
                    key={task.id}
                    onClick={() => ord?.id && selectOrder(ord.id)}
                    className={`w-full rounded-xl border p-3 text-left text-xs transition ${
                      selectedOrderId === ord?.id
                        ? 'border-cyan-400 bg-cyan-500/10 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-white">{displayJobNo(ord?.jobNo)}</span>
                      <div className="flex items-center gap-1">
                        <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                          v{ver}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            allApproved
                              ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
                              : 'border border-amber-500/30 bg-amber-500/15 text-amber-200'
                          }`}
                        >
                          {allApproved ? 'APPROVED' : 'DRAFT'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 text-slate-400">
                      {ord?.buyer?.name} · {styles.map((s: any) => s.styleNo).join(', ')}
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                      <span>{styles.reduce((sum: number, s: any) => sum + Number(s.quantity || 0), 0).toLocaleString()} pcs</span>
                      <span className="text-cyan-300/90">Earliest CCD: {earliestOrderCcd}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Workspace */}
          <div className="space-y-4 lg:col-span-9">
            {overloadedSlots.length > 0 && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                <div className="font-semibold">Capacity Overload Warning ({overloadedSlots.length} slots exceed threshold):</div>
                <ul className="mt-1 list-disc pl-5">
                  {overloadedSlots.map((sl, i) => (
                    <li key={i}>
                      {sl.section} — {sl.month} Slot {sl.slot}: {sl.loadPct}% ({Number(sl.demand).toLocaleString()} / {Number(sl.capacity).toLocaleString()})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {order ? (
              <div className="space-y-5">
                {/* Order Header & Actions */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-cyan-400">{order.buyer?.name}</div>
                      <h3 className="text-lg font-bold text-white">
                        {displayJobNo(order.jobNo)} — T&A Schedule, Actuals & Re-Plan Control
                      </h3>
                      <p className="text-xs text-slate-400">
                        Backward scheduled from the <strong className="text-cyan-300">earliest PO CCD</strong>. Includes Test Cutting / Size Set, Actual Dates, Delay Reasons, and Re-plan Version control.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowBaselineCompare((v) => !v)}
                        className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/20"
                      >
                        {showBaselineCompare ? 'Hide Baseline v1' : 'Compare vs Baseline v1'}
                      </button>
                      <button
                        onClick={() => save(false)}
                        disabled={saving}
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white hover:border-cyan-400 disabled:opacity-50"
                      >
                        Save Plan / Actuals
                      </button>
                      <button
                        onClick={() => save(true)}
                        disabled={saving}
                        className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                      >
                        Approve T&A & Create Section Tasks
                      </button>
                    </div>
                  </div>

                  {/* Re-plan Reason & Capacity Override Strip */}
                  <div className="mt-3 grid gap-3 border-t border-slate-800 pt-3 text-xs md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap font-semibold text-amber-300">Re-plan Reason (if approved):</span>
                      <input
                        type="text"
                        value={replanReason}
                        onChange={(e) => setReplanReason(e.target.value)}
                        placeholder="Required when changing planned dates on an approved T&A (e.g., Yarn lot delay)..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-slate-300">
                        <input
                          type="checkbox"
                          checked={capacityOverride}
                          onChange={(e) => setCapacityOverride(e.target.checked)}
                        />
                        Allow Capacity Override
                      </label>
                      {capacityOverride && (
                        <input
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          placeholder="Override reason..."
                          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-white"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Style-wise T&A Cards */}
                {(order.styles || []).map((style: any) => {
                  const p = plans[style.id] || {};
                  const ccd = firstCcd(style) || p.cargoClosingDate;
                  const proc = p.applicableProcesses || {};
                  const outside = p.outsidePlan || {};
                  const actualDates = p.actualDates || {};
                  const tracking = p.activityTracking || {};
                  const baseline = p.baselinePlan || {};
                  const cp = style.criticalPathAnalysis || {};
                  const totalLeadDays = diffDays(p.orderConfirmDate, p.exFactoryDate);

                  return (
                    <div key={style.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                      {/* Style Summary Header */}
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-bold text-white">{style.styleNo}</span>
                            <span className="rounded-lg bg-slate-800 px-2.5 py-0.5 text-xs text-slate-200">
                              {Number(style.quantity || 0).toLocaleString()} pcs
                            </span>
                            <span className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-medium text-cyan-200">
                              Earliest CCD: {ccd || 'Not set'}
                            </span>
                            <span className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 font-mono text-xs font-bold text-indigo-200">
                              Version v{p.taVersion || 1} ({p.taStatus || 'DRAFT'})
                            </span>
                            {totalLeadDays !== null && (
                              <span className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-0.5 text-xs text-slate-300">
                                Lead Time: {totalLeadDays} days
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            {style.itemDescription || 'Garment Style'} · POs:{' '}
                            {(style.purchaseOrders || [])
                              .map((po: any) => `${po.poNumber} (CCD: ${d(po.ccd || po.shipmentDate)})`)
                              .join(', ') || 'Direct Order'}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs">
                            <span className="text-slate-400">Fabric Req (Kg):</span>
                            <input
                              type="number"
                              value={p.fabricRequiredKg || 0}
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) => setStyleField(style.id, 'fabricRequiredKg', Number(e.target.value))}
                              className="w-20 bg-transparent font-mono text-white focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => autoCalculateStyle(style.id)}
                            className="rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
                          >
                            ⚡ Auto-Calculate Backward from Earliest CCD
                          </button>
                        </div>
                      </div>

                      {/* Critical Path & Projected Shipment Alert Banner */}
                      {cp && (
                        <div
                          className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-xs ${
                            cp.riskLevel === 'CRITICAL'
                              ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                              : cp.riskLevel === 'AT_RISK'
                              ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                          }`}
                        >
                          <div>
                            <div className="font-bold">
                              Critical Path Status: {cp.riskLevel} · Planned Ex-Factory: {cp.plannedExFactoryDate || p.exFactoryDate} → Projected Ex-Factory:{' '}
                              <span className="underline">{cp.projectedExFactoryDate || p.exFactoryDate}</span> (Projected Shipment: {cp.projectedShipmentDate || ccd})
                            </div>
                            <div className="mt-0.5 text-[11px] opacity-90">
                              Critical Path Chain: {(cp.criticalPathLabels || []).join(' → ') || 'Yarn → Knitting → Dyeing → Test Cutting → Bulk Cutting → Sewing → FRI → Ex-Factory'}
                            </div>
                          </div>
                          <div className="font-mono text-xs font-bold">
                            {cp.ccdSlipDays > 0 ? `⚠ CCD SLIP: +${cp.ccdSlipDays} DAYS` : '✓ WITHIN EARLIEST CCD'}
                          </div>
                        </div>
                      )}

                      {/* Applicable Process Toggles */}
                      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs">
                        <span className="font-semibold text-slate-400">Applicable Processes:</span>
                        {[
                          { key: 'yarnDyeing', label: 'Yarn Dyeing (Y/D)' },
                          { key: 'knitting', label: 'Knitting' },
                          { key: 'dyeing', label: 'Dyeing & Finishing' },
                          { key: 'printing', label: 'Printing' },
                          { key: 'embroidery', label: 'Embroidery' },
                          { key: 'wash', label: 'Garment Wash' },
                        ].map((item) => (
                          <label key={item.key} className="flex cursor-pointer items-center gap-1.5 text-slate-200">
                            <input
                              type="checkbox"
                              checked={Boolean(proc[item.key])}
                              onChange={(e) => toggleProcess(style.id, item.key, e.target.checked)}
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>

                      {/* Process-by-Process T&A Table with Actual Dates & Delay Reasons */}
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1120px] text-left text-xs">
                          <thead className="border-b border-slate-800 text-slate-400">
                            <tr>
                              <th className="py-2 pr-2">Process / Milestone</th>
                              <th className="py-2 px-1">Section</th>
                              <th className="py-2 px-1">Planned Start</th>
                              <th className="py-2 px-1">Planned Finish</th>
                              {showBaselineCompare && <th className="py-2 px-1 text-indigo-300">Baseline v1</th>}
                              <th className="py-2 px-1 text-emerald-300">Actual Finish Date</th>
                              <th className="py-2 px-1">Variance</th>
                              <th className="py-2 px-1">Status</th>
                              <th className="py-2 px-1">Delay / Failure Reason</th>
                              <th className="py-2 pl-2">In-house / Outside</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {PROCESS_ROWS.map((r, idx) => {
                              const applicable = r.toggleKey ? Boolean(proc[r.toggleKey]) : true;
                              if (!applicable) {
                                return (
                                  <tr key={r.key} className="opacity-40">
                                    <td className="py-2 pr-2 font-medium text-slate-400">{r.label}</td>
                                    <td className="py-2 px-1 text-slate-500">{r.section}</td>
                                    <td colSpan={showBaselineCompare ? 8 : 7} className="py-2 px-2 italic text-slate-500">
                                      Not applicable for this style
                                    </td>
                                  </tr>
                                );
                              }

                              const startVal = p[r.startField] || '';
                              const endVal = p[r.endField] || '';
                              const isSingleDate = r.startField === r.endField;
                              const outCfg = outside[r.key] || { outside: false, vendor: '' };
                              const actualEnd = tracking[r.key]?.actualFinish || actualDates[r.endField] || '';
                              const variance = endVal && actualEnd ? diffDays(endVal, actualEnd) : null;
                              const rowStatus =
                                tracking[r.key]?.status ||
                                (actualEnd ? (variance !== null && variance > 0 ? 'DELAYED' : 'DONE') : 'PENDING');
                              const delayReason = tracking[r.key]?.delayReason || '';
                              const baselineVal = baseline[r.endField] || '—';

                              return (
                                <tr key={r.key} className="hover:bg-slate-950/50">
                                  <td className="py-2 pr-2 font-medium text-white">
                                    {idx + 1}. {r.label}
                                  </td>
                                  <td className="py-2 px-1">
                                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">{r.section}</span>
                                  </td>
                                  <td className="py-2 px-1">
                                    <input
                                      type="date"
                                      value={startVal}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setStyleField(style.id, r.startField, val);
                                        if (isSingleDate) setStyleField(style.id, r.endField, val);
                                      }}
                                      className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
                                    />
                                  </td>
                                  <td className="py-2 px-1">
                                    {isSingleDate ? (
                                      <span className="font-mono text-slate-400">{startVal || '—'}</span>
                                    ) : (
                                      <input
                                        type="date"
                                        value={endVal}
                                        onChange={(e) => setStyleField(style.id, r.endField, e.target.value)}
                                        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
                                      />
                                    )}
                                  </td>
                                  {showBaselineCompare && (
                                    <td className="py-2 px-1 font-mono text-[11px] text-indigo-300">{baselineVal}</td>
                                  )}
                                  <td className="py-2 px-1">
                                    <input
                                      type="date"
                                      value={actualEnd}
                                      onChange={(e) => setActualDate(style.id, r.endField, r.key, e.target.value)}
                                      className="rounded-lg border border-emerald-500/40 bg-slate-950 px-2 py-1 text-xs text-emerald-200"
                                    />
                                  </td>
                                  <td className="py-2 px-1 font-mono">
                                    {variance !== null ? (
                                      <span
                                        className={`rounded px-1.5 py-0.5 text-[11px] ${
                                          variance > 0
                                            ? 'bg-rose-500/20 text-rose-300'
                                            : variance < 0
                                            ? 'bg-emerald-500/20 text-emerald-300'
                                            : 'bg-slate-800 text-slate-300'
                                        }`}
                                      >
                                        {variance > 0 ? `+${variance}d Late` : variance < 0 ? `${variance}d Early` : 'On Time'}
                                      </span>
                                    ) : (
                                      <span className="text-slate-600">—</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-1">
                                    <select
                                      value={rowStatus}
                                      onChange={(e) => setActivityTracking(style.id, r.key, 'status', e.target.value)}
                                      className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                                        rowStatus === 'FAILED'
                                          ? 'border-rose-500 bg-rose-500/20 text-rose-200'
                                          : rowStatus === 'DELAYED'
                                          ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                                          : rowStatus === 'DONE'
                                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                                          : 'border-slate-700 bg-slate-950 text-slate-300'
                                      }`}
                                    >
                                      <option value="PENDING">PENDING</option>
                                      <option value="IN_PROGRESS">IN PROGRESS</option>
                                      <option value="DONE">DONE</option>
                                      <option value="DELAYED">DELAYED</option>
                                      <option value="FAILED">FAILED</option>
                                    </select>
                                  </td>
                                  <td className="py-2 px-1">
                                    <input
                                      type="text"
                                      value={delayReason}
                                      onChange={(e) => setActivityTracking(style.id, r.key, 'delayReason', e.target.value)}
                                      placeholder={rowStatus === 'DELAYED' || rowStatus === 'FAILED' ? 'Enter delay / failure reason...' : 'Optional note...'}
                                      className="w-44 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
                                    />
                                  </td>
                                  <td className="py-2 pl-2">
                                    {r.canOutside ? (
                                      <div className="flex items-center gap-1.5">
                                        <label className="flex items-center gap-1 text-[11px] text-slate-300">
                                          <input
                                            type="checkbox"
                                            checked={Boolean(outCfg.outside)}
                                            onChange={(e) => updateOutside(style.id, r.key, { outside: e.target.checked })}
                                          />
                                          Outside
                                        </label>
                                        {outCfg.outside && (
                                          <input
                                            placeholder="Vendor"
                                            value={outCfg.vendor || ''}
                                            onChange={(e) => updateOutside(style.id, r.key, { vendor: e.target.value })}
                                            className="w-24 rounded border border-amber-500/40 bg-slate-950 px-1.5 py-0.5 text-[11px] text-amber-200"
                                          />
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[11px] text-slate-500">In-house</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Re-plan History Log */}
                      {Array.isArray(p.replanHistory) && p.replanHistory.length > 0 && (
                        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
                          <div className="font-semibold text-slate-300">T&A Version & Re-Plan History</div>
                          <div className="mt-2 space-y-1.5">
                            {p.replanHistory.map((rh: any, i: number) => (
                              <div key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-1 text-[11px]">
                                <div>
                                  <span className="font-mono font-bold text-cyan-300">v{rh.version}</span> ·{' '}
                                  <span className="text-white">{rh.reason}</span>
                                  {Array.isArray(rh.changedFields) && rh.changedFields.length > 0 && (
                                    <span className="ml-2 text-amber-300">
                                      ({rh.changedFields.map((c: any) => `${c.field}: ${c.from || '—'} → ${c.to || '—'}`).join(', ')})
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono text-slate-500">
                                  {rh.replannedBy} · {String(rh.replannedAt || '').slice(0, 16).replace('T', ' ')}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-sm text-slate-400">
                Select an order from the Central Planning workqueue to prepare, track actuals, or approve its T&A plan.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CRITICAL PATH & SHIPMENT-RISK ALERT LIST */}
      {activeTab === 'RISK_LIST' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-white">Critical Path & Shipment-Risk Alert List</h2>
              <p className="text-xs text-slate-400">
                Automatically flags jobs where delayed or failed T&A milestones push the projected Ex-Factory date past the earliest PO CCD.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2.5 pr-3">Job / Style / Buyer</th>
                  <th className="py-2.5 px-2">Order Qty / T&A Ver</th>
                  <th className="py-2.5 px-2">Planned Ex-Factory</th>
                  <th className="py-2.5 px-2">Projected Ex-Factory</th>
                  <th className="py-2.5 px-2">Earliest CCD</th>
                  <th className="py-2.5 px-2">Delayed / Failed Activities</th>
                  <th className="py-2.5 px-2">Risk Status</th>
                  <th className="py-2.5 pl-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {riskList.map((item: any) => (
                  <tr key={item.styleId} className="hover:bg-slate-950/50">
                    <td className="py-3 pr-3">
                      <div className="font-semibold text-cyan-300">
                        Job #{item.jobNo} · {item.styleNo}
                      </div>
                      <div className="text-[11px] text-slate-400">{item.buyer}</div>
                    </td>
                    <td className="py-3 px-2 font-mono">
                      <div className="text-white">{Number(item.orderQty || 0).toLocaleString()} pcs</div>
                      <div className="text-[11px] text-indigo-300">
                        v{item.taVersion || 1} ({item.taStatus})
                      </div>
                    </td>
                    <td className="py-3 px-2 font-mono text-slate-300">{item.plannedExFactoryDate}</td>
                    <td className="py-3 px-2 font-mono font-semibold text-amber-300">{item.projectedExFactoryDate}</td>
                    <td className="py-3 px-2 font-mono text-cyan-300">
                      {item.ccd}
                      {item.ccdSlipDays > 0 && <div className="text-[10px] font-bold text-rose-300">+{item.ccdSlipDays}d Slip</div>}
                    </td>
                    <td className="py-3 px-2">
                      {(item.delayedActivities || []).length > 0 ? (
                        <div className="space-y-1">
                          {item.delayedActivities.map((da: any, i: number) => (
                            <div key={i} className="text-[11px]">
                              <span className="font-semibold text-rose-300">
                                {da.process} (+{da.delayDays}d):
                              </span>{' '}
                              <span className="text-slate-300">{da.delayReason}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-emerald-300">All critical path gates on schedule</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                          item.riskLevel === 'CRITICAL'
                            ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
                            : item.riskLevel === 'AT_RISK'
                            ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                            : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                        }`}
                      >
                        {item.riskLevel}
                      </span>
                    </td>
                    <td className="py-3 pl-2 text-right">
                      <button
                        onClick={() => {
                          setActiveTab('TNA');
                          selectOrder(item.orderId || item.jobNo);
                        }}
                        className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/20"
                      >
                        Open T&A Re-Plan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FABRIC & TRIMS WEEKLY DUE VS RECEIVED TRACKER */}
      {activeTab === 'FABRIC_TRIMS' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Weekly Fabric & Trims Due vs Received Follow-up</h2>
              <p className="text-xs text-slate-400">
                Tracks weekly bulk finish fabric Kg due vs received and item-wise trims & accessories in-house readiness per job.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2.5 pr-3">Job / Style / Buyer</th>
                  <th className="py-2.5 px-2">Fabric Due Date</th>
                  <th className="py-2.5 px-2">Fabric Req / Recv / Bal (Kg)</th>
                  <th className="py-2.5 px-2">Fabric Status</th>
                  <th className="py-2.5 px-2">Trims Due Date & Items</th>
                  <th className="py-2.5 px-2">Remarks</th>
                  <th className="py-2.5 pl-2 text-right">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {fabricTrimsList.map((ft: any) => (
                  <tr key={ft.styleId} className="hover:bg-slate-950/50">
                    <td className="py-3 pr-3">
                      <div className="font-semibold text-cyan-300">
                        Job #{ft.jobNo} · {ft.styleNo}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {ft.buyer} · {Number(ft.orderQty || 0).toLocaleString()} pcs
                      </div>
                    </td>
                    <td className="py-3 px-2 font-mono text-slate-200">{ft.fabricDueDate || '—'}</td>
                    <td className="py-3 px-2 font-mono">
                      <div className="text-white">Req: {Number(ft.fabricRequiredKg || 0).toLocaleString()} Kg</div>
                      <div className="text-emerald-300">Recv: {Number(ft.fabricReceivedKg || 0).toLocaleString()} Kg</div>
                      <div className="text-amber-300">Bal: {Number(ft.fabricBalanceKg || 0).toLocaleString()} Kg</div>
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                          ft.fabricStatus === 'IN_HOUSE'
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                            : 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                        }`}
                      >
                        {ft.fabricStatus}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="mb-1 font-mono text-[11px] text-cyan-300">Due: {ft.trimsDueDate || '—'}</div>
                      <div className="space-y-0.5">
                        {(ft.trimsItems || []).map((ti: any, idx: number) => (
                          <div key={idx} className="text-[11px] text-slate-300">
                            • {ti.item}: {Number(ti.receivedQty).toLocaleString()}/{Number(ti.requiredQty).toLocaleString()} {ti.unit} (
                            <span className={ti.status === 'IN_HOUSE' ? 'text-emerald-300' : 'text-rose-300'}>{ti.status}</span>)
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-slate-300">{ft.remarks}</td>
                    <td className="py-3 pl-2 text-right">
                      <button
                        onClick={() => setEditingFabTrims({ ...ft })}
                        className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/20"
                      >
                        Update Tracker
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SAMPLE PLANNING & MONTHLY QUOTA */}
      {activeTab === 'SAMPLE_PLAN' && (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 lg:col-span-4">
            <h3 className="text-sm font-semibold text-white">Monthly Buyer Sample & Line Quota</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2">Buyer</th>
                    <th className="py-2">Sample Styles</th>
                    <th className="py-2">Sewing Lines</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {buyerQuota.map((bq: any) => (
                    <tr key={bq.buyer}>
                      <td className="py-2.5 font-semibold text-white">{bq.buyer}</td>
                      <td className="py-2.5 font-mono text-cyan-300">
                        {bq.sampleUsedStyles}/{bq.sampleQuotaStyles} Styles
                      </td>
                      <td className="py-2.5 font-mono text-emerald-300">
                        {bq.allocatedLines}/{bq.monthlyLineQuota} Lines
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 lg:col-span-8">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Sample TNA & Courier Dispatch Tracker</h3>
                <p className="text-xs text-slate-400">Yarn, Knitting, Dyeing, Sample Making, Target vs Actual Dispatch & AWB tracking.</p>
              </div>
              <button
                onClick={() =>
                  setEditingSample({
                    jobNo: '48085',
                    styleNo: '13251506',
                    buyer: 'ONLY',
                    sampleType: 'PP Sample',
                    sampleQty: 24,
                    yarnDate: '2026-10-02',
                    knittingDate: '2026-10-05',
                    dyeingDate: '2026-10-08',
                    sewingDate: '2026-10-11',
                    targetDispatchDate: '2026-10-13',
                    actualDispatchDate: '',
                    awbNo: '',
                    status: 'IN_PROGRESS',
                    remarks: '',
                  })
                }
                className="rounded-xl bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
              >
                + Add Sample Plan
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2">Job / Style</th>
                    <th className="py-2">Sample Type / Qty</th>
                    <th className="py-2">Yarn → Knit → Dye → Sew</th>
                    <th className="py-2">Target / Actual Dispatch</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {samplePlanningList.map((sp: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2.5">
                        <div className="font-semibold text-cyan-300">
                          Job #{sp.jobNo} · {sp.styleNo}
                        </div>
                        <div className="text-[11px] text-slate-400">{sp.buyer}</div>
                      </td>
                      <td className="py-2.5">
                        <div className="text-white">{sp.sampleType}</div>
                        <div className="text-[11px] text-slate-400">{sp.sampleQty} pcs</div>
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-slate-300">
                        {sp.yarnDate} → {sp.knittingDate} → {sp.dyeingDate} → {sp.sewingDate}
                      </td>
                      <td className="py-2.5 font-mono text-[11px]">
                        <div className="text-cyan-300">Plan: {sp.targetDispatchDate}</div>
                        <div className="text-emerald-300">Act: {sp.actualDispatchDate || 'Pending'}</div>
                        {sp.awbNo && <div className="text-[10px] text-slate-400">AWB: {sp.awbNo}</div>}
                      </td>
                      <td className="py-2.5">
                        <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200">
                          {sp.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => setEditingSample({ ...sp })}
                          className="rounded-lg border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:border-cyan-400"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SHIPMENT MEETING RECORDS */}
      {activeTab === 'SHIPMENT_MTG' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Weekly Shipment Meeting Records (Decisions & Action Items)</h2>
              <p className="text-xs text-slate-400">
                Records weekly shipment review bottlenecks, recovery decisions, revised commitment dates, and department action owners.
              </p>
            </div>
            <button
              onClick={() =>
                setEditingMeeting({
                  meetingDate: new Date().toISOString().slice(0, 10),
                  jobNo: order?.jobNo || '48061',
                  styleNo: order?.styles?.[0]?.styleNo || '13251509',
                  buyer: order?.buyer?.name || 'OVS',
                  orderQty: 9200,
                  ccd: '2026-10-22',
                  projectedDate: '2026-10-23',
                  bottleneck: '',
                  decision: '',
                  revisedCommitmentDate: '2026-10-21',
                  actionItems: [
                    { owner: 'Section Head', department: 'Sewing', action: 'Allocate 2 hours overtime to recover schedule', dueDate: '2026-10-15', status: 'OPEN' },
                  ],
                })
              }
              className="rounded-xl bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
            >
              + Record Shipment Meeting
            </button>
          </div>

          <div className="space-y-4">
            {shipmentMeetings.map((m: any) => (
              <div key={m.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <span className="font-mono text-cyan-300">{m.meetingDate}</span> ·{' '}
                    <span className="text-sm font-bold text-white">
                      Job #{m.jobNo} · Style {m.styleNo} ({m.buyer})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-400">CCD: {m.ccd}</span>
                    <span className="text-emerald-300">Revised Commitment: {m.revisedCommitmentDate || m.ccd}</span>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                    <div className="font-semibold text-rose-300">Identified Bottleneck</div>
                    <div className="mt-1 text-slate-200">{m.bottleneck}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <div className="font-semibold text-emerald-300">Management / Planning Decision</div>
                    <div className="mt-1 text-slate-200">{m.decision}</div>
                  </div>
                </div>
                {Array.isArray(m.actionItems) && m.actionItems.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-1.5 font-semibold text-slate-400">Assigned Action Items:</div>
                    <div className="grid gap-2 md:grid-cols-3">
                      {m.actionItems.map((ai: any, idx: number) => (
                        <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900 p-2.5">
                          <div className="flex justify-between font-semibold text-white">
                            <span>{ai.owner}</span>
                            <span className="text-[10px] text-cyan-300">{ai.department}</span>
                          </div>
                          <div className="mt-1 text-slate-300">{ai.action}</div>
                          <div className="mt-1.5 flex justify-between font-mono text-[10px] text-slate-400">
                            <span>Due: {ai.dueDate}</span>
                            <span className="text-emerald-300">{ai.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Update Fabric & Trims Weekly Follow-up */}
      {editingFabTrims && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-slate-900 p-5 text-xs">
            <h3 className="text-sm font-semibold text-white">
              Update Fabric & Trims Follow-up — Job #{editingFabTrims.jobNo}
            </h3>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-slate-400">Fabric Required Kg</label>
                <input
                  type="number"
                  value={editingFabTrims.fabricRequiredKg || 0}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setEditingFabTrims({ ...editingFabTrims, fabricRequiredKg: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Fabric Received Kg</label>
                <input
                  type="number"
                  value={editingFabTrims.fabricReceivedKg || 0}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setEditingFabTrims({ ...editingFabTrims, fabricReceivedKg: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Remarks / Follow-up Note</label>
                <input
                  type="text"
                  value={editingFabTrims.remarks || ''}
                  onChange={(e) => setEditingFabTrims({ ...editingFabTrims, remarks: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditingFabTrims(null)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300">
                Cancel
              </button>
              <button onClick={saveFabricTrimsModal} className="rounded-lg bg-cyan-500 px-4 py-1.5 font-semibold text-slate-950">
                Save Follow-up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Sample Planning */}
      {editingSample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-slate-900 p-5 text-xs">
            <h3 className="text-sm font-semibold text-white">Sample TNA & Dispatch Entry</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400">Job No.</label>
                <input
                  type="text"
                  value={editingSample.jobNo}
                  onChange={(e) => setEditingSample({ ...editingSample, jobNo: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Sample Type</label>
                <input
                  type="text"
                  value={editingSample.sampleType}
                  onChange={(e) => setEditingSample({ ...editingSample, sampleType: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Sample Qty (Pcs)</label>
                <input
                  type="number"
                  value={editingSample.sampleQty}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setEditingSample({ ...editingSample, sampleQty: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Target Dispatch Date</label>
                <input
                  type="date"
                  value={editingSample.targetDispatchDate || ''}
                  onChange={(e) => setEditingSample({ ...editingSample, targetDispatchDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Actual Dispatch Date</label>
                <input
                  type="date"
                  value={editingSample.actualDispatchDate || ''}
                  onChange={(e) => setEditingSample({ ...editingSample, actualDispatchDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Courier AWB No.</label>
                <input
                  type="text"
                  value={editingSample.awbNo || ''}
                  onChange={(e) => setEditingSample({ ...editingSample, awbNo: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditingSample(null)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300">
                Cancel
              </button>
              <button onClick={saveSampleModal} className="rounded-lg bg-cyan-500 px-4 py-1.5 font-semibold text-slate-950">
                Save Sample Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Shipment Meeting Record */}
      {editingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-slate-900 p-5 text-xs">
            <h3 className="text-sm font-semibold text-white">Record Shipment Meeting Decision & Action Items</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400">Meeting Date</label>
                <input
                  type="date"
                  value={editingMeeting.meetingDate}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, meetingDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Job No.</label>
                <input
                  type="text"
                  value={editingMeeting.jobNo}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, jobNo: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-slate-400">Current Bottleneck</label>
                <input
                  type="text"
                  value={editingMeeting.bottleneck}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, bottleneck: e.target.value })}
                  placeholder="e.g., Embroidery Lot-3 partial balance & Hangtag delay"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-slate-400">Decision Taken</label>
                <textarea
                  rows={2}
                  value={editingMeeting.decision}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, decision: e.target.value })}
                  placeholder="e.g., Split sewing across 2 lines and run 2 hours planned OT..."
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Revised Commitment Date</label>
                <input
                  type="date"
                  value={editingMeeting.revisedCommitmentDate}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, revisedCommitmentDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditingMeeting(null)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300">
                Cancel
              </button>
              <button onClick={saveMeetingModal} className="rounded-lg bg-cyan-500 px-4 py-1.5 font-semibold text-slate-950">
                Save Meeting Record
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
