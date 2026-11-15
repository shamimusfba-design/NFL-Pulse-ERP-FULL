'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  EditableSheetGrid,
  SheetColumn,
  DataImportModal,
  KpiCard,
} from './ui';
import {
  getInitialOperationalState,
  OperationalSheetKey,
  OperationalStoreState,
  resetOperationalStoreToDefaults,
  updateOperationalSheet,
} from '../lib/store/operational-store';
import {
  calculateExecutiveRollup,
  DyeingBatchRecord,
  ExecutiveRollupResult,
  FinishedFabricRecord,
  GreigeRecord,
  InspectionRecord,
  KnittingRecord,
  OrderMasterItem,
  YarnStockRecord,
} from '../lib/calculations/rollup';
import { fmtNum } from '../lib/format';

interface SheetTabConfig {
  key: OperationalSheetKey;
  code: string;
  label: string;
  deptRoute: string;
  unit: string;
  formulaDesc: string;
}

const SHEET_TABS: SheetTabConfig[] = [
  {
    key: 'orders',
    code: 'Sheet 01',
    label: 'Merchandising Orders',
    deptRoute: '/modules/order-entry',
    unit: 'pcs / $',
    formulaDesc: 'Total Value ($) = Order Qty × FOB Price',
  },
  {
    key: 'yarnStock',
    code: 'Sheet 02',
    label: 'Yarn Store & Challans',
    deptRoute: '/modules/yarn',
    unit: 'kg',
    formulaDesc: 'Available (kg) = Stock - Allocated · Deficit (kg) = max(0, Buffer - Stock)',
  },
  {
    key: 'knitting',
    code: 'Sheet 03',
    label: 'Knitting Production',
    deptRoute: '/modules/knitting',
    unit: 'kg / %',
    formulaDesc: 'Balance (kg) = Planned - Actual · Efficiency (%) = (Actual ÷ Planned) × 100',
  },
  {
    key: 'greige',
    code: 'Sheet 04',
    label: 'Greige Fabric Store',
    deptRoute: '/modules/greige-store',
    unit: 'kg',
    formulaDesc: 'Available Greige (kg) = Received - Allocated to Dyeing',
  },
  {
    key: 'dyeing',
    code: 'Sheet 05',
    label: 'Dyeing Batch Schedule',
    deptRoute: '/modules/dyeing',
    unit: 'kg / %',
    formulaDesc: 'Dyeing Balance (kg) = Required - Delivered · Bulk RFT % Rollup',
  },
  {
    key: 'inspections',
    code: 'Sheet 06',
    label: 'Quality 4-Point Check',
    deptRoute: '/modules/fabric-quality',
    unit: 'kg',
    formulaDesc: 'QC Pass Rate (%) = (Approved Kg ÷ Total Inspected Kg) × 100',
  },
  {
    key: 'finishedFabric',
    code: 'Sheet 07',
    label: 'Finished Fabric Store',
    deptRoute: '/modules/finished-fabric',
    unit: 'kg',
    formulaDesc: 'Dyeing Bal = Req - Recv · Stock Bal = Recv - Issued to Cutting',
  },
];

