'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';
import {
  Palette,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Filter,
  FileText,
  Download,
  UploadCloud,
  Printer,
  ChevronDown,
  Check,
  Calendar,
  Layers,
  ShieldAlert,
  Flame,
  FileCheck
} from 'lucide-react';

// ============================================================================
// DATA STRUCTURES
// ============================================================================

export type LabDipStage = 'SMS_SAMPLE' | 'BULK_PENDING' | 'BULK_APPROVED';
export type LabDipStatus = 'APPROVED' | 'PENDING_BUYER' | 'RE_DIP_REQUIRED' | 'IN_FORMULATION' | 'SUBMITTED';

export interface AttachedDyeingFile {
  id: string;
  name: string;
  type: 'PDF' | 'EXCEL' | 'IMAGE';
  sizeKb: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface LabDipMasterRecord {
  id: string;
  dipNo: string;
  jobNo: string;
  buyer: string;
  buyerCode: string;
  styleNo: string;
  item: string;
  fabricType: string;
  colorName: string;
  pantoneRef: string;
  stage: LabDipStage;
  optionCode: 'A' | 'B' | 'C' | 'D' | 'R1' | 'R2';
  recipe: string;
  dyestuffFamily: string; // Reactive, Disperse, Acid, Direct, Sulphur
  deltaE: number;
  d65Match: string;
  tl84Match: string;
  cwfMatch: string;
  status: LabDipStatus;
  submissionDate: string;
  feedbackDate?: string;
  technician: string;
  merchandiser: string;
  comments: string;

  // 10-Day In-House Dyeing Machine Loading Follow-up
  inTenDayLoadingPlan: boolean;
  scheduledMachine?: string; // MC-04, MC-06, etc.
  scheduledDyeingDate?: string;
  daysToMachineLoading?: number;

  attachedFiles: AttachedDyeingFile[];
}

export interface IncomingLabDipRequest {
  id: string;
  jobNo: string;
  buyer: string;
  styleNo: string;
  item: string;
  fabricDescription: string;
  colors: string[];
  stageType: 'SMS_COLLECTION' | 'BULK_ORDER_CONFIRMED';
  tnaOrSmsApprovedAt: string;
  targetSubmissionDate: string;
  merchandiser: string;
  status: 'PENDING_ACCEPTANCE' | 'ACCEPTED';
  inTenDayLoadingPlan: boolean;
  scheduledMachine?: string;
  scheduledDyeingDate?: string;
}

// ============================================================================
// INITIAL SEED DATA
// ============================================================================

const INITIAL_INCOMING_REQUESTS: IncomingLabDipRequest[] = [
  {
    id: 'REQ-DIP-2026-01',
    jobNo: '48093',
    buyer: 'ONLY',
    styleNo: '22041',
    item: 'Crew Neck T-Shirt',
    fabricDescription: '100% Combed Cotton Single Jersey 180 GSM',
    colors: ['Jet Black', 'Bright White', 'Sage Fog'],
    stageType: 'BULK_ORDER_CONFIRMED',
    tnaOrSmsApprovedAt: '2026-08-28',
    targetSubmissionDate: '2026-09-04',
    merchandiser: 'Shakil',
    status: 'PENDING_ACCEPTANCE',
    inTenDayLoadingPlan: true,
    scheduledMachine: 'MC-04 (525 KG)',
    scheduledDyeingDate: '2026-09-08'
  },
  {
    id: 'REQ-DIP-2026-02',
    jobNo: '47812',
    buyer: 'Name It',
    styleNo: '13251509',
    item: 'Baby Rib Romper',
    fabricDescription: '100% Organic Cotton Rib 1x1 200 GSM',
    colors: ['Soft Mint', 'Buttercup Yellow'],
    stageType: 'SMS_COLLECTION',
    tnaOrSmsApprovedAt: '2026-08-29',
    targetSubmissionDate: '2026-09-06',
    merchandiser: 'Shamoly',
    status: 'PENDING_ACCEPTANCE',
    inTenDayLoadingPlan: false
  },
  {
    id: 'REQ-DIP-2026-03',
    jobNo: '46748',
    buyer: 'ONL',
    styleNo: '15244714',
    item: 'High Stretch Legging',
    fabricDescription: '95% Cotton / 5% Lycra Single Jersey 210 GSM',
    colors: ['Pink Anise', 'Deep Navy'],
    stageType: 'BULK_ORDER_CONFIRMED',
    tnaOrSmsApprovedAt: '2026-08-30',
    targetSubmissionDate: '2026-09-07',
    merchandiser: 'Imran',
    status: 'PENDING_ACCEPTANCE',
    inTenDayLoadingPlan: true,
    scheduledMachine: 'MC-06 (1050 KG)',
    scheduledDyeingDate: '2026-09-12'
  }
];

const INITIAL_MASTER_RECORDS: LabDipMasterRecord[] = [
  {
    id: 'DIP-2026-001',
    dipNo: 'LD-48085-01',
    jobNo: '48085',
    buyer: 'BS-NMT',
    buyerCode: 'NMT',
    styleNo: '13251506',
    item: 'Lace Matching Top',
    fabricType: '4x1 Rib with Lurex 200 GSM',
    colorName: 'Nosegay Pink',
    pantoneRef: 'TCX 14-1911',
    stage: 'SMS_SAMPLE',
    optionCode: 'A',
    recipe: 'Novacron Red FN-2BL (0.42%) + Yellow FN-2R (0.12%)',
    dyestuffFamily: 'Reactive (Bi-functional)',
    deltaE: 0.42,
    d65Match: 'Grade 4.5',
    tl84Match: 'Grade 4.5',
    cwfMatch: 'Grade 4.0',
    status: 'APPROVED',
    submissionDate: '2026-08-01',
    feedbackDate: '2026-08-04',
    technician: 'S. K. Paul (Dyeing Chemist)',
    merchandiser: 'Shamoly',
    comments: 'Buyer confirmed Option A for SMS & Bulk master standard. Stenter temperature lock approved.',
    inTenDayLoadingPlan: true,
    scheduledMachine: 'MC-06 (1050 KG)',
    scheduledDyeingDate: '2026-09-15',
    daysToMachineLoading: 6,
    attachedFiles: [
      {
        id: 'DATT-01',
        name: 'LD-48085-OptionA-BuyerApproval.pdf',
        type: 'PDF',
        sizeKb: 285,
        uploadedAt: '2026-08-04 16:30',
        uploadedBy: 'Shamoly (Merchandiser)'
      },
      {
        id: 'DATT-02',
        name: 'Datacolor_Spectra_48085_OptionA.xlsx',
        type: 'EXCEL',
        sizeKb: 142,
        uploadedAt: '2026-08-04 16:35',
        uploadedBy: 'S. K. Paul'
      }
    ]
  },
  {
    id: 'DIP-2026-002',
    dipNo: 'LD-48002-02',
    jobNo: '48002',
    buyer: 'ONLY',
    buyerCode: 'ONLY',
    styleNo: '13251512',
    item: 'Basic V-Neck Tee',
    fabricType: '100% Combed Cotton 160 GSM',
    colorName: 'Estate Blue',
    pantoneRef: 'TCX 19-4027',
    stage: 'BULK_PENDING',
    optionCode: 'B',
    recipe: 'Remazol Navy RGB (1.85%) + Blue RGB (0.64%)',
    dyestuffFamily: 'Vinyl Sulphone Reactive',
    deltaE: 0.78,
    d65Match: 'Grade 3.5 (Redder)',
    tl84Match: 'Grade 3.0',
    cwfMatch: 'Grade 3.5',
    status: 'RE_DIP_REQUIRED',
    submissionDate: '2026-08-10',
    feedbackDate: '2026-08-14',
    technician: 'Kamrul Hasan',
    merchandiser: 'Abid',
    comments: 'CRITICAL ALERT: Buyer rejected Option B. Machine MC-02 scheduled in 4 days! Re-dip Option C & D formulated.',
    inTenDayLoadingPlan: true,
    scheduledMachine: 'MC-02 (250 KG)',
    scheduledDyeingDate: '2026-09-06',
    daysToMachineLoading: 2,
    attachedFiles: [
      {
        id: 'DATT-03',
        name: 'Buyer_Rejection_Comments_EstateBlue.pdf',
        type: 'PDF',
        sizeKb: 195,
        uploadedAt: '2026-08-14 11:20',
        uploadedBy: 'Abid (Merchandiser)'
      }
    ]
  },
  {
    id: 'DIP-2026-003',
    dipNo: 'LD-48002-03',
    jobNo: '48002',
    buyer: 'ONLY',
    buyerCode: 'ONLY',
    styleNo: '13251512',
    item: 'Basic V-Neck Tee',
    fabricType: '100% Combed Cotton 160 GSM',
    colorName: 'Estate Blue (Revised)',
    pantoneRef: 'TCX 19-4027',
    stage: 'BULK_PENDING',
    optionCode: 'C',
    recipe: 'Remazol Navy RGB (1.92%) + Turquoise G (0.35%)',
    dyestuffFamily: 'Vinyl Sulphone Reactive',
    deltaE: 0.38,
    d65Match: 'Grade 4.5',
    tl84Match: 'Grade 4.5',
    cwfMatch: 'Grade 4.5',
    status: 'SUBMITTED',
    submissionDate: '2026-08-18',
    technician: 'Kamrul Hasan',
    merchandiser: 'Abid',
    comments: 'Revised dip sent via DHL to buyer office. Urgent phone follow-up required by Merchandiser before MC-02 loading.',
    inTenDayLoadingPlan: true,
    scheduledMachine: 'MC-02 (250 KG)',
    scheduledDyeingDate: '2026-09-06',
    daysToMachineLoading: 2,
    attachedFiles: [
      {
        id: 'DATT-04',
        name: 'DHL_Tracking_Dip_48002_OptionC.pdf',
        type: 'PDF',
        sizeKb: 310,
        uploadedAt: '2026-08-18 15:00',
        uploadedBy: 'Kamrul Hasan'
      }
    ]
  },
  {
    id: 'DIP-2026-004',
    dipNo: 'LD-46755-01',
    jobNo: '46755',
    buyer: 'OVS',
    buyerCode: 'OVS',
    styleNo: '262SWT028-222',
    item: 'Fleece Sweatshirt',
    fabricType: 'Fleece 300 GSM Mid Peach Finish',
    colorName: 'Black Beauty',
    pantoneRef: 'TCX 19-3911',
    stage: 'SMS_SAMPLE',
    optionCode: 'A',
    recipe: 'Novacron Deep Black N-2R (4.8%) + Olive (0.3%)',
    dyestuffFamily: 'Polyfunctional Reactive',
    deltaE: 0.32,
    d65Match: 'Grade 5.0',
    tl84Match: 'Grade 4.5',
    cwfMatch: 'Grade 4.5',
    status: 'APPROVED',
    submissionDate: '2026-08-05',
    feedbackDate: '2026-08-09',
    technician: 'F. Rahman',
    merchandiser: 'Shaker',
    comments: 'Two-bath peach fleece recipe validated. Batch approved for bulk machine allocation.',
    inTenDayLoadingPlan: false,
    attachedFiles: [
      {
        id: 'DATT-05',
        name: 'OVS_BlackBeauty_SignedApproval.pdf',
        type: 'PDF',
        sizeKb: 420,
        uploadedAt: '2026-08-09 17:00',
        uploadedBy: 'Shaker (Merchandiser)'
      }
    ]
  },
  {
    id: 'DIP-2026-005',
    dipNo: 'LD-46758-01',
    jobNo: '46758',
    buyer: 'UTG',
    buyerCode: 'UTG',
    styleNo: '13251495',
    item: 'High Waist Legging',
    fabricType: '95% Cotton / 5% Lycra 200 GSM',
    colorName: 'Charcoal Melange Overdye',
    pantoneRef: 'TCX 18-0601',
    stage: 'SMS_SAMPLE',
    optionCode: 'B',
    recipe: 'Black B (1.2%) + Violet 5R (0.08%)',
    dyestuffFamily: 'Low-Temp Reactive for Spandex',
    deltaE: 0.44,
    d65Match: 'Grade 4.5',
    tl84Match: 'Grade 4.0',
    cwfMatch: 'Grade 4.5',
    status: 'APPROVED',
    submissionDate: '2026-08-08',
    feedbackDate: '2026-08-12',
    technician: 'S. K. Paul',
    merchandiser: 'Imran',
    comments: 'Spandex low-temperature fixing profile used (60°C). Approved for bulk orders.',
    inTenDayLoadingPlan: false,
    attachedFiles: []
  },
  {
    id: 'DIP-2026-006',
    dipNo: 'LD-48061-01',
    jobNo: '48061',
    buyer: 'Name It',
    buyerCode: 'Name It',
    styleNo: '13251509',
    item: 'Babywear Body Suit',
    fabricType: '100% Organic Cotton GOTS 175 GSM',
    colorName: 'Buttercup Yellow',
    pantoneRef: 'TCX 12-0752',
    stage: 'BULK_PENDING',
    optionCode: 'A',
    recipe: 'GOTS Certified Reactive Yellow 3FL (0.65%)',
    dyestuffFamily: 'Eco-Passport GOTS Reactive',
    deltaE: 0.65,
    d65Match: 'Grade 4.0',
    tl84Match: 'Grade 3.5',
    cwfMatch: 'Grade 4.0',
    status: 'PENDING_BUYER',
    submissionDate: '2026-08-20',
    technician: 'M. Ali',
    merchandiser: 'Shamoly',
    comments: 'Eco-passport dyes used. Courier tracking #DHL-8890123. Awaiting Merchandiser approval confirmation.',
    inTenDayLoadingPlan: true,
    scheduledMachine: 'MC-01 (120 KG)',
    scheduledDyeingDate: '2026-09-09',
    daysToMachineLoading: 5,
    attachedFiles: []
  },
  {
    id: 'DIP-2026-007',
    dipNo: 'LD-48110-01',
    jobNo: '48110',
    buyer: 'Only&Sons',
    buyerCode: 'Only&Sons',
    styleNo: '13251532',
    item: 'Striped Yarn Dye Polo',
    fabricType: 'Package Yarn Dyeing 32/2',
    colorName: 'Crimson Red (Yarn Dye)',
    pantoneRef: 'TCX 19-1762',
    stage: 'SMS_SAMPLE',
    optionCode: 'A',
    recipe: 'Novacron Red Super (3.2%)',
    dyestuffFamily: 'Package Yarn Dye Reactive',
    deltaE: 0.35,
    d65Match: 'Grade 4.5',
    tl84Match: 'Grade 4.5',
    cwfMatch: 'Grade 4.5',
    status: 'APPROVED',
    submissionDate: '2026-08-11',
    feedbackDate: '2026-08-15',
    technician: 'F. Rahman',
    merchandiser: 'Kamrul',
    comments: 'Yarn package carrier batch recipe validated. Ready for bulk package dye machine.',
    inTenDayLoadingPlan: false,
    attachedFiles: []
  }
];

// ============================================================================
// MAIN DYEING LAB COMPONENT
// ============================================================================

export default function DyeingLabPage() {
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'REQUESTS' | 'ENTRY'>('REGISTER');

  // Master State with LocalStorage Persistence
  const [masterRecords, setMasterRecords] = useState<LabDipMasterRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nfl_dyeing_lab_v2');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved dyeing lab records', e);
        }
      }
    }
    return INITIAL_MASTER_RECORDS;
  });

  const [incomingRequests, setIncomingRequests] = useState<IncomingLabDipRequest[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nfl_dyeing_requests_v2');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved dyeing requests', e);
        }
      }
    }
    return INITIAL_INCOMING_REQUESTS;
  });

  // Save to LocalStorage whenever modified
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nfl_dyeing_lab_v2', JSON.stringify(masterRecords));
    }
  }, [masterRecords]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nfl_dyeing_requests_v2', JSON.stringify(incomingRequests));
    }
  }, [incomingRequests]);

  // Filters State
  const [selectedStage, setSelectedStage] = useState<'ALL' | 'SMS_SAMPLE' | 'BULK_PENDING' | 'TEN_DAY_ALERT' | 'APPROVED'>('ALL');
  const [selectedBuyer, setSelectedBuyer] = useState<string>('ALL');
  const [selectedMerchandiser, setSelectedMerchandiser] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Swatch / Dossier Modal State
  const [selectedModalDip, setSelectedModalDip] = useState<LabDipMasterRecord | null>(null);

  // Accept Request Modal State
  const [acceptingRequest, setAcceptingRequest] = useState<IncomingLabDipRequest | null>(null);
  const [selectedColorsForAccept, setSelectedColorsForAccept] = useState<string[]>([]);
  const [selectedOptionsForAccept, setSelectedOptionsForAccept] = useState<{ optA: boolean; optB: boolean; optC: boolean; optD: boolean }>({
    optA: true,
    optB: true,
    optC: true,
    optD: false
  });

  // Form State for "Lab Dip Formulation & Recipe Entry"
  const [entryJobNo, setEntryJobNo] = useState<string>('48085');
  const [entryColor, setEntryColor] = useState<string>('Nosegay Pink');
  const [entryPantone, setEntryPantone] = useState<string>('TCX 14-1911');
  const [entryStage, setEntryStage] = useState<LabDipStage>('SMS_SAMPLE');
  const [entryOption, setEntryOption] = useState<'A' | 'B' | 'C' | 'D' | 'R1' | 'R2'>('A');
  const [entryRecipe, setEntryRecipe] = useState<string>('Novacron Red FN-2BL (0.42%) + Yellow FN-2R (0.12%)');
  const [entryDyestuffFamily, setEntryDyestuffFamily] = useState<string>('Reactive (Bi-functional)');
  const [entryDeltaE, setEntryDeltaE] = useState<number>(0.42);
  const [entryD65, setEntryD65] = useState<string>('Grade 4.5');
  const [entryTL84, setEntryTL84] = useState<string>('Grade 4.5');
  const [entryCWF, setEntryCWF] = useState<string>('Grade 4.0');
  const [entryStatus, setEntryStatus] = useState<LabDipStatus>('APPROVED');
  const [entryTechnician, setEntryTechnician] = useState<string>('S. K. Paul (Sr. Chemist)');
  const [entryMerchandiser, setEntryMerchandiser] = useState<string>('Shamoly');
  const [entryInTenDayPlan, setEntryInTenDayPlan] = useState<boolean>(false);
  const [entryMachine, setEntryMachine] = useState<string>('MC-06 (1050 KG)');
  const [entryComments, setEntryComments] = useState<string>('Approved master standard for bulk dyeing production.');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFileType, setUploadedFileType] = useState<'PDF' | 'EXCEL' | 'IMAGE'>('PDF');
  const [entrySuccessMessage, setEntrySuccessMessage] = useState<string>('');

  // 10-Day Machine Loading Plan High-Risk Alerts
  const tenDayAtRiskJobs = useMemo(() => {
    return masterRecords.filter(
      r => r.inTenDayLoadingPlan && (r.status === 'PENDING_BUYER' || r.status === 'RE_DIP_REQUIRED' || r.status === 'SUBMITTED')
    );
  }, [masterRecords]);

  // Statistics
  const totalDips = masterRecords.length;
  const approvedDips = masterRecords.filter(r => r.status === 'APPROVED').length;
  const pendingBuyerDips = masterRecords.filter(r => r.status === 'PENDING_BUYER' || r.status === 'SUBMITTED').length;
  const reDipRequired = masterRecords.filter(r => r.status === 'RE_DIP_REQUIRED').length;
  const approvalRate = Math.round((approvedDips / totalDips) * 100);
  const pendingRequestsCount = incomingRequests.filter(r => r.status === 'PENDING_ACCEPTANCE').length;

  // Filter Lists
  const buyersList = useMemo(() => Array.from(new Set(masterRecords.map(r => r.buyer))), [masterRecords]);
  const merchandisersList = useMemo(() => Array.from(new Set(masterRecords.map(r => r.merchandiser))), [masterRecords]);

  // Filtered Master Records
  const filteredRecords = useMemo(() => {
    return masterRecords.filter(r => {
      let matchStage = true;
      if (selectedStage === 'SMS_SAMPLE') matchStage = r.stage === 'SMS_SAMPLE';
      else if (selectedStage === 'BULK_PENDING') matchStage = r.stage === 'BULK_PENDING';
      else if (selectedStage === 'APPROVED') matchStage = r.status === 'APPROVED';
      else if (selectedStage === 'TEN_DAY_ALERT') matchStage = r.inTenDayLoadingPlan;

      const matchBuyer = selectedBuyer === 'ALL' || r.buyer === selectedBuyer;
      const matchMerch = selectedMerchandiser === 'ALL' || r.merchandiser === selectedMerchandiser;
      const matchStatus = selectedStatus === 'ALL' || r.status === selectedStatus;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.dipNo.toLowerCase().includes(q) ||
        r.jobNo.includes(q) ||
        r.buyer.toLowerCase().includes(q) ||
        r.styleNo.toLowerCase().includes(q) ||
        r.colorName.toLowerCase().includes(q) ||
        r.pantoneRef.toLowerCase().includes(q);

      return matchStage && matchBuyer && matchMerch && matchStatus && matchSearch;
    });
  }, [masterRecords, selectedStage, selectedBuyer, selectedMerchandiser, selectedStatus, searchQuery]);

  // Handlers
  const handleOpenAcceptModal = (req: IncomingLabDipRequest) => {
    setAcceptingRequest(req);
    setSelectedColorsForAccept([...req.colors]);
  };

  const handleConfirmAcceptRequest = () => {
    if (!acceptingRequest) return;

    const newRecords: LabDipMasterRecord[] = selectedColorsForAccept.map((col, idx) => ({
      id: `DIP-${Date.now()}-${idx}`,
      dipNo: `LD-${acceptingRequest.jobNo}-0${idx + 1}`,
      jobNo: acceptingRequest.jobNo,
      buyer: acceptingRequest.buyer,
      buyerCode: acceptingRequest.buyer,
      styleNo: acceptingRequest.styleNo,
      item: acceptingRequest.item,
      fabricType: acceptingRequest.fabricDescription,
      colorName: col,
      pantoneRef: 'TCX ' + Math.floor(11 + Math.random() * 8) + '-' + Math.floor(1000 + Math.random() * 8999),
      stage: acceptingRequest.stageType === 'SMS_COLLECTION' ? 'SMS_SAMPLE' : 'BULK_PENDING',
      optionCode: 'A',
      recipe: 'Standard Formulation in progress (Datacolor Match)',
      dyestuffFamily: 'Reactive Dyes',
      deltaE: 0.45,
      d65Match: 'Grade 4.0',
      tl84Match: 'Grade 4.0',
      cwfMatch: 'Grade 4.0',
      status: 'IN_FORMULATION',
      submissionDate: new Date().toISOString().split('T')[0],
      technician: 'S. K. Paul (Chemist)',
      merchandiser: acceptingRequest.merchandiser,
      comments: `New request accepted from Planning. Formulating strike-offs A/B/C for ${col}.`,
      inTenDayLoadingPlan: acceptingRequest.inTenDayLoadingPlan,
      scheduledMachine: acceptingRequest.scheduledMachine,
      scheduledDyeingDate: acceptingRequest.scheduledDyeingDate,
      daysToMachineLoading: acceptingRequest.inTenDayLoadingPlan ? 7 : undefined,
      attachedFiles: []
    }));

    setIncomingRequests(prev => prev.map(r => (r.id === acceptingRequest.id ? { ...r, status: 'ACCEPTED' } : r)));
    setMasterRecords(prev => [...newRecords, ...prev]);
    setAcceptingRequest(null);
    setActiveTab('REGISTER');
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();

    const created: LabDipMasterRecord = {
      id: `DIP-${Date.now()}`,
      dipNo: `LD-${entryJobNo}-${Math.floor(10 + Math.random() * 89)}`,
      jobNo: entryJobNo,
      buyer: masterRecords.find(r => r.jobNo === entryJobNo)?.buyer || 'ONLY',
      buyerCode: masterRecords.find(r => r.jobNo === entryJobNo)?.buyerCode || 'ONLY',
      styleNo: masterRecords.find(r => r.jobNo === entryJobNo)?.styleNo || '22041',
      item: masterRecords.find(r => r.jobNo === entryJobNo)?.item || 'Apparel',
      fabricType: masterRecords.find(r => r.jobNo === entryJobNo)?.fabricType || 'Cotton',
      colorName: entryColor,
      pantoneRef: entryPantone || 'TCX 19-4027',
      stage: entryStage,
      optionCode: entryOption,
      recipe: entryRecipe,
      dyestuffFamily: entryDyestuffFamily,
      deltaE: entryDeltaE,
      d65Match: entryD65,
      tl84Match: entryTL84,
      cwfMatch: entryCWF,
      status: entryStatus,
      submissionDate: new Date().toISOString().split('T')[0],
      technician: entryTechnician,
      merchandiser: entryMerchandiser,
      comments: entryComments,
      inTenDayLoadingPlan: entryInTenDayPlan,
      scheduledMachine: entryInTenDayPlan ? entryMachine : undefined,
      daysToMachineLoading: entryInTenDayPlan ? 4 : undefined,
      attachedFiles: uploadedFileName
        ? [
            {
              id: `DATT-${Date.now()}`,
              name: uploadedFileName,
              type: uploadedFileType,
              sizeKb: Math.floor(180 + Math.random() * 320),
              uploadedAt: new Date().toLocaleString(),
              uploadedBy: entryTechnician
            }
          ]
        : []
    };

    setMasterRecords([created, ...masterRecords]);
    setEntrySuccessMessage(`Lab dip ${created.dipNo} (${entryColor}) successfully recorded!`);
    setUploadedFileName('');
    setTimeout(() => setEntrySuccessMessage(''), 5000);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset Dyeing Lab records to standard factory default?')) {
      setMasterRecords(INITIAL_MASTER_RECORDS);
      setIncomingRequests(INITIAL_INCOMING_REQUESTS);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nfl_dyeing_lab_v2');
        localStorage.removeItem('nfl_dyeing_requests_v2');
      }
    }
  };

  return (
    <Shell
      title="Dyeing Lab (Dyeing Lab)"
      eyebrow="SMS / Sample Stage Shade Approvals, Lab Dip Formulations & 10-Day Machine Loading Gate"
    >
      {/* =========================================================================
          TOP BANNER & NAVIGATION SUB-MENU
         ========================================================================= */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#0F274E', color: '#38BDF8', padding: '3px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Pre-Dyeing Shade Lab
              </span>
              <span style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '3px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 700 }}>
                Datacolor Spectro ΔE Matcher
              </span>
              {tenDayAtRiskJobs.length > 0 && (
                <span style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '3px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Flame size={13} /> {tenDayAtRiskJobs.length} Machine Loading Alerts!
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', margin: '6px 0 2px 0' }}>
              Dyeing Laboratory &amp; Lab Dip Approval System
            </h1>
            <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
              Initiated at SMS (Sales Sample) stage through bulk order recipe clearance · <strong>10-Day Loading Plan Follow-up:</strong> In-house machines cannot load unapproved batches.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link
              href="/modules/testing-lab"
              style={{
                fontSize: 13,
                fontWeight: 750,
                padding: '8px 14px',
                background: '#F0FDF4',
                color: '#15803D',
                border: '1px solid #86EFAC',
                borderRadius: 8,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              🧪 Testing Lab (Physical &amp; Fastness) →
            </Link>
            <button
              type="button"
              onClick={handleResetDefaults}
              style={{ fontSize: 12, fontWeight: 700, padding: '8px 12px', background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#475569', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={13} /> Defaults
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ENTRY')}
              style={{ fontSize: 13, fontWeight: 800, padding: '8px 16px', background: '#0F274E', color: '#FFFFFF', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={15} color="#38BDF8" /> + Log Lab Dip
            </button>
          </div>
        </div>

        {/* SUB-MENU TABS */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
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
              gap: 8
            }}
          >
            <Palette size={16} color={activeTab === 'REGISTER' ? '#38BDF8' : '#64748B'} />
            1. Master Lab Dip Register ({masterRecords.length})
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
              gap: 8
            }}
          >
            <Layers size={16} color={activeTab === 'REQUESTS' ? '#38BDF8' : '#64748B'} />
            2. SMS &amp; Planning Requisitions ({pendingRequestsCount} Pending)
            {pendingRequestsCount > 0 && (
              <span style={{ background: '#DC2626', color: '#FFF', fontSize: 11, padding: '1px 6px', borderRadius: 999, fontWeight: 800 }}>
                {pendingRequestsCount}
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
              gap: 8
            }}
          >
            <UploadCloud size={16} color={activeTab === 'ENTRY' ? '#38BDF8' : '#64748B'} />
            3. Lab Dip Formulation &amp; Spectro Entry
          </button>
        </div>
      </div>

      {/* =========================================================================
          CRITICAL 10-DAY MACHINE LOADING PLAN EMERGENCY BANNER
         ========================================================================= */}
      {tenDayAtRiskJobs.length > 0 && (
        <div style={{
          background: 'linear-gradient(90deg, #7F1D1D 0%, #991B1B 100%)',
          color: '#FFFFFF',
          borderRadius: 10,
          padding: '14px 20px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 26 }}>🚨</span>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 900, letterSpacing: 0.3 }}>
                URGENT: {tenDayAtRiskJobs.length} Orders in 10-Day Machine Loading Schedule Missing Buyer Lab Dip Approval!
              </div>
              <div style={{ fontSize: 12.5, color: '#FECACA', marginTop: 2 }}>
                The following machine slots will stand idle unless Merchandisers expedite buyer approvals or dispatch revised strike-offs immediately:
                {' '}
                {tenDayAtRiskJobs.map(j => `[Job #${j.jobNo} ${j.colorName} on ${j.scheduledMachine}]`).join(', ')}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedStage('TEN_DAY_ALERT')}
            style={{
              background: '#FFFFFF',
              color: '#991B1B',
              border: 'none',
              padding: '7px 14px',
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            View At-Risk Jobs &amp; Alert Merchandiser →
          </button>
        </div>
      )}

      {/* =========================================================================
          KEY KPI TILES (COMPACT & PROFESSIONAL)
         ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 16 }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #0284C7', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 750, color: '#64748B', textTransform: 'uppercase' }}>Total Lab Dips</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', marginTop: 2 }}>{totalDips} <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>shades</span></div>
          <div style={{ fontSize: 11.5, color: '#64748B' }}>SMS &amp; Bulk combined</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #16A34A', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 750, color: '#166534', textTransform: 'uppercase' }}>Approved Standards</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#15803D', marginTop: 2 }}>{approvedDips} <span style={{ fontSize: 12, fontWeight: 600 }}>({approvalRate}%)</span></div>
          <div style={{ fontSize: 11.5, color: '#166534' }}>Bulk production recipe locked</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #F59E0B', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 750, color: '#B45309', textTransform: 'uppercase' }}>Pending Buyer Review</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#B45309', marginTop: 2 }}>{pendingBuyerDips} <span style={{ fontSize: 12, fontWeight: 600 }}>shades</span></div>
          <div style={{ fontSize: 11.5, color: '#B45309' }}>Courier dispatched to buyer</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #DC2626', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 750, color: '#991B1B', textTransform: 'uppercase' }}>Re-Dip Required</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#DC2626', marginTop: 2 }}>{reDipRequired} <span style={{ fontSize: 12, fontWeight: 600 }}>shades</span></div>
          <div style={{ fontSize: 11.5, color: '#991B1B' }}>Recipe correction in lab</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #DC2626', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 750, color: '#DC2626', textTransform: 'uppercase' }}>10-Day Plan Blocked</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#DC2626', marginTop: 2 }}>{tenDayAtRiskJobs.length} <span style={{ fontSize: 12, fontWeight: 600 }}>machines</span></div>
          <div style={{ fontSize: 11.5, color: '#991B1B' }}>Urgent follow-up needed</div>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: MASTER LAB DIP REGISTER
         ========================================================================= */}
      {activeTab === 'REGISTER' && (
        <>
          {/* FILTER TOOLBAR */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', fontSize: 12, fontWeight: 750 }}>
                <Filter size={14} /> FILTERS:
              </div>

              {/* Stage Filter Buttons */}
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { key: 'ALL', label: 'All Dips' },
                  { key: 'SMS_SAMPLE', label: 'SMS Sample Stage' },
                  { key: 'BULK_PENDING', label: 'Bulk Pending' },
                  { key: 'TEN_DAY_ALERT', label: '🚨 10-Day Plan Alert' },
                  { key: 'APPROVED', label: 'Approved Only' }
                ].map(b => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setSelectedStage(b.key as any)}
                    style={{
                      fontSize: 12,
                      fontWeight: 750,
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: selectedStage === b.key ? '1px solid #0F274E' : '1px solid #CBD5E1',
                      background: selectedStage === b.key ? '#0F274E' : '#F8FAFC',
                      color: selectedStage === b.key ? '#FFFFFF' : '#334155',
                      cursor: 'pointer'
                    }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              {/* Buyer Filter */}
              <select
                value={selectedBuyer}
                onChange={e => setSelectedBuyer(e.target.value)}
                style={{ fontSize: 12, fontWeight: 700, padding: '5px 8px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC' }}
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
                style={{ fontSize: 12, fontWeight: 700, padding: '5px 8px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC' }}
              >
                <option value="ALL">All Merchandisers</option>
                {merchandisersList.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                style={{ fontSize: 12, fontWeight: 700, padding: '5px 8px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved (Green)</option>
                <option value="PENDING_BUYER">Pending Buyer Review</option>
                <option value="SUBMITTED">Submitted via Courier</option>
                <option value="RE_DIP_REQUIRED">Re-Dip Required (Red)</option>
                <option value="IN_FORMULATION">In Formulation (Blue)</option>
              </select>
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: 9 }} />
              <input
                type="text"
                placeholder="Search Dip #, Job, Color, Pantone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ fontSize: 12.5, padding: '5px 10px 5px 30px', borderRadius: 6, border: '1px solid #CBD5E1', width: 220, outline: 'none' }}
              />
            </div>
          </div>

          {/* TABLE */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A' }}>
                Master Lab Dip Register &amp; Shade Approvals ({filteredRecords.length} records)
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                *Crucial gate for 10-day machine loading plan &amp; Job 360 trace
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', minWidth: 1200 }}>
                <thead style={{ background: '#F1F5F9' }}>
                  <tr style={{ borderBottom: '2px solid #CBD5E1', color: '#334155' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Buyer &amp; Job No</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Style, Item &amp; Fabric</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Color Name &amp; Pantone Ref</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Stage &amp; 10-Day Plan</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Option &amp; Dyestuffs</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'center' }}>Spectro ΔE</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'center' }}>Buyer Status</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Merchandiser Follow-Up</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'center' }}>Dossier</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
                        No lab dips match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r, idx) => {
                      const isApproved = r.status === 'APPROVED';
                      const isReDip = r.status === 'RE_DIP_REQUIRED';
                      const isPending = r.status === 'PENDING_BUYER' || r.status === 'SUBMITTED';

                      return (
                        <tr
                          key={r.id}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            background: r.inTenDayLoadingPlan && !isApproved ? '#FEF2F2' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                          }}
                        >
                          {/* Column 1: Buyer & Job */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 800, color: '#0F274E', fontSize: 13.5 }}>{r.buyer}</span>
                              <span style={{ color: '#64748B' }}>·</span>
                              <span style={{ fontWeight: 800, color: '#2563EB', fontSize: 13.5 }}>#{r.jobNo}</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                              Dip: <strong>{r.dipNo}</strong>
                            </div>
                          </td>

                          {/* Column 2: Style, Item & Fabric */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 750, color: '#1E293B' }}>{r.styleNo}</div>
                            <div style={{ fontSize: 11.5, color: '#64748B' }}>{r.item}</div>
                            <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>{r.fabricType}</div>
                          </td>

                          {/* Column 3: Color & Pantone */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#0F172A' }}>{r.colorName}</div>
                            <span style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '1px 6px', borderRadius: 4, fontSize: 11, color: '#475569', fontWeight: 700 }}>
                              {r.pantoneRef}
                            </span>
                          </td>

                          {/* Column 4: Stage & 10-Day Machine Loading Plan */}
                          <td style={{ padding: '10px 12px' }}>
                            <div>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 800,
                                padding: '2px 7px',
                                borderRadius: 4,
                                background: r.stage === 'SMS_SAMPLE' ? '#EFF6FF' : '#F1F5F9',
                                color: r.stage === 'SMS_SAMPLE' ? '#1D4ED8' : '#334155'
                              }}>
                                {r.stage === 'SMS_SAMPLE' ? 'SMS Sample' : 'Bulk Confirmed'}
                              </span>
                            </div>
                            {r.inTenDayLoadingPlan && (
                              <div style={{ marginTop: 4 }}>
                                <span style={{
                                  fontSize: 10.5,
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: isApproved ? '#DCFCE7' : '#FEE2E2',
                                  color: isApproved ? '#15803D' : '#DC2626',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3
                                }}>
                                  <Flame size={11} /> 10-Day Plan: {r.scheduledMachine} ({r.scheduledDyeingDate})
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Column 5: Option & Recipe */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ background: '#0F274E', color: '#FFF', padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 800 }}>
                                Option {r.optionCode}
                              </span>
                              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 650 }}>{r.dyestuffFamily}</span>
                            </div>
                            <div style={{ fontSize: 11.5, color: '#334155', marginTop: 2, maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {r.recipe}
                            </div>
                          </td>

                          {/* Column 6: Spectro Delta E */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ fontSize: 13, fontWeight: 900, color: r.deltaE <= 0.6 ? '#15803D' : '#DC2626' }}>
                              ΔE: {r.deltaE.toFixed(2)}
                            </div>
                            <div style={{ fontSize: 10.5, color: '#64748B' }}>
                              D65: {r.d65Match}
                            </div>
                          </td>

                          {/* Column 7: Buyer Status */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: 999,
                              fontSize: 11.5,
                              fontWeight: 800,
                              background: isApproved ? '#DCFCE7' : isReDip ? '#FEE2E2' : '#FEF3C7',
                              color: isApproved ? '#15803D' : isReDip ? '#B91C1C' : '#B45309'
                            }}>
                              {r.status}
                            </span>
                          </td>

                          {/* Column 8: Merchandiser Follow-Up */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 750, color: '#0F172A' }}>{r.merchandiser}</div>
                            <div style={{ fontSize: 11, color: '#64748B' }}>
                              Sub: {r.submissionDate}
                            </div>
                            {r.inTenDayLoadingPlan && !isApproved && (
                              <button
                                type="button"
                                onClick={() => alert(`Alert sent to Merchandiser ${r.merchandiser}:\nExpedite buyer approval for Job #${r.jobNo} (${r.colorName}). Machine ${r.scheduledMachine} is loading in ${r.daysToMachineLoading || 2} days!`)}
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: '#DC2626',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  cursor: 'pointer',
                                  marginTop: 3,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3
                                }}
                              >
                                <Send size={10} /> Send Alert
                              </button>
                            )}
                          </td>

                          {/* Column 9: Dossier / View Action */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedModalDip(r)}
                              style={{
                                fontSize: 11.5,
                                fontWeight: 750,
                                padding: '5px 10px',
                                borderRadius: 6,
                                background: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                color: '#1D4ED8',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <Eye size={13} /> View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          TAB 2: SMS & PLANNING REQUISITIONS
         ========================================================================= */}
      {activeTab === 'REQUESTS' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '20px' }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', margin: 0 }}>
              Incoming SMS &amp; Central Planning Lab Dip Requisitions
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>
              When SMS orders or Bulk fabric sheets are created, the required color palette is transmitted to the Dyeing Lab. Review the job, select all colors, and formulate Options A, B, C, D strike-offs.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead style={{ background: '#F1F5F9' }}>
                <tr style={{ borderBottom: '2px solid #CBD5E1', color: '#334155' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Req # / Date</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Job &amp; Buyer</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Style &amp; Fabric Item</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Colors Required</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Stage</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>10-Day Plan Target</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800 }}>Merchandiser</th>
                  <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {incomingRequests.map((req, idx) => {
                  const isPending = req.status === 'PENDING_ACCEPTANCE';
                  return (
                    <tr key={req.id} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontWeight: 800, color: '#0F274E' }}>{req.id}</span>
                        <div style={{ fontSize: 11.5, color: '#64748B' }}>{req.tnaOrSmsApprovedAt}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>Job #{req.jobNo}</div>
                        <div style={{ fontSize: 11.5, color: '#2563EB', fontWeight: 700 }}>{req.buyer}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 750, color: '#1E293B' }}>{req.styleNo}</div>
                        <div style={{ fontSize: 11.5, color: '#64748B' }}>{req.fabricDescription}</div>
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
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: req.stageType === 'SMS_COLLECTION' ? '#EFF6FF' : '#FEF3C7', color: req.stageType === 'SMS_COLLECTION' ? '#1D4ED8' : '#B45309', padding: '2px 8px', borderRadius: 4, fontSize: 11.5, fontWeight: 800 }}>
                          {req.stageType === 'SMS_COLLECTION' ? 'SMS Sample' : 'Bulk Order Confirmed'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {req.inTenDayLoadingPlan ? (
                          <div>
                            <span style={{ background: '#FEE2E2', color: '#DC2626', padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 800 }}>
                              🚨 {req.scheduledMachine} ({req.scheduledDyeingDate})
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: '#64748B' }}>Standard Queue</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 750, color: '#0F172A' }}>
                        {req.merchandiser}
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
                              background: '#0F274E',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <Check size={14} color="#38BDF8" /> Accept &amp; Formulate Dips
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
          TAB 3: LAB DIP FORMULATION & SPECTRO ENTRY
         ========================================================================= */}
      {activeTab === 'ENTRY' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '20px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', marginTop: 0, marginBottom: 4 }}>
              Record Lab Dip Formulation &amp; Spectrophotometer Match
            </h2>
            <p style={{ fontSize: 12.5, color: '#64748B', marginBottom: 16 }}>
              Enter dyestuff recipe codes, Datacolor spectrophotometer ΔE values, and track buyer submission or approval.
            </p>

            {entrySuccessMessage && (
              <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#15803D', padding: '10px 14px', borderRadius: 6, fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} /> {entrySuccessMessage}
              </div>
            )}

            <form onSubmit={handleSaveEntry}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
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

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                    Color Name *
                  </label>
                  <input
                    type="text"
                    value={entryColor}
                    onChange={e => setEntryColor(e.target.value)}
                    style={{ width: '100%', fontSize: 13, fontWeight: 700, padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                    Pantone Reference *
                  </label>
                  <input
                    type="text"
                    value={entryPantone}
                    onChange={e => setEntryPantone(e.target.value)}
                    style={{ width: '100%', fontSize: 12.5, padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                    Stage *
                  </label>
                  <select
                    value={entryStage}
                    onChange={e => setEntryStage(e.target.value as any)}
                    style={{ width: '100%', fontSize: 12.5, fontWeight: 700, padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC' }}
                  >
                    <option value="SMS_SAMPLE">SMS Sample Stage</option>
                    <option value="BULK_PENDING">Bulk Order Pending</option>
                    <option value="BULK_APPROVED">Bulk Approved Standard</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                    Option Code *
                  </label>
                  <select
                    value={entryOption}
                    onChange={e => setEntryOption(e.target.value as any)}
                    style={{ width: '100%', fontSize: 12.5, fontWeight: 700, padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC' }}
                  >
                    <option value="A">Option A (Standard Match)</option>
                    <option value="B">Option B (Alternate)</option>
                    <option value="C">Option C (Light/Dark variant)</option>
                    <option value="D">Option D</option>
                    <option value="R1">Re-Dip 1 (Revised)</option>
                    <option value="R2">Re-Dip 2 (Emergency)</option>
                  </select>
                </div>
              </div>

              {/* Dyestuff Recipe */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                  Dyestuff Formulation &amp; Chemicals Recipe *
                </label>
                <input
                  type="text"
                  value={entryRecipe}
                  onChange={e => setEntryRecipe(e.target.value)}
                  style={{ width: '100%', fontSize: 13, fontWeight: 700, padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }}
                />
              </div>

              {/* Spectro Readings */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                    Delta E (ΔE) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={entryDeltaE}
                    onChange={e => setEntryDeltaE(parseFloat(e.target.value))}
                    style={{ width: '100%', fontSize: 12.5, fontWeight: 800, padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                    D65 Match
                  </label>
                  <input
                    type="text"
                    value={entryD65}
                    onChange={e => setEntryD65(e.target.value)}
                    style={{ width: '100%', fontSize: 12.5, padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                    TL84 Match
                  </label>
                  <input
                    type="text"
                    value={entryTL84}
                    onChange={e => setEntryTL84(e.target.value)}
                    style={{ width: '100%', fontSize: 12.5, padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                    CWF Match
                  </label>
                  <input
                    type="text"
                    value={entryCWF}
                    onChange={e => setEntryCWF(e.target.value)}
                    style={{ width: '100%', fontSize: 12.5, padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>

              {/* Status & 10-Day Loading Plan */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                    Buyer Approval Status *
                  </label>
                  <select
                    value={entryStatus}
                    onChange={e => setEntryStatus(e.target.value as any)}
                    style={{ width: '100%', fontSize: 13, fontWeight: 800, padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F8FAFC' }}
                  >
                    <option value="APPROVED">APPROVED (Authorized for Bulk Dyeing)</option>
                    <option value="SUBMITTED">SUBMITTED (Dispatched via Courier)</option>
                    <option value="PENDING_BUYER">PENDING BUYER REVIEW</option>
                    <option value="RE_DIP_REQUIRED">RE-DIP REQUIRED (Shade Rejected)</option>
                    <option value="IN_FORMULATION">IN FORMULATION</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 750, color: '#DC2626', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={entryInTenDayPlan}
                      onChange={e => setEntryInTenDayPlan(e.target.checked)}
                    />
                    <span>🚨 Scheduled in Next 10-Day Dyeing Loading Plan</span>
                  </label>
                  {entryInTenDayPlan && (
                    <input
                      type="text"
                      placeholder="e.g. MC-04 (525 KG) on 2026-09-08"
                      value={entryMachine}
                      onChange={e => setEntryMachine(e.target.value)}
                      style={{ fontSize: 12, padding: '5px 8px', borderRadius: 4, border: '1px solid #FCA5A5', marginTop: 4 }}
                    />
                  )}
                </div>
              </div>

              {/* Chemist & Comments */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                    Chemist Name
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
                    Merchandiser
                  </label>
                  <input
                    type="text"
                    value={entryMerchandiser}
                    onChange={e => setEntryMerchandiser(e.target.value)}
                    style={{ width: '100%', fontSize: 12.5, padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 750, color: '#334155', marginBottom: 4 }}>
                  Technical / Follow-Up Comments
                </label>
                <input
                  type="text"
                  value={entryComments}
                  onChange={e => setEntryComments(e.target.value)}
                  style={{ width: '100%', fontSize: 12.5, padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1' }}
                />
              </div>

              {/* File Attachment */}
              <div style={{ border: '2px dashed #CBD5E1', borderRadius: 8, padding: '12px', background: '#F8FAFC', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UploadCloud size={24} color="#0284C7" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0F172A' }}>
                      Attach Buyer Signed Approval / Spectro Curve
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input
                    type="text"
                    placeholder="e.g. Buyer_Approved_Dip_48085.pdf"
                    value={uploadedFileName}
                    onChange={e => setUploadedFileName(e.target.value)}
                    style={{ flex: 1, fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '1px solid #CBD5E1' }}
                  />
                  <button
                    type="button"
                    onClick={() => setUploadedFileName(`LD-${entryJobNo}-${entryColor.replace(/\s+/g, '_')}_Approval.pdf`)}
                    style={{ fontSize: 11.5, fontWeight: 700, padding: '5px 8px', background: '#E2E8F0', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                  >
                    Auto-Name
                  </button>
                </div>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: '#0F274E',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 800,
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <Palette size={18} color="#38BDF8" /> Save Lab Dip &amp; Update Bulk Dyeing Authorization
              </button>
            </form>
          </div>

          {/* Right Reference Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '16px' }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1E40AF', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FlaskConical size={16} /> Operational Rules: SMS to Bulk
              </div>
              <ul style={{ fontSize: 12, color: '#1E3A8A', margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                <li><strong>SMS Stage First:</strong> All color development starts at SMS stage. The approved lab dip recipe code is preserved for the entire season.</li>
                <li><strong>10-Day In-House Loading Gate:</strong> In-house dyeing machines (MC-01 to MC-23) cannot load bulk batches without an APPROVED lab dip recipe code.</li>
                <li><strong>Spectro Tolerance:</strong> Target ΔE &lt; 0.60 under primary light source (D65).</li>
                <li><strong>Re-Dip Fast-Track:</strong> Any rejected option triggers revised strike-offs (C/D) dispatched within 48 hours.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ACCEPT SMS / BULK REQUISITION
         ========================================================================= */}
      {acceptingRequest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 12, maxWidth: 620, width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <span style={{ background: '#EFF6FF', color: '#1E40AF', padding: '3px 8px', borderRadius: 4, fontSize: 11.5, fontWeight: 800 }}>
                  Lab Dip Requisition
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', marginTop: 4, marginBottom: 0 }}>
                  Initiate Lab Dips · Job #{acceptingRequest.jobNo} ({acceptingRequest.buyer})
                </h3>
                <div style={{ fontSize: 12.5, color: '#64748B' }}>
                  Style: {acceptingRequest.styleNo} · {acceptingRequest.item}
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

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1E293B', marginBottom: 6 }}>
                Colors in this Requisition:
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
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
                <CheckCircle2 size={16} color="#38BDF8" /> Create Lab Dip Registers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DOSSIER & SPECTRO DETAILS
         ========================================================================= */}
      {selectedModalDip && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 12, maxWidth: 750, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: '#0F274E', color: '#FFF', padding: '3px 8px', borderRadius: 4, fontSize: 11.5, fontWeight: 800 }}>
                    Lab Dip #{selectedModalDip.dipNo}
                  </span>
                  <span style={{
                    background: selectedModalDip.status === 'APPROVED' ? '#DCFCE7' : selectedModalDip.status === 'RE_DIP_REQUIRED' ? '#FEE2E2' : '#FEF3C7',
                    color: selectedModalDip.status === 'APPROVED' ? '#15803D' : selectedModalDip.status === 'RE_DIP_REQUIRED' ? '#B91C1C' : '#B45309',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 11.5,
                    fontWeight: 800
                  }}>
                    {selectedModalDip.status}
                  </span>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', marginTop: 4, marginBottom: 2 }}>
                  {selectedModalDip.buyer} · Job #{selectedModalDip.jobNo} ({selectedModalDip.colorName})
                </h2>
                <div style={{ fontSize: 12.5, color: '#64748B' }}>
                  Pantone: <strong>{selectedModalDip.pantoneRef}</strong> · Style: {selectedModalDip.styleNo} · {selectedModalDip.fabricType}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedModalDip(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>

            {/* Dyestuff Recipe Card */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '16px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
                Option {selectedModalDip.optionCode} Master Recipe Formulation:
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 750, color: '#0F274E', background: '#FFFFFF', padding: '10px 14px', borderRadius: 6, border: '1px solid #CBD5E1' }}>
                {selectedModalDip.recipe}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>
                Dyestuff Class: <strong>{selectedModalDip.dyestuffFamily}</strong> · Formulated by: <strong>{selectedModalDip.technician}</strong>
              </div>
            </div>

            {/* Spectro Table */}
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A', marginTop: 0, marginBottom: 8 }}>
                Datacolor Spectrophotometer Reflectance &amp; Tolerance:
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <div style={{ background: '#F1F5F9', padding: '10px', borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Delta E (ΔE)</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: selectedModalDip.deltaE <= 0.6 ? '#15803D' : '#DC2626' }}>
                    {selectedModalDip.deltaE.toFixed(2)}
                  </div>
                </div>
                <div style={{ background: '#F1F5F9', padding: '10px', borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748B' }}>D65 Daylight</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{selectedModalDip.d65Match}</div>
                </div>
                <div style={{ background: '#F1F5F9', padding: '10px', borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748B' }}>TL84 Store</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{selectedModalDip.tl84Match}</div>
                </div>
                <div style={{ background: '#F1F5F9', padding: '10px', borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748B' }}>CWF Office</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{selectedModalDip.cwfMatch}</div>
                </div>
              </div>
            </div>

            {/* Attached Files */}
            {selectedModalDip.attachedFiles.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
                  Attached Documents:
                </div>
                {selectedModalDip.attachedFiles.map(f => (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0', marginBottom: 4 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>{f.name} ({f.sizeKb} KB)</div>
                    <button
                      type="button"
                      onClick={() => alert(`Simulating download of: ${f.name}`)}
                      style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 10px', background: '#0F274E', color: '#FFF', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    >
                      <Download size={12} /> Download
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{ fontSize: 12.5, fontWeight: 700, padding: '8px 14px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Printer size={14} /> Print Recipe Card
              </button>
              <button
                type="button"
                onClick={() => setSelectedModalDip(null)}
                style={{ fontSize: 12.5, fontWeight: 800, padding: '8px 20px', background: '#0F274E', color: '#FFFFFF', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
