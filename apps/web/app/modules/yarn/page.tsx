'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';
import {
  ActiveFiltersBar,
  Badge,
  CrossFilterProvider,
  DataGrid,
  DrillPopup,
  DrillPopupSpec,
  GridColumn,
  RecordPanel,
  RecordSection
} from '../../../components/ui';
import { fmtDate, fmtNum, fmtQty } from '../../../lib/format';
import yarnMasterRaw from '../../../data/yarn-stock-master.json';
import demo2000DataRaw from '../../../data/demo-2000-master.json';

interface SafetyAlertItem {
  id?: string;
  count: string;
  currentStockKg?: number;
  stockKg?: number;
  safetyBufferKg?: number;
  deficitKg?: number;
}

const yarnData = (yarnMasterRaw as { safetyStockAlerts?: SafetyAlertItem[] }) || {};

interface YarnStockItem {
  id: string;
  lotNo: string;
  count: string;
  type: 'WHITE' | 'COLOR' | 'MELANGE';
  spinningMill: string;
  composition: string;
  godown: 'Godown A' | 'Godown B';
  stockKg: number;
  safetyBufferKg: number;
  allocatedKg: number;
  availableKg: number;
  status: 'SUFFICIENT' | 'LOW' | 'CRITICAL' | 'DEAD_STOCK';
  daysAging: number;
}

interface YarnRequisitionItem {
  id: string;
  jobNo: string;
  buyer: string;
  styleNo: string;
  count: string;
  reqKg: number;
  allocatedKg: number;
  status: 'ALLOCATED' | 'SHORTAGE';
  date: string;
}

const INITIAL_STOCK: YarnStockItem[] = [
  { id: 'YS-101', lotNo: 'LOT-SQ-402', count: '30/1 Combed Cotton', type: 'WHITE', spinningMill: 'Square Textiles', composition: '100% Cotton', godown: 'Godown A', stockKg: 85400, safetyBufferKg: 40000, allocatedKg: 52000, availableKg: 33400, status: 'SUFFICIENT', daysAging: 22 },
  { id: 'YS-102', lotNo: 'LOT-BD-210', count: '28/1 Cotton Melange', type: 'MELANGE', spinningMill: 'Badsha Textiles', composition: '95% Cotton / 5% Poly', godown: 'Godown A', stockKg: 1200, safetyBufferKg: 8000, allocatedKg: 1200, availableKg: 0, status: 'CRITICAL', daysAging: 14 },
  { id: 'YS-103', lotNo: 'LOT-SH-119', count: '34/1 Combed Cotton', type: 'WHITE', spinningMill: 'Shurwid Spinning', composition: '100% Combed', godown: 'Godown B', stockKg: 2100, safetyBufferKg: 10000, allocatedKg: 2100, availableKg: 0, status: 'CRITICAL', daysAging: 18 },
  { id: 'YS-104', lotNo: 'LOT-MT-804', count: '26/1 CVC 60/40', type: 'COLOR', spinningMill: 'Matin Spinning', composition: '60% Cotton / 40% Poly', godown: 'Godown A', stockKg: 950, safetyBufferKg: 6000, allocatedKg: 950, availableKg: 0, status: 'CRITICAL', daysAging: 35 },
  { id: 'YS-105', lotNo: 'LOT-NV-503', count: '30/1 Lycra 5%', type: 'COLOR', spinningMill: 'Novotex Mills', composition: '95% Cotton / 5% Spandex', godown: 'Godown B', stockKg: 400, safetyBufferKg: 3500, allocatedKg: 400, availableKg: 0, status: 'CRITICAL', daysAging: 28 },
  { id: 'YS-106', lotNo: 'LOT-AK-911', count: '20/1 Carded Cotton', type: 'WHITE', spinningMill: 'Akij Textiles', composition: '100% Carded', godown: 'Godown A', stockKg: 142000, safetyBufferKg: 60000, allocatedKg: 88000, availableKg: 54000, status: 'SUFFICIENT', daysAging: 19 },
  { id: 'YS-107', lotNo: 'LOT-SL-308', count: '24/1 Organic Cotton', type: 'COLOR', spinningMill: 'Salek Textiles', composition: '100% Organic GOTS', godown: 'Godown B', stockKg: 3200, safetyBufferKg: 9000, allocatedKg: 3200, availableKg: 0, status: 'LOW', daysAging: 42 },
  { id: 'YS-108', lotNo: 'LOT-IS-440', count: '32/2 Dyed Yarn Red', type: 'COLOR', spinningMill: 'Ispahani Mills', composition: '100% Dyed Ring', godown: 'Godown A', stockKg: 600, safetyBufferKg: 2500, allocatedKg: 600, availableKg: 0, status: 'LOW', daysAging: 56 },
  { id: 'YS-109', lotNo: 'LOT-BD-188', count: '20/1 Slub Yarn', type: 'MELANGE', spinningMill: 'Badsha Textiles', composition: '100% Slub Cotton', godown: 'Godown B', stockKg: 1800, safetyBufferKg: 5000, allocatedKg: 1800, availableKg: 0, status: 'LOW', daysAging: 30 },
  { id: 'YS-110', lotNo: 'LOT-SQ-102', count: '40/1 Modal Cotton', type: 'COLOR', spinningMill: 'Square Textiles', composition: '50% Modal / 50% Cotton', godown: 'Godown A', stockKg: 850, safetyBufferKg: 3000, allocatedKg: 850, availableKg: 0, status: 'LOW', daysAging: 48 },
  { id: 'YS-111', lotNo: 'LOT-OLD-01', count: '16/1 O/E Grey Waste', type: 'COLOR', spinningMill: 'Rahim Spinning', composition: 'Recycled Poly Cotton', godown: 'Godown B', stockKg: 5400, safetyBufferKg: 0, allocatedKg: 0, availableKg: 5400, status: 'DEAD_STOCK', daysAging: 124 },
  { id: 'YS-112', lotNo: 'LOT-OLD-02', count: '24/1 Slub Navy Scrap', type: 'COLOR', spinningMill: 'Viyellatex', composition: '100% Cotton Dyed', godown: 'Godown B', stockKg: 4200, safetyBufferKg: 0, allocatedKg: 0, availableKg: 4200, status: 'DEAD_STOCK', daysAging: 110 }
];

