'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Shell from '../../../components/Shell';
import { Badge, CommandBar, DataGrid, GridColumn, KpiCard, RecordPanel, RecordSection } from '../../../components/ui';
import { fmtDate, fmtNum, fmtQty } from '../../../lib/format';

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

export default function GreigeStorePage() {
  const [lots, setLots] = useState<GreigeRollLotRecord[]>(INITIAL_GREIGE_LOTS);
  const [viewMode, setViewMode] = useState<'LEDGER' | 'SHEET'>('LEDGER');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedLot, setSelectedLot] = useState<GreigeRollLotRecord | null>(null);
  const [lastDeletedLot, setLastDeletedLot] = useState<GreigeRollLotRecord | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const filteredLots = useMemo(() => {
    if (statusFilter === 'ALL') return lots;
    return lots.filter((l) => l.status === statusFilter);
  }, [lots, statusFilter]);

  const totals = useMemo(() => {
    const totalReceived = lots.reduce((s, r) => s + r.receivedKg, 0);
    const totalAllocated = lots.reduce((s, r) => s + r.allocatedDyeingKg, 0);
    const totalAvailable = lots.reduce((s, r) => s + r.availableKg, 0);
    const totalRolls = lots.reduce((s, r) => s + r.rollsCount, 0);
    return { totalReceived, totalAllocated, totalAvailable, totalRolls };
  }, [lots]);

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
    <Shell title="Greige Fabric Store" eyebrow="Knitted Rolls Receiving, Weight Audit, Bin Location & Dyeing Allocation">
      <div className="nos-stack">
        <div className="nos-grid nos-grid-4">
          <KpiCard label="Total Greige Received" value={fmtNum(totals.totalReceived)} unit="kg" delta="124.50 Tons plant total" />
          <KpiCard label="Allocated to Dyeing" value={fmtNum(totals.totalAllocated)} unit="kg" delta="Issued to 23 winches" deltaDirection="up" />
          <KpiCard label="Available Greige Stock" value={fmtNum(totals.totalAvailable)} unit="kg" delta="Ready for batching" />
          <KpiCard label="Active Greige Rolls" value={fmtNum(totals.totalRolls)} unit="rolls" delta={`${lots.length} active roll lots`} />
        </div>

        <CommandBar
          left={
            <div className="nos-seg" role="tablist">
              <button type="button" aria-selected={viewMode === 'LEDGER'} onClick={() => setViewMode('LEDGER')}>
                Greige Roll &amp; Lot Register ({filteredLots.length})
              </button>
              <button type="button" aria-selected={viewMode === 'SHEET'} onClick={() => setViewMode('SHEET')}>
                Floor Receiving Sheet
              </button>
            </div>
          }
          right={
            viewMode === 'LEDGER' ? (
              <select className="nos-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="ALLOCATED_WINCH">Allocated to Winch</option>
                <option value="AGING_ALERT">Aging Alert</option>
                <option value="QUALITY_HOLD">Quality Hold</option>
              </select>
            ) : null
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
          <iframe
            ref={iframeRef}
            src="/greige-store/index.html"
            title="Greige Fabric Store"
            onLoad={syncThemeToIframe}
            style={{
              width: '100%',
              height: 'calc(100vh - 220px)',
              border: '1px solid var(--nos-line)',
              borderRadius: 12,
              background: 'var(--nos-surface)'
            }}
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
      </div>
    </Shell>
  );
}
