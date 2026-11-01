'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';
import factoryDataRaw from '../../../data/dyeing-factory-data.json';

type TestStage = 'ALL' | 'RUNNING_DYEING' | 'PRE_DELIVERY_CLEARANCE';
type TestCategory = 'ALL' | 'PHYSICAL' | 'CHEMICAL_FASTNESS';

interface TestingLabRecord {
  id: string;
  reportNo: string;
  jobNo: string;
  batchNo: string;
  buyer: string;
  styleNo: string;
  color: string;
  fabricType: string;
  testStage: 'RUNNING_DYEING' | 'PRE_DELIVERY_CLEARANCE';
  testCategory: 'PHYSICAL' | 'CHEMICAL_FASTNESS';
  testName: string;
  standard: string;
  requiredSpec: string;
  actualObserved: string;
  result: 'PASS' | 'FAIL' | 'IN_TESTING';
  testedDate: string;
  technician: string;
  approver: string;
  deliveryCleared: boolean;
  clearanceNote: string;
}

const INITIAL_TEST_RECORDS: TestingLabRecord[] = [
  // --- RUNNING DYEING IN-PROCESS TESTS ---
  {
    id: 'TL-RD-01',
    reportNo: 'TR-2026-101',
    jobNo: '48085',
    batchNo: 'B-48085-01',
    buyer: 'BS-NMT',
    styleNo: '13251506',
    color: 'Nosegay (Lurex)',
    fabricType: 'Single Jersey + Lurex 180 GSM',
    testStage: 'RUNNING_DYEING',
    testCategory: 'PHYSICAL',
    testName: 'Post-Dyeing Residual Shrinkage & Spirality (Tumble Dry)',
    standard: 'ISO 6330 / ISO 16322-2',
    requiredSpec: 'Length ±5.0%, Width ±5.0%, Spirality < 4.0%',
    actualObserved: 'Length -3.2%, Width -2.8%, Spirality 2.1%',
    result: 'PASS',
    testedDate: '2026-08-06',
    technician: 'S. K. Paul (Sr. Chemist)',
    approver: 'Dr. Nazrul Islam (Lab Head)',
    deliveryCleared: true,
    clearanceNote: 'Stenter overfeed recipe approved. Spirality well within European tolerances.'
  },
  {
    id: 'TL-RD-02',
    reportNo: 'TR-2026-102',
    jobNo: '48085',
    batchNo: 'B-48085-01',
    buyer: 'BS-NMT',
    styleNo: '13251506',
    color: 'Nosegay (Lurex)',
    fabricType: 'Single Jersey + Lurex 180 GSM',
    testStage: 'RUNNING_DYEING',
    testCategory: 'CHEMICAL_FASTNESS',
    testName: 'Color Fastness to Washing (60°C ISO 105-C06 C2S)',
    standard: 'ISO 105-C06 C2S',
    requiredSpec: 'Change: Min 4, Staining: Min 4 (Cotton/Nylon)',
    actualObserved: 'Change 4.5, Staining 4.5 (Multifibre OK)',
    result: 'PASS',
    testedDate: '2026-08-06',
    technician: 'F. Rahman (Dyeing Chemist)',
    approver: 'Dr. Nazrul Islam (Lab Head)',
    deliveryCleared: true,
    clearanceNote: 'Excellent wash resistance; reactive soaping step verified.'
  },
  {
    id: 'TL-RD-03',
    reportNo: 'TR-2026-103',
    jobNo: '48002',
    batchNo: 'B-48002-02',
    buyer: 'ONLY',
    styleNo: '13251512',
    color: 'Estate Blue',
    fabricType: '100% Combed Cotton 160 GSM',
    testStage: 'RUNNING_DYEING',
    testCategory: 'CHEMICAL_FASTNESS',
    testName: 'Rubbing / Crocking Fastness (Wet & Dry)',
    standard: 'ISO 105-X12 / AATCC 8',
    requiredSpec: 'Dry: Min 4.0, Wet: Min 3.0',
    actualObserved: 'Dry 4.0, Wet 2.5 (Below Spec)',
    result: 'FAIL',
    testedDate: '2026-08-15',
    technician: 'Kamrul Hasan',
    approver: 'M. Ali (Dyeing GM)',
    deliveryCleared: false,
    clearanceNote: 'FAIL: Wet rubbing failed specification. Fabric blocked from delivery. Washing with cationic fixing agent required.'
  },
  {
    id: 'TL-RD-04',
    reportNo: 'TR-2026-104',
    jobNo: '48002',
    batchNo: 'B-48002-02R',
    buyer: 'ONLY',
    styleNo: '13251512',
    color: 'Estate Blue (Re-washed)',
    fabricType: '100% Combed Cotton 160 GSM',
    testStage: 'RUNNING_DYEING',
    testCategory: 'CHEMICAL_FASTNESS',
    testName: 'Rubbing / Crocking Fastness (Retest after Fixing)',
    standard: 'ISO 105-X12 / AATCC 8',
    requiredSpec: 'Dry: Min 4.0, Wet: Min 3.0',
    actualObserved: 'Dry 4.5, Wet 3.5',
    result: 'PASS',
    testedDate: '2026-08-17',
    technician: 'Kamrul Hasan',
    approver: 'Dr. Nazrul Islam (Lab Head)',
    deliveryCleared: true,
    clearanceNote: 'Retest PASSED. Fixing agent treatment successful. Released for final stenter finishing.'
  },

  // --- PRE-DELIVERY CLEARANCE GATE TESTS ---
  {
    id: 'TL-PD-05',
    reportNo: 'TR-2026-105',
    jobNo: '46755',
    batchNo: 'B-46755-03',
    buyer: 'OVS',
    styleNo: '13251480',
    color: 'Sage Green',
    fabricType: 'CVC 60/40 190 GSM',
    testStage: 'PRE_DELIVERY_CLEARANCE',
    testCategory: 'PHYSICAL',
    testName: 'Final Delivery Inspection: GSM, Width & Bursting Strength',
    standard: 'ISO 3801 / ASTM D3786 (Diaphragm)',
    requiredSpec: 'GSM: 190 ±5%, Cuttable Width: 68" Min, Bursting: > 280 kPa',
    actualObserved: 'GSM 192 (Cuttable 69"), Bursting 342 kPa',
    result: 'PASS',
    testedDate: '2026-08-11',
    technician: 'F. Rahman',
    approver: 'M. Ali (Dyeing GM)',
    deliveryCleared: true,
    clearanceNote: 'DELIVERY CLEARED: All physical parameters verified. Delivery gate unlocked for Finished Fabric Store.'
  },
  {
    id: 'TL-PD-06',
    reportNo: 'TR-2026-106',
    jobNo: '46758',
    batchNo: 'B-46758-01',
    buyer: 'UTG',
    styleNo: '13251495',
    color: 'Charcoal Melange',
    fabricType: '95% Cotton / 5% Lycra 200 GSM',
    testStage: 'PRE_DELIVERY_CLEARANCE',
    testCategory: 'PHYSICAL',
    testName: 'Martindale Pilling Resistance (2,000 Cycles)',
    standard: 'ISO 12945-2 (Modified Martindale)',
    requiredSpec: 'Min Grade 4.0 at 2,000 revs',
    actualObserved: 'Grade 4.0 - 4.5 (No surface fuzzing)',
    result: 'PASS',
    testedDate: '2026-08-13',
    technician: 'S. K. Paul',
    approver: 'Dr. Nazrul Islam (Lab Head)',
    deliveryCleared: true,
    clearanceNote: 'DELIVERY CLEARED: Anti-pilling biopolish finish verified. Ready for immediate cutting issue.'
  },
  {
    id: 'TL-PD-07',
    reportNo: 'TR-2026-107',
    jobNo: '48061',
    batchNo: 'B-48061-01',
    buyer: 'Name It',
    styleNo: '13251509',
    color: 'Buttercup Yellow',
    fabricType: '100% Organic Cotton GOTS 175 GSM',
    testStage: 'PRE_DELIVERY_CLEARANCE',
    testCategory: 'CHEMICAL_FASTNESS',
    testName: 'Aqueous Extract pH & Saliva Fastness (Babywear Standard)',
    standard: 'ISO 3071 (pH) / DIN 53160-1 (Saliva)',
    requiredSpec: 'pH: 4.5 - 7.5, Saliva Fastness: Grade 5.0 (No Bleed)',
    actualObserved: 'Surface pH 6.4, Saliva Fastness Grade 5.0',
    result: 'PASS',
    testedDate: '2026-08-22',
    technician: 'Kamrul Hasan',
    approver: 'Dr. Nazrul Islam (Lab Head)',
    deliveryCleared: true,
    clearanceNote: 'DELIVERY CLEARED: Oeko-Tex Standard 100 Class I & GOTS organic compliance passed.'
  },
  {
    id: 'TL-PD-08',
    reportNo: 'TR-2026-108',
    jobNo: '48110',
    batchNo: 'B-48110-02',
    buyer: 'Only&Sons',
    styleNo: '13251532',
    color: 'Crimson Red (Yarn Dye)',
    fabricType: 'Package Yarn Dyeing 32/2',
    testStage: 'PRE_DELIVERY_CLEARANCE',
    testCategory: 'CHEMICAL_FASTNESS',
    testName: 'Color Fastness to Perspiration (Acid & Alkaline)',
    standard: 'ISO 105-E04 (Acid / Alkaline)',
    requiredSpec: 'Change: Min 4, Staining: Min 4',
    actualObserved: 'Testing in progress (incubator 37°C 4h)',
    result: 'IN_TESTING',
    testedDate: '2026-08-26',
    technician: 'F. Rahman',
    approver: 'Pending Lab Head',
    deliveryCleared: false,
    clearanceNote: 'DELIVERY LOCKED: Test specimen currently in incubator. Rolls held in quarantine until certificate signed.'
  }
];