export function LiveDataEntrySheetCenter({
  initialSheet = 'orders',
}: {
  initialSheet?: OperationalSheetKey;
}) {
  const [opState, setOpState] = useState<OperationalStoreState>(() => getInitialOperationalState());
  const [activeSheet, setActiveSheet] = useState<OperationalSheetKey>(initialSheet);
  const [workspaceMode, setWorkspaceMode] = useState<'SHEET_ONLY' | 'SPLIT_FORM_SHEET'>('SPLIT_FORM_SHEET');
  const [showImportModal, setShowImportModal] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string>('');

  // Quick Entry Form state (adapts to activeSheet)
  const [quickForm, setQuickForm] = useState<Record<string, any>>({});

  useEffect(() => {
    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<OperationalStoreState>;
      if (custom.detail) {
        setOpState(custom.detail);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('nos-operational-data-changed', handleSync);
      return () => window.removeEventListener('nos-operational-data-changed', handleSync);
    }
  }, []);

  // Reset quickForm defaults when switching sheet tabs
  useEffect(() => {
    if (activeSheet === 'orders') {
      setQuickForm({
        jobNo: `48${Math.floor(100 + Math.random() * 890)}`,
        buyer: 'ONLY',
        styleNo: '22040115',
        item: 'Cotton Crew Neck Tee',
        orderQty: 10000,
        fobPrice: 3.95,
        exFactoryDate: '2026-11-28',
        month: 'Nov-26',
        merchandiser: 'Md. Jahidul Islam',
        factory: 'NFL',
        status: 'In Production',
      });
    } else if (activeSheet === 'yarnStock') {
      setQuickForm({
        lotNo: `LOT-SQ-${Math.floor(500 + Math.random() * 400)}`,
        count: '30/1 Combed Cotton',
        type: 'WHITE',
        spinningMill: 'Square Textiles',
        stockKg: 12000,
        allocatedKg: 4500,
        safetyBufferKg: 8000,
      });
    } else if (activeSheet === 'knitting') {
      setQuickForm({
        jobNo: '48093',
        machine: 'KM-02 Mayer & Cie',
        date: new Date().toISOString().slice(0, 10),
        plannedKg: 3500,
        actualKg: 3420,
        status: 'RUNNING',
      });
    } else if (activeSheet === 'greige') {
      setQuickForm({
        lotNo: `GL-48093-${String.fromCharCode(65 + (opState.greige.length % 26))}`,
        jobNo: '48093',
        fabricType: 'Single Jersey 100% Cotton',
        receivedKg: 3200,
        allocatedDyeingKg: 2000,
        agingDays: 2,
        status: 'AVAILABLE',
      });
    } else if (activeSheet === 'dyeing') {
      setQuickForm({
        jobNo: '48093',
        buyer: 'ONLY',
        color: 'Navy Blue',
        fabric: 'Single Jersey',
        dyeingFactory: 'NFL',
        reqKg: 3200,
        dyedKg: 3200,
        deliveredKg: 2950,
        rftPct: 97.2,
        month: 'Nov-26',
        status: 'In Process',
      });
    } else if (activeSheet === 'inspections') {
      setQuickForm({
        jobNo: '48093',
        buyer: 'ONLY',
        rollNo: `R-${Math.floor(10 + Math.random() * 89)}`,
        inspectedKg: 54.0,
        severity: 'None',
        defects: 'Clean Pass - Zero Defects',
        status: 'Approved',
        date: new Date().toISOString().slice(0, 10),
      });
    } else if (activeSheet === 'finishedFabric') {
      setQuickForm({
        jobNo: '48093',
        color: 'Navy Blue',
        totalReq: 3200,
        totalRecv: 3000,
        totalIssued: 2400,
        status: 'In Stock',
      });
    }
  }, [activeSheet, opState.greige.length]);

  const liveRollup: ExecutiveRollupResult = useMemo(
    () => calculateExecutiveRollup(opState),
    [opState]
  );

  const currentTabInfo = useMemo(
    () => SHEET_TABS.find((t) => t.key === activeSheet) || SHEET_TABS[0],
    [activeSheet]
  );

  // ---------------------------------------------------------------------------
  // Row Recalculators (Pure Mathematical Formula Engines per Sheet)
  // ---------------------------------------------------------------------------
  const recalcOrderRow = (r: OrderMasterItem): OrderMasterItem => {
    const qty = Number(r.orderQty) || 0;
    const fob = Number(r.fobPrice) || 0;
    return {
      ...r,
      orderQty: qty,
      fobPrice: fob,
      totalValue: Number((qty * fob).toFixed(2)),
    };
  };

  const recalcYarnRow = (r: YarnStockRecord): YarnStockRecord => {
    const stock = Number(r.stockKg) || 0;
    const alloc = Number(r.allocatedKg) || 0;
    const buffer = Number(r.safetyBufferKg) || 0;
    const avail = Math.max(0, stock - alloc);
    const status =
      stock < buffer * 0.5 ? 'CRITICAL' : stock < buffer ? 'LOW' : 'SUFFICIENT';
    return {
      ...r,
      stockKg: stock,
      allocatedKg: alloc,
      safetyBufferKg: buffer,
      availableKg: avail,
      status,
    };
  };

  const recalcKnittingRow = (r: KnittingRecord): KnittingRecord => {
    const plan = Number(r.plannedKg) || 0;
    const actual = Number(r.actualKg) || 0;
    const bal = Math.max(0, plan - actual);
    const eff = plan > 0 ? Number(((actual / plan) * 100).toFixed(1)) : 0;
    return {
      ...r,
      plannedKg: plan,
      actualKg: actual,
      balanceKg: bal,
      efficiencyPct: eff,
      status: bal <= 0 && plan > 0 ? 'COMPLETED' : r.status || 'RUNNING',
    };
  };

  const recalcGreigeRow = (r: GreigeRecord): GreigeRecord => {
    const recv = Number(r.receivedKg) || 0;
    const alloc = Number(r.allocatedDyeingKg) || 0;
    const avail = Math.max(0, recv - alloc);
    return {
      ...r,
      receivedKg: recv,
      allocatedDyeingKg: alloc,
      availableKg: avail,
      status: avail === 0 && recv > 0 ? 'ALLOCATED_WINCH' : r.status || 'AVAILABLE',
    };
  };

  const recalcDyeingRow = (r: DyeingBatchRecord): DyeingBatchRecord => {
    const req = Number(r.reqKg) || 0;
    const dyed = Number(r.dyedKg) || 0;
    const deliv = Number(r.deliveredKg) || 0;
    const bal = Math.max(0, req - deliv);
    return {
      ...r,
      reqKg: req,
      dyedKg: dyed,
      deliveredKg: deliv,
      balanceKg: bal,
      rftPct: Number(r.rftPct) || 96.0,
      status: bal <= 0 && req > 0 ? 'Dyed & Delivered' : 'In Process',
    };
  };

  const recalcFinishedRow = (r: FinishedFabricRecord): FinishedFabricRecord => {
    const req = Number(r.totalReq) || 0;
    const recv = Number(r.totalRecv) || 0;
    const issued = Number(r.totalIssued) || 0;
    const dyeBal = Math.max(0, req - recv);
    const stockBal = Math.max(0, recv - issued);
    return {
      ...r,
      totalReq: req,
      totalRecv: recv,
      dyeingBalance: dyeBal,
      totalIssued: issued,
      stockBalance: stockBal,
      status: stockBal === 0 && issued > 0 ? 'Fully Issued' : 'In Stock',
    };
  };

  // ---------------------------------------------------------------------------
  // Column Definitions for all 7 Sheets
  // ---------------------------------------------------------------------------
  const orderColumns = useMemo<SheetColumn<OrderMasterItem>[]>(
    () => [
      { key: 'jobNo', header: 'Job No', type: 'text', width: 95, tone: 'plan', summary: 'count' },
      { key: 'buyer', header: 'Buyer', type: 'select', width: 120, options: ['ONLY', 'BS-NMT', 'OVS', 'UTG', 'Name It', 'Only&Sons', 'New Look'] },
      { key: 'styleNo', header: 'Style No', type: 'text', width: 115 },
      { key: 'item', header: 'Garment Item', type: 'text', width: 175 },
      { key: 'orderQty', header: 'Order Qty', type: 'number', width: 120, unit: 'pcs', tone: 'plan', summary: 'sum' },
      { key: 'fobPrice', header: 'FOB Price', type: 'number', width: 105, unit: '$', decimals: 2, summary: 'avg' },
      {
        key: 'totalValue',
        header: 'Total Value',
        type: 'formula',
        width: 135,
        unit: '$',
        decimals: 2,
        formulaLabel: '= Order Qty (E) × FOB Price (F)',
        compute: (r) => Number(((Number(r.orderQty) || 0) * (Number(r.fobPrice) || 0)).toFixed(2)),
        tone: 'done',
        summary: 'sum',
      },
      { key: 'exFactoryDate', header: 'Ex-Factory', type: 'date', width: 125 },
      { key: 'month', header: 'Month', type: 'select', width: 95, options: ['Aug-26', 'Sep-26', 'Oct-26', 'Nov-26', 'Dec-26'] },
      { key: 'merchandiser', header: 'Merchandiser', type: 'text', width: 145 },
      { key: 'factory', header: 'Factory', type: 'select', width: 90, options: ['NFL', 'NCL'] },
      { key: 'status', header: 'Status', type: 'select', width: 130, options: ['In Production', 'Pre-Production', 'Shipped', 'On Hold'] },
    ],
    []
  );

  const yarnColumns = useMemo<SheetColumn<YarnStockRecord>[]>(
    () => [
      { key: 'lotNo', header: 'Lot No', type: 'text', width: 125, tone: 'plan' },
      { key: 'count', header: 'Yarn Count', type: 'text', width: 175 },
      { key: 'type', header: 'Type', type: 'select', width: 105, options: ['WHITE', 'COLOR', 'MELANGE'] },
      { key: 'spinningMill', header: 'Spinning Mill', type: 'select', width: 155, options: ['Square Textiles', 'Badsha Textiles', 'Shurwid Spinning', 'Matin Spinning', 'Akij Textiles', 'Novotex Mills'] },
      { key: 'stockKg', header: 'In-Stock', type: 'number', width: 125, unit: 'kg', tone: 'plan', summary: 'sum' },
      { key: 'allocatedKg', header: 'Allocated', type: 'number', width: 125, unit: 'kg', summary: 'sum' },
      {
        key: 'availableKg',
        header: 'Available Bal',
        type: 'formula',
        width: 135,
        unit: 'kg',
        formulaLabel: '= max(0, In-Stock (E) - Allocated (F))',
        compute: (r) => Math.max(0, (Number(r.stockKg) || 0) - (Number(r.allocatedKg) || 0)),
        tone: (r) => ((Number(r.stockKg) || 0) - (Number(r.allocatedKg) || 0) > 0 ? 'done' : 'balance'),
        summary: 'sum',
      },
      { key: 'safetyBufferKg', header: 'Safety Buffer', type: 'number', width: 130, unit: 'kg', summary: 'sum' },
      {
        key: 'status',
        header: 'Buffer Status',
        type: 'formula',
        width: 125,
        formulaLabel: '= IF(Stock < Buffer, LOW/CRITICAL, SUFFICIENT)',
        compute: (r) => {
          const st = Number(r.stockKg) || 0;
          const buf = Number(r.safetyBufferKg) || 0;
          if (st < buf * 0.5) return 'CRITICAL';
          if (st < buf) return 'LOW';
          return 'SUFFICIENT';
        },
        tone: (r) => ((Number(r.stockKg) || 0) < (Number(r.safetyBufferKg) || 0) ? 'balance' : 'done'),
      },
    ],
    []
  );

  const knittingColumns = useMemo<SheetColumn<KnittingRecord>[]>(
    () => [
      { key: 'jobNo', header: 'Job No', type: 'text', width: 100, tone: 'plan' },
      { key: 'machine', header: 'Knitting Machine', type: 'select', width: 180, options: ['KM-01 Mayer & Cie', 'KM-02 Mayer & Cie', 'KM-06 Terrot Rib', 'KM-07 Terrot Rib', 'KM-11 Pailung Fleece'] },
      { key: 'date', header: 'Prod Date', type: 'date', width: 125 },
      { key: 'plannedKg', header: 'Planned', type: 'number', width: 125, unit: 'kg', tone: 'plan', summary: 'sum' },
      { key: 'actualKg', header: 'Actual Knitted', type: 'number', width: 130, unit: 'kg', tone: 'done', summary: 'sum' },
      {
        key: 'balanceKg',
        header: 'Knit Balance',
        type: 'formula',
        width: 130,
        unit: 'kg',
        formulaLabel: '= max(0, Planned (D) - Actual (E))',
        compute: (r) => Math.max(0, (Number(r.plannedKg) || 0) - (Number(r.actualKg) || 0)),
        tone: (r) => ((Number(r.plannedKg) || 0) - (Number(r.actualKg) || 0) > 0 ? 'balance' : 'done'),
        summary: 'sum',
      },
      {
        key: 'efficiencyPct',
        header: 'Efficiency',
        type: 'formula',
        width: 120,
        unit: '%',
        decimals: 1,
        formulaLabel: '= (Actual (E) ÷ Planned (D)) × 100',
        compute: (r) => {
          const p = Number(r.plannedKg) || 0;
          const a = Number(r.actualKg) || 0;
          return p > 0 ? Number(((a / p) * 100).toFixed(1)) : 0;
        },
        tone: 'done',
        summary: 'avg',
      },
      { key: 'status', header: 'Status', type: 'select', width: 130, options: ['RUNNING', 'COMPLETED', 'SETUP'] },
    ],
    []
  );

  const greigeColumns = useMemo<SheetColumn<GreigeRecord>[]>(
    () => [
      { key: 'lotNo', header: 'Greige Lot #', type: 'text', width: 135, tone: 'plan' },
      { key: 'jobNo', header: 'Job No', type: 'text', width: 100 },
      { key: 'fabricType', header: 'Fabric Construction', type: 'text', width: 210 },
      { key: 'receivedKg', header: 'Received', type: 'number', width: 130, unit: 'kg', tone: 'plan', summary: 'sum' },
      { key: 'allocatedDyeingKg', header: 'Allocated Dyeing', type: 'number', width: 140, unit: 'kg', summary: 'sum' },
      {
        key: 'availableKg',
        header: 'Available Stock',
        type: 'formula',
        width: 140,
        unit: 'kg',
        formulaLabel: '= max(0, Received (D) - Allocated Dyeing (E))',
        compute: (r) => Math.max(0, (Number(r.receivedKg) || 0) - (Number(r.allocatedDyeingKg) || 0)),
        tone: (r) => ((Number(r.receivedKg) || 0) - (Number(r.allocatedDyeingKg) || 0) > 0 ? 'done' : 'mid'),
        summary: 'sum',
      },
      { key: 'agingDays', header: 'Aging', type: 'number', width: 95, unit: 'd', summary: 'avg' },
      { key: 'status', header: 'Store Status', type: 'select', width: 150, options: ['AVAILABLE', 'ALLOCATED_WINCH', 'AGING_ALERT', 'QUALITY_HOLD'] },
    ],
    []
  );

  const dyeingColumns = useMemo<SheetColumn<DyeingBatchRecord>[]>(
    () => [
      { key: 'jobNo', header: 'Job No', type: 'text', width: 95, tone: 'plan' },
      { key: 'buyer', header: 'Buyer', type: 'select', width: 110, options: ['ONLY', 'BS-NMT', 'OVS', 'UTG', 'Name It', 'Only&Sons'] },
      { key: 'color', header: 'Color Shade', type: 'text', width: 140 },
      { key: 'fabric', header: 'Fabric', type: 'text', width: 130 },
      { key: 'dyeingFactory', header: 'Dyeing Mill', type: 'select', width: 140, options: ['NFL', 'Northern Dyeing', 'Newage Textile Ltd.', 'Shadhin Dyeing'] },
      { key: 'reqKg', header: 'Required', type: 'number', width: 120, unit: 'kg', tone: 'plan', summary: 'sum' },
      { key: 'dyedKg', header: 'Dyed', type: 'number', width: 120, unit: 'kg', summary: 'sum' },
      { key: 'deliveredKg', header: 'Delivered', type: 'number', width: 120, unit: 'kg', tone: 'done', summary: 'sum' },
      {
        key: 'balanceKg',
        header: 'Balance',
        type: 'formula',
        width: 125,
        unit: 'kg',
        formulaLabel: '= max(0, Required (F) - Delivered (H))',
        compute: (r) => Math.max(0, (Number(r.reqKg) || 0) - (Number(r.deliveredKg) || 0)),
        tone: (r) => ((Number(r.reqKg) || 0) - (Number(r.deliveredKg) || 0) > 0 ? 'balance' : 'done'),
        summary: 'sum',
      },
      { key: 'rftPct', header: 'RFT Rate', type: 'number', width: 105, unit: '%', decimals: 1, tone: 'done', summary: 'avg' },
      { key: 'status', header: 'Status', type: 'select', width: 140, options: ['Dyed & Delivered', 'In Process', 'Grey Ready', 'Waiting Knitting'] },
    ],
    []
  );

  const inspectionColumns = useMemo<SheetColumn<InspectionRecord>[]>(
    () => [
      { key: 'jobNo', header: 'Job No', type: 'text', width: 100, tone: 'plan' },
      { key: 'buyer', header: 'Buyer', type: 'select', width: 115, options: ['ONLY', 'BS-NMT', 'OVS', 'UTG', 'Name It', 'Only&Sons'] },
      { key: 'rollNo', header: 'Roll No', type: 'text', width: 100 },
      { key: 'date', header: 'Inspect Date', type: 'date', width: 125 },
      { key: 'inspectedKg', header: 'Inspected Wt', type: 'number', width: 130, unit: 'kg', decimals: 1, tone: 'plan', summary: 'sum' },
      { key: 'severity', header: 'Severity', type: 'select', width: 115, options: ['None', 'Minor', 'Major', 'Critical'] },
      { key: 'defects', header: 'Defect Notes', type: 'text', width: 220 },
      {
        key: 'status',
        header: 'QC Decision',
        type: 'select',
        width: 130,
        options: ['Approved', 'Hold', 'Rejected', 'Rework'],
        tone: (r) => (r.status === 'Approved' ? 'done' : r.status === 'Hold' ? 'mid' : 'balance'),
      },
    ],
    []
  );

  const finishedColumns = useMemo<SheetColumn<FinishedFabricRecord>[]>(
    () => [
      { key: 'jobNo', header: 'Job No', type: 'text', width: 105, tone: 'plan' },
      { key: 'color', header: 'Color Shade', type: 'text', width: 150 },
      { key: 'totalReq', header: 'Total Required', type: 'number', width: 135, unit: 'kg', tone: 'plan', summary: 'sum' },
      { key: 'totalRecv', header: 'Total Received', type: 'number', width: 135, unit: 'kg', tone: 'done', summary: 'sum' },
      {
        key: 'dyeingBalance',
        header: 'Dyeing Balance',
        type: 'formula',
        width: 135,
        unit: 'kg',
        formulaLabel: '= max(0, Total Required (C) - Total Received (D))',
        compute: (r) => Math.max(0, (Number(r.totalReq) || 0) - (Number(r.totalRecv) || 0)),
        tone: (r) => ((Number(r.totalReq) || 0) - (Number(r.totalRecv) || 0) > 0 ? 'balance' : 'done'),
        summary: 'sum',
      },
      { key: 'totalIssued', header: 'Issued to Cutting', type: 'number', width: 145, unit: 'kg', summary: 'sum' },
      {
        key: 'stockBalance',
        header: 'In-Stock Balance',
        type: 'formula',
        width: 145,
        unit: 'kg',
        formulaLabel: '= max(0, Total Received (D) - Issued to Cutting (F))',
        compute: (r) => Math.max(0, (Number(r.totalRecv) || 0) - (Number(r.totalIssued) || 0)),
        tone: 'done',
        summary: 'sum',
      },
      { key: 'status', header: 'Status', type: 'select', width: 135, options: ['In Stock', 'Fully Issued', 'Partly Received'] },
    ],
    []
  );

  // ---------------------------------------------------------------------------
  // Guided Form Entry Submission Handler
  // ---------------------------------------------------------------------------
  const handleQuickFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ts = Date.now();

    if (activeSheet === 'orders') {
      const newOrder = recalcOrderRow({
        id: `ORD-${ts}`,
        jobNo: String(quickForm.jobNo || '48150'),
        buyer: String(quickForm.buyer || 'ONLY'),
        styleNo: String(quickForm.styleNo || '22040115'),
        item: String(quickForm.item || 'Crew Neck Tee'),
        orderQty: Number(quickForm.orderQty) || 5000,
        fobPrice: Number(quickForm.fobPrice) || 3.85,
        totalValue: 0,
        exFactoryDate: String(quickForm.exFactoryDate || '2026-11-28'),
        month: String(quickForm.month || 'Nov-26'),
        merchandiser: String(quickForm.merchandiser || 'Md. Jahidul Islam'),
        factory: String(quickForm.factory || 'NFL'),
        status: String(quickForm.status || 'In Production'),
      });
      const updated = updateOperationalSheet('orders', [newOrder, ...opState.orders]);
      setOpState(updated);
      setBannerNotice(`Added Order Job #${newOrder.jobNo} (${fmtNum(newOrder.orderQty)} pcs · $${fmtNum(newOrder.totalValue, 2)}) to Merchandising Sheet.`);
    } else if (activeSheet === 'yarnStock') {
      const newYarn = recalcYarnRow({
        id: `YS-${ts}`,
        lotNo: String(quickForm.lotNo || 'LOT-SQ-550'),
        count: String(quickForm.count || '30/1 Combed Cotton'),
        type: String(quickForm.type || 'WHITE'),
        spinningMill: String(quickForm.spinningMill || 'Square Textiles'),
        stockKg: Number(quickForm.stockKg) || 10000,
        allocatedKg: Number(quickForm.allocatedKg) || 0,
        safetyBufferKg: Number(quickForm.safetyBufferKg) || 8000,
        availableKg: 0,
        status: 'SUFFICIENT',
      });
      const updated = updateOperationalSheet('yarnStock', [newYarn, ...opState.yarnStock]);
      setOpState(updated);
      setBannerNotice(`Added Yarn Lot ${newYarn.lotNo} (${fmtNum(newYarn.stockKg)} kg) to Yarn Store Sheet.`);
    } else if (activeSheet === 'knitting') {
      const newKnit = recalcKnittingRow({
        id: `KT-${ts}`,
        jobNo: String(quickForm.jobNo || '48093'),
        machine: String(quickForm.machine || 'KM-02 Mayer & Cie'),
        date: String(quickForm.date || new Date().toISOString().slice(0, 10)),
        plannedKg: Number(quickForm.plannedKg) || 3000,
        actualKg: Number(quickForm.actualKg) || 2900,
        balanceKg: 0,
        efficiencyPct: 0,
        status: String(quickForm.status || 'RUNNING'),
      });
      const updated = updateOperationalSheet('knitting', [newKnit, ...opState.knitting]);
      setOpState(updated);
      setBannerNotice(`Added Knitting log for Job #${newKnit.jobNo} (${fmtNum(newKnit.actualKg)} kg · ${newKnit.efficiencyPct}% Eff).`);
    } else if (activeSheet === 'greige') {
      const newGreige = recalcGreigeRow({
        id: `GR-${ts}`,
        lotNo: String(quickForm.lotNo || 'GL-48093-N'),
        jobNo: String(quickForm.jobNo || '48093'),
        fabricType: String(quickForm.fabricType || 'Single Jersey 100% Cotton'),
        receivedKg: Number(quickForm.receivedKg) || 3000,
        allocatedDyeingKg: Number(quickForm.allocatedDyeingKg) || 1500,
        availableKg: 0,
        agingDays: Number(quickForm.agingDays) || 1,
        status: String(quickForm.status || 'AVAILABLE'),
      });
      const updated = updateOperationalSheet('greige', [newGreige, ...opState.greige]);
      setOpState(updated);
      setBannerNotice(`Added Greige Lot ${newGreige.lotNo} (${fmtNum(newGreige.receivedKg)} kg received, ${fmtNum(newGreige.availableKg)} kg available).`);
    } else if (activeSheet === 'dyeing') {
      const newDye = recalcDyeingRow({
        id: `DY-${ts}`,
        jobNo: String(quickForm.jobNo || '48093'),
        buyer: String(quickForm.buyer || 'ONLY'),
        color: String(quickForm.color || 'Navy Blue'),
        fabric: String(quickForm.fabric || 'Single Jersey'),
        dyeingFactory: String(quickForm.dyeingFactory || 'NFL'),
        reqKg: Number(quickForm.reqKg) || 3200,
        dyedKg: Number(quickForm.dyedKg) || 3200,
        deliveredKg: Number(quickForm.deliveredKg) || 3000,
        balanceKg: 0,
        rftPct: Number(quickForm.rftPct) || 97.0,
        month: String(quickForm.month || 'Nov-26'),
        status: String(quickForm.status || 'In Process'),
      });
      const updated = updateOperationalSheet('dyeing', [newDye, ...opState.dyeing]);
      setOpState(updated);
      setBannerNotice(`Added Dyeing Batch for Job #${newDye.jobNo} (${fmtNum(newDye.deliveredKg)} kg delivered · ${newDye.rftPct}% RFT).`);
    } else if (activeSheet === 'inspections') {
      const newInsp: InspectionRecord = {
        id: `INS-${ts}`,
        jobNo: String(quickForm.jobNo || '48093'),
        buyer: String(quickForm.buyer || 'ONLY'),
        rollNo: String(quickForm.rollNo || 'R-15'),
        inspectedKg: Number(quickForm.inspectedKg) || 50,
        severity: (quickForm.severity as InspectionRecord['severity']) || 'None',
        defects: String(quickForm.defects || 'Clean Pass'),
        status: (quickForm.status as InspectionRecord['status']) || 'Approved',
        date: String(quickForm.date || new Date().toISOString().slice(0, 10)),
      };
      const updated = updateOperationalSheet('inspections', [newInsp, ...opState.inspections]);
      setOpState(updated);
      setBannerNotice(`Recorded Quality Inspection Roll ${newInsp.rollNo} (${fmtNum(newInsp.inspectedKg, 1)} kg · ${newInsp.status}).`);
    } else if (activeSheet === 'finishedFabric') {
      const newFin = recalcFinishedRow({
        id: `FF-${ts}`,
        jobNo: String(quickForm.jobNo || '48093'),
        color: String(quickForm.color || 'Navy Blue'),
        totalReq: Number(quickForm.totalReq) || 3200,
        totalRecv: Number(quickForm.totalRecv) || 3000,
        dyeingBalance: 0,
        totalIssued: Number(quickForm.totalIssued) || 2400,
        stockBalance: 0,
        status: String(quickForm.status || 'In Stock'),
      });
      const updated = updateOperationalSheet('finishedFabric', [newFin, ...opState.finishedFabric]);
      setOpState(updated);
      setBannerNotice(`Recorded Finished Fabric Ledger for Job #${newFin.jobNo} (In-Stock Balance: ${fmtNum(newFin.stockBalance)} kg).`);
    }
  };

  return (
    <div className="nos-stack" style={{ gap: '12px' }}>
      {/* Top Executive Rollup Impact Strip (Updates Live on Every Cell Edit) */}
      <div className="nos-grid nos-grid-4">
        <KpiCard
          label="Live Order Volume"
          value={fmtNum(liveRollup.totalOrderPcs)}
          unit="pcs"
          delta={`${liveRollup.totalJobsCount} jobs · $${fmtNum(liveRollup.totalOrderValueUsd, 0)} FOB`}
          deltaDirection="up"
        />
        <KpiCard
          label="Yarn Stock & Buffer"
          value={fmtNum(liveRollup.yarnTotalStockTons, 1)}
          unit="t"
          delta={
            liveRollup.yarnDeficitTons > 0
              ? `Deficit: ${fmtNum(liveRollup.yarnDeficitTons, 1)} t below buffer`
              : `Available: ${fmtNum(liveRollup.yarnAvailableTons, 1)} t`
          }
          deltaDirection={liveRollup.yarnDeficitTons > 0 ? 'down' : 'up'}
        />
        <KpiCard
          label="Knitting & Greige Ready"
          value={fmtNum(liveRollup.knittingActualTons, 1)}
          unit="t"
          delta={`Eff ${liveRollup.knittingEfficiencyPct}% · Greige Avail ${fmtNum(liveRollup.greigeAvailableTons, 1)} t`}
          deltaDirection="up"
        />
        <KpiCard
          label="Dyeing Deliv. & RFT %"
          value={fmtNum(liveRollup.dyeingDeliveredTons, 1)}
          unit="t"
          delta={`Bal ${fmtNum(liveRollup.dyeingBalanceTons, 1)} t · RFT ${liveRollup.dyeingOverallRftPct}% · QC ${liveRollup.qualityPassRatePct}%`}
          deltaDirection={liveRollup.dyeingBalanceTons > 0 ? 'flat' : 'up'}
        />
      </div>

      {/* Department Sheet Pipeline Selector Bar */}
      <div
        className="nos-card"
        style={{
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '13px', color: 'var(--nos-ink, #0f172a)' }}>
              Departmental Master Sheets (1–7):
            </strong>
            <span style={{ fontSize: '12px', color: 'var(--nos-ink-3, #64748b)' }}>
              Formula Active: <strong style={{ color: '#2563EB' }}>{currentTabInfo.formulaDesc}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div className="nos-seg" role="tablist">
              <button
                type="button"
                aria-selected={workspaceMode === 'SPLIT_FORM_SHEET'}
                onClick={() => setWorkspaceMode('SPLIT_FORM_SHEET')}
              >
                Form + Sheet Split View
              </button>
              <button
                type="button"
                aria-selected={workspaceMode === 'SHEET_ONLY'}
                onClick={() => setWorkspaceMode('SHEET_ONLY')}
              >
                Full-Width Sheet Visual
              </button>
            </div>

            <Link
              href={currentTabInfo.deptRoute}
              className="btn btn-secondary"
              style={{ fontSize: '11.5px', padding: '5px 10px', textDecoration: 'none' }}
            >
              Open {currentTabInfo.label} Dashboard →
            </Link>

            <button
              type="button"
              onClick={() => {
                const reset = resetOperationalStoreToDefaults();
                setOpState(reset);
                setBannerNotice('Restored baseline factory seed records across all 7 operational sheets.');
              }}
              className="btn btn-secondary"
              style={{ fontSize: '11.5px', padding: '5px 10px' }}
            >
              Reset Baseline Seed
            </button>
          </div>
        </div>

        {/* 7 Sheet Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {SHEET_TABS.map((tab) => {
            const isActive = activeSheet === tab.key;
            const count = (opState[tab.key] as any[])?.length || 0;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSheet(tab.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: isActive ? '1px solid #2563EB' : '1px solid var(--nos-line, #e2e8f0)',
                  background: isActive ? '#2563EB' : 'var(--nos-bg-subtle, #f8fafc)',
                  color: isActive ? '#ffffff' : 'var(--nos-ink, #0f172a)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--nos-surface, #e2e8f0)',
                    color: isActive ? '#ffffff' : 'var(--nos-ink-2, #334155)',
                  }}
                >
                  {tab.code}
                </span>
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '11px',
                    opacity: 0.85,
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {bannerNotice && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 14px',
            borderRadius: '6px',
            background: '#DCFCE7',
            border: '1px solid #86EFAC',
            color: '#166534',
            fontSize: '12.5px',
            fontWeight: 700,
          }}
        >
          <span>{bannerNotice}</span>
          <button
            type="button"
            onClick={() => setBannerNotice('')}
            style={{ background: 'transparent', border: 'none', fontWeight: 800, cursor: 'pointer', color: '#166534' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Split or Full-Width Sheet Workspace */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: workspaceMode === 'SPLIT_FORM_SHEET' ? '310px minmax(0, 1fr)' : 'minmax(0, 1fr)',
          gap: '12px',
          alignItems: 'start',
        }}
      >
        {/* Left Guided Data Entry Panel (when in SPLIT_FORM_SHEET mode) */}
        {workspaceMode === 'SPLIT_FORM_SHEET' && (
          <div
            className="nos-card"
            style={{
              padding: '14px',
              border: '1px solid var(--nos-line-strong, #cbd5e1)',
              position: 'sticky',
              top: '56px',
            }}
          >
            <div style={{ borderBottom: '1px solid var(--nos-line, #e2e8f0)', paddingBottom: '8px', marginBottom: '12px' }}>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  color: '#2563EB',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {currentTabInfo.code} · Guided Entry Form
              </span>
              <h3 style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 800, color: 'var(--nos-ink, #0f172a)' }}>
                + Add Record to {currentTabInfo.label}
              </h3>
            </div>

            <form onSubmit={handleQuickFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeSheet === 'orders' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Job No</label>
                      <input
                        type="text"
                        required
                        value={quickForm.jobNo || ''}
                        onChange={(e) => setQuickForm({ ...quickForm, jobNo: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Buyer</label>
                      <select
                        value={quickForm.buyer || 'ONLY'}
                        onChange={(e) => setQuickForm({ ...quickForm, buyer: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="ONLY">ONLY</option>
                        <option value="BS-NMT">BS-NMT</option>
                        <option value="OVS">OVS</option>
                        <option value="UTG">UTG</option>
                        <option value="Name It">Name It</option>
                        <option value="Only&Sons">Only&amp;Sons</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Style No</label>
                    <input
                      type="text"
                      required
                      value={quickForm.styleNo || ''}
                      onChange={(e) => setQuickForm({ ...quickForm, styleNo: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Garment Item Description</label>
                    <input
                      type="text"
                      required
                      value={quickForm.item || ''}
                      onChange={(e) => setQuickForm({ ...quickForm, item: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Order Qty (pcs)</label>
                      <input
                        type="number"
                        required
                        value={quickForm.orderQty ?? 10000}
                        onChange={(e) => setQuickForm({ ...quickForm, orderQty: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>FOB Price ($)</label>
                      <input
                        type="number"
                        step="0.05"
                        required
                        value={quickForm.fobPrice ?? 3.95}
                        onChange={(e) => setQuickForm({ ...quickForm, fobPrice: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                  <div style={{ background: 'var(--nos-bg-subtle, #f8fafc)', padding: '6px 10px', borderRadius: '5px', border: '1px dashed #93C5FD', fontSize: '12px' }}>
                    <span>fx Total Value: </span>
                    <strong style={{ color: '#16A34A' }}>
                      ${fmtNum((Number(quickForm.orderQty) || 0) * (Number(quickForm.fobPrice) || 0), 2)}
                    </strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Ex-Factory Date</label>
                      <input
                        type="date"
                        value={quickForm.exFactoryDate || '2026-11-28'}
                        onChange={(e) => setQuickForm({ ...quickForm, exFactoryDate: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Plant</label>
                      <select
                        value={quickForm.factory || 'NFL'}
                        onChange={(e) => setQuickForm({ ...quickForm, factory: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="NFL">NFL</option>
                        <option value="NCL">NCL</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {activeSheet === 'yarnStock' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Yarn Lot Number</label>
                    <input
                      type="text"
                      required
                      value={quickForm.lotNo || ''}
                      onChange={(e) => setQuickForm({ ...quickForm, lotNo: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Yarn Count &amp; Spec</label>
                    <input
                      type="text"
                      required
                      value={quickForm.count || ''}
                      onChange={(e) => setQuickForm({ ...quickForm, count: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Spinning Mill</label>
                      <select
                        value={quickForm.spinningMill || 'Square Textiles'}
                        onChange={(e) => setQuickForm({ ...quickForm, spinningMill: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="Square Textiles">Square Textiles</option>
                        <option value="Badsha Textiles">Badsha Textiles</option>
                        <option value="Shurwid Spinning">Shurwid Spinning</option>
                        <option value="Matin Spinning">Matin Spinning</option>
                        <option value="Akij Textiles">Akij Textiles</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Type</label>
                      <select
                        value={quickForm.type || 'WHITE'}
                        onChange={(e) => setQuickForm({ ...quickForm, type: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="WHITE">WHITE</option>
                        <option value="COLOR">COLOR</option>
                        <option value="MELANGE">MELANGE</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>In-Stock (kg)</label>
                      <input
                        type="number"
                        required
                        value={quickForm.stockKg ?? 12000}
                        onChange={(e) => setQuickForm({ ...quickForm, stockKg: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Allocated (kg)</label>
                      <input
                        type="number"
                        required
                        value={quickForm.allocatedKg ?? 4500}
                        onChange={(e) => setQuickForm({ ...quickForm, allocatedKg: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Safety Buffer (kg)</label>
                    <input
                      type="number"
                      required
                      value={quickForm.safetyBufferKg ?? 8000}
                      onChange={(e) => setQuickForm({ ...quickForm, safetyBufferKg: Number(e.target.value) })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div style={{ background: 'var(--nos-bg-subtle, #f8fafc)', padding: '6px 10px', borderRadius: '5px', border: '1px dashed #93C5FD', fontSize: '12px' }}>
                    <span>fx Available: </span>
                    <strong style={{ color: '#16A34A' }}>
                      {fmtNum(Math.max(0, (Number(quickForm.stockKg) || 0) - (Number(quickForm.allocatedKg) || 0)))} kg
                    </strong>
                  </div>
                </>
              )}

              {activeSheet === 'knitting' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Job No</label>
                      <input
                        type="text"
                        required
                        value={quickForm.jobNo || ''}
                        onChange={(e) => setQuickForm({ ...quickForm, jobNo: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Date</label>
                      <input
                        type="date"
                        value={quickForm.date || ''}
                        onChange={(e) => setQuickForm({ ...quickForm, date: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Knitting Machine</label>
                    <select
                      value={quickForm.machine || 'KM-02 Mayer & Cie'}
                      onChange={(e) => setQuickForm({ ...quickForm, machine: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="KM-01 Mayer & Cie">KM-01 Mayer &amp; Cie</option>
                      <option value="KM-02 Mayer & Cie">KM-02 Mayer &amp; Cie</option>
                      <option value="KM-06 Terrot Rib">KM-06 Terrot Rib</option>
                      <option value="KM-07 Terrot Rib">KM-07 Terrot Rib</option>
                      <option value="KM-11 Pailung Fleece">KM-11 Pailung Fleece</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Planned (kg)</label>
                      <input
                        type="number"
                        required
                        value={quickForm.plannedKg ?? 3500}
                        onChange={(e) => setQuickForm({ ...quickForm, plannedKg: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Actual (kg)</label>
                      <input
                        type="number"
                        required
                        value={quickForm.actualKg ?? 3420}
                        onChange={(e) => setQuickForm({ ...quickForm, actualKg: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                  <div style={{ background: 'var(--nos-bg-subtle, #f8fafc)', padding: '6px 10px', borderRadius: '5px', border: '1px dashed #93C5FD', fontSize: '12px' }}>
                    <span>fx Balance: </span>
                    <strong>{fmtNum(Math.max(0, (Number(quickForm.plannedKg) || 0) - (Number(quickForm.actualKg) || 0)))} kg</strong>
                    {' · '}
                    <span>Eff: </span>
                    <strong style={{ color: '#16A34A' }}>
                      {Number(quickForm.plannedKg) > 0
                        ? (((Number(quickForm.actualKg) || 0) / Number(quickForm.plannedKg)) * 100).toFixed(1)
                        : '0.0'}
                      %
                    </strong>
                  </div>
                </>
              )}

              {activeSheet === 'greige' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Greige Lot #</label>
                      <input
                        type="text"
                        required
                        value={quickForm.lotNo || ''}
                        onChange={(e) => setQuickForm({ ...quickForm, lotNo: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Job No</label>
                      <input
                        type="text"
                        required
                        value={quickForm.jobNo || ''}
                        onChange={(e) => setQuickForm({ ...quickForm, jobNo: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Fabric Construction</label>
                    <input
                      type="text"
                      required
                      value={quickForm.fabricType || ''}
                      onChange={(e) => setQuickForm({ ...quickForm, fabricType: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Received (kg)</label>
                      <input
                        type="number"
                        required
                        value={quickForm.receivedKg ?? 3200}
                        onChange={(e) => setQuickForm({ ...quickForm, receivedKg: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Dyeing Alloc (kg)</label>
                      <input
                        type="number"
                        required
                        value={quickForm.allocatedDyeingKg ?? 2000}
                        onChange={(e) => setQuickForm({ ...quickForm, allocatedDyeingKg: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                  <div style={{ background: 'var(--nos-bg-subtle, #f8fafc)', padding: '6px 10px', borderRadius: '5px', border: '1px dashed #93C5FD', fontSize: '12px' }}>
                    <span>fx Available Greige: </span>
                    <strong style={{ color: '#16A34A' }}>
                      {fmtNum(Math.max(0, (Number(quickForm.receivedKg) || 0) - (Number(quickForm.allocatedDyeingKg) || 0)))} kg
                    </strong>
                  </div>
                </>
              )}

              {activeSheet === 'dyeing' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Job No</label>
                      <input
                        type="text"
                        required
                        value={quickForm.jobNo || ''}
                        onChange={(e) => setQuickForm({ ...quickForm, jobNo: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Buyer</label>
                      <select
                        value={quickForm.buyer || 'ONLY'}
                        onChange={(e) => setQuickForm({ ...quickForm, buyer: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="ONLY">ONLY</option>
                        <option value="BS-NMT">BS-NMT</option>
                        <option value="OVS">OVS</option>
                        <option value="UTG">UTG</option>
                        <option value="Name It">Name It</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Color Shade</label>
                      <input
                        type="text"
                        required
                        value={quickForm.color || ''}
                        onChange={(e) => setQuickForm({ ...quickForm, color: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Dyeing Mill</label>
                      <select
                        value={quickForm.dyeingFactory || 'NFL'}
                        onChange={(e) => setQuickForm({ ...quickForm, dyeingFactory: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="NFL">NFL</option>
                        <option value="Northern Dyeing">Northern Dyeing</option>
                        <option value="Newage Textile Ltd.">Newage Textile Ltd.</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Required (kg)</label>
                      <input
                        type="number"
                        required
                        value={quickForm.reqKg ?? 3200}
                        onChange={(e) => setQuickForm({ ...quickForm, reqKg: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Delivered (kg)</label>
                      <input
                        type="number"
                        required
                        value={quickForm.deliveredKg ?? 2950}
                        onChange={(e) => setQuickForm({ ...quickForm, deliveredKg: Number(e.target.value), dyedKg: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Batch RFT (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={quickForm.rftPct ?? 97.2}
                      onChange={(e) => setQuickForm({ ...quickForm, rftPct: Number(e.target.value) })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div style={{ background: 'var(--nos-bg-subtle, #f8fafc)', padding: '6px 10px', borderRadius: '5px', border: '1px dashed #93C5FD', fontSize: '12px' }}>
                    <span>fx Dyeing Balance: </span>
                    <strong style={{ color: '#DC2626' }}>
                      {fmtNum(Math.max(0, (Number(quickForm.reqKg) || 0) - (Number(quickForm.deliveredKg) || 0)))} kg
                    </strong>
                  </div>
                </>
              )}

              {activeSheet === 'inspections' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Job No</label>
                      <input
                        type="text"
                        required
                        value={quickForm.jobNo || ''}
                        onChange={(e) => setQuickForm({ ...quickForm, jobNo: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Roll No</label>
                      <input
                        type="text"
                        required
                        value={quickForm.rollNo || ''}
                        onChange={(e) => setQuickForm({ ...quickForm, rollNo: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Inspected (kg)</label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={quickForm.inspectedKg ?? 54.0}
                        onChange={(e) => setQuickForm({ ...quickForm, inspectedKg: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>QC Decision</label>
                      <select
                        value={quickForm.status || 'Approved'}
                        onChange={(e) => setQuickForm({ ...quickForm, status: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="Approved">Approved</option>
                        <option value="Hold">Hold</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Rework">Rework</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Defect Observation</label>
                    <input
                      type="text"
                      value={quickForm.defects || ''}
                      onChange={(e) => setQuickForm({ ...quickForm, defects: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </>
              )}

              {activeSheet === 'finishedFabric' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Job No</label>
                      <input
                        type="text"
                        required
                        value={quickForm.jobNo || ''}
                        onChange={(e) => setQuickForm({ ...quickForm, jobNo: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Color Shade</label>
                      <input
                        type="text"
                        required
                        value={quickForm.color || ''}
                        onChange={(e) => setQuickForm({ ...quickForm, color: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Total Req (kg)</label>
                      <input
                        type="number"
                        required
                        value={quickForm.totalReq ?? 3200}
                        onChange={(e) => setQuickForm({ ...quickForm, totalReq: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Total Recv (kg)</label>
                      <input
                        type="number"
                        required
                        value={quickForm.totalRecv ?? 3000}
                        onChange={(e) => setQuickForm({ ...quickForm, totalRecv: Number(e.target.value) })}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px' }}>Issued to Cutting (kg)</label>
                    <input
                      type="number"
                      required
                      value={quickForm.totalIssued ?? 2400}
                      onChange={(e) => setQuickForm({ ...quickForm, totalIssued: Number(e.target.value) })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12.5px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div style={{ background: 'var(--nos-bg-subtle, #f8fafc)', padding: '6px 10px', borderRadius: '5px', border: '1px dashed #93C5FD', fontSize: '12px' }}>
                    <span>fx Stock Balance: </span>
                    <strong style={{ color: '#16A34A' }}>
                      {fmtNum(Math.max(0, (Number(quickForm.totalRecv) || 0) - (Number(quickForm.totalIssued) || 0)))} kg
                    </strong>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', fontWeight: 800, marginTop: '4px' }}
              >
                + Commit Entry to {currentTabInfo.code}
              </button>
            </form>
          </div>
        )}

        {/* Right Interactive Spreadsheet Visual Canvas */}
        <div>
          {activeSheet === 'orders' && (
            <EditableSheetGrid<OrderMasterItem>
              title="Sheet 01 · Merchandising Order & PO Master Sheet"
              subtitle="Edit Order Qty or FOB Price directly in cells — Total Value ($) and plant fabric requirements recalculate automatically"
              columns={orderColumns}
              rows={opState.orders}
              rowKey={(r) => r.id}
              recalculateRow={recalcOrderRow}
              createEmptyRow={(idx) => ({
                id: `ORD-${Date.now()}-${idx}`,
                jobNo: `${48100 + idx}`,
                buyer: 'ONLY',
                styleNo: `22040${100 + idx}`,
                item: 'Crew Neck T-Shirt',
                orderQty: 6000,
                fobPrice: 3.9,
                totalValue: 23400,
                exFactoryDate: '2026-11-25',
                month: 'Nov-26',
                status: 'In Production',
                merchandiser: 'Md. Jahidul Islam',
                factory: 'NFL',
              })}
              onChange={(nextRows) => {
                const updated = updateOperationalSheet('orders', nextRows);
                setOpState(updated);
              }}
              onOpenImportModal={() => setShowImportModal(true)}
              exportFileName="merchandising-orders-sheet"
            />
          )}

          {activeSheet === 'yarnStock' && (
            <EditableSheetGrid<YarnStockRecord>
              title="Sheet 02 · Yarn Store & Spinning Mill Challan Ledger"
              subtitle="Edit In-Stock or Allocated (kg) directly — Available Balance and Safety Buffer Alerts compute automatically"
              columns={yarnColumns}
              rows={opState.yarnStock}
              rowKey={(r) => r.id}
              recalculateRow={recalcYarnRow}
              createEmptyRow={(idx) => ({
                id: `YS-${Date.now()}-${idx}`,
                lotNo: `LOT-SQ-${410 + idx}`,
                count: '30/1 Combed Cotton',
                type: 'WHITE',
                spinningMill: 'Square Textiles',
                stockKg: 10000,
                allocatedKg: 4000,
                safetyBufferKg: 8000,
                availableKg: 6000,
                status: 'SUFFICIENT',
              })}
              onChange={(nextRows) => {
                const updated = updateOperationalSheet('yarnStock', nextRows);
                setOpState(updated);
              }}
              onOpenImportModal={() => setShowImportModal(true)}
              exportFileName="yarn-store-sheet"
            />
          )}

          {activeSheet === 'knitting' && (
            <EditableSheetGrid<KnittingRecord>
              title="Sheet 03 · Knitting Floor Machine Production Sheet"
              subtitle="Edit Planned or Actual Knitted (kg) — Knitting Balance and Machine Efficiency % auto-calculate"
              columns={knittingColumns}
              rows={opState.knitting}
              rowKey={(r) => r.id}
              recalculateRow={recalcKnittingRow}
              createEmptyRow={(idx) => ({
                id: `KT-${Date.now()}-${idx}`,
                jobNo: '48093',
                machine: 'KM-02 Mayer & Cie',
                date: new Date().toISOString().slice(0, 10),
                plannedKg: 3000,
                actualKg: 2850,
                balanceKg: 150,
                efficiencyPct: 95.0,
                status: 'RUNNING',
              })}
              onChange={(nextRows) => {
                const updated = updateOperationalSheet('knitting', nextRows);
                setOpState(updated);
              }}
              onOpenImportModal={() => setShowImportModal(true)}
              exportFileName="knitting-production-sheet"
            />
          )}

          {activeSheet === 'greige' && (
            <EditableSheetGrid<GreigeRecord>
              title="Sheet 04 · Greige Fabric Receiving & Winch Allocation Sheet"
              subtitle="Edit Received or Allocated Dyeing (kg) — Available Greige Stock updates immediately across the ERP"
              columns={greigeColumns}
              rows={opState.greige}
              rowKey={(r) => r.id}
              recalculateRow={recalcGreigeRow}
              createEmptyRow={(idx) => ({
                id: `GR-${Date.now()}-${idx}`,
                lotNo: `GL-48093-${idx}`,
                jobNo: '48093',
                fabricType: 'Single Jersey 100% Cotton',
                receivedKg: 3200,
                allocatedDyeingKg: 1800,
                availableKg: 1400,
                agingDays: 2,
                status: 'AVAILABLE',
              })}
              onChange={(nextRows) => {
                const updated = updateOperationalSheet('greige', nextRows);
                setOpState(updated);
              }}
              onOpenImportModal={() => setShowImportModal(true)}
              exportFileName="greige-store-sheet"
            />
          )}

          {activeSheet === 'dyeing' && (
            <EditableSheetGrid<DyeingBatchRecord>
              title="Sheet 05 · Dyeing Batch & Winch Delivery Sheet"
              subtitle="Edit Required, Dyed, Delivered (kg), or RFT (%) — Balance and Plant RFT % update live"
              columns={dyeingColumns}
              rows={opState.dyeing}
              rowKey={(r) => r.id}
              recalculateRow={recalcDyeingRow}
              createEmptyRow={(idx) => ({
                id: `DY-${Date.now()}-${idx}`,
                jobNo: '48093',
                buyer: 'ONLY',
                color: 'Navy Blue',
                fabric: 'Single Jersey',
                reqKg: 3000,
                dyedKg: 3000,
                deliveredKg: 2700,
                balanceKg: 300,
                rftPct: 96.8,
                status: 'In Process',
                month: 'Nov-26',
                dyeingFactory: 'NFL',
              })}
              onChange={(nextRows) => {
                const updated = updateOperationalSheet('dyeing', nextRows);
                setOpState(updated);
              }}
              onOpenImportModal={() => setShowImportModal(true)}
              exportFileName="dyeing-batches-sheet"
            />
          )}

          {activeSheet === 'inspections' && (
            <EditableSheetGrid<InspectionRecord>
              title="Sheet 06 · Fabric Quality 4-Point Inspection Sheet"
              subtitle="Enter roll inspection weights and QC Decisions (Approved / Hold / Rejected) — Plant Pass Rate % auto-calculates"
              columns={inspectionColumns}
              rows={opState.inspections}
              rowKey={(r) => r.id}
              createEmptyRow={(idx) => ({
                id: `INS-${Date.now()}-${idx}`,
                jobNo: '48093',
                buyer: 'ONLY',
                rollNo: `R-${20 + idx}`,
                inspectedKg: 50.0,
                status: 'Approved',
                severity: 'None',
                defects: 'Clean Pass',
                date: new Date().toISOString().slice(0, 10),
              })}
              onChange={(nextRows) => {
                const updated = updateOperationalSheet('inspections', nextRows);
                setOpState(updated);
              }}
              onOpenImportModal={() => setShowImportModal(true)}
              exportFileName="quality-inspection-sheet"
            />
          )}

          {activeSheet === 'finishedFabric' && (
            <EditableSheetGrid<FinishedFabricRecord>
              title="Sheet 07 · Finished Fabric Store & Cutting Issue Sheet"
              subtitle="Edit Total Required, Received, and Issued to Cutting (kg) — Dyeing Balance and Stock Balance auto-calculate"
              columns={finishedColumns}
              rows={opState.finishedFabric}
              rowKey={(r) => r.id}
              recalculateRow={recalcFinishedRow}
              createEmptyRow={(idx) => ({
                id: `FF-${Date.now()}-${idx}`,
                jobNo: '48093',
                color: 'Navy Blue',
                totalReq: 3200,
                totalRecv: 3000,
                dyeingBalance: 200,
                totalIssued: 2200,
                stockBalance: 800,
                status: 'In Stock',
              })}
              onChange={(nextRows) => {
                const updated = updateOperationalSheet('finishedFabric', nextRows);
                setOpState(updated);
              }}
              onOpenImportModal={() => setShowImportModal(true)}
              exportFileName="finished-fabric-sheet"
            />
          )}
        </div>
      </div>

      {/* Universal CSV/Excel Import Modal for the currently active sheet */}
      <DataImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title={`Import Spreadsheet into ${currentTabInfo.code}: ${currentTabInfo.label}`}
        department={currentTabInfo.label}
        expectedColumns={
          activeSheet === 'orders'
            ? ['jobNo', 'buyer', 'styleNo', 'item', 'orderQty', 'fobPrice', 'exFactoryDate']
            : activeSheet === 'yarnStock'
            ? ['lotNo', 'count', 'spinningMill', 'stockKg', 'allocatedKg', 'safetyBufferKg']
            : activeSheet === 'knitting'
            ? ['jobNo', 'machine', 'date', 'plannedKg', 'actualKg']
            : activeSheet === 'greige'
            ? ['lotNo', 'jobNo', 'fabricType', 'receivedKg', 'allocatedDyeingKg']
            : activeSheet === 'dyeing'
            ? ['jobNo', 'buyer', 'color', 'fabric', 'reqKg', 'dyedKg', 'deliveredKg', 'rftPct']
            : activeSheet === 'inspections'
            ? ['jobNo', 'buyer', 'rollNo', 'inspectedKg', 'status', 'severity']
            : ['jobNo', 'color', 'totalReq', 'totalRecv', 'totalIssued']
        }
        onImport={(importedRows) => {
          const ts = Date.now();
          if (activeSheet === 'orders') {
            const mapped = importedRows.map((r, i) =>
              recalcOrderRow({
                id: `ORD-IMP-${ts}-${i}`,
                jobNo: String(r.jobNo || `${48200 + i}`),
                buyer: String(r.buyer || 'ONLY'),
                styleNo: String(r.styleNo || '22040100'),
                item: String(r.item || 'Crew Neck Tee'),
                orderQty: Number(r.orderQty) || 5000,
                fobPrice: Number(r.fobPrice) || 3.85,
                totalValue: 0,
                exFactoryDate: String(r.exFactoryDate || '2026-11-28'),
                month: 'Nov-26',
                status: 'In Production',
                merchandiser: 'Md. Jahidul Islam',
                factory: 'NFL',
              })
            );
            setOpState(updateOperationalSheet('orders', [...mapped, ...opState.orders]));
          } else if (activeSheet === 'yarnStock') {
            const mapped = importedRows.map((r, i) =>
              recalcYarnRow({
                id: `YS-IMP-${ts}-${i}`,
                lotNo: String(r.lotNo || `LOT-IMP-${i + 1}`),
                count: String(r.count || '30/1 Combed Cotton'),
                type: 'WHITE',
                spinningMill: String(r.spinningMill || 'Square Textiles'),
                stockKg: Number(r.stockKg) || 8000,
                allocatedKg: Number(r.allocatedKg) || 2000,
                safetyBufferKg: Number(r.safetyBufferKg) || 6000,
                availableKg: 0,
                status: 'SUFFICIENT',
              })
            );
            setOpState(updateOperationalSheet('yarnStock', [...mapped, ...opState.yarnStock]));
          } else if (activeSheet === 'knitting') {
            const mapped = importedRows.map((r, i) =>
              recalcKnittingRow({
                id: `KT-IMP-${ts}-${i}`,
                jobNo: String(r.jobNo || '48093'),
                machine: String(r.machine || 'KM-02 Mayer & Cie'),
                date: String(r.date || new Date().toISOString().slice(0, 10)),
                plannedKg: Number(r.plannedKg) || 3000,
                actualKg: Number(r.actualKg) || 2900,
                balanceKg: 0,
                efficiencyPct: 0,
                status: 'RUNNING',
              })
            );
            setOpState(updateOperationalSheet('knitting', [...mapped, ...opState.knitting]));
          } else if (activeSheet === 'greige') {
            const mapped = importedRows.map((r, i) =>
              recalcGreigeRow({
                id: `GR-IMP-${ts}-${i}`,
                lotNo: String(r.lotNo || `GL-IMP-${i + 1}`),
                jobNo: String(r.jobNo || '48093'),
                fabricType: String(r.fabricType || 'Single Jersey 100% Cotton'),
                receivedKg: Number(r.receivedKg) || 3000,
                allocatedDyeingKg: Number(r.allocatedDyeingKg) || 1500,
                availableKg: 0,
                agingDays: 1,
                status: 'AVAILABLE',
              })
            );
            setOpState(updateOperationalSheet('greige', [...mapped, ...opState.greige]));
          } else if (activeSheet === 'dyeing') {
            const mapped = importedRows.map((r, i) =>
              recalcDyeingRow({
                id: `DY-IMP-${ts}-${i}`,
                jobNo: String(r.jobNo || '48093'),
                buyer: String(r.buyer || 'ONLY'),
                color: String(r.color || 'Navy'),
                fabric: String(r.fabric || 'Single Jersey'),
                reqKg: Number(r.reqKg) || 3000,
                dyedKg: Number(r.dyedKg) || 3000,
                deliveredKg: Number(r.deliveredKg) || 2800,
                balanceKg: 0,
                rftPct: Number(r.rftPct) || 96.5,
                status: 'In Process',
                month: 'Nov-26',
                dyeingFactory: 'NFL',
              })
            );
            setOpState(updateOperationalSheet('dyeing', [...mapped, ...opState.dyeing]));
          } else if (activeSheet === 'inspections') {
            const mapped: InspectionRecord[] = importedRows.map((r, i) => ({
              id: `INS-IMP-${ts}-${i}`,
              jobNo: String(r.jobNo || '48093'),
              buyer: String(r.buyer || 'ONLY'),
              rollNo: String(r.rollNo || `R-IMP-${i + 1}`),
              inspectedKg: Number(r.inspectedKg) || 50,
              status: (r.status as InspectionRecord['status']) || 'Approved',
              severity: (r.severity as InspectionRecord['severity']) || 'None',
              defects: String(r.defects || 'Clean Pass'),
              date: new Date().toISOString().slice(0, 10),
            }));
            setOpState(updateOperationalSheet('inspections', [...mapped, ...opState.inspections]));
          } else if (activeSheet === 'finishedFabric') {
            const mapped = importedRows.map((r, i) =>
              recalcFinishedRow({
                id: `FF-IMP-${ts}-${i}`,
                jobNo: String(r.jobNo || '48093'),
                color: String(r.color || 'Navy Blue'),
                totalReq: Number(r.totalReq) || 3000,
                totalRecv: Number(r.totalRecv) || 2800,
                dyeingBalance: 0,
                totalIssued: Number(r.totalIssued) || 2000,
                stockBalance: 0,
                status: 'In Stock',
              })
            );
            setOpState(updateOperationalSheet('finishedFabric', [...mapped, ...opState.finishedFabric]));
          }
          setBannerNotice(`Imported ${importedRows.length} rows into ${currentTabInfo.code} (${currentTabInfo.label}).`);
        }}
      />
    </div>
  );
}

export default LiveDataEntrySheetCenter;
