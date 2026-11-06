'use client';

import React, { Suspense, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Shell from '../../components/Shell';
import demo2000DataRaw from '../../data/demo-2000-master.json';
import { displayJobNo } from '../../lib/display';
import { api } from '../../lib/api';
import {
  BarChart,
  Bar,
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
  ToggleLeft,
  ToggleRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
  X,
  Palette,
  Check,
  ShieldCheck,
  FileText,
  BarChart2,
  HelpCircle,
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d}-${months[parseInt(m, 10) - 1]}-${y}`;
  }
  return s;
}

// 11 Official Sub-Sections of Job 360
export const SUB_SECTIONS = [
  { id: 'section-job-info', name: '1. Job Information', icon: Shirt },
  { id: 'section-planning-input', name: '2. Planning Input', icon: Calendar },
  { id: 'section-production-status', name: '3. Total Production Status', icon: Activity },
  { id: 'section-knitting-input', name: '4. Knitting Input', icon: Layers },
  { id: 'section-dyeing-input', name: '5. Dyeing & Special Process', icon: Droplet },
  { id: 'section-lab-input', name: '6. Dyeing Lab (Lab Dip)', icon: Sparkles },
  { id: 'section-testing-lab', name: '7. Testing Lab', icon: FileSpreadsheet },
  { id: 'section-cutting', name: '8. Cutting & CAD Adjustment', icon: Scissors },
  { id: 'section-print', name: '9. Print & Embroidery', icon: Flame },
  { id: 'section-sewing-finishing', name: '10. Sewing & Finishing', icon: TrendingUp },
  { id: 'section-quality', name: '11. Quality & Audits', icon: Award },
];

export interface Job360Props {
  initialJobId?: string;
}

export function Job360Content({ initialJobId }: Job360Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = initialJobId || searchParams.get('q') || searchParams.get('jobNo') || '';

  const masterJobs: any[] = useMemo(() => (demo2000DataRaw as any)?.jobs || [], []);
  const [selectedJobNo, setSelectedJobNo] = useState<string>(initialQ ? String(initialQ).trim() : '46755');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>('section-job-info');
  
  // Garment Photo Lightbox Zoom state
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [activeSketchView, setActiveSketchView] = useState<'front' | 'back' | 'techpack'>('front');

  // Shrinkage test method toggle: 'tumble' | 'steam'
  const [shrinkageMethod, setShrinkageMethod] = useState<'tumble' | 'steam'>('tumble');
  const [defectStage, setDefectStage] = useState<string>('knitting');
  const [knitInspections, setKnitInspections] = useState<any[]>([]);
  const [knitLoadError, setKnitLoadError] = useState<boolean>(false);
  const [labRecords, setLabRecords] = useState<any[]>([]);

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

  // Handle Search Submission (Press Enter or Click Search Button)
  const handleSearchSubmit = (overrideVal?: string) => {
    const raw = (overrideVal !== undefined ? overrideVal : searchQuery).trim();
    if (!raw) return;
    const clean = raw.toLowerCase().replace(/^job\s*(#|no\.?|num\.?)?\s*/i, '').replace(/^#\s*/, '').trim();

    // Check exact or partial match in masterJobs
    const found = masterJobs.find((j: any) => {
      const jNo = String(j.jobNo || '').toLowerCase().trim();
      const sNo = String(j.styleNo || '').toLowerCase().trim();
      const b = String(j.buyer || '').toLowerCase().trim();
      return jNo === clean || jNo.includes(clean) || sNo.includes(clean) || b.includes(clean);
    });

    if (found) {
      setSelectedJobNo(String(found.jobNo));
      setSearchQuery('');
      setIsSearchOpen(false);
    } else {
      setSelectedJobNo(clean);
      setSearchQuery('');
      setIsSearchOpen(false);
    }
  };

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

  // Smooth scroll handler when a sub-section button is clicked
  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90; // offset for sticky bar
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Search filter for autocomplete dropdown
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
      .slice(0, 15);
  }, [searchQuery, masterJobs]);

  const jobKey = String(job?.jobNo || '').trim();
  const baseJob = (v: any) => (String(v || '').match(/\d{4,6}/) || [''])[0];

  // Knitting quality inspections (saved in the Knitting module) for this job only
  useEffect(() => {
    if (!jobKey) return;
    let alive = true;
    setKnitLoadError(false);
    api('/knitting/quality/inspections')
      .then((rows: any) => {
        if (!alive) return;
        const list = Array.isArray(rows) ? rows : [];
        setKnitInspections(list.filter((r: any) => baseJob(r.jobCode) === baseJob(jobKey)));
      })
      .catch(() => { if (alive) { setKnitInspections([]); setKnitLoadError(true); } });
    return () => { alive = false; };
  }, [jobKey]);

  // Testing Lab results (saved in the Testing Lab module) for this job only
  useEffect(() => {
    if (!jobKey || typeof window === 'undefined') return;
    try {
      const saved = JSON.parse(localStorage.getItem('nfl_testing_lab_v2') || '[]');
      setLabRecords((Array.isArray(saved) ? saved : []).filter((r: any) => baseJob(r.jobNo) === baseJob(jobKey)));
    } catch {
      setLabRecords([]);
    }
  }, [jobKey]);

  if (!job) {
    return (
      <Shell title="Job 360" eyebrow="Single Job Manufacturing Intelligence">
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
  const printQty = Number(job.printEmb?.printActualQty) || (isShipped ? oq : Math.round(oq * 0.98));
  const shipQty = isShipped ? oq : 0;

  const sewBal = Math.max(0, oq - sewQty);
  const cutBal = Math.max(0, oq - cutQty);
  const shipBal = Math.max(0, oq - shipQty);

  // Fabric & Yarn conversions
  const smv = Number(job.smv) || 7.8;
  const targetPerHour = Math.round((60 / smv) * 24);
  const knitReq = Math.round(oq * 0.265); // ~265g fabric per garment
  const knitDone = isShipped ? knitReq : Math.round(knitReq * 0.98);
  const knitBal = Math.max(0, knitReq - knitDone);

  const dyeReq = knitReq;
  const dyeDone = isShipped ? dyeReq : Math.round(dyeReq * 0.96);
  const dyeBal = Math.max(0, dyeReq - dyeDone);
  const fabRecv = dyeDone;

  const totalCartons = Math.ceil(oq / 24);

  // Backward schedule milestones
  const backwardSchedule = [
    { step: '1. PO Confirmation & Tech Pack Handover', planStart: '12-Apr-2026', planEnd: '14-Apr-2026', actualStart: '12-Apr-2026', actualEnd: '14-Apr-2026', status: 'COMPLETED', lead: 'Merchandising' },
    { step: '2. Yarn Indent & Booking (Akij & Square)', planStart: '15-Apr-2026', planEnd: '18-Apr-2026', actualStart: '15-Apr-2026', actualEnd: '17-Apr-2026', status: 'COMPLETED', lead: 'Procurement' },
    { step: '3. Yarn Sourcing & Delivery into Mill Store', planStart: '19-Apr-2026', planEnd: '25-Apr-2026', actualStart: '19-Apr-2026', actualEnd: '24-Apr-2026', status: 'COMPLETED', lead: 'Yarn Store' },
    { step: '4. Lab Dip Approval (Northern / DBL / GMS)', planStart: '20-Apr-2026', planEnd: '02-May-2026', actualStart: '20-Apr-2026', actualEnd: '01-May-2026', status: 'COMPLETED', lead: 'Dyeing Lab' },
    { step: '5. Circular Knitting Production', planStart: '26-Apr-2026', planEnd: '10-May-2026', actualStart: '25-Apr-2026', actualEnd: '09-May-2026', status: 'COMPLETED', lead: 'Knitting Unit' },
    { step: '6. Greige Store Audit & Batch Allocation', planStart: '11-May-2026', planEnd: '14-May-2026', actualStart: '11-May-2026', actualEnd: '13-May-2026', status: 'COMPLETED', lead: 'Greige Store' },
    { step: '7. Dyeing & Special Process (Peach & Brush)', planStart: '15-May-2026', planEnd: '30-May-2026', actualStart: '15-May-2026', actualEnd: '29-May-2026', status: 'COMPLETED', lead: 'Dyeing Floor' },
    { step: '8. Finished Fabric Store Quality & Shade Release', planStart: '01-Jun-2026', planEnd: '06-Jun-2026', actualStart: '01-Jun-2026', actualEnd: '05-Jun-2026', status: 'COMPLETED', lead: 'Finished Fabric Store' },
    { step: '9. CAD Marker Lay Calibration & Bulk Cutting', planStart: '08-Jun-2026', planEnd: '18-Jun-2026', actualStart: '07-Jun-2026', actualEnd: '17-Jun-2026', status: 'COMPLETED', lead: 'Cutting Floor' },
    { step: '10. Chest Print & Placement Embroidery', planStart: '19-Jun-2026', planEnd: '30-Jun-2026', actualStart: '18-Jun-2026', actualEnd: '29-Jun-2026', status: 'COMPLETED', lead: 'Print Unit' },
    { step: '11. Sewing Floor Assembly (Lines 16B & 14B)', planStart: '01-Jul-2026', planEnd: '24-Jul-2026', actualStart: '01-Jul-2026', actualEnd: '23-Jul-2026', status: isShipped ? 'COMPLETED' : 'RUNNING ON LINE', lead: 'Sewing Production' },
    { step: '12. Finishing, AQL 1.5 Audit & Ex-Factory Cargo', planStart: job.dates?.exFactory || '05-Aug-2026', planEnd: job.dates?.cargoClosing || '07-Aug-2026', actualStart: '04-Aug-2026', actualEnd: '05-Aug-2026', status: isShipped ? 'COMPLETED' : 'PENDING PACKING', lead: 'Quality & Shipping' },
  ];

  // =========================================================================
  // UNIFIED END-TO-END MASTER PRODUCTION PIPELINE (YARN TO SHIPMENT IN ONE PLACE)
  // =========================================================================
  const masterPipeline = [
    { section: '1. Yarn Allotment & Store Issue', floor: 'Yarn Godown', unit: 'kg', req: Math.round(knitReq * 1.02), act: Math.round(knitReq * 1.02), bal: 0, yieldRate: '100.0%', rft: '99.5%', status: '100% ISSUED', inCharge: 'Yarn Store In-Charge' },
    { section: '2. Circular Knitting Floor', floor: 'Knitting Shed-1', unit: 'kg', req: knitReq, act: knitDone, bal: knitBal, yieldRate: `${((knitDone / knitReq) * 100).toFixed(1)}%`, rft: '98.8%', status: knitBal === 0 ? 'COMPLETED' : 'IN PROGRESS', inCharge: 'Knitting Master' },
    { section: '3. Greige Fabric Store Receiving & Audit', floor: 'Greige Store Bay 2', unit: 'kg', req: knitReq, act: Math.round(knitDone * 0.999), bal: 2, yieldRate: '99.9%', rft: '99.2%', status: 'AUDITED & ACCEPTED', inCharge: 'Greige Store Officer' },
    { section: '4. Dyeing & Special Finishing Plant', floor: 'NFL Dyeing Plant', unit: 'kg', req: dyeReq, act: dyeDone, bal: dyeBal, yieldRate: `${((dyeDone / dyeReq) * 100).toFixed(1)}%`, rft: '97.4%', status: dyeBal === 0 ? 'COMPLETED' : 'IN PROGRESS', inCharge: 'Dyeing Head' },
    { section: '5. Dyeing Lab & Shade Continuity', floor: 'Central Color Lab', unit: 'shades', req: 3, act: 3, bal: 0, yieldRate: '100.0%', rft: '100.0%', status: 'ALL SHADES APPROVED', inCharge: 'Lab Manager' },
    { section: '6. Testing Laboratory Quality Clearance', floor: 'Testing Lab', unit: 'reports', req: 1, act: 1, bal: 0, yieldRate: '100.0%', rft: '100.0%', status: 'GRADE 4-5 PASS', inCharge: 'Testing Head' },
    { section: '7. Finished Fabric Store & Clearance', floor: 'Finished Godown', unit: 'kg', req: dyeDone, act: dyeDone, bal: 0, yieldRate: '100.0%', rft: '99.0%', status: 'STOCK READY FOR CUTTING', inCharge: 'Store Officer' },
    { section: '8. CAD Marker Lay & Bulk Cutting', floor: 'Cutting Tables 2 & 4', unit: 'pcs', req: oq, act: cutQty, bal: cutBal, yieldRate: `${((cutQty / oq) * 100).toFixed(1)}%`, rft: '99.35%', status: 'CUTTING DONE (+136 pcs)', inCharge: 'Cutting In-Charge' },
    { section: '9. Print & Placement Embroidery', floor: 'Printing Floor', unit: 'pcs', req: oq, act: printQty, bal: Math.max(0, oq - printQty), yieldRate: `${((printQty / oq) * 100).toFixed(1)}%`, rft: '99.52%', status: printQty >= oq ? 'PASSED 100%' : 'RUNNING', inCharge: 'Print Floor Mgr' },
    { section: '10. Sewing Floor Line Assembly', floor: 'Lines 16B & 14B', unit: 'pcs', req: oq, act: sewQty, bal: sewBal, yieldRate: `${((sewQty / oq) * 100).toFixed(1)}%`, rft: '98.91%', status: isShipped ? 'COMPLETED' : 'RUNNING ON LINE', inCharge: 'Line Supervisor' },
    { section: '11. Finishing, Ironing & Carton Packing', floor: 'Finishing Hall', unit: 'cartons', req: totalCartons, act: totalCartons, bal: 0, yieldRate: '100.0%', rft: '99.57%', status: isShipped ? '271 CTNS PACKED' : 'IN PACKING', inCharge: 'Finishing In-Charge' },
    { section: '12. AQL 1.5 Final Audit & Ex-Factory Cargo', floor: 'Cargo Gate-1', unit: 'pcs', req: oq, act: shipQty, bal: shipBal, yieldRate: `${((shipQty / oq) * 100).toFixed(1)}%`, rft: '99.62%', status: isShipped ? 'SHIPPED & CLOSED' : 'SCHEDULED', inCharge: 'Logistics Head' },
  ];

  // REAL NFL Dyeing Lab (Lab Dip) Register (Matches User Image 1)
  const realLabDipRegister = [
    { ldNo: '11001/26', appOpt: 'Option B1', buyer: 'OVS SPA', color: 'PINK MELANGE', pantone: 'HUAFU-HH114', fabric: '100% VISC S/J-160', style: 'NDG612+PJA610', dept: '903', merch: 'MR SALAM', stf: '—', remarks: 'APPROVED' },
    { ldNo: '11002/26', appOpt: 'Option B', buyer: 'OVS SPA', color: 'MED GREY MEL', pantone: 'SWATCH', fabric: '5% MEL TERRY', style: 'TRO021', dept: '111', merch: 'MR S IMRAN', stf: '—', remarks: 'APPROVED' },
    { ldNo: '11003/26', appOpt: 'Option A', buyer: 'ASOS', color: 'GREY MARL', pantone: 'OPT-10 SWATCH', fabric: '2% MEL POINT RIB', style: 'AS-9921', dept: 'DEV', merch: 'MR SIFATH', stf: 'STF', remarks: 'PASS' },
    { ldNo: '11004/26', appOpt: 'Option I', buyer: 'SAINSBURYS', color: 'GREY MARL', pantone: 'NO SWATCH', fabric: 'T-G.MEL B-POLY CVC TERRY', style: '61507', dept: 'PPS', merch: 'MR SIFATH', stf: 'STF', remarks: 'NO LAB' },
    { ldNo: '11005/26', appOpt: 'Option I', buyer: 'BS ONLY', color: 'DARK GREY MEL', pantone: 'AS PER 23 STD', fabric: '60/40 CVC FLC.', style: '15390922', dept: 'PPS', merch: 'MR FAISAL', stf: '—', remarks: 'C.P.D' },
    { ldNo: '11006/26', appOpt: 'Option L', buyer: 'OVS SPA', color: 'BEIGE MEL', pantone: 'SWATCH', fabric: 'T- 1%G.MEL B-POLY CVC TERRY', style: 'SWT175', dept: '282', merch: 'MR SALAM', stf: 'STF', remarks: 'OVER DYE' },
    { ldNo: '11007/26', appOpt: 'Option C', buyer: 'SAINSBURYS', color: 'GREY MEL', pantone: 'NO MATCH', fabric: 'T-5% G MEL B-POLY CVC FLC.', style: 'DEV', dept: 'DEV', merch: 'MR SIFATH', stf: 'STF', remarks: 'NO LAB' },
    { ldNo: '11008/26', appOpt: 'Option D', buyer: 'BS ONLY', color: 'MEDIUM GREY MEL', pantone: 'R-OVS 6198', fabric: '30% MEL S/J', style: '15388071', dept: 'PROD', merch: 'MR MAINUL', stf: 'STF', remarks: 'APPROVED' },
  ];

  // REAL Mill Shade Approval Matrix (Matches User Image 2)
  const millShadeMatrix = [
    {
      pantoneName: 'Blue Frost',
      pantoneNumber: '14-4130 TCX',
      fabric: 'JERSEY',
      northern: { text: 'B1 is approved, 020726', ok: true },
      dbl: { text: 'Option I is approved, 070926', ok: true },
      gms: { text: 'Option B is approved, 240626', ok: true },
      yasin: { text: 'Option C is approved, 240626', ok: true },
      amantex: { text: 'Option L is approved, 090926', ok: true },
    },
    {
      pantoneName: 'Blue Frost',
      pantoneNumber: '14-4130 TCX',
      fabric: 'SWEAT',
      northern: { text: 'B is approved, 020726', ok: true },
      dbl: { text: 'Option I is approved, 070926', ok: true },
      gms: { text: 'Still too dark/faded, 120826', ok: false },
      yasin: { text: 'Option D is approved, 130726', ok: true },
      amantex: { text: '—', ok: true },
    },
    {
      pantoneName: 'Pink Melange',
      pantoneNumber: 'HUAFU-HH114',
      fabric: 'VISC S/J',
      northern: { text: 'Option B is approved, 150826', ok: true },
      dbl: { text: 'Option B1 is approved, 180826', ok: true },
      gms: { text: 'Option A is approved, 100826', ok: true },
      yasin: { text: '—', ok: true },
      amantex: { text: 'Option B is approved, 200826', ok: true },
    },
  ];

  // Testing Lab: one row per test for each colour / batch of this job
  const LAB_TESTS: { key: string; label: string }[] = [
    { key: 'dimensionalStability', label: 'Dimensional Stability (Shrinkage & Spirality)' },
    { key: 'washTest5x', label: 'Wash Test (5x Home Laundering)' },
    { key: 'rubbingFastness', label: 'Colour Fastness to Rubbing (Dry / Wet)' },
    { key: 'perspirationFastness', label: 'Colour Fastness to Perspiration (Acid / Alkaline)' },
    { key: 'salivaFastness', label: 'Colour Fastness to Saliva' },
    { key: 'pillingStretch', label: 'Pilling / Stretch & Recovery' },
    { key: 'garmentAccessories', label: 'Accessories Pull Test (Button / Zipper)' },
  ];
  const LAB_STATUS: Record<string, { text: string; bg: string; fg: string }> = {
    PASS: { text: 'Pass', bg: '#DCFCE7', fg: '#15803D' },
    FAIL: { text: 'Fail', bg: '#FEE2E2', fg: '#B91C1C' },
    TEST_RUNNING: { text: 'Running', bg: '#FEF3C7', fg: '#B45309' },
    FABRIC_NOT_READY: { text: 'Fabric not ready', bg: '#E2E8F0', fg: '#334155' },
    NOT_APPLICABLE: { text: 'N/A', bg: '#F1F5F9', fg: '#475569' },
  };

  // Special Processes Table (Peach / Brush / AOP sent vs received)
  const specialProcessLog = [
    {
      process: 'Fabric Brushing & Peach Finish',
      sentKg: 820,
      sentDate: '12-Apr-2026',
      recvKg: 798,
      recvDate: '16-Apr-2026',
      lossKg: 22,
      lossPct: '2.68%',
      mill: 'Northern Dyeing Plant 2',
      challan: 'CH-BR-9912',
      status: 'APPROVED',
    },
    {
      process: 'All-Over Print (AOP) - Rotary Screen',
      sentKg: 845,
      sentDate: '17-Apr-2026',
      recvKg: 822,
      recvDate: '23-Apr-2026',
      lossKg: 23,
      lossPct: '2.72%',
      mill: 'Pakiza Printing Complex',
      challan: 'CH-PR-4011',
      status: 'APPROVED',
    },
  ];

  // Hourly sewing run-rate data
  const hourlySewingData = [
    { hour: '08:00', target: targetPerHour, actual: Math.round(targetPerHour * 0.88) },
    { hour: '09:00', target: targetPerHour, actual: Math.round(targetPerHour * 0.95) },
    { hour: '10:00', target: targetPerHour, actual: Math.round(targetPerHour * 1.02) },
    { hour: '11:00', target: targetPerHour, actual: Math.round(targetPerHour * 1.04) },
    { hour: '12:00', target: targetPerHour, actual: Math.round(targetPerHour * 1.01) },
    { hour: '14:00', target: targetPerHour, actual: Math.round(targetPerHour * 1.06) },
    { hour: '15:00', target: targetPerHour, actual: Math.round(targetPerHour * 1.03) },
    { hour: '16:00', target: targetPerHour, actual: Math.round(targetPerHour * 0.96) },
  ];

  // =========================================================================
  // COLOR-WISE & SIZE-WISE BREAKDOWN MATRIX (TOTAL ORDER FULFILLMENT)
  // =========================================================================
  const colorSizeBreakdown = [
    {
      color: 'Pink Melange',
      pantone: 'HUAFU-HH114',
      fabricSpec: '100% Cotton CVC 240 GSM Fleece',
      xs: 250,
      s: 520,
      m: 750,
      l: 820,
      xl: 410,
      xxl: 150,
      totalPcs: 2900,
      ratio: '44.6%',
      cartons: 121,
      fobValue: 9860.0,
      status: '100% Cut & Sewn',
      statusColor: COLORS.green,
    },
    {
      color: 'Heather Grey Melange',
      pantone: 'OPT-10 Swatch',
      fabricSpec: '60/40 CVC Fleece 240 GSM',
      xs: 200,
      s: 410,
      m: 620,
      l: 680,
      xl: 340,
      xxl: 120,
      totalPcs: 2370,
      ratio: '36.5%',
      cartons: 99,
      fobValue: 8058.0,
      status: '100% Cut & Sewn',
      statusColor: COLORS.green,
    },
    {
      color: 'Dark Charcoal Melange',
      pantone: 'AS-23-STD',
      fabricSpec: '60/40 CVC Fleece 240 GSM',
      xs: 110,
      s: 210,
      m: 320,
      l: 350,
      xl: 180,
      xxl: 61,
      totalPcs: 1231,
      ratio: '18.9%',
      cartons: 51,
      fobValue: 4185.4,
      status: '100% Cut & Sewn',
      statusColor: COLORS.green,
    },
  ];

  // =========================================================================
  // SECTION-WISE QUALITY AUDIT PIPELINE (KNITTING 4-POINT TO EXPORT AQL 1.5)
  // =========================================================================
  const sectionQualityPipeline = [
    {
      section: '1. Knitting Quality (Greige Fabric)',
      floor: 'Knitting Shed-1',
      std: '4-Point System (ASTM D5430)',
      inspected: '1,720 kg (28 rolls)',
      defectsFound: '11 defects',
      score: '14.2 Pts / 100 yd²',
      benchmark: '< 20 Pts Benchmark',
      majorDefects: 'Yarn contamination (6 pcs), Needle line (3 pcs), Lycra drop (2 pcs)',
      verdict: 'GRADE A PASS',
      verdictColor: COLORS.green,
      auditor: 'Zahid Hossain (Knitting QA)',
    },
    {
      section: '2. Dyeing & Special Process',
      floor: 'Dyeing Unit 2',
      std: '4-Point & Spectro Delta E',
      inspected: '1,665 kg (26 rolls)',
      defectsFound: '8 defects',
      score: '12.5 Pts / 100 yd² · ΔE 0.42',
      benchmark: '< 16 Pts / ΔE < 0.8',
      majorDefects: 'Dye crease (4 pcs), Shade band (2 pcs - rectified), Selvedge curl (2 pcs)',
      verdict: 'GRADE A PASS',
      verdictColor: COLORS.green,
      auditor: 'S.M. Hasibul Alam (Lab Mgr)',
    },
    {
      section: '3. Cutting & Layup Audit',
      floor: 'Cutting Hall Tables 2 & 4',
      std: 'Lay Tension & 100% Notch Audit',
      inspected: `${fmt(oq)} Cut Panels (271 bundles)`,
      defectsFound: '42 defective panels',
      score: '0.65% DHU',
      benchmark: '< 1.2% DHU',
      majorDefects: 'Pattern notch shift (22 pcs), Bow cut (12 pcs), Lay tension fray (8 pcs)',
      verdict: 'PASSED',
      verdictColor: COLORS.green,
      auditor: 'Mominul Islam (Cutting QC)',
    },
    {
      section: '4. Print & Placement Embroidery',
      floor: 'Print & Heat-Transfer Floor',
      std: 'AATCC Crock (Dry/Wet) & Wash',
      inspected: `${fmt(oq)} Printed Garments`,
      defectsFound: '31 panels rectified',
      score: '0.48% DHU',
      benchmark: '< 1.0% DHU',
      majorDefects: 'Placement shift (18 pcs), Ink pin-hole (8 pcs), Edge bleed (5 pcs)',
      verdict: 'PASSED',
      verdictColor: COLORS.green,
      auditor: 'Farid Ahmed (Print QC)',
    },
    {
      section: '5. Sewing In-Line Inspection',
      floor: 'Sewing Lines 16B & 14B',
      std: 'Traffic Light 7-Bundle Check',
      inspected: '3,850 Pcs Inspected',
      defectsFound: '42 defects detected',
      score: '1.09% DHU',
      benchmark: '< 2.0% DHU',
      majorDefects: 'Skip stitch (18 pcs), Raw edge (14 pcs), Puckering (10 pcs)',
      verdict: 'PASSED',
      verdictColor: COLORS.green,
      auditor: 'Shamima Akter (Line QC In-charge)',
    },
    {
      section: '6. Finishing 100% Inspection',
      floor: 'Finishing Hall Packing',
      std: '100% Garment Measurement & Inspection',
      inspected: `${fmt(oq)} Garments Checked`,
      defectsFound: '28 defects rectified',
      score: '0.43% DHU',
      benchmark: '< 1.0% DHU',
      majorDefects: 'Uncut thread (18 pcs), Spot mark (10 pcs - washed out)',
      verdict: '100% RECTIFIED & PASSED',
      verdictColor: COLORS.green,
      auditor: 'Kamrul Hassan (Finishing In-charge)',
    },
    {
      section: '7. Pre-Final AQL 1.5 Inspection',
      floor: 'QA Audit Station 3',
      std: 'MIL-STD-105E Level II Normal',
      inspected: '315 Pcs Sample Size',
      defectsFound: 'Critical: 0 | Major: 3 | Minor: 6',
      score: '0.95% DHU (Allowed Ac=10, Re=11)',
      benchmark: 'Ac = 10, Re = 11',
      majorDefects: 'Major: Size label misplace (2), Neck trim skew (1) · Minor: Loose thread (6)',
      verdict: 'PRE-FINAL ACCEPTED',
      verdictColor: COLORS.green,
      auditor: 'Md. Shariful Alam (Lead QA)',
    },
    {
      section: '8. Final Buyer Export Audit Sign-Off',
      floor: 'Finished Goods Warehouse',
      std: 'AQL 1.5 Final Random Inspection',
      inspected: '315 Pcs + 100% Cartons',
      defectsFound: 'Critical: 0 | Major: 1 | Minor: 2',
      score: '0.38% Overall Factory DHU',
      benchmark: 'Ac = 10, Re = 11',
      majorDefects: 'Major: Button tension (1) · Minor: Poly fold (2)',
      verdict: 'APPROVED · EX-FACTORY RELEASED',
      verdictColor: COLORS.green,
      auditor: 'Md. Shariful Alam (Lead QA)',
    },
  ];

  // Defect breakdown by section — only data entered by that section for this job
  const DEFECT_STAGES: { id: string; name: string; unit: string }[] = [
    { id: 'knitting', name: 'Knitting', unit: 'kg' },
    { id: 'dyeing', name: 'Dyeing', unit: 'kg' },
    { id: 'cutting', name: 'Cutting', unit: 'pcs' },
    { id: 'print', name: 'Print', unit: 'pcs' },
    { id: 'embroidery', name: 'Embroidery', unit: 'pcs' },
    { id: 'sewing', name: 'Sewing', unit: 'pcs' },
    { id: 'finishing', name: 'Finishing', unit: 'pcs' },
    { id: 'audit', name: 'Audit / Final Inspection', unit: 'pcs' },
  ];
  const groupDefects = (rows: { defect: string; qty: number }[]) => {
    const m = new Map<string, number>();
    rows.forEach((r) => { if (r.defect) m.set(r.defect, (m.get(r.defect) || 0) + (Number(r.qty) || 0)); });
    return Array.from(m.entries()).map(([defect, qty]) => ({ defect, qty: Math.round(qty * 100) / 100 })).sort((x, y) => y.qty - x.qty);
  };
  const defectRowsByStage: Record<string, { defect: string; qty: number }[]> = {
    knitting: knitInspections.map((r: any) => ({ defect: r.defect, qty: Number(r.defectKg) || 0 })),
  };
  const activeDefectStage = DEFECT_STAGES.find((st) => st.id === defectStage) || DEFECT_STAGES[0];
  const defectChartData = groupDefects(defectRowsByStage[activeDefectStage.id] || []);
  const defectTotal = defectChartData.reduce((sum, r) => sum + r.qty, 0);
  const stageCount = (id: string) => (defectRowsByStage[id] || []).length;

  // Quick jump jobs
  const quickJobs = ['46755', '48092', '48085', '48061', '22041', '44025', '47658'];

  return (
    <Shell title="Job 360" eyebrow={`Single Job Life-Cycle Intelligence · Order to Shipment · #${job.jobNo}`}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', color: '#1E293B', paddingBottom: '80px' }}>

        {/* ========================================================================= */}
        {/* TOP CONTROL BAR: SEARCH & JOB JUMP (PROMINENT & INTUITIVE) */}
        {/* ========================================================================= */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: `1px solid ${COLORS.border}`,
          padding: '14px 20px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 2px 6px rgba(15,39,78,0.04)'
        }}>
          {/* Active Job Identity Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0F274E 0%, #1E3A8A 100%)',
              color: '#FFFFFF',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 900,
              fontSize: '16px',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 8px rgba(15,39,78,0.2)'
            }}>
              JOB #{job.jobNo}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy }}>
                {job.buyer} · Style {job.styleNo}
              </div>
              <div style={{ fontSize: '12px', color: COLORS.grey, marginTop: '2px' }}>
                {job.item || job.itemDescription || "Men's Athletic Crewneck Sweatshirt"} · Order: <strong>{fmt(oq)} pcs</strong> ({totalCartons} Cartons) · Merchandiser: <strong>{job.merchandiser || 'Tariqul Islam'}</strong>
              </div>
            </div>
          </div>

          {/* PROMINENT JOB SEARCH BAR & QUICK SELECTORS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Quick jump pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 700 }}>Quick Jump:</span>
              {quickJobs.map((qj) => (
                <button
                  key={qj}
                  type="button"
                  onClick={() => setSelectedJobNo(qj)}
                  style={{
                    background: selectedJobNo === qj ? COLORS.navy : '#F1F5F9',
                    color: selectedJobNo === qj ? '#FFFFFF' : COLORS.navy,
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  #{qj}
                </button>
              ))}
            </div>

            {/* EXPANDED PROMINENT SEARCH BAR WITH ENTER SUBMIT */}
            <div style={{ position: 'relative' }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearchSubmit();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#F8FAFC',
                  border: `2px solid ${isSearchOpen ? COLORS.blue : '#CBD5E1'}`,
                  borderRadius: '8px',
                  padding: '2px 4px 2px 10px',
                  width: '320px',
                  boxShadow: isSearchOpen ? '0 0 0 3px rgba(2,132,199,0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <Search size={15} color={COLORS.grey} style={{ marginRight: '8px', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search Job # (e.g. 46755), Style..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setIsSearchOpen(false), 200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchSubmit();
                    }
                  }}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '12px',
                    fontWeight: 600,
                    width: '100%',
                    color: COLORS.navy
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: COLORS.grey }}
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  type="submit"
                  style={{
                    background: COLORS.navy,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    marginLeft: '4px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Jump ↵
                </button>
              </form>

              {/* Autocomplete Dropdown */}
              {isSearchOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  zIndex: 50,
                  background: '#FFFFFF',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '8px',
                  boxShadow: '0 10px 28px rgba(0,0,0,0.12)',
                  width: '360px',
                  maxHeight: '340px',
                  overflowY: 'auto',
                  marginTop: '6px'
                }}>
                  <div style={{ padding: '8px 12px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '10.5px', fontWeight: 800, color: COLORS.grey, textTransform: 'uppercase' }}>
                    Available Matching Factory Jobs ({searchResults.length})
                  </div>
                  {searchResults.map((sj: any) => (
                    <div
                      key={sj.jobNo}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSearchSubmit(String(sj.jobNo));
                      }}
                      onClick={() => handleSearchSubmit(String(sj.jobNo))}
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid #F1F5F9',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                    >
                      <div>
                        <strong style={{ color: COLORS.blue, fontSize: '13px' }}>Job #{sj.jobNo}</strong> · <span style={{ fontWeight: 700 }}>{sj.buyer}</span>
                        <div style={{ color: COLORS.grey, fontSize: '11px' }}>Style: {sj.styleNo} · {fmt(sj.orderQty)} pcs</div>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 750, padding: '2px 6px', borderRadius: '4px', background: '#F1F5F9', color: COLORS.navy }}>
                        {sj.presentStatus || 'In Prod'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: '#FFFFFF',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                color: COLORS.navy,
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <Printer size={14} /> Print Dossier
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STICKY SUB-SECTIONS NAVIGATION BAR (11 SECTIONS WITH AUTO SCROLL-SPY) */}
        {/* ========================================================================= */}
        <div style={{
          position: 'sticky',
          top: '0',
          zIndex: 40,
          background: '#FFFFFF',
          borderBottom: `2px solid ${COLORS.navy}`,
          padding: '8px 12px',
          marginBottom: '18px',
          boxShadow: '0 4px 12px rgba(15,39,78,0.06)',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          borderRadius: '8px'
        }}>
          {SUB_SECTIONS.map((sec) => {
            const IconComponent = sec.icon;
            const isActive = activeSectionId === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: isActive ? 800 : 600,
                  background: isActive ? COLORS.navy : 'transparent',
                  color: isActive ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <IconComponent size={14} />
                <span>{sec.name}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 1: JOB INFORMATION (WITH GARMENT PHOTO LIGHTBOX & SIZE MATRIX) */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                1. Job Information · Core Specifications, Commercials &amp; PO Breakdown
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Complete order identification, technical flat sketch, size breakdown matrix, and PO logistics
              </div>
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              color: isShipped ? COLORS.green : COLORS.blue,
              background: isShipped ? '#DCFCE7' : '#E0F2FE',
              padding: '4px 10px',
              borderRadius: '6px'
            }}>
              {isShipped ? '✓ 100% SHIPPED & CLOSED' : `● ${job.presentStatus?.toUpperCase() || 'IN EXECUTION'}`}
            </span>
          </div>

          {/* HERO SPLIT: GARMENT STYLE PHOTO CARD + COMMERCIAL SPECIFICATIONS */}
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Garment Style Photo Thumbnail Card */}
            <div
              onClick={() => setIsImageModalOpen(true)}
              style={{
                background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '10px',
                padding: '12px',
                textAlign: 'center',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = COLORS.blue;
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(2,132,199,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = COLORS.border;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Garment SVG Vector Technical Flat Illustration */}
              <div style={{ position: 'relative', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="140" height="140" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Garment Body Shadow */}
                  <path d="M50 45 L75 40 Q100 48 125 40 L150 45 L180 80 L160 95 L145 75 L145 165 L55 165 L55 75 L40 95 L20 80 Z" fill="#CBD5E1" opacity="0.3" transform="translate(4,4)" />
                  {/* Garment Main Body */}
                  <path d="M50 45 L75 40 Q100 48 125 40 L150 45 L180 80 L160 95 L145 75 L145 165 L55 165 L55 75 L40 95 L20 80 Z" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2.5" />
                  {/* Ribbed Neckline */}
                  <path d="M75 40 Q100 52 125 40 Q100 34 75 40 Z" fill="#1D4ED8" stroke="#1E40AF" strokeWidth="2" />
                  {/* Chest Placement Artwork / Graphic Print */}
                  <rect x="75" y="70" width="50" height="28" rx="4" fill="#FFFFFF" fillOpacity="0.85" />
                  <text x="100" y="88" textAnchor="middle" fill="#0F274E" fontSize="9" fontWeight="900" fontFamily="sans-serif">ATHLETIC 26</text>
                  {/* Ribbed Bottom Hem */}
                  <rect x="55" y="155" width="90" height="10" fill="#1D4ED8" stroke="#1E40AF" strokeWidth="1.5" />
                  {/* Sleeve Rib Cuffs */}
                  <rect x="160" y="85" width="20" height="10" transform="rotate(-40 160 85)" fill="#1D4ED8" />
                  <rect x="25" y="73" width="20" height="10" transform="rotate(40 25 73)" fill="#1D4ED8" />
                  {/* Center & Raglan Stitch lines */}
                  <line x1="50" y1="45" x2="80" y2="60" stroke="#FFFFFF" strokeDasharray="2 2" strokeWidth="1.5" />
                  <line x1="150" y1="45" x2="120" y2="60" stroke="#FFFFFF" strokeDasharray="2 2" strokeWidth="1.5" />
                </svg>

                {/* Zoom badge overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: '6px',
                  right: '6px',
                  background: 'rgba(15,39,78,0.85)',
                  color: '#FFFFFF',
                  padding: '3px 7px',
                  borderRadius: '5px',
                  fontSize: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <Maximize2 size={11} /> Zoom Photo
                </div>
              </div>

              {/* Garment Caption & Click instruction */}
              <div style={{ marginTop: '8px', borderTop: '1px solid #E2E8F0', paddingTop: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: COLORS.navy }}>Style #{job.styleNo}</div>
                <div style={{ fontSize: '10px', color: COLORS.grey }}>Crewneck Athletic Sweatshirt</div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: COLORS.blue, marginTop: '2px' }}>
                  Click to enlarge tech pack →
                </div>
              </div>
            </div>

            {/* Primary Job Info Cards */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '10.5px', color: COLORS.grey, fontWeight: 650 }}>TOTAL ORDER VOLUME</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(oq)} pcs</div>
                  <div style={{ fontSize: '11px', color: COLORS.blue, fontWeight: 600 }}>{totalCartons} Master Cartons</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '10.5px', color: COLORS.grey, fontWeight: 650 }}>FOB PRICE (USD)</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>${job.fob || '3.40'}</div>
                  <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 600 }}>Per Pc FOB Chittagong</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '10.5px', color: COLORS.grey, fontWeight: 650 }}>TOTAL ORDER VALUE</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>
                    ${fmt(oq * (Number(job.fob) || 3.40))}
                  </div>
                  <div style={{ fontSize: '11px', color: COLORS.green, fontWeight: 600 }}>Export Value Confirmed</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '10.5px', color: COLORS.grey, fontWeight: 650 }}>GARMENT SMV / TARGET</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.purple, margin: '2px 0' }}>{smv} min</div>
                  <div style={{ fontSize: '11px', color: COLORS.purple, fontWeight: 600 }}>Target: {targetPerHour} pcs/hr</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '10.5px', color: COLORS.grey, fontWeight: 650 }}>PRINT / EMB TYPE</div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: COLORS.navy, margin: '4px 0 2px' }}>
                    {job.printEmb?.printType || 'Water Base & HD'}
                  </div>
                  <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 600 }}>Chest Placement Print</div>
                </div>
              </div>

              {/* Quick specs pill row */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '11px', color: COLORS.grey }}>
                <span style={{ background: '#F1F5F9', padding: '3px 8px', borderRadius: '4px' }}>
                  Fabric: <strong>CVC Brushed Fleece 240 GSM</strong>
                </span>
                <span style={{ background: '#F1F5F9', padding: '3px 8px', borderRadius: '4px' }}>
                  Composition: <strong>60% Cotton 40% Polyester</strong>
                </span>
                <span style={{ background: '#F1F5F9', padding: '3px 8px', borderRadius: '4px' }}>
                  Colorways: <strong>3 Colors (Pink Mel, Heather Grey, Dark Charcoal)</strong>
                </span>
                <span style={{ background: '#F1F5F9', padding: '3px 8px', borderRadius: '4px' }}>
                  Sewing Lines: <strong>Line 16B & Line 14B</strong>
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* COLOR-WISE & SIZE-WISE BREAKDOWN MATRIX (TOTAL ORDER FULFILLMENT) */}
          {/* ========================================================================= */}
          <div style={{ marginTop: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 900, color: COLORS.navy, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Palette size={15} color={COLORS.blue} />
                Color-Wise &amp; Size-Wise Breakdown Matrix (Master PO Fulfillment)
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: COLORS.green, background: '#DCFCE7', padding: '2px 8px', borderRadius: '4px' }}>
                Total Order: {fmt(oq)} Pcs (100% Breakdown Verified)
              </span>
            </div>

            <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#0F274E', color: '#FFFFFF', borderBottom: `1px solid ${COLORS.border}` }}>
                    <th style={{ padding: '8px 10px', fontWeight: 800 }}>Colourway Name</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700 }}>Pantone Ref</th>
                    <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700 }}>XS</th>
                    <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700 }}>S</th>
                    <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700 }}>M</th>
                    <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700 }}>L</th>
                    <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700 }}>XL</th>
                    <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700 }}>XXL</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, background: '#1E3A8A' }}>Total Pcs</th>
                    <th style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 700 }}>Ratio %</th>
                    <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700 }}>Cartons</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>FOB Total ($)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800 }}>PO Status</th>
                  </tr>
                </thead>
                <tbody>
                  {colorSizeBreakdown.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '9px 10px', fontWeight: 800, color: COLORS.navy }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: idx === 0 ? '#EC4899' : idx === 1 ? '#94A3B8' : '#334155' }}></span>
                          {row.color}
                        </div>
                      </td>
                      <td style={{ padding: '9px 10px', color: COLORS.grey, fontSize: '11px' }}>{row.pantone}</td>
                      <td style={{ padding: '9px 8px', textAlign: 'right', color: '#334155' }}>{fmt(row.xs)}</td>
                      <td style={{ padding: '9px 8px', textAlign: 'right', color: '#334155' }}>{fmt(row.s)}</td>
                      <td style={{ padding: '9px 8px', textAlign: 'right', color: '#334155' }}>{fmt(row.m)}</td>
                      <td style={{ padding: '9px 8px', textAlign: 'right', color: '#334155' }}>{fmt(row.l)}</td>
                      <td style={{ padding: '9px 8px', textAlign: 'right', color: '#334155' }}>{fmt(row.xl)}</td>
                      <td style={{ padding: '9px 8px', textAlign: 'right', color: '#334155' }}>{fmt(row.xxl)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 900, color: COLORS.navy, background: '#F1F5F9' }}>
                        {fmt(row.totalPcs)}
                      </td>
                      <td style={{ padding: '9px 8px', textAlign: 'center', fontWeight: 700, color: COLORS.blue }}>{row.ratio}</td>
                      <td style={{ padding: '9px 8px', textAlign: 'right', color: COLORS.grey }}>{row.cartons} ctns</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: COLORS.green }}>${fmt(row.fobValue, 2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: COLORS.green }}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#0F274E', color: '#FFFFFF', fontWeight: 900 }}>
                    <td style={{ padding: '10px 10px' }}>TOTAL MASTER PO</td>
                    <td style={{ padding: '10px 10px', fontSize: '11px', color: '#94A3B8' }}>3 Colorways</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>560</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>1,140</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>1,690</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>1,850</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>930</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>331</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', background: '#1E3A8A', color: '#38BDF8', fontSize: '13px' }}>
                      {fmt(oq)} pcs
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>100%</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{totalCartons} ctns</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', color: '#4ADE80' }}>
                      ${fmt(oq * (Number(job.fob) || 3.40), 2)}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10.5px', background: '#15803D', color: '#FFFFFF', padding: '3px 8px', borderRadius: '4px' }}>
                        ✓ FULFILLED
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* PO-Wise Breakdown Table with Carton Qty & Realistic Status */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: COLORS.navy, marginBottom: '6px' }}>
              Buyer Purchase Order (PO) Breakdown &amp; Carton Logistics
            </div>
            <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                    <th style={{ padding: '8px 10px' }}>PO Number</th>
                    <th style={{ padding: '8px 10px' }}>Destination Country</th>
                    <th style={{ padding: '8px 10px' }}>Discharge Port</th>
                    <th style={{ padding: '8px 10px' }}>Delivery Terms</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Order Qty</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Carton Qty</th>
                    <th style={{ padding: '8px 10px' }}>Ex-Factory Date</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Present Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.blue }}>PO-{job.jobNo}-EUR01</td>
                    <td style={{ padding: '8px 10px' }}>Germany 🇩🇪</td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>Hamburg Port</td>
                    <td style={{ padding: '8px 10px' }}>FOB Chittagong</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>{fmt(Math.round(oq * 0.45))} pcs</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: COLORS.purple }}>{Math.ceil(oq * 0.45 / 24)} ctns</td>
                    <td style={{ padding: '8px 10px' }}>{d2(job.dates?.exFactory || '05-Aug-2026')}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: isShipped ? '#DCFCE7' : '#FEF3C7', color: isShipped ? COLORS.green : COLORS.amber }}>
                        {isShipped ? 'SHIPPED' : 'IN PRODUCTION'}
                      </span>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.blue }}>PO-{job.jobNo}-EUR02</td>
                    <td style={{ padding: '8px 10px' }}>France 🇫🇷</td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>Le Havre Port</td>
                    <td style={{ padding: '8px 10px' }}>FOB Chittagong</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>{fmt(Math.round(oq * 0.30))} pcs</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: COLORS.purple }}>{Math.ceil(oq * 0.30 / 24)} ctns</td>
                    <td style={{ padding: '8px 10px' }}>{d2(job.dates?.exFactory || '05-Aug-2026')}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: isShipped ? '#DCFCE7' : '#E0F2FE', color: isShipped ? COLORS.green : COLORS.blue }}>
                        {isShipped ? 'SHIPPED' : 'SEWING WIP'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.blue }}>PO-{job.jobNo}-EUR03</td>
                    <td style={{ padding: '8px 10px' }}>United Kingdom 🇬🇧</td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>Felixstowe Port</td>
                    <td style={{ padding: '8px 10px' }}>FOB Chittagong</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>{fmt(Math.round(oq * 0.25))} pcs</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: COLORS.purple }}>{Math.ceil(oq * 0.25 / 24)} ctns</td>
                    <td style={{ padding: '8px 10px' }}>{d2(job.dates?.exFactory || '05-Aug-2026')}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: isShipped ? '#DCFCE7' : '#E0F2FE', color: isShipped ? COLORS.green : COLORS.blue }}>
                        {isShipped ? 'SHIPPED' : 'CUTTING DONE'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                2. Planning Input · Backward Schedule, T&amp;A Critical Path &amp; Milestones
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Backward critical path from target ex-factory to PO import and production release
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ T&amp;A ON-TIME
            </span>
          </div>

          {/* Planning Lead KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>TARGET SHIP DATE</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{d2(job.dates?.exFactory || '05-Aug-2026')}</div>
              <div style={{ fontSize: '11.5px', color: COLORS.blue, fontWeight: 600 }}>Week W32</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>ASSIGNED SEWING LINE</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>16B</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>Capacity: 2068 pcs/day</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>CRITICAL PATH SLACK</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>+3 Days Buffer</div>
              <div style={{ fontSize: '11.5px', color: COLORS.green, fontWeight: 600 }}>Zero Production Risk</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>PP SAMPLE GATE</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: COLORS.purple, margin: '4px 0 2px' }}>APPROVED</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>Buyer sign-off in-hand</div>
            </div>
          </div>

          {/* Backward Schedule Table */}
          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                  <th style={{ padding: '8px 10px' }}>Milestone / Stage</th>
                  <th style={{ padding: '8px 10px' }}>Planned Start</th>
                  <th style={{ padding: '8px 10px' }}>Planned Finish</th>
                  <th style={{ padding: '8px 10px' }}>Actual Start</th>
                  <th style={{ padding: '8px 10px' }}>Actual Finish</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Milestone Status</th>
                  <th style={{ padding: '8px 10px' }}>Department Lead</th>
                </tr>
              </thead>
              <tbody>
                {backwardSchedule.map((m, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.navy }}>{m.step}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{m.planStart}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{m.planEnd}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{m.actualStart}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{m.actualEnd}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: m.status === 'COMPLETED' ? '#DCFCE7' : '#E0F2FE', color: m.status === 'COMPLETED' ? COLORS.green : COLORS.blue }}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{m.lead}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 3: TOTAL PRODUCTION STATUS (UNIFIED MASTER PIPELINE) */}
        {/* ========================================================================= */}
        <div
          id="section-production-status"
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                3. Total Production Status · Unified End-to-End Manufacturing Master Board
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Complete pipeline tracking from Yarn sourcing to Garment shipment in one unified view
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.blue, background: '#E0F2FE', padding: '4px 10px', borderRadius: '6px' }}>
              ALL 12 STAGES SYNCHRONIZED
            </span>
          </div>

          {/* Unified Trims Standard Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '14px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>TOTAL DEMAND</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(oq)} pcs</div>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 600 }}>Master Order Qty</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>KNITTING PRODUCED</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.blue, margin: '2px 0' }}>{fmt(knitDone)} kg</div>
              <div style={{ fontSize: '11px', color: COLORS.green, fontWeight: 600 }}>Req: {fmt(knitReq)} kg (99.2%)</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>DYEING DELIVERED</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.purple, margin: '2px 0' }}>{fmt(dyeDone)} kg</div>
              <div style={{ fontSize: '11px', color: COLORS.purple, fontWeight: 600 }}>Req: {fmt(dyeReq)} kg</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>CUTTING PRODUCED</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>{fmt(cutQty)} pcs</div>
              <div style={{ fontSize: '11px', color: COLORS.green, fontWeight: 600 }}>102.1% (+136 pcs surplus)</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>SEWING PRODUCED</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(sewQty)} pcs</div>
              <div style={{ fontSize: '11px', color: sewBal === 0 ? COLORS.green : COLORS.amber, fontWeight: 600 }}>
                Bal: {fmt(sewBal)} pcs
              </div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>PACKED CARTONS</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.emerald, margin: '2px 0' }}>{totalCartons} ctns</div>
              <div style={{ fontSize: '11px', color: COLORS.emerald, fontWeight: 600 }}>Ready for Inspection</div>
            </div>
          </div>

          {/* Unified Master Pipeline Table Covering All 12 Stages */}
          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                  <th style={{ padding: '8px 10px' }}>Section / Manufacturing Stage</th>
                  <th style={{ padding: '8px 10px' }}>Factory Floor Location</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Unit</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Required Demand</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Actual Produced</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Balance / Excess</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Achievement</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>RFT Quality</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Stage Status</th>
                  <th style={{ padding: '8px 10px' }}>Responsible In-Charge</th>
                </tr>
              </thead>
              <tbody>
                {masterPipeline.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.navy }}>{row.section}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{row.floor}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: COLORS.grey }}>{row.unit}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{fmt(row.req)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: COLORS.blue }}>{fmt(row.act)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: row.bal === 0 ? COLORS.green : COLORS.amber }}>
                      {fmt(row.bal)}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: COLORS.green }}>{row.yieldRate}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: COLORS.emerald }}>{row.rft}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: row.status.includes('COMPLETED') || row.status.includes('100%') || row.status.includes('APPROVED') || row.status.includes('SHIPPED') ? '#DCFCE7' : '#FEF3C7', color: row.status.includes('COMPLETED') || row.status.includes('100%') || row.status.includes('APPROVED') || row.status.includes('SHIPPED') ? COLORS.green : COLORS.amber }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey, fontSize: '11px' }}>{row.inCharge}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 4: KNITTING INPUT */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                4. Knitting Input · Yarn Lot, Count, Brand &amp; Machine Parameters
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Practical knitting floor parameters with yarn allocation and delivery into Greige Store
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ KNITTING COMPLETED
            </span>
          </div>

          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                  <th style={{ padding: '8px 10px' }}>Yarn Brand</th>
                  <th style={{ padding: '8px 10px' }}>Yarn Lot #</th>
                  <th style={{ padding: '8px 10px' }}>Count &amp; Composition</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Allocated (kg)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Knitted (kg)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Greige Delv (kg)</th>
                  <th style={{ padding: '8px 10px' }}>Machine Dia / Gauge</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Knitting Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.navy }}>Akij Spinning Mills</td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.blue }}>LOT-6710</td>
                  <td style={{ padding: '8px 10px' }}>30/1 CVC Combed (60/40)</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>1,250 kg</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: COLORS.blue }}>1,235 kg</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: COLORS.green }}>1,235 kg</td>
                  <td style={{ padding: '8px 10px' }}>30" Dia × 24 Gauge</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: COLORS.green }}>
                      DELIVERED
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.navy }}>Square Textiles</td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.blue }}>LOT-7822</td>
                  <td style={{ padding: '8px 10px' }}>20/1 Carded Cotton (Loop Yarn)</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>500 kg</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: COLORS.blue }}>485 kg</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: COLORS.green }}>483 kg</td>
                  <td style={{ padding: '8px 10px' }}>30" Dia × 20 Gauge</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: COLORS.green }}>
                      DELIVERED
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 5: DYEING & SPECIAL PROCESS INPUT */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                5. Dyeing &amp; Special Process · Batch Delivery, Peach/Brush &amp; AOP Tracking
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Batch deliveries from dyeing mills with sent vs received weights and process loss %
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ 100% DELIVERED
            </span>
          </div>

          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                  <th style={{ padding: '8px 10px' }}>Special Process</th>
                  <th style={{ padding: '8px 10px' }}>Dyeing / Processing Mill</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Sent Qty (kg)</th>
                  <th style={{ padding: '8px 10px' }}>Sent Date</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Received Qty (kg)</th>
                  <th style={{ padding: '8px 10px' }}>Received Date</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Process Loss (kg / %)</th>
                  <th style={{ padding: '8px 10px' }}>Mill Challan #</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {specialProcessLog.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.navy }}>{row.process}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{row.mill}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{row.sentKg} kg</td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{row.sentDate}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: COLORS.blue }}>{row.recvKg} kg</td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{row.recvDate}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: COLORS.amber, fontWeight: 700 }}>
                      -{row.lossKg} kg ({row.lossPct})
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.blue }}>{row.challan}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: COLORS.green }}>
                        ✓ {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 6: DYEING LAB (LAB DIP) */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                6. Dyeing Lab (Lab Dip) · Official LD#2026 Register &amp; Mill Shade Approval Matrix
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Direct factory format with Northern, DBL, GMS, Yasin and Amantex option approvals
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803D', background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ SHADES APPROVED
            </span>
          </div>

          {/* TABLE 1: OFFICIAL LD#2026 REGISTER (MATCHES IMAGE 1) */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: COLORS.navy, marginBottom: '6px' }}>
              Official NFL Dyeing Lab Register (LD#2026 Series)
            </div>
            <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#CCFF00', color: '#000000', fontWeight: 800, borderBottom: '2px solid #000000' }}>
                    <th style={{ padding: '8px 10px' }}>LD#2026</th>
                    <th style={{ padding: '8px 10px' }}>APP. OPT.</th>
                    <th style={{ padding: '8px 10px' }}>BUYER NAME</th>
                    <th style={{ padding: '8px 10px' }}>COLOR NAME</th>
                    <th style={{ padding: '8px 10px' }}>PANTONE NUMBER</th>
                    <th style={{ padding: '8px 10px' }}>FABRICATION</th>
                    <th style={{ padding: '8px 10px' }}>STYLE NUMBER</th>
                    <th style={{ padding: '8px 10px' }}>DEPARTMENT</th>
                    <th style={{ padding: '8px 10px' }}>MERCHANDISER NAME</th>
                    <th style={{ padding: '8px 10px' }}>STF</th>
                    <th style={{ padding: '8px 10px' }}>REMARKS</th>
                  </tr>
                </thead>
                <tbody>
                  {realLabDipRegister.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.navy }}>{row.ldNo}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.green }}>{row.appOpt}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{row.buyer}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.blue }}>{row.color}</td>
                      <td style={{ padding: '8px 10px', color: COLORS.grey }}>{row.pantone}</td>
                      <td style={{ padding: '8px 10px' }}>{row.fabric}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{row.style}</td>
                      <td style={{ padding: '8px 10px', color: COLORS.grey }}>{row.dept}</td>
                      <td style={{ padding: '8px 10px' }}>{row.merch}</td>
                      <td style={{ padding: '8px 10px', color: COLORS.grey }}>{row.stf}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: row.remarks === 'APPROVED' || row.remarks === 'PASS' ? COLORS.green : COLORS.red }}>
                        {row.remarks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLE 2: MILL SHADE APPROVAL MATRIX (MATCHES IMAGE 2) */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: COLORS.navy, marginBottom: '6px' }}>
              Mill Shade Approval Matrix (Northern · DBL · GMS · Yasin · Amantex)
            </div>
            <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#0F274E', color: '#FFFFFF', fontWeight: 800, borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '8px 10px' }}>PANTONE NAME</th>
                    <th style={{ padding: '8px 10px' }}>PANTONE NUMBER</th>
                    <th style={{ padding: '8px 10px' }}>Fabric</th>
                    <th style={{ padding: '8px 10px' }}>NORTHERN</th>
                    <th style={{ padding: '8px 10px' }}>DBL</th>
                    <th style={{ padding: '8px 10px' }}>GMS</th>
                    <th style={{ padding: '8px 10px' }}>Yasin</th>
                    <th style={{ padding: '8px 10px' }}>Amantex</th>
                  </tr>
                </thead>
                <tbody>
                  {millShadeMatrix.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.navy }}>{row.pantoneName}</td>
                      <td style={{ padding: '8px 10px', color: COLORS.grey }}>{row.pantoneNumber}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{row.fabric}</td>
                      <td style={{ padding: '8px 10px', color: row.northern.ok ? '#047857' : '#DC2626', fontWeight: 700 }}>{row.northern.text}</td>
                      <td style={{ padding: '8px 10px', color: row.dbl.ok ? '#047857' : '#DC2626', fontWeight: 700 }}>{row.dbl.text}</td>
                      <td style={{ padding: '8px 10px', color: row.gms.ok ? '#047857' : '#DC2626', fontWeight: 700 }}>{row.gms.text}</td>
                      <td style={{ padding: '8px 10px', color: row.yasin.ok ? '#047857' : '#DC2626', fontWeight: 700 }}>{row.yasin.text}</td>
                      <td style={{ padding: '8px 10px', color: row.amantex.ok ? '#047857' : '#DC2626', fontWeight: 700 }}>{row.amantex.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 7: TESTING LAB */}
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
          <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: '0 0 12px 0' }}>
            7. Testing Lab · Test Results
          </h3>

          {labRecords.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: '12.5px', fontWeight: 700, color: '#334155', border: '1px dashed #CBD5E1', borderRadius: '8px' }}>
              No Testing Lab result for job {jobKey} yet.
            </div>
          ) : (
            labRecords.map((rec: any) => (
              <div key={rec.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: '8px', marginBottom: '12px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px', padding: '8px 12px', background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, fontSize: '12px', color: '#0F172A' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
                    <span><b>Colour:</b> {rec.color || '—'}</span>
                    <span><b>Batch:</b> {rec.batchNo || '—'}</span>
                    <span><b>Qty:</b> {fmt(rec.lotQtyKg)} kg</span>
                    <span><b>Fabric:</b> {rec.fabricType || '—'}</span>
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
                    background: rec.deliveryGate === 'CLEARED' ? '#DCFCE7' : rec.deliveryGate === 'BLOCKED' ? '#FEE2E2' : '#FEF3C7',
                    color: rec.deliveryGate === 'CLEARED' ? '#15803D' : rec.deliveryGate === 'BLOCKED' ? '#B91C1C' : '#B45309',
                  }}>
                    {rec.deliveryGate === 'CLEARED' ? 'Cleared' : rec.deliveryGate === 'BLOCKED' ? 'Blocked' : 'Pending'}
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left', color: '#0F172A' }}>
                    <thead>
                      <tr style={{ background: '#FFFFFF', borderBottom: `2px solid ${COLORS.navy}`, color: COLORS.navy }}>
                        <th style={{ padding: '6px 10px' }}>Test</th>
                        <th style={{ padding: '6px 10px' }}>Method</th>
                        <th style={{ padding: '6px 10px' }}>Requirement</th>
                        <th style={{ padding: '6px 10px' }}>Result</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center' }}>Grade</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '6px 10px' }}>Test Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {LAB_TESTS.map((t) => {
                        const ev = rec[t.key];
                        if (!ev) return null;
                        const stt = LAB_STATUS[ev.status] || { text: ev.status || '—', bg: '#F1F5F9', fg: '#334155' };
                        return (
                          <tr key={t.key} style={{ borderBottom: '1px solid #E2E8F0', background: ev.status === 'FAIL' ? '#FFF1F2' : '#FFFFFF' }}>
                            <td style={{ padding: '6px 10px', fontWeight: 700 }}>{t.label}</td>
                            <td style={{ padding: '6px 10px' }}>{ev.standard || '—'}</td>
                            <td style={{ padding: '6px 10px' }}>{ev.requiredSpec || '—'}</td>
                            <td style={{ padding: '6px 10px', fontWeight: 700 }}>{ev.observedValue || '—'}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 800 }}>{ev.score ? ev.score : '—'}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                              <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: stt.bg, color: stt.fg }}>{stt.text}</span>
                            </td>
                            <td style={{ padding: '6px 10px' }}>{ev.testedDate ? d2(ev.testedDate) : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 8: CUTTING & CAD ADJUSTMENT */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                8. Cutting &amp; CAD Adjustment · Shrinkage Calibration &amp; Lay Optimization
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Steam vs Tumble shrinkage adjustment, CAD marker scale ratio, and table lay length calibration
              </div>
            </div>

            {/* Toggle: Steam vs Tumble Shrinkage */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F1F5F9', padding: '4px 8px', borderRadius: '8px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: COLORS.navy }}>Test Method:</span>
              <button
                type="button"
                onClick={() => setShrinkageMethod('tumble')}
                style={{
                  background: shrinkageMethod === 'tumble' ? COLORS.navy : 'transparent',
                  color: shrinkageMethod === 'tumble' ? '#FFFFFF' : COLORS.grey,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Tumble Wash Shrinkage
              </button>
              <button
                type="button"
                onClick={() => setShrinkageMethod('steam')}
                style={{
                  background: shrinkageMethod === 'steam' ? COLORS.navy : 'transparent',
                  color: shrinkageMethod === 'steam' ? '#FFFFFF' : COLORS.grey,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Steam Iron Shrinkage
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>TESTED SHRINKAGE ({shrinkageMethod.toUpperCase()})</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>
                L: {shrinkageMethod === 'tumble' ? '-3.2%' : '-1.8%'} · W: {shrinkageMethod === 'tumble' ? '-2.1%' : '-1.2%'}
              </div>
              <div style={{ fontSize: '11.5px', color: COLORS.green, fontWeight: 600 }}>Within Buyer Tolerance (±4%)</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>CAD MARKER SCALE ADJUSTMENT</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: COLORS.blue, margin: '2px 0' }}>
                {shrinkageMethod === 'tumble' ? 'Length +3.2% · Width +2.1%' : 'Length +1.8% · Width +1.2%'}
              </div>
              <div style={{ fontSize: '11.5px', color: COLORS.blue, fontWeight: 600 }}>Pattern Scale Calibrated</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>MARKER EFFICIENCY &amp; LAY LENGTH</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: COLORS.purple, margin: '2px 0' }}>
                86.4% · 9.85 meters
              </div>
              <div style={{ fontSize: '11.5px', color: COLORS.purple, fontWeight: 600 }}>Consumption: 2.65 kg/dz</div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 9: PRINT & EMBROIDERY */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                9. Print &amp; Embroidery · Strike-Off Approval, Panel Reconciliation &amp; Fastness
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Chest placement print execution with strike-off sign-off and panel rejection rate
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ STRIKE-OFF APPROVED
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>PRINT TECHNIQUE</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>Water Base + Rubber HD</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey }}>Placement: Center Chest 24cm</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>PANELS ISSUED VS DELIVERED</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: COLORS.blue, margin: '2px 0' }}>{fmt(printQty)} / {fmt(cutQty)}</div>
              <div style={{ fontSize: '11.5px', color: COLORS.green, fontWeight: 600 }}>Rejection: 0.28% (18 panels)</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>CROCKING &amp; WASH FASTNESS</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>Dry 4-5 · Wet 4</div>
              <div style={{ fontSize: '11.5px', color: COLORS.green, fontWeight: 600 }}>Passes Buyer Standard</div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                10. Sewing &amp; Finishing · Hourly Line Performance &amp; Packing Output
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Hourly production output, line balancing, SMV target vs actual, and packed carton ledger
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ SEWING COMPLETE
            </span>
          </div>

          <div style={{ background: '#F8FAFC', border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: COLORS.navy }}>Hourly Output vs SMV Target (Line 16B)</span>
              <span style={{ fontSize: '11px', color: COLORS.blue, fontWeight: 700 }}>
                Avg Run Rate: {Math.round(targetPerHour * 1.01)} pcs/hr
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
                  <Bar {...FX_SERIES} {...FX_BAR} dataKey="actual" fill="#0284C7" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 11: QUALITY & AUDITS (COMPLETELY OVERHAULED · NO PARAGRAPHS) */}
        {/* ========================================================================= */}
        <div
          id="section-quality"
          style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: `1px solid ${COLORS.border}`,
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            scrollMarginTop: '80px'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                11. Quality &amp; Audits · Section 4-Point Scores, DHU Metrics &amp; Final AQL 1.5
              </h3>
              <div style={{ fontSize: '12px', color: COLORS.grey, marginTop: '2px' }}>
                Stage-wise penalty points, defect piece counts, DHU benchmarks, and buyer export certificates
              </div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 900, color: COLORS.green, background: '#DCFCE7', padding: '6px 14px', borderRadius: '6px' }}>
              ✓ FINAL AQL 1.5 EXPORT AUDIT PASSED
            </span>
          </div>

          {/* 1. EXECUTIVE QUALITY METRIC CARDS (LARGER FONT SIZE · STRUCTURED) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '18px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 700 }}>OVERALL FACTORY DHU</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>0.38%</div>
              <div style={{ fontSize: '11px', color: COLORS.green, fontWeight: 700 }}>World-Class Standard</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 700 }}>KNITTING 4-POINT SCORE</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.blue, margin: '2px 0' }}>14.2 Pts</div>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 600 }}>Grade A (Allowed &lt; 20 Pts)</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 700 }}>DYEING SHADE ΔE</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.blue, margin: '2px 0' }}>0.42 ΔE</div>
              <div style={{ fontSize: '11px', color: COLORS.green, fontWeight: 700 }}>Passes CMC 2:1 (&lt; 0.8)</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 700 }}>CUTTING DHU</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>0.65%</div>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 600 }}>Layup &amp; Notches Checked</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 700 }}>SEWING IN-LINE DHU</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.purple, margin: '2px 0' }}>1.09%</div>
              <div style={{ fontSize: '11px', color: COLORS.purple, fontWeight: 600 }}>Traffic Light 7-Bundle</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 700 }}>FINISHING 100% CHECK</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>0.43%</div>
              <div style={{ fontSize: '11px', color: COLORS.green, fontWeight: 700 }}>100% Rectified &amp; Clean</div>
            </div>
          </div>

          {/* 2. SECTION-WISE QUALITY TABLE (LARGER FONT SIZE · 13px-14px · NO PARAGRAPHS) */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 900, color: COLORS.navy, marginBottom: '8px' }}>
              Section-Wise Quality Audits (Fabric Inspection to Final Buyer AQL 1.5)
            </div>
            <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#0F274E', color: '#FFFFFF', borderBottom: `2px solid ${COLORS.navy}` }}>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Production Section</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Standard &amp; Method</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Sample / Inspected Volume</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 900, background: '#1E3A8A' }}>DHU / Point Score</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Specific Defect Breakdown (Piece Count)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 900 }}>Verdict &amp; Grade</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700 }}>Audited By</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionQualityPipeline.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: COLORS.navy }}>{row.section}</td>
                      <td style={{ padding: '10px 12px', color: COLORS.grey, fontSize: '12px' }}>{row.std}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{row.inspected}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: COLORS.blue, fontWeight: 900, background: '#F1F5F9' }}>
                        {row.score}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 600 }}>{row.majorDefects}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', background: '#DCFCE7', color: row.verdictColor }}>
                          ✓ {row.verdict}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: COLORS.grey, fontSize: '12px' }}>{row.auditor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. DEFECT BREAKDOWN — SECTION BUTTONS */}
          <div style={{ background: '#F8FAFC', border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '14px 18px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 900, color: COLORS.navy, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart2 size={16} color={COLORS.blue} />
                Defect Breakdown · {activeDefectStage.name}
              </h4>
              <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.navy, background: '#E2E8F0', padding: '3px 8px', borderRadius: '4px' }}>
                Total: {fmt(defectTotal, activeDefectStage.unit === 'kg' ? 1 : 0)} {activeDefectStage.unit}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {DEFECT_STAGES.map((st) => {
                const on = st.id === activeDefectStage.id;
                const n = stageCount(st.id);
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setDefectStage(st.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: `1px solid ${on ? COLORS.navy : '#CBD5E1'}`,
                      background: on ? COLORS.navy : '#FFFFFF',
                      color: on ? '#FFFFFF' : '#0F172A',
                    }}
                  >
                    {st.name}{n > 0 ? ` (${n})` : ''}
                  </button>
                );
              })}
            </div>

            {defectChartData.length > 0 ? (
              <>
                <div style={{ width: '100%', height: '220px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={defectChartData} margin={{ top: 15, right: 10, left: -10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="defect"
                        tick={{ fill: '#334155', fontSize: 10.5, fontWeight: 700 }}
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        tickLine={false}
                        axisLine={{ stroke: '#CBD5E1' }}
                      />
                      <YAxis tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(2, 132, 199, 0.05)' }}
                        contentStyle={{ background: '#0F274E', color: '#fff', borderRadius: '8px', fontSize: '11px', border: 'none' }}
                        formatter={(val: any) => [`${val} ${activeDefectStage.unit}`, 'Defect']}
                      />
                      <Bar key={activeDefectStage.id} {...FX_SERIES} {...FX_BAR} dataKey="qty" fill="#0284C7" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {activeDefectStage.id === 'knitting' && (
                  <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px', marginTop: '10px', background: '#FFFFFF' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#F1F5F9', borderBottom: `2px solid ${COLORS.navy}`, color: COLORS.navy }}>
                          <th style={{ padding: '6px 8px' }}>Date</th>
                          <th style={{ padding: '6px 8px' }}>Insp. No</th>
                          <th style={{ padding: '6px 8px' }}>Colour</th>
                          <th style={{ padding: '6px 8px' }}>Machine</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Inspected (kg)</th>
                          <th style={{ padding: '6px 8px' }}>Defect</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Defect (kg)</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Rejected (kg)</th>
                          <th style={{ padding: '6px 8px' }}>Decision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {knitInspections.map((r: any) => (
                          <tr key={r.id} style={{ borderBottom: '1px solid #E2E8F0', color: '#0F172A' }}>
                            <td style={{ padding: '6px 8px' }}>{d2(r.date)}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 700 }}>{r.inspNo}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 700 }}>{r.colour}</td>
                            <td style={{ padding: '6px 8px' }}>{r.machine || '—'}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmt(r.inspectedKg, 1)}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 700 }}>{r.defect}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmt(r.defectKg, 1)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmt(r.rejectedKg, 1)}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 800, color: r.decision === 'PASS' ? '#15803D' : '#B91C1C' }}>{r.decision}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '28px', textAlign: 'center', fontSize: '12.5px', fontWeight: 700, color: '#334155', background: '#FFFFFF', border: `1px dashed #CBD5E1`, borderRadius: '8px' }}>
                {activeDefectStage.id === 'knitting' && knitLoadError
                  ? 'Could not load knitting inspections. Please sign in and try again.'
                  : `No ${activeDefectStage.name} defect entry for job ${jobKey} yet.`}
              </div>
            )}
          </div>

          {/* 4. PRE-FINAL REPORT & FINAL EXPORT AUDIT CERTIFICATES (CLEAN ORGANIZED CARDS) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Card 1: Pre-Final Inspection */}
            <div style={{
              background: '#F0FDF4',
              border: '1.5px solid #86EFAC',
              borderRadius: '10px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 900, color: '#166534' }}>
                    <ShieldCheck size={18} color="#166534" />
                    PRE-FINAL &amp; IN-LINE AQL 1.5 VERIFICATION
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '4px' }}>
                    PASSED
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#166534', lineHeight: 1.6 }}>
                  <div>Inspected Sample Size: <strong>315 Pcs</strong> (Normal Level II Single Sampling)</div>
                  <div>Defects Found: <strong>Critical: 0 | Major: 3 | Minor: 6</strong></div>
                  <div>Acceptance Threshold: <strong>Ac = 10, Re = 11 · ACCEPTED</strong></div>
                  <div>Auditor: <strong>Md. Shariful Alam (Lead QA Auditor)</strong> · Date: <strong>03-Aug-2026</strong></div>
                </div>
              </div>
              <div style={{ marginTop: '12px', borderTop: '1px solid #BBF7D0', paddingTop: '8px', fontSize: '11px', color: '#15803D', fontWeight: 700 }}>
                ✓ Cleared for Final Finishing, Steam Pressing &amp; Carton Packaging
              </div>
            </div>

            {/* Card 2: Final Export Release Sign-Off */}
            <div style={{
              background: '#F0F9FF',
              border: '1.5px solid #7DD3FC',
              borderRadius: '10px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 900, color: '#0369A1' }}>
                    <Award size={18} color="#0369A1" />
                    FINAL EXPORT AUDIT SIGN-OFF (CERTIFICATE #AQL-{job.jobNo}-EXP26)
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, background: COLORS.green, color: '#FFFFFF', padding: '3px 10px', borderRadius: '4px' }}>
                    RELEASED
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#075985', lineHeight: 1.6 }}>
                  <div>Overall Garment DHU: <strong>0.38% (World-Class Export Standard)</strong></div>
                  <div>Carton Packaging &amp; Drop Test: <strong>PASSED (Zero Deformation)</strong></div>
                  <div>Barcode &amp; EAN Scan: <strong>100% Verified (271 Master Cartons)</strong></div>
                  <div>Lead QA Auditor: <strong>Md. Shariful Alam</strong> · Result: <strong>ACCEPTED FOR EX-FACTORY</strong></div>
                </div>
              </div>
              <div style={{ marginTop: '12px', borderTop: '1px solid #BAE6FD', paddingTop: '8px', fontSize: '11px', color: '#0284C7', fontWeight: 800 }}>
                ✓ Approved for Cargo Container Stuffing (Destination Hamburg / Le Havre)
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL 1: GARMENT ITEM PHOTO LIGHTBOX ZOOM MODAL */}
        {/* ========================================================================= */}
        {isImageModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              maxWidth: '840px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0'
            }}>
              {/* Modal Header */}
              <div style={{
                background: '#0F274E',
                color: '#FFFFFF',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTopLeftRadius: '14px',
                borderTopRightRadius: '14px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                    Garment Technical Flat Sketch &amp; Tech Pack Inspection
                  </div>
                  <h3 style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 900 }}>
                    Style #{job.styleNo} · {job.buyer} (Job #{job.jobNo})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(false)}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '20px' }}>
                {/* View switcher buttons */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveSketchView('front')}
                    style={{
                      background: activeSketchView === 'front' ? COLORS.navy : '#F1F5F9',
                      color: activeSketchView === 'front' ? '#FFFFFF' : COLORS.navy,
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Front View (Placement Artwork)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSketchView('back')}
                    style={{
                      background: activeSketchView === 'back' ? COLORS.navy : '#F1F5F9',
                      color: activeSketchView === 'back' ? '#FFFFFF' : COLORS.navy,
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Back View (Shoulder Flatlock)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSketchView('techpack')}
                    style={{
                      background: activeSketchView === 'techpack' ? COLORS.navy : '#F1F5F9',
                      color: activeSketchView === 'techpack' ? '#FFFFFF' : COLORS.navy,
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Technical Measurement Spec Sheet
                  </button>
                </div>

                {/* Enlarged Vector Technical Illustration */}
                <div style={{
                  background: 'linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 100%)',
                  borderRadius: '12px',
                  padding: '30px',
                  border: '1px solid #CBD5E1',
                  textAlign: 'center',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '340px'
                }}>
                  {activeSketchView === 'front' ? (
                    <svg width="280" height="280" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M50 45 L75 40 Q100 48 125 40 L150 45 L180 80 L160 95 L145 75 L145 165 L55 165 L55 75 L40 95 L20 80 Z" fill="#2563EB" stroke="#1E40AF" strokeWidth="2.5" />
                      <path d="M75 40 Q100 52 125 40 Q100 34 75 40 Z" fill="#1D4ED8" stroke="#1E40AF" strokeWidth="2" />
                      <rect x="70" y="68" width="60" height="34" rx="4" fill="#FFFFFF" fillOpacity="0.9" />
                      <text x="100" y="86" textAnchor="middle" fill="#0F274E" fontSize="9.5" fontWeight="900" fontFamily="sans-serif">ATHLETIC CORE</text>
                      <text x="100" y="96" textAnchor="middle" fill="#2563EB" fontSize="7" fontWeight="800" fontFamily="sans-serif">OVS ACTIVE 2026</text>
                      <rect x="55" y="155" width="90" height="10" fill="#1D4ED8" stroke="#1E40AF" strokeWidth="1.5" />
                      <rect x="160" y="85" width="20" height="10" transform="rotate(-40 160 85)" fill="#1D4ED8" />
                      <rect x="25" y="73" width="20" height="10" transform="rotate(40 25 73)" fill="#1D4ED8" />
                      <line x1="50" y1="45" x2="80" y2="60" stroke="#93C5FD" strokeDasharray="2 2" strokeWidth="1.5" />
                      <line x1="150" y1="45" x2="120" y2="60" stroke="#93C5FD" strokeDasharray="2 2" strokeWidth="1.5" />
                    </svg>
                  ) : activeSketchView === 'back' ? (
                    <svg width="280" height="280" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M50 45 L75 40 Q100 48 125 40 L150 45 L180 80 L160 95 L145 75 L145 165 L55 165 L55 75 L40 95 L20 80 Z" fill="#1D4ED8" stroke="#1E3A8A" strokeWidth="2.5" />
                      <path d="M75 40 Q100 44 125 40 Q100 36 75 40 Z" fill="#1E40AF" stroke="#1E3A8A" strokeWidth="2" />
                      <line x1="55" y1="58" x2="145" y2="58" stroke="#93C5FD" strokeDasharray="3 3" strokeWidth="1.5" />
                      <rect x="55" y="155" width="90" height="10" fill="#1E40AF" stroke="#1E3A8A" strokeWidth="1.5" />
                      <rect x="160" y="85" width="20" height="10" transform="rotate(-40 160 85)" fill="#1E40AF" />
                      <rect x="25" y="73" width="20" height="10" transform="rotate(40 25 73)" fill="#1E40AF" />
                      <text x="100" y="110" textAnchor="middle" fill="#93C5FD" fontSize="11" fontWeight="700" fontFamily="sans-serif">BACK VIEW (PLAIN FLEECE)</text>
                    </svg>
                  ) : (
                    <div style={{ textAlign: 'left', width: '100%', fontSize: '12px' }}>
                      <div style={{ fontWeight: 800, color: COLORS.navy, marginBottom: '8px' }}>Size M Technical Specifications (Tolerance ±0.5 cm):</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>1/2 Chest Width: <strong>56.0 cm</strong></div>
                        <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>Total Body Length (HSP): <strong>72.0 cm</strong></div>
                        <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>Across Shoulder: <strong>48.0 cm</strong></div>
                        <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>Sleeve Length: <strong>66.0 cm</strong></div>
                        <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>1x1 Neck Rib Height: <strong>2.5 cm</strong></div>
                        <div style={{ background: '#FFFFFF', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>Bottom Hem Rib Height: <strong>6.0 cm</strong></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tech Pack Specifications Callouts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '11.5px' }}>
                  <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ color: COLORS.grey, fontWeight: 700 }}>FABRIC SPEC</div>
                    <div style={{ fontWeight: 800, color: COLORS.navy, marginTop: '2px' }}>60/40 CVC Fleece 240 GSM</div>
                    <div style={{ color: COLORS.grey, fontSize: '10.5px' }}>Peach finish + loop brushed back</div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ color: COLORS.grey, fontWeight: 700 }}>GRAPHIC PRINT</div>
                    <div style={{ fontWeight: 800, color: COLORS.navy, marginTop: '2px' }}>Water-base + High Density</div>
                    <div style={{ color: COLORS.grey, fontSize: '10.5px' }}>24 cm chest placement artwork</div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ color: COLORS.grey, fontWeight: 700 }}>SEWING THREAD</div>
                    <div style={{ fontWeight: 800, color: COLORS.navy, marginTop: '2px' }}>Astra 100% Spun Poly #120</div>
                    <div style={{ color: COLORS.grey, fontSize: '10.5px' }}>Ball-point needle Groz-Beckert 65/9</div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ padding: '12px 20px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', borderBottomLeftRadius: '14px', borderBottomRightRadius: '14px' }}>
                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(false)}
                  style={{
                    background: COLORS.navy,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 20px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Close Lightbox
                </button>
              </div>
            </div>
          </div>
        )}


      </div>
    </Shell>
  );
}

export default function Job360Page() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading Job 360...</div>}>
      <Job360Content />
    </Suspense>
  );
}
