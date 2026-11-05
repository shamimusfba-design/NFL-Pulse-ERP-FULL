'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Shell from '../../../components/Shell';
import demo2000DataRaw from '../../../data/demo-2000-master.json';
import { displayJobNo } from '../../../lib/display';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { FX_SERIES, FX_BAR, FX_PIE, FxResponsiveContainer as ResponsiveContainer } from '../../../components/fx';
import {
  Search,
  ArrowLeft,
  Printer,
  Download,
  FileText,
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
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Percent,
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

export default function MasterJob360Page() {
  const params = useParams();
  const router = useRouter();
  const idParam = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const masterJobs: any[] = useMemo(() => (demo2000DataRaw as any)?.jobs || [], []);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'all' | 'core' | 'po' | 'tna' | 'trims' | 'prod' | 'quality' | 'ship'>('all');
  const [activeTestModal, setActiveTestModal] = useState<any | null>(null);
  const [activeChartBar, setActiveChartBar] = useState<number | null>(null);

  // Match Job
  const job = useMemo(() => {
    if (!idParam) return masterJobs[0] || null;
    const cleanId = decodeURIComponent(idParam).toLowerCase().trim();
    const strippedId = cleanId.replace(/^job\s*(#|no\.?|num\.?)?\s*/i, '').replace(/^#\s*/, '').trim();
    return (
      masterJobs.find((j: any) => {
        const jNo = String(j.jobNo || '').toLowerCase().trim();
        const sNo = String(j.styleNo || '').toLowerCase().trim();
        return jNo === cleanId || jNo === strippedId || jNo.includes(strippedId) || sNo === cleanId;
      }) || masterJobs[0]
    );
  }, [idParam, masterJobs]);

  // Suggested jobs for quick search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return masterJobs.slice(0, 8);
    const q = searchQuery.toLowerCase().trim();
    return masterJobs
      .filter((j: any) => {
        const jNo = String(j.jobNo || '').toLowerCase();
        const b = String(j.buyer || '').toLowerCase();
        const s = String(j.styleNo || '').toLowerCase();
        const it = String(j.item || '').toLowerCase();
        return jNo.includes(q) || b.includes(q) || s.includes(q) || it.includes(q);
      })
      .slice(0, 10);
  }, [searchQuery, masterJobs]);

  if (!job) {
    return (
      <Shell title="Job 360" eyebrow="Manufacturing Intelligence Control Tower">
        <div style={{ padding: '60px', textAlign: 'center', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <h3>Order not found</h3>
          <button onClick={() => router.push('/jobs')} className="btn btn-primary" style={{ marginTop: '12px' }}>
            ← Back to All Jobs
          </button>
        </div>
      </Shell>
    );
  }

  // Core metrics calculation
  const oq = Number(job.orderQty) || 5000;
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

  // IE & Engineering
  const smv = Number(job.ie?.smv) || 7.5;
  const machineQty = Number(job.ie?.machineQty) || 22;
  const manpower = Number(job.ie?.manpower) || 32;
  const targetPerHour = Number(job.ie?.targetPerHour) || Math.round((60 / smv) * machineQty * 0.75);
  const dailyTarget = Number(job.ie?.dailyTarget) || targetPerHour * 10;

  // Garment SVG/Illustration selector
  const itemType = String(job.item || job.itemDescription || 'T-Shirt').toLowerCase();
  const isPolo = itemType.includes('polo');
  const isHoodie = itemType.includes('hood') || itemType.includes('fleece');
  const isSweat = itemType.includes('sweat') || itemType.includes('crew');
  const isPant = itemType.includes('pant') || itemType.includes('bottom') || itemType.includes('jogger');

  // Colors breakdown
  const primaryColor = job.fabric?.colors || 'Black Beauty';
  const colorList = [
    { name: primaryColor, code: '#1E293B', share: 0.55 },
    { name: 'Heather Grey', code: '#94A3B8', share: 0.25 },
    { name: 'Navy Blue', code: '#1E3A8A', share: 0.20 },
  ];

  // Visual Production Chart Data
  const prodChartData = [
    { stage: 'Knitting (kg)', target: knitReq, actual: knitDone, balance: knitBal, color: '#0284C7' },
    { stage: 'Dyeing (kg)', target: dyeReq, actual: dyeDone, balance: dyeBal, color: '#0F766E' },
    { stage: 'Cutting (pcs)', target: oq, actual: cutQty, balance: cutBal, color: '#D97706' },
    { stage: 'Sewing (pcs)', target: oq, actual: sewQty, balance: sewBal, color: '#2563EB' },
    { stage: 'Finishing (pcs)', target: oq, actual: isShipped ? oq : Math.round(sewQty * 0.98), balance: Math.max(0, oq - Math.round(sewQty * 0.98)), color: '#7C3AED' },
    { stage: 'Shipment (pcs)', target: oq, actual: shipQty, balance: shipBal, color: '#10B981' },
  ];

  const wipDonutData = [
    { name: 'Completed / Shipped', value: isShipped ? oq : shipQty, color: '#10B981' },
    { name: 'Sewing WIP', value: isShipped ? 0 : Math.max(0, sewQty - shipQty), color: '#0284C7' },
    { name: 'Cutting WIP', value: isShipped ? 0 : Math.max(0, cutQty - sewQty), color: '#F59E0B' },
    { name: 'Fabric In-House', value: isShipped ? 0 : Math.max(0, Math.round(fabRecv * 3.5 - cutQty)), color: '#8B5CF6' },
    { name: 'Pending Execution', value: isShipped ? 0 : Math.max(0, oq - cutQty), color: '#CBD5E1' },
  ].filter((d) => d.value > 0);

  // Lab Testing Results
  const labTests = [
    { id: 'LT-01', name: 'Color Fastness to Washing', method: 'ISO 105-C06 (40°C)', spec: 'Min Grade 4.0', score: 'Grade 4-5', status: 'PASS', remarks: 'Zero bleeding on multi-fiber adjacent' },
    { id: 'LT-02', name: 'Color Fastness to Rubbing (Dry/Wet)', method: 'ISO 105-X12 Crockmeter', spec: 'Dry ≥ 4.0, Wet ≥ 3.5', score: 'Dry: 4-5 | Wet: 4.0', status: 'PASS', remarks: 'Passes buyer benchmark' },
    { id: 'LT-03', name: 'Martindale Pilling Resistance', method: 'ISO 12945-2 (2,000 revs)', spec: 'Min Grade 3-4', score: 'Grade 4.0', status: 'PASS', remarks: 'No fuzzing or pill ball formation' },
    { id: 'LT-04', name: 'Dimensional Stability (Washing)', method: 'ISO 6330 3 Cycles at 40°C', spec: 'Length ±4.0%, Width ±3.0%', score: 'Length: -2.4% | Width: -1.2%', status: 'PASS', remarks: 'Stabilized by stenter heat-set' },
    { id: 'LT-05', name: 'Bursting Strength', method: 'ASTM D3786 Diaphragm', spec: 'Min 280 kPa', score: '342 kPa', status: 'PASS', remarks: 'Robust knit interloop tensile' },
    { id: 'LT-06', name: 'Fiber Composition Verification', method: 'AATCC 20A Quantitative', spec: '100% Combed Cotton', score: '100% Cotton (Verified)', status: 'PASS', remarks: 'Matches buyer care label claim' },
    { id: 'LT-07', name: 'pH Value & Free Formaldehyde', method: 'ISO 3071 / ISO 14184-1', spec: 'pH 4.0-7.5, Formaldehyde < 16ppm', score: 'pH: 6.5 | Formaldehyde: ND', status: 'PASS', remarks: 'OEKO-TEX Standard 100 Class 1' },
  ];

  // Fabric Shrinkage Report Before Cutting
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

  const handlePrintSpec = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const csvRows = [
      ['JOB 360 COMPREHENSIVE MANUFACTURING REPORT'],
      ['Job No', job.jobNo, 'Buyer', job.buyer, 'Style', job.styleNo],
      ['Order Qty', oq, 'Merchandiser', job.merchandiser, 'Ex-Factory', job.dates?.exFactory],
      [''],
      ['STAGE', 'TARGET', 'ACTUAL', 'BALANCE'],
      ...prodChartData.map((d) => [d.stage, d.target, d.actual, d.balance]),
      [''],
      ['LAB TESTS', 'METHOD', 'SPEC', 'RESULT', 'STATUS'],
      ...labTests.map((t) => [t.name, t.method, t.spec, t.score, t.status]),
    ];
    const csvContent = csvRows.map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Job_360_${job.jobNo}_Comprehensive_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Shell
      title={`Job 360 · ${displayJobNo(job.jobNo, job.buyer)} · ${job.styleNo}`}
      eyebrow={`360° Comprehensive Manufacturing Intelligence Control Tower · ${job.buyer} · ${job.lineAllocation?.factory || 'NFL'} ${job.lineAllocation?.floor || 'Floor 1'}`}
    >
      <div style={{ background: COLORS.bg, minHeight: '100vh', padding: '0 0 30px' }}>
        
        {/* TOP SEARCH & ACTION BAR */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '10px',
          border: `1px solid ${COLORS.border}`,
          padding: '12px 16px',
          marginBottom: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Quick Jump Search Box */}
          <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#F8FAFC',
              border: `1px solid ${isSearchOpen ? COLORS.blue : COLORS.border}`,
              borderRadius: '8px',
              padding: '6px 12px',
              transition: 'all .15s ease'
            }}>
              <Search size={16} color={COLORS.grey} />
              <input
                type="text"
                placeholder="Jump to any Job # (e.g. 48092, 46755, 48085)..."
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

            {/* Dropdown Suggestions */}
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
                  zIndex: 50,
                  maxHeight: '280px',
                  overflowY: 'auto'
                }}
              >
                <div style={{ padding: '6px 12px', fontSize: '10.5px', fontWeight: 800, color: COLORS.grey, background: '#F8FAFC', borderBottom: `1px solid ${COLORS.border}` }}>
                  MATCHING JOBS IN SYSTEM ({searchResults.length})
                </div>
                {searchResults.map((j: any) => (
                  <div
                    key={j.jobNo}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                      router.push(`/jobs/${j.jobNo}`);
                    }}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #F1F5F9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      background: j.jobNo === job.jobNo ? '#F0F9FF' : 'transparent',
                      transition: 'background .15s ease'
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

          {/* Quick Navigation Pills */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveSection('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: activeSection === 'all' ? `1px solid ${COLORS.blue}` : `1px solid ${COLORS.border}`,
                background: activeSection === 'all' ? COLORS.navy : '#FFFFFF',
                color: activeSection === 'all' ? '#FFFFFF' : COLORS.navy,
                fontSize: '11.5px',
                fontWeight: 750,
                cursor: 'pointer'
              }}
            >
              All Sections (360°)
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('core')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: activeSection === 'core' ? `1px solid ${COLORS.blue}` : `1px solid ${COLORS.border}`,
                background: activeSection === 'core' ? COLORS.navy : '#FFFFFF',
                color: activeSection === 'core' ? '#FFFFFF' : COLORS.navy,
                fontSize: '11.5px',
                fontWeight: 750,
                cursor: 'pointer'
              }}
            >
              Core Specs
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('prod')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: activeSection === 'prod' ? `1px solid ${COLORS.blue}` : `1px solid ${COLORS.border}`,
                background: activeSection === 'prod' ? COLORS.navy : '#FFFFFF',
                color: activeSection === 'prod' ? '#FFFFFF' : COLORS.navy,
                fontSize: '11.5px',
                fontWeight: 750,
                cursor: 'pointer'
              }}
            >
              Production &amp; WIP
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('trims')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: activeSection === 'trims' ? `1px solid ${COLORS.blue}` : `1px solid ${COLORS.border}`,
                background: activeSection === 'trims' ? COLORS.navy : '#FFFFFF',
                color: activeSection === 'trims' ? '#FFFFFF' : COLORS.navy,
                fontSize: '11.5px',
                fontWeight: 750,
                cursor: 'pointer'
              }}
            >
              Trims Status
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('quality')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: activeSection === 'quality' ? `1px solid ${COLORS.blue}` : `1px solid ${COLORS.border}`,
                background: activeSection === 'quality' ? COLORS.navy : '#FFFFFF',
                color: activeSection === 'quality' ? '#FFFFFF' : COLORS.navy,
                fontSize: '11.5px',
                fontWeight: 750,
                cursor: 'pointer'
              }}
            >
              Quality &amp; Lab Tests
            </button>
          </div>

          {/* Action Export Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
              <Download size={14} /> Export Excel
            </button>
            <button
              type="button"
              onClick={handlePrintSpec}
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
              <Printer size={14} /> Print Job Dossier
            </button>
          </div>
        </div>

        {/* 1. CORE JOB SPECIFICATIONS & GARMENT PROFILE BOX */}
        {(activeSection === 'all' || activeSection === 'core') && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px 20px',
            marginBottom: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#0F274E', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontWeight: 900, fontSize: '15px' }}>
                  JOB #{job.jobNo}
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                    {job.buyer} · Style: {job.styleNo}
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

            {/* Core Info Split: Garment Illustration + Detailed Key Attributes */}
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 260px', gap: '18px', alignItems: 'stretch' }}>
              
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

              {/* Main Technical & Spec Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
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

              {/* Sewing Engineering Box (IE Data) */}
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
          </div>
        )}

        {/* 2. PRODUCTION STATUS & WIP (WITH TRIMS STANDARD KPI CARDS & CHARTS) */}
        {(activeSection === 'all' || activeSection === 'prod') && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px 20px',
            marginBottom: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                  Factory Production Execution, WIP &amp; Section Balance
                </h3>
                <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                  Real-time pipeline metrics from knitting to ex-factory shipment with Trims-standard KPI cards
                </div>
              </div>
              <span style={{ fontSize: '11px', color: COLORS.blue, fontWeight: 700 }}>
                Line: {job.lineAllocation?.line || 'Line 14B'} · Floor: {job.lineAllocation?.floor || 'Floor 1'}
              </span>
            </div>

            {/* Trims Standard KPI Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '10px',
              marginBottom: '16px'
            }}>
              <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650, textTransform: 'uppercase' }}>Order Qty</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(oq)}</div>
                <div style={{ fontSize: '11.5px', color: COLORS.blue, fontWeight: 600 }}>100% Booked Demand</div>
              </div>

              <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650, textTransform: 'uppercase' }}>Fabric Req (Kg)</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(fabReq)}</div>
                <div style={{ fontSize: '11.5px', color: COLORS.green, fontWeight: 600 }}>Recv: {fmt(fabRecv)} kg (100%)</div>
              </div>

              <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650, textTransform: 'uppercase' }}>Knitting (Kg)</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(knitDone)}</div>
                <div style={{ fontSize: '11.5px', color: knitBal === 0 ? COLORS.green : COLORS.amber, fontWeight: 600 }}>Balance: {fmt(knitBal)} kg</div>
              </div>

              <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650, textTransform: 'uppercase' }}>Dyeing (Kg)</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(dyeDone)}</div>
                <div style={{ fontSize: '11.5px', color: dyeBal === 0 ? COLORS.green : COLORS.amber, fontWeight: 600 }}>Balance: {fmt(dyeBal)} kg</div>
              </div>

              <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650, textTransform: 'uppercase' }}>Cutting (Pcs)</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(cutQty)}</div>
                <div style={{ fontSize: '11.5px', color: COLORS.green, fontWeight: 600 }}>Yield: 102.1% Cut OK</div>
              </div>

              <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650, textTransform: 'uppercase' }}>Sewing Done</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(sewQty)}</div>
                <div style={{ fontSize: '11.5px', color: sewBal === 0 ? COLORS.green : COLORS.orange, fontWeight: 600 }}>Balance: {fmt(sewBal)} pcs</div>
              </div>

              <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650, textTransform: 'uppercase' }}>Shipment Done</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: isShipped ? COLORS.green : COLORS.navy, margin: '2px 0' }}>{fmt(shipQty)}</div>
                <div style={{ fontSize: '11.5px', color: shipBal === 0 ? COLORS.green : COLORS.red, fontWeight: 600 }}>Ship Bal: {fmt(shipBal)} pcs</div>
              </div>
            </div>

            {/* Visual Recharts Section: Donut + Bar Chart */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '16px', marginBottom: '16px' }}>
              
              {/* Donut Chart: WIP Breakdown */}
              <div style={{ background: '#F8FAFC', borderRadius: '8px', border: `1px solid ${COLORS.border}`, padding: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: COLORS.navy, marginBottom: '8px' }}>
                  WIP &amp; Production Stage Distribution
                </div>
                <div style={{ width: '100%', height: '190px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie {...FX_PIE}
                        data={wipDonutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {wipDonutData.map((entry, index) => (
                          <Cell key={`donut-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [`${fmt(val)} pcs`, 'Quantity']}
                        contentStyle={{ background: '#0F274E', color: '#fff', borderRadius: '6px', fontSize: '11px', border: 'none' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', fontSize: '10px' }}>
                  {wipDonutData.map((d) => (
                    <span key={d.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color }} />
                      <span style={{ color: COLORS.navy, fontWeight: 650 }}>{d.name}:</span>
                      <span style={{ color: COLORS.grey }}>{fmt(d.value)}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Grouped Bar Chart: Actual vs Balance by Section */}
              <div style={{ background: '#F8FAFC', borderRadius: '8px', border: `1px solid ${COLORS.border}`, padding: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: COLORS.navy, marginBottom: '8px' }}>
                  Section Execution: Completed vs Balance (Hover to inspect)
                </div>
                <div style={{ width: '100%', height: '210px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={prodChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="stage" tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                      <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(2, 132, 199, 0.06)' }}
                        formatter={(value: any, name: any) => [fmt(value), name === 'actual' ? 'Completed / Produced' : 'Balance Remaining']}
                        contentStyle={{ background: '#0F274E', color: '#fff', borderRadius: '6px', fontSize: '11px', border: 'none' }}
                      />
                      <Bar {...FX_BAR} dataKey="actual" fill="#0284C7" radius={[4, 4, 0, 0]} maxBarSize={36} />
                      <Bar {...FX_BAR} dataKey="balance" fill="#CBD5E1" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Detailed Color-Wise Production Table */}
            <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                    <th style={{ padding: '8px 10px' }}>Color Name</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Order Qty</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Fabric Req (kg)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Knitting Done</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Dyeing Done</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Cut Pcs</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Print Pcs</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Emb Pcs</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Sewn Pcs</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Shipped</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {colorList.map((c, idx) => {
                    const cOq = Math.round(oq * c.share);
                    const cFab = Math.round(fabReq * c.share);
                    const cKnit = Math.round(knitDone * c.share);
                    const cDye = Math.round(dyeDone * c.share);
                    const cCut = Math.round(cutQty * c.share);
                    const cPrint = Math.round(printQty * c.share);
                    const cEmb = Math.round(embQty * c.share);
                    const cSew = Math.round(sewQty * c.share);
                    const cShip = Math.round(shipQty * c.share);
                    const cBal = Math.max(0, cOq - cSew);

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.navy }}>
                          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: c.code, marginRight: '6px' }} />
                          {c.name}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>{fmt(cOq)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmt(cFab)} kg</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmt(cKnit)} kg</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmt(cDye)} kg</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmt(cCut)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmt(cPrint)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmt(cEmb)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: COLORS.blue, fontWeight: 800 }}>{fmt(cSew)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: COLORS.green, fontWeight: 800 }}>{fmt(cShip)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            background: cBal === 0 ? '#DCFCE7' : '#FEF3C7',
                            color: cBal === 0 ? COLORS.green : COLORS.amber
                          }}>
                            {cBal === 0 ? '0 (Done)' : `${fmt(cBal)} pcs`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. TRIMS & ACCESSORIES STATUS BOX */}
        {(activeSection === 'all' || activeSection === 'trims') && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px 20px',
            marginBottom: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                  Trims &amp; Accessories Inventory &amp; Requisition Status
                </h3>
                <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                  All BOM items allocated for this job, received in-house vs requirement balance
                </div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
                ✓ ALL TRIMS 100% IN-HOUSE &amp; APPROVED
              </span>
            </div>

            <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                    <th style={{ padding: '8px 10px' }}>Trim / Accessory Item</th>
                    <th style={{ padding: '8px 10px' }}>Nominated Supplier</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Required Qty</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>In-House Received</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Balance</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Stock Status</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>QC Approval</th>
                  </tr>
                </thead>
                <tbody>
                  {trimsTable.map((t, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.navy }}>{t.item}</td>
                      <td style={{ padding: '8px 10px', color: COLORS.grey }}>{t.supplier}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{typeof t.required === 'number' ? fmt(t.required) : t.required}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: COLORS.green, fontWeight: 700 }}>{typeof t.inHouse === 'number' ? fmt(t.inHouse) : t.inHouse}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: t.balance === 0 || t.balance === '0 kg' || t.balance === '0 Cones' ? COLORS.grey : COLORS.red }}>{t.balance}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: COLORS.green }}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: COLORS.blue }}>
                          ✓ {t.approval}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. QUALITY CONTROL, SHRINKAGE REPORT, TESTING LAB RESULTS & AQL 1.5 AUDITS */}
        {(activeSection === 'all' || activeSection === 'quality') && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px 20px',
            marginBottom: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                  Quality Intelligence, Physical Testing Lab, Shrinkage &amp; AQL 1.5 Audits
                </h3>
                <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                  Laboratory certified test reports, steam/tumble shrinkage for marker layout, section inspections, and QC comments
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
                  ✓ AQL 1.5 PASSED &amp; CERTIFIED
                </span>
              </div>
            </div>

            {/* Quality Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: COLORS.grey }}>LAB TESTS STATUS</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.green, marginTop: '2px' }}>7 / 7 PASSED</div>
                <div style={{ fontSize: '11px', color: COLORS.blue }}>Zero non-conformance reports</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: COLORS.grey }}>SEWING DHU %</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.navy, marginTop: '2px' }}>1.09% DHU</div>
                <div style={{ fontSize: '11px', color: COLORS.emerald }}>Target: &lt; 2.50% (Excellent)</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: COLORS.grey }}>FINAL INSPECTION AQL</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.green, marginTop: '2px' }}>AQL 1.5 CERTIFIED</div>
                <div style={{ fontSize: '11px', color: COLORS.grey }}>Checked: 315 pcs · Major: 3 / Allow: 10</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: COLORS.grey }}>SHRINKAGE STATUS</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.blue, marginTop: '2px' }}>-2.8% × -1.5%</div>
                <div style={{ fontSize: '11px', color: COLORS.grey }}>Marker adjusted and released</div>
              </div>
            </div>

            {/* 4.A Testing Lab Results Table */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: COLORS.navy, margin: 0 }}>
                  🔬 Physical &amp; Chemical Testing Lab Results (with View / Download)
                </h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTestModal(labTests[0])}
                    style={{ fontSize: '11px', fontWeight: 700, color: COLORS.blue, background: '#E0F2FE', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    📄 View Official Test Certificate
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    style={{ fontSize: '11px', fontWeight: 700, color: COLORS.navy, background: '#F1F5F9', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    📊 Download Lab Excel
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
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Action</th>
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

            {/* 4.B Shrinkage Report Before Cutting */}
            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 800, color: COLORS.navy, margin: '0 0 8px' }}>
                📐 Pre-Cutting Fabric Shrinkage Report (Steam &amp; Tumble Shrinkage)
              </h4>
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px 14px', borderRadius: '8px', fontSize: '11.5px', color: '#92400E', marginBottom: '10px' }}>
                💡 <strong>Technical Note:</strong> Marker making and ironing parameters are strictly calibrated against the steam and tumble shrinkage ratings below to ensure garments hit exact finished measurements after heat-press and wash.
              </div>
              <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                      <th style={{ padding: '8px 10px' }}>Fabric Color Lot</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Steam Shrinkage (Length)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Steam Shrinkage (Width)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Tumble Shrinkage (Length)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Tumble Shrinkage (Width)</th>
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

            {/* 4.C Section-Wise Inspection Reports & Defects */}
            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 800, color: COLORS.navy, margin: '0 0 8px' }}>
                📋 Section-Wise Inspection Reports, Defect Breakdown &amp; DHU %
              </h4>
              <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
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
            </div>

            {/* 4.D Line Controller & QC Comments / Feedback Box */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: '8px',
              border: `1px solid ${COLORS.border}`,
              padding: '14px 16px',
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '15px' }}>💬</span>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: COLORS.navy, margin: 0 }}>
                  Quality Controller (QC) &amp; Line Controller Style Feedback
                </h4>
              </div>
              <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.6, background: '#FFFFFF', padding: '10px 14px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <strong>Quality In-Charge (Md. Tariqul Islam) Observation:</strong> "On Style #{job.styleNo}, initial needle puncture risk was identified on the 1x1 neck rib joint during setup on Line 14B. Folder attachment angle was recalibrated and sewing needle was switched to Groz-Beckert 65/9 FFG ball-point. Following adjustment, zero cut-holes or puckering were detected across the remaining 6,000 pcs. The style completed final 100% inspection with 99.1% RFT (Right First Time)."
              </div>
            </div>

            {/* 4.E Final AQL 1.5 Inspection & Sewing Audit Certificate */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px'
            }}>
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
        )}

        {/* 5. PO BREAKDOWN TABLE */}
        {(activeSection === 'all' || activeSection === 'po') && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px 20px',
            marginBottom: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: '0 0 10px' }}>
              Purchase Order (PO) Country Splits &amp; Shipping Breakdowns
            </h3>
            <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                    <th style={{ padding: '8px 10px' }}>Buyer PO Number</th>
                    <th style={{ padding: '8px 10px' }}>Destination Country</th>
                    <th style={{ padding: '8px 10px' }}>Port of Discharge</th>
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
        )}

        {/* 6. TNA TIMELINE & SCHEDULE (PLANNED VS ACTUAL) */}
        {(activeSection === 'all' || activeSection === 'tna') && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px 20px',
            marginBottom: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: '0 0 10px' }}>
              Time &amp; Action (T&amp;A) Milestone Schedule &amp; Slack Tracking
            </h3>
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
        )}

        {/* 7. SHIPMENT & EXPORT LOGISTICS SUMMARY */}
        {(activeSection === 'all' || activeSection === 'ship') && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: '0 0 10px' }}>
              Final Shipment, Logistics &amp; Export Documentation
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: COLORS.grey }}>TRANSPORT MODE</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: COLORS.navy, marginTop: '2px' }}>🚢 Sea Freight (FCL 40ft)</div>
                <div style={{ fontSize: '11px', color: COLORS.grey }}>Carrier: Mediterranean Shipping Co. (MSC)</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: COLORS.grey }}>CONTAINER &amp; SEAL #</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: COLORS.blue, marginTop: '2px' }}>MEDU839201-4</div>
                <div style={{ fontSize: '11px', color: COLORS.grey }}>High Security Seal: BD-994102</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: COLORS.grey }}>PORT OF LOADING</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: COLORS.navy, marginTop: '2px' }}>Chattogram Port (CTG)</div>
                <div style={{ fontSize: '11px', color: COLORS.grey }}>Discharge: Hamburg / Le Havre</div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: COLORS.grey }}>EXPORT FULFILLMENT</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: COLORS.green, marginTop: '2px' }}>{fmt(oq)} Pcs (100.0%)</div>
                <div style={{ fontSize: '11px', color: COLORS.grey }}>Net Wt: 1,980 kg · Total: 271 Cartons</div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: LAB TEST CERTIFICATE POPUP */}
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
