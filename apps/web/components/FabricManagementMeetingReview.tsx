'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import factoryDataRaw from '../data/dyeing-factory-data.json';

function num(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? (Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 1 })) : String(v);
}

type MeetingTab = 
  | 'EXECUTIVE' 
  | 'YARN_MANAGEMENT'
  | 'GREIGE_STORE' 
  | 'WINCH_STATUS' 
  | 'TESTING_LAB' 
  | 'BOTTLENECKS' 
  | 'BUYER_POSITION' 
  | 'MEETING_MINUTES';

// Yarn Overview Data for Executive Management Review
const YARN_EXECUTIVE_SUMMARY = {
  totalGodownStock: 148200,
  safetyBufferTarget: 95000,
  scmPipelineKg: 84000,
  monthlyRcvdKg: 58400,
  monthlyIssuedKnittingKg: 52100,
  criticalCounts: 2
};

const YARN_EXECUTIVE_SAFETY_ITEMS = [
  { count: '30/1 Ne Combed Cotton', stock: 38400, safety: 25000, diff: 13400, burn: 1800, lead: 14, status: 'SAFE' },
  { count: '26/1 Ne Carded Cotton', stock: 14200, safety: 18000, diff: -3800, burn: 1200, lead: 14, status: 'BELOW_SAFETY' },
  { count: '24/1 Ne Cotton Slub', stock: 3400, safety: 8000, diff: -4600, burn: 650, lead: 18, status: 'CRITICAL' },
  { count: '20/1 Ne Carded Cotton', stock: 15600, safety: 12000, diff: 3600, burn: 850, lead: 14, status: 'SAFE' },
  { count: '30/1 Ne CVC 60/40 Melange', stock: 9500, safety: 15000, diff: -5500, burn: 950, lead: 21, status: 'BELOW_SAFETY' },
  { count: '40D Spandex (Creora)', stock: 4100, safety: 3000, diff: 1100, burn: 220, lead: 10, status: 'SAFE' }
];

const YARN_EXECUTIVE_REQUISITIONS = [
  { jobNo: '48085', buyer: 'BS-NMT', style: '13251506', count: '30/1 Ne Combed', reqKg: 4850, inHouse: '2026-08-05', status: 'ALLOCATED', lot: 'LOT-SL-301 (Godown A)' },
  { jobNo: '48086', buyer: 'BS-JJ', style: '12267123', count: '32/1 CVC + 10/1 Poly', reqKg: 7200, inHouse: '2026-08-08', status: 'PO_IN_PROGRESS', lot: 'PO-YRN-SQR-904' },
  { jobNo: '48087', buyer: 'ONLY', style: '15289944', count: '30/1 Ne Combed', reqKg: 3600, inHouse: '2026-08-07', status: 'ALLOCATED', lot: 'LOT-SL-301 (Godown A)' },
  { jobNo: '48088', buyer: 'OVS', style: '903412', count: '24/1 Ne Cotton Slub', reqKg: 5400, inHouse: '2026-08-12', status: 'PO_IN_PROGRESS', lot: 'PO-YRN-BDSH-812' },
  { jobNo: '48092', buyer: 'UTG', style: '882190', count: '20/1 Ne Carded + 30/1 Terry', reqKg: 4200, inHouse: '2026-08-14', status: 'PENDING_PURCHASE', lot: 'Pending PO' }
];

const YARN_EXECUTIVE_POS = [
  { po: 'PO-YRN-SQR-904', mill: 'Square Textiles Ltd.', count: '30/1 Ne Combed Cotton', kg: 20000, price: 3.85, eta: '2026-08-07', status: 'ARRIVED' },
  { po: 'PO-YRN-ENV-882', mill: 'Envoy Textiles Ltd.', count: '26/1 Ne Carded Cotton', kg: 15000, price: 3.55, eta: '2026-08-11', status: 'IN_TRANSIT' },
  { po: 'PO-YRN-BDSH-812', mill: 'Badsha Textiles Ltd.', count: '24/1 Ne Cotton Slub', kg: 10000, price: 3.95, eta: '2026-08-14', status: 'LC_OPENED' },
  { po: 'PO-YRN-AKJ-411', mill: 'Akij Spinning Mills Ltd.', count: '32/1 CVC 60/40 Melange', kg: 12000, price: 4.10, eta: '2026-08-16', status: 'PO_ISSUED' }
];

interface MeetingActionItem {
  id: string;
  topic: string;
  department: string;
  responsible: string;
  targetDate: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  decisionNotes: string;
}

const INITIAL_ACTION_ITEMS: MeetingActionItem[] = [
  {
    id: 'ACT-01',
    topic: 'Topping & NRFT Reduction on Dark / Navy Shades',
    department: 'Dyeing & Dyeing Lab',
    responsible: 'S. K. Paul (Sr. Chemist) / M. Ali (Dyeing GM)',
    targetDate: '2026-10-15',
    priority: 'CRITICAL',
    status: 'IN_PROGRESS',
    decisionNotes: 'Recalibrate Datacolor automatic liquid chemical dispenser and enforce 1:6 liquor ratio strictly on Winches MC-06 to MC-10 to hit 85%+ first-pass RFT.'
  },
  {
    id: 'ACT-02',
    topic: 'Greige Store CVC Fleece Lot Aging Clearance (>18 Days)',
    department: 'Greige Store & Planning',
    responsible: 'T. Hossain (Store Head) / Central Planning',
    targetDate: '2026-10-06',
    priority: 'HIGH',
    status: 'RESOLVED',
    decisionNotes: 'Allocated 9,500 kg aged CVC fleece to Winch MC-05 (Dilmenler 700 kg). Rolls passed bio-scouring absorbency test and issued to floor.'
  },
  {
    id: 'ACT-03',
    topic: 'Dyeing Lab Dip Approval Acceleration for ONLY & Bestseller',
    department: 'Testing Lab',
    responsible: 'Dr. Nazrul Islam (Lab Head)',
    targetDate: '2026-10-20',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    decisionNotes: 'Compress lab dip submit lead time from 72h to 36h by utilizing fast spectrophotometer spectrophotometric match and digital swatch portal.'
  },
  {
    id: 'ACT-04',
    topic: 'Subcontract Outside Mill Delivery Expediting (Giant & Blue Planet)',
    department: 'Merchandising & Sourcing',
    responsible: 'Md. Jahidul Islam (Merchandising Mgr)',
    targetDate: '2026-10-08',
    priority: 'CRITICAL',
    status: 'OPEN',
    decisionNotes: 'Expedite 15,000 kg single jersey from Giant Textile to avert Line 4 cutting starvation on Bestseller order 48085.'
  },
  {
    id: 'ACT-05',
    topic: 'Pre-Delivery COA Certification Audit for OEKO-TEX Standard 100',
    department: 'Quality Assurance',
    responsible: 'F. Rahman (QA Compliance Head)',
    targetDate: '2026-10-12',
    priority: 'NORMAL',
    status: 'RESOLVED',
    decisionNotes: 'All 14 export lots tested for pH (6.2-6.8) and free formaldehyde (<16 ppm). Certificates uploaded to buyer compliance desk.'
  }
];

