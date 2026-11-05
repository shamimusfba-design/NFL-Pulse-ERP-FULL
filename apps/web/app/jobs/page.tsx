'use client';

import React, { Suspense, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Shell from '../../components/Shell';
import demo2000DataRaw from '../../data/demo-2000-master.json';
import { displayJobNo } from '../../lib/display';
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
  { id: 'section-production-status', label: '3. Total Production Status', icon: '📊' },
  { id: 'section-knitting-input', label: '4. Knitting Input', icon: '⚙️' },
  { id: 'section-dyeing-input', label: '5. Dyeing & Special Process', icon: '🧪' },
  { id: 'section-lab-input', label: '6. Dyeing Lab (Lab Dip)', icon: '🔬' },
  { id: 'section-testing-lab', label: '7. Testing Lab', icon: '📑' },
  { id: 'section-cutting', label: '8. Cutting & CAD Adjustment', icon: '✂️' },
  { id: 'section-print', label: '9. Print & Emb', icon: '🎨' },
  { id: 'section-sewing-finishing', label: '10. Sewing & Finishing', icon: '👕' },
  { id: 'section-quality', label: '11. Quality & Audits', icon: '🏆' },
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
  const [activeTestModal, setActiveTestModal] = useState<boolean>(false);
  
  // Shrinkage test method toggle: 'tumble' | 'steam'
  const [shrinkageMethod, setShrinkageMethod] = useState<'tumble' | 'steam'>('tumble');

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
  const totalCartons = Math.ceil(oq / 24);

  // IE & Industrial Engineering
  const smv = Number(job.ie?.smv) || 7.8;
  const machineQty = Number(job.ie?.machineQty) || 22;
  const manpower = Number(job.ie?.manpower) || 32;
  const targetPerHour = Number(job.ie?.targetPerHour) || Math.round((60 / smv) * machineQty * 0.75);
  const dailyTarget = Number(job.ie?.dailyTarget) || targetPerHour * 10;

  // Garment Illustration
  const primaryColor = job.fabric?.colors || 'Pink Melange';

  // Realistic PO Breakdown with Cartons & Accurate Statuses
  const poBreakdown = [
    {
      po: `PO-${job.jobNo}-EUR01`,
      destination: 'Germany 🇩🇪',
      port: 'Hamburg Port',
      terms: 'FOB Chittagong',
      qty: Math.round(oq * 0.45),
      cartons: Math.ceil((oq * 0.45) / 24),
      shipDate: job.dates?.exFactory || '05-Aug-2026',
      status: isShipped ? 'SHIPPED' : 'IN PRODUCTION',
      statusColor: isShipped ? COLORS.green : COLORS.blue,
      statusBg: isShipped ? '#DCFCE7' : '#E0F2FE'
    },
    {
      po: `PO-${job.jobNo}-EUR02`,
      destination: 'France 🇫🇷',
      port: 'Le Havre Port',
      terms: 'FOB Chittagong',
      qty: Math.round(oq * 0.30),
      cartons: Math.ceil((oq * 0.30) / 24),
      shipDate: job.dates?.exFactory || '05-Aug-2026',
      status: isShipped ? 'SHIPPED' : 'SEWING WIP',
      statusColor: isShipped ? COLORS.green : COLORS.purple,
      statusBg: isShipped ? '#DCFCE7' : '#F3E8FF'
    },
    {
      po: `PO-${job.jobNo}-EUR03`,
      destination: 'United Kingdom 🇬🇧',
      port: 'Felixstowe Port',
      terms: 'FOB Chittagong',
      qty: Math.round(oq * 0.25),
      cartons: Math.ceil((oq * 0.25) / 24),
      shipDate: job.dates?.exFactory || '07-Aug-2026',
      status: isShipped ? 'SHIPPED' : 'CUTTING DONE',
      statusColor: isShipped ? COLORS.green : COLORS.amber,
      statusBg: isShipped ? '#DCFCE7' : '#FEF3C7'
    },
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
    { step: '11. Sewing Line Production Execution', planStart: job.dates?.sewingStart || '15-Jul-2026', planEnd: job.dates?.sewingEnd || '18-Jul-2026', actualStart: '15-Jul-2026', actualEnd: '18-Jul-2026', status: isShipped ? 'COMPLETED' : 'IN PROGRESS', lead: 'Sewing Line 14B' },
    { step: '12. Finishing, AQL 1.5 Audit & Ex-Factory Cargo', planStart: job.dates?.exFactory || '05-Aug-2026', planEnd: job.dates?.cargoClosing || '07-Aug-2026', actualStart: '04-Aug-2026', actualEnd: '05-Aug-2026', status: isShipped ? 'COMPLETED' : 'PENDING PACKING', lead: 'Quality & Shipping' },
  ];

  // Master Unified Production Pipeline
  const masterPipeline = [
    { section: '1. Yarn Allotment & Issue', unit: 'kg', req: Math.round(knitReq * 1.02), act: Math.round(knitReq * 1.02), bal: 0, yieldRate: '100.0%', status: '100% ISSUED', inCharge: 'Yarn Store In-Charge' },
    { section: '2. Circular Knitting', unit: 'kg', req: knitReq, act: knitDone, bal: knitBal, yieldRate: `${((knitDone / knitReq) * 100).toFixed(1)}%`, status: knitBal === 0 ? 'COMPLETED' : 'IN PROGRESS', inCharge: 'Knitting Master' },
    { section: '3. Dyeing & Finishing Delivery', unit: 'kg', req: dyeReq, act: dyeDone, bal: dyeBal, yieldRate: `${((dyeDone / dyeReq) * 100).toFixed(1)}%`, status: dyeBal === 0 ? 'COMPLETED' : 'IN PROGRESS', inCharge: 'Dyeing Head' },
    { section: '4. Bulk Cutting Production', unit: 'pcs', req: oq, act: cutQty, bal: cutBal, yieldRate: `${((cutQty / oq) * 100).toFixed(1)}%`, status: 'CUTTING DONE', inCharge: 'Cutting In-Charge' },
    { section: '5. Print & Embroidery Panels', unit: 'pcs', req: oq, act: printQty, bal: Math.max(0, oq - printQty), yieldRate: `${((printQty / oq) * 100).toFixed(1)}%`, status: printQty >= oq ? 'PASSED 100%' : 'RUNNING', inCharge: 'Print Floor Mgr' },
    { section: '6. Sewing Line Output', unit: 'pcs', req: oq, act: sewQty, bal: sewBal, yieldRate: `${((sewQty / oq) * 100).toFixed(1)}%`, status: isShipped ? 'COMPLETED' : 'RUNNING ON LINE', inCharge: 'Line Supervisor' },
    { section: '7. Finishing & Carton Packing', unit: 'pcs', req: oq, act: sewQty, bal: sewBal, yieldRate: `${((sewQty / oq) * 100).toFixed(1)}%`, status: isShipped ? '100% PACKED' : 'IN PACKING', inCharge: 'Finishing In-Charge' },
    { section: '8. Ex-Factory Shipment', unit: 'pcs', req: oq, act: shipQty, bal: shipBal, yieldRate: `${((shipQty / oq) * 100).toFixed(1)}%`, status: isShipped ? 'SHIPPED' : 'SCHEDULED', inCharge: 'Commercial & Logistics' },
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

  // REAL Testing Lab Register (Matches User Images 3 & 4)
  const realTestingLabRegister = [
    {
      date: '01.01.26',
      buyer: 'UTG',
      jobNo: '41946-9th',
      batch: '01160+10281',
      color: 'RFD Aop',
      qtyKg: 440,
      fabType: 'Vis,L/S/J 220 GSM',
      composition: '95% Viscose 5% Elastane',
      rubDry: '4-5',
      rubWet: '4',
      colorChange: '4-5',
      cfWash: '4-5',
      cfWater: '4-5',
      perspAcid: '4',
      perspAlk: '4',
      saliva: '4-5',
      bursting: '144.7 KPa',
      testRep: '4',
      buyerReq: '3-4',
      result: 'OK',
      isOk: true,
      supplier: 'DB Tex',
      yarnBrand: 'Vardhman',
      yarnLot: 'LOT-9921',
    },
    {
      date: '01.01.26',
      buyer: 'UTG',
      jobNo: '41947',
      batch: '47298',
      color: 'Black',
      qtyKg: 380,
      fabType: 'L/S/J 180 GSM',
      composition: '100% Combed Cotton',
      rubDry: '4-5',
      rubWet: '2', // Failed test in screenshot
      colorChange: '4-5',
      cfWash: '4-5',
      cfWater: '3-4',
      perspAcid: '3',
      perspAlk: '3',
      saliva: '3-4',
      bursting: '142.0 KPa',
      testRep: '2',
      buyerReq: '3-4',
      result: 'Not Ok',
      isOk: false,
      supplier: 'Sparkle',
      yarnBrand: 'Square',
      yarnLot: 'LOT-8412',
    },
    {
      date: '01.01.26',
      buyer: 'B/S Only',
      jobNo: '29402',
      batch: '1626',
      color: 'Cloud Dancer',
      qtyKg: 520,
      fabType: 'CVC Fleece 270 GSM',
      composition: '60% Cotton 40% Polyester',
      rubDry: '4-5',
      rubWet: '4',
      colorChange: '4-5',
      cfWash: '4-5',
      cfWater: '4-5',
      perspAcid: '4-5',
      perspAlk: '4-5',
      saliva: '4-5',
      bursting: '148.5 KPa',
      testRep: '4',
      buyerReq: '3-4',
      result: 'OK',
      isOk: true,
      supplier: 'Northern Dyeing',
      yarnBrand: 'Akij',
      yarnLot: 'LOT-6710',
    },
    {
      date: '01.01.26',
      buyer: 'B/S Only',
      jobNo: '46161',
      batch: '103002',
      color: 'Sweat Lavender',
      qtyKg: 610,
      fabType: 'CVC Terry 240 GSM',
      composition: '60% Cotton 40% Polyester',
      rubDry: '4-5',
      rubWet: '4-5',
      colorChange: '4-5',
      cfWash: '4-5',
      cfWater: '4-5',
      perspAcid: '4-5',
      perspAlk: '4-5',
      saliva: '4-5',
      bursting: '146.2 KPa',
      testRep: '4-5',
      buyerReq: '3-4',
      result: 'OK',
      isOk: true,
      supplier: 'Northern Dyeing',
      yarnBrand: 'Square',
      yarnLot: 'LOT-7822',
    },
    {
      date: '01.01.26',
      buyer: 'B/S Name it',
      jobNo: '44027-9th',
      batch: '20177+22995',
      color: 'Greige Fabric (Dusty Olive)',
      qtyKg: 490,
      fabType: 'CVC Terry 240 GSM',
      composition: '60% Cotton 40% Polyester',
      rubDry: '4-5',
      rubWet: '4-5',
      colorChange: '4-5',
      cfWash: '4-5',
      cfWater: '4-5',
      perspAcid: '4-5',
      perspAlk: '4-5',
      saliva: '4-5',
      bursting: '143.1 KPa',
      testRep: '4-5',
      buyerReq: '3-4',
      result: 'OK',
      isOk: true,
      supplier: 'DB Tex',
      yarnBrand: 'Bablu',
      yarnLot: 'LOT-3391',
    },
  ];

  // Special Processes Table (Peach / Brush / AOP sent vs received)
  const specialProcessLog = [
    {
      process: 'Fabric Brushing & Peach Finish',
      sentKg: 820,
      sentDate: '12-Apr-2026',
      challanSent: 'CH-BR-9901',
      recvKg: 805,
      recvDate: '15-Apr-2026',
      challanRecv: 'CR-BR-4412',
      lossKg: 15,
      lossPct: '1.83%',
      status: 'CLEARED & DELIVERED',
      inCharge: 'M. Selim (Finishing Sub-Dept)'
    },
    {
      process: 'All-Over Rotary Screen Print (AOP)',
      sentKg: 740,
      sentDate: '16-Apr-2026',
      challanSent: 'CH-PR-8812',
      recvKg: 728,
      recvDate: '20-Apr-2026',
      challanRecv: 'CR-PR-3310',
      lossKg: 12,
      lossPct: '1.62%',
      status: 'CLEARED & DELIVERED',
      inCharge: 'Farid Ahmed (Print In-Charge)'
    }
  ];

  // Cutting & CAD Marker Adjustments Table
  const cadCuttingAdjustments = [
    {
      color: primaryColor,
      steamL: '-2.2%',
      steamW: '-1.1%',
      tumbleL: '-2.8%',
      tumbleW: '-1.5%',
      cadMarkerLengthAdj: '+2.9%',
      cadMarkerWidthAdj: '+1.6%',
      cadUpdatedBy: 'CAD Pattern Master (S. K. Paul)',
      cuttingTableLayAdj: '+2.8% Lay Length / +1.5% Lay Width',
      cuttingUpdatedBy: 'Cutting Floor QC (M. Mominul)',
      markerLengthMeters: '8.45 m',
      layCount: '48 plies',
      netConsumption: '2.42 kg/dz',
      status: 'CALIBRATED & APPROVED'
    },
    {
      color: 'Heather Grey',
      steamL: '-2.5%',
      steamW: '-1.3%',
      tumbleL: '-3.1%',
      tumbleW: '-1.7%',
      cadMarkerLengthAdj: '+3.2%',
      cadMarkerWidthAdj: '+1.8%',
      cadUpdatedBy: 'CAD Pattern Master (S. K. Paul)',
      cuttingTableLayAdj: '+3.1% Lay Length / +1.7% Lay Width',
      cuttingUpdatedBy: 'Cutting Floor QC (M. Mominul)',
      markerLengthMeters: '8.52 m',
      layCount: '52 plies',
      netConsumption: '2.45 kg/dz',
      status: 'CALIBRATED & APPROVED'
    }
  ];

  // Hourly Sewing Production Chart
  const hourlySewingData = [
    { hour: '08:00', target: targetPerHour, actual: Math.round(targetPerHour * 0.95) },
    { hour: '09:00', target: targetPerHour, actual: Math.round(targetPerHour * 1.02) },
    { hour: '10:00', target: targetPerHour, actual: Math.round(targetPerHour * 1.05) },
    { hour: '11:00', target: targetPerHour, actual: Math.round(targetPerHour * 0.98) },
    { hour: '12:00', target: targetPerHour, actual: Math.round(targetPerHour * 1.01) },
    { hour: '14:00', target: targetPerHour, actual: Math.round(targetPerHour * 1.04) },
    { hour: '15:00', target: targetPerHour, actual: Math.round(targetPerHour * 1.08) },
    { hour: '16:00', target: targetPerHour, actual: Math.round(targetPerHour * 0.96) },
  ];

  // Section-Wise Inspection Reports
  const sectionInspections = [
    { section: '1. Fabric Store Inspection', std: '4-Point System (ASTM D5430)', inspected: `${fmt(fabRecv)} kg (18 rolls)`, defectCount: 14, dhu: '1.2 pts/100 yd', majorDefects: 'Slub (6), Thick-thin (5), Fly yarn (3)', result: 'PASSED', auditor: 'Zahid Hossain (Sr. Fabric QC)' },
    { section: '2. Cutting Inspection', std: 'Bundle & Notch Audit', inspected: `${fmt(cutQty)} pcs (42 bundles)`, defectCount: 8, dhu: '0.19%', majorDefects: 'Pattern notch shift (5), Bow cut (3)', result: 'PASSED', auditor: 'Mominul Islam (Cutting QC)' },
    { section: '3. Printing Inspection', std: 'AATCC Crock & Wash Test', inspected: `${fmt(printQty)} pcs`, defectCount: 11, dhu: '0.22%', majorDefects: 'Registration shift (6), Pin hole (5)', result: 'PASSED', auditor: 'Farid Ahmed (Print QC)' },
    { section: '4. Sewing In-Line Inspection', std: 'Traffic Light 7-Bundle System', inspected: '3,850 pcs', defectCount: 42, dhu: '1.09%', majorDefects: 'Skip stitch (18), Raw edge (14), Puckering (10)', result: 'PASSED', auditor: 'Shamima Akter (Line QC In-charge)' },
    { section: '5. Finishing 100% Inspection', std: '100% Garment Inspection', inspected: `${fmt(sewQty)} pcs`, defectCount: 28, dhu: '0.43%', majorDefects: 'Uncut thread (18), Spot mark (10 - rectified)', result: 'PASSED', auditor: 'Kamrul Hassan (Finishing In-charge)' },
  ];

  // Quick jump jobs
  const quickJobs = ['46755', '48092', '48085', '48061', '22041'];

  return (
    <Shell title="Job 360" eyebrow={`Single Job Life-Cycle Intelligence · Order to Shipment · #${job.jobNo}`}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', color: '#1E293B', paddingBottom: '80px' }}>

        {/* ========================================================================= */}
        {/* TOP CONTROL BAR: SEARCH & JOB JUMP (SINGLE JOB FOCUS) */}
        {/* ========================================================================= */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '10px',
          border: `1px solid ${COLORS.border}`,
          padding: '12px 18px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          {/* Active Job Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: '#0F274E',
              color: '#FFFFFF',
              padding: '6px 14px',
              borderRadius: '8px',
              fontWeight: 900,
              fontSize: '15px',
              letterSpacing: '0.5px'
            }}>
              JOB #{job.jobNo}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: COLORS.navy }}>
                {job.buyer} · Style {job.styleNo}
              </div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey }}>
                {job.item || job.itemDescription} · Order: <strong>{fmt(oq)} pcs</strong> ({totalCartons} Cartons) · Merchandiser: <strong>{job.merchandiser || 'Tariqul Islam'}</strong>
              </div>
            </div>
          </div>

          {/* Quick Selectors & Live Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                #{qj}
              </button>
            ))}

            {/* Search Input Dropdown */}
            <div style={{ position: 'relative' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#F8FAFC',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '6px',
                padding: '4px 8px',
                width: '210px'
              }}>
                <Search size={14} color={COLORS.grey} style={{ marginRight: '6px' }} />
                <input
                  type="text"
                  placeholder="Search Job, Buyer, Style..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '11.5px',
                    width: '100%'
                  }}
                />
              </div>

              {isSearchOpen && searchQuery.trim() && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  zIndex: 50,
                  background: '#FFFFFF',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  width: '320px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  marginTop: '4px'
                }}>
                  {searchResults.map((sj: any) => (
                    <div
                      key={sj.jobNo}
                      onClick={() => {
                        setSelectedJobNo(String(sj.jobNo));
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid #F1F5F9',
                        cursor: 'pointer',
                        fontSize: '11.5px'
                      }}
                    >
                      <strong style={{ color: COLORS.blue }}>Job #{sj.jobNo}</strong> · {sj.buyer}
                      <div style={{ color: COLORS.grey, fontSize: '10.5px' }}>Style: {sj.styleNo} · {sj.orderQty} pcs</div>
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
                padding: '5px 12px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                color: COLORS.navy
              }}
            >
              <Printer size={13} /> Print Dossier
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
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}>
          {SUB_SECTIONS.map((sec) => {
            const isActive = activeSectionId === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isActive ? COLORS.navy : '#F1F5F9',
                  color: isActive ? '#FFFFFF' : COLORS.navy,
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                1. Job Information · Core Specifications, Commercials &amp; PO Breakdown
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Complete order identification, buyer contract specs, FOB valuation and PO destinations
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

          {/* Primary Job Info Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '14px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>TOTAL ORDER VOLUME</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(oq)} pcs</div>
              <div style={{ fontSize: '11.5px', color: COLORS.blue, fontWeight: 600 }}>{totalCartons} Master Cartons</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>FOB PRICE (USD)</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>${job.fob || '3.40'}</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>Per Pc FOB Chittagong</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>TOTAL ORDER VALUE</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>
                ${fmt(oq * (Number(job.fob) || 3.40))}
              </div>
              <div style={{ fontSize: '11.5px', color: COLORS.green, fontWeight: 600 }}>Export Value Confirmed</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>GARMENT SMV / TARGET</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: COLORS.purple, margin: '2px 0' }}>{smv} min</div>
              <div style={{ fontSize: '11.5px', color: COLORS.purple, fontWeight: 600 }}>Target: {targetPerHour} pcs/hr</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>PRINT / EMB TYPE</div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: '6px 0 2px' }}>
                {job.printEmb?.printType || 'Water Base & HD'}
              </div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>Chest Placement Print</div>
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
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Ex-Factory Date</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Present Status</th>
                  </tr>
                </thead>
                <tbody>
                  {poBreakdown.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.blue }}>{row.po}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{row.destination}</td>
                      <td style={{ padding: '8px 10px', color: COLORS.grey }}>{row.port}</td>
                      <td style={{ padding: '8px 10px' }}>{row.terms}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: COLORS.navy }}>
                        {fmt(row.qty)} pcs
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 750, color: COLORS.purple }}>
                        {row.cartons} ctns
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: COLORS.grey }}>
                        {d2(row.shipDate)}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: row.statusBg,
                          color: row.statusColor
                        }}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>TARGET SHIP DATE</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{d2(job.dates?.exFactory) || '05-Aug-26'}</div>
              <div style={{ fontSize: '11.5px', color: COLORS.green, fontWeight: 600 }}>Week {job.shipment?.week || 'W32'}</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>ASSIGNED SEWING LINE</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: COLORS.blue, margin: '2px 0' }}>{job.lineAllocation?.line || 'Line 14B (Floor 3)'}</div>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, fontWeight: 600 }}>Capacity: {dailyTarget} pcs/day</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>CRITICAL PATH SLACK</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>+3 Days Buffer</div>
              <div style={{ fontSize: '11.5px', color: COLORS.green, fontWeight: 600 }}>Zero Production Risk</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>PP SAMPLE GATE</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: COLORS.purple, margin: '2px 0' }}>APPROVED</div>
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
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: m.status === 'COMPLETED' ? '#DCFCE7' : m.status.includes('PROGRESS') ? '#E0F2FE' : '#FEF3C7',
                        color: m.status === 'COMPLETED' ? COLORS.green : m.status.includes('PROGRESS') ? COLORS.blue : COLORS.amber
                      }}>
                        {m.status}
                      </span>
                    </td>
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
                3. Total Production Status · Unified Section-Wise Quantity &amp; Balance Board
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Unified master tracking of required, produced, balance and yield across all manufacturing stages
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.blue, background: '#E0F2FE', padding: '4px 10px', borderRadius: '6px' }}>
              FACTORY MASTER PIPELINE
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

          {/* Unified Pipeline Table */}
          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                  <th style={{ padding: '8px 10px' }}>Section / Manufacturing Stage</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Unit</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Required Demand</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Actual Produced</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Balance / Excess</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Yield Rate</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Stage Status</th>
                  <th style={{ padding: '8px 10px' }}>Responsible In-Charge</th>
                </tr>
              </thead>
              <tbody>
                {masterPipeline.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.navy }}>{row.section}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: COLORS.grey }}>{row.unit}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{fmt(row.req)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: COLORS.green }}>{fmt(row.act)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: row.bal > 0 ? COLORS.amber : COLORS.grey }}>
                      {fmt(row.bal)}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: COLORS.blue }}>{row.yieldRate}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: row.status.includes('COMPLETED') || row.status.includes('PASSED') || row.status.includes('DONE') || row.status.includes('SHIPPED') || row.status.includes('100%') ? '#DCFCE7' : '#E0F2FE',
                        color: row.status.includes('COMPLETED') || row.status.includes('PASSED') || row.status.includes('DONE') || row.status.includes('SHIPPED') || row.status.includes('100%') ? COLORS.green : COLORS.blue
                      }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{row.inCharge}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 4: KNITTING INPUT (PRACTICAL REAL FACTORY DATA) */}
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
                4. Knitting Input · Yarn Lot, Greige Output &amp; Fabric Store Delivery
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Yarn lot allocation, circular knitting kg produced and delivery to Greige Fabric Store
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ KNITTING COMPLETED &amp; STORE RECEIVED
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>YARN DEMAND (KG)</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(knitReq)} kg</div>
              <div style={{ fontSize: '11px', color: COLORS.green, fontWeight: 600 }}>100% In-House</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>GREY FABRIC KNITTED</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.blue, margin: '2px 0' }}>{fmt(knitDone)} kg</div>
              <div style={{ fontSize: '11px', color: COLORS.blue, fontWeight: 600 }}>Total 68 Rolls Produced</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>KNITTING BALANCE</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: knitBal === 0 ? COLORS.green : COLORS.red, margin: '2px 0' }}>{fmt(knitBal)} kg</div>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 600 }}>0 kg Remaining</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>GREIGE STORE DELIVERY</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: COLORS.green, margin: '4px 0 2px' }}>100% RECEIVED</div>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 600 }}>Challan: CH-KN-4421</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                  <th style={{ padding: '8px 10px' }}>Yarn Lot &amp; Brand</th>
                  <th style={{ padding: '8px 10px' }}>Count &amp; Composition</th>
                  <th style={{ padding: '8px 10px' }}>Fabric Type</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Req Grey (Kg)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Knitted (Kg)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rolls</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Delivery Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.blue }}>Lot 8921 · Bablu Spinning</td>
                  <td style={{ padding: '8px 10px' }}>30/1 Combed Cotton (100%)</td>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>Single Jersey (160 GSM)</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{fmt(knitReq * 0.92)} kg</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: COLORS.green }}>{fmt(knitDone * 0.92)} kg</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>62 rolls</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: COLORS.green }}>
                      ✓ RECEIVED IN GREIGE STORE
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.blue }}>Lot 4410 · DBL Spinning</td>
                  <td style={{ padding: '8px 10px' }}>20/1 Cotton + 70D Spandex</td>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>1x1 Spandex Rib Collar &amp; Cuff</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{fmt(knitReq * 0.08)} kg</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: COLORS.green }}>{fmt(knitDone * 0.08)} kg</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>6 rolls</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: COLORS.green }}>
                      ✓ RECEIVED IN GREIGE STORE
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
                5. Dyeing &amp; Special Process · Batch Output, Peach/Brushing &amp; Store Delivery
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Batch execution, finished fabric kg delivered and special process (peach, brush, AOP) dispatch/receive
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ DELIVERED TO FINISHED STORE
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>DYEING DEMAND</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(dyeReq)} kg</div>
              <div style={{ fontSize: '11px', color: COLORS.blue, fontWeight: 600 }}>Finished Fabric Target</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>DELIVERED TO STORE</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>{fmt(dyeDone)} kg</div>
              <div style={{ fontSize: '11px', color: COLORS.green, fontWeight: 600 }}>100% Quality Passed</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>DYEING SUPPLIER</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: COLORS.navy, margin: '4px 0 2px' }}>DB Tex / Northern</div>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 600 }}>Batch: 01160+10281</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>SPECIAL PROCESS</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: COLORS.purple, margin: '4px 0 2px' }}>Peach &amp; Brushing</div>
              <div style={{ fontSize: '11px', color: COLORS.purple, fontWeight: 600 }}>Process Loss: 1.83% (OK)</div>
            </div>
          </div>

          {/* Special Process Tracking Table */}
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: COLORS.navy, marginBottom: '6px' }}>
              Special Process Dispatch &amp; Receiving Log (Peach, Brush, AOP Process Tracking)
            </div>
            <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                    <th style={{ padding: '8px 10px' }}>Special Process</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Sent Qty (Kg)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Dispatch Date &amp; Challan</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Received Qty (Kg)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Return Date &amp; Challan</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Loss / Wastage</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Process Status</th>
                  </tr>
                </thead>
                <tbody>
                  {specialProcessLog.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.navy }}>{row.process}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{row.sentKg} kg</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: COLORS.grey }}>
                        {row.sentDate} ({row.challanSent})
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: COLORS.green }}>
                        {row.recvKg} kg
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: COLORS.grey }}>
                        {row.recvDate} ({row.challanRecv})
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: COLORS.amber, fontWeight: 700 }}>
                        {row.lossKg} kg ({row.lossPct})
                      </td>
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
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 6: DYEING LAB (REAL NFL LAB DIP FORMAT - MATCHES USER IMAGES) */}
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
                6. Dyeing Lab (Lab Dip) · LD# Register &amp; Mill Shade Approval Matrix
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Lab dip submissions, Pantone codes, buyer option approvals across accredited dye houses
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ SHADE APPROVED (OPTION B1)
            </span>
          </div>

          {/* Table 1: Lab Dip Register (Image 1 Style Lime Header) */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: COLORS.navy, marginBottom: '6px' }}>
              Lab Dip Submission &amp; Approval Register (LD# / 2026)
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid #D9F99D', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#CCFF00', color: '#000000', fontWeight: 900, borderBottom: '2px solid #84CC16' }}>
                    <th style={{ padding: '8px 10px', borderRight: '1px solid #BEF264' }}>LD#2026</th>
                    <th style={{ padding: '8px 10px', borderRight: '1px solid #BEF264' }}>APP. OPT.</th>
                    <th style={{ padding: '8px 10px', borderRight: '1px solid #BEF264' }}>BUYER NAME</th>
                    <th style={{ padding: '8px 10px', borderRight: '1px solid #BEF264' }}>COLOR NAME</th>
                    <th style={{ padding: '8px 10px', borderRight: '1px solid #BEF264' }}>PANTONE NUMBER</th>
                    <th style={{ padding: '8px 10px', borderRight: '1px solid #BEF264' }}>FABRICATION</th>
                    <th style={{ padding: '8px 10px', borderRight: '1px solid #BEF264' }}>STYLE NUMBER</th>
                    <th style={{ padding: '8px 10px', borderRight: '1px solid #BEF264' }}>DEPARTMENT</th>
                    <th style={{ padding: '8px 10px', borderRight: '1px solid #BEF264' }}>MERCHANDISER</th>
                    <th style={{ padding: '8px 10px', borderRight: '1px solid #BEF264', textAlign: 'center' }}>STF</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>REMARKS</th>
                  </tr>
                </thead>
                <tbody>
                  {realLabDipRegister.map((ld, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.navy }}>{ld.ldNo}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.green }}>{ld.appOpt}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{ld.buyer}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.navy }}>{ld.color}</td>
                      <td style={{ padding: '8px 10px', color: COLORS.grey }}>{ld.pantone}</td>
                      <td style={{ padding: '8px 10px' }}>{ld.fabric}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{ld.style}</td>
                      <td style={{ padding: '8px 10px', color: COLORS.grey }}>{ld.dept}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 650 }}>{ld.merch}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: COLORS.grey }}>{ld.stf}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: ld.remarks.includes('APPROVED') || ld.remarks.includes('PASS') ? '#DCFCE7' : ld.remarks.includes('OVER') ? '#FEF3C7' : '#F1F5F9',
                          color: ld.remarks.includes('APPROVED') || ld.remarks.includes('PASS') ? COLORS.green : ld.remarks.includes('OVER') ? COLORS.amber : COLORS.grey
                        }}>
                          {ld.remarks}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Mill Shade Approval Matrix across Mills (Image 2 Style) */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: COLORS.navy, marginBottom: '6px' }}>
              Mill Shade Approval Matrix across Nominated Dye Houses (Northern, DBL, GMS, Yasin, Amantex)
            </div>
            <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
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
                  {millShadeMatrix.map((m, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.navy }}>{m.pantoneName}</td>
                      <td style={{ padding: '8px 10px', color: COLORS.grey }}>{m.pantoneNumber}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{m.fabric}</td>
                      <td style={{ padding: '8px 10px', color: m.northern.ok ? COLORS.green : COLORS.red, fontWeight: 750 }}>
                        {m.northern.text}
                      </td>
                      <td style={{ padding: '8px 10px', color: m.dbl.ok ? COLORS.green : COLORS.red, fontWeight: 750 }}>
                        {m.dbl.text}
                      </td>
                      <td style={{ padding: '8px 10px', color: m.gms.ok ? COLORS.green : COLORS.red, fontWeight: 750 }}>
                        {m.gms.text}
                      </td>
                      <td style={{ padding: '8px 10px', color: m.yasin.ok ? COLORS.green : COLORS.red, fontWeight: 750 }}>
                        {m.yasin.text}
                      </td>
                      <td style={{ padding: '8px 10px', color: m.amantex.ok ? COLORS.green : COLORS.red, fontWeight: 750 }}>
                        {m.amantex.text}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 7: TESTING LAB (MATCHES REAL NFL TESTING LABORATORY FORMAT) */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                7. Testing Lab · Fabric Quality Tests &amp; Official Laboratory Certificate
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Rubbing fastness, wash fastness, perspiration, bursting strength and Northern Fashion Ltd. accredited report
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveTestModal(true)}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  background: COLORS.navy,
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(15,39,78,0.1)'
                }}
              >
                📄 View Official Certificate (NFL26090096)
              </button>
            </div>
          </div>

          {/* Testing Lab Register Table (Matches Images 3 & 4) */}
          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                  <th style={{ padding: '8px 8px' }}>Date</th>
                  <th style={{ padding: '8px 8px' }}>Buyer</th>
                  <th style={{ padding: '8px 8px' }}>Job No</th>
                  <th style={{ padding: '8px 8px' }}>Batch</th>
                  <th style={{ padding: '8px 8px' }}>Color</th>
                  <th style={{ padding: '8px 8px' }}>Fabric &amp; GSM</th>
                  <th style={{ padding: '8px 8px', textAlign: 'center' }}>Rubbing Dry</th>
                  <th style={{ padding: '8px 8px', textAlign: 'center' }}>Rubbing Wet</th>
                  <th style={{ padding: '8px 8px', textAlign: 'center' }}>Color Change</th>
                  <th style={{ padding: '8px 8px', textAlign: 'center' }}>CF to Wash</th>
                  <th style={{ padding: '8px 8px', textAlign: 'center' }}>CF Water</th>
                  <th style={{ padding: '8px 8px', textAlign: 'center' }}>Bursting</th>
                  <th style={{ padding: '8px 8px', textAlign: 'center' }}>Test Rep</th>
                  <th style={{ padding: '8px 8px', textAlign: 'center' }}>Buyer Req</th>
                  <th style={{ padding: '8px 8px', textAlign: 'center' }}>Result</th>
                  <th style={{ padding: '8px 8px' }}>Dyeing Supplier</th>
                </tr>
              </thead>
              <tbody>
                {realTestingLabRegister.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 8px', color: COLORS.grey }}>{row.date}</td>
                    <td style={{ padding: '8px 8px', fontWeight: 700 }}>{row.buyer}</td>
                    <td style={{ padding: '8px 8px', fontWeight: 800, color: COLORS.blue }}>{row.jobNo}</td>
                    <td style={{ padding: '8px 8px', color: COLORS.navy, fontWeight: 700 }}>{row.batch}</td>
                    <td style={{ padding: '8px 8px', fontWeight: 700 }}>{row.color}</td>
                    <td style={{ padding: '8px 8px' }}>{row.fabType}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>{row.rubDry}</td>
                    <td style={{
                      padding: '8px 8px',
                      textAlign: 'center',
                      fontWeight: 800,
                      background: !row.isOk ? '#FEE2E2' : 'transparent',
                      color: !row.isOk ? COLORS.red : 'inherit'
                    }}>
                      {row.rubWet}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>{row.colorChange}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>{row.cfWash}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>{row.cfWater}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 750 }}>{row.bursting}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 800 }}>{row.testRep}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'center', color: COLORS.grey }}>{row.buyerReq}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: row.isOk ? '#DCFCE7' : '#FEE2E2',
                        color: row.isOk ? COLORS.green : COLORS.red
                      }}>
                        {row.result}
                      </span>
                    </td>
                    <td style={{ padding: '8px 8px', fontWeight: 650, color: COLORS.navy }}>{row.supplier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUB-SECTION 8: CUTTING & CAD ADJUSTMENT (STEAM OR TUMBLE TOGGLE) */}
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
                8. Cutting &amp; CAD Adjustment · Shrinkage Method &amp; Marker Calibration
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Steam or Tumble shrinkage testing, CAD marker adjustment and cutting lay calibration
              </div>
            </div>

            {/* User Requested Toggle: Steam Shrinkage OR Tumble Shrinkage */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#F1F5F9',
              borderRadius: '8px',
              padding: '3px',
              border: `1px solid ${COLORS.border}`
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: COLORS.grey, padding: '0 8px' }}>Test Type:</span>
              <button
                type="button"
                onClick={() => setShrinkageMethod('tumble')}
                style={{
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: shrinkageMethod === 'tumble' ? COLORS.navy : 'transparent',
                  color: shrinkageMethod === 'tumble' ? '#FFFFFF' : COLORS.grey,
                  transition: 'all 0.15s ease'
                }}
              >
                🌀 Tumble Shrinkage (Standard)
              </button>
              <button
                type="button"
                onClick={() => setShrinkageMethod('steam')}
                style={{
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: shrinkageMethod === 'steam' ? COLORS.navy : 'transparent',
                  color: shrinkageMethod === 'steam' ? '#FFFFFF' : COLORS.grey,
                  transition: 'all 0.15s ease'
                }}
              >
                ♨️ Steam Shrinkage
              </button>
            </div>
          </div>

          {/* CAD Marker vs Cutting Lay Adjustment Table */}
          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px', marginBottom: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                  <th style={{ padding: '8px 10px' }}>Fabric Color Lot</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>
                    {shrinkageMethod === 'tumble' ? 'Tumble Shrinkage (L / W)' : 'Steam Shrinkage (L / W)'}
                  </th>
                  <th style={{ padding: '8px 10px' }}>CAD Marker Scale Adjustment (Length % / Width %)</th>
                  <th style={{ padding: '8px 10px' }}>CAD Updated From</th>
                  <th style={{ padding: '8px 10px' }}>Cutting Table Lay Calibration</th>
                  <th style={{ padding: '8px 10px' }}>Cutting Updated From</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Net Consumption</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Calibration Status</th>
                </tr>
              </thead>
              <tbody>
                {cadCuttingAdjustments.map((cad, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.navy }}>{cad.color}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: COLORS.purple }}>
                      {shrinkageMethod === 'tumble' ? `${cad.tumbleL} / ${cad.tumbleW}` : `${cad.steamL} / ${cad.steamW}`}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.blue }}>
                      L: {cad.cadMarkerLengthAdj} | W: {cad.cadMarkerWidthAdj} (Marker: {cad.markerLengthMeters})
                    </td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{cad.cadUpdatedBy}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.green }}>
                      {cad.cuttingTableLayAdj} ({cad.layCount})
                    </td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{cad.cuttingUpdatedBy}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: COLORS.navy }}>
                      {cad.netConsumption}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: COLORS.green }}>
                        ✓ {cad.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cutting Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>TARGET CUT PCS</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(oq)}</div>
              <div style={{ fontSize: '11px', color: COLORS.blue, fontWeight: 600 }}>100% Demand</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>ACTUAL CUT PCS</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>{fmt(cutQty)}</div>
              <div style={{ fontSize: '11px', color: COLORS.green, fontWeight: 600 }}>102.1% Yield (+136 pcs surplus)</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>BUNDLES GENERATED</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.purple, margin: '2px 0' }}>42 Bundles</div>
              <div style={{ fontSize: '11px', color: COLORS.purple, fontWeight: 600 }}>Numbered with QR Tickets</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>CUTTING WASTAGE</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>1.45%</div>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 600 }}>Standard &lt; 2.50%</div>
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
                9. Print &amp; Embroidery · Strike-Off Approval &amp; Cut Panel Issue/Return
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Print strike-off buyer sign-off, cut panel dispatch, received passed panels and rejection audit
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ STRIKE-OFF APPROVED &amp; ISSUED
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>PANELS SENT TO PRINT</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>{fmt(cutQty)} pcs</div>
              <div style={{ fontSize: '11px', color: COLORS.blue, fontWeight: 600 }}>100% Bundles Dispatched</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>PASSED PRINTED PANELS</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>{fmt(printQty)} pcs</div>
              <div style={{ fontSize: '11px', color: COLORS.green, fontWeight: 600 }}>AATCC Crock Tested OK</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>PRINT REJECTION</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.amber, margin: '2px 0' }}>14 pcs (0.21%)</div>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 600 }}>Re-cut replacement done</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>BUYER STRIKE-OFF VERDICT</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: COLORS.green, margin: '4px 0 2px' }}>APPROVED 1ST RUN</div>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 600 }}>Color Fastness: 4-5</div>
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
                10. Sewing &amp; Finishing · Hourly Line Output &amp; Floor Efficiency
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Assigned sewing line performance, operator allocation and finishing carton packing
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ LINE EFFICIENCY: 74.2%
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>ASSIGNED SEWING LINE</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>Line 14B</div>
              <div style={{ fontSize: '11px', color: COLORS.blue, fontWeight: 600 }}>Floor 3 (Building 2)</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>TOTAL SEWING OUTPUT</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>{fmt(sewQty)} pcs</div>
              <div style={{ fontSize: '11px', color: COLORS.green, fontWeight: 600 }}>94.0% Produced</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>SEWING BALANCE</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: sewBal === 0 ? COLORS.green : COLORS.amber, margin: '2px 0' }}>{fmt(sewBal)} pcs</div>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 600 }}>Closing today</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '11px', color: COLORS.grey, fontWeight: 650 }}>FINISHED &amp; PACKED</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.purple, margin: '2px 0' }}>{totalCartons} Cartons</div>
              <div style={{ fontSize: '11px', color: COLORS.purple, fontWeight: 600 }}>24 pcs per carton</div>
            </div>
          </div>

          {/* Hourly Sewing Production Recharts Bar Chart with FX_BAR */}
          <div style={{ background: '#F8FAFC', border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: COLORS.navy }}>
                Hourly Line Output Tracker (Target: {targetPerHour} pcs/hr vs Actual)
              </span>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: COLORS.navy, margin: 0 }}>
                11. Quality &amp; Audits · Section Inspections &amp; Final AQL 1.5 Sign-Off
              </h3>
              <div style={{ fontSize: '11.5px', color: COLORS.grey, marginTop: '2px' }}>
                Stage-wise inspections from fabric 4-point to inline, 100% finishing and final buyer AQL 1.5 export audit
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: COLORS.green, background: '#DCFCE7', padding: '4px 10px', borderRadius: '6px' }}>
              ✓ FINAL AQL 1.5 PASSED
            </span>
          </div>

          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px', marginBottom: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                  <th style={{ padding: '8px 10px' }}>Inspection Section</th>
                  <th style={{ padding: '8px 10px' }}>Standard Method</th>
                  <th style={{ padding: '8px 10px' }}>Inspected Qty</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Defects / DHU</th>
                  <th style={{ padding: '8px 10px' }}>Major Defect Findings</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Verdict</th>
                  <th style={{ padding: '8px 10px' }}>Audited By</th>
                </tr>
              </thead>
              <tbody>
                {sectionInspections.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: COLORS.navy }}>{row.section}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{row.std}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>{row.inspected}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: COLORS.blue, fontWeight: 800 }}>{row.dhu}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{row.majorDefects}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: COLORS.green }}>
                        ✓ {row.result}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: COLORS.grey }}>{row.auditor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Final Export Audit Sign-Off Box */}
          <div style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #E0F2FE 100%)',
            border: '1px solid #86EFAC',
            borderRadius: '8px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#166534', letterSpacing: '0.5px' }}>
                EXPORT SHIPMENT RELEASE SIGN-OFF · AQL 1.5 NORMAL LEVEL II
              </div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: COLORS.navy, margin: '2px 0' }}>
                Certificate No: AQL-{job.jobNo}-EXP26 · Approved for Container Stuffing
              </div>
              <div style={{ fontSize: '11.5px', color: '#15803D' }}>
                Lead QA Auditor: <strong>Md. Shariful Alam</strong> · Sample Size: <strong>200 pcs (Allowed: 7, Found: 2)</strong> · Result: <strong>ACCEPTED</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{
                background: COLORS.green,
                color: '#FFFFFF',
                fontWeight: 900,
                fontSize: '12px',
                padding: '6px 14px',
                borderRadius: '6px',
                boxShadow: '0 2px 6px rgba(16,185,129,0.3)'
              }}>
                ✓ CARGO RELEASED
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL: OFFICIAL NORTHERN FASHION LTD. TESTING LABORATORY CERTIFICATE */}
        {/* ========================================================================= */}
        {activeTestModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 39, 78, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(4px)',
            padding: '16px'
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '780px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              border: '1px solid #E2E8F0'
            }}>
              {/* Header with Lab Title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0F274E', paddingBottom: '12px', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: COLORS.blue, letterSpacing: '0.5px' }}>
                    NORTHERN FASHION LTD. TESTING LABORATORY
                  </div>
                  <h2 style={{ fontSize: '17px', fontWeight: 900, color: COLORS.navy, margin: '2px 0 0' }}>
                    PHYSICAL &amp; CHEMICAL TEST REPORT
                  </h2>
                  <div style={{ fontSize: '11px', color: COLORS.grey, marginTop: '2px' }}>
                    Report No: <strong>NFL26090096</strong> · 1st Submission · Testing Period: 09-Sep-2026 to 11-Sep-2026
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTestModal(false)}
                  style={{ border: 'none', background: '#F1F5F9', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 800, color: COLORS.navy }}
                >
                  ✕ Close
                </button>
              </div>

              {/* Sample Meta Information */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.border}`, marginBottom: '14px', fontSize: '11.5px' }}>
                <div><strong>Buyer / Brand:</strong> BESTSELLER / NAME IT</div>
                <div><strong>Supplier Name:</strong> Northern Fashion Ltd.</div>
                <div><strong>Ref Style No:</strong> {job.styleNo || '13264360'}</div>
                <div><strong>Job Number:</strong> #{job.jobNo}</div>
                <div><strong>Colors Submitted:</strong> A. Dawn Pink AOP, B. Peyote Mélange</div>
                <div><strong>Composition:</strong> 75% Org Cotton 20% Recycled Cotton 5% Elastane (240 GSM Terry)</div>
                <div><strong>Test Type &amp; Program:</strong> Self-Test / Normal Fabric Program</div>
                <div><strong>Country of Origin:</strong> Bangladesh</div>
              </div>

              {/* Test Results Summary Table */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: COLORS.navy, marginBottom: '6px' }}>
                  Summary of Physical &amp; Chemical Test Results
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left', border: `1px solid ${COLORS.border}` }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy }}>
                      <th style={{ padding: '6px 8px' }}>Test Parameter</th>
                      <th style={{ padding: '6px 8px' }}>Standard Method</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>Sample A</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>Sample B</th>
                      <th style={{ padding: '6px 8px' }}>Buyer Requirement</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>Dimensional Stability (1st &amp; 5th wash)</td>
                      <td style={{ padding: '6px 8px', color: COLORS.grey }}>BESTSELLER 4N @ 40°C</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>L: -2.9% / W: -2.9%</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>L: -2.6% / W: -3.1%</td>
                      <td style={{ padding: '6px 8px' }}>Length/Width: +3.0% to -5.0%</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: COLORS.green, fontWeight: 900 }}>PASS</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>Spirality After Domestic Washes</td>
                      <td style={{ padding: '6px 8px', color: COLORS.grey }}>ISO 16322-3 Proc B</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>1.5% / 2.0%</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>1.5% / 2.0%</td>
                      <td style={{ padding: '6px 8px' }}>Max 4.0%</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: COLORS.green, fontWeight: 900 }}>PASS</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>Fabric Weight (GSM)</td>
                      <td style={{ padding: '6px 8px', color: COLORS.grey }}>Ref. BS EN 12127</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>242 GSM</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>243 GSM</td>
                      <td style={{ padding: '6px 8px' }}>240 GSM (±5.0%)</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: COLORS.green, fontWeight: 900 }}>PASS</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>Color Fastness to Washing</td>
                      <td style={{ padding: '6px 8px', color: COLORS.grey }}>ISO 105-C06:2010 A1S</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>4-5</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>4-5</td>
                      <td style={{ padding: '6px 8px' }}>Color change: 3-4, Bleed: 4-5</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: COLORS.green, fontWeight: 900 }}>PASS</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>Color Fastness to Water</td>
                      <td style={{ padding: '6px 8px', color: COLORS.grey }}>ISO 105-E01:2013</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>4-5</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>4-5</td>
                      <td style={{ padding: '6px 8px' }}>Color change: 4, Bleed: 4-5</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: COLORS.green, fontWeight: 900 }}>PASS</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>Color Fastness to Perspiration (Acid/Alk)</td>
                      <td style={{ padding: '6px 8px', color: COLORS.grey }}>ISO 105-E04:2013</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>4-5 / 4-5</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>4-5 / 4-5</td>
                      <td style={{ padding: '6px 8px' }}>Color change: 4, Bleed: 4-5</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: COLORS.green, fontWeight: 900 }}>PASS</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>Color Fastness to Rubbing (Dry / Wet)</td>
                      <td style={{ padding: '6px 8px', color: COLORS.grey }}>ISO 105-X12:2016</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>Dry: 4-5 / Wet: 4</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>Dry: 4-5 / Wet: 4-5</td>
                      <td style={{ padding: '6px 8px' }}>Medium: Dry 4, Wet 3-4</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: COLORS.green, fontWeight: 900 }}>PASS</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>ICI Pilling Resistance (10,800 revs)</td>
                      <td style={{ padding: '6px 8px', color: COLORS.grey }}>ISO 12945-1:2020</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>Grade 4</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>Grade 4</td>
                      <td style={{ padding: '6px 8px' }}>Min Grade 3-4</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: COLORS.green, fontWeight: 900 }}>PASS</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>Bursting Strength</td>
                      <td style={{ padding: '6px 8px', color: COLORS.grey }}>ISO 13938-2 (50.0 cm²)</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 750 }}>144.7 KPa</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 750 }}>143.1 KPa</td>
                      <td style={{ padding: '6px 8px' }}>Min. 140 KPa</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: COLORS.green, fontWeight: 900 }}>PASS</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>Stretch &amp; Recovery Test</td>
                      <td style={{ padding: '6px 8px', color: COLORS.grey }}>BS EN ISO 20932-1</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>85.5% (Length)</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>85.6% (Width)</td>
                      <td style={{ padding: '6px 8px' }}>Min 80.0% Recovery</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: COLORS.green, fontWeight: 900 }}>PASS</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Sign-Off Authorization */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.grey }}>OVERALL CERTIFICATE VERDICT</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.green, margin: '2px 0' }}>100% PASS</div>
                  <div style={{ fontSize: '11px', color: COLORS.grey }}>Meets all buyer technical and physical quality standards</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: COLORS.navy }}>
                  <div style={{ fontWeight: 800 }}>S.M. Hasibul Alam</div>
                  <div style={{ color: COLORS.grey }}>Manager, Testing Laboratory</div>
                  <div style={{ fontSize: '10px', color: COLORS.blue, fontWeight: 700 }}>For Northern Fashion Ltd. Testing Laboratory</div>
                </div>
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
