'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Shell from '../../components/Shell';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { FX_SERIES, FX_BAR, FX_PIE, FxResponsiveContainer as ResponsiveContainer } from '../../components/fx';
import { DataGrid } from '../../components/ui/DataGrid';
import { RecordPanel } from '../../components/ui/RecordPanel';
import { fmtDate, fmtNum } from '../../lib/format';

type GarmentSection = 'overview' | 'cutting' | 'printing' | 'embroidery' | 'sewing' | 'finishing' | 'defects';
type QualityStatus = 'Passed' | 'Failed' | 'Hold' | 'Rework' | 'Pending';

interface GarmentQualityInspection {
  id: string;
  date: string;
  section: 'cutting' | 'printing' | 'embroidery' | 'sewing' | 'finishing';
  sectionLabel: string;
  buyer: string;
  jobNo: string;
  styleNo: string;
  lineOrTable: string;
  inspectedPcs: number;
  passedPcs: number;
  defectivePcs: number;
  dhuPercent: number;
  topDefect: string;
  severity: 'Minor' | 'Major' | 'Critical' | 'Clean';
  status: QualityStatus;
  inspector: string;
  criticalChecks: string;
  remarks: string;
}

const INITIAL_GARMENT_INSPECTIONS: GarmentQualityInspection[] = [
  {
    id: 'GQI-26-1041',
    date: '02-Nov-26',
    section: 'cutting',
    sectionLabel: 'Cutting Quality',
    buyer: 'ONLY',
    jobNo: '48093',
    styleNo: '22040024',
    lineOrTable: 'Cut Table 03',
    inspectedPcs: 1200,
    passedPcs: 1192,
    defectivePcs: 8,
    dhuPercent: 0.67,
    topDefect: 'Notch Depth Out of Spec (1.5mm gap)',
    severity: 'Minor',
    status: 'Passed',
    inspector: 'Kamrul Hasan',
    criticalChecks: 'Spreading tension normal; Lay height 48 plies; Pattern alignment 100% OK',
    remarks: 'Approved for bundle dispatch to Sewing Floor.'
  },
  {
    id: 'GQI-26-1042',
    date: '02-Nov-26',
    section: 'printing',
    sectionLabel: 'Printing Quality',
    buyer: 'Name It',
    jobNo: '48058',
    styleNo: '13264030',
    lineOrTable: 'Screen Table B',
    inspectedPcs: 650,
    passedPcs: 642,
    defectivePcs: 8,
    dhuPercent: 1.23,
    topDefect: 'Chest Placement Shift (+4mm off mark)',
    severity: 'Major',
    status: 'Rework',
    inspector: 'Sumon Miah',
    criticalChecks: 'Curing temperature 160°C OK; Wash fastness Grade 4; Color match standard',
    remarks: 'Re-align pallet placement jig; 8 pcs held for touch-up.'
  },
  {
    id: 'GQI-26-1043',
    date: '02-Nov-26',
    section: 'embroidery',
    sectionLabel: 'Embroidery Quality',
    buyer: 'OVS',
    jobNo: '47783',
    styleNo: '2717SW11-5156',
    lineOrTable: 'Tajima Head 02',
    inspectedPcs: 450,
    passedPcs: 446,
    defectivePcs: 4,
    dhuPercent: 0.89,
    topDefect: 'Thread Tail Loose & Backing Residue',
    severity: 'Minor',
    status: 'Passed',
    inspector: 'Anowar Hossain',
    criticalChecks: 'Stitch density 14,200 stitches verified; Needle size 11 DBxK5; No puckering',
    remarks: 'Thread trimmed and cleaned. Cleared for sewing input.'
  },
  {
    id: 'GQI-26-1044',
    date: '02-Nov-26',
    section: 'sewing',
    sectionLabel: 'Sewing Quality',
    buyer: 'ONLY',
    jobNo: '48093',
    styleNo: '22040024',
    lineOrTable: 'Line 08 (NFL 2)',
    inspectedPcs: 800,
    passedPcs: 778,
    defectivePcs: 22,
    dhuPercent: 2.75,
    topDefect: 'Broken Stitch at Bottom Hem',
    severity: 'Major',
    status: 'Passed',
    inspector: 'Abdul Malek (QA Incharge)',
    criticalChecks: 'SPI: 12-14 spi verified; Seam strength 240N; Needle detector 100% OK',
    remarks: 'Alteration completed on-line; DHU within acceptable 3.0% threshold.'
  },
  {
    id: 'GQI-26-1045',
    date: '01-Nov-26',
    section: 'sewing',
    sectionLabel: 'Sewing Quality',
    buyer: 'Only&Sons',
    jobNo: '46616',
    styleNo: '22039183',
    lineOrTable: 'Line 14 (NFL 1)',
    inspectedPcs: 750,
    passedPcs: 712,
    defectivePcs: 38,
    dhuPercent: 5.07,
    topDefect: 'Open Seam & Skipped Stitches (Collar Join)',
    severity: 'Critical',
    status: 'Rework',
    inspector: 'Abdul Malek (QA Incharge)',
    criticalChecks: 'Needle heating observed; Needle replaced with titanium coat; SPI re-checked',
    remarks: 'Warning issued to Line 14 operator; 38 pcs sent for alteration.'
  },
  {
    id: 'GQI-26-1046',
    date: '01-Nov-26',
    section: 'finishing',
    sectionLabel: 'Finishing Quality',
    buyer: 'OVS',
    jobNo: '47792',
    styleNo: '2715WFTT512-262',
    lineOrTable: 'Packing Line 02',
    inspectedPcs: 1500,
    passedPcs: 1485,
    defectivePcs: 15,
    dhuPercent: 1.0,
    topDefect: 'Uncut Loose Thread & Pressing Shine',
    severity: 'Minor',
    status: 'Passed',
    inspector: 'Shahadat Hossain',
    criticalChecks: 'Measurement audit: 100% within tolerance; Care label barcode verified; Poly clean',
    remarks: 'Final Random Inspection passed AQL 1.5. Cleared for cartoon packing.'
  },
  {
    id: 'GQI-26-1047',
    date: '01-Nov-26',
    section: 'finishing',
    sectionLabel: 'Finishing Quality',
    buyer: 'UTG',
    jobNo: '46758',
    styleNo: 'UTG-228',
    lineOrTable: 'Audit Room 01',
    inspectedPcs: 500,
    passedPcs: 472,
    defectivePcs: 28,
    dhuPercent: 5.6,
    topDefect: 'Carton Assortment Ratio Mismatch (Size L short by 6 pcs)',
    severity: 'Critical',
    status: 'Hold',
    inspector: 'Shahadat Hossain',
    criticalChecks: 'AQL 2.5 sample audit; 3 carton boxes unsealed for 100% physical recount',
    remarks: 'Carton packing stopped. Merchandiser & Store notified for re-assortment.'
  }
];

