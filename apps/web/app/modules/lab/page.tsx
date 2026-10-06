'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';
import demo2000DataRaw from '../../../data/demo-2000-master.json';
import factoryDataRaw from '../../../data/dyeing-factory-data.json';

type LabStage = 'ALL' | 'BEFORE_DYEING' | 'BEFORE_BULK' | 'BEFORE_DELIVERY';
type TestResult = 'ALL' | 'PASS' | 'FAIL' | 'IN_TESTING' | 'CONDITIONAL';

interface LabTestRecord {
  id: string;
  testNo: string;
  jobNo: string;
  buyer: string;
  styleNo: string;
  color: string;
  fabricType: string;
  stage: 'BEFORE_DYEING' | 'BEFORE_BULK' | 'BEFORE_DELIVERY';
  stageLabel: string;
  testCategory: string;
  standard: string;
  result: 'PASS' | 'FAIL' | 'IN_TESTING' | 'CONDITIONAL';
  testedValue: string;
  requiredStd: string;
  testedAt: string;
  technician: string;
  approver: string;
  remarks: string;
  certificateRef: string;
  sampleBatchRef?: string;
  deltaE?: number;
  lightSource?: string;
}

const masterJobs = (demo2000DataRaw as any)?.jobs || [];
const factoryBatches = (factoryDataRaw as any)?.dyeingBatches || [];

