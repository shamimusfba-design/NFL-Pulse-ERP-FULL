'use client';

/**
 * NOS Sales & Merchandising — Bulk Production Workspace
 *
 * Implements the 6 sequential merchandiser sub-menus (docs/UX-STANDARD.md):
 * 1. Dashboard — merchandiser KPI cards, stage progress donuts, and active job table
 * 2. Order Entry — repeat/new job, CCD grouping, edit-locked sizes, garment fabric-parts, photo upload
 * 3. Create BOM — fabric parts, trims checklist, IE thread/technical routing, planning approval gate
 * 4. Fabric Order Sheet — CAD consumption + DIA driven booking, pending badges, print view
 * 5. Trims Ordering — expandable items, timestamped updates, dedicated save button
 * 6. Follow-up — full-width milestone DataGrid (Lab Dip, Fabric, Trims, File Handover, PP Meeting, Sewing, Ex-factory)
 */

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Shell from '../../components/Shell';
import demo2000DataRaw from '../../data/demo-2000-master.json';
import {
  Card,
  KpiCard,
  Button,
  Badge,
  DataGrid,
  GridColumn,
  SectionNav,
  Alert
} from '../../components/ui';
import { fmtDate, fmtNum } from '../../lib/format';
import {
  LayoutDashboard,
  FilePlus,
  FileSpreadsheet,
  Layers,
  ShoppingBag,
  Clock,
  Printer,
  Download,
  Plus,
  Save,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Shirt,
  Sparkles,
  Search,
  Check,
  Send,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  Eye,
  FileCheck,
  Trash2,
  X,
  FileText,
  Calendar,
  Truck
} from 'lucide-react';

type SubTabId = 'dashboard' | 'order-entry' | 'create-bom' | 'fabric-sheet' | 'trims-order' | 'follow-up';

const SUB_TABS = [
  { id: 'dashboard', code: '01', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'order-entry', code: '02', label: 'Order Entry', icon: FilePlus },
  { id: 'create-bom', code: '03', label: 'Create BOM', icon: FileSpreadsheet },
  { id: 'fabric-sheet', code: '04', label: 'Fabric Order Sheet', icon: Layers },
  { id: 'trims-order', code: '05', label: 'Trims Ordering', icon: ShoppingBag },
  { id: 'follow-up', code: '06', label: 'Follow-up', icon: Clock }
];

const FABRIC_PARTS = [
  { id: 'part-body', part: 'Body Fabric', types: ['100% Combed Cotton Single Jersey 160 GSM', 'CVC 60/40 French Terry 260 GSM', '80/20 Cotton Poly Fleece 300 GSM', '100% Cotton Pique 210 GSM'] },
  { id: 'part-rib', part: 'Neck Rib', types: ['1x1 Cotton Lycra Rib 220 GSM', '2x2 Lycra Rib 280 GSM', 'Self Fabric Binding'] },
  { id: 'part-cuff', part: 'Cuff & Bottom Hem', types: ['1x1 Cotton Lycra Rib 220 GSM', '2x2 Lycra Rib 280 GSM', 'Standard Hem (No Rib)'] },
  { id: 'part-pocket', part: 'Pocket / Inner Lining', types: ['Single Jersey 140 GSM DTM', 'T/C Pocketing Fabric 110 GSM', 'Self Fabric'] }
];

type SizeItem = { size: string; qty: number };

const SIZE_PRESETS: Record<string, SizeItem[]> = {
  ALPHA: [
    { size: 'XS', qty: 500 },
    { size: 'S', qty: 1200 },
    { size: 'M', qty: 2000 },
    { size: 'L', qty: 1800 },
    { size: 'XL', qty: 1000 },
    { size: 'XXL', qty: 500 }
  ],
  NUMERIC_WAIST: [
    { size: '28', qty: 400 },
    { size: '30', qty: 1100 },
    { size: '32', qty: 2200 },
    { size: '34', qty: 1900 },
    { size: '36', qty: 900 },
    { size: '38', qty: 500 }
  ],
  KIDS: [
    { size: '92', qty: 600 },
    { size: '98', qty: 1000 },
    { size: '104', qty: 1800 },
    { size: '110', qty: 1600 },
    { size: '116', qty: 1200 },
    { size: '128', qty: 800 }
  ],
  NUMERIC_EURO: [
    { size: '34', qty: 450 },
    { size: '36', qty: 1200 },
    { size: '38', qty: 2100 },
    { size: '40', qty: 1850 },
    { size: '42', qty: 950 },
    { size: '44', qty: 450 }
  ]
};

