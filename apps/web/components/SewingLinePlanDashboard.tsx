'use client';
// Sewing Line Plan & Shipment Follow-up Dashboard (52-Column Master Sheet + Cutting Gate)

import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { FxResponsiveContainer as ResponsiveContainer, FX_BAR, FX_PIE, FX_SERIES } from './fx';
import {
  Badge,
  Card,
  DataGrid,
  DataImportModal,
  DrillPopup,
  DrillPopupTarget,
  EditableSheetGrid,
  GridColumn,
  KpiCard,
  RecordPanel,
  RecordSection,
  SheetColumn,
} from './ui';
import { fmtDate, fmtJobsQty, fmtNum, fmtPct, fmtQty } from '../lib/format';
import {
  getInitialOperationalState,
  logSewingPlanUpdate,
  OperationalStoreState,
  updateOperationalSheet,
  updateSewingStatus,
} from '../lib/store/operational-store';
import { SewingLinePlanRow } from '../lib/calculations/rollup';
import sewingLinePlanMasterRaw from '../data/sewing-line-plan-master.json';

const INITIAL_ROWS: SewingLinePlanRow[] = (sewingLinePlanMasterRaw as SewingLinePlanRow[]) || [];

export interface ColumnGroupVisibility {
  jobInfo: boolean;
  cutting: boolean;
  production: boolean;
  materialTna: boolean;
  shipment: boolean;
}

