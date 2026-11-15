'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Shell from '../../../components/Shell';
import {
  ActiveFiltersBar,
  Badge,
  CommandBar,
  CrossFilterProvider,
  DataGrid,
  DataImportModal,
  DrillPopup,
  DrillPopupSpec,
  EditableSheetGrid,
  GridColumn,
  KpiCard,
  RecordPanel,
  RecordSection,
  SheetColumn
} from '../../../components/ui';
import { fmtDate, fmtNum, fmtQty } from '../../../lib/format';
import { recordGreigeRoll } from '../../../lib/store/operational-store';

export interface GreigeRollLotRecord {
  id: string;
  lotNo: string;
  jobNo: string;
  buyer: string;
  styleNo: string;
  fabricType: string;
  gsm: number;
  diaWidth: string;
  yarnLot: string;
  knittingMachine: string;
  binRack: string;
  rollsCount: number;
  receivedKg: number;
  allocatedDyeingKg: number;
  availableKg: number;
  fourPointPassPct: number;
  receivedDate: string;
  agingDays: number;
  status: 'AVAILABLE' | 'ALLOCATED_WINCH' | 'AGING_ALERT' | 'QUALITY_HOLD';
  remarks?: string;
}

const INITIAL_GREIGE_LOTS: GreigeRollLotRecord[] = [
  { id: 'GR-2601', lotNo: 'GL-48093-A', jobNo: '48093', buyer: 'ONLY', styleNo: '22040024', fabricType: 'Single Jersey 100% Cotton', gsm: 180, diaWidth: '68" Open', yarnLot: 'LOT-SQ-402 (30/1 Combed)', knittingMachine: 'KM-02 Mayer & Cie', binRack: 'Bin A-04', rollsCount: 142, receivedKg: 3550, allocatedDyeingKg: 2400, availableKg: 1150, fourPointPassPct: 98.4, receivedDate: '2026-10-28', agingDays: 4, status: 'AVAILABLE' },
  { id: 'GR-2602', lotNo: 'GL-48085-B', jobNo: '48085', buyer: 'BS-NMT', styleNo: '13251506', fabricType: '1x1 Cotton Rib', gsm: 220, diaWidth: '48" Tubular', yarnLot: 'LOT-SH-119 (34/1 Combed)', knittingMachine: 'KM-06 Terrot Rib', binRack: 'Bin A-09', rollsCount: 84, receivedKg: 2100, allocatedDyeingKg: 2100, availableKg: 0, fourPointPassPct: 97.2, receivedDate: '2026-10-26', agingDays: 6, status: 'ALLOCATED_WINCH' },
  { id: 'GR-2603', lotNo: 'GL-47783-C', jobNo: '47783', buyer: 'OVS', styleNo: '2717SW11', fabricType: 'French Terry Unbrushed', gsm: 260, diaWidth: '72" Open', yarnLot: 'LOT-MT-804 (26/1 CVC)', knittingMachine: 'KM-11 Pailung Fleece', binRack: 'Bin B-02', rollsCount: 165, receivedKg: 4290, allocatedDyeingKg: 1800, availableKg: 2490, fourPointPassPct: 96.5, receivedDate: '2026-10-24', agingDays: 8, status: 'AVAILABLE' },
  { id: 'GR-2604', lotNo: 'GL-47792-D', jobNo: '47792', buyer: 'OVS', styleNo: '2715WFTT', fabricType: 'CVC Brushed Fleece 60/40', gsm: 280, diaWidth: '74" Open', yarnLot: 'LOT-FLC-501 (32/1 CVC)', knittingMachine: 'KM-12 Pailung Fleece', binRack: 'Bin C-01', rollsCount: 130, receivedKg: 3640, allocatedDyeingKg: 1200, availableKg: 2440, fourPointPassPct: 92.1, receivedDate: '2026-10-14', agingDays: 18, status: 'AGING_ALERT', remarks: 'Aged >15 days; prioritize Winch MC-05 allocation' },
  { id: 'GR-2605', lotNo: 'GL-48202-E', jobNo: '48202', buyer: 'ONLY', styleNo: '15388786', fabricType: 'Organic Single Jersey', gsm: 160, diaWidth: '66" Open', yarnLot: 'LOT-SL-308 (24/1 Organic)', knittingMachine: 'KM-01 Mayer & Cie', binRack: 'Bin A-01', rollsCount: 190, receivedKg: 4560, allocatedDyeingKg: 3200, availableKg: 1360, fourPointPassPct: 98.9, receivedDate: '2026-10-29', agingDays: 3, status: 'AVAILABLE' },
  { id: 'GR-2606', lotNo: 'GL-46616-F', jobNo: '46616', buyer: 'Only&Sons', styleNo: '22039183', fabricType: 'Cotton Interlock Heavy', gsm: 240, diaWidth: '72" Open', yarnLot: 'LOT-AK-911 (20/1 Carded)', knittingMachine: 'KM-08 Fukuhara', binRack: 'Bin B-07', rollsCount: 95, receivedKg: 2470, allocatedDyeingKg: 0, availableKg: 2470, fourPointPassPct: 89.4, receivedDate: '2026-10-25', agingDays: 7, status: 'QUALITY_HOLD', remarks: 'GSM variation check requested by Fabric Quality' },
  { id: 'GR-2607', lotNo: 'GL-46758-G', jobNo: '46758', buyer: 'UTG', styleNo: '13251495', fabricType: '2x2 Lycra Rib (95/5)', gsm: 240, diaWidth: '50" Tubular', yarnLot: 'LOT-NV-503 (30/1 + 40D)', knittingMachine: 'KM-07 Terrot Rib', binRack: 'Bin B-11', rollsCount: 112, receivedKg: 2800, allocatedDyeingKg: 2000, availableKg: 800, fourPointPassPct: 95.8, receivedDate: '2026-10-27', agingDays: 5, status: 'AVAILABLE' },
  { id: 'GR-2608', lotNo: 'GL-48061-H', jobNo: '48061', buyer: 'Name It', styleNo: '13251509', fabricType: 'Pique / Lacoste Cotton', gsm: 200, diaWidth: '70" Open', yarnLot: 'LOT-BD-188 (24/1 Slub)', knittingMachine: 'KM-04 Mayer & Cie', binRack: 'Bin A-12', rollsCount: 78, receivedKg: 1950, allocatedDyeingKg: 1950, availableKg: 0, fourPointPassPct: 99.1, receivedDate: '2026-10-30', agingDays: 2, status: 'ALLOCATED_WINCH' }
];

