'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { FX_SERIES, FX_BAR, FX_PIE, FxResponsiveContainer as ResponsiveContainer } from '../../../components/fx';

type InspectionStage = 'knitting' | 'greige' | 'dyeing';
type InspectionStatus = 'Approved' | 'Hold' | 'Rejected' | 'Rework';

interface FabricInspectionRecord {
  id: string;
  date: string;
  stage: InspectionStage;
  stageLabel: string;
  buyer: string;
  jobNo: string;
  styleNo: string;
  fabricType: string;
  composition: string;
  reqGsm: number;
  actualGsm: number;
  reqWidth: string;
  actualWidth: string;
  lotNo: string;
  rollNo: string;
  inspectedKg: number;
  defects: string;
  severity: 'None' | 'Minor' | 'Major' | 'Critical';
  status: InspectionStatus;
  inspector: string;
  storeCleared: boolean;
  remarks: string;
}

const INITIAL_INSPECTIONS: FabricInspectionRecord[] = [
  {
    id: 'FQI-26-0891',
    date: '02-Nov-26',
    stage: 'knitting',
    stageLabel: 'Knitting Quality',
    buyer: 'ONLY',
    jobNo: '48093',
    styleNo: '22040024',
    fabricType: 'Single Jersey',
    composition: '100% Combed Cotton',
    reqGsm: 180,
    actualGsm: 182,
    reqWidth: '68"',
    actualWidth: '67.5"',
    lotNo: 'KT-Lot 204',
    rollNo: 'R-018',
    inspectedKg: 52.4,
    defects: 'Needle Line (Minor)',
    severity: 'Minor',
    status: 'Approved',
    inspector: 'Rafiqul Islam',
    storeCleared: true,
    remarks: 'Within tolerance ±3%. Direct pass.'
  },
  {
    id: 'FQI-26-0892',
    date: '02-Nov-26',
    stage: 'knitting',
    stageLabel: 'Knitting Quality',
    buyer: 'Name It',
    jobNo: '48058',
    styleNo: '13264030',
    fabricType: '1x1 Rib',
    composition: '95% Cotton 5% Elastane',
    reqGsm: 220,
    actualGsm: 216,
    reqWidth: '48"',
    actualWidth: '47.5"',
    lotNo: 'KT-Lot 198',
    rollNo: 'R-042',
    inspectedKg: 46.8,
    defects: 'Clean Pass - Zero Defects',
    severity: 'None',
    status: 'Approved',
    inspector: 'Rafiqul Islam',
    storeCleared: true,
    remarks: 'Premium yarn lot, tension balanced.'
  },
  {
    id: 'FQI-26-0893',
    date: '02-Nov-26',
    stage: 'greige',
    stageLabel: 'Greige Quality',
    buyer: 'OVS',
    jobNo: '47783',
    styleNo: '2717SW11-5156',
    fabricType: 'French Terry',
    composition: '80% Cotton 20% Polyester',
    reqGsm: 260,
    actualGsm: 274,
    reqWidth: '72"',
    actualWidth: '70"',
    lotNo: 'GS-Lot 089',
    rollNo: 'R-104',
    inspectedKg: 64.0,
    defects: 'Heavy GSM Variation (+5.4%) & Barre',
    severity: 'Major',
    status: 'Hold',
    inspector: 'Abdul Malek',
    storeCleared: false,
    remarks: 'Hold for QC Head audit before Dyeing release.'
  },
  {
    id: 'FQI-26-0894',
    date: '01-Nov-26',
    stage: 'greige',
    stageLabel: 'Greige Quality',
    buyer: 'ONLY',
    jobNo: '48202',
    styleNo: '15388786',
    fabricType: 'Single Jersey',
    composition: '100% Organic Cotton',
    reqGsm: 160,
    actualGsm: 161,
    reqWidth: '66"',
    actualWidth: '66"',
    lotNo: 'GS-Lot 094',
    rollNo: 'R-077',
    inspectedKg: 50.2,
    defects: 'Clean Pass 4-Point (12 pts/100 sq.yd)',
    severity: 'None',
    status: 'Approved',
    inspector: 'Abdul Malek',
    storeCleared: true,
    remarks: 'Grade A roll certified.'
  },
  {
    id: 'FQI-26-0895',
    date: '01-Nov-26',
    stage: 'dyeing',
    stageLabel: 'Dyeing Quality',
    buyer: 'OVS',
    jobNo: '47792',
    styleNo: '2715WFTT512-262',
    fabricType: 'Brushed Fleece',
    composition: '70% Cotton 30% Polyester',
    reqGsm: 300,
    actualGsm: 298,
    reqWidth: '74"',
    actualWidth: '73.5"',
    lotNo: 'DY-Batch 1104',
    rollNo: 'R-012',
    inspectedKg: 58.5,
    defects: 'Shade Match Delta E 0.32 (Approved standard)',
    severity: 'None',
    status: 'Approved',
    inspector: 'Dr. Nazrul Islam',
    storeCleared: true,
    remarks: 'Color fastness to wash: 4.5. Fastness to rubbing: 4.0.'
  },
  {
    id: 'FQI-26-0896',
    date: '01-Nov-26',
    stage: 'dyeing',
    stageLabel: 'Dyeing Quality',
    buyer: 'Only&Sons',
    jobNo: '46616',
    styleNo: '22039183',
    fabricType: 'Interlock Heavy',
    composition: '100% Cotton',
    reqGsm: 240,
    actualGsm: 236,
    reqWidth: '60"',
    actualWidth: '58.5"',
    lotNo: 'DY-Batch 1098',
    rollNo: 'R-031',
    inspectedKg: 49.0,
    defects: 'Uneven Dyeing & Patchy Side-to-Center',
    severity: 'Critical',
    status: 'Rework',
    inspector: 'Dr. Nazrul Islam',
    storeCleared: false,
    remarks: 'Re-topping and leveling agent required in Winch 04.'
  },
  {
    id: 'FQI-26-0897',
    date: '31-Oct-26',
    stage: 'dyeing',
    stageLabel: 'Dyeing Quality',
    buyer: 'UTG',
    jobNo: '46758',
    styleNo: 'UTG-228',
    fabricType: 'Pique Cotton',
    composition: '100% Combed Cotton',
    reqGsm: 210,
    actualGsm: 209,
    reqWidth: '70"',
    actualWidth: '70"',
    lotNo: 'DY-Batch 1085',
    rollNo: 'R-005',
    inspectedKg: 55.0,
    defects: 'Clean Pass - Shrinkage L: -2.8%, W: -1.9%',
    severity: 'None',
    status: 'Approved',
    inspector: 'Dr. Nazrul Islam',
    storeCleared: true,
    remarks: 'Finished fabric store delivery challan signed.'
  },
  {
    id: 'FQI-26-0898',
    date: '31-Oct-26',
    stage: 'knitting',
    stageLabel: 'Knitting Quality',
    buyer: 'Name It',
    jobNo: '48061',
    styleNo: '13264042',
    fabricType: 'Single Jersey',
    composition: '100% Cotton',
    reqGsm: 160,
    actualGsm: 154,
    reqWidth: '66"',
    actualWidth: '65"',
    lotNo: 'KT-Lot 187',
    rollNo: 'R-009',
    inspectedKg: 44.2,
    defects: 'Severe Contamination & Needle Holes',
    severity: 'Critical',
    status: 'Rejected',
    inspector: 'Rafiqul Islam',
    storeCleared: false,
    remarks: 'Rejected. Yarn supplier debited for contamination.'
  }
];