// Greige Fabric Store detailed inventory dataset
const GREIGE_INVENTORY_BREAKDOWN = [
  { fabricType: 'Single Jersey 100% Cotton 160 GSM', stockKg: 38400, rollsCount: 520, yarnLot: 'LOT-SL-301 (30/1 Ne Combed)', avgAgingDays: 4, fourPointPassRate: 98.4, status: 'FRESH' },
  { fabricType: 'Single Jersey 100% Cotton 180 GSM', stockKg: 29200, rollsCount: 395, yarnLot: 'LOT-SL-302 (26/1 Ne Carded)', avgAgingDays: 6, fourPointPassRate: 97.2, status: 'FRESH' },
  { fabricType: '1x1 Cotton Rib 220 GSM', stockKg: 14800, rollsCount: 210, yarnLot: 'LOT-RIB-101 (30/1 Ne Ring)', avgAgingDays: 9, fourPointPassRate: 95.8, status: 'NORMAL' },
  { fabricType: '2x2 Lycra Rib 240 GSM (95/5 Spandex)', stockKg: 11500, rollsCount: 165, yarnLot: 'LOT-SPX-204 (30/1 + 40D Spandex)', avgAgingDays: 12, fourPointPassRate: 94.6, status: 'NORMAL' },
  { fabricType: 'French Terry 240 GSM (Unbrushed)', stockKg: 12100, rollsCount: 175, yarnLot: 'LOT-TR-401 (30/1 + 20/1 Terry)', avgAgingDays: 8, fourPointPassRate: 96.5, status: 'NORMAL' },
  { fabricType: 'CVC Brushed Fleece 280 GSM (60/40 Cotton-Poly)', stockKg: 9500, rollsCount: 130, yarnLot: 'LOT-FLC-501 (32/1 CVC + 10/1 Poly)', avgAgingDays: 18, fourPointPassRate: 92.1, status: 'ATTENTION_AGING' },
  { fabricType: 'Cotton Interlock 210 GSM', stockKg: 5600, rollsCount: 85, yarnLot: 'LOT-INT-102 (40/1 Ne Combed)', avgAgingDays: 5, fourPointPassRate: 98.0, status: 'FRESH' },
  { fabricType: 'Pique / Lacoste 200 GSM', stockKg: 3400, rollsCount: 50, yarnLot: 'LOT-PIQ-09 (24/1 Ne Slub)', avgAgingDays: 3, fourPointPassRate: 99.1, status: 'FRESH' }
];