const REQUISITIONS_DATA: YarnRequisitionItem[] = ((demo2000DataRaw as any)?.jobs || [])
  .filter((j: any) => j.yarn && j.yarn.yarnReqKg > 0)
  .slice(0, 300)
  .map((j: any) => {
    const yr = j.yarn;
    const isAllocated = yr.status === 'COMPLETED' || yr.status === 'ISSUED_TO_KNITTING';
    return {
      id: `REQ-${String(j.jobNo).replace(/\s+/g, '-')}`,
      jobNo: j.jobNo,
      buyer: j.buyer,
      styleNo: j.styleNo,
      count: j.fabric?.fabricType || '30/1 Combed Cotton',
      reqKg: yr.yarnReqKg,
      allocatedKg: yr.yarnIssuedKg || yr.yarnReceivedKg || 0,
      status: isAllocated ? 'ALLOCATED' : 'SHORTAGE',
      date: j.dates?.poReceived || '2026-08-15'
    };
  });

export default function YarnModulePage() {
  const [stockItems, setStockItems] = useState<YarnStockItem[]>(INITIAL_STOCK);
  const [activeTab, setActiveTab] = useState<'STOCK' | 'SAFETY' | 'REQUISITIONS' | 'DEAD_STOCK'>('STOCK');
  const [searchTerm, setSearchTerm] = useState('');
  const [godownFilter, setGodownFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [notice, setNotice] = useState('');
  const [selectedItem, setSelectedItem] = useState<YarnStockItem | null>(null);
  const [drill, setDrill] = useState<{ spec: DrillPopupSpec; anchor: DOMRect | null } | null>(null);

  const filteredStock = useMemo(() => {
    return stockItems.filter((item) => {
      const matchesSearch = `${item.count} ${item.lotNo} ${item.spinningMill}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGodown = godownFilter === 'ALL' || item.godown === godownFilter;
      const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
      return matchesSearch && matchesGodown && matchesType;
    });
  }, [stockItems, searchTerm, godownFilter, typeFilter]);

  const safetyAlerts: SafetyAlertItem[] = useMemo(() => {
    const raw = yarnData.safetyStockAlerts || stockItems.filter((s) => s.status === 'CRITICAL' || s.status === 'LOW');
    return raw.map((a, idx) => ({ ...a, id: a.id || `SAF-${idx + 1}` }));
  }, [stockItems]);

  const deadStockItems = useMemo(() => stockItems.filter((s) => s.status === 'DEAD_STOCK'), [stockItems]);

  // Supplier-wise and Count-wise aggregation for Yarn Balance drill-down (sorted bar)
  const supplierSummary = useMemo(() => {
    const map = new Map<string, { stockKg: number; availableKg: number; deficitKg: number; lots: number }>();
    stockItems.forEach((s) => {
      const cur = map.get(s.spinningMill) || { stockKg: 0, availableKg: 0, deficitKg: 0, lots: 0 };
      cur.stockKg += s.stockKg;
      cur.availableKg += s.availableKg;
      cur.deficitKg += Math.max(0, s.safetyBufferKg - s.stockKg);
      cur.lots += 1;
      map.set(s.spinningMill, cur);
    });
    return Array.from(map.entries())
      .map(([mill, v]) => ({ mill, ...v }))
      .sort((a, b) => b.stockKg - a.stockKg);
  }, [stockItems]);

  const openYarnDrill = (
    metricTitle: string,
    mode: 'STOCK' | 'DEFICIT' | 'REQUISITION' | 'DEAD_STOCK',
    anchor: DOMRect,
    filterSupplier?: string
  ) => {
    const relevantStock = filterSupplier
      ? stockItems.filter((s) => s.spinningMill === filterSupplier)
      : stockItems;

    const bySupplier = Array.from(
      relevantStock.reduce((acc, s) => {
        const cur = acc.get(s.spinningMill) || { value: 0, jobs: 0 };
        const val =
          mode === 'DEFICIT'
            ? Math.max(0, s.safetyBufferKg - s.stockKg)
            : mode === 'DEAD_STOCK'
            ? s.status === 'DEAD_STOCK'
              ? s.stockKg
              : 0
            : s.stockKg;
        if (val > 0) {
          cur.value += val;
          cur.jobs += 1;
          acc.set(s.spinningMill, cur);
        }
        return acc;
      }, new Map<string, { value: number; jobs: number }>())
    )
      .map(([key, v]) => ({
        key,
        label: key,
        value: v.value,
        jobs: v.jobs,
        tone: mode === 'DEFICIT' ? ('balance' as const) : mode === 'DEAD_STOCK' ? ('mid' as const) : ('plan' as const)
      }))
      .sort((a, b) => b.value - a.value);

    const byCount = relevantStock
      .map((s) => ({
        key: s.count,
        label: `${s.count} (${s.spinningMill})`,
        value:
          mode === 'DEFICIT'
            ? Math.max(0, s.safetyBufferKg - s.stockKg)
            : mode === 'DEAD_STOCK'
            ? s.status === 'DEAD_STOCK'
              ? s.stockKg
              : 0
            : s.stockKg,
        jobs: 1,
        tone: mode === 'DEFICIT' ? ('balance' as const) : mode === 'DEAD_STOCK' ? ('mid' as const) : ('done' as const)
      }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);

    const jobItems =
      mode === 'REQUISITION'
        ? REQUISITIONS_DATA.map((r) => ({
            jobNo: r.jobNo,
            buyer: r.buyer,
            style: `${r.styleNo} · ${r.count}`,
            qty: r.reqKg,
            unit: 'kg' as const,
            status: r.status === 'SHORTAGE' ? `Short ${fmtNum(r.reqKg - r.allocatedKg)} kg` : 'Allocated',
            tone: r.status === 'SHORTAGE' ? ('balance' as const) : ('done' as const)
          }))
        : relevantStock.map((s) => ({
            jobNo: s.lotNo,
            buyer: s.spinningMill,
            style: s.count,
            qty: mode === 'DEFICIT' ? Math.max(0, s.safetyBufferKg - s.stockKg) : s.stockKg,
            unit: 'kg' as const,
            status: s.status,
            tone: s.status === 'CRITICAL' ? ('balance' as const) : s.status === 'SUFFICIENT' ? ('done' as const) : ('mid' as const)
          }));

    const totalVal = byCount.reduce((sum, x) => sum + x.value, 0);

    setDrill({
      anchor,
      spec: {
        title: `${metricTitle} — By Supplier & Yarn Count`,
        filterKey: 'supplier',
        filterValue: filterSupplier || metricTitle,
        unit: 'kg',
        totalValue: totalVal,
        totalJobs: byCount.length,
        defaultDimension: 'factory',
        dimensions: [
          { dimension: 'factory', label: 'Supplier', items: bySupplier },
          { dimension: 'buyer', label: 'Count', items: byCount },
          { dimension: 'job', label: 'Lots / Jobs', jobs: jobItems }
        ]
      }
    });
  };

  const stockColumns = useMemo<GridColumn<YarnStockItem>[]>(
    () => [
      { key: 'lotNo', header: 'Lot No', width: 130, value: (s) => s.lotNo, render: (s) => <strong>{s.lotNo}</strong> },
      { key: 'count', header: 'Yarn Count', width: 180, value: (s) => s.count, render: (s) => <strong>{s.count}</strong> },
      { key: 'composition', header: 'Composition', width: 170, value: (s) => s.composition },
      { key: 'spinningMill', header: 'Spinning Mill', width: 155, value: (s) => s.spinningMill },
      { key: 'godown', header: 'Location', width: 110, value: (s) => s.godown },
      { key: 'stockKg', header: 'In-Stock (kg)', width: 125, align: 'right', numeric: true, total: true, unit: 'kg', value: (s) => s.stockKg, render: (s) => <strong>{fmtNum(s.stockKg)}</strong> },
      { key: 'safetyBufferKg', header: 'Buffer (kg)', width: 120, align: 'right', numeric: true, total: true, unit: 'kg', value: (s) => s.safetyBufferKg, render: (s) => fmtNum(s.safetyBufferKg) },
      { key: 'allocatedKg', header: 'Allocated (kg)', width: 125, align: 'right', numeric: true, total: true, unit: 'kg', value: (s) => s.allocatedKg, render: (s) => fmtNum(s.allocatedKg) },
      {
        key: 'availableKg',
        header: 'Available (kg)',
        width: 125,
        align: 'right',
        numeric: true,
        total: true,
        unit: 'kg',
        value: (s) => s.availableKg,
        render: (s) => (
          <strong style={{ color: s.availableKg <= 0 ? '#dc2626' : '#16a34a' }}>
            {fmtNum(s.availableKg)}
          </strong>
        )
      },
      { key: 'daysAging', header: 'Aging', width: 85, align: 'right', numeric: true, value: (s) => s.daysAging, render: (s) => `${s.daysAging}d` },
      {
        key: 'status',
        header: 'Status',
        width: 130,
        value: (s) => s.status,
        render: (s) => (
          <Badge tone={s.status === 'SUFFICIENT' ? 'done' : s.status === 'CRITICAL' ? 'balance' : 'mid'}>
            {s.status}
          </Badge>
        )
      }
    ],
    []
  );

  const safetyColumns = useMemo<GridColumn<SafetyAlertItem>[]>(
    () => [
      { key: 'count', header: 'Yarn Count', width: 220, value: (a) => a.count, render: (a) => <strong>{a.count}</strong> },
      {
        key: 'current',
        header: 'Current Stock (kg)',
        width: 150,
        align: 'right',
        numeric: true,
        total: true,
        unit: 'kg',
        value: (a) => a.currentStockKg ?? a.stockKg ?? 0,
        render: (a) => <strong style={{ color: '#dc2626' }}>{fmtNum(a.currentStockKg ?? a.stockKg ?? 0)}</strong>
      },
      {
        key: 'buffer',
        header: 'Safety Buffer (kg)',
        width: 150,
        align: 'right',
        numeric: true,
        total: true,
        unit: 'kg',
        value: (a) => a.safetyBufferKg ?? 0,
        render: (a) => fmtNum(a.safetyBufferKg ?? 0)
      },
      {
        key: 'deficit',
        header: 'Deficit Qty (kg)',
        width: 150,
        align: 'right',
        numeric: true,
        total: true,
        unit: 'kg',
        value: (a) => a.deficitKg ?? Math.max(0, (a.safetyBufferKg ?? 0) - (a.currentStockKg ?? a.stockKg ?? 0)),
        render: (a) => {
          const def = a.deficitKg ?? Math.max(0, (a.safetyBufferKg ?? 0) - (a.currentStockKg ?? a.stockKg ?? 0));
          return <strong style={{ color: '#dc2626' }}>-{fmtNum(def)}</strong>;
        }
      },
      {
        key: 'severity',
        header: 'Severity',
        width: 180,
        value: () => 'CRITICAL BUFFER DEFICIT',
        render: () => <Badge tone="balance">CRITICAL BUFFER DEFICIT</Badge>
      },
      {
        key: 'action',
        header: 'Action',
        width: 160,
        align: 'right',
        filterable: false,
        value: (a) => a.count,
        render: (a) => {
          const def = a.deficitKg ?? Math.max(0, (a.safetyBufferKg ?? 0) - (a.currentStockKg ?? a.stockKg ?? 0));
          return (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '11px' }}
              onClick={() => setNotice(`Spinning mill PO draft initiated for ${a.count} (${fmtNum(def)} kg).`)}
            >
              + Create Mill PO
            </button>
          );
        }
      }
    ],
    []
  );

  const reqColumns = useMemo<GridColumn<YarnRequisitionItem>[]>(
    () => [
      { key: 'jobNo', header: 'Job No', width: 110, value: (r) => r.jobNo, render: (r) => (
        <Link
          href={'/jobs/' + encodeURIComponent(r.jobNo)}
          className="dg-job-link"
          onClick={(e) => e.stopPropagation()}
          title={'Open Job 360 for #' + r.jobNo}
        >
          #{r.jobNo}
        </Link>
      ) },
      { key: 'buyer', header: 'Buyer', width: 120, value: (r) => r.buyer },
      { key: 'styleNo', header: 'Style', width: 130, value: (r) => r.styleNo },
      { key: 'count', header: 'Yarn Count', width: 200, value: (r) => r.count },
      { key: 'reqKg', header: 'Required (kg)', width: 135, align: 'right', numeric: true, total: true, unit: 'kg', value: (r) => r.reqKg, render: (r) => fmtNum(r.reqKg) },
      { key: 'allocatedKg', header: 'Allocated (kg)', width: 135, align: 'right', numeric: true, total: true, unit: 'kg', value: (r) => r.allocatedKg, render: (r) => fmtNum(r.allocatedKg) },
      {
        key: 'shortage',
        header: 'Shortage (kg)',
        width: 135,
        align: 'right',
        numeric: true,
        total: true,
        unit: 'kg',
        value: (r) => Math.max(0, r.reqKg - r.allocatedKg),
        render: (r) => {
          const shortage = Math.max(0, r.reqKg - r.allocatedKg);
          return (
            <strong style={{ color: shortage > 0 ? '#dc2626' : '#16a34a' }}>
              {shortage > 0 ? `-${fmtNum(shortage)}` : '0'}
            </strong>
          );
        }
      },
      { key: 'date', header: 'Req Date', width: 115, value: (r) => r.date, render: (r) => fmtDate(r.date) },
      {
        key: 'status',
        header: 'Status',
        width: 130,
        value: (r) => r.status,
        render: (r) => <Badge tone={r.status === 'ALLOCATED' ? 'done' : 'balance'}>{r.status}</Badge>
      }
    ],
    []
  );

  const deadColumns = useMemo<GridColumn<YarnStockItem>[]>(
    () => [
      { key: 'lotNo', header: 'Lot No', width: 130, value: (d) => d.lotNo, render: (d) => <strong>{d.lotNo}</strong> },
      { key: 'count', header: 'Yarn Count', width: 200, value: (d) => d.count },
      { key: 'spinningMill', header: 'Spinning Mill', width: 160, value: (d) => d.spinningMill },
      { key: 'godown', header: 'Location', width: 120, value: (d) => d.godown },
      { key: 'stockKg', header: 'Dead Qty (kg)', width: 140, align: 'right', numeric: true, total: true, unit: 'kg', value: (d) => d.stockKg, render: (d) => <strong style={{ color: '#d97706' }}>{fmtNum(d.stockKg)}</strong> },
      { key: 'daysAging', header: 'Aging (Days)', width: 120, align: 'right', numeric: true, value: (d) => d.daysAging, render: (d) => `${d.daysAging} days idle` },
      {
        key: 'action',
        header: 'Action',
        width: 170,
        align: 'right',
        filterable: false,
        value: (d) => d.lotNo,
        render: (d) => (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '11px' }}
            onClick={() => setNotice(`Marked ${d.lotNo} (${fmtNum(d.stockKg)} kg) for sample reallocation.`)}
          >
            Reallocate to Sample
          </button>
        )
      }
    ],
    []
  );

  const recordSections = useMemo<RecordSection[]>(() => {
    if (!selectedItem) return [];
    return [
      {
        name: 'Yarn Lot & Spinning Mill Identity',
        fields: [
          { key: 'lotNo', label: 'Lot No', value: selectedItem.lotNo, required: true },
          { key: 'count', label: 'Yarn Count', value: selectedItem.count, required: true },
          { key: 'composition', label: 'Composition', value: selectedItem.composition },
          { key: 'spinningMill', label: 'Spinning Mill', value: selectedItem.spinningMill, required: true },
          { key: 'godown', label: 'Godown Location', value: selectedItem.godown },
          { key: 'type', label: 'Yarn Type', value: selectedItem.type }
        ]
      },
      {
        name: 'Stock & Buffer Ledger',
        fields: [
          { key: 'stockKg', label: 'In-Stock', value: selectedItem.stockKg, type: 'number', unit: 'kg' },
          { key: 'safetyBufferKg', label: 'Safety Buffer', value: selectedItem.safetyBufferKg, type: 'number', unit: 'kg' },
          { key: 'allocatedKg', label: 'Allocated', value: selectedItem.allocatedKg, type: 'number', unit: 'kg' },
          { key: 'availableKg', label: 'Available Balance', value: selectedItem.availableKg, readOnly: true, renderReadOnly: () => fmtQty(selectedItem.availableKg, 'kg') },
          { key: 'daysAging', label: 'Aging Days', value: selectedItem.daysAging, type: 'number', unit: 'd' },
          { key: 'status', label: 'Status', value: selectedItem.status, readOnly: true }
        ]
      }
    ];
  }, [selectedItem]);

  return (
    <Shell title="Yarn Management & Stock">
      <CrossFilterProvider>
        <section className="dashboard-hero">
          <div>
            <div className="hero-kicker">Raw Material &amp; Inventory · Double-click any KPI or Supplier bar to drill down</div>
            <h2>Yarn Store &amp; Inventory Management</h2>
          </div>
          <div className="hero-actions">
            <Link href="/" className="btn btn-primary">
              Executive KPI Board
            </Link>
            <Link href="/modules/knitting" className="btn btn-ghost">
              Knitting Floor
            </Link>
          </div>
        </section>

        {notice && (
          <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7', padding: '10px 14px', borderRadius: '8px', margin: '12px 0', fontSize: '12.5px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 800, color: '#065f46' }}>×</button>
          </div>
        )}

        <ActiveFiltersBar />

        {/* Primary KPI Summary Strip (Double-click to open DrillPopup by Supplier / Count) */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', margin: '16px 0' }}>
          <div
            onDoubleClick={(e) => openYarnDrill('Total Yarn In Stock', 'STOCK', e.currentTarget.getBoundingClientRect())}
            title="Double-click to drill down by Supplier & Yarn Count"
            style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}
          >
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total In Stock</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
              {fmtNum(988.97, 2)} <span style={{ fontSize: '12px', color: '#64748b' }}>t</span>
            </div>
            <div style={{ fontSize: '11px', color: '#475569' }}>
              White: <strong>157.65 t</strong> | Color: <strong>831.32 t</strong>
            </div>
          </div>

          <div
            onDoubleClick={(e) => openYarnDrill('Safety Stock Deficit', 'DEFICIT', e.currentTarget.getBoundingClientRect())}
            title="Double-click to drill down by Supplier & Yarn Count"
            style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #fecaca', cursor: 'pointer' }}
          >
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Safety Stock Deficit</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626', margin: '2px 0' }}>
              {fmtNum(safetyAlerts.length)} Counts Alert
            </div>
            <div style={{ fontSize: '11px', color: '#b91c1c' }}>Immediate Spinning Mill PO Required</div>
          </div>

          <div
            onDoubleClick={(e) => openYarnDrill('Pipeline (LC Open)', 'STOCK', e.currentTarget.getBoundingClientRect())}
            title="Double-click to drill down by Supplier & Yarn Count"
            style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}
          >
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pipeline (LC Open)</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
              {fmtNum(119.53, 2)} <span style={{ fontSize: '12px', color: '#64748b' }}>t</span>
            </div>
            <div style={{ fontSize: '11px', color: '#475569' }}>ETA: 7 to 14 days delivery</div>
          </div>

          <div
            onDoubleClick={(e) => openYarnDrill('Open Requisitions', 'REQUISITION', e.currentTarget.getBoundingClientRect())}
            title="Double-click to drill down by Buyer & Job"
            style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}
          >
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Open Requisitions</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#2563eb', margin: '2px 0' }}>
              {fmtNum(342.5, 2)} <span style={{ fontSize: '12px', color: '#64748b' }}>t</span>
            </div>
            <div style={{ fontSize: '11px', color: '#475569' }}>From Merchandising Orders</div>
          </div>

          <div
            onDoubleClick={(e) => openYarnDrill('Dead Stock (>90 Days)', 'DEAD_STOCK', e.currentTarget.getBoundingClientRect())}
            title="Double-click to drill down by Supplier & Yarn Count"
            style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}
          >
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Dead Stock (&gt;90 Days)</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#d97706', margin: '2px 0' }}>
              {fmtNum(18.4, 2)} <span style={{ fontSize: '12px', color: '#64748b' }}>t</span>
            </div>
            <div style={{ fontSize: '11px', color: '#92400e' }}>14 idle lots awaiting clearance</div>
          </div>

          <div
            onDoubleClick={(e) => openYarnDrill('Daily Issue Coverage', 'STOCK', e.currentTarget.getBoundingClientRect())}
            title="Double-click to drill down by Supplier & Yarn Count"
            style={{ background: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }}
          >
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Avg Daily Issue Rate</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a', margin: '2px 0' }}>
              {fmtNum(38.2, 2)} <span style={{ fontSize: '12px', color: '#64748b' }}>t/day</span>
            </div>
            <div style={{ fontSize: '11px', color: '#166534' }}>25.8 days warehouse coverage</div>
          </div>
        </section>

        {/* Yarn Balance by Supplier / Spinning Mill Chart (Single-click filters, Double-click opens DrillPopup) */}
        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>Yarn Balance by Supplier &amp; Count</strong>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>Single-click a supplier bar to filter the table · Double-click to open Supplier / Count breakdown</div>
            </div>
            {searchTerm && (
              <button type="button" className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => setSearchTerm('')}>
                Clear Filter ({searchTerm})
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {supplierSummary.map((sup) => {
              const maxKg = supplierSummary[0]?.stockKg || 1;
              const pct = Math.min(100, Math.max(8, Math.round((sup.stockKg / maxKg) * 100)));
              const isSelected = searchTerm.toLowerCase() === sup.mill.toLowerCase();
              return (
                <div
                  key={sup.mill}
                  onClick={() => setSearchTerm((prev) => (prev.toLowerCase() === sup.mill.toLowerCase() ? '' : sup.mill))}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    openYarnDrill(`Yarn Balance: ${sup.mill}`, 'STOCK', e.currentTarget.getBoundingClientRect(), sup.mill);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : '#f8fafc',
                    opacity: searchTerm && !isSelected ? 0.35 : 1,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <strong style={{ color: '#0f172a' }}>{sup.mill}</strong>
                    <span style={{ fontWeight: 800, color: '#2563eb' }}>{fmtNum(sup.stockKg)} kg · {sup.lots} lots</span>
                  </div>
                  <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: sup.deficitKg > 0 ? '#d97706' : '#2563eb' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', margin: '14px 0 18px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('STOCK')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'STOCK' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'STOCK' ? '#fff' : '#475569',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            📦 Godown Stock Ledger ({filteredStock.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SAFETY')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'SAFETY' ? '#dc2626' : '#fef2f2',
              color: activeTab === 'SAFETY' ? '#fff' : '#b91c1c',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            🚨 Safety Stock Alerts ({safetyAlerts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('REQUISITIONS')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'REQUISITIONS' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'REQUISITIONS' ? '#fff' : '#475569',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            📋 Merchandising Requisitions ({REQUISITIONS_DATA.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DEAD_STOCK')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'DEAD_STOCK' ? '#d97706' : '#fffbeb',
              color: activeTab === 'DEAD_STOCK' ? '#fff' : '#92400e',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            ⚠️ Dead Stock ({deadStockItems.length})
          </button>
        </div>

        {/* TAB 1: GODOWN STOCK LEDGER */}
        {activeTab === 'STOCK' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search count, lot, spinning mill..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '220px' }}
                />
                <select
                  value={godownFilter}
                  onChange={(e) => setGodownFilter(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="ALL">All Godowns</option>
                  <option value="Godown A">Godown A</option>
                  <option value="Godown B">Godown B</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="ALL">All Types</option>
                  <option value="WHITE">White / Grey</option>
                  <option value="COLOR">Dyed Solid</option>
                  <option value="MELANGE">Melange</option>
                </select>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Showing {fmtNum(filteredStock.length)} lots
              </span>
            </div>

            <DataGrid<YarnStockItem>
              storageKey="yarn-godown-stock-ledger"
              exportName="yarn-godown-stock-ledger"
              rows={filteredStock}
              columns={stockColumns}
              frozenColumns={2}
              rowKey={(s) => s.id}
              selectedRowKey={selectedItem?.id ?? null}
              onRowClick={(s) => setSelectedItem(s)}
            />
          </section>
        )}

        {/* TAB 2: SAFETY STOCK ALERTS */}
        {activeTab === 'SAFETY' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: '#fef2f2', borderLeft: '4px solid #dc2626', padding: '12px 16px', borderRadius: '8px', fontSize: '12px', color: '#991b1b' }}>
              <strong>Action Required:</strong> {fmtNum(safetyAlerts.length)} yarn counts have dropped below mandatory factory safety buffers. Immediate spinning mill purchase orders must be issued to avoid knitting machine stoppages.
            </div>

            <DataGrid<SafetyAlertItem>
              storageKey="yarn-safety-stock-alerts"
              exportName="yarn-safety-stock-alerts"
              rows={safetyAlerts}
              columns={safetyColumns}
              frozenColumns={2}
              rowKey={(a) => a.id || a.count}
            />
          </section>
        )}

        {/* TAB 3: MERCHANDISING REQUISITIONS */}
        {activeTab === 'REQUISITIONS' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <DataGrid<YarnRequisitionItem>
              storageKey="yarn-merchandising-requisitions"
              exportName="yarn-merchandising-requisitions"
              rows={REQUISITIONS_DATA}
              columns={reqColumns}
              frozenColumns={2}
              rowKey={(r) => r.id}
            />
          </section>
        )}

        {/* TAB 4: DEAD STOCK */}
        {activeTab === 'DEAD_STOCK' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: '#fffbeb', borderLeft: '4px solid #d97706', padding: '12px 16px', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
              <strong>Dead Stock Review:</strong> 18.40 t (14 lots) have remained idle for &gt;90 days without requisition allocation. Recommended for sample production or yarn broker discount clearance.
            </div>

            <DataGrid<YarnStockItem>
              storageKey="yarn-dead-stock-ledger"
              exportName="yarn-dead-stock-ledger"
              rows={deadStockItems}
              columns={deadColumns}
              frozenColumns={2}
              rowKey={(d) => d.id}
              selectedRowKey={selectedItem?.id ?? null}
              onRowClick={(d) => setSelectedItem(d)}
            />
          </section>
        )}

        <RecordPanel
          open={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          title={selectedItem ? `${selectedItem.lotNo} · ${selectedItem.count}` : ''}
          subtitle={selectedItem ? `${selectedItem.spinningMill} · ${selectedItem.godown}` : undefined}
          sections={recordSections}
          onSave={(updated) => {
            if (!selectedItem) return;
            const stockKg = Number(updated.stockKg ?? selectedItem.stockKg);
            const allocatedKg = Number(updated.allocatedKg ?? selectedItem.allocatedKg);
            const safetyBufferKg = Number(updated.safetyBufferKg ?? selectedItem.safetyBufferKg);
            const next: YarnStockItem = {
              ...selectedItem,
              lotNo: String(updated.lotNo ?? selectedItem.lotNo),
              count: String(updated.count ?? selectedItem.count),
              spinningMill: String(updated.spinningMill ?? selectedItem.spinningMill),
              stockKg,
              allocatedKg,
              safetyBufferKg,
              availableKg: Math.max(0, stockKg - allocatedKg)
            };
            setStockItems((prev) => prev.map((x) => (x.id === next.id ? next : x)));
            setSelectedItem(next);
          }}
        />

        {drill && (
          <DrillPopup
            spec={drill.spec}
            anchorRect={drill.anchor}
            onClose={() => setDrill(null)}
            onShowInTable={(filterKey, filterValue) => {
              setActiveTab('STOCK');
              setSearchTerm(filterValue);
            }}
          />
        )}
      </CrossFilterProvider>
    </Shell>
  );
}
