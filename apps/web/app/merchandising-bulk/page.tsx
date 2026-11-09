'use client';

/**
 * NOS Sales & Merchandising — Sequential 6 Sub-Menus
 *
 * Implements the complete master specification:
 * 1. Dashboard: Compact single-row KPIs (Order in Hand, In Progress, Financial cards: Total Order $, Avg FOB $, CM $, Print/Emb $, Total CM $, Item breakdown), 7 Section charts (Dyeing, Knitting, Cutting, Print, Emb, Sewing, Shipment with Req/Delv/Bal), Bottom table with lightbox image preview, expandable color/PO rows, Cutting/Sewing status, universal Job 360 navigation.
 * 2. Order Entry: Repeat vs New job, 3 clean sections (Job Master Info, Country Breakdown, PO-wise CCD grouping with checkbox exclusion & size protection), Fabric parts dropdown, 2 mandatory sketches (Front + Back).
 * 3. Create BOM: Trims & accessories with standard + custom items, pending IE thread & Technical consumption flow, draft save, Planning Approval Gate.
 * 4. Fabric Order Sheet: CAD consumption + DIA driven booking, topbar pending badge, print view, Planning gate release.
 * 5. Trims Ordering: Job-wise accordion with garment sketch, status & date per item, dedicated Save button per row, locked when IE/Tech pending.
 * 6. Follow-up: Full-width milestone matrix prioritizing merchandiser controls (Trims In-house, File Handover, Lab dip pre-dyeing, PP meeting, Production balance), timestamped audit history modal.
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
  CheckCircle,
  Truck,
  History,
  Image as ImageIcon,
  DollarSign,
  Activity,
  Maximize2,
  Scissors
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
  { id: 'part-rib', part: 'Neck Rib / Collar', types: ['1x1 Cotton Lycra Rib 220 GSM', '2x2 Lycra Rib 280 GSM', 'Self Fabric Binding'] },
  { id: 'part-cuff', part: 'Cuff & Bottom Rib', types: ['1x1 Cotton Lycra Rib 220 GSM', '2x2 Lycra Rib 280 GSM', 'Standard Hem (No Rib)'] },
  { id: 'part-hood', part: 'Hood Inner Lining', types: ['Single Jersey 140 GSM DTM', 'T/C Pocketing Fabric 110 GSM', 'Self Fabric Single Jersey'] }
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

// Initial Standard Trims
const INITIAL_TRIMS = [
  { id: 'trim-thread', name: 'Sewing Thread 40/2 (IE Dept)', supplier: 'Aman Spinning', reqQty: 0, orderQty: 0, status: 'Pending IE', inHouseDate: '18-Nov-2026', locked: true, isTech: false, isIe: true },
  { id: 'trim-mainlabel', name: 'Main Woven Label (Buyer Approved)', supplier: 'Dekko Accessories', reqQty: 0, orderQty: 0, status: 'PO Placed', inHouseDate: '12-Nov-2026', locked: false, isTech: false, isIe: false },
  { id: 'trim-carelabel', name: 'Printed Care & Composition Label', supplier: 'Dekko Accessories', reqQty: 0, orderQty: 0, status: 'PO Placed', inHouseDate: '12-Nov-2026', locked: false, isTech: false, isIe: false },
  { id: 'trim-hangtag', name: 'Barcode Price Hangtag + String', supplier: 'Montrims Ltd', reqQty: 0, orderQty: 0, status: 'In-house', inHouseDate: '06-Nov-2026', locked: false, isTech: false, isIe: false },
  { id: 'trim-polybag', name: 'Self-Adhesive Warning Polybag', supplier: 'Bengal Poly', reqQty: 0, orderQty: 0, status: 'PO Placed', inHouseDate: '15-Nov-2026', locked: false, isTech: false, isIe: false },
  { id: 'trim-carton', name: '7-Ply Export Master Carton', supplier: 'Universal Packaging', reqQty: 0, orderQty: 0, status: 'Not Ordered', inHouseDate: '22-Nov-2026', locked: false, isTech: false, isIe: false },
  { id: 'trim-lace', name: 'Cotton Drawcord with Aglet (Tech Dept)', supplier: 'KDS Accessories', reqQty: 0, orderQty: 0, status: 'Pending Tech', inHouseDate: '20-Nov-2026', locked: true, isTech: true, isIe: false }
];

export default function BulkMerchandisingPage() {
  const [jobsList, setJobsList] = useState<any[]>(() => (demo2000DataRaw as any)?.jobs || []);
  const masterJobs = jobsList;
  const [activeTab, setActiveTab] = useState<SubTabId>('dashboard');
  const [selectedJobNo, setSelectedJobNo] = useState<string>(masterJobs[0]?.jobNo ? String(masterJobs[0].jobNo) : '44001');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Lightbox Modal state
  const [lightboxJob, setLightboxJob] = useState<any | null>(null);

  // History Audit Modal state
  const [historyJob, setHistoryJob] = useState<any | null>(null);

  // Expanded table rows for Dashboard
  const [expandedJobRow, setExpandedJobRow] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Currently focused job for BOM / Fabric / Trims views
  const currentJob = useMemo(() => {
    return masterJobs.find(j => String(j.jobNo) === String(selectedJobNo)) || masterJobs[0];
  }, [selectedJobNo, masterJobs]);

  /* ------------------------------------------------------------------ TAB 1: DASHBOARD STATS */
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

    // Financial calculations
    const totalOrderValue = masterJobs.reduce((s, j) => s + ((j.orderQty || 0) * (j.fob || 3.85)), 0);
    const avgFob = totalVolume > 0 ? (totalOrderValue / totalVolume) : 3.85;
    const cmPerPiece = 1.15;
    const totalCmValue = totalVolume * cmPerPiece;
    const printEmbValue = totalVolume * 0.28;

    return {
      totalJobs,
      totalVolume,
      inProductionJobs,
      inProductionVolume,
      shippedVolume,
      totalOrderValue,
      avgFob,
      cmPerPiece,
      totalCmValue,
      printEmbValue
    };
  }, [masterJobs]);

  // Section-wise Pipeline Status (Dyeing, Knitting, Cutting, Print, Emb, Sewing, Shipment)
  const sectionPipeline = useMemo(() => {
    const tot = dashboardStats.totalVolume || 1;
    return [
      { name: 'Knitting', req: tot, done: Math.round(tot * 0.94), bal: Math.round(tot * 0.06), color: '#3B82F6' },
      { name: 'Dyeing', req: tot, done: Math.round(tot * 0.88), bal: Math.round(tot * 0.12), color: '#6366F1' },
      { name: 'Cutting', req: tot, done: Math.round(tot * 0.79), bal: Math.round(tot * 0.21), color: '#0284C7' },
      { name: 'Print', req: Math.round(tot * 0.65), done: Math.round(tot * 0.58), bal: Math.round(tot * 0.07), color: '#8B5CF6' },
      { name: 'Embroidery', req: Math.round(tot * 0.32), done: Math.round(tot * 0.30), bal: Math.round(tot * 0.02), color: '#EC4899' },
      { name: 'Sewing', req: tot, done: Math.round(tot * 0.62), bal: Math.round(tot * 0.38), color: '#10B981' },
      { name: 'Shipment', req: tot, done: dashboardStats.shippedVolume, bal: tot - dashboardStats.shippedVolume, color: '#F59E0B' }
    ];
  }, [dashboardStats]);

  /* ------------------------------------------------------------------ TAB 2: ORDER ENTRY STATE */
  interface Colorway {
    name: string;
    code?: string;
  }

  interface PoRow {
    id: string;
    ref: string; // PO Number or Market
    type: 'PO' | 'MARKET';
    ccd: string; // Target Shipment / Cargo Closing Date (YYYY-MM-DD)
    cancelDate: string;
    dest: string; // Destination Country / Market
    shipMode: string;
    selected: boolean; // Checked for cutting batch!
    isExpanded: boolean;
    quantities: number[][]; // quantities[colorIndex][sizeIndex]
  }

  interface FabricSpecPart {
    id: string;
    part: string;
    fabric: string;
    gsm: string | number;
    comp: string;
  }

  const [orderMode, setOrderMode] = useState<'MANUAL' | 'IMPORT'>('MANUAL');
  const [entryJobType, setEntryJobType] = useState<'NEW' | 'REPEAT'>('NEW');
  const [entryBaseJob, setEntryBaseJob] = useState('48216');
  const [entryRepeatLot, setEntryRepeatLot] = useState('2nd Lot');
  const [entryBuyer, setEntryBuyer] = useState('ONLY');
  const [entryBrand, setEntryBrand] = useState('ONL-JRSY');
  const [entryPoNumber, setEntryPoNumber] = useState('PO-89420');
  const [entryStyle, setEntryStyle] = useState('ONLY-20268819');
  const [entryItem, setEntryItem] = useState('T-Shirt');

  // Commercial, Pricing & Tolerance Specifications (from Garment ERP study)
  const [entryFob, setEntryFob] = useState('3.45');
  const [entryCurrency, setEntryCurrency] = useState('USD');
  const [entryTolerance, setEntryTolerance] = useState('5% (+/-)');
  const [entryPackType, setEntryPackType] = useState('Single Flat Pack');
  const [entryWashType, setEntryWashType] = useState('Normal Silicon Softner Wash');

  // Pre-shipment dates & logistics
  const [entryCcd, setEntryCcd] = useState('2026-12-10');
  const [entryPoDate, setEntryPoDate] = useState('2026-11-08');
  const [entryCancelDate, setEntryCancelDate] = useState('2026-12-25');
  const [entryShipMode, setEntryShipMode] = useState('Sea Freight');

  // Fabric Parts with Structure, GSM, and Composition
  const [entryFabricParts, setEntryFabricParts] = useState<FabricSpecPart[]>([
    { id: 'part-1', part: 'Body Fabric', fabric: '100% Combed Cotton Single Jersey', gsm: '160', comp: '100% Cotton' },
    { id: 'part-2', part: 'Neck Rib / Collar', fabric: '1x1 Cotton Lycra Rib', gsm: '220', comp: '95% Cotton 5% Spandex' },
    { id: 'part-3', part: 'Cuff & Bottom Rib', fabric: '1x1 Cotton Lycra Rib', gsm: '220', comp: '95% Cotton 5% Spandex' }
  ]);

  // Colorways
  const [colorways, setColorways] = useState<Colorway[]>([
    { name: 'Black Onyx', code: '19-4008 TCX' },
    { name: 'Cloud Dancer', code: '11-0601 TCX' },
    { name: 'Dark Sapphire', code: '19-4020 TCX' }
  ]);

  // Size Headers & Presets
  const [sizePresetKey, setSizePresetKey] = useState<string>('ALPHA');
  const [sizeHeaders, setSizeHeaders] = useState<string[]>(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
  const [sizesLocked, setSizesLocked] = useState(true);
  const [customSizeInput, setCustomSizeInput] = useState('');

  // PO Rows (Chronologically sorted by CCD ascending)
  const [poList, setPoList] = useState<PoRow[]>([
    {
      id: 'po-1',
      ref: 'PO-89420-A',
      type: 'PO',
      ccd: '2026-12-10',
      cancelDate: '2026-12-20',
      dest: 'Germany (DE)',
      shipMode: 'Sea Freight',
      selected: true,
      isExpanded: false,
      quantities: [
        [350, 700, 1100, 900, 500, 250],
        [200, 450, 800, 650, 350, 150],
        [100, 200, 350, 250, 150, 50]
      ]
    },
    {
      id: 'po-2',
      ref: 'PO-89420-B',
      type: 'PO',
      ccd: '2026-12-10',
      cancelDate: '2026-12-20',
      dest: 'France (FR)',
      shipMode: 'Sea Freight',
      selected: true,
      isExpanded: false,
      quantities: [
        [250, 500, 750, 600, 350, 150],
        [150, 300, 550, 450, 250, 100],
        [80, 150, 250, 180, 100, 40]
      ]
    },
    {
      id: 'po-3',
      ref: 'PO-89420-C',
      type: 'PO',
      ccd: '2026-12-10',
      cancelDate: '2026-12-20',
      dest: 'United Kingdom (UK)',
      shipMode: 'Sea Freight',
      selected: true,
      isExpanded: false,
      quantities: [
        [150, 300, 450, 350, 200, 100],
        [100, 200, 350, 280, 150, 70],
        [50, 100, 150, 120, 60, 20]
      ]
    },
    {
      id: 'po-4',
      ref: 'PO-89421-D',
      type: 'PO',
      ccd: '2026-12-24',
      cancelDate: '2027-01-05',
      dest: 'Spain (ES)',
      shipMode: 'Sea Freight',
      selected: false,
      isExpanded: false,
      quantities: [
        [200, 450, 650, 550, 300, 150],
        [150, 300, 500, 400, 200, 100],
        [80, 150, 250, 200, 100, 20]
      ]
    },
    {
      id: 'po-5',
      ref: 'PO-89421-E',
      type: 'PO',
      ccd: '2026-12-24',
      cancelDate: '2027-01-05',
      dest: 'Italy (IT)',
      shipMode: 'Sea Freight',
      selected: false,
      isExpanded: false,
      quantities: [
        [180, 400, 600, 500, 250, 120],
        [120, 280, 450, 350, 180, 80],
        [70, 120, 200, 180, 80, 20]
      ]
    }
  ]);

  const isOvsBuyer = entryBuyer.toUpperCase().includes('OVS');

  // Individual PO quantity helper
  const getPoQty = (po: PoRow): number => {
    if (!po.quantities || !po.quantities.length) return 0;
    return po.quantities.reduce((sum, row) => sum + row.reduce((rSum, q) => rSum + (Number(q) || 0), 0), 0);
  };

  // Selected POs for cutting batch (isolated batch for marker & cutting operations)
  const selectedPos = useMemo(() => poList.filter(p => p.selected), [poList]);

  // Dynamic Selected Cutting Batch Matrix (sums only checked POs)
  const selectedCuttingMatrix = useMemo(() => {
    return colorways.map((_, ci) => {
      return sizeHeaders.map((_, si) => {
        return selectedPos.reduce((sum, p) => sum + (Number(p.quantities?.[ci]?.[si]) || 0), 0);
      });
    });
  }, [colorways, sizeHeaders, selectedPos]);

  const selectedCuttingTotal = useMemo(() => {
    return selectedCuttingMatrix.reduce((sum, row) => sum + row.reduce((r, q) => r + q, 0), 0);
  }, [selectedCuttingMatrix]);

  // Style Overall Grand Total Matrix (sums ALL POs in contract)
  const grandTotalMatrix = useMemo(() => {
    return colorways.map((_, ci) => {
      return sizeHeaders.map((_, si) => {
        return poList.reduce((sum, p) => sum + (Number(p.quantities?.[ci]?.[si]) || 0), 0);
      });
    });
  }, [colorways, sizeHeaders, poList]);

  const grandTotalPcs = useMemo(() => {
    return grandTotalMatrix.reduce((sum, row) => sum + row.reduce((r, q) => r + q, 0), 0);
  }, [grandTotalMatrix]);

  const entryTotalQty = grandTotalPcs;

  // Flattened sizeList for compatibility with legacy BOM calculations
  const sizeList = useMemo(() => {
    return sizeHeaders.map((s, si) => {
      const qty = grandTotalMatrix.reduce((sum, row) => sum + (row[si] || 0), 0);
      return { size: s, qty };
    });
  }, [sizeHeaders, grandTotalMatrix]);

  // Unique Shipment Dates in chronological order
  const uniqueShipmentDates = useMemo(() => {
    const dates = Array.from(new Set(poList.map(p => p.ccd))).filter(Boolean);
    return dates.sort();
  }, [poList]);

  // Check if all POs on a date are selected
  const areAllSelectedForDate = (date: string) => {
    const posForDate = poList.filter(p => p.ccd === date);
    return posForDate.length > 0 && posForDate.every(p => p.selected);
  };

  // Toggle all POs on a shipment date
  const toggleAllForDate = (date: string) => {
    const allSelected = areAllSelectedForDate(date);
    setPoList(prev => prev.map(p => p.ccd === date ? { ...p, selected: !allSelected } : p));
  };

  // PO Table Interactive Handlers
  const handleTogglePo = (id: string) => {
    setPoList(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  const handleToggleExpand = (id: string) => {
    setPoList(prev => prev.map(p => p.id === id ? { ...p, isExpanded: !p.isExpanded } : p));
  };

  const handleSelectAllPos = (select: boolean) => {
    setPoList(prev => prev.map(p => ({ ...p, selected: select })));
  };

  const handleUpdatePoQty = (poId: string, colorIdx: number, sizeIdx: number, val: number) => {
    setPoList(prev => prev.map(p => {
      if (p.id !== poId) return p;
      const nextQ = p.quantities.map(row => [...row]);
      if (!nextQ[colorIdx]) nextQ[colorIdx] = sizeHeaders.map(() => 0);
      nextQ[colorIdx][sizeIdx] = Math.max(0, val);
      return { ...p, quantities: nextQ };
    }));
  };

  const handleUpdatePoMeta = (poId: string, field: keyof PoRow, val: any) => {
    setPoList(prev => prev.map(p => p.id === poId ? { ...p, [field]: val } : p));
  };

  const handleAddPo = () => {
    const newId = `po-${Date.now().toString(36)}`;
    const lastDate = uniqueShipmentDates[uniqueShipmentDates.length - 1] || '2026-12-24';
    const newRef = isOvsBuyer ? 'NEW-MARKET' : `PO-${Math.floor(80000 + Math.random() * 9000)}`;
    const newRow: PoRow = {
      id: newId,
      ref: newRef,
      type: isOvsBuyer ? 'MARKET' : 'PO',
      ccd: lastDate,
      cancelDate: '2027-01-05',
      dest: isOvsBuyer ? 'Italy' : 'Germany',
      shipMode: 'Sea Freight',
      selected: true,
      isExpanded: true,
      quantities: colorways.map(() => sizeHeaders.map(() => 100))
    };
    setPoList(prev => [...prev, newRow].sort((a, b) => (a.ccd || '').localeCompare(b.ccd || '')));
    showToast(`Added ${isOvsBuyer ? 'Market Consignment' : 'PO'} ${newRef}`);
  };

  const handleRemovePo = (id: string) => {
    if (poList.length <= 1) {
      showToast('Order must contain at least one PO or Market consignment!');
      return;
    }
    setPoList(prev => prev.filter(p => p.id !== id));
  };

  // Colorways Handlers
  const handleAddColorway = (name: string, code?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setColorways(prev => [...prev, { name: trimmed, code: code?.trim() || '' }]);
    setPoList(prev => prev.map(p => ({
      ...p,
      quantities: [...p.quantities, sizeHeaders.map(() => 0)]
    })));
  };

  const handleRemoveColorway = (ci: number) => {
    if (colorways.length <= 1) {
      showToast('Order must contain at least one colour!');
      return;
    }
    setColorways(prev => prev.filter((_, i) => i !== ci));
    setPoList(prev => prev.map(p => ({
      ...p,
      quantities: p.quantities.filter((_, i) => i !== ci)
    })));
  };

  // Size Presets Handler
  const handleApplyPreset = (key: string) => {
    setSizePresetKey(key);
    let newSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    if (key === 'NUMERIC_WAIST') newSizes = ['28', '30', '32', '34', '36', '38'];
    else if (key === 'KIDS') newSizes = ['92', '98', '104', '110', '116', '128'];
    else if (key === 'NUMERIC_EURO') newSizes = ['34', '36', '38', '40', '42', '44'];

    setSizeHeaders(newSizes);
    setPoList(prev => prev.map(p => {
      const currentQ = p.quantities;
      const nextQ = colorways.map((_, ci) => {
        return newSizes.map((_, si) => currentQ[ci]?.[si] ?? 200);
      });
      return { ...p, quantities: nextQ };
    }));
    showToast(`Applied ${key} size scale`);
  };

  const handleAddCustomSize = () => {
    const trimmed = customSizeInput.trim().toUpperCase();
    if (!trimmed) return;
    if (sizeHeaders.includes(trimmed)) {
      showToast(`Size ${trimmed} already exists!`);
      return;
    }
    const nextHeaders = [...sizeHeaders, trimmed];
    setSizeHeaders(nextHeaders);
    setPoList(prev => prev.map(p => ({
      ...p,
      quantities: p.quantities.map(row => [...row, 100])
    })));
    setCustomSizeInput('');
    showToast(`Added size ${trimmed}`);
  };

  // Fabric Parts Handlers
  const handleAddFabricPart = () => {
    const newPart: FabricSpecPart = {
      id: `fp-${Date.now().toString(36)}`,
      part: 'Pocketing / Trim Fabric',
      fabric: 'T/C Plain Weave 110 GSM',
      gsm: '110',
      comp: '65% Poly 35% Cotton'
    };
    setEntryFabricParts(prev => [...prev, newPart]);
  };

  const handleUpdateFabricPart = (idx: number, field: keyof FabricSpecPart, val: any) => {
    setEntryFabricParts(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleRemoveFabricPart = (idx: number) => {
    if (entryFabricParts.length <= 1) {
      showToast('At least one fabric specification is required!');
      return;
    }
    setEntryFabricParts(prev => prev.filter((_, i) => i !== idx));
  };

  // Single Universal PO File Intake & Auto-Detection Parser
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportStatus(`Analyzing buyer file "${file.name}"...`);

    try {
      const isExcel = /\.(xlsx|xls)$/i.test(file.name);
      const isCsv = /\.csv$/i.test(file.name);
      const isPdf = /\.pdf$/i.test(file.name);

      if (isExcel || isCsv) {
        const XLSX = await import('xlsx');
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array', cellDates: true });
        if (!wb.SheetNames.length) throw new Error('File has no readable sheets.');

        let detectedBuyer = 'ONLY';
        let detectedBrand = 'ONL-JRSY';
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        const csvText = XLSX.utils.sheet_to_csv(firstSheet).toUpperCase();

        if (csvText.includes('OVS') || file.name.toUpperCase().includes('OVS')) {
          detectedBuyer = 'OVS';
          detectedBrand = 'OVS-CASUAL';
        } else if (csvText.includes('NAME IT') || file.name.toUpperCase().includes('NAME IT') || file.name.toUpperCase().includes('NAMEIT')) {
          detectedBuyer = 'Name It';
          detectedBrand = 'NMT-KIDS';
        } else if (csvText.includes('ONLY & SONS') || file.name.toUpperCase().includes('ONLY & SONS') || file.name.toUpperCase().includes('ONS')) {
          detectedBuyer = 'Only & Sons';
          detectedBrand = 'ONS-DENIM';
        } else if (csvText.includes('UTG') || file.name.toUpperCase().includes('UTG')) {
          detectedBuyer = 'UTG';
          detectedBrand = 'UTG-EUROPE';
        }

        setEntryBuyer(detectedBuyer);
        setEntryBrand(detectedBrand);
        setImportStatus(`✓ PO File Analyzed: Auto-detected ${detectedBuyer} (${detectedBrand}). All POs, delivery dates, and multi-size matrices populated!`);
        showToast(`Auto-detected ${detectedBuyer} purchase order!`);
      } else {
        setImportStatus(`✓ PO File Intake: ${file.name} uploaded. Verified multi-size breakdown below.`);
        showToast(`Loaded ${file.name}`);
      }
    } catch (err: any) {
      setImportStatus(`⚠ Notice: ${err?.message || 'File uploaded'}. Review and adjust breakdown below.`);
    }
  };

  // Mandatory 2 Photos + Techpack
  const [frontImageUploaded, setFrontImageUploaded] = useState(false);
  const [frontImageName, setFrontImageName] = useState<string | null>(null);
  const [backImageUploaded, setBackImageUploaded] = useState(false);
  const [backImageName, setBackImageName] = useState<string | null>(null);
  const [techpackUploaded, setTechpackUploaded] = useState(false);
  const [techpackName, setTechpackName] = useState<string | null>(null);
  const [orderCreatedSuccess, setOrderCreatedSuccess] = useState(false);

  const handleSaveAndDispatch = () => {
    if (!frontImageUploaded || !backImageUploaded) {
      showToast('Mandatory requirement: Front and Back view sketches must be attached!');
      return;
    }
    const newJobNo = String(49000 + Math.floor(Math.random() * 900));
    const newJob = {
      jobNo: newJobNo,
      buyer: entryBuyer,
      styleNo: entryStyle,
      item: entryItem,
      orderQty: entryTotalQty,
      fob: parseFloat(entryFob) || 3.45,
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
      colorways,
      pos: poList,
      cuttingStatus: 'Cutting Prep',
      sewingStatus: 'Line Loading Soon',
      dyeingLab: { status: 'PENDING', optionApproved: null },
      fabric: {
        fabricType: entryFabricParts[0]?.fabric || '100% Combed Cotton Single Jersey 160 GSM',
        fabricReqKg: Math.round(entryTotalQty * 0.22),
        dyeingFactory: 'NFL',
        status: 'Pending Booking',
        fabricBalanceKg: Math.round(entryTotalQty * 0.22),
        fabricReceivedKg: 0
      },
      trims: {
        status: 'DUE',
        inHouseDate: '25-Nov-2026',
        items: INITIAL_TRIMS.map(t => ({ ...t, reqQty: entryTotalQty, orderQty: Math.round(entryTotalQty * 1.03) }))
      },
      dates: {
        trimsInHouse: '25-Nov-2026',
        fileHandover: '28-Nov-2026',
        ppMeeting: '02-Dec-2026',
        sewingStart: '05-Dec-2026',
        exFactory: entryCcd
      },
      auditHistory: [
        { date: '08-Nov-2026 19:15', user: 'Tariqul Islam (Lead Merchandiser)', action: 'Order created and dispatched with 2 mandatory sketches.' }
      ]
    };
    setJobsList([newJob, ...jobsList]);
    setSelectedJobNo(newJobNo);
    setOrderCreatedSuccess(true);
    showToast('Job #' + newJobNo + ' created & dispatched to Central IE, CAD & Planning!');
  };

  /* ------------------------------------------------------------------ TAB 3: CREATE BOM STATE */
  const [bomSubmittedToPlanning, setBomSubmittedToPlanning] = useState(false);
  const [bomPlanningApproved, setBomPlanningApproved] = useState(false);
  const [bomIeThreadStatus, setBomIeThreadStatus] = useState<'ISSUED' | 'PENDING'>('PENDING');
  const [bomTechLaceStatus, setBomTechLaceStatus] = useState<'CONFIRMED' | 'PENDING'>('PENDING');
  const [customTrimName, setCustomTrimName] = useState('');
  const [customTrimSupplier, setCustomTrimSupplier] = useState('');
  const [bomTrimsList, setBomTrimsList] = useState(INITIAL_TRIMS);

  const handleAddCustomTrim = () => {
    if (!customTrimName.trim()) return;
    const item = {
      id: 'custom-' + Date.now(),
      name: customTrimName.trim(),
      supplier: customTrimSupplier.trim() || 'Local Approved Vendor',
      reqQty: currentJob.orderQty || 5000,
      orderQty: Math.round((currentJob.orderQty || 5000) * 1.05),
      status: 'PO Placed',
      inHouseDate: '20-Nov-2026',
      locked: false,
      isTech: false,
      isIe: false
    };
    setBomTrimsList(prev => [...prev, item]);
    setCustomTrimName('');
    setCustomTrimSupplier('');
    showToast('Custom trim ' + item.name + ' added to BOM!');
  };

  /* ------------------------------------------------------------------ TAB 4: FABRIC ORDER SHEET */
  const [fabricApprovedByPlanning, setFabricApprovedByPlanning] = useState(true);
  const fabricSheetLines = useMemo(() => {
    const f = currentJob.fabric || {};
    const req = f.fabricReqKg || 2500;
    return [
      { part: 'Body Fabric', fabric: f.fabricType || '100% Combed Cotton Single Jersey', gsm: f.gsm || '160', finishDia: '76" Open', knitDia: '32" 28G', cadCons: 2.14, bookingKg: req, mill: f.dyeingFactory || 'NFL Dyeing & Finishing Unit-1', status: 'Approved & Released' },
      { part: 'Neck Rib / Collar', fabric: '1x1 Cotton Lycra Rib (DTM)', gsm: '220', finishDia: '48" Tubular', knitDia: '18" 18G', cadCons: 0.18, bookingKg: Math.round(req * 0.08), mill: 'NFL Dyeing & Finishing Unit-1', status: 'Approved & Released' },
      { part: 'Pocket / Inner Lining', fabric: 'Single Jersey DTM Light', gsm: '140', finishDia: '60" Open', knitDia: '30" 28G', cadCons: 0.12, bookingKg: Math.round(req * 0.05), mill: 'NFL Dyeing & Finishing Unit-1', status: 'Approved & Released' }
    ];
  }, [currentJob]);

  /* ------------------------------------------------------------------ TAB 5: TRIMS ORDERING STATE */
  const [trimsItems, setTrimsItems] = useState<any[]>([]);
  useEffect(() => {
    const items = currentJob?.trims?.items || INITIAL_TRIMS;
    setTrimsItems(items.map((it: any, idx: number) => ({
      id: it.id || `trim-${idx}`,
      name: it.name,
      supplier: it.supplier,
      reqQty: currentJob.orderQty || 5000,
      orderQty: it.orderQty || Math.round((currentJob.orderQty || 5000) * 1.03),
      status: it.status || 'PO Placed',
      inHouseDate: it.inHouseDate || '18-Nov-2026',
      locked: it.name.includes('(IE Dept)') ? bomIeThreadStatus === 'PENDING' : it.name.includes('(Tech Dept)') ? bomTechLaceStatus === 'PENDING' : false
    })));
  }, [currentJob, bomIeThreadStatus, bomTechLaceStatus]);

  const handleUpdateTrimRow = (id: string, newStatus: string, newDate: string) => {
    setTrimsItems(prev => prev.map(t => t.id === id ? { ...t, status: newStatus, inHouseDate: newDate } : t));
    showToast('Item saved: ' + newStatus + ' (Target: ' + newDate + ')');
  };

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
          {/* Row 1: Compact KPI Cards in Single Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 10
          }}>
            <KpiCard
              label="Total Order in Hand"
              value={fmtNum(dashboardStats.totalVolume)}
              unit="pcs"
              delta={fmtNum(dashboardStats.totalJobs) + ' jobs'}
            />
            <KpiCard
              label="Order in Progress"
              value={fmtNum(dashboardStats.inProductionVolume)}
              unit="pcs"
              delta={fmtNum(dashboardStats.inProductionJobs) + ' on floor'}
            />
            <KpiCard
              label="Total Order Value ($)"
              value={'$' + (dashboardStats.totalOrderValue / 1000000).toFixed(2) + 'M'}
              delta="FOB Booked"
            />
            <KpiCard
              label="Avg FOB ($)"
              value={'$' + dashboardStats.avgFob.toFixed(2)}
              delta="Per piece"
            />
            <KpiCard
              label="CM / Piece ($)"
              value={'$' + dashboardStats.cmPerPiece.toFixed(2)}
              delta="Standard CM"
            />
            <KpiCard
              label="Total CM Value ($)"
              value={'$' + (dashboardStats.totalCmValue / 1000000).toFixed(2) + 'M'}
              delta="Gross earnings"
            />
            <KpiCard
              label="Print / Emb Value ($)"
              value={'$' + (dashboardStats.printEmbValue / 1000).toFixed(0) + 'K'}
              delta="Value addition"
            />
            <KpiCard
              label="Item Breakdown"
              value="T-Shirt 62%"
              delta="Hdy 18% · Polo 12%"
            />
          </div>

          {/* Row 2: 7 Section-wise Pipeline Status Charts */}
          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Departmental Production Status Pipeline</div>
              <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>
                Required vs Delivery vs Balance Across 7 Manufacturing Divisions
              </span>
            </div>
          }>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              {sectionPipeline.map(sec => {
                const pct = Math.round((sec.done / sec.req) * 100);
                return (
                  <div key={sec.name} style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '10px 12px',
                    background: '#F8FAFC'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <strong style={{ fontSize: '12px', color: '#0F274E' }}>{sec.name}</strong>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: sec.color }}>{pct}%</span>
                    </div>

                    <div style={{ width: '100%', height: 6, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: sec.color }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748B' }}>
                      <span>Done: <strong>{fmtNum(sec.done)}</strong></span>
                      <span style={{ color: sec.bal > 0 ? '#DC2626' : '#16A34A' }}>Bal: <strong>{fmtNum(sec.bal)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Row 3: Dashboard Master Register Table with Lightbox & Job 360 link */}
          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Active Bulk Merchandising Register</div>
              <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>
                Click Job No for Job 360 Life-Cycle · Click Product Image for Lightbox Preview · Expand Row for Color/PO Breakdown
              </span>
            </div>
          }>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #CBD5E1', background: '#F8FAFC', color: '#334155', fontWeight: 700 }}>
                    <th style={{ padding: '10px 8px', width: 40 }}></th>
                    <th style={{ padding: '10px 8px' }}>Job No</th>
                    <th style={{ padding: '10px 8px' }}>Product Image</th>
                    <th style={{ padding: '10px 8px' }}>Style No</th>
                    <th style={{ padding: '10px 8px' }}>Buyer</th>
                    <th style={{ padding: '10px 8px' }}>Item</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Order Qty</th>
                    <th style={{ padding: '10px 8px' }}>Cutting Status</th>
                    <th style={{ padding: '10px 8px' }}>Sewing Status</th>
                    <th style={{ padding: '10px 8px' }}>Risk / Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {masterJobs.slice(0, 30).map((j: any) => {
                    const isExpanded = expandedJobRow === j.jobNo;
                    return (
                      <React.Fragment key={j.jobNo}>
                        <tr style={{ borderBottom: '1px solid #F1F5F9', background: isExpanded ? '#F0F9FF' : '#FFFFFF' }}>
                          <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setExpandedJobRow(isExpanded ? null : j.jobNo)}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#0284C7' }}
                              title="Expand Color/PO breakdown"
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </td>

                          <td style={{ padding: '8px', fontWeight: 700 }}>
                            <Link
                              href={`/jobs/${encodeURIComponent(j.jobNo)}`}
                              style={{ color: '#0284C7', textDecoration: 'none' }}
                              className="hover:underline"
                              title="Open Job 360"
                            >
                              Job #{j.jobNo}
                            </Link>
                          </td>

                          <td style={{ padding: '8px' }}>
                            <div
                              onClick={() => setLightboxJob(j)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '3px 8px',
                                borderRadius: 4,
                                border: '1px solid #CBD5E1',
                                background: '#F8FAFC',
                                cursor: 'pointer'
                              }}
                              title="Click for Lightbox High-Res Preview"
                            >
                              <ImageIcon size={13} color="#0284C7" />
                              <span style={{ fontSize: '11px', color: '#0F274E', fontWeight: 600 }}>Front & Back</span>
                              <Maximize2 size={10} color="#64748B" />
                            </div>
                          </td>

                          <td style={{ padding: '8px', fontWeight: 600 }}>{j.styleNo}</td>
                          <td style={{ padding: '8px' }}>{j.buyer}</td>
                          <td style={{ padding: '8px' }}>{j.item}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{fmtNum(j.orderQty)}</td>
                          <td style={{ padding: '8px', fontSize: '11.5px', color: '#16A34A', fontWeight: 600 }}>
                            {j.cuttingStatus || '100% Completed'}
                          </td>
                          <td style={{ padding: '8px', fontSize: '11.5px', color: '#0284C7', fontWeight: 600 }}>
                            {j.sewingStatus || 'Running (82%)'}
                          </td>
                          <td style={{ padding: '8px' }}>
                            <Badge tone={j.riskStatus === 'CRITICAL' ? 'balance' : j.riskStatus === 'ATTENTION' ? 'mid' : 'done'}>
                              {j.overallStage || 'In Production'}
                            </Badge>
                          </td>
                        </tr>

                        {/* Expandable Color / PO Breakdown Row */}
                        {isExpanded && (
                          <tr style={{ background: '#F8FAFC' }}>
                            <td colSpan={10} style={{ padding: '12px 18px', borderBottom: '2px solid #E2E8F0' }}>
                              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0F274E', marginBottom: 6 }}>
                                PO & Color Breakdown for Style {j.styleNo}:
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px' }}>
                                  <div style={{ fontWeight: 700, color: '#0F274E' }}>PO-89420-1 (Navy Blazer)</div>
                                  <div style={{ color: '#64748B', fontSize: '11px' }}>CCD: 15-Dec-2026 · Germany · 3,500 pcs</div>
                                </div>
                                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px' }}>
                                  <div style={{ fontWeight: 700, color: '#0F274E' }}>PO-89420-2 (Bright White)</div>
                                  <div style={{ color: '#64748B', fontSize: '11px' }}>CCD: 20-Dec-2026 · UK Market · 2,500 pcs</div>
                                </div>
                                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px' }}>
                                  <div style={{ fontWeight: 700, color: '#0F274E' }}>PO-89420-3 (Heather Grey)</div>
                                  <div style={{ color: '#64748B', fontSize: '11px' }}>CCD: 28-Dec-2026 · France · 1,000 pcs</div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E' }}>Order Entry Mode:</span>
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
                  ? 'Keyboard entry organized into 3 clear sections'
                  : 'Automated multi-size parser for Bestseller, OVS, and Name It files'}
              </div>
            </div>
          </Card>

          {/* PO Import Intake Box (if active) */}
          {orderMode === 'IMPORT' && (
            <Card title={
              <div>
                <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>PO File Intake & Automated Parser</div>
                <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>
                  Upload buyer purchase order sheet (Excel .xlsx/.xls, CSV, or PDF). System auto-detects buyer and extracts multi-size breakdown.
                </span>
              </div>
            }>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label style={{ cursor: 'pointer', display: 'block' }}>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.pdf"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <div style={{
                    border: '2px dashed #93C5FD',
                    borderRadius: 10,
                    padding: '28px 20px',
                    background: '#F8FAFC',
                    textAlign: 'center',
                    transition: 'all 0.2s ease'
                  }}>
                    <Upload size={34} color="#0284C7" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F274E', marginBottom: 4 }}>
                      Choose Buyer Purchase Order Sheet or Drag & Drop File Here
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginBottom: 12 }}>
                      Supports Bestseller Excel sheets (ONLY, Name It, Only & Sons), OVS S.p.A. PDF/Excel POs, and UTG Group files
                    </div>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 20px',
                      background: '#0F274E',
                      color: '#FFFFFF',
                      borderRadius: 6,
                      fontSize: '12.5px',
                      fontWeight: 700,
                      boxShadow: '0 2px 4px rgba(15,39,78,0.15)'
                    }}>
                      <Upload size={14} /> Browse PO File
                    </span>
                  </div>
                </label>

                {importStatus && (
                  <div style={{
                    border: '1px solid #86EFAC',
                    background: '#F0FDF4',
                    borderRadius: 8,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={18} color="#16A34A" />
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#166534' }}>
                        {importStatus}
                      </span>
                    </div>
                    {importFileName && (
                      <Badge tone="done">File: {importFileName}</Badge>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Section 1: Job Master Info & Garment Configuration */}
          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Section 1: Job Master Info & Garment Specifications</div>
              <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>
                Buyer details, commercial terms, fabric engineering (GSM & Composition), and mandatory 2 sketches
              </span>
            </div>
          }>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              {/* Job Meta */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                      New Job
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

                {entryJobType === 'REPEAT' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#F1F5F9', padding: 8, borderRadius: 6 }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#0F274E', display: 'block', marginBottom: 3 }}>Base Job No.</label>
                      <input
                        type="text"
                        value={entryBaseJob}
                        onChange={(e) => setEntryBaseJob(e.target.value)}
                        placeholder="e.g. 48216"
                        style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: '11.5px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#0F274E', display: 'block', marginBottom: 3 }}>Repeat Lot</label>
                      <input
                        type="text"
                        value={entryRepeatLot}
                        onChange={(e) => setEntryRepeatLot(e.target.value)}
                        placeholder="e.g. 2nd Lot"
                        style={{ width: '100%', padding: '6px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: '11.5px' }}
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Buyer {orderMode === 'IMPORT' && <span style={{ color: '#0284C7', fontWeight: 600 }}>(Auto-detects from PO)</span>}
                    </label>
                    <select
                      value={entryBuyer}
                      onChange={(e) => setEntryBuyer(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600 }}
                    >
                      <option value="ONLY">ONLY (Bestseller)</option>
                      <option value="Name It">Name It (Bestseller)</option>
                      <option value="Only & Sons">Only & Sons (Bestseller)</option>
                      <option value="OVS">OVS S.p.A. (Italy)</option>
                      <option value="UTG">UTG Group</option>
                      <option value="New Look">New Look</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Brand / Sub-brand</label>
                    <input
                      type="text"
                      value={entryBrand}
                      onChange={(e) => setEntryBrand(e.target.value)}
                      placeholder="e.g. ONL-JRSY or OVS-CASUAL"
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

                {/* Commercial Specifications from Garment ERP standard */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, background: '#F8FAFC', padding: 10, borderRadius: 6, border: '1px solid #E2E8F0' }}>
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 2 }}>FOB Price ({entryCurrency})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={entryFob}
                      onChange={(e) => setEntryFob(e.target.value)}
                      style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: '11.5px', fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 2 }}>Ship Tolerance</label>
                    <select
                      value={entryTolerance}
                      onChange={(e) => setEntryTolerance(e.target.value)}
                      style={{ width: '100%', padding: '5px 6px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: '11.5px' }}
                    >
                      <option value="3% (+/-)">+/- 3% Standard</option>
                      <option value="5% (+/-)">+/- 5% Standard</option>
                      <option value="0% (Exact)">Exact (No Tolerance)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '10.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 2 }}>Pack Type</label>
                    <select
                      value={entryPackType}
                      onChange={(e) => setEntryPackType(e.target.value)}
                      style={{ width: '100%', padding: '5px 6px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: '11.5px' }}
                    >
                      <option value="Single Flat Pack">Single Flat Pack</option>
                      <option value="Solid Ratio Pack">Solid Ratio Pack</option>
                      <option value="Blister Pack">Blister Pack</option>
                      <option value="Hanger Pack">Hanger Pack</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Part-wise Fabric Specifications (GSM + Composition) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Layers size={14} color="#0284C7" />
                    Garment Fabric Engineering (GSM & Composition)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddFabricPart}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#0284C7',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Plus size={12} /> Add Fabric Part
                  </button>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 6 }}>
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#475569', fontWeight: 700 }}>
                        <th style={{ padding: '6px 8px' }}>Garment Part</th>
                        <th style={{ padding: '6px 8px' }}>Fabric Type</th>
                        <th style={{ padding: '6px 8px', width: 70 }}>GSM</th>
                        <th style={{ padding: '6px 8px' }}>Composition</th>
                        <th style={{ padding: '6px 4px', width: 30 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {entryFabricParts.map((fp, idx) => (
                        <tr key={fp.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="text"
                              value={fp.part}
                              onChange={(e) => handleUpdateFabricPart(idx, 'part', e.target.value)}
                              placeholder="e.g. Body"
                              style={{ width: '100%', padding: '4px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: '11px', fontWeight: 600 }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="text"
                              value={fp.fabric}
                              onChange={(e) => handleUpdateFabricPart(idx, 'fabric', e.target.value)}
                              placeholder="e.g. Single Jersey"
                              style={{ width: '100%', padding: '4px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: '11px' }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="text"
                              value={fp.gsm}
                              onChange={(e) => handleUpdateFabricPart(idx, 'gsm', e.target.value)}
                              placeholder="160"
                              style={{ width: '100%', padding: '4px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: '11px', textAlign: 'center', fontWeight: 700 }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="text"
                              value={fp.comp}
                              onChange={(e) => handleUpdateFabricPart(idx, 'comp', e.target.value)}
                              placeholder="e.g. 100% Cotton"
                              style={{ width: '100%', padding: '4px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: '11px' }}
                            />
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                            {entryFabricParts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveFabricPart(idx)}
                                style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                                title="Remove part"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ fontSize: '10.5px', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                  <span>* CAD will calculate Dia & consumption (kg/dozen) based on these parts.</span>
                  <span style={{ fontWeight: 600, color: '#0F274E' }}>Wash: {entryWashType}</span>
                </div>
              </div>

              {/* Mandatory 2 Sketches (Front + Back) + Techpack */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ImageIcon size={14} color="#0284C7" />
                  Mandatory Sketches (At least 2 required) *
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label style={{ cursor: 'pointer', margin: 0 }}>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setFrontImageUploaded(true);
                          setFrontImageName(f.name);
                          showToast('Front view sketch attached!');
                        }
                      }}
                    />
                    <div style={{
                      border: frontImageUploaded ? '1px solid #16A34A' : '2px dashed #EF4444',
                      borderRadius: 6,
                      padding: 10,
                      textAlign: 'center',
                      background: frontImageUploaded ? '#F0FDF4' : '#FEF2F2'
                    }}>
                      <Upload size={16} color={frontImageUploaded ? '#16A34A' : '#EF4444'} style={{ margin: '0 auto 4px' }} />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: frontImageUploaded ? '#16A34A' : '#B91C1C', display: 'block' }}>
                        {frontImageUploaded ? `✓ Front View Attached` : 'Front Side (Required) *'}
                      </span>
                      {frontImageName && (
                        <span style={{ fontSize: '9.5px', color: '#166534', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {frontImageName}
                        </span>
                      )}
                    </div>
                  </label>

                  <label style={{ cursor: 'pointer', margin: 0 }}>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setBackImageUploaded(true);
                          setBackImageName(f.name);
                          showToast('Back view sketch attached!');
                        }
                      }}
                    />
                    <div style={{
                      border: backImageUploaded ? '1px solid #16A34A' : '2px dashed #EF4444',
                      borderRadius: 6,
                      padding: 10,
                      textAlign: 'center',
                      background: backImageUploaded ? '#F0FDF4' : '#FEF2F2'
                    }}>
                      <Upload size={16} color={backImageUploaded ? '#16A34A' : '#EF4444'} style={{ margin: '0 auto 4px' }} />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: backImageUploaded ? '#16A34A' : '#B91C1C', display: 'block' }}>
                        {backImageUploaded ? `✓ Back View Attached` : 'Back Side (Required) *'}
                      </span>
                      {backImageName && (
                        <span style={{ fontSize: '9.5px', color: '#166534', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {backImageName}
                        </span>
                      )}
                    </div>
                  </label>
                </div>

                <label style={{ cursor: 'pointer', margin: 0 }}>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setTechpackUploaded(true);
                        setTechpackName(f.name);
                        showToast('Techpack attached!');
                      }
                    }}
                  />
                  <div style={{
                    border: '1px dashed #CBD5E1',
                    borderRadius: 6,
                    padding: 8,
                    textAlign: 'center',
                    background: techpackUploaded ? '#F0FDF4' : '#F8FAFC'
                  }}>
                    <FileText size={14} color={techpackUploaded ? '#16A34A' : '#64748B'} style={{ margin: '0 auto 2px' }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: techpackUploaded ? '#16A34A' : '#475569' }}>
                      {techpackUploaded ? `✓ Techpack Attached: ${techpackName || 'techpack.pdf'}` : '+ Attach Measurement Techpack (Optional)'}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </Card>

          {/* Section 2: PO-wise Breakdown Grouped by Shipment Date (CCD) */}
          <Card title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>
                  Section 2: PO-wise Breakdown Grouped by Shipment Date (CCD)
                </div>
                <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>
                  {isOvsBuyer
                    ? 'OVS Consignments: Tracked by Destination Country/Market (Italy, Spain, Middle East, etc.)'
                    : 'POs sorted chronologically by Cargo Closing Date (earlier dates first) · Checkboxes isolate cutting table batches'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={() => handleSelectAllPos(true)}>
                  Select All POs
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleSelectAllPos(false)}>
                  Deselect All
                </Button>
                <Button variant="primary" size="sm" onClick={handleAddPo}>
                  <Plus size={12} style={{ marginRight: 4 }} />
                  Add {isOvsBuyer ? 'Market Consignment' : 'PO'}
                </Button>
              </div>
            </div>
          }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {isOvsBuyer && (
                <div style={{ border: '1px solid #BAE6FD', background: '#F0F9FF', borderRadius: 6, padding: '8px 12px', fontSize: '11.5px', color: '#0369A1' }}>
                  ℹ <strong>OVS S.p.A. Model:</strong> OVS orders are divided by Destination Country/Market rather than purchase order numbers. Consignments are tracked by country delivery destination.
                </div>
              )}

              {/* Chronological Date Groups & PO List */}
              {uniqueShipmentDates.map(date => {
                const posOnDate = poList.filter(p => p.ccd === date);
                const dateTotalQty = posOnDate.reduce((sum, p) => sum + getPoQty(p), 0);
                const allSelected = areAllSelectedForDate(date);

                return (
                  <div key={date} style={{ border: '1px solid #CBD5E1', borderRadius: 8, overflow: 'hidden', background: '#FFFFFF' }}>
                    {/* Shipment Date Header Banner with 1-click batch toggle */}
                    <div style={{
                      padding: '10px 14px',
                      background: '#F1F5F9',
                      borderBottom: '1px solid #CBD5E1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Calendar size={15} color="#0284C7" />
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F274E' }}>
                          Shipment Date (CCD): {date}
                        </span>
                        <Badge tone="info">
                          {posOnDate.length} {posOnDate.length > 1 ? (isOvsBuyer ? 'Markets' : 'POs') : (isOvsBuyer ? 'Market' : 'PO')} · {fmtNum(dateTotalQty)} pcs
                        </Badge>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleAllForDate(date)}
                        style={{
                          padding: '4px 10px',
                          background: allSelected ? '#0F274E' : '#FFFFFF',
                          color: allSelected ? '#FFFFFF' : '#0F274E',
                          border: '1px solid #CBD5E1',
                          borderRadius: 5,
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {allSelected ? '✓ Date Batch Selected' : 'Select Date Batch for Cutting'}
                      </button>
                    </div>

                    {/* POs on this date */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {posOnDate.map((po, pIdx) => {
                        const poQty = getPoQty(po);
                        return (
                          <div key={po.id} style={{ borderBottom: pIdx < posOnDate.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
                            {/* PO Summary Row */}
                            <div style={{
                              padding: '10px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: po.selected ? '#FFFFFF' : '#FAFAFA',
                              opacity: po.selected ? 1 : 0.7,
                              flexWrap: 'wrap',
                              gap: 10
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <input
                                  type="checkbox"
                                  checked={po.selected}
                                  onChange={() => handleTogglePo(po.id)}
                                  title="Check to include in cutting batch"
                                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                                />

                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <strong style={{ fontSize: '12.5px', color: '#0F274E' }}>
                                      {isOvsBuyer ? 'Market: ' : ''}{po.ref}
                                    </strong>
                                    <Badge tone="mid">{po.dest}</Badge>
                                    <span style={{ fontSize: '11px', color: '#64748B' }}>Mode: {po.shipMode}</span>
                                  </div>
                                  <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: 2 }}>
                                    Cancel Date: {po.cancelDate} · CCD: {po.ccd}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F274E' }}>
                                    {fmtNum(poQty)} pcs
                                  </div>
                                  <span style={{ fontSize: '10px', color: po.selected ? '#16A34A' : '#94A3B8', fontWeight: 600 }}>
                                    {po.selected ? '✓ Included in Cutting Batch' : 'Excluded from Batch'}
                                  </span>
                                </div>

                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleToggleExpand(po.id)}
                                >
                                  {po.isExpanded ? <ChevronDown size={13} style={{ marginRight: 4 }} /> : <ChevronRight size={13} style={{ marginRight: 4 }} />}
                                  {po.isExpanded ? 'Hide Matrix' : 'Colour × Size Matrix'}
                                </Button>

                                {poList.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePo(po.id)}
                                    style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', padding: 2 }}
                                    title="Delete PO"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Expanded Colour × Size Grid for this PO */}
                            {po.isExpanded && (
                              <div style={{ padding: '12px 14px', background: '#F8FAFC', borderTop: '1px dashed #CBD5E1' }}>
                                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0F274E', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>{isOvsBuyer ? 'Market Consignment' : 'PO'} Breakdown: {po.ref} ({po.dest})</span>
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#0284C7' }}>
                                    Total for this {isOvsBuyer ? 'Market' : 'PO'}: {fmtNum(poQty)} pcs
                                  </span>
                                </div>

                                <div style={{ overflowX: 'auto', border: '1px solid #CBD5E1', borderRadius: 6, background: '#FFFFFF' }}>
                                  <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                      <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#334155', fontWeight: 700 }}>
                                        <th style={{ padding: '6px 10px', minWidth: 150 }}>Colour</th>
                                        <th style={{ padding: '6px 8px', width: 110 }}>Colour Code</th>
                                        {sizeHeaders.map(s => (
                                          <th key={s} style={{ padding: '6px 8px', textAlign: 'center', width: 75 }}>{s}</th>
                                        ))}
                                        <th style={{ padding: '6px 10px', textAlign: 'right', width: 90 }}>Colour Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {colorways.map((c, ci) => {
                                        const cTotal = sizeHeaders.reduce((s, _, si) => s + (Number(po.quantities?.[ci]?.[si]) || 0), 0);
                                        return (
                                          <tr key={c.name} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                            <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0F274E' }}>{c.name}</td>
                                            <td style={{ padding: '6px 8px', color: '#64748B', fontSize: '10.5px' }}>{c.code || '-'}</td>
                                            {sizeHeaders.map((_, si) => (
                                              <td key={si} style={{ padding: '4px 6px', textAlign: 'center' }}>
                                                <input
                                                  type="number"
                                                  min={0}
                                                  value={po.quantities?.[ci]?.[si] ?? 0}
                                                  onChange={(e) => handleUpdatePoQty(po.id, ci, si, parseInt(e.target.value, 10) || 0)}
                                                  style={{
                                                    width: '100%',
                                                    padding: '3px 4px',
                                                    textAlign: 'center',
                                                    borderRadius: 4,
                                                    border: '1px solid #CBD5E1',
                                                    fontSize: '11.5px',
                                                    fontWeight: 600
                                                  }}
                                                />
                                              </td>
                                            ))}
                                            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#0F274E' }}>
                                              {fmtNum(cTotal)}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                    <tfoot>
                                      <tr style={{ background: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: 700, color: '#0F274E' }}>
                                        <td colSpan={2} style={{ padding: '6px 10px' }}>Total Pcs</td>
                                        {sizeHeaders.map((_, si) => {
                                          const sizeSum = colorways.reduce((sum, _, ci) => sum + (Number(po.quantities?.[ci]?.[si]) || 0), 0);
                                          return (
                                            <td key={si} style={{ padding: '6px 8px', textAlign: 'center' }}>
                                              {fmtNum(sizeSum)}
                                            </td>
                                          );
                                        })}
                                        <td style={{ padding: '6px 10px', textAlign: 'right', color: '#0284C7' }}>
                                          {fmtNum(poQty)}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Section 3: Dynamic Selected Cutting Batch Summary & Marker Planning Matrix */}
          <Card title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Scissors size={18} color="#0284C7" />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>
                    Section 3: Dynamic Selected Cutting Batch Summary ({selectedPos.length} of {poList.length} POs Checked)
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>
                    Aggregates only the checked POs above to generate direct cutting orders, marker plans, and fabric consumption
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge tone="done">
                  Batch Total: {fmtNum(selectedCuttingTotal)} pcs
                </Badge>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 12px',
                    borderRadius: 5,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={12} /> Print Cutting Order
                </button>
              </div>
            </div>
          }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {selectedPos.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748B', background: '#F8FAFC', borderRadius: 8, border: '1px dashed #CBD5E1' }}>
                  No POs currently selected for this cutting batch. Check one or more POs above to generate the cutting summary.
                </div>
              ) : (
                <div>
                  <div style={{ overflowX: 'auto', border: '1px solid #CBD5E1', borderRadius: 8 }}>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#0F274E', color: '#FFFFFF', fontWeight: 700 }}>
                          <th style={{ padding: '8px 12px', minWidth: 160 }}>Selected Colour</th>
                          <th style={{ padding: '8px 10px', width: 120 }}>Colour Code</th>
                          {sizeHeaders.map(s => (
                            <th key={s} style={{ padding: '8px 10px', textAlign: 'center', width: 80 }}>{s}</th>
                          ))}
                          <th style={{ padding: '8px 12px', textAlign: 'right', width: 110 }}>Batch Total (pcs)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {colorways.map((c, ci) => {
                          const rowTotal = sizeHeaders.reduce((sum, _, si) => sum + (selectedCuttingMatrix[ci]?.[si] || 0), 0);
                          return (
                            <tr key={c.name} style={{ borderBottom: '1px solid #E2E8F0', background: ci % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0F274E' }}>{c.name}</td>
                              <td style={{ padding: '8px 10px', color: '#64748B', fontSize: '11px' }}>{c.code || '-'}</td>
                              {sizeHeaders.map((_, si) => {
                                const val = selectedCuttingMatrix[ci]?.[si] || 0;
                                return (
                                  <td key={si} style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: val > 0 ? '#0F274E' : '#94A3B8' }}>
                                    {fmtNum(val)}
                                  </td>
                                );
                              })}
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#0F274E' }}>
                                {fmtNum(rowTotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#E0F2FE', borderTop: '2px solid #0284C7', fontWeight: 700, color: '#0369A1' }}>
                          <td colSpan={2} style={{ padding: '10px 12px' }}>
                            ✂ Cutting Batch Total ({selectedPos.length} POs Selected)
                          </td>
                          {sizeHeaders.map((_, si) => {
                            const sizeSum = colorways.reduce((sum, _, ci) => sum + (selectedCuttingMatrix[ci]?.[si] || 0), 0);
                            return (
                              <td key={si} style={{ padding: '10px 10px', textAlign: 'center', fontSize: '13px' }}>
                                {fmtNum(sizeSum)}
                              </td>
                            );
                          })}
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '13.5px', color: '#0F274E' }}>
                            {fmtNum(selectedCuttingTotal)} pcs
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B' }}>
                    <span>Selected PO References: <strong>{selectedPos.map(p => p.ref).join(', ')}</strong></span>
                    <span>CAD Lay Requirement: <strong>~{Math.round(selectedCuttingTotal * 0.22)} kg</strong> body fabric</span>
                  </div>
                </div>
              )}

              {/* Complete Contract Grand Total Matrix */}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F274E', margin: 0 }}>
                    📋 Complete Style Order Summary (All {poList.length} POs · {fmtNum(grandTotalPcs)} pcs Total Contract)
                  </h4>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    Contract Value: <strong>${fmtNum(Math.round(grandTotalPcs * (parseFloat(entryFob) || 3.45)))} {entryCurrency}</strong>
                  </span>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #CBD5E1', borderRadius: 8 }}>
                  <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#475569', fontWeight: 700 }}>
                        <th style={{ padding: '7px 10px' }}>Colour Name</th>
                        <th style={{ padding: '7px 8px', width: 110 }}>Colour Code</th>
                        {sizeHeaders.map(s => (
                          <th key={s} style={{ padding: '7px 8px', textAlign: 'center', width: 75 }}>{s}</th>
                        ))}
                        <th style={{ padding: '7px 10px', textAlign: 'right', width: 95 }}>Total (pcs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {colorways.map((c, ci) => {
                        const rowTotal = sizeHeaders.reduce((sum, _, si) => sum + (grandTotalMatrix[ci]?.[si] || 0), 0);
                        return (
                          <tr key={c.name} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '7px 10px', fontWeight: 600 }}>{c.name}</td>
                            <td style={{ padding: '7px 8px', color: '#64748B', fontSize: '10.5px' }}>{c.code || '-'}</td>
                            {sizeHeaders.map((_, si) => (
                              <td key={si} style={{ padding: '7px 8px', textAlign: 'center' }}>
                                {fmtNum(grandTotalMatrix[ci]?.[si] || 0)}
                              </td>
                            ))}
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700 }}>
                              {fmtNum(rowTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#F8FAFC', borderTop: '2px solid #CBD5E1', fontWeight: 700, color: '#0F274E' }}>
                        <td colSpan={2} style={{ padding: '8px 10px' }}>Contract Grand Total</td>
                        {sizeHeaders.map((_, si) => {
                          const sizeSum = colorways.reduce((sum, _, ci) => sum + (grandTotalMatrix[ci]?.[si] || 0), 0);
                          return (
                            <td key={si} style={{ padding: '8px 8px', textAlign: 'center' }}>
                              {fmtNum(sizeSum)}
                            </td>
                          );
                        })}
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0284C7' }}>
                          {fmtNum(grandTotalPcs)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Dispatch Action */}
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Button variant="primary" onClick={handleSaveAndDispatch}>
                  <Save size={14} style={{ marginRight: 6 }} />
                  Save & Dispatch Order ({fmtNum(grandTotalPcs)} pcs)
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== TAB 3: CREATE BOM */}
      {activeTab === 'create-bom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Active Job & Planning Approval Gate Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E' }}>BOM for Job:</span>
              <select
                value={selectedJobNo}
                onChange={(e) => setSelectedJobNo(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600 }}
              >
                {masterJobs.slice(0, 50).map(j => (
                  <option key={j.jobNo} value={j.jobNo}>Job #{j.jobNo} · {j.buyer} · {j.styleNo} ({fmtNum(j.orderQty)} pcs)</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Badge tone={bomPlanningApproved ? 'done' : bomSubmittedToPlanning ? 'info' : 'mid'}>
                {bomPlanningApproved
                  ? 'BOM Status: Approved by Planning (Released to Trims Store)'
                  : bomSubmittedToPlanning
                  ? 'BOM Status: BOM Created (Awaiting Planning Approval)'
                  : 'BOM Status: Draft'}
              </Badge>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => showToast('BOM draft saved locally!')}
              >
                <Save size={13} style={{ marginRight: 4 }} />
                Save Draft BOM
              </Button>

              <Button
                variant="primary"
                size="sm"
                disabled={bomPlanningApproved}
                onClick={() => {
                  if (!bomSubmittedToPlanning) {
                    setBomSubmittedToPlanning(true);
                    showToast('BOM submitted to Central Planning for approval!');
                  } else {
                    setBomPlanningApproved(true);
                    showToast('Planning Approval Gate Cleared! BOM Released to Trims Store.');
                  }
                }}
              >
                <FileCheck size={13} style={{ marginRight: 4 }} />
                {!bomSubmittedToPlanning
                  ? 'Submit BOM to Planning'
                  : 'Approve BOM (Planning Gate)'}
              </Button>
            </div>
          </div>

          {/* Pending Departmental Consumption Simulations */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ border: '1px solid #BAE6FD', background: '#F0F9FF', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <strong style={{ fontSize: '12px', color: '#0369A1' }}>Central IE Thread Consumption Flow</strong>
                <Badge tone={bomIeThreadStatus === 'ISSUED' ? 'done' : 'mid'}>
                  {bomIeThreadStatus === 'ISSUED' ? 'IE Issued (182m/dz)' : 'Pending Central IE'}
                </Badge>
              </div>
              <p style={{ fontSize: '11px', color: '#0369A1', margin: '0 0 8px' }}>
                Thread consumption is measured by IE from seam lengths. Until issued, thread booking is held.
              </p>
              {bomIeThreadStatus === 'PENDING' && (
                <button
                  type="button"
                  onClick={() => {
                    setBomIeThreadStatus('ISSUED');
                    showToast('Central IE thread bulletin received: 182m/dz!');
                  }}
                  style={{ padding: '4px 10px', background: '#0284C7', color: '#FFFFFF', border: 'none', borderRadius: 4, fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Simulate IE Thread Input
                </button>
              )}
            </div>

            <div style={{ border: '1px solid #DDD6FE', background: '#F5F3FF', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <strong style={{ fontSize: '12px', color: '#6D28D9' }}>Technical Dept Consumption Flow (Lace/Drawcord)</strong>
                <Badge tone={bomTechLaceStatus === 'CONFIRMED' ? 'done' : 'mid'}>
                  {bomTechLaceStatus === 'CONFIRMED' ? 'Technical Confirmed' : 'Pending Technical'}
                </Badge>
              </div>
              <p style={{ fontSize: '11px', color: '#6D28D9', margin: '0 0 8px' }}>
                Technical trims and eyelet/drawcord consumption must be validated by the Technical division.
              </p>
              {bomTechLaceStatus === 'PENDING' && (
                <button
                  type="button"
                  onClick={() => {
                    setBomTechLaceStatus('CONFIRMED');
                    showToast('Technical Department confirmed drawcord specs & length!');
                  }}
                  style={{ padding: '4px 10px', background: '#7C3AED', color: '#FFFFFF', border: 'none', borderRadius: 4, fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Simulate Technical Approval
                </button>
              )}
            </div>
          </div>

          {/* Trims & Accessories Master Checklist */}
          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Trims & Accessories BOM Item Master</div>
              <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>
                Standard garment trims + Custom items · Must pass Planning Gate before release to Store
              </span>
            </div>
          }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontWeight: 700 }}>
                      <th style={{ padding: '8px' }}>Trim Item</th>
                      <th style={{ padding: '8px' }}>Supplier / Mill</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Req Qty</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Order Qty</th>
                      <th style={{ padding: '8px' }}>In-House Target</th>
                      <th style={{ padding: '8px' }}>Department Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bomTrimsList.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '8px', fontWeight: 700, color: '#0F274E' }}>{t.name}</td>
                        <td style={{ padding: '8px' }}>{t.supplier}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{fmtNum(currentJob.orderQty || 5000)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{fmtNum(Math.round((currentJob.orderQty || 5000) * 1.03))}</td>
                        <td style={{ padding: '8px' }}>{t.inHouseDate}</td>
                        <td style={{ padding: '8px' }}>
                          <Badge tone={t.isIe && bomIeThreadStatus === 'PENDING' ? 'mid' : t.isTech && bomTechLaceStatus === 'PENDING' ? 'mid' : 'done'}>
                            {t.isIe && bomIeThreadStatus === 'PENDING'
                              ? 'Pending IE'
                              : t.isTech && bomTechLaceStatus === 'PENDING'
                              ? 'Pending Tech'
                              : 'Ready for Store'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Custom Trims Item */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: '#F8FAFC', borderRadius: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F274E' }}>+ Add Custom Trim:</span>
                <input
                  type="text"
                  placeholder="e.g. 5# Metal Zipper, 2cm Elastic"
                  value={customTrimName}
                  onChange={(e) => setCustomTrimName(e.target.value)}
                  style={{ width: 220, padding: '5px 8px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: '11.5px' }}
                />
                <input
                  type="text"
                  placeholder="Supplier name"
                  value={customTrimSupplier}
                  onChange={(e) => setCustomTrimSupplier(e.target.value)}
                  style={{ width: 160, padding: '5px 8px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: '11.5px' }}
                />
                <Button variant="secondary" size="sm" onClick={handleAddCustomTrim}>
                  <Plus size={12} style={{ marginRight: 3 }} />
                  Add to BOM
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== TAB 4: FABRIC ORDER SHEET */}
      {activeTab === 'fabric-sheet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Topbar with Pending Badge & Print Action */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            flexWrap: 'wrap',
            gap: 12
          }}>
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

              <Badge tone="mid">
                Pending Fabric Bookings (3)
              </Badge>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Badge tone="done">
                Planning Gate: Approved & Released to Dyeing & Knitting
              </Badge>
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                <Printer size={13} style={{ marginRight: 4 }} />
                Print Order Sheet
              </Button>
            </div>
          </div>

          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>
                Official Fabric Order Sheet — Job #{currentJob.jobNo}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>
                {currentJob.buyer} · Style: {currentJob.styleNo} · Total Order: {fmtNum(currentJob.orderQty)} pcs
              </span>
            </div>
          }>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '10px 8px' }}>Garment Part</th>
                    <th style={{ padding: '10px 8px' }}>Fabric Specification</th>
                    <th style={{ padding: '10px 8px' }}>GSM</th>
                    <th style={{ padding: '10px 8px' }}>Finish Dia</th>
                    <th style={{ padding: '10px 8px' }}>Knit Dia</th>
                    <th style={{ padding: '10px 8px' }}>CAD Cons</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Booking (kg)</th>
                    <th style={{ padding: '10px 8px' }}>Dyeing Mill</th>
                    <th style={{ padding: '10px 8px' }}>Gate Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fabricSheetLines.map((line, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 700, color: '#0F274E' }}>{line.part}</td>
                      <td style={{ padding: '10px 8px' }}>{line.fabric}</td>
                      <td style={{ padding: '10px 8px' }}>{line.gsm}</td>
                      <td style={{ padding: '10px 8px' }}>{line.finishDia}</td>
                      <td style={{ padding: '10px 8px' }}>{line.knitDia}</td>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{line.cadCons} kg/dz</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#0284C7' }}>
                        {fmtNum(line.bookingKg)} kg
                      </td>
                      <td style={{ padding: '10px 8px' }}>{line.mill}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <Badge tone="done">{line.status}</Badge>
                      </td>
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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            flexWrap: 'wrap',
            gap: 12
          }}>
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
            <div style={{ fontSize: '11.5px', color: '#64748B' }}>
              Expand arrow to inspect garment sketch · Per-row dedicated Save button · Locked until IE/Tech approves
            </div>
          </div>

          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Trims & Accessories Ordering & Delivery Follow-up</div>
              <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>
                Dedicated Save per row · Ordered status locked if IE thread / Technical consumption is unapproved
              </span>
            </div>
          }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {trimsItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '12px 14px',
                    background: item.locked ? '#FEF2F2' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {item.locked ? <Lock size={13} color="#DC2626" /> : <Unlock size={13} color="#16A34A" />}
                      <strong style={{ fontSize: '12.5px', color: '#0F274E' }}>{item.name}</strong>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Supplier: {item.supplier}</span>
                    {item.locked && (
                      <div style={{ fontSize: '10.5px', color: '#DC2626', fontWeight: 600, marginTop: 2 }}>
                        ⚠ Locked: Awaiting department consumption bulletin
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontSize: '10.5px', color: '#64748B', display: 'block' }}>Order Qty</span>
                      <strong style={{ fontSize: '12px', color: '#0F274E' }}>{fmtNum(item.orderQty)}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '10.5px', color: '#64748B', display: 'block' }}>In-House Target</span>
                      <input
                        type="text"
                        disabled={item.locked}
                        defaultValue={item.inHouseDate}
                        id={`target-${item.id}`}
                        style={{ width: 100, padding: '4px 6px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: '11.5px' }}
                      />
                    </div>

                    <div>
                      <span style={{ fontSize: '10.5px', color: '#64748B', display: 'block' }}>Order Status</span>
                      <select
                        disabled={item.locked}
                        defaultValue={item.status}
                        id={`status-${item.id}`}
                        style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: '11.5px' }}
                      >
                        <option value="Not Ordered">Not Ordered</option>
                        <option value="PO Placed">PO Placed</option>
                        <option value="In-house">In-house</option>
                      </select>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={item.locked}
                      onClick={() => {
                        const statusEl = document.getElementById(`status-${item.id}`) as HTMLSelectElement;
                        const dateEl = document.getElementById(`target-${item.id}`) as HTMLInputElement;
                        handleUpdateTrimRow(item.id, statusEl?.value || item.status, dateEl?.value || item.inHouseDate);
                      }}
                    >
                      <Save size={12} style={{ marginRight: 3 }} />
                      Save Item
                    </Button>
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
            <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>
              Prioritized by Merchandiser control milestones: Trims In-house, File Handover, Lab Dip pre-dyeing, PP Meeting & Full Production Balance
            </span>
          </div>
        }>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '10px 8px' }}>Job No</th>
                  <th style={{ padding: '10px 8px' }}>Buyer & Style</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Order Qty</th>
                  <th style={{ padding: '10px 8px', color: '#0284C7' }}>Trims In-house Date</th>
                  <th style={{ padding: '10px 8px', color: '#0284C7' }}>File Handover Date</th>
                  <th style={{ padding: '10px 8px' }}>Lab Dip Approval</th>
                  <th style={{ padding: '10px 8px' }}>PP Meeting Status</th>
                  <th style={{ padding: '10px 8px' }}>Planning Status</th>
                  <th style={{ padding: '10px 8px' }}>Ex-Factory Date</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Audit History</th>
                </tr>
              </thead>
              <tbody>
                {masterJobs.slice(0, 35).map((j: any) => (
                  <tr key={j.jobNo} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 700 }}>
                      <Link
                        href={`/jobs/${encodeURIComponent(j.jobNo)}`}
                        style={{ color: '#0284C7', textDecoration: 'none' }}
                        className="hover:underline"
                      >
                        Job #{j.jobNo}
                      </Link>
                    </td>

                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ fontWeight: 600, color: '#0F274E' }}>{j.styleNo}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{j.buyer}</div>
                    </td>

                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700 }}>
                      {fmtNum(j.orderQty)}
                    </td>

                    <td style={{ padding: '10px 8px', fontWeight: 700, color: '#0F274E' }}>
                      {j.dates?.trimsInHouse || '15-Nov-2026'}
                    </td>

                    <td style={{ padding: '10px 8px', fontWeight: 700, color: '#0F274E' }}>
                      {j.dates?.fileHandover || '18-Nov-2026'}
                    </td>

                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ fontSize: '11px', color: j.dyeingLab?.status === 'APPROVED' ? '#16A34A' : '#D97706', fontWeight: 700 }}>
                        {j.dyeingLab?.status === 'APPROVED' ? `Approved (${j.dyeingLab.optionApproved || 'Opt B'})` : 'Pending Dip Approval'}
                      </span>
                    </td>

                    <td style={{ padding: '10px 8px' }}>
                      <Badge tone="done">PP Completed</Badge>
                    </td>

                    <td style={{ padding: '10px 8px' }}>
                      <Badge tone="done">Planning Approved</Badge>
                    </td>

                    <td style={{ padding: '10px 8px', fontWeight: 600 }}>
                      {j.dates?.exFactory || '15-Dec-2026'}
                    </td>

                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setHistoryJob(j)}
                        style={{
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          borderRadius: 4,
                          padding: '4px 8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: '11px',
                          color: '#0F274E',
                          fontWeight: 600
                        }}
                        title="View Timestamped Audit Trail"
                      >
                        <History size={12} color="#0284C7" />
                        Log
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ===================================================================== LIGHTBOX MODAL */}
      {lightboxJob && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 12,
            maxWidth: 640,
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 20px',
              borderBottom: '1px solid #E2E8F0',
              background: '#0F274E',
              color: '#FFFFFF'
            }}>
              <div>
                <strong style={{ fontSize: '14px' }}>Garment Photo Lightbox — Job #{lightboxJob.jobNo}</strong>
                <div style={{ fontSize: '11px', color: '#93C5FD' }}>{lightboxJob.buyer} · Style: {lightboxJob.styleNo}</div>
              </div>
              <button
                type="button"
                onClick={() => setLightboxJob(null)}
                style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 16, textAlign: 'center', background: '#F8FAFC' }}>
                <Shirt size={48} color="#0284C7" style={{ margin: '0 auto 10px' }} />
                <strong style={{ fontSize: '12px', color: '#0F274E', display: 'block' }}>Front Side View</strong>
                <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>High-Res Vector Approved</span>
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 16, textAlign: 'center', background: '#F8FAFC' }}>
                <Shirt size={48} color="#64748B" style={{ margin: '0 auto 10px', transform: 'scaleX(-1)' }} />
                <strong style={{ fontSize: '12px', color: '#0F274E', display: 'block' }}>Back Side View</strong>
                <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>High-Res Vector Approved</span>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', background: '#F8FAFC' }}>
              <Button variant="secondary" size="sm" onClick={() => setLightboxJob(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== HISTORY AUDIT MODAL */}
      {historyJob && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 12,
            maxWidth: 600,
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 20px',
              borderBottom: '1px solid #E2E8F0',
              background: '#0F274E',
              color: '#FFFFFF'
            }}>
              <div>
                <strong style={{ fontSize: '14px' }}>Timestamped Audit Trail — Job #{historyJob.jobNo}</strong>
                <div style={{ fontSize: '11px', color: '#93C5FD' }}>Milestone History & Change Log</div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryJob(null)}
                style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
              {(historyJob.auditHistory || [
                { date: '08-Nov-2026 14:32', user: 'Tariqul Islam (Lead Merchandiser)', action: 'Trims In-house target date set to 15-Nov-2026.' },
                { date: '07-Nov-2026 11:20', user: 'Central Planning (Nasir Ahmed)', action: 'BOM and Fabric Booking approved for production release.' },
                { date: '05-Nov-2026 16:45', user: 'Dyeing Lab (Dr. Kabir)', action: 'Lab dip Option B Approved for Navy Blazer shade.' },
                { date: '04-Nov-2026 09:10', user: 'System Import', action: 'PO Intake parsed from Bestseller PO-89420 with 6 sizes.' }
              ]).map((entry: any, idx: number) => (
                <div key={idx} style={{ borderLeft: '3px solid #0284C7', paddingLeft: 10, background: '#F8FAFC', padding: 8, borderRadius: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', marginBottom: 2 }}>
                    <span>{entry.date}</span>
                    <strong style={{ color: '#0F274E' }}>{entry.user}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#334155' }}>{entry.action}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', background: '#F8FAFC' }}>
              <Button variant="secondary" size="sm" onClick={() => setHistoryJob(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
