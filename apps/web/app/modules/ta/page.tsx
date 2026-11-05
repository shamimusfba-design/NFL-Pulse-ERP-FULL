'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';
import { displayJobNo } from '../../../lib/display';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid
} from 'recharts';
import { FX_SERIES, FX_BAR, FX_PIE, FxResponsiveContainer as ResponsiveContainer } from '../../../components/fx';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  TrendingUp,
  Search,
  Filter,
  Layers,
  Sparkles,
  Calendar,
  X,
  Plus,
  ArrowRight,
  ShieldAlert,
  Boxes,
} from 'lucide-react';

function d(val?: string | null) {
  if (!val) return '';
  return String(val).slice(0, 10);
}

// Earliest CCD across all POs
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

// Heatmap slot helpers
const SEC_HEAT: Record<string, string> = { KNITTING: 'knitting', DYEING: 'dyeing', PRINTING: 'printing', EMBROIDERY: 'embroidery', CUTTING: 'cutting', SEWING: 'sewing', FINISHING: 'finishing' };
const SLOT_START = ['01', '11', '21'];
const slotOfDate = (d: string) => { const day = Number(d.slice(8, 10)); return day <= 10 ? 1 : day <= 20 ? 2 : 3; };
const prevMonth = (m: string) => { const [y, mo] = m.split('-').map(Number); const d = new Date(Date.UTC(y, mo - 2, 1)); return d.toISOString().slice(0, 7); };
const monthLabel = (m: string) => new Date(m + '-01T00:00:00Z').toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });

function slotLoad(heat: Record<string, any>, section: string, date: string) {
  const key = SEC_HEAT[section]; if (!key || !date) return null;
  const m = date.slice(0, 7), slotNo = slotOfDate(date);
  const row = heat[m]?.rows?.find((x: any) => x.section === key);
  const sl = row?.slots?.find((x: any) => x.slotNo === slotNo);
  return sl ? { m, slotNo, unit: row.unit === 'KG' ? 'kg' : 'pcs', demand: sl.demand, capacity: sl.capacity, loadPct: sl.loadPct } : null;
}

function advanceSuggestion(heat: Record<string, any>, section: string, date: string, limit: number) {
  const key = SEC_HEAT[section]; if (!key || !date) return null;
  let m = date.slice(0, 7), slotNo = slotOfDate(date);
  for (let k = 0; k < 3; k++) {
    slotNo -= 1; if (slotNo < 1) { slotNo = 3; m = prevMonth(m); }
    const sl = heat[m]?.rows?.find((x: any) => x.section === key)?.slots?.find((x: any) => x.slotNo === slotNo);
    if (sl && sl.loadPct <= limit) return { m, slotNo, loadPct: sl.loadPct, start: `${m}-${SLOT_START[slotNo - 1]}` };
  }
  return null;
}