// Generate comprehensive textile lab testing pipeline records
const initialLabTests: LabTestRecord[] = [
  // --- STAGE 1: BEFORE DYEING (Yarn & Greige Lab, Dyeing Lab Dip & Recipe Formulation) ---
  {
    id: 'LAB-BD-01',
    testNo: 'LT-2026-081',
    jobNo: '48085',
    buyer: 'BS-NMT',
    styleNo: '13251506',
    color: 'Nosegay (Lurex)',
    fabricType: 'Single Jersey + Lurex 180 GSM',
    stage: 'BEFORE_DYEING',
    stageLabel: 'Stage 1 · Before Dyeing',
    testCategory: 'Yarn Count & CSP Lea Strength',
    standard: 'ASTM D1907 / ISO 2060',
    result: 'PASS',
    testedValue: '30/1 Ne (Actual 29.8s), CSP 2,840',
    requiredStd: 'Min CSP 2,600, Count ±2.5%',
    testedAt: '2026-08-02',
    technician: 'S. K. Paul (Sr. Chemist)',
    approver: 'Dr. Nazrul Islam (Lab Head)',
    remarks: 'Approved for circular knitting. Clean hairiness index.',
    certificateRef: 'COA-YRN-48085-A',
    sampleBatchRef: 'LOT-SL-301'
  },
  {
    id: 'LAB-BD-02',
    testNo: 'LT-2026-082',
    jobNo: '48085',
    buyer: 'BS-NMT',
    styleNo: '13251506',
    color: 'Nosegay (Lurex)',
    fabricType: 'Greige S/J 180 GSM',
    stage: 'BEFORE_DYEING',
    stageLabel: 'Stage 1 · Before Dyeing',
    testCategory: 'Greige Bio-Scouring & Absorbency',
    standard: 'AATCC 79 (Drop Test)',
    result: 'PASS',
    testedValue: 'Water sink < 2.4 sec, Neutral pH 6.8',
    requiredStd: 'Sink time < 3.0 sec, Wax free',
    testedAt: '2026-08-03',
    technician: 'F. Rahman (Dyeing Lab Tech)',
    approver: 'M. Ali (Dyeing GM)',
    remarks: 'Enzyme scour recipe effective; no residual wax detected.',
    certificateRef: 'COA-GRG-48085-B',
    sampleBatchRef: 'BATCH-G-102'
  },
  {
    id: 'LAB-BD-03',
    testNo: 'LT-2026-083',
    jobNo: '48085',
    buyer: 'BS-NMT',
    styleNo: '13251506',
    color: 'Nosegay (Lurex)',
    fabricType: 'Lab Dip Spectrophotometer Match',
    stage: 'BEFORE_DYEING',
    stageLabel: 'Stage 1 · Before Dyeing',
    testCategory: 'Dyeing Lab Dip Shade Recipe',
    standard: 'Datacolor 800 Spectro (CMC 2:1)',
    result: 'PASS',
    testedValue: 'ΔE 0.42 (D65), ΔE 0.48 (TL84), ΔE 0.39 (CWF)',
    requiredStd: 'ΔE < 0.65 vs Buyer Master Swatch',
    testedAt: '2026-08-04',
    technician: 'S. K. Paul (Sr. Chemist)',
    approver: 'Bestseller QA Desk',
    remarks: 'Buyer Option A approved. Recipe Code REC-48085-BLK issued to floor.',
    certificateRef: 'DIP-BS-48085-OPT-A',
    deltaE: 0.42,
    lightSource: 'D65 / TL84 / CWF'
  },
  {
    id: 'LAB-BD-04',
    testNo: 'LT-2026-084',
    jobNo: '48086',
    buyer: 'BS-JJ',
    styleNo: '12267123',
    color: 'Total Eclipse / Navy',
    fabricType: 'Fleece 280 GSM',
    stage: 'BEFORE_DYEING',
    stageLabel: 'Stage 1 · Before Dyeing',
    testCategory: 'Yarn Twist (TPI) & Moisture Regain',
    standard: 'ISO 2061 / ASTM D2495',
    result: 'PASS',
    testedValue: '18.4 TPI (Z-twist), Moisture 7.8%',
    requiredStd: '18.0 ± 0.8 TPI, Moisture 7.5-8.5%',
    testedAt: '2026-08-05',
    technician: 'M. Ali (Lab Officer)',
    approver: 'Dr. Nazrul Islam (Lab Head)',
    remarks: 'Consistent twist across all 12 cones sampled.',
    certificateRef: 'COA-YRN-48086-T'
  },
  {
    id: 'LAB-BD-05',
    testNo: 'LT-2026-085',
    jobNo: '48087',
    buyer: 'ONLY',
    styleNo: '15289944',
    color: 'Sunlight Yellow',
    fabricType: 'Single Jersey 160 GSM',
    stage: 'BEFORE_DYEING',
    stageLabel: 'Stage 1 · Before Dyeing',
    testCategory: 'Lab Dip Spectrophotometer Match',
    standard: 'Datacolor 800 Spectro (CMC 2:1)',
    result: 'CONDITIONAL',
    testedValue: 'ΔE 0.78 (D65) - Slight red cast',
    requiredStd: 'ΔE < 0.65',
    testedAt: '2026-08-06',
    technician: 'F. Rahman (Dyeing Lab Tech)',
    approver: 'Pending Buyer Sign-off',
    remarks: 'Recipe adjusted with 0.04% less Golden Yellow RL. Option C submitted.',
    certificateRef: 'DIP-ONLY-48087-C',
    deltaE: 0.78,
    lightSource: 'D65 / TL84'
  },

  // --- STAGE 2: BEFORE BULK PRODUCTION (Pilot Lot / 1st Batch Trial Approval) ---
  {
    id: 'LAB-BP-01',
    testNo: 'LT-2026-110',
    jobNo: '48085',
    buyer: 'BS-NMT',
    styleNo: '13251506',
    color: 'Nosegay (Lurex)',
    fabricType: 'Pilot Batch 200kg (Winch 01 Dilmenler)',
    stage: 'BEFORE_BULK',
    stageLabel: 'Stage 2 · Before Bulk Production',
    testCategory: 'Color Fastness to Washing (Pilot Lot)',
    standard: 'ISO 105-C06 (A2S @ 40°C)',
    result: 'PASS',
    testedValue: 'Shade Change: Grade 4-5, Cotton Staining: Grade 4-5',
    requiredStd: 'Min Grade 4.0 for Change & Staining',
    testedAt: '2026-08-07',
    technician: 'S. K. Paul (Sr. Chemist)',
    approver: 'M. Ali (Dyeing GM)',
    remarks: 'Pilot lot fastness solid. Approved to load bulk winches (1,050 kg).',
    certificateRef: 'PILOT-CFW-48085-01',
    sampleBatchRef: 'BT-48085-01'
  },
  {
    id: 'LAB-BP-02',
    testNo: 'LT-2026-111',
    jobNo: '48085',
    buyer: 'BS-NMT',
    styleNo: '13251506',
    color: 'Nosegay (Lurex)',
    fabricType: 'Pilot Batch 200kg (Winch 01 Dilmenler)',
    stage: 'BEFORE_BULK',
    stageLabel: 'Stage 2 · Before Bulk Production',
    testCategory: 'Pre-Bulk Dimensional Stability & Shrinkage',
    standard: 'ISO 6330 / ISO 5077 (3x Wash @ 40°C)',
    result: 'PASS',
    testedValue: 'Length: -2.8%, Width: -1.9%',
    requiredStd: 'Allowable: Max ±4.0% Length & Width',
    testedAt: '2026-08-08',
    technician: 'F. Rahman (Lab Tech)',
    approver: 'Central Planning Team',
    remarks: 'Shrinkage well within tolerance. Stenter overfeed set to 14%.',
    certificateRef: 'PILOT-SHR-48085-01',
    sampleBatchRef: 'BT-48085-01'
  },
  {
    id: 'LAB-BP-03',
    testNo: 'LT-2026-112',
    jobNo: '48085',
    buyer: 'BS-NMT',
    styleNo: '13251506',
    color: 'Nosegay (Lurex)',
    fabricType: 'Pilot Batch 200kg (Winch 01 Dilmenler)',
    stage: 'BEFORE_BULK',
    stageLabel: 'Stage 2 · Before Bulk Production',
    testCategory: 'Color Fastness to Rubbing (Dry / Wet)',
    standard: 'ISO 105-X12 (Crockmeter)',
    result: 'PASS',
    testedValue: 'Dry: Grade 4-5, Wet: Grade 4.0',
    requiredStd: 'Min Dry 4.0, Min Wet 3.5',
    testedAt: '2026-08-08',
    technician: 'S. K. Paul (Sr. Chemist)',
    approver: 'Dr. Nazrul Islam (Lab Head)',
    remarks: 'Excellent wet rub score with polycationic fixing agent.',
    certificateRef: 'PILOT-CFR-48085-01',
    sampleBatchRef: 'BT-48085-01'
  },
  {
    id: 'LAB-BP-04',
    testNo: 'LT-2026-113',
    jobNo: '48088',
    buyer: 'OVS',
    styleNo: '903412',
    color: 'Bright Crimson Red',
    fabricType: 'Pilot Batch 150kg (Winch 03 Fongs)',
    stage: 'BEFORE_BULK',
    stageLabel: 'Stage 2 · Before Bulk Production',
    testCategory: 'Color Fastness to Water & Perspiration',
    standard: 'ISO 105-E01 / ISO 105-E04 (Acid & Alkaline)',
    result: 'PASS',
    testedValue: 'Acid Perspiration: 4-5, Alkaline: 4.0, Water: 4-5',
    requiredStd: 'Min Grade 4.0',
    testedAt: '2026-08-09',
    technician: 'M. Ali (Lab Officer)',
    approver: 'OVS QA Representative',
    remarks: 'Bulk production authorized for 2,400 kg lot.',
    certificateRef: 'PILOT-E04-OVS-48088'
  },
  {
    id: 'LAB-BP-05',
    testNo: 'LT-2026-114',
    jobNo: '48092',
    buyer: 'UTG',
    styleNo: '882190',
    color: 'Dark Olive Heather',
    fabricType: 'Pilot Batch 180kg (Winch 02 Dilmenler)',
    stage: 'BEFORE_BULK',
    stageLabel: 'Stage 2 · Before Bulk Production',
    testCategory: 'Spirality / Torque after Wash Test',
    standard: 'ISO 16322-2',
    result: 'CONDITIONAL',
    testedValue: '3.6% Torque clockwise',
    requiredStd: 'Max 3.0% Spirality',
    testedAt: '2026-08-10',
    technician: 'F. Rahman (Lab Tech)',
    approver: 'Knitting Technical Head',
    remarks: 'Compactor steam and skewing adjust required during final finishing.',
    certificateRef: 'PILOT-SPI-UTG-48092'
  },

  // --- STAGE 3: TESTING BEFORE DELIVERY (Final Bulk Testing, Release Sign-off to Cutting) ---
  {
    id: 'LAB-DEL-01',
    testNo: 'LT-2026-201',
    jobNo: '48085',
    buyer: 'BS-NMT',
    styleNo: '13251506',
    color: 'Nosegay (Lurex)',
    fabricType: 'Bulk Finished S/J (Total 1,840 kg)',
    stage: 'BEFORE_DELIVERY',
    stageLabel: 'Stage 3 · Testing Before Delivery',
    testCategory: 'Final Release: Dimensional Stability & Spirality',
    standard: 'ISO 6330 / ISO 5077 / ISO 16322',
    result: 'PASS',
    testedValue: 'Length: -2.1%, Width: -1.4%, Spirality: 1.2%',
    requiredStd: 'Length/Width Max ±4.0%, Spirality Max 3.0%',
    testedAt: '2026-08-14',
    technician: 'S. K. Paul (Sr. Chemist)',
    approver: 'Dr. Nazrul Islam (Lab Head)',
    remarks: 'PERFECT. Ready for immediate handover to Cutting Floor.',
    certificateRef: 'FINAL-COA-BS-48085-REL',
    sampleBatchRef: 'DEL-CH-8801'
  },
  {
    id: 'LAB-DEL-02',
    testNo: 'LT-2026-202',
    jobNo: '48085',
    buyer: 'BS-NMT',
    styleNo: '13251506',
    color: 'Nosegay (Lurex)',
    fabricType: 'Bulk Finished S/J (Total 1,840 kg)',
    stage: 'BEFORE_DELIVERY',
    stageLabel: 'Stage 3 · Testing Before Delivery',
    testCategory: 'Final Release: Pilling Resistance (Martindale)',
    standard: 'ISO 12945-2 (2000 Revolutions)',
    result: 'PASS',
    testedValue: 'Grade 4.0 @ 2000 revs, No surface fuzzing',
    requiredStd: 'Min Grade 3-4',
    testedAt: '2026-08-14',
    technician: 'S. K. Paul (Sr. Chemist)',
    approver: 'QA Assurance Manager',
    remarks: 'Enzymatic biopolish maintained anti-pilling integrity.',
    certificateRef: 'FINAL-PIL-BS-48085',
    sampleBatchRef: 'DEL-CH-8801'
  },
  {
    id: 'LAB-DEL-03',
    testNo: 'LT-2026-203',
    jobNo: '48085',
    buyer: 'BS-NMT',
    styleNo: '13251506',
    color: 'Nosegay (Lurex)',
    fabricType: 'Bulk Finished S/J (Total 1,840 kg)',
    stage: 'BEFORE_DELIVERY',
    stageLabel: 'Stage 3 · Testing Before Delivery',
    testCategory: 'Final Release: Bursting Strength (Hydraulic)',
    standard: 'ASTM D3786 / ISO 13938-1',
    result: 'PASS',
    testedValue: '284 kPa (41.2 psi)',
    requiredStd: 'Min 240 kPa (35 psi)',
    testedAt: '2026-08-15',
    technician: 'F. Rahman (Lab Tech)',
    approver: 'Quality Assurance Head',
    remarks: 'Meets knit tensile burst requirements.',
    certificateRef: 'FINAL-BST-BS-48085',
    sampleBatchRef: 'DEL-CH-8801'
  },
  {
    id: 'LAB-DEL-04',
    testNo: 'LT-2026-204',
    jobNo: '48085',
    buyer: 'BS-NMT',
    styleNo: '13251506',
    color: 'Nosegay (Lurex)',
    fabricType: 'Bulk Finished S/J (Total 1,840 kg)',
    stage: 'BEFORE_DELIVERY',
    stageLabel: 'Stage 3 · Testing Before Delivery',
    testCategory: 'Final Release: Eco-Tox, pH & Formaldehyde',
    standard: 'OEKO-TEX 100 Class I (Baby / Children Wear)',
    result: 'PASS',
    testedValue: 'Formaldehyde: <16 ppm, pH: 6.4 (Clean Extract)',
    requiredStd: 'Formaldehyde < 20 ppm, pH 4.0 - 7.5',
    testedAt: '2026-08-15',
    technician: 'Dr. Nazrul Islam (Lab Head)',
    approver: 'Buyer Compliance Desk',
    remarks: 'Full OEKO-TEX Standard 100 Class I certified for export.',
    certificateRef: 'OEK-CERT-BS-48085',
    sampleBatchRef: 'DEL-CH-8801'
  },
  {
    id: 'LAB-DEL-05',
    testNo: 'LT-2026-205',
    jobNo: '48089',
    buyer: 'NEW LOOK',
    styleNo: 'NL-77312',
    color: 'Charcoal Black',
    fabricType: 'Terry / Brush Back 260 GSM',
    stage: 'BEFORE_DELIVERY',
    stageLabel: 'Stage 3 · Testing Before Delivery',
    testCategory: 'Final Release: Color Fastness to Light & Rubbing',
    standard: 'ISO 105-B02 (Xenon Arc) & ISO 105-X12',
    result: 'PASS',
    testedValue: 'Light Fastness: Grade 4, Dry Rub: 4-5, Wet Rub: 3.5-4',
    requiredStd: 'Min Light 4, Min Wet Rub 3.0',
    testedAt: '2026-08-16',
    technician: 'S. K. Paul (Sr. Chemist)',
    approver: 'Quality Assurance Head',
    remarks: 'Signed and released to Finished Fabric Store Challan CH-9041.',
    certificateRef: 'FINAL-LGT-NL-48089',
    sampleBatchRef: 'DEL-CH-9041'
  }
];