function classifyFabricGroup(fabricType: string): string {
  const f = fabricType.toLowerCase();
  if (f.includes('jersey')) return 'Single Jersey';
  if (f.includes('rib')) return 'Cotton / Lycra Rib';
  if (f.includes('fleece') || f.includes('terry')) return 'Fleece & French Terry';
  return 'Interlock & Pique';
}

export default function GreigeStorePage() {
  const [lots, setLots] = useState<GreigeRollLotRecord[]>(INITIAL_GREIGE_LOTS);
  const [viewMode, setViewMode] = useState<'LEDGER' | 'SHEET'>('LEDGER');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [fabricGroupFilter, setFabricGroupFilter] = useState<string>('ALL');
  const [selectedLot, setSelectedLot] = useState<GreigeRollLotRecord | null>(null);
  const [lastDeletedLot, setLastDeletedLot] = useState<GreigeRollLotRecord | null>(null);
  const [drill, setDrill] = useState<{ spec: DrillPopupSpec; anchor: DOMRect | null } | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [notice, setNotice] = useState('');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // New Greige Roll Form State
  const [formLotNo, setFormLotNo] = useState('');
  const [formJobNo, setFormJobNo] = useState('48093');
  const [formBuyer, setFormBuyer] = useState('ONLY');
  const [formStyle, setFormStyle] = useState('22040024');
  const [formFabric, setFormFabric] = useState('Single Jersey 100% Cotton');
  const [formGsm, setFormGsm] = useState(180);
  const [formDia, setFormDia] = useState('68" Open');
  const [formYarnLot, setFormYarnLot] = useState('LOT-SQ-402 (30/1 Combed)');
  const [formMachine, setFormMachine] = useState('KM-02 Mayer & Cie');
  const [formBin, setFormBin] = useState('Bin A-05');
  const [formRolls, setFormRolls] = useState(120);
  const [formRecvKg, setFormRecvKg] = useState(3000);

  const handleInwardRollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lot = formLotNo.trim() || `GL-${formJobNo}-${Date.now().toString().slice(-4)}`;
    const newLot: GreigeRollLotRecord = {
      id: `GR-${Date.now()}`,
      lotNo: lot,
      jobNo: formJobNo,
      buyer: formBuyer,
      styleNo: formStyle,
      fabricType: formFabric,
      gsm: Number(formGsm) || 180,
      diaWidth: formDia,
      yarnLot: formYarnLot,
      knittingMachine: formMachine,
      binRack: formBin,
      rollsCount: Number(formRolls) || 100,
      receivedKg: Number(formRecvKg) || 2500,
      allocatedDyeingKg: 0,
      availableKg: Number(formRecvKg) || 2500,
      fourPointPassPct: 98.5,
      receivedDate: new Date().toISOString().slice(0, 10),
      agingDays: 0,
      status: 'AVAILABLE',
      remarks: 'Inward floor entry recorded.'
    };
    setLots((prev) => [newLot, ...prev]);
    recordGreigeRoll({
      id: newLot.id,
      lotNo: newLot.lotNo,
      jobNo: newLot.jobNo,
      fabricType: newLot.fabricType,
      receivedKg: newLot.receivedKg,
      allocatedDyeingKg: 0,
      availableKg: newLot.availableKg,
      agingDays: 0,
      status: 'AVAILABLE'
    });
    setNotice(`Inward Greige Roll registered: Lot ${lot} (${fmtNum(newLot.receivedKg)} kg) saved and rolled into live Executive dashboard.`);
    setShowEntryModal(false);
    setFormLotNo('');
  };

  const handleImportGreigeSpreadsheet = (rows: Record<string, any>[]) => {
    const imported: GreigeRollLotRecord[] = rows.map((r, idx) => {
      const lot = String(r['lotNo'] || r['lot'] || `GL-IMP-${idx + 1}`);
      const job = String(r['jobNo'] || r['job'] || '48093');
      const buyer = String(r['buyer'] || 'ONLY');
      const fabric = String(r['fabricType'] || r['fabric'] || 'Single Jersey 100% Cotton');
      const rolls = Number(r['rollsCount'] || r['rolls'] || 80);
      const recvKg = Number(r['receivedKg'] || r['qty'] || 2000);
      const rec: GreigeRollLotRecord = {
        id: `GR-IMP-${Date.now()}-${idx}`,
        lotNo: lot,
        jobNo: job,
        buyer,
        styleNo: String(r['styleNo'] || r['style'] || 'STD-STYLE'),
        fabricType: fabric,
        gsm: Number(r['gsm'] || 180),
        diaWidth: String(r['diaWidth'] || r['dia'] || '68" Open'),
        yarnLot: String(r['yarnLot'] || 'Spinning Lot A'),
        knittingMachine: String(r['knittingMachine'] || 'Knitting Floor'),
        binRack: String(r['binRack'] || 'Bin A-01'),
        rollsCount: rolls,
        receivedKg: recvKg,
        allocatedDyeingKg: 0,
        availableKg: recvKg,
        fourPointPassPct: 98.0,
        receivedDate: new Date().toISOString().slice(0, 10),
        agingDays: 0,
        status: 'AVAILABLE'
      };
      recordGreigeRoll({
        id: rec.id,
        lotNo: rec.lotNo,
        jobNo: rec.jobNo,
        fabricType: rec.fabricType,
        receivedKg: rec.receivedKg,
        allocatedDyeingKg: 0,
        availableKg: rec.availableKg,
        agingDays: 0,
        status: 'AVAILABLE'
      });
      return rec;
    });

    setLots((prev) => [...imported, ...prev]);
    setNotice(`Successfully imported ${imported.length} greige fabric lots from spreadsheet.`);
  };

  const filteredLots = useMemo(() => {
    return lots.filter((l) => {
      if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
      if (fabricGroupFilter !== 'ALL' && classifyFabricGroup(l.fabricType) !== fabricGroupFilter && l.buyer !== fabricGroupFilter) return false;
      return true;
    });
  }, [lots, statusFilter, fabricGroupFilter]);

  const totals = useMemo(() => {
    const totalReceived = lots.reduce((s, r) => s + r.receivedKg, 0);
    const totalAllocated = lots.reduce((s, r) => s + r.allocatedDyeingKg, 0);
    const totalAvailable = lots.reduce((s, r) => s + r.availableKg, 0);
    const totalRolls = lots.reduce((s, r) => s + r.rollsCount, 0);
    return { totalReceived, totalAllocated, totalAvailable, totalRolls };
  }, [lots]);

  // 4 Fabric Groups so inner chart automatically renders as a Donut (2-5 parts -> donut)
  const fabricGroupStats = useMemo(() => {
    const map = new Map<string, { receivedKg: number; availableKg: number; allocatedKg: number; jobs: number }>();
    lots.forEach((l) => {
      const grp = classifyFabricGroup(l.fabricType);
      const cur = map.get(grp) || { receivedKg: 0, availableKg: 0, allocatedKg: 0, jobs: 0 };
      cur.receivedKg += l.receivedKg;
      cur.availableKg += l.availableKg;
      cur.allocatedKg += l.allocatedDyeingKg;
      cur.jobs += 1;
      map.set(grp, cur);
    });
    return Array.from(map.entries())
      .map(([group, v]) => ({ group, ...v }))
      .sort((a, b) => b.receivedKg - a.receivedKg);
  }, [lots]);

  const openGreigeDrill = (
    title: string,
    mode: 'RECEIVED' | 'ALLOCATED' | 'AVAILABLE',
    anchor: DOMRect,
    groupFilter?: string
  ) => {
    const subset = groupFilter ? lots.filter((l) => classifyFabricGroup(l.fabricType) === groupFilter) : lots;
    const byFabricType = Array.from(
      subset.reduce((acc, l) => {
        const grp = classifyFabricGroup(l.fabricType);
        const cur = acc.get(grp) || { value: 0, jobs: 0 };
        const val = mode === 'ALLOCATED' ? l.allocatedDyeingKg : mode === 'AVAILABLE' ? l.availableKg : l.receivedKg;
        if (val > 0) {
          cur.value += val;
          cur.jobs += 1;
          acc.set(grp, cur);
        }
        return acc;
      }, new Map<string, { value: number; jobs: number }>())
    ).map(([key, v]) => ({
      key,
      label: key,
      value: v.value,
      jobs: v.jobs,
      tone: mode === 'AVAILABLE' ? ('done' as const) : mode === 'ALLOCATED' ? ('plan' as const) : ('plan' as const)
    }));

    const byBuyer = Array.from(
      subset.reduce((acc, l) => {
        const cur = acc.get(l.buyer) || { value: 0, jobs: 0 };
        const val = mode === 'ALLOCATED' ? l.allocatedDyeingKg : mode === 'AVAILABLE' ? l.availableKg : l.receivedKg;
        if (val > 0) {
          cur.value += val;
          cur.jobs += 1;
          acc.set(l.buyer, cur);
        }
        return acc;
      }, new Map<string, { value: number; jobs: number }>())
    ).map(([key, v]) => ({
      key,
      label: key,
      value: v.value,
      jobs: v.jobs,
      tone: 'plan' as const
    }));

    const jobItems = subset.map((l) => ({
      jobNo: l.jobNo,
      buyer: l.buyer,
      style: `${l.lotNo} · ${l.fabricType}`,
      qty: mode === 'ALLOCATED' ? l.allocatedDyeingKg : mode === 'AVAILABLE' ? l.availableKg : l.receivedKg,
      unit: 'kg' as const,
      status: l.status.replace('_', ' '),
      tone: l.status === 'AVAILABLE' ? ('done' as const) : l.status === 'QUALITY_HOLD' ? ('balance' as const) : ('plan' as const)
    }));

    setDrill({
      anchor,
      spec: {
        title: `${title} — By Fabric Type (Donut)`,
        filterKey: 'fabricType',
        filterValue: groupFilter || 'ALL',
        unit: 'kg',
        totalValue: byFabricType.reduce((s, x) => s + x.value, 0),
        totalJobs: subset.length,
        defaultDimension: 'factory',
        dimensions: [
          { dimension: 'factory', label: 'Fabric Type', items: byFabricType },
          { dimension: 'buyer', label: 'Buyer', items: byBuyer },
          { dimension: 'job', label: 'Jobs / Lots', jobs: jobItems }
        ]
      }
    });
  };

  const syncThemeToIframe = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const isDark =
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        localStorage.getItem('nos-theme') === 'dark';
      doc.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      if (doc.body) {
        doc.body.classList.toggle('dark', isDark);
        doc.body.classList.toggle('theme-dark', isDark);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const observer = new MutationObserver(() => syncThemeToIframe());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const columns = useMemo<GridColumn<GreigeRollLotRecord>[]>(
    () => [
      { key: 'lotNo', header: 'Greige Lot #', width: 130, value: (r) => r.lotNo, render: (r) => <strong>{r.lotNo}</strong> },
      { key: 'jobNo', header: 'Job No', width: 100, value: (r) => r.jobNo, render: (r) => <strong>{r.jobNo}</strong> },
      { key: 'buyer', header: 'Buyer', width: 110, value: (r) => r.buyer },
      { key: 'styleNo', header: 'Style', width: 120, value: (r) => r.styleNo },
      { key: 'fabricType', header: 'Fabric Construction', width: 200, value: (r) => r.fabricType },
      { key: 'gsm', header: 'GSM', align: 'right', width: 80, numeric: true, value: (r) => r.gsm },
      { key: 'diaWidth', header: 'Dia / Width', width: 110, value: (r) => r.diaWidth },
      { key: 'binRack', header: 'Bin / Rack', width: 105, value: (r) => r.binRack },
      { key: 'rollsCount', header: 'Rolls', align: 'right', width: 85, numeric: true, total: true, unit: 'rolls', value: (r) => r.rollsCount, render: (r) => fmtNum(r.rollsCount) },
      { key: 'receivedKg', header: 'Received (kg)', align: 'right', width: 125, numeric: true, total: true, unit: 'kg', value: (r) => r.receivedKg, render: (r) => <strong>{fmtNum(r.receivedKg)}</strong> },
      { key: 'allocatedDyeingKg', header: 'Dyeing Alloc (kg)', align: 'right', width: 140, numeric: true, total: true, unit: 'kg', value: (r) => r.allocatedDyeingKg, render: (r) => fmtNum(r.allocatedDyeingKg) },
      {
        key: 'availableKg',
        header: 'Available (kg)',
        align: 'right',
        width: 125,
        numeric: true,
        total: true,
        unit: 'kg',
        value: (r) => r.availableKg,
        render: (r) => (
          <strong style={{ color: r.availableKg > 0 ? 'var(--nos-ok)' : 'var(--nos-ink-3)' }}>
            {fmtNum(r.availableKg)}
          </strong>
        )
      },
      { key: 'receivedDate', header: 'Received Date', width: 115, value: (r) => r.receivedDate, render: (r) => fmtDate(r.receivedDate) },
      { key: 'agingDays', header: 'Aging', align: 'right', width: 80, numeric: true, value: (r) => r.agingDays, render: (r) => `${r.agingDays}d` },
      {
        key: 'status',
        header: 'Status',
        width: 145,
        value: (r) => r.status,
        render: (r) => (
          <Badge
            tone={
              r.status === 'AVAILABLE'
                ? 'done'
                : r.status === 'ALLOCATED_WINCH'
                ? 'info'
                : r.status === 'AGING_ALERT'
                ? 'mid'
                : 'balance'
            }
          >
            {r.status.replace('_', ' ')}
          </Badge>
        )
      }
    ],
    []
  );

  const selectedIdx = useMemo(
    () => (selectedLot ? filteredLots.findIndex((r) => r.id === selectedLot.id) : -1),
    [filteredLots, selectedLot]
  );

  const recordSections = useMemo<RecordSection[]>(
    () =>
      selectedLot
        ? [
            {
              name: 'Greige Roll Lot & Job Identity',
              fields: [
                { key: 'lotNo', label: 'Greige Lot #', value: selectedLot.lotNo, required: true },
                { key: 'jobNo', label: 'Job No', value: selectedLot.jobNo, setByRole: 'Central Planning' },
                { key: 'buyer', label: 'Buyer', value: selectedLot.buyer, setByRole: 'Merchandiser' },
                { key: 'styleNo', label: 'Style No', value: selectedLot.styleNo, setByRole: 'Merchandiser' },
                { key: 'fabricType', label: 'Fabric Type', value: selectedLot.fabricType, required: true },
                { key: 'gsm', label: 'Target GSM', value: selectedLot.gsm, type: 'number', unit: 'GSM' },
                { key: 'diaWidth', label: 'Dia / Width', value: selectedLot.diaWidth },
                { key: 'yarnLot', label: 'Source Yarn Lot', value: selectedLot.yarnLot, setByRole: 'Knitting' },
                { key: 'knittingMachine', label: 'Knitting Machine', value: selectedLot.knittingMachine, setByRole: 'Knitting' },
                { key: 'binRack', label: 'Store Bin / Rack', value: selectedLot.binRack, required: true }
              ]
            },
            {
              name: 'Weight Audit & Dyeing Winch Allocation',
              fields: [
                { key: 'rollsCount', label: 'Roll Count', value: selectedLot.rollsCount, type: 'number', unit: 'rolls', required: true },
                { key: 'receivedKg', label: 'Knitting Received', value: selectedLot.receivedKg, type: 'number', unit: 'kg', required: true },
                { key: 'allocatedDyeingKg', label: 'Allocated to Dyeing', value: selectedLot.allocatedDyeingKg, type: 'number', unit: 'kg' },
                {
                  key: 'availableKg',
                  label: 'Available Balance',
                  value: selectedLot.availableKg,
                  readOnly: true,
                  unit: 'kg',
                  renderReadOnly: () => fmtQty(Math.max(0, Number(selectedLot.receivedKg || 0) - Number(selectedLot.allocatedDyeingKg || 0)), 'kg')
                },
                { key: 'fourPointPassPct', label: '4-Point Inspection Pass', value: selectedLot.fourPointPassPct, type: 'number', unit: '%', setByRole: 'Fabric Quality' },
                { key: 'receivedDate', label: 'Received Date', value: selectedLot.receivedDate, type: 'date' },
                {
                  key: 'status',
                  label: 'Lot Status',
                  value: selectedLot.status,
                  type: 'select',
                  options: [
                    { value: 'AVAILABLE', label: 'Available for Dyeing' },
                    { value: 'ALLOCATED_WINCH', label: 'Allocated to Winch' },
                    { value: 'AGING_ALERT', label: 'Aging Alert (>14d)' },
                    { value: 'QUALITY_HOLD', label: 'Quality Hold' }
                  ]
                },
                { key: 'remarks', label: 'Store & Allocation Notes', value: selectedLot.remarks ?? '', type: 'textarea', fullWidth: true }
              ]
            }
          ]
        : [],
    [selectedLot]
  );

  return (
    <Shell title="Greige Fabric Store">
      <CrossFilterProvider>
        <div className="nos-stack">
          <div className="nos-grid nos-grid-4">
            <div onDoubleClick={(e) => openGreigeDrill('Total Greige Received', 'RECEIVED', e.currentTarget.getBoundingClientRect())} style={{ cursor: 'pointer' }} title="Double-click for Fabric Type Donut breakdown">
              <KpiCard label="Total Greige Received" value={fmtNum(totals.totalReceived)} unit="kg" delta="124.50 t plant total · Double-click" />
            </div>
            <div onDoubleClick={(e) => openGreigeDrill('Allocated to Dyeing', 'ALLOCATED', e.currentTarget.getBoundingClientRect())} style={{ cursor: 'pointer' }} title="Double-click for Fabric Type Donut breakdown">
              <KpiCard label="Allocated to Dyeing" value={fmtNum(totals.totalAllocated)} unit="kg" delta="Issued to 23 winches · Double-click" deltaDirection="up" />
            </div>
            <div onDoubleClick={(e) => openGreigeDrill('Available Greige Stock', 'AVAILABLE', e.currentTarget.getBoundingClientRect())} style={{ cursor: 'pointer' }} title="Double-click for Fabric Type Donut breakdown">
              <KpiCard label="Available Greige Stock" value={fmtNum(totals.totalAvailable)} unit="kg" delta="Ready for batching · Double-click" />
            </div>
            <div onDoubleClick={(e) => openGreigeDrill('Active Greige Rolls', 'RECEIVED', e.currentTarget.getBoundingClientRect())} style={{ cursor: 'pointer' }} title="Double-click for Fabric Type Donut breakdown">
              <KpiCard label="Active Greige Rolls" value={fmtNum(totals.totalRolls)} unit="rolls" delta={`${lots.length} active roll lots · Double-click`} />
            </div>
          </div>

          <ActiveFiltersBar />

          {/* Stock by Fabric Type Strip (Single-click cross-filters, Double-click opens Donut DrillPopup) */}
          <div style={{ background: '#fff', border: '1px solid var(--nos-line)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong style={{ fontSize: 13, color: '#0f172a' }}>Greige Stock by Fabric Type</strong>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>Single-click to filter register · Double-click to open Fabric Type Donut breakdown</div>
              </div>
              {fabricGroupFilter !== 'ALL' && (
                <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 9px' }} onClick={() => setFabricGroupFilter('ALL')}>
                  Clear ({fabricGroupFilter})
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {fabricGroupStats.map((g) => {
                const isSelected = fabricGroupFilter === g.group;
                const pct = Math.min(100, Math.round((g.receivedKg / Math.max(1, totals.totalReceived)) * 100));
                return (
                  <div
                    key={g.group}
                    onClick={() => setFabricGroupFilter((prev) => (prev === g.group ? 'ALL' : g.group))}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      openGreigeDrill(`Greige Stock: ${g.group}`, 'RECEIVED', e.currentTarget.getBoundingClientRect());
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: isSelected ? '#eff6ff' : '#f8fafc',
                      opacity: fabricGroupFilter !== 'ALL' && !isSelected ? 0.3 : 1,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <strong>{g.group}</strong>
                      <span style={{ fontWeight: 800, color: '#2563eb' }}>{fmtNum(g.receivedKg)} kg ({pct}%)</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      Available: <strong style={{ color: '#16a34a' }}>{fmtNum(g.availableKg)} kg</strong> · {g.jobs} lots
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <CommandBar
            left={
              <div className="nos-seg" role="tablist">
                <button type="button" aria-selected={viewMode === 'LEDGER'} onClick={() => setViewMode('LEDGER')}>
                  Greige Roll &amp; Lot Register ({filteredLots.length})
                </button>
                <button type="button" aria-selected={viewMode === 'SHEET'} onClick={() => setViewMode('SHEET')}>
                  📊 Floor Receiving Sheet (Live Edit)
                </button>
              </div>
            }
            right={
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowEntryModal(true)}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  + Inward Greige Roll
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowImportModal(true)}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  📁 Import Spreadsheet
                </button>
                {viewMode === 'LEDGER' && (
                  <select className="nos-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="ALL">All Statuses</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="ALLOCATED_WINCH">Allocated to Winch</option>
                    <option value="AGING_ALERT">Aging Alert</option>
                    <option value="QUALITY_HOLD">Quality Hold</option>
                  </select>
                )}
              </div>
            }
          />

          {viewMode === 'LEDGER' ? (
            <DataGrid<GreigeRollLotRecord>
              storageKey="greige-store-lots"
              exportName="greige-store-lots"
              rows={filteredLots}
              columns={columns}
              frozenColumns={2}
              rowKey={(r) => r.id}
              selectedRowKey={selectedLot?.id ?? null}
              onRowClick={(r) => setSelectedLot(r)}
            />
          ) : (
            <EditableSheetGrid<GreigeRollLotRecord>
              title="Greige Fabric Floor Receiving & Allocation Sheet"
              subtitle="Double-click or press Enter on any cell to edit · Available Balance (kg) = Received - Dyeing Alloc auto-calculates"
              rows={filteredLots}
              rowKey={(r) => r.id}
              columns={[
                { key: 'lotNo', header: 'Greige Lot #', type: 'text', width: 130, tone: 'plan', summary: 'count' },
                { key: 'jobNo', header: 'Job No', type: 'text', width: 95 },
                { key: 'buyer', header: 'Buyer', type: 'select', width: 110, options: ['ONLY', 'BS-NMT', 'OVS', 'UTG', 'Name It', 'Only&Sons'] },
                { key: 'styleNo', header: 'Style No', type: 'text', width: 115 },
                { key: 'fabricType', header: 'Fabric Construction', type: 'text', width: 195 },
                { key: 'gsm', header: 'GSM', type: 'number', width: 80 },
                { key: 'binRack', header: 'Bin / Rack', type: 'text', width: 105 },
                { key: 'rollsCount', header: 'Rolls', type: 'number', width: 90, unit: 'rolls', summary: 'sum' },
                { key: 'receivedKg', header: 'Received', type: 'number', width: 125, unit: 'kg', tone: 'plan', summary: 'sum' },
                { key: 'allocatedDyeingKg', header: 'Dyeing Alloc', type: 'number', width: 130, unit: 'kg', summary: 'sum' },
                {
                  key: 'availableKg',
                  header: 'Available Bal',
                  type: 'formula',
                  width: 135,
                  unit: 'kg',
                  formulaLabel: '= max(0, Received (I) - Dyeing Alloc (J))',
                  compute: (r) => Math.max(0, (Number(r.receivedKg) || 0) - (Number(r.allocatedDyeingKg) || 0)),
                  tone: (r) => ((Number(r.receivedKg) || 0) - (Number(r.allocatedDyeingKg) || 0) > 0 ? 'done' : 'mid'),
                  summary: 'sum',
                },
                { key: 'status', header: 'Status', type: 'select', width: 145, options: ['AVAILABLE', 'ALLOCATED_WINCH', 'AGING_ALERT', 'QUALITY_HOLD'] },
              ] as SheetColumn<GreigeRollLotRecord>[]}
              recalculateRow={(r) => {
                const recv = Number(r.receivedKg) || 0;
                const alloc = Number(r.allocatedDyeingKg) || 0;
                const avail = Math.max(0, recv - alloc);
                return {
                  ...r,
                  receivedKg: recv,
                  allocatedDyeingKg: alloc,
                  availableKg: avail,
                };
              }}
              createEmptyRow={(idx) => ({
                id: `GR-SH-${Date.now()}-${idx}`,
                lotNo: `GL-48093-${idx}`,
                jobNo: '48093',
                buyer: 'ONLY',
                styleNo: '22040024',
                fabricType: 'Single Jersey 100% Cotton',
                gsm: 180,
                diaWidth: '68" Open',
                yarnLot: 'LOT-SQ-402',
                knittingMachine: 'KM-02 Mayer & Cie',
                binRack: 'Bin A-06',
                rollsCount: 100,
                receivedKg: 2500,
                allocatedDyeingKg: 0,
                availableKg: 2500,
                fourPointPassPct: 98.5,
                receivedDate: new Date().toISOString().slice(0, 10),
                agingDays: 0,
                status: 'AVAILABLE',
              })}
              onChange={(nextRows) => {
                setLots(nextRows);
                if (nextRows[0]) {
                  recordGreigeRoll({
                    id: nextRows[0].id,
                    lotNo: nextRows[0].lotNo,
                    jobNo: nextRows[0].jobNo,
                    fabricType: nextRows[0].fabricType,
                    receivedKg: nextRows[0].receivedKg,
                    allocatedDyeingKg: nextRows[0].allocatedDyeingKg,
                    availableKg: nextRows[0].availableKg,
                    agingDays: nextRows[0].agingDays,
                    status: nextRows[0].status,
                  });
                }
              }}
              onOpenImportModal={() => setShowImportModal(true)}
              exportFileName="greige-floor-receiving-sheet"
            />
          )}

          <RecordPanel
            open={Boolean(selectedLot)}
            onClose={() => setSelectedLot(null)}
            title={selectedLot ? `${selectedLot.lotNo} · Job ${selectedLot.jobNo}` : ''}
            subtitle={selectedLot ? `${selectedLot.buyer} · ${selectedLot.fabricType} (${selectedLot.gsm} GSM) · ${selectedLot.binRack}` : undefined}
            onPrev={selectedIdx > 0 ? () => setSelectedLot(filteredLots[selectedIdx - 1]) : undefined}
            onNext={selectedIdx >= 0 && selectedIdx < filteredLots.length - 1 ? () => setSelectedLot(filteredLots[selectedIdx + 1]) : undefined}
            sections={recordSections}
            onSave={(updated) => {
              if (!selectedLot) return;
              const receivedKg = Number(updated.receivedKg ?? selectedLot.receivedKg);
              const allocatedDyeingKg = Number(updated.allocatedDyeingKg ?? selectedLot.allocatedDyeingKg);
              const recomputed: GreigeRollLotRecord = {
                ...selectedLot,
                lotNo: String(updated.lotNo ?? selectedLot.lotNo),
                fabricType: String(updated.fabricType ?? selectedLot.fabricType),
                gsm: Number(updated.gsm ?? selectedLot.gsm),
                diaWidth: String(updated.diaWidth ?? selectedLot.diaWidth),
                binRack: String(updated.binRack ?? selectedLot.binRack),
                rollsCount: Number(updated.rollsCount ?? selectedLot.rollsCount),
                receivedKg,
                allocatedDyeingKg,
                availableKg: Math.max(0, receivedKg - allocatedDyeingKg),
                receivedDate: String(updated.receivedDate ?? selectedLot.receivedDate),
                status: (updated.status as GreigeRollLotRecord['status']) ?? selectedLot.status,
                remarks: String(updated.remarks ?? selectedLot.remarks ?? '')
              };
              setLots((prev) => prev.map((x) => (x.id === recomputed.id ? recomputed : x)));
              setSelectedLot(recomputed);
            }}
            onDelete={
              selectedLot
                ? () => {
                    setLastDeletedLot(selectedLot);
                    setLots((prev) => prev.filter((x) => x.id !== selectedLot.id));
                    setSelectedLot(null);
                  }
                : undefined
            }
            onUndoDelete={
              lastDeletedLot
                ? () => {
                    setLots((prev) => [lastDeletedLot, ...prev]);
                    setLastDeletedLot(null);
                  }
                : undefined
            }
          />

          {drill && (
            <DrillPopup
              spec={drill.spec}
              anchorRect={drill.anchor}
              onClose={() => setDrill(null)}
              onShowInTable={(_key, val) => {
                setViewMode('LEDGER');
                if (val && val !== 'ALL') {
                  setFabricGroupFilter(val);
                } else {
                  setFabricGroupFilter('ALL');
                }
              }}
            />
          )}

          {/* New Greige Roll Inward Modal */}
          {showEntryModal && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '580px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    📥 Inward Greige Roll Lot &amp; Storage Intake
                  </h3>
                  <button type="button" onClick={() => setShowEntryModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>×</button>
                </div>

                <form onSubmit={handleInwardRollSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Greige Lot Number</label>
                      <input
                        type="text"
                        placeholder="e.g. GL-48093-X"
                        value={formLotNo}
                        onChange={(e) => setFormLotNo(e.target.value)}
                        required
                        style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Job No</label>
                      <input
                        type="text"
                        value={formJobNo}
                        onChange={(e) => setFormJobNo(e.target.value)}
                        required
                        style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Buyer Brand</label>
                      <select
                        value={formBuyer}
                        onChange={(e) => setFormBuyer(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="ONLY">ONLY</option>
                        <option value="BS-NMT">BS-NMT</option>
                        <option value="OVS">OVS</option>
                        <option value="UTG">UTG</option>
                        <option value="Name It">Name It</option>
                        <option value="Only&Sons">Only&amp;Sons</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Style Number</label>
                      <input
                        type="text"
                        value={formStyle}
                        onChange={(e) => setFormStyle(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Fabric Construction</label>
                    <input
                      type="text"
                      value={formFabric}
                      onChange={(e) => setFormFabric(e.target.value)}
                      required
                      style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>GSM</label>
                      <input
                        type="number"
                        value={formGsm}
                        onChange={(e) => setFormGsm(Number(e.target.value))}
                        style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Dia / Width</label>
                      <input
                        type="text"
                        value={formDia}
                        onChange={(e) => setFormDia(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Bin / Rack</label>
                      <input
                        type="text"
                        value={formBin}
                        onChange={(e) => setFormBin(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Total Rolls</label>
                      <input
                        type="number"
                        value={formRolls}
                        onChange={(e) => setFormRolls(Number(e.target.value))}
                        required
                        style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Received Weight (kg)</label>
                      <input
                        type="number"
                        value={formRecvKg}
                        onChange={(e) => setFormRecvKg(Number(e.target.value))}
                        required
                        style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                    <button type="button" onClick={() => setShowEntryModal(false)} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Record Greige Inward &amp; Sync
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* DataImportModal for Greige Lots */}
          <DataImportModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            title="Import Greige Store Roll Delivery Sheet"
            department="Greige Store"
            expectedColumns={['lotNo', 'jobNo', 'buyer', 'fabricType', 'gsm', 'rollsCount', 'receivedKg', 'binRack']}
            sampleTemplate="lotNo,jobNo,buyer,fabricType,gsm,rollsCount,receivedKg,binRack\nGL-48110-A,48110,ONLY,Single Jersey 100% Cotton,180,110,2750,Bin A-08\nGL-48099-B,48099,OVS,French Terry Unbrushed,260,95,2470,Bin B-03"
            onImport={handleImportGreigeSpreadsheet}
          />
        </div>
      </CrossFilterProvider>
    </Shell>
  );
}
