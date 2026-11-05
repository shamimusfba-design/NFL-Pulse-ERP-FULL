'use client';

import React, { Suspense, useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Shell from '../../components/Shell';
import demo2000DataRaw from '../../data/demo-2000-master.json';
import { displayJobNo } from '../../lib/display';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { FX_SERIES, FX_BAR, FxResponsiveContainer as ResponsiveContainer } from '../../components/fx';
import {
  Search,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Scissors,
  Shirt,
  Sparkles,
  Truck,
  Box,
  FileCheck,
  Calendar,
  Activity,
  Award,
  ChevronRight,
  TrendingUp,
  Percent,
  Droplet,
  Flame,
  FileSpreadsheet,
} from 'lucide-react';

const COLORS = {
  navy: '#0F274E',
  blue: '#0284C7',
  cyan: '#06B6D4',
  green: '#10B981',
  emerald: '#059669',
  amber: '#F59E0B',
  orange: '#EA580C',
  red: '#EF4444',
  purple: '#8B5CF6',
  indigo: '#6366F1',
  grey: '#64748B',
  lightGrey: '#94A3B8',
  bg: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
};

function fmt(num: any, decimals = 0): string {
  if (num === null || num === undefined || isNaN(num) || num === '') return '0';
  return Number(num).toLocaleString('en-US', { maximumFractionDigits: decimals });
}

function d2(dateStr: any) {
  if (!dateStr || dateStr === '—') return '—';
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const m = d.toLocaleString('en-US', { month: 'short' });
      const yr = String(d.getFullYear()).slice(-2);
      return `${day}-${m}-${yr}`;
    }
  }
  return s.replace(/20(\d{2})/g, '$1');
}

const SUB_SECTIONS = [
  { id: 'section-job-info', label: '1. Job Information', icon: '📋' },
  { id: 'section-planning-input', label: '2. Planning Input', icon: '⏱️' },
  { id: 'section-knitting-input', label: '3. Knitting Input', icon: '⚙️' },
  { id: 'section-dyeing-input', label: '4. Dyeing Input', icon: '🧪' },
  { id: 'section-lab-input', label: '5. Lab Input', icon: '🔬' },
  { id: 'section-testing-lab', label: '6. Testing Lab', icon: '📑' },
  { id: 'section-cutting', label: '7. Cutting', icon: '✂️' },
  { id: 'section-print', label: '8. Print', icon: '🎨' },
  { id: 'section-special-process', label: '9. Temporary & Special Process', icon: '🪡' },
  { id: 'section-sewing-finishing', label: '10. Sewing & Finishing', icon: '👕' },
  { id: 'section-quality', label: '11. Quality & Audits', icon: '✅' },
];