export default function TestingLabPage() {
  const [selectedStage, setSelectedStage] = useState<TestStage>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<TestCategory>('ALL');
  const [selectedResult, setSelectedResult] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<TestingLabRecord[]>(INITIAL_TEST_RECORDS);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Test Modal State
  const [newTest, setNewTest] = useState({
    jobNo: '48093',
    batchNo: 'B-48093-01',
    buyer: 'ONLY',
    styleNo: '22041',
    color: 'Jet Black',
    fabricType: '100% Cotton 180 GSM',
    testStage: 'PRE_DELIVERY_CLEARANCE' as const,
    testCategory: 'PHYSICAL' as const,
    testName: 'GSM, Width & Dimensional Shrinkage Test',
    standard: 'ISO 6330 / ISO 3801',
    requiredSpec: 'GSM 180 ±5%, Shrinkage < 4%',
    actualObserved: 'GSM 182, Shrinkage -2.4%',
    result: 'PASS' as const,
    technician: 'S. K. Paul (Sr. Chemist)',
    approver: 'Dr. Nazrul Islam (Lab Head)',
    deliveryCleared: true,
    clearanceNote: 'Test PASSED. Cleared for delivery to Finished Fabric Store.'
  });

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchStage = selectedStage === 'ALL' || r.testStage === selectedStage;
      const matchCat = selectedCategory === 'ALL' || r.testCategory === selectedCategory;
      const matchRes = selectedResult === 'ALL' || r.result === selectedResult;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        r.reportNo.toLowerCase().includes(q) ||
        r.jobNo.includes(q) ||
        r.batchNo.toLowerCase().includes(q) ||
        r.buyer.toLowerCase().includes(q) ||
        r.testName.toLowerCase().includes(q);
      return matchStage && matchCat && matchRes && matchSearch;
    });
  }, [records, selectedStage, selectedCategory, selectedResult, searchQuery]);

  // Key KPI calculations
  const totalTests = records.length;
  const passedTests = records.filter(r => r.result === 'PASS').length;
  const failedTests = records.filter(r => r.result === 'FAIL').length;
  const inTesting = records.filter(r => r.result === 'IN_TESTING').length;
  const passRate = Math.round((passedTests / (totalTests - inTesting || 1)) * 100);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created: TestingLabRecord = {
      id: `TL-${Date.now()}`,
      reportNo: `TR-2026-${Math.floor(200 + Math.random() * 800)}`,
      jobNo: newTest.jobNo,
      batchNo: newTest.batchNo,
      buyer: newTest.buyer,
      styleNo: newTest.styleNo,
      color: newTest.color,
      fabricType: newTest.fabricType,
      testStage: newTest.testStage,
      testCategory: newTest.testCategory,
      testName: newTest.testName,
      standard: newTest.standard,
      requiredSpec: newTest.requiredSpec,
      actualObserved: newTest.actualObserved,
      result: newTest.result,
      testedDate: new Date().toISOString().split('T')[0],
      technician: newTest.technician,
      approver: newTest.approver,
      deliveryCleared: newTest.result === 'PASS',
      clearanceNote: newTest.clearanceNote
    };
    setRecords([created, ...records]);
    setShowAddModal(false);
  };

  return (
    <Shell
      title="Testing Lab (টেস্টিং ল্যাব)"
      eyebrow="Physical & Chemical Fastness Testing · Mandatory Clearance Gate Prior to Fabric Delivery"
    >
      {/* =========================================================================
          HERO BANNER
         ========================================================================= */}
      <section className="module-hero" style={{ marginBottom: 16 }}>
        <div>
          <span className="status-pill" style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}>
            Textile Physical &amp; Chemical Testing Center
          </span>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
            Testing Laboratory &amp; Delivery Gate Clearance
          </h2>
          <p style={{ fontSize: 13.5, color: '#475569', maxWidth: 880 }}>
            Dedicated testing facility executing mandatory physical (GSM, Width, Shrinkage, Spirality, Bursting, Pilling) and chemical fastness tests (Washing, Rubbing, Perspiration, Saliva, pH) on running dyeing and finished fabric. **Zero tolerance policy:** No fabric roll is issued or delivered without a certified PASS test result.
          </p>
        </div>
        <div className="module-actions" style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{ fontSize: 13.5, fontWeight: 700, padding: '9px 16px', background: '#0F274E', color: '#FFFFFF', borderRadius: 8 }}
          >
            + Log Laboratory Test Report
          </button>
        </div>
      </section>

      {/* =========================================================================
          KEY KPI TILES
         ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #2563EB', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 750, color: '#64748B', textTransform: 'uppercase' }}>Total Fabric Tests</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>{totalTests} <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>batches</span></div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Physical &amp; Chemical audits</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #16A34A', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 750, color: '#166534', textTransform: 'uppercase' }}>Pass &amp; Delivery Cleared</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#15803D', marginTop: 4 }}>{passedTests} <span style={{ fontSize: 13, fontWeight: 600 }}>({passRate}%)</span></div>
          <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>Clearance certificate issued</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #DC2626', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 750, color: '#991B1B', textTransform: 'uppercase' }}>Failed / Delivery Blocked</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#DC2626', marginTop: 4 }}>{failedTests} <span style={{ fontSize: 13, fontWeight: 600 }}>batches</span></div>
          <div style={{ fontSize: 12, color: '#991B1B', marginTop: 2 }}>Reprocess / Re-wash mandatory</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #D97706', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 750, color: '#B45309', textTransform: 'uppercase' }}>In-Testing (Incubator/Oven)</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#B45309', marginTop: 4 }}>{inTesting} <span style={{ fontSize: 13, fontWeight: 600 }}>specimens</span></div>
          <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>Pending 4h/24h cycle completion</div>
        </div>
      </div>

      {/* =========================================================================
          CRITICAL DELIVERY CLEARANCE PROTOCOL BANNER
         ========================================================================= */}
      <div style={{
        background: 'linear-gradient(90deg, #14532D 0%, #166534 100%)',
        color: '#FFFFFF',
        borderRadius: 10,
        padding: '14px 20px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 24 }}>🛡️</span>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 800 }}>Mandatory Pre-Delivery Gate Security Protocol</div>
            <div style={{ fontSize: 12.5, color: '#DCFCE7', marginTop: 2 }}>
              Finished Fabric Store ERP system automatically locks any fabric batch with a missing or failed laboratory certificate. Rolls can only be issued to Cutting once the Lead Testing Chemist authorizes the electronic COA.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
            Physical Gate: 100% Inspected
          </span>
          <span style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
            Fastness Gate: ISO/AATCC Validated
          </span>
        </div>
      </div>

      {/* =========================================================================
          FILTER RIBBON
         ========================================================================= */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* Stage Filter Buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'All Test Registers' },
            { key: 'RUNNING_DYEING', label: 'Running Dyeing Tests' },
            { key: 'PRE_DELIVERY_CLEARANCE', label: 'Pre-Delivery Clearance Gate' }
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedStage(tab.key as any)}
              style={{
                fontSize: 13,
                fontWeight: 750,
                padding: '6px 14px',
                borderRadius: 6,
                border: selectedStage === tab.key ? '1px solid #0F274E' : '1px solid #CBD5E1',
                background: selectedStage === tab.key ? '#0F274E' : '#F8FAFC',
                color: selectedStage === tab.key ? '#FFFFFF' : '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category & Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            style={{ fontSize: 13, fontWeight: 650, padding: '6px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#1E293B', outline: 'none' }}
          >
            <option value="ALL">All Categories</option>
            <option value="PHYSICAL">Physical Tests (GSM, Width, Shrinkage, Pilling)</option>
            <option value="CHEMICAL_FASTNESS">Chemical Fastness (Wash, Rub, Perspiration, pH)</option>
          </select>

          <select
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value)}
            style={{ fontSize: 13, fontWeight: 650, padding: '6px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#1E293B', outline: 'none' }}
          >
            <option value="ALL">All Results</option>
            <option value="PASS">PASS (Delivery Approved)</option>
            <option value="FAIL">FAIL (Delivery Locked)</option>
            <option value="IN_TESTING">IN TESTING</option>
          </select>

          <input
            type="text"
            placeholder="Search report, job, batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: 13, padding: '6px 12px', borderRadius: 6, border: '1px solid #CBD5E1', width: 200, outline: 'none' }}
          />
        </div>
      </div>

      {/* =========================================================================
          TESTING MASTER REGISTER TABLE
         ========================================================================= */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 14.5, color: '#0F172A' }}>
            Laboratory Testing &amp; Delivery Authorization Register ({filteredRecords.length} records)
          </strong>
          <span style={{ fontSize: 12.5, color: '#64748B' }}>
            Direct gate control for Finished Fabric Store Issue
          </span>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '560px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#F1F5F9', zIndex: 10 }}>
              <tr style={{ borderBottom: '2px solid #CBD5E1', color: '#334155' }}>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Report # / Date</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Job / Batch No</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Buyer / Style</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Color &amp; Fabric</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Test Name &amp; Standard</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Spec vs Actual</th>
                <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'center' }}>Result</th>
                <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'center' }}>Delivery Gate</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Clearance Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, idx) => {
                const isPass = r.result === 'PASS';
                const isFail = r.result === 'FAIL';
                const isTesting = r.result === 'IN_TESTING';

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <strong style={{ color: '#0F274E' }}>{r.reportNo}</strong>
                      <span style={{ display: 'block', fontSize: 11.5, color: '#64748B' }}>{r.testedDate}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontWeight: 750, color: '#0F172A' }}>Job #{r.jobNo}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: '#2563EB', fontWeight: 700 }}>{r.batchNo}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <strong style={{ color: '#1E293B' }}>{r.buyer}</strong>
                      <span style={{ display: 'block', fontSize: 11.5, color: '#64748B' }}>Style: {r.styleNo}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 650, color: '#0F172A' }}>{r.color}</div>
                      <div style={{ fontSize: 11.5, color: '#64748B' }}>{r.fabricType}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{r.testName}</div>
                      <span style={{ fontSize: 11.5, color: '#475569', background: '#F1F5F9', padding: '1px 6px', borderRadius: 4 }}>
                        {r.standard}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12.5 }}>
                      <div style={{ color: '#64748B' }}>Req: {r.requiredSpec}</div>
                      <div style={{ fontWeight: 750, color: isPass ? '#15803D' : isFail ? '#DC2626' : '#0F172A' }}>
                        Act: {r.actualObserved}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 750,
                        background: isPass ? '#DCFCE7' : isFail ? '#FEE2E2' : '#FEF3C7',
                        color: isPass ? '#15803D' : isFail ? '#B91C1C' : '#B45309'
                      }}>
                        {r.result}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {r.deliveryCleared ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#DCFCE7', color: '#15803D', fontWeight: 800, padding: '3px 8px', borderRadius: 6, fontSize: 11.5 }}>
                          <span>✓</span> Cleared
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEE2E2', color: '#DC2626', fontWeight: 800, padding: '3px 8px', borderRadius: 6, fontSize: 11.5 }}>
                          <span>🔒</span> Locked
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#334155', maxWidth: 260 }}>
                      <div>{r.clearanceNote}</div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Approver: {r.approver}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL: LOG LABORATORY TEST REPORT
         ========================================================================= */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 12,
            maxWidth: 640,
            width: '100%',
            padding: 24,
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 12, marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>+ Log Laboratory Test Report</h3>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Job No *</label>
                  <input
                    type="text"
                    required
                    value={newTest.jobNo}
                    onChange={e => setNewTest({ ...newTest, jobNo: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13.5, border: '1px solid #CBD5E1', borderRadius: 6 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Dyeing Batch No *</label>
                  <input
                    type="text"
                    required
                    value={newTest.batchNo}
                    onChange={e => setNewTest({ ...newTest, batchNo: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13.5, border: '1px solid #CBD5E1', borderRadius: 6 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Buyer *</label>
                  <input
                    type="text"
                    required
                    value={newTest.buyer}
                    onChange={e => setNewTest({ ...newTest, buyer: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13.5, border: '1px solid #CBD5E1', borderRadius: 6 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Color Name *</label>
                  <input
                    type="text"
                    required
                    value={newTest.color}
                    onChange={e => setNewTest({ ...newTest, color: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13.5, border: '1px solid #CBD5E1', borderRadius: 6 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Test Stage</label>
                  <select
                    value={newTest.testStage}
                    onChange={e => setNewTest({ ...newTest, testStage: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13.5, border: '1px solid #CBD5E1', borderRadius: 6, background: '#F8FAFC' }}
                  >
                    <option value="RUNNING_DYEING">Running Dyeing (In-Process)</option>
                    <option value="PRE_DELIVERY_CLEARANCE">Pre-Delivery Clearance Gate</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Test Category</label>
                  <select
                    value={newTest.testCategory}
                    onChange={e => setNewTest({ ...newTest, testCategory: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13.5, border: '1px solid #CBD5E1', borderRadius: 6, background: '#F8FAFC' }}
                  >
                    <option value="PHYSICAL">Physical Test</option>
                    <option value="CHEMICAL_FASTNESS">Chemical Fastness Test</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Test Parameter &amp; Standard *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wash Fastness (ISO 105-C06) or Shrinkage & Spirality (ISO 6330)"
                  value={newTest.testName}
                  onChange={e => setNewTest({ ...newTest, testName: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13.5, border: '1px solid #CBD5E1', borderRadius: 6 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Required Spec</label>
                  <input
                    type="text"
                    value={newTest.requiredSpec}
                    onChange={e => setNewTest({ ...newTest, requiredSpec: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #CBD5E1', borderRadius: 6 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Actual Observed *</label>
                  <input
                    type="text"
                    required
                    value={newTest.actualObserved}
                    onChange={e => setNewTest({ ...newTest, actualObserved: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #CBD5E1', borderRadius: 6 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Test Result</label>
                  <select
                    value={newTest.result}
                    onChange={e => setNewTest({ ...newTest, result: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13.5, border: '1px solid #CBD5E1', borderRadius: 6, background: '#F8FAFC' }}
                  >
                    <option value="PASS">PASS (Authorize Delivery Clearance)</option>
                    <option value="FAIL">FAIL (Lock Delivery Gate)</option>
                    <option value="IN_TESTING">IN TESTING</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Approving Lab Head</label>
                  <input
                    type="text"
                    value={newTest.approver}
                    onChange={e => setNewTest({ ...newTest, approver: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #CBD5E1', borderRadius: 6 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Clearance Remarks / Gate Instructions</label>
                <input
                  type="text"
                  value={newTest.clearanceNote}
                  onChange={e => setNewTest({ ...newTest, clearanceNote: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #CBD5E1', borderRadius: 6 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC', fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#0F274E', color: '#FFFFFF', fontWeight: 750, fontSize: 13.5, cursor: 'pointer' }}
                >
                  Save Test &amp; Update Gate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
