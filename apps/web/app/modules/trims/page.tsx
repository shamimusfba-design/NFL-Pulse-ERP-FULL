'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';
import {
  Package,
  Layers,
  Truck,
  MapPin,
  RotateCcw,
  Tv,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Maximize2,
  Minimize2,
  Printer,
  Download,
  Plus,
  Save,
  ShieldAlert,
  Boxes,
  FileCheck,
  CheckSquare,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Info,
  SlidersHorizontal,
  Tag,
  Warehouse,
  Edit3,
  Sliders,
  History,
  X
} from 'lucide-react';

// ============================================================================
// DATA STRUCTURES & TYPES
// ============================================================================

export type TrimsCategory = 'LABEL' | 'THREAD' | 'ELASTIC' | 'ZIPPER' | 'BUTTON' | 'TAPE' | 'PACKAGING' | 'POLY' | 'CARTON' | 'HANGTAG' | 'OTHER';
export type TrimsUnit = 'PCS' | 'METER' | 'YARDS' | 'CM' | 'CONES' | 'GROSS' | 'ROLL';
export type QualityStatus = 'PASS' | 'FAIL' | 'PENDING';
export type ChecklistStatus = 'PENDING_REVIEW' | 'REVIEW_REQUESTED' | 'ACCEPTED';
export type PresentJobStatus = 
  | 'Order Confirmed'
  | 'Checklist Due'
  | 'Ordering Due'
  | 'Fully Received Due'
  | 'Partial Received Due'
  | 'Receive OK'
  | 'Delivery Running'
  | 'Delivery Done'
  | 'Inspection Fail'
  | 'Reused';

export interface TrimsItem {
  id: string;
  itemName: string;
  category: TrimsCategory;
  unit: TrimsUnit;
  consumption: number;
  consumptionUnit: string;
  consumptionSource: 'SAMPLE_IE' | 'TECHNICAL' | 'MERCHANDISER';
  requiredQty: number;
  wastagePct: number;
  totalOrderQty: number;
  receivedQty: number;
  balanceQty: number;
  deliveredQty: number;
  deliveryBalance: number;
  rackNo: string;
  shelfNo: string;
  qualityStatus: QualityStatus;
  failRemarks?: string;
  supplierName: string;
  lotBatchNo?: string;
  lastUpdated?: string;
}

export interface TrimsChecklistRecord {
  id: string;
  jobNo: string; // clean numeric job number
  buyer: string;
  styleNo: string;
  itemDescription: string;
  orderQty: number;
  merchandiser: string;
  shipmentDate: string;
  tnaSlot: string;
  sewingLine: string;
  requestDate: string;
  checklistStatus: ChecklistStatus;
  presentStatus: PresentJobStatus;
  storeReviewNote?: string;
  reviewRequestedAt?: string;
  acceptedAt?: string;
  acceptedBy?: string;
  items: TrimsItem[];
}

export interface StoreShelf {
  shelfNo: number; // 1 to 12
  assignedCategory: TrimsCategory;
  currentJobNos: string[];
  occupancyPct: number;
  itemSummary: string;
}

export interface StoreRack {
  rackId: string; // e.g. "R-01" to "R-40"
  rackNo: number; // 1 to 40
  dedicatedBuyer: string; // ONLY, OVS, BS-ONS, BS-NMT, UTG, GENERAL, etc.
  zone: string;
  shelves: StoreShelf[];
}

export interface SurplusTrimsRecord {
  id: string;
  itemName: string;
  category: TrimsCategory;
  availableQty: number;
  unit: TrimsUnit;
  rackShelf: string;
  originJobNo: string;
  buyer: string;
  condition: 'PRISTINE_NEW' | 'OPEN_BOX' | 'PARTIAL_ROLL';
  colorShade?: string;
  remarks: string;
  addedDate: string;
}

// ============================================================================
// AUTOMATIC STATUS COMPUTER
// ============================================================================

export function computeJobStatus(job: TrimsChecklistRecord): PresentJobStatus {
  if (job.checklistStatus !== 'ACCEPTED') return 'Checklist Due';
  
  const hasFail = job.items.some(it => it.qualityStatus === 'FAIL');
  if (hasFail) return 'Inspection Fail';

  const totalRecv = job.items.reduce((s, it) => s + (it.receivedQty || 0), 0);
  const totalOrder = job.items.reduce((s, it) => s + (it.totalOrderQty || 0), 0);
  const totalDeliv = job.items.reduce((s, it) => s + (it.deliveredQty || 0), 0);

  if (totalRecv === 0) return 'Ordering Due';

  const allItemsFullyReceived = job.items.every(it => it.receivedQty >= it.totalOrderQty);

  if (allItemsFullyReceived && totalDeliv >= totalRecv && totalRecv > 0) {
    return 'Delivery Done';
  }
  if (totalDeliv > 0) {
    return 'Delivery Running';
  }
  if (allItemsFullyReceived) {
    return 'Receive OK';
  }
  return 'Partial Received Due';
}

// ============================================================================
// DEFAULT INITIAL RACKS (40 RACKS × 12 SHELVES)
// ============================================================================

function generateDefaultRacks(): StoreRack[] {
  const racks: StoreRack[] = [];
  const buyerMap: Record<number, string> = {};

  // R-01 to R-08: ONLY
  for (let i = 1; i <= 8; i++) buyerMap[i] = 'ONLY';
  // R-09 to R-16: OVS
  for (let i = 9; i <= 16; i++) buyerMap[i] = 'OVS';
  // R-17 to R-24: BS-ONS
  for (let i = 17; i <= 24; i++) buyerMap[i] = 'BS-ONS';
  // R-25 to R-30: BS-NMT
  for (let i = 25; i <= 30; i++) buyerMap[i] = 'BS-NMT';
  // R-31 to R-36: UTG
  for (let i = 31; i <= 36; i++) buyerMap[i] = 'UTG';
  // R-37 to R-40: GENERAL
  for (let i = 37; i <= 40; i++) buyerMap[i] = 'GENERAL';

  const catList: TrimsCategory[] = ['LABEL', 'THREAD', 'ELASTIC', 'ZIPPER', 'BUTTON', 'TAPE', 'PACKAGING', 'POLY'];

  for (let r = 1; r <= 40; r++) {
    const rackId = `R-${r.toString().padStart(2, '0')}`;
    const dedicatedBuyer = buyerMap[r] || 'GENERAL';
    const zone = r <= 16 ? 'Zone A (West)' : r <= 30 ? 'Zone B (Center)' : 'Zone C (East)';

    const shelves: StoreShelf[] = [];
    for (let s = 1; s <= 12; s++) {
      const assignedCategory = catList[(s - 1) % catList.length];
      let occupancy = 0;
      let jobs: string[] = [];
      let summary = 'Empty shelf';

      if (r === 1 && s === 1) {
        occupancy = 85;
        jobs = ['48002'];
        summary = "Main Label 'ONLY' (2,500 pcs)";
      } else if (r === 1 && s === 2) {
        occupancy = 90;
        jobs = ['48002'];
        summary = 'Care Label (2,500 pcs)';
      } else if (r === 2 && s === 3) {
        occupancy = 70;
        jobs = ['48002'];
        summary = 'Waist Elastic 3.5cm (1,625 m)';
      } else if (r === 9 && s === 1) {
        occupancy = 95;
        jobs = ['46755'];
        summary = 'Care Label OVS (6,500 pcs)';
      } else if (r === 9 && s === 4) {
        occupancy = 80;
        jobs = ['46755'];
        summary = 'Sewing Thread 40/2 Black (52 Cones)';
      } else if (r === 17 && s === 2) {
        occupancy = 75;
        jobs = ['48903'];
        summary = 'Hood Drawcord Round (3,600 m)';
      } else if (r <= 20 && s <= 6) {
        occupancy = Math.floor(Math.random() * 40) + 30;
        jobs = [`4${Math.floor(Math.random() * 800) + 6000}`];
        summary = `${assignedCategory} active storage`;
      }

      shelves.push({
        shelfNo: s,
        assignedCategory,
        currentJobNos: jobs,
        occupancyPct: occupancy,
        itemSummary: summary
      });
    }

    racks.push({
      rackId,
      rackNo: r,
      dedicatedBuyer,
      zone,
      shelves
    });
  }

  return racks;
}

// ============================================================================
// INITIAL CHECKLIST JOBS MASTER
// ============================================================================

