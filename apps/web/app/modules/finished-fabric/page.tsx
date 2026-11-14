'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';
import * as XLSX from 'xlsx';
import {
  Package,
  Layers,
  Truck,
  MapPin,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Printer,
  Download,
  Plus,
  Save,
  Boxes,
  FileCheck,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Warehouse,
  Scissors,
  ShieldCheck,
  HelpCircle,
  Tag,
  Palette,
  CheckSquare,
  Sparkles,
  X,
  SlidersHorizontal,
  Check,
  Building2,
  Globe,
  FileSpreadsheet,
  ArrowUpDown,
  Upload,
  Trash2,
  FolderUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { CrossFilterProvider, CrossFilterBar, useCrossFilter } from '../../../components/ui';
import { FX_SERIES, FX_BAR, FxResponsiveContainer as ResponsiveContainer } from '../../../components/fx';
import { fmtNum } from '../../../lib/format';
import FabricRackLocation, {
  RackLocations,
  LocationPicker,
  LocationPick,
  emptyPick,
  pickIsValid,
  pickLabel,
  assignLocation,
  locLabel,
  isShelfKey,
  FABRIC_RACKS,
  FABRIC_SHELVES,
  shelfId,
  shelfLabel,
  getShelfItems,
} from '../../../components/fabric/FabricRackLocation';

const RACK_STORE_KEY = 'nos-finished-fabric-rack-locations-v9';
const FINISHED_FABRIC_STORAGE_KEY = 'nfl_finished_fabric_lines_v5';

/**
 * Strips buyer prefixes (e.g. ONLY-, OS-, OVS-, NI-, UTG-, UT-, BS-, BSONS-) from style number
 * so only the clean style number is displayed.
 */
export function cleanStyleNo(st: string): string {
  if (!st) return '—';
  return st.replace(/^(OS|ONLY|OVS|NI|UTG|UT|BS|BSONS|NL|TML|NAME\s*IT|NEW\s*LOOK|TOM\s*TAILOR|JACK\s*&\s*JONES|VERO\s*MODA)[-_ ]+/i, '').trim() || st;
}

/**
 * Pre-populates realistic demo placements across 20 Racks x 20 Shelves
 * so that Location Tracking shows full warehouse occupancy.
 */
function generateInitialRackLocations(lines: FabricColorLine[]): RackLocations {
  const result: RackLocations = {};
  if (!lines || lines.length === 0) return result;

  const candidates = lines.filter(l => l.stockBalance > 0 || l.totalRecv > 0);
  const pool = candidates.length > 0 ? candidates : lines;

  let poolIdx = 0;
  for (let rack = 1; rack <= FABRIC_RACKS; rack++) {
    // Occupy 8 to 14 shelves per rack
    const occupiedCount = 8 + (rack % 7);
    for (let shelf = 1; shelf <= occupiedCount && shelf <= FABRIC_SHELVES; shelf++) {
      const line = pool[poolIdx % pool.length];
      poolIdx++;
      const sid = shelfId(rack, shelf);
      const kgVal = Math.round(line.stockBalance > 0 ? line.stockBalance : (180 + (poolIdx % 250)));
      const rollVal = Math.max(2, Math.round(kgVal / 24));

      result[sid] = [
        {
          lineId: line.id,
          jobNo: line.jobNo,
          buyer: line.buyer,
          style: cleanStyleNo(line.style),
          color: line.color,
          fabric: `${line.fabricType} ${line.composition} ${line.gsm}gsm`,
          kg: kgVal,
          rolls: rollVal,
          placedOn: '10.11.2026',
        }
      ];
    }
  }
  return result;
}

// ============================================================================
// DATA TYPES & INTERFACES (100% PURE ENGLISH)
// ============================================================================

export interface FabricColorLine {
  id: string;
  idx: number;
  sl?: string;
  month: string;
  buyer: string;
  jobNo: string;
  style: string;
  color: string;
  pantone?: string;
  fabric: string;
  fabricType: string;
  construction: string;
  composition: string;
  gsm: string;
  dia: string;
  process: string;
  isImported?: boolean;

  // 1. Order / Required Qty (Kg)
  reqBody: number;
  reqRib: number;
  reqSJ: number;
  totalReq: number;

  // 2. Received Qty (Kg)
  recvBody: number;
  recvRib: number;
  recvSJ: number;
  totalRecv: number;
  dyeingBalance: number; // totalReq - totalRecv

  // 3. Issue / Delivery Qty (Kg)
  issuedBody: number;
  issuedRib: number;
  issuedSJ: number;
  totalIssued: number;

  // 4. Closing Stock (Kg)
  stockBody: number; // recvBody - issuedBody
  stockRib: number;  // recvRib - issuedRib
  stockSJ: number;   // recvSJ - issuedSJ
  stockBalance: number; // totalRecv - totalIssued

  // 5. Location & Leftover
  location: string;
  cuttingLeftover: number;
  excessQty: number;
  date: string;
  remarks?: string;

  challans: string;
  deliveryDate: string;
  supplier: string;
  dyeingFactory?: string;
  exFactoryDate: string;
  slot: string;
  merchandiser: string;
  qualityStatus: 'PASS' | 'PENDING' | 'HOLD';
  stockState: 'In Stock' | 'Partly Received' | 'Waiting Dyeing' | 'Fully Issued' | 'Sent to Reuse';
  isCuttingOk?: boolean;
}

export interface JobFabricGroup {
  key: string;
  buyer: string;
  jobNo: string;
  style: string;
  month: string;
  slot: string;
  merchandiser: string;
  supplier: string;
  dyeingFactory: string;
  fabric: string;
  fabricType: string;
  composition: string;
  gsm: string;
  dia: string;
  process: string;
  isImported?: boolean;

  // Aggregated quantities
  reqBody: number;
  reqRib: number;
  reqSJ: number;
  totalReq: number;

  recvBody: number;
  recvRib: number;
  recvSJ: number;
  totalRecv: number;
  totalBalance: number;

  issuedBody: number;
  issuedRib: number;
  issuedSJ: number;
  totalIssued: number;

  stockBody: number;
  stockRib: number;
  stockSJ: number;
  totalStock: number;

  cuttingLeftover: number;
  location: string;
  colorCount: number;
  colors: FabricColorLine[];
  primaryStatus: string;
  isCuttingOk?: boolean;
}

export interface SupplierChallanItem {
  id: string;
  challanNo: string;
  date: string;
  supplier: string;
  sourceType: 'SUPPLIER' | 'IMPORT' | 'CUTTING_LEFTOVER';
  buyer: string;
  jobNo: string;
  style: string;
  color: string;
  fabric: string;
  challanBodyKg: number;
  challanRibKg: number;
  challanSJKg: number;
  weighedBodyKg: number;
  weighedRibKg: number;
  weighedSJKg: number;
  totalKg: number;
  rollCount: number;
  weightDiffKg: number;
  rackLocation: string;
  remarks?: string;
  status: 'Accepted' | 'Pending Verification' | 'Rejected';
}

export interface CuttingIssueSlip {
  id: string;
  issueNo: string;
  date: string;
  buyer: string;
  jobNo: string;
  style: string;
  color: string;
  fabricDescription: string;
  bodyKg: number;
  ribKg: number;
  sjKg: number;
  totalKg: number;
  issuedBy: string;
  receivedBy: string;
  remarks: string;
  isCuttingOk?: boolean;
}

export interface LeftoverReturnRecord {
  id: string;
  date: string;
  jobNo: string;
  color: string;
  source: 'Cutting Return' | 'Closing Stock Balance' | 'Excess Delivery';
  bodyKg: number;
  ribKg: number;
  sjKg: number;
  totalKg: number;
  returnedBy: string;
  rackAssigned: string;
  status: 'Available in Leftover' | 'Reused' | 'Disposed';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FinishedFabricPage() {
  return (
    <CrossFilterProvider>
      <FinishedFabricPageInner />
    </CrossFilterProvider>
  );
}

function FinishedFabricPageInner() {
  const { filters: cfFilters, toggle: cfToggle } = useCrossFilter();

  // Navigation tabs (1 to 5, matching Odoo & Trims standard)
  const [activeTab, setActiveTab] = useState<'STOCK' | 'RECEIVE' | 'ISSUE' | 'LOCATION' | 'REUSE'>('STOCK');

  // Master Data state
  const [rawLines, setRawLines] = useState<FabricColorLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});
  const [showAllColors, setShowAllColors] = useState(false);

  // Import & Manual Entry state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Manual Job Form State
  const [manualJobForm, setManualJobForm] = useState({
    jobNo: '',
    buyer: 'Bestseller (ONLY)',
    style: '',
    month: 'November 2026',
    fabricType: 'Single Jersey',
    composition: '100% Combed Cotton',
    gsm: '180',
    dia: '68\" Open',
    process: 'Reactive Dyeing',
    supplier: 'Northern Dyeing Unit-1',
  });

  interface ManualColorRow {
    id: string;
    color: string;
    reqBody: number;
    recvBody: number;
    rollCount: number;
    location: string;
  }

  const [manualColors, setManualColors] = useState<ManualColorRow[]>([
    { id: '1', color: 'Jet Black', reqBody: 500, recvBody: 500, rollCount: 15, location: 'R-01 · Shelf 02' },
    { id: '2', color: 'Navy Blazer', reqBody: 450, recvBody: 450, rollCount: 14, location: 'R-01 · Shelf 03' },
    { id: '3', color: 'Anthracite Melange', reqBody: 380, recvBody: 380, rollCount: 12, location: 'R-01 · Shelf 04' },
  ]);

  const addManualColorRow = () => {
    const nextNum = manualColors.length + 1;
    setManualColors(prev => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        color: '',
        reqBody: 200,
        recvBody: 200,
        rollCount: 6,
        location: `R-${String((nextNum % 20) + 1).padStart(2, '0')} · Shelf 01`
      }
    ]);
  };

  const removeManualColorRow = (id: string) => {
    if (manualColors.length <= 1) return;
    setManualColors(prev => prev.filter(c => c.id !== id));
  };

  const updateManualColorRow = (id: string, field: keyof ManualColorRow, value: any) => {
    setManualColors(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  // Clear all fabric data
  const handleClearAllFabricData = () => {
    if (typeof window !== 'undefined' && window.confirm('Are you sure you want to delete all Fabric Store data? This will clear all records and rack locations.')) {
      setRawLines([]);
      setRackLoc({});
      try {
        localStorage.removeItem(FINISHED_FABRIC_STORAGE_KEY);
        localStorage.removeItem(RACK_STORE_KEY);
      } catch {}
      showToast('All finished fabric data removed. Store is clean.');
    }
  };

  // Submit Manual Fabric Job with multiple colors
  const handleManualFabricSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualJobForm.jobNo.trim()) {
      alert('Job No is required!');
      return;
    }
    const newLines: FabricColorLine[] = manualColors.map((col, idx) => {
      const reqBody = Number(col.reqBody) || 0;
      const recvBody = Number(col.recvBody) || 0;
      const totalReq = reqBody;
      const totalRecv = recvBody;
      const stockBalance = recvBody;
      const lineId = `f-man-${Date.now()}-${idx}`;

      return {
        id: lineId,
        idx: rawLines.length + idx + 1,
        month: manualJobForm.month,
        buyer: manualJobForm.buyer,
        jobNo: manualJobForm.jobNo.trim(),
        style: manualJobForm.style.trim() || 'STD-STYLE',
        color: col.color.trim() || `Color #${idx + 1}`,
        fabric: manualJobForm.fabricType,
        fabricType: parseFabricType(manualJobForm.fabricType),
        construction: parseConstruction(manualJobForm.fabricType),
        composition: manualJobForm.composition,
        gsm: manualJobForm.gsm,
        dia: manualJobForm.dia,
        process: manualJobForm.process,
        isImported: false,
        reqBody,
        reqRib: 0,
        reqSJ: 0,
        totalReq,
        recvBody,
        recvRib: 0,
        recvSJ: 0,
        totalRecv,
        dyeingBalance: Math.max(0, totalReq - totalRecv),
        issuedBody: 0,
        issuedRib: 0,
        issuedSJ: 0,
        totalIssued: 0,
        stockBody: recvBody,
        stockRib: 0,
        stockSJ: 0,
        stockBalance,
        location: col.location || 'R-01 · Shelf 01',
        cuttingLeftover: 0,
        excessQty: Math.max(0, totalReq - totalRecv > 0 ? 0 : totalRecv - totalReq),
        date: new Date().toLocaleDateString('en-GB'),
        challans: `CH-MAN-${Math.floor(1000 + Math.random() * 9000)}`,
        deliveryDate: new Date().toISOString().slice(0, 10),
        supplier: manualJobForm.supplier,
        dyeingFactory: manualJobForm.supplier,
        exFactoryDate: new Date().toISOString().slice(0, 10),
        slot: '1',
        merchandiser: 'Store Manager',
        qualityStatus: 'PASS',
        stockState: totalRecv > 0 ? 'In Stock' : 'Waiting Dyeing',
        isCuttingOk: false,
      };
    });

    const nextLines = [...newLines, ...rawLines];
    setRawLines(nextLines);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FINISHED_FABRIC_STORAGE_KEY, JSON.stringify(nextLines));
      } catch {}
    }

    // Update racks
    const updatedRacks = generateInitialRackLocations(nextLines);
    setRackLoc(updatedRacks);
    try {
      localStorage.setItem(RACK_STORE_KEY, JSON.stringify(updatedRacks));
    } catch {}

    setIsManualModalOpen(false);
    showToast(`Job #${manualJobForm.jobNo} with ${manualColors.length} colors saved successfully!`);
    setManualJobForm({
      jobNo: '',
      buyer: 'Bestseller (ONLY)',
      style: '',
      month: 'November 2026',
      fabricType: 'Single Jersey',
      composition: '100% Combed Cotton',
      gsm: '180',
      dia: '68\" Open',
      process: 'Reactive Dyeing',
      supplier: 'Northern Dyeing Unit-1',
    });
  };

  // Multi-Month Excel Workbook Importer
  const handleFabricWorkbookUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });

      const parsedLines: FabricColorLine[] = [];
      let importedIdx = rawLines.length;
      const sheetSummaries: { name: string; count: number }[] = [];

      wb.SheetNames.forEach((sheetName) => {
        const ws = wb.Sheets[sheetName];
        const rawMatrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (!rawMatrix || rawMatrix.length === 0) return;

        let sheetRowsCount = 0;
        const sheetMonth = sheetName.trim();

        // 1. Detect 2-Tier Header (Northern Fashions finish fabric stock.xlsx layout)
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(rawMatrix.length, 10); i++) {
          const row = rawMatrix[i];
          if (row && Array.isArray(row) && row.some(cell => /order\s*qty|fabric\s*type|received|style/i.test(String(cell)))) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx !== -1) {
          let currentBuyer = 'Bestseller (Only & Sons)';
          for (let rIdx = headerRowIdx + 2; rIdx < rawMatrix.length; rIdx++) {
            const r = rawMatrix[rIdx];
            if (!r || !Array.isArray(r)) continue;

            const nonNull = r.filter(x => x !== null && x !== undefined && String(x).trim() !== '');
            if (nonNull.length === 0) continue;

            if (r[1] && (r[2] === undefined || r[2] === null || String(r[2]).trim() === '') && nonNull.length <= 3) {
              const txt = String(r[1]).trim();
              if (!txt.toLowerCase().includes('total')) currentBuyer = txt;
              continue;
            }
            if (r[1] && String(r[1]).toLowerCase().includes('total')) continue;

            const slVal = r[0] ? String(r[0]).trim() : '';
            const jobVal = r[1] ? String(r[1]).trim() : '';
            const styleVal = r[2] ? String(r[2]).trim() : '';
            const fabricVal = r[3] ? String(r[3]).trim() : '';
            const compVal = r[4] ? String(r[4]).trim() : '';
            const procVal = r[5] ? String(r[5]).trim() : '';
            const gsmVal = r[6] ? String(r[6]).trim() : '';
            const diaVal = r[7] ? String(r[7]).trim() : '';
            const colorVal = r[8] ? String(r[8]).trim() : '';

            if (!styleVal && !colorVal && !jobVal) continue;

            const ordBody = Number(r[9]) || 0;
            const ordRib = Number(r[10]) || 0;
            const ordSJ = Number(r[11]) || 0;
            const totalReq = ordBody + ordRib + ordSJ;

            const recBody = Number(r[12]) || 0;
            const recRib = Number(r[13]) || 0;
            const recSJ = Number(r[14]) || 0;
            const totalRecv = recBody + recRib + recSJ;

            const issBody = Number(r[15]) || 0;
            const issRib = Number(r[16]) || 0;
            const issSJ = Number(r[17]) || 0;
            const totalIssued = issBody + issRib + issSJ;

            let stockBody = Number(r[18]) || 0;
            let stockRib = Number(r[19]) || 0;
            let stockSJ = 0;
            if (stockBody === 0 && recBody > 0) stockBody = Math.max(0, recBody - issBody);
            if (stockRib === 0 && recRib > 0) stockRib = Math.max(0, recRib - issRib);
            if (stockSJ === 0 && recSJ > 0) stockSJ = Math.max(0, recSJ - issSJ);
            const stockBalance = stockBody + stockRib + stockSJ;

            let locVal = '';
            if (r[20] && typeof r[20] === 'string' && isNaN(Number(r[20]))) {
              locVal = String(r[20]).trim();
            } else if (r[21] && typeof r[21] === 'string') {
              locVal = String(r[21]).trim();
            }

            importedIdx++;
            sheetRowsCount++;

            parsedLines.push({
              id: `f-imp-${importedIdx}-${Date.now()}`,
              idx: importedIdx,
              sl: slVal || String(importedIdx),
              month: sheetMonth,
              buyer: currentBuyer,
              jobNo: jobVal || `JOB-${importedIdx}`,
              style: styleVal || '—',
              color: colorVal || 'Solid',
              fabric: fabricVal || 'Single Jersey',
              fabricType: parseFabricType(fabricVal),
              construction: parseConstruction(fabricVal),
              composition: compVal || '100% Cotton',
              gsm: gsmVal || '160',
              dia: diaVal || '68"',
              process: procVal || '—',
              isImported: /imported|woven|chiffon|poplin/i.test(fabricVal),
              reqBody: ordBody,
              reqRib: ordRib,
              reqSJ: ordSJ,
              totalReq,
              recvBody: recBody,
              recvRib: recRib,
              recvSJ: recSJ,
              totalRecv,
              dyeingBalance: Math.max(0, totalReq - totalRecv),
              issuedBody: issBody,
              issuedRib: issRib,
              issuedSJ: issSJ,
              totalIssued,
              stockBody,
              stockRib,
              stockSJ,
              stockBalance,
              location: locVal || (stockBalance > 0 ? 'F.ST' : '—'),
              cuttingLeftover: 0,
              excessQty: Math.max(0, totalRecv - totalReq),
              date: new Date().toLocaleDateString('en-GB'),
              challans: `CH-IMP-${1000 + importedIdx}`,
              deliveryDate: new Date().toISOString().slice(0, 10),
              exFactoryDate: new Date().toISOString().slice(0, 10),
              supplier: 'Northern Dyeing',
              slot: '1',
              merchandiser: 'Store Manager',
              qualityStatus: 'PASS',
              stockState: stockBalance > 0 ? 'In Stock' : totalRecv > 0 ? 'Fully Issued' : 'Waiting Dyeing',
              isCuttingOk: false,
            });
          }
        } else {
          // 2. Fallback to flat 1-tier parser
          const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
          rows.forEach((row) => {
            const findVal = (regex: RegExp) => {
              const key = Object.keys(row).find(k => regex.test(k.trim()));
              return key ? row[key] : '';
            };

            const jobVal = String(findVal(/^(job|job\s*no|job#|order|order\s*no|po)/i) || '').trim();
            const colorVal = String(findVal(/^(color|shade|fabric\s*color)/i) || '').trim();
            if (!jobVal && !colorVal) return;

            const buyerVal = String(findVal(/^(buyer|customer|brand)/i) || 'Bestseller').trim();
            const styleVal = String(findVal(/^(style|style\s*no|style#)/i) || '').trim();
            const fabricVal = String(findVal(/^(fabric|fabric\s*type|construction|description|item)/i) || 'Single Jersey').trim();
            const compVal = String(findVal(/^(comp|composition)/i) || '100% Organic Cotton').trim();
            const gsmVal = String(findVal(/^(gsm|weight)/i) || '180').trim();
            const diaVal = String(findVal(/^(dia|width)/i) || '68\" Open').trim();
            const processVal = String(findVal(/^(process|finishing|finish)/i) || 'Reactive Dyeing').trim();

            const reqBody = Number(findVal(/^(req\s*body|order\s*body|booking\s*body|req\s*kg|order\s*kg|required)/i)) || 0;
            const reqRib = Number(findVal(/^(req\s*rib|order\s*rib)/i)) || 0;
            const reqSJ = Number(findVal(/^(req\s*sj|order\s*sj)/i)) || 0;
            const totalReq = (reqBody + reqRib + reqSJ) || Number(findVal(/^(total\s*req|total\s*order|total\s*booking)/i)) || 0;

            const recvBody = Number(findVal(/^(recv\s*body|rec\s*body|received\s*body|delivery\s*body|weighed\s*body|recv\s*kg|received\s*kg|received|recv)/i)) || 0;
            const recvRib = Number(findVal(/^(recv\s*rib|rec\s*rib|received\s*rib|delivery\s*rib)/i)) || 0;
            const recvSJ = Number(findVal(/^(recv\s*sj|rec\s*sj|received\s*sj|delivery\s*sj)/i)) || 0;
            const totalRecv = (recvBody + recvRib + recvSJ) || Number(findVal(/^(total\s*recv|total\s*received)/i)) || recvBody;

            const issuedBody = Number(findVal(/^(issue\s*body|issued\s*body|delivery\s*cutting|issue\s*kg|issued\s*kg|issued|issue)/i)) || 0;
            const issuedRib = Number(findVal(/^(issue\s*rib|issued\s*rib)/i)) || 0;
            const issuedSJ = Number(findVal(/^(issue\s*sj|issued\s*sj)/i)) || 0;
            const totalIssued = (issuedBody + issuedRib + issuedSJ) || issuedBody;

            const dyeingBalance = Math.max(0, totalReq - totalRecv);
            const stockBody = Math.max(0, recvBody - issuedBody);
            const stockRib = Math.max(0, recvRib - issuedRib);
            const stockSJ = Math.max(0, recvSJ - issuedSJ);
            const stockBalance = Math.max(0, totalRecv - totalIssued);

            const locationVal = String(findVal(/^(location|rack|bin|shelf|store\s*loc|store\s*location)/i) || '').trim() || 'F.ST';
            const rowMonth = String(findVal(/^(month|mon)/i) || sheetMonth || 'November').trim();

            importedIdx++;
            sheetRowsCount++;

            parsedLines.push({
              id: `f-imp-${importedIdx}-${Date.now()}`,
              idx: importedIdx,
              sl: String(importedIdx),
              month: rowMonth,
              buyer: buyerVal,
              jobNo: jobVal || `JOB-${importedIdx}`,
              style: styleVal || `STY-${importedIdx}`,
              color: colorVal || 'Solid Color',
              fabric: fabricVal,
              fabricType: parseFabricType(fabricVal),
              construction: parseConstruction(fabricVal),
              composition: compVal,
              gsm: gsmVal,
              dia: diaVal,
              process: processVal,
              isImported: /imported|woven|chiffon|poplin/i.test(fabricVal),
              reqBody,
              reqRib,
              reqSJ,
              totalReq,
              recvBody,
              recvRib,
              recvSJ,
              totalRecv,
              dyeingBalance,
              issuedBody,
              issuedRib,
              issuedSJ,
              totalIssued,
              stockBody,
              stockRib,
              stockSJ,
              stockBalance,
              location: locationVal,
              cuttingLeftover: 0,
              excessQty: Math.max(0, totalRecv - totalReq),
              date: new Date().toLocaleDateString('en-GB'),
              challans: `CH-IMP-${1000 + importedIdx}`,
              deliveryDate: new Date().toISOString().slice(0, 10),
              exFactoryDate: new Date().toISOString().slice(0, 10),
              supplier: 'Northern Dyeing',
              slot: '1',
              merchandiser: 'Store Manager',
              qualityStatus: 'PASS',
              stockState: stockBalance > 0 ? 'In Stock' : totalRecv > 0 ? 'Fully Issued' : 'Waiting Dyeing',
              isCuttingOk: false,
            });
          });
        }
        sheetSummaries.push({ name: sheetName, count: sheetRowsCount });
      });

      if (parsedLines.length === 0) {
        alert("No valid data found in workbook. Please verify columns.");
        setIsImporting(false);
        return;
      }

      const nextLines = [...parsedLines, ...rawLines];
      setRawLines(nextLines);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(FINISHED_FABRIC_STORAGE_KEY, JSON.stringify(nextLines));
        } catch {}
      }

      const newRacks = generateInitialRackLocations(nextLines);
      setRackLoc(newRacks);
      try {
        localStorage.setItem(RACK_STORE_KEY, JSON.stringify(newRacks));
      } catch {}

      setIsImportModalOpen(false);
      setIsImporting(false);
      const summaryText = sheetSummaries.map(s => `${s.name}: ${s.count} rows`).join(', ');
      showToast(`Successfully imported ${parsedLines.length} records (${summaryText})!`);
    } catch (err: any) {
      console.error('Import error:', err);
      alert("Import error: " + (err.message || "Unknown error"));
      setIsImporting(false);
    }
  };


  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedFabricType, setSelectedFabricType] = useState('ALL');
  const [filterImportedOnly, setFilterImportedOnly] = useState(false);

  // Dashboard visibility collapse toggle
  const [showDashboard, setShowDashboard] = useState(true);

  // Column Section Toggle Buttons (Professional Odoo filter pills)
  const [visibleSections, setVisibleSections] = useState({
    jobSpecs: true,      // SL, Job, Style, Fabric Type, Composition, Process, GSM, Dia, Color
    orderQty: true,      // Order Qty: Body, Rib, S. Jersey, Total
    receivedQty: true,   // Received Qty: Body, Rib, S. Jersey, Total
    deliveryQty: true,   // Issue / Delivery Qty: Body, Rib, S. Jersey, Total
    closingStock: true,  // Closing Stock: Body, Rib, S. Jersey, Total
    locationInfo: true,  // Location, Cutting Leftover, Excess Qty, Date
  });

  // Selected Job & Action Modal state
  const [selectedJobDetail, setSelectedJobDetail] = useState<JobFabricGroup | null>(null);
  const [actionModalMode, setActionModalMode] = useState<'VIEW' | 'ISSUE' | 'RECEIVE'>('VIEW');
  const [actionForm, setActionForm] = useState({
    selectedColorId: '',
    colorName: '',
    bodyKg: 0,
    ribKg: 0,
    sjKg: 0,
    rollCount: 1,
    challanNo: '',
    supplier: 'Northern Dyeing Unit-1',
    location: 'F.ST',
    cuttingLine: 'Cutting Table-1',
    issuedTo: 'Cutting Master',
    remarks: '',
  });

  const openJobModal = (job: JobFabricGroup, mode: 'VIEW' | 'ISSUE' | 'RECEIVE' = 'VIEW') => {
    setSelectedJobDetail(job);
    setActionModalMode(mode);
    const firstColor = job.colors[0];
    setActionForm({
      selectedColorId: firstColor ? firstColor.id : '',
      colorName: firstColor ? firstColor.color : '',
      bodyKg: 0,
      ribKg: 0,
      sjKg: 0,
      rollCount: 1,
      challanNo: `CH-NFL-${Math.floor(1000 + Math.random() * 9000)}`,
      supplier: job.supplier || 'Northern Dyeing Unit-1',
      location: (firstColor && firstColor.location) || 'F.ST',
      cuttingLine: 'Cutting Table-1',
      issuedTo: 'Cutting Master',
      remarks: '',
    });
  };

  const handleConfirmIssueFromModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobDetail) return;
    const { selectedColorId, bodyKg, ribKg, sjKg, cuttingLine, issuedTo, remarks } = actionForm;
    const bKg = Math.max(0, Number(bodyKg) || 0);
    const rKg = Math.max(0, Number(ribKg) || 0);
    const sKg = Math.max(0, Number(sjKg) || 0);
    const totIssue = bKg + rKg + sKg;
    if (totIssue <= 0) {
      alert('Please enter at least one quantity (Body, Rib, or S.Jersey) to issue.');
      return;
    }

    const targetColor = selectedJobDetail.colors.find(c => c.id === selectedColorId) || selectedJobDetail.colors[0];
    if (!targetColor) return;

    const nextLines = rawLines.map(l => {
      if (l.id === targetColor.id) {
        const issuedBody = l.issuedBody + bKg;
        const issuedRib = l.issuedRib + rKg;
        const issuedSJ = l.issuedSJ + sKg;
        const totalIssued = issuedBody + issuedRib + issuedSJ;

        const stockBody = Math.max(0, l.recvBody - issuedBody);
        const stockRib = Math.max(0, l.recvRib - issuedRib);
        const stockSJ = Math.max(0, l.recvSJ - issuedSJ);
        const stockBalance = stockBody + stockRib + stockSJ;

        let stockState: FabricColorLine['stockState'] = 'In Stock';
        if (stockBalance <= 0) stockState = 'Fully Issued';
        else if (l.dyeingBalance > l.totalReq * 0.05) stockState = 'Partly Received';

        return {
          ...l,
          issuedBody,
          issuedRib,
          issuedSJ,
          totalIssued,
          stockBody,
          stockRib,
          stockSJ,
          stockBalance,
          stockState,
        };
      }
      return l;
    });

    setRawLines(nextLines);
    try {
      localStorage.setItem(FINISHED_FABRIC_STORAGE_KEY, JSON.stringify(nextLines));
    } catch {}

    const newSlip: CuttingIssueSlip = {
      id: `ci-${Date.now()}`,
      issueNo: `FI-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().slice(0, 10),
      buyer: selectedJobDetail.buyer,
      jobNo: selectedJobDetail.jobNo,
      style: selectedJobDetail.style,
      color: targetColor.color || 'Solid',
      fabricDescription: `${selectedJobDetail.fabric} ${selectedJobDetail.gsm} GSM`,
      bodyKg: bKg,
      ribKg: rKg,
      sjKg: sKg,
      totalKg: totIssue,
      issuedBy: 'Store Officer',
      receivedBy: issuedTo || 'Cutting Master',
      remarks: remarks || `Issued to ${cuttingLine}`,
      isCuttingOk: false,
    };
    setCuttingIssues(prev => [newSlip, ...prev]);

    showToast(`Successfully issued ${totIssue} kg of ${selectedJobDetail.jobNo} (${targetColor.color || 'Color'}) to ${cuttingLine}!`);
    setSelectedJobDetail(null);
  };

  const handleConfirmReceiveFromModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobDetail) return;
    const { selectedColorId, colorName, bodyKg, ribKg, sjKg, rollCount, challanNo, supplier, location, remarks } = actionForm;
    const bKg = Math.max(0, Number(bodyKg) || 0);
    const rKg = Math.max(0, Number(ribKg) || 0);
    const sKg = Math.max(0, Number(sjKg) || 0);
    const totRecv = bKg + rKg + sKg;
    if (totRecv <= 0) {
      alert('Please enter at least one received quantity (Body, Rib, or S.Jersey).');
      return;
    }

    const existingColor = selectedJobDetail.colors.find(c => c.id === selectedColorId);
    const finalColorName = (colorName || (existingColor ? existingColor.color : '')).trim();

    let nextLines: FabricColorLine[];
    if (existingColor) {
      nextLines = rawLines.map(l => {
        if (l.id === existingColor.id) {
          const recvBody = l.recvBody + bKg;
          const recvRib = l.recvRib + rKg;
          const recvSJ = l.recvSJ + sKg;
          const totalRecv = recvBody + recvRib + recvSJ;

          const stockBody = Math.max(0, recvBody - l.issuedBody);
          const stockRib = Math.max(0, recvRib - l.issuedRib);
          const stockSJ = Math.max(0, recvSJ - l.issuedSJ);
          const stockBalance = stockBody + stockRib + stockSJ;

          const dyeingBalance = Math.max(0, l.totalReq - totalRecv);

          let stockState: FabricColorLine['stockState'] = 'In Stock';
          if (stockBalance <= 0) stockState = 'Fully Issued';
          else if (dyeingBalance > l.totalReq * 0.05) stockState = 'Partly Received';

          return {
            ...l,
            color: finalColorName || l.color,
            recvBody,
            recvRib,
            recvSJ,
            totalRecv,
            dyeingBalance,
            stockBody,
            stockRib,
            stockSJ,
            stockBalance,
            stockState,
            location: location || l.location,
          };
        }
        return l;
      });
    } else {
      const newLine: FabricColorLine = {
        id: `f-${Date.now()}`,
        idx: rawLines.length + 1,
        month: selectedJobDetail.month || 'December-26',
        buyer: selectedJobDetail.buyer,
        jobNo: selectedJobDetail.jobNo,
        style: selectedJobDetail.style,
        color: finalColorName || 'New Color',
        fabric: selectedJobDetail.fabric,
        fabricType: selectedJobDetail.fabricType,
        construction: 'Plain Single',
        composition: selectedJobDetail.composition,
        gsm: selectedJobDetail.gsm,
        dia: selectedJobDetail.dia,
        process: selectedJobDetail.process,
        isImported: selectedJobDetail.isImported,
        reqBody: bKg,
        reqRib: rKg,
        reqSJ: sKg,
        totalReq: totRecv,
        recvBody: bKg,
        recvRib: rKg,
        recvSJ: sKg,
        totalRecv: totRecv,
        dyeingBalance: 0,
        issuedBody: 0,
        issuedRib: 0,
        issuedSJ: 0,
        totalIssued: 0,
        stockBody: bKg,
        stockRib: rKg,
        stockSJ: sKg,
        stockBalance: totRecv,
        location: location || 'F.ST',
        cuttingLeftover: 0,
        excessQty: 0,
        date: new Date().toLocaleDateString('en-GB'),
        challans: challanNo || `CH-NFL-${Date.now().toString().slice(-4)}`,
        deliveryDate: new Date().toISOString().slice(0, 10),
        exFactoryDate: new Date().toISOString().slice(0, 10),
        supplier: supplier || 'Northern Dyeing Unit-1',
        slot: '1',
        merchandiser: 'Store Manager',
        qualityStatus: 'PASS',
        stockState: 'In Stock',
        isCuttingOk: false,
      };
      nextLines = [newLine, ...rawLines];
    }

    setRawLines(nextLines);
    try {
      localStorage.setItem(FINISHED_FABRIC_STORAGE_KEY, JSON.stringify(nextLines));
    } catch {}

    const newChallan: SupplierChallanItem = {
      id: `ch-${Date.now()}`,
      challanNo: challanNo || `CH-NFL-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().slice(0, 10),
      supplier: supplier || 'Northern Dyeing Unit-1',
      sourceType: 'SUPPLIER',
      buyer: selectedJobDetail.buyer,
      jobNo: selectedJobDetail.jobNo,
      style: selectedJobDetail.style,
      color: finalColorName || 'New Color',
      fabric: `${selectedJobDetail.fabric} ${selectedJobDetail.gsm} GSM`,
      challanBodyKg: bKg,
      challanRibKg: rKg,
      challanSJKg: sKg,
      weighedBodyKg: bKg,
      weighedRibKg: rKg,
      weighedSJKg: sKg,
      totalKg: totRecv,
      rollCount: Number(rollCount) || 1,
      weightDiffKg: 0,
      rackLocation: location || 'F.ST',
      remarks: remarks || 'Received into store',
      status: 'Accepted',
    };
    setChallans(prev => [newChallan, ...prev]);

    showToast(`Successfully received ${totRecv} kg for ${selectedJobDetail.jobNo} (${finalColorName}) into store!`);
    setSelectedJobDetail(null);
  };
  const [drawerVisibleSections, setDrawerVisibleSections] = useState({
    orderQty: true,
    receivedQty: true,
    deliveryQty: true,
    closingStock: true,
    location: true,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 35;

  // Modals & Action States
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Location state
  const [rackLoc, setRackLoc] = useState<RackLocations>({});

  // --------------------------------------------------------------------------
  // RECEIVE TAB STATE
  // --------------------------------------------------------------------------
  const [receiveSourceFilter, setReceiveSourceFilter] = useState<'ALL' | 'SUPPLIER' | 'IMPORT' | 'CUTTING_LEFTOVER'>('ALL');
  const [receiveSearchQuery, setReceiveSearchQuery] = useState('');
  const inwardLines = useMemo(() => {
    return rawLines.filter(line => {
      if (receiveSourceFilter === 'IMPORT' && !line.isImported) return false;
      if (receiveSourceFilter === 'SUPPLIER' && line.isImported) return false;
      if (!receiveSearchQuery) return true;
      const q = receiveSearchQuery.toLowerCase();
      return `${line.jobNo} ${line.style} ${line.color} ${line.buyer} ${line.fabric} ${line.location}`.toLowerCase().includes(q);
    });
  }, [rawLines, receiveSourceFilter, receiveSearchQuery]);

  const handleAcceptFabricLine = (lineId: string) => {
    const updated = rawLines.map(l => l.id === lineId ? { ...l, qualityStatus: 'PASS' as const, stockState: 'In Stock' as const } : l);
    setRawLines(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FINISHED_FABRIC_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }
    showToast('Fabric lot verified and accepted into stock successfully!');
  };
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    challanNo: '',
    date: new Date().toISOString().slice(0, 10),
    supplier: '',
    sourceType: 'SUPPLIER' as 'SUPPLIER' | 'IMPORT' | 'CUTTING_LEFTOVER',
    buyer: 'Bestseller (Only & Sons)',
    jobNo: '',
    style: '',
    fabricType: 'Single Jersey',
    composition: '100% Organic Cotton',
    gsm: '160',
    dia: '64"',
    colors: [
      {
        color: '',
        reqBody: 0,
        reqSJ: 0,
        reqRib: 0,
        recvBody: 0,
        recvSJ: 0,
        recvRib: 0,
        location: 'R-01-S01',
        rollCount: 1,
        remarks: '',
      },
    ],
  });

  // Supplier Challans List
  const [challans, setChallans] = useState<SupplierChallanItem[]>([
    {
      id: 'ch-1',
      challanNo: 'CH-NFL-4828',
      date: '2026-11-08',
      supplier: 'Northern Dyeing Unit-2',
      sourceType: 'SUPPLIER',
      buyer: 'Bestseller (Only & Sons)',
      jobNo: 'BSONS 48283 4th',
      style: '22042341',
      color: 'Black C-N10 (B/Part Dye)',
      fabric: 'Top Ctn, CVC Fleece 340 GSM',
      challanBodyKg: 1180,
      challanRibKg: 285,
      challanSJKg: 0,
      weighedBodyKg: 1180,
      weighedRibKg: 285,
      weighedSJKg: 0,
      totalKg: 1465,
      rollCount: 28,
      weightDiffKg: 0,
      rackLocation: 'R-04 · Shelf 02',
      remarks: 'Lab approved shade',
      status: 'Accepted',
    },
    {
      id: 'ch-2',
      challanNo: 'IMP-TEX-8812',
      date: '2026-11-09',
      supplier: 'Texella Sourcing Overseas',
      sourceType: 'IMPORT',
      buyer: 'Besrseller (Name It)',
      jobNo: '48886',
      style: '13266639',
      color: 'Icy Pink',
      fabric: 'Chiffon Woven Imported 120 GSM',
      challanBodyKg: 40,
      challanRibKg: 0,
      challanSJKg: 0,
      weighedBodyKg: 40,
      weighedRibKg: 0,
      weighedSJKg: 0,
      totalKg: 40,
      rollCount: 2,
      weightDiffKg: 0,
      rackLocation: 'R-12 · Shelf 05',
      remarks: 'Imported Woven fabric for combo style',
      status: 'Accepted',
    },
    {
      id: 'ch-3',
      challanNo: 'RET-CUT-0914',
      date: '2026-11-10',
      supplier: 'Cutting Floor Unit-1',
      sourceType: 'CUTTING_LEFTOVER',
      buyer: 'OVS SPA',
      jobNo: 'OVS 47858',
      style: '271TSH033TS33-6198',
      color: 'Cashmere Blue',
      fabric: 'S/J 100% BCI Ctn 140 GSM',
      challanBodyKg: 18,
      challanRibKg: 0,
      challanSJKg: 0,
      weighedBodyKg: 18,
      weighedRibKg: 0,
      weighedSJKg: 0,
      totalKg: 18,
      rollCount: 1,
      weightDiffKg: 0,
      rackLocation: 'R-18 · Shelf 01',
      remarks: 'Returned from cutting marker lay calibration',
      status: 'Accepted',
    },
    {
      id: 'ch-4',
      challanNo: 'CH-PAK-3301',
      date: '2026-11-10',
      supplier: 'Pakiza Dyeing & Printing',
      sourceType: 'SUPPLIER',
      buyer: 'United Textile (UTG)',
      jobNo: 'UT 41947 29th',
      style: 'BAD1101AX',
      color: 'Black',
      fabric: 'L/S/J 95% Regenagri Ctn 5% Elas',
      challanBodyKg: 1540,
      challanRibKg: 0,
      challanSJKg: 0,
      weighedBodyKg: 1540,
      weighedRibKg: 0,
      weighedSJKg: 0,
      totalKg: 1540,
      rollCount: 32,
      weightDiffKg: 0,
      rackLocation: 'R-07 · Shelf 08',
      remarks: 'Full delivery received',
      status: 'Accepted',
    },
  ]);

  // --------------------------------------------------------------------------
  // ISSUE TO CUTTING TAB STATE
  // --------------------------------------------------------------------------
  const [issueSearchQuery, setIssueSearchQuery] = useState('');
  const [selectedIssueJob, setSelectedIssueJob] = useState<JobFabricGroup | null>(null);
  const [todayDeliveries, setTodayDeliveries] = useState<
    Record<string, { bodyKg: number; sjKg: number; ribKg: number; isCuttingOk: boolean }>
  >({});

  // Cutting Issuance Log
  const [cuttingIssues, setCuttingIssues] = useState<CuttingIssueSlip[]>([
    {
      id: 'ci-1',
      issueNo: 'FI-2026-1101',
      date: '2026-11-09',
      buyer: 'Bestseller (Only & Sons)',
      jobNo: 'BSONS 48283 4th',
      style: '22042341',
      color: 'Black C-N10 (B/Part Dye)',
      fabricDescription: 'Top Ctn, CVC Fleece 340 GSM 72"',
      bodyKg: 1149,
      ribKg: 272,
      sjKg: 0,
      totalKg: 1421,
      issuedBy: 'Store Officer Hasan',
      receivedBy: 'Cutting Master Kabir',
      remarks: 'Dispatched for Body and Rib lot cutting',
      isCuttingOk: false,
    },
    {
      id: 'ci-2',
      issueNo: 'FI-2026-1102',
      date: '2026-11-10',
      buyer: 'Bestseller (ONLY)',
      jobNo: '48845',
      style: '15389960',
      color: 'Orchid Bloom',
      fabricDescription: 'S/J 100% Organic ctn 160 GSM 64"',
      bodyKg: 543,
      ribKg: 0,
      sjKg: 0,
      totalKg: 543,
      issuedBy: 'Store Officer Hasan',
      receivedBy: 'Cutting Table 2 Supervisor',
      remarks: 'Full lay issued, marker approved',
      isCuttingOk: true,
    },
  ]);

  // --------------------------------------------------------------------------
  // LEFTOVER & REUSE LEDGER STATE
  // --------------------------------------------------------------------------
  const [leftoverLedger, setLeftoverLedger] = useState<LeftoverReturnRecord[]>([
    {
      id: 'lr-1',
      date: '2026-11-09',
      jobNo: 'BSONS 48283 4th',
      color: 'Black C-N10 (B/Part Dye)',
      source: 'Closing Stock Balance',
      bodyKg: 31,
      ribKg: 13,
      sjKg: 0,
      totalKg: 44,
      returnedBy: 'Store Inventory Closing',
      rackAssigned: 'R-19 · Shelf 02',
      status: 'Available in Leftover',
    },
    {
      id: 'lr-2',
      date: '2026-11-10',
      jobNo: 'OVS 47858',
      color: 'Cashmere Blue',
      source: 'Cutting Return',
      bodyKg: 18,
      ribKg: 0,
      sjKg: 0,
      totalKg: 18,
      returnedBy: 'Cutting Floor Unit-1',
      rackAssigned: 'R-18 · Shelf 01',
      status: 'Available in Leftover',
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load rack locations from localStorage
  useEffect(() => {
    let stored: RackLocations | null = null;
    try {
      stored = JSON.parse(localStorage.getItem(RACK_STORE_KEY) || 'null');
    } catch {
      stored = null;
    }
    if (stored && typeof stored === 'object' && Object.keys(stored).length > 20) {
      setRackLoc(stored);
    }
  }, []);

  const saveRackLoc = (next: RackLocations, message: string) => {
    setRackLoc(next);
    try {
      localStorage.setItem(RACK_STORE_KEY, JSON.stringify(next));
    } catch {
      /* blocked */
    }
    showToast(message);
  };

  // --------------------------------------------------------------------------
  // LOAD MASTER DATA FROM STATIC DATASET
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        let storedLines: FabricColorLine[] | null = null;
        try {
          const raw = localStorage.getItem(FINISHED_FABRIC_STORAGE_KEY);
          if (raw) storedLines = JSON.parse(raw);
        } catch {
          storedLines = null;
        }

        if (storedLines && Array.isArray(storedLines) && storedLines.length > 0) {
          if (isMounted) {
            setRawLines(storedLines);
            setIsLoading(false);
          }
          return;
        }

        const res = await fetch('/data/finished-bootstrap.json');
        if (!res.ok) throw new Error('Failed to load finished fabric dataset');
        const json = await res.json();
        if (json?.lines?.F && json.lines.F.length > 0 && isMounted) {
          const parsed: FabricColorLine[] = json.lines.F.map((item: any, idx: number) => {
            const reqBody = Number(item.rb) || 0;
            const reqRib = Number(item.rl) || 0;
            const reqSJ = Number(item.rs) || (idx % 4 === 1 ? Math.round(reqBody * 0.12) : 0);
            const totalReq = reqBody + reqRib + reqSJ;

            const recvBody = Number(item.vb) || 0;
            const recvRib = Number(item.vl) || 0;
            const recvSJ = Number(item.vs) || (reqSJ > 0 && recvBody > 0 ? Math.min(reqSJ, Math.round(recvBody * 0.11)) : 0);
            const totalRecv = recvBody + recvRib + recvSJ;

            const dyeingBalance = Math.max(0, totalReq - totalRecv);

            const issuedBody = recvBody > 0 ? (idx % 3 === 0 ? recvBody : Math.round(recvBody * 0.88)) : 0;
            const issuedRib = recvRib > 0 ? (idx % 3 === 0 ? recvRib : Math.round(recvRib * 0.85)) : 0;
            const issuedSJ = recvSJ > 0 ? (idx % 3 === 0 ? recvSJ : Math.round(recvSJ * 0.85)) : 0;
            const totalIssued = issuedBody + issuedRib + issuedSJ;

            const stockBody = Math.max(0, recvBody - issuedBody);
            const stockRib = Math.max(0, recvRib - issuedRib);
            const stockSJ = Math.max(0, recvSJ - issuedSJ);
            const stockBalance = stockBody + stockRib + stockSJ;

            const isImported = Boolean(item.isImported || /imported|woven|chiffon|poplin/i.test(item.f || ''));

            let stockState: FabricColorLine['stockState'] = 'In Stock';
            if (totalRecv <= 0) stockState = 'Waiting Dyeing';
            else if (dyeingBalance > totalReq * 0.05 && stockBalance > 0.5) stockState = 'Partly Received';
            else if (stockBalance <= 0) stockState = 'Fully Issued';

            const rNum = (idx % FABRIC_RACKS) + 1;
            const sNum = (Math.floor(idx / FABRIC_RACKS) % FABRIC_SHELVES) + 1;
            const defaultLocation = item.loc && item.loc !== '0' && item.loc !== 'undefined' ? String(item.loc).trim() : 'F.ST';

            return {
              id: `f-${idx}`,
              idx: idx + 1,
              month: item.m || 'December-26',
              buyer: item.b || 'Only',
              jobNo: String(item.j || '').replace(/#/g, ''),
              style: cleanStyleNo(String(item.st || '')),
              color: item.c ? String(item.c).trim() : '',
              fabric: item.f ? String(item.f).trim() : '',
              fabricType: item.f ? parseFabricType(item.f) : '',
              construction: item.f ? parseConstruction(item.f) : '',
              composition: item.comp ? String(item.comp).trim() : '',
              gsm: item.gsm ? String(item.gsm).trim() : '',
              dia: item.dia ? String(item.dia).trim() : '',
              process: item.ap ? String(item.ap).trim() : '',
              isImported,
              reqBody,
              reqRib,
              reqSJ,
              totalReq,
              recvBody,
              recvRib,
              recvSJ,
              totalRecv,
              dyeingBalance,
              issuedBody,
              issuedRib,
              issuedSJ,
              totalIssued,
              stockBody,
              stockRib,
              stockSJ,
              stockBalance,
              location: defaultLocation,
              cuttingLeftover: stockBalance > 0 && stockBalance < 50 ? Math.round(stockBalance * 0.4) : 0,
              excessQty: Math.max(0, totalRecv - totalReq),
              date: item.ae || '11.11.26',
              challans: String(item.ch || `CH-NFL-${1000 + idx}`),
              deliveryDate: item.ae || '2026-11-15',
              supplier: item.df ? (item.df === 'NFL' ? 'Northern Dyeing Unit-1' : item.df === 'NCL' ? 'Northern Composite Ltd' : `${item.df} Supplier`) : 'Northern Dyeing',
              dyeingFactory: item.df || 'Northern Dyeing',
              exFactoryDate: item.tpe || '2026-11-25',
              slot: String(item.sl || '1'),
              merchandiser: item.mr || 'Store Merchandiser',
              qualityStatus: 'PASS',
              stockState,
              isCuttingOk: stockBalance <= 5 && totalIssued > 0,
            };
          });

          // Seed demo locations across 20 Racks x 20 Shelves if empty
          const initialRacks = generateInitialRackLocations(parsed);
          let storedRacks: RackLocations | null = null;
          try {
            storedRacks = JSON.parse(localStorage.getItem(RACK_STORE_KEY) || 'null');
          } catch {
            storedRacks = null;
          }
          if (storedRacks && typeof storedRacks === 'object' && Object.keys(storedRacks).length > 20) {
            setRackLoc(storedRacks);
          } else {
            setRackLoc(initialRacks);
            try {
              localStorage.setItem(RACK_STORE_KEY, JSON.stringify(initialRacks));
            } catch {
              /* ignore */
            }
          }

          setRawLines(parsed);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error fetching finished-bootstrap:', err);
        setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  function parseFabricType(s: string): string {
    if (!s || !s.trim()) return '';
    const t = String(s || '').toLowerCase();
    if (/mesh/.test(t)) return 'Mesh';
    if (/rib/.test(t)) return 'Rib';
    if (/interlock/.test(t)) return 'Interlock';
    if (/fleece/.test(t)) return 'Fleece';
    if (/terry/.test(t)) return 'Terry';
    if (/pique|lacoste/.test(t)) return 'Pique';
    if (/s\s*\/\s*j|single\s*jersey|\bsj\b|jersey/.test(t)) return 'SJ';
    if (/woven|chiffon|poplin/.test(t)) return 'Woven';
    return s.trim();
  }

  function parseConstruction(s: string): string {
    const t = String(s || '').toLowerCase();
    if (/1\s*x\s*1/.test(t)) return '1x1 Rib';
    if (/2\s*x\s*1|2\s*x\s*2/.test(t)) return '2x1 Rib';
    if (/brush|fleece/.test(t)) return 'Brushed fleece';
    if (/terry|french terry/.test(t)) return 'Loop back Terry';
    if (/y\.?\s*\/?\s*d|stripe/.test(t)) return 'Yarn-dyed Stripe';
    return 'Plain Single';
  }

  // --------------------------------------------------------------------------
  // GROUPING BY BUYER & JOB (MULTI-COLOR ENGINE)
  // --------------------------------------------------------------------------
  const jobGroups = useMemo(() => {
    const map = new Map<string, JobFabricGroup>();

    rawLines.forEach((line) => {
      const key = `${line.buyer}|${line.jobNo}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          buyer: line.buyer,
          jobNo: line.jobNo,
          style: line.style,
          month: line.month,
          slot: line.slot,
          merchandiser: line.merchandiser,
          supplier: line.supplier,
          dyeingFactory: line.dyeingFactory || line.supplier,
          fabric: line.fabric,
          fabricType: line.fabricType,
          composition: line.composition,
          gsm: line.gsm,
          dia: line.dia,
          process: line.process,
          isImported: line.isImported,
          reqBody: 0,
          reqRib: 0,
          reqSJ: 0,
          totalReq: 0,
          recvBody: 0,
          recvRib: 0,
          recvSJ: 0,
          totalRecv: 0,
          totalBalance: 0,
          issuedBody: 0,
          issuedRib: 0,
          issuedSJ: 0,
          totalIssued: 0,
          stockBody: 0,
          stockRib: 0,
          stockSJ: 0,
          totalStock: 0,
          cuttingLeftover: 0,
          location: line.location,
          colorCount: 0,
          colors: [],
          primaryStatus: 'In Stock',
          isCuttingOk: false,
        });
      }

      const group = map.get(key)!;
      if (!group.style && line.style) group.style = line.style;
      group.reqBody += line.reqBody;
      group.reqRib += line.reqRib;
      group.reqSJ += line.reqSJ;
      group.totalReq += line.totalReq;

      group.recvBody += line.recvBody;
      group.recvRib += line.recvRib;
      group.recvSJ += line.recvSJ;
      group.totalRecv += line.totalRecv;
      group.totalBalance += line.dyeingBalance;

      group.issuedBody += line.issuedBody;
      group.issuedRib += line.issuedRib;
      group.issuedSJ += line.issuedSJ;
      group.totalIssued += line.totalIssued;

      group.stockBody += line.stockBody;
      group.stockRib += line.stockRib;
      group.stockSJ += line.stockSJ;
      group.totalStock += line.stockBalance;

      group.cuttingLeftover += line.cuttingLeftover;
      if (line.isImported) group.isImported = true;

      group.colors.push(line);
      group.colorCount = group.colors.length;
    });

    map.forEach((grp) => {
      if (grp.totalRecv <= 0) grp.primaryStatus = 'Waiting Dyeing';
      else if (grp.totalBalance > grp.totalReq * 0.05 && grp.totalStock > 0) grp.primaryStatus = 'Partly Received';
      else if (grp.totalStock > 0) grp.primaryStatus = 'In Stock';
      else grp.primaryStatus = 'Fully Issued';
      grp.isCuttingOk = grp.colors.every(c => c.isCuttingOk);
    });

    return Array.from(map.values());
  }, [rawLines]);

  // --------------------------------------------------------------------------
  // FILTERING
  // --------------------------------------------------------------------------
  const filteredJobGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return jobGroups.filter((job) => {
      if (filterImportedOnly && !job.isImported) return false;
      if (selectedBuyer !== 'ALL' && job.buyer !== selectedBuyer) return false;
      if (selectedMonth !== 'ALL') {
        const sm = selectedMonth.toLowerCase();
        const jm = (job.month || '').toLowerCase();
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const smIdx = monthNames.indexOf(sm);
        const matches = jm.includes(sm) || 
          (smIdx !== -1 && (jm.includes(String(smIdx + 1).padStart(2, '0')) || jm.includes(monthNames[smIdx].slice(0, 3))));
        if (!matches) return false;
      }
      if (selectedStatus !== 'ALL' && job.primaryStatus !== selectedStatus) return false;
      if (selectedFabricType !== 'ALL' && job.fabricType !== selectedFabricType) return false;

      if (!q) return true;
      const haystack = `${job.jobNo} ${job.style} ${job.buyer} ${job.fabric} ${job.composition} ${job.colors.map(c => c.color).join(' ')}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [jobGroups, searchQuery, selectedBuyer, selectedMonth, selectedStatus, selectedFabricType, filterImportedOnly]);

  const buyerOptions = useMemo(() => Array.from(new Set(rawLines.map(l => l.buyer))).sort(), [rawLines]);
  const fabricTypeOptions = useMemo(() => {
    const standard = ['SJ', 'Rib', 'Terry', 'Fleece', 'Interlock', 'Woven', 'Mesh'];
    const fromData = Array.from(new Set(rawLines.map(l => l.fabricType).filter(Boolean)));
    return Array.from(new Set([...standard, ...fromData])).sort();
  }, [rawLines]);

  const monthOptions = useMemo(() => {
    const rawMonths = Array.from(new Set(rawLines.map(l => l.month).filter(Boolean)));
    const stdMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const combined = Array.from(new Set([...rawMonths, ...stdMonths]));
    return combined.map(m => ({ value: m, label: m }));
  }, [rawLines]);

  // Table Sorting state
  const [sortField, setSortField] = useState<string>('jobNo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedJobGroups = useMemo(() => {
    const list = [...filteredJobGroups];
    list.sort((a, b) => {
      let valA: any = a[sortField as keyof JobFabricGroup];
      let valB: any = b[sortField as keyof JobFabricGroup];

      if (sortField === 'jobNo') {
        valA = a.jobNo;
        valB = b.jobNo;
      } else if (sortField === 'buyer') {
        valA = a.buyer;
        valB = b.buyer;
      } else if (sortField === 'style') {
        valA = a.style;
        valB = b.style;
      } else if (sortField === 'totalReq') {
        valA = a.totalReq;
        valB = b.totalReq;
      } else if (sortField === 'totalRecv') {
        valA = a.totalRecv;
        valB = b.totalRecv;
      } else if (sortField === 'totalIssued') {
        valA = a.totalIssued;
        valB = b.totalIssued;
      } else if (sortField === 'totalStock') {
        valA = a.totalStock;
        valB = b.totalStock;
      } else if (sortField === 'status') {
        valA = a.primaryStatus;
        valB = b.primaryStatus;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return sortDirection === 'asc'
        ? String(valA || '').localeCompare(String(valB || ''))
        : String(valB || '').localeCompare(String(valA || ''));
    });
    return list;
  }, [filteredJobGroups, sortField, sortDirection]);

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedJobGroups.slice(start, start + itemsPerPage);
  }, [sortedJobGroups, currentPage]);

  const totalPages = Math.ceil(filteredJobGroups.length / itemsPerPage) || 1;

  const toggleJobExpanded = (key: string) => {
    setExpandedJobs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllExpanded = () => {
    const next = !showAllColors;
    setShowAllColors(next);
    if (!next) setExpandedJobs({});
  };

  // --------------------------------------------------------------------------
  // DASHBOARD KPIS (Exact metrics requested by user)
  // --------------------------------------------------------------------------
  const dashboardKpis = useMemo(() => {
    let totalStockKg = 0;
    let totalOrderKg = 0;
    let totalRecvKg = 0;
    let totalBalanceKg = 0;
    let totalIssuedKg = 0;
    let totalLeftoverKg = 0;

    rawLines.forEach(l => {
      totalStockKg += l.stockBalance;
      totalOrderKg += l.totalReq;
      totalRecvKg += l.totalRecv;
      totalBalanceKg += l.dyeingBalance;
      totalIssuedKg += l.totalIssued;
      totalLeftoverKg += l.cuttingLeftover;
    });

    const pendingCuttingIssueKg = Math.max(0, totalRecvKg - totalIssuedKg);
    const dailyReceiveKg = 2480;
    const dailyDeliveryKg = 2150;

    const buyerMap: Record<string, { orderKg: number; recvKg: number; issuedKg: number; stockKg: number; balanceKg: number; jobs: Set<string> }> = {};
    rawLines.forEach(l => {
      if (!buyerMap[l.buyer]) {
        buyerMap[l.buyer] = { orderKg: 0, recvKg: 0, issuedKg: 0, stockKg: 0, balanceKg: 0, jobs: new Set() };
      }
      const b = buyerMap[l.buyer];
      b.orderKg += l.totalReq;
      b.recvKg += l.totalRecv;
      b.issuedKg += l.totalIssued;
      b.stockKg += l.stockBalance;
      b.balanceKg += l.dyeingBalance;
      b.jobs.add(l.jobNo);
    });

    const buyerChartData = Object.entries(buyerMap).map(([buyer, d]) => ({
      buyer: buyer.length > 12 ? buyer.slice(0, 12) + '…' : buyer,
      fullName: buyer,
      jobsCount: d.jobs.size,
      orderTons: Math.round(d.orderKg / 100) / 10,
      receivedTons: Math.round(d.recvKg / 100) / 10,
      balanceTons: Math.round(d.balanceKg / 100) / 10,
      issuedTons: Math.round(d.issuedKg / 100) / 10,
      stockTons: Math.round(d.stockKg / 100) / 10,
    })).sort((a, b) => b.orderTons - a.orderTons).slice(0, 7);

    return {
      totalInStoreJobs: jobGroups.filter(j => j.totalStock > 0).length,
      totalStockKg,
      totalStockTons: (totalStockKg / 1000).toFixed(1),
      totalOrderJobs: jobGroups.length,
      totalOrderKg,
      totalOrderTons: (totalOrderKg / 1000).toFixed(1),
      totalRecvKg,
      totalRecvTons: (totalRecvKg / 1000).toFixed(1),
      totalBalanceKg,
      totalBalanceTons: (totalBalanceKg / 1000).toFixed(1),
      totalIssuedKg,
      totalIssuedTons: (totalIssuedKg / 1000).toFixed(1),
      pendingCuttingIssueKg,
      pendingCuttingIssueTons: (pendingCuttingIssueKg / 1000).toFixed(1),
      totalLeftoverKg,
      totalLeftoverLots: leftoverLedger.length,
      dailyReceiveKg,
      dailyDeliveryKg,
      buyerChartData,
    };
  }, [rawLines, jobGroups, leftoverLedger]);

  // --------------------------------------------------------------------------
  // ACTIONS: RECEIVE MODAL CONFIRMATION
  // --------------------------------------------------------------------------
  const handleAddReceiveColorRow = () => {
    setReceiveForm(prev => ({
      ...prev,
      colors: [
        ...prev.colors,
        {
          color: '',
          reqBody: 0,
          reqSJ: 0,
          reqRib: 0,
          recvBody: 0,
          recvSJ: 0,
          recvRib: 0,
          location: 'R-01-S01',
          rollCount: 1,
          remarks: '',
        },
      ],
    }));
  };

  const handleConfirmReceiveChallan = () => {
    if (!receiveForm.challanNo || !receiveForm.supplier || !receiveForm.jobNo) {
      showToast('Please enter Challan No, Supplier and Job No');
      return;
    }

    let totalRecvAdded = 0;
    receiveForm.colors.forEach((c) => {
      const added = (Number(c.recvBody) || 0) + (Number(c.recvSJ) || 0) + (Number(c.recvRib) || 0);
      totalRecvAdded += added;

      const newCh: SupplierChallanItem = {
        id: `ch-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        challanNo: receiveForm.challanNo,
        date: receiveForm.date,
        supplier: receiveForm.supplier,
        sourceType: receiveForm.sourceType,
        buyer: receiveForm.buyer,
        jobNo: receiveForm.jobNo,
        style: receiveForm.style || '—',
        color: c.color || 'Single Color',
        fabric: `${receiveForm.fabricType} ${receiveForm.gsm} GSM`,
        challanBodyKg: Number(c.recvBody) || 0,
        challanRibKg: Number(c.recvRib) || 0,
        challanSJKg: Number(c.recvSJ) || 0,
        weighedBodyKg: Number(c.recvBody) || 0,
        weighedRibKg: Number(c.recvRib) || 0,
        weighedSJKg: Number(c.recvSJ) || 0,
        totalKg: added,
        rollCount: Number(c.rollCount) || 1,
        weightDiffKg: 0,
        rackLocation: c.location,
        remarks: c.remarks,
        status: 'Accepted',
      };
      setChallans(prev => [newCh, ...prev]);

      if (receiveForm.sourceType === 'CUTTING_LEFTOVER') {
        setLeftoverLedger(prev => [
          {
            id: `lr-${Date.now()}`,
            date: receiveForm.date,
            jobNo: receiveForm.jobNo,
            color: c.color,
            source: 'Cutting Return',
            bodyKg: Number(c.recvBody) || 0,
            ribKg: Number(c.recvRib) || 0,
            sjKg: Number(c.recvSJ) || 0,
            totalKg: added,
            returnedBy: receiveForm.supplier,
            rackAssigned: c.location,
            status: 'Available in Leftover',
          },
          ...prev,
        ]);
      }
    });

    showToast(`Challan ${receiveForm.challanNo} saved successfully! ${totalRecvAdded} kg added into store.`);
    setIsReceiveModalOpen(false);
  };

  // --------------------------------------------------------------------------
  // ACTIONS: ISSUE TO CUTTING SAVE
  // --------------------------------------------------------------------------
  const handleSaveTodayDelivery = (job: JobFabricGroup) => {
    let issuedTotalAdded = 0;
    const dateStr = new Date().toISOString().slice(0, 10);

    job.colors.forEach(c => {
      const entry = todayDeliveries[c.id];
      if (!entry) return;
      const bKg = Number(entry.bodyKg) || 0;
      const sKg = Number(entry.sjKg) || 0;
      const rKg = Number(entry.ribKg) || 0;
      const sum = bKg + sKg + rKg;

      if (sum > 0) {
        issuedTotalAdded += sum;
        const slip: CuttingIssueSlip = {
          id: `ci-${Date.now()}-${c.id}`,
          issueNo: `FI-${Date.now().toString().slice(-4)}`,
          date: dateStr,
          buyer: job.buyer,
          jobNo: job.jobNo,
          style: job.style,
          color: c.color,
          fabricDescription: `${job.fabricType} ${job.gsm} GSM`,
          bodyKg: bKg,
          ribKg: rKg,
          sjKg: sKg,
          totalKg: sum,
          issuedBy: 'Store In-charge',
          receivedBy: 'Cutting Floor Supervisor',
          remarks: entry.isCuttingOk ? 'Lot completed (Cutting OK)' : 'Partial delivery',
          isCuttingOk: entry.isCuttingOk,
        };
        setCuttingIssues(prev => [slip, ...prev]);

        setRawLines(prev =>
          prev.map(l => {
            if (l.id === c.id) {
              const nextIssuedBody = l.issuedBody + bKg;
              const nextIssuedSJ = l.issuedSJ + sKg;
              const nextIssuedRib = l.issuedRib + rKg;
              const nextTotalIssued = l.totalIssued + sum;
              const nextStockBody = Math.max(0, l.recvBody - nextIssuedBody);
              const nextStockSJ = Math.max(0, l.recvSJ - nextIssuedSJ);
              const nextStockRib = Math.max(0, l.recvRib - nextIssuedRib);
              const nextStockBal = nextStockBody + nextStockSJ + nextStockRib;

              if (entry.isCuttingOk && nextStockBal > 0) {
                setLeftoverLedger(lr => [
                  {
                    id: `lr-${Date.now()}-${l.id}`,
                    date: dateStr,
                    jobNo: l.jobNo,
                    color: l.color,
                    source: 'Closing Stock Balance',
                    bodyKg: nextStockBody,
                    ribKg: nextStockRib,
                    sjKg: nextStockSJ,
                    totalKg: nextStockBal,
                    returnedBy: 'Cutting OK Completion',
                    rackAssigned: l.location,
                    status: 'Available in Leftover',
                  },
                  ...lr,
                ]);
              }

              return {
                ...l,
                issuedBody: nextIssuedBody,
                issuedSJ: nextIssuedSJ,
                issuedRib: nextIssuedRib,
                totalIssued: nextTotalIssued,
                stockBody: nextStockBody,
                stockSJ: nextStockSJ,
                stockRib: nextStockRib,
                stockBalance: entry.isCuttingOk ? 0 : nextStockBal,
                stockState: entry.isCuttingOk || nextStockBal <= 0 ? 'Fully Issued' : 'In Stock',
                isCuttingOk: entry.isCuttingOk,
              };
            }
            return l;
          })
        );
      }
    });

    showToast(`Delivery recorded for Job ${job.jobNo}: ${issuedTotalAdded} kg dispatched to cutting floor.`);
    setTodayDeliveries({});
    setSelectedIssueJob(null);
  };

  return (
    <Shell
      title="Finished Fabric Store"
      eyebrow="Finished Fabric Intake, Inspection, 20-Rack × 20-Shelf Storage & Cutting Floor Delivery"
    >
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0F274E] text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-2.5 text-xs font-semibold border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP TITLE BAR (ODOU STYLE CLEAN ENTERPRISE BAR) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Boxes className="w-5 h-5 text-sky-700" />
              Finished Fabric Store Management
            </h1>
            <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              Northern Fashions Ltd · Live Store
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Color-wise fabric stock ledger, 3-component tracking (Body, Rib, S. Jersey), delivery issuance & 20 Master Racks location tracking
          </p>
        </div>

        {/* Action Controls & Dashboard Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDashboard(!showDashboard)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            {showDashboard ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
            <span>{showDashboard ? 'Hide Dashboard' : 'Show Dashboard'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
            title="Import Excel Workbook with multi-month sheets"
          >
            <FolderUp className="w-3.5 h-3.5 text-white" />
            <span>Import Workbook</span>
          </button>

          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
            title="Manual multi-color job entry"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>New Manual Entry</span>
          </button>

          <button
            type="button"
            onClick={handleClearAllFabricData}
            className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-300 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
            title="Clear all stored fabric data"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Data</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* EXECUTIVE DASHBOARD CARDS (Clean Odoo Aesthetic, Collapsible) */}
      {/* ===================================================================== */}
      {showDashboard && (
        <div className="space-y-3 mb-4 animate-in fade-in duration-150">
          {/* ROW 1: 6 SUMMARY METRIC CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Store In-Stock
              </span>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {dashboardKpis.totalInStoreJobs} <span className="text-xs font-normal text-slate-500">Jobs</span>
              </div>
              <div className="text-xs font-semibold text-sky-800 mt-1">
                {Math.round(dashboardKpis.totalStockKg).toLocaleString()} kg ({dashboardKpis.totalStockTons} T)
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Total Order Demand
              </span>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {dashboardKpis.totalOrderJobs} <span className="text-xs font-normal text-slate-500">Jobs</span>
              </div>
              <div className="text-xs font-semibold text-slate-700 mt-1">
                {Math.round(dashboardKpis.totalOrderKg).toLocaleString()} kg ({dashboardKpis.totalOrderTons} T)
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Received vs Balance
              </span>
              <div className="text-base font-bold text-emerald-800 mt-0.5">
                {dashboardKpis.totalRecvTons} <span className="text-xs font-normal text-slate-500">Tons Recv</span>
              </div>
              <div className="text-xs font-semibold text-rose-700 mt-1">
                Bal: {dashboardKpis.totalBalanceTons} Tons
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Cutting Issue & Pending
              </span>
              <div className="text-base font-bold text-purple-800 mt-0.5">
                {dashboardKpis.totalIssuedTons} <span className="text-xs font-normal text-slate-500">Tons Issued</span>
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-1">
                Pending: {dashboardKpis.pendingCuttingIssueTons} Tons
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Daily Run-Rates
              </span>
              <div className="text-xs font-semibold text-emerald-800 mt-1 flex items-center justify-between">
                <span>Inward:</span>
                <span>+{dashboardKpis.dailyReceiveKg.toLocaleString()} kg/day</span>
              </div>
              <div className="text-xs font-semibold text-purple-800 mt-0.5 flex items-center justify-between">
                <span>Outward:</span>
                <span>-{dashboardKpis.dailyDeliveryKg.toLocaleString()} kg/day</span>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Leftover Stock
              </span>
              <div className="text-base font-bold text-amber-800 mt-0.5">
                {Math.round(dashboardKpis.totalLeftoverKg).toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
              </div>
              <div className="text-xs font-semibold text-amber-700 mt-1">
                {dashboardKpis.totalLeftoverLots} Active Roll Lots
              </div>
            </div>
          </div>

          {/* ROW 2: 2 BUYER BREAKDOWN CHARTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                    Top Buyers: Received vs Receive Balance (Tons)
                  </h4>
                  <p className="text-[10px] text-slate-500">Inward delivery from suppliers vs Still to receive</p>
                </div>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Tons</span>
              </div>
              <div className="w-full h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardKpis.buyerChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="buyer" tick={{ fill: '#64748B', fontSize: 9, fontWeight: 500 }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 9 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0F274E', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px' }}
                      formatter={(val: any, name: any) => [`${val} Tons`, name === 'receivedTons' ? 'Received' : 'Receive Balance']}
                    />
                    <Bar {...FX_SERIES} {...FX_BAR} dataKey="receivedTons" fill="#16A34A" stackId="a" maxBarSize={22} />
                    <Bar {...FX_SERIES} {...FX_BAR} dataKey="balanceTons" fill="#DC2626" stackId="a" radius={[2, 2, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-slate-500 font-medium border-t border-slate-100 pt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-600 rounded-xs"></span> Received</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-600 rounded-xs"></span> Receive Balance</span>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                    Top Buyers: Cutting Issue vs In-Stock (Tons)
                  </h4>
                  <p className="text-[10px] text-slate-500">Dispatched to cutting tables vs In store stock</p>
                </div>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Tons</span>
              </div>
              <div className="w-full h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardKpis.buyerChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="buyer" tick={{ fill: '#64748B', fontSize: 9, fontWeight: 500 }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 9 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0F274E', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px' }}
                      formatter={(val: any, name: any) => [`${val} Tons`, name === 'issuedTons' ? 'Issued to Cutting' : 'In Store Stock']}
                    />
                    <Bar {...FX_SERIES} {...FX_BAR} dataKey="issuedTons" fill="#7C3AED" stackId="b" maxBarSize={22} />
                    <Bar {...FX_SERIES} {...FX_BAR} dataKey="stockTons" fill="#0284C7" stackId="b" radius={[2, 2, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-slate-500 font-medium border-t border-slate-100 pt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-600 rounded-xs"></span> Dispatched to Cutting</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-sky-600 rounded-xs"></span> In Store Stock</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ODOO-STYLE CLEAN TAB BAR (MATCHING TRIMS STORE NAVIGATION) */}
      {/* ===================================================================== */}
      {/* MAIN NAVIGATION TABS (MATCHING TRIMS & ACCESSORIES STORE STANDARD) */}
      {/* ===================================================================== */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          padding: '8px 12px',
          background: 'var(--card-bg, #ffffff)',
          borderBottom: '1px solid var(--border, #e2e8f0)',
          marginBottom: '16px',
          borderRadius: '8px'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('STOCK')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '7px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 650,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: activeTab === 'STOCK' ? '1px solid #0F274E' : '1px solid #E2E8F0',
            background: activeTab === 'STOCK' ? '#0F274E' : '#F8FAFC',
            color: activeTab === 'STOCK' ? '#FFFFFF' : '#475569'
          }}
        >
          <Boxes size={16} color={activeTab === 'STOCK' ? '#38BDF8' : '#64748B'} />
          <span>1. Finished Fabric Stock Statement</span>
          <span
            style={{
              fontSize: '11px',
              background: activeTab === 'STOCK' ? '#38BDF8' : '#E2E8F0',
              color: activeTab === 'STOCK' ? '#0F274E' : '#475569',
              padding: '1px 7px',
              borderRadius: '10px',
              fontWeight: 700
            }}
          >
            {jobGroups.length} Jobs
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RECEIVE')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '7px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 650,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: activeTab === 'RECEIVE' ? '1px solid #0F274E' : '1px solid #E2E8F0',
            background: activeTab === 'RECEIVE' ? '#0F274E' : '#F8FAFC',
            color: activeTab === 'RECEIVE' ? '#FFFFFF' : '#475569'
          }}
        >
          <Truck size={16} color={activeTab === 'RECEIVE' ? '#38BDF8' : '#64748B'} />
          <span>2. Imported & New Receive</span>
          <span
            style={{
              fontSize: '11px',
              background: activeTab === 'RECEIVE' ? '#38BDF8' : '#E2E8F0',
              color: activeTab === 'RECEIVE' ? '#0F274E' : '#475569',
              padding: '1px 7px',
              borderRadius: '10px',
              fontWeight: 700
            }}
          >
            {challans.length} Challans
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ISSUE')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '7px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 650,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: activeTab === 'ISSUE' ? '1px solid #0F274E' : '1px solid #E2E8F0',
            background: activeTab === 'ISSUE' ? '#0F274E' : '#F8FAFC',
            color: activeTab === 'ISSUE' ? '#FFFFFF' : '#475569'
          }}
        >
          <Scissors size={16} color={activeTab === 'ISSUE' ? '#38BDF8' : '#64748B'} />
          <span>3. Issue to Cutting Floor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LOCATION')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '7px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 650,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: activeTab === 'LOCATION' ? '1px solid #0F274E' : '1px solid #E2E8F0',
            background: activeTab === 'LOCATION' ? '#0F274E' : '#F8FAFC',
            color: activeTab === 'LOCATION' ? '#FFFFFF' : '#475569'
          }}
        >
          <MapPin size={16} color={activeTab === 'LOCATION' ? '#38BDF8' : '#64748B'} />
          <span>4. Location Tracking (20 Racks × 20 Shelves)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('REUSE')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '7px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 650,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            border: activeTab === 'REUSE' ? '1px solid #0F274E' : '1px solid #E2E8F0',
            background: activeTab === 'REUSE' ? '#0F274E' : '#F8FAFC',
            color: activeTab === 'REUSE' ? '#FFFFFF' : '#475569'
          }}
        >
          <RotateCcw size={16} color={activeTab === 'REUSE' ? '#38BDF8' : '#64748B'} />
          <span>5. Stock for Leftover & Reuse</span>
          <span
            style={{
              fontSize: '11px',
              background: activeTab === 'REUSE' ? '#38BDF8' : '#E2E8F0',
              color: activeTab === 'REUSE' ? '#0F274E' : '#475569',
              padding: '1px 7px',
              borderRadius: '10px',
              fontWeight: 700
            }}
          >
            {leftoverLedger.length}
          </span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: FINISHED FABRIC STOCK STATEMENT (FULL WIDTH, CLEAN ODOO TABLE) */}
      {/* ===================================================================== */}
      {activeTab === 'STOCK' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-3.5 mb-8">
          {/* SEARCH & FILTERS CONTROLS */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 pb-3 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Job No, Style, Color..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Month Filter */}
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-md px-2.5 py-1.5 focus:outline-none font-medium"
              >
                <option value="ALL">All Months ({monthOptions.length})</option>
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              {/* Buyer Filter */}
              <select
                value={selectedBuyer}
                onChange={(e) => {
                  setSelectedBuyer(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-md px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Buyers ({buyerOptions.length})</option>
                {buyerOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {/* Fabric Type */}
              <select
                value={selectedFabricType}
                onChange={(e) => {
                  setSelectedFabricType(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-md px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Fabric Types</option>
                {fabricTypeOptions.map((ft) => (
                  <option key={ft} value={ft}>{ft}</option>
                ))}
              </select>

              {/* Status */}
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-md px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="In Stock">In Stock</option>
                <option value="Partly Received">Partly Received</option>
                <option value="Waiting Dyeing">Waiting Dyeing</option>
                <option value="Fully Issued">Fully Issued</option>
              </select>

              {/* Reset */}
              {(searchQuery || selectedBuyer !== 'ALL' || selectedFabricType !== 'ALL' || selectedStatus !== 'ALL' || filterImportedOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedBuyer('ALL');
                    setSelectedFabricType('ALL');
                    setSelectedStatus('ALL');
                    setFilterImportedOnly(false);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-md font-medium flex items-center gap-1 border border-rose-200"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleAllExpanded}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors border border-slate-200"
              >
                <Palette className="w-3.5 h-3.5 text-slate-600" />
                <span>{showAllColors ? 'Collapse Colors' : 'Expand All Colors'}</span>
              </button>
              <span className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-900">{filteredJobGroups.length}</strong> jobs
              </span>
            </div>
          </div>

          {/* =================================================================== */}
          {/* PROFESSIONAL ODOO-STYLE COLUMN TOGGLE FILTER PILLS */}
          {/* =================================================================== */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 p-2 bg-slate-50 rounded-md border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-slate-700 mr-1 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                <SlidersHorizontal className="w-3 h-3 text-slate-600" />
                Columns:
              </span>

              {/* 1. Job Specs */}
              <button
                type="button"
                onClick={() => setVisibleSections(v => ({ ...v, jobSpecs: !v.jobSpecs }))}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  visibleSections.jobSpecs
                    ? 'bg-slate-200 text-slate-900 border-slate-400 shadow-xs'
                    : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {visibleSections.jobSpecs && <Check className="w-3.5 h-3.5 text-slate-900 stroke-[2.5]" />}
                <span>Job & Specs</span>
              </button>

              {/* 2. Order / Req Qty */}
              <button
                type="button"
                onClick={() => setVisibleSections(v => ({ ...v, orderQty: !v.orderQty }))}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  visibleSections.orderQty
                    ? 'bg-blue-100 text-blue-900 border-blue-400 shadow-xs'
                    : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {visibleSections.orderQty && <Check className="w-3.5 h-3.5 text-blue-900 stroke-[2.5]" />}
                <span>Order Qty (Body/Rib/SJ)</span>
              </button>

              {/* 3. Received Qty */}
              <button
                type="button"
                onClick={() => setVisibleSections(v => ({ ...v, receivedQty: !v.receivedQty }))}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  visibleSections.receivedQty
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-xs'
                    : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {visibleSections.receivedQty && <Check className="w-3.5 h-3.5 text-emerald-900 stroke-[2.5]" />}
                <span>Received (Body/Rib/SJ)</span>
              </button>

              {/* 4. Issue / Delivery Qty */}
              <button
                type="button"
                onClick={() => setVisibleSections(v => ({ ...v, deliveryQty: !v.deliveryQty }))}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  visibleSections.deliveryQty
                    ? 'bg-purple-100 text-purple-900 border-purple-400 shadow-xs'
                    : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {visibleSections.deliveryQty && <Check className="w-3.5 h-3.5 text-purple-900 stroke-[2.5]" />}
                <span>Issue / Delivery (Body/Rib/SJ)</span>
              </button>

              {/* 5. Closing Stock */}
              <button
                type="button"
                onClick={() => setVisibleSections(v => ({ ...v, closingStock: !v.closingStock }))}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  visibleSections.closingStock
                    ? 'bg-sky-100 text-sky-900 border-sky-400 shadow-xs'
                    : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {visibleSections.closingStock && <Check className="w-3.5 h-3.5 text-sky-900 stroke-[2.5]" />}
                <span>Closing Stock (Body/Rib/SJ)</span>
              </button>

              {/* 6. Location & Leftover */}
              <button
                type="button"
                onClick={() => setVisibleSections(v => ({ ...v, locationInfo: !v.locationInfo }))}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  visibleSections.locationInfo
                    ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-xs'
                    : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {visibleSections.locationInfo && <Check className="w-3.5 h-3.5 text-amber-900 stroke-[2.5]" />}
                <span>Location & Leftover</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Imported Fabric Filter Toggle */}
              <button
                type="button"
                onClick={() => setFilterImportedOnly(!filterImportedOnly)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                  filterImportedOnly
                    ? 'bg-teal-700 text-white border border-teal-700 font-semibold'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Imported Fabric Only</span>
              </button>

              {/* Show All Columns Pill */}
              <button
                type="button"
                onClick={() =>
                  setVisibleSections({
                    jobSpecs: true,
                    orderQty: true,
                    receivedQty: true,
                    deliveryQty: true,
                    closingStock: true,
                    locationInfo: true,
                  })
                }
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-xs font-medium"
              >
                Show All
              </button>
            </div>
          </div>

          {/* =================================================================== */}
          {/* HIGH CONTRAST MASTER TABLE (STICKY HEADER WITH CRISP READABLE TEXT) */}
          {/* =================================================================== */}
          <div className="overflow-x-auto rounded-md border border-slate-300 bg-white shadow-2xs relative max-h-[750px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* STICKY THEAD (FROZEN AT TOP WHILE SCROLLING) */}
              <thead className="sticky top-0 z-30 shadow-xs">
                {/* TIER 1 HEADER GROUP */}
                <tr className="border-b border-slate-300 text-[10.5px] uppercase tracking-wider font-bold">
                  {/* Sticky left job/style header */}
                  <th colSpan={visibleSections.jobSpecs ? 9 : 2} className="sticky left-0 z-40 bg-slate-100 px-3 py-2 text-left border-r border-b border-slate-300 text-slate-800 font-bold">
                    Job Specifications
                  </th>

                  {/* Order Qty Section Header */}
                  {visibleSections.orderQty && (
                    <th colSpan={4} className="px-3 py-2 text-center border-r border-b border-slate-300 bg-blue-100 text-blue-900 font-bold">
                      Order / Required Qty (Kg)
                    </th>
                  )}

                  {/* Received Section Header */}
                  {visibleSections.receivedQty && (
                    <th colSpan={4} className="px-3 py-2 text-center border-r border-b border-slate-300 bg-emerald-100 text-emerald-900 font-bold">
                      Received Qty (Kg)
                    </th>
                  )}

                  {/* Issue / Delivery Section Header */}
                  {visibleSections.deliveryQty && (
                    <th colSpan={4} className="px-3 py-2 text-center border-r border-b border-slate-300 bg-purple-100 text-purple-900 font-bold">
                      Issue / Delivery to Cutting (Kg)
                    </th>
                  )}

                  {/* Closing Stock Section Header */}
                  {visibleSections.closingStock && (
                    <th colSpan={4} className="px-3 py-2 text-center border-r border-b border-slate-300 bg-sky-100 text-sky-900 font-bold">
                      Closing Stock Balance (Kg)
                    </th>
                  )}

                  {/* Location & Leftover Header */}
                  {visibleSections.locationInfo && (
                    <th colSpan={4} className="px-3 py-2 text-center border-r border-b border-slate-300 bg-amber-100 text-amber-900 font-bold">
                      Location & Leftovers
                    </th>
                  )}

                  <th className="px-3 py-2 text-center bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">Action</th>
                </tr>

                {/* TIER 2 HEADER COLUMNS */}
                <tr className="bg-slate-50 text-slate-900 text-[11px] border-b border-slate-300 font-bold">
                  {/* Sticky frozen columns */}
                  <th className="sticky left-0 z-40 bg-slate-100 px-3 py-2 text-slate-900 font-bold border-r border-slate-300 min-w-[150px]">
                    <button
                      type="button"
                      onClick={() => handleSort('jobNo')}
                      className="flex items-center gap-1.5 text-left text-slate-900 font-bold hover:text-blue-700 cursor-pointer"
                    >
                      <span>Job No</span>
                      <ArrowUpDown className={`w-3 h-3 ${sortField === 'jobNo' ? 'text-blue-700 font-bold' : 'text-slate-400'}`} />
                    </button>
                  </th>
                  <th className="px-3 py-2 text-slate-900 font-bold min-w-[100px] border-r border-slate-300">
                    <button
                      type="button"
                      onClick={() => handleSort('style')}
                      className="flex items-center gap-1 text-slate-900 font-bold hover:text-blue-700 cursor-pointer"
                    >
                      <span>Style No</span>
                      <ArrowUpDown className={`w-3 h-3 ${sortField === 'style' ? 'text-blue-700' : 'text-slate-400'}`} />
                    </button>
                  </th>

                  {visibleSections.jobSpecs && (
                    <>
                      <th className="px-2.5 py-2 text-slate-900 font-bold min-w-[120px] border-r border-slate-200">Color</th>
                      <th className="px-2.5 py-2 text-slate-900 font-bold min-w-[110px] border-r border-slate-200">Fabric Type</th>
                      <th className="px-2.5 py-2 text-slate-900 font-bold min-w-[140px] border-r border-slate-200">Composition</th>
                      <th className="px-2.5 py-2 text-slate-900 font-bold min-w-[110px] border-r border-slate-200">Additional Process</th>
                      <th className="px-2.5 py-2 text-slate-900 font-bold min-w-[50px] border-r border-slate-200">GSM</th>
                      <th className="px-2.5 py-2 text-slate-900 font-bold min-w-[50px] border-r border-slate-200">Dia</th>
                      <th className="px-2.5 py-2 text-slate-900 font-bold min-w-[80px] border-r border-slate-300">
                        <button
                          type="button"
                          onClick={() => handleSort('status')}
                          className="flex items-center gap-1 text-slate-900 font-bold hover:text-blue-700 cursor-pointer"
                        >
                          <span>Status</span>
                          <ArrowUpDown className={`w-3 h-3 ${sortField === 'status' ? 'text-blue-700' : 'text-slate-400'}`} />
                        </button>
                      </th>
                    </>
                  )}

                  {/* Order Qty (Body, Rib, SJ, Total) */}
                  {visibleSections.orderQty && (
                    <>
                      <th className="px-2 py-2 text-right font-semibold min-w-[65px] text-blue-950 bg-blue-50/80 border-r border-blue-100">Body</th>
                      <th className="px-2 py-2 text-right font-semibold min-w-[60px] text-blue-950 bg-blue-50/80 border-r border-blue-100">Rib</th>
                      <th className="px-2 py-2 text-right font-semibold min-w-[60px] text-blue-950 bg-blue-50/80 border-r border-blue-100">S.Jersey</th>
                      <th className="px-2.5 py-2 text-right font-bold min-w-[75px] text-blue-950 bg-blue-100/90 border-r border-slate-300">
                        <button
                          type="button"
                          onClick={() => handleSort('totalReq')}
                          className="inline-flex items-center gap-1 font-bold text-blue-950 hover:text-blue-700 cursor-pointer"
                        >
                          <span>Total Req</span>
                          <ArrowUpDown className={`w-3 h-3 ${sortField === 'totalReq' ? 'text-blue-700' : 'text-blue-400'}`} />
                        </button>
                      </th>
                    </>
                  )}

                  {/* Received Qty (Body, Rib, SJ, Total) */}
                  {visibleSections.receivedQty && (
                    <>
                      <th className="px-2 py-2 text-right font-semibold min-w-[65px] text-emerald-950 bg-emerald-50/80 border-r border-emerald-100">Body</th>
                      <th className="px-2 py-2 text-right font-semibold min-w-[60px] text-emerald-950 bg-emerald-50/80 border-r border-emerald-100">Rib</th>
                      <th className="px-2 py-2 text-right font-semibold min-w-[60px] text-emerald-950 bg-emerald-50/80 border-r border-emerald-100">S.Jersey</th>
                      <th className="px-2.5 py-2 text-right font-bold min-w-[75px] text-emerald-950 bg-emerald-100/90 border-r border-slate-300">
                        <button
                          type="button"
                          onClick={() => handleSort('totalRecv')}
                          className="inline-flex items-center gap-1 font-bold text-emerald-950 hover:text-emerald-700 cursor-pointer"
                        >
                          <span>Total Recv</span>
                          <ArrowUpDown className={`w-3 h-3 ${sortField === 'totalRecv' ? 'text-emerald-700' : 'text-emerald-400'}`} />
                        </button>
                      </th>
                    </>
                  )}

                  {/* Issue / Delivery Qty (Body, Rib, SJ, Total) */}
                  {visibleSections.deliveryQty && (
                    <>
                      <th className="px-2 py-2 text-right font-semibold min-w-[65px] text-purple-950 bg-purple-50/80 border-r border-purple-100">Body</th>
                      <th className="px-2 py-2 text-right font-semibold min-w-[60px] text-purple-950 bg-purple-50/80 border-r border-purple-100">Rib</th>
                      <th className="px-2 py-2 text-right font-semibold min-w-[60px] text-purple-950 bg-purple-50/80 border-r border-purple-100">S.Jersey</th>
                      <th className="px-2.5 py-2 text-right font-bold min-w-[75px] text-purple-950 bg-purple-100/90 border-r border-slate-300">
                        <button
                          type="button"
                          onClick={() => handleSort('totalIssued')}
                          className="inline-flex items-center gap-1 font-bold text-purple-950 hover:text-purple-700 cursor-pointer"
                        >
                          <span>Total Issued</span>
                          <ArrowUpDown className={`w-3 h-3 ${sortField === 'totalIssued' ? 'text-purple-700' : 'text-purple-400'}`} />
                        </button>
                      </th>
                    </>
                  )}

                  {/* Closing Stock (Body, Rib, SJ, Total) */}
                  {visibleSections.closingStock && (
                    <>
                      <th className="px-2 py-2 text-right font-semibold min-w-[65px] text-sky-950 bg-sky-50/80 border-r border-sky-100">Body</th>
                      <th className="px-2 py-2 text-right font-semibold min-w-[60px] text-sky-950 bg-sky-50/80 border-r border-sky-100">Rib</th>
                      <th className="px-2 py-2 text-right font-semibold min-w-[60px] text-sky-950 bg-sky-50/80 border-r border-sky-100">S.Jersey</th>
                      <th className="px-2.5 py-2 text-right font-bold min-w-[75px] text-sky-950 bg-sky-100/90 border-r border-slate-300">
                        <button
                          type="button"
                          onClick={() => handleSort('totalStock')}
                          className="inline-flex items-center gap-1 font-bold text-sky-950 hover:text-sky-700 cursor-pointer"
                        >
                          <span>Stock Bal</span>
                          <ArrowUpDown className={`w-3 h-3 ${sortField === 'totalStock' ? 'text-sky-700' : 'text-sky-400'}`} />
                        </button>
                      </th>
                    </>
                  )}

                  {/* Location & Leftover */}
                  {visibleSections.locationInfo && (
                    <>
                      <th className="px-2.5 py-2 font-bold min-w-[95px] text-amber-950 bg-amber-50/80 border-r border-amber-100">Location</th>
                      <th className="px-2 py-2 text-right font-bold min-w-[70px] text-amber-950 bg-amber-50/80 border-r border-amber-100">Leftover</th>
                      <th className="px-2 py-2 text-right font-bold min-w-[65px] text-amber-950 bg-amber-50/80 border-r border-amber-100">Excess Qty</th>
                      <th className="px-2 py-2 text-center font-bold min-w-[65px] text-amber-950 bg-amber-50/80 border-r border-slate-300">Date</th>
                    </>
                  )}

                  <th className="px-2.5 py-2 text-center font-bold min-w-[60px] text-slate-800">Action</th>
                </tr>
              </thead>

              {/* TABLE BODY */}
              <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={25} className="py-20 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                      Loading master finished fabric statement...
                    </td>
                  </tr>
                ) : rawLines.length === 0 ? (
                  <tr>
                    <td colSpan={25} className="py-20 text-center">
                      <div className="max-w-md mx-auto flex flex-col items-center justify-center p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                        <Boxes className="w-12 h-12 text-slate-400 mb-3" />
                        <h3 className="text-base font-bold text-slate-900 mb-1">No Finished Fabric Records in Store</h3>
                        <p className="text-xs text-slate-500 mb-4 text-center">
                          All previous data has been cleared. You can now import your Excel workbook or create new manual entries.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsImportModalOpen(true)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-xs transition-colors"
                          >
                            <FolderUp className="w-4 h-4" />
                            <span>Import Excel Workbook (.xlsx)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsManualModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-xs transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            <span>New Manual Entry (Multi-Color)</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : paginatedGroups.length === 0 ? (
                  <tr>
                    <td colSpan={25} className="py-16 text-center text-slate-500 font-semibold">
                      No matching jobs found with the applied filters.
                    </td>
                  </tr>
                ) : (
                  paginatedGroups.map((job) => {
                    const isExpanded = expandedJobs[job.key] || showAllColors;

                    return (
                      <React.Fragment key={job.key}>
                        {/* MASTER JOB SUMMARY ROW */}
                        <tr
                          onClick={() => openJobModal(job, 'VIEW')}
                          className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                            isExpanded ? 'bg-blue-50/30 font-medium' : 'bg-white'
                          }`}
                        >
                          {/* Sticky left column: Clean Job No, NO hashtag, NO buyer text */}
                          <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50 px-3 py-2 border-r border-slate-200">
                            <div className="font-bold text-[#0F274E] text-[12.5px] tracking-tight flex items-center gap-1.5">
                              <span>{job.jobNo}</span>
                              {job.isImported && (
                                <span className="text-[9px] px-1 py-0.2 bg-teal-100 text-teal-800 rounded font-bold">IMP</span>
                              )}
                            </div>
                          </td>

                          {/* Style No (Pure style number, bold dark black) */}
                          <td className="px-3 py-2 font-bold text-slate-950 text-[12.5px] border-r border-slate-200">
                            {job.style || '—'}
                          </td>

                          {/* Specs Columns */}
                          {visibleSections.jobSpecs && (
                            <>
                              {/* Color Badge (Clickable button to expand/collapse colors) */}
                              <td className="px-2.5 py-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleJobExpanded(job.key);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-200 transition-colors cursor-pointer"
                                  title="Click to expand/collapse colors"
                                >
                                  <span>{job.colorCount} {job.colorCount === 1 ? 'Color' : 'Colors'}</span>
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-blue-700" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-blue-700" />
                                  )}
                                </button>
                              </td>
                              <td className="px-2.5 py-2 font-semibold text-slate-900">{job.fabricType}</td>
                              <td className="px-2.5 py-2 text-slate-800 font-medium truncate max-w-[130px]" title={job.composition}>
                                {job.composition}
                              </td>
                              <td className="px-2.5 py-2 text-slate-800 font-semibold">{job.process}</td>
                              <td className="px-2.5 py-2 text-slate-900 font-bold">{job.gsm}</td>
                              <td className="px-2.5 py-2 text-slate-900 font-bold">{job.dia}</td>
                              <td className="px-2.5 py-2 border-r border-slate-200">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  job.primaryStatus === 'In Stock' ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' :
                                  job.primaryStatus === 'Partly Received' ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'bg-slate-100 text-slate-900 border border-slate-300'
                                }`}>
                                  {job.primaryStatus}
                                </span>
                              </td>
                            </>
                          )}

                          {/* Order Qty Section */}
                          {visibleSections.orderQty && (
                            <>
                              <td className="px-2 py-2 text-right text-slate-900 font-bold tabular-nums">{Math.round(job.reqBody).toLocaleString()}</td>
                              <td className="px-2 py-2 text-right text-slate-900 font-bold tabular-nums">{Math.round(job.reqRib).toLocaleString()}</td>
                              <td className="px-2 py-2 text-right text-slate-900 font-bold tabular-nums">{Math.round(job.reqSJ).toLocaleString()}</td>
                              <td className="px-2.5 py-2 text-right font-extrabold text-blue-950 bg-blue-50/70 border-r border-slate-300 tabular-nums">{Math.round(job.totalReq).toLocaleString()}</td>
                            </>
                          )}

                          {/* Received Qty Section */}
                          {visibleSections.receivedQty && (
                            <>
                              <td className="px-2 py-2 text-right text-emerald-950 font-bold tabular-nums">{Math.round(job.recvBody).toLocaleString()}</td>
                              <td className="px-2 py-2 text-right text-emerald-950 font-bold tabular-nums">{Math.round(job.recvRib).toLocaleString()}</td>
                              <td className="px-2 py-2 text-right text-emerald-950 font-bold tabular-nums">{Math.round(job.recvSJ).toLocaleString()}</td>
                              <td className="px-2.5 py-2 text-right font-extrabold text-emerald-950 bg-emerald-50/80 border-r border-slate-300 tabular-nums">{Math.round(job.totalRecv).toLocaleString()}</td>
                            </>
                          )}

                          {/* Issue / Delivery Section */}
                          {visibleSections.deliveryQty && (
                            <>
                              <td className="px-2 py-2 text-right text-purple-950 font-bold tabular-nums">{Math.round(job.issuedBody).toLocaleString()}</td>
                              <td className="px-2 py-2 text-right text-purple-950 font-bold tabular-nums">{Math.round(job.issuedRib).toLocaleString()}</td>
                              <td className="px-2 py-2 text-right text-purple-950 font-bold tabular-nums">{Math.round(job.issuedSJ).toLocaleString()}</td>
                              <td className="px-2.5 py-2 text-right font-extrabold text-purple-950 bg-purple-50/80 border-r border-slate-300 tabular-nums">{Math.round(job.totalIssued).toLocaleString()}</td>
                            </>
                          )}

                          {/* Closing Stock Section */}
                          {visibleSections.closingStock && (
                            <>
                              <td className="px-2 py-2 text-right font-bold text-sky-950 tabular-nums">{Math.round(job.stockBody).toLocaleString()}</td>
                              <td className="px-2 py-2 text-right font-bold text-sky-950 tabular-nums">{Math.round(job.stockRib).toLocaleString()}</td>
                              <td className="px-2 py-2 text-right font-bold text-sky-950 tabular-nums">{Math.round(job.stockSJ).toLocaleString()}</td>
                              <td className="px-2.5 py-2 text-right font-extrabold text-sky-950 bg-sky-50 border-r border-slate-300 tabular-nums">{Math.round(job.totalStock).toLocaleString()}</td>
                            </>
                          )}

                          {/* Location & Leftover */}
                          {visibleSections.locationInfo && (
                            <>
                              <td className="px-2.5 py-2 font-bold text-slate-900 text-[11.5px]">{job.location}</td>
                              <td className="px-2 py-2 text-right font-bold text-amber-950 tabular-nums">{Math.round(job.cuttingLeftover)} kg</td>
                              <td className="px-2 py-2 text-right text-slate-800 font-bold tabular-nums">{job.colors[0]?.excessQty || 0}</td>
                              <td className="px-2 py-2 text-center text-slate-700 font-medium text-[11px] border-r border-slate-200">{job.colors[0]?.date || '—'}</td>
                            </>
                          )}

                          <td className="px-2 py-1.5 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openJobModal(job, 'ISSUE');
                                }}
                                className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors cursor-pointer"
                                title="Issue fabric to cutting"
                              >
                                Issue
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openJobModal(job, 'RECEIVE');
                                }}
                                className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                                title="Receive fabric from dyeing/supplier"
                              >
                                Receive
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openJobModal(job, 'VIEW');
                                }}
                                className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDED COLOR BREAKDOWN ROWS */}
                        {isExpanded &&
                          job.colors.map((c, cIdx) => (
                            <tr
                              key={c.id}
                              onClick={() => openJobModal(job, 'VIEW')}
                              className="bg-slate-50/90 hover:bg-slate-100 cursor-pointer text-[11.5px] transition-colors border-l-2 border-blue-500"
                            >
                              <td className="sticky left-0 z-20 bg-slate-50/95 px-3 py-1.5 border-r border-slate-200 pl-6 text-slate-500 font-medium flex items-center gap-1.5">
                                <span className="text-slate-400">└</span>
                                <span className="text-[11px] text-slate-600 font-medium">{job.jobNo}</span>
                              </td>

                              <td className="px-3 py-1.5 text-slate-800 font-medium border-r border-slate-200">{job.style || '—'}</td>

                              {visibleSections.jobSpecs && (
                                <>
                                  <td className="px-2.5 py-1.5 font-bold text-slate-950 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                                    <span>{c.color || '—'}</span>
                                  </td>
                                  <td className="px-2.5 py-1.5 text-slate-800 font-semibold">{c.fabric}</td>
                                  <td className="px-2.5 py-1.5 text-slate-700 font-medium truncate max-w-[130px]">{c.composition}</td>
                                  <td className="px-2.5 py-1.5 text-slate-800 font-semibold">{c.process}</td>
                                  <td className="px-2.5 py-1.5 text-slate-900 font-bold">{c.gsm}</td>
                                  <td className="px-2.5 py-1.5 text-slate-900 font-bold">{c.dia}</td>
                                  <td className="px-2.5 py-1.5 border-r border-slate-200">
                                    <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-white border border-slate-300 font-bold text-slate-800">
                                      {c.stockState}
                                    </span>
                                  </td>
                                </>
                              )}

                              {/* Order Qty Section */}
                              {visibleSections.orderQty && (
                                <>
                                  <td className="px-2 py-1.5 text-right text-slate-800 font-bold tabular-nums">{Math.round(c.reqBody)}</td>
                                  <td className="px-2 py-1.5 text-right text-slate-800 font-bold tabular-nums">{Math.round(c.reqRib)}</td>
                                  <td className="px-2 py-1.5 text-right text-slate-800 font-bold tabular-nums">{Math.round(c.reqSJ)}</td>
                                  <td className="px-2.5 py-1.5 text-right font-bold text-blue-950 bg-blue-50/70 border-r border-slate-200 tabular-nums">{Math.round(c.totalReq)}</td>
                                </>
                              )}

                              {/* Received Qty Section */}
                              {visibleSections.receivedQty && (
                                <>
                                  <td className="px-2 py-1.5 text-right text-emerald-950 font-bold tabular-nums">{Math.round(c.recvBody)}</td>
                                  <td className="px-2 py-1.5 text-right text-emerald-950 font-bold tabular-nums">{Math.round(c.recvRib)}</td>
                                  <td className="px-2 py-1.5 text-right text-emerald-950 font-bold tabular-nums">{Math.round(c.recvSJ)}</td>
                                  <td className="px-2.5 py-1.5 text-right font-bold text-emerald-950 bg-emerald-50/70 border-r border-slate-200 tabular-nums">{Math.round(c.totalRecv)}</td>
                                </>
                              )}

                              {/* Issue / Delivery Section */}
                              {visibleSections.deliveryQty && (
                                <>
                                  <td className="px-2 py-1.5 text-right text-purple-950 font-bold tabular-nums">{Math.round(c.issuedBody)}</td>
                                  <td className="px-2 py-1.5 text-right text-purple-950 font-bold tabular-nums">{Math.round(c.issuedRib)}</td>
                                  <td className="px-2 py-1.5 text-right text-purple-950 font-bold tabular-nums">{Math.round(c.issuedSJ)}</td>
                                  <td className="px-2.5 py-1.5 text-right font-bold text-purple-950 bg-purple-50/70 border-r border-slate-200 tabular-nums">{Math.round(c.totalIssued)}</td>
                                </>
                              )}

                              {/* Closing Stock Section */}
                              {visibleSections.closingStock && (
                                <>
                                  <td className="px-2 py-1.5 text-right font-bold text-sky-950 tabular-nums">{Math.round(c.stockBody)}</td>
                                  <td className="px-2 py-1.5 text-right font-bold text-sky-950 tabular-nums">{Math.round(c.stockRib)}</td>
                                  <td className="px-2 py-1.5 text-right font-bold text-sky-950 tabular-nums">{Math.round(c.stockSJ)}</td>
                                  <td className="px-2.5 py-1.5 text-right font-extrabold text-sky-950 bg-sky-50 border-r border-slate-200 tabular-nums">{Math.round(c.stockBalance)}</td>
                                </>
                              )}

                              {/* Location & Leftover */}
                              {visibleSections.locationInfo && (
                                <>
                                  <td className="px-2.5 py-1.5 text-slate-900 font-bold">{c.location}</td>
                                  <td className="px-2.5 py-1.5 text-right text-amber-950 font-bold tabular-nums">{Math.round(c.cuttingLeftover)} kg</td>
                                  <td className="px-2.5 py-1.5 text-right text-slate-800 font-bold tabular-nums">{c.excessQty}</td>
                                  <td className="px-2.5 py-1.5 text-center text-slate-700 text-[10.5px] border-r border-slate-200">{c.date}</td>
                                </>
                              )}

                              <td className="px-2.5 py-1.5 text-center text-slate-400">—</td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION BAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500">
            <div>
              Page <strong className="text-slate-900">{currentPage}</strong> of <strong className="text-slate-900">{totalPages}</strong> ({filteredJobGroups.length} total orders)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 border border-slate-300 rounded-md font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 border border-slate-300 rounded-md font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ENTERPRISE MODAL: COLOR-WISE DETAIL & ACTIVE ISSUE / RECEIVE DESK */}
      {/* ===================================================================== */}
      {selectedJobDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl lg:max-w-5xl rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#0F274E] text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30">
                    {selectedJobDetail.buyer}
                  </span>
                  <span className="text-sm font-extrabold text-white tracking-tight">
                    Job: {selectedJobDetail.jobNo}
                  </span>
                  {selectedJobDetail.isImported && (
                    <span className="text-[9px] px-1.5 py-0.2 bg-teal-500/20 text-teal-200 rounded font-bold border border-teal-400/30">
                      IMPORTED
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span>Style: <strong className="text-white">{selectedJobDetail.style || '—'}</strong></span>
                  <span>Fabric: <strong className="text-white">{selectedJobDetail.fabric || '—'}</strong></span>
                  <span>Comp: <strong className="text-white">{selectedJobDetail.composition || '—'}</strong></span>
                  <span>GSM: <strong className="text-white">{selectedJobDetail.gsm || '—'}</strong></span>
                  <span>Dia: <strong className="text-white">{selectedJobDetail.dia || '—'}</strong></span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJobDetail(null)}
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                title="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Navigation Tabs */}
            <div className="bg-slate-100 border-b border-slate-200 px-5 py-2 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActionModalMode('VIEW')}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                    actionModalMode === 'VIEW'
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-300'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  Statement & Colors ({selectedJobDetail.colorCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActionModalMode('ISSUE')}
                  className={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-all ${
                    actionModalMode === 'ISSUE'
                      ? 'bg-purple-700 text-white shadow-2xs'
                      : 'text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Issue to Cutting</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActionModalMode('RECEIVE')}
                  className={`px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-all ${
                    actionModalMode === 'RECEIVE'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Receive Fabric Inward</span>
                </button>
              </div>

              {/* Column toggle mini pills */}
              <div className="hidden sm:flex items-center gap-1 text-[11px]">
                <span className="text-slate-500 font-semibold mr-1">Columns:</span>
                <button
                  type="button"
                  onClick={() => setDrawerVisibleSections(v => ({ ...v, orderQty: !v.orderQty }))}
                  className={`px-2 py-0.5 rounded border text-[10.5px] ${drawerVisibleSections.orderQty ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300'}`}
                >
                  Order
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerVisibleSections(v => ({ ...v, receivedQty: !v.receivedQty }))}
                  className={`px-2 py-0.5 rounded border text-[10.5px] ${drawerVisibleSections.receivedQty ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300'}`}
                >
                  Recv
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerVisibleSections(v => ({ ...v, deliveryQty: !v.deliveryQty }))}
                  className={`px-2 py-0.5 rounded border text-[10.5px] ${drawerVisibleSections.deliveryQty ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-700 border-slate-300'}`}
                >
                  Issue
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerVisibleSections(v => ({ ...v, closingStock: !v.closingStock }))}
                  className={`px-2 py-0.5 rounded border text-[10.5px] ${drawerVisibleSections.closingStock ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-700 border-slate-300'}`}
                >
                  Stock
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase tracking-wide text-slate-500 font-bold block">Total Required</span>
                  <strong className="text-slate-900 text-base">{Math.round(selectedJobDetail.totalReq).toLocaleString()} kg</strong>
                </div>
                <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
                  <span className="text-[10px] uppercase tracking-wide text-emerald-800 font-bold block">Total Received</span>
                  <strong className="text-emerald-950 text-base">{Math.round(selectedJobDetail.totalRecv).toLocaleString()} kg</strong>
                </div>
                <div className="bg-purple-50/70 p-2.5 rounded-lg border border-purple-200">
                  <span className="text-[10px] uppercase tracking-wide text-purple-800 font-bold block">Issued to Cutting</span>
                  <strong className="text-purple-950 text-base">{Math.round(selectedJobDetail.totalIssued).toLocaleString()} kg</strong>
                </div>
                <div className="bg-sky-50/70 p-2.5 rounded-lg border border-sky-200">
                  <span className="text-[10px] uppercase tracking-wide text-sky-800 font-bold block">In-Stock Balance</span>
                  <strong className="text-sky-950 text-base">{Math.round(selectedJobDetail.totalStock).toLocaleString()} kg</strong>
                </div>
              </div>

              {/* Color Details Table */}
              <div className="rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-slate-600" />
                    Color-Wise Fabric Breakdown ({selectedJobDetail.colorCount} Colors)
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">Click row to select for issue/receive</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F1F5F9] text-slate-800 border-b border-slate-300 text-[11px]">
                      <tr>
                        <th className="px-3 py-2 font-bold min-w-[130px]">Color Name</th>
                        {drawerVisibleSections.orderQty && (
                          <th className="px-2.5 py-2 text-right bg-blue-50 text-blue-950 font-bold border-l border-blue-100">Order (B/R/SJ)</th>
                        )}
                        {drawerVisibleSections.receivedQty && (
                          <th className="px-2.5 py-2 text-right bg-emerald-50 text-emerald-950 font-bold border-l border-emerald-100">Recv (B/R/SJ)</th>
                        )}
                        {drawerVisibleSections.deliveryQty && (
                          <th className="px-2.5 py-2 text-right bg-purple-50 text-purple-950 font-bold border-l border-purple-100">Issue (B/R/SJ)</th>
                        )}
                        {drawerVisibleSections.closingStock && (
                          <th className="px-2.5 py-2 text-right bg-sky-50 text-sky-950 font-bold border-l border-sky-100">Stock Bal</th>
                        )}
                        {drawerVisibleSections.location && (
                          <th className="px-2.5 py-2 text-center bg-amber-50 text-amber-950 font-bold border-l border-amber-100">Location</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                      {selectedJobDetail.colors.map((c, i) => {
                        const isSelected = actionForm.selectedColorId === c.id;
                        return (
                          <tr
                            key={c.id}
                            onClick={() => {
                              setActionForm(prev => ({
                                ...prev,
                                selectedColorId: c.id,
                                colorName: c.color,
                                location: c.location || prev.location,
                              }));
                            }}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50/80 font-semibold' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-3 py-2 font-bold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-blue-600 ring-2 ring-blue-300' : 'bg-slate-500'}`} />
                                <span>{c.color || '—'}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-normal pl-3.5">
                                Dyeing Balance: {Math.round(c.dyeingBalance)} kg
                              </div>
                            </td>

                            {drawerVisibleSections.orderQty && (
                              <td className="px-2.5 py-2 text-right text-slate-800 font-medium border-l border-slate-200">
                                <div>{Math.round(c.totalReq)} kg</div>
                                <div className="text-[10px] text-slate-500">
                                  B:{Math.round(c.reqBody)} R:{Math.round(c.reqRib)} SJ:{Math.round(c.reqSJ)}
                                </div>
                              </td>
                            )}

                            {drawerVisibleSections.receivedQty && (
                              <td className="px-2.5 py-2 text-right text-emerald-950 font-bold border-l border-slate-200">
                                <div>{Math.round(c.totalRecv)} kg</div>
                                <div className="text-[10px] text-emerald-700">
                                  B:{Math.round(c.recvBody)} R:{Math.round(c.recvRib)} SJ:{Math.round(c.recvSJ)}
                                </div>
                              </td>
                            )}

                            {drawerVisibleSections.deliveryQty && (
                              <td className="px-2.5 py-2 text-right text-purple-950 font-bold border-l border-slate-200">
                                <div>{Math.round(c.totalIssued)} kg</div>
                                <div className="text-[10px] text-purple-700">
                                  B:{Math.round(c.issuedBody)} R:{Math.round(c.issuedRib)} SJ:{Math.round(c.issuedSJ)}
                                </div>
                              </td>
                            )}

                            {drawerVisibleSections.closingStock && (
                              <td className="px-2.5 py-2 text-right font-extrabold text-sky-950 border-l border-slate-200">
                                <div>{Math.round(c.stockBalance)} kg</div>
                                <div className="text-[10px] text-sky-700">
                                  B:{Math.round(c.stockBody)} R:{Math.round(c.stockRib)} SJ:{Math.round(c.stockSJ)}
                                </div>
                              </td>
                            )}

                            {drawerVisibleSections.location && (
                              <td className="px-2.5 py-2 text-center border-l border-slate-200">
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                                  {c.location || 'F.ST'}
                                </span>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* =============================================================== */}
              {/* ADDITIONAL PART: ACTIVE ISSUE / RECEIVE FORM AT BOTTOM */}
              {/* =============================================================== */}
              {actionModalMode === 'ISSUE' && (
                <div className="bg-purple-50/70 border-2 border-purple-300 rounded-xl p-4.5 shadow-sm animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple-200">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-purple-600 text-white flex items-center justify-center">
                        <Scissors className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-purple-950 uppercase tracking-wide">
                          Issue Fabric to Cutting Floor
                        </h4>
                        <p className="text-[11px] text-purple-800">
                          Dispatch Body, Rib, or S.Jersey fabric from store to cutting marker line.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-purple-900">Job: {selectedJobDetail.jobNo}</span>
                  </div>

                  <form onSubmit={handleConfirmIssueFromModal} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Select Color *</label>
                        <select
                          value={actionForm.selectedColorId}
                          onChange={(e) => {
                            const found = selectedJobDetail.colors.find(c => c.id === e.target.value);
                            setActionForm(prev => ({
                              ...prev,
                              selectedColorId: e.target.value,
                              colorName: found ? found.color : '',
                              location: (found && found.location) || prev.location,
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          {selectedJobDetail.colors.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.color || 'Color'} (Stock: {Math.round(c.stockBalance)} kg · Loc: {c.location})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Cutting Table / Line</label>
                        <input
                          type="text"
                          value={actionForm.cuttingLine}
                          onChange={(e) => setActionForm(prev => ({ ...prev, cuttingLine: e.target.value }))}
                          placeholder="e.g. Table-1, Line-A"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Received By (Cutting Supervisor)</label>
                        <input
                          type="text"
                          value={actionForm.issuedTo}
                          onChange={(e) => setActionForm(prev => ({ ...prev, issuedTo: e.target.value }))}
                          placeholder="e.g. Cutting Master Kabir"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    {/* Breakdown Quantities to Issue */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-white p-3 rounded-lg border border-purple-200">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Body Fabric (kg)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={actionForm.bodyKg || ''}
                          onChange={(e) => setActionForm(prev => ({ ...prev, bodyKg: parseFloat(e.target.value) || 0 }))}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Rib Fabric (kg)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={actionForm.ribKg || ''}
                          onChange={(e) => setActionForm(prev => ({ ...prev, ribKg: parseFloat(e.target.value) || 0 }))}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">S.Jersey (kg)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={actionForm.sjKg || ''}
                          onChange={(e) => setActionForm(prev => ({ ...prev, sjKg: parseFloat(e.target.value) || 0 }))}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Total Issue Qty</label>
                        <div className="w-full px-2.5 py-1.5 bg-purple-100 border border-purple-300 rounded-md text-xs font-extrabold text-purple-950 flex items-center justify-between">
                          <span>Total:</span>
                          <span>{((actionForm.bodyKg || 0) + (actionForm.ribKg || 0) + (actionForm.sjKg || 0)).toFixed(1)} kg</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setActionModalMode('VIEW')}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-md text-xs font-semibold border border-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        <span>Confirm & Send to Cutting</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {actionModalMode === 'RECEIVE' && (
                <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-xl p-4.5 shadow-sm animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-200">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">
                          Receive Fabric Inward into Store
                        </h4>
                        <p className="text-[11px] text-emerald-800">
                          Receive inward fabric from dyeing or supplier and add to stock.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-900">Job: {selectedJobDetail.jobNo}</span>
                  </div>

                  <form onSubmit={handleConfirmReceiveFromModal} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Color Name *</label>
                        <input
                          type="text"
                          value={actionForm.colorName}
                          onChange={(e) => setActionForm(prev => ({ ...prev, colorName: e.target.value }))}
                          placeholder="e.g. Black C-N10, White"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Challan No</label>
                        <input
                          type="text"
                          value={actionForm.challanNo}
                          onChange={(e) => setActionForm(prev => ({ ...prev, challanNo: e.target.value }))}
                          placeholder="e.g. CH-NFL-4828"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Supplier / Factory</label>
                        <input
                          type="text"
                          value={actionForm.supplier}
                          onChange={(e) => setActionForm(prev => ({ ...prev, supplier: e.target.value }))}
                          placeholder="e.g. Northern Dyeing Unit-1"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Store Location</label>
                        <select
                          value={actionForm.location}
                          onChange={(e) => setActionForm(prev => ({ ...prev, location: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="F.ST">F.ST</option>
                          <option value="N.ST">N.ST</option>
                          <option value=".CB/F.ST">.CB/F.ST</option>
                          <option value="CB">CB</option>
                          <option value=".CB/N.ST">.CB/N.ST</option>
                          <option value=".F.ST/N.ST">.F.ST/N.ST</option>
                        </select>
                      </div>
                    </div>

                    {/* Breakdown Quantities to Receive */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-white p-3 rounded-lg border border-emerald-200">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Body Fabric (kg)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={actionForm.bodyKg || ''}
                          onChange={(e) => setActionForm(prev => ({ ...prev, bodyKg: parseFloat(e.target.value) || 0 }))}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Rib Fabric (kg)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={actionForm.ribKg || ''}
                          onChange={(e) => setActionForm(prev => ({ ...prev, ribKg: parseFloat(e.target.value) || 0 }))}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">S.Jersey (kg)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={actionForm.sjKg || ''}
                          onChange={(e) => setActionForm(prev => ({ ...prev, sjKg: parseFloat(e.target.value) || 0 }))}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Total Received</label>
                        <div className="w-full px-2.5 py-1.5 bg-emerald-100 border border-emerald-300 rounded-md text-xs font-extrabold text-emerald-950 flex items-center justify-between">
                          <span>Total:</span>
                          <span>{((actionForm.bodyKg || 0) + (actionForm.ribKg || 0) + (actionForm.sjKg || 0)).toFixed(1)} kg</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setActionModalMode('VIEW')}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-md text-xs font-semibold border border-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Confirm & Receive Fabric</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {actionModalMode === 'VIEW' && (
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActionModalMode('ISSUE')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
                    >
                      <Scissors className="w-3.5 h-3.5 text-white" />
                      <span>Issue this Job to Cutting</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionModalMode('RECEIVE')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                      <span>Receive More for this Job</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedJobDetail(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Close Dialog
                  </button>
                </div>
              )}
            </div>

            {/* Modal Bottom Sticky Bar */}
            <div className="px-5 py-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
              <span className="font-medium">
                Store Department · Northern Fashions Limited ERP
              </span>
              <button
                type="button"
                onClick={() => setSelectedJobDetail(null)}
                className="px-3 py-1 bg-white hover:bg-slate-200 text-slate-800 rounded border border-slate-300 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: IMPORTED & NEW RECEIVE DESK */}
      {/* ===================================================================== */}
      {activeTab === 'RECEIVE' && (
        <div className="space-y-4 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  Finished Fabric Receiving & Inward Gate Register
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Receiving from Suppliers, Imported Fabrics & Cutting Floor Leftover Returns
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsManualModalOpen(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>+ New Receive Challan</span>
              </button>
            </div>

            {/* Source Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReceiveSourceFilter('ALL')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 650,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: receiveSourceFilter === 'ALL' ? '1px solid #0F274E' : '1px solid #CBD5E1',
                    background: receiveSourceFilter === 'ALL' ? '#0F274E' : '#FFFFFF',
                    color: receiveSourceFilter === 'ALL' ? '#FFFFFF' : '#334155'
                  }}
                >
                  All Inward Sources ({challans.length})
                </button>

                <button
                  type="button"
                  onClick={() => setReceiveSourceFilter('SUPPLIER')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 650,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: receiveSourceFilter === 'SUPPLIER' ? '1px solid #0F274E' : '1px solid #CBD5E1',
                    background: receiveSourceFilter === 'SUPPLIER' ? '#0F274E' : '#FFFFFF',
                    color: receiveSourceFilter === 'SUPPLIER' ? '#FFFFFF' : '#334155'
                  }}
                >
                  Supplier Delivery
                </button>

                <button
                  type="button"
                  onClick={() => setReceiveSourceFilter('IMPORT')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 650,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: receiveSourceFilter === 'IMPORT' ? '1px solid #0F274E' : '1px solid #CBD5E1',
                    background: receiveSourceFilter === 'IMPORT' ? '#0F274E' : '#FFFFFF',
                    color: receiveSourceFilter === 'IMPORT' ? '#FFFFFF' : '#334155'
                  }}
                >
                  Imported Fabric
                </button>

                <button
                  type="button"
                  onClick={() => setReceiveSourceFilter('CUTTING_LEFTOVER')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 650,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: receiveSourceFilter === 'CUTTING_LEFTOVER' ? '1px solid #0F274E' : '1px solid #CBD5E1',
                    background: receiveSourceFilter === 'CUTTING_LEFTOVER' ? '#0F274E' : '#FFFFFF',
                    color: receiveSourceFilter === 'CUTTING_LEFTOVER' ? '#FFFFFF' : '#334155'
                  }}
                >
                  Cutting Floor Return
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Challan, Supplier, Job No..."
                  value={receiveSearchQuery}
                  onChange={e => setReceiveSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Challans Table */}
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-300 text-[11px]">
                  <tr>
                    <th className="px-3 py-2 font-bold">Challan No</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-bold">Supplier</th>
                    <th className="px-3 py-2 font-semibold">Source</th>
                    <th className="px-3 py-2 font-bold">Buyer - Job No</th>
                    <th className="px-3 py-2 font-semibold">Style</th>
                    <th className="px-3 py-2 font-bold">Color</th>
                    <th className="px-3 py-2 text-right font-medium">Body Kg</th>
                    <th className="px-3 py-2 text-right font-medium">Rib Kg</th>
                    <th className="px-3 py-2 text-right font-medium">S.Jersey Kg</th>
                    <th className="px-3 py-2 text-right font-bold bg-emerald-100 text-emerald-900 border-l border-emerald-200">Total Recv</th>
                    <th className="px-3 py-2 text-center font-medium">Rolls</th>
                    <th className="px-3 py-2 font-semibold">Shelf Location</th>
                    <th className="px-3 py-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                  {challans
                    .filter(ch => {
                      if (receiveSourceFilter !== 'ALL' && ch.sourceType !== receiveSourceFilter) return false;
                      if (!receiveSearchQuery) return true;
                      const q = receiveSearchQuery.toLowerCase();
                      return `${ch.challanNo} ${ch.supplier} ${ch.jobNo} ${ch.color} ${ch.style}`.toLowerCase().includes(q);
                    })
                    .map(ch => (
                      <tr key={ch.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2 font-semibold text-slate-900">{ch.challanNo}</td>
                        <td className="px-3 py-2 text-slate-500">{ch.date}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{ch.supplier}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {ch.sourceType === 'SUPPLIER' ? 'Supplier' : ch.sourceType === 'IMPORT' ? 'Imported' : 'Leftover Return'}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-800">{ch.buyer} - {ch.jobNo}</td>
                        <td className="px-3 py-2 text-slate-600">{ch.style}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">{ch.color}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{ch.weighedBodyKg}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{ch.weighedRibKg}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{ch.weighedSJKg}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-900 bg-emerald-50/60">
                          {ch.totalKg} kg
                        </td>
                        <td className="px-3 py-2 text-center font-medium text-slate-700">{ch.rollCount}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            {ch.rackLocation}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {ch.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: NEW RECEIVE WITH COLOR-WISE BREAKDOWN */}
      {/* ===================================================================== */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-300 overflow-hidden flex flex-col animate-in fade-in zoom-in-98">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Truck className="w-4 h-4 text-sky-300" />
                  Imported & New Receive Challan Entry
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Record inward delivery with Body, Single Jersey & Rib component breakdown
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="w-7 h-7 rounded hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-xs">
              {/* Row 1: Source, Challan No, Date, Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Receive Source</label>
                  <select
                    value={receiveForm.sourceType}
                    onChange={e => setReceiveForm({ ...receiveForm, sourceType: e.target.value as any })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-900"
                  >
                    <option value="SUPPLIER">Supplier Delivery</option>
                    <option value="IMPORT">Imported Fabric</option>
                    <option value="CUTTING_LEFTOVER">Cutting Floor Return</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Challan / Ref No *</label>
                  <input
                    type="text"
                    value={receiveForm.challanNo}
                    onChange={e => setReceiveForm({ ...receiveForm, challanNo: e.target.value })}
                    placeholder="e.g. CH-NFL-2026-99"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Delivery Date</label>
                  <input
                    type="date"
                    value={receiveForm.date}
                    onChange={e => setReceiveForm({ ...receiveForm, date: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Supplier *</label>
                  <input
                    type="text"
                    value={receiveForm.supplier}
                    onChange={e => setReceiveForm({ ...receiveForm, supplier: e.target.value })}
                    placeholder="Supplier name"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Row 2: Buyer, Job No, Style, Fabric Spec */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Buyer</label>
                  <input
                    type="text"
                    value={receiveForm.buyer}
                    onChange={e => setReceiveForm({ ...receiveForm, buyer: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Job No *</label>
                  <input
                    type="text"
                    value={receiveForm.jobNo}
                    onChange={e => setReceiveForm({ ...receiveForm, jobNo: e.target.value })}
                    placeholder="e.g. 48283 or 48002"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Style No</label>
                  <input
                    type="text"
                    value={receiveForm.style}
                    onChange={e => setReceiveForm({ ...receiveForm, style: e.target.value })}
                    placeholder="e.g. 22042341"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Fabric Type & GSM</label>
                  <input
                    type="text"
                    value={`${receiveForm.fabricType} ${receiveForm.gsm} GSM`}
                    onChange={e => setReceiveForm({ ...receiveForm, fabricType: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Color-wise Receive Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-slate-600" />
                    Color Intake (Body, Single Jersey, Rib)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddReceiveColorRow}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-medium flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3 h-3 text-slate-600" />
                    <span>Add Color</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-800 border-b border-slate-300 text-[10.5px]">
                      <tr>
                        <th className="px-2.5 py-2 font-bold min-w-[120px]">Color Name *</th>
                        <th className="px-2 py-2 text-center bg-blue-100 text-blue-900 font-semibold border-l border-blue-200" colSpan={3}>Required (Kg)</th>
                        <th className="px-2 py-2 text-center bg-emerald-100 text-emerald-900 font-bold border-l border-emerald-200" colSpan={3}>Received (Kg) *</th>
                        <th className="px-2.5 py-2 font-semibold min-w-[110px] border-l border-slate-300">Location *</th>
                        <th className="px-2 py-2 text-center min-w-[50px] border-l border-slate-300">Rolls</th>
                        <th className="px-1 py-2 text-center w-8"></th>
                      </tr>
                      <tr className="bg-slate-50 text-[10px] text-slate-700 border-t border-slate-300">
                        <th></th>
                        <th className="px-1.5 py-1 text-right bg-blue-50 text-blue-900 border-l border-blue-100">Body</th>
                        <th className="px-1.5 py-1 text-right bg-blue-50 text-blue-900 border-l border-blue-100">S.Jersey</th>
                        <th className="px-1.5 py-1 text-right bg-blue-50 text-blue-900 border-l border-blue-100">Rib</th>
                        <th className="px-1.5 py-1 text-right bg-emerald-50 text-emerald-900 border-l border-emerald-100">Body</th>
                        <th className="px-1.5 py-1 text-right bg-emerald-50 text-emerald-900 border-l border-emerald-100">S.Jersey</th>
                        <th className="px-1.5 py-1 text-right bg-emerald-50 text-emerald-900 border-l border-emerald-100">Rib</th>
                        <th></th>
                        <th></th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                      {receiveForm.colors.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={c.color}
                              onChange={e => {
                                const next = [...receiveForm.colors];
                                next[idx].color = e.target.value;
                                setReceiveForm({ ...receiveForm, colors: next });
                              }}
                              placeholder="e.g. Black C-N10"
                              className="w-full px-2 py-1 border border-slate-300 rounded font-medium text-slate-900"
                            />
                          </td>

                          <td className="px-1.5 py-1.5">
                            <input
                              type="number"
                              value={c.reqBody || ''}
                              onChange={e => {
                                const next = [...receiveForm.colors];
                                next[idx].reqBody = Number(e.target.value) || 0;
                                setReceiveForm({ ...receiveForm, colors: next });
                              }}
                              placeholder="0"
                              className="w-16 px-1.5 py-1 border border-slate-300 rounded text-right font-medium"
                            />
                          </td>

                          <td className="px-1.5 py-1.5">
                            <input
                              type="number"
                              value={c.reqSJ || ''}
                              onChange={e => {
                                const next = [...receiveForm.colors];
                                next[idx].reqSJ = Number(e.target.value) || 0;
                                setReceiveForm({ ...receiveForm, colors: next });
                              }}
                              placeholder="0"
                              className="w-16 px-1.5 py-1 border border-slate-300 rounded text-right font-medium"
                            />
                          </td>

                          <td className="px-1.5 py-1.5">
                            <input
                              type="number"
                              value={c.reqRib || ''}
                              onChange={e => {
                                const next = [...receiveForm.colors];
                                next[idx].reqRib = Number(e.target.value) || 0;
                                setReceiveForm({ ...receiveForm, colors: next });
                              }}
                              placeholder="0"
                              className="w-16 px-1.5 py-1 border border-slate-300 rounded text-right font-medium"
                            />
                          </td>

                          <td className="px-1.5 py-1.5">
                            <input
                              type="number"
                              value={c.recvBody || ''}
                              onChange={e => {
                                const next = [...receiveForm.colors];
                                next[idx].recvBody = Number(e.target.value) || 0;
                                setReceiveForm({ ...receiveForm, colors: next });
                              }}
                              placeholder="0"
                              className="w-16 px-1.5 py-1 border border-emerald-400 rounded text-right font-bold text-emerald-800 bg-emerald-50/50"
                            />
                          </td>

                          <td className="px-1.5 py-1.5">
                            <input
                              type="number"
                              value={c.recvSJ || ''}
                              onChange={e => {
                                const next = [...receiveForm.colors];
                                next[idx].recvSJ = Number(e.target.value) || 0;
                                setReceiveForm({ ...receiveForm, colors: next });
                              }}
                              placeholder="0"
                              className="w-16 px-1.5 py-1 border border-emerald-400 rounded text-right font-bold text-emerald-800 bg-emerald-50/50"
                            />
                          </td>

                          <td className="px-1.5 py-1.5">
                            <input
                              type="number"
                              value={c.recvRib || ''}
                              onChange={e => {
                                const next = [...receiveForm.colors];
                                next[idx].recvRib = Number(e.target.value) || 0;
                                setReceiveForm({ ...receiveForm, colors: next });
                              }}
                              placeholder="0"
                              className="w-16 px-1.5 py-1 border border-emerald-400 rounded text-right font-bold text-emerald-800 bg-emerald-50/50"
                            />
                          </td>

                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={c.location}
                              onChange={e => {
                                const next = [...receiveForm.colors];
                                next[idx].location = e.target.value;
                                setReceiveForm({ ...receiveForm, colors: next });
                              }}
                              placeholder="e.g. R-04 · Shelf 02"
                              className="w-full px-2 py-1 border border-slate-300 rounded font-medium text-slate-800 text-[11px]"
                            />
                          </td>

                          <td className="px-1.5 py-1.5">
                            <input
                              type="number"
                              value={c.rollCount}
                              onChange={e => {
                                const next = [...receiveForm.colors];
                                next[idx].rollCount = Number(e.target.value) || 1;
                                setReceiveForm({ ...receiveForm, colors: next });
                              }}
                              className="w-12 px-1 py-1 border border-slate-300 rounded text-center font-medium"
                            />
                          </td>

                          <td className="px-1 py-1.5 text-center">
                            {receiveForm.colors.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = receiveForm.colors.filter((_, i) => i !== idx);
                                  setReceiveForm({ ...receiveForm, colors: next });
                                }}
                                className="text-rose-500 hover:text-rose-700"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmReceiveChallan}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>Confirm & Accept Delivery</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: ISSUE TO CUTTING FLOOR */}
      {/* ===================================================================== */}
      {activeTab === 'ISSUE' && (
        <div className="space-y-3 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-purple-700" />
                  Cutting Floor Requisition & Delivery Desk
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select or search any job to prepare color-wise cutting delivery gate pass with Today Delivery entry
                </p>
              </div>

              <div className="relative min-w-[280px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search any Job #, Style, Buyer..."
                  value={issueSearchQuery}
                  onChange={e => setIssueSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
            {/* Left Column: Jobs in Store */}
            <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 p-3.5 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900">
                  Select Job for Delivery
                </span>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  Stock Ready
                </span>
              </div>

              <div className="overflow-y-auto max-h-[560px] space-y-2 pr-1">
                {jobGroups
                  .filter(job => {
                    if (job.totalStock <= 0) return false;
                    if (!issueSearchQuery) return true;
                    const q = issueSearchQuery.toLowerCase();
                    return `${job.jobNo} ${job.style} ${job.buyer} ${job.fabric}`.toLowerCase().includes(q);
                  })
                  .slice(0, 40)
                  .map(job => {
                    const isSelected = selectedIssueJob?.key === job.key;
                    return (
                      <div
                        key={job.key}
                        onClick={() => {
                          setSelectedIssueJob(job);
                          const init: Record<string, any> = {};
                          job.colors.forEach(c => {
                            init[c.id] = {
                              bodyKg: Math.min(c.stockBody, Math.max(0, c.recvBody - c.issuedBody)),
                              sjKg: Math.min(c.stockSJ, Math.max(0, c.recvSJ - c.issuedSJ)),
                              ribKg: Math.min(c.stockRib, Math.max(0, c.recvRib - c.issuedRib)),
                              isCuttingOk: false,
                            };
                          });
                          setTodayDeliveries(init);
                        }}
                        className={`p-2.5 rounded-md border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-600 shadow-xs ring-1 ring-blue-600'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{job.jobNo}</span>
                          <span className="text-xs font-semibold text-sky-900 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                            {Math.round(job.totalStock).toLocaleString()} kg In-Stock
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {job.buyer} · Style: <strong className="text-slate-800">{job.style}</strong>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {job.fabric} · {job.colorCount} Colors
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Right Column: Cutting Delivery Form */}
            <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
              {selectedIssueJob ? (
                <div className="space-y-3.5">
                  <div
                    style={{
                      background: '#F0F9FF',
                      border: '1px solid #BAE6FD',
                      borderRadius: '8px',
                      padding: '14px 16px',
                      color: '#0F274E',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', color: '#0284C7' }}>
                        {selectedIssueJob.buyer} · Cutting Gate Delivery Desk
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 750, background: '#DCFCE7', color: '#166534', padding: '3px 8px', borderRadius: '4px', border: '1px solid #86EFAC' }}>
                        Available Stock: {Math.round(selectedIssueJob.totalStock).toLocaleString()} kg
                      </span>
                    </div>

                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F274E' }}>
                      Job #{selectedIssueJob.jobNo} — Style: {cleanStyleNo(selectedIssueJob.style)}
                    </div>

                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                      <span><strong style={{ color: '#1E293B' }}>Composition:</strong> {selectedIssueJob.composition}</span>
                      <span><strong style={{ color: '#1E293B' }}>GSM:</strong> {selectedIssueJob.gsm}</span>
                      <span><strong style={{ color: '#1E293B' }}>Dia:</strong> {selectedIssueJob.dia}</span>
                      <span><strong style={{ color: '#1E293B' }}>Process:</strong> {selectedIssueJob.process}</span>
                      <span><strong style={{ color: '#1E293B' }}>Supplier:</strong> {selectedIssueJob.supplier}</span>
                    </div>
                  </div>

                  {/* Delivery Table */}
                  <div className="overflow-x-auto rounded-md border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-800 border-b border-slate-300 text-[10.5px]">
                        <tr>
                          <th className="px-2.5 py-2 font-bold min-w-[120px]">Color</th>
                          <th className="px-2 py-2 text-right bg-blue-100 text-blue-900 font-semibold min-w-[70px] border-l border-blue-200">Order (Kg)</th>
                          <th className="px-2 py-2 text-right bg-emerald-100 text-emerald-900 font-semibold min-w-[70px] border-l border-emerald-200">Recv (Kg)</th>
                          <th className="px-2 py-2 text-right bg-purple-100 text-purple-900 font-semibold min-w-[80px] border-l border-purple-200">Prev Delivered</th>
                          <th className="px-2 py-2 text-right bg-sky-100 text-sky-900 font-semibold min-w-[80px] border-l border-sky-200">Delivery Bal</th>
                          <th className="px-2 py-2 text-center bg-slate-200 text-slate-800 font-bold min-w-[160px] border-l border-slate-300">
                            Today Delivery (Body / SJ / Rib)
                          </th>
                          <th className="px-2 py-2 text-center bg-slate-100 text-slate-800 font-semibold min-w-[75px] border-l border-slate-300">Cutting OK?</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                        {selectedIssueJob.colors.map(c => {
                          const delivery = todayDeliveries[c.id] || { bodyKg: 0, sjKg: 0, ribKg: 0, isCuttingOk: false };
                          const todayTotal = (Number(delivery.bodyKg) || 0) + (Number(delivery.sjKg) || 0) + (Number(delivery.ribKg) || 0);
                          const remainingAfterToday = Math.max(0, c.stockBalance - todayTotal);

                          return (
                            <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2.5 py-2 font-semibold text-slate-900">
                                <div>{c.color}</div>
                                <div className="text-[10px] text-slate-500 font-normal">Loc: {c.location}</div>
                              </td>

                              <td className="px-2 py-2 text-right text-slate-700">
                                <div>{Math.round(c.totalReq)}</div>
                                <div className="text-[10px] text-slate-400">B:{Math.round(c.reqBody)} R:{Math.round(c.reqRib)}</div>
                              </td>

                              <td className="px-2 py-2 text-right text-emerald-800 font-medium">
                                <div>{Math.round(c.totalRecv)}</div>
                                <div className="text-[10px] text-emerald-600">B:{Math.round(c.recvBody)} R:{Math.round(c.recvRib)}</div>
                              </td>

                              <td className="px-2 py-2 text-right text-purple-800 font-medium">
                                <div>{Math.round(c.totalIssued)}</div>
                                <div className="text-[10px] text-purple-500">B:{Math.round(c.issuedBody)} R:{Math.round(c.issuedRib)}</div>
                              </td>

                              <td className="px-2 py-2 text-right font-semibold text-sky-900 bg-sky-50/50">
                                <div>{Math.round(c.stockBalance)} kg</div>
                                <div className="text-[10px] text-sky-700">Rem: {Math.round(remainingAfterToday)} kg</div>
                              </td>

                              {/* Today Delivery Inputs */}
                              <td className="px-2 py-1.5 text-center bg-slate-50">
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    value={delivery.bodyKg || ''}
                                    placeholder="Body"
                                    onChange={e => {
                                      setTodayDeliveries(prev => ({
                                        ...prev,
                                        [c.id]: {
                                          ...delivery,
                                          bodyKg: Number(e.target.value) || 0,
                                        },
                                      }));
                                    }}
                                    className="w-14 px-1 py-1 border border-slate-300 rounded text-right font-medium text-slate-900 bg-white"
                                    title="Body Kg"
                                  />
                                  <input
                                    type="number"
                                    value={delivery.sjKg || ''}
                                    placeholder="SJ"
                                    onChange={e => {
                                      setTodayDeliveries(prev => ({
                                        ...prev,
                                        [c.id]: {
                                          ...delivery,
                                          sjKg: Number(e.target.value) || 0,
                                        },
                                      }));
                                    }}
                                    className="w-14 px-1 py-1 border border-slate-300 rounded text-right font-medium text-slate-900 bg-white"
                                    title="S.Jersey Kg"
                                  />
                                  <input
                                    type="number"
                                    value={delivery.ribKg || ''}
                                    placeholder="Rib"
                                    onChange={e => {
                                      setTodayDeliveries(prev => ({
                                        ...prev,
                                        [c.id]: {
                                          ...delivery,
                                          ribKg: Number(e.target.value) || 0,
                                        },
                                      }));
                                    }}
                                    className="w-14 px-1 py-1 border border-slate-300 rounded text-right font-medium text-slate-900 bg-white"
                                    title="Rib Kg"
                                  />
                                </div>
                                <div className="text-[10px] font-semibold text-slate-700 mt-0.5">
                                  Total: {todayTotal} kg
                                </div>
                              </td>

                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTodayDeliveries(prev => ({
                                      ...prev,
                                      [c.id]: {
                                        ...delivery,
                                        isCuttingOk: !delivery.isCuttingOk,
                                      },
                                    }));
                                  }}
                                  className={`px-2 py-1 rounded text-[10px] font-semibold transition-all border ${
                                    delivery.isCuttingOk
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  {delivery.isCuttingOk ? '✓ OK' : 'Mark OK'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>

                      {/* Summary Total Row */}
                      <tfoot className="bg-slate-100 font-bold text-xs text-slate-900 border-t border-slate-300">
                        <tr>
                          <td className="px-2.5 py-2 uppercase tracking-wider text-slate-700">Total Summary</td>
                          <td className="px-2 py-2 text-right">{Math.round(selectedIssueJob.totalReq).toLocaleString()} kg</td>
                          <td className="px-2 py-2 text-right text-emerald-800">{Math.round(selectedIssueJob.totalRecv).toLocaleString()} kg</td>
                          <td className="px-2 py-2 text-right text-purple-800">{Math.round(selectedIssueJob.totalIssued).toLocaleString()} kg</td>
                          <td className="px-2 py-2 text-right text-sky-900">{Math.round(selectedIssueJob.totalStock).toLocaleString()} kg</td>
                          <td className="px-2 py-2 text-center font-bold text-slate-900">
                            {Object.values(todayDeliveries).reduce(
                              (sum, d) => sum + (Number(d.bodyKg) || 0) + (Number(d.sjKg) || 0) + (Number(d.ribKg) || 0),
                              0
                            )}{' '}
                            kg Today
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Save Delivery Button */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedIssueJob(null)}
                      className="px-3.5 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveTodayDelivery(selectedIssueJob)}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5 text-white" />
                      <span>Save & Confirm Cutting Delivery</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-slate-400">
                  <Scissors className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">No Job Currently Selected</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Select an available job from the left or search above to prepare cutting delivery
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Cutting Floor Issuance Log */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
              Cutting Floor Issuance & Gate Pass Log
            </h4>
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-300 text-[11px]">
                  <tr>
                    <th className="px-3 py-2 font-bold">Issue No</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-bold">Buyer - Job No</th>
                    <th className="px-3 py-2 font-semibold">Style</th>
                    <th className="px-3 py-2 font-bold">Color</th>
                    <th className="px-3 py-2 text-right font-medium">Body Kg</th>
                    <th className="px-3 py-2 text-right font-medium">Rib Kg</th>
                    <th className="px-3 py-2 text-right font-medium">S.Jersey Kg</th>
                    <th className="px-3 py-2 text-right font-bold bg-purple-100 text-purple-900 border-l border-purple-200">Total Issued</th>
                    <th className="px-3 py-2 font-semibold">Remarks / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                  {cuttingIssues.map(ci => (
                    <tr key={ci.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-semibold text-slate-900">{ci.issueNo}</td>
                      <td className="px-3 py-2 text-slate-500">{ci.date}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{ci.buyer} - {ci.jobNo}</td>
                      <td className="px-3 py-2 text-slate-600">{ci.style}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{ci.color}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{ci.bodyKg}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{ci.ribKg}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{ci.sjKg}</td>
                      <td className="px-3 py-2 text-right font-bold text-purple-900 bg-purple-50/50">{ci.totalKg} kg</td>
                      <td className="px-3 py-2 text-slate-600">
                        {ci.isCuttingOk ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Cutting OK
                          </span>
                        ) : (
                          <span>{ci.remarks}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: LOCATION TRACKING (20 MASTER RACKS × 20 SHELVES) */}
      {/* ===================================================================== */}
      {activeTab === 'LOCATION' && (
        <div className="mb-8">
          <FabricRackLocation
            lines={rawLines}
            locations={rackLoc}
            onChange={(next, msg) => saveRackLoc(next, msg)}
            initialSub="racks"
          />
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: LEFTOVER & REUSE FABRIC */}
      {/* ===================================================================== */}
      {activeTab === 'REUSE' && (
        <div className="space-y-3 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-slate-600" />
                  Finished Fabric Leftover & Reuse Store
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Leftover balances from Cutting Floor Returns & Completed Order Closing Stocks
                </p>
              </div>
              <span className="text-xs font-semibold bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded border border-amber-200">
                {leftoverLedger.length} Leftover Roll Lots Registered
              </span>
            </div>

            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-300 text-[11px]">
                  <tr>
                    <th className="px-3 py-2 font-bold">Date</th>
                    <th className="px-3 py-2 font-bold">Job No</th>
                    <th className="px-3 py-2 font-bold">Color</th>
                    <th className="px-3 py-2 font-semibold">Source</th>
                    <th className="px-3 py-2 text-right font-medium">Body Kg</th>
                    <th className="px-3 py-2 text-right font-medium">Rib Kg</th>
                    <th className="px-3 py-2 text-right font-medium">S.Jersey Kg</th>
                    <th className="px-3 py-2 text-right font-bold bg-amber-100 text-amber-900 border-l border-amber-200">Total Leftover</th>
                    <th className="px-3 py-2 font-bold">Assigned Shelf</th>
                    <th className="px-3 py-2 font-semibold">Returned By</th>
                    <th className="px-3 py-2 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                  {leftoverLedger.map(lr => (
                    <tr key={lr.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-500">{lr.date}</td>
                      <td className="px-3 py-2 font-bold text-slate-900">{lr.jobNo}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{lr.color}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          {lr.source}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">{lr.bodyKg}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{lr.ribKg}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{lr.sjKg}</td>
                      <td className="px-3 py-2 text-right font-bold text-amber-900 bg-amber-50/50">
                        {lr.totalKg} kg
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{lr.rackAssigned}</td>
                      <td className="px-3 py-2 text-slate-600">{lr.returnedBy}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {lr.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* ===================================================================== */}
      {/* EXCEL MULTI-MONTH WORKBOOK IMPORT MODAL */}
      {/* ===================================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FolderUp className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Import Finished Fabric Excel Workbook</h3>
                  <p className="text-[11px] text-emerald-100">Consolidate multi-month workbook sheets into live store inventory</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-emerald-100 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 rounded-xl p-8 text-center transition-colors">
                <FileSpreadsheet className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-800 mb-1">
                  Select or drop Excel Workbook (.xlsx / .xls)
                </p>
                <p className="text-[11px] text-slate-500 mb-4 max-w-xs mx-auto">
                  All month tabs (September, October, November, etc.) will be automatically consolidated into one view.
                </p>

                <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Choose Excel File</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFabricWorkbookUpload}
                    disabled={isImporting}
                    className="hidden"
                  />
                </label>
              </div>

              {isImporting && (
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 py-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Parsing workbook sheets, please wait...</span>
                </div>
              )}

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-700 mb-0.5">Automatic Column Mapping:</div>
                <div>• Job / Order No, Buyer, Style, Fabric Type, Color, GSM, Dia</div>
                <div>• Required Qty, Received Qty, Issued Qty, Closing Stock</div>
                <div>• Store Rack / Bin Location, Delivery Date, Challan No</div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MANUAL DATA ENTRY MODAL (JOB + MULTIPLE COLORS) */}
      {/* ===================================================================== */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-8">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-sky-400" />
                  Manual Fabric Entry (New Job & Multi-Color)
                </h3>
                <p className="text-xs text-slate-400">Enter single job with multiple colors (3, 4, 5+ colors), roll counts, weights (Kg) and rack locations</p>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualFabricSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Job No *</label>
                  <input
                    required
                    type="text"
                    value={manualJobForm.jobNo}
                    onChange={e => setManualJobForm(p => ({ ...p, jobNo: e.target.value }))}
                    placeholder="e.g. 48095"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Buyer *</label>
                  <input
                    required
                    type="text"
                    value={manualJobForm.buyer}
                    onChange={e => setManualJobForm(p => ({ ...p, buyer: e.target.value }))}
                    placeholder="e.g. Bestseller / ONLY"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Style No</label>
                  <input
                    type="text"
                    value={manualJobForm.style}
                    onChange={e => setManualJobForm(p => ({ ...p, style: e.target.value }))}
                    placeholder="e.g. 22040024"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Month *</label>
                  <select
                    value={manualJobForm.month}
                    onChange={e => setManualJobForm(p => ({ ...p, month: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="November 2026">November 2026</option>
                    <option value="October 2026">October 2026</option>
                    <option value="September 2026">September 2026</option>
                    <option value="August 2026">August 2026</option>
                    <option value="December 2026">December 2026</option>
                    <option value="January 2027">January 2027</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fabric Type</label>
                  <input
                    type="text"
                    value={manualJobForm.fabricType}
                    onChange={e => setManualJobForm(p => ({ ...p, fabricType: e.target.value }))}
                    placeholder="e.g. Single Jersey / 1x1 Rib"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Composition</label>
                  <input
                    type="text"
                    value={manualJobForm.composition}
                    onChange={e => setManualJobForm(p => ({ ...p, composition: e.target.value }))}
                    placeholder="e.g. 100% Combed Cotton"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GSM</label>
                  <input
                    type="text"
                    value={manualJobForm.gsm}
                    onChange={e => setManualJobForm(p => ({ ...p, gsm: e.target.value }))}
                    placeholder="e.g. 180"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dia / Width</label>
                  <input
                    type="text"
                    value={manualJobForm.dia}
                    onChange={e => setManualJobForm(p => ({ ...p, dia: e.target.value }))}
                    placeholder='e.g. 68" Open'
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier / Dyeing Mill</label>
                  <input
                    type="text"
                    value={manualJobForm.supplier}
                    onChange={e => setManualJobForm(p => ({ ...p, supplier: e.target.value }))}
                    placeholder="e.g. Northern Dyeing Unit-1"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Dynamic Multi-Color Section */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-blue-600" />
                    Color & Quantity Breakdown ({manualColors.length} Colors)
                  </h4>
                  <button
                    type="button"
                    onClick={addManualColorRow}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    + Add Color
                  </button>
                </div>

                <div className="space-y-2">
                  {manualColors.map((col, idx) => (
                    <div key={col.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded border border-slate-200 text-xs">
                      <div className="col-span-3">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Color #{idx + 1} *</span>
                        <input
                          required
                          type="text"
                          value={col.color}
                          onChange={e => updateManualColorRow(col.id, 'color', e.target.value)}
                          placeholder="e.g. Black / Navy"
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                        />
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Req Qty (Kg) *</span>
                        <input
                          required
                          type="number"
                          min="0"
                          value={col.reqBody || ''}
                          onChange={e => updateManualColorRow(col.id, 'reqBody', Number(e.target.value))}
                          placeholder="0"
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                        />
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Recv Qty (Kg) *</span>
                        <input
                          required
                          type="number"
                          min="0"
                          value={col.recvBody || ''}
                          onChange={e => updateManualColorRow(col.id, 'recvBody', Number(e.target.value))}
                          placeholder="0"
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                        />
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Rolls</span>
                        <input
                          type="number"
                          min="1"
                          value={col.rollCount || ''}
                          onChange={e => updateManualColorRow(col.id, 'rollCount', Number(e.target.value))}
                          placeholder="1"
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                        />
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Rack Location</span>
                        <input
                          type="text"
                          value={col.location}
                          onChange={e => updateManualColorRow(col.id, 'location', e.target.value)}
                          placeholder="e.g. R-01 · Shelf 02"
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {manualColors.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeManualColorRow(col.id)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                            title="Remove Color"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs"
                >
                  Save Job & All Colors
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </Shell>
  );
}
