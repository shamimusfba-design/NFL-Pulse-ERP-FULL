'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';
import {
  ActiveFiltersBar,
  CrossFilterProvider,
  DataGrid,
  DrillBreakdown,
  DrillPopup,
  DrillTarget,
  GridColumn,
  RecordPanel,
} from '../../../components/ui';
import { fmtDate, fmtNum } from '../../../lib/format';
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Lock,
  Unlock,
  FileText,
  Download,
  UploadCloud,
  Filter,
  Search,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Eye,
  Printer,
  Layers,
  ShieldCheck,
  Check,
  ChevronDown,
  Info,
  SlidersHorizontal,
  FileCheck
} from 'lucide-react';

// ============================================================================
// DATA STRUCTURES
// ============================================================================

export type TestStatus = 'PASS' | 'FAIL' | 'TEST_RUNNING' | 'FABRIC_NOT_READY' | 'NOT_APPLICABLE';

export interface SingleTestEvaluation {
  status: TestStatus;
  score: number; // 1.0 - 5.0 scale
  observedValue: string;
  requiredSpec: string;
  testedDate?: string;
  technician?: string;
  standard?: string;
}

export interface AttachedReportFile {
  id: string;
  name: string;
  type: 'PDF' | 'EXCEL';
  sizeKb: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface LabJobMasterRecord {
  id: string;
  jobNo: string;
  buyer: string;
  buyerCode: string;
  styleNo: string;
  item: string;
  fabricType: string;
  color: string;
  batchNo: string;
  lotQtyKg: number;
  merchandiser: string;
  planMonth: string;
  tnaApprovalDate: string;
  targetDeliveryDate: string;
  deliveryGate: 'CLEARED' | 'BLOCKED' | 'PENDING';
  clearanceNote: string;
  leadApprover: string;
  
  // Specific Test Evaluations
  dimensionalStability: SingleTestEvaluation; // Shrinkage & Spirality
  washTest5x: SingleTestEvaluation;           // 5-Time Home Launder Wash
  rubbingFastness: SingleTestEvaluation;      // Dry & Wet Crocking
  perspirationFastness: SingleTestEvaluation; // Acid & Alkaline
  salivaFastness: SingleTestEvaluation;       // Babywear / Saliva
  pillingStretch: SingleTestEvaluation;       // Martindale Pilling & Stretch Recovery
  garmentAccessories: SingleTestEvaluation;   // Button / Zipper Pull Test

  // Uploaded Certificates
  attachedFiles: AttachedReportFile[];
}

export interface PlanningLabRequest {
  id: string;
  jobNo: string;
  buyer: string;
  styleNo: string;
  item: string;
  fabricDescription: string;
  colors: string[];
  totalQtyKg: number;
  tnaApprovedAt: string;
  targetDeliveryDate: string;
  merchandiser: string;
  status: 'PENDING_ACCEPTANCE' | 'ACCEPTED';
  requiredTestsSuggested: string[];
}

// ============================================================================
// INITIAL SEED DATA
// ============================================================================

const INITIAL_PLANNING_REQUESTS: PlanningLabRequest[] = [
  {
    id: 'PLR-2026-081',
    jobNo: '48093',
    buyer: 'ONLY',
    styleNo: '22041',
    item: 'Crew Neck T-Shirt',
    fabricDescription: '100% Combed Cotton Single Jersey 180 GSM',
    colors: ['Jet Black', 'Bright White', 'Sage Fog'],
    totalQtyKg: 4200,
    tnaApprovedAt: '2026-08-28',
    targetDeliveryDate: '2026-09-12',
    merchandiser: 'Shakil',
    status: 'PENDING_ACCEPTANCE',
    requiredTestsSuggested: ['Dimensional Stability', '5-Time Wash', 'Rubbing Fastness', 'Perspiration', 'Pilling Resistance']
  },
  {
    id: 'PLR-2026-082',
    jobNo: '47812',
    buyer: 'Name It',
    styleNo: '13251509',
    item: 'Baby Rib Romper',
    fabricDescription: '100% Organic Cotton Rib 1x1 200 GSM (GOTS)',
    colors: ['Buttercup Yellow', 'Soft Mint'],
    totalQtyKg: 1850,
    tnaApprovedAt: '2026-08-29',
    targetDeliveryDate: '2026-09-15',
    merchandiser: 'Shamoly',
    status: 'PENDING_ACCEPTANCE',
    requiredTestsSuggested: ['Dimensional Stability', '5-Time Wash', 'Saliva Fastness (Baby)', 'Rubbing Fastness', 'Button Pull Test']
  },
  {
    id: 'PLR-2026-083',
    jobNo: '46748',
    buyer: 'ONL',
    styleNo: '15244714',
    item: 'High Stretch Legging',
    fabricDescription: '95% Cotton / 5% Lycra Single Jersey 210 GSM',
    colors: ['Pink Anise', 'Deep Navy'],
    totalQtyKg: 3100,
    tnaApprovedAt: '2026-08-30',
    targetDeliveryDate: '2026-09-18',
    merchandiser: 'Imran',
    status: 'PENDING_ACCEPTANCE',
    requiredTestsSuggested: ['Dimensional Stability', 'Stretch & Recovery', '5-Time Wash', 'Rubbing Fastness', 'Pilling Resistance']
  }
];

const INITIAL_MASTER_RECORDS: LabJobMasterRecord[] = [
  {
    id: 'LR-48085-01',
    jobNo: '48085',
    buyer: 'BS-NMT',
    buyerCode: 'NMT',
    styleNo: '13251506',
    item: 'Lace Matching Top',
    fabricType: '4x1 Rib with Lurex 200 GSM',
    color: 'Nosegay Pink',
    batchNo: 'B-48085-01',
    lotQtyKg: 154,
    merchandiser: 'Shamoly',
    planMonth: 'Sep 2026',
    tnaApprovalDate: '2026-08-20',
    targetDeliveryDate: '2026-09-08',
    deliveryGate: 'CLEARED',
    clearanceNote: 'All physical & chemical tests PASSED. Stenter recipe verified. Delivery unlocked for store issue.',
    leadApprover: 'Dr. Nazrul Islam (Lab Head)',
    dimensionalStability: {
      status: 'PASS',
      score: 4.5,
      observedValue: 'L: -2.8%, W: -2.1%, Sp: 1.8%',
      requiredSpec: 'L: ±5.0%, W: ±5.0%, Spirality < 4%',
      standard: 'ISO 6330 / ISO 16322'
    },
    washTest5x: {
      status: 'PASS',
      score: 4.5,
      observedValue: 'Grade 4.5 (No seam twist, color change 4.5)',
      requiredSpec: 'Min Grade 4.0 after 5x Wash',
      standard: 'ISO 6330 60°C'
    },
    rubbingFastness: {
      status: 'PASS',
      score: 4.5,
      observedValue: 'Dry: 4.5 | Wet: 3.5',
      requiredSpec: 'Dry: Min 4.0 | Wet: Min 3.0',
      standard: 'ISO 105-X12'
    },
    perspirationFastness: {
      status: 'PASS',
      score: 4.5,
      observedValue: 'Acid: 4.5 | Alk: 4.5 (Staining 4.5)',
      requiredSpec: 'Min 4.0 change & stain',
      standard: 'ISO 105-E04'
    },
    salivaFastness: {
      status: 'NOT_APPLICABLE',
      score: 5.0,
      observedValue: 'N/A (Adult garment)',
      requiredSpec: 'N/A'
    },
    pillingStretch: {
      status: 'PASS',
      score: 4.0,
      observedValue: 'Pilling: Grade 4.0 at 2,000 revs',
      requiredSpec: 'Min Grade 3.5 - 4.0',
      standard: 'ISO 12945-2'
    },
    garmentAccessories: {
      status: 'NOT_APPLICABLE',
      score: 5.0,
      observedValue: 'N/A (No trims at fabric stage)',
      requiredSpec: 'N/A'
    },
    attachedFiles: [
      {
        id: 'ATT-101',
        name: 'TR-48085-Nosegay-Lab-Certificate.pdf',
        type: 'PDF',
        sizeKb: 342,
        uploadedAt: '2026-08-25 14:30',
        uploadedBy: 'S. K. Paul (Sr. Chemist)'
      },
      {
        id: 'ATT-102',
        name: 'Datacolor_Spectro_DeltaE_48085.xlsx',
        type: 'EXCEL',
        sizeKb: 185,
        uploadedAt: '2026-08-25 14:35',
        uploadedBy: 'S. K. Paul'
      }
    ]
  },
  {
    id: 'LR-48002-01',
    jobNo: '48002',
    buyer: 'ONLY',
    buyerCode: 'ONLY',
    styleNo: '13251512',
    item: 'Basic V-Neck Tee',
    fabricType: '100% Combed Cotton 160 GSM',
    color: 'Estate Blue',
    batchNo: 'B-48002-02',
    lotQtyKg: 1250,
    merchandiser: 'Abid',
    planMonth: 'Sep 2026',
    tnaApprovalDate: '2026-08-14',
    targetDeliveryDate: '2026-09-05',
    deliveryGate: 'BLOCKED',
    clearanceNote: 'DELIVERY BLOCKED: Wet rubbing test failed (Score 2.5 vs Min 3.5). Reprocessing with fixing agent required.',
    leadApprover: 'Dr. Nazrul Islam (Lab Head)',
    dimensionalStability: {
      status: 'PASS',
      score: 4.0,
      observedValue: 'L: -3.4%, W: -3.0%, Sp: 2.4%',
      requiredSpec: 'L: ±4.0%, W: ±4.0%, Sp < 3%',
      standard: 'ISO 6330'
    },
    washTest5x: {
      status: 'PASS',
      score: 4.0,
      observedValue: 'Grade 4.0 (Good appearance)',
      requiredSpec: 'Min Grade 4.0',
      standard: 'ISO 6330'
    },
    rubbingFastness: {
      status: 'FAIL',
      score: 2.5,
      observedValue: 'Dry: 4.0 | Wet: 2.5 (BELOW SPEC)',
      requiredSpec: 'Dry: Min 4.0 | Wet: Min 3.5',
      standard: 'ISO 105-X12'
    },
    perspirationFastness: {
      status: 'PASS',
      score: 4.0,
      observedValue: 'Acid: 4.0 | Alk: 3.5',
      requiredSpec: 'Min 3.5',
      standard: 'ISO 105-E04'
    },
    salivaFastness: {
      status: 'NOT_APPLICABLE',
      score: 5.0,
      observedValue: 'N/A',
      requiredSpec: 'N/A'
    },
    pillingStretch: {
      status: 'PASS',
      score: 4.0,
      observedValue: 'Pilling: Grade 4.0',
      requiredSpec: 'Min Grade 3.5',
      standard: 'ISO 12945-2'
    },
    garmentAccessories: {
      status: 'NOT_APPLICABLE',
      score: 5.0,
      observedValue: 'N/A',
      requiredSpec: 'N/A'
    },
    attachedFiles: [
      {
        id: 'ATT-103',
        name: 'TR-48002-FAIL-WetRubbing-Report.pdf',
        type: 'PDF',
        sizeKb: 418,
        uploadedAt: '2026-08-16 11:20',
        uploadedBy: 'Kamrul Hasan (Lab Chemist)'
      }
    ]
  },
  {
    id: 'LR-46755-01',
    jobNo: '46755',
    buyer: 'OVS',
    buyerCode: 'OVS',
    styleNo: '262SWT028-222',
    item: 'Fleece Sweatshirt',
    fabricType: 'Fleece 300 GSM Mid Peach Finish',
    color: 'Black Beauty',
    batchNo: 'B-46755-03',
    lotQtyKg: 2930,
    merchandiser: 'Shaker',
    planMonth: 'Aug 2026',
    tnaApprovalDate: '2026-08-01',
    targetDeliveryDate: '2026-08-20',
    deliveryGate: 'CLEARED',
    clearanceNote: 'DELIVERY CLEARED: All parameters verified including 5-time wash & peach fuzz stability. Released for store.',
    leadApprover: 'Dr. Nazrul Islam (Lab Head)',
    dimensionalStability: {
      status: 'PASS',
      score: 4.5,
      observedValue: 'L: -2.5%, W: -1.9%, Sp: 1.5%',
      requiredSpec: 'L: ±5.0%, W: ±5.0%, Sp < 4%',
      standard: 'ISO 6330'
    },
    washTest5x: {
      status: 'PASS',
      score: 4.5,
      observedValue: 'Grade 4.5 (No fuzz shedding)',
      requiredSpec: 'Min Grade 4.0',
      standard: 'ISO 6330'
    },
    rubbingFastness: {
      status: 'PASS',
      score: 4.0,
      observedValue: 'Dry: 4.5 | Wet: 3.5',
      requiredSpec: 'Dry: Min 4.0 | Wet: Min 3.0',
      standard: 'ISO 105-X12'
    },
    perspirationFastness: {
      status: 'PASS',
      score: 4.5,
      observedValue: 'Acid: 4.5 | Alk: 4.5',
      requiredSpec: 'Min 4.0',
      standard: 'ISO 105-E04'
    },
    salivaFastness: {
      status: 'NOT_APPLICABLE',
      score: 5.0,
      observedValue: 'N/A',
      requiredSpec: 'N/A'
    },
    pillingStretch: {
      status: 'PASS',
      score: 4.5,
      observedValue: 'Pilling: Grade 4.5 (Biopolished)',
      requiredSpec: 'Min Grade 4.0',
      standard: 'ISO 12945-2'
    },
    garmentAccessories: {
      status: 'PASS',
      score: 5.0,
      observedValue: 'Zipper Pull: 110 N (Passed > 90N)',
      requiredSpec: 'Zipper Holding > 90 N',
      standard: 'ASTM D2061'
    },
    attachedFiles: [
      {
        id: 'ATT-104',
        name: 'OVS_BlackBeauty_Full_Lab_COA.pdf',
        type: 'PDF',
        sizeKb: 512,
        uploadedAt: '2026-08-10 16:45',
        uploadedBy: 'F. Rahman (Chemist)'
      },
      {
        id: 'ATT-105',
        name: 'OVS_Dimensional_Stability_Raw_Log.xlsx',
        type: 'EXCEL',
        sizeKb: 220,
        uploadedAt: '2026-08-10 16:50',
        uploadedBy: 'F. Rahman'
      }
    ]
  },
  {
    id: 'LR-48061-01',
    jobNo: '48061',
    buyer: 'Name It',
    buyerCode: 'Name It',
    styleNo: '13251509',
    item: 'Babywear Body Suit',
    fabricType: '100% Organic Cotton GOTS 175 GSM',
    color: 'Buttercup Yellow',
    batchNo: 'B-48061-01',
    lotQtyKg: 640,
    merchandiser: 'Shamoly',
    planMonth: 'Sep 2026',
    tnaApprovalDate: '2026-08-18',
    targetDeliveryDate: '2026-09-10',
    deliveryGate: 'CLEARED',
    clearanceNote: 'DELIVERY CLEARED: Babywear Saliva Grade 5.0 verified. Oeko-Tex Class I & GOTS certified. Unlocked.',
    leadApprover: 'Dr. Nazrul Islam (Lab Head)',
    dimensionalStability: {
      status: 'PASS',
      score: 4.5,
      observedValue: 'L: -2.0%, W: -1.5%, Sp: 1.2%',
      requiredSpec: 'L: ±4.0%, W: ±4.0%, Sp < 3%',
      standard: 'ISO 6330'
    },
    washTest5x: {
      status: 'PASS',
      score: 5.0,
      observedValue: 'Grade 5.0 (Zero color bleed)',
      requiredSpec: 'Min Grade 4.5 for babywear',
      standard: 'ISO 6330 60°C'
    },
    rubbingFastness: {
      status: 'PASS',
      score: 5.0,
      observedValue: 'Dry: 5.0 | Wet: 4.5',
      requiredSpec: 'Dry: Min 4.5 | Wet: Min 4.0',
      standard: 'ISO 105-X12'
    },
    perspirationFastness: {
      status: 'PASS',
      score: 5.0,
      observedValue: 'Acid: 5.0 | Alk: 5.0',
      requiredSpec: 'Min 4.5',
      standard: 'ISO 105-E04'
    },
    salivaFastness: {
      status: 'PASS',
      score: 5.0,
      observedValue: 'Grade 5.0 (Strict Zero Bleed passed)',
      requiredSpec: 'Grade 5.0 Mandatory (DIN 53160-1)',
      standard: 'DIN 53160-1 / Oeko-Tex'
    },
    pillingStretch: {
      status: 'PASS',
      score: 4.5,
      observedValue: 'Pilling: Grade 4.5',
      requiredSpec: 'Min Grade 4.0',
      standard: 'ISO 12945-2'
    },
    garmentAccessories: {
      status: 'PASS',
      score: 5.0,
      observedValue: 'Snap Button Pull: 115 N (Passed > 90N)',
      requiredSpec: 'Baby Snap Pull > 90 N for 10s',
      standard: 'ASTM D4846'
    },
    attachedFiles: [
      {
        id: 'ATT-106',
        name: 'NameIt_Babywear_Saliva_Safety_Report.pdf',
        type: 'PDF',
        sizeKb: 610,
        uploadedAt: '2026-08-22 17:15',
        uploadedBy: 'Dr. Nazrul Islam'
      }
    ]
  },
  {
    id: 'LR-48110-01',
    jobNo: '48110',
    buyer: 'Only&Sons',
    buyerCode: 'Only&Sons',
    styleNo: '13251532',
    item: 'Striped Yarn Dye Polo',
    fabricType: 'Package Yarn Dyeing 32/2 220 GSM',
    color: 'Crimson Red / Ecru',
    batchNo: 'B-48110-02',
    lotQtyKg: 1840,
    merchandiser: 'Kamrul',
    planMonth: 'Sep 2026',
    tnaApprovalDate: '2026-08-22',
    targetDeliveryDate: '2026-09-15',
    deliveryGate: 'PENDING',
    clearanceNote: 'DELIVERY PENDING: Perspiration & 5-time wash cycle in incubator. Rolls quarantined in Dyeing floor.',
    leadApprover: 'Pending Final Verification',
    dimensionalStability: {
      status: 'PASS',
      score: 4.0,
      observedValue: 'L: -3.1%, W: -2.8%, Sp: 2.0%',
      requiredSpec: 'L: ±5.0%, W: ±5.0%, Sp < 4%',
      standard: 'ISO 6330'
    },
    washTest5x: {
      status: 'TEST_RUNNING',
      score: 0,
      observedValue: 'Cycle 3 of 5 in progress',
      requiredSpec: 'Min Grade 4.0',
      standard: 'ISO 6330'
    },
    rubbingFastness: {
      status: 'PASS',
      score: 4.0,
      observedValue: 'Dry: 4.5 | Wet: 3.5',
      requiredSpec: 'Dry: Min 4.0 | Wet: Min 3.0',
      standard: 'ISO 105-X12'
    },
    perspirationFastness: {
      status: 'TEST_RUNNING',
      score: 0,
      observedValue: 'Specimens in 37°C incubator (4h cycle)',
      requiredSpec: 'Min 4.0',
      standard: 'ISO 105-E04'
    },
    salivaFastness: {
      status: 'NOT_APPLICABLE',
      score: 5.0,
      observedValue: 'N/A',
      requiredSpec: 'N/A'
    },
    pillingStretch: {
      status: 'FABRIC_NOT_READY',
      score: 0,
      observedValue: 'Awaiting stenter finished swatch',
      requiredSpec: 'Min Grade 4.0',
      standard: 'ISO 12945-2'
    },
    garmentAccessories: {
      status: 'NOT_APPLICABLE',
      score: 5.0,
      observedValue: 'N/A',
      requiredSpec: 'N/A'
    },
    attachedFiles: []
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TestingLabModulePage() {
  return (
    <CrossFilterProvider>
      <TestingLabModuleContent />
    </CrossFilterProvider>
  );
}

function TestingLabModuleContent() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'REQUESTS' | 'ENTRY'>('REGISTER');
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);

  // Master State with LocalStorage Persistence
  const [masterRecords, setMasterRecords] = useState<LabJobMasterRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nfl_testing_lab_v2');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved lab records', e);
        }
      }
    }
    return INITIAL_MASTER_RECORDS;
  });

  const [planningRequests, setPlanningRequests] = useState<PlanningLabRequest[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nfl_lab_requests_v2');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved planning requests', e);
        }
      }
    }
    return INITIAL_PLANNING_REQUESTS;
  });

  // Save to LocalStorage whenever modified
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nfl_testing_lab_v2', JSON.stringify(masterRecords));
    }
  }, [masterRecords]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nfl_lab_requests_v2', JSON.stringify(planningRequests));
    }
  }, [planningRequests]);

  // Filters State
  const [selectedBuyer, setSelectedBuyer] = useState<string>('ALL');
  const [selectedMerchandiser, setSelectedMerchandiser] = useState<string>('ALL');
  const [selectedGateStatus, setSelectedGateStatus] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Report Modal State
  const [selectedModalRecord, setSelectedModalRecord] = useState<LabJobMasterRecord | null>(null);
  const [panelLabId, setPanelLabId] = useState<string | null>(null);

  // Accept Request Modal State
  const [acceptingRequest, setAcceptingRequest] = useState<PlanningLabRequest | null>(null);
  const [selectedColorsForAccept, setSelectedColorsForAccept] = useState<string[]>([]);
  const [selectedTestsForAccept, setSelectedTestsForAccept] = useState<{
    dimensional: boolean;
    wash5x: boolean;
    rubbing: boolean;
    perspiration: boolean;
    saliva: boolean;
    pilling: boolean;
    accessories: boolean;
  }>({
    dimensional: true,
    wash5x: true,
    rubbing: true,
    perspiration: true,
    saliva: false,
    pilling: true,
    accessories: false
  });

  // Form State for "Test Report Entry & Upload"
  const [entryJobNo, setEntryJobNo] = useState<string>('48085');
  const [entryColor, setEntryColor] = useState<string>('Nosegay Pink');
  const [entryTestType, setEntryTestType] = useState<string>('rubbingFastness');
  const [entryStatus, setEntryStatus] = useState<TestStatus>('PASS');
  const [entryScore, setEntryScore] = useState<number>(4.5);
  const [entryObserved, setEntryObserved] = useState<string>('Dry: 4.5 | Wet: 3.5');
  const [entrySpec, setEntrySpec] = useState<string>('Dry Min 4.0 | Wet Min 3.0');
  const [entryTechnician, setEntryTechnician] = useState<string>('S. K. Paul (Sr. Chemist)');
  const [entryNote, setEntryNote] = useState<string>('Fastness criteria compliant. Stenter fix verified.');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFileType, setUploadedFileType] = useState<'PDF' | 'EXCEL'>('PDF');
  const [entrySuccessMessage, setEntrySuccessMessage] = useState<string>('');

  // Dynamic available colors for entry form
  const availableEntryColors = useMemo(() => {
    const job = masterRecords.find(r => r.jobNo === entryJobNo);
    if (!job) return ['Default Color'];
    return [job.color];
  }, [entryJobNo, masterRecords]);

  // ============================================================================
  // KPI CALCULATIONS
  // ============================================================================
  const kpis = useMemo(() => {
    const total = masterRecords.length;
    const cleared = masterRecords.filter(r => r.deliveryGate === 'CLEARED').length;
    const blocked = masterRecords.filter(r => r.deliveryGate === 'BLOCKED').length;
    const pending = masterRecords.filter(r => r.deliveryGate === 'PENDING').length;
    const pendingReqCount = planningRequests.filter(r => r.status === 'PENDING_ACCEPTANCE').length;
    const clearanceRate = total > 0 ? Math.round((cleared / (cleared + blocked || 1)) * 100) : 100;

    return { total, cleared, blocked, pending, pendingReqCount, clearanceRate };
  }, [masterRecords, planningRequests]);

  // Unique Filter Lists
  const buyersList = useMemo(() => {
    const set = new Set(masterRecords.map(r => r.buyer));
    return Array.from(set);
  }, [masterRecords]);

  const merchandisersList = useMemo(() => {
    const set = new Set(masterRecords.map(r => r.merchandiser));
    return Array.from(set);
  }, [masterRecords]);

  // Filtered Master Records
  const filteredRecords = useMemo(() => {
    return masterRecords.filter(r => {
      const matchBuyer = selectedBuyer === 'ALL' || r.buyer === selectedBuyer;
      const matchMerch = selectedMerchandiser === 'ALL' || r.merchandiser === selectedMerchandiser;
      const matchGate = selectedGateStatus === 'ALL' || r.deliveryGate === selectedGateStatus;
      const matchMonth = selectedMonth === 'ALL' || r.planMonth.includes(selectedMonth);

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.jobNo.toLowerCase().includes(q) ||
        r.buyer.toLowerCase().includes(q) ||
        r.styleNo.toLowerCase().includes(q) ||
        r.color.toLowerCase().includes(q) ||
        r.batchNo.toLowerCase().includes(q) ||
        r.fabricType.toLowerCase().includes(q);

      return matchBuyer && matchMerch && matchGate && matchMonth && matchSearch;
    });
  }, [masterRecords, selectedBuyer, selectedMerchandiser, selectedGateStatus, selectedMonth, searchQuery]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Handle Accepting Request from Planning
  const handleOpenAcceptModal = (req: PlanningLabRequest) => {
    setAcceptingRequest(req);
    setSelectedColorsForAccept([...req.colors]);
    // Pre-select saliva if babywear
    const isBaby = req.item.toLowerCase().includes('baby') || req.fabricDescription.toLowerCase().includes('gots');
    const isStretch = req.fabricDescription.toLowerCase().includes('lycra') || req.fabricDescription.toLowerCase().includes('elastane');
    setSelectedTestsForAccept({
      dimensional: true,
      wash5x: true,
      rubbing: true,
      perspiration: true,
      saliva: isBaby,
      pilling: true,
      accessories: req.item.toLowerCase().includes('romper') || req.item.toLowerCase().includes('polo')
    });
  };

  const handleConfirmAcceptRequest = () => {
    if (!acceptingRequest) return;

    // Create a new master record for each selected color
    const newRecords: LabJobMasterRecord[] = selectedColorsForAccept.map((color, idx) => ({
      id: `LR-${acceptingRequest.jobNo}-${Date.now()}-${idx}`,
      jobNo: acceptingRequest.jobNo,
      buyer: acceptingRequest.buyer,
      buyerCode: acceptingRequest.buyer,
      styleNo: acceptingRequest.styleNo,
      item: acceptingRequest.item,
      fabricType: acceptingRequest.fabricDescription,
      color: color,
      batchNo: `B-${acceptingRequest.jobNo}-0${idx + 1}`,
      lotQtyKg: Math.round(acceptingRequest.totalQtyKg / selectedColorsForAccept.length),
      merchandiser: acceptingRequest.merchandiser,
      planMonth: 'Sep 2026',
      tnaApprovalDate: acceptingRequest.tnaApprovedAt,
      targetDeliveryDate: acceptingRequest.targetDeliveryDate,
      deliveryGate: 'PENDING',
      clearanceNote: 'Awaiting lab test specimen reception and physical/chemical evaluations.',
      leadApprover: 'Pending Lab Review',
      dimensionalStability: {
        status: selectedTestsForAccept.dimensional ? 'TEST_RUNNING' : 'NOT_APPLICABLE',
        score: 0,
        observedValue: 'Awaiting stenter specimen',
        requiredSpec: 'L: ±5.0%, W: ±5.0%, Spirality < 4%',
        standard: 'ISO 6330'
      },
      washTest5x: {
        status: selectedTestsForAccept.wash5x ? 'TEST_RUNNING' : 'NOT_APPLICABLE',
        score: 0,
        observedValue: 'Wash cycles 1-5 scheduled',
        requiredSpec: 'Min Grade 4.0',
        standard: 'ISO 6330'
      },
      rubbingFastness: {
        status: selectedTestsForAccept.rubbing ? 'TEST_RUNNING' : 'NOT_APPLICABLE',
        score: 0,
        observedValue: 'Crockmeter test pending',
        requiredSpec: 'Dry: Min 4.0 | Wet: Min 3.0',
        standard: 'ISO 105-X12'
      },
      perspirationFastness: {
        status: selectedTestsForAccept.perspiration ? 'TEST_RUNNING' : 'NOT_APPLICABLE',
        score: 0,
        observedValue: 'Perspirometer incubation scheduled',
        requiredSpec: 'Min 4.0',
        standard: 'ISO 105-E04'
      },
      salivaFastness: {
        status: selectedTestsForAccept.saliva ? 'TEST_RUNNING' : 'NOT_APPLICABLE',
        score: 0,
        observedValue: selectedTestsForAccept.saliva ? 'Saliva extraction scheduled' : 'N/A',
        requiredSpec: selectedTestsForAccept.saliva ? 'Grade 5.0 (No Bleed)' : 'N/A',
        standard: 'DIN 53160-1'
      },
      pillingStretch: {
        status: selectedTestsForAccept.pilling ? 'TEST_RUNNING' : 'NOT_APPLICABLE',
        score: 0,
        observedValue: 'Martindale test pending',
        requiredSpec: 'Min Grade 3.5 - 4.0',
        standard: 'ISO 12945-2'
      },
      garmentAccessories: {
        status: selectedTestsForAccept.accessories ? 'FABRIC_NOT_READY' : 'NOT_APPLICABLE',
        score: 0,
        observedValue: selectedTestsForAccept.accessories ? 'Waiting for sewing input' : 'N/A',
        requiredSpec: selectedTestsForAccept.accessories ? 'Pull > 90 N' : 'N/A',
        standard: 'ASTM D4846'
      },
      attachedFiles: []
    }));

    // Update Planning request status
    setPlanningRequests(prev =>
      prev.map(r => (r.id === acceptingRequest.id ? { ...r, status: 'ACCEPTED' } : r))
    );

    // Prepend new records to master
    setMasterRecords(prev => [...newRecords, ...prev]);

    setAcceptingRequest(null);
    setActiveTab('REGISTER');
  };

  // Handle Saving Test Report Entry
  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();

    setMasterRecords(prev =>
      prev.map(rec => {
        if (rec.jobNo === entryJobNo && rec.color === entryColor) {
          const updated = { ...rec };
          const newEval: SingleTestEvaluation = {
            status: entryStatus,
            score: entryScore,
            observedValue: entryObserved,
            requiredSpec: entrySpec,
            testedDate: new Date().toISOString().split('T')[0],
            technician: entryTechnician
          };

          if (entryTestType === 'dimensionalStability') updated.dimensionalStability = newEval;
          else if (entryTestType === 'washTest5x') updated.washTest5x = newEval;
          else if (entryTestType === 'rubbingFastness') updated.rubbingFastness = newEval;
          else if (entryTestType === 'perspirationFastness') updated.perspirationFastness = newEval;
          else if (entryTestType === 'salivaFastness') updated.salivaFastness = newEval;
          else if (entryTestType === 'pillingStretch') updated.pillingStretch = newEval;
          else if (entryTestType === 'garmentAccessories') updated.garmentAccessories = newEval;

          // Check all tests to determine delivery gate
          const testsToCheck: SingleTestEvaluation[] = [
            updated.dimensionalStability,
            updated.washTest5x,
            updated.rubbingFastness,
            updated.perspirationFastness,
            updated.salivaFastness,
            updated.pillingStretch,
            updated.garmentAccessories
          ];

          const activeTests = testsToCheck.filter(t => t.status !== 'NOT_APPLICABLE');
          const hasFail = activeTests.some(t => t.status === 'FAIL');
          const allPass = activeTests.every(t => t.status === 'PASS');

          if (hasFail) {
            updated.deliveryGate = 'BLOCKED';
            updated.clearanceNote = `DELIVERY BLOCKED: Test ${entryTestType} failed (Score ${entryScore}). Delivery prohibited. Re-dyeing or chemical re-fixing required.`;
          } else if (allPass) {
            updated.deliveryGate = 'CLEARED';
            updated.clearanceNote = `DELIVERY CLEARED: All mandatory physical & fastness specifications passed. Certificate authorized by ${entryTechnician}.`;
            updated.leadApprover = 'Dr. Nazrul Islam (Lab Head)';
          } else {
            updated.deliveryGate = 'PENDING';
            updated.clearanceNote = 'DELIVERY PENDING: Some tests are still in progress or awaiting specimen.';
          }

          // If a file was uploaded, attach it
          if (uploadedFileName) {
            const newFile: AttachedReportFile = {
              id: `ATT-${Date.now()}`,
              name: uploadedFileName,
              type: uploadedFileType,
              sizeKb: Math.floor(200 + Math.random() * 450),
              uploadedAt: new Date().toLocaleString(),
              uploadedBy: entryTechnician
            };
            updated.attachedFiles = [newFile, ...updated.attachedFiles];
          }

          return updated;
        }
        return rec;
      })
    );

    setEntrySuccessMessage(`Test report for Job #${entryJobNo} (${entryColor}) successfully recorded! Delivery Gate updated.`);
    setUploadedFileName('');
    setTimeout(() => setEntrySuccessMessage(''), 5000);
  };

  // Reset to Factory Default Data
  const handleResetDefaults = () => {
    setMasterRecords(INITIAL_MASTER_RECORDS);
    setPlanningRequests(INITIAL_PLANNING_REQUESTS);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nfl_testing_lab_v2');
      localStorage.removeItem('nfl_lab_requests_v2');
    }
    setEntrySuccessMessage('Lab data reset to standard factory default records.');
    setTimeout(() => setEntrySuccessMessage(''), 4000);
  };

  function openFailedTestsDrill(ev: React.MouseEvent, label: string) {
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const testKeys: Array<{ key: keyof LabJobMasterRecord; label: string }> = [
      { key: 'dimensionalStability', label: 'Dimensional Stability' },
      { key: 'washTest5x', label: '5-Time Wash' },
      { key: 'rubbingFastness', label: 'Rubbing Fastness' },
      { key: 'perspirationFastness', label: 'Perspiration Fastness' },
      { key: 'salivaFastness', label: 'Saliva Fastness' },
      { key: 'pillingStretch', label: 'Pilling / Stretch' },
      { key: 'garmentAccessories', label: 'Accessories Pull' },
    ];
    const byType = new Map<string, { count: number; jobs: Set<string> }>();
    const byBuyer = new Map<string, { count: number; jobs: Set<string> }>();
    for (const r of masterRecords) {
      let rowFailed = false;
      for (const tk of testKeys) {
        const evObj = r[tk.key] as SingleTestEvaluation;
        if (evObj && (evObj.status === 'FAIL' || evObj.status === 'TEST_RUNNING')) {
          const cur = byType.get(tk.label) || { count: 0, jobs: new Set<string>() };
          cur.count += 1;
          cur.jobs.add(r.jobNo);
          byType.set(tk.label, cur);
          rowFailed = true;
        }
      }
      if (rowFailed || r.deliveryGate === 'BLOCKED') {
        const bc = byBuyer.get(r.buyer) || { count: 0, jobs: new Set<string>() };
        bc.count += 1;
        bc.jobs.add(r.jobNo);
        byBuyer.set(r.buyer, bc);
      }
    }

    const typeSlices = Array.from(byType.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([k, v]) => ({
        key: k,
        label: k,
        value: v.count,
        jobs: v.jobs.size,
        filterValue: k,
      }));
    const buyerSlices = Array.from(byBuyer.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([k, v]) => ({
        key: k,
        label: k,
        value: v.count,
        jobs: v.jobs.size,
        filterValue: k,
      }));

    setDrillTarget({
      title: `Testing Lab — ${label}`,
      subtitle: 'Failed / Running tests by Test Type, then Buyer (Sorted Bar)',
      anchorRect: rect,
      sourceFilter: { field: 'deliveryGate', value: 'BLOCKED', label },
      breakdowns: [
        {
          dimension: 'reason',
          label: 'By Test Type',
          chart: 'bar',
          unit: 'pcs',
          color: 'red',
          filterField: 'testType',
          slices: typeSlices,
        },
        {
          dimension: 'buyer',
          label: 'By Buyer',
          chart: 'bar',
          unit: 'pcs',
          color: 'red',
          filterField: 'buyer',
          slices: buyerSlices,
        },
      ],
    });
  }

  // Helper Badge Renderer for Individual Test
  const renderTestBadge = (t: SingleTestEvaluation) => {
    if (t.status === 'NOT_APPLICABLE') {
      return (
        <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
          <span style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>N/A</span>
        </div>
      );
    }
    if (t.status === 'FABRIC_NOT_READY') {
      return (
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, background: '#F1F5F9', color: '#64748B', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>
            Not Ready
          </span>
          <div style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: 2 }}>Sample Due</div>
        </div>
      );
    }
    if (t.status === 'TEST_RUNNING') {
      return (
        <div>
          <span style={{ fontSize: '11px', fontWeight: 750, background: '#FEF3C7', color: '#B45309', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>
            Running
          </span>
          <div style={{ fontSize: '10.5px', color: '#B45309', marginTop: 2 }}>In Chamber</div>
        </div>
      );
    }
    if (t.status === 'FAIL') {
      return (
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, background: '#FEE2E2', color: '#B91C1C', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>
            FAIL
          </span>
          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#DC2626', marginTop: 2 }}>
            Score: {t.score.toFixed(1)}
          </div>
        </div>
      );
    }
    return (
      <div>
        <span style={{ fontSize: '11px', fontWeight: 800, background: '#DCFCE7', color: '#15803D', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>
          PASS
        </span>
        <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#166534', marginTop: 2 }}>
          Score: {t.score.toFixed(1)}
        </div>
      </div>
    );
  };

  return (
    <Shell title="Testing Lab">
      {/* =========================================================================
          SINGLE TOP SUB-MENU BAR (Task D2)
         ========================================================================= */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('REGISTER')}
            style={{
              padding: '8px 18px',
              fontSize: 13.5,
              fontWeight: 800,
              borderRadius: 7,
              border: activeTab === 'REGISTER' ? '1px solid #0F274E' : '1px solid #E2E8F0',
              background: activeTab === 'REGISTER' ? '#0F274E' : '#F8FAFC',
              color: activeTab === 'REGISTER' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <FlaskConical size={16} color={activeTab === 'REGISTER' ? '#A4D92C' : '#64748B'} />
            1. Master Test Report Register ({masterRecords.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('REQUESTS')}
            style={{
              padding: '8px 18px',
              fontSize: 13.5,
              fontWeight: 800,
              borderRadius: 7,
              border: activeTab === 'REQUESTS' ? '1px solid #0F274E' : '1px solid #E2E8F0',
              background: activeTab === 'REQUESTS' ? '#0F274E' : '#F8FAFC',
              color: activeTab === 'REQUESTS' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Layers size={16} color={activeTab === 'REQUESTS' ? '#A4D92C' : '#64748B'} />
            2. Requests &amp; Acceptance ({kpis.pendingReqCount} Pending)
            {kpis.pendingReqCount > 0 && (
              <span style={{ background: '#DC2626', color: '#FFF', fontSize: 11, padding: '1px 6px', borderRadius: 999, fontWeight: 800 }}>
                {kpis.pendingReqCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ENTRY')}
            style={{
              padding: '8px 18px',
              fontSize: 13.5,
              fontWeight: 800,
              borderRadius: 7,
              border: activeTab === 'ENTRY' ? '1px solid #0F274E' : '1px solid #E2E8F0',
              background: activeTab === 'ENTRY' ? '#0F274E' : '#F8FAFC',
              color: activeTab === 'ENTRY' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <UploadCloud size={16} color={activeTab === 'ENTRY' ? '#A4D92C' : '#64748B'} />
            3. Test Report Entry &amp; Certificate Upload
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleResetDefaults}
            style={{ fontSize: 12, fontWeight: 700, padding: '8px 12px', background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#475569', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Reset data to default factory records"
          >
            <RefreshCw size={13} /> Defaults
          </button>
        </div>
      </div>

      <ActiveFiltersBar />

      {/* =========================================================================
          KEY KPI CARDS (DOUBLE-CLICK TO DRILL DOWN)
         ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 16 }}>
        <div
          onDoubleClick={(e) => openFailedTestsDrill(e, 'Total Lab Jobs')}
          title="Double-click to drill down by Test Type & Buyer"
          style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #0284C7', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}
        >
          <div style={{ fontSize: 11.5, fontWeight: 750, color: '#64748B', textTransform: 'uppercase' }}>Total Lab Jobs</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', marginTop: 2 }}>{kpis.total} <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>batches</span></div>
          <div style={{ fontSize: 11.5, color: '#64748B' }}>Under laboratory evaluation</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #F59E0B', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 750, color: '#B45309', textTransform: 'uppercase' }}>Planning Requests</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#B45309', marginTop: 2 }}>{kpis.pendingReqCount} <span style={{ fontSize: 12, fontWeight: 600 }}>to accept</span></div>
          <div style={{ fontSize: 11.5, color: '#B45309' }}>Fabric T&amp;A order requisitions</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #16A34A', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 750, color: '#166534', textTransform: 'uppercase' }}>Delivery Cleared</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#15803D', marginTop: 2 }}>{kpis.cleared} <span style={{ fontSize: 12, fontWeight: 600 }}>({kpis.clearanceRate}%)</span></div>
          <div style={{ fontSize: 11.5, color: '#166534' }}>Unlocked for store delivery</div>
        </div>

        <div
          onDoubleClick={(e) => openFailedTestsDrill(e, 'Failed / Blocked Tests')}
          title="Double-click to drill down Failed Tests by Test Type & Buyer"
          style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #DC2626', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}
        >
          <div style={{ fontSize: 11.5, fontWeight: 750, color: '#991B1B', textTransform: 'uppercase' }}>Delivery Blocked (Failed)</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#DC2626', marginTop: 2 }}>{kpis.blocked} <span style={{ fontSize: 12, fontWeight: 600 }}>batches</span></div>
          <div style={{ fontSize: 11.5, color: '#991B1B' }}>Double-click for Test Type breakdown</div>
        </div>

        <div
          onDoubleClick={(e) => openFailedTestsDrill(e, 'In-Testing Chamber')}
          title="Double-click to drill down by Test Type & Buyer"
          style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #6366F1', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}
        >
          <div style={{ fontSize: 11.5, fontWeight: 750, color: '#4338CA', textTransform: 'uppercase' }}>In-Testing Chamber</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#4338CA', marginTop: 2 }}>{kpis.pending} <span style={{ fontSize: 12, fontWeight: 600 }}>running</span></div>
          <div style={{ fontSize: 11.5, color: '#4338CA' }}>Oven / Crockmeter / Wash cycles</div>
        </div>
      </div>

      <DrillPopup
        target={drillTarget}
        onClose={() => setDrillTarget(null)}
        onShowInTable={(f) => {
          setActiveTab('REGISTER');
          setSearchQuery(f.value);
          setDrillTarget(null);
        }}
      />

      {/* =========================================================================
          TAB 1: MASTER TEST REPORT REGISTER
         ========================================================================= */}
      {activeTab === 'REGISTER' && (
        <>
          {/* FILTER TOOLBAR */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', fontSize: 12, fontWeight: 750 }}>
                <Filter size={14} /> FILTERS:
              </div>

              {/* Buyer Filter */}
              <select
                value={selectedBuyer}
                onChange={e => setSelectedBuyer(e.target.value)}
                style={{ fontSize: 12.5, fontWeight: 700, padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#1E293B', outline: 'none' }}
              >
                <option value="ALL">All Buyers</option>
                {buyersList.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {/* Merchandiser Filter */}
              <select
                value={selectedMerchandiser}
                onChange={e => setSelectedMerchandiser(e.target.value)}
                style={{ fontSize: 12.5, fontWeight: 700, padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#1E293B', outline: 'none' }}
              >
                <option value="ALL">All Merchandisers</option>
                {merchandisersList.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              {/* Delivery Gate Filter */}
              <select
                value={selectedGateStatus}
                onChange={e => setSelectedGateStatus(e.target.value)}
                style={{ fontSize: 12.5, fontWeight: 700, padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#1E293B', outline: 'none' }}
              >
                <option value="ALL">All Gate Statuses</option>
                <option value="CLEARED">✅ Delivery Cleared (Pass)</option>
                <option value="BLOCKED">⛔ Delivery Blocked (Fail)</option>
                <option value="PENDING">⏳ In-Testing / Pending</option>
              </select>

              {/* Month Filter */}
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                style={{ fontSize: 12.5, fontWeight: 700, padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#1E293B', outline: 'none' }}
              >
                <option value="ALL">All Plan Months</option>
                <option value="Aug 2026">Aug 2026</option>
                <option value="Sep 2026">Sep 2026</option>
                <option value="Oct 2026">Oct 2026</option>
              </select>
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: 10 }} />
              <input
                type="text"
                placeholder="Search Job #, Buyer, Style, Color..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ fontSize: 12.5, padding: '6px 12px 6px 30px', borderRadius: 6, border: '1px solid #CBD5E1', width: 230, outline: 'none' }}
              />
            </div>
          </div>

          {/* MASTER REGISTER TABLE */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A' }}>
                Job-Wise Fabric Test Evaluations &amp; Clearance Gate ({filteredRecords.length} jobs)
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                *Click any row or &quot;View Reports&quot; to inspect full buyer certificate &amp; download PDF/Excel
              </div>
            </div>

            <DataGrid<LabJobMasterRecord>
              storageKey="testing-lab-master-register"
              exportName="testing-lab-master-register"
              rows={filteredRecords}
              frozenColumns={2}
              rowKey={(r) => r.id}
              selectedRowKey={panelLabId}
              onRowClick={(r) => setPanelLabId(r.id)}
              columns={[
                {
                  key: 'buyerJob',
                  header: 'Buyer & Job No',
                  width: 155,
                  value: (r) => `${r.buyer} ${r.jobNo} ${r.batchNo}`,
                  render: (r) => (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 800, color: '#0F274E' }}>{r.buyer}</span>
                        <span style={{ color: '#64748B' }}>·</span>
                        <span style={{ fontWeight: 800, color: '#2563EB' }}>#{r.jobNo}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                        Batch: {r.batchNo} · {r.merchandiser}
                      </div>
                    </div>
                  )
                },
                {
                  key: 'styleItem',
                  header: 'Style & Fabric Item',
                  width: 170,
                  value: (r) => `${r.styleNo} ${r.item} ${r.fabricType}`,
                  render: (r) => (
                    <div>
                      <div style={{ fontWeight: 750, color: '#1E293B' }}>{r.styleNo}</div>
                      <div style={{ fontSize: 11.5, color: '#64748B' }}>{r.item}</div>
                      <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>{r.fabricType}</div>
                    </div>
                  )
                },
                {
                  key: 'color',
                  header: 'Color & Lot Qty',
                  width: 135,
                  numeric: true,
                  total: true,
                  unit: 'kg',
                  value: (r) => r.lotQtyKg,
                  render: (r) => (
                    <div>
                      <div style={{ fontWeight: 750, color: '#0F172A' }}>{r.color}</div>
                      <div style={{ fontSize: 11.5, color: '#15803D', fontWeight: 700 }}>{fmtNum(r.lotQtyKg)} kg</div>
                    </div>
                  )
                },
                {
                  key: 'deliveryGate',
                  header: 'Delivery Gate',
                  width: 130,
                  value: (r) => r.deliveryGate,
                  render: (r) => {
                    const isCleared = r.deliveryGate === 'CLEARED';
                    const isBlocked = r.deliveryGate === 'BLOCKED';
                    if (isCleared) {
                      return (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', padding: '4px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 800 }}>
                          <Unlock size={13} /> CLEARED
                        </div>
                      );
                    }
                    if (isBlocked) {
                      return (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5', padding: '4px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 800 }}>
                          <Lock size={13} /> BLOCKED
                        </div>
                      );
                    }
                    return (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '4px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 800 }}>
                        <Clock size={13} /> PENDING
                      </div>
                    );
                  }
                },
                {
                  key: 'dimensionalStability',
                  header: 'Dimensional Stability',
                  width: 145,
                  value: (r) => r.dimensionalStability.status,
                  render: (r) => renderTestBadge(r.dimensionalStability)
                },
                {
                  key: 'washTest5x',
                  header: '5-Time Wash',
                  width: 125,
                  value: (r) => r.washTest5x.status,
                  render: (r) => renderTestBadge(r.washTest5x)
                },
                {
                  key: 'rubbingFastness',
                  header: 'Rubbing Fastness',
                  width: 135,
                  value: (r) => r.rubbingFastness.status,
                  render: (r) => renderTestBadge(r.rubbingFastness)
                },
                {
                  key: 'perspirationFastness',
                  header: 'Perspiration',
                  width: 125,
                  value: (r) => r.perspirationFastness.status,
                  render: (r) => renderTestBadge(r.perspirationFastness)
                },
                {
                  key: 'salivaFastness',
                  header: 'Saliva (Kids)',
                  width: 125,
                  value: (r) => r.salivaFastness.status,
                  render: (r) => renderTestBadge(r.salivaFastness)
                },
                {
                  key: 'pillingStretch',
                  header: 'Pilling / Stretch',
                  width: 130,
                  value: (r) => r.pillingStretch.status,
                  render: (r) => renderTestBadge(r.pillingStretch)
                },
                {
                  key: 'garmentAccessories',
                  header: 'Accessories Pull',
                  width: 130,
                  value: (r) => r.garmentAccessories.status,
                  render: (r) => renderTestBadge(r.garmentAccessories)
                },
                {
                  key: 'certificates',
                  header: 'Certificates',
                  width: 110,
                  filterable: false,
                  value: (r) => r.attachedFiles.length,
                  render: (r) => (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedModalRecord(r);
                      }}
                      style={{
                        fontSize: 11.5,
                        fontWeight: 750,
                        padding: '5px 10px',
                        borderRadius: 6,
                        background: r.attachedFiles.length > 0 ? '#EFF6FF' : '#F8FAFC',
                        border: r.attachedFiles.length > 0 ? '1px solid #93C5FD' : '1px solid #CBD5E1',
                        color: r.attachedFiles.length > 0 ? '#1D4ED8' : '#475569',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <FileText size={13} />
                      {r.attachedFiles.length > 0 ? `${r.attachedFiles.length} Files` : 'Cert'}
                    </button>
                  )
                }
              ] satisfies GridColumn<LabJobMasterRecord>[]}
            />
          </div>
        </>
      )}

      {/* =========================================================================
          TAB 2: PLANNING REQUESTS & ACCEPTANCE
         ========================================================================= */}
      {activeTab === 'REQUESTS' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', margin: 0 }}>
                Incoming Central Planning Requisitions (Fabric Order Sheet &amp; T&amp;A Approvals)
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>
                Whenever Planning releases a Fabric Order Sheet or approves T&amp;A, a test requisition is transmitted here. Review the job, select all target colors, and configure the mandatory laboratory test protocol.
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead style={{ background: '#F1F5F9' }}>
                <tr style={{ borderBottom: '2px solid #CBD5E1', color: '#334155' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Req # / Date</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Job &amp; Buyer</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Style &amp; Item</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Fabric Specifications</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Colors Required</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Order Qty</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Delivery Deadline</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'center' }}>Status &amp; Action</th>
                </tr>
              </thead>
              <tbody>
                {planningRequests.map((req, idx) => {
                  const isPending = req.status === 'PENDING_ACCEPTANCE';
                  return (
                    <tr key={req.id} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontWeight: 800, color: '#0F274E' }}>{req.id}</span>
                        <div style={{ fontSize: 11.5, color: '#64748B' }}>T&amp;A: {req.tnaApprovedAt}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>Job #{req.jobNo}</div>
                        <div style={{ fontSize: 11.5, color: '#2563EB', fontWeight: 700 }}>{req.buyer}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 750, color: '#1E293B' }}>{req.styleNo}</div>
                        <div style={{ fontSize: 11.5, color: '#64748B' }}>{req.item}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontSize: 12.5, color: '#334155' }}>{req.fabricDescription}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {req.colors.map(c => (
                            <span key={c} style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', padding: '2px 7px', borderRadius: 4, fontSize: 11.5, fontWeight: 700 }}>
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 750, color: '#0F172A' }}>
                        {req.totalQtyKg.toLocaleString()} kg
                      </td>
                      <td style={{ padding: '10px 12px', color: '#B45309', fontWeight: 700 }}>
                        {req.targetDeliveryDate}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAcceptModal(req)}
                            style={{
                              fontSize: 12.5,
                              fontWeight: 800,
                              padding: '6px 14px',
                              background: '#15803D',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <Check size={14} /> Accept &amp; Map Tests
                          </button>
                        ) : (
                          <span style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 800 }}>
                            ✓ Accepted &amp; Queued
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

      {/* =========================================================================
          TAB 3: TEST REPORT ENTRY & CERTIFICATE UPLOAD
         ========================================================================= */}
      {activeTab === 'ENTRY' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
          {/* Left Form: Entry Data */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '20px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', marginTop: 0, marginBottom: 4 }}>
              Log Laboratory Test Evaluation &amp; Enforce Delivery Gate
            </h2>
            <p style={{ fontSize: 12.5, color: '#64748B', marginBottom: 16 }}>
              Select the Job and Color, select the specific test being evaluated, enter the quantitative observed score and pass/fail verdict. The ERP will automatically update the fabric delivery clearance gate.
            </p>

            {entrySuccessMessage && (
              <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#15803D', padding: '10px 14px', borderRadius: 6, fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} /> {entrySuccessMessage}
              </div>
            )}

            <form onSubmit={handleSaveEntry}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                {/* Job Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                    Job Number *
                  </label>
                  <select
                    value={entryJobNo}
                    onChange={e => setEntryJobNo(e.target.value)}
                    style={{ width: '100%', fontSize: 13, fontWeight: 700, padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC' }}
                  >
                    {masterRecords.map(r => (
                      <option key={r.id} value={r.jobNo}>
                        Job #{r.jobNo} ({r.buyer} - {r.styleNo})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                    Color Selection *
                  </label>
                  <select
                    value={entryColor}
                    onChange={e => setEntryColor(e.target.value)}
                    style={{ width: '100%', fontSize: 13, fontWeight: 700, padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC' }}
                  >
                    {availableEntryColors.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Test Type Selection */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                  Test Being Evaluated *
                </label>
                <select
                  value={entryTestType}
                  onChange={e => {
                    setEntryTestType(e.target.value);
                    if (e.target.value === 'dimensionalStability') {
                      setEntrySpec('Length: ±5.0%, Width: ±5.0%, Spirality < 4.0%');
                      setEntryObserved('Length -2.6%, Width -2.2%, Spirality 1.9%');
                    } else if (e.target.value === 'washTest5x') {
                      setEntrySpec('Min Grade 4.0 appearance after 5 home washes');
                      setEntryObserved('Grade 4.5 (No seam torque or pilling)');
                    } else if (e.target.value === 'rubbingFastness') {
                      setEntrySpec('Dry: Min 4.0 | Wet: Min 3.0');
                      setEntryObserved('Dry 4.5, Wet 3.5');
                    } else if (e.target.value === 'perspirationFastness') {
                      setEntrySpec('Acidic & Alkaline: Min 4.0');
                      setEntryObserved('Acid: 4.5, Alkaline: 4.5');
                    } else if (e.target.value === 'salivaFastness') {
                      setEntrySpec('Grade 5.0 (Strict No Bleed for Babywear)');
                      setEntryObserved('Grade 5.0');
                    } else if (e.target.value === 'pillingStretch') {
                      setEntrySpec('Martindale: Min Grade 4.0 at 2000 cycles');
                      setEntryObserved('Grade 4.5 (Biopolished finish)');
                    } else if (e.target.value === 'garmentAccessories') {
                      setEntrySpec('Holding force > 90 N for 10 seconds');
                      setEntryObserved('Button Holding 110 N (Passed)');
                    }
                  }}
                  style={{ width: '100%', fontSize: 13, fontWeight: 700, padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC' }}
                >
                  <option value="dimensionalStability">Dimensional Stability (Shrinkage &amp; Spirality - ISO 6330)</option>
                  <option value="washTest5x">5-Time Home Wash Test (Appearance &amp; Torque - ISO 6330)</option>
                  <option value="rubbingFastness">Color Fastness to Rubbing / Crocking (Dry &amp; Wet - ISO 105-X12)</option>
                  <option value="perspirationFastness">Color Fastness to Perspiration (Acid &amp; Alkaline - ISO 105-E04)</option>
                  <option value="salivaFastness">Color Fastness to Saliva (Babywear DIN 53160-1)</option>
                  <option value="pillingStretch">Pilling Resistance &amp; Stretch Recovery (ISO 12945-2 / ASTM D2594)</option>
                  <option value="garmentAccessories">Garments Accessories Pull Test (Button / Zipper - ASTM D4846)</option>
                </select>
              </div>

              {/* Required Spec vs Observed */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                    Buyer Required Spec
                  </label>
                  <input
                    type="text"
                    value={entrySpec}
                    onChange={e => setEntrySpec(e.target.value)}
                    style={{ width: '100%', fontSize: 12.5, padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                    Actual Observed Reading / Result *
                  </label>
                  <input
                    type="text"
                    value={entryObserved}
                    onChange={e => setEntryObserved(e.target.value)}
                    style={{ width: '100%', fontSize: 12.5, fontWeight: 700, padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>

              {/* Status & Numeric Score */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                    Evaluation Verdict *
                  </label>
                  <select
                    value={entryStatus}
                    onChange={e => setEntryStatus(e.target.value as TestStatus)}
                    style={{
                      width: '100%',
                      fontSize: 13,
                      fontWeight: 800,
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: entryStatus === 'PASS' ? '1px solid #16A34A' : entryStatus === 'FAIL' ? '1px solid #DC2626' : '1px solid #CBD5E1',
                      background: entryStatus === 'PASS' ? '#F0FDF4' : entryStatus === 'FAIL' ? '#FEF2F2' : '#FFFBEB',
                      color: entryStatus === 'PASS' ? '#15803D' : entryStatus === 'FAIL' ? '#B91C1C' : '#B45309'
                    }}
                  >
                    <option value="PASS">PASS (Delivery Cleared)</option>
                    <option value="FAIL">FAIL (Delivery Blocked - Reprocess)</option>
                    <option value="TEST_RUNNING">TEST RUNNING (Incubator/Wash Chamber)</option>
                    <option value="FABRIC_NOT_READY">FABRIC NOT READY (Waiting sample roll)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                    Numeric Score / Gray Scale Grade (1.0 to 5.0)
                  </label>
                  <select
                    value={entryScore}
                    onChange={e => setEntryScore(parseFloat(e.target.value))}
                    style={{ width: '100%', fontSize: 13, fontWeight: 750, padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC' }}
                  >
                    <option value={5.0}>Grade 5.0 (Excellent / Zero Bleed)</option>
                    <option value={4.5}>Grade 4.5 (Very Good - Premium Brand Spec)</option>
                    <option value={4.0}>Grade 4.0 (Standard Industrial Pass)</option>
                    <option value={3.5}>Grade 3.5 (Acceptable for Dark Shades / Wet Rub)</option>
                    <option value={3.0}>Grade 3.0 (Borderline / Buyer Conditional)</option>
                    <option value={2.5}>Grade 2.5 (FAIL - Excessive Bleed / Torque)</option>
                    <option value={2.0}>Grade 2.0 (FAIL - Severe Defect)</option>
                    <option value={1.0}>Grade 1.0 (Critical Failure)</option>
                  </select>
                </div>
              </div>

              {/* Chemist & Remarks */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                    Testing Chemist Name
                  </label>
                  <input
                    type="text"
                    value={entryTechnician}
                    onChange={e => setEntryTechnician(e.target.value)}
                    style={{ width: '100%', fontSize: 12.5, padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                    Clearance Remarks
                  </label>
                  <input
                    type="text"
                    value={entryNote}
                    onChange={e => setEntryNote(e.target.value)}
                    style={{ width: '100%', fontSize: 12.5, padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>

              {/* File Attachment Upload Box */}
              <div style={{ border: '2px dashed #CBD5E1', borderRadius: 8, padding: '14px', background: '#F8FAFC', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <UploadCloud size={28} color="#2563EB" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                      Attach Test Certificate / Raw Excel Lab Sheet
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>
                      PDF official certificates or Excel spectrophotometer test sheets
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="e.g. TR-48093-JetBlack-Official-Report.pdf"
                    value={uploadedFileName}
                    onChange={e => setUploadedFileName(e.target.value)}
                    style={{ flex: 1, fontSize: 12, padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1' }}
                  />
                  <select
                    value={uploadedFileType}
                    onChange={e => setUploadedFileType(e.target.value as any)}
                    style={{ fontSize: 12, fontWeight: 700, padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFFFFF' }}
                  >
                    <option value="PDF">PDF Report</option>
                    <option value="EXCEL">Excel Sheet (.xlsx)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!uploadedFileName) {
                        setUploadedFileName(`Report-${entryJobNo}-${entryColor.replace(/\s+/g, '_')}.${uploadedFileType === 'PDF' ? 'pdf' : 'xlsx'}`);
                      }
                    }}
                    style={{ fontSize: 11.5, fontWeight: 700, padding: '6px 10px', background: '#E2E8F0', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                  >
                    Auto-Name
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: entryStatus === 'FAIL' ? '#B91C1C' : '#0F274E',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 800,
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'background 0.2s'
                }}
              >
                <ShieldCheck size={18} color="#A4D92C" />
                Save Test Result &amp; Enforce Delivery Gate Rule
              </button>
            </form>
          </div>

          {/* Right Panel: Delivery Gate Rules & Testing Guidelines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Real-time Impact Box */}
            <div style={{ background: entryStatus === 'FAIL' ? '#FEF2F2' : entryStatus === 'PASS' ? '#F0FDF4' : '#FFFBEB', border: entryStatus === 'FAIL' ? '1px solid #FCA5A5' : entryStatus === 'PASS' ? '1px solid #86EFAC' : '1px solid #FDE68A', borderRadius: 8, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {entryStatus === 'FAIL' ? (
                  <Lock size={18} color="#DC2626" />
                ) : entryStatus === 'PASS' ? (
                  <Unlock size={18} color="#16A34A" />
                ) : (
                  <Clock size={18} color="#D97706" />
                )}
                <strong style={{ fontSize: 14, color: entryStatus === 'FAIL' ? '#991B1B' : entryStatus === 'PASS' ? '#166534' : '#92400E' }}>
                  {entryStatus === 'FAIL' ? 'DELIVERY GATE WILL BE BLOCKED' : entryStatus === 'PASS' ? 'DELIVERY GATE WILL BE CLEARED' : 'DELIVERY GATE ON HOLD'}
                </strong>
              </div>
              <p style={{ fontSize: 12.5, color: entryStatus === 'FAIL' ? '#7F1D1D' : entryStatus === 'PASS' ? '#14532D' : '#78350F', margin: 0, lineHeight: 1.4 }}>
                {entryStatus === 'FAIL'
                  ? 'If this test is marked as FAIL, the Finished Fabric Store and Dyeing cannot issue even 1 kg of this color! Batch must undergo re-dyeing, re-washing, or fixing chemical stenter treatment.'
                  : entryStatus === 'PASS'
                  ? 'All mandatory tests must pass to unlock delivery. Once fully approved, the Finished Fabric Store is authorized to immediately issue fabric rolls to Cutting.'
                  : 'While test is running or fabric sample is awaiting delivery, the delivery gate remains safely locked.'}
              </p>
            </div>

            {/* Test Protocols Reference */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '16px' }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginTop: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FlaskConical size={15} color="#0284C7" /> Factory Mandatory Standards
              </h3>
              <ul style={{ fontSize: 12, color: '#475569', paddingLeft: 18, margin: 0, lineHeight: 1.6 }}>
                <li><strong>Dimensional Stability:</strong> ISO 6330 (Residual Shrinkage &lt; ±5.0%, Spirality &lt; 4.0%).</li>
                <li><strong>5-Time Home Wash:</strong> ISO 6330 60°C (Appearance retention &gt; Grade 4.0).</li>
                <li><strong>Color Fastness to Rubbing:</strong> ISO 105-X12 (Dry &gt; 4.0, Wet &gt; 3.0 or 3.5).</li>
                <li><strong>Color Fastness to Perspiration:</strong> ISO 105-E04 (Acidic &amp; Alkaline &gt; 4.0).</li>
                <li><strong>Babywear Saliva Fastness:</strong> DIN 53160-1 (Mandatory Grade 5.0 Zero Bleed).</li>
                <li><strong>Pilling Resistance:</strong> ISO 12945-2 (Martindale 2000 revs &gt; Grade 3.5 - 4.0).</li>
                <li><strong>Garment Accessories:</strong> ASTM D4846 / D2061 (Pull force &gt; 90 N for 10s).</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ACCEPT REQUEST & CONFIGURE TEST SUITE
         ========================================================================= */}
      {acceptingRequest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 12, maxWidth: 650, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <span style={{ background: '#EFF6FF', color: '#1E40AF', padding: '3px 8px', borderRadius: 4, fontSize: 11.5, fontWeight: 800 }}>
                  Central Planning Acceptance
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', marginTop: 4, marginBottom: 0 }}>
                  Configure Laboratory Test Suite · Job #{acceptingRequest.jobNo}
                </h3>
                <div style={{ fontSize: 12.5, color: '#64748B' }}>
                  {acceptingRequest.buyer} · Style: {acceptingRequest.styleNo} · {acceptingRequest.item}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAcceptingRequest(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>

            {/* Colors Selection for this job */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1E293B', marginBottom: 6 }}>
                Colors in this Job (Select colors to generate test batches):
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {acceptingRequest.colors.map(col => {
                  const isChecked = selectedColorsForAccept.includes(col);
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          if (selectedColorsForAccept.length > 1) {
                            setSelectedColorsForAccept(selectedColorsForAccept.filter(c => c !== col));
                          }
                        } else {
                          setSelectedColorsForAccept([...selectedColorsForAccept, col]);
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 12.5,
                        fontWeight: 750,
                        border: isChecked ? '1px solid #2563EB' : '1px solid #CBD5E1',
                        background: isChecked ? '#EFF6FF' : '#F8FAFC',
                        color: isChecked ? '#1D4ED8' : '#64748B',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      {isChecked && <Check size={13} />} {col}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Test Protocol Checkboxes */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1E293B', marginBottom: 6 }}>
                Required Test Protocols:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#1E293B' }}>
                  <input
                    type="checkbox"
                    checked={selectedTestsForAccept.dimensional}
                    onChange={e => setSelectedTestsForAccept({ ...selectedTestsForAccept, dimensional: e.target.checked })}
                  />
                  <span><strong>Dimensional Stability</strong> (Shrinkage/Spirality)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#1E293B' }}>
                  <input
                    type="checkbox"
                    checked={selectedTestsForAccept.wash5x}
                    onChange={e => setSelectedTestsForAccept({ ...selectedTestsForAccept, wash5x: e.target.checked })}
                  />
                  <span><strong>5-Time Home Wash Test</strong> (ISO 6330)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#1E293B' }}>
                  <input
                    type="checkbox"
                    checked={selectedTestsForAccept.rubbing}
                    onChange={e => setSelectedTestsForAccept({ ...selectedTestsForAccept, rubbing: e.target.checked })}
                  />
                  <span><strong>Rubbing Fastness</strong> (Dry &amp; Wet Crocking)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#1E293B' }}>
                  <input
                    type="checkbox"
                    checked={selectedTestsForAccept.perspiration}
                    onChange={e => setSelectedTestsForAccept({ ...selectedTestsForAccept, perspiration: e.target.checked })}
                  />
                  <span><strong>Perspiration Fastness</strong> (Acid/Alkaline)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#1E293B' }}>
                  <input
                    type="checkbox"
                    checked={selectedTestsForAccept.saliva}
                    onChange={e => setSelectedTestsForAccept({ ...selectedTestsForAccept, saliva: e.target.checked })}
                  />
                  <span><strong>Saliva Fastness</strong> (Babywear DIN 53160)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#1E293B' }}>
                  <input
                    type="checkbox"
                    checked={selectedTestsForAccept.pilling}
                    onChange={e => setSelectedTestsForAccept({ ...selectedTestsForAccept, pilling: e.target.checked })}
                  />
                  <span><strong>Pilling &amp; Stretch Recovery</strong></span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#1E293B' }}>
                  <input
                    type="checkbox"
                    checked={selectedTestsForAccept.accessories}
                    onChange={e => setSelectedTestsForAccept({ ...selectedTestsForAccept, accessories: e.target.checked })}
                  />
                  <span><strong>Garments Accessories Pull Test</strong> (Button/Zip)</span>
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setAcceptingRequest(null)}
                style={{ padding: '8px 16px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAcceptRequest}
                style={{ padding: '8px 20px', background: '#0F274E', color: '#FFFFFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <CheckCircle2 size={16} color="#A4D92C" /> Confirm Acceptance &amp; Create Test Registers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: CERTIFICATE & DETAILED REPORT INSPECTION
         ========================================================================= */}
      {selectedModalRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 12, maxWidth: 850, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: '#0F274E', color: '#FFFFFF', padding: '3px 8px', borderRadius: 4, fontSize: 11.5, fontWeight: 800 }}>
                    Official Lab Test Dossier
                  </span>
                  <span style={{
                    background: selectedModalRecord.deliveryGate === 'CLEARED' ? '#DCFCE7' : selectedModalRecord.deliveryGate === 'BLOCKED' ? '#FEE2E2' : '#FEF3C7',
                    color: selectedModalRecord.deliveryGate === 'CLEARED' ? '#15803D' : selectedModalRecord.deliveryGate === 'BLOCKED' ? '#B91C1C' : '#B45309',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 11.5,
                    fontWeight: 800
                  }}>
                    {selectedModalRecord.deliveryGate === 'CLEARED' ? 'DELIVERY CLEARED' : selectedModalRecord.deliveryGate === 'BLOCKED' ? 'DELIVERY BLOCKED' : 'DELIVERY PENDING'}
                  </span>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', marginTop: 4, marginBottom: 2 }}>
                  {selectedModalRecord.buyer} · Job #{selectedModalRecord.jobNo} ({selectedModalRecord.color})
                </h2>
                <div style={{ fontSize: 12.5, color: '#64748B' }}>
                  Style: {selectedModalRecord.styleNo} · {selectedModalRecord.item} · Batch: {selectedModalRecord.batchNo} · {selectedModalRecord.lotQtyKg} kg
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedModalRecord(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>

            {/* Clearance Remarks */}
            <div style={{
              background: selectedModalRecord.deliveryGate === 'CLEARED' ? '#F0FDF4' : selectedModalRecord.deliveryGate === 'BLOCKED' ? '#FEF2F2' : '#FFFBEB',
              border: selectedModalRecord.deliveryGate === 'CLEARED' ? '1px solid #BBF7D0' : selectedModalRecord.deliveryGate === 'BLOCKED' ? '1px solid #FECACA' : '1px solid #FDE68A',
              padding: '12px 16px',
              borderRadius: 8,
              marginBottom: 16
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: selectedModalRecord.deliveryGate === 'CLEARED' ? '#166534' : selectedModalRecord.deliveryGate === 'BLOCKED' ? '#991B1B' : '#92400E' }}>
                Delivery Gate Clearance Directive:
              </div>
              <div style={{ fontSize: 13, color: '#1E293B', marginTop: 2 }}>
                {selectedModalRecord.clearanceNote}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 4 }}>
                Lead Approver: <strong>{selectedModalRecord.leadApprover}</strong>
              </div>
            </div>

            {/* Test Breakdown Table */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginTop: 0, marginBottom: 8 }}>
                Quantitative Test Results vs Buyer Specifications:
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                <thead style={{ background: '#F1F5F9' }}>
                  <tr style={{ borderBottom: '2px solid #CBD5E1', color: '#334155' }}>
                    <th style={{ padding: '8px 10px', fontWeight: 800 }}>Test Name</th>
                    <th style={{ padding: '8px 10px', fontWeight: 800 }}>Standard</th>
                    <th style={{ padding: '8px 10px', fontWeight: 800 }}>Buyer Required Spec</th>
                    <th style={{ padding: '8px 10px', fontWeight: 800 }}>Actual Observed</th>
                    <th style={{ padding: '8px 10px', fontWeight: 800, textAlign: 'center' }}>Score</th>
                    <th style={{ padding: '8px 10px', fontWeight: 800, textAlign: 'center' }}>Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Dimensional Stability (Shrinkage & Spirality)', ...selectedModalRecord.dimensionalStability },
                    { name: '5-Time Home Wash Test', ...selectedModalRecord.washTest5x },
                    { name: 'Rubbing Fastness (Dry & Wet)', ...selectedModalRecord.rubbingFastness },
                    { name: 'Perspiration Fastness (Acid & Alk)', ...selectedModalRecord.perspirationFastness },
                    { name: 'Saliva Fastness (Babywear)', ...selectedModalRecord.salivaFastness },
                    { name: 'Pilling & Stretch Recovery', ...selectedModalRecord.pillingStretch },
                    { name: 'Garments Accessories Pull Test', ...selectedModalRecord.garmentAccessories }
                  ].map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0F172A' }}>{item.name}</td>
                      <td style={{ padding: '8px 10px', color: '#64748B' }}>{item.standard || 'ISO/ASTM'}</td>
                      <td style={{ padding: '8px 10px', color: '#475569' }}>{item.requiredSpec}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 750, color: '#1E293B' }}>{item.observedValue}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800 }}>
                        {item.score > 0 ? item.score.toFixed(1) : '-'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {renderTestBadge(item as SingleTestEvaluation)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Attached Certificate Files */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '16px', marginBottom: 16 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileCheck size={16} color="#2563EB" /> Download Official Certificates &amp; Raw Data:
              </div>

              {selectedModalRecord.attachedFiles.length === 0 ? (
                <div style={{ fontSize: 12.5, color: '#64748B', fontStyle: 'italic' }}>
                  No files attached yet. You can attach PDF/Excel sheets via &quot;Test Report Entry &amp; Certificate Upload&quot;.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedModalRecord.attachedFiles.map(file => (
                    <div
                      key={file.id}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: 6,
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {file.type === 'PDF' ? (
                          <FileText size={20} color="#DC2626" />
                        ) : (
                          <FileSpreadsheet size={20} color="#15803D" />
                        )}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 750, color: '#0F172A' }}>{file.name}</div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>
                            {file.sizeKb} KB · Uploaded by {file.uploadedBy} on {file.uploadedAt}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          alert(`Simulating download of: ${file.name}\n(Enterprise certified report generated by NFL Central Laboratory)`);
                        }}
                        style={{
                          fontSize: 12,
                          fontWeight: 750,
                          padding: '6px 12px',
                          background: '#0F274E',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Download size={13} /> Download {file.type}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  padding: '8px 14px',
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Printer size={14} /> Print Certificate
              </button>
              <button
                type="button"
                onClick={() => setSelectedModalRecord(null)}
                style={{
                  fontSize: 12.5,
                  fontWeight: 800,
                  padding: '8px 20px',
                  background: '#0F274E',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RecordPanel for row click */}
      {(() => {
        const idx = filteredRecords.findIndex((r) => r.id === panelLabId);
        const rec = idx >= 0 ? filteredRecords[idx] : null;
        return (
          <RecordPanel
            open={!!rec}
            onClose={() => setPanelLabId(null)}
            title={rec ? `Job #${rec.jobNo} · ${rec.color}` : ''}
            subtitle={rec ? `${rec.buyer} · Style ${rec.styleNo} · Batch ${rec.batchNo}` : undefined}
            onPrev={idx > 0 ? () => setPanelLabId(filteredRecords[idx - 1].id) : undefined}
            onNext={idx >= 0 && idx < filteredRecords.length - 1 ? () => setPanelLabId(filteredRecords[idx + 1].id) : undefined}
            sections={
              rec
                ? [
                    {
                      name: 'Job & Batch Information',
                      fields: [
                        { key: 'jobNo', label: 'Job No', value: rec.jobNo, readOnly: true },
                        { key: 'buyer', label: 'Buyer', value: rec.buyer, readOnly: true },
                        { key: 'styleNo', label: 'Style No', value: rec.styleNo, readOnly: true },
                        { key: 'color', label: 'Color', value: rec.color, readOnly: true },
                        { key: 'batchNo', label: 'Batch No', value: rec.batchNo },
                        { key: 'lotQtyKg', label: 'Lot Quantity', value: rec.lotQtyKg, type: 'number', unit: 'kg', required: true },
                        { key: 'targetDeliveryDate', label: 'Target Delivery Date', value: rec.targetDeliveryDate, type: 'date' },
                        { key: 'merchandiser', label: 'Merchandiser', value: rec.merchandiser, setByRole: 'Merchandiser' }
                      ]
                    },
                    {
                      name: 'Laboratory Delivery Gate & Sign-off',
                      fields: [
                        {
                          key: 'deliveryGate',
                          label: 'Delivery Gate Status',
                          value: rec.deliveryGate,
                          type: 'select',
                          options: [
                            { value: 'CLEARED', label: 'CLEARED' },
                            { value: 'PENDING', label: 'PENDING' },
                            { value: 'BLOCKED', label: 'BLOCKED' }
                          ]
                        },
                        { key: 'leadApprover', label: 'Lead Approver', value: rec.leadApprover },
                        { key: 'clearanceNote', label: 'Clearance & Test Remarks', value: rec.clearanceNote, type: 'textarea', fullWidth: true }
                      ]
                    }
                  ]
                : []
            }
            onSave={(vals) => {
              if (!rec) return;
              const updated: LabJobMasterRecord = {
                ...rec,
                batchNo: String(vals.batchNo ?? rec.batchNo),
                lotQtyKg: Number(vals.lotQtyKg ?? rec.lotQtyKg),
                targetDeliveryDate: String(vals.targetDeliveryDate ?? rec.targetDeliveryDate),
                deliveryGate: (vals.deliveryGate as LabJobMasterRecord['deliveryGate']) ?? rec.deliveryGate,
                leadApprover: String(vals.leadApprover ?? rec.leadApprover),
                clearanceNote: String(vals.clearanceNote ?? rec.clearanceNote),
              };
              setMasterRecords((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
            }}
          />
        );
      })()}
    </Shell>
  );
}