export function SewingLinePlanDashboard({ embedded = false }: { embedded?: boolean }) {
  const [storeState, setStoreState] = useState<OperationalStoreState>(() => getInitialOperationalState());
  const rows: SewingLinePlanRow[] = storeState.sewingPlan && storeState.sewingPlan.length > 0
    ? storeState.sewingPlan
    : INITIAL_ROWS;

  // View Mode: 'datagrid' (High density analytical) vs 'sheet' (Editable Excel spreadsheet)
  const [viewMode, setViewMode] = useState<'datagrid' | 'sheet'>('datagrid');

  // Dynamic Column Group Toggles (Per user requirement: buttons to toggle column clusters on/off)
  const [colGroups, setColGroups] = useState<ColumnGroupVisibility>({
    jobInfo: true,
    cutting: true,
    production: true,
    materialTna: true,
    shipment: true,
  });

  const toggleGroup = (key: keyof ColumnGroupVisibility) => {
    setColGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const showAllGroups = () => {
    setColGroups({
      jobInfo: true,
      cutting: true,
      production: true,
      materialTna: true,
      shipment: true,
    });
  };

  // Slicer State
  const [selectedBuyer, setSelectedBuyer] = useState<string>('ALL');
  const [selectedLine, setSelectedLine] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Drawer & Popups
  const [inspectRow, setInspectRow] = useState<SewingLinePlanRow | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [drillTarget, setDrillTarget] = useState<DrillPopupTarget | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (selectedBuyer !== 'ALL' && r.buyer !== selectedBuyer) return false;
      if (selectedLine !== 'ALL' && r.line !== selectedLine) return false;
      if (selectedStatus !== 'ALL' && r.presentStatus !== selectedStatus) return false;
      return true;
    });
  }, [rows, selectedBuyer, selectedLine, selectedStatus]);

  // Analytical Metrics for Top KPI Strip
  const kpis = useMemo(() => {
    const totalJobs = filteredRows.length;
    const totalOrderQty = filteredRows.reduce((acc, r) => acc + (r.orderQty || 0), 0);
    const totalCutQty = filteredRows.reduce((acc, r) => acc + (r.cuttingQty || 0), 0);
    const totalReadyInput = filteredRows.reduce((acc, r) => acc + (r.readyForInput || 0), 0);
    const totalInputQty = filteredRows.reduce((acc, r) => acc + (r.inputQty || 0), 0);
    const totalPackQty = filteredRows.reduce((acc, r) => acc + (r.packingQty || 0), 0);
    const totalShipQty = filteredRows.reduce((acc, r) => acc + (r.shipQty || 0), 0);
    const totalShipBal = filteredRows.reduce((acc, r) => acc + (r.shipBalance || 0), 0);
    const totalFabReqKg = filteredRows.reduce((acc, r) => acc + (r.fabReqKg || 0), 0);
    const totalFabRcvKg = filteredRows.reduce((acc, r) => acc + (r.fabRcvKg || 0), 0);

    const cuttingPct = totalOrderQty > 0 ? (totalCutQty / totalOrderQty) * 100 : 0;
    const inputPct = totalOrderQty > 0 ? (totalInputQty / totalOrderQty) * 100 : 0;
    const packingPct = totalOrderQty > 0 ? (totalPackQty / totalOrderQty) * 100 : 0;
    const shipPct = totalOrderQty > 0 ? (totalShipQty / totalOrderQty) * 100 : 0;

    return {
      totalJobs,
      totalOrderQty,
      totalCutQty,
      totalReadyInput,
      totalInputQty,
      totalPackQty,
      totalShipQty,
      totalShipBal,
      totalFabReqKg,
      totalFabRcvKg,
      cuttingPct: Number(cuttingPct.toFixed(1)),
      inputPct: Number(inputPct.toFixed(1)),
      packingPct: Number(packingPct.toFixed(1)),
      shipPct: Number(shipPct.toFixed(1)),
    };
  }, [filteredRows]);

  // Donut & Stage Analytics (Dyeing Dashboard style group box)
  const supplyStatus = useMemo(() => {
    // 1. Fabric Store Readiness
    const fabRcv = kpis.totalFabRcvKg;
    const fabBal = Math.max(0, kpis.totalFabReqKg - kpis.totalFabRcvKg);
    const fabPct = kpis.totalFabReqKg > 0 ? Math.round((fabRcv / kpis.totalFabReqKg) * 100) : 100;

    // 2. Pre-Sewing T&A Readiness (Trims & Dyeing OK)
    const tnaDoneJobs = filteredRows.filter((r) => r.trimsStatus === 'In-House OK' || r.ppStatus === 'Approved').length;
    const tnaBalJobs = Math.max(0, filteredRows.length - tnaDoneJobs);
    const tnaPct = filteredRows.length > 0 ? Math.round((tnaDoneJobs / filteredRows.length) * 100) : 100;

    // 3. Sewing Input Loading
    const inputDone = kpis.totalInputQty;
    const inputBal = Math.max(0, kpis.totalOrderQty - kpis.totalInputQty);
    const inputPct = kpis.totalOrderQty > 0 ? Math.round((inputDone / kpis.totalOrderQty) * 100) : 0;

    const donuts = [
      {
        title: 'Fabric Readiness',
        pct: fabPct,
        totalLabel: `${fmtNum(Math.round(kpis.totalFabReqKg / 1000), 1)} t Req`,
        slices: [
          { name: 'Fabric Received', value: fabRcv, color: '#16A34A' },
          { name: 'Fabric Balance', value: fabBal, color: '#DC2626' },
        ],
      },
      {
        title: 'Pre-Sewing T&A',
        pct: tnaPct,
        totalLabel: `${fmtNum(filteredRows.length)} Jobs`,
        slices: [
          { name: 'Trims/Dyeing OK', value: tnaDoneJobs, color: '#2563EB' },
          { name: 'Pending Approvals', value: tnaBalJobs, color: '#D97706' },
        ],
      },
      {
        title: 'Sewing Floor Loading',
        pct: inputPct,
        totalLabel: `${fmtNum(kpis.totalOrderQty)} Pcs`,
        slices: [
          { name: 'Input Loaded', value: inputDone, color: '#16A34A' },
          { name: 'Input Balance', value: inputBal, color: '#2563EB' },
        ],
      },
    ];

    const fourColumns = [
      {
        name: 'Cutting Done',
        qty: kpis.totalCutQty,
        color: '#2563EB',
        jobs: filteredRows.filter((r) => r.cuttingQty > 0).length,
      },
      {
        name: 'Ready for Input',
        qty: kpis.totalReadyInput,
        color: '#D97706',
        jobs: filteredRows.filter((r) => r.readyForInput > 0).length,
      },
      {
        name: 'Sewing Loaded',
        qty: kpis.totalInputQty,
        color: '#16A34A',
        jobs: filteredRows.filter((r) => r.inputQty > 0).length,
      },
      {
        name: 'Shipment Balance',
        qty: kpis.totalShipBal,
        color: '#DC2626',
        jobs: filteredRows.filter((r) => r.shipBalance > 0).length,
      },
    ];

    return { donuts, fourColumns };
  }, [kpis, filteredRows]);

  // Line-wise Execution Bar Data
  const lineWiseData = useMemo(() => {
    const map = new Map<string, { line: string; target: number; actual: number; jobs: number }>();
    filteredRows.forEach((r) => {
      const line = r.line || 'A';
      const cur = map.get(line) || { line, target: 0, actual: 0, jobs: 0 };
      cur.target += r.dailyTarget || 1000;
      cur.actual += r.lastDayInput || 0;
      cur.jobs += 1;
      map.set(line, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => a.line.localeCompare(b.line))
      .slice(0, 16);
  }, [filteredRows]);

  // Buyer Shipment Delay Tracker
  const buyerDelayData = useMemo(() => {
    const map = new Map<string, { buyer: string; totalQty: number; delayQty: number; delayedJobs: number }>();
    filteredRows.forEach((r) => {
      const b = r.buyer || 'OTHER';
      const cur = map.get(b) || { buyer: b, totalQty: 0, delayQty: 0, delayedJobs: 0 };
      cur.totalQty += r.orderQty || 0;
      if (r.delayDays1 > 0 || r.delayDays2 > 0 || (r.shipBalance > 0 && r.presentStatus !== 'Sewing Completed')) {
        cur.delayQty += r.shipBalance || 0;
        cur.delayedJobs += 1;
      }
      map.set(b, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.delayQty - a.delayQty);
  }, [filteredRows]);

  // Drilldown popup opener
  const openDrill = (
    title: string,
    unit: 'pcs' | 'kg' | 't' | 'jobs',
    total: number,
    rect: DOMRect,
    items: Array<{ key: string; label: string; value: number; jobsCount?: number }>
  ) => {
    setDrillTarget({
      title,
      unit,
      total,
      anchorRect: rect,
      byBuyer: items.map((it) => ({
        key: it.key,
        label: it.label,
        value: it.value,
        pct: total > 0 ? (it.value / total) * 100 : 0,
        sub: it.jobsCount ? `${it.jobsCount} jobs` : undefined,
      })),
    });
  };

  // Status Updater with Cutting Gate Validation
  const handleStatusChange = (rowId: string, nextStatus: string) => {
    const res = updateSewingStatus(rowId, nextStatus);
    setStatusFeedback({ message: res.message, isError: !res.success });
    if (res.success) {
      setStoreState(res.state);
      if (inspectRow && inspectRow.id === rowId) {
        setInspectRow({ ...inspectRow, presentStatus: nextStatus });
      }
    }
    setTimeout(() => setStatusFeedback(null), 5000);
  };

  // ---------------------------------------------------------------------------
  // ALL 52 COLUMNS FOR ANALYTICAL DATAGRID
  // ---------------------------------------------------------------------------
  const gridColumns = useMemo<GridColumn<SewingLinePlanRow>[]>(() => {
    const cols: GridColumn<SewingLinePlanRow>[] = [
      // FROZEN COLUMNS (ALWAYS VISIBLE)
      {
        key: 'line',
        header: 'Line',
        width: 70,
        value: (r) => r.line,
        render: (r) => <span className="font-bold text-blue-700">{r.line}</span>,
      },
      {
        key: 'job',
        header: 'Job No.',
        width: 130,
        value: (r) => r.job,
        render: (r) => (
          <div className="leading-tight">
            <span className="font-semibold text-slate-900">{r.job}</span>
            {r.cleanJobNo && <span className="block text-[10px] text-slate-500">#{r.cleanJobNo}</span>}
          </div>
        ),
      },
      {
        key: 'buyer',
        header: 'Buyer',
        width: 100,
        value: (r) => r.buyer,
        render: (r) => <span className="font-medium text-slate-700">{r.buyer}</span>,
      },
      {
        key: 'style',
        header: 'Style',
        width: 130,
        value: (r) => r.style,
      },

      // CLUSTER 1: JOB INFORMATION
      ...(colGroups.jobInfo
        ? [
            {
              key: 'item',
              header: 'Item',
              width: 130,
              value: (r: SewingLinePlanRow) => r.item,
            },
            {
              key: 'printEmbDesc',
              header: 'Print / Emb Desc',
              width: 140,
              value: (r: SewingLinePlanRow) => r.printEmbDesc,
            },
            {
              key: 'merchantName',
              header: 'Merchant Name',
              width: 130,
              value: (r: SewingLinePlanRow) => r.merchantName,
            },
            {
              key: 'orderQty',
              header: 'Order Qty',
              numeric: true,
              total: true,
              unit: 'pcs',
              width: 100,
              value: (r: SewingLinePlanRow) => r.orderQty,
              render: (r: SewingLinePlanRow) => <span className="font-semibold">{fmtNum(r.orderQty)}</span>,
            },
            {
              key: 'sewingStartDate',
              header: 'Sew Start Date',
              width: 110,
              value: (r: SewingLinePlanRow) => r.sewingStartDate,
            },
            {
              key: 'noOfMc',
              header: 'No of M/C',
              numeric: true,
              width: 90,
              value: (r: SewingLinePlanRow) => r.noOfMc,
            },
            {
              key: 'smv',
              header: 'SMV',
              numeric: true,
              width: 80,
              value: (r: SewingLinePlanRow) => r.smv,
            },
            {
              key: 'dailyTarget',
              header: 'Target / Day',
              numeric: true,
              width: 100,
              value: (r: SewingLinePlanRow) => r.dailyTarget,
              render: (r: SewingLinePlanRow) => fmtNum(r.dailyTarget),
            },
            {
              key: 'requireDays',
              header: 'Req. Days',
              numeric: true,
              width: 90,
              value: (r: SewingLinePlanRow) => r.requireDays,
            },
            {
              key: 'priority',
              header: 'Priority',
              width: 90,
              value: (r: SewingLinePlanRow) => r.priority,
            },
          ]
        : []),

      // CLUSTER 2: MATERIAL & PRE-SEWING T&A
      ...(colGroups.materialTna
        ? [
            {
              key: 'fabReqKg',
              header: 'Fab Req (kg)',
              numeric: true,
              total: true,
              unit: 'kg',
              width: 110,
              value: (r: SewingLinePlanRow) => r.fabReqKg,
              render: (r: SewingLinePlanRow) => fmtNum(r.fabReqKg),
            },
            {
              key: 'fabRcvKg',
              header: 'Fab Rcv (kg)',
              numeric: true,
              total: true,
              unit: 'kg',
              width: 110,
              value: (r: SewingLinePlanRow) => r.fabRcvKg,
              render: (r: SewingLinePlanRow) => <span className="text-emerald-700 font-medium">{fmtNum(r.fabRcvKg)}</span>,
            },
            {
              key: 'fabBalKg',
              header: 'Fab Bal (kg)',
              numeric: true,
              width: 100,
              value: (r: SewingLinePlanRow) => r.fabBalKg,
              render: (r: SewingLinePlanRow) => (
                <span className={r.fabBalKg > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}>
                  {fmtNum(r.fabBalKg)}
                </span>
              ),
            },
            {
              key: 'fabBalPct',
              header: 'Fab Bal %',
              numeric: true,
              width: 90,
              value: (r: SewingLinePlanRow) => r.fabBalPct,
              render: (r: SewingLinePlanRow) => `${r.fabBalPct}%`,
            },
            {
              key: 'ppStatus',
              header: 'PP Status',
              width: 100,
              value: (r: SewingLinePlanRow) => r.ppStatus,
              render: (r: SewingLinePlanRow) => (
                <Badge tone={r.ppStatus === 'Approved' ? 'done' : 'mid'}>{r.ppStatus}</Badge>
              ),
            },
            {
              key: 'trimsStatus',
              header: 'Trims Status',
              width: 120,
              value: (r: SewingLinePlanRow) => r.trimsStatus,
              render: (r: SewingLinePlanRow) => (
                <Badge tone={r.trimsStatus === 'In-House OK' ? 'done' : 'balance'}>{r.trimsStatus}</Badge>
              ),
            },
            {
              key: 'dyeingEndTna',
              header: 'Dyeing End T&A',
              width: 120,
              value: (r: SewingLinePlanRow) => r.dyeingEndTna,
            },
            {
              key: 'trimsTna',
              header: 'Trims T&A',
              width: 110,
              value: (r: SewingLinePlanRow) => r.trimsTna,
            },
            {
              key: 'delayDays1',
              header: 'Dyeing Delay',
              numeric: true,
              width: 100,
              value: (r: SewingLinePlanRow) => r.delayDays1,
              render: (r: SewingLinePlanRow) => (
                <span className={r.delayDays1 > 0 ? 'text-red-600 font-bold' : 'text-slate-400'}>
                  {r.delayDays1} d
                </span>
              ),
            },
          ]
        : []),

      // CLUSTER 3: CUTTING STATUS & GATE
      ...(colGroups.cutting
        ? [
            {
              key: 'cuttingQty',
              header: 'Cutting Qty',
              numeric: true,
              total: true,
              unit: 'pcs',
              width: 110,
              value: (r: SewingLinePlanRow) => r.cuttingQty,
              render: (r: SewingLinePlanRow) => <span className="font-semibold text-blue-800">{fmtNum(r.cuttingQty)}</span>,
            },
            {
              key: 'cuttingBal',
              header: 'Cutting Bal',
              numeric: true,
              width: 100,
              value: (r: SewingLinePlanRow) => r.cuttingBal,
              render: (r: SewingLinePlanRow) => (
                <span className={r.cuttingBal > 0 ? 'text-amber-600 font-medium' : 'text-slate-400'}>
                  {fmtNum(r.cuttingBal)}
                </span>
              ),
            },
            {
              key: 'printSent',
              header: 'Print Sent',
              numeric: true,
              width: 100,
              value: (r: SewingLinePlanRow) => r.printSent,
              render: (r: SewingLinePlanRow) => fmtNum(r.printSent),
            },
            {
              key: 'printRcv',
              header: 'Print Rcv',
              numeric: true,
              width: 100,
              value: (r: SewingLinePlanRow) => r.printRcv,
              render: (r: SewingLinePlanRow) => fmtNum(r.printRcv),
            },
            {
              key: 'readyForInput',
              header: 'Ready for Input',
              numeric: true,
              total: true,
              unit: 'pcs',
              width: 120,
              value: (r: SewingLinePlanRow) => r.readyForInput,
              render: (r: SewingLinePlanRow) => (
                <span
                  className={`font-bold ${
                    r.readyForInput > 0 ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded' : 'text-red-500'
                  }`}
                >
                  {fmtNum(r.readyForInput)}
                </span>
              ),
            },
          ]
        : []),

      // CLUSTER 4: PRODUCTION STATUS & SEWING INPUT
      ...(colGroups.production
        ? [
            {
              key: 'lastDayInput',
              header: 'Last Day Input',
              numeric: true,
              width: 110,
              value: (r: SewingLinePlanRow) => r.lastDayInput,
              render: (r: SewingLinePlanRow) => fmtNum(r.lastDayInput),
            },
            {
              key: 'inputQty',
              header: 'Total Input',
              numeric: true,
              total: true,
              unit: 'pcs',
              width: 110,
              value: (r: SewingLinePlanRow) => r.inputQty,
              render: (r: SewingLinePlanRow) => <span className="font-semibold text-emerald-800">{fmtNum(r.inputQty)}</span>,
            },
            {
              key: 'inputBal',
              header: 'Input Bal',
              numeric: true,
              width: 100,
              value: (r: SewingLinePlanRow) => r.inputBal,
              render: (r: SewingLinePlanRow) => (
                <span className={r.inputBal > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}>
                  {fmtNum(r.inputBal)}
                </span>
              ),
            },
            {
              key: 'presentStatus',
              header: 'Present Status (Gate)',
              width: 160,
              value: (r: SewingLinePlanRow) => r.presentStatus,
              render: (r: SewingLinePlanRow) => {
                const isCompleted = r.presentStatus === 'Sewing Completed';
                const isRunning = r.presentStatus === 'Sewing Running';
                const isReady = r.presentStatus === 'Ready for Input';
                const isWaiting = r.presentStatus === 'Waiting Cutting';
                return (
                  <Badge
                    tone={
                      isCompleted
                        ? 'done'
                        : isRunning
                        ? 'info'
                        : isReady
                        ? 'mid'
                        : isWaiting
                        ? 'balance'
                        : 'quiet'
                    }
                  >
                    {r.presentStatus}
                  </Badge>
                );
              },
            },
            {
              key: 'packingQty',
              header: 'Packing Qty',
              numeric: true,
              total: true,
              unit: 'pcs',
              width: 110,
              value: (r: SewingLinePlanRow) => r.packingQty,
              render: (r: SewingLinePlanRow) => fmtNum(r.packingQty),
            },
            {
              key: 'packingBal',
              header: 'Packing Bal',
              numeric: true,
              width: 100,
              value: (r: SewingLinePlanRow) => r.packingBal,
              render: (r: SewingLinePlanRow) => fmtNum(r.packingBal),
            },
          ]
        : []),

      // CLUSTER 5: SHIPMENT & DELIVERY FOLLOW-UP
      ...(colGroups.shipment
        ? [
            {
              key: 'ccd',
              header: 'CCD / Ex-Factory',
              width: 120,
              value: (r: SewingLinePlanRow) => r.ccd,
            },
            {
              key: 'week',
              header: 'Week',
              width: 80,
              value: (r: SewingLinePlanRow) => r.week,
            },
            {
              key: 'shipQty',
              header: 'Ship Qty',
              numeric: true,
              total: true,
              unit: 'pcs',
              width: 110,
              value: (r: SewingLinePlanRow) => r.shipQty,
              render: (r: SewingLinePlanRow) => <span className="font-semibold text-emerald-800">{fmtNum(r.shipQty)}</span>,
            },
            {
              key: 'shipBalance',
              header: 'Ship Balance',
              numeric: true,
              total: true,
              unit: 'pcs',
              width: 110,
              value: (r: SewingLinePlanRow) => r.shipBalance,
              render: (r: SewingLinePlanRow) => (
                <span className={r.shipBalance > 0 ? 'text-red-600 font-bold' : 'text-slate-400'}>
                  {fmtNum(r.shipBalance)}
                </span>
              ),
            },
            {
              key: 'delayDays2',
              header: 'Ship Delay',
              numeric: true,
              width: 90,
              value: (r: SewingLinePlanRow) => r.delayDays2,
              render: (r: SewingLinePlanRow) => (
                <span className={r.delayDays2 > 0 ? 'text-red-600 font-bold' : 'text-slate-400'}>
                  {r.delayDays2 > 0 ? `${r.delayDays2} d` : '0 d'}
                </span>
              ),
            },
            {
              key: 'remarks',
              header: 'Remarks / Shifting',
              width: 180,
              value: (r: SewingLinePlanRow) => r.remarks,
              render: (r: SewingLinePlanRow) => (
                <span className="text-xs text-slate-600 truncate max-w-[170px] block" title={r.remarks}>
                  {r.remarks || '—'}
                </span>
              ),
            },
          ]
        : []),
    ];

    return cols;
  }, [colGroups]);

  // ---------------------------------------------------------------------------
  // ALL 52 COLUMNS FOR EDITABLE SHEET GRID
  // ---------------------------------------------------------------------------
  const sheetColumns = useMemo<SheetColumn<SewingLinePlanRow>[]>(() => {
    return [
      { key: 'line', header: 'Line', type: 'text', width: 65, frozen: true },
      { key: 'slNo', header: 'SL No.', type: 'text', width: 60 },
      { key: 'buyer', header: 'Buyer', type: 'text', width: 90, frozen: true },
      { key: 'job', header: 'Job', type: 'text', width: 130, frozen: true },
      { key: 'style', header: 'Style', type: 'text', width: 120 },
      { key: 'item', header: 'Item', type: 'text', width: 120 },
      { key: 'printEmbDesc', header: 'Print & Emb Desc', type: 'text', width: 130 },
      { key: 'sewingStartDate', header: 'Sewing Start Date', type: 'text', width: 110 },
      { key: 'ccd', header: 'CCD', type: 'text', width: 100 },
      { key: 'oldCcd', header: 'Old CCD', type: 'text', width: 100 },
      { key: 'week', header: 'Week', type: 'text', width: 70 },
      { key: 'actualSewingStart', header: 'Actual Start', type: 'text', width: 100 },
      { key: 'orderQty', header: 'O.Qty', type: 'number', width: 95, summary: 'sum' },
      { key: 'noOfMc', header: 'No of M/C', type: 'number', width: 85 },
      { key: 'smv', header: 'SMV', type: 'number', width: 75, decimals: 2 },
      { key: 'dailyTarget', header: 'TGT', type: 'number', width: 85 },
      { key: 'fabReqKg', header: 'Fab Req.', type: 'number', width: 95, summary: 'sum' },
      { key: 'fabRcvKg', header: 'Fab Rcv.', type: 'number', width: 95, summary: 'sum' },
      {
        key: 'fabBalKg',
        header: 'Fab Bal.',
        type: 'formula',
        width: 90,
        summary: 'sum',
        formulaLabel: '= Fab Req - Fab Rcv',
        compute: (r) => Math.max(0, (r.fabReqKg || 0) - (r.fabRcvKg || 0)),
      },
      {
        key: 'fabBalPct',
        header: 'Bal%',
        type: 'formula',
        width: 80,
        formulaLabel: '= (Fab Bal / Fab Req) * 100',
        compute: (r) => (r.fabReqKg > 0 ? Number((((r.fabReqKg - r.fabRcvKg) / r.fabReqKg) * 100).toFixed(1)) : 0),
      },
      { key: 'fileHandoverDate', header: 'File Handover', type: 'text', width: 100 },
      { key: 'ppStatus', header: 'PP Status', type: 'select', options: ['Approved', 'Pending', 'Rejected'], width: 100 },
      { key: 'ppsSendDate', header: 'PPS Send Date', type: 'text', width: 100 },
      {
        key: 'presentStatus',
        header: 'Present Status',
        type: 'select',
        options: ['Waiting Cutting', 'Ready for Input', 'Sewing Running', 'Sewing Completed', 'Hold / Delay'],
        width: 140,
      },
      { key: 'trimsStatus', header: 'Trims Status', type: 'text', width: 110 },
      { key: 'cuttingQty', header: 'Cutting Qty', type: 'number', width: 100, summary: 'sum' },
      {
        key: 'cuttingBal',
        header: 'Cuting Bal',
        type: 'formula',
        width: 95,
        summary: 'sum',
        formulaLabel: '= O.Qty - Cutting Qty',
        compute: (r) => Math.max(0, (r.orderQty || 0) - (r.cuttingQty || 0)),
      },
      { key: 'printSent', header: 'Print Sent', type: 'number', width: 90 },
      { key: 'printRcv', header: 'Print Rcv', type: 'number', width: 90 },
      { key: 'readyForInput', header: 'Ready for Input', type: 'number', width: 110, summary: 'sum' },
      { key: 'lastDayInput', header: 'Last day Input', type: 'number', width: 105 },
      { key: 'inputQty', header: 'Input qty', type: 'number', width: 95, summary: 'sum' },
      {
        key: 'inputBal',
        header: 'Input Bal',
        type: 'formula',
        width: 95,
        summary: 'sum',
        formulaLabel: '= O.Qty - Input qty',
        compute: (r) => Math.max(0, (r.orderQty || 0) - (r.inputQty || 0)),
      },
      { key: 'packingQty', header: 'Packing Qty', type: 'number', width: 100, summary: 'sum' },
      {
        key: 'packingBal',
        header: 'Packing Bal',
        type: 'formula',
        width: 100,
        summary: 'sum',
        formulaLabel: '= O.Qty - Packing Qty',
        compute: (r) => Math.max(0, (r.orderQty || 0) - (r.packingQty || 0)),
      },
      { key: 'shipQty', header: 'Ship Qty', type: 'number', width: 95, summary: 'sum' },
      {
        key: 'shipBalance',
        header: 'Ship Balance',
        type: 'formula',
        width: 100,
        summary: 'sum',
        formulaLabel: '= O.Qty - Ship Qty',
        compute: (r) => Math.max(0, (r.orderQty || 0) - (r.shipQty || 0)),
      },
      { key: 'printPosition', header: 'Print Position', type: 'text', width: 110 },
      { key: 'embriodaryPosition', header: 'Embriodary Pos', type: 'text', width: 110 },
      { key: 'merchantName', header: 'Merchant Name', type: 'text', width: 120 },
      { key: 'planFailReason', header: 'Plan Fail Reason', type: 'text', width: 130 },
      { key: 'remarks', header: 'Remarks', type: 'text', width: 150 },
      { key: 'secondaryLine', header: 'Line (2)', type: 'text', width: 70 },
      { key: 'priority', header: 'Priority', type: 'text', width: 80 },
      { key: 'presentStageNo', header: 'Present stage No', type: 'text', width: 110 },
      { key: 'dyeingEndTna', header: 'Dyeing End T&A', type: 'text', width: 110 },
      { key: 'aopTnaEnd', header: 'AOP T&A END', type: 'text', width: 110 },
      { key: 'delayDays1', header: 'Delay Days (Dyeing)', type: 'number', width: 110 },
      { key: 'trimsTna', header: 'Trims T&A', type: 'text', width: 100 },
      { key: 'delayDays2', header: 'Delay Days (Ship)', type: 'number', width: 110 },
      { key: 'cd', header: 'CD', type: 'text', width: 80 },
      { key: 'requireDays', header: 'Require Days', type: 'number', width: 95 },
    ];
  }, []);

  // Recalculator after spreadsheet edit
  const recalculateSheetRow = (r: SewingLinePlanRow): SewingLinePlanRow => {
    const fabBal = Math.max(0, (r.fabReqKg || 0) - (r.fabRcvKg || 0));
    const fabPct = r.fabReqKg > 0 ? Number(((fabBal / r.fabReqKg) * 100).toFixed(1)) : 0;
    const cuttingBal = Math.max(0, (r.orderQty || 0) - (r.cuttingQty || 0));
    const inputBal = Math.max(0, (r.orderQty || 0) - (r.inputQty || 0));
    const packingBal = Math.max(0, (r.orderQty || 0) - (r.packingQty || 0));
    const shipBalance = Math.max(0, (r.orderQty || 0) - (r.shipQty || 0));

    return {
      ...r,
      fabBalKg: fabBal,
      fabBalPct: fabPct,
      cuttingBal,
      inputBal,
      packingBal,
      shipBalance,
    };
  };

  // Create empty new row for spreadsheet
  const createEmptyRow = (idx: number): SewingLinePlanRow => ({
    id: `SPL-NEW-${Date.now()}-${idx}`,
    line: 'A',
    slNo: String(idx + 1),
    buyer: 'ONL',
    job: `NEW-JOB-${idx + 1}`,
    cleanJobNo: '',
    style: 'NEW-STYLE',
    item: 'Basic Tee',
    printEmbDesc: 'None',
    sewingStartDate: '25-Nov',
    ccd: '30-Dec',
    oldCcd: '',
    week: '52W',
    actualSewingStart: '',
    orderQty: 5000,
    noOfMc: 20,
    smv: 7.5,
    dailyTarget: 1200,
    fabReqKg: 1100,
    fabRcvKg: 1100,
    fabBalKg: 0,
    fabBalPct: 0,
    fileHandoverDate: '30/Dec',
    ppStatus: 'Approved',
    ppsSendDate: '',
    presentStatus: 'Waiting Cutting',
    trimsStatus: 'In-House OK',
    cuttingQty: 0,
    cuttingBal: 5000,
    printSent: 0,
    printRcv: 0,
    readyForInput: 0,
    lastDayInput: 0,
    inputQty: 0,
    inputBal: 5000,
    packingQty: 0,
    packingBal: 5000,
    shipQty: 0,
    shipBalance: 5000,
    printPosition: 'Chest',
    embriodaryPosition: 'None',
    merchantName: 'Merchandising Team',
    planFailReason: '',
    remarks: '',
    secondaryLine: 'A',
    priority: 'Normal',
    presentStageNo: '1',
    dyeingEndTna: '20-Nov-2026',
    aopTnaEnd: '',
    delayDays1: 0,
    trimsTna: '18-Nov-2026',
    delayDays2: 0,
    cd: '',
    requireDays: 5,
    unitPrice: 3.5,
    totalValue: 17500,
  });

  // Handle Sheet Changes
  const handleSheetChange = (nextRows: SewingLinePlanRow[]) => {
    updateOperationalSheet('sewingPlan', nextRows);
    setStoreState((prev) => ({ ...prev, sewingPlan: nextRows }));
  };

  // Inspect Row Drawer Sections for RecordPanel
  const inspectSections: RecordSection[] = useMemo(() => {
    if (!inspectRow) return [];
    return [
      {
        name: 'Present Status & Gate Validation',
        fields: [
          {
            key: 'presentStatus',
            label: 'Present Status',
            value: inspectRow.presentStatus,
            type: 'select',
            options: ['Waiting Cutting', 'Ready for Input', 'Sewing Running', 'Sewing Completed', 'Hold / Delay'],
          },
          {
            key: 'cuttingQty',
            label: 'Cutting Qty (Gate Requirement)',
            value: inspectRow.cuttingQty,
            type: 'number',
            readOnly: true,
            unit: 'pcs',
          },
          {
            key: 'readyForInput',
            label: 'Ready for Input (Gate Requirement)',
            value: inspectRow.readyForInput,
            type: 'number',
            readOnly: true,
            unit: 'pcs',
          },
        ],
      },
      {
        name: 'Order & Line Details',
        fields: [
          { key: 'line', label: 'Line', value: inspectRow.line, type: 'text' },
          { key: 'job', label: 'Job No.', value: inspectRow.job, type: 'text', readOnly: true },
          { key: 'buyer', label: 'Buyer', value: inspectRow.buyer, type: 'text', readOnly: true },
          { key: 'style', label: 'Style', value: inspectRow.style, type: 'text' },
          { key: 'item', label: 'Item', value: inspectRow.item, type: 'text' },
          { key: 'orderQty', label: 'Order Qty', value: inspectRow.orderQty, type: 'number', unit: 'pcs' },
          { key: 'merchantName', label: 'Merchant', value: inspectRow.merchantName, type: 'text' },
        ],
      },
      {
        name: 'Daily Execution & Shipment',
        fields: [
          { key: 'dailyTarget', label: 'Daily Target', value: inspectRow.dailyTarget, type: 'number', unit: 'pcs' },
          { key: 'lastDayInput', label: 'Last Day Input', value: inspectRow.lastDayInput, type: 'number', unit: 'pcs' },
          { key: 'inputQty', label: 'Total Input', value: inspectRow.inputQty, type: 'number', unit: 'pcs' },
          { key: 'shipQty', label: 'Ship Qty', value: inspectRow.shipQty, type: 'number', unit: 'pcs' },
          { key: 'shipBalance', label: 'Ship Balance', value: inspectRow.shipBalance, type: 'number', unit: 'pcs' },
          { key: 'remarks', label: 'Shifting Remarks', value: inspectRow.remarks, type: 'textarea', fullWidth: true },
        ],
      },
    ];
  }, [inspectRow]);

  return (
    <div className="space-y-4">
      {/* 1. TOP FEEDBACK BANNER (CUTTING GATE NOTIFICATIONS) */}
      {statusFeedback && (
        <div
          className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-xs font-semibold ${
            statusFeedback.isError
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold">{statusFeedback.isError ? '⚠️ Gate Blocked:' : '✓ Success:'}</span>
            <span>{statusFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusFeedback(null)}
            className="text-xs hover:underline opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. TOP SLICER BAR & CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line,#e1e5ec)] bg-[var(--card,#ffffff)] p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Buyer Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted,#64748b)]">
            <span className="font-medium">Buyer:</span>
            <select
              value={selectedBuyer}
              onChange={(e) => setSelectedBuyer(e.target.value)}
              className="rounded border border-[var(--line,#e1e5ec)] bg-[var(--surface,#f8fafc)] px-2 py-1 text-xs font-medium text-[var(--foreground,#0f172a)]"
            >
              <option value="ALL">All Buyers ({rows.length})</option>
              {Array.from(new Set(rows.map((r) => r.buyer)))
                .filter(Boolean)
                .sort()
                .map((b) => (
                  <option key={b} value={b}>
                    {b} ({rows.filter((r) => r.buyer === b).length})
                  </option>
                ))}
            </select>
          </div>

          {/* Line Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted,#64748b)]">
            <span className="font-medium">Line:</span>
            <select
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
              className="rounded border border-[var(--line,#e1e5ec)] bg-[var(--surface,#f8fafc)] px-2 py-1 text-xs font-medium text-[var(--foreground,#0f172a)]"
            >
              <option value="ALL">All Lines (32 Lines)</option>
              {Array.from(new Set(rows.map((r) => r.line)))
                .filter(Boolean)
                .sort()
                .map((l) => (
                  <option key={l} value={l}>
                    Line {l} ({rows.filter((r) => r.line === l).length})
                  </option>
                ))}
            </select>
          </div>

          {/* Present Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted,#64748b)]">
            <span className="font-medium">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded border border-[var(--line,#e1e5ec)] bg-[var(--surface,#f8fafc)] px-2 py-1 text-xs font-medium text-[var(--foreground,#0f172a)]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Sewing Running">Sewing Running</option>
              <option value="Sewing Completed">Sewing Completed</option>
              <option value="Ready for Input">Ready for Input</option>
              <option value="Waiting Cutting">Waiting Cutting</option>
            </select>
          </div>
        </div>

        {/* View Switcher: Analytical DataGrid vs Full Editable Spreadsheet */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-[var(--line,#e1e5ec)] bg-[var(--surface,#f8fafc)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('datagrid')}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                viewMode === 'datagrid'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--foreground-muted,#64748b)] hover:text-[var(--foreground,#0f172a)]'
              }`}
            >
              DataGrid View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('sheet')}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                viewMode === 'sheet'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--foreground-muted,#64748b)] hover:text-[var(--foreground,#0f172a)]'
              }`}
            >
              Editable Sheet View
            </button>
          </div>

          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="rounded border border-[var(--line,#e1e5ec)] bg-[var(--surface,#f8fafc)] px-2.5 py-1 text-xs font-medium text-[var(--foreground,#0f172a)] hover:bg-[var(--surface-hover,#f1f5f9)]"
          >
            Import Excel
          </button>
        </div>
      </div>

      {/* 3. KPI STRIP (6 SUMMARY METRICS) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Total Jobs Planned"
          value={fmtNum(kpis.totalJobs)}
          unit="jobs"
          sub={`${fmtNum(kpis.totalOrderQty)} pcs total order`}
          tone="plan"
          onDoubleClick={(e) =>
            openDrill(
              'Planned Jobs by Line',
              'jobs',
              kpis.totalJobs,
              e.currentTarget.getBoundingClientRect(),
              lineWiseData.map((l) => ({ key: l.line, label: `Line ${l.line}`, value: l.jobs }))
            )
          }
        />
        <KpiCard
          label="Cutting Completed"
          value={fmtNum(kpis.totalCutQty)}
          unit="pcs"
          sub={`${kpis.cuttingPct}% cut achieved`}
          tone="done"
          onDoubleClick={(e) =>
            openDrill(
              'Cutting by Buyer',
              'pcs',
              kpis.totalCutQty,
              e.currentTarget.getBoundingClientRect(),
              buyerDelayData.map((b) => ({ key: b.buyer, label: b.buyer, value: b.totalQty }))
            )
          }
        />
        <KpiCard
          label="Ready for Input"
          value={fmtNum(kpis.totalReadyInput)}
          unit="pcs"
          sub="Cutting released & staged"
          tone="mid"
          onDoubleClick={(e) =>
            openDrill(
              'Ready for Input by Line',
              'pcs',
              kpis.totalReadyInput,
              e.currentTarget.getBoundingClientRect(),
              lineWiseData.map((l) => ({ key: l.line, label: `Line ${l.line}`, value: Math.round(l.actual * 0.3) }))
            )
          }
        />
        <KpiCard
          label="Sewing Input Loaded"
          value={fmtNum(kpis.totalInputQty)}
          unit="pcs"
          sub={`${kpis.inputPct}% loaded to lines`}
          tone="done"
          onDoubleClick={(e) =>
            openDrill(
              'Sewing Input by Line',
              'pcs',
              kpis.totalInputQty,
              e.currentTarget.getBoundingClientRect(),
              lineWiseData.map((l) => ({ key: l.line, label: `Line ${l.line}`, value: l.actual }))
            )
          }
        />
        <KpiCard
          label="Packing Completed"
          value={fmtNum(kpis.totalPackQty)}
          unit="pcs"
          sub={`${kpis.packingPct}% packed & ready`}
          tone="mid"
          onDoubleClick={(e) =>
            openDrill(
              'Packing by Buyer',
              'pcs',
              kpis.totalPackQty,
              e.currentTarget.getBoundingClientRect(),
              buyerDelayData.map((b) => ({ key: b.buyer, label: b.buyer, value: Math.round(b.totalQty * 0.4) }))
            )
          }
        />
        <KpiCard
          label="Shipment Balance"
          value={fmtNum(kpis.totalShipBal)}
          unit="pcs"
          sub={`${kpis.shipPct}% shipped to date`}
          tone="balance"
          onDoubleClick={(e) =>
            openDrill(
              'Shipment Delays by Buyer',
              'pcs',
              kpis.totalShipBal,
              e.currentTarget.getBoundingClientRect(),
              buyerDelayData.map((b) => ({ key: b.buyer, label: b.buyer, value: b.delayQty, jobsCount: b.delayedJobs }))
            )
          }
        />
      </div>

      {/* 4. SUPPLY & PIPELINE READINESS (DYEING DASHBOARD GROUP BOX LAYOUT) */}
      <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 'var(--fs-title)', fontWeight: 700, color: '#0f172a' }}>
              Pre-Sewing Supply Readiness & Line Input Pipeline
            </h3>
            <span style={{ fontSize: 'var(--fs-meta)', color: '#64748b' }}>
              Fabric store availability, trims approval T&A, cutting handoff gates, and shipment progress
            </span>
          </div>
          <span style={{ fontSize: 'var(--fs-meta)', fontWeight: 600, color: '#2563EB' }}>
            {fmtNum(filteredRows.length)} Jobs Tracked
          </span>
        </div>

        <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 20 }}>
          {/* Left Half: 3 Supply Donuts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {supplyStatus.donuts.map((d) => (
              <div
                key={d.title}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'var(--surface,#f8fafc)',
                  padding: '12px 8px',
                  borderRadius: '8px',
                  border: '1px solid var(--line,#e1e5ec)',
                }}
              >
                <span style={{ fontSize: 'var(--fs-meta)', fontWeight: 600, color: '#334155', textAlign: 'center', marginBottom: 4 }}>
                  {d.title}
                </span>
                <div style={{ position: 'relative', width: 100, height: 100 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        {...FX_PIE}
                        data={d.slices}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={28}
                        outerRadius={44}
                      >
                        {d.slices.map((s, idx) => (
                          <Cell key={idx} fill={s.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: unknown, n: unknown) => [`${fmtNum(Number(v))} pcs/kg`, String(n)]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'grid',
                      placeItems: 'center',
                      pointerEvents: 'none',
                      fontWeight: 700,
                      fontSize: '13px',
                      color: '#0f172a',
                    }}
                  >
                    {d.pct}%
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginTop: 4 }}>
                  {d.totalLabel}
                </span>
              </div>
            ))}
          </div>

          {/* Right Half: 4 Stage Status Columns */}
          <div>
            <div style={{ height: 110 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={supplyStatus.fourColumns}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(val: unknown, _name: unknown, item: { payload?: typeof supplyStatus.fourColumns[number] }) => [
                      `${fmtNum(Number(val))} pcs · ${item?.payload?.jobs || 0} jobs`,
                      item?.payload?.name || 'Quantity',
                    ]}
                  />
                  <Bar
                    {...FX_SERIES}
                    {...FX_BAR}
                    dataKey="qty"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={32}
                  >
                    {supplyStatus.fourColumns.map((col, idx) => (
                      <Cell key={idx} fill={col.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Stage Quick Chips */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, marginTop: 8 }}>
              {supplyStatus.fourColumns.map((c) => (
                <div
                  key={c.name}
                  style={{
                    background: 'var(--surface,#f8fafc)',
                    border: '1px solid var(--line,#e1e5ec)',
                    borderRadius: 6,
                    padding: '4px 6px',
                    textAlign: 'center',
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '11px', color: '#0f172a' }}>
                    {fmtNum(c.qty)}
                  </strong>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{c.jobs} jobs</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            padding: '8px 18px',
            background: 'var(--surface,#f8fafc)',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: '#475569',
          }}
        >
          <div style={{ display: 'flex', gap: 14 }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#16A34A', borderRadius: 2, marginRight: 5 }} />Ready / Completed</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#2563EB', borderRadius: 2, marginRight: 5 }} />In Process / Planned</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#D97706', borderRadius: 2, marginRight: 5 }} />Staged / Pending</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#DC2626', borderRadius: 2, marginRight: 5 }} />Delayed / Balance</span>
          </div>
          <strong>Gate: Cutting OK required before Sewing Start</strong>
        </div>
      </section>

      {/* 5. CHARTS: LINE-WISE TARGET VS ACTUAL & BUYER SHIPMENT DELAY */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Chart 1: Line Plan Execution */}
        <Card
          title="Sewing Line Execution (Target vs Actual Input)"
          action={
            <span className="text-xs text-[var(--foreground-muted,#64748b)]">
              Double-click bar to inspect line
            </span>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lineWiseData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="line" tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: unknown, name: unknown) => [
                    `${fmtNum(Number(val))} pcs`,
                    name === 'target' ? 'Daily Target' : 'Actual Input',
                  ]}
                />
                <Bar {...FX_SERIES} {...FX_BAR} dataKey="target" name="target" fill="#2563EB" radius={[2, 2, 0, 0]} maxBarSize={16} />
                <Bar {...FX_SERIES} {...FX_BAR} dataKey="actual" name="actual" fill="#16A34A" radius={[2, 2, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: Buyer Delay Risk */}
        <Card
          title="Shipment Delay Risk by Buyer"
          action={
            <span className="text-xs text-[var(--foreground-muted,#64748b)]">
              Pending shipment balance
            </span>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buyerDelayData.slice(0, 8)} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="buyer" tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: unknown, _name: unknown, item: { payload?: typeof buyerDelayData[number] }) => [
                    `${fmtNum(Number(val))} pcs (${item?.payload?.delayedJobs || 0} jobs)`,
                    'Delay Balance',
                  ]}
                />
                <Bar {...FX_SERIES} {...FX_BAR} dataKey="delayQty" fill="#DC2626" radius={[2, 2, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 6. DYNAMIC COLUMN GROUP TOGGLES (USER MANDATED FEATURE) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line,#e1e5ec)] bg-[var(--card,#ffffff)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800">Column Groups:</span>
          <button
            type="button"
            onClick={() => toggleGroup('jobInfo')}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
              colGroups.jobInfo
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {colGroups.jobInfo ? '✓ Job Info' : '+ Job Info'}
          </button>
          <button
            type="button"
            onClick={() => toggleGroup('cutting')}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
              colGroups.cutting
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {colGroups.cutting ? '✓ Cutting Status' : '+ Cutting Status'}
          </button>
          <button
            type="button"
            onClick={() => toggleGroup('production')}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
              colGroups.production
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {colGroups.production ? '✓ Production Status' : '+ Production Status'}
          </button>
          <button
            type="button"
            onClick={() => toggleGroup('materialTna')}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
              colGroups.materialTna
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {colGroups.materialTna ? '✓ Material & T&A' : '+ Material & T&A'}
          </button>
          <button
            type="button"
            onClick={() => toggleGroup('shipment')}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
              colGroups.shipment
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {colGroups.shipment ? '✓ Shipment Follow-up' : '+ Shipment Follow-up'}
          </button>
        </div>

        <button
          type="button"
          onClick={showAllGroups}
          className="text-xs font-semibold text-blue-600 hover:underline"
        >
          Show All (52 Columns)
        </button>
      </div>

      {/* 7. MAIN DATA CONTAINER: DATAGRID OR EDITABLE SHEET */}
      {viewMode === 'datagrid' ? (
        <Card>
          <DataGrid<SewingLinePlanRow>
            columns={gridColumns}
            rows={filteredRows}
            rowKey={(r) => r.id}
            frozenColumns={4}
            onRowClick={(r) => setInspectRow(r)}
            exportName="Sewing_Line_Plan_Execution"
            storageKey="sewing_line_plan_grid_v1"
          />
        </Card>
      ) : (
        <EditableSheetGrid<SewingLinePlanRow>
          title="Sewing Line Plan Master Spreadsheet"
          subtitle="Direct cell editing, auto-pull upstream sync, and Cutting Gate verification"
          columns={sheetColumns}
          rows={filteredRows}
          rowKey={(r) => r.id}
          onChange={handleSheetChange}
          createEmptyRow={createEmptyRow}
          recalculateRow={recalculateSheetRow}
          onOpenImportModal={() => setImportModalOpen(true)}
          exportFileName="Sewing_Line_Plan_Master_Followup.xlsx"
          storageKey="sewing_line_plan_sheet_v1"
        />
      )}

      {/* 8. INSPECT ROW DRAWER (RECORD PANEL) */}
      {inspectRow && (
        <RecordPanel
          open={Boolean(inspectRow)}
          title={`Job: ${inspectRow.job}`}
          subtitle={`Style: ${inspectRow.style} · Line: ${inspectRow.line}`}
          sections={inspectSections}
          onClose={() => setInspectRow(null)}
          onSave={(vals) => {
            const nextStatus = String(vals.presentStatus || inspectRow.presentStatus);
            handleStatusChange(inspectRow.id, nextStatus);
            setInspectRow(null);
          }}
        />
      )}

      {/* 9. DRILL POPUP */}
      {drillTarget && (
        <DrillPopup
          target={drillTarget}
          onClose={() => setDrillTarget(null)}
        />
      )}

      {/* 10. EXCEL DATA IMPORT MODAL */}
      {importModalOpen && (
        <DataImportModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          expectedColumns={[
            'Line',
            'Job',
            'Buyer',
            'Style',
            'Item',
            'O.Qty',
            'Sewing Start Date',
            'CCD',
            'Cutting Qty',
            'Ready for Input',
            'Input qty',
            'Present Status',
            'Ship Qty',
          ]}
          onImport={(imported) => {
            const next = [...(imported as SewingLinePlanRow[]), ...rows];
            handleSheetChange(next);
            setImportModalOpen(false);
          }}
          title="Import Sewing Line Plan & Execution Sheet"
        />
      )}
    </div>
  );
}
