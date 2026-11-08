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
  Maximize2
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
  const [orderMode, setOrderMode] = useState<'MANUAL' | 'IMPORT'>('MANUAL');
  const [entryJobType, setEntryJobType] = useState<'NEW' | 'REPEAT'>('NEW');
  const [entryBaseJob, setEntryBaseJob] = useState('48216');
  const [entryRepeatLot, setEntryRepeatLot] = useState('2nd Lot');
  const [entryBuyer, setEntryBuyer] = useState('ONLY');
  const [entryBrand, setEntryBrand] = useState('ONL-JRSY');
  const [entryPoNumber, setEntryPoNumber] = useState('PO-89420');
  const [entryStyle, setEntryStyle] = useState('ONLY-20268819');
  const [entryItem, setEntryItem] = useState('T-Shirt');
  const [entryBodyFabric, setEntryBodyFabric] = useState(FABRIC_PARTS[0].types[0]);
  const [entryNeckRib, setEntryNeckRib] = useState(FABRIC_PARTS[1].types[0]);
  const [entryCuff, setEntryCuff] = useState(FABRIC_PARTS[2].types[2]);
  const [entryHoodInner, setEntryHoodInner] = useState(FABRIC_PARTS[3].types[0]);

  // Pre-shipment dates & logistics
  const [entryCcd, setEntryCcd] = useState('2026-12-15');
  const [entryPoDate, setEntryPoDate] = useState('2026-11-08');
  const [entryCancelDate, setEntryCancelDate] = useState('2026-12-25');
  const [entryShipMode, setEntryShipMode] = useState('Sea Freight');

  // Country / Market Breakdown
  const [countryBreakdown, setCountryBreakdown] = useState([
    { country: 'Germany (DE)', sharePct: 40, market: 'EU Core' },
    { country: 'United Kingdom (UK)', sharePct: 25, market: 'UK Market' },
    { country: 'France (FR)', sharePct: 20, market: 'EU Core' },
    { country: 'Spain (ES)', sharePct: 15, market: 'South EU' }
  ]);

  // PO-wise CCD Grouping
  const [poCcdGroups, setPoCcdGroups] = useState([
    { id: 'po-1', poNo: 'PO-89420-A', ccd: '2026-12-10', country: 'Germany', qty: 3500, selected: true },
    { id: 'po-2', poNo: 'PO-89420-B', ccd: '2026-12-15', country: 'UK & France', qty: 2500, selected: true },
    { id: 'po-3', poNo: 'PO-89420-C', ccd: '2026-12-24', country: 'Spain', qty: 1000, selected: true }
  ]);

  // Flexible size matrix
  const [sizesLocked, setSizesLocked] = useState(true); // Locked by default as requested
  const [sizePresetKey, setSizePresetKey] = useState<string>('ALPHA');
  const [sizeList, setSizeList] = useState<SizeItem[]>(SIZE_PRESETS.ALPHA);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [customQtyInput, setCustomQtyInput] = useState('500');

  // Total quantity dynamically affected by checked POs
  const activePoRatio = useMemo(() => {
    const totalPoQty = poCcdGroups.reduce((s, p) => s + p.qty, 0);
    const selectedPoQty = poCcdGroups.filter(p => p.selected).reduce((s, p) => s + p.qty, 0);
    return totalPoQty > 0 ? (selectedPoQty / totalPoQty) : 1;
  }, [poCcdGroups]);

  const entryTotalQty = useMemo(() => {
    const rawSum = sizeList.reduce((acc, s) => acc + (Number(s.qty) || 0), 0);
    return Math.round(rawSum * activePoRatio);
  }, [sizeList, activePoRatio]);

  // PO Import State
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importParsedData, setImportParsedData] = useState<any | null>(null);

  // Mandatory 2 Photos + Techpack
  const [frontImageUploaded, setFrontImageUploaded] = useState(false);
  const [backImageUploaded, setBackImageUploaded] = useState(false);
  const [techpackUploaded, setTechpackUploaded] = useState(false);
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
        brand: 'ONL-JRSY',
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
        brand: 'OVS-CASUAL',
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
        brand: 'NMT-MINI',
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
    setEntryBrand(importParsedData.brand);
    setEntryPoNumber(importParsedData.poNumber);
    setEntryStyle(importParsedData.styleNo);
    setEntryItem(importParsedData.item);
    setEntryCcd(importParsedData.ccd);
    setEntryCancelDate(importParsedData.cancelDate);
    setEntryShipMode(importParsedData.shipMode);
    setSizeList(importParsedData.sizes.map((s: any) => ({ ...s })));
    setSizePresetKey('CUSTOM');
    showToast('Imported PO data applied to order configuration!');
  };

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
      fob: 3.90,
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
      cuttingStatus: 'Cutting Prep',
      sewingStatus: 'Line Loading Soon',
      dyeingLab: { status: 'PENDING', optionApproved: null },
      fabric: {
        fabricType: entryBodyFabric,
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
                  Upload Excel (.xlsx/.csv) or PDF purchase orders with multi-size breakdown
                </span>
              </div>
            }>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                  border: '2px dashed #93C5FD',
                  borderRadius: 10,
                  padding: '20px',
                  background: '#F8FAFC',
                  textAlign: 'center'
                }}>
                  <Upload size={30} color="#0284C7" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F274E', marginBottom: 2 }}>
                    Drag & Drop Buyer Purchase Order or Click to Browse
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginBottom: 12 }}>
                    Supports Bestseller Excel sheets, OVS S.p.A. PDF POs, UTG, and Name It CSV files
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleSimulateImport('bestseller-alpha')}
                      style={{ padding: '6px 14px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '11.5px', fontWeight: 600, color: '#0F274E', cursor: 'pointer' }}
                    >
                      📄 Sample Bestseller PO (Alpha XS–XXL)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSimulateImport('ovs-numeric')}
                      style={{ padding: '6px 14px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '11.5px', fontWeight: 600, color: '#0F274E', cursor: 'pointer' }}
                    >
                      📊 Sample OVS PO (Numeric 28–38)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSimulateImport('kids')}
                      style={{ padding: '6px 14px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: '11.5px', fontWeight: 600, color: '#0F274E', cursor: 'pointer' }}
                    >
                      🧒 Sample Name It PO (Kids 92–128)
                    </button>
                  </div>
                </div>

                {importParsedData && (
                  <div style={{ border: '1px solid #86EFAC', background: '#F0FDF4', borderRadius: 8, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={16} color="#16A34A" />
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#166534' }}>
                          {importStatus}
                        </span>
                      </div>
                      <Button variant="primary" size="sm" onClick={handleApplyImportedData}>
                        <Check size={12} style={{ marginRight: 4 }} />
                        Apply & Populate 3 Sections Below
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Section 1: Job Master Info & Garment Parts */}
          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Section 1: Job Master Info & Garment Configuration</div>
              <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>
                Job Type, Buyer, Style No, CAD fabric parts, and mandatory front/back sketches
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
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Brand / Sub-brand</label>
                    <input
                      type="text"
                      value={entryBrand}
                      onChange={(e) => setEntryBrand(e.target.value)}
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

              {/* Part-wise Fabric Selection (CAD notice) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Layers size={14} color="#0284C7" />
                    Garment Fabric Parts
                  </h4>
                  <span style={{ fontSize: '10.5px', color: '#0284C7', fontWeight: 600 }}>CAD will fill Dia & Cons</span>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>Body Fabric</label>
                  <select
                    value={entryBodyFabric}
                    onChange={(e) => setEntryBodyFabric(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '11.5px' }}
                  >
                    {FABRIC_PARTS[0].types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>Neck Rib / Collar</label>
                  <select
                    value={entryNeckRib}
                    onChange={(e) => setEntryNeckRib(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '11.5px' }}
                  >
                    {FABRIC_PARTS[1].types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>Cuff / Bottom Rib</label>
                  <select
                    value={entryCuff}
                    onChange={(e) => setEntryCuff(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '11.5px' }}
                  >
                    {FABRIC_PARTS[2].types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>Hood / Inner Lining</label>
                  <select
                    value={entryHoodInner}
                    onChange={(e) => setEntryHoodInner(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '11.5px' }}
                  >
                    {FABRIC_PARTS[3].types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Mandatory 2 Sketches (Front + Back) + Techpack */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ImageIcon size={14} color="#0284C7" />
                  Mandatory Sketches (At least 2 required) *
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div
                    onClick={() => setFrontImageUploaded(true)}
                    style={{
                      border: frontImageUploaded ? '1px solid #16A34A' : '2px dashed #EF4444',
                      borderRadius: 6,
                      padding: 10,
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: frontImageUploaded ? '#F0FDF4' : '#FEF2F2'
                    }}
                  >
                    <Upload size={16} color={frontImageUploaded ? '#16A34A' : '#EF4444'} style={{ margin: '0 auto 4px' }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: frontImageUploaded ? '#16A34A' : '#B91C1C', display: 'block' }}>
                      {frontImageUploaded ? '✓ Front View Attached' : 'Front Side (Required)'}
                    </span>
                  </div>

                  <div
                    onClick={() => setBackImageUploaded(true)}
                    style={{
                      border: backImageUploaded ? '1px solid #16A34A' : '2px dashed #EF4444',
                      borderRadius: 6,
                      padding: 10,
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: backImageUploaded ? '#F0FDF4' : '#FEF2F2'
                    }}
                  >
                    <Upload size={16} color={backImageUploaded ? '#16A34A' : '#EF4444'} style={{ margin: '0 auto 4px' }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: backImageUploaded ? '#16A34A' : '#B91C1C', display: 'block' }}>
                      {backImageUploaded ? '✓ Back View Attached' : 'Back Side (Required)'}
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setTechpackUploaded(true)}
                  style={{
                    border: '1px dashed #CBD5E1',
                    borderRadius: 6,
                    padding: 8,
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: techpackUploaded ? '#F0FDF4' : '#F8FAFC'
                  }}
                >
                  <FileText size={14} color={techpackUploaded ? '#16A34A' : '#64748B'} style={{ margin: '0 auto 2px' }} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: techpackUploaded ? '#16A34A' : '#475569' }}>
                    {techpackUploaded ? '✓ Techpack PDF Attached' : '+ Attach Measurement Techpack'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Section 2: Order Country Breakdown */}
          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Section 2: Order Country & Destination Breakdown</div>
              <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>
                Allocated market shares across EU & International destinations
              </span>
            </div>
          }>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {countryBreakdown.map(c => {
                const pcs = Math.round(entryTotalQty * (c.sharePct / 100));
                return (
                  <div key={c.country} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px', background: '#FFFFFF' }}>
                    <div style={{ fontWeight: 700, fontSize: '12px', color: '#0F274E' }}>{c.country}</div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginBottom: 6 }}>{c.market}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#0284C7' }}>{c.sharePct}%</span>
                      <strong style={{ fontSize: '13px', color: '#0F274E' }}>{fmtNum(pcs)} pcs</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Section 3: PO-wise Breakdown with CCD Grouping & Size Protection */}
          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Section 3: PO-wise Breakdown & CCD Grouping</div>
              <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>
                POs grouped by Customer Confirmed Date (earlier CCD on top) · Checkbox toggles quantity recalculation
              </span>
            </div>
          }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* PO Groups Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontWeight: 700 }}>
                      <th style={{ padding: '8px 6px', width: 40, textAlign: 'center' }}>Active</th>
                      <th style={{ padding: '8px 6px' }}>PO Reference</th>
                      <th style={{ padding: '8px 6px' }}>Target CCD Date</th>
                      <th style={{ padding: '8px 6px' }}>Destination</th>
                      <th style={{ padding: '8px 6px', textAlign: 'right' }}>PO Order Qty</th>
                      <th style={{ padding: '8px 6px' }}>Ship Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poCcdGroups.map(po => (
                      <tr key={po.id} style={{ borderBottom: '1px solid #F1F5F9', background: po.selected ? '#FFFFFF' : '#F1F5F9', opacity: po.selected ? 1 : 0.6 }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={po.selected}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setPoCcdGroups(prev => prev.map(p => p.id === po.id ? { ...p, selected: checked } : p));
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '8px 6px', fontWeight: 700, color: '#0F274E' }}>{po.poNo}</td>
                        <td style={{ padding: '8px 6px', fontWeight: 600, color: '#0284C7' }}>{po.ccd}</td>
                        <td style={{ padding: '8px 6px' }}>{po.country}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700 }}>{fmtNum(po.qty)} pcs</td>
                        <td style={{ padding: '8px 6px' }}>
                          <Badge tone="done">{entryShipMode}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Protected Size Input Breakdown */}
              <div style={{ marginTop: 10, paddingTop: 14, borderTop: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0F274E', margin: 0 }}>
                      Size Breakdown & Quantities (Scroll-wheel Protected)
                    </h4>
                    <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                      Calculated Total: <strong style={{ color: '#0F274E', fontSize: '13px' }}>{fmtNum(entryTotalQty)} pcs</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Button
                      variant={sizesLocked ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => setSizesLocked(!sizesLocked)}
                    >
                      {sizesLocked ? <Unlock size={12} style={{ marginRight: 4 }} /> : <Lock size={12} style={{ marginRight: 4 }} />}
                      {sizesLocked ? 'Edit & Unlock Sizes' : 'Save & Lock Sizes'}
                    </Button>
                  </div>
                </div>

                {/* Size Presets */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Presets:</span>
                  {['ALPHA', 'NUMERIC_WAIST', 'KIDS', 'NUMERIC_EURO'].map(k => (
                    <button
                      key={k}
                      type="button"
                      disabled={sizesLocked}
                      onClick={() => handleApplyPreset(k)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        border: sizePresetKey === k ? '1px solid #0284C7' : '1px solid #CBD5E1',
                        background: sizePresetKey === k ? '#E0F2FE' : '#FFFFFF',
                        color: sizePresetKey === k ? '#0369A1' : '#475569',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: sizesLocked ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {k === 'ALPHA' ? 'Alpha XS–XXL' : k === 'NUMERIC_WAIST' ? 'Waist 28–38' : k === 'KIDS' ? 'Kids 92–128' : 'Euro 34–44'}
                    </button>
                  ))}
                </div>

                {/* Size Grid with scroll-wheel protection */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: 8 }}>
                  {sizeList.map((item, idx) => (
                    <div key={idx} style={{ border: '1px solid #CBD5E1', borderRadius: 6, padding: '6px 8px', background: '#F8FAFC' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0F274E' }}>{item.size}</span>
                        {!sizesLocked && sizeList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSize(idx)}
                            style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        disabled={sizesLocked}
                        onWheel={(e) => (e.target as HTMLElement).blur()} // Prevent accidental scroll wheel increment
                        value={item.qty}
                        onChange={(e) => handleUpdateSizeQty(idx, Number(e.target.value) || 0)}
                        style={{
                          width: '100%',
                          textAlign: 'center',
                          padding: '4px',
                          borderRadius: 4,
                          border: '1px solid #CBD5E1',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          background: sizesLocked ? '#F1F5F9' : '#FFFFFF'
                        }}
                      />
                    </div>
                  ))}
                </div>

                {!sizesLocked && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: 8, background: '#F1F5F9', borderRadius: 6 }}>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>+ Add Size:</span>
                    <input
                      type="text"
                      placeholder="e.g. 3XL, 42"
                      value={customSizeInput}
                      onChange={(e) => setCustomSizeInput(e.target.value)}
                      style={{ width: 100, padding: '4px 6px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: '11px' }}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={customQtyInput}
                      onChange={(e) => setCustomQtyInput(e.target.value)}
                      style={{ width: 70, padding: '4px 6px', borderRadius: 4, border: '1px solid #CBD5E1', fontSize: '11px' }}
                    />
                    <Button variant="secondary" size="sm" onClick={handleAddCustomSize}>Add</Button>
                  </div>
                )}
              </div>

              {/* Dispatch Action */}
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" onClick={handleSaveAndDispatch}>
                  <Save size={14} style={{ marginRight: 6 }} />
                  Save & Dispatch Order
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