const INITIAL_CHECKLISTS: TrimsChecklistRecord[] = [
  {
    id: 'TRIM-CHK-48002',
    jobNo: '48002',
    buyer: 'ONLY',
    styleNo: '13251512',
    itemDescription: 'Ladies Cotton Fleece Hoodie with Kangaroo Pocket',
    orderQty: 2500,
    merchandiser: 'Ayub Ali',
    shipmentDate: '2026-08-25',
    tnaSlot: "Aug 2 '26",
    sewingLine: 'Line 04',
    requestDate: '2026-07-10',
    checklistStatus: 'ACCEPTED',
    presentStatus: 'Partial Received Due',
    acceptedAt: '2026-07-12',
    acceptedBy: 'Rezaul Karim (Trims Store In-charge)',
    items: [
      {
        id: 'T-48002-1',
        itemName: "Main Label Woven Damask 'ONLY'",
        category: 'LABEL',
        unit: 'PCS',
        consumption: 1.0,
        consumptionUnit: 'pc/garment',
        consumptionSource: 'SAMPLE_IE',
        requiredQty: 2500,
        wastagePct: 3.0,
        totalOrderQty: 2575,
        receivedQty: 2575,
        balanceQty: 0,
        deliveredQty: 2575,
        deliveryBalance: 0,
        rackNo: 'R-01',
        shelfNo: 'S-01',
        qualityStatus: 'PASS',
        supplierName: 'Dekko Accessories Ltd',
        lotBatchNo: 'DK-26-8812'
      },
      {
        id: 'T-48002-2',
        itemName: 'Care & Wash Label Satin Printed',
        category: 'LABEL',
        unit: 'PCS',
        consumption: 1.0,
        consumptionUnit: 'pc/garment',
        consumptionSource: 'SAMPLE_IE',
        requiredQty: 2500,
        wastagePct: 3.0,
        totalOrderQty: 2575,
        receivedQty: 2575,
        balanceQty: 0,
        deliveredQty: 2575,
        deliveryBalance: 0,
        rackNo: 'R-01',
        shelfNo: 'S-02',
        qualityStatus: 'PASS',
        supplierName: 'Dekko Accessories Ltd',
        lotBatchNo: 'DK-26-8813'
      },
      {
        id: 'T-48002-3',
        itemName: 'Sewing Thread 40/2 DTM Navy',
        category: 'THREAD',
        unit: 'CONES',
        consumption: 140.0,
        consumptionUnit: 'm/garment',
        consumptionSource: 'SAMPLE_IE',
        requiredQty: 70,
        wastagePct: 5.0,
        totalOrderQty: 74,
        receivedQty: 74,
        balanceQty: 0,
        deliveredQty: 60,
        deliveryBalance: 14,
        rackNo: 'R-02',
        shelfNo: 'S-04',
        qualityStatus: 'PASS',
        supplierName: 'Coats Bangladesh',
        lotBatchNo: 'CB-NV-901'
      },
      {
        id: 'T-48002-4',
        itemName: 'Waist Elastic Braided 3.5cm',
        category: 'ELASTIC',
        unit: 'METER',
        consumption: 65.0,
        consumptionUnit: 'cm/garment',
        consumptionSource: 'SAMPLE_IE',
        requiredQty: 1625,
        wastagePct: 4.0,
        totalOrderQty: 1690,
        receivedQty: 1200,
        balanceQty: 490,
        deliveredQty: 1200,
        deliveryBalance: 0,
        rackNo: 'R-02',
        shelfNo: 'S-03',
        qualityStatus: 'PASS',
        supplierName: 'Aman Graphics & Trims',
        lotBatchNo: 'AGT-EL-441'
      },
      {
        id: 'T-48002-5',
        itemName: 'Round Cotton Drawcord with Aglets',
        category: 'TAPE',
        unit: 'METER',
        consumption: 120.0,
        consumptionUnit: 'cm/garment',
        consumptionSource: 'TECHNICAL',
        requiredQty: 3000,
        wastagePct: 3.0,
        totalOrderQty: 3090,
        receivedQty: 3090,
        balanceQty: 0,
        deliveredQty: 3090,
        deliveryBalance: 0,
        rackNo: 'R-03',
        shelfNo: 'S-01',
        qualityStatus: 'PASS',
        supplierName: 'KDS Accessories',
        lotBatchNo: 'KDS-DC-109'
      },
      {
        id: 'T-48002-6',
        itemName: 'Nickel-Free Metal Eyelets 8mm',
        category: 'BUTTON',
        unit: 'PCS',
        consumption: 2.0,
        consumptionUnit: 'pcs/garment',
        consumptionSource: 'TECHNICAL',
        requiredQty: 5000,
        wastagePct: 4.0,
        totalOrderQty: 5200,
        receivedQty: 5200,
        balanceQty: 0,
        deliveredQty: 5200,
        deliveryBalance: 0,
        rackNo: 'R-03',
        shelfNo: 'S-02',
        qualityStatus: 'PASS',
        supplierName: 'YKK Bangladesh',
        lotBatchNo: 'YKK-EY-55'
      },
      {
        id: 'T-48002-7',
        itemName: 'Self-Adhesive Poly Bag 12x18 with Warning',
        category: 'PACKAGING',
        unit: 'PCS',
        consumption: 1.0,
        consumptionUnit: 'pc/garment',
        consumptionSource: 'MERCHANDISER',
        requiredQty: 2500,
        wastagePct: 3.0,
        totalOrderQty: 2575,
        receivedQty: 0,
        balanceQty: 2575,
        deliveredQty: 0,
        deliveryBalance: 0,
        rackNo: 'R-04',
        shelfNo: 'S-01',
        qualityStatus: 'PENDING',
        supplierName: 'Bengal Poly Industries'
      }
    ]
  },
  {
    id: 'TRIM-CHK-46755',
    jobNo: '46755',
    buyer: 'OVS',
    styleNo: '262SWT028-222',
    itemDescription: 'LS Swt shirt w back pleat and slve frings',
    orderQty: 6501,
    merchandiser: 'Shaker Hossain',
    shipmentDate: '2026-08-05',
    tnaSlot: "Jul 3 '26",
    sewingLine: 'Line 16B',
    requestDate: '2026-06-25',
    checklistStatus: 'ACCEPTED',
    presentStatus: 'Delivery Running',
    acceptedAt: '2026-06-27',
    acceptedBy: 'Rezaul Karim',
    items: [
      {
        id: 'T-46755-1',
        itemName: "Main Label Woven OVS Heritage",
        category: 'LABEL',
        unit: 'PCS',
        consumption: 1.0,
        consumptionUnit: 'pc/garment',
        consumptionSource: 'SAMPLE_IE',
        requiredQty: 6501,
        wastagePct: 3.0,
        totalOrderQty: 6696,
        receivedQty: 6696,
        balanceQty: 0,
        deliveredQty: 6696,
        deliveryBalance: 0,
        rackNo: 'R-09',
        shelfNo: 'S-01',
        qualityStatus: 'PASS',
        supplierName: 'Avery Dennison',
        lotBatchNo: 'AD-26-901'
      },
      {
        id: 'T-46755-2',
        itemName: 'Care & Content Label Multilingual',
        category: 'LABEL',
        unit: 'PCS',
        consumption: 1.0,
        consumptionUnit: 'pc/garment',
        consumptionSource: 'SAMPLE_IE',
        requiredQty: 6501,
        wastagePct: 3.0,
        totalOrderQty: 6696,
        receivedQty: 6696,
        balanceQty: 0,
        deliveredQty: 6696,
        deliveryBalance: 0,
        rackNo: 'R-09',
        shelfNo: 'S-02',
        qualityStatus: 'PASS',
        supplierName: 'Avery Dennison',
        lotBatchNo: 'AD-26-902'
      },
      {
        id: 'T-46755-3',
        itemName: 'Sewing Thread 40/2 Black Beauty',
        category: 'THREAD',
        unit: 'CONES',
        consumption: 120.0,
        consumptionUnit: 'm/garment',
        consumptionSource: 'SAMPLE_IE',
        requiredQty: 156,
        wastagePct: 5.0,
        totalOrderQty: 164,
        receivedQty: 164,
        balanceQty: 0,
        deliveredQty: 160,
        deliveryBalance: 4,
        rackNo: 'R-09',
        shelfNo: 'S-04',
        qualityStatus: 'PASS',
        supplierName: 'Coats Bangladesh',
        lotBatchNo: 'CB-BK-402'
      },
      {
        id: 'T-46755-4',
        itemName: 'Herringbone Neck Tape 10mm Cotton',
        category: 'TAPE',
        unit: 'METER',
        consumption: 35.0,
        consumptionUnit: 'cm/garment',
        consumptionSource: 'TECHNICAL',
        requiredQty: 2275,
        wastagePct: 4.0,
        totalOrderQty: 2366,
        receivedQty: 2366,
        balanceQty: 0,
        deliveredQty: 2366,
        deliveryBalance: 0,
        rackNo: 'R-10',
        shelfNo: 'S-01',
        qualityStatus: 'PASS',
        supplierName: 'Montrims Limited',
        lotBatchNo: 'MT-HB-220'
      },
      {
        id: 'T-46755-5',
        itemName: 'Hangtag Art Card 350 GSM + Barcode Sticker',
        category: 'PACKAGING',
        unit: 'PCS',
        consumption: 1.0,
        consumptionUnit: 'pc/garment',
        consumptionSource: 'MERCHANDISER',
        requiredQty: 6501,
        wastagePct: 2.0,
        totalOrderQty: 6631,
        receivedQty: 6631,
        balanceQty: 0,
        deliveredQty: 6631,
        deliveryBalance: 0,
        rackNo: 'R-11',
        shelfNo: 'S-01',
        qualityStatus: 'PASS',
        supplierName: 'SML Group',
        lotBatchNo: 'SML-HT-77'
      }
    ]
  },
  {
    id: 'TRIM-CHK-48085',
    jobNo: '48085',
    buyer: 'BS-NMT',
    styleNo: '13251506',
    itemDescription: 'Girls Slub Single Jersey T-Shirt with Frills',
    orderQty: 4200,
    merchandiser: 'Tariqul Islam',
    shipmentDate: '2026-09-02',
    tnaSlot: "Aug 3 '26",
    sewingLine: 'Line 08',
    requestDate: '2026-07-20',
    checklistStatus: 'PENDING_REVIEW',
    presentStatus: 'Ordering Due',
    items: [
      {
        id: 'T-48085-1',
        itemName: "Main Label Satin Loop Fold 'BS-NMT'",
        category: 'LABEL',
        unit: 'PCS',
        consumption: 1.0,
        consumptionUnit: 'pc/garment',
        consumptionSource: 'SAMPLE_IE',
        requiredQty: 4200,
        wastagePct: 3.0,
        totalOrderQty: 4326,
        receivedQty: 0,
        balanceQty: 4326,
        deliveredQty: 0,
        deliveryBalance: 0,
        rackNo: 'R-25',
        shelfNo: 'S-01',
        qualityStatus: 'PENDING',
        supplierName: 'Dekko Accessories Ltd'
      },
      {
        id: 'T-48085-2',
        itemName: 'Printed Wash Care Satin Label',
        category: 'LABEL',
        unit: 'PCS',
        consumption: 1.0,
        consumptionUnit: 'pc/garment',
        consumptionSource: 'SAMPLE_IE',
        requiredQty: 4200,
        wastagePct: 3.0,
        totalOrderQty: 4326,
        receivedQty: 0,
        balanceQty: 4326,
        deliveredQty: 0,
        deliveryBalance: 0,
        rackNo: 'R-25',
        shelfNo: 'S-02',
        qualityStatus: 'PENDING',
        supplierName: 'Dekko Accessories Ltd'
      },
      {
        id: 'T-48085-3',
        itemName: 'Sewing Thread 50/2 Nosegay Pink',
        category: 'THREAD',
        unit: 'CONES',
        consumption: 95.0,
        consumptionUnit: 'm/garment',
        consumptionSource: 'SAMPLE_IE',
        requiredQty: 80,
        wastagePct: 5.0,
        totalOrderQty: 84,
        receivedQty: 0,
        balanceQty: 84,
        deliveredQty: 0,
        deliveryBalance: 0,
        rackNo: 'R-26',
        shelfNo: 'S-04',
        qualityStatus: 'PENDING',
        supplierName: 'Coats Bangladesh'
      },
      {
        id: 'T-48085-4',
        itemName: 'Crochet Lace Trimming 1.5cm',
        category: 'OTHER',
        unit: 'METER',
        consumption: 45.0,
        consumptionUnit: 'cm/garment',
        consumptionSource: 'TECHNICAL',
        requiredQty: 1890,
        wastagePct: 5.0,
        totalOrderQty: 1985,
        receivedQty: 0,
        balanceQty: 1985,
        deliveredQty: 0,
        deliveryBalance: 0,
        rackNo: 'R-27',
        shelfNo: 'S-01',
        qualityStatus: 'PENDING',
        supplierName: 'Euro Fashion Trims'
      }
    ]
  },
  {
    id: 'TRIM-CHK-48903',
    jobNo: '48903',
    buyer: 'BS-ONS',
    styleNo: '22040271',
    itemDescription: 'ONSKANE SWEAT HOODIE',
    orderQty: 3000,
    merchandiser: 'Mahamud Hassan',
    shipmentDate: '2027-01-20',
    tnaSlot: "Dec 3 '26",
    sewingLine: 'Line 11',
    requestDate: '2026-09-22',
    checklistStatus: 'REVIEW_REQUESTED',
    presentStatus: 'Inspection Fail',
    storeReviewNote: 'Zipper teeth color mismatch: Approved swatch shows Gunmetal tooth finish, but supplier sent Shiny Silver sample. Merchandiser please confirm.',
    reviewRequestedAt: '2026-09-24',
    items: [
      {
        id: 'T-48903-1',
        itemName: "Main Label Woven Bestseller ONS",
        category: 'LABEL',
        unit: 'PCS',
        consumption: 1.0,
        consumptionUnit: 'pc/garment',
        consumptionSource: 'SAMPLE_IE',
        requiredQty: 3000,
        wastagePct: 3.0,
        totalOrderQty: 3090,
        receivedQty: 0,
        balanceQty: 3090,
        deliveredQty: 0,
        deliveryBalance: 0,
        rackNo: 'R-17',
        shelfNo: 'S-01',
        qualityStatus: 'PENDING',
        supplierName: 'Avery Dennison'
      },
      {
        id: 'T-48903-2',
        itemName: 'Metal Zipper #5 Open End 65cm Gunmetal',
        category: 'ZIPPER',
        unit: 'PCS',
        consumption: 1.0,
        consumptionUnit: 'pc/garment',
        consumptionSource: 'TECHNICAL',
        requiredQty: 3000,
        wastagePct: 2.0,
        totalOrderQty: 3060,
        receivedQty: 1500,
        balanceQty: 1560,
        deliveredQty: 0,
        deliveryBalance: 0,
        rackNo: 'R-18',
        shelfNo: 'S-01',
        qualityStatus: 'FAIL',
        failRemarks: 'Wrong plating: Dispatched sample shiny silver instead of gunmetal. REJECTED.',
        supplierName: 'YKK Bangladesh'
      },
      {
        id: 'T-48903-3',
        itemName: 'Hood Tubular Drawcord with Engraved Metal End',
        category: 'TAPE',
        unit: 'METER',
        consumption: 120.0,
        consumptionUnit: 'cm/garment',
        consumptionSource: 'TECHNICAL',
        requiredQty: 3600,
        wastagePct: 3.0,
        totalOrderQty: 3708,
        receivedQty: 3708,
        balanceQty: 0,
        deliveredQty: 0,
        deliveryBalance: 0,
        rackNo: 'R-17',
        shelfNo: 'S-02',
        qualityStatus: 'PASS',
        supplierName: 'Montrims Limited'
      }
    ]
  },
  {
    id: 'TRIM-CHK-48906',
    jobNo: '48906',
    buyer: 'UTG',
    styleNo: 'UTG-AF-5521',
    itemDescription: 'CREW SWEAT with Rib Trim',
    orderQty: 5000,
    merchandiser: 'Rokonuzzaman',
    shipmentDate: '2026-12-01',
    tnaSlot: "Nov 2 '26",
    sewingLine: 'Line 14',
    requestDate: '2026-09-24',
    checklistStatus: 'ACCEPTED',
    presentStatus: 'Receive OK',
    acceptedAt: '2026-09-26',
    acceptedBy: 'Rezaul Karim',
    items: [
      {
        id: 'T-48906-1',
        itemName: "Main Label Woven 'UTG ACTIVE'",
        category: 'LABEL',
        unit: 'PCS',
        consumption: 1.0,
        consumptionUnit: 'pc/garment',
        consumptionSource: 'SAMPLE_IE',
        requiredQty: 5000,
        wastagePct: 3.0,
        totalOrderQty: 5150,
        receivedQty: 5150,
        balanceQty: 0,
        deliveredQty: 0,
        deliveryBalance: 0,
        rackNo: 'R-31',
        shelfNo: 'S-01',
        qualityStatus: 'PASS',
        supplierName: 'Dekko Accessories Ltd'
      },
      {
        id: 'T-48906-2',
        itemName: 'Care & Wash Instruction Printed',
        category: 'LABEL',
        unit: 'PCS',
        consumption: 1.0,
        consumptionUnit: 'pc/garment',
        consumptionSource: 'SAMPLE_IE',
        requiredQty: 5000,
        wastagePct: 3.0,
        totalOrderQty: 5150,
        receivedQty: 5150,
        balanceQty: 0,
        deliveredQty: 0,
        deliveryBalance: 0,
        rackNo: 'R-31',
        shelfNo: 'S-02',
        qualityStatus: 'PASS',
        supplierName: 'Dekko Accessories Ltd'
      },
      {
        id: 'T-48906-3',
        itemName: 'Sewing Thread 40/2 Charcoal',
        category: 'THREAD',
        unit: 'CONES',
        consumption: 110.0,
        consumptionUnit: 'm/garment',
        consumptionSource: 'SAMPLE_IE',
        requiredQty: 110,
        wastagePct: 5.0,
        totalOrderQty: 116,
        receivedQty: 116,
        balanceQty: 0,
        deliveredQty: 0,
        deliveryBalance: 0,
        rackNo: 'R-32',
        shelfNo: 'S-04',
        qualityStatus: 'PASS',
        supplierName: 'Coats Bangladesh'
      }
    ]
  }
];

// ============================================================================
// DEFAULT SURPLUS TRIMS FOR REUSE
// ============================================================================