const GARMENT_DEFECT_LIBRARY = [
  { code: 'CUT-01', section: 'Cutting', name: 'Pattern / Marker Alignment Error', severity: 'Critical', action: 'Stop cutting table; re-check master marker overlay' },
  { code: 'CUT-02', section: 'Cutting', name: 'Notch Depth / Position Deviation', severity: 'Major', action: 'Inspect lay plies and replace notch blade' },
  { code: 'CUT-03', section: 'Cutting', name: 'Fabric Shading within Lay', severity: 'Major', action: 'Group bundles by roll lot; verify ply numbering' },
  { code: 'PRN-01', section: 'Printing', name: 'Placement / Alignment Shift', severity: 'Major', action: 'Calibrate table registration pins and frame stoppers' },
  { code: 'PRN-02', section: 'Printing', name: 'Color / Shade Deviation from Strike-off', severity: 'Critical', action: 'Re-match pigment formulation in ink mixing lab' },
  { code: 'PRN-03', section: 'Printing', name: 'Cracking / Curing Failure after Wash', severity: 'Critical', action: 'Increase oven curing dwell time to 3.5 min at 165°C' },
  { code: 'EMB-01', section: 'Embroidery', name: 'Thread Breakage / Missing Stitches', severity: 'Major', action: 'Inspect bobbin tension, thread guide and rotary hook' },
  { code: 'EMB-02', section: 'Embroidery', name: 'Fabric Puckering / Distortion', severity: 'Major', action: 'Upgrade backing interlining to 50 GSM tear-away' },
  { code: 'SEW-01', section: 'Sewing', name: 'Skipped Stitches / Broken Needle', severity: 'Critical', action: 'Perform 100% needle log check and reset looper timing' },
  { code: 'SEW-02', section: 'Sewing', name: 'Open Seam / Run-off Seam', severity: 'Critical', action: 'Immediate operator retraining and 100% inline audit' },
  { code: 'SEW-03', section: 'Sewing', name: 'Seam Puckering / High Tension', severity: 'Major', action: 'Adjust differential feed and thread tension springs' },
  { code: 'FIN-01', section: 'Finishing', name: 'Oil / Soil Spot or Iron Shine Mark', severity: 'Major', action: 'Spot cleaning with suction table; reduce iron temperature' },
  { code: 'FIN-02', section: 'Finishing', name: 'Incorrect Label / Missing Barcode', severity: 'Critical', action: 'Barcode scanner validation on 100% of polybags' },
  { code: 'FIN-03', section: 'Finishing', name: 'AQL 1.5 / 2.5 Critical Defect Exceeded', severity: 'Critical', action: '100% re-inspection of the entire production lot' }
];

