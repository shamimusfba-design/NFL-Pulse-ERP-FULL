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
  Eye,
  Info,
  SlidersHorizontal,
  Tag,
  Warehouse
} from 'lucide-react';

// ============================================================================
// DATA STRUCTURES & TYPES
// ============================================================================

export type TrimsCategory = 'LABEL' | 'THREAD' | 'ELASTIC' | 'ZIPPER' | 'BUTTON' | 'TAPE' | 'PACKAGING' | 'OTHER';
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
  jobNo: string;
  buyer: string;
  styleNo: string;
  itemDescription: string;
  orderQty: number;
  merchandiser: string;
  shipmentDate: string;
  tnaSlot: string; // e.g. "Jan 1 '26", "Jan 2 '26", "Feb 1 '26"
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
  dedicatedBuyer: string; // ONLY, OVS, BS-ONS, BS-NMT, UTG, GENERAL
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
  // R-37 to R-40: GENERAL / REUSE
  for (let i = 37; i <= 40; i++) buyerMap[i] = 'GENERAL';

  const catList: TrimsCategory[] = ['LABEL', 'THREAD', 'ELASTIC', 'ZIPPER', 'BUTTON', 'TAPE', 'PACKAGING', 'OTHER'];

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
        requiredQty: 70, // 350,000m / 5,000m cone
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
        requiredQty: 156, // 780,120m / 5000
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
    presentStatus: 'Checklist Due',
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
      const saved = localStorage.getItem('nfl_trims_checklists_v2');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return INITIAL_CHECKLISTS;
  });

  const [racks, setRacks] = useState<StoreRack[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nfl_trims_racks_v2');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return generateDefaultRacks();
  });

  const [surplusTrims, setSurplusTrims] = useState<SurplusTrimsRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nfl_trims_surplus_v2');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return INITIAL_SURPLUS_TRIMS;
  });

  // Save changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nfl_trims_checklists_v2', JSON.stringify(checklists));
    }
  }, [checklists]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nfl_trims_racks_v2', JSON.stringify(racks));
    }
  }, [racks]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nfl_trims_surplus_v2', JSON.stringify(surplusTrims));
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

  // Update URL on tab change without full reload
  const handleTabChange = (t: typeof activeTab) => {
    setActiveTab(t);
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
  // TAB 1: CHECKLIST REQUESTS STATE & ACTIONS
  // ==========================================================================
  const [checklistFilter, setChecklistFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REVIEW_REQUESTED'>('ALL');
  const [reviewModalJob, setReviewModalJob] = useState<TrimsChecklistRecord | null>(null);
  const [reviewNoteInput, setReviewNoteInput] = useState('');

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
        return {
          ...c,
          checklistStatus: 'ACCEPTED',
          presentStatus: c.presentStatus === 'Checklist Due' ? 'Ordering Due' : c.presentStatus,
          acceptedAt: new Date().toISOString().split('T')[0],
          acceptedBy: 'Trims Store In-charge'
        };
      }
      return c;
    }));
    showNotification('success', `Checklist for Job #${checklists.find(c => c.id === jobId)?.jobNo} accepted. Ready for physical receiving.`);
  };

  const handleSendReviewRequest = () => {
    if (!reviewModalJob || !reviewNoteInput.trim()) return;
    setChecklists(prev => prev.map(c => {
      if (c.id === reviewModalJob.id) {
        return {
          ...c,
          checklistStatus: 'REVIEW_REQUESTED',
          storeReviewNote: reviewNoteInput.trim(),
          reviewRequestedAt: new Date().toISOString().split('T')[0]
        };
      }
      return c;
    }));
    showNotification('danger', `Need Review sent to Merchandiser ${reviewModalJob.merchandiser} for Job #${reviewModalJob.jobNo}.`);
    setReviewModalJob(null);
    setReviewNoteInput('');
  };

  // ==========================================================================
  // TAB 2: ORDER RECEIVE STATE & ACTIONS
  // ==========================================================================
  const [receiveSearchJob, setReceiveSearchJob] = useState('48002');
  const selectedReceiveJob = useMemo(() => {
    return checklists.find(c => c.jobNo === receiveSearchJob.trim()) || null;
  }, [checklists, receiveSearchJob]);

  // Local draft of receiving quantities: { [itemId]: { receiveQty, qualityStatus, rackNo, shelfNo } }
  const [receiveFormState, setReceiveFormState] = useState<Record<string, { receiveQty: number; qualityStatus: QualityStatus; rackNo: string; shelfNo: string }>>({});

  // Sync draft whenever selectedReceiveJob changes
  useEffect(() => {
    if (selectedReceiveJob) {
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

        // Determine new presentStatus
        const allReceived = updatedItems.every(i => i.balanceQty === 0);
        const anyReceived = updatedItems.some(i => i.receivedQty > 0);
        const hasFailedStatus = updatedItems.some(i => i.qualityStatus === 'FAIL');

        let nextStatus: PresentJobStatus = c.presentStatus;
        if (hasFailedStatus) {
          nextStatus = 'Inspection Fail';
        } else if (allReceived) {
          nextStatus = 'Receive OK';
        } else if (anyReceived) {
          nextStatus = 'Partial Received Due';
        }

        return {
          ...c,
          presentStatus: nextStatus,
          items: updatedItems
        };
      }
      return c;
    }));

    if (hasFail) {
      showNotification('danger', `⚠️ Inspection FAIL recorded for: ${failedItemsNames.join(', ')}. Automated rejection notification dispatched to Merchandiser ${selectedReceiveJob.merchandiser}.`);
    } else {
      showNotification('success', `Trims received successfully for Job #${selectedReceiveJob.jobNo}. Present stock updated.`);
    }
  };

  // ==========================================================================
  // TAB 3: PRESENT STOCK STATE, FILTERS & DETAIL MODAL
  // ==========================================================================
  const [stockBuyerFilter, setStockBuyerFilter] = useState('ALL');
  const [stockMerchFilter, setStockMerchFilter] = useState('ALL');
  const [stockTnaSlotFilter, setStockTnaSlotFilter] = useState('ALL');
  const [stockSewingFilter, setStockSewingFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('ALL');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [detailModalJob, setDetailModalJob] = useState<TrimsChecklistRecord | null>(null);
  const [detailModalFullscreen, setDetailModalFullscreen] = useState(false);

  // Filtered master stock list
  const filteredStockJobs = useMemo(() => {
    return checklists.filter(j => {
      if (stockBuyerFilter !== 'ALL' && j.buyer !== stockBuyerFilter) return false;
      if (stockMerchFilter !== 'ALL' && j.merchandiser !== stockMerchFilter) return false;
      if (stockTnaSlotFilter !== 'ALL' && j.tnaSlot !== stockTnaSlotFilter) return false;
      if (stockSewingFilter !== 'ALL' && !j.sewingLine.includes(stockSewingFilter)) return false;
      if (stockStatusFilter !== 'ALL' && j.presentStatus !== stockStatusFilter) return false;
      if (stockSearchQuery.trim()) {
        const q = stockSearchQuery.toLowerCase();
        return j.jobNo.toLowerCase().includes(q) ||
               j.styleNo.toLowerCase().includes(q) ||
               j.buyer.toLowerCase().includes(q) ||
               j.merchandiser.toLowerCase().includes(q);
      }
      return true;
    });
  }, [checklists, stockBuyerFilter, stockMerchFilter, stockTnaSlotFilter, stockSewingFilter, stockStatusFilter, stockSearchQuery]);

  // Overall KPIs
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
      if (j.presentStatus === 'Partial Received Due') partialReceivedJobsCount++;
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

  // ==========================================================================
  // TAB 4: ORDER DELIVERY STATE & ACTIONS
  // ==========================================================================
  const [deliverySearchJob, setDeliverySearchJob] = useState('48002');
  const selectedDeliveryJob = useMemo(() => {
    return checklists.find(c => c.jobNo === deliverySearchJob.trim()) || null;
  }, [checklists, deliverySearchJob]);

  // Selected items checkboxes and issue qty
  const [deliveryCheckedMap, setDeliveryCheckedMap] = useState<Record<string, boolean>>({});
  const [deliveryQtyMap, setDeliveryQtyMap] = useState<Record<string, number>>({});
  const [deliveryGatePassIssued, setDeliveryGatePassIssued] = useState<string | null>(null);

  // Sync delivery maps when selected delivery job changes
  useEffect(() => {
    if (selectedDeliveryJob) {
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

        const allDelivered = updatedItems.every(i => i.receivedQty > 0 && i.deliveredQty >= i.receivedQty);
        const anyDelivered = updatedItems.some(i => i.deliveredQty > 0);

        let nextStatus: PresentJobStatus = c.presentStatus;
        if (allDelivered) {
          nextStatus = 'Delivery Done';
        } else if (anyDelivered) {
          nextStatus = 'Delivery Running';
        }

        return {
          ...c,
          presentStatus: nextStatus,
          items: updatedItems
        };
      }
      return c;
    }));

    const gpNumber = `GP-TRIM-${selectedDeliveryJob.jobNo}-${Math.floor(1000 + Math.random() * 9000)}`;
    setDeliveryGatePassIssued(gpNumber);
    showNotification('success', `Issued Gate Pass ${gpNumber} for Job #${selectedDeliveryJob.jobNo} (${itemsIssuedCount} items dispatched to ${selectedDeliveryJob.sewingLine}).`);
  };

  // ==========================================================================
  // TAB 5: LOCATION TRACKING STATE & ACTIONS
  // ==========================================================================
  const [locationSubTab, setLocationSubTab] = useState<'LAYOUT' | 'JOB_SEARCH'>('LAYOUT');
  const [selectedRackId, setSelectedRackId] = useState<string>('R-01');
  const [locationJobQuery, setLocationJobQuery] = useState('48002');

  const activeRack = useMemo(() => {
    return racks.find(r => r.rackId === selectedRackId) || racks[0];
  }, [racks, selectedRackId]);

  const searchedJobLocations = useMemo(() => {
    const job = checklists.find(c => c.jobNo === locationJobQuery.trim());
    if (!job) return null;
    return job;
  }, [checklists, locationJobQuery]);

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

    showNotification('success', `Successfully allocated ${allocateQty} ${allocateModalItem.unit} of ${allocateModalItem.itemName} to Job #${allocateTargetJob.trim()} from surplus stock.`);
    setAllocateModalItem(null);
    setAllocateTargetJob('');
    setAllocateQty(0);
  };

  // ==========================================================================
  // TAB 7: STORE TV DISPLAY STATE
  // ==========================================================================
  const [tvSearchJob, setTvSearchJob] = useState('48002');
  const [tvViewMode, setTvViewMode] = useState<'JOB_FINDER' | 'LAYOUT_MAP'>('JOB_FINDER');

  const tvSelectedJob = useMemo(() => {
    return checklists.find(c => c.jobNo === tvSearchJob.trim()) || null;
  }, [checklists, tvSearchJob]);

  // Unique Filter Options
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
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 600,
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

      {/* Main Sub-Navigation Bar */}
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
          <span>📺 Store TV Display</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: CHECKLIST REQUESTS                                            */}
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
                Merchandising & Planning Integration Desk
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0', color: '#FFFFFF' }}>
                Trims Checklist Requests & Verification
              </h2>
              <p style={{ fontSize: '13px', color: '#CBD5E1', margin: 0, maxWidth: '800px' }}>
                Verify incoming trims requisitions against physical garment samples. Store cannot alter requirement numbers;
                discrepancies trigger <strong>Need Review by Merchandiser</strong>, or <strong>Accept</strong> to release to Order Receive.
              </p>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['ALL', 'PENDING', 'ACCEPTED', 'REVIEW_REQUESTED'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setChecklistFilter(f)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: checklistFilter === f ? '#38BDF8' : 'rgba(255,255,255,0.1)',
                    color: checklistFilter === f ? '#0F274E' : '#FFFFFF'
                  }}
                >
                  {f === 'ALL' && 'All Requests'}
                  {f === 'PENDING' && 'Pending Verification'}
                  {f === 'ACCEPTED' && 'Accepted'}
                  {f === 'REVIEW_REQUESTED' && 'Review Flagged'}
                </button>
              ))}
            </div>
          </div>

          {/* Checklist Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredChecklistRequests.map(chk => (
              <div
                key={chk.id}
                style={{
                  background: 'var(--card-bg, #ffffff)',
                  border: chk.checklistStatus === 'REVIEW_REQUESTED' ? '1.5px solid #EF4444' : '1px solid var(--border, #E2E8F0)',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#0F274E', color: '#FFFFFF' }}>
                        JOB #{chk.jobNo}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284C7' }}>
                        {chk.buyer}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>• Style: <strong>{chk.styleNo}</strong></span>
                      <span style={{ fontSize: '11px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>
                        Slot: {chk.tnaSlot}
                      </span>
                      <span style={{ fontSize: '11px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>
                        Sewing: {chk.sewingLine}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>
                      {chk.itemDescription} (Order: {chk.orderQty.toLocaleString()} pcs)
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                      Merchandiser: <strong>{chk.merchandiser}</strong> • Requested Date: {chk.requestDate}
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {chk.checklistStatus === 'ACCEPTED' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ECFDF5', color: '#047857', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                        <CheckCircle2 size={15} />
                        <span>Accepted ({chk.acceptedAt})</span>
                      </div>
                    ) : chk.checklistStatus === 'REVIEW_REQUESTED' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FEF2F2', color: '#B91C1C', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                        <AlertTriangle size={15} />
                        <span>Review Requested ({chk.reviewRequestedAt})</span>
                      </div>
                    ) : (
                      <span style={{ background: '#FFFBEB', color: '#B45309', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                        Awaiting Store Review
                      </span>
                    )}

                    {chk.checklistStatus !== 'ACCEPTED' && (
                      <button
                        type="button"
                        onClick={() => handleAcceptChecklist(chk.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#047857',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>Accept Checklist</span>
                      </button>
                    )}

                    {chk.checklistStatus !== 'REVIEW_REQUESTED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewModalJob(chk);
                          setReviewNoteInput(chk.storeReviewNote || '');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#DC2626',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <AlertTriangle size={14} />
                        <span>Need Review</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Review Note Display if flagged */}
                {chk.storeReviewNote && (
                  <div style={{ marginTop: '10px', padding: '8px 12px', background: '#FEF2F2', borderLeft: '3px solid #DC2626', borderRadius: '4px', fontSize: '12.5px', color: '#991B1B' }}>
                    <strong>Discrepancy Note to Merchandiser:</strong> {chk.storeReviewNote}
                  </div>
                )}

                {/* Itemized Table */}
                <div style={{ marginTop: '12px', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '6px 10px' }}>Trims / Accessories Name</th>
                        <th style={{ padding: '6px 8px' }}>Category</th>
                        <th style={{ padding: '6px 8px' }}>Unit</th>
                        <th style={{ padding: '6px 8px' }}>Consumption</th>
                        <th style={{ padding: '6px 8px' }}>Source</th>
                        <th style={{ padding: '6px 8px' }}>Required Qty</th>
                        <th style={{ padding: '6px 8px' }}>Extra %</th>
                        <th style={{ padding: '6px 8px' }}>Total Order Qty</th>
                        <th style={{ padding: '6px 8px' }}>Assigned Storage</th>
                        <th style={{ padding: '6px 8px' }}>Supplier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chk.items.map(it => (
                        <tr key={it.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '7px 10px', fontWeight: 650, color: '#1E293B' }}>{it.itemName}</td>
                          <td style={{ padding: '7px 8px' }}>
                            <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', background: '#E2E8F0', color: '#334155', fontWeight: 600 }}>
                              {it.category}
                            </span>
                          </td>
                          <td style={{ padding: '7px 8px', fontWeight: 600, color: '#0284C7' }}>{it.unit}</td>
                          <td style={{ padding: '7px 8px' }}>
                            <strong>{it.consumption}</strong> <span style={{ fontSize: '11px', color: '#64748B' }}>{it.consumptionUnit}</span>
                          </td>
                          <td style={{ padding: '7px 8px', fontSize: '11px', color: '#64748B' }}>{it.consumptionSource}</td>
                          <td style={{ padding: '7px 8px', color: '#334155' }}>{it.requiredQty.toLocaleString()}</td>
                          <td style={{ padding: '7px 8px', color: '#64748B' }}>{it.wastagePct}%</td>
                          <td style={{ padding: '7px 8px', fontWeight: 700, color: '#0F274E' }}>{it.totalOrderQty.toLocaleString()}</td>
                          <td style={{ padding: '7px 8px' }}>
                            <span style={{ fontSize: '11px', background: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              {it.rackNo} | {it.shelfNo}
                            </span>
                          </td>
                          <td style={{ padding: '7px 8px', fontSize: '11.5px', color: '#475569' }}>{it.supplierName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Need Review Discrepancy Modal */}
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
                  maxWidth: '550px',
                  padding: '24px',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', marginBottom: '12px' }}>
                  <AlertTriangle size={24} />
                  <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#1E293B' }}>
                    Need Review by Merchandiser
                  </h3>
                </div>
                <p style={{ fontSize: '13px', color: '#475569', marginBottom: '14px' }}>
                  Job <strong>#{reviewModalJob.jobNo}</strong> ({reviewModalJob.buyer} - {reviewModalJob.styleNo}).<br />
                  Specify the mismatch found on the physical trims sample or requirements. Merchandiser <strong>{reviewModalJob.merchandiser}</strong> will be alerted immediately.
                </p>

                <textarea
                  rows={4}
                  value={reviewNoteInput}
                  onChange={e => setReviewNoteInput(e.target.value)}
                  placeholder="e.g. Zipper length on physical sample is 20cm instead of 18cm. Care label font size is smaller than buyer master standard. Please clarify..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    marginBottom: '16px'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setReviewModalJob(null)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendReviewRequest}
                    disabled={!reviewNoteInput.trim()}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: reviewNoteInput.trim() ? '#DC2626' : '#94A3B8',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: reviewNoteInput.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Submit Review Request
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
          {/* Top Job Search Bar */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border, #E2E8F0)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '300px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} color="#64748B" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Type or select Job # (e.g. 48002, 46755, 48085, 48903, 48906)..."
                  value={receiveSearchJob}
                  onChange={e => setReceiveSearchJob(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 34px',
                    borderRadius: '6px',
                    border: '1.5px solid #0284C7',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                />
              </div>

              {/* Quick Job Selector Chips */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {checklists.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setReceiveSearchJob(c.jobNo)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: receiveSearchJob === c.jobNo ? '1px solid #0F274E' : '1px solid #CBD5E1',
                      background: receiveSearchJob === c.jobNo ? '#0F274E' : '#F8FAFC',
                      color: receiveSearchJob === c.jobNo ? '#FFFFFF' : '#334155'
                    }}
                  >
                    #{c.jobNo} ({c.buyer})
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Batch Actions */}
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
                    background: '#059669',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Pass All Quality</span>
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
                    background: '#0F274E',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 750,
                    cursor: 'pointer'
                  }}
                >
                  <Save size={15} />
                  <span>Save Received Trims</span>
                </button>
              </div>
            )}
          </div>

          {/* Job Facts Header */}
          {selectedReceiveJob ? (
            <div
              style={{
                background: 'linear-gradient(90deg, #F0F9FF 0%, #E0F2FE 100%)',
                border: '1px solid #BAE6FD',
                borderRadius: '8px',
                padding: '14px 18px',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#0369A1', fontWeight: 800 }}>
                  Active Receiving Job Details
                </div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#0C4A6E' }}>
                  Job #{selectedReceiveJob.jobNo} — {selectedReceiveJob.buyer} ({selectedReceiveJob.styleNo})
                </div>
                <div style={{ fontSize: '13px', color: '#0369A1', marginTop: '2px' }}>
                  {selectedReceiveJob.itemDescription}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Order Qty</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F274E' }}>
                    {selectedReceiveJob.orderQty.toLocaleString()} pcs
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>T&A Slot</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0284C7' }}>
                    {selectedReceiveJob.tnaSlot}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Shipment Date</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>
                    {selectedReceiveJob.shipmentDate}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Merchandiser</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>
                    {selectedReceiveJob.merchandiser}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: '#F8FAFC',
                border: '1px dashed #CBD5E1',
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
                color: '#64748B'
              }}
            >
              <Package size={32} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '14px', fontWeight: 650, color: '#334155' }}>No Job Selected for Receiving</div>
              <p style={{ fontSize: '12.5px', margin: '4px 0 0' }}>
                Type a Job # above or click on one of the quick chips to begin entry.
              </p>
            </div>
          )}

          {/* Receiving Table */}
          {selectedReceiveJob && (
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
                    <th style={{ padding: '9px 12px' }}>Trims / Accessories Item</th>
                    <th style={{ padding: '9px 8px' }}>Unit</th>
                    <th style={{ padding: '9px 8px' }}>Consumption</th>
                    <th style={{ padding: '9px 8px' }}>Required Qty</th>
                    <th style={{ padding: '9px 8px' }}>Extra %</th>
                    <th style={{ padding: '9px 8px' }}>Total Order</th>
                    <th style={{ padding: '9px 8px', background: '#1E3A8A' }}>Already Recv</th>
                    <th style={{ padding: '9px 8px', background: '#0284C7' }}>Now Receiving Qty</th>
                    <th style={{ padding: '9px 8px', background: '#1E3A8A' }}>Remaining Bal</th>
                    <th style={{ padding: '9px 8px' }}>Rack & Shelf Location</th>
                    <th style={{ padding: '9px 12px' }}>Quality Inspection</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReceiveJob.items.map(it => {
                    const entry = receiveFormState[it.id] || { receiveQty: 0, qualityStatus: 'PASS', rackNo: it.rackNo, shelfNo: it.shelfNo };
                    const currentRecvInput = Number(entry.receiveQty) || 0;
                    const prospectiveRemaining = Math.max(0, it.balanceQty - currentRecvInput);

                    return (
                      <tr key={it.id} style={{ borderBottom: '1px solid #F1F5F9', background: entry.qualityStatus === 'FAIL' ? '#FEF2F2' : 'transparent' }}>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ fontWeight: 700, color: '#0F274E' }}>{it.itemName}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>Supplier: {it.supplierName}</div>
                        </td>
                        <td style={{ padding: '8px 8px', fontWeight: 650, color: '#0284C7' }}>{it.unit}</td>
                        <td style={{ padding: '8px 8px' }}>
                          <strong>{it.consumption}</strong> <span style={{ fontSize: '11px', color: '#64748B' }}>{it.consumptionUnit}</span>
                        </td>
                        <td style={{ padding: '8px 8px', color: '#475569' }}>{it.requiredQty.toLocaleString()}</td>
                        <td style={{ padding: '8px 8px', color: '#64748B' }}>{it.wastagePct}%</td>
                        <td style={{ padding: '8px 8px', fontWeight: 700, color: '#1E293B' }}>{it.totalOrderQty.toLocaleString()}</td>
                        <td style={{ padding: '8px 8px', fontWeight: 600, color: '#059669' }}>{it.receivedQty.toLocaleString()}</td>

                        {/* Input Receive Qty */}
                        <td style={{ padding: '8px 8px', background: '#F0F9FF' }}>
                          <input
                            type="number"
                            min="0"
                            max={it.totalOrderQty}
                            value={entry.receiveQty}
                            onChange={e => {
                              const val = Math.max(0, Number(e.target.value));
                              setReceiveFormState(prev => ({
                                ...prev,
                                [it.id]: { ...entry, receiveQty: val }
                              }));
                            }}
                            style={{
                              width: '100px',
                              padding: '5px 8px',
                              borderRadius: '4px',
                              border: '1.5px solid #0284C7',
                              fontWeight: 700,
                              fontSize: '13px',
                              textAlign: 'right'
                            }}
                          />
                        </td>

                        {/* Remaining Balance */}
                        <td style={{ padding: '8px 8px', fontWeight: 700, color: prospectiveRemaining === 0 ? '#059669' : '#D97706' }}>
                          {prospectiveRemaining.toLocaleString()} {it.unit}
                          {prospectiveRemaining === 0 && <span style={{ marginLeft: '4px', fontSize: '11px' }}>✓</span>}
                        </td>

                        {/* Rack / Shelf Selector */}
                        <td style={{ padding: '8px 8px' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <select
                              value={entry.rackNo}
                              onChange={e => {
                                const val = e.target.value;
                                setReceiveFormState(prev => ({
                                  ...prev,
                                  [it.id]: { ...entry, rackNo: val }
                                }));
                              }}
                              style={{ padding: '4px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '11.5px', fontWeight: 600 }}
                            >
                              {racks.map(r => (
                                <option key={r.rackId} value={r.rackId}>{r.rackId} ({r.dedicatedBuyer})</option>
                              ))}
                            </select>

                            <select
                              value={entry.shelfNo}
                              onChange={e => {
                                const val = e.target.value;
                                setReceiveFormState(prev => ({
                                  ...prev,
                                  [it.id]: { ...entry, shelfNo: val }
                                }));
                              }}
                              style={{ padding: '4px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '11.5px', fontWeight: 600 }}
                            >
                              {Array.from({ length: 12 }, (_, i) => `S-${(i + 1).toString().padStart(2, '0')}`).map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* Quality Inspection Status */}
                        <td style={{ padding: '8px 12px' }}>
                          <select
                            value={entry.qualityStatus}
                            onChange={e => {
                              const val = e.target.value as QualityStatus;
                              setReceiveFormState(prev => ({
                                ...prev,
                                [it.id]: { ...entry, qualityStatus: val }
                              }));
                            }}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              fontSize: '12px',
                              border: entry.qualityStatus === 'PASS' ? '1px solid #059669' : '1.5px solid #DC2626',
                              background: entry.qualityStatus === 'PASS' ? '#ECFDF5' : '#FEF2F2',
                              color: entry.qualityStatus === 'PASS' ? '#047857' : '#B91C1C'
                            }}
                          >
                            <option value="PASS">✅ PASS</option>
                            <option value="FAIL">❌ FAIL</option>
                            <option value="PENDING">⏳ PENDING</option>
                          </select>
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
      {/* TAB 3: PRESENT STOCK (DASHBOARD & MASTER TABLE)                     */}
      {/* ==================================================================== */}
      {activeTab === 'STOCK' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top KPI Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px'
            }}
          >
            {/* Total Jobs */}
            <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>Total Jobs Tracked</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F274E', margin: '2px 0' }}>{stockKpis.totalJobs} Jobs</div>
              <div style={{ fontSize: '11.5px', color: '#0284C7', fontWeight: 600 }}>Active production runway</div>
            </div>

            {/* Total Order Qty */}
            <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>Garments Order Qty</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F274E', margin: '2px 0' }}>{stockKpis.totalOrderQty.toLocaleString()} pcs</div>
              <div style={{ fontSize: '11.5px', color: '#64748B' }}>Confirmed orders</div>
            </div>

            {/* Total Received Trims */}
            <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>Total Received Trims</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#059669', margin: '2px 0' }}>{stockKpis.totalReceivedItems.toLocaleString()}</div>
              <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>In warehouse inventory</div>
            </div>

            {/* Total Inspection Pass */}
            <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>Quality Pass Items</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#047857', margin: '2px 0' }}>{stockKpis.totalInspectionPass} Items</div>
              <div style={{ fontSize: '11.5px', color: '#047857' }}>Ready for floor issue</div>
            </div>

            {/* Total Inspection Fail (Clickable filter) */}
            <div
              onClick={() => setStockStatusFilter(prev => prev === 'Inspection Fail' ? 'ALL' : 'Inspection Fail')}
              style={{
                background: stockStatusFilter === 'Inspection Fail' ? '#FEF2F2' : '#FFFFFF',
                padding: '12px 14px',
                borderRadius: '8px',
                border: stockStatusFilter === 'Inspection Fail' ? '2px solid #DC2626' : '1px solid #FECACA',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}
              title="Click to filter table to failed jobs"
            >
              <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700, textTransform: 'uppercase' }}>Quality Fail (Click Filter)</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#DC2626', margin: '2px 0' }}>{stockKpis.totalInspectionFail} Items</div>
              <div style={{ fontSize: '11.5px', color: '#991B1B', fontWeight: 600 }}>Supplier reject follow-up</div>
            </div>

            {/* Total Delivered to Sewing */}
            <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>Total Delivered</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#0284C7', margin: '2px 0' }}>{stockKpis.totalDeliveredUnits.toLocaleString()}</div>
              <div style={{ fontSize: '11.5px', color: '#0284C7', fontWeight: 600 }}>Dispatched to floor</div>
            </div>

            {/* Partial Received */}
            <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>Partial Received</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#D97706', margin: '2px 0' }}>{stockKpis.partialReceivedJobsCount} Jobs</div>
              <div style={{ fontSize: '11.5px', color: '#D97706', fontWeight: 600 }}>Supplier delivery pending</div>
            </div>

            {/* Order Confirmed vs Checklist Received */}
            <div style={{ background: '#FFFFFF', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>Confirmed vs Checklist</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#0F274E', margin: '3px 0' }}>
                {stockKpis.totalJobs} / {stockKpis.acceptedChecklistsCount} Accepted
              </div>
              <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
                {Math.round((stockKpis.acceptedChecklistsCount / stockKpis.totalJobs) * 100)}% coverage
              </div>
            </div>
          </div>

          {/* Compact Filter Toolbar */}
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
            {(stockBuyerFilter !== 'ALL' || stockMerchFilter !== 'ALL' || stockStatusFilter !== 'ALL' || stockSearchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setStockBuyerFilter('ALL');
                  setStockMerchFilter('ALL');
                  setStockTnaSlotFilter('ALL');
                  setStockSewingFilter('ALL');
                  setStockStatusFilter('ALL');
                  setStockSearchQuery('');
                }}
                style={{ padding: '5px 10px', borderRadius: '4px', background: '#F1F5F9', border: '1px solid #CBD5E1', fontSize: '11.5px', cursor: 'pointer' }}
              >
                Reset
              </button>
            )}
          </div>

          {/* Master Stock Table */}
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
                  <th style={{ padding: '9px 10px' }}>Job #</th>
                  <th style={{ padding: '9px 10px' }}>Style #</th>
                  <th style={{ padding: '9px 10px' }}>Order Qty</th>
                  <th style={{ padding: '9px 10px' }}>Present Status</th>
                  <th style={{ padding: '9px 10px' }}>Merchandiser</th>
                  <th style={{ padding: '9px 10px' }}>T&A Slot</th>
                  <th style={{ padding: '9px 10px' }}>Shipment Date</th>
                  <th style={{ padding: '9px 10px' }}>Racks Stored</th>
                  <th style={{ padding: '9px 10px' }}>Delivery Progress</th>
                  <th style={{ padding: '9px 12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStockJobs.map(j => {
                  const totalReq = j.items.reduce((acc, it) => acc + it.totalOrderQty, 0);
                  const totalRecv = j.items.reduce((acc, it) => acc + it.receivedQty, 0);
                  const totalDeliv = j.items.reduce((acc, it) => acc + it.deliveredQty, 0);
                  const delivPct = totalRecv > 0 ? Math.round((totalDeliv / totalRecv) * 100) : 0;
                  const uniqueRacks = Array.from(new Set(j.items.map(it => it.rackNo))).filter(Boolean);

                  return (
                    <tr
                      key={j.id}
                      style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}
                      onClick={() => setDetailModalJob(j)}
                    >
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0284C7' }}>{j.buyer}</td>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{ fontWeight: 800, color: '#0F274E', textDecoration: 'underline' }}>
                          #{j.jobNo}
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
                              j.presentStatus === 'Receive OK' || j.presentStatus === 'Delivery Done' ? '#ECFDF5' :
                              j.presentStatus === 'Inspection Fail' ? '#FEF2F2' :
                              j.presentStatus === 'Partial Received Due' ? '#FFFBEB' : '#F1F5F9',
                            color:
                              j.presentStatus === 'Receive OK' || j.presentStatus === 'Delivery Done' ? '#047857' :
                              j.presentStatus === 'Inspection Fail' ? '#B91C1C' :
                              j.presentStatus === 'Partial Received Due' ? '#B45309' : '#334155'
                          }}
                        >
                          {j.presentStatus}
                        </span>
                      </td>
                      <td style={{ padding: '9px 10px', color: '#475569' }}>{j.merchandiser}</td>
                      <td style={{ padding: '9px 10px', color: '#0284C7', fontWeight: 600 }}>{j.tnaSlot}</td>
                      <td style={{ padding: '9px 10px', color: '#475569' }}>{j.shipmentDate}</td>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailModalJob(j);
                          }}
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
                          Inspect Checklist
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Detailed Job Checklist Popup / Modal */}
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
                    background: '#0F274E',
                    color: '#FFFFFF',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Package size={20} color="#38BDF8" />
                    <div>
                      <div style={{ fontSize: '11px', color: '#93C5FD', textTransform: 'uppercase', fontWeight: 700 }}>
                        Trims Checklist & Inventory Dossier
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800 }}>
                        Job #{detailModalJob.jobNo} — {detailModalJob.buyer} ({detailModalJob.styleNo})
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setDetailModalFullscreen(!detailModalFullscreen)}
                      style={{ background: 'rgba(255,255,255,0.1)', color: '#FFFFFF', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                      title="Toggle Fullscreen"
                    >
                      {detailModalFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailModalJob(null)}
                      style={{ background: 'rgba(255,255,255,0.1)', color: '#FFFFFF', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Modal Subheader Facts */}
                <div style={{ background: '#F8FAFC', padding: '12px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', flexWrap: 'wrap', gap: '24px', fontSize: '12.5px' }}>
                  <div><strong>Description:</strong> {detailModalJob.itemDescription}</div>
                  <div><strong>Order Qty:</strong> {detailModalJob.orderQty.toLocaleString()} pcs</div>
                  <div><strong>Merchandiser:</strong> {detailModalJob.merchandiser}</div>
                  <div><strong>T&A Slot:</strong> {detailModalJob.tnaSlot}</div>
                  <div><strong>Sewing Line:</strong> {detailModalJob.sewingLine}</div>
                  <div><strong>Shipment:</strong> {detailModalJob.shipmentDate}</div>
                  <div><strong>Status:</strong> <span style={{ fontWeight: 700, color: '#0284C7' }}>{detailModalJob.presentStatus}</span></div>
                </div>

                {/* Modal Items Table */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #CBD5E1', fontSize: '11px', textTransform: 'uppercase', color: '#475569' }}>
                        <th style={{ padding: '8px 10px' }}>Item Name</th>
                        <th style={{ padding: '8px' }}>Unit</th>
                        <th style={{ padding: '8px' }}>Consumption</th>
                        <th style={{ padding: '8px' }}>Required Qty</th>
                        <th style={{ padding: '8px' }}>Extra %</th>
                        <th style={{ padding: '8px' }}>Total Order</th>
                        <th style={{ padding: '8px' }}>Received Qty</th>
                        <th style={{ padding: '8px' }}>Balance Qty</th>
                        <th style={{ padding: '8px' }}>Delivered</th>
                        <th style={{ padding: '8px' }}>Storage Location</th>
                        <th style={{ padding: '8px' }}>Quality Inspection</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModalJob.items.map(it => (
                        <tr key={it.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '9px 10px', fontWeight: 700, color: '#0F274E' }}>{it.itemName}</td>
                          <td style={{ padding: '9px 8px', fontWeight: 650, color: '#0284C7' }}>{it.unit}</td>
                          <td style={{ padding: '9px 8px' }}>
                            <strong>{it.consumption}</strong> <span style={{ color: '#64748B' }}>{it.consumptionUnit}</span>
                          </td>
                          <td style={{ padding: '9px 8px' }}>{it.requiredQty.toLocaleString()}</td>
                          <td style={{ padding: '9px 8px', color: '#64748B' }}>{it.wastagePct}%</td>
                          <td style={{ padding: '9px 8px', fontWeight: 700 }}>{it.totalOrderQty.toLocaleString()}</td>
                          <td style={{ padding: '9px 8px', fontWeight: 700, color: '#059669' }}>{it.receivedQty.toLocaleString()}</td>
                          <td style={{ padding: '9px 8px', fontWeight: 700, color: it.balanceQty === 0 ? '#059669' : '#D97706' }}>
                            {it.balanceQty.toLocaleString()}
                          </td>
                          <td style={{ padding: '9px 8px', fontWeight: 700, color: '#0284C7' }}>{it.deliveredQty.toLocaleString()}</td>
                          <td style={{ padding: '9px 8px' }}>
                            <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              {it.rackNo} | {it.shelfNo}
                            </span>
                          </td>
                          <td style={{ padding: '9px 8px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 750,
                              background: it.qualityStatus === 'PASS' ? '#ECFDF5' : it.qualityStatus === 'FAIL' ? '#FEF2F2' : '#F8FAFC',
                              color: it.qualityStatus === 'PASS' ? '#047857' : it.qualityStatus === 'FAIL' ? '#B91C1C' : '#64748B'
                            }}>
                              {it.qualityStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Modal Footer */}
                <div style={{ background: '#F8FAFC', padding: '12px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiveSearchJob(detailModalJob.jobNo);
                      setDetailModalJob(null);
                      setActiveTab('RECEIVE');
                    }}
                    style={{ padding: '6px 14px', borderRadius: '6px', background: '#0284C7', color: '#FFFFFF', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Open in Order Receive
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeliverySearchJob(detailModalJob.jobNo);
                      setDetailModalJob(null);
                      setActiveTab('DELIVERY');
                    }}
                    style={{ padding: '6px 14px', borderRadius: '6px', background: '#0F274E', color: '#FFFFFF', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Open in Order Delivery
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
          {/* Top Job Search Bar */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border, #E2E8F0)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '300px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} color="#64748B" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Select Job # for Floor Issue & Gate Pass..."
                  value={deliverySearchJob}
                  onChange={e => setDeliverySearchJob(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 34px',
                    borderRadius: '6px',
                    border: '1.5px solid #0284C7',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                />
              </div>

              {/* Quick Job Chips */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {checklists.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setDeliverySearchJob(c.jobNo)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: deliverySearchJob === c.jobNo ? '1px solid #0F274E' : '1px solid #CBD5E1',
                      background: deliverySearchJob === c.jobNo ? '#0F274E' : '#F8FAFC',
                      color: deliverySearchJob === c.jobNo ? '#FFFFFF' : '#334155'
                    }}
                  >
                    #{c.jobNo}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivered All & Issue Gate Pass Buttons */}
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
                    background: '#0284C7',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title="Deliver 100% full quantity of all received items"
                >
                  <CheckSquare size={15} />
                  <span>Delivered All (Full Issue)</span>
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
      {/* TAB 5: LOCATION TRACKING (40 RACKS & JOB SEARCH)                     */}
      {/* ==================================================================== */}
      {activeTab === 'LOCATION' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sub-Tabs: Present Layout vs Job Location Search */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
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
                  Search Job # to Locate Trims:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={locationJobQuery}
                    onChange={e => setLocationJobQuery(e.target.value)}
                    placeholder="Enter Job # (e.g. 48002, 46755)..."
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #0284C7', fontSize: '13px', fontWeight: 600 }}
                  />
                </div>
              </div>

              {searchedJobLocations ? (
                <div>
                  <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '6px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px' }}>
                    <strong>Job #{searchedJobLocations.jobNo}</strong> ({searchedJobLocations.buyer} - {searchedJobLocations.styleNo}) — {searchedJobLocations.itemDescription}
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
                  No trims found for Job #{locationJobQuery}. Please enter a valid Job #.
                </div>
              )}
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
              <p style={{ fontSize: '13px', color: '#FEF3C7', margin: 0 }}>
                Leftover certified trims from completed jobs (threads, elastics, zippers, spare buttons).
                Merchandisers and Central Planning can inspect and re-allocate stock to save procurement costs.
              </p>
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
                    border: reuseCategoryFilter === cat ? '1px solid #78350F' : '1px solid #CBD5E1',
                    background: reuseCategoryFilter === cat ? '#78350F' : '#FFFFFF',
                    color: reuseCategoryFilter === cat ? '#FFFFFF' : '#475569'
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
                  <th style={{ padding: '9px 12px' }}>Surplus Item Name</th>
                  <th style={{ padding: '9px 10px' }}>Category</th>
                  <th style={{ padding: '9px 10px' }}>Available Qty</th>
                  <th style={{ padding: '9px 10px' }}>Unit</th>
                  <th style={{ padding: '9px 10px' }}>Origin Job #</th>
                  <th style={{ padding: '9px 10px' }}>Buyer</th>
                  <th style={{ padding: '9px 10px' }}>Shelf Location</th>
                  <th style={{ padding: '9px 10px' }}>Physical Condition</th>
                  <th style={{ padding: '9px 12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSurplusTrims.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ fontWeight: 700, color: '#1E293B' }}>{s.itemName}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{s.remarks}</div>
                    </td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{ fontSize: '11px', background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: '4px', fontWeight: 650 }}>
                        {s.category}
                      </span>
                    </td>
                    <td style={{ padding: '9px 10px', fontSize: '14px', fontWeight: 800, color: '#047857' }}>
                      {s.availableQty.toLocaleString()}
                    </td>
                    <td style={{ padding: '9px 10px', fontWeight: 600, color: '#0284C7' }}>{s.unit}</td>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: '#0F274E' }}>#{s.originJobNo}</td>
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
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Target Job #:</label>
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
                <div style={{ fontSize: '12px', color: '#93C5FD' }}>
                  Northern Fashions Limited • Trims Warehouse Floor System • Auto-refresh
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
              {/* Massive TV Search Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.06)', padding: '12px 18px', borderRadius: '10px' }}>
                <Search size={24} color="#A4D92C" />
                <input
                  type="text"
                  placeholder="SCAN BARCODE OR ENTER JOB # (e.g. 48002, 46755, 48085)..."
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
                {checklists.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setTvSearchJob(c.jobNo)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: tvSearchJob === c.jobNo ? '1px solid #A4D92C' : '1px solid rgba(255,255,255,0.2)',
                      background: tvSearchJob === c.jobNo ? '#A4D92C' : 'rgba(255,255,255,0.1)',
                      color: tvSearchJob === c.jobNo ? '#071F42' : '#FFFFFF'
                    }}
                  >
                    #{c.jobNo}
                  </button>
                ))}
              </div>

              {tvSelectedJob ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '12px 16px', borderRadius: '8px', marginBottom: '14px' }}>
                    <div>
                      <span style={{ fontSize: '13px', color: '#93C5FD' }}>JOB #{tvSelectedJob.jobNo} • {tvSelectedJob.buyer}</span>
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
                              {it.qualityStatus === 'PASS' ? '✅ QUALITY PASSED' : '⚠️ ' + it.qualityStatus}
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
                <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94A3B8' }}>
                  <Search size={48} color="#64748B" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>Enter a Job # or scan barcode to view location cards</div>
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