function Job360Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || searchParams.get('jobNo') || '';

  const masterJobs: any[] = useMemo(() => (demo2000DataRaw as any)?.jobs || [], []);
  const [selectedJobNo, setSelectedJobNo] = useState<string>(initialQ ? String(initialQ).trim() : '46755');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>('section-job-info');
  const [activeTestModal, setActiveTestModal] = useState<any | null>(null);

  // Match Job based on selectedJobNo
  const job = useMemo(() => {
    if (!masterJobs.length) return null;
    const clean = String(selectedJobNo || '').toLowerCase().trim();
    const stripped = clean.replace(/^job\s*(#|no\.?|num\.?)?\s*/i, '').replace(/^#\s*/, '').trim();
    return (
      masterJobs.find((j: any) => {
        const jNo = String(j.jobNo || '').toLowerCase().trim();
        const sNo = String(j.styleNo || '').toLowerCase().trim();
        return jNo === clean || jNo === stripped || jNo.includes(stripped) || sNo === clean;
      }) || masterJobs[0]
    );
  }, [selectedJobNo, masterJobs]);

  // Update selected job if query param changes
  useEffect(() => {
    if (initialQ && initialQ !== selectedJobNo) {
      setSelectedJobNo(initialQ);
    }
  }, [initialQ]);

  // Auto-spy scroll listener: as user scrolls, active tab automatically updates
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 140; // offset for sticky navbar
      for (let i = SUB_SECTIONS.length - 1; i >= 0; i--) {
        const sec = document.getElementById(SUB_SECTIONS[i].id);
        if (sec) {
          const top = sec.offsetTop;
          if (scrollPos >= top) {
            setActiveSectionId(SUB_SECTIONS[i].id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll to section when button clicked
  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90; // offset for sticky bar
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Search filter
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return masterJobs.slice(0, 10);
    const q = searchQuery.toLowerCase().trim();
    return masterJobs
      .filter((j: any) => {
        const jNo = String(j.jobNo || '').toLowerCase();
        const b = String(j.buyer || '').toLowerCase();
        const s = String(j.styleNo || '').toLowerCase();
        const it = String(j.item || '').toLowerCase();
        return jNo.includes(q) || b.includes(q) || s.includes(q) || it.includes(q);
      })
      .slice(0, 12);
  }, [searchQuery, masterJobs]);

  if (!job) {
    return (
      <Shell title="Job 360" eyebrow="Manufacturing Intelligence Control Tower">
        <div style={{ padding: '60px', textAlign: 'center', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <h3>Loading Job Intelligence...</h3>
        </div>
      </Shell>
    );
  }

  // Quantities & Calculations
  const oq = Number(job.orderQty) || 6501;
  const isShipped = job.presentStatus === 'Shipped' || job.overallStage === 'Shipment';
  const sewQty = Number(job.sewing?.sewingActualQty) || (isShipped ? oq : Math.round(oq * 0.94));
  const cutQty = Number(job.cutting?.cutQty || job.cutting?.cutDone) || (isShipped ? oq : Math.round(oq * 1.02));
  const printQty = Number(job.printEmb?.printActualQty) || (job.printEmb ? Math.round(oq * 0.98) : 0);
  const embQty = Number(job.printEmb?.embActualQty) || (job.printEmb ? Math.round(oq * 0.95) : 0);
  const shipQty = Number(job.shipment?.shipQty) || (isShipped ? oq : 0);

  const fabReq = Number(job.fabric?.fabricReqKg) || Math.round(oq * 0.24);
  const fabRecv = Number(job.fabric?.fabricReceivedKg) || Math.round(fabReq * 0.98);
  const fabBal = Math.max(0, fabReq - fabRecv);

  const knitReq = Number(job.knitting?.greyReqKg) || Math.round(fabReq * 1.05);
  const knitDone = Number(job.knitting?.greyProducedKg) || (isShipped ? knitReq : Math.round(knitReq * 0.99));
  const knitBal = Math.max(0, knitReq - knitDone);

  const dyeReq = fabReq;
  const dyeDone = isShipped ? dyeReq : Math.round(dyeReq * 0.96);
  const dyeBal = Math.max(0, dyeReq - dyeDone);

  const cutBal = Math.max(0, oq - cutQty);
  const sewBal = Math.max(0, oq - sewQty);
  const shipBal = Math.max(0, oq - shipQty);

  // IE & Industrial Engineering
  const smv = Number(job.ie?.smv) || 7.8;
  const machineQty = Number(job.ie?.machineQty) || 22;
  const manpower = Number(job.ie?.manpower) || 32;
  const targetPerHour = Number(job.ie?.targetPerHour) || Math.round((60 / smv) * machineQty * 0.75);
  const dailyTarget = Number(job.ie?.dailyTarget) || targetPerHour * 10;

  // Garment Illustration
  const itemType = String(job.item || job.itemDescription || 'T-Shirt').toLowerCase();
  const isPolo = itemType.includes('polo');
  const isHoodie = itemType.includes('hood') || itemType.includes('fleece');
  const isSweat = itemType.includes('sweat') || itemType.includes('crew');
  const isPant = itemType.includes('pant') || itemType.includes('bottom') || itemType.includes('jogger');

  const primaryColor = job.fabric?.colors || 'Black Beauty';
  const colorList = [
    { name: primaryColor, code: '#1E293B', share: 0.55 },
    { name: 'Heather Grey', code: '#94A3B8', share: 0.25 },
    { name: 'Navy Blue', code: '#1E3A8A', share: 0.20 },
  ];

  // Testing Lab Results
  const labTests = [
    { id: 'LT-01', name: 'Color Fastness to Washing', method: 'ISO 105-C06 (40°C)', spec: 'Min Grade 4.0', score: 'Grade 4-5', status: 'PASS', remarks: 'Zero color bleeding onto multi-fiber adjacent' },
    { id: 'LT-02', name: 'Color Fastness to Rubbing (Dry/Wet)', method: 'ISO 105-X12 Crockmeter', spec: 'Dry ≥ 4.0, Wet ≥ 3.5', score: 'Dry: 4-5 | Wet: 4.0', status: 'PASS', remarks: 'Meets buyer export standard' },
    { id: 'LT-03', name: 'Martindale Pilling Resistance', method: 'ISO 12945-2 (2,000 revs)', spec: 'Min Grade 3-4', score: 'Grade 4.0', status: 'PASS', remarks: 'Smooth surface, no fuzz ball formation' },
    { id: 'LT-04', name: 'Dimensional Stability / Shrinkage', method: 'ISO 6330 3 Cycles at 40°C', spec: 'Length ±4.0%, Width ±3.0%', score: 'Length: -2.4% | Width: -1.2%', status: 'PASS', remarks: 'Controlled with stenter heat-set' },
    { id: 'LT-05', name: 'Bursting Strength', method: 'ASTM D3786 Diaphragm', spec: 'Min 280 kPa', score: '342 kPa', status: 'PASS', remarks: 'High knit loop tensile strength' },
    { id: 'LT-06', name: 'Fiber Composition Analysis', method: 'AATCC 20A Quantitative', spec: '100% Combed Cotton', score: '100% Cotton (Verified)', status: 'PASS', remarks: 'Complies with care label' },
    { id: 'LT-07', name: 'pH Value & Free Formaldehyde', method: 'ISO 3071 / ISO 14184-1', spec: 'pH 4.0-7.5, Formaldehyde < 16ppm', score: 'pH: 6.5 | Formaldehyde: ND', status: 'PASS', remarks: 'OEKO-TEX Standard 100 Class 1' },
  ];

  // Pre-cutting Fabric Shrinkage Report
  const shrinkageData = [
    { color: primaryColor, steamL: '-2.2%', steamW: '-1.1%', tumbleL: '-2.8%', tumbleW: '-1.5%', markerLengthAdj: '+2.9%', markerWidthAdj: '+1.6%', status: 'CLEARED' },
    { color: 'Heather Grey', steamL: '-2.5%', steamW: '-1.3%', tumbleL: '-3.1%', tumbleW: '-1.7%', markerLengthAdj: '+3.2%', markerWidthAdj: '+1.8%', status: 'CLEARED' },
    { color: 'Navy Blue', steamL: '-2.1%', steamW: '-1.0%', tumbleL: '-2.6%', tumbleW: '-1.4%', markerLengthAdj: '+2.7%', markerWidthAdj: '+1.5%', status: 'CLEARED' },
  ];

  // Section-Wise Inspection Reports
  const sectionInspections = [
    { section: '1. Fabric Store Inspection', std: '4-Point System (ASTM D5430)', inspected: `${fmt(fabRecv)} kg (18 rolls)`, defectCount: 14, dhu: '1.2 pts/100 yd', majorDefects: 'Slub (6), Thick-thin (5), Fly yarn (3)', result: 'PASSED', auditor: 'Zahid Hossain (Sr. Fabric QC)' },
    { section: '2. Cutting Inspection', std: 'Bundle & Notch Audit', inspected: `${fmt(cutQty)} pcs (42 bundles)`, defectCount: 8, dhu: '0.19%', majorDefects: 'Pattern notch shift (5), Bow cut (3)', result: 'PASSED', auditor: 'Mominul Islam (Cutting QC)' },
    { section: '3. Printing Inspection', std: 'AATCC Crock & Wash Wash', inspected: `${fmt(printQty)} pcs`, defectCount: 11, dhu: '0.22%', majorDefects: 'Registration shift (6), Pin hole (5)', result: 'PASSED', auditor: 'Farid Ahmed (Print QC)' },
    { section: '4. Embroidery Inspection', std: 'Stitch Density & Alignment', inspected: `${fmt(embQty)} pcs`, defectCount: 6, dhu: '0.15%', majorDefects: 'Thread break (4), Puckering (2)', result: 'PASSED', auditor: 'Md. Dulal (Emb QC)' },
    { section: '5. Sewing In-Line Inspection', std: 'Traffic Light 7-Bundle System', inspected: '3,850 pcs', defectCount: 42, dhu: '1.09%', majorDefects: 'Skip stitch (18), Raw edge (14), Puckering (10)', result: 'PASSED', auditor: 'Shamima Akter (Line QC In-charge)' },
    { section: '6. Finishing 100% Inspection', std: '100% Garment Inspection', inspected: `${fmt(sewQty)} pcs`, defectCount: 28, dhu: '0.43%', majorDefects: 'Uncut thread (18), Spot mark (10 - rectified)', result: 'PASSED', auditor: 'Kamrul Hassan (Finishing In-charge)' },
  ];

  // Trims Table
  const trimsTable = [
    { item: 'Main Damask Neck Label', supplier: 'Avery Dennison BD', required: oq, inHouse: oq, balance: 0, status: '100% IN-HOUSE', approval: 'APPROVED' },
    { item: 'Satin Care / Content Label', supplier: 'Paxar Bangladesh', required: oq, inHouse: oq, balance: 0, status: '100% IN-HOUSE', approval: 'APPROVED' },
    { item: 'Buyer Brand Hangtag + Wax Cord', supplier: 'Avery Dennison BD', required: oq, inHouse: oq, balance: 0, status: '100% IN-HOUSE', approval: 'APPROVED' },
    { item: 'Barcode Price Ticket / Sticker', supplier: 'Buyer Nominated', required: oq, inHouse: oq, balance: 0, status: '100% IN-HOUSE', approval: 'APPROVED' },
    { item: 'Individual Poly Bag (Self-Adhesive)', supplier: 'Local Standard Pack', required: Math.round(oq * 1.03), inHouse: Math.round(oq * 1.03), balance: 0, status: '100% IN-HOUSE', approval: 'APPROVED' },
    { item: 'Spun Polyester Sewing Thread 40/2', supplier: 'Coats Bangladesh', required: `${Math.round(oq * 0.12)} Cones`, inHouse: `${Math.round(oq * 0.12)} Cones`, balance: '0 Cones', status: '100% IN-HOUSE', approval: 'APPROVED' },
    { item: '1x1 Combed Cotton Spandex Rib', supplier: 'NFL In-House Knitting', required: `${Math.round(fabReq * 0.08)} kg`, inHouse: `${Math.round(fabReq * 0.08)} kg`, balance: '0 kg', status: '100% IN-HOUSE', approval: 'APPROVED' },
    { item: '7-Ply Heavy Export Carton Box', supplier: 'In-House Corrugated', required: Math.ceil(oq / 24), inHouse: Math.ceil(oq / 24), balance: 0, status: '100% IN-HOUSE', approval: 'APPROVED' },
  ];

  // PO Breakdown
  const poBreakdown = [
    { po: `PO-${job.jobNo}-EUR01`, destination: 'Germany 🇩🇪', port: 'Hamburg Port', terms: 'FOB Chittagong', qty: Math.round(oq * 0.45), cartons: Math.ceil((oq * 0.45) / 24), shipDate: job.dates?.exFactory || '05-Aug-2026', status: 'COMPLETED' },
    { po: `PO-${job.jobNo}-EUR02`, destination: 'France 🇫🇷', port: 'Le Havre Port', terms: 'FOB Chittagong', qty: Math.round(oq * 0.30), cartons: Math.ceil((oq * 0.30) / 24), shipDate: job.dates?.exFactory || '05-Aug-2026', status: 'COMPLETED' },
    { po: `PO-${job.jobNo}-EUR03`, destination: 'United Kingdom 🇬🇧', port: 'Felixstowe Port', terms: 'FOB Chittagong', qty: Math.round(oq * 0.25), cartons: Math.ceil((oq * 0.25) / 24), shipDate: job.dates?.exFactory || '07-Aug-2026', status: 'COMPLETED' },
  ];

  // TNA Milestones
  const tnaMilestones = [
    { step: '1. Master Order Booking & CAD Tech Pack', planStart: '22-Jan-2026', planEnd: '28-Jan-2026', actualStart: '22-Jan-2026', actualEnd: '27-Jan-2026', status: 'COMPLETED', lead: 'CAD & Merch' },
    { step: '2. Lab Dip / Color Shade Approval', planStart: '29-Jan-2026', planEnd: '14-Feb-2026', actualStart: '28-Jan-2026', actualEnd: '12-Feb-2026', status: 'COMPLETED', lead: 'Dyeing Lab' },
    { step: '3. Yarn Booking, In-House & Quality Clearance', planStart: '15-Feb-2026', planEnd: '05-Mar-2026', actualStart: '15-Feb-2026', actualEnd: '03-Mar-2026', status: 'COMPLETED', lead: 'Yarn Store' },
    { step: '4. Knitting Execution & Weight Audit', planStart: '06-Mar-2026', planEnd: '28-Mar-2026', actualStart: '05-Mar-2026', actualEnd: '26-Mar-2026', status: 'COMPLETED', lead: 'Knitting Dept' },
    { step: '5. Dyeing & Finishing Process', planStart: '01-Apr-2026', planEnd: '25-Apr-2026', actualStart: '01-Apr-2026', actualEnd: '23-Apr-2026', status: 'COMPLETED', lead: 'Dyeing Dept' },
    { step: '6. Bulk Fabric Store Delivery & Shrinkage Test', planStart: '26-Apr-2026', planEnd: '05-May-2026', actualStart: '25-Apr-2026', actualEnd: '03-May-2026', status: 'COMPLETED', lead: 'Fabric Quality' },
    { step: '7. PP Sample Approval & Buyer Comments', planStart: '06-May-2026', planEnd: '20-May-2026', actualStart: '05-May-2026', actualEnd: '18-May-2026', status: 'COMPLETED', lead: 'Sample Room' },
    { step: '8. Trims & Accessories 100% In-House Check', planStart: '21-May-2026', planEnd: '10-Jun-2026', actualStart: '20-May-2026', actualEnd: '08-Jun-2026', status: 'COMPLETED', lead: 'Trims Store' },
    { step: '9. Bulk Cutting & Bundle Preparation', planStart: job.dates?.cuttingStart || '10-Jul-2026', planEnd: job.dates?.cuttingEnd || '13-Jul-2026', actualStart: '10-Jul-2026', actualEnd: '12-Jul-2026', status: 'COMPLETED', lead: 'Cutting Floor' },
    { step: '10. Printing & Embroidery Execution', planStart: '12-Jul-2026', planEnd: '15-Jul-2026', actualStart: '12-Jul-2026', actualEnd: '15-Jul-2026', status: 'COMPLETED', lead: 'Print & Emb' },
    { step: '11. Sewing Line Production Execution', planStart: job.dates?.sewingStart || '15-Jul-2026', planEnd: job.dates?.sewingEnd || '18-Jul-2026', actualStart: '15-Jul-2026', actualEnd: '18-Jul-2026', status: 'COMPLETED', lead: 'Sewing Line 14B' },
    { step: '12. Finishing, AQL 1.5 Audit & Ex-Factory Cargo', planStart: job.dates?.exFactory || '05-Aug-2026', planEnd: job.dates?.cargoClosing || '07-Aug-2026', actualStart: '04-Aug-2026', actualEnd: '05-Aug-2026', status: 'COMPLETED', lead: 'Quality & Shipping' },
  ];

  // Hourly Sewing Production Chart
  const hourlySewingData = [
    { hour: '08:00', target: targetPerHour, actual: Math.round(targetPerHour * 0.95) },
    { hour: '09:00', target: targetPerHour, actual: Math.round(targetPerHour * 1.02) },
    { hour: '10:00', target: targetPerHour, actual: Math.round(targetPerHour * 1.05) },
    { hour: '11:00', target: targetPerHour, actual: Math.round(targetPerHour * 1.00) },
    { hour: '12:00', target: targetPerHour, actual: Math.round(targetPerHour * 0.98) },
    { hour: '14:00', target: targetPerHour, actual: Math.round(targetPerHour * 1.06) },
    { hour: '15:00', target: targetPerHour, actual: Math.round(targetPerHour * 1.04) },
    { hour: '16:00', target: targetPerHour, actual: Math.round(targetPerHour * 1.01) },
    { hour: '17:00', target: targetPerHour, actual: Math.round(targetPerHour * 0.96) },
    { hour: '18:00', target: targetPerHour, actual: Math.round(targetPerHour * 0.94) },
  ];

  const handleExportCsv = () => {
    const csvRows = [
      ['JOB 360 COMPREHENSIVE MANUFACTURING REPORT'],
      ['Job No', job.jobNo, 'Buyer', job.buyer, 'Style', job.styleNo],
      ['Order Qty', oq, 'Merchandiser', job.merchandiser, 'Ex-Factory', job.dates?.exFactory],
      [''],
      ['SECTION 1: CORE IE SPECIFICATIONS'],
      ['SMV', smv, 'Machine Qty', machineQty, 'Line Manpower', manpower, 'Daily Target', dailyTarget],
      [''],
      ['SECTION 2: TRIMS & ACCESSORIES STATUS'],
      ['Item', 'Supplier', 'Required', 'In-House', 'Balance', 'Status', 'Approval'],
      ...trimsTable.map((t) => [t.item, t.supplier, t.required, t.inHouse, t.balance, t.status, t.approval]),
      [''],
      ['SECTION 3: TESTING LAB RESULTS'],
      ['Test', 'Method', 'Spec', 'Result', 'Status'],
      ...labTests.map((t) => [t.name, t.method, t.spec, t.score, t.status]),
    ];
    const csvContent = csvRows.map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Job_360_${job.jobNo}_Full_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Shell
      title={`Job 360 · ${displayJobNo(job.jobNo, job.buyer)} · ${job.styleNo}`}
      eyebrow={`Single-Page Scroll-Spy Master Intelligence Control Tower · ${job.buyer} · ${job.lineAllocation?.factory || 'NFL'} ${job.lineAllocation?.floor || 'Floor 1'}`}
    >
      <div style={{ background: COLORS.bg, minHeight: '100vh', padding: '0 0 40px' }}>
        
        {/* TOP JOB SWITCHER & QUICK SEARCH */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '10px',
          border: `1px solid ${COLORS.border}`,
          padding: '12px 16px',
          marginBottom: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Quick Search */}
          <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#F8FAFC',
              border: `1px solid ${isSearchOpen ? COLORS.blue : COLORS.border}`,
              borderRadius: '8px',
              padding: '6px 12px'
            }}>
              <Search size={16} color={COLORS.grey} />
              <input
                type="text"
                placeholder="Switch to Job # (e.g. 48092, 46755, 48085)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: COLORS.navy,
                  width: '100%'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: COLORS.grey, fontSize: '13px' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown Hits */}
            {isSearchOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  background: '#FFFFFF',
                  borderRadius: '8px',
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  zIndex: 60,
                  maxHeight: '280px',
                  overflowY: 'auto'
                }}
              >
                <div style={{ padding: '6px 12px', fontSize: '10.5px', fontWeight: 800, color: COLORS.grey, background: '#F8FAFC', borderBottom: `1px solid ${COLORS.border}` }}>
                  MATCHING MASTER JOBS ({searchResults.length})
                </div>
                {searchResults.map((j: any) => (
                  <div
                    key={j.jobNo}
                    onClick={() => {
                      setSelectedJobNo(j.jobNo);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #F1F5F9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      background: j.jobNo === job.jobNo ? '#F0F9FF' : 'transparent'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = j.jobNo === job.jobNo ? '#F0F9FF' : 'transparent')}
                  >
                    <div>
                      <strong style={{ color: COLORS.navy }}>Job #{j.jobNo}</strong> · <span style={{ color: COLORS.blue, fontWeight: 700 }}>{j.buyer}</span>
                      <div style={{ fontSize: '10.5px', color: COLORS.grey }}>{j.styleNo} · {j.item || j.itemDescription}</div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: COLORS.grey }}>
                      {fmt(j.orderQty)} pcs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Jump Job Pills */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: COLORS.grey }}>Quick Switch:</span>
            {['46755', '48092', '48085', '48061', '22041'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => {
                  setSelectedJobNo(num);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '5px',
                  border: job.jobNo === num ? `1px solid ${COLORS.blue}` : `1px solid ${COLORS.border}`,
                  background: job.jobNo === num ? '#EFF6FF' : '#FFFFFF',
                  color: job.jobNo === num ? COLORS.blue : COLORS.navy,
                  fontSize: '11px',
                  fontWeight: 750,
                  cursor: 'pointer'
                }}
              >
                #{num}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleExportCsv}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: `1px solid ${COLORS.border}`,
                background: '#FFFFFF',
                color: COLORS.navy,
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: COLORS.navy,
                color: '#FFFFFF',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <Printer size={14} /> Print Dossier
            </button>
          </div>
        </div>

        {/* STICKY SUB-SECTIONS NAVIGATION BAR (AUTO-SPY ACTIVE) */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 45,
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '8px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          marginBottom: '16px',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}>
          {SUB_SECTIONS.map((sec) => {
            const isCurrent = activeSectionId === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 13px',
                  borderRadius: '6px',
                  border: isCurrent ? `1px solid ${COLORS.blue}` : `1px solid ${COLORS.border}`,
                  background: isCurrent ? COLORS.navy : '#F8FAFC',
                  color: isCurrent ? '#FFFFFF' : COLORS.navy,
                  fontWeight: isCurrent ? 800 : 650,
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  boxShadow: isCurrent ? '0 2px 4px rgba(15,39,78,0.15)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{sec.icon}</span>
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 1: JOB INFORMATION */}
        {/* ========================================================================= */}
        <div
          id="section-job-info"
          style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            scrollMarginTop: '80px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#0F274E', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontWeight: 900, fontSize: '15px' }}>
                JOB #{job.jobNo}
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                  1. Job Information · {job.buyer} · Style: {job.styleNo}
                </h2>
                <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                  {job.itemDescription || 'Garment Item'} · Merchandiser: <strong style={{ color: COLORS.navy }}>{job.merchandiser || 'Md. Imran'}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                background: isShipped ? '#DCFCE7' : '#E0F2FE',
                color: isShipped ? COLORS.green : COLORS.blue
              }}>
                ● {isShipped ? 'SHIPPED COMPLETED' : 'IN PRODUCTION EXECUTION'}
              </span>
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                background: job.riskStatus === 'CRITICAL' ? '#FEE2E2' : '#F0FDF4',
                color: job.riskStatus === 'CRITICAL' ? COLORS.red : COLORS.emerald
              }}>
                {job.riskStatus === 'CRITICAL' ? '⚠️ High Delivery Risk' : '✓ Normal On-Time Schedule'}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr 270px', gap: '16px', alignItems: 'stretch', marginBottom: '16px' }}>
            {/* Garment Image Card */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: '8px',
              border: `1px solid ${COLORS.border}`,
              padding: '12px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <div style={{
                width: '100px',
                height: '110px',
                borderRadius: '6px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                marginBottom: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
              }}>
                {isPolo ? '👕' : isHoodie ? '🧥' : isSweat ? '🎽' : isPant ? '👖' : '👕'}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: COLORS.navy }}>
                {job.item || 'T-Shirt'}
              </div>
              <div style={{ fontSize: '9.5px', color: COLORS.grey, marginTop: '2px' }}>
                Primary: {primaryColor}
              </div>
            </div>

            {/* Core Spec Attributes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: COLORS.grey, textTransform: 'uppercase' }}>Total Order Quantity</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(oq)} <span style={{ fontSize: '11px', color: COLORS.grey }}>pcs</span></div>
                <div style={{ fontSize: '11px', color: COLORS.blue, fontWeight: 650 }}>FOB: ${Number(job.fobPrice || 3.85).toFixed(2)} · Value: ${fmt(oq * Number(job.fobPrice || 3.85))}</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: COLORS.grey, textTransform: 'uppercase' }}>Fabric Construction &amp; GSM</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: COLORS.navy, margin: '2px 0' }}>{job.fabric?.fabricType || 'Single Jersey'} {job.fabric?.gsm || '180'} GSM</div>
                <div style={{ fontSize: '11px', color: COLORS.grey }}>Width/Dia: {job.fabric?.widthDia || '72"'} · Comp: 100% Cotton</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: COLORS.grey, textTransform: 'uppercase' }}>Artwork &amp; Embellishment</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.purple, margin: '2px 0' }}>{job.printEmb?.description || 'Chest Waterbase Print + Back Label'}</div>
                <div style={{ fontSize: '11px', color: COLORS.grey }}>Type: {job.printEmb?.type || 'Screen Print'} · Colors: 3</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: COLORS.grey, textTransform: 'uppercase' }}>Ex-Factory &amp; Cargo Date</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: COLORS.blue, margin: '2px 0' }}>{d2(job.dates?.exFactory || '05-Aug-2026')}</div>
                <div style={{ fontSize: '11px', color: COLORS.grey }}>PO Recv: {d2(job.dates?.poReceived)} · Cut: {d2(job.dates?.cuttingStart)}</div>
              </div>
            </div>

            {/* Industrial Engineering (IE) Data */}
            <div style={{ background: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: COLORS.blue, marginBottom: '6px' }}>
                <Activity size={14} /> INDUSTRIAL ENGINEERING (IE)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                <span style={{ color: COLORS.grey }}>Garment SMV:</span>
                <strong style={{ color: COLORS.navy }}>{smv} min</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                <span style={{ color: COLORS.grey }}>Required Machines:</span>
                <strong style={{ color: COLORS.navy }}>{machineQty} machines</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                <span style={{ color: COLORS.grey }}>Line Manpower:</span>
                <strong style={{ color: COLORS.navy }}>{manpower} ops + helpers</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                <span style={{ color: COLORS.grey }}>Target / Hour:</span>
                <strong style={{ color: COLORS.blue }}>{targetPerHour} pcs/hr</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', paddingTop: '4px', borderTop: '1px solid #DBEAFE' }}>
                <span style={{ color: COLORS.grey }}>Daily Target:</span>
                <strong style={{ color: COLORS.green }}>{fmt(dailyTarget)} pcs/day</strong>
              </div>
            </div>
          </div>

          {/* PO Breakdown Table */}
          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                  <th style={{ padding: '8px 10px' }}>Buyer PO Number</th>
                  <th style={{ padding: '8px 10px' }}>Destination Country</th>
                  <th style={{ padding: '8px 10px' }}>Discharge Port</th>
                  <th style={{ padding: '8px 10px' }}>Terms</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>PO Quantity</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Cartons</th>
                  <th style={{ padding: '8px 10px' }}>Ex-Factory Date</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {poBreakdown.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.blue }}>{p.po}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 650 }}>{p.destination}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{p.port}</td>
                    <td style={{ padding: '8px 10px' }}>{p.terms}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>{fmt(p.qty)} pcs</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: COLORS.grey }}>{fmt(p.cartons)} ctn</td>
                    <td style={{ padding: '8px 10px', color: COLORS.navy, fontWeight: 700 }}>{d2(p.shipDate)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: COLORS.green }}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 2: PLANNING INPUT */}
        {/* ========================================================================= */}
        <div
          id="section-planning-input"
          style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            scrollMarginTop: '80px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                2. Planning Input · Time &amp; Action (T&amp;A) Milestone Schedule
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Backward scheduling, slack day tracking and section handover dates
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ TNA SCHEDULE APPROVED &amp; RELEASED
            </span>
          </div>

          {/* Planning KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>TOTAL MILESTONES</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>12 / 12</div>
              <div style={{ fontSize: '11.5px', color: COLORS.green, fontWeight: 600 }}>100% Executed</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>CRITICAL PATH SLACK</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.blue, margin: '2px 0' }}>+2.0 Days</div>
              <div style={{ fontSize: '11.5px', color: COLORS.blue, fontWeight: 600 }}>Zero Delay Risk</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>SEWING LINE SLOT</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.orange, margin: '2px 0' }}>{job.lineAllocation?.line || 'Line 14B'}</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>{job.lineAllocation?.floor || 'Floor 1'}</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>PP SAMPLE GATE</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.purple, margin: '2px 0' }}>APPROVED</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>Buyer sign-off in-hand</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                  <th style={{ padding: '8px 10px' }}>Milestone Activity</th>
                  <th style={{ padding: '8px 10px' }}>Planned Start</th>
                  <th style={{ padding: '8px 10px' }}>Planned End</th>
                  <th style={{ padding: '8px 10px' }}>Actual Start</th>
                  <th style={{ padding: '8px 10px' }}>Actual End</th>
                  <th style={{ padding: '8px 10px' }}>Responsible Lead</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {tnaMilestones.map((m, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.navy }}>{m.step}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{m.planStart}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{m.planEnd}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.navy, fontWeight: 700 }}>{m.actualStart}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.navy, fontWeight: 700 }}>{m.actualEnd}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.blue, fontWeight: 600 }}>{m.lead}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: COLORS.green }}>
                        ✓ {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 3: KNITTING INPUT */}
        {/* ========================================================================= */}
        <div
          id="section-knitting-input"
          style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            scrollMarginTop: '80px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                3. Knitting Input · Yarn In-House, Grey Production &amp; Machine Logs
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Circular knitting execution, roll weight tracking and knitting floor allocation
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ KNITTING COMPLETED
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>YARN REQUIRED</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(knitReq)} kg</div>
              <div style={{ fontSize: '11.5px', color: COLORS.green, fontWeight: 600 }}>100% In-House</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>GREY FABRIC KNITTED</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.blue, margin: '2px 0' }}>{fmt(knitDone)} kg</div>
              <div style={{ fontSize: '11.5px', color: COLORS.blue, fontWeight: 600 }}>Total 134 Rolls Produced</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>KNITTING BALANCE</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: knitBal === 0 ? COLORS.green : COLORS.red, margin: '2px 0' }}>{fmt(knitBal)} kg</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>0 kg Remaining</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>KNIT QUALITY RATING</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>99.2%</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>Zero Lycra Drop Defects</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                  <th style={{ padding: '8px 10px' }}>Knitting Machine</th>
                  <th style={{ padding: '8px 10px' }}>Dia × Gauge</th>
                  <th style={{ padding: '8px 10px' }}>Yarn Lot &amp; Count</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Target Kg</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Produced Kg</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rolls</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Shift Output</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { m: 'M-08 (Orizio)', dia: '30" × 24GG', yarn: '30/1 Combed Cotton (Lot 8921)', target: Math.round(knitReq * 0.55), done: Math.round(knitReq * 0.55), rolls: 74, shift: 'Day + Night', st: 'COMPLETED' },
                  { m: 'M-12 (Mayer & Cie)', dia: '34" × 24GG', yarn: '30/1 Combed Cotton (Lot 8921)', target: Math.round(knitReq * 0.45), done: Math.round(knitReq * 0.45), rolls: 60, shift: 'Day + Night', st: 'COMPLETED' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.navy }}>{row.m}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{row.dia}</td>
                    <td style={{ padding: '8px 10px' }}>{row.yarn}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{fmt(row.target)} kg</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: COLORS.green, fontWeight: 700 }}>{fmt(row.done)} kg</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.rolls}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{row.shift}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: COLORS.green }}>
                        {row.st}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 4: DYEING INPUT */}
        {/* ========================================================================= */}
        <div
          id="section-dyeing-input"
          style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            scrollMarginTop: '80px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                4. Dyeing Input · Batching, Dyeing Execution &amp; Stenter Finishing
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Batch cards, liquor ratio, dye machine allocation and stenter finishing parameters
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ DYEING COMPLETED &amp; FINISHED
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>DYEING DEMAND</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(dyeReq)} kg</div>
              <div style={{ fontSize: '11.5px', color: COLORS.blue, fontWeight: 600 }}>Finish Fabric Spec</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>DELIVERY TO STORE</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>{fmt(dyeDone)} kg</div>
              <div style={{ fontSize: '11.5px', color: COLORS.green, fontWeight: 600 }}>100% Quality Inspected</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>DYEING BALANCE</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: dyeBal === 0 ? COLORS.green : COLORS.red, margin: '2px 0' }}>{fmt(dyeBal)} kg</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>0 kg Remaining</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>BATCH NO(S)</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: COLORS.navy, margin: '6px 0' }}>{job.fabric?.dyeBatchNo || '106250 · 106180'}</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>Stenter Temp: 180°C</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                  <th style={{ padding: '8px 10px' }}>Batch No</th>
                  <th style={{ padding: '8px 10px' }}>Color Shade</th>
                  <th style={{ padding: '8px 10px' }}>Dye Vessel</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Batch Weight</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Dyeing Cycle</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Delta-E (CMC)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Finishing Stenter</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { b: 'B-106250', col: primaryColor, m: 'Sclavos 1000kg (V-03)', wt: 1020, cycle: '5.5 hrs', de: '0.38 (Pass)', stenter: '180°C · 22 m/min', st: 'DELIVERED OK' },
                  { b: 'B-106180', col: primaryColor, m: 'Sclavos 1000kg (V-04)', wt: 1010, cycle: '5.4 hrs', de: '0.42 (Pass)', stenter: '180°C · 22 m/min', st: 'DELIVERED OK' },
                  { b: 'B-106179', col: primaryColor, m: 'Thies 1000kg (V-01)', wt: 900, cycle: '5.2 hrs', de: '0.40 (Pass)', stenter: '180°C · 22 m/min', st: 'DELIVERED OK' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.blue }}>{row.b}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>{row.col}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{row.m}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{fmt(row.wt)} kg</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.cycle}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: COLORS.green, fontWeight: 750 }}>{row.de}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{row.stenter}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: COLORS.green }}>
                        {row.st}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 5: LAB INPUT */}
        {/* ========================================================================= */}
        <div
          id="section-lab-input"
          style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            scrollMarginTop: '80px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                5. Lab Input · Dyeing Recipe Formulation &amp; Spectrophotometer Shade Matching
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Lab dip strike-off approvals, Datacolor spectrophotometer CMC readings and light box testing
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ BUYER SHADE APPROVED (OPTION B)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>LAB DIP OPTIONS</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>A, B, C, D</div>
              <div style={{ fontSize: '11.5px', color: COLORS.blue, fontWeight: 600 }}>Option B Selected</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>SPECTRO DELTA-E</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>0.36 CMC</div>
              <div style={{ fontSize: '11.5px', color: COLORS.green, fontWeight: 600 }}>Tolerance &lt; 0.60</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>PRIMARY ILLUMINANT</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>D65 Daylight</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>Secondary: CWF &amp; TL84</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>METAMERISM INDEX</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>0.14</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>Zero Shade Flare</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                  <th style={{ padding: '8px 10px' }}>Lab Dip Code</th>
                  <th style={{ padding: '8px 10px' }}>Color Name</th>
                  <th style={{ padding: '8px 10px' }}>Dyestuff Brand</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>dE CMC</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>dL*</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>da*</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>db*</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Buyer Verdict</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: 'LD-46755-A', col: primaryColor, dye: 'Huntsman Novacron', de: '0.68', dl: '+0.42', da: '-0.32', db: '+0.44', st: 'REJECTED' },
                  { code: 'LD-46755-B', col: primaryColor, dye: 'Huntsman Novacron', de: '0.36', dl: '+0.12', da: '-0.10', db: '+0.14', st: 'APPROVED 1ST CHOICE' },
                  { code: 'LD-46755-C', col: primaryColor, dye: 'Dystar Levafix', de: '0.54', dl: '-0.24', da: '+0.18', db: '-0.22', st: 'BACKUP OK' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.blue }}>{row.code}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>{row.col}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{row.dye}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: row.st.includes('APPROVED') ? COLORS.green : COLORS.navy }}>{row.de}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{row.dl}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{row.da}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{row.db}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: row.st.includes('APPROVED') ? '#DCFCE7' : row.st.includes('REJECTED') ? '#FEE2E2' : '#F1F5F9',
                        color: row.st.includes('APPROVED') ? COLORS.green : row.st.includes('REJECTED') ? COLORS.red : COLORS.grey
                      }}>
                        {row.st}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 6: TESTING LAB */}
        {/* ========================================================================= */}
        <div
          id="section-testing-lab"
          style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            scrollMarginTop: '80px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                6. Testing Lab · Physical &amp; Chemical Test Certificates (View &amp; Download)
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Accredited in-house ISO / AATCC physical and chemical testing laboratory results
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveTestModal(labTests[0])}
                style={{ fontSize: '11px', fontWeight: 700, color: COLORS.blue, background: '#E0F2FE', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
              >
                📄 View Official Certificate
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                style={{ fontSize: '11px', fontWeight: 700, color: COLORS.navy, background: '#F1F5F9', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
              >
                📊 Download Lab Excel (.csv)
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                  <th style={{ padding: '8px 10px' }}>Test Code &amp; Parameter</th>
                  <th style={{ padding: '8px 10px' }}>Standard Method</th>
                  <th style={{ padding: '8px 10px' }}>Buyer Specification</th>
                  <th style={{ padding: '8px 10px' }}>Achieved Result / Rating</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Verdict</th>
                  <th style={{ padding: '8px 10px' }}>Remarks / Observation</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Certificate</th>
                </tr>
              </thead>
              <tbody>
                {labTests.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.navy }}>
                      <span style={{ color: COLORS.blue }}>[{t.id}]</span> {t.name}
                    </td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{t.method}</td>
                    <td style={{ padding: '8px 10px' }}>{t.spec}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.navy }}>{t.score}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 900, padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: COLORS.green }}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey, fontSize: '11px' }}>{t.remarks}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setActiveTestModal(t)}
                        style={{
                          border: 'none',
                          background: '#F0F9FF',
                          color: COLORS.blue,
                          fontWeight: 750,
                          fontSize: '10.5px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        View Cert
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 7: CUTTING */}
        {/* ========================================================================= */}
        <div
          id="section-cutting"
          style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            scrollMarginTop: '80px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                7. Cutting · Pre-Cutting Shrinkage Calibration, Marker &amp; Bundle Generation
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Steam and tumble shrinkage tests, marker width/length adjustments and cut bundle generation
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ CUTTING COMPLETED (102.1% YIELD)
            </span>
          </div>

          {/* Pre-Cutting Fabric Shrinkage Table */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 750, color: COLORS.navy, marginBottom: '6px' }}>
              Color-Wise Steam &amp; Tumble Shrinkage Calibration (Marker Expansion Specs)
            </div>
            <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                    <th style={{ padding: '8px 10px' }}>Fabric Color Lot</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Steam Shrinkage (L)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Steam Shrinkage (W)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Tumble Shrinkage (L)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Tumble Shrinkage (W)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>CAD Marker Length Adj.</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>CAD Marker Width Adj.</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Cutting Clearance</th>
                  </tr>
                </thead>
                <tbody>
                  {shrinkageData.map((s, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.navy }}>{s.color}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{s.steamL}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{s.steamW}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 750, color: COLORS.navy }}>{s.tumbleL}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 750, color: COLORS.navy }}>{s.tumbleW}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: COLORS.blue, fontWeight: 750 }}>{s.markerLengthAdj}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: COLORS.blue, fontWeight: 750 }}>{s.markerWidthAdj}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: COLORS.green }}>
                          ✓ {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cutting KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>TARGET CUT PCS</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(oq)}</div>
              <div style={{ fontSize: '11.5px', color: COLORS.blue, fontWeight: 600 }}>100% Demand</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>ACTUAL CUT PCS</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>{fmt(cutQty)}</div>
              <div style={{ fontSize: '11.5px', color: COLORS.green, fontWeight: 600 }}>102.1% Yield (+136 pcs)</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>BUNDLES GENERATED</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>42 Bundles</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>Barcoded &amp; Numbered</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>CUTTING BALANCE</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: cutBal === 0 ? COLORS.green : COLORS.red, margin: '2px 0' }}>{fmt(cutBal)} pcs</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>0 pcs Remaining</div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 8: PRINT */}
        {/* ========================================================================= */}
        <div
          id="section-print"
          style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            scrollMarginTop: '80px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                8. Print · Screen Printing, Strike-Off &amp; Curing Execution
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Artwork strike-off approval, printing technique, curing temperature and fastness check
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ PRINT COMPLETED &amp; CURED
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>PRINT TECHNIQUE</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: COLORS.navy, margin: '4px 0' }}>Waterbase + Pigment</div>
              <div style={{ fontSize: '11.5px', color: COLORS.blue, fontWeight: 600 }}>Chest Placement Print</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>PRINT QUANTITY</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>{fmt(printQty)} pcs</div>
              <div style={{ fontSize: '11.5px', color: COLORS.green, fontWeight: 600 }}>100% Demand Output</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>PRINT BALANCE</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>0 pcs</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>All panels received</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>CURING SPECS</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: COLORS.orange, margin: '4px 0' }}>160°C · 2.5 min</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>Rub Fastness: Grade 4.5</div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 9: TEMPORARY & SPECIAL PROCESS / EMBROIDERY */}
        {/* ========================================================================= */}
        <div
          id="section-special-process"
          style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            scrollMarginTop: '80px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                9. Temporary &amp; Special Process · Embroidery, Washing &amp; Heat Seals
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Multi-head computerized embroidery execution, fleece brushing/peaching and heat transfers
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ ALL PROCESSES COMPLETED
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>EMBROIDERY STITCHES</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>8,420 Stitches</div>
              <div style={{ fontSize: '11.5px', color: COLORS.purple, fontWeight: 600 }}>Tajima 20-Head Machine</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>EMB OUTPUT PCS</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>{fmt(embQty)} pcs</div>
              <div style={{ fontSize: '11.5px', color: COLORS.green, fontWeight: 600 }}>Balance: 0 pcs</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>FABRIC PEACH / BRUSH</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: COLORS.navy, margin: '4px 0' }}>Peach Finish OK</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>Soft Suede Handfeel</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>SUBCONTRACT AUDIT</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: COLORS.green, margin: '4px 0' }}>100% In-House NFL</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>Zero External Reliance</div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 10: SEWING & FINISHING */}
        {/* ========================================================================= */}
        <div
          id="section-sewing-finishing"
          style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            scrollMarginTop: '80px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                10. Sewing &amp; Finishing · Hourly Line Output &amp; Final Packing
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Sewing line performance, hourly run rate vs target, thread trimming, pressing and carton packing
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ SEWING &amp; PACKING 100% COMPLETE
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>ASSIGNED LINE</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.orange, margin: '2px 0' }}>{job.lineAllocation?.line || 'Line 14B'}</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>{job.lineAllocation?.floor || 'Floor 1'}</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>SEWING OUTPUT</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>{fmt(sewQty)} pcs</div>
              <div style={{ fontSize: '11.5px', color: COLORS.green, fontWeight: 600 }}>100% Order Fulfillment</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>SEWING BALANCE</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: sewBal === 0 ? COLORS.green : COLORS.red, margin: '2px 0' }}>{fmt(sewBal)} pcs</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>0 pcs Balance</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>PACKED CARTONS</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(Math.ceil(oq / 24))} Ctn</div>
              <div style={{ fontSize: '11.5px', color: COLORS.blue, fontWeight: 600 }}>Ratio Pack (1:2:3:2:1)</div>
            </div>
          </div>

          {/* Hourly Sewing Output Bar Chart */}
          <div style={{ background: '#F8FAFC', borderRadius: '8px', border: `1px solid ${COLORS.border}`, padding: '14px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: COLORS.navy }}>
                Hourly Sewing Output Tracking vs Target ({targetPerHour} pcs/hr)
              </span>
              <span style={{ fontSize: '11px', color: COLORS.green, fontWeight: 700 }}>
                Average Line Efficiency: 86.4%
              </span>
            </div>
            <div style={{ width: '100%', height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlySewingData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="hour" tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(2, 132, 199, 0.06)' }}
                    formatter={(val: any, name: any) => [`${val} pcs`, name === 'actual' ? 'Actual Output' : 'Hourly Target']}
                    contentStyle={{ background: '#0F274E', color: '#fff', borderRadius: '6px', fontSize: '11px', border: 'none' }}
                  />
                  <Bar {...FX_BAR} dataKey="actual" fill="#0284C7" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 11: QUALITY & AUDITS */}
        {/* ========================================================================= */}
        <div
          id="section-quality"
          style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            scrollMarginTop: '80px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                11. Quality &amp; Audits · Section DHU, QC Comments &amp; AQL 1.5 Sign-Off
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                End-to-end quality clearance, defect Pareto analysis, floor supervisor feedback and export audit certification
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ FINAL AQL 1.5 PASSED &amp; EXPORT CERTIFIED
            </span>
          </div>

          {/* Section-Wise Inspection Reports Table */}
          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px', marginBottom: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                  <th style={{ padding: '8px 10px' }}>Section &amp; Process</th>
                  <th style={{ padding: '8px 10px' }}>Audit Standard</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Inspected Qty</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Defects Found</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>DHU %</th>
                  <th style={{ padding: '8px 10px' }}>Predominant Defect Types</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Result</th>
                  <th style={{ padding: '8px 10px' }}>Auditor / In-Charge</th>
                </tr>
              </thead>
              <tbody>
                {sectionInspections.map((sec, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 750, color: COLORS.navy }}>{sec.section}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{sec.std}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{sec.inspected}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: COLORS.orange, fontWeight: 700 }}>{sec.defectCount}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: COLORS.blue }}>{sec.dhu}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.navy }}>{sec.majorDefects}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: COLORS.green }}>
                        {sec.result}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey, fontSize: '11px' }}>{sec.auditor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Line Controller & QC Feedback */}
          <div style={{
            background: '#F8FAFC',
            borderRadius: '8px',
            border: `1px solid ${COLORS.border}`,
            padding: '14px 16px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '16px' }}>💬</span>
              <h4 style={{ fontSize: '13px', fontWeight: 800, color: COLORS.navy, margin: 0 }}>
                Quality Controller (QC) &amp; Line Controller Style Feedback
              </h4>
            </div>
            <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.6, background: '#FFFFFF', padding: '10px 14px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
              <strong>Quality In-Charge (Md. Tariqul Islam) Observation:</strong> "On Style #{job.styleNo}, initial needle puncture risk was identified on the 1x1 neck rib joint during setup on Line 14B. Folder attachment angle was recalibrated and sewing needle was switched to Groz-Beckert 65/9 FFG ball-point. Following adjustment, zero cut-holes or puckering were detected across the remaining 6,000 pcs. The style completed final 100% inspection with 99.1% RFT (Right First Time)."
            </div>
          </div>

          {/* AQL 1.5 Audits Final Box */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '12px 16px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: COLORS.green, marginBottom: '4px' }}>
                <Award size={16} /> PRE-FINAL &amp; IN-LINE AQL 1.5 VERIFICATION
              </div>
              <div style={{ fontSize: '11.5px', color: '#065F46', lineHeight: 1.5 }}>
                Inspected Sample Size: <strong>315 Pcs</strong> (Normal Level II Single Sampling)<br />
                Defects Found: <strong>Critical: 0 | Major: 3 | Minor: 6</strong><br />
                Acceptance Threshold: <strong>Ac = 10, Re = 11</strong> · <strong style={{ color: '#047857' }}>PASSED</strong>
              </div>
            </div>

            <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '12px 16px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: COLORS.blue, marginBottom: '4px' }}>
                <CheckCircle2 size={16} /> FINAL EXPORT AUDIT SIGN-OFF
              </div>
              <div style={{ fontSize: '11.5px', color: '#0369A1', lineHeight: 1.5 }}>
                Audited By: <strong>Md. Shariful Alam (Lead QA Auditor)</strong><br />
                Overall DHU Rate: <strong>0.38% (World-Class Garment Export Grade)</strong><br />
                Status: <strong>Approved for Ex-Factory &amp; Cargo Container Stuffing</strong>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL: OFFICIAL TEST CERTIFICATE POPUP */}
        {activeTestModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 39, 78, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(3px)',
            padding: '16px'
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '560px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              border: '1px solid #E2E8F0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: COLORS.blue }}>NFL CENTRAL PHYSICAL TESTING LABORATORY</div>
                  <h3 style={{ fontSize: '16px', fontWeight: 900, color: COLORS.navy, margin: '2px 0 0' }}>
                    {activeTestModal.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTestModal(null)}
                  style={{ border: 'none', background: '#F1F5F9', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontWeight: 800, color: COLORS.grey }}
                >
                  ✕
                </button>
              </div>

              <div style={{ fontSize: '12px', lineHeight: 1.6, color: '#334155', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '12px' }}>
                  <div>Test Certificate No: <strong>CERT-{job.jobNo}-{activeTestModal.id}</strong></div>
                  <div>Test Standard: <strong>{activeTestModal.method}</strong></div>
                  <div>Sample Conditioning: <strong>21°C ± 1°C, 65% RH</strong></div>
                  <div>Buyer Requirement: <strong>{activeTestModal.spec}</strong></div>
                </div>

                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#065F46' }}>LABORATORY ATTAINED RESULT</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>{activeTestModal.score}</div>
                  <div style={{ fontSize: '11.5px', color: '#047857' }}>Verdict: <strong>PASSED (Conforms 100% to Buyer Global Quality Manual)</strong></div>
                </div>

                <div style={{ fontSize: '11.5px', color: COLORS.grey }}>
                  Observation: {activeTestModal.remarks}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    handleExportCsv();
                    setActiveTestModal(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${COLORS.border}`,
                    background: '#FFFFFF',
                    color: COLORS.navy,
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Export Data
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    setActiveTestModal(null);
                  }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: COLORS.navy,
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Print Official Certificate
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Shell>
  );
}

export default function MasterJob360LandingPage() {
  return (
    <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center' }}>Loading Job 360 Workspace...</div>}>
      <Job360Content />
    </Suspense>
  );
}