const DEFECT_LIBRARY = [
  { code: 'KNT-01', stage: 'Knitting', name: 'Needle Line / Mark', severity: 'Minor', action: 'Replace defective needle & cylinder check' },
  { code: 'KNT-02', stage: 'Knitting', name: 'Dropped Stitch / Hole', severity: 'Critical', action: 'Stop machine immediately; cut defective patch' },
  { code: 'KNT-03', stage: 'Knitting', name: 'Yarn Contamination (Foreign Fiber)', severity: 'Major', action: 'Quarantine roll; notify spinning mill supplier' },
  { code: 'KNT-04', stage: 'Knitting', name: 'Oil Stain / Sinker Mark', severity: 'Major', action: 'Spot cleaning with solvent wash or reprocess' },
  { code: 'GRG-01', stage: 'Greige', name: 'Barre / Density Variation', severity: 'Major', action: 'Inspect 4-point score; check yarn count consistency' },
  { code: 'GRG-02', stage: 'Greige', name: 'GSM Out of Tolerance (> ±4%)', severity: 'Major', action: 'Hold roll; notify Knitting Floor Incharge' },
  { code: 'GRG-03', stage: 'Greige', name: 'Width Shrinkage Variation', severity: 'Minor', action: 'Adjust stenter parameters during post-finishing' },
  { code: 'DYE-01', stage: 'Dyeing', name: 'Shade Variation (Delta E > 0.8)', severity: 'Critical', action: 'Hold batch; submit to lab for shade topping' },
  { code: 'DYE-02', stage: 'Dyeing', name: 'Uneven Dyeing / Patch Mark', severity: 'Critical', action: 'Stripping & re-dyeing in HTHP winch' },
  { code: 'DYE-03', stage: 'Dyeing', name: 'Color Fastness Failure (Rubbing < 3.5)', severity: 'Major', action: 'Additional soaping & fixation bath wash' },
  { code: 'DYE-04', stage: 'Dyeing', name: 'Shrinkage & Spirality Failure (> 5%)', severity: 'Major', action: 'Compactor re-feed with overfeed control' }
];

function GlassmorphismChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          borderRadius: '8px',
          padding: '8px 12px',
          boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.45)',
          color: '#FFFFFF',
          fontSize: '12px',
          minWidth: '140px',
          zIndex: 100,
          pointerEvents: 'none'
        }}
      >
        {label && (
          <div style={{ fontWeight: 800, color: '#38BDF8', marginBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '3px' }}>
            {label}
          </div>
        )}
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '3px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#CBD5E1', fontSize: '11.5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color || entry.fill || '#38BDF8' }} />
              {entry.name || 'Value'}:
            </span>
            <span style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '12px' }}>
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function FabricQualityPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'knitting' | 'greige' | 'dyeing' | 'defects'>('all');
  const [stageFilter, setStageFilter] = useState<'ALL' | 'knitting' | 'greige' | 'dyeing'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InspectionStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspections, setInspections] = useState<FabricInspectionRecord[]>(INITIAL_INSPECTIONS);
  const [showEntryModal, setShowEntryModal] = useState(false);

  // Form states for new inspection entry
  const [formStage, setFormStage] = useState<InspectionStage>('knitting');
  const [formBuyer, setFormBuyer] = useState('ONLY');
  const [formJob, setFormJob] = useState('48093');
  const [formStyle, setFormStyle] = useState('22040024');
  const [formFabric, setFormFabric] = useState('100% Combed Cotton Single Jersey');
  const [formReqGsm, setFormReqGsm] = useState(180);
  const [formActualGsm, setFormActualGsm] = useState(181);
  const [formReqWidth, setFormReqWidth] = useState('68"');
  const [formActualWidth, setFormActualWidth] = useState('67.5"');
  const [formLot, setFormLot] = useState('KT-Lot 205');
  const [formRoll, setFormRoll] = useState('R-088');
  const [formKg, setFormKg] = useState(50.0);
  const [formDefect, setFormDefect] = useState('Clean Pass - Zero Defects');
  const [formSeverity, setFormSeverity] = useState<'None' | 'Minor' | 'Major' | 'Critical'>('None');
  const [formStatus, setFormStatus] = useState<InspectionStatus>('Approved');

  // Filtered list
  const filteredRecords = useMemo(() => {
    return inspections.filter((rec) => {
      // Tab constraint
      if (activeTab === 'knitting' && rec.stage !== 'knitting') return false;
      if (activeTab === 'greige' && rec.stage !== 'greige') return false;
      if (activeTab === 'dyeing' && rec.stage !== 'dyeing') return false;

      // Dropdown filters
      if (stageFilter !== 'ALL' && rec.stage !== stageFilter) return false;
      if (statusFilter !== 'ALL' && rec.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          rec.id.toLowerCase().includes(q) ||
          rec.buyer.toLowerCase().includes(q) ||
          rec.jobNo.toLowerCase().includes(q) ||
          rec.styleNo.toLowerCase().includes(q) ||
          rec.rollNo.toLowerCase().includes(q) ||
          rec.lotNo.toLowerCase().includes(q) ||
          rec.fabricType.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [inspections, activeTab, stageFilter, statusFilter, searchQuery]);

  // Aggregate KPI stats
  const kpiStats = useMemo(() => {
    const totalRolls = 1280;
    const totalKg = 64250;
    const approvedKg = 61040;
    const holdKg = 2260;
    const rejectedKg = 950;
    const passRate = ((approvedKg / totalKg) * 100).toFixed(1);
    const holdRate = ((holdKg / totalKg) * 100).toFixed(1);
    const rejectRate = ((rejectedKg / totalKg) * 100).toFixed(1);

    return { totalRolls, totalKg, approvedKg, holdKg, rejectedKg, passRate, holdRate, rejectRate };
  }, []);

  // Stage Breakdown Chart Data
  const stageChartData = [
    { name: 'Knitting Quality', passedKg: 24500, defectKg: 620 },
    { name: 'Greige Fabric', passedKg: 19800, defectKg: 890 },
    { name: 'Dyeing Quality', passedKg: 16740, defectKg: 1700 }
  ];

  // Defect Pareto Data
  const defectParetoData = [
    { name: 'Shade / Delta E', value: 38, color: '#2563EB' },
    { name: 'Needle Line', value: 24, color: '#0284C7' },
    { name: 'Barre / Density', value: 18, color: '#D97706' },
    { name: 'Oil / Stains', value: 12, color: '#DC2626' },
    { name: 'Shrinkage / Width', value: 8, color: '#7C3AED' }
  ];

  const handleAddInspection = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `FQI-26-${String(Math.floor(Math.random() * 900) + 1000)}`;
    const newRec: FabricInspectionRecord = {
      id: newId,
      date: '02-Nov-26',
      stage: formStage,
      stageLabel: formStage === 'knitting' ? 'Knitting Quality' : formStage === 'greige' ? 'Greige Quality' : 'Dyeing Quality',
      buyer: formBuyer,
      jobNo: formJob,
      styleNo: formStyle,
      fabricType: formFabric,
      composition: formFabric,
      reqGsm: Number(formReqGsm),
      actualGsm: Number(formActualGsm),
      reqWidth: formReqWidth,
      actualWidth: formActualWidth,
      lotNo: formLot,
      rollNo: formRoll,
      inspectedKg: Number(formKg),
      defects: formDefect,
      severity: formSeverity,
      status: formStatus,
      inspector: 'Active User (QC)',
      storeCleared: formStatus === 'Approved',
      remarks: formStatus === 'Approved' ? 'Verified Quality Clearance. Store delivery authorized.' : 'Quality Hold. Locked against store issue.'
    };

    setInspections([newRec, ...inspections]);
    setShowEntryModal(false);
  };

  return (
    <Shell
      title="Fabric Quality — Centralized Quality Management"
      eyebrow="Quality Department · Centralized Inspection Across Knitting, Greige & Dyeing"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Top Department Action Bar */}
        <section
          style={{
            background: 'linear-gradient(135deg, #071F42 0%, #0c2d5e 100%)',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '18px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 16px rgba(7, 31, 66, 0.2)'
          }}
        >
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#93c5fd', fontWeight: 800 }}>
              Centralized Quality Governance
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 850, margin: '4px 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
              Fabric Quality Management
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
              Full traceability from Yarn Lot & Knitting Machine through Greige 4-Point Inspection to Dyeing Batch Shade & Physical Tests.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setShowEntryModal(true)}
              className="btn btn-primary"
              style={{
                background: '#16a34a',
                borderColor: '#15803d',
                padding: '9px 16px',
                fontSize: '13px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>+</span>
              <span>Log Quality Inspection</span>
            </button>
            <Link
              href="/modules/finished-fabric"
              className="btn btn-secondary"
              style={{
                fontSize: '13px',
                fontWeight: 700,
                background: 'rgba(255,255,255,0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              Finished Fabric Store Clearance →
            </Link>
          </div>
        </section>

        {/* Finished Fabric Store Quality Gate Rule Notice */}
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🛡️</span>
            <div>
              <strong style={{ fontSize: '13.5px', color: '#166534', display: 'block' }}>
                Factory Business Rule: Finished Fabric Store Quality Gate
              </strong>
              <span style={{ fontSize: '12.5px', color: '#15803d' }}>
                Finished Fabric Store does not perform separate inspections. It stores and issues fabric based on Fabric Quality clearance.
                Rolls marked <strong>Hold</strong> or <strong>Rejected</strong> cannot be dispatched to cutting floor without Quality Head sign-off.
              </span>
            </div>
          </div>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              background: '#dcfce7',
              color: '#15803d',
              fontSize: '12px',
              fontWeight: 800,
              whiteSpace: 'nowrap'
            }}
          >
            ACTIVE QUALITY GATE
          </span>
        </div>

        {/* High-Level KPI Summary Cards (Readable, Large Fonts) */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '14px'
          }}
        >
          {/* KPI 1: Inspected Rolls */}
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid #2563eb' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total Inspected
            </div>
            <div style={{ fontSize: '30px', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
              {kpiStats.totalRolls.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Rolls</span>
            </div>
            <div style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
              {kpiStats.totalKg.toLocaleString()} Kg · 192,800 Mtrs
            </div>
          </div>

          {/* KPI 2: Pass Rate & Accepted */}
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid #16a34a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Quality Pass Rate
              </span>
              <span style={{ fontSize: '12px', fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px' }}>
                95.0%
              </span>
            </div>
            <div style={{ fontSize: '30px', fontWeight: 900, color: '#16a34a', margin: '4px 0' }}>
              {kpiStats.approvedKg.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Kg</span>
            </div>
            <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>
              1,215 Rolls Cleared for Store
            </div>
          </div>

          {/* KPI 3: Quality Hold */}
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid #d97706' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Quality Hold
              </span>
              <span style={{ fontSize: '12px', fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '4px' }}>
                {kpiStats.holdRate}%
              </span>
            </div>
            <div style={{ fontSize: '30px', fontWeight: 900, color: '#d97706', margin: '4px 0' }}>
              {kpiStats.holdKg.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Kg</span>
            </div>
            <div style={{ fontSize: '13px', color: '#b45309', fontWeight: 600 }}>
              45 Rolls Pending Review
            </div>
          </div>

          {/* KPI 4: Rejected Quantity */}
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid #dc2626' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Defect Rejection
              </span>
              <span style={{ fontSize: '12px', fontWeight: 800, background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px' }}>
                {kpiStats.rejectRate}%
              </span>
            </div>
            <div style={{ fontSize: '30px', fontWeight: 900, color: '#dc2626', margin: '4px 0' }}>
              {kpiStats.rejectedKg.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Kg</span>
            </div>
            <div style={{ fontSize: '13px', color: '#b91c1c', fontWeight: 600 }}>
              20 Rolls Blocked
            </div>
          </div>
        </section>

        {/* Stage Navigation Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '10px'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'all' ? '#0f172a' : '#f1f5f9',
              color: activeTab === 'all' ? '#ffffff' : '#475569'
            }}
          >
            📋 All Stages Register ({inspections.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('knitting')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'knitting' ? '#0f172a' : '#f1f5f9',
              color: activeTab === 'knitting' ? '#ffffff' : '#475569'
            }}
          >
            🧶 Knitting Quality
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('greige')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'greige' ? '#0f172a' : '#f1f5f9',
              color: activeTab === 'greige' ? '#ffffff' : '#475569'
            }}
          >
            🧵 Greige Fabric Quality
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dyeing')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'dyeing' ? '#0f172a' : '#f1f5f9',
              color: activeTab === 'dyeing' ? '#ffffff' : '#475569'
            }}
          >
            🎨 Dyeing Quality
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('defects')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'defects' ? '#0f172a' : '#f1f5f9',
              color: activeTab === 'defects' ? '#ffffff' : '#475569',
              marginLeft: 'auto'
            }}
          >
            📖 Fabric Defect Library
          </button>
        </div>

        {/* Visual Charts: Stage Performance & Defect Breakdown */}
        {activeTab !== 'defects' && (
          <section className="management-grid-row equal" style={{ gap: '14px', marginBottom: '16px' }}>
            {/* Chart 1: Stage Volume Comparison */}
            <div className="card erp-card-animated" style={{ padding: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                Stage-wise Fabric Inspection: Passed vs Defect (Kg)
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                Knitting machine output, Greige 4-point rolls and Dyeing finished winches
              </div>
              <div style={{ height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} unit=" kg" />
                    <Tooltip content={<GlassmorphismChartTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.08)', radius: 4 }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar {...FX_BAR} dataKey="passedKg" name="Passed Volume (Kg)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    <Bar {...FX_BAR} dataKey="defectKg" name="Defect / Hold (Kg)" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Top Fabric Defect Breakdown */}
            <div className="card erp-card-animated" style={{ padding: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                Defect Category Breakdown (%)
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                Major root cause factors across manufacturing stages
              </div>
              <div style={{ height: '240px', display: 'flex', alignItems: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie {...FX_PIE}
                      data={defectParetoData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {defectParetoData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<GlassmorphismChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* Main Content Area: Inspection Register vs Defect Library */}
        {activeTab === 'defects' ? (
          /* Defect Library View */
          <div className="card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Fabric Defect Library & Corrective Action Master
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  Standard defect categorization for Knitting, Greige Fabric and Dyeing processes.
                </p>
              </div>
              <span className="badge">{DEFECT_LIBRARY.length} Standard Defect Codes</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Defect Code</th>
                    <th>Stage</th>
                    <th>Defect Name</th>
                    <th>Severity</th>
                    <th>Standard Corrective Action</th>
                  </tr>
                </thead>
                <tbody>
                  {DEFECT_LIBRARY.map((d) => (
                    <tr key={d.code} style={{ height: '42px' }}>
                      <td>
                        <strong style={{ color: '#2563eb' }}>{d.code}</strong>
                      </td>
                      <td>
                        <span className="badge">{d.stage}</span>
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{d.name}</strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            d.severity === 'Critical' ? 'status-pill' : d.severity === 'Major' ? 'status-pill neutral' : ''
                          }`}
                          style={{
                            background:
                              d.severity === 'Critical' ? '#fee2e2' : d.severity === 'Major' ? '#fef3c7' : '#f1f5f9',
                            color:
                              d.severity === 'Critical' ? '#b91c1c' : d.severity === 'Major' ? '#b45309' : '#475569'
                          }}
                        >
                          {d.severity}
                        </span>
                      </td>
                      <td style={{ color: '#334155', fontSize: '13px' }}>{d.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Inspection Register View */
          <div className="card" style={{ padding: '18px' }}>
            {/* Filter Bar */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '14px',
                borderBottom: '1px solid #f1f5f9'
              }}
            >
              {/* Search */}
              <div style={{ flex: '1', minWidth: '220px' }}>
                <input
                  type="text"
                  placeholder="Search by ID, Job #, Roll #, Style, Buyer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Stage Filter */}
              <div>
                <select
                  value={stageFilter}
                  onChange={(e: any) => setStageFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    background: '#ffffff'
                  }}
                >
                  <option value="ALL">All Stages</option>
                  <option value="knitting">Knitting Quality</option>
                  <option value="greige">Greige Quality</option>
                  <option value="dyeing">Dyeing Quality</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    background: '#ffffff'
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Approved">Approved / Pass</option>
                  <option value="Hold">Hold</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Rework">Rework</option>
                </select>
              </div>

              <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                Showing {filteredRecords.length} of {inspections.length} Inspection Records
              </div>
            </div>

            {/* Register Data Grid (13-14px font, 42px row height) */}
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ height: '42px', background: '#f8fafc' }}>
                    <th style={{ fontSize: '13px' }}>Inspection ID</th>
                    <th style={{ fontSize: '13px' }}>Date</th>
                    <th style={{ fontSize: '13px' }}>Stage</th>
                    <th style={{ fontSize: '13px' }}>Buyer / Job #</th>
                    <th style={{ fontSize: '13px' }}>Fabric & Composition</th>
                    <th style={{ fontSize: '13px' }}>Req / Act GSM</th>
                    <th style={{ fontSize: '13px' }}>Width</th>
                    <th style={{ fontSize: '13px' }}>Roll / Lot #</th>
                    <th style={{ fontSize: '13px', textAlign: 'right' }}>Qty (Kg)</th>
                    <th style={{ fontSize: '13px' }}>Defect Observed</th>
                    <th style={{ fontSize: '13px' }}>Status</th>
                    <th style={{ fontSize: '13px' }}>Store Clearance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r) => {
                    const statusBg =
                      r.status === 'Approved' ? '#dcfce7' :
                      r.status === 'Hold' ? '#fef3c7' :
                      r.status === 'Rejected' ? '#fee2e2' : '#f3e8ff';
                    const statusColor =
                      r.status === 'Approved' ? '#15803d' :
                      r.status === 'Hold' ? '#b45309' :
                      r.status === 'Rejected' ? '#b91c1c' : '#7c3aed';

                    return (
                      <tr key={r.id} style={{ height: '44px', borderBottom: '1px solid #edf2f7' }}>
                        <td>
                          <strong style={{ color: '#2563eb', fontSize: '13.5px' }}>{r.id}</strong>
                        </td>
                        <td style={{ fontSize: '13px', color: '#475569' }}>{r.date}</td>
                        <td>
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#e0f2fe',
                              color: '#0369a1'
                            }}
                          >
                            {r.stageLabel}
                          </span>
                        </td>
                        <td>
                          <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{r.buyer}</strong>
                          <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>Job #{r.jobNo}</span>
                        </td>
                        <td>
                          <div style={{ fontSize: '13.5px', fontWeight: 650, color: '#1e293b' }}>{r.fabricType}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{r.composition}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                            {r.actualGsm}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}> / {r.reqGsm} gsm</span>
                        </td>
                        <td style={{ fontSize: '13px', color: '#334155' }}>
                          {r.actualWidth} <span style={{ fontSize: '11px', color: '#64748b' }}>({r.reqWidth})</span>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{r.rollNo}</div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>{r.lotNo}</div>
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                          {r.inspectedKg.toFixed(1)}
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', color: r.severity === 'Critical' ? '#b91c1c' : '#334155', fontWeight: r.severity === 'Critical' ? 700 : 500 }}>
                            {r.defects}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 800,
                              padding: '3px 9px',
                              borderRadius: '999px',
                              background: statusBg,
                              color: statusColor
                            }}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td>
                          {r.storeCleared ? (
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>✓</span> Cleared
                            </span>
                          ) : (
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>🚫</span> Blocked
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Log New Quality Inspection */}
      {showEntryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '650px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Log Fabric Quality Inspection
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Verify fabric specifications, detect defects and issue store clearance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEntryModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddInspection} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Inspection Stage
                  </label>
                  <select
                    value={formStage}
                    onChange={(e: any) => setFormStage(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="knitting">Knitting Quality</option>
                    <option value="greige">Greige Fabric Quality</option>
                    <option value="dyeing">Dyeing Quality</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Buyer & Job #
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      value={formBuyer}
                      onChange={(e) => setFormBuyer(e.target.value)}
                      style={{ width: '45%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="ONLY">ONLY</option>
                      <option value="Name It">Name It</option>
                      <option value="OVS">OVS</option>
                      <option value="Only&Sons">Only&Sons</option>
                      <option value="UTG">UTG</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Job #"
                      value={formJob}
                      onChange={(e) => setFormJob(e.target.value)}
                      style={{ width: '55%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Fabric Description & Composition
                </label>
                <input
                  type="text"
                  value={formFabric}
                  onChange={(e) => setFormFabric(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Req GSM
                  </label>
                  <input
                    type="number"
                    value={formReqGsm}
                    onChange={(e) => setFormReqGsm(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Actual GSM
                  </label>
                  <input
                    type="number"
                    value={formActualGsm}
                    onChange={(e) => setFormActualGsm(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Req Width
                  </label>
                  <input
                    type="text"
                    value={formReqWidth}
                    onChange={(e) => setFormReqWidth(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Actual Width
                  </label>
                  <input
                    type="text"
                    value={formActualWidth}
                    onChange={(e) => setFormActualWidth(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Lot / Batch #
                  </label>
                  <input
                    type="text"
                    value={formLot}
                    onChange={(e) => setFormLot(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Roll #
                  </label>
                  <input
                    type="text"
                    value={formRoll}
                    onChange={(e) => setFormRoll(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Weight (Kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formKg}
                    onChange={(e) => setFormKg(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Defect Description
                </label>
                <input
                  type="text"
                  value={formDefect}
                  onChange={(e) => setFormDefect(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Severity
                  </label>
                  <select
                    value={formSeverity}
                    onChange={(e: any) => setFormSeverity(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="None">None (Zero Defect)</option>
                    <option value="Minor">Minor Defect</option>
                    <option value="Major">Major Defect</option>
                    <option value="Critical">Critical Defect</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Quality Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e: any) => setFormStatus(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="Approved">Approved (Store Release Cleared)</option>
                    <option value="Hold">Hold (Pending Review)</option>
                    <option value="Rejected">Rejected (Blocked)</option>
                    <option value="Rework">Rework Required</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '13px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 20px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#ffffff', fontSize: '13px', fontWeight: 700 }}
                >
                  Save & Update Inspection Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