export default function BulkMerchandisingPage() {
  const [jobsList, setJobsList] = useState<any[]>(() => (demo2000DataRaw as any)?.jobs || []);
  const masterJobs = jobsList;
  const [activeTab, setActiveTab] = useState<SubTabId>('dashboard');
  const [selectedJobNo, setSelectedJobNo] = useState<string>(masterJobs[0]?.jobNo ? String(masterJobs[0].jobNo) : '44001');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Currently focused job for BOM / Fabric / Trims views
  const currentJob = useMemo(() => {
    return masterJobs.find(j => String(j.jobNo) === String(selectedJobNo)) || masterJobs[0];
  }, [selectedJobNo, masterJobs]);

  /* ------------------------------------------------------------------ TAB 1: DASHBOARD */
  const dashboardStats = useMemo(() => {
    const totalJobs = masterJobs.length;
    const totalVolume = masterJobs.reduce((s, j) => s + (j.orderQty || 0), 0);
    const inProductionJobs = masterJobs.filter(j => j.overallStage !== 'Shipment' && j.overallStage !== 'Order Entry').length;
    const inProductionVolume = masterJobs
      .filter(j => j.overallStage !== 'Shipment' && j.overallStage !== 'Order Entry')
      .reduce((s, j) => s + (j.orderQty || 0), 0);
    const shippedVolume = masterJobs
      .filter(j => j.overallStage === 'Shipment')
      .reduce((s, j) => s + (j.orderQty || 0), 0);

    return { totalJobs, totalVolume, inProductionJobs, inProductionVolume, shippedVolume };
  }, [masterJobs]);

  const dashboardColumns: GridColumn<any>[] = useMemo(() => [
    {
      key: 'jobNo',
      header: 'Job No',
      width: 120,
      render: (j) => (
        <Link
          href={`/jobs?q=${encodeURIComponent(j.jobNo)}`}
          onClick={(e) => e.stopPropagation()}
          style={{ color: '#0284C7', fontWeight: 700, textDecoration: 'none' }}
          className="hover:underline"
        >
          {j.jobNo}
        </Link>
      )
    },
    { key: 'buyer', header: 'Buyer', width: 130 },
    { key: 'styleNo', header: 'Style No', width: 130 },
    { key: 'item', header: 'Garment Item', width: 140 },
    { key: 'orderQty', header: 'Order Qty (pcs)', width: 130, numeric: true, total: true, render: (j) => fmtNum(j.orderQty) },
    { key: 'overallStage', header: 'Overall Stage', width: 150 },
    {
      key: 'riskStatus',
      header: 'Status',
      width: 120,
      render: (j) => (
        <Badge tone={j.riskStatus === 'CRITICAL' ? 'balance' : j.riskStatus === 'ATTENTION' ? 'mid' : 'done'}>
          {j.riskStatus}
        </Badge>
      )
    },
    { key: 'planMonth', header: 'Ship Month', width: 110 },
    { key: 'merchandiser', header: 'Merchandiser', width: 130 }
  ], []);

  /* ------------------------------------------------------------------ TAB 2: ORDER ENTRY */
  const [orderMode, setOrderMode] = useState<'MANUAL' | 'IMPORT'>('MANUAL');
  const [entryJobType, setEntryJobType] = useState<'NEW' | 'REPEAT'>('NEW');
  const [entryBuyer, setEntryBuyer] = useState('ONLY');
  const [entryPoNumber, setEntryPoNumber] = useState('PO-89420');
  const [entryStyle, setEntryStyle] = useState('ONLY-20268819');
  const [entryItem, setEntryItem] = useState('T-Shirt');
  const [entryBodyFabric, setEntryBodyFabric] = useState(FABRIC_PARTS[0].types[0]);
  const [entryNeckRib, setEntryNeckRib] = useState(FABRIC_PARTS[1].types[0]);
  const [entryCuff, setEntryCuff] = useState(FABRIC_PARTS[2].types[2]);

  // Pre-shipment dates & logistics
  const [entryCcd, setEntryCcd] = useState('2026-12-15');
  const [entryPoDate, setEntryPoDate] = useState('2026-11-08');
  const [entryCancelDate, setEntryCancelDate] = useState('2026-12-25');
  const [entryShipMode, setEntryShipMode] = useState('Sea Freight');

  // Flexible size matrix
  const [sizesLocked, setSizesLocked] = useState(false);
  const [sizePresetKey, setSizePresetKey] = useState<string>('ALPHA');
  const [sizeList, setSizeList] = useState<SizeItem[]>(SIZE_PRESETS.ALPHA);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [customQtyInput, setCustomQtyInput] = useState('500');

  const entryTotalQty = useMemo(() => sizeList.reduce((acc, s) => acc + (Number(s.qty) || 0), 0), [sizeList]);

  // PO Import State
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importParsedData, setImportParsedData] = useState<{
    fileName: string;
    buyer: string;
    poNumber: string;
    styleNo: string;
    item: string;
    ccd: string;
    cancelDate: string;
    shipMode: string;
    sizes: SizeItem[];
  } | null>(null);

  const [frontImageUploaded, setFrontImageUploaded] = useState(false);
  const [backImageUploaded, setBackImageUploaded] = useState(false);
  const [orderCreatedSuccess, setOrderCreatedSuccess] = useState(false);

  const handleApplyPreset = (key: string) => {
    setSizePresetKey(key);
    if (SIZE_PRESETS[key]) {
      setSizeList(SIZE_PRESETS[key].map(s => ({ ...s })));
    }
  };

  const handleUpdateSizeQty = (idx: number, qty: number) => {
    setSizeList(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], qty };
      return next;
    });
  };

  const handleRemoveSize = (idx: number) => {
    setSizeList(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddCustomSize = () => {
    const trimmed = customSizeInput.trim().toUpperCase();
    if (!trimmed) return;
    if (sizeList.some(s => s.size.toUpperCase() === trimmed)) {
      showToast('Size ' + trimmed + ' already exists!');
      return;
    }
    const qty = parseInt(customQtyInput, 10) || 500;
    setSizeList(prev => [...prev, { size: trimmed, qty }]);
    setCustomSizeInput('');
    setCustomQtyInput('500');
    setSizePresetKey('CUSTOM');
    showToast('Added size ' + trimmed);
  };

  const handleSimulateImport = (presetType: 'bestseller-alpha' | 'ovs-numeric' | 'kids') => {
    if (presetType === 'bestseller-alpha') {
      const data = {
        fileName: 'BESTSELLER_PO_89420_ONLY_TSHIRT.xlsx',
        buyer: 'ONLY',
        poNumber: 'PO-89420-BST',
        styleNo: 'ONLY-20268819',
        item: 'T-Shirt',
        ccd: '2026-12-15',
        cancelDate: '2026-12-25',
        shipMode: 'Sea Freight',
        sizes: [
          { size: 'XS', qty: 650 },
          { size: 'S', qty: 1500 },
          { size: 'M', qty: 2400 },
          { size: 'L', qty: 2100 },
          { size: 'XL', qty: 1200 },
          { size: 'XXL', qty: 550 }
        ]
      };
      setImportFileName(data.fileName);
      setImportStatus('✓ PO File Parsed: ONLY Bestseller Excel (6 Alpha sizes, 8,400 pcs)');
      setImportParsedData(data);
    } else if (presetType === 'ovs-numeric') {
      const data = {
        fileName: 'OVS_SPA_PO_55102_WAIST_TROUSER.pdf',
        buyer: 'OVS',
        poNumber: 'PO-55102-OVS',
        styleNo: 'OVS-TR-9941',
        item: 'Trouser',
        ccd: '2026-12-20',
        cancelDate: '2026-12-30',
        shipMode: 'Sea Freight',
        sizes: [
          { size: '28', qty: 500 },
          { size: '30', qty: 1400 },
          { size: '32', qty: 2600 },
          { size: '34', qty: 2200 },
          { size: '36', qty: 1000 },
          { size: '38', qty: 600 }
        ]
      };
      setImportFileName(data.fileName);
      setImportStatus('✓ PO File Parsed: OVS S.p.A. PDF Order (Numeric 28-38, 8,300 pcs)');
      setImportParsedData(data);
    } else {
      const data = {
        fileName: 'NAME_IT_KIDS_PO_77209.csv',
        buyer: 'Name It',
        poNumber: 'PO-77209-NMT',
        styleNo: 'NMT-KID-4040',
        item: 'Sweatshirt',
        ccd: '2026-12-18',
        cancelDate: '2026-12-28',
        shipMode: 'Air Freight',
        sizes: [
          { size: '92', qty: 800 },
          { size: '98', qty: 1200 },
          { size: '104', qty: 2000 },
          { size: '110', qty: 1700 },
          { size: '116', qty: 1300 },
          { size: '128', qty: 900 }
        ]
      };
      setImportFileName(data.fileName);
      setImportStatus('✓ PO File Parsed: Name It Kids CSV Order (Sizes 92-128, 7,900 pcs)');
      setImportParsedData(data);
    }
  };

  const handleApplyImportedData = () => {
    if (!importParsedData) return;
    setEntryBuyer(importParsedData.buyer);
    setEntryPoNumber(importParsedData.poNumber);
    setEntryStyle(importParsedData.styleNo);
    setEntryItem(importParsedData.item);
    setEntryCcd(importParsedData.ccd);
    setEntryCancelDate(importParsedData.cancelDate);
    setEntryShipMode(importParsedData.shipMode);
    setSizeList(importParsedData.sizes.map(s => ({ ...s })));
    setSizePresetKey('CUSTOM');
    showToast('Imported PO data applied to order configuration!');
  };

  const handleSaveAndDispatch = () => {
    const newJobNo = String(49000 + Math.floor(Math.random() * 900));
    const newJob = {
      jobNo: newJobNo,
      buyer: entryBuyer,
      styleNo: entryStyle,
      item: entryItem,
      orderQty: entryTotalQty,
      overallStage: 'BOM & CAD',
      riskStatus: 'NORMAL',
      planMonth: entryCcd ? entryCcd.slice(0, 7) : '2026-12',
      merchandiser: 'Abid',
      poNumber: entryPoNumber,
      ccd: entryCcd,
      poDate: entryPoDate,
      cancelDate: entryCancelDate,
      shipMode: entryShipMode,
      sizes: sizeList,
      fabric: {
        fabricType: entryBodyFabric,
        fabricReqKg: Math.round(entryTotalQty * 0.22),
        dyeingFactory: 'NFL',
        status: 'Pending Booking'
      }
    };
    setJobsList([newJob, ...jobsList]);
    setSelectedJobNo(newJobNo);
    setOrderCreatedSuccess(true);
    showToast('Job #' + newJobNo + ' created & dispatched to Central IE, CAD & Planning!');
  };

  /* ------------------------------------------------------------------ TAB 3: CREATE BOM */
  const [bomSubmittedToPlanning, setBomSubmittedToPlanning] = useState(false);
  const [bomIeThreadStatus, setBomIeThreadStatus] = useState<'ISSUED' | 'PENDING'>('ISSUED');
  const [bomTechLaceStatus, setBomTechLaceStatus] = useState<'CONFIRMED' | 'PENDING'>('CONFIRMED');

  /* ------------------------------------------------------------------ TAB 4: FABRIC ORDER SHEET */
  const fabricSheetLines = useMemo(() => {
    const f = currentJob.fabric || {};
    const req = f.fabricReqKg || 2500;
    return [
      { part: 'Body', fabric: f.fabricType || '100% Cotton Single Jersey', gsm: f.gsm || '160', dia: f.widthDia || '76" Open', cadCons: 2.14, bookingKg: req, mill: f.dyeingFactory || 'NFL', status: 'Booked' },
      { part: 'Neck Rib', fabric: '1x1 Cotton Lycra Rib', gsm: '220', dia: '48" Tubular', cadCons: 0.18, bookingKg: Math.round(req * 0.08), mill: f.dyeingFactory || 'NFL', status: 'Booked' }
    ];
  }, [currentJob]);

  /* ------------------------------------------------------------------ TAB 5: TRIMS ORDERING */
  const [trimsItems, setTrimsItems] = useState<any[]>([]);
  useEffect(() => {
    if (currentJob?.trims?.items) {
      setTrimsItems(currentJob.trims.items.map((it: any, idx: number) => ({
        id: `trim-${idx}`,
        name: it.name,
        supplier: it.supplier,
        reqQty: currentJob.orderQty,
        orderQty: Math.round(currentJob.orderQty * 1.03),
        status: it.status,
        inHouseDate: currentJob.trims?.inHouseDate || '15-Nov-2026'
      })));
    }
  }, [currentJob]);

  /* ------------------------------------------------------------------ TAB 6: FOLLOW-UP MILESTONES */
  const followUpColumns: GridColumn<any>[] = useMemo(() => [
    {
      key: 'jobNo',
      header: 'Job No',
      width: 110,
      render: (j) => (
        <Link
          href={`/jobs?q=${encodeURIComponent(j.jobNo)}`}
          onClick={(e) => e.stopPropagation()}
          style={{ color: '#0284C7', fontWeight: 700, textDecoration: 'none' }}
          className="hover:underline"
        >
          {j.jobNo}
        </Link>
      )
    },
    { key: 'buyer', header: 'Buyer', width: 120 },
    { key: 'styleNo', header: 'Style No', width: 120 },
    { key: 'orderQty', header: 'Order Qty', width: 110, numeric: true, render: (j) => fmtNum(j.orderQty) },
    {
      key: 'labDip',
      header: 'Lab Dip (Approval)',
      width: 150,
      render: (j) => (
        <span style={{ fontSize: '11px', color: j.dyeingLab?.status === 'APPROVED' ? '#16A34A' : '#D97706', fontWeight: 600 }}>
          {j.dyeingLab?.status === 'APPROVED' ? `Approved (${j.dyeingLab.optionApproved})` : 'Pending'}
        </span>
      )
    },
    {
      key: 'fabricInhouse',
      header: 'Fabric Status',
      width: 140,
      render: (j) => (
        <span style={{ fontSize: '11px', color: j.fabric?.fabricBalanceKg === 0 ? '#16A34A' : '#D97706', fontWeight: 600 }}>
          {j.fabric?.fabricBalanceKg === 0 ? '100% In-house' : `${fmtNum(j.fabric?.fabricReceivedKg || 0)} kg Recv`}
        </span>
      )
    },
    {
      key: 'trimsStatus',
      header: 'Trims In-house',
      width: 130,
      render: (j) => (
        <Badge tone={j.trims?.status === 'IN_HOUSE' ? 'done' : j.trims?.status === 'ORDERED' ? 'info' : 'mid'}>
          {j.trims?.status || 'DUE'}
        </Badge>
      )
    },
    { key: 'sewingStart', header: 'Sewing Start', width: 115, render: (j) => j.dates?.sewingStart || '—' },
    { key: 'exFactory', header: 'Ex-Factory Date', width: 125, render: (j) => j.dates?.exFactory || '—' },
    {
      key: 'health',
      header: 'Milestone Health',
      width: 130,
      render: (j) => (
        <Badge tone={j.riskStatus === 'CRITICAL' ? 'balance' : j.riskStatus === 'ATTENTION' ? 'mid' : 'done'}>
          {j.riskStatus === 'ON_TRACK' ? 'On Track' : j.riskStatus}
        </Badge>
      )
    }
  ], []);

  return (
    <Shell
      title="Sales & Merchandising"
      eyebrow="Bulk Production & Milestone Lifecycle"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 16,
          right: 24,
          zIndex: 9999,
          background: '#0F274E',
          color: '#FFFFFF',
          padding: '10px 18px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '12px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <CheckCircle2 size={16} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sequential 6-SubMenu Navigation */}
      <div style={{ marginBottom: 16 }}>
        <SectionNav
          stickyTop={0}
          sections={SUB_TABS}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as SubTabId)}
        />
      </div>

      {/* ===================================================================== TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <KpiCard
              label="My Open Jobs"
              value={fmtNum(dashboardStats.totalJobs)}
            />
            <KpiCard
              label="Total Order Volume"
              value={`${fmtNum(dashboardStats.totalVolume)} pcs`}
            />
            <KpiCard
              label="In Production"
              value={`${fmtNum(dashboardStats.inProductionVolume)} pcs`}
            />
            <KpiCard
              label="Shipped Volume"
              value={`${fmtNum(dashboardStats.shippedVolume)} pcs`}
            />
          </div>

          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Active Bulk Merchandising Register</div>
              <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>Click any Job No to inspect complete 360 life-cycle</span>
            </div>
          }>
            <DataGrid
              rows={masterJobs}
              columns={dashboardColumns}
              rowKey={(j) => String(j.id || j.jobNo)}
              frozenColumns={1}
              storageKey="bulk-merch-dashboard-grid"
              exportName="merchandising-bulk-jobs"
            />
          </Card>
        </div>
      )}

      {/* ===================================================================== TAB 2: ORDER ENTRY */}
      {activeTab === 'order-entry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orderCreatedSuccess && (
            <Alert tone="info">
              Job created and dispatched to Central IE, CAD, Dyeing Lab, and Central Planning!
            </Alert>
          )}

          {/* Mode Selector Header Bar */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E' }}>Entry Mode:</span>
                <button
                  type="button"
                  onClick={() => setOrderMode('MANUAL')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    borderRadius: 7,
                    border: orderMode === 'MANUAL' ? '2px solid #0284C7' : '1px solid #CBD5E1',
                    background: orderMode === 'MANUAL' ? '#0F274E' : '#FFFFFF',
                    color: orderMode === 'MANUAL' ? '#FFFFFF' : '#334155',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: orderMode === 'MANUAL' ? '0 2px 4px rgba(15,39,78,0.15)' : 'none'
                  }}
                >
                  <FilePlus size={14} />
                  ✍ Manual Order Entry
                </button>

                <button
                  type="button"
                  onClick={() => setOrderMode('IMPORT')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    borderRadius: 7,
                    border: orderMode === 'IMPORT' ? '2px solid #0284C7' : '1px solid #CBD5E1',
                    background: orderMode === 'IMPORT' ? '#0F274E' : '#FFFFFF',
                    color: orderMode === 'IMPORT' ? '#FFFFFF' : '#334155',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: orderMode === 'IMPORT' ? '0 2px 4px rgba(15,39,78,0.15)' : 'none'
                  }}
                >
                  <Upload size={14} />
                  📂 Import PO File (AI / Excel / CSV / PDF)
                </button>
              </div>

              <div style={{ fontSize: '12px', color: '#64748B' }}>
                {orderMode === 'MANUAL'
                  ? 'Keyboard entry for new styles or repeat lots'
                  : 'Automated extraction of styles, pre-shipment dates & size sets'}
              </div>
            </div>
          </Card>

          {/* ======================= IMPORT SECTION (WHEN ACTIVE) ======================= */}
          {orderMode === 'IMPORT' && (
            <Card title={
              <div>
                <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>PO File Intake & Automated Parser</div>
                <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>Upload Excel (.xlsx/.csv) or PDF purchase orders with multi-size breakdown</span>
              </div>
            }>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Upload Dropzone */}
                <div style={{
                  border: '2px dashed #93C5FD',
                  borderRadius: 10,
                  padding: '24px 20px',
                  background: '#F8FAFC',
                  textAlign: 'center'
                }}>
                  <Upload size={32} color="#0284C7" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F274E', marginBottom: 4 }}>
                    Drag & Drop Buyer Purchase Order or Click to Browse
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginBottom: 14 }}>
                    Supports Bestseller Excel sheets, OVS S.p.A. PDF POs, UTG, and Name It CSV files
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <label style={{
                      padding: '7px 16px',
                      background: '#0284C7',
                      color: '#FFFFFF',
                      borderRadius: 6,
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}>
                      Select PO File
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv,.pdf,.json"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files && e.target.files[0];
                          if (f) {
                            if (f.name.toLowerCase().includes('ovs')) {
                              handleSimulateImport('ovs-numeric');
                            } else if (f.name.toLowerCase().includes('kid') || f.name.toLowerCase().includes('name')) {
                              handleSimulateImport('kids');
                            } else {
                              handleSimulateImport('bestseller-alpha');
                            }
                          }
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => handleSimulateImport('bestseller-alpha')}
                      style={{ padding: '7px 14px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '12px', fontWeight: 600, color: '#0F274E', cursor: 'pointer' }}
                    >
                      📄 Sample Bestseller PO (Alpha XS–XXL)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimulateImport('ovs-numeric')}
                      style={{ padding: '7px 14px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '12px', fontWeight: 600, color: '#0F274E', cursor: 'pointer' }}
                    >
                      📊 Sample OVS PO (Numeric 28–38)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimulateImport('kids')}
                      style={{ padding: '7px 14px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '12px', fontWeight: 600, color: '#0F274E', cursor: 'pointer' }}
                    >
                      🧒 Sample Name It PO (Kids 92–128)
                    </button>
                  </div>
                </div>

                {/* Import Analysis Result */}
                {importParsedData && (
                  <div style={{ border: '1px solid #86EFAC', background: '#F0FDF4', borderRadius: 8, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={18} color="#16A34A" />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>
                          {importStatus}
                        </span>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleApplyImportedData}
                      >
                        <Check size={13} style={{ marginRight: 4 }} />
                        Apply & Populate Order Form Below
                      </Button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: '12px', color: '#14532D' }}>
                      <div><strong>Buyer:</strong> {importParsedData.buyer}</div>
                      <div><strong>PO Ref:</strong> {importParsedData.poNumber}</div>
                      <div><strong>Style No:</strong> {importParsedData.styleNo}</div>
                      <div><strong>Garment:</strong> {importParsedData.item}</div>
                      <div><strong>Pre-Shipment CCD:</strong> {importParsedData.ccd}</div>
                      <div><strong>Ship Mode:</strong> {importParsedData.shipMode}</div>
                    </div>

                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #BBF7D0' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#166534', display: 'block', marginBottom: 6 }}>
                        Parsed Size Breakdown ({importParsedData.sizes.reduce((a, b) => a + b.qty, 0).toLocaleString()} pcs):
                      </span>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {importParsedData.sizes.map((s, idx) => (
                          <div key={idx} style={{ background: '#FFFFFF', border: '1px solid #86EFAC', borderRadius: 6, padding: '4px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#15803D' }}>{s.size}</div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E' }}>{s.qty.toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ======================= ORDER FORM & CONFIGURATION ======================= */}
          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>
                {orderMode === 'IMPORT' ? 'Review & Configure Imported Order' : 'Order Entry & Garment Part Configuration'}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>
                Specify buyer details, pre-shipment delivery dates, garment parts, and multi-size matrices
              </span>
            </div>
          }>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              {/* Column 1: Order Meta */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} color="#0284C7" />
                  Order Identification
                </h4>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Job Type</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setEntryJobType('NEW')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: entryJobType === 'NEW' ? '1px solid #0284C7' : '1px solid #CBD5E1',
                        background: entryJobType === 'NEW' ? '#0F274E' : '#FFFFFF',
                        color: entryJobType === 'NEW' ? '#FFFFFF' : '#334155',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      New Order
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryJobType('REPEAT')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: entryJobType === 'REPEAT' ? '1px solid #0284C7' : '1px solid #CBD5E1',
                        background: entryJobType === 'REPEAT' ? '#0F274E' : '#FFFFFF',
                        color: entryJobType === 'REPEAT' ? '#FFFFFF' : '#334155',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Repeat Order Lot
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Buyer</label>
                    <select
                      value={entryBuyer}
                      onChange={(e) => setEntryBuyer(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px' }}
                    >
                      <option value="ONLY">ONLY (Bestseller)</option>
                      <option value="Name It">Name It (Bestseller)</option>
                      <option value="OVS">OVS S.p.A.</option>
                      <option value="UTG">UTG Group</option>
                      <option value="Only & Sons">Only & Sons</option>
                      <option value="New Look">New Look</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>PO Number</label>
                    <input
                      type="text"
                      value={entryPoNumber}
                      onChange={(e) => setEntryPoNumber(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Style No</label>
                    <input
                      type="text"
                      value={entryStyle}
                      onChange={(e) => setEntryStyle(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Garment Item</label>
                    <select
                      value={entryItem}
                      onChange={(e) => setEntryItem(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px' }}
                    >
                      <option value="T-Shirt">T-Shirt (Crew Neck)</option>
                      <option value="Polo Shirt">Polo Shirt (Rib Collar)</option>
                      <option value="Sweatshirt">Sweatshirt (French Terry)</option>
                      <option value="Hoodie">Hoodie (Brushed Fleece)</option>
                      <option value="Trouser">Jogger Trouser</option>
                      <option value="Shorts">French Terry Shorts</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Column 2: Pre-Shipment & Critical Dates */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} color="#0284C7" />
                  Pre-Shipment & Delivery Schedule
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Pre-Shipment CCD Date *
                    </label>
                    <input
                      type="date"
                      value={entryCcd}
                      onChange={(e) => setEntryCcd(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      PO Received Date
                    </label>
                    <input
                      type="date"
                      value={entryPoDate}
                      onChange={(e) => setEntryPoDate(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Cancel / Cut-Off Date
                    </label>
                    <input
                      type="date"
                      value={entryCancelDate}
                      onChange={(e) => setEntryCancelDate(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Shipment Mode
                    </label>
                    <select
                      value={entryShipMode}
                      onChange={(e) => setEntryShipMode(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px' }}
                    >
                      <option value="Sea Freight">Sea Freight (FCL/LCL)</option>
                      <option value="Air Freight">Air Freight</option>
                      <option value="Sea-Air">Sea-Air Combined</option>
                      <option value="Express Courier">Express Courier</option>
                    </select>
                  </div>
                </div>

                {/* Garment Photos / Sketches */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Garment Sketches (Front / Back)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div
                      onClick={() => setFrontImageUploaded(true)}
                      style={{
                        border: '2px dashed #CBD5E1',
                        borderRadius: 8,
                        padding: 10,
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: frontImageUploaded ? '#F0FDF4' : '#F8FAFC'
                      }}
                    >
                      <Upload size={16} color={frontImageUploaded ? '#16A34A' : '#64748B'} style={{ margin: '0 auto 4px' }} />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: frontImageUploaded ? '#16A34A' : '#475569', display: 'block' }}>
                        {frontImageUploaded ? 'Front View Attached' : 'Upload Front Sketch'}
                      </span>
                    </div>

                    <div
                      onClick={() => setBackImageUploaded(true)}
                      style={{
                        border: '2px dashed #CBD5E1',
                        borderRadius: 8,
                        padding: 10,
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: backImageUploaded ? '#F0FDF4' : '#F8FAFC'
                      }}
                    >
                      <Upload size={16} color={backImageUploaded ? '#16A34A' : '#64748B'} style={{ margin: '0 auto 4px' }} />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: backImageUploaded ? '#16A34A' : '#475569', display: 'block' }}>
                        {backImageUploaded ? 'Back View Attached' : 'Upload Back Sketch'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 3: Part-wise Fabric Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Layers size={14} color="#0284C7" />
                  Garment Fabric Parts
                </h4>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Body Fabric</label>
                  <select
                    value={entryBodyFabric}
                    onChange={(e) => setEntryBodyFabric(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px' }}
                  >
                    {FABRIC_PARTS[0].types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Neck Rib / Collar</label>
                  <select
                    value={entryNeckRib}
                    onChange={(e) => setEntryNeckRib(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px' }}
                  >
                    {FABRIC_PARTS[1].types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Cuff / Bottom Rib</label>
                  <select
                    value={entryCuff}
                    onChange={(e) => setEntryCuff(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px' }}
                  >
                    {FABRIC_PARTS[2].types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* ======================= FLEXIBLE SIZE BREAKDOWN ======================= */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0F274E', margin: 0 }}>
                    Size Breakdown & Order Quantities (Alpha, Numeric & Custom)
                  </h4>
                  <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                    Total Order Quantity: <strong style={{ color: '#0F274E', fontSize: '13px' }}>{fmtNum(entryTotalQty)} pcs</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSizesLocked(!sizesLocked)}
                  >
                    {sizesLocked ? <Lock size={12} style={{ marginRight: 4 }} /> : <Unlock size={12} style={{ marginRight: 4 }} />}
                    {sizesLocked ? 'Unlock Sizes' : 'Lock Sizes'}
                  </Button>
                </div>
              </div>

              {/* Preset Selector Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Load Size Template:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('ALPHA')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 5,
                    border: sizePresetKey === 'ALPHA' ? '1px solid #0284C7' : '1px solid #CBD5E1',
                    background: sizePresetKey === 'ALPHA' ? '#E0F2FE' : '#FFFFFF',
                    color: sizePresetKey === 'ALPHA' ? '#0369A1' : '#475569',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Adult Alpha (XS – XXL)
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset('NUMERIC_WAIST')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 5,
                    border: sizePresetKey === 'NUMERIC_WAIST' ? '1px solid #0284C7' : '1px solid #CBD5E1',
                    background: sizePresetKey === 'NUMERIC_WAIST' ? '#E0F2FE' : '#FFFFFF',
                    color: sizePresetKey === 'NUMERIC_WAIST' ? '#0369A1' : '#475569',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Numeric Waist / Inseam (28 – 38)
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset('KIDS')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 5,
                    border: sizePresetKey === 'KIDS' ? '1px solid #0284C7' : '1px solid #CBD5E1',
                    background: sizePresetKey === 'KIDS' ? '#E0F2FE' : '#FFFFFF',
                    color: sizePresetKey === 'KIDS' ? '#0369A1' : '#475569',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Kids Heights (92 – 128)
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset('NUMERIC_EURO')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 5,
                    border: sizePresetKey === 'NUMERIC_EURO' ? '1px solid #0284C7' : '1px solid #CBD5E1',
                    background: sizePresetKey === 'NUMERIC_EURO' ? '#E0F2FE' : '#FFFFFF',
                    color: sizePresetKey === 'NUMERIC_EURO' ? '#0369A1' : '#475569',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Euro Numeric (34 – 44)
                </button>
              </div>

              {/* Dynamic Size Columns Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: 10,
                marginBottom: 14
              }}>
                {sizeList.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                      padding: '8px 10px',
                      background: '#F8FAFC',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E' }}>{item.size}</span>
                      {!sizesLocked && sizeList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSize(idx)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: 0,
                            lineHeight: 1
                          }}
                          title="Remove size"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      disabled={sizesLocked}
                      value={item.qty}
                      onChange={(e) => handleUpdateSizeQty(idx, Number(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        padding: '6px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#0F274E',
                        background: sizesLocked ? '#F1F5F9' : '#FFFFFF'
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Add Custom Size Line */}
              {!sizesLocked && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: '#F1F5F9',
                  borderRadius: 6,
                  flexWrap: 'wrap'
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Add Another Size:</span>
                  <input
                    type="text"
                    placeholder="e.g. 3XL, 42, 140"
                    value={customSizeInput}
                    onChange={(e) => setCustomSizeInput(e.target.value)}
                    style={{ width: 120, padding: '5px 8px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: '11.5px' }}
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={customQtyInput}
                    onChange={(e) => setCustomQtyInput(e.target.value)}
                    style={{ width: 80, padding: '5px 8px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: '11.5px' }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAddCustomSize}
                  >
                    <Plus size={12} style={{ marginRight: 3 }} />
                    Add Size
                  </Button>
                </div>
              )}
            </div>

            {/* Save & Dispatch Button */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button
                variant="primary"
                onClick={handleSaveAndDispatch}
              >
                <Save size={14} style={{ marginRight: 6 }} />
                Save & Dispatch Order
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== TAB 3: CREATE BOM */}
      {activeTab === 'create-bom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Job Picker Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E' }}>Active Job:</span>
            <select
              value={selectedJobNo}
              onChange={(e) => setSelectedJobNo(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600 }}
            >
              {masterJobs.slice(0, 50).map(j => (
                <option key={j.jobNo} value={j.jobNo}>Job #{j.jobNo} · {j.buyer} · {j.styleNo} ({fmtNum(j.orderQty)} pcs)</option>
              ))}
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <Badge tone={bomSubmittedToPlanning ? 'done' : 'mid'}>
                {bomSubmittedToPlanning ? 'Planning Approval: Submitted' : 'Planning Approval: Pending Draft'}
              </Badge>
            </div>
          </div>

          {/* BOM Sections */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
            {/* Fabric Section */}
            <Card title={
              <div>
                <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Fabric BOM Breakdown</div>
                <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>CAD consumption driven parts</span>
              </div>
            }>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                      <th style={{ padding: '8px 4px' }}>Part</th>
                      <th style={{ padding: '8px 4px' }}>Fabric Spec</th>
                      <th style={{ padding: '8px 4px' }}>CAD Cons</th>
                      <th style={{ padding: '8px 4px', textAlign: 'right' }}>Req (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 4px', fontWeight: 700 }}>Body</td>
                      <td style={{ padding: '8px 4px' }}>{currentJob.fabric?.fabricType || 'Single Jersey 160 GSM'}</td>
                      <td style={{ padding: '8px 4px' }}>2.14 kg/dz</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>{fmtNum(currentJob.fabric?.fabricReqKg || 2500)} kg</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 4px', fontWeight: 700 }}>Neck Rib</td>
                      <td style={{ padding: '8px 4px' }}>1x1 Cotton Lycra Rib 220 GSM</td>
                      <td style={{ padding: '8px 4px' }}>0.18 kg/dz</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>{fmtNum(Math.round((currentJob.fabric?.fabricReqKg || 2500) * 0.08))} kg</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Trims Section */}
            <Card title={
              <div>
                <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Trims & Accessories BOM Checklist</div>
                <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>Departmental task routing</span>
              </div>
            }>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#F8FAFC', borderRadius: 6 }}>
                  <div>
                    <strong style={{ fontSize: '12px', color: '#0F274E' }}>Sewing Thread (IE Department)</strong>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Consumption calculated from seam length</div>
                  </div>
                  <Badge tone={bomIeThreadStatus === 'ISSUED' ? 'done' : 'mid'}>
                    {bomIeThreadStatus === 'ISSUED' ? 'IE Issued' : 'Pending IE'}
                  </Badge>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#F8FAFC', borderRadius: 6 }}>
                  <div>
                    <strong style={{ fontSize: '12px', color: '#0F274E' }}>Technical & Special Trims</strong>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Drawcord, aglet, eyelet, zipper validation</div>
                  </div>
                  <Badge tone={bomTechLaceStatus === 'CONFIRMED' ? 'done' : 'mid'}>
                    {bomTechLaceStatus === 'CONFIRMED' ? 'Technical OK' : 'Pending Tech'}
                  </Badge>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#F8FAFC', borderRadius: 6 }}>
                  <div>
                    <strong style={{ fontSize: '12px', color: '#0F274E' }}>Packaging Materials</strong>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Polybag, master carton, barcode stickers</div>
                  </div>
                  <Badge tone="done">Merchandiser Confirmed</Badge>
                </div>

                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="primary"
                    disabled={bomSubmittedToPlanning}
                    onClick={() => {
                      setBomSubmittedToPlanning(true);
                      showToast('BOM submitted to Central Planning for production release!');
                    }}
                  >
                    <FileCheck size={14} style={{ marginRight: 6 }} />
                    {bomSubmittedToPlanning ? 'BOM Submitted to Planning' : 'Submit BOM for Planning Approval'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ===================================================================== TAB 4: FABRIC ORDER SHEET */}
      {activeTab === 'fabric-sheet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E' }}>Order Sheet Job:</span>
              <select
                value={selectedJobNo}
                onChange={(e) => setSelectedJobNo(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600 }}
              >
                {masterJobs.slice(0, 50).map(j => (
                  <option key={j.jobNo} value={j.jobNo}>Job #{j.jobNo} · {j.buyer} · {j.styleNo}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                <Printer size={13} style={{ marginRight: 4 }} />
                Print Order Sheet
              </Button>
            </div>
          </div>

          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Fabric Booking Order Sheet — Job #{currentJob.jobNo}</div>
              <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>{currentJob.buyer} · Style: {currentJob.styleNo} · {fmtNum(currentJob.orderQty)} pcs</span>
            </div>
          }>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '10px 8px' }}>Garment Part</th>
                    <th style={{ padding: '10px 8px' }}>Fabric Type</th>
                    <th style={{ padding: '10px 8px' }}>GSM</th>
                    <th style={{ padding: '10px 8px' }}>Finish Dia</th>
                    <th style={{ padding: '10px 8px' }}>CAD Cons</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Booking (kg)</th>
                    <th style={{ padding: '10px 8px' }}>Dyeing Mill</th>
                    <th style={{ padding: '10px 8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fabricSheetLines.map((line, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 700 }}>{line.part}</td>
                      <td style={{ padding: '10px 8px' }}>{line.fabric}</td>
                      <td style={{ padding: '10px 8px' }}>{line.gsm}</td>
                      <td style={{ padding: '10px 8px' }}>{line.dia}</td>
                      <td style={{ padding: '10px 8px' }}>{line.cadCons} kg/dz</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#0284C7' }}>{fmtNum(line.bookingKg)} kg</td>
                      <td style={{ padding: '10px 8px' }}>{line.mill}</td>
                      <td style={{ padding: '10px 8px' }}><Badge tone="done">{line.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== TAB 5: TRIMS ORDERING */}
      {activeTab === 'trims-order' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E' }}>Trims for Job:</span>
              <select
                value={selectedJobNo}
                onChange={(e) => setSelectedJobNo(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600 }}
              >
                {masterJobs.slice(0, 50).map(j => (
                  <option key={j.jobNo} value={j.jobNo}>Job #{j.jobNo} · {j.buyer} · {j.styleNo}</option>
                ))}
              </select>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => showToast('Trims procurement order updates saved successfully!')}
            >
              <Save size={13} style={{ marginRight: 4 }} />
              Save Trims Orders
            </Button>
          </div>

          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Trims Purchase & Delivery Follow-up</div>
              <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>Expand item to update supplier progress and in-house target dates</span>
            </div>
          }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {trimsItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '12px 14px',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <strong style={{ fontSize: '12px', color: '#0F274E', display: 'block' }}>{item.name}</strong>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Supplier: {item.supplier}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Order Qty</span>
                      <strong style={{ fontSize: '12px', color: '#0F274E' }}>{fmtNum(item.orderQty)}</strong>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>In-House Target</span>
                      <strong style={{ fontSize: '12px', color: '#0F274E' }}>{item.inHouseDate}</strong>
                    </div>

                    <Badge tone={item.status === 'In-house' ? 'done' : 'info'}>
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== TAB 6: FOLLOW-UP */}
      {activeTab === 'follow-up' && (
        <Card title={
          <div>
            <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Merchandiser Milestone Follow-up Matrix</div>
            <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>Lab Dip, Fabric, Trims, PP Meeting & Shipment Ex-Factory Tracking</span>
          </div>
        }>
          <DataGrid
            rows={masterJobs}
            columns={followUpColumns}
            rowKey={(j) => String(j.id || j.jobNo)}
            frozenColumns={1}
            storageKey="merchandiser-followup-grid"
            exportName="merchandising-milestone-followup"
          />
        </Card>
      )}
    </Shell>
  );
}