const fmtNum = (n: number) => Math.round(Number(n) || 0).toLocaleString('en-US');
const fmt = (n: any) => Number(n || 0).toLocaleString();

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
  const [activeChartBar, setActiveChartBar] = useState<number | null>(null);

  // Control Tower Data
  const [controlTower, setControlTower] = useState<any>(null);
  const [editingFabTrims, setEditingFabTrims] = useState<any>(null);
  const [editingSample, setEditingSample] = useState<any>(null);
  const [editingMeeting, setEditingMeeting] = useState<any>(null);
  const [heat, setHeat] = useState<Record<string, any>>({});
  const heatLimit = 85;

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const months = new Set<string>();
    Object.values(plans || {}).forEach((pl: any) =>
      Object.values(pl || {}).forEach((v: any) => {
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
          months.add(v.slice(0, 7));
          months.add(prevMonth(v.slice(0, 7)));
        }
      })
    );
    months.forEach((m) => {
      if (!heat[m])
        api(`/planning/capacity/heatmap?month=${m}`)
          .then((r: any) => setHeat((h) => ({ ...h, [m]: r })))
          .catch(() => {});
    });
  }, [plans]);

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
    try {
      const res = await api(`/planning/ta/orders/${orderId}`);
      setOrder(res.order);
      const next: Record<string, any> = {};
      for (const p of res.plans || []) {
        next[p.styleId] = {
          styleId: p.styleId,
          taStatus: p.taStatus,
          taVersion: p.taVersion,
          fabricRequiredKg: p.fabricRequiredKg,
          orderConfirmDate: d(p.orderConfirmDate),
          yarnInhouseDate: d(p.yarnInhouseDate),
          yarnDyeingStart: d(p.yarnDyeingStart),
          yarnDyeingEnd: d(p.yarnDyeingEnd),
          knittingStart: d(p.knittingStart),
          knittingEnd: d(p.knittingEnd),
          dyeingFinishingStart: d(p.dyeingFinishingStart),
          dyeingFinishingEnd: d(p.dyeingFinishingEnd),
          trimsInhouseDate: d(p.trimsInhouseDate),
          ppSampleApprovalDate: d(p.ppSampleApprovalDate),
          fileHandoverDate: d(p.fileHandoverDate),
          ppMeetingDate: d(p.ppMeetingDate),
          testCuttingDate: d(p.testCuttingDate),
          cuttingStart: d(p.cuttingStart),
          cuttingEnd: d(p.cuttingEnd),
          printingStart: d(p.printingStart),
          printingEnd: d(p.printingEnd),
          embroideryStart: d(p.embroideryStart),
          embroideryEnd: d(p.embroideryEnd),
          sewingStartDate: d(p.sewingStartDate),
          sewingEndDate: d(p.sewingEndDate),
          washStart: d(p.washStart),
          washEnd: d(p.washEnd),
          finishingStart: d(p.finishingStart),
          finishingEnd: d(p.finishingEnd),
          finalInspection: d(p.finalInspection),
          exFactoryDate: d(p.exFactoryDate),
          cargoClosingDate: d(p.cargoClosingDate),
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

  function setActivityTracking(styleId: string, rowKey: string, field: 'status' | 'delayReason', value: string) {
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

  function toggleProcess(styleId: string, key: string, enabled: boolean) {
    setPlans((prev) => {
      const cur = prev[styleId] || { styleId };
      const proc = { ...(cur.applicableProcesses || {}), [key]: enabled };
      return {
        ...prev,
        [styleId]: { ...cur, applicableProcesses: proc },
      };
    });
  }

  function updateOutside(styleId: string, rowKey: string, patch: any) {
    setPlans((prev) => {
      const cur = prev[styleId] || { styleId };
      const out = { ...(cur.outsidePlan || {}) };
      out[rowKey] = { ...(out[rowKey] || {}), ...patch };
      return {
        ...prev,
        [styleId]: { ...cur, outsidePlan: out },
      };
    });
  }

  function autoCalculateStyle(styleId: string) {
    const cur = plans[styleId];
    if (!cur) return;
    const styleObj = (order?.styles || []).find((s: any) => s.id === styleId);
    const earliestCcd = firstCcd(styleObj) || cur.cargoClosingDate;
    if (!earliestCcd) {
      setError('Cannot calculate: PO CCD date is missing.');
      return;
    }

    const ccd = earliestCcd;
    const exFactory = addDays(ccd, -2);
    const fri = addDays(exFactory, -3);
    const finishingEnd = addDays(fri, -1);
    const finishingStart = addDays(finishingEnd, -7);
    const sewingEnd = addDays(finishingStart, 0);
    const sewingStart = addDays(sewingEnd, -12);
    const cuttingEnd = addDays(sewingStart, -1);
    const cuttingStart = addDays(cuttingEnd, -6);
    const testCutting = addDays(cuttingStart, -2);
    const ppMeeting = addDays(testCutting, -1);
    const fileHandover = addDays(ppMeeting, -2);
    const trimsInhouse = addDays(ppMeeting, -3);
    const ppSample = addDays(fileHandover, -4);
    const dyeingEnd = addDays(testCutting, -3);
    const dyeingStart = addDays(dyeingEnd, -7);
    const knittingEnd = addDays(dyeingStart, -2);
    const knittingStart = addDays(knittingEnd, -8);
    const yarnInhouse = addDays(knittingStart, -3);
    const orderConfirm = addDays(yarnInhouse, -5);

    setPlans((prev) => ({
      ...prev,
      [styleId]: {
        ...cur,
        cargoClosingDate: ccd,
        exFactoryDate: exFactory,
        finalInspection: fri,
        finishingEnd,
        finishingStart,
        sewingEndDate: sewingEnd,
        sewingStartDate: sewingStart,
        cuttingEnd,
        cuttingStart,
        testCuttingDate: testCutting,
        ppMeetingDate: ppMeeting,
        fileHandoverDate: fileHandover,
        trimsInhouseDate: trimsInhouse,
        ppSampleApprovalDate: ppSample,
        dyeingFinishingEnd: dyeingEnd,
        dyeingFinishingStart: dyeingStart,
        knittingEnd,
        knittingStart,
        yarnInhouseDate: yarnInhouse,
        orderConfirmDate: orderConfirm,
      },
    }));
    setMessage(`T&A backward schedule auto-calculated from PO CCD (${ccd}) for style.`);
  }

  async function save(approve = false) {
    if (!order) return;
    setSaving(true);
    setError('');
    setMessage('');
    setOverloadedSlots([]);
    try {
      const payloadPlans = Object.values(plans).map((p: any) => ({
        ...p,
        replanReason: replanReason.trim() || undefined,
        capacityOverride,
        overrideReason: capacityOverride ? overrideReason : undefined,
      }));

      const res = await api(`/planning/ta/orders/${order.id}`, {
        method: 'POST',
        body: JSON.stringify({
          plans: payloadPlans,
          approve,
        }),
      });

      if (res.capacityCheck?.overloadedSlots?.length) {
        setOverloadedSlots(res.capacityCheck.overloadedSlots);
      }
      setMessage(
        approve
          ? `T&A approved for ${displayJobNo(order.jobNo)}. Downstream section tasks created & Gantt auto-loaded.`
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

  // KPI calculations
  const tnaKpis = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let totalPcs = 0;
    queue.forEach((q) => {
      const styles = q.order?.styles || [];
      totalPcs += styles.reduce((s: number, st: any) => s + Number(st.quantity || 0), 0);
      const isApp = styles.length > 0 && styles.every((s: any) => s.sourceMetadata?.planning?.taStatus === 'APPROVED');
      if (isApp) approved++;
      else pending++;
    });
    const criticalRisks = riskList.filter((r: any) => r.riskLevel === 'CRITICAL').length;
    const atRisk = riskList.filter((r: any) => r.riskLevel === 'AT_RISK').length;
    return {
      totalJobs: queue.length,
      approved,
      pending,
      totalPcs,
      criticalRisks,
      atRisk,
      totalRisks: criticalRisks + atRisk,
      shipmentMtgs: shipmentMeetings.length,
    };
  }, [queue, riskList, shipmentMeetings]);

  // Chart data: Milestone health distribution
  const chartData = useMemo(() => {
    return [
      { name: 'T&A Approved', count: tnaKpis.approved, color: '#10B981', fill: '#A7F3D0', key: 'APPROVED' },
      { name: 'Draft / In-Prep', count: tnaKpis.pending, color: '#0284C7', fill: '#BAE6FD', key: 'PENDING' },
      { name: 'On Track Risk', count: Math.max(0, queue.length - tnaKpis.totalRisks), color: '#6366F1', fill: '#C7D2FE', key: 'ON_TRACK' },
      { name: 'At Risk (Slip)', count: tnaKpis.atRisk, color: '#F59E0B', fill: '#FDE68A', key: 'AT_RISK' },
      { name: 'Critical Delayed', count: tnaKpis.criticalRisks, color: '#EF4444', fill: '#FECACA', key: 'CRITICAL' },
    ];
  }, [tnaKpis, queue]);

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const pct = tnaKpis.totalJobs > 0 ? Math.round((d.count / tnaKpis.totalJobs) * 100) : 0;
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
            minWidth: '160px',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 700, color: d.color, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color }}></span>
            {d.name}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span style={{ color: '#94A3B8' }}>Orders / Jobs:</span>
            <span style={{ fontWeight: 700 }}>{d.count} ({pct}%)</span>
          </div>
          <div style={{ marginTop: '6px', paddingTop: '4px', borderTop: '1px solid #1E293B', fontSize: '10.5px', color: '#CBD5E1' }}>
            Click card to filter workqueue
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Shell
      title="2. Time & Action (T&A) Planning Control Tower"
      eyebrow="Central Planning • Backward Schedule, Plan vs Actual, Critical Path & Follow-up"
    >
      <div className="erp-page-entrance" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Module Header & Sub-Tab Switcher Bar */}
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
              <Calendar size={18} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F274E', letterSpacing: '-0.01em' }}>
                Time &amp; Action (T&amp;A) Plan &amp; Control Tower
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                Backward scheduling from earliest PO CCD with milestone tracking and delay risk management
              </div>
            </div>
          </div>

          {/* Sub-Tabs Switcher */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
            {[
              { id: 'TNA', label: '1. Bulk T&A Plan', count: queue.length },
              { id: 'RISK_LIST', label: '2. Critical Path Risks', count: tnaKpis.totalRisks },
              { id: 'FABRIC_TRIMS', label: '3. Fabric & Trims Follow-up', count: fabricTrimsList.length },
              { id: 'SAMPLE_PLAN', label: '4. Sample Planning & Quota', count: samplePlanningList.length },
              { id: 'SHIPMENT_MTG', label: '5. Shipment Meetings', count: shipmentMeetings.length },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: activeTab === t.id ? 700 : 550,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === t.id ? '#FFFFFF' : 'transparent',
                  color: activeTab === t.id ? '#0284C7' : '#64748B',
                  boxShadow: activeTab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
        </div>

        {/* Notification Banners */}
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
          {/* Card 1: Total Jobs Tracked */}
          <div
            onClick={() => {
              setActiveTab('TNA');
              setStatusFilter('ALL');
            }}
            style={{
              background: activeTab === 'TNA' && statusFilter === 'ALL' ? '#F0F9FF' : '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '8px',
              border: activeTab === 'TNA' && statusFilter === 'ALL' ? '2px solid #0284C7' : '1px solid #E2E8F0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
            }}
            title="Click to view all jobs in T&A queue"
          >
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>
              Total Jobs Tracked
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F274E', margin: '2px 0' }}>
              {tnaKpis.totalJobs} Jobs
            </div>
            <div style={{ fontSize: '11.5px', color: '#0284C7', fontWeight: 600 }}>
              {fmt(tnaKpis.totalPcs)} Garment Pcs
            </div>
          </div>

          {/* Card 2: T&A Approved */}
          <div
            onClick={() => {
              setActiveTab('TNA');
              setStatusFilter('APPROVED');
            }}
            style={{
              background: activeTab === 'TNA' && statusFilter === 'APPROVED' ? '#ECFDF5' : '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '8px',
              border: activeTab === 'TNA' && statusFilter === 'APPROVED' ? '2px solid #059669' : '1px solid #E2E8F0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
            }}
            title="Click to filter approved T&A plans"
          >
            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 650, textTransform: 'uppercase' }}>
              T&amp;A Approved
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#047857', margin: '2px 0' }}>
              {tnaKpis.approved} Jobs
            </div>
            <div style={{ fontSize: '11.5px', color: '#047857', fontWeight: 600 }}>
              Tasks dispathed to mills
            </div>
          </div>

          {/* Card 3: Pending Approval / Draft */}
          <div
            onClick={() => {
              setActiveTab('TNA');
              setStatusFilter('PENDING');
            }}
            style={{
              background: activeTab === 'TNA' && statusFilter === 'PENDING' ? '#FFFBEB' : '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '8px',
              border: activeTab === 'TNA' && statusFilter === 'PENDING' ? '2px solid #D97706' : '1px solid #E2E8F0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
            }}
            title="Click to filter pending / draft T&A schedules"
          >
            <div style={{ fontSize: '11px', color: '#D97706', fontWeight: 650, textTransform: 'uppercase' }}>
              Pending / In-Prep
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#B45309', margin: '2px 0' }}>
              {tnaKpis.pending} Jobs
            </div>
            <div style={{ fontSize: '11.5px', color: '#B45309', fontWeight: 600 }}>
              Awaiting planning sign-off
            </div>
          </div>

          {/* Card 4: Critical Path & Delay Risks */}
          <div
            onClick={() => setActiveTab('RISK_LIST')}
            style={{
              background: activeTab === 'RISK_LIST' ? '#FEF2F2' : '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '8px',
              border: activeTab === 'RISK_LIST' ? '2px solid #DC2626' : '1px solid #FECACA',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
            }}
            title="Click to view Critical Path & Shipment-Risk Alert list"
          >
            <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700, textTransform: 'uppercase' }}>
              Critical Path Risks
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#DC2626', margin: '2px 0' }}>
              {tnaKpis.totalRisks} Styles
            </div>
            <div style={{ fontSize: '11.5px', color: '#991B1B', fontWeight: 600 }}>
              {tnaKpis.criticalRisks} Critical · {tnaKpis.atRisk} At-Risk
            </div>
          </div>

          {/* Card 5: Fabric & Trims Follow-up */}
          <div
            onClick={() => setActiveTab('FABRIC_TRIMS')}
            style={{
              background: activeTab === 'FABRIC_TRIMS' ? '#F0F9FF' : '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '8px',
              border: activeTab === 'FABRIC_TRIMS' ? '2px solid #0284C7' : '1px solid #E2E8F0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
            }}
            title="Click to open Weekly Fabric & Trims tracker"
          >
            <div style={{ fontSize: '11px', color: '#0284C7', fontWeight: 650, textTransform: 'uppercase' }}>
              Fabric &amp; Trims Tracker
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0369A1', margin: '2px 0' }}>
              {fabricTrimsList.length} Jobs
            </div>
            <div style={{ fontSize: '11.5px', color: '#0284C7', fontWeight: 600 }}>
              Weekly due vs received
            </div>
          </div>

          {/* Card 6: Shipment Meetings */}
          <div
            onClick={() => setActiveTab('SHIPMENT_MTG')}
            style={{
              background: activeTab === 'SHIPMENT_MTG' ? '#EEF2FF' : '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '8px',
              border: activeTab === 'SHIPMENT_MTG' ? '2px solid #6366F1' : '1px solid #E2E8F0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
            }}
            title="Click to open Shipment Meetings records"
          >
            <div style={{ fontSize: '11px', color: '#6366F1', fontWeight: 650, textTransform: 'uppercase' }}>
              Shipment Meetings
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#4338CA', margin: '2px 0' }}>
              {tnaKpis.shipmentMtgs} Decisions
            </div>
            <div style={{ fontSize: '11.5px', color: '#4338CA', fontWeight: 600 }}>
              Weekly recovery actions
            </div>
          </div>
        </div>

        {/* Compact Interactive Recharts Chart: Milestone & Risk Distribution */}
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
                T&amp;A Schedule Health &amp; Critical Path Distribution
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                Hover over bars to inspect critical milestone health and projected shipment runway
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
              Interactive Status Bar
            </span>
          </div>

          <div style={{ width: '100%', height: '150px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && (e as any).activePayload && (e as any).activePayload[0]) {
                    const targetKey = (e as any).activePayload[0].payload.key;
                    if (targetKey === 'APPROVED' || targetKey === 'PENDING') {
                      setActiveTab('TNA');
                      setStatusFilter(targetKey);
                    } else if (targetKey === 'CRITICAL' || targetKey === 'AT_RISK') {
                      setActiveTab('RISK_LIST');
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 550 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(2, 132, 199, 0.06)' }} />
                <Bar {...FX_BAR}
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={55}
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

        {/* TAB 1: BULK T&A SCHEDULE */}
        {activeTab === 'TNA' && (
          <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: '16px' }}>
            {/* Left Workqueue */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                padding: '14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                height: 'fit-content',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F274E' }}>Planning Workqueue</div>
                <span
                  style={{
                    background: '#F1F5F9',
                    color: '#475569',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                  }}
                >
                  {filteredQueue.length} jobs
                </span>
              </div>

              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Job, Buyer, Style..."
                  style={{
                    width: '100%',
                    height: '30px',
                    padding: '0 8px 0 26px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '11.5px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                {(['ALL', 'PENDING', 'APPROVED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    style={{
                      flex: 1,
                      padding: '4px',
                      fontSize: '11px',
                      fontWeight: statusFilter === st ? 700 : 500,
                      borderRadius: '5px',
                      border: 'none',
                      cursor: 'pointer',
                      background: statusFilter === st ? '#0284C7' : '#F1F5F9',
                      color: statusFilter === st ? '#FFFFFF' : '#475569',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div style={{ maxHeight: '640px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
                {filteredQueue.map((task) => {
                  const ord = task.order;
                  const styles = ord?.styles || [];
                  const allApproved = styles.length > 0 && styles.every((s: any) => s.sourceMetadata?.planning?.taStatus === 'APPROVED');
                  const earliestOrderCcd = styles.map((s: any) => firstCcd(s)).filter(Boolean).sort()[0] || '—';
                  const ver = styles[0]?.sourceMetadata?.planning?.taVersion || 1;
                  const isSelected = selectedOrderId === ord?.id;

                  return (
                    <button
                      key={task.id}
                      onClick={() => ord?.id && selectOrder(ord.id)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #0284C7' : '1px solid #E2E8F0',
                        background: isSelected ? '#F0F9FF' : '#FFFFFF',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: '#0F274E', fontSize: '12px' }}>
                          {displayJobNo(ord?.jobNo)}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <span style={{ background: '#F1F5F9', color: '#0284C7', padding: '1px 5px', borderRadius: '4px', fontSize: '10px', fontFamily: 'monospace', fontWeight: 700 }}>
                            v{ver}
                          </span>
                          <span
                            style={{
                              padding: '1px 6px',
                              borderRadius: '10px',
                              fontSize: '9.5px',
                              fontWeight: 700,
                              background: allApproved ? '#ECFDF5' : '#FFFBEB',
                              color: allApproved ? '#065F46' : '#92400E',
                            }}
                          >
                            {allApproved ? 'APPROVED' : 'DRAFT'}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        {ord?.buyer?.name} · {styles.map((s: any) => s.styleNo).join(', ')}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#94A3B8', marginTop: '4px' }}>
                        <span>{styles.reduce((sum: number, s: any) => sum + Number(s.quantity || 0), 0).toLocaleString()} pcs</span>
                        <span style={{ color: '#0284C7', fontWeight: 600 }}>CCD: {earliestOrderCcd}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Workspace: Order T&A Schedule */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {overloadedSlots.length > 0 && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    color: '#92400E',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ fontWeight: 700 }}>Capacity Overload Warning ({overloadedSlots.length} slots exceed threshold):</div>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {overloadedSlots.map((sl, i) => (
                      <li key={i}>
                        {sl.section} — {sl.month} Slot {sl.slot}: {sl.loadPct}% ({Number(sl.demand).toLocaleString()} / {Number(sl.capacity).toLocaleString()})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {order ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Order Header & Action Strip */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      padding: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#0284C7', textTransform: 'uppercase' }}>
                          {order.buyer?.name}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F274E' }}>
                          {displayJobNo(order.jobNo)} — T&amp;A Schedule, Actuals &amp; Re-Plan Control
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                          Backward scheduled from earliest PO CCD. Includes Test Cutting, Actual Dates, Delay Reasons, and Re-plan Version control.
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setShowBaselineCompare((v) => !v)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 650,
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            color: '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          {showBaselineCompare ? 'Hide Baseline v1' : 'Compare vs Baseline v1'}
                        </button>
                        <button
                          onClick={() => save(false)}
                          disabled={saving}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            border: '1px solid #0284C7',
                            background: '#F0F9FF',
                            color: '#0284C7',
                            cursor: 'pointer',
                          }}
                        >
                          Save Plan / Actuals
                        </button>
                        <button
                          onClick={() => save(true)}
                          disabled={saving}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            border: 'none',
                            background: '#059669',
                            color: '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          Approve T&amp;A &amp; Create Tasks
                        </button>
                      </div>
                    </div>

                    {/* Re-Plan Reason & Capacity Override */}
                    <div
                      style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid #F1F5F9',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '12px',
                        fontSize: '11.5px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 650, color: '#D97706', whiteSpace: 'nowrap' }}>Re-plan Reason (if approved):</span>
                        <input
                          type="text"
                          value={replanReason}
                          onChange={(e) => setReplanReason(e.target.value)}
                          placeholder="Required when changing dates on an approved plan..."
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            borderRadius: '5px',
                            border: '1px solid #CBD5E1',
                            fontSize: '11.5px',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569', fontWeight: 600 }}>
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
                            style={{
                              flex: 1,
                              padding: '6px 8px',
                              borderRadius: '5px',
                              border: '1px solid #CBD5E1',
                              fontSize: '11.5px',
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Styles T&A Tables */}
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
                      <div
                        key={style.id}
                        style={{
                          background: '#FFFFFF',
                          borderRadius: '10px',
                          border: '1px solid #E2E8F0',
                          padding: '16px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                      >
                        {/* Style Header */}
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            borderBottom: '1px solid #E2E8F0',
                            paddingBottom: '12px',
                            marginBottom: '12px',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F274E' }}>{style.styleNo}</span>
                              <span style={{ background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                                {Number(style.quantity || 0).toLocaleString()} pcs
                              </span>
                              <span style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', color: '#0284C7', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                                Earliest CCD: {ccd || 'TBD'}
                              </span>
                              <span style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', color: '#4338CA', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700 }}>
                                v{p.taVersion || 1} ({p.taStatus || 'DRAFT'})
                              </span>
                              {totalLeadDays !== null && (
                                <span style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                                  Lead Time: {totalLeadDays} days
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                              {style.itemDescription || 'Garment Style'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', background: '#F8FAFC', padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                              <span style={{ color: '#64748B' }}>Fabric Req (Kg):</span>
                              <input
                                type="number"
                                value={p.fabricRequiredKg || 0}
                                onWheel={(e) => e.currentTarget.blur()}
                                onChange={(e) => setStyleField(style.id, 'fabricRequiredKg', Number(e.target.value))}
                                style={{ width: '70px', border: 'none', background: 'transparent', fontWeight: 700, fontFamily: 'monospace' }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => autoCalculateStyle(style.id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #0284C7',
                                background: '#F0F9FF',
                                color: '#0284C7',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              ⚡ Auto-Calculate from CCD
                            </button>
                          </div>
                        </div>

                        {/* Critical Path Alert */}
                        {cp && cp.riskLevel && (
                          <div
                            style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              marginBottom: '12px',
                              fontSize: '11.5px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: cp.riskLevel === 'CRITICAL' ? '#FEF2F2' : cp.riskLevel === 'AT_RISK' ? '#FFFBEB' : '#ECFDF5',
                              border: cp.riskLevel === 'CRITICAL' ? '1px solid #FECACA' : cp.riskLevel === 'AT_RISK' ? '1px solid #FDE68A' : '1px solid #A7F3D0',
                              color: cp.riskLevel === 'CRITICAL' ? '#991B1B' : cp.riskLevel === 'AT_RISK' ? '#92400E' : '#065F46',
                            }}
                          >
                            <div>
                              <b>Critical Path Status: {cp.riskLevel}</b> · Planned Ex-Factory: {cp.plannedExFactoryDate || p.exFactoryDate} → Projected Ex-Factory: <b>{cp.projectedExFactoryDate || p.exFactoryDate}</b>
                            </div>
                            <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                              {cp.ccdSlipDays > 0 ? `⚠ CCD SLIP: +${cp.ccdSlipDays} DAYS` : '✓ WITHIN EARLIEST CCD'}
                            </div>
                          </div>
                        )}

                        {/* Process Table */}
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                                <th style={{ padding: '6px 8px' }}>Process / Milestone</th>
                                <th style={{ padding: '6px 8px' }}>Section</th>
                                <th style={{ padding: '6px 8px' }}>Slot Load · Heatmap</th>
                                <th style={{ padding: '6px 8px' }}>Planned Start</th>
                                <th style={{ padding: '6px 8px' }}>Planned Finish</th>
                                {showBaselineCompare && <th style={{ padding: '6px 8px', color: '#4338CA' }}>Baseline v1</th>}
                                <th style={{ padding: '6px 8px', color: '#059669' }}>Actual Finish Date</th>
                                <th style={{ padding: '6px 8px' }}>Variance</th>
                                <th style={{ padding: '6px 8px' }}>Status</th>
                                <th style={{ padding: '6px 8px' }}>Delay / Failure Reason</th>
                                <th style={{ padding: '6px 8px' }}>In-house / Outside</th>
                              </tr>
                            </thead>
                            <tbody>
                              {PROCESS_ROWS.map((r, idx) => {
                                const applicable = r.toggleKey ? Boolean(proc[r.toggleKey]) : true;
                                if (!applicable) return null;

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
                                  <tr key={r.key} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '6px 8px', fontWeight: 650, color: '#0F274E' }}>
                                      {idx + 1}. {r.label}
                                    </td>
                                    <td style={{ padding: '6px 8px' }}>
                                      <span style={{ background: '#F1F5F9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontSize: '10px' }}>
                                        {r.section}
                                      </span>
                                    </td>
                                    <td style={{ padding: '6px 8px' }}>
                                      {(() => {
                                        const ld = slotLoad(heat, r.section, startVal);
                                        if (!ld) return <span style={{ color: '#94A3B8' }}>—</span>;
                                        const col = ld.loadPct > 100 ? '#DC2626' : ld.loadPct > heatLimit ? '#D97706' : '#059669';
                                        return (
                                          <div style={{ minWidth: 120 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px' }}>
                                              <span>Slot {ld.slotNo}</span>
                                              <b style={{ color: col }}>{ld.loadPct}%</b>
                                            </div>
                                            <div style={{ height: 4, borderRadius: 2, background: '#E2E8F0', overflow: 'hidden', margin: '2px 0' }}>
                                              <div style={{ width: `${Math.min(100, ld.loadPct)}%`, height: '100%', background: col }} />
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </td>
                                    <td style={{ padding: '6px 8px' }}>
                                      <input
                                        type="date"
                                        value={startVal}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setStyleField(style.id, r.startField, val);
                                          if (isSingleDate) setStyleField(style.id, r.endField, val);
                                        }}
                                        style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '11px' }}
                                      />
                                    </td>
                                    <td style={{ padding: '6px 8px' }}>
                                      {isSingleDate ? (
                                        <span style={{ fontFamily: 'monospace', color: '#64748B' }}>{startVal || '—'}</span>
                                      ) : (
                                        <input
                                          type="date"
                                          value={endVal}
                                          onChange={(e) => setStyleField(style.id, r.endField, e.target.value)}
                                          style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '11px' }}
                                        />
                                      )}
                                    </td>
                                    {showBaselineCompare && (
                                      <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#4338CA', fontSize: '11px' }}>
                                        {baselineVal}
                                      </td>
                                    )}
                                    <td style={{ padding: '6px 8px' }}>
                                      <input
                                        type="date"
                                        value={actualEnd}
                                        onChange={(e) => setActualDate(style.id, r.endField, r.key, e.target.value)}
                                        style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #A7F3D0', background: '#F0FDF4', fontSize: '11px' }}
                                      />
                                    </td>
                                    <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>
                                      {variance !== null ? (
                                        <span
                                          style={{
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            background: variance > 0 ? '#FEE2E2' : variance < 0 ? '#ECFDF5' : '#F1F5F9',
                                            color: variance > 0 ? '#DC2626' : variance < 0 ? '#059669' : '#475569',
                                          }}
                                        >
                                          {variance > 0 ? `+${variance}d Late` : variance < 0 ? `${variance}d Early` : 'On Time'}
                                        </span>
                                      ) : (
                                        <span style={{ color: '#94A3B8' }}>—</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '6px 8px' }}>
                                      <select
                                        value={rowStatus}
                                        onChange={(e) => setActivityTracking(style.id, r.key, 'status', e.target.value)}
                                        style={{
                                          padding: '2px 4px',
                                          borderRadius: '4px',
                                          fontSize: '10.5px',
                                          fontWeight: 700,
                                          border: '1px solid #CBD5E1',
                                          background: rowStatus === 'DONE' ? '#ECFDF5' : rowStatus === 'DELAYED' ? '#FFFBEB' : '#FFFFFF',
                                          color: rowStatus === 'DONE' ? '#065F46' : rowStatus === 'DELAYED' ? '#92400E' : '#0F274E',
                                        }}
                                      >
                                        <option value="PENDING">PENDING</option>
                                        <option value="IN_PROGRESS">IN PROGRESS</option>
                                        <option value="DONE">DONE</option>
                                        <option value="DELAYED">DELAYED</option>
                                        <option value="FAILED">FAILED</option>
                                      </select>
                                    </td>
                                    <td style={{ padding: '6px 8px' }}>
                                      <input
                                        type="text"
                                        value={delayReason}
                                        onChange={(e) => setActivityTracking(style.id, r.key, 'delayReason', e.target.value)}
                                        placeholder="Optional note..."
                                        style={{ width: '130px', padding: '3px 6px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '11px' }}
                                      />
                                    </td>
                                    <td style={{ padding: '6px 8px' }}>
                                      {r.canOutside ? (
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', color: '#475569' }}>
                                          <input
                                            type="checkbox"
                                            checked={Boolean(outCfg.outside)}
                                            onChange={(e) => updateOutside(style.id, r.key, { outside: e.target.checked })}
                                          />
                                          Outside
                                        </label>
                                      ) : (
                                        <span style={{ fontSize: '10px', color: '#94A3B8' }}>In-house</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    padding: '30px',
                    textAlign: 'center',
                    color: '#64748B',
                    fontSize: '13px',
                  }}
                >
                  Select an order from the Planning Workqueue to view, calculate or approve its T&amp;A plan.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CRITICAL PATH RISKS */}
        {activeTab === 'RISK_LIST' && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F274E', marginBottom: '4px' }}>
              Critical Path &amp; Shipment-Risk Alert List
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginBottom: '14px' }}>
              Identifies jobs where milestone delays threaten to breach the earliest PO CCD date.
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Job / Style / Buyer</th>
                    <th style={{ padding: '8px' }}>Order Qty</th>
                    <th style={{ padding: '8px' }}>Planned Ex-Factory</th>
                    <th style={{ padding: '8px' }}>Projected Ex-Factory</th>
                    <th style={{ padding: '8px' }}>Earliest CCD</th>
                    <th style={{ padding: '8px' }}>Risk Status</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {riskList.map((item: any) => (
                    <tr key={item.styleId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px' }}>
                        <div style={{ fontWeight: 800, color: '#0284C7' }}>Job #{item.jobNo} · {item.styleNo}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{item.buyer}</div>
                      </td>
                      <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                        {Number(item.orderQty || 0).toLocaleString()} pcs
                      </td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', color: '#475569' }}>
                        {item.plannedExFactoryDate}
                      </td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 700, color: '#DC2626' }}>
                        {item.projectedExFactoryDate}
                      </td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', color: '#0284C7', fontWeight: 650 }}>
                        {item.ccd}
                        {item.ccdSlipDays > 0 && (
                          <span style={{ marginLeft: '4px', color: '#DC2626', fontSize: '10.5px' }}>(+{item.ccdSlipDays}d Slip)</span>
                        )}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            background: item.riskLevel === 'CRITICAL' ? '#FEF2F2' : '#FFFBEB',
                            color: item.riskLevel === 'CRITICAL' ? '#DC2626' : '#D97706',
                          }}
                        >
                          {item.riskLevel}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setActiveTab('TNA');
                            selectOrder(item.orderId || item.jobNo);
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '5px',
                            border: '1px solid #0284C7',
                            background: '#F0F9FF',
                            color: '#0284C7',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Open T&amp;A
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: FABRIC & TRIMS FOLLOW-UP */}
        {activeTab === 'FABRIC_TRIMS' && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F274E', marginBottom: '4px' }}>
              Weekly Fabric &amp; Trims Due vs Received Follow-up
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginBottom: '14px' }}>
              Tracks weekly finish fabric demand vs warehouse stock and item-wise trims readiness.
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Job / Style / Buyer</th>
                    <th style={{ padding: '8px' }}>Fabric Due Date</th>
                    <th style={{ padding: '8px' }}>Fabric Req / Recv / Bal</th>
                    <th style={{ padding: '8px' }}>Fabric Status</th>
                    <th style={{ padding: '8px' }}>Trims Readiness</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fabricTrimsList.map((ft: any) => (
                    <tr key={ft.styleId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px' }}>
                        <div style={{ fontWeight: 800, color: '#0284C7' }}>Job #{ft.jobNo} · {ft.styleNo}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{ft.buyer}</div>
                      </td>
                      <td style={{ padding: '8px', fontFamily: 'monospace' }}>{ft.fabricDueDate || '—'}</td>
                      <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                        <div>Req: {Number(ft.fabricRequiredKg || 0).toLocaleString()} Kg</div>
                        <div style={{ color: '#059669' }}>Recv: {Number(ft.fabricReceivedKg || 0).toLocaleString()} Kg</div>
                        <div style={{ color: '#D97706' }}>Bal: {Number(ft.fabricBalanceKg || 0).toLocaleString()} Kg</div>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            background: ft.fabricStatus === 'IN_HOUSE' ? '#ECFDF5' : '#FFFBEB',
                            color: ft.fabricStatus === 'IN_HOUSE' ? '#059669' : '#D97706',
                          }}
                        >
                          {ft.fabricStatus}
                        </span>
                      </td>
                      <td style={{ padding: '8px', fontSize: '11px' }}>
                        <div style={{ color: '#0284C7', fontWeight: 600 }}>Due: {ft.trimsDueDate || '—'}</div>
                        <div>{(ft.trimsItems || []).length} items monitored</div>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <button
                          onClick={() => setEditingFabTrims({ ...ft })}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '5px',
                            border: '1px solid #0284C7',
                            background: '#F0F9FF',
                            color: '#0284C7',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
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

        {/* TAB 4: SAMPLE PLANNING & QUOTA */}
        {activeTab === 'SAMPLE_PLAN' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {/* Buyer Monthly Quota */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F274E', marginBottom: '8px' }}>
                Monthly Buyer Sample &amp; Line Allocation
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                    <th style={{ padding: '6px' }}>Buyer</th>
                    <th style={{ padding: '6px' }}>Sample Styles</th>
                    <th style={{ padding: '6px' }}>Sewing Lines</th>
                  </tr>
                </thead>
                <tbody>
                  {buyerQuota.map((bq: any) => (
                    <tr key={bq.buyer} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px', fontWeight: 700, color: '#0F274E' }}>{bq.buyer}</td>
                      <td style={{ padding: '6px', color: '#0284C7', fontWeight: 650 }}>
                        {bq.sampleUsedStyles}/{bq.sampleQuotaStyles} Styles
                      </td>
                      <td style={{ padding: '6px', color: '#059669', fontWeight: 650 }}>
                        {bq.allocatedLines}/{bq.monthlyLineQuota} Lines
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sample Dispatch Tracker */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F274E', marginBottom: '8px' }}>
                Sample TNA &amp; Courier Dispatch
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                    <th style={{ padding: '6px' }}>Job / Style</th>
                    <th style={{ padding: '6px' }}>Sample Type</th>
                    <th style={{ padding: '6px' }}>Dispatch</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {samplePlanningList.map((sp: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px' }}>
                        <div style={{ fontWeight: 700, color: '#0284C7' }}>Job #{sp.jobNo}</div>
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>{sp.styleNo} · {sp.buyer}</div>
                      </td>
                      <td style={{ padding: '6px' }}>
                        <div>{sp.sampleType}</div>
                        <div style={{ fontSize: '10px', color: '#94A3B8' }}>{sp.sampleQty} pcs</div>
                      </td>
                      <td style={{ padding: '6px', fontSize: '11px' }}>
                        <div style={{ color: '#0284C7', fontWeight: 600 }}>Plan: {sp.targetDispatchDate}</div>
                        <div style={{ color: sp.actualDispatchDate ? '#059669' : '#D97706', fontSize: '10px' }}>
                          Act: {sp.actualDispatchDate || 'Pending'}
                        </div>
                      </td>
                      <td style={{ padding: '6px', textAlign: 'right' }}>
                        <button
                          onClick={() => setEditingSample({ ...sp })}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid #0284C7',
                            background: '#F0F9FF',
                            color: '#0284C7',
                            fontSize: '10.5px',
                            cursor: 'pointer',
                          }}
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
        )}

        {/* TAB 5: SHIPMENT MEETINGS */}
        {activeTab === 'SHIPMENT_MTG' && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F274E' }}>
                  Weekly Shipment Meeting Decisions &amp; Action Items
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                  Reviews bottlenecks, revised commitments, and responsible section head actions.
                </div>
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
                      { owner: 'Section Head', department: 'Sewing', action: 'Allocate overtime to recover schedule', dueDate: '2026-10-15', status: 'OPEN' },
                    ],
                  })
                }
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#0284C7',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                + Record Meeting
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {shipmentMeetings.map((m: any) => (
                <div
                  key={m.id}
                  style={{
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    padding: '14px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 800, color: '#0F274E' }}>
                      {m.meetingDate} · Job #{m.jobNo} · Style {m.styleNo} ({m.buyer})
                    </div>
                    <div style={{ color: '#0284C7', fontWeight: 650 }}>
                      Revised Commitment: {m.revisedCommitmentDate || m.ccd}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                    <div style={{ background: '#FEF2F2', padding: '8px 10px', borderRadius: '6px', border: '1px solid #FECACA' }}>
                      <div style={{ color: '#DC2626', fontWeight: 700, fontSize: '11px' }}>Bottleneck:</div>
                      <div style={{ color: '#1E293B' }}>{m.bottleneck}</div>
                    </div>
                    <div style={{ background: '#ECFDF5', padding: '8px 10px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                      <div style={{ color: '#059669', fontWeight: 700, fontSize: '11px' }}>Management Decision:</div>
                      <div style={{ color: '#1E293B' }}>{m.decision}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL: Update Fabric Trims */}
        {editingFabTrims && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '460px',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                fontSize: '12px',
              }}
            >
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F274E', marginBottom: '12px' }}>
                Update Fabric &amp; Trims — Job #{editingFabTrims.jobNo}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '3px' }}>Fabric Required Kg</label>
                  <input
                    type="number"
                    value={editingFabTrims.fabricRequiredKg || 0}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => setEditingFabTrims({ ...editingFabTrims, fabricRequiredKg: Number(e.target.value) })}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '3px' }}>Fabric Received Kg</label>
                  <input
                    type="number"
                    value={editingFabTrims.fabricReceivedKg || 0}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => setEditingFabTrims({ ...editingFabTrims, fabricReceivedKg: Number(e.target.value) })}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '3px' }}>Follow-up Note</label>
                  <input
                    type="text"
                    value={editingFabTrims.remarks || ''}
                    onChange={(e) => setEditingFabTrims({ ...editingFabTrims, remarks: e.target.value })}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  onClick={() => setEditingFabTrims(null)}
                  style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveFabricTrimsModal}
                  style={{ padding: '6px 14px', borderRadius: '5px', border: 'none', background: '#0284C7', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Follow-up
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Sample Planning */}
        {editingSample && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '480px',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                fontSize: '12px',
              }}
            >
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F274E', marginBottom: '12px' }}>
                Sample TNA &amp; Dispatch Entry
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '2px' }}>Job No.</label>
                  <input
                    type="text"
                    value={editingSample.jobNo}
                    onChange={(e) => setEditingSample({ ...editingSample, jobNo: e.target.value })}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '2px' }}>Sample Type</label>
                  <input
                    type="text"
                    value={editingSample.sampleType}
                    onChange={(e) => setEditingSample({ ...editingSample, sampleType: e.target.value })}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '2px' }}>Planned Dispatch Date</label>
                  <input
                    type="date"
                    value={editingSample.targetDispatchDate || ''}
                    onChange={(e) => setEditingSample({ ...editingSample, targetDispatchDate: e.target.value })}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '2px' }}>Actual Dispatch Date</label>
                  <input
                    type="date"
                    value={editingSample.actualDispatchDate || ''}
                    onChange={(e) => setEditingSample({ ...editingSample, actualDispatchDate: e.target.value })}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  onClick={() => setEditingSample(null)}
                  style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveSampleModal}
                  style={{ padding: '6px 14px', borderRadius: '5px', border: 'none', background: '#0284C7', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Sample
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Shipment Meeting */}
        {editingMeeting && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '480px',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                fontSize: '12px',
              }}
            >
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F274E', marginBottom: '12px' }}>
                Record Shipment Meeting Decision
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#64748B', marginBottom: '2px' }}>Meeting Date</label>
                    <input
                      type="date"
                      value={editingMeeting.meetingDate}
                      onChange={(e) => setEditingMeeting({ ...editingMeeting, meetingDate: e.target.value })}
                      style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#64748B', marginBottom: '2px' }}>Job No.</label>
                    <input
                      type="text"
                      value={editingMeeting.jobNo}
                      onChange={(e) => setEditingMeeting({ ...editingMeeting, jobNo: e.target.value })}
                      style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '2px' }}>Identified Bottleneck</label>
                  <input
                    type="text"
                    value={editingMeeting.bottleneck}
                    onChange={(e) => setEditingMeeting({ ...editingMeeting, bottleneck: e.target.value })}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '2px' }}>Management Decision</label>
                  <textarea
                    rows={2}
                    value={editingMeeting.decision}
                    onChange={(e) => setEditingMeeting({ ...editingMeeting, decision: e.target.value })}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  onClick={() => setEditingMeeting(null)}
                  style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveMeetingModal}
                  style={{ padding: '6px 14px', borderRadius: '5px', border: 'none', background: '#0284C7', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Decision
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