const INITIAL_SURPLUS_TRIMS: SurplusTrimsRecord[] = [
  {
    id: 'SURPLUS-01',
    itemName: 'Sewing Thread 40/2 Black 5,000m Cones',
    category: 'THREAD',
    availableQty: 18,
    unit: 'CONES',
    rackShelf: 'R-37 | S-01',
    originJobNo: '46755',
    buyer: 'OVS',
    condition: 'PRISTINE_NEW',
    colorShade: 'Black Beauty 19-4008',
    remarks: 'Unopened factory sealed cones from finished bulk shipment.',
    addedDate: '2026-08-10'
  },
  {
    id: 'SURPLUS-02',
    itemName: 'Waist Elastic Knitted 3.5cm White',
    category: 'ELASTIC',
    availableQty: 320,
    unit: 'METER',
    rackShelf: 'R-37 | S-03',
    originJobNo: '47900',
    buyer: 'ONLY',
    condition: 'PARTIAL_ROLL',
    colorShade: 'Optic White',
    remarks: 'Elasticity tested: Recovery 98.4%. Certified for reuse.',
    addedDate: '2026-07-28'
  },
  {
    id: 'SURPLUS-03',
    itemName: 'Self-Adhesive Poly Bag 12x18 with Warning',
    category: 'PACKAGING',
    availableQty: 450,
    unit: 'PCS',
    rackShelf: 'R-38 | S-01',
    originJobNo: '48002',
    buyer: 'ONLY',
    condition: 'PRISTINE_NEW',
    remarks: 'Surplus carton left after packing exact PO quantity.',
    addedDate: '2026-08-15'
  },
  {
    id: 'SURPLUS-04',
    itemName: 'Metal Eyelets 8mm Gunmetal Nickel-Free',
    category: 'BUTTON',
    availableQty: 680,
    unit: 'PCS',
    rackShelf: 'R-39 | S-02',
    originJobNo: '48002',
    buyer: 'ONLY',
    condition: 'OPEN_BOX',
    colorShade: 'Gunmetal Shiny',
    remarks: 'Clean undamaged eyelets with matching washers.',
    addedDate: '2026-08-16'
  },
  {
    id: 'SURPLUS-05',
    itemName: 'Round Cotton Drawcord Natural Unbleached',
    category: 'TAPE',
    availableQty: 240,
    unit: 'METER',
    rackShelf: 'R-40 | S-01',
    originJobNo: '48903',
    buyer: 'BS-ONS',
    condition: 'PARTIAL_ROLL',
    remarks: 'High-density cotton cord suitable for hoodies or joggers.',
    addedDate: '2026-09-28'
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TrimsStorePage() {
  // Navigation Tabs:
  // CHECKLIST | RECEIVE | STOCK | DELIVERY | LOCATION | REUSE | TV
  const [activeTab, setActiveTab] = useState<'CHECKLIST' | 'RECEIVE' | 'STOCK' | 'DELIVERY' | 'LOCATION' | 'REUSE' | 'TV'>('CHECKLIST');

  // Master State with LocalStorage Persistence
  const [checklists, setChecklists] = useState<TrimsChecklistRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nfl_trims_checklists_v4');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return INITIAL_CHECKLISTS;
  });

  const [racks, setRacks] = useState<StoreRack[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nfl_trims_racks_v4');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return generateDefaultRacks();
  });

  const [surplusTrims, setSurplusTrims] = useState<SurplusTrimsRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nfl_trims_surplus_v4');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return INITIAL_SURPLUS_TRIMS;
  });

  // Recent Searches state
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nfl_trims_recent_searches_v3');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return ['48002', '46755', '48085'];
  });

  const addRecentSearch = (jobNo: string) => {
    const clean = jobNo.replace(/#/g, '').trim();
    if (!clean) return;
    setRecentSearches(prev => {
      const next = [clean, ...prev.filter(j => j !== clean)].slice(0, 5);
      if (typeof window !== 'undefined') {
        localStorage.setItem('nfl_trims_recent_searches_v3', JSON.stringify(next));
      }
      return next;
    });
  };

  const removeRecentSearch = (jobNo: string) => {
    setRecentSearches(prev => {
      const next = prev.filter(j => j !== jobNo);
      if (typeof window !== 'undefined') {
        localStorage.setItem('nfl_trims_recent_searches_v3', JSON.stringify(next));
      }
      return next;
    });
  };

  // Save changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nfl_trims_checklists_v4', JSON.stringify(checklists));
    }
  }, [checklists]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nfl_trims_racks_v4', JSON.stringify(racks));
    }
  }, [racks]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nfl_trims_surplus_v4', JSON.stringify(surplusTrims));
    }
  }, [surplusTrims]);

  // Read URL search param for tab synchronization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['CHECKLIST', 'RECEIVE', 'STOCK', 'DELIVERY', 'LOCATION', 'REUSE', 'TV'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  // Update URL on tab change without full reload and CLEAR POPUP
  const handleTabChange = (t: typeof activeTab) => {
    setActiveTab(t);
    setDetailModalJob(null); // Never show popups when switching tabs!
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', t);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Toast / Banner alert notification
  const [notification, setNotification] = useState<{ type: 'success' | 'danger' | 'info'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'danger' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // ==========================================================================
  // TAB 1: CHECKLIST REQUESTS STATE & ACTIONS (WITH INLINE ACCORDION UNFOLD)
  // ==========================================================================
  const [checklistFilter, setChecklistFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REVIEW_REQUESTED'>('ALL');
  const [unfoldedJobIds, setUnfoldedJobIds] = useState<Record<string, boolean>>({});
  const [reviewModalJob, setReviewModalJob] = useState<TrimsChecklistRecord | null>(null);
  const [reviewNoteInput, setReviewNoteInput] = useState('');

  const toggleUnfoldJob = (jobId: string) => {
    setUnfoldedJobIds(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };

  const filteredChecklistRequests = useMemo(() => {
    return checklists.filter(c => {
      if (checklistFilter === 'PENDING') return c.checklistStatus === 'PENDING_REVIEW';
      if (checklistFilter === 'ACCEPTED') return c.checklistStatus === 'ACCEPTED';
      if (checklistFilter === 'REVIEW_REQUESTED') return c.checklistStatus === 'REVIEW_REQUESTED';
      return true;
    });
  }, [checklists, checklistFilter]);

  const handleAcceptChecklist = (jobId: string) => {
    setChecklists(prev => prev.map(c => {
      if (c.id === jobId) {
        const updated = {
          ...c,
          checklistStatus: 'ACCEPTED' as ChecklistStatus,
          acceptedAt: new Date().toISOString().split('T')[0],
          acceptedBy: 'Trims Store In-charge'
        };
        return {
          ...updated,
          presentStatus: computeJobStatus(updated)
        };
      }
      return c;
    }));
    const found = checklists.find(c => c.id === jobId);
    if (found) addRecentSearch(found.jobNo);
    showNotification('success', `Checklist for Job ${found?.jobNo} accepted. Ready for physical order receiving.`);
  };

  const handleSendReviewRequest = () => {
    if (!reviewModalJob || !reviewNoteInput.trim()) return;
    setChecklists(prev => prev.map(c => {
      if (c.id === reviewModalJob.id) {
        const updated = {
          ...c,
          checklistStatus: 'REVIEW_REQUESTED' as ChecklistStatus,
          storeReviewNote: reviewNoteInput.trim(),
          reviewRequestedAt: new Date().toISOString().split('T')[0]
        };
        return {
          ...updated,
          presentStatus: computeJobStatus(updated)
        };
      }
      return c;
    }));
    showNotification('danger', `Need Review sent to Merchandiser ${reviewModalJob.merchandiser} for Job ${reviewModalJob.jobNo}.`);
    setReviewModalJob(null);
    setReviewNoteInput('');
  };

  // ==========================================================================
  // TAB 2: ORDER RECEIVE STATE & ACTIONS
  // ==========================================================================
  const [receiveSearchJob, setReceiveSearchJob] = useState('48002');
  const selectedReceiveJob = useMemo(() => {
    const clean = receiveSearchJob.replace(/#/g, '').trim();
    return checklists.find(c => c.jobNo === clean) || null;
  }, [checklists, receiveSearchJob]);

  const [receiveFormState, setReceiveFormState] = useState<Record<string, { receiveQty: number; qualityStatus: QualityStatus; rackNo: string; shelfNo: string }>>({});

  useEffect(() => {
    if (selectedReceiveJob) {
      addRecentSearch(selectedReceiveJob.jobNo);
      const initialMap: Record<string, any> = {};
      selectedReceiveJob.items.forEach(it => {
        initialMap[it.id] = {
          receiveQty: it.balanceQty > 0 ? it.balanceQty : 0,
          qualityStatus: it.qualityStatus || 'PASS',
          rackNo: it.rackNo || 'R-01',
          shelfNo: it.shelfNo || 'S-01'
        };
      });
      setReceiveFormState(initialMap);
    } else {
      setReceiveFormState({});
    }
  }, [selectedReceiveJob]);

  const handlePassAllReceive = () => {
    if (!selectedReceiveJob) return;
    setReceiveFormState(prev => {
      const next = { ...prev };
      selectedReceiveJob.items.forEach(it => {
        if (next[it.id]) {
          next[it.id] = { ...next[it.id], qualityStatus: 'PASS' };
        }
      });
      return next;
    });
    showNotification('success', 'All items marked as PASS for quality inspection.');
  };

  const handleSaveReceive = () => {
    if (!selectedReceiveJob) return;

    let hasFail = false;
    let failedItemsNames: string[] = [];

    setChecklists(prev => prev.map(c => {
      if (c.id === selectedReceiveJob.id) {
        const updatedItems = c.items.map(it => {
          const entry = receiveFormState[it.id];
          if (!entry) return it;

          const addedReceive = Number(entry.receiveQty) || 0;
          const newTotalReceived = Math.min(it.totalOrderQty, it.receivedQty + addedReceive);
          const newBalance = Math.max(0, it.totalOrderQty - newTotalReceived);

          if (entry.qualityStatus === 'FAIL') {
            hasFail = true;
            failedItemsNames.push(it.itemName);
          }

          return {
            ...it,
            receivedQty: newTotalReceived,
            balanceQty: newBalance,
            qualityStatus: entry.qualityStatus,
            rackNo: entry.rackNo,
            shelfNo: entry.shelfNo,
            lastUpdated: new Date().toISOString().split('T')[0]
          };
        });

        const updatedJob: TrimsChecklistRecord = {
          ...c,
          items: updatedItems,
          presentStatus: computeJobStatus({ ...c, items: updatedItems })
        };
        return updatedJob;
      }
      return c;
    }));

    if (hasFail) {
      showNotification('danger', `Inspection FAIL recorded for: ${failedItemsNames.join(', ')}. Automated rejection notification dispatched to Merchandiser ${selectedReceiveJob.merchandiser}.`);
    } else {
      showNotification('success', `Trims received successfully for Job ${selectedReceiveJob.jobNo}. Present stock updated.`);
    }
  };

  // ==========================================================================
  // TAB 3: PRESENT STOCK STATE, KPI CARD FILTERS & QUALITY INSPECTION MODAL
  // ==========================================================================
  const [stockBuyerFilter, setStockBuyerFilter] = useState('ALL');
  const [stockMerchFilter, setStockMerchFilter] = useState('ALL');
  const [stockTnaSlotFilter, setStockTnaSlotFilter] = useState('ALL');
  const [stockSewingFilter, setStockSewingFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('ALL');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  
  // Interactive KPI Card Filter State
  const [kpiCardFilter, setKpiCardFilter] = useState<
    'ALL' | 'HIGH_ORDER' | 'RECEIVED' | 'QUALITY_PASS' | 'QUALITY_FAIL' | 'DELIVERED' | 'PARTIAL' | 'CHECKLIST_PENDING'
  >('ALL');

  const [detailModalJob, setDetailModalJob] = useState<TrimsChecklistRecord | null>(null);
  const [detailModalFullscreen, setDetailModalFullscreen] = useState(false);
  const [modalQualityMode, setModalQualityMode] = useState(false);
  const [modalQualityDraft, setModalQualityDraft] = useState<Record<string, { status: QualityStatus; remarks: string }>>({});

  useEffect(() => {
    if (detailModalJob) {
      const draft: Record<string, { status: QualityStatus; remarks: string }> = {};
      detailModalJob.items.forEach(it => {
        draft[it.id] = {
          status: it.qualityStatus || 'PENDING',
          remarks: it.failRemarks || ''
        };
      });
      setModalQualityDraft(draft);
    } else {
      setModalQualityDraft({});
      setModalQualityMode(false);
    }
  }, [detailModalJob]);

  const stockKpis = useMemo(() => {
    const totalJobs = checklists.length;
    const totalOrderQty = checklists.reduce((acc, j) => acc + j.orderQty, 0);

    let totalRequiredItems = 0;
    let totalReceivedItems = 0;
    let totalInspectionPass = 0;
    let totalInspectionFail = 0;
    let totalDeliveredUnits = 0;
    let partialReceivedJobsCount = 0;

    checklists.forEach(j => {
      const status = computeJobStatus(j);
      if (status === 'Partial Received Due') partialReceivedJobsCount++;
      j.items.forEach(it => {
        totalRequiredItems += it.totalOrderQty;
        totalReceivedItems += it.receivedQty;
        totalDeliveredUnits += it.deliveredQty;
        if (it.qualityStatus === 'PASS') totalInspectionPass++;
        if (it.qualityStatus === 'FAIL') totalInspectionFail++;
      });
    });

    const acceptedChecklistsCount = checklists.filter(j => j.checklistStatus === 'ACCEPTED').length;

    return {
      totalJobs,
      totalOrderQty,
      totalReceivedItems,
      totalInspectionPass,
      totalInspectionFail,
      totalDeliveredUnits,
      partialReceivedJobsCount,
      acceptedChecklistsCount
    };
  }, [checklists]);

  const filteredStockJobs = useMemo(() => {
    return checklists.filter(j => {
      if (kpiCardFilter === 'HIGH_ORDER' && j.orderQty < 4000) return false;
      if (kpiCardFilter === 'RECEIVED') {
        const hasRecv = j.items.some(it => it.receivedQty > 0);
        if (!hasRecv) return false;
      }
      if (kpiCardFilter === 'QUALITY_PASS') {
        const allPass = j.items.every(it => it.qualityStatus === 'PASS');
        if (!allPass) return false;
      }
      if (kpiCardFilter === 'QUALITY_FAIL') {
        const hasFail = j.items.some(it => it.qualityStatus === 'FAIL');
        if (!hasFail) return false;
      }
      if (kpiCardFilter === 'DELIVERED') {
        const hasDeliv = j.items.some(it => it.deliveredQty > 0);
        if (!hasDeliv) return false;
      }
      if (kpiCardFilter === 'PARTIAL') {
        const st = computeJobStatus(j);
        if (st !== 'Partial Received Due') return false;
      }
      if (kpiCardFilter === 'CHECKLIST_PENDING') {
        if (j.checklistStatus === 'ACCEPTED') return false;
      }

      if (stockBuyerFilter !== 'ALL' && j.buyer !== stockBuyerFilter) return false;
      if (stockMerchFilter !== 'ALL' && j.merchandiser !== stockMerchFilter) return false;
      if (stockTnaSlotFilter !== 'ALL' && j.tnaSlot !== stockTnaSlotFilter) return false;
      if (stockSewingFilter !== 'ALL' && !j.sewingLine.includes(stockSewingFilter)) return false;
      
      const dynStatus = computeJobStatus(j);
      if (stockStatusFilter !== 'ALL' && dynStatus !== stockStatusFilter) return false;

      if (stockSearchQuery.trim()) {
        const q = stockSearchQuery.replace(/#/g, '').toLowerCase();
        return j.jobNo.toLowerCase().includes(q) ||
               j.styleNo.toLowerCase().includes(q) ||
               j.buyer.toLowerCase().includes(q) ||
               j.merchandiser.toLowerCase().includes(q);
      }
      return true;
    });
  }, [checklists, kpiCardFilter, stockBuyerFilter, stockMerchFilter, stockTnaSlotFilter, stockSewingFilter, stockStatusFilter, stockSearchQuery]);

  const handleSaveModalQuality = () => {
    if (!detailModalJob) return;

    let hasFail = false;
    let failedNames: string[] = [];

    setChecklists(prev => prev.map(c => {
      if (c.id === detailModalJob.id) {
        const updatedItems = c.items.map(it => {
          const entry = modalQualityDraft[it.id];
          if (!entry) return it;
          if (entry.status === 'FAIL') {
            hasFail = true;
            failedNames.push(it.itemName);
          }
          return {
            ...it,
            qualityStatus: entry.status,
            failRemarks: entry.remarks
          };
        });

        const updatedJob: TrimsChecklistRecord = {
          ...c,
          items: updatedItems,
          presentStatus: computeJobStatus({ ...c, items: updatedItems })
        };
        setDetailModalJob(updatedJob);
        return updatedJob;
      }
      return c;
    }));

    if (hasFail) {
      showNotification('danger', `Quality inspection FAIL recorded for Job ${detailModalJob.jobNo}: ${failedNames.join(', ')}. Dispatched supplier rejection alert.`);
    } else {
      showNotification('success', `Quality audit saved for Job ${detailModalJob.jobNo}. All inspected items updated.`);
    }
    setModalQualityMode(false);
  };

  // ==========================================================================
  // TAB 4: ORDER DELIVERY STATE & ACTIONS
  // ==========================================================================
  const [deliverySearchJob, setDeliverySearchJob] = useState('48002');
  const selectedDeliveryJob = useMemo(() => {
    const clean = deliverySearchJob.replace(/#/g, '').trim();
    return checklists.find(c => c.jobNo === clean) || null;
  }, [checklists, deliverySearchJob]);

  const [deliveryCheckedMap, setDeliveryCheckedMap] = useState<Record<string, boolean>>({});
  const [deliveryQtyMap, setDeliveryQtyMap] = useState<Record<string, number>>({});
  const [deliveryGatePassIssued, setDeliveryGatePassIssued] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDeliveryJob) {
      addRecentSearch(selectedDeliveryJob.jobNo);
      const checked: Record<string, boolean> = {};
      const qtys: Record<string, number> = {};
      selectedDeliveryJob.items.forEach(it => {
        checked[it.id] = it.receivedQty > it.deliveredQty;
        qtys[it.id] = Math.max(0, it.receivedQty - it.deliveredQty);
      });
      setDeliveryCheckedMap(checked);
      setDeliveryQtyMap(qtys);
      setDeliveryGatePassIssued(null);
    } else {
      setDeliveryCheckedMap({});
      setDeliveryQtyMap({});
    }
  }, [selectedDeliveryJob]);

  const handleDeliverAllClick = () => {
    if (!selectedDeliveryJob) return;
    const nextQtys: Record<string, number> = {};
    const nextChecked: Record<string, boolean> = {};
    selectedDeliveryJob.items.forEach(it => {
      const remainingInStore = Math.max(0, it.receivedQty - it.deliveredQty);
      nextQtys[it.id] = remainingInStore;
      nextChecked[it.id] = remainingInStore > 0;
    });
    setDeliveryQtyMap(nextQtys);
    setDeliveryCheckedMap(nextChecked);
    showNotification('info', "100% full delivery quantities populated for all items with in-store stock.");
  };

  const handleConfirmDelivery = () => {
    if (!selectedDeliveryJob) return;

    let itemsIssuedCount = 0;
    setChecklists(prev => prev.map(c => {
      if (c.id === selectedDeliveryJob.id) {
        const updatedItems = c.items.map(it => {
          if (!deliveryCheckedMap[it.id]) return it;

          const toDeliver = Number(deliveryQtyMap[it.id]) || 0;
          if (toDeliver <= 0) return it;

          itemsIssuedCount++;
          const newDelivered = Math.min(it.receivedQty, it.deliveredQty + toDeliver);
          return {
            ...it,
            deliveredQty: newDelivered,
            deliveryBalance: Math.max(0, it.receivedQty - newDelivered)
          };
        });

        const updatedJob: TrimsChecklistRecord = {
          ...c,
          items: updatedItems,
          presentStatus: computeJobStatus({ ...c, items: updatedItems })
        };
        return updatedJob;
      }
      return c;
    }));

    const gpNumber = `GP-TRIM-${selectedDeliveryJob.jobNo}-${Math.floor(1000 + Math.random() * 9000)}`;
    setDeliveryGatePassIssued(gpNumber);
    showNotification('success', `Issued Gate Pass ${gpNumber} for Job ${selectedDeliveryJob.jobNo} (${itemsIssuedCount} items dispatched to ${selectedDeliveryJob.sewingLine}).`);
  };

  // ==========================================================================
  // TAB 5: LOCATION TRACKING STATE (3 SUB-TABS: LAYOUT, JOB_SEARCH, CUSTOMIZE)
  // ==========================================================================
  const [locationSubTab, setLocationSubTab] = useState<'LAYOUT' | 'JOB_SEARCH' | 'CUSTOMIZE'>('LAYOUT');
  const [selectedRackId, setSelectedRackId] = useState<string>('R-01');
  const [locationJobQuery, setLocationJobQuery] = useState('48002');

  const activeRack = useMemo(() => {
    return racks.find(r => r.rackId === selectedRackId) || racks[0];
  }, [racks, selectedRackId]);

  const searchedJobLocations = useMemo(() => {
    const clean = locationJobQuery.replace(/#/g, '').trim();
    const job = checklists.find(c => c.jobNo === clean);
    if (!job) return null;
    return job;
  }, [checklists, locationJobQuery]);

  const [customRackBuyer, setCustomRackBuyer] = useState<string>(activeRack.dedicatedBuyer);
  const [customShelvesState, setCustomShelvesState] = useState<StoreShelf[]>(activeRack.shelves);

  useEffect(() => {
    setCustomRackBuyer(activeRack.dedicatedBuyer);
    setCustomShelvesState(activeRack.shelves);
  }, [activeRack]);

  const handleSaveRackLayout = () => {
    setRacks(prev => prev.map(r => {
      if (r.rackId === activeRack.rackId) {
        return {
          ...r,
          dedicatedBuyer: customRackBuyer,
          shelves: customShelvesState
        };
      }
      return r;
    }));
    showNotification('success', `Layout configuration for ${activeRack.rackId} saved successfully. Buyer: ${customRackBuyer}.`);
  };

  const handleResetRackToDefault = () => {
    const defaults = generateDefaultRacks();
    const match = defaults.find(d => d.rackId === activeRack.rackId);
    if (match) {
      setCustomRackBuyer(match.dedicatedBuyer);
      setCustomShelvesState(match.shelves);
      setRacks(prev => prev.map(r => r.rackId === match.rackId ? match : r));
      showNotification('info', `Reset ${activeRack.rackId} to default layout.`);
    }
  };

  // ==========================================================================
  // TAB 6: SURPLUS TRIMS FOR REUSE ACTIONS
  // ==========================================================================
  const [reuseCategoryFilter, setReuseCategoryFilter] = useState('ALL');
  const [allocateModalItem, setAllocateModalItem] = useState<SurplusTrimsRecord | null>(null);
  const [allocateTargetJob, setAllocateTargetJob] = useState('');
  const [allocateQty, setAllocateQty] = useState<number>(0);

  const filteredSurplusTrims = useMemo(() => {
    return surplusTrims.filter(s => {
      if (reuseCategoryFilter !== 'ALL' && s.category !== reuseCategoryFilter) return false;
      return true;
    });
  }, [surplusTrims, reuseCategoryFilter]);

  const handleConfirmAllocation = () => {
    if (!allocateModalItem || !allocateTargetJob.trim() || allocateQty <= 0) return;

    if (allocateQty > allocateModalItem.availableQty) {
      alert('Allocation quantity cannot exceed available surplus quantity.');
      return;
    }

    setSurplusTrims(prev => prev.map(s => {
      if (s.id === allocateModalItem.id) {
        return {
          ...s,
          availableQty: s.availableQty - allocateQty
        };
      }
      return s;
    }).filter(s => s.availableQty > 0));

    showNotification('success', `Successfully allocated ${allocateQty} ${allocateModalItem.unit} of ${allocateModalItem.itemName} to Job ${allocateTargetJob.replace(/#/g,'').trim()} from surplus stock.`);
    setAllocateModalItem(null);
    setAllocateTargetJob('');
    setAllocateQty(0);
  };

  // ==========================================================================
  // TAB 7: STORE TV DISPLAY STATE
  // ==========================================================================
  const [tvSearchJob, setTvSearchJob] = useState('');
  const [tvViewMode, setTvViewMode] = useState<'JOB_FINDER' | 'LAYOUT_MAP'>('JOB_FINDER');

  const tvSelectedJob = useMemo(() => {
    const clean = tvSearchJob.replace(/#/g, '').trim();
    if (!clean) return null;
    return checklists.find(c => c.jobNo === clean) || null;
  }, [checklists, tvSearchJob]);

  const uniqueBuyers = useMemo(() => Array.from(new Set(checklists.map(c => c.buyer))), [checklists]);
  const uniqueMerchandisers = useMemo(() => Array.from(new Set(checklists.map(c => c.merchandiser))), [checklists]);
  const uniqueTnaSlots = useMemo(() => Array.from(new Set(checklists.map(c => c.tnaSlot))), [checklists]);

  return (
    <Shell
      title="Trims & Accessories Store"
      eyebrow="Centralized Trims Receiving, Inspection, Storage Layout, 40-Rack Location & Floor Delivery"
    >
      {/* Toast Notification Banner */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 650,
            background: notification.type === 'success' ? '#065F46' : notification.type === 'danger' ? '#991B1B' : '#1E40AF',
            color: '#FFFFFF',
            border: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          {notification.type === 'success' && <CheckCircle2 size={18} />}
          {notification.type === 'danger' && <AlertTriangle size={18} />}
          {notification.type === 'info' && <Info size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Sub-Navigation Bar (Numbered Buttons) */}
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
          onClick={() => handleTabChange('CHECKLIST')}
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
            border: activeTab === 'CHECKLIST' ? '1px solid #0F274E' : '1px solid #E2E8F0',
            background: activeTab === 'CHECKLIST' ? '#0F274E' : '#F8FAFC',
            color: activeTab === 'CHECKLIST' ? '#FFFFFF' : '#475569'
          }}
        >
          <CheckSquare size={16} color={activeTab === 'CHECKLIST' ? '#38BDF8' : '#64748B'} />
          <span>1. Checklist Requests</span>
          <span style={{ fontSize: '11px', background: activeTab === 'CHECKLIST' ? '#38BDF8' : '#E2E8F0', color: activeTab === 'CHECKLIST' ? '#0F274E' : '#475569', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
            {checklists.filter(c => c.checklistStatus === 'PENDING_REVIEW').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('RECEIVE')}
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
          <Package size={16} color={activeTab === 'RECEIVE' ? '#38BDF8' : '#64748B'} />
          <span>2. Order Receive</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('STOCK')}
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
          <span>3. Present Stock</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('DELIVERY')}
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
            border: activeTab === 'DELIVERY' ? '1px solid #0F274E' : '1px solid #E2E8F0',
            background: activeTab === 'DELIVERY' ? '#0F274E' : '#F8FAFC',
            color: activeTab === 'DELIVERY' ? '#FFFFFF' : '#475569'
          }}
        >
          <Truck size={16} color={activeTab === 'DELIVERY' ? '#38BDF8' : '#64748B'} />
          <span>4. Order Delivery</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('LOCATION')}
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
          <span>5. Location Tracking (40 Racks)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('REUSE')}
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
          <span>6. Stock for Reuse</span>
          <span style={{ fontSize: '11px', background: '#D97706', color: '#FFFFFF', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
            {surplusTrims.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('TV')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '7px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 650,
            cursor: 'pointer',
            marginLeft: 'auto',
            transition: 'all 0.15s ease',
            border: activeTab === 'TV' ? '1px solid #A4D92C' : '1px solid #0284C7',
            background: activeTab === 'TV' ? '#A4D92C' : '#0284C7',
            color: activeTab === 'TV' ? '#071F42' : '#FFFFFF'
          }}
        >
          <Tv size={16} color={activeTab === 'TV' ? '#071F42' : '#FFFFFF'} />
          <span>Store TV Display</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: CHECKLIST REQUESTS WITH INLINE ACCORDION UNFOLD               */}
      {/* ==================================================================== */}
      {activeTab === 'CHECKLIST' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Info Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0F274E 0%, #1E3A8A 100%)',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '16px 20px',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: '#93C5FD', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Merchandising Handover Verification
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0', color: '#FFFFFF' }}>
                Trims Checklist Requests & Physical Matching
              </h2>
              <p style={{ fontSize: '13px', color: '#CBD5E1', margin: 0 }}>
                Store personnel inspects requirements against physical samples. Requirement numbers are read-only.
                Click <strong>View Items</strong> to unfold trims specification, then click <strong>Accept</strong> or request <strong>Need Review</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {(['ALL', 'PENDING', 'ACCEPTED', 'REVIEW_REQUESTED'] as const).map(tabKey => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setChecklistFilter(tabKey)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: checklistFilter === tabKey ? '1px solid #38BDF8' : '1px solid rgba(255,255,255,0.2)',
                    background: checklistFilter === tabKey ? '#38BDF8' : 'rgba(255,255,255,0.1)',
                    color: checklistFilter === tabKey ? '#0F274E' : '#FFFFFF'
                  }}
                >
                  {tabKey === 'ALL' && 'All Checklists'}
                  {tabKey === 'PENDING' && 'Pending Review'}
                  {tabKey === 'ACCEPTED' && 'Accepted'}
                  {tabKey === 'REVIEW_REQUESTED' && 'Review Requested'}
                </button>
              ))}
            </div>
          </div>

          {/* Checklist Requests Master Table */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border, #E2E8F0)',
              borderRadius: '8px',
              overflowX: 'auto',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0F274E', color: '#FFFFFF', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px' }}>Job No</th>
                  <th style={{ padding: '10px 10px' }}>Buyer</th>
                  <th style={{ padding: '10px 10px' }}>Style No</th>
                  <th style={{ padding: '10px 10px' }}>Item Description</th>
                  <th style={{ padding: '10px 10px' }}>Order Qty</th>
                  <th style={{ padding: '10px 10px' }}>Merchandiser</th>
                  <th style={{ padding: '10px 10px' }}>T&A Slot</th>
                  <th style={{ padding: '10px 10px' }}>Items Count</th>
                  <th style={{ padding: '10px 10px' }}>Checklist Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredChecklistRequests.map((job) => {
                  const isUnfolded = !!unfoldedJobIds[job.id];

                  return (
                    <React.Fragment key={job.id}>
                      <tr
                        style={{
                          borderBottom: isUnfolded ? 'none' : '1px solid #F1F5F9',
                          background: isUnfolded ? '#F0F9FF' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0F274E' }}>
                          {job.jobNo}
                        </td>
                        <td style={{ padding: '10px 10px', fontWeight: 650, color: '#0284C7' }}>{job.buyer}</td>
                        <td style={{ padding: '10px 10px', color: '#334155' }}>{job.styleNo}</td>
                        <td style={{ padding: '10px 10px', color: '#475569', maxWidth: '240px' }}>{job.itemDescription}</td>
                        <td style={{ padding: '10px 10px', fontWeight: 700 }}>{job.orderQty.toLocaleString()} pcs</td>
                        <td style={{ padding: '10px 10px', color: '#475569' }}>{job.merchandiser}</td>
                        <td style={{ padding: '10px 10px', fontWeight: 600, color: '#0284C7' }}>{job.tnaSlot}</td>
                        <td style={{ padding: '10px 10px' }}>
                          <span style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: '10px', fontWeight: 700, fontSize: '11px' }}>
                            {job.items.length} Trims
                          </span>
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '12px',
                              background:
                                job.checklistStatus === 'ACCEPTED' ? '#ECFDF5' :
                                job.checklistStatus === 'REVIEW_REQUESTED' ? '#FEF2F2' : '#FFFBEB',
                              color:
                                job.checklistStatus === 'ACCEPTED' ? '#047857' :
                                job.checklistStatus === 'REVIEW_REQUESTED' ? '#B91C1C' : '#B45309'
                            }}
                          >
                            {job.checklistStatus === 'ACCEPTED' ? '✓ Accepted' :
                             job.checklistStatus === 'REVIEW_REQUESTED' ? '⚠️ Review Needed' : '⏳ Pending Review'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            {/* UNFOLD TOGGLE BUTTON */}
                            <button
                              type="button"
                              onClick={() => toggleUnfoldJob(job.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                background: isUnfolded ? '#0F274E' : '#F1F5F9',
                                color: isUnfolded ? '#FFFFFF' : '#0F274E',
                                border: '1px solid #CBD5E1',
                                fontSize: '11px',
                                fontWeight: 750,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {isUnfolded ? (
                                <>
                                  <span>Hide Items</span>
                                  <ChevronUp size={13} />
                                </>
                              ) : (
                                <>
                                  <span>View Items</span>
                                  <ChevronDown size={13} />
                                </>
                              )}
                            </button>

                            {job.checklistStatus !== 'ACCEPTED' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewModalJob(job);
                                    setReviewNoteInput(job.storeReviewNote || '');
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    background: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    color: '#DC2626',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Need Review
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleAcceptChecklist(job.id)}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    background: '#059669',
                                    border: 'none',
                                    color: '#FFFFFF',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Accept
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* INLINE ACCORDION UNFOLD SECTION */}
                      {isUnfolded && (
                        <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #BAE6FD' }}>
                          <td colSpan={10} style={{ padding: '16px 20px' }}>
                            <div
                              style={{
                                background: '#FFFFFF',
                                border: '1.5px solid #BAE6FD',
                                borderRadius: '8px',
                                padding: '16px',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                              }}
                            >
                              {/* Unfold Header Strip */}
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  borderBottom: '1px solid #E2E8F0',
                                  paddingBottom: '12px',
                                  marginBottom: '12px'
                                }}
                              >
                                <div>
<div style={{ fontSize: '16px', fontWeight: 800, color: '#0F274E', marginTop: '2px' }}>
                                    Job {job.jobNo} ({job.buyer} - {job.styleNo}) • {job.items.length} Items Listed
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {job.checklistStatus === 'ACCEPTED' ? (
                                    <span style={{ fontSize: '12px', background: '#ECFDF5', color: '#047857', padding: '4px 12px', borderRadius: '12px', fontWeight: 750 }}>
                                      ✓ Checklist Accepted on {job.acceptedAt} by {job.acceptedBy}
                                    </span>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReviewModalJob(job);
                                          setReviewNoteInput(job.storeReviewNote || '');
                                        }}
                                        style={{
                                          padding: '6px 14px',
                                          borderRadius: '6px',
                                          background: '#FEF2F2',
                                          border: '1px solid #DC2626',
                                          color: '#DC2626',
                                          fontSize: '12px',
                                          fontWeight: 700,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Need Review by Merchandiser
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleAcceptChecklist(job.id)}
                                        style={{
                                          padding: '6px 18px',
                                          borderRadius: '6px',
                                          background: '#059669',
                                          border: 'none',
                                          color: '#FFFFFF',
                                          fontSize: '12px',
                                          fontWeight: 750,
                                          cursor: 'pointer',
                                          boxShadow: '0 2px 4px rgba(5,150,105,0.3)'
                                        }}
                                      >
                                        Accept Checklist
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Unfolded Items Table */}
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                <thead>
                                  <tr style={{ background: '#F1F5F9', color: '#334155', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1.5px solid #CBD5E1' }}>
                                    <th style={{ padding: '8px 10px' }}>Trims Item</th>
                                    <th style={{ padding: '8px 8px' }}>Category</th>
                                    <th style={{ padding: '8px 8px' }}>Unit</th>
                                    <th style={{ padding: '8px 8px' }}>Consumption</th>
                                    <th style={{ padding: '8px 8px' }}>Source</th>
                                    <th style={{ padding: '8px 8px' }}>Required Qty</th>
                                    <th style={{ padding: '8px 8px' }}>Extra %</th>
                                    <th style={{ padding: '8px 8px' }}>Total Order Qty</th>
                                    <th style={{ padding: '8px 8px' }}>Assigned Storage</th>
                                    <th style={{ padding: '8px 10px' }}>Supplier</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {job.items.map((it) => (
                                    <tr key={it.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0F274E' }}>{it.itemName}</td>
                                      <td style={{ padding: '8px 8px' }}>
                                        <span style={{ fontSize: '10.5px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontWeight: 650 }}>
                                          {it.category}
                                        </span>
                                      </td>
                                      <td style={{ padding: '8px 8px', fontWeight: 650, color: '#0284C7' }}>{it.unit}</td>
                                      <td style={{ padding: '8px 8px' }}>
                                        <strong>{it.consumption}</strong> <span style={{ color: '#64748B', fontSize: '11px' }}>{it.consumptionUnit}</span>
                                      </td>
                                      <td style={{ padding: '8px 8px', fontSize: '11px', color: '#64748B' }}>
                                        {it.consumptionSource === 'SAMPLE_IE' ? 'IE Team' : it.consumptionSource === 'TECHNICAL' ? 'Technical' : 'Merchandiser'}
                                      </td>
                                      <td style={{ padding: '8px 8px', color: '#475569' }}>{it.requiredQty.toLocaleString()}</td>
                                      <td style={{ padding: '8px 8px', color: '#059669', fontWeight: 600 }}>+{it.wastagePct}%</td>
                                      <td style={{ padding: '8px 8px', fontWeight: 750, color: '#0F274E' }}>{it.totalOrderQty.toLocaleString()}</td>
                                      <td style={{ padding: '8px 8px' }}>
                                        <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                                          {it.rackNo} | {it.shelfNo}
                                        </span>
                                      </td>
                                      <td style={{ padding: '8px 10px', color: '#475569' }}>{it.supplierName}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Review Request Modal */}
          {reviewModalJob && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '16px'
              }}
            >
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '10px',
                  width: '100%',
                  maxWidth: '520px',
                  padding: '24px',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', marginBottom: '8px' }}>
                  <ShieldAlert size={22} />
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>
                    Request Merchandiser Review (Job {reviewModalJob.jobNo})
                  </h3>
                </div>
<div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E', display: 'block', marginBottom: '6px' }}>
                    Discrepancy / Sample Mismatch Remark:
                  </label>
                  <textarea
                    rows={4}
                    value={reviewNoteInput}
                    onChange={e => setReviewNoteInput(e.target.value)}
                    placeholder="e.g. Approved spec sheet calls for Antique Brass metal zipper, but supplier sample has Silver shiny teeth. Please re-check with buyer."
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setReviewModalJob(null)}
                    style={{ padding: '8px 14px', borderRadius: '6px', background: '#F1F5F9', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendReviewRequest}
                    style={{ padding: '8px 16px', borderRadius: '6px', background: '#DC2626', color: '#FFFFFF', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Send to Merchandiser
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: ORDER RECEIVE                                                 */}
      {/* ==================================================================== */}
      {activeTab === 'RECEIVE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Job Search Bar with Recent Searches */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border, #E2E8F0)',
              borderRadius: '8px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
                <Search size={20} color="#0284C7" />
                <input
                  type="text"
                  placeholder="Enter Job No to Receive (e.g. 48002, 46755)..."
                  value={receiveSearchJob}
                  onChange={e => setReceiveSearchJob(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1.5px solid #0284C7',
                    fontSize: '14px',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>

              {/* Recent Searches */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <History size={13} />
                  <span>Recent:</span>
                </span>
                {recentSearches.map(jobNo => (
                  <div
                    key={jobNo}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: receiveSearchJob.replace(/#/g, '').trim() === jobNo ? '#0F274E' : '#F1F5F9',
                      color: receiveSearchJob.replace(/#/g, '').trim() === jobNo ? '#FFFFFF' : '#334155',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '11.5px',
                      fontWeight: 700
                    }}
                  >
                    <span
                      onClick={() => setReceiveSearchJob(jobNo)}
                      style={{ cursor: 'pointer', marginRight: '4px' }}
                    >
                      {jobNo}
                    </span>
                    <X
                      size={11}
                      onClick={() => removeRecentSearch(jobNo)}
                      style={{ cursor: 'pointer', opacity: 0.7 }}
                    />
                  </div>
                ))}
              </div>

              {selectedReceiveJob && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handlePassAllReceive}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      background: '#ECFDF5',
                      border: '1.5px solid #059669',
                      color: '#065F46',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Pass All Items</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveReceive}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 18px',
                      borderRadius: '6px',
                      background: '#059669',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 750,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(5,150,105,0.3)'
                    }}
                  >
                    <Save size={16} />
                    <span>Save Receive</span>
                  </button>
                </div>
              )}
            </div>

            {/* Selected Job Metadata Strip */}
            {selectedReceiveJob ? (
              <div
                style={{
                  marginTop: '14px',
                  paddingTop: '12px',
                  borderTop: '1px solid #E2E8F0',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '10px',
                  fontSize: '12px'
                }}
              >
                <div>
                  <span style={{ color: '#64748B', display: 'block' }}>Job No:</span>
                  <strong style={{ color: '#0F274E', fontSize: '14px' }}>{selectedReceiveJob.jobNo}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block' }}>Buyer:</span>
                  <strong style={{ color: '#0284C7' }}>{selectedReceiveJob.buyer}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block' }}>Style No:</span>
                  <strong>{selectedReceiveJob.styleNo}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block' }}>Merchandiser:</span>
                  <strong>{selectedReceiveJob.merchandiser}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block' }}>Order Qty:</span>
                  <strong>{selectedReceiveJob.orderQty.toLocaleString()} pcs</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block' }}>T&A Slot:</span>
                  <strong style={{ color: '#059669' }}>{selectedReceiveJob.tnaSlot}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block' }}>Shipment Date:</span>
                  <strong>{selectedReceiveJob.shipmentDate}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block' }}>Present Status:</span>
                  <span style={{ fontWeight: 700, color: '#0284C7' }}>{computeJobStatus(selectedReceiveJob)}</span>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '14px', color: '#64748B', fontSize: '13px', fontStyle: 'italic' }}>
                Please enter a Job No above to populate trims order sheet.
              </div>
            )}
          </div>

          {/* Trims Receiving Table */}
          {selectedReceiveJob ? (
            <div
              style={{
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border, #E2E8F0)',
                borderRadius: '8px',
                overflowX: 'auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#0F274E', color: '#FFFFFF', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px' }}>Trims / Accessories Item</th>
                    <th style={{ padding: '10px 8px' }}>Category</th>
                    <th style={{ padding: '10px 8px' }}>Unit</th>
                    <th style={{ padding: '10px 8px' }}>Consumption</th>
                    <th style={{ padding: '10px 8px' }}>Source</th>
                    <th style={{ padding: '10px 8px' }}>Required</th>
                    <th style={{ padding: '10px 8px' }}>Extra %</th>
                    <th style={{ padding: '10px 8px' }}>Total Order</th>
                    <th style={{ padding: '10px 8px', background: '#0284C7' }}>Receive Qty (Now)</th>
                    <th style={{ padding: '10px 8px' }}>Balance Qty</th>
                    <th style={{ padding: '10px 8px' }}>Storage Rack</th>
                    <th style={{ padding: '10px 8px' }}>Storage Shelf</th>
                    <th style={{ padding: '10px 10px', textAlign: 'center' }}>Quality Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReceiveJob.items.map(it => {
                    const formEntry = receiveFormState[it.id] || { receiveQty: 0, qualityStatus: 'PASS', rackNo: it.rackNo, shelfNo: it.shelfNo };
                    const addedNow = Number(formEntry.receiveQty) || 0;
                    const calculatedBalance = Math.max(0, it.totalOrderQty - (it.receivedQty + addedNow));

                    return (
                      <tr key={it.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0F274E' }}>{it.itemName}</td>
                        <td style={{ padding: '9px 8px' }}>
                          <span style={{ fontSize: '10.5px', background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            {it.category}
                          </span>
                        </td>
                        <td style={{ padding: '9px 8px', fontWeight: 650, color: '#0284C7' }}>{it.unit}</td>
                        <td style={{ padding: '9px 8px' }}>
                          <strong>{it.consumption}</strong> <span style={{ color: '#64748B', fontSize: '11px' }}>{it.consumptionUnit}</span>
                        </td>
                        <td style={{ padding: '9px 8px', fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>
                          {it.consumptionSource === 'SAMPLE_IE' ? 'IE Team' : it.consumptionSource === 'TECHNICAL' ? 'Technical' : 'Merchandiser'}
                        </td>
                        <td style={{ padding: '9px 8px', color: '#475569' }}>{it.requiredQty.toLocaleString()}</td>
                        <td style={{ padding: '9px 8px', color: '#059669', fontWeight: 600 }}>+{it.wastagePct}%</td>
                        <td style={{ padding: '9px 8px', fontWeight: 700, color: '#0F274E' }}>{it.totalOrderQty.toLocaleString()}</td>

                        {/* Editable Receive Qty */}
                        <td style={{ padding: '9px 8px', background: '#F0F9FF' }}>
                          <input
                            type="number"
                            min="0"
                            max={it.totalOrderQty - it.receivedQty}
                            value={formEntry.receiveQty}
                            onChange={e => {
                              const val = Math.max(0, Number(e.target.value));
                              setReceiveFormState(prev => ({
                                ...prev,
                                [it.id]: { ...prev[it.id], receiveQty: val }
                              }));
                            }}
                            style={{
                              width: '90px',
                              padding: '5px 8px',
                              borderRadius: '4px',
                              border: '1.5px solid #0284C7',
                              fontWeight: 750,
                              fontSize: '13px',
                              textAlign: 'right',
                              background: '#FFFFFF'
                            }}
                          />
                        </td>

                        {/* Balance Qty */}
                        <td style={{ padding: '9px 8px', fontWeight: 700, color: calculatedBalance === 0 ? '#059669' : '#D97706' }}>
                          {calculatedBalance.toLocaleString()}
                        </td>

                        {/* Rack Selector */}
                        <td style={{ padding: '9px 8px' }}>
                          <select
                            value={formEntry.rackNo}
                            onChange={e => {
                              const val = e.target.value;
                              setReceiveFormState(prev => ({
                                ...prev,
                                [it.id]: { ...prev[it.id], rackNo: val }
                              }));
                            }}
                            style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '11px', fontWeight: 700 }}
                          >
                            {racks.map(r => (
                              <option key={r.rackId} value={r.rackId}>{r.rackId} ({r.dedicatedBuyer})</option>
                            ))}
                          </select>
                        </td>

                        {/* Shelf Selector */}
                        <td style={{ padding: '9px 8px' }}>
                          <select
                            value={formEntry.shelfNo}
                            onChange={e => {
                              const val = e.target.value;
                              setReceiveFormState(prev => ({
                                ...prev,
                                [it.id]: { ...prev[it.id], shelfNo: val }
                              }));
                            }}
                            style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '11px', fontWeight: 700 }}
                          >
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(s => (
                              <option key={s} value={`S-${s.toString().padStart(2, '0')}`}>Shelf ${s.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                        </td>

                        {/* Quality Status Dropdown */}
                        <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                          <select
                            value={formEntry.qualityStatus}
                            onChange={e => {
                              const val = e.target.value as QualityStatus;
                              setReceiveFormState(prev => ({
                                ...prev,
                                [it.id]: { ...prev[it.id], qualityStatus: val }
                              }));
                            }}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontWeight: 750,
                              fontSize: '11.5px',
                              border: formEntry.qualityStatus === 'PASS' ? '1.5px solid #059669' : '1.5px solid #DC2626',
                              background: formEntry.qualityStatus === 'PASS' ? '#ECFDF5' : '#FEF2F2',
                              color: formEntry.qualityStatus === 'PASS' ? '#065F46' : '#991B1B'
                            }}
                          >
                            <option value="PASS">PASS</option>
                            <option value="FAIL">FAIL (Reject)</option>
                            <option value="PENDING">PENDING</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                background: 'var(--card-bg, #ffffff)',
                border: '1px dashed var(--border, #CBD5E1)',
                borderRadius: '8px',
                padding: '48px 20px',
                textAlign: 'center',
                color: '#64748B'
              }}
            >
              <Package size={48} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>No Job Selected for Receiving</div>
</div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: PRESENT STOCK (DASHBOARD & MASTER TABLE)                      */}
      {/* ==================================================================== */}
      {activeTab === 'STOCK' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top KPI Cards Grid - All 8 Cards are Fully Interactive Filters */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px'
            }}
          >
            {/* Card 1: Total Jobs Tracked */}
            <div
              onClick={() => setKpiCardFilter('ALL')}
              style={{
                background: kpiCardFilter === 'ALL' ? '#F0F9FF' : '#FFFFFF',
                padding: '12px 14px',
                borderRadius: '8px',
                border: kpiCardFilter === 'ALL' ? '2px solid #0284C7' : '1px solid #E2E8F0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                cursor: 'pointer'
              }}
              title="Click to view all jobs"
            >
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>Total Jobs Tracked</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F274E', margin: '2px 0' }}>{stockKpis.totalJobs} Jobs</div>
              <div style={{ fontSize: '11.5px', color: '#0284C7', fontWeight: 600 }}>Active production runway</div>
            </div>

            {/* Card 2: Garments Order Qty */}
            <div
              onClick={() => setKpiCardFilter(prev => prev === 'HIGH_ORDER' ? 'ALL' : 'HIGH_ORDER')}
              style={{
                background: kpiCardFilter === 'HIGH_ORDER' ? '#F0F9FF' : '#FFFFFF',
                padding: '12px 14px',
                borderRadius: '8px',
                border: kpiCardFilter === 'HIGH_ORDER' ? '2px solid #0284C7' : '1px solid #E2E8F0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                cursor: 'pointer'
              }}
              title="Click to filter high-volume orders (>4,000 pcs)"
            >
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>Garments Order Qty</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F274E', margin: '2px 0' }}>{stockKpis.totalOrderQty.toLocaleString()} pcs</div>
              <div style={{ fontSize: '11.5px', color: '#64748B' }}>Confirmed orders</div>
            </div>

            {/* Card 3: Total Received Trims */}
            <div
              onClick={() => setKpiCardFilter(prev => prev === 'RECEIVED' ? 'ALL' : 'RECEIVED')}
              style={{
                background: kpiCardFilter === 'RECEIVED' ? '#ECFDF5' : '#FFFFFF',
                padding: '12px 14px',
                borderRadius: '8px',
                border: kpiCardFilter === 'RECEIVED' ? '2px solid #059669' : '1px solid #E2E8F0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                cursor: 'pointer'
              }}
              title="Click to filter jobs with received inventory"
            >
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>Total Received Trims</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#059669', margin: '2px 0' }}>{stockKpis.totalReceivedItems.toLocaleString()}</div>
              <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>In warehouse inventory</div>
            </div>

            {/* Card 4: Quality Pass Items */}
            <div
              onClick={() => setKpiCardFilter(prev => prev === 'QUALITY_PASS' ? 'ALL' : 'QUALITY_PASS')}
              style={{
                background: kpiCardFilter === 'QUALITY_PASS' ? '#ECFDF5' : '#FFFFFF',
                padding: '12px 14px',
                borderRadius: '8px',
                border: kpiCardFilter === 'QUALITY_PASS' ? '2px solid #047857' : '1px solid #E2E8F0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                cursor: 'pointer'
              }}
              title="Click to filter jobs with 100% quality passed trims"
            >
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>Quality Pass Items</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#047857', margin: '2px 0' }}>{stockKpis.totalInspectionPass} Items</div>
              <div style={{ fontSize: '11.5px', color: '#047857' }}>Ready for floor issue</div>
            </div>

            {/* Card 5: Quality Fail (Clickable filter) */}
            <div
              onClick={() => setKpiCardFilter(prev => prev === 'QUALITY_FAIL' ? 'ALL' : 'QUALITY_FAIL')}
              style={{
                background: kpiCardFilter === 'QUALITY_FAIL' ? '#FEF2F2' : '#FFFFFF',
                padding: '12px 14px',
                borderRadius: '8px',
                border: kpiCardFilter === 'QUALITY_FAIL' ? '2px solid #DC2626' : '1px solid #FECACA',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}
              title="Click to filter table to failed/rejected jobs"
            >
              <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700, textTransform: 'uppercase' }}>Quality Fail (Click Filter)</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#DC2626', margin: '2px 0' }}>{stockKpis.totalInspectionFail} Items</div>
              <div style={{ fontSize: '11.5px', color: '#991B1B', fontWeight: 600 }}>Supplier reject follow-up</div>
            </div>

            {/* Card 6: Total Delivered to Sewing */}
            <div
              onClick={() => setKpiCardFilter(prev => prev === 'DELIVERED' ? 'ALL' : 'DELIVERED')}
              style={{
                background: kpiCardFilter === 'DELIVERED' ? '#EFF6FF' : '#FFFFFF',
                padding: '12px 14px',
                borderRadius: '8px',
                border: kpiCardFilter === 'DELIVERED' ? '2px solid #0284C7' : '1px solid #E2E8F0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                cursor: 'pointer'
              }}
              title="Click to filter jobs with floor deliveries"
            >
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>Total Delivered</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#0284C7', margin: '2px 0' }}>{stockKpis.totalDeliveredUnits.toLocaleString()}</div>
              <div style={{ fontSize: '11.5px', color: '#0284C7', fontWeight: 600 }}>Dispatched to floor</div>
            </div>

            {/* Card 7: Partial Received */}
            <div
              onClick={() => setKpiCardFilter(prev => prev === 'PARTIAL' ? 'ALL' : 'PARTIAL')}
              style={{
                background: kpiCardFilter === 'PARTIAL' ? '#FFFBEB' : '#FFFFFF',
                padding: '12px 14px',
                borderRadius: '8px',
                border: kpiCardFilter === 'PARTIAL' ? '2px solid #D97706' : '1px solid #E2E8F0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                cursor: 'pointer'
              }}
              title="Click to filter partially received jobs"
            >
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>Partial Received</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#D97706', margin: '2px 0' }}>{stockKpis.partialReceivedJobsCount} Jobs</div>
              <div style={{ fontSize: '11.5px', color: '#D97706', fontWeight: 600 }}>Supplier delivery pending</div>
            </div>

            {/* Card 8: Order Confirmed vs Checklist Received */}
            <div
              onClick={() => setKpiCardFilter(prev => prev === 'CHECKLIST_PENDING' ? 'ALL' : 'CHECKLIST_PENDING')}
              style={{
                background: kpiCardFilter === 'CHECKLIST_PENDING' ? '#F0FDF4' : '#FFFFFF',
                padding: '12px 14px',
                borderRadius: '8px',
                border: kpiCardFilter === 'CHECKLIST_PENDING' ? '2px solid #16A34A' : '1px solid #E2E8F0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                cursor: 'pointer'
              }}
              title="Click to filter jobs pending checklist acceptance"
            >
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>Confirmed vs Checklist</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#0F274E', margin: '3px 0' }}>
                {stockKpis.totalJobs} / {stockKpis.acceptedChecklistsCount} Accepted
              </div>
              <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
                {Math.round((stockKpis.acceptedChecklistsCount / stockKpis.totalJobs) * 100)}% coverage
              </div>
            </div>
          </div>

          {/* Compact Filter Toolbar with Active Filter Indicator */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border, #E2E8F0)',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#0F274E' }}>
              <Filter size={15} color="#0284C7" />
              <span>Filters:</span>
            </div>

            {/* Active KPI Card Filter Badge */}
            {kpiCardFilter !== 'ALL' && (
              <span
                style={{
                  background: '#0F274E',
                  color: '#FFFFFF',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>KPI: {kpiCardFilter}</span>
                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setKpiCardFilter('ALL')} />
              </span>
            )}

            {/* Search Job */}
            <input
              type="text"
              placeholder="Search Job, Style, Buyer..."
              value={stockSearchQuery}
              onChange={e => setStockSearchQuery(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '12px', width: '180px' }}
            />

            {/* Buyer Filter */}
            <select
              value={stockBuyerFilter}
              onChange={e => setStockBuyerFilter(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600 }}
            >
              <option value="ALL">Buyer: All Buyers</option>
              {uniqueBuyers.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Merchandiser Filter */}
            <select
              value={stockMerchFilter}
              onChange={e => setStockMerchFilter(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600 }}
            >
              <option value="ALL">Merchandiser: All</option>
              {uniqueMerchandisers.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* T&A Slot */}
            <select
              value={stockTnaSlotFilter}
              onChange={e => setStockTnaSlotFilter(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600 }}
            >
              <option value="ALL">T&A Slot: All Slots</option>
              {uniqueTnaSlots.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Sewing Line */}
            <select
              value={stockSewingFilter}
              onChange={e => setStockSewingFilter(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600 }}
            >
              <option value="ALL">Sewing Plan: All Lines</option>
              <option value="Line 04">Line 04</option>
              <option value="Line 08">Line 08</option>
              <option value="Line 11">Line 11</option>
              <option value="Line 14">Line 14</option>
              <option value="Line 16B">Line 16B</option>
            </select>

            {/* Status Filter */}
            <select
              value={stockStatusFilter}
              onChange={e => setStockStatusFilter(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 650, color: '#0F274E' }}
            >
              <option value="ALL">Status: All Statuses</option>
              <option value="Order Confirmed">Order Confirmed</option>
              <option value="Checklist Due">Checklist Due</option>
              <option value="Ordering Due">Ordering Due</option>
              <option value="Fully Received Due">Fully Received Due</option>
              <option value="Partial Received Due">Partial Received Due</option>
              <option value="Receive OK">Receive OK</option>
              <option value="Delivery Running">Delivery Running</option>
              <option value="Delivery Done">Delivery Done</option>
              <option value="Inspection Fail">Inspection Fail</option>
            </select>

            {/* Reset Filters */}
            {(stockBuyerFilter !== 'ALL' || stockMerchFilter !== 'ALL' || stockStatusFilter !== 'ALL' || stockSearchQuery || kpiCardFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setStockBuyerFilter('ALL');
                  setStockMerchFilter('ALL');
                  setStockTnaSlotFilter('ALL');
                  setStockSewingFilter('ALL');
                  setStockStatusFilter('ALL');
                  setStockSearchQuery('');
                  setKpiCardFilter('ALL');
                }}
                style={{ padding: '5px 10px', borderRadius: '4px', background: '#F1F5F9', border: '1px solid #CBD5E1', fontSize: '11.5px', cursor: 'pointer' }}
              >
                Reset
              </button>
            )}
          </div>

          {/* Master Stock Table with ITEM DUE & QUALITY STATUS Columns */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border, #E2E8F0)',
              borderRadius: '8px',
              overflowX: 'auto',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0F274E', color: '#FFFFFF', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '9px 12px' }}>Buyer</th>
                  <th style={{ padding: '9px 10px' }}>Job No</th>
                  <th style={{ padding: '9px 10px' }}>Style No</th>
                  <th style={{ padding: '9px 10px' }}>Order Qty</th>
                  <th style={{ padding: '9px 10px' }}>Present Status</th>
                  <th style={{ padding: '9px 10px', background: '#78350F' }}>Items Due</th>
                  <th style={{ padding: '9px 10px' }}>Quality Audit</th>
                  <th style={{ padding: '9px 10px' }}>Merchandiser</th>
                  <th style={{ padding: '9px 10px' }}>T&A Slot</th>
                  <th style={{ padding: '9px 10px' }}>Racks Stored</th>
                  <th style={{ padding: '9px 10px' }}>Delivery Progress</th>
                  <th style={{ padding: '9px 12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStockJobs.map(j => {
                  const dynamicStatus = computeJobStatus(j);
                  const totalReq = j.items.reduce((acc, it) => acc + it.totalOrderQty, 0);
                  const totalRecv = j.items.reduce((acc, it) => acc + it.receivedQty, 0);
                  const totalDeliv = j.items.reduce((acc, it) => acc + it.deliveredQty, 0);
                  const delivPct = totalRecv > 0 ? Math.round((totalDeliv / totalRecv) * 100) : 0;
                  const uniqueRacks = Array.from(new Set(j.items.map(it => it.rackNo))).filter(Boolean);

                  const dueItems = j.items.filter(it => it.receivedQty < it.totalOrderQty);
                  const passCount = j.items.filter(it => it.qualityStatus === 'PASS').length;
                  const failCount = j.items.filter(it => it.qualityStatus === 'FAIL').length;
                  const pendingCount = j.items.filter(it => it.qualityStatus === 'PENDING').length;

                  return (
                    <tr
                      key={j.id}
                      style={{ borderBottom: '1px solid #F1F5F9' }}
                    >
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0284C7' }}>{j.buyer}</td>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{ fontWeight: 800, color: '#0F274E' }}>
                          {j.jobNo}
                        </span>
                      </td>
                      <td style={{ padding: '9px 10px', color: '#334155', fontWeight: 600 }}>{j.styleNo}</td>
                      <td style={{ padding: '9px 10px', fontWeight: 700 }}>{j.orderQty.toLocaleString()} pcs</td>
                      <td style={{ padding: '9px 10px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background:
                              dynamicStatus === 'Receive OK' || dynamicStatus === 'Delivery Done' ? '#ECFDF5' :
                              dynamicStatus === 'Inspection Fail' ? '#FEF2F2' :
                              dynamicStatus === 'Partial Received Due' ? '#FFFBEB' : '#F1F5F9',
                            color:
                              dynamicStatus === 'Receive OK' || dynamicStatus === 'Delivery Done' ? '#047857' :
                              dynamicStatus === 'Inspection Fail' ? '#B91C1C' :
                              dynamicStatus === 'Partial Received Due' ? '#B45309' : '#334155'
                          }}
                        >
                          {dynamicStatus}
                        </span>
                      </td>

                      {/* ITEMS DUE COLUMN */}
                      <td style={{ padding: '9px 10px', maxWidth: '240px' }}>
                        {dueItems.length === 0 ? (
                          <span style={{ fontSize: '11px', background: '#ECFDF5', color: '#047857', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                            ✓ None (All In)
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '11px', color: '#B45309', fontWeight: 750 }}>
                              {dueItems.length} items due:
                            </span>
                            <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.3 }}>
                              {dueItems.map((it, idx) => (
                                <span key={it.id}>
                                  <strong>{it.itemName}</strong> ({it.balanceQty.toLocaleString()} {it.unit}){idx < dueItems.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* QUALITY AUDIT STATUS */}
                      <td style={{ padding: '9px 10px' }}>
                        {failCount > 0 ? (
                          <span style={{ fontSize: '11px', background: '#FEF2F2', color: '#DC2626', padding: '3px 8px', borderRadius: '12px', fontWeight: 800 }}>
                            ⚠️ {failCount} Failed (Reject)
                          </span>
                        ) : pendingCount > 0 ? (
                          <span style={{ fontSize: '11px', background: '#FFFBEB', color: '#B45309', padding: '3px 8px', borderRadius: '12px', fontWeight: 700 }}>
                            ⏳ {passCount}/{j.items.length} Passed
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', background: '#ECFDF5', color: '#059669', padding: '3px 8px', borderRadius: '12px', fontWeight: 750 }}>
                            ✓ {passCount}/{j.items.length} Passed
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '9px 10px', color: '#475569' }}>{j.merchandiser}</td>
                      <td style={{ padding: '9px 10px', color: '#0284C7', fontWeight: 600 }}>{j.tnaSlot}</td>
                      <td style={{ padding: '9px 10px' }}>
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                          {uniqueRacks.map(r => (
                            <span key={r} style={{ fontSize: '10.5px', background: '#EFF6FF', color: '#1D4ED8', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1, background: '#E2E8F0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${delivPct}%`, background: delivPct === 100 ? '#059669' : '#0284C7', height: '100%' }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', minWidth: '30px' }}>{delivPct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <button
                          type="button"
                          onClick={() => setDetailModalJob(j)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            background: '#0F274E',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Inspect & Quality
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Detailed Job Checklist & Quality Inspection Modal (Only opened on explicit button click) */}
          {detailModalJob && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: detailModalFullscreen ? '0' : '20px'
              }}
            >
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: detailModalFullscreen ? '0' : '10px',
                  width: detailModalFullscreen ? '100vw' : '95%',
                  maxWidth: detailModalFullscreen ? '100vw' : '1100px',
                  height: detailModalFullscreen ? '100vh' : 'auto',
                  maxHeight: detailModalFullscreen ? '100vh' : '90vh',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)'
                }}
              >
                {/* Modal Header */}
                <div
                  style={{
                    padding: '16px 20px',
                    background: '#0F274E',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Boxes size={22} color="#38BDF8" />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                        Job {detailModalJob.jobNo} — Complete Trims Specification & Quality Audit
                      </h3>
                      <div style={{ fontSize: '12px', color: '#93C5FD', marginTop: '2px' }}>
                        {detailModalJob.buyer} • Style {detailModalJob.styleNo} • Order {detailModalJob.orderQty.toLocaleString()} pcs • Merchandiser: {detailModalJob.merchandiser}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setModalQualityMode(prev => !prev)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: modalQualityMode ? '#A4D92C' : 'rgba(255,255,255,0.15)',
                        color: modalQualityMode ? '#071F42' : '#FFFFFF',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 750,
                        cursor: 'pointer'
                      }}
                    >
                      {modalQualityMode ? 'Exit Quality Mode' : 'Quality Inspection Mode'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDetailModalFullscreen(prev => !prev)}
                      style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '4px' }}
                      title={detailModalFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                      {detailModalFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDetailModalJob(null)}
                      style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '4px', fontSize: '18px', fontWeight: 700 }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Modal Quality Inspection Actions Bar */}
                {modalQualityMode && (
                  <div
                    style={{
                      background: '#FFFBEB',
                      borderBottom: '1px solid #FDE68A',
                      padding: '10px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
<div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const allPassed: Record<string, any> = {};
                          detailModalJob.items.forEach(it => {
                            allPassed[it.id] = { status: 'PASS', remarks: '' };
                          });
                          setModalQualityDraft(allPassed);
                        }}
                        style={{ padding: '5px 12px', borderRadius: '4px', background: '#ECFDF5', border: '1px solid #059669', color: '#065F46', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        ✓ Mark All Pass
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveModalQuality}
                        style={{ padding: '5px 16px', borderRadius: '4px', background: '#059669', color: '#FFFFFF', border: 'none', fontSize: '12px', fontWeight: 750, cursor: 'pointer' }}
                      >
                        Save Quality Status
                      </button>
                    </div>
                  </div>
                )}

                {/* Modal Body / Items Table */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', color: '#475569', fontSize: '11px', textTransform: 'uppercase', borderBottom: '2px solid #E2E8F0' }}>
                        <th style={{ padding: '8px 10px' }}>Item Name</th>
                        <th style={{ padding: '8px 8px' }}>Category</th>
                        <th style={{ padding: '8px 8px' }}>Unit</th>
                        <th style={{ padding: '8px 8px' }}>Consumption</th>
                        <th style={{ padding: '8px 8px' }}>Source</th>
                        <th style={{ padding: '8px 8px' }}>Order Qty</th>
                        <th style={{ padding: '8px 8px' }}>Received</th>
                        <th style={{ padding: '8px 8px' }}>Balance</th>
                        <th style={{ padding: '8px 8px' }}>Location</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Quality Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModalJob.items.map(it => {
                        const draft = modalQualityDraft[it.id] || { status: it.qualityStatus, remarks: it.failRemarks || '' };

                        return (
                          <tr key={it.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0F274E' }}>{it.itemName}</td>
                            <td style={{ padding: '8px 8px' }}>
                              <span style={{ fontSize: '10.5px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontWeight: 650 }}>
                                {it.category}
                              </span>
                            </td>
                            <td style={{ padding: '8px 8px', fontWeight: 650, color: '#0284C7' }}>{it.unit}</td>
                            <td style={{ padding: '8px 8px' }}>
                              {it.consumption} {it.consumptionUnit}
                            </td>
                            <td style={{ padding: '8px 8px', fontSize: '11px', color: '#64748B' }}>{it.consumptionSource}</td>
                            <td style={{ padding: '8px 8px', fontWeight: 700 }}>{it.totalOrderQty.toLocaleString()}</td>
                            <td style={{ padding: '8px 8px', color: '#059669', fontWeight: 700 }}>{it.receivedQty.toLocaleString()}</td>
                            <td style={{ padding: '8px 8px', color: it.balanceQty > 0 ? '#D97706' : '#64748B', fontWeight: 700 }}>
                              {it.balanceQty.toLocaleString()}
                            </td>
                            <td style={{ padding: '8px 8px' }}>
                              <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                                {it.rackNo} | {it.shelfNo}
                              </span>
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              {modalQualityMode ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <select
                                    value={draft.status}
                                    onChange={e => {
                                      const val = e.target.value as QualityStatus;
                                      setModalQualityDraft(prev => ({
                                        ...prev,
                                        [it.id]: { ...prev[it.id], status: val }
                                      }));
                                    }}
                                    style={{
                                      padding: '4px 6px',
                                      borderRadius: '4px',
                                      fontSize: '11.5px',
                                      fontWeight: 750,
                                      border: draft.status === 'PASS' ? '1.5px solid #059669' : '1.5px solid #DC2626',
                                      background: draft.status === 'PASS' ? '#ECFDF5' : '#FEF2F2',
                                      color: draft.status === 'PASS' ? '#065F46' : '#991B1B'
                                    }}
                                  >
                                    <option value="PASS">PASS</option>
                                    <option value="FAIL">FAIL (Reject)</option>
                                    <option value="PENDING">PENDING</option>
                                  </select>
                                  {draft.status === 'FAIL' && (
                                    <input
                                      type="text"
                                      placeholder="Reason for failure..."
                                      value={draft.remarks}
                                      onChange={e => {
                                        const r = e.target.value;
                                        setModalQualityDraft(prev => ({
                                          ...prev,
                                          [it.id]: { ...prev[it.id], remarks: r }
                                        }));
                                      }}
                                      style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #DC2626', fontSize: '11px' }}
                                    />
                                  )}
                                </div>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 750,
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    background: it.qualityStatus === 'PASS' ? '#ECFDF5' : it.qualityStatus === 'FAIL' ? '#FEF2F2' : '#FFFBEB',
                                    color: it.qualityStatus === 'PASS' ? '#059669' : it.qualityStatus === 'FAIL' ? '#DC2626' : '#B45309'
                                  }}
                                >
                                  {it.qualityStatus === 'PASS' ? '✓ Passed' : it.qualityStatus === 'FAIL' ? '⚠️ Failed' : '⏳ Pending'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Modal Footer */}
                <div style={{ padding: '12px 20px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setDetailModalJob(null)}
                    style={{ padding: '6px 14px', borderRadius: '6px', background: '#0F274E', color: '#FFFFFF', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: ORDER DELIVERY                                                */}
      {/* ==================================================================== */}
      {activeTab === 'DELIVERY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header & Job Search */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border, #E2E8F0)',
              borderRadius: '8px',
              padding: '16px 20px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
              <Truck size={22} color="#0284C7" />
              <input
                type="text"
                placeholder="Search Job No for Floor Issue (e.g. 48002)..."
                value={deliverySearchJob}
                onChange={e => setDeliverySearchJob(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1.5px solid #0284C7',
                  fontSize: '14px',
                  fontWeight: 700,
                  outline: 'none'
                }}
              />
            </div>

            {/* Recent Searches */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <History size={13} />
                <span>Recent:</span>
              </span>
              {recentSearches.map(jobNo => (
                <div
                  key={jobNo}
                  onClick={() => setDeliverySearchJob(jobNo)}
                  style={{
                    background: deliverySearchJob.replace(/#/g, '').trim() === jobNo ? '#0F274E' : '#F1F5F9',
                    color: deliverySearchJob.replace(/#/g, '').trim() === jobNo ? '#FFFFFF' : '#334155',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {jobNo}
                </div>
              ))}
            </div>

            {selectedDeliveryJob && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleDeliverAllClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: '#ECFDF5',
                    border: '1.5px solid #059669',
                    color: '#065F46',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Sparkles size={15} />
                  <span>Delivered All</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelivery}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    background: '#0F274E',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 750,
                    cursor: 'pointer'
                  }}
                >
                  <Truck size={15} />
                  <span>Issue Floor Gate Pass</span>
                </button>
              </div>
            )}
          </div>

          {/* Gate Pass Success Alert */}
          {deliveryGatePassIssued && (
            <div
              style={{
                background: '#ECFDF5',
                border: '1.5px solid #059669',
                borderRadius: '8px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#065F46'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={24} color="#059669" />
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800 }}>Gate Pass Generated: {deliveryGatePassIssued}</div>
                  <div style={{ fontSize: '12.5px' }}>Materials dispatched to Sewing Floor ({selectedDeliveryJob?.sewingLine}). Inventory updated in store.</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: '#047857',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Printer size={14} />
                <span>Print Gate Pass</span>
              </button>
            </div>
          )}

          {/* Delivery Table */}
          {selectedDeliveryJob && (
            <div
              style={{
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border, #E2E8F0)',
                borderRadius: '8px',
                overflowX: 'auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#0F274E', color: '#FFFFFF', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '9px 12px', width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={Object.values(deliveryCheckedMap).length > 0 && Object.values(deliveryCheckedMap).every(Boolean)}
                        onChange={e => {
                          const val = e.target.checked;
                          const next: Record<string, boolean> = {};
                          selectedDeliveryJob.items.forEach(it => { next[it.id] = val; });
                          setDeliveryCheckedMap(next);
                        }}
                      />
                    </th>
                    <th style={{ padding: '9px 10px' }}>Trims / Accessories Item</th>
                    <th style={{ padding: '9px 8px' }}>Unit</th>
                    <th style={{ padding: '9px 8px' }}>Consumption</th>
                    <th style={{ padding: '9px 8px' }}>Required Qty</th>
                    <th style={{ padding: '9px 8px' }}>In-Stock Recv</th>
                    <th style={{ padding: '9px 8px' }}>Already Delivered</th>
                    <th style={{ padding: '9px 8px' }}>In-Store Balance</th>
                    <th style={{ padding: '9px 8px', background: '#0284C7' }}>Now Delivering Qty</th>
                    <th style={{ padding: '9px 8px' }}>Storage Location</th>
                    <th style={{ padding: '9px 10px' }}>Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDeliveryJob.items.map(it => {
                    const isChecked = !!deliveryCheckedMap[it.id];
                    const inStoreBalance = Math.max(0, it.receivedQty - it.deliveredQty);
                    const currentDeliverInput = deliveryQtyMap[it.id] ?? 0;

                    return (
                      <tr key={it.id} style={{ borderBottom: '1px solid #F1F5F9', background: isChecked ? '#F0F9FF' : 'transparent' }}>
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              const val = e.target.checked;
                              setDeliveryCheckedMap(prev => ({ ...prev, [it.id]: val }));
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0F274E' }}>{it.itemName}</td>
                        <td style={{ padding: '8px 8px', fontWeight: 650, color: '#0284C7' }}>{it.unit}</td>
                        <td style={{ padding: '8px 8px' }}>
                          <strong>{it.consumption}</strong> <span style={{ color: '#64748B' }}>{it.consumptionUnit}</span>
                        </td>
                        <td style={{ padding: '8px 8px', color: '#64748B' }}>{it.totalOrderQty.toLocaleString()}</td>
                        <td style={{ padding: '8px 8px', fontWeight: 600, color: '#059669' }}>{it.receivedQty.toLocaleString()}</td>
                        <td style={{ padding: '8px 8px', color: '#0284C7', fontWeight: 600 }}>{it.deliveredQty.toLocaleString()}</td>
                        <td style={{ padding: '8px 8px', fontWeight: 700, color: inStoreBalance === 0 ? '#94A3B8' : '#D97706' }}>
                          {inStoreBalance.toLocaleString()} {it.unit}
                        </td>

                        {/* Deliver Qty Input */}
                        <td style={{ padding: '8px 8px', background: '#F0F9FF' }}>
                          <input
                            type="number"
                            min="0"
                            max={inStoreBalance}
                            value={currentDeliverInput}
                            disabled={!isChecked}
                            onChange={e => {
                              const val = Math.max(0, Number(e.target.value));
                              setDeliveryQtyMap(prev => ({ ...prev, [it.id]: val }));
                            }}
                            style={{
                              width: '100px',
                              padding: '5px 8px',
                              borderRadius: '4px',
                              border: isChecked ? '1.5px solid #0284C7' : '1px solid #CBD5E1',
                              fontWeight: 700,
                              fontSize: '13px',
                              textAlign: 'right',
                              background: isChecked ? '#FFFFFF' : '#F1F5F9'
                            }}
                          />
                        </td>

                        <td style={{ padding: '8px 8px' }}>
                          <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                            {it.rackNo} | {it.shelfNo}
                          </span>
                        </td>

                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 750, color: it.qualityStatus === 'PASS' ? '#059669' : '#DC2626' }}>
                            {it.qualityStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: LOCATION TRACKING (3 SUB-TABS: 1. LAYOUT, 2. SEARCH, 3. CUSTOMIZE) */}
      {/* ==================================================================== */}
      {activeTab === 'LOCATION' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sub-Tabs: 1. Present Store Layout, 2. Job Location Search, 3. Customize Rack Layout */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setLocationSubTab('LAYOUT')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                border: locationSubTab === 'LAYOUT' ? '1px solid #0F274E' : '1px solid #CBD5E1',
                background: locationSubTab === 'LAYOUT' ? '#0F274E' : '#FFFFFF',
                color: locationSubTab === 'LAYOUT' ? '#FFFFFF' : '#334155'
              }}
            >
              <Warehouse size={16} />
              <span>1. Present Store Layout (40 Racks × 12 Shelves)</span>
            </button>

            <button
              type="button"
              onClick={() => setLocationSubTab('JOB_SEARCH')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                border: locationSubTab === 'JOB_SEARCH' ? '1px solid #0F274E' : '1px solid #CBD5E1',
                background: locationSubTab === 'JOB_SEARCH' ? '#0F274E' : '#FFFFFF',
                color: locationSubTab === 'JOB_SEARCH' ? '#FFFFFF' : '#334155'
              }}
            >
              <Search size={16} />
              <span>2. Job-wise Location Search</span>
            </button>

            {/* 3RD SUB-TAB: CUSTOMIZE RACK LAYOUT */}
            <button
              type="button"
              onClick={() => setLocationSubTab('CUSTOMIZE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                border: locationSubTab === 'CUSTOMIZE' ? '1px solid #0F274E' : '1px solid #CBD5E1',
                background: locationSubTab === 'CUSTOMIZE' ? '#0F274E' : '#FFFFFF',
                color: locationSubTab === 'CUSTOMIZE' ? '#FFFFFF' : '#334155'
              }}
            >
              <Sliders size={16} />
              <span>3. Customize Rack Layout</span>
            </button>
          </div>

          {/* Sub-view 1: Present Layout */}
          {locationSubTab === 'LAYOUT' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px' }}>
              {/* 40 Racks Visual Grid */}
              <div
                style={{
                  background: 'var(--card-bg, #ffffff)',
                  border: '1px solid var(--border, #E2E8F0)',
                  borderRadius: '8px',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0F274E' }}>
                    Warehouse Floor Plan (40 Master Racks)
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontWeight: 650 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', background: '#3B82F6', borderRadius: '2px' }} /> ONLY</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', background: '#8B5CF6', borderRadius: '2px' }} /> OVS</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', background: '#F59E0B', borderRadius: '2px' }} /> BS-ONS</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', background: '#EC4899', borderRadius: '2px' }} /> BS-NMT</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', background: '#10B981', borderRadius: '2px' }} /> UTG</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', background: '#64748B', borderRadius: '2px' }} /> GENERAL</span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gap: '8px'
                  }}
                >
                  {racks.map(r => {
                    const isSelected = r.rackId === selectedRackId;
                    const buyerColor =
                      r.dedicatedBuyer === 'ONLY' ? '#3B82F6' :
                      r.dedicatedBuyer === 'OVS' ? '#8B5CF6' :
                      r.dedicatedBuyer === 'BS-ONS' ? '#F59E0B' :
                      r.dedicatedBuyer === 'BS-NMT' ? '#EC4899' :
                      r.dedicatedBuyer === 'UTG' ? '#10B981' : '#64748B';

                    const occupiedShelves = r.shelves.filter(s => s.occupancyPct > 0).length;

                    return (
                      <div
                        key={r.rackId}
                        onClick={() => setSelectedRackId(r.rackId)}
                        style={{
                          background: isSelected ? '#0F274E' : '#F8FAFC',
                          color: isSelected ? '#FFFFFF' : '#1E293B',
                          border: isSelected ? '2px solid #38BDF8' : '1px solid #E2E8F0',
                          borderTop: `4px solid ${buyerColor}`,
                          borderRadius: '6px',
                          padding: '10px 8px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 800 }}>{r.rackId}</div>
                        <div style={{ fontSize: '10.5px', fontWeight: 700, color: isSelected ? '#93C5FD' : buyerColor, marginTop: '2px' }}>
                          {r.dedicatedBuyer}
                        </div>
                        <div style={{ fontSize: '10px', color: isSelected ? '#CBD5E1' : '#64748B', marginTop: '4px' }}>
                          {occupiedShelves} / 12 Shelves
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Rack Shelf Breakdown (12 Shelves) */}
              <div
                style={{
                  background: 'var(--card-bg, #ffffff)',
                  border: '1px solid var(--border, #E2E8F0)',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '10px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                    Selected Rack Matrix
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F274E' }}>
                    {activeRack.rackId} ({activeRack.dedicatedBuyer})
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Zone: {activeRack.zone} • 12 Storage Shelves</div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {activeRack.shelves.map(s => (
                    <div
                      key={s.shelfNo}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: s.occupancyPct > 0 ? '#F0F9FF' : '#F8FAFC',
                        border: s.occupancyPct > 0 ? '1px solid #BAE6FD' : '1px solid #E2E8F0'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F274E' }}>
                          Shelf {s.shelfNo.toString().padStart(2, '0')}
                        </span>
                        <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: s.occupancyPct > 0 ? '#0284C7' : '#E2E8F0', color: s.occupancyPct > 0 ? '#FFFFFF' : '#64748B', fontWeight: 700 }}>
                          {s.assignedCategory}
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#334155', marginTop: '2px' }}>
                        {s.itemSummary}
                      </div>
                      {s.currentJobNos.length > 0 && (
                        <div style={{ fontSize: '11px', color: '#0284C7', fontWeight: 600, marginTop: '2px' }}>
                          Jobs: {s.currentJobNos.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sub-view 2: Job-wise Location Search */}
          {locationSubTab === 'JOB_SEARCH' && (
            <div
              style={{
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border, #E2E8F0)',
                borderRadius: '8px',
                padding: '20px'
              }}
            >
              <div style={{ maxWidth: '400px', marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E', display: 'block', marginBottom: '6px' }}>
                  Search Job No to Locate Trims:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={locationJobQuery}
                    onChange={e => setLocationJobQuery(e.target.value)}
                    placeholder="Enter Job No (e.g. 48002, 46755)..."
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #0284C7', fontSize: '13px', fontWeight: 600 }}
                  />
                </div>
              </div>

              {searchedJobLocations ? (
                <div>
                  <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '6px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px' }}>
                    <strong>Job {searchedJobLocations.jobNo}</strong> ({searchedJobLocations.buyer} - {searchedJobLocations.styleNo}) — {searchedJobLocations.itemDescription}
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#0F274E', color: '#FFFFFF', fontSize: '11.5px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '10px 14px' }}>Trims / Accessories Item</th>
                        <th style={{ padding: '10px 12px' }}>Category</th>
                        <th style={{ padding: '10px 12px' }}>In-Stock Qty</th>
                        <th style={{ padding: '10px 14px', background: '#0284C7' }}>Exact Shelf Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchedJobLocations.items.map(it => (
                        <tr key={it.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1E293B' }}>{it.itemName}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: '11px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              {it.category}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 650, color: '#059669' }}>
                            {it.receivedQty.toLocaleString()} {it.unit}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, background: '#EFF6FF', color: '#1D4ED8', padding: '4px 10px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                              📍 {it.rackNo} | {it.shelfNo}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
                  No trims found for Job {locationJobQuery}. Please enter a valid Job No.
                </div>
              )}
            </div>
          )}

          {/* Sub-view 3: CUSTOMIZE RACK & SHELF LAYOUT */}
          {locationSubTab === 'CUSTOMIZE' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '16px' }}>
              {/* Rack Selector Grid on Left */}
              <div
                style={{
                  background: 'var(--card-bg, #ffffff)',
                  border: '1px solid var(--border, #E2E8F0)',
                  borderRadius: '8px',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0F274E' }}>
                      Select a Rack to Configure (R-01 to R-40)
                    </h3>
</div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gap: '8px'
                  }}
                >
                  {racks.map(r => {
                    const isSelected = r.rackId === selectedRackId;
                    const buyerColor =
                      r.dedicatedBuyer === 'ONLY' ? '#3B82F6' :
                      r.dedicatedBuyer === 'OVS' ? '#8B5CF6' :
                      r.dedicatedBuyer === 'BS-ONS' ? '#F59E0B' :
                      r.dedicatedBuyer === 'BS-NMT' ? '#EC4899' :
                      r.dedicatedBuyer === 'UTG' ? '#10B981' : '#64748B';

                    return (
                      <div
                        key={r.rackId}
                        onClick={() => setSelectedRackId(r.rackId)}
                        style={{
                          background: isSelected ? '#0F274E' : '#F8FAFC',
                          color: isSelected ? '#FFFFFF' : '#1E293B',
                          border: isSelected ? '2px solid #38BDF8' : '1px solid #E2E8F0',
                          borderTop: `4px solid ${buyerColor}`,
                          borderRadius: '6px',
                          padding: '10px 6px',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 800 }}>{r.rackId}</div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: isSelected ? '#93C5FD' : buyerColor, marginTop: '2px' }}>
                          {r.dedicatedBuyer}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shelf Customizer Editor on Right */}
              <div
                style={{
                  background: 'var(--card-bg, #ffffff)',
                  border: '1px solid var(--border, #E2E8F0)',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '10px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                        Configure Rack Matrix
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F274E' }}>
                        {activeRack.rackId}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={handleResetRackToDefault}
                        style={{ padding: '5px 10px', borderRadius: '4px', background: '#F1F5F9', border: '1px solid #CBD5E1', fontSize: '11px', fontWeight: 650, cursor: 'pointer' }}
                      >
                        Reset Default
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveRackLayout}
                        style={{ padding: '5px 14px', borderRadius: '4px', background: '#059669', color: '#FFFFFF', border: 'none', fontSize: '11.5px', fontWeight: 750, cursor: 'pointer' }}
                      >
                        Save Configuration
                      </button>
                    </div>
                  </div>

                  {/* Re-assign Rack Buyer */}
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E' }}>Dedicated Buyer:</label>
                    <select
                      value={customRackBuyer}
                      onChange={e => setCustomRackBuyer(e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: '4px', border: '1.5px solid #0284C7', fontWeight: 700, fontSize: '12px' }}
                    >
                      <option value="ONLY">ONLY</option>
                      <option value="OVS">OVS</option>
                      <option value="BS-ONS">BS-ONS</option>
                      <option value="BS-NMT">BS-NMT</option>
                      <option value="UTG">UTG</option>
                      <option value="GENERAL">GENERAL</option>
                      <option value="FAST_REACT">FAST_REACT</option>
                    </select>
                  </div>
                </div>

                {/* 12 Shelves Dedicated Item / Category Customization */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {customShelvesState.map((shelf, idx) => (
                    <div
                      key={shelf.shelfNo}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F274E' }}>
                          Shelf {shelf.shelfNo.toString().padStart(2, '0')}
                        </span>
                        
                        <select
                          value={shelf.assignedCategory}
                          onChange={e => {
                            const val = e.target.value as TrimsCategory;
                            setCustomShelvesState(prev => prev.map((s, i) => i === idx ? { ...s, assignedCategory: val } : s));
                          }}
                          style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, border: '1px solid #CBD5E1' }}
                        >
                          <option value="LABEL">LABEL (Main / Care)</option>
                          <option value="POLY">POLY (Poly Bag)</option>
                          <option value="PACKAGING">PACKAGING (Hangtag / Card)</option>
                          <option value="THREAD">THREAD (Sewing Thread)</option>
                          <option value="ELASTIC">ELASTIC (Waist / Leg)</option>
                          <option value="ZIPPER">ZIPPER (Metal / Nylon)</option>
                          <option value="BUTTON">BUTTON (Eyelet / Rivet)</option>
                          <option value="TAPE">TAPE (Twill / Drawcord)</option>
                          <option value="CARTON">CARTON (Shipping Box)</option>
                          <option value="OTHER">OTHER (Lace / Badges)</option>
                        </select>
                      </div>

                      <input
                        type="text"
                        value={shelf.itemSummary}
                        onChange={e => {
                          const val = e.target.value;
                          setCustomShelvesState(prev => prev.map((s, i) => i === idx ? { ...s, itemSummary: val } : s));
                        }}
                        placeholder="Dedicated description or items..."
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '11.5px', background: '#FFFFFF' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 6: STOCK FOR REUSE (SURPLUS & LEFTOVER TRIMS)                    */}
      {/* ==================================================================== */}
      {activeTab === 'REUSE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header & KPI Summary */}
          <div
            style={{
              background: 'linear-gradient(135deg, #78350F 0%, #B45309 100%)',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '16px 20px',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: '#FDE68A', fontWeight: 700, textTransform: 'uppercase' }}>
                Zero-Waste Sustainability & Cost Recovery Desk
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0', color: '#FFFFFF' }}>
                Surplus Trims Stock for Production Reuse
              </h2>
</div>

            <div style={{ display: 'flex', gap: '12px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '8px 14px', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#FDE68A' }}>Surplus Lots</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{surplusTrims.length} Lots</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '8px 14px', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#FDE68A' }}>Reuse Opportunity</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>High Quality</div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border, #E2E8F0)',
              borderRadius: '8px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Filter Category:</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['ALL', 'THREAD', 'ELASTIC', 'BUTTON', 'TAPE', 'PACKAGING'] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setReuseCategoryFilter(cat)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '4px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: reuseCategoryFilter === cat ? '1px solid #B45309' : '1px solid #CBD5E1',
                    background: reuseCategoryFilter === cat ? '#B45309' : '#FFFFFF',
                    color: reuseCategoryFilter === cat ? '#FFFFFF' : '#334155'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Surplus Table */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border, #E2E8F0)',
              borderRadius: '8px',
              overflowX: 'auto',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#78350F', color: '#FFFFFF', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '9px 12px' }}>Surplus Item</th>
                  <th style={{ padding: '9px 10px' }}>Category</th>
                  <th style={{ padding: '9px 10px' }}>Available Qty</th>
                  <th style={{ padding: '9px 10px' }}>Unit</th>
                  <th style={{ padding: '9px 10px' }}>Origin Job</th>
                  <th style={{ padding: '9px 10px' }}>Buyer</th>
                  <th style={{ padding: '9px 10px' }}>Current Location</th>
                  <th style={{ padding: '9px 10px' }}>Condition</th>
                  <th style={{ padding: '9px 12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSurplusTrims.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0F274E' }}>{s.itemName}</td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        {s.category}
                      </span>
                    </td>
                    <td style={{ padding: '9px 10px', fontWeight: 800, color: '#059669', fontSize: '13px' }}>
                      {s.availableQty.toLocaleString()}
                    </td>
                    <td style={{ padding: '9px 10px', fontWeight: 600, color: '#0284C7' }}>{s.unit}</td>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: '#0F274E' }}>{s.originJobNo}</td>
                    <td style={{ padding: '9px 10px', color: '#475569' }}>{s.buyer}</td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{ fontSize: '11px', background: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        {s.rackShelf}
                      </span>
                    </td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>
                        {s.condition}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setAllocateModalItem(s);
                          setAllocateQty(s.availableQty);
                        }}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '4px',
                          background: '#B45309',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Allocate to Job
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Allocate Modal */}
          {allocateModalItem && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '16px'
              }}
            >
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '10px',
                  width: '100%',
                  maxWidth: '500px',
                  padding: '24px',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
                }}
              >
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 10px', color: '#1E293B' }}>
                  Allocate Surplus Trims to Production Job
                </h3>
                <div style={{ fontSize: '13px', color: '#475569', marginBottom: '14px' }}>
                  Item: <strong>{allocateModalItem.itemName}</strong><br />
                  Available: <strong>{allocateModalItem.availableQty} {allocateModalItem.unit}</strong> at {allocateModalItem.rackShelf}
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Target Job No:</label>
                  <input
                    type="text"
                    placeholder="e.g. 48085"
                    value={allocateTargetJob}
                    onChange={e => setAllocateTargetJob(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 600 }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Allocate Quantity ({allocateModalItem.unit}):</label>
                  <input
                    type="number"
                    min="1"
                    max={allocateModalItem.availableQty}
                    value={allocateQty}
                    onChange={e => setAllocateQty(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 700 }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setAllocateModalItem(null)}
                    style={{ padding: '8px 14px', borderRadius: '6px', background: '#F1F5F9', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAllocation}
                    style={{ padding: '8px 16px', borderRadius: '6px', background: '#B45309', color: '#FFFFFF', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Confirm Reallocation
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 7: STORE TV LIVE DISPLAY                                         */}
      {/* ==================================================================== */}
      {activeTab === 'TV' && (
        <div
          style={{
            background: '#071F42',
            color: '#FFFFFF',
            borderRadius: '10px',
            padding: '24px',
            minHeight: '75vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {/* TV Header with Mode Toggle */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#A4D92C', color: '#071F42', padding: '8px 12px', borderRadius: '8px', fontWeight: 900, fontSize: '18px' }}>
                📺 TV
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  TRIMS STORE LIVE KIOSK & QUICK LOCATION FINDER
                </div>
</div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setTvViewMode('JOB_FINDER')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: 'none',
                  background: tvViewMode === 'JOB_FINDER' ? '#A4D92C' : 'rgba(255,255,255,0.1)',
                  color: tvViewMode === 'JOB_FINDER' ? '#071F42' : '#FFFFFF'
                }}
              >
                🔍 Quick Job Location Finder
              </button>
              <button
                type="button"
                onClick={() => setTvViewMode('LAYOUT_MAP')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: 'none',
                  background: tvViewMode === 'LAYOUT_MAP' ? '#A4D92C' : 'rgba(255,255,255,0.1)',
                  color: tvViewMode === 'LAYOUT_MAP' ? '#071F42' : '#FFFFFF'
                }}
              >
                🗺️ Store Layout Map (40 Racks)
              </button>
            </div>
          </div>

          {/* Mode A: Quick Job Location Finder */}
          {tvViewMode === 'JOB_FINDER' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Massive TV Search Bar with Recent Searches */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.06)', padding: '12px 18px', borderRadius: '10px' }}>
                <Search size={24} color="#A4D92C" />
                <input
                  type="text"
                  placeholder="SCAN BARCODE OR ENTER JOB NO (e.g. 48002, 46755, 48085)..."
                  value={tvSearchJob}
                  onChange={e => setTvSearchJob(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    fontSize: '20px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    outline: 'none'
                  }}
                />

                {/* Recent Searches on TV bar */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Recent:</span>
                  {recentSearches.map(jobNo => (
                    <button
                      key={jobNo}
                      type="button"
                      onClick={() => setTvSearchJob(jobNo)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: tvSearchJob.replace(/#/g, '').trim() === jobNo ? '1px solid #A4D92C' : '1px solid rgba(255,255,255,0.2)',
                        background: tvSearchJob.replace(/#/g, '').trim() === jobNo ? '#A4D92C' : 'rgba(255,255,255,0.1)',
                        color: tvSearchJob.replace(/#/g, '').trim() === jobNo ? '#071F42' : '#FFFFFF'
                      }}
                    >
                      {jobNo}
                    </button>
                  ))}
                  {tvSearchJob && (
                    <button
                      type="button"
                      onClick={() => setTvSearchJob('')}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.15)',
                        border: 'none',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {tvSelectedJob ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '12px 16px', borderRadius: '8px', marginBottom: '14px' }}>
                    <div>
                      <span style={{ fontSize: '13px', color: '#93C5FD' }}>JOB {tvSelectedJob.jobNo} • {tvSelectedJob.buyer}</span>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>{tvSelectedJob.styleNo} — {tvSelectedJob.itemDescription}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '12px', color: '#CBD5E1' }}>SEWING LINE: <strong>{tvSelectedJob.sewingLine}</strong></span>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#A4D92C' }}>{tvSelectedJob.orderQty.toLocaleString()} PCS</div>
                    </div>
                  </div>

                  {/* High-Contrast Location Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                    {tvSelectedJob.items.map(it => (
                      <div
                        key={it.id}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '8px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', background: '#0284C7', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              {it.category}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: it.qualityStatus === 'PASS' ? '#34D399' : '#F87171' }}>
                              {it.qualityStatus === 'PASS' ? '✓ QUALITY PASSED' : '⚠️ ' + it.qualityStatus}
                            </span>
                          </div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', marginTop: '8px' }}>
                            {it.itemName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                            In Stock: <strong style={{ color: '#38BDF8' }}>{it.receivedQty.toLocaleString()} {it.unit}</strong> (Req: {it.totalOrderQty.toLocaleString()})
                          </div>
                        </div>

                        {/* Location Badge */}
                        <div
                          style={{
                            marginTop: '14px',
                            background: '#0F274E',
                            border: '1.5px solid #38BDF8',
                            borderRadius: '6px',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <span style={{ fontSize: '12px', color: '#93C5FD', fontWeight: 700 }}>EXACT LOCATION</span>
                          <span style={{ fontSize: '17px', fontWeight: 900, color: '#A4D92C', letterSpacing: '0.05em' }}>
                            📍 {it.rackNo} | {it.shelfNo}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Rich Floor & Active Items Overview When No Job Searched */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#38BDF8', fontWeight: 700 }}>ZONE A: WEST WING</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>R-01 to R-16</div>
                      <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '2px' }}>Dedicated to: ONLY & OVS Orders</div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#F59E0B', fontWeight: 700 }}>ZONE B: CENTER BAY</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>R-17 to R-30</div>
                      <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '2px' }}>Dedicated to: BS-ONS & BS-NMT Orders</div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 700 }}>ZONE C: EAST DECK</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>R-31 to R-40</div>
                      <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '2px' }}>Dedicated to: UTG & General Surplus</div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#A4D92C', fontWeight: 700 }}>ACTIVE STORAGE CAPACITY</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>480 Total Shelves</div>
                      <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '2px' }}>Scan barcode or pick a recent Job above</div>
                    </div>
                  </div>

                  {/* Active Fast-Moving Trims Directory */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#A4D92C', marginBottom: '10px' }}>
                      FAST-MOVING TRIMS ACTIVE STORAGE LOCATIONS:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '11px', color: '#93C5FD' }}>JOB 48002 (ONLY)</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>Main Label & Care Label</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#A4D92C', marginTop: '4px' }}>📍 R-01 | S-01, S-02</div>
                      </div>

                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '11px', color: '#93C5FD' }}>JOB 48002 (ONLY)</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>Waist Elastic 3.5cm</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#A4D92C', marginTop: '4px' }}>📍 R-02 | S-03</div>
                      </div>

                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '11px', color: '#93C5FD' }}>JOB 46755 (OVS)</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>Care Label & Sewing Thread 40/2</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#A4D92C', marginTop: '4px' }}>📍 R-09 | S-01, S-04</div>
                      </div>

                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '11px', color: '#93C5FD' }}>JOB 48906 (UTG)</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>UTG Active Main & Care Labels</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#A4D92C', marginTop: '4px' }}>📍 R-31 | S-01, S-02</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode B: Visual Store Layout Map */}
          {tvViewMode === 'LAYOUT_MAP' && (
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#93C5FD', marginBottom: '10px' }}>
                40-RACK WAREHOUSE OCCUPANCY & BUYER ALLOCATION MAP
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: '8px'
                }}
              >
                {racks.map(r => {
                  const buyerColor =
                    r.dedicatedBuyer === 'ONLY' ? '#3B82F6' :
                    r.dedicatedBuyer === 'OVS' ? '#8B5CF6' :
                    r.dedicatedBuyer === 'BS-ONS' ? '#F59E0B' :
                    r.dedicatedBuyer === 'BS-NMT' ? '#EC4899' :
                    r.dedicatedBuyer === 'UTG' ? '#10B981' : '#64748B';

                  const occupiedCount = r.shelves.filter(s => s.occupancyPct > 0).length;

                  return (
                    <div
                      key={r.rackId}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderTop: `4px solid ${buyerColor}`,
                        borderRadius: '6px',
                        padding: '10px 8px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 900 }}>{r.rackId}</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: buyerColor }}>{r.dedicatedBuyer}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{occupiedCount} / 12 In-Use</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