export function FabricManagementMeetingReview() {
  const [selectedBuyer, setSelectedBuyer] = useState('ALL');
  const [activeTab, setActiveTab] = useState<MeetingTab>('EXECUTIVE');
  const [actionItems, setActionItems] = useState<MeetingActionItem[]>(INITIAL_ACTION_ITEMS);
  const [showAddActionModal, setShowAddActionModal] = useState(false);
  const [selectedCoaModal, setSelectedCoaModal] = useState<any | null>(null);

  // New action item form state
  const [newAction, setNewAction] = useState({
    topic: '',
    department: 'Dyeing',
    responsible: '',
    targetDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    priority: 'HIGH' as const,
    decisionNotes: ''
  });

  const factoryData: any = factoryDataRaw;
  const summary = factoryData.summary || {
    totalGreigeStock: 124500,
    totalKnittingReceived: 971531,
    totalDyeingIssued: 383527.7,
    inMultiProcess: 41800,
    finishingOutput: 368187,
    deliveryTotal: 290409,
    deliveryBalance: -108131
  };

  const machines = factoryData.machines || [];
  const rftStats = factoryData.rftStats || { totalEvaluated: 225, rftPassRatePct: 49, totalRft: 110, totalNrft: 115 };
  const rftLogs = factoryData.qualityRftLogs || [];
  const executionRows = factoryData.executionRows || [];

  // Group execution rows by buyer for the executive fabric meeting position
  const buyerPositions = useMemo(() => {
    const m = new Map<string, {
      buyer: string;
      totalRequire: number;
      greyReceived: number;
      dyeingProduced: number;
      deliveryDone: number;
      stylesCount: number;
      lotCount: number;
    }>();

    for (const r of executionRows) {
      const b = r.buyer || 'Other';
      const cur = m.get(b) || {
        buyer: b,
        totalRequire: 0,
        greyReceived: 0,
        dyeingProduced: 0,
        deliveryDone: 0,
        stylesCount: 0,
        lotCount: 0
      };

      cur.totalRequire += (Number(r.totalRequire) || 0);
      cur.greyReceived += (Number(r.greyBodyRcvd) || 0) + (Number(r.greyLRibRcvd) || 0) + (Number(r.greySJerseyRcvd) || 0);
      cur.dyeingProduced += (Number(r.totalDyeing) || 0);
      cur.deliveryDone += (Number(r.totalDelivery || r.totalDyeing * 0.88) || 0);
      cur.lotCount += 1;
      m.set(b, cur);
    }

    return Array.from(m.values()).sort((a, b) => b.totalRequire - a.totalRequire);
  }, [executionRows]);

  const buyers = useMemo(() => {
    return Array.from(new Set(buyerPositions.map(b => b.buyer))).sort();
  }, [buyerPositions]);

  const filteredPositions = useMemo(() => {
    if (selectedBuyer === 'ALL') return buyerPositions;
    return buyerPositions.filter(b => b.buyer === selectedBuyer);
  }, [buyerPositions, selectedBuyer]);

  // Winch capacity total
  const totalWinchCapacity = useMemo(() => {
    return machines.reduce((s: number, m: any) => {
      const capNum = Number(String(m.capacity || '').replace(/[^\d]/g, '')) || 0;
      return s + capNum * (Number(m.noOfMc) || 1);
    }, 0);
  }, [machines]);

  function handleAddActionItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newAction.topic.trim()) return;

    const created: MeetingActionItem = {
      id: `ACT-${String(actionItems.length + 1).padStart(2, '0')}`,
      topic: newAction.topic,
      department: newAction.department,
      responsible: newAction.responsible || 'Assigned Officer',
      targetDate: newAction.targetDate,
      priority: newAction.priority,
      status: 'OPEN',
      decisionNotes: newAction.decisionNotes || 'Action item recorded in weekly executive fabric meeting.'
    };

    setActionItems(prev => [created, ...prev]);
    setShowAddActionModal(false);
    setNewAction({
      topic: '',
      department: 'Dyeing',
      responsible: '',
      targetDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      priority: 'HIGH',
      decisionNotes: ''
    });
  }

  function toggleActionStatus(id: string) {
    setActionItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const nextStatus = item.status === 'OPEN' ? 'IN_PROGRESS' : item.status === 'IN_PROGRESS' ? 'RESOLVED' : 'OPEN';
      return { ...item, status: nextStatus };
    }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Executive Meeting Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          color: '#fff',
          borderRadius: '12px',
          padding: '16px 20px',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.25)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>🧵</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '17px', letterSpacing: '0.01em', fontWeight: 800 }}>
                  Fabric &amp; Dyeing Management Executive Review
                </strong>
                <span style={{ fontSize: '10px', background: '#38bdf8', color: '#0f172a', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                  WEEKLY EXECUTIVE DOCKET
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                Northern Fashion Ltd. · Kashimpur, Gazipur · Greige Store → 23 Dyeing Winches → Multi-Process → 3-Stage Testing Lab → Cutting Handover
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
            style={{ fontSize: '11px', padding: '6px 12px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            🖨️ Print Meeting Pack
          </button>
          <Link href="/modules/yarn-store" className="btn btn-primary" style={{ fontSize: '11px', padding: '6px 12px', background: '#0284c7', border: 'none', fontWeight: 700 }}>
            🧶 Yarn Management &amp; SCM →
          </Link>
          <Link href="/modules/greige-store" className="btn btn-secondary" style={{ fontSize: '11px', padding: '6px 12px' }}>
            🏬 Greige Store →
          </Link>
          <Link href="/modules/dyeing" className="btn btn-secondary" style={{ fontSize: '11px', padding: '6px 12px' }}>
            ⚙️ Dyeing Winches →
          </Link>
          <Link href="/modules/lab" className="btn btn-primary" style={{ fontSize: '11px', padding: '6px 14px', background: '#2563eb', border: 'none', fontWeight: 700 }}>
            🧪 Testing Lab Pipeline →
          </Link>
        </div>
      </div>

      {/* FABRIC FLOW CONVERSION FUNNEL STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
        {/* 0. Yarn Store & Purchasing Stock */}
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#0369a1', fontWeight: 800 }}>0. Yarn Store &amp; SCM</span>
          <strong style={{ fontSize: '18px', color: '#0284c7', marginTop: '4px' }}>{num(YARN_EXECUTIVE_SUMMARY.totalGodownStock)} kg</strong>
          <span style={{ fontSize: '10px', color: '#0369a1', marginTop: '2px', fontWeight: 600 }}>{num(YARN_EXECUTIVE_SUMMARY.scmPipelineKg)} kg Mill Pipeline</span>
        </div>

        {/* 1. Greige Store Stock */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>1. Greige Store Stock</span>
          <strong style={{ fontSize: '18px', color: '#0f172a', marginTop: '4px' }}>{num(summary.totalGreigeStock)} kg</strong>
          <span style={{ fontSize: '10px', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>Ready on floor · 8 fabric types</span>
        </div>

        {/* 2. Knitting Received */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>2. Knitting Received</span>
          <strong style={{ fontSize: '18px', color: '#2563eb', marginTop: '4px' }}>{num(summary.totalKnittingReceived)} kg</strong>
          <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Circular &amp; Flat intake</span>
        </div>

        {/* 3. Dyeing Issued */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>3. Dyeing Winch Issued</span>
          <strong style={{ fontSize: '18px', color: '#0ea5e9', marginTop: '4px' }}>{num(summary.totalDyeingIssued)} kg</strong>
          <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>23 Winches · In-house</span>
        </div>

        {/* 4. Multi-Process */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>4. In Multi-Process</span>
          <strong style={{ fontSize: '18px', color: '#d97706', marginTop: '4px' }}>{num(summary.inMultiProcess)} kg</strong>
          <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Brush, Peach &amp; AOP WIP</span>
        </div>

        {/* 5. Finishing Output */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>5. Finished Fabric</span>
          <strong style={{ fontSize: '18px', color: '#16a34a', marginTop: '4px' }}>{num(summary.finishingOutput)} kg</strong>
          <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Stenter &amp; Compactor</span>
        </div>

        {/* 6. Delivered to Cutting */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>6. Delivered to Cutting</span>
          <strong style={{ fontSize: '18px', color: '#15803d', marginTop: '4px' }}>{num(summary.deliveryTotal)} kg</strong>
          <span style={{ fontSize: '10px', color: '#15803d', marginTop: '2px', fontWeight: 600 }}>Challan released to floor</span>
        </div>

        {/* 7. Net Delivery Gap */}
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#991b1b', fontWeight: 800 }}>7. Net Delivery Gap</span>
          <strong style={{ fontSize: '18px', color: '#dc2626', marginTop: '4px' }}>{num(summary.deliveryBalance)} kg</strong>
          <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '2px', fontWeight: 700 }}>Cutting backlog alert</span>
        </div>
      </div>

      {/* MEETING SUB-TABS */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={activeTab === 'EXECUTIVE' ? 'mini-tab active' : 'mini-tab'}
          onClick={() => setActiveTab('EXECUTIVE')}
        >
          📊 Executive Overview
        </button>
        <button
          type="button"
          className={activeTab === 'YARN_MANAGEMENT' ? 'mini-tab active' : 'mini-tab'}
          onClick={() => setActiveTab('YARN_MANAGEMENT')}
        >
          🧶 Yarn Management &amp; SCM (148,200 kg)
        </button>
        <button
          type="button"
          className={activeTab === 'GREIGE_STORE' ? 'mini-tab active' : 'mini-tab'}
          onClick={() => setActiveTab('GREIGE_STORE')}
        >
          🏬 Greige Fabric Store Inventory (124,500 kg)
        </button>
        <button
          type="button"
          className={activeTab === 'WINCH_STATUS' ? 'mini-tab active' : 'mini-tab'}
          onClick={() => setActiveTab('WINCH_STATUS')}
        >
          ⚙️ 23 Dyeing Winches ({totalWinchCapacity.toLocaleString()} kg)
        </button>
        <button
          type="button"
          className={activeTab === 'TESTING_LAB' ? 'mini-tab active' : 'mini-tab'}
          onClick={() => setActiveTab('TESTING_LAB')}
        >
          🧪 3-Stage Testing Lab Pipeline
        </button>
        <button
          type="button"
          className={activeTab === 'BOTTLENECKS' ? 'mini-tab active' : 'mini-tab'}
          onClick={() => setActiveTab('BOTTLENECKS')}
        >
          ⚠️ RFT Quality &amp; Toppings ({rftLogs.length})
        </button>
        <button
          type="button"
          className={activeTab === 'BUYER_POSITION' ? 'mini-tab active' : 'mini-tab'}
          onClick={() => setActiveTab('BUYER_POSITION')}
        >
          👔 Buyer-Wise Position ({buyerPositions.length} Brands)
        </button>
        <button
          type="button"
          className={activeTab === 'MEETING_MINUTES' ? 'mini-tab active' : 'mini-tab'}
          onClick={() => setActiveTab('MEETING_MINUTES')}
        >
          📝 Management Meeting Action Items ({actionItems.length})
        </button>
      </div>

      {/* TAB 1: EXECUTIVE SUMMARY & MEETING HIGHLIGHTS */}
      {activeTab === 'EXECUTIVE' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
          {/* Key Floor Numbers & Yield Conversion */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Meeting Discussion Points: Floor Throughput &amp; Yield</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>Conversion yields, process cycle time &amp; delivery pace</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#475569' }}>Knitting Intake to Greige Store:</span>
                <strong>{num(summary.totalKnittingReceived)} kg</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#475569' }}>Dyeing Batch Issue Volume:</span>
                <strong style={{ color: '#2563eb' }}>{num(summary.totalDyeingIssued)} kg</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#475569' }}>Finishing Stenter &amp; Compactor Output:</span>
                <strong style={{ color: '#16a34a' }}>{num(summary.finishingOutput)} kg</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#475569' }}>Delivered to Automated Cutting:</span>
                <strong style={{ color: '#15803d' }}>{num(summary.deliveryTotal)} kg (82.4% on schedule)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#fef2f2', borderRadius: '6px' }}>
                <span style={{ color: '#991b1b' }}>Net Outstanding Cutting Shortage:</span>
                <strong style={{ color: '#dc2626' }}>{num(summary.deliveryBalance)} kg</strong>
              </div>
            </div>

            <div style={{ marginTop: '12px', padding: '10px', background: '#f0fdf4', borderRadius: '8px', fontSize: '11px', color: '#166534', border: '1px solid #bbf7d0' }}>
              <strong>Executive Directive:</strong> Focus on clearing the 108,131 kg delivery shortage for Bestseller and ONLY orders by maximizing 23 in-house winches and monitoring Subcontract mill releases.
            </div>
          </div>

          {/* Quality RFT & 3-Stage Lab Status */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Testing Lab Clearance &amp; RFT Compliance</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Right First Time performance &amp; testing clearance</div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '10px', background: '#fef3c7', color: '#92400e' }}>
                RFT: {rftStats.rftPassRatePct}%
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Stage 1 · Before Dyeing (Yarn &amp; Lab Dip)</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Yarn count, CSP Lea strength, Spectro ΔE &lt; 0.65 recipe</div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>98.2% Approved</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Stage 2 · Before Bulk (Pilot 200kg Trial Batch)</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Wash, rubbing fastness, perspiration &amp; initial shrink check</div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>94.0% Cleared</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Stage 3 · Testing Before Delivery (Final COA)</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Martindale pilling, spirality, OEKO-TEX Standard 100</div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>100% Certified</span>
              </div>
            </div>

            <div style={{ marginTop: '12px', padding: '10px', background: '#eff6ff', borderRadius: '8px', fontSize: '11px', color: '#1e40af', border: '1px solid #bfdbfe' }}>
              <strong>Meeting Priority:</strong> Top re-dyeing cause is <em>Tone Difference / Topping (38%)</em>. Dyeing Lab is recalibrating recipe dispensers to ensure perfect bulk repeatability.
            </div>
          </div>
        </div>
      )}

      {/* TAB: YARN MANAGEMENT & SCM CONTROL */}
      {activeTab === 'YARN_MANAGEMENT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Top Banner */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  🧶 Yarn Management, Purchasing, Safety Stock &amp; Flow Control
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Total Godown Stock: {num(YARN_EXECUTIVE_SUMMARY.totalGodownStock)} kg · Pipeline under PO/LC: {num(YARN_EXECUTIVE_SUMMARY.scmPipelineKg)} kg · Floor Safety Buffer Target: {num(YARN_EXECUTIVE_SUMMARY.safetyBufferTarget)} kg
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Link href="/modules/yarn-store?tab=depletion-trends" className="btn btn-secondary" style={{ fontSize: '11px', padding: '6px 12px' }}>
                  📊 6M Depletion Trends (Recharts)
                </Link>
                <Link href="/modules/yarn-store" className="btn btn-primary" style={{ fontSize: '11px', padding: '6px 12px', background: '#0284c7', border: 'none' }}>
                  Open Full Yarn Store &amp; SCM Module →
                </Link>
              </div>
            </div>

            {/* Micro KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '14px' }}>
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>GODOWN STOCK</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{num(YARN_EXECUTIVE_SUMMARY.totalGodownStock)} kg</div>
                <span style={{ fontSize: '10px', color: '#16a34a' }}>Godown A &amp; B</span>
              </div>
              <div style={{ background: '#f0f9ff', padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                <span style={{ fontSize: '10px', color: '#0369a1', fontWeight: 700 }}>SCM PIPELINE (L/C)</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0284c7' }}>{num(YARN_EXECUTIVE_SUMMARY.scmPipelineKg)} kg</div>
                <span style={{ fontSize: '10px', color: '#0369a1' }}>En route from mills</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>MONTH GRN RECEIVED</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#16a34a' }}>{num(YARN_EXECUTIVE_SUMMARY.monthlyRcvdKg)} kg</div>
                <span style={{ fontSize: '10px', color: '#64748b' }}>Passed Lab QC</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>DELIVERED TO KNITTING</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#2563eb' }}>{num(YARN_EXECUTIVE_SUMMARY.monthlyIssuedKnittingKg)} kg</div>
                <span style={{ fontSize: '10px', color: '#64748b' }}>Circular &amp; Flat lines</span>
              </div>
              <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <span style={{ fontSize: '10px', color: '#991b1b', fontWeight: 700 }}>SAFETY BUFFER GAPS</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#dc2626' }}>{YARN_EXECUTIVE_SUMMARY.criticalCounts} Counts Alert</div>
                <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 700 }}>PO required</span>
              </div>
            </div>

            {/* Subsection 1: Yarn Safety Stock Buffer Matrix */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                🛡️ Yarn Safety Stock Maintaining &amp; Buffer Alerts
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table compact-table" style={{ width: '100%', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px' }}>Yarn Count</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px' }}>Physical Stock</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px' }}>Safety Stock Target</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px' }}>Difference (KG)</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px' }}>Daily Burn</th>
                      <th style={{ textAlign: 'center', padding: '6px 8px' }}>Lead Time</th>
                      <th style={{ textAlign: 'center', padding: '6px 8px' }}>Buffer Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {YARN_EXECUTIVE_SAFETY_ITEMS.map((item, i) => {
                      const isCrit = item.status === 'CRITICAL';
                      const isLow = item.status === 'BELOW_SAFETY';
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: isCrit ? '#fef2f2' : isLow ? '#fffbeb' : undefined }}>
                          <td style={{ padding: '6px 8px', fontWeight: 700, color: '#0f172a' }}>{item.count}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{num(item.stock)} kg</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', color: '#475569' }}>{num(item.safety)} kg</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, color: item.diff < 0 ? '#dc2626' : '#16a34a' }}>
                            {item.diff > 0 ? `+${num(item.diff)}` : num(item.diff)} kg
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', color: '#475569' }}>{num(item.burn)} kg/d</td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>{item.lead} days</td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                            <span style={{
                              fontSize: '9px', padding: '2px 6px', borderRadius: '4px', fontWeight: 800,
                              background: isCrit ? '#fee2e2' : isLow ? '#fef3c7' : '#dcfce7',
                              color: isCrit ? '#991b1b' : isLow ? '#92400e' : '#166534'
                            }}>
                              {isCrit ? 'CRITICAL DEFICIT' : isLow ? 'BELOW SAFETY' : 'SAFE BUFFER'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subsection 2: Requisitions & Purchasing side-by-side */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '12px' }}>
              {/* Merchandising Yarn Requisitions */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                  📋 Requisitions from Merchandising
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {YARN_EXECUTIVE_REQUISITIONS.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                      <div>
                        <div><strong>Job {r.jobNo} ({r.buyer})</strong> · {r.count}</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>Target: {r.inHouse} · Lot: {r.lot}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{num(r.reqKg)} kg</div>
                        <span style={{
                          fontSize: '9px', padding: '1px 5px', borderRadius: '4px', fontWeight: 700,
                          background: r.status === 'ALLOCATED' ? '#dcfce7' : '#e0f2fe',
                          color: r.status === 'ALLOCATED' ? '#166534' : '#0369a1'
                        }}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Yarn Purchasing & Spinning Mill POs */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                  🏭 Yarn Purchasing &amp; Spinning Mill POs
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {YARN_EXECUTIVE_POS.map((po, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                      <div>
                        <div><strong>{po.po}</strong> · <span style={{ color: '#0f172a', fontWeight: 600 }}>{po.mill}</span></div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{po.count} · ETA: {po.eta}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#0284c7' }}>{num(po.kg)} kg</div>
                        <span style={{
                          fontSize: '9px', padding: '1px 5px', borderRadius: '4px', fontWeight: 700,
                          background: po.status === 'ARRIVED' ? '#dcfce7' : '#fef3c7',
                          color: po.status === 'ARRIVED' ? '#166534' : '#92400e'
                        }}>
                          {po.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GREIGE FABRIC STORE COMPLETE REPORT */}
      {activeTab === 'GREIGE_STORE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Greige Store Overview Banner */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>🏬 Greige Fabric Store Floor Inventory &amp; Roll Quality Audit</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Total Store Inventory: 124,500 kg · 2,045 inspected rolls partitioned by fabric category</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="status-pill good">4-Point Pass: 96.2%</span>
                <span className="status-pill neutral">Avg Aging: 7.2 Days</span>
                <Link href="/modules/greige-store" className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }}>
                  Open Greige Store Module →
                </Link>
              </div>
            </div>

            {/* Inventory table by fabric type */}
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table compact-table" style={{ width: '100%', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Fabric Type &amp; Composition</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Stock (KG)</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Rolls</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Allocated Yarn Lot</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Store Aging</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>4-Point Pass Rate</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Floor Action</th>
                  </tr>
                </thead>
                <tbody>
                  {GREIGE_INVENTORY_BREAKDOWN.map((row, idx) => {
                    const isAging = row.status === 'ATTENTION_AGING';
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: isAging ? '#fffbeb' : undefined }}>
                        <td style={{ padding: '8px', fontWeight: 700, color: '#0f172a' }}>{row.fabricType}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{num(row.stockKg)} kg</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>{row.rollsCount} rolls</td>
                        <td style={{ padding: '8px', color: '#475569' }}>{row.yarnLot}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                            background: isAging ? '#fef3c7' : '#f1f5f9',
                            color: isAging ? '#b45309' : '#334155'
                          }}>
                            {row.avgAgingDays} Days {isAging ? '⚠️' : ''}
                          </span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: row.fourPointPassRate > 95 ? '#16a34a' : '#d97706' }}>
                          {row.fourPointPassRate}%
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 700,
                            background: isAging ? '#fee2e2' : '#dcfce7',
                            color: isAging ? '#991b1b' : '#166534'
                          }}>
                            {isAging ? 'Priority Loading' : 'Available for Winch'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Greige Store Quality & Aging Diagnostics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                4-Point Roll Inspection System Standards
              </div>
              <div style={{ fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span>Grade A (0-12 Points / 100 sq yd):</span>
                  <strong style={{ color: '#16a34a' }}>1,580 rolls (85.9%)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span>Grade B (13-20 Points / 100 sq yd):</span>
                  <strong style={{ color: '#0284c7' }}>188 rolls (10.2%)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span>Conditional (21-28 Points):</span>
                  <strong style={{ color: '#d97706' }}>54 rolls (2.9%)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#fef2f2', borderRadius: '6px' }}>
                  <span>Rejected / Re-knit (&gt;28 Points):</span>
                  <strong style={{ color: '#dc2626' }}>18 rolls (1.0%)</strong>
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                Greige Store Aging Policy &amp; Yarn Reconciliation
              </div>
              <div style={{ fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span>Fresh Stock (&lt; 7 Days):</span>
                  <strong style={{ color: '#16a34a' }}>71,000 kg (57%)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span>Normal Stock (8 - 14 Days):</span>
                  <strong style={{ color: '#0284c7' }}>38,400 kg (31%)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span>Medium Aging (15 - 30 Days):</span>
                  <strong style={{ color: '#d97706' }}>11,200 kg (9%)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#fef2f2', borderRadius: '6px' }}>
                  <span>Critical Aging (&gt; 30 Days):</span>
                  <strong style={{ color: '#dc2626' }}>3,900 kg (3%) · Action Plan Required</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 23 WINCH MACHINES FLOOR STATUS */}
      {activeTab === 'WINCH_STATUS' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>⚙️ 23 Winch &amp; HTHP Dyeing Machines Capacity Floor Map</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Dilmenler (Turkey), Fongs (China), Sclavos (Greece) high-temperature high-pressure winches</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span className="status-pill good">Floor Load: 94.2%</span>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb' }}>
                Batch Load Capacity: {totalWinchCapacity.toLocaleString()} kg / cycle
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
            {machines.map((mc: any, idx: number) => {
              const capNum = Number(String(mc.capacity || '').replace(/[^\d]/g, '')) || 500;
              const isHighCap = capNum >= 1000;

              return (
                <div
                  key={mc.id || idx}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    background: isHighCap ? '#f0fdf4' : '#fafafa',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '12px', color: '#0f172a' }}>{mc.id} · {mc.type}</strong>
                    <span style={{ fontSize: '9px', background: '#dcfce7', color: '#166534', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                      RUNNING
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#2563eb' }}>
                    {mc.capacity}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    <strong>{mc.brand}</strong> ({mc.origin}) · {mc.remarks}
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Liquor Ratio: 1:6</span>
                    <span style={{ fontWeight: 600, color: '#16a34a' }}>HTHP 130°C</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: 3-STAGE TESTING LAB PIPELINE */}
      {activeTab === 'TESTING_LAB' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Header */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  🧪 Comprehensive 3-Stage Textile Lab &amp; Dyeing Lab Clearance Control
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Before Dyeing (Stage 1) → Before Bulk Production (Stage 2) → Testing Before Delivery (Stage 3)
                </div>
              </div>
              <Link href="/modules/lab" className="btn btn-primary" style={{ fontSize: '11px', padding: '6px 12px', background: '#2563eb', border: 'none' }}>
                Open Full Lab Testing Module →
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginTop: '12px' }}>
              {/* Stage 1 Card */}
              <div style={{ border: '2px solid #2563eb', borderRadius: '10px', padding: '12px', background: '#eff6ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', background: '#2563eb', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>STAGE 1</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a' }}>✓ Pass Rate: 98.2%</span>
                </div>
                <h4 style={{ margin: '8px 0 4px', fontSize: '13px', color: '#0f172a' }}>Stage 1 · Before Dyeing (Pre-Dyeing Lab)</h4>
                <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 8px' }}>
                  Yarn count (Ne), Lea Strength CSP (min 2,600), Moisture regain, Greige bio-scouring absorbency, Datacolor Spectrophotometer Lab Dip (ΔE &lt; 0.65).
                </p>
                <div style={{ fontSize: '10px', background: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                  <strong>Key Standard:</strong> ASTM D1907 / AATCC 79 / Datacolor 800 CMC 2:1
                </div>
              </div>

              {/* Stage 2 Card */}
              <div style={{ border: '2px solid #0284c7', borderRadius: '10px', padding: '12px', background: '#f0f9ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', background: '#0284c7', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>STAGE 2</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7' }}>✓ Cleared: 94.0%</span>
                </div>
                <h4 style={{ margin: '8px 0 4px', fontSize: '13px', color: '#0f172a' }}>Stage 2 · Before Bulk Production (Pilot Vessel)</h4>
                <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 8px' }}>
                  Pilot sample vessel (150-200 kg) verification. Wash fastness (ISO 105-C06), rubbing/crocking (ISO 105-X12), perspiration fastness, and initial shrinkage test.
                </p>
                <div style={{ fontSize: '10px', background: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                  <strong>Key Standard:</strong> ISO 105-C06 / ISO 105-X12 / ISO 6330 Wash Trial
                </div>
              </div>

              {/* Stage 3 Card */}
              <div style={{ border: '2px solid #16a34a', borderRadius: '10px', padding: '12px', background: '#f0fdf4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', background: '#16a34a', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>STAGE 3</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a' }}>✓ 100% Certified</span>
                </div>
                <h4 style={{ margin: '8px 0 4px', fontSize: '13px', color: '#0f172a' }}>Stage 3 · Testing Before Delivery (Final COA)</h4>
                <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 8px' }}>
                  Final finished fabric release. Washing shrinkage (±3.5%), spirality (&lt;3%), Martindale pilling (Grade 4), bursting strength, pH value (ISO 3071) &amp; OEKO-TEX Standard 100.
                </p>
                <div style={{ fontSize: '10px', background: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  <strong>Key Standard:</strong> ISO 12945-2 / ASTM D3786 / OEKO-TEX Class I
                </div>
              </div>
            </div>
          </div>

          {/* Active Lab Certificates & Tests Summary Table */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              Laboratory Release Certificates &amp; Inspection Pass Records (Ready for Cutting)
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table compact-table" style={{ width: '100%', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Stage</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Certificate Ref</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Job No &amp; Buyer</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Color / Fabric</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Test Parameter</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Tested Value</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Result</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { stage: 'Stage 1 · Before Dyeing', cert: 'DIP-BS-48085-OPT-A', job: '48085 (BS-NMT)', color: 'Nosegay (Lurex)', test: 'Dyeing Lab Dip Spectro Match', val: 'ΔE 0.42 (D65), ΔE 0.48 (TL84)', res: 'PASS', date: '2026-08-04' },
                    { stage: 'Stage 1 · Before Dyeing', cert: 'COA-YRN-48085-A', job: '48085 (BS-NMT)', color: 'Single Jersey 180 GSM', test: 'Yarn Count & CSP Strength', val: '30/1 Ne (29.8s), CSP 2,840', res: 'PASS', date: '2026-08-02' },
                    { stage: 'Stage 2 · Before Bulk', cert: 'PILOT-CFW-48085-01', job: '48085 (BS-NMT)', color: 'Pilot Batch 200kg Winch 01', test: 'Color Fastness to Washing (ISO 105-C06)', val: 'Shade Change: Gr 4-5, Cotton Stain: Gr 4-5', res: 'PASS', date: '2026-08-07' },
                    { stage: 'Stage 2 · Before Bulk', cert: 'PILOT-SHR-48085-01', job: '48085 (BS-NMT)', color: 'Pilot Batch 200kg Winch 01', test: 'Pre-Bulk Shrinkage & Dimensional', val: 'Length: -2.8%, Width: -1.9%', res: 'PASS', date: '2026-08-08' },
                    { stage: 'Stage 3 · Before Delivery', cert: 'COA-SHR-BS-48085', job: '48085 (BS-NMT)', color: 'Nosegay (Lurex) S/J', test: 'Dimensional Stability & Spirality', val: 'Length: -2.3%, Width: -1.5%, Spirality: 1.8%', res: 'PASS', date: '2026-08-14' },
                    { stage: 'Stage 3 · Before Delivery', cert: 'COA-PIL-BS-48085', job: '48085 (BS-NMT)', color: 'Nosegay (Lurex) S/J', test: 'Martindale Pilling Resistance', val: 'Grade 4-5 (2,000 revs), Grade 4 (5,000 revs)', res: 'PASS', date: '2026-08-15' },
                    { stage: 'Stage 3 · Before Delivery', cert: 'OEK-CERT-BS-48085', job: '48085 (BS-NMT)', color: 'Nosegay (Lurex) S/J', test: 'OEKO-TEX Standard 100 (pH & Formaldehyde)', val: 'pH 6.4 (Neutral), Free Formaldehyde < 16 ppm', res: 'PASS', date: '2026-08-15' }
                  ].map((t, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 700, color: t.stage.includes('Stage 1') ? '#2563eb' : t.stage.includes('Stage 2') ? '#0284c7' : '#16a34a' }}>
                        {t.stage}
                      </td>
                      <td style={{ padding: '8px', fontWeight: 600, color: '#0f172a' }}>{t.cert}</td>
                      <td style={{ padding: '8px' }}>{t.job}</td>
                      <td style={{ padding: '8px', color: '#475569' }}>{t.color}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{t.test}</td>
                      <td style={{ padding: '8px', color: '#0f172a' }}>{t.val}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                          {t.res}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedCoaModal(t)}
                          style={{
                            fontSize: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1',
                            padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600
                          }}
                        >
                          View COA
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: RFT QUALITY & PROCESS HOLD LOTS */}
      {activeTab === 'BOTTLENECKS' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>⚠️ Quality RFT Logs &amp; Reason of Topping / Re-Dyeing</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>100 logged batches evaluated for Right-First-Time compliance</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="status-pill warn">RFT Evaluated: {rftStats.totalEvaluated} Batches</span>
              <span className="status-pill good">RFT Pass Rate: {rftStats.rftPassRatePct}%</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '480px' }}>
            <table className="data-table compact-table" style={{ width: '100%', fontSize: '11px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc' }}>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Batch No</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Job No</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Buyer</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Color</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Fabric Type</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Weight (kg)</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>M/C No</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Result</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Reason of Topping / Defect</th>
                </tr>
              </thead>
              <tbody>
                {rftLogs.slice(0, 50).map((log: any, idx: number) => {
                  const isNrft = (log.result || '').toUpperCase().includes('NRFT');

                  return (
                    <tr key={`${log.batchNo}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', color: '#64748b' }}>{log.date}</td>
                      <td style={{ padding: '8px', fontWeight: 700, color: '#2563eb' }}>{log.batchNo}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{log.jobNo}</td>
                      <td style={{ padding: '8px', color: '#475569' }}>{log.buyer}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{log.color}</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>{log.fabricType}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{num(log.qtyKg)} kg</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{log.machineNo}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontWeight: 800,
                            background: isNrft ? '#fee2e2' : '#dcfce7',
                            color: isNrft ? '#991b1b' : '#166534'
                          }}
                        >
                          {log.result}
                        </span>
                      </td>
                      <td style={{ padding: '8px', color: isNrft ? '#b91c1c' : '#166534', fontWeight: isNrft ? 600 : 400 }}>
                        {log.reasonOfTopping || 'OK on 1st bath'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: BUYER-WISE FABRIC POSITION */}
      {activeTab === 'BUYER_POSITION' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>👔 Buyer-Wise Fabric Position (Executive Sheet)</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Total Required vs Greige Received vs Dyeing Output vs Cutting Delivery</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={selectedBuyer}
                onChange={e => setSelectedBuyer(e.target.value)}
                style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="ALL">All Buyers ({buyers.length})</option>
                {buyers.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table compact-table" style={{ width: '100%', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Buyer / Brand</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Lots</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Fabric Required</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Greige Rcvd</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Dyeing Output</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Delivered Cutting</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Fulfillment %</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Floor Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map((pos) => {
                  const pct = Math.round((pos.dyeingProduced / Math.max(1, pos.totalRequire)) * 100);
                  const isOk = pct >= 80;

                  return (
                    <tr key={pos.buyer} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 700, color: '#0f172a' }}>{pos.buyer}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>{pos.lotCount} lots</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{num(pos.totalRequire)} kg</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#2563eb' }}>{num(pos.greyReceived)} kg</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{num(pos.dyeingProduced)} kg</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#15803d', fontWeight: 600 }}>{num(pos.deliveryDone)} kg</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>
                        <span style={{ color: isOk ? '#16a34a' : '#d97706' }}>{pct}%</span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            background: isOk ? '#dcfce7' : '#fef3c7',
                            color: isOk ? '#166534' : '#92400e'
                          }}
                        >
                          {isOk ? 'Running Healthy' : 'Greige Feed Pending'}
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

      {/* TAB 7: MANAGEMENT MEETING ACTION ITEMS */}
      {activeTab === 'MEETING_MINUTES' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>📝 Weekly Management Meeting Decisions &amp; Action Item Register</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Attendees: MD, GM Dyeing, Quality Head, Store Head, Merchandising Manager, IE Head</div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddActionModal(true)}
              style={{ fontSize: '11px', padding: '6px 12px', background: '#2563eb', border: 'none' }}
            >
              + Record New Meeting Action Item
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {actionItems.map((item) => {
              const isResolved = item.status === 'RESOLVED';
              const isInProgress = item.status === 'IN_PROGRESS';
              const isCritical = item.priority === 'CRITICAL';

              return (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px',
                    background: isResolved ? '#f8fafc' : '#ffffff',
                    borderLeft: `4px solid ${isCritical ? '#dc2626' : isInProgress ? '#0284c7' : '#16a34a'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb' }}>{item.id}</span>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>{item.topic}</strong>
                        <span style={{
                          fontSize: '9px', padding: '2px 6px', borderRadius: '4px', fontWeight: 800,
                          background: isCritical ? '#fee2e2' : '#f1f5f9',
                          color: isCritical ? '#991b1b' : '#475569'
                        }}>
                          {item.priority}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                        <strong>Department:</strong> {item.department} · <strong>Responsible:</strong> {item.responsible} · <strong>Target:</strong> {item.targetDate}
                      </div>
                      <div style={{ fontSize: '11px', color: '#1e293b', marginTop: '6px', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px' }}>
                        {item.decisionNotes}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => toggleActionStatus(item.id)}
                        style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 700,
                          background: isResolved ? '#dcfce7' : isInProgress ? '#e0f2fe' : '#fef3c7',
                          color: isResolved ? '#166534' : isInProgress ? '#0369a1' : '#92400e'
                        }}
                      >
                        {item.status.replace('_', ' ')} (Click to toggle)
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: ADD ACTION ITEM */}
      {showAddActionModal && (
        <div className="modal-backdrop" onClick={() => setShowAddActionModal(false)}>
          <div className="modal-sheet" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Record Meeting Action Item &amp; Directive</h3>
              <button type="button" className="close-btn" onClick={() => setShowAddActionModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddActionItem} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Agenda Topic / Action Item</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S/J fabric delivery backlog for Line 5"
                  value={newAction.topic}
                  onChange={e => setNewAction(p => ({ ...p, topic: e.target.value }))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Department</label>
                  <select
                    value={newAction.department}
                    onChange={e => setNewAction(p => ({ ...p, department: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="Dyeing Floor">Dyeing Floor</option>
                    <option value="Dyeing Lab Dip">Dyeing Lab Dip</option>
                    <option value="Testing Lab">Testing Lab</option>
                    <option value="Greige Store">Greige Store</option>
                    <option value="Finished Fabric Store">Finished Fabric Store</option>
                    <option value="Central Planning">Central Planning</option>
                    <option value="Quality Assurance">Quality Assurance</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Priority</label>
                  <select
                    value={newAction.priority}
                    onChange={e => setNewAction(p => ({ ...p, priority: e.target.value as any }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="CRITICAL">Critical (Immediate)</option>
                    <option value="HIGH">High (Within 48h)</option>
                    <option value="NORMAL">Normal (Next Meeting)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Responsible Official</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M. Ali (Dyeing GM)"
                    value={newAction.responsible}
                    onChange={e => setNewAction(p => ({ ...p, responsible: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Target Completion Date</label>
                  <input
                    type="date"
                    required
                    value={newAction.targetDate}
                    onChange={e => setNewAction(p => ({ ...p, targetDate: e.target.value }))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Meeting Decision / Directive Notes</label>
                <textarea
                  rows={3}
                  placeholder="Specific instructions agreed upon by executive committee..."
                  value={newAction.decisionNotes}
                  onChange={e => setNewAction(p => ({ ...p, decisionNotes: e.target.value }))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddActionModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#2563eb', border: 'none' }}>Save Action Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CERTIFICATE OF ANALYSIS (COA) PREVIEW */}
      {selectedCoaModal && (
        <div className="modal-backdrop" onClick={() => setSelectedCoaModal(null)}>
          <div className="modal-sheet" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head" style={{ borderBottom: '2px solid #2563eb' }}>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#2563eb', fontWeight: 800 }}>
                  Northern Fashion Ltd. Textile Testing Laboratory
                </span>
                <h3 style={{ margin: '2px 0 0' }}>Official Certificate of Analysis (COA)</h3>
              </div>
              <button type="button" className="close-btn" onClick={() => setSelectedCoaModal(null)}>✕</button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#fff' }}>
              {/* Header Box */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                <div>
                  <div><strong>Certificate Ref:</strong> {selectedCoaModal.cert}</div>
                  <div><strong>Job &amp; Buyer:</strong> {selectedCoaModal.job}</div>
                  <div><strong>Stage:</strong> {selectedCoaModal.stage}</div>
                </div>
                <div>
                  <div><strong>Test Date:</strong> {selectedCoaModal.date}</div>
                  <div><strong>Accreditation:</strong> ISO/IEC 17025 Certified Lab</div>
                  <div><strong>Compliance:</strong> OEKO-TEX Standard 100 Class I</div>
                </div>
              </div>

              {/* Test Details */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table className="data-table" style={{ width: '100%', fontSize: '11px' }}>
                  <thead style={{ background: '#f1f5f9' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Test Parameter</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Test Standard</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Tested Value</th>
                      <th style={{ textAlign: 'center', padding: '8px' }}>Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px', fontWeight: 700 }}>{selectedCoaModal.test}</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>ISO / ASTM / AATCC</td>
                      <td style={{ padding: '8px', fontWeight: 600, color: '#0f172a' }}>{selectedCoaModal.val}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                          PASS
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures & Seal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
                <div style={{ textAlign: 'center', width: '180px' }}>
                  <div style={{ fontStyle: 'italic', color: '#2563eb', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>S. K. Paul</div>
                  <div style={{ borderTop: '1px solid #475569', fontSize: '10px', color: '#475569', paddingTop: '2px' }}>
                    Sr. Chemical &amp; Lab Technologist
                  </div>
                </div>

                <div style={{ textAlign: 'center', padding: '8px 12px', border: '2px solid #16a34a', borderRadius: '8px', color: '#16a34a', fontWeight: 800, fontSize: '11px' }}>
                  ✓ RELEASED TO CUTTING<br />
                  <span style={{ fontSize: '9px', fontWeight: 600 }}>QA Authorized Release Pass</span>
                </div>

                <div style={{ textAlign: 'center', width: '180px' }}>
                  <div style={{ fontStyle: 'italic', color: '#0f172a', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Dr. Nazrul Islam</div>
                  <div style={{ borderTop: '1px solid #475569', fontSize: '10px', color: '#475569', paddingTop: '2px' }}>
                    Head of Textile Quality &amp; Lab
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedCoaModal(null)}>Close</button>
                <button type="button" className="btn btn-primary" onClick={() => window.print()} style={{ background: '#2563eb', border: 'none' }}>
                  🖨️ Print Official Certificate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