export default function GarmentsQualityPage() {
  const [activeSection, setActiveSection] = useState<GarmentSection>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | QualityStatus>('ALL');
  const [inspections, setInspections] = useState<GarmentQualityInspection[]>(INITIAL_GARMENT_INSPECTIONS);
  const [showModal, setShowModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Form states
  const [formSection, setFormSection] = useState<'cutting' | 'printing' | 'embroidery' | 'sewing' | 'finishing'>('sewing');
  const [formBuyer, setFormBuyer] = useState('ONLY');
  const [formJob, setFormJob] = useState('48093');
  const [formStyle, setFormStyle] = useState('22040024');
  const [formLine, setFormLine] = useState('Line 08 (NFL 2)');
  const [formInspected, setFormInspected] = useState(500);
  const [formPassed, setFormPassed] = useState(485);
  const [formDefects, setFormDefects] = useState(15);
  const [formTopDefect, setFormTopDefect] = useState('Broken Stitch / Hemming');
  const [formSeverity, setFormSeverity] = useState<'Minor' | 'Major' | 'Critical'>('Major');
  const [formStatus, setFormStatus] = useState<QualityStatus>('Passed');
  const [formChecks, setFormChecks] = useState('SPI verified 13 spi; needle safety check 100%');

  // Filtered inspections
  const filteredRecords = useMemo(() => {
    return inspections.filter((rec) => {
      if (activeSection !== 'overview' && activeSection !== 'defects' && rec.section !== activeSection) {
        return false;
      }
      if (statusFilter !== 'ALL' && rec.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          rec.id.toLowerCase().includes(q) ||
          rec.buyer.toLowerCase().includes(q) ||
          rec.jobNo.toLowerCase().includes(q) ||
          rec.styleNo.toLowerCase().includes(q) ||
          rec.lineOrTable.toLowerCase().includes(q) ||
          rec.topDefect.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [inspections, activeSection, statusFilter, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalPcs = inspections.reduce((acc, r) => acc + r.inspectedPcs, 0);
    const passedPcs = inspections.reduce((acc, r) => acc + r.passedPcs, 0);
    const defPcs = inspections.reduce((acc, r) => acc + r.defectivePcs, 0);
    const dhu = ((defPcs / totalPcs) * 100).toFixed(2);
    const passRate = ((passedPcs / totalPcs) * 100).toFixed(1);

    return { totalPcs, passedPcs, defPcs, dhu, passRate };
  }, [inspections]);

  // Section DHU chart data
  const sectionDHUData = [
    { section: 'Cutting', dhu: 0.67, target: 0.8 },
    { section: 'Printing', dhu: 1.23, target: 1.5 },
    { section: 'Embroidery', dhu: 0.89, target: 1.0 },
    { section: 'Sewing', dhu: 3.85, target: 3.0 },
    { section: 'Finishing', dhu: 2.15, target: 1.8 }
  ];

  // Defect Distribution
  const defectPieData = [
    { name: 'Broken / Skipped Stitch', value: 34, color: '#dc2626' },
    { name: 'Open Seam / Run-off', value: 26, color: '#d97706' },
    { name: 'Placement / Alignment', value: 16, color: '#2563eb' },
    { name: 'Loose Thread / Spots', value: 14, color: '#0284c7' },
    { name: 'Shade / Assortment', value: 10, color: '#7c3aed' }
  ];

  const handleAddInspection = (e: React.FormEvent) => {
    e.preventDefault();
    const dhu = ((Number(formDefects) / Number(formInspected)) * 100);
    const newRec: GarmentQualityInspection = {
      id: `GQI-26-${String(Math.floor(Math.random() * 900) + 1100)}`,
      date: '02-Nov-26',
      section: formSection,
      sectionLabel:
        formSection === 'cutting' ? 'Cutting Quality' :
        formSection === 'printing' ? 'Printing Quality' :
        formSection === 'embroidery' ? 'Embroidery Quality' :
        formSection === 'sewing' ? 'Sewing Quality' : 'Finishing Quality',
      buyer: formBuyer,
      jobNo: formJob,
      styleNo: formStyle,
      lineOrTable: formLine,
      inspectedPcs: Number(formInspected),
      passedPcs: Number(formPassed),
      defectivePcs: Number(formDefects),
      dhuPercent: Number(dhu.toFixed(2)),
      topDefect: formTopDefect,
      severity: formSeverity,
      status: formStatus,
      inspector: 'Abdul Malek (QA Incharge)',
      criticalChecks: formChecks,
      remarks: formStatus === 'Passed' ? 'Cleared for downstream processing.' : 'Rework / Hold initiated.'
    };

    setInspections([newRec, ...inspections]);
    setShowModal(false);
  };

  return (
    <Shell
      title="Garments Quality — Process-Specific Quality Management"
      eyebrow="Garment Quality Assurance · Cutting, Printing, Embroidery, Sewing & Finishing"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Top Department Action Banner */}
        <section
          style={{
            background: 'linear-gradient(135deg, #071F42 0%, #173b70 100%)',
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
              End-to-End Garment Inspection
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 850, margin: '4px 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
              Garments Quality Department
            </h1>
</div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="btn btn-primary"
              style={{
                background: '#2563eb',
                borderColor: '#1d4ed8',
                padding: '9px 16px',
                fontSize: '13px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>+</span>
              <span>Log Garment Inspection</span>
            </button>
            <Link
              href="/modules/quality-history"
              className="btn btn-secondary"
              style={{
                fontSize: '13px',
                fontWeight: 700,
                background: 'rgba(255,255,255,0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              Job Quality History Register →
            </Link>
          </div>
        </section>

        {/* Five Process-Specific Navigation Section Buttons (Top Sub-navigation per UX Standard) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '10px',
            overflowX: 'auto'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveSection('overview')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeSection === 'overview' ? '#0f172a' : '#f1f5f9',
              color: activeSection === 'overview' ? '#ffffff' : '#475569'
            }}
          >
            📊 Overall Quality Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('cutting')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeSection === 'cutting' ? '#0f172a' : '#f1f5f9',
              color: activeSection === 'cutting' ? '#ffffff' : '#475569'
            }}
          >
            ✂️ Cutting Quality
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('printing')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeSection === 'printing' ? '#0f172a' : '#f1f5f9',
              color: activeSection === 'printing' ? '#ffffff' : '#475569'
            }}
          >
            🖨️ Printing Quality
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('embroidery')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeSection === 'embroidery' ? '#0f172a' : '#f1f5f9',
              color: activeSection === 'embroidery' ? '#ffffff' : '#475569'
            }}
          >
            🧵 Embroidery Quality
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('sewing')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeSection === 'sewing' ? '#0f172a' : '#f1f5f9',
              color: activeSection === 'sewing' ? '#ffffff' : '#475569'
            }}
          >
            🪡 Sewing Quality (Inline/Endline)
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('finishing')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeSection === 'finishing' ? '#0f172a' : '#f1f5f9',
              color: activeSection === 'finishing' ? '#ffffff' : '#475569'
            }}
          >
            📦 Finishing & AQL Audit
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('defects')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeSection === 'defects' ? '#0f172a' : '#f1f5f9',
              color: activeSection === 'defects' ? '#ffffff' : '#475569',
              marginLeft: 'auto'
            }}
          >
            📖 Defect Register
          </button>
        </div>

        {/* High-Level Overall Quality KPIs (Large, Legible 28-32px Figures) */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '14px'
          }}
        >
          {/* KPI 1: Total Inspected Garments */}
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid #2563eb' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Inspected Garments
            </div>
            <div style={{ fontSize: '30px', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
              {fmtNum(stats.totalPcs)} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Pcs</span>
            </div>
            <div style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
              Across 5 Manufacturing Sections
            </div>
          </div>

          {/* KPI 2: Overall Plant Pass Rate */}
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid #16a34a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Overall Pass Rate
              </span>
              <span style={{ fontSize: '12px', fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px' }}>
                AQL 1.5 OK
              </span>
            </div>
            <div style={{ fontSize: '30px', fontWeight: 900, color: '#16a34a', margin: '4px 0' }}>
              {stats.passRate}%
            </div>
            <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>
              {fmtNum(stats.passedPcs)} Pcs First-Time Pass
            </div>
          </div>

          {/* KPI 3: Defect Rate / Plant DHU */}
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid #d97706' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Average Plant DHU
              </span>
              <span style={{ fontSize: '12px', fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '4px' }}>
                Benchmark: 3.5%
              </span>
            </div>
            <div style={{ fontSize: '30px', fontWeight: 900, color: '#d97706', margin: '4px 0' }}>
              {stats.dhu}%
            </div>
            <div style={{ fontSize: '13px', color: '#b45309', fontWeight: 600 }}>
              {stats.defPcs} Defective Pcs Identified
            </div>
          </div>

          {/* KPI 4: Pending Rework & Action */}
          <div className="card" style={{ padding: '16px', borderLeft: '4px solid #dc2626' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Rework & Holds
              </span>
              <span style={{ fontSize: '12px', fontWeight: 800, background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px' }}>
                Action
              </span>
            </div>
            <div style={{ fontSize: '30px', fontWeight: 900, color: '#dc2626', margin: '4px 0' }}>
              70 <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Pcs</span>
            </div>
            <div style={{ fontSize: '13px', color: '#b91c1c', fontWeight: 600 }}>
              38 Sewing · 28 Finishing Hold · 4 Print
            </div>
          </div>
        </section>

        {/* Process-Specific Sub-Header Banner */}
        {activeSection !== 'overview' && activeSection !== 'defects' && (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                {activeSection === 'cutting' && 'Cutting Quality Checkpoint: Lay Spreading, Marker Alignment, Panel Measurement & Plies'}
                {activeSection === 'printing' && 'Printing Quality Checkpoint: Artwork Match, Screen Registration, Curing & Wash Fastness'}
                {activeSection === 'embroidery' && 'Embroidery Quality Checkpoint: Design Dimensions, Stitch Density, Thread Tension & Backing'}
                {activeSection === 'sewing' && 'Sewing Quality Checkpoint: Inline Inspection, End-line Table DHU, SPI & Seam Strength'}
                {activeSection === 'finishing' && 'Finishing Quality Checkpoint: Ironing, Label Verification, Measurement Audit & AQL 1.5 Final Audit'}
              </strong>
</div>
            <button
              type="button"
              onClick={() => {
                setFormSection(activeSection);
                setShowModal(true);
              }}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              + New {activeSection.toUpperCase()} Entry
            </button>
          </div>
        )}

        {/* Charts: Section DHU & Defect Pareto (shown on Overview) */}
        {activeSection === 'overview' && (
          <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '14px' }}>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                Section-wise DHU (%) vs Target Benchmark
              </div>
<div style={{ height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectionDHUData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="section" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} unit="%" />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar {...FX_BAR} dataKey="dhu" name="Actual DHU (%)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar {...FX_BAR} dataKey="target" name="Target Benchmark (%)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                Top Recurring Garment Defects (%)
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                Pareto distribution across active sewing & finishing lines
              </div>
              <div style={{ height: '240px', display: 'flex', alignItems: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie {...FX_PIE}
                      data={defectPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {defectPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* Defect Library Table */}
        {activeSection === 'defects' ? (
          <div className="card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Garment Manufacturing Defect Classification Master
                </h2>
</div>
              <span className="badge">{GARMENT_DEFECT_LIBRARY.length} Standard Defect Rules</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr style={{ height: '42px', background: '#f8fafc' }}>
                    <th style={{ fontSize: '13px' }}>Defect Code</th>
                    <th style={{ fontSize: '13px' }}>Section</th>
                    <th style={{ fontSize: '13px' }}>Defect Name</th>
                    <th style={{ fontSize: '13px' }}>Severity</th>
                    <th style={{ fontSize: '13px' }}>Mandatory Corrective Action</th>
                  </tr>
                </thead>
                <tbody>
                  {GARMENT_DEFECT_LIBRARY.map((d) => (
                    <tr key={d.code} style={{ height: '42px' }}>
                      <td>
                        <strong style={{ color: '#2563eb' }}>{d.code}</strong>
                      </td>
                      <td>
                        <span className="badge">{d.section}</span>
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{d.name}</strong>
                      </td>
                      <td>
                        <span
                          className="badge"
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
          /* Inspection Register Grid */
          <div className="card" style={{ padding: '18px' }}>
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
              <div style={{ flex: '1', minWidth: '220px' }}>
                <input
                  type="text"
                  placeholder="Search by ID, Job #, Style, Line, Defect..."
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
                  <option value="Passed">Passed (OK)</option>
                  <option value="Rework">Rework Required</option>
                  <option value="Hold">Hold</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                Showing {filteredRecords.length} of {inspections.length} Register Entries
              </div>
            </div>

            <DataGrid<GarmentQualityInspection>
              tableId="garment-quality-register"
              rows={filteredRecords}
              rowKey={(r) => r.id}
              onRowClick={(r) => setSelectedRecordId(r.id)}
              searchPlaceholder="Filter ID, Job #, Style, Line, Defect..."
              columns={[
                {
                  key: 'id',
                  header: 'Inspection ID',
                  accessor: (r) => r.id,
                  cell: (r) => <strong style={{ color: '#2563eb' }}>{r.id}</strong>
                },
                {
                  key: 'date',
                  header: 'Date',
                  accessor: (r) => r.date,
                  cell: (r) => fmtDate(r.date)
                },
                {
                  key: 'sectionLabel',
                  header: 'Section',
                  accessor: (r) => r.sectionLabel,
                  cell: (r) => (
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
                      {r.sectionLabel}
                    </span>
                  )
                },
                {
                  key: 'buyerJob',
                  header: 'Buyer / Job #',
                  accessor: (r) => `${r.buyer} ${r.jobNo}`,
                  cell: (r) => (
                    <div>
                      <strong style={{ color: '#0f172a' }}>{r.buyer}</strong>
                      <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>Job #{r.jobNo}</span>
                    </div>
                  )
                },
                {
                  key: 'lineOrTable',
                  header: 'Line / Location',
                  accessor: (r) => `${r.lineOrTable} ${r.styleNo}`,
                  cell: (r) => (
                    <div>
                      <div style={{ fontWeight: 650, color: '#1e293b' }}>{r.lineOrTable}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>Style: {r.styleNo}</div>
                    </div>
                  )
                },
                {
                  key: 'inspectedPcs',
                  header: 'Inspected Pcs',
                  align: 'right',
                  accessor: (r) => r.inspectedPcs,
                  cell: (r) => <strong>{fmtNum(r.inspectedPcs)}</strong>,
                  sum: true
                },
                {
                  key: 'defectivePcs',
                  header: 'Defects (DHU %)',
                  align: 'right',
                  accessor: (r) => r.defectivePcs,
                  cell: (r) => (
                    <div>
                      <span style={{ fontWeight: 750, color: r.defectivePcs > 20 ? '#dc2626' : '#0f172a' }}>
                        {r.defectivePcs} pcs
                      </span>
                      <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: r.dhuPercent > 3.0 ? '#dc2626' : '#16a34a' }}>
                        ({r.dhuPercent}%)
                      </span>
                    </div>
                  ),
                  sum: true
                },
                {
                  key: 'topDefect',
                  header: 'Top Defect & Checks',
                  accessor: (r) => `${r.topDefect} ${r.criticalChecks}`,
                  cell: (r) => (
                    <div>
                      <div style={{ color: r.severity === 'Critical' ? '#b91c1c' : '#1e293b', fontWeight: r.severity === 'Critical' ? 700 : 500 }}>
                        {r.topDefect}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>{r.criticalChecks}</div>
                    </div>
                  )
                },
                {
                  key: 'status',
                  header: 'Status',
                  accessor: (r) => r.status,
                  cell: (r) => {
                    const statusBg =
                      r.status === 'Passed' ? '#dcfce7' :
                      r.status === 'Hold' ? '#fef3c7' :
                      r.status === 'Rework' ? '#f3e8ff' : '#fee2e2';
                    const statusColor =
                      r.status === 'Passed' ? '#15803d' :
                      r.status === 'Hold' ? '#b45309' :
                      r.status === 'Rework' ? '#7c3aed' : '#b91c1c';
                    return (
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
                    );
                  }
                },
                {
                  key: 'inspector',
                  header: 'Inspector',
                  accessor: (r) => r.inspector
                }
              ]}
            />
          </div>
        )}
      </div>

      {/* RecordPanel for row click */}
      {(() => {
        const idx = filteredRecords.findIndex((r) => r.id === selectedRecordId);
        const rec = idx >= 0 ? filteredRecords[idx] : null;
        return (
          <RecordPanel<GarmentQualityInspection>
            open={!!rec}
            record={rec}
            onClose={() => setSelectedRecordId(null)}
            title={(r) => `${r.id} · ${r.lineOrTable}`}
            subtitle={(r) => `${r.buyer} · Job #${r.jobNo} · ${r.sectionLabel}`}
            statusBadge={(r) => ({
              label: r.status,
              tone: r.status === 'Passed' ? 'good' : r.status === 'Hold' || r.status === 'Rework' ? 'warn' : 'bad'
            })}
            onPrev={idx > 0 ? () => setSelectedRecordId(filteredRecords[idx - 1].id) : undefined}
            onNext={idx >= 0 && idx < filteredRecords.length - 1 ? () => setSelectedRecordId(filteredRecords[idx + 1].id) : undefined}
            prevDisabled={idx <= 0}
            nextDisabled={idx < 0 || idx >= filteredRecords.length - 1}
            sections={[
              {
                key: 'summary',
                title: 'Line & Job Details',
                fields: [
                  { key: 'id', label: 'Inspection ID', readOnly: true },
                  { key: 'date', label: 'Date', type: 'date' },
                  { key: 'buyer', label: 'Buyer', readOnly: true },
                  { key: 'jobNo', label: 'Job No', readOnly: true },
                  { key: 'styleNo', label: 'Style No', readOnly: true },
                  { key: 'lineOrTable', label: 'Line / Table' },
                  { key: 'inspector', label: 'Inspector', span: 2 }
                ]
              },
              {
                key: 'audit',
                title: 'Inspection Result & DHU',
                fields: [
                  { key: 'inspectedPcs', label: 'Inspected Pcs', type: 'number', unit: 'pcs', required: true },
                  { key: 'defectivePcs', label: 'Defective Pcs', type: 'number', unit: 'pcs', required: true },
                  {
                    key: 'severity',
                    label: 'Severity',
                    type: 'select',
                    options: [
                      { value: 'Clean', label: 'Clean' },
                      { value: 'Minor', label: 'Minor' },
                      { value: 'Major', label: 'Major' },
                      { value: 'Critical', label: 'Critical' }
                    ]
                  },
                  {
                    key: 'status',
                    label: 'Quality Decision',
                    type: 'select',
                    options: [
                      { value: 'Passed', label: 'Passed' },
                      { value: 'Rework', label: 'Rework' },
                      { value: 'Hold', label: 'Hold' },
                      { value: 'Failed', label: 'Failed' }
                    ]
                  },
                  { key: 'topDefect', label: 'Top Defect Observed', span: 2 },
                  { key: 'criticalChecks', label: 'Critical Checks Verified', span: 2 },
                  { key: 'remarks', label: 'Inspector Remarks', type: 'textarea', span: 2 }
                ]
              }
            ]}
            onSave={(updated) => {
              const passed = Math.max(0, Number(updated.inspectedPcs) - Number(updated.defectivePcs));
              const dhu = Number(updated.inspectedPcs) > 0 ? Number(((Number(updated.defectivePcs) / Number(updated.inspectedPcs)) * 100).toFixed(2)) : 0;
              const nextRec = { ...updated, passedPcs: passed, dhuPercent: dhu };
              setInspections((prev) => prev.map((item) => (item.id === nextRec.id ? nextRec : item)));
            }}
          />
        );
      })()}

      {/* Modal: Log New Garment Quality Inspection */}
      {showModal && (
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
                  Log Garment Quality Inspection
                </h3>
</div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddInspection} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Manufacturing Section
                  </label>
                  <select
                    value={formSection}
                    onChange={(e: any) => setFormSection(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="cutting">Cutting Quality</option>
                    <option value="printing">Printing Quality</option>
                    <option value="embroidery">Embroidery Quality</option>
                    <option value="sewing">Sewing Quality</option>
                    <option value="finishing">Finishing & Packing</option>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Style No
                  </label>
                  <input
                    type="text"
                    value={formStyle}
                    onChange={(e) => setFormStyle(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Floor / Line / Table
                  </label>
                  <input
                    type="text"
                    value={formLine}
                    onChange={(e) => setFormLine(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Inspected (Pcs)
                  </label>
                  <input
                    type="number"
                    value={formInspected}
                    onChange={(e) => setFormInspected(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Passed (Pcs)
                  </label>
                  <input
                    type="number"
                    value={formPassed}
                    onChange={(e) => setFormPassed(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Defects (Pcs)
                  </label>
                  <input
                    type="number"
                    value={formDefects}
                    onChange={(e) => setFormDefects(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Observed Defect
                </label>
                <input
                  type="text"
                  value={formTopDefect}
                  onChange={(e) => setFormTopDefect(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Critical Checks Verified
                </label>
                <input
                  type="text"
                  value={formChecks}
                  onChange={(e) => setFormChecks(e.target.value)}
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
                    <option value="Minor">Minor</option>
                    <option value="Major">Major</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Quality Decision
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e: any) => setFormStatus(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="Passed">Passed (OK for Next Section)</option>
                    <option value="Rework">Rework Required</option>
                    <option value="Hold">Hold for QA Head</option>
                    <option value="Failed">Failed / Scrap</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '13px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 20px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#ffffff', fontSize: '13px', fontWeight: 700 }}
                >
                  Save & Update Garment Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