export default function LabTestingPage() {
  const [stageFilter, setStageFilter] = useState<LabStage>('ALL');
  const [resultFilter, setResultFilter] = useState<TestResult>('ALL');
  const [buyerFilter, setBuyerFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedTest, setSelectedTest] = useState<LabTestRecord | null>(null);
  const [tests, setTests] = useState<LabTestRecord[]>(initialLabTests);
  const [msg, setMsg] = useState('');

  // New test modal / entry state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTest, setNewTest] = useState<{
    jobNo: string;
    buyer: string;
    styleNo: string;
    color: string;
    fabricType: string;
    stage: 'BEFORE_DYEING' | 'BEFORE_BULK' | 'BEFORE_DELIVERY';
    testCategory: string;
    standard: string;
    result: 'PASS' | 'FAIL' | 'IN_TESTING' | 'CONDITIONAL';
    testedValue: string;
    requiredStd: string;
    technician: string;
    remarks: string;
  }>({
    jobNo: '48085',
    buyer: 'BS-NMT',
    styleNo: '13251506',
    color: 'Nosegay (Lurex)',
    fabricType: 'Single Jersey 180 GSM',
    stage: 'BEFORE_DELIVERY',
    testCategory: 'Dimensional Stability / Shrinkage',
    standard: 'ISO 6330 (3x Wash @ 40°C)',
    result: 'PASS',
    testedValue: 'Length: -2.3%, Width: -1.5%',
    requiredStd: 'Max ±4.0%',
    technician: 'S. K. Paul',
    remarks: 'Routine inspection passed'
  });

  const buyers = useMemo(() => {
    return Array.from(new Set(tests.map(t => t.buyer))).sort();
  }, [tests]);

  const filteredTests = useMemo(() => {
    return tests.filter(t => {
      if (stageFilter !== 'ALL' && t.stage !== stageFilter) return false;
      if (resultFilter !== 'ALL' && t.result !== resultFilter) return false;
      if (buyerFilter !== 'ALL' && t.buyer !== buyerFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return `${t.jobNo} ${t.buyer} ${t.styleNo} ${t.color} ${t.testCategory} ${t.testNo} ${t.certificateRef}`.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tests, stageFilter, resultFilter, buyerFilter, search]);

  const stageCounts = useMemo(() => {
    return {
      all: tests.length,
      beforeDyeing: tests.filter(t => t.stage === 'BEFORE_DYEING').length,
      beforeBulk: tests.filter(t => t.stage === 'BEFORE_BULK').length,
      beforeDelivery: tests.filter(t => t.stage === 'BEFORE_DELIVERY').length,
      passed: tests.filter(t => t.result === 'PASS').length,
      conditional: tests.filter(t => t.result === 'CONDITIONAL').length,
      failed: tests.filter(t => t.result === 'FAIL').length
    };
  }, [tests]);

  function handleCreateTest(e: React.FormEvent) {
    e.preventDefault();
    const stageLabel = newTest.stage === 'BEFORE_DYEING' 
      ? 'Stage 1 · Before Dyeing'
      : newTest.stage === 'BEFORE_BULK'
      ? 'Stage 2 · Before Bulk Production'
      : 'Stage 3 · Testing Before Delivery';

    const record: LabTestRecord = {
      id: `LAB-CUSTOM-${Date.now()}`,
      testNo: `LT-2026-${String(tests.length + 101).padStart(3, '0')}`,
      jobNo: newTest.jobNo,
      buyer: newTest.buyer,
      styleNo: newTest.styleNo,
      color: newTest.color,
      fabricType: newTest.fabricType,
      stage: newTest.stage,
      stageLabel,
      testCategory: newTest.testCategory,
      standard: newTest.standard,
      result: newTest.result,
      testedValue: newTest.testedValue,
      requiredStd: newTest.requiredStd,
      testedAt: new Date().toISOString().slice(0, 10),
      technician: newTest.technician,
      approver: 'Dr. Nazrul Islam (Lab Head)',
      remarks: newTest.remarks,
      certificateRef: `CERT-${newTest.jobNo}-${Date.now().toString().slice(-4)}`
    };

    setTests(prev => [record, ...prev]);
    setShowAddModal(false);
    setMsg(`✓ New Test Report ${record.testNo} recorded and issued for Job ${record.jobNo}!`);
    setTimeout(() => setMsg(''), 5000);
  }

  return (
    <Shell title="Fabric Testing Lab & Quality Certification" eyebrow="Yarn, Greige, Dyeing Lab Dip, Pre-Bulk & Final Delivery Testing">
      {/* Top Banner */}
      <section className="module-hero">
        <div>
          <span className="status-pill good">Accredited Physical & Chemical Textile Lab</span>
          <h2>Fabric Quality & Testing Laboratory Control Tower</h2>
          <p>
            Complete 3-stage validation workflow: <strong>Stage 1: Before Dyeing</strong> (Yarn testing, Greige inspection, Lab dip spectrophotometer match) → 
            <strong> Stage 2: Before Bulk Production</strong> (Pilot 200kg wash, rub, shrinkage trial) → 
            <strong> Stage 3: Testing Before Delivery</strong> (Dimensional stability, spirality, Martindale pilling, OEKO-TEX certificate before cutting handover).
          </p>
        </div>
        <div className="module-actions">
          <Link href="/?view=FABRIC_MEETING" className="btn btn-secondary">
            🧵 Fabric Meeting Review
          </Link>
          <Link href="/modules/greige-store" className="btn btn-secondary">
            🏬 Greige Store
          </Link>
          <Link href="/modules/dyeing" className="btn btn-secondary">
            ⚙️ Dyeing Winches
          </Link>
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            Print Certificate
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Log New Test Report
          </button>
        </div>
      </section>

      {msg && <div className="notice success-notice" style={{ margin: '10px 0' }}>{msg}</div>}

      {/* 3-STAGE PIPELINE KPI CARDS */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', margin: '14px 0' }}>
        {/* Stage 1: Before Dyeing */}
        <div
          onClick={() => setStageFilter(stageFilter === 'BEFORE_DYEING' ? 'ALL' : 'BEFORE_DYEING')}
          style={{
            background: '#fff', border: stageFilter === 'BEFORE_DYEING' ? '2px solid #2563eb' : '1px solid #e2e8f0',
            borderRadius: '12px', padding: '14px', cursor: 'pointer', transition: 'all .2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Stage 1</span>
            <span style={{ fontSize: '9px', background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>Pre-Dyeing</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>Before Dyeing</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>{stageCounts.beforeDyeing} Tests</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Yarn count/strength, Greige bio-scour, Spectro Lab Dip (ΔE &lt; 0.65)
          </div>
        </div>

        {/* Stage 2: Before Bulk Production */}
        <div
          onClick={() => setStageFilter(stageFilter === 'BEFORE_BULK' ? 'ALL' : 'BEFORE_BULK')}
          style={{
            background: '#fff', border: stageFilter === 'BEFORE_BULK' ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
            borderRadius: '12px', padding: '14px', cursor: 'pointer', transition: 'all .2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Stage 2</span>
            <span style={{ fontSize: '9px', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>Pilot Approval</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>Before Bulk Production</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0ea5e9', marginTop: '4px' }}>{stageCounts.beforeBulk} Tests</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Pilot batch 200kg wash, rubbing, perspiration &amp; initial shrink check
          </div>
        </div>

        {/* Stage 3: Testing Before Delivery */}
        <div
          onClick={() => setStageFilter(stageFilter === 'BEFORE_DELIVERY' ? 'ALL' : 'BEFORE_DELIVERY')}
          style={{
            background: '#fff', border: stageFilter === 'BEFORE_DELIVERY' ? '2px solid #16a34a' : '1px solid #e2e8f0',
            borderRadius: '12px', padding: '14px', cursor: 'pointer', transition: 'all .2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Stage 3</span>
            <span style={{ fontSize: '9px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>Final Clearance</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>Testing Before Delivery</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>{stageCounts.beforeDelivery} Tests</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Martindale pilling, spirality, burst strength, OEKO-TEX &amp; COA release
          </div>
        </div>

        {/* Overall Lab Quality Pass Rate */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Overall Quality</span>
            <span style={{ fontSize: '9px', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>Pass Ratio</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>First-Pass Ratio</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            {Math.round((stageCounts.passed / Math.max(1, stageCounts.all)) * 100)}%
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            {stageCounts.passed} Passed · {stageCounts.conditional} Conditional · {stageCounts.failed} Failed
          </div>
        </div>
      </section>

      {/* FILTER & STAGE SELECTOR TOOLBAR */}
      <section className="panel" style={{ padding: '12px 16px', margin: '0 0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Stage Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={stageFilter === 'ALL' ? 'mini-tab active' : 'mini-tab'}
              onClick={() => setStageFilter('ALL')}
            >
              All Stages ({tests.length})
            </button>
            <button
              type="button"
              className={stageFilter === 'BEFORE_DYEING' ? 'mini-tab active' : 'mini-tab'}
              onClick={() => setStageFilter('BEFORE_DYEING')}
            >
              1. Before Dyeing ({stageCounts.beforeDyeing})
            </button>
            <button
              type="button"
              className={stageFilter === 'BEFORE_BULK' ? 'mini-tab active' : 'mini-tab'}
              onClick={() => setStageFilter('BEFORE_BULK')}
            >
              2. Before Bulk Production ({stageCounts.beforeBulk})
            </button>
            <button
              type="button"
              className={stageFilter === 'BEFORE_DELIVERY' ? 'mini-tab active' : 'mini-tab'}
              onClick={() => setStageFilter('BEFORE_DELIVERY')}
            >
              3. Testing Before Delivery ({stageCounts.beforeDelivery})
            </button>
          </div>

          {/* Quick Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={resultFilter}
              onChange={e => setResultFilter(e.target.value as any)}
              style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="ALL">All Results</option>
              <option value="PASS">Pass Only</option>
              <option value="CONDITIONAL">Conditional Only</option>
              <option value="FAIL">Failed Only</option>
            </select>

            <select
              value={buyerFilter}
              onChange={e => setBuyerFilter(e.target.value)}
              style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="ALL">All Buyers</option>
              {buyers.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search Job, Buyer, Test Category, Cert Ref…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '220px' }}
            />
          </div>
        </div>
      </section>

      {/* DETAILED TESTS TABLE */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">Quality Assurance &amp; Physical / Chemical Test Logs</div>
            <div className="panel-sub">Click any record to inspect test certificate, spectrophotometer curves and release details</div>
          </div>
          <span className="status-pill neutral">{filteredTests.length} tests matching</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table compact-table" style={{ width: '100%', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Test Ref</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Job / Buyer</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Color / Fabric</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Testing Stage</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Test Category &amp; Standard</th>
                <th style={{ textAlign: 'center', padding: '8px' }}>Result</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Actual Measured Value</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Required Specification</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Date / Chemist</th>
                <th style={{ textAlign: 'center', padding: '8px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTests.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedTest(t)}
                  style={{
                    cursor: 'pointer',
                    background: selectedTest?.id === t.id ? '#eff6ff' : undefined,
                    borderBottom: '1px solid #f1f5f9'
                  }}
                >
                  <td style={{ padding: '8px', fontWeight: 700, color: '#2563eb' }}>{t.testNo}</td>
                  <td style={{ padding: '8px' }}>
                    <strong>{t.jobNo}</strong>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{t.buyer} · {t.styleNo}</div>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{t.color}</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{t.fabricType}</div>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        background: t.stage === 'BEFORE_DYEING' ? '#dbeafe' : t.stage === 'BEFORE_BULK' ? '#e0f2fe' : '#dcfce7',
                        color: t.stage === 'BEFORE_DYEING' ? '#1e40af' : t.stage === 'BEFORE_BULK' ? '#0369a1' : '#166534'
                      }}
                    >
                      {t.stage === 'BEFORE_DYEING' ? '1. Pre-Dyeing' : t.stage === 'BEFORE_BULK' ? '2. Pilot Approval' : '3. Final Release'}
                    </span>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <strong style={{ color: '#0f172a' }}>{t.testCategory}</strong>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{t.standard}</div>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: 800,
                        background: t.result === 'PASS' ? '#dcfce7' : t.result === 'CONDITIONAL' ? '#fef3c7' : '#fee2e2',
                        color: t.result === 'PASS' ? '#166534' : t.result === 'CONDITIONAL' ? '#92400e' : '#991b1b'
                      }}
                    >
                      {t.result === 'PASS' ? '✓ PASS' : t.result === 'CONDITIONAL' ? '⚠ CONDITIONAL' : '✕ FAIL'}
                    </span>
                  </td>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#1e293b' }}>{t.testedValue}</td>
                  <td style={{ padding: '8px', color: '#64748b' }}>{t.requiredStd}</td>
                  <td style={{ padding: '8px', fontSize: '10px', color: '#64748b' }}>
                    {t.testedAt}
                    <div>{t.technician}</div>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-compact"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTest(t);
                      }}
                      style={{ fontSize: '10px', padding: '3px 8px' }}
                    >
                      View Cert
                    </button>
                  </td>
                </tr>
              ))}
              {!filteredTests.length && (
                <tr>
                  <td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    No lab test reports matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* TEST CERTIFICATE PREVIEW MODAL */}
      {selectedTest && (
        <div className="modal-backdrop-360" onClick={() => setSelectedTest(null)}>
          <div className="modal-dialog-360" onClick={e => e.stopPropagation()} style={{ maxWidth: '780px', background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ background: '#0f172a', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 800 }}>
                  Northern Fashion Ltd. · Textile Testing &amp; Calibration Laboratory
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '18px' }}>
                  Laboratory Quality Release Certificate
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTest(null)}
                style={{ background: 'transparent', border: 0, color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header facts */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Certificate Ref</span>
                  <strong style={{ display: 'block', fontSize: '12px', color: '#2563eb' }}>{selectedTest.certificateRef}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Job / Order No</span>
                  <strong style={{ display: 'block', fontSize: '12px', color: '#0f172a' }}>{selectedTest.jobNo}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Buyer &amp; Style</span>
                  <strong style={{ display: 'block', fontSize: '12px', color: '#0f172a' }}>{selectedTest.buyer} · {selectedTest.styleNo}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Test Date</span>
                  <strong style={{ display: 'block', fontSize: '12px', color: '#0f172a' }}>{selectedTest.testedAt}</strong>
                </div>
              </div>

              {/* Stage identification */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: '#166534', fontWeight: 800, textTransform: 'uppercase' }}>Quality Stage Verification</span>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#14532d' }}>{selectedTest.stageLabel}</div>
                </div>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 800,
                    background: selectedTest.result === 'PASS' ? '#22c55e' : '#f59e0b',
                    color: '#fff'
                  }}
                >
                  {selectedTest.result === 'PASS' ? 'CERTIFIED PASS' : selectedTest.result}
                </span>
              </div>

              {/* Technical breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Test Method &amp; Standard</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{selectedTest.testCategory}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Standard: <strong>{selectedTest.standard}</strong></div>

                  {selectedTest.deltaE !== undefined && (
                    <div style={{ marginTop: '10px', padding: '8px', background: '#eff6ff', borderRadius: '6px', fontSize: '11px' }}>
                      <strong style={{ color: '#1e40af' }}>Spectrophotometer Color Difference:</strong>
                      <div>ΔE: <b>{selectedTest.deltaE}</b> (Tolerance &lt; 0.65)</div>
                      <div>Illuminants: {selectedTest.lightSource}</div>
                    </div>
                  )}
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Observed Reading vs Criterion</span>
                  <div style={{ fontSize: '12px', marginTop: '6px' }}>
                    <span style={{ color: '#64748b' }}>Actual Result:</span>
                    <strong style={{ display: 'block', color: '#166534', fontSize: '13px' }}>{selectedTest.testedValue}</strong>
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '6px' }}>
                    <span style={{ color: '#64748b' }}>Buyer Specification:</span>
                    <span style={{ display: 'block', color: '#475569', fontWeight: 600 }}>{selectedTest.requiredStd}</span>
                  </div>
                </div>
              </div>

              {/* Lab remarks & sign-off */}
              <div style={{ border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
                <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Laboratory Findings &amp; Engineering Recommendation</span>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#334155', lineHeight: 1.45 }}>{selectedTest.remarks}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b' }}>
                <div>
                  Tested by: <strong>{selectedTest.technician}</strong> (Textile QA Chemist)
                </div>
                <div>
                  Authorized Release: <strong>{selectedTest.approver}</strong>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => window.print()}
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                >
                  Print PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOG NEW TEST MODAL */}
      {showAddModal && (
        <div className="modal-backdrop-360" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog-360" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', background: '#fff', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Log New Quality &amp; Lab Test Report</h3>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ border: 0, background: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateTest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 700 }}>
                  Quality Stage:
                  <select
                    value={newTest.stage}
                    onChange={e => setNewTest({ ...newTest, stage: e.target.value as any })}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="BEFORE_DYEING">1. Before Dyeing (Yarn / Greige / Lab Dip)</option>
                    <option value="BEFORE_BULK">2. Before Bulk Production (Pilot 200kg Wash/Shrink)</option>
                    <option value="BEFORE_DELIVERY">3. Testing Before Delivery (Martindale / Shrinkage / COA)</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 700 }}>
                  Job No:
                  <input
                    type="text"
                    value={newTest.jobNo}
                    onChange={e => setNewTest({ ...newTest, jobNo: e.target.value })}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    required
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 700 }}>
                  Buyer:
                  <input
                    type="text"
                    value={newTest.buyer}
                    onChange={e => setNewTest({ ...newTest, buyer: e.target.value })}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    required
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 700 }}>
                  Color &amp; Fabric:
                  <input
                    type="text"
                    value={newTest.color}
                    onChange={e => setNewTest({ ...newTest, color: e.target.value })}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    required
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 700 }}>
                  Test Category:
                  <input
                    type="text"
                    value={newTest.testCategory}
                    onChange={e => setNewTest({ ...newTest, testCategory: e.target.value })}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    placeholder="e.g. Dimensional Stability / Pilling"
                    required
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 700 }}>
                  Standard / Method:
                  <input
                    type="text"
                    value={newTest.standard}
                    onChange={e => setNewTest({ ...newTest, standard: e.target.value })}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    placeholder="e.g. ISO 6330 / ISO 105-C06"
                    required
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '10px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 700 }}>
                  Measured Reading:
                  <input
                    type="text"
                    value={newTest.testedValue}
                    onChange={e => setNewTest({ ...newTest, testedValue: e.target.value })}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    required
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 700 }}>
                  Required Criterion:
                  <input
                    type="text"
                    value={newTest.requiredStd}
                    onChange={e => setNewTest({ ...newTest, requiredStd: e.target.value })}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    required
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 700 }}>
                  Result:
                  <select
                    value={newTest.result}
                    onChange={e => setNewTest({ ...newTest, result: e.target.value as any })}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="PASS">PASS</option>
                    <option value="CONDITIONAL">CONDITIONAL</option>
                    <option value="FAIL">FAIL</option>
                  </select>
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 700 }}>
                Technician Remarks:
                <textarea
                  value={newTest.remarks}
                  onChange={e => setNewTest({ ...newTest, remarks: e.target.value })}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '60px' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save &amp; Issue Lab Release Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
