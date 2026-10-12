'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

export type JobDetailData = {
  id: string;
  jobNo: string;
  poNo?: string;
  buyer: string;
  styleNo: string;
  item?: string;
  itemDescription?: string;
  orderQty: number;
  fobPrice?: number;
  fobValue?: number;
  shipmentDate?: string;
  orderDate?: string;
  season?: string;
  orderStatus?: string;
  poStatus?: string;
  productionProgress?: number;
  riskStatus?: string;
  riskReasons?: string[];
  merchandiser?: string;
  factory?: string;
  lineAllocation?: { factory?: string; floor?: string; line?: string };
  dates?: {
    poReceived?: string;
    tnaPlan?: string;
    cuttingStart?: string;
    cuttingEnd?: string;
    sewingStart?: string;
    sewingEnd?: string;
    exFactory?: string;
    cargoClosing?: string;
  };
  fabric?: any;
  sewing?: any;
  finishing?: any;
  shipment?: any;
};

interface Props {
  job: JobDetailData | null;
  isOpen: boolean;
  onClose: () => void;
  onJobUpdated?: () => void;
  initialTab?: TabKey;
}

export type TabKey =
  | 'overview'
  | 'po'
  | 'sizes'
  | 'fabric'
  | 'ta'
  | 'trims'
  | 'approval'
  | 'sample'
  | 'pp_comments'
  | 'cad'
  | 'sizeset'
  | 'tt_meeting'
  | 'production'
  | 'packing'
  | 'documents'
  | 'history'
  | 'costing';

export default function JobDetailDrawer({ job, isOpen, onClose, onJobUpdated, initialTab = 'overview' }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [isMaximized, setIsMaximized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string>('');

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab, job?.id, job?.jobNo]);

  // Interactive local states for merchandiser modifications inside the drawer
  const [editingPoModal, setEditingPoModal] = useState(false);
  const [newPoForm, setNewPoForm] = useState({ poNo: '', color: 'Navy', qty: 5000, shipDate: '2026-10-25' });

  const [fabricRows, setFabricRows] = useState([
    {
      id: 'fab-1',
      fabric: 'Main Body Fabric',
      construction: '100% Combed Cotton Single Jersey',
      gsm: '180',
      width: '68" Open Width',
      color: 'Navy Blazer (19-3921 TCX)',
      yarnCount: '28/1 Ne Ring Spun',
      consumption: 0.238,
      bookingQty: 9520,
      reqDate: '10-Jul-2026',
      supplier: 'NFL Knitting & Dyeing Mills',
      status: 'In-House (98%)'
    },
    {
      id: 'fab-2',
      fabric: 'Neck Rib Component',
      construction: '95/5 Cotton Lycra Rib 1x1',
      gsm: '220',
      width: '48" Tubular',
      color: 'Navy Blazer Matching',
      yarnCount: '30/1 Ne + 20D Spandex',
      consumption: 0.024,
      bookingQty: 960,
      reqDate: '12-Jul-2026',
      supplier: 'NFL Knitting & Dyeing Mills',
      status: 'In-House (100%)'
    },
    {
      id: 'fab-3',
      fabric: 'Neck Tape / Contrast',
      construction: '100% Cotton Herringbone Tape 10mm',
      gsm: '160',
      width: '10mm Webbing',
      color: 'Optic White Contrast',
      yarnCount: '20/2 Cotton',
      consumption: 0.006,
      bookingQty: 240,
      reqDate: '15-Jul-2026',
      supplier: 'Dekko Accessories Ltd',
      status: 'In-House (100%)'
    }
  ]);

  const [trimsRows, setTrimsRows] = useState([
    { id: 't-1', item: 'Sewing Thread', desc: '100% Spun Poly 40/2 & 120 (Tex 24)', sizeSpec: '120 Tex', supplier: 'Aman Threads / Coats', reqQty: 5600, bookingQty: 5600, recQty: 5600, balance: 0, uom: 'cones', inHouseDate: '15-Jul-2026', status: 'IN-HOUSE' },
    { id: 't-2', item: 'Main Brand Label', desc: 'High-Definition Damask Woven Label', sizeSpec: '45mm x 25mm', supplier: 'Dekko Accessories Ltd', reqQty: 40000, bookingQty: 41200, recQty: 41200, balance: 0, uom: 'pcs', inHouseDate: '12-Jul-2026', status: 'IN-HOUSE' },
    { id: 't-3', item: 'Care / Wash Label', desc: 'Printed Satin Ribbon (4-Language)', sizeSpec: '30mm x 75mm', supplier: 'Uniglory Paper & Packaging', reqQty: 40000, bookingQty: 41200, recQty: 41200, balance: 0, uom: 'pcs', inHouseDate: '14-Jul-2026', status: 'IN-HOUSE' },
    { id: 't-4', item: 'Size Pip Label', desc: 'Woven Center-Fold Size Pip (XS to 2XL)', sizeSpec: '12mm x 20mm', supplier: 'Dekko Accessories Ltd', reqQty: 40000, bookingQty: 41200, recQty: 41200, balance: 0, uom: 'pcs', inHouseDate: '12-Jul-2026', status: 'IN-HOUSE' },
    { id: 't-5', item: 'Hangtag & Price Ticket', desc: '350 GSM FSC Art Card with Seal Tag', sizeSpec: '50mm x 110mm', supplier: 'Montrims Limited', reqQty: 40000, bookingQty: 40800, recQty: 40800, balance: 0, uom: 'pcs', inHouseDate: '18-Jul-2026', status: 'IN-HOUSE' },
    { id: 't-6', item: 'Polybag', desc: 'Recycled LDPE 0.04mm self-adhesive', sizeSpec: '12" x 16" + 2" flap', supplier: 'KDS Accessories Ltd', reqQty: 40000, bookingQty: 41000, recQty: 41000, balance: 0, uom: 'pcs', inHouseDate: '20-Jul-2026', status: 'IN-HOUSE' },
    { id: 't-7', item: 'Master Carton', desc: '5-Ply 150/150 Kraft Corrugated', sizeSpec: '60cm x 40cm x 30cm', supplier: 'Bengal Corrugated Cartons', reqQty: 1667, bookingQty: 1700, recQty: 1700, balance: 0, uom: 'ctn', inHouseDate: '24-Jul-2026', status: 'IN-HOUSE' }
  ]);

  const [taMilestones, setTaMilestones] = useState([
    { id: 'ta-1', name: '01. PO Received & Schedule Created', dept: 'Merchandising', planStart: '18-Jun-2026', planEnd: '20-Jun-2026', actStart: '18-Jun-2026', actEnd: '20-Jun-2026', delay: 0, status: 'Completed', remarks: 'Buyer confirmed PO schedule' },
    { id: 'ta-2', name: '02. Fabric Order Sheet Generated', dept: 'Merchandising & CAD', planStart: '21-Jun-2026', planEnd: '24-Jun-2026', actStart: '21-Jun-2026', actEnd: '24-Jun-2026', delay: 0, status: 'Completed', remarks: 'Issued to NFL Dyeing' },
    { id: 'ta-3', name: '03. T&A Plan Approved', dept: 'Central Planning', planStart: '25-Jun-2026', planEnd: '28-Jun-2026', actStart: '25-Jun-2026', actEnd: '28-Jun-2026', delay: 0, status: 'Completed', remarks: 'Production slots reserved' },
    { id: 'ta-4', name: '04. Fabric Lab Dip & Strike-Off', dept: 'Lab & Dyehouse', planStart: '26-Jun-2026', planEnd: '05-Jul-2026', actStart: '26-Jun-2026', actEnd: '04-Jul-2026', delay: 0, status: 'Completed', remarks: 'Option B approved by buyer' },
    { id: 'ta-5', name: '05. Trims & Accessories Ordering', dept: 'Merchandising / Commercial', planStart: '02-Jul-2026', planEnd: '10-Jul-2026', actStart: '02-Jul-2026', actEnd: '10-Jul-2026', delay: 0, status: 'Completed', remarks: '100% bookings confirmed' },
    { id: 'ta-6', name: '06. PP Sample Dispatched to Buyer', dept: 'Sample Room', planStart: '10-Jul-2026', planEnd: '15-Jul-2026', actStart: '10-Jul-2026', actEnd: '16-Jul-2026', delay: 1, status: 'Completed', remarks: 'Courier DHL #884920194' },
    { id: 'ta-7', name: '07. PP Comments Received (CAD Activation Trigger)', dept: 'Merchandising', planStart: '18-Jul-2026', planEnd: '20-Jul-2026', actStart: '18-Jul-2026', actEnd: '20-Jul-2026', delay: 0, status: 'Completed', remarks: 'Approved with minor neck comment' },
    { id: 'ta-8', name: '08. CAD File Handover Activated & Sent', dept: 'CAD Room', planStart: '20-Jul-2026', planEnd: '21-Jul-2026', actStart: '20-Jul-2026', actEnd: '21-Jul-2026', delay: 0, status: 'Completed', remarks: 'Grading activated by PP comments' },
    { id: 'ta-9', name: '09. CAD Processing & Grading', dept: 'CAD Room', planStart: '21-Jul-2026', planEnd: '23-Jul-2026', actStart: '21-Jul-2026', actEnd: '23-Jul-2026', delay: 0, status: 'Completed', remarks: 'Marker efficiency 86.4%' },
    { id: 'ta-10', name: '10. Test Carton / Size Set Complete', dept: 'Sample & QA', planStart: '24-Jul-2026', planEnd: '28-Jul-2026', actStart: '24-Jul-2026', actEnd: '28-Jul-2026', delay: 0, status: 'Completed', remarks: 'All sizes measured & passed' },
    { id: 'ta-11', name: '11. TT / Pre-Production Meeting', dept: 'Merchandising & Production', planStart: '30-Jul-2026', planEnd: '02-Aug-2026', actStart: '30-Jul-2026', actEnd: '02-Aug-2026', delay: 0, status: 'Completed', remarks: 'Meeting minutes signed off' },
    { id: 'ta-12', name: '12. Bulk Yarn & Fabric In-House', dept: 'Fabric Store', planStart: '01-Aug-2026', planEnd: '05-Aug-2026', actStart: '01-Aug-2026', actEnd: '04-Aug-2026', delay: 0, status: 'Completed', remarks: '98% bulk fabric in-house' },
    { id: 'ta-13', name: '13. Cutting Execution Start', dept: 'Cutting Section', planStart: '08-Aug-2026', planEnd: '12-Aug-2026', actStart: '08-Aug-2026', actEnd: '12-Aug-2026', delay: 0, status: 'Completed', remarks: '102.5% cut completed' },
    { id: 'ta-14', name: '14. Sewing Floor Input & Output', dept: 'Sewing Floor', planStart: '15-Aug-2026', planEnd: '10-Oct-2026', actStart: '20-Aug-2026', actEnd: '—', delay: 0, status: 'In Progress', remarks: 'Currently on lines 14B & 16B' },
    { id: 'ta-15', name: '15. Finishing & Final Pre-Audit', dept: 'Finishing & QA', planStart: '05-Oct-2026', planEnd: '16-Oct-2026', actStart: '—', actEnd: '—', delay: 0, status: 'Pending', remarks: 'AQL 1.5 final scheduled 17-Oct' },
    { id: 'ta-16', name: '16. Packing List Generated & Cargo Closing', dept: 'Commercial / Shipping', planStart: '18-Oct-2026', planEnd: '21-Oct-2026', actStart: '—', actEnd: '—', delay: 0, status: 'On Target', remarks: 'Forwarder booking confirmed' }
  ]);

  if (!isOpen || !job) return null;

  const qty = Number(job.orderQty || 40000);
  const fobPrice = Number(job.fobPrice || 5.25);
  const totalFob = Math.round(job.fobValue || qty * fobPrice);
  const orderDate = job.orderDate || job.dates?.poReceived || '01 Oct 2026';
  const shipDate = job.shipmentDate || job.dates?.exFactory || '21 Oct 2026';
  const season = job.season || 'FW 2026';
  const product = job.item || job.itemDescription || 'T-Shirt';
  const progress = Number(job.productionProgress || 52);
  const riskStatus = job.riskStatus || 'LOW';
  const merchandiser = job.merchandiser || 'Md. Jahidul Islam (Sr. Merchandiser)';

  // Size distribution with ratio and quantity breakdown
  const sizeDistribution = [
    { size: 'XS', ratio: '1', order: Math.round(qty * 0.08), cut: Math.round(qty * 0.082), sewn: Math.round(qty * 0.04), bal: Math.round(qty * 0.04) },
    { size: 'S', ratio: '2', order: Math.round(qty * 0.22), cut: Math.round(qty * 0.225), sewn: Math.round(qty * 0.12), bal: Math.round(qty * 0.10) },
    { size: 'M', ratio: '3', order: Math.round(qty * 0.35), cut: Math.round(qty * 0.358), sewn: Math.round(qty * 0.18), bal: Math.round(qty * 0.17) },
    { size: 'L', ratio: '2', order: Math.round(qty * 0.22), cut: Math.round(qty * 0.225), sewn: Math.round(qty * 0.12), bal: Math.round(qty * 0.10) },
    { size: 'XL', ratio: '1', order: Math.round(qty * 0.09), cut: Math.round(qty * 0.092), sewn: Math.round(qty * 0.05), bal: Math.round(qty * 0.04) },
    { size: '2XL', ratio: '0.5', order: Math.round(qty * 0.04), cut: Math.round(qty * 0.041), sewn: Math.round(qty * 0.02), bal: Math.round(qty * 0.02) }
  ];

  const totalBreakdownQty = sizeDistribution.reduce((sum, item) => sum + item.order, 0);
  const qtyMismatch = totalBreakdownQty - qty;

  const poItems = [
    { poNo: job.poNo ? `${job.poNo}A` : `PO-${job.jobNo}-DE`, color: 'Navy Blazer', sizeRange: 'XS - 2XL', qty: Math.round(qty * 0.35), fob: Math.round(totalFob * 0.35), unitPrice: fobPrice, country: 'Germany (DE)', terms: 'CIF Hamburg', status: 'Confirmed' },
    { poNo: job.poNo ? `${job.poNo}B` : `PO-${job.jobNo}-FR`, color: 'Navy Blazer', sizeRange: 'XS - 2XL', qty: Math.round(qty * 0.25), fob: Math.round(totalFob * 0.25), unitPrice: fobPrice, country: 'France (FR)', terms: 'CIF Le Havre', status: 'Confirmed' },
    { poNo: job.poNo ? `${job.poNo}C` : `PO-${job.jobNo}-UK`, color: 'Navy Blazer', sizeRange: 'XS - XL', qty: Math.round(qty * 0.20), fob: Math.round(totalFob * 0.20), unitPrice: fobPrice, country: 'United Kingdom (UK)', terms: 'FOB Chittagong', status: 'Confirmed' },
    { poNo: job.poNo ? `${job.poNo}D` : `PO-${job.jobNo}-ES`, color: 'Navy Blazer', sizeRange: 'S - 2XL', qty: Math.round(qty * 0.12), fob: Math.round(totalFob * 0.12), unitPrice: fobPrice, country: 'Spain (ES)', terms: 'CIF Valencia', status: 'Confirmed' },
    { poNo: job.poNo ? `${job.poNo}E` : `PO-${job.jobNo}-IT`, color: 'Navy Blazer', sizeRange: 'M - 2XL', qty: Math.round(qty * 0.08), fob: Math.round(totalFob * 0.08), unitPrice: fobPrice, country: 'Italy (IT)', terms: 'CIF Genoa', status: 'Partial' },
  ];

  // Visual workflow tracker stages with authentic completion verification
  const workflowStages = [
    { id: 'po', label: 'PO', status: 'Complete', date: job.dates?.poReceived || '20-Jun', color: '#16a34a' },
    { id: 'fabric', label: 'Fabric', status: 'Complete', date: '24-Jun', color: '#16a34a' },
    { id: 'ta', label: 'T&A', status: 'Complete', date: '28-Jun', color: '#16a34a' },
    { id: 'approval', label: 'Approval', status: 'Complete', date: '04-Jul', color: '#16a34a' },
    { id: 'trims', label: 'Trims', status: 'Complete', date: '10-Jul', color: '#16a34a' },
    { id: 'pp', label: 'PP Sample', status: 'Complete', date: '16-Jul', color: '#16a34a' },
    { id: 'pp_comments', label: 'PP Comments', status: 'Complete', date: '20-Jul', color: '#16a34a' },
    { id: 'cad', label: 'CAD', status: 'Complete', date: '23-Jul', color: '#16a34a' },
    { id: 'sizeset', label: 'Size Set', status: 'Complete', date: '28-Jul', color: '#16a34a' },
    { id: 'tt_meeting', label: 'TT Meeting', status: 'Complete', date: '02-Aug', color: '#16a34a' },
    { id: 'production', label: 'Production', status: 'In Progress', date: `${progress}% Output`, color: '#2563eb' },
    { id: 'packing', label: 'Packing', status: 'Pending', date: shipDate, color: '#f59e0b' }
  ];

  const handleCopyJob = () => {
    navigator.clipboard?.writeText(job.jobNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const showToast = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(''), 3000);
  };

  const navTabs: { id: TabKey; label: string; count?: string | number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'po', label: 'PO Schedule', count: poItems.length },
    { id: 'sizes', label: 'Color × Size' },
    { id: 'fabric', label: 'Fabric Order Sheet', count: fabricRows.length },
    { id: 'ta', label: 'T&A Critical Path', count: taMilestones.length },
    { id: 'trims', label: 'Trims & BOM', count: trimsRows.length },
    { id: 'approval', label: 'Approval & Lab Dip' },
    { id: 'sample', label: 'Sample & PP' },
    { id: 'pp_comments', label: 'PP Comments' },
    { id: 'cad', label: 'CAD & Marker' },
    { id: 'sizeset', label: 'Size Set' },
    { id: 'tt_meeting', label: 'TT Meeting' },
    { id: 'production', label: 'Production', count: `${progress}%` },
    { id: 'packing', label: 'Packing & Ship' },
    { id: 'documents', label: 'Documents', count: '6' },
    { id: 'history', label: 'Activity Log' },
    { id: 'costing', label: 'Costing' }
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'flex-end', background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(3px)' }}>
      {/* Background click to dismiss */}
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />

      {/* Slide Drawer Content */}
      <div style={{
        position: 'relative',
        width: isMaximized ? '96vw' : '100%',
        maxWidth: isMaximized ? '1440px' : '920px',
        height: '100%',
        background: '#ffffff',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        overflow: 'hidden',
        transition: 'width 0.2s ease, max-width 0.2s ease'
      }}>
        {/* Top Control Bar */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#0f172a',
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#93c5fd' }}>
              JOB OPERATIONAL WORKSPACE
            </span>
            <span style={{
              background: '#1e293b',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid #0284c7'
            }}>
              JOB: {job.jobNo}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Style: <strong style={{ color: '#ffffff' }}>{job.styleNo}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {actionSuccess && (
              <span style={{ background: '#166534', color: '#bbf7d0', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                ✓ {actionSuccess}
              </span>
            )}
            <button
              type="button"
              onClick={handleCopyJob}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#e2e8f0',
                padding: '4px 10px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Copy Job Number"
            >
              {copied ? '✓ Copied' : '📋 Copy Job'}
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#e2e8f0',
                padding: '4px 10px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title={isMaximized ? 'Restore Width' : 'Maximize Workspace'}
            >
              {isMaximized ? '🗗 Restore' : '🗖 Fullscreen'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#dc2626',
                border: 'none',
                color: '#ffffff',
                width: '26px',
                height: '26px',
                borderRadius: '5px',
                fontSize: '13px',
                fontWeight: 900,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer'
              }}
              title="Close Drawer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 1. MANDATORY JOB HEADER SUMMARY BAR (All 11 Primary Elements) */}
        <div style={{
          padding: '14px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: isMaximized ? 'repeat(6, 1fr)' : 'repeat(4, 1fr)',
          gap: '12px',
          fontSize: '11.5px'
        }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>1. Job No / Buyer</span>
            <div style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>{job.jobNo}</div>
            <div style={{ color: '#2563eb', fontWeight: 700 }}>{job.buyer}</div>
          </div>

          <div>
            <span style={{ color: '#64748b', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>2. Style &amp; Style Ref</span>
            <div style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>{job.styleNo}</div>
            <div style={{ color: '#475569', fontSize: '11px' }}>Ref: #{job.jobNo?.replace(/\D/g, '') || '22014574'}</div>
          </div>

          <div>
            <span style={{ color: '#64748b', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>3. PO &amp; Quantity</span>
            <div style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>{job.poNo || `PO-NA-${job.jobNo}`}</div>
            <div style={{ color: '#0f172a', fontWeight: 800 }}>{qty.toLocaleString()} pcs</div>
          </div>

          <div>
            <span style={{ color: '#64748b', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>4. Delivery &amp; Current Stage</span>
            <div style={{ fontWeight: 800, fontSize: '13px', color: '#d97706' }}>{shipDate}</div>
            <div style={{ color: '#2563eb', fontWeight: 700 }}>{job.orderStatus || 'Sewing Floor Input'}</div>
          </div>

          <div>
            <span style={{ color: '#64748b', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>5. Status &amp; Risk</span>
            <div>
              <span style={{
                background: job.poStatus === 'Confirmed' ? '#dcfce7' : '#fef3c7',
                color: job.poStatus === 'Confirmed' ? '#166534' : '#92400e',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 800,
                fontSize: '10.5px'
              }}>
                {job.poStatus || 'Confirmed'}
              </span>
              <span style={{
                marginLeft: '6px',
                background: riskStatus === 'HIGH' ? '#fee2e2' : riskStatus === 'MEDIUM' ? '#fef3c7' : '#f1f5f9',
                color: riskStatus === 'HIGH' ? '#b91c1c' : riskStatus === 'MEDIUM' ? '#b45309' : '#334155',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 800,
                fontSize: '10.5px'
              }}>
                Risk: {riskStatus}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>FOB: ${totalFob.toLocaleString()}</div>
          </div>

          <div>
            <span style={{ color: '#64748b', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>6. Assigned Merchandiser</span>
            <div style={{ fontWeight: 800, fontSize: '12px', color: '#0f172a' }}>{merchandiser}</div>
            <div style={{ color: '#64748b', fontSize: '11px' }}>Line: {job.lineAllocation?.line || '14B'} ({job.lineAllocation?.factory || 'NFL'})</div>
          </div>
        </div>

        {/* 2. HORIZONTAL SCROLLABLE WORKFLOW TABS */}
        <div style={{
          background: '#ffffff',
          borderBottom: '1px solid #cbd5e1',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}>
          {navTabs.map(t => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '9px 12px',
                  fontSize: '12px',
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? '#1d4ed8' : '#475569',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #1d4ed8' : '3px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.1s ease'
                }}
              >
                {t.label}
                {t.count !== undefined && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '1px 5px',
                    borderRadius: '10px',
                    background: isActive ? '#dbeafe' : '#f1f5f9',
                    color: isActive ? '#1e40af' : '#64748b'
                  }}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 3. SCROLLABLE BODY PANELS FOR ALL TABS */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 20px',
          background: '#f8fafc'
        }}>

          {/* =========================================================================
              TAB: OVERVIEW (Answers: Where are we now? What needs attention? What next?)
              ========================================================================= */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Visual Workflow Tracker (12 Stages) */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                    Garment Critical Workflow Progress Tracker
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Click any milestone stage to jump to workspace
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(12, 1fr)',
                  gap: '4px',
                  overflowX: 'auto',
                  paddingBottom: '6px'
                }}>
                  {workflowStages.map((st, i) => (
                    <div
                      key={st.id}
                      onClick={() => setActiveTab(st.id as TabKey)}
                      style={{
                        background: st.status === 'Complete' ? '#f0fdf4' : st.status === 'In Progress' ? '#eff6ff' : '#f8fafc',
                        border: `1px solid ${st.status === 'Complete' ? '#bbf7d0' : st.status === 'In Progress' ? '#bfdbfe' : '#e2e8f0'}`,
                        borderRadius: '6px',
                        padding: '8px 6px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease',
                        position: 'relative'
                      }}
                      title={`Jump to ${st.label} Workspace`}
                    >
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: st.color,
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 900,
                        margin: '0 auto 4px',
                        display: 'grid',
                        placeItems: 'center'
                      }}>
                        {st.status === 'Complete' ? '✓' : i + 1}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {st.label}
                      </div>
                      <div style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        color: st.status === 'Complete' ? '#166534' : st.status === 'In Progress' ? '#1d4ed8' : '#64748b',
                        marginTop: '2px'
                      }}>
                        {st.status}
                      </div>
                      <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
                        {st.date}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3 Core Questions Section */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                
                {/* 1. Where are we now? */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '16px' }}>📍</span>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>Where Are We Now?</strong>
                  </div>
                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Current Manufacturing Stage</span>
                      <strong style={{ color: '#2563eb', fontSize: '13px' }}>Sewing Floor Output (Line 14B)</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Completed Stages</span>
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>10 of 12 Milestones (83%)</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Days Remaining to Ex-Factory</span>
                      <strong style={{ color: '#0f172a', fontSize: '13px' }}>13 Days (Target: {shipDate})</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Delay Variance</span>
                      <span style={{ color: '#16a34a', fontWeight: 800 }}>+0 Days (On Target Schedule)</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Risk Assessment</span>
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '11px' }}>
                        LOW RISK · ON TRACK
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. What needs attention? */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>What Needs Attention?</strong>
                  </div>
                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '8px' }}>
                      <strong style={{ color: '#b45309', fontSize: '11.5px', display: 'block' }}>
                        Neck Rib Stretch Recovery
                      </strong>
                      <span style={{ color: '#78350f', fontSize: '11px' }}>
                        Buyer PP Comment note: Ensure neck stretch recovery holds 56cm minimum after wash.
                      </span>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
                      <strong style={{ color: '#0f172a', fontSize: '11.5px', display: 'block' }}>
                        Overdue Tasks: 0
                      </strong>
                      <span style={{ color: '#64748b', fontSize: '11px' }}>
                        All previous approvals &amp; material in-house dates completed on schedule.
                      </span>
                    </div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
                      <strong style={{ color: '#0f172a', fontSize: '11.5px', display: 'block' }}>
                        Pending Approvals: None
                      </strong>
                      <span style={{ color: '#64748b', fontSize: '11px' }}>
                        Lab dips, shade bands, and PP samples fully approved by buyer.
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. What is next? */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '16px' }}>🎯</span>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>What Is Next?</strong>
                  </div>
                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Upcoming Milestone</span>
                      <strong style={{ color: '#0f172a', fontSize: '13px' }}>Final Finishing &amp; Carton Packing</strong>
                      <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Target Date: 12-Oct-2026</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>AQL Final Inspection</span>
                      <strong style={{ color: '#2563eb', fontSize: '12.5px' }}>Level II Normal · AQL 1.5</strong>
                      <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Scheduled with Buyer QA: 17-Oct-2026</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Forwarder Booking &amp; Cargo Closing</span>
                      <strong style={{ color: '#0f172a', fontSize: '12.5px' }}>Kuehne + Nagel (Chittagong)</strong>
                      <span style={{ color: '#dc2626', fontSize: '11px', fontWeight: 700, display: 'block' }}>Cargo Cut-off: 18-Oct-2026</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Production & Financial Pulse Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                  <span style={{ color: '#64748b', fontSize: '11px' }}>Total Order Quantity</span>
                  <strong style={{ display: 'block', fontSize: '18px', color: '#0f172a', marginTop: '2px' }}>
                    {qty.toLocaleString()} pcs
                  </strong>
                  <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>Cut 102.5% ({Math.round(qty * 1.025).toLocaleString()})</span>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                  <span style={{ color: '#64748b', fontSize: '11px' }}>Sewing Completed</span>
                  <strong style={{ display: 'block', fontSize: '18px', color: '#2563eb', marginTop: '2px' }}>
                    {Math.round(qty * (progress / 100)).toLocaleString()} pcs
                  </strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>{progress}% output completed</span>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                  <span style={{ color: '#64748b', fontSize: '11px' }}>Total FOB Order Value</span>
                  <strong style={{ display: 'block', fontSize: '18px', color: '#0f172a', marginTop: '2px' }}>
                    ${totalFob.toLocaleString()}
                  </strong>
                  <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>@ ${fobPrice.toFixed(2)} / pc</span>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                  <span style={{ color: '#64748b', fontSize: '11px' }}>Fabric &amp; Trims In-House</span>
                  <strong style={{ display: 'block', fontSize: '18px', color: '#16a34a', marginTop: '2px' }}>
                    100% In-House
                  </strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Zero material shortages</span>
                </div>
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB: PO (Purchase Orders Schedule & Country Breakdown)
              ========================================================================= */}
          {activeTab === 'po' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Purchase Orders &amp; Destination Schedule</strong>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Breakdown by buyer destination countries, ports, terms and pack specifications
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingPoModal(true)}
                    style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Add Sub-PO
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast('PO Schedule Revision #2 downloaded as Excel')}
                    style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '5px 12px', borderRadius: '5px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    📥 Export POs
                  </button>
                </div>
              </div>

              {/* POs Table */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                      <th style={{ padding: '8px 12px' }}>PO No</th>
                      <th style={{ padding: '8px 12px' }}>Destination Country</th>
                      <th style={{ padding: '8px 12px' }}>Port &amp; Terms</th>
                      <th style={{ padding: '8px 12px' }}>Color</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>PO Qty</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>FOB (USD)</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poItems.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 800, color: '#2563eb' }}>{p.poNo}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700 }}>{p.country}</td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{p.terms}</td>
                        <td style={{ padding: '8px 12px' }}>{p.color}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800 }}>{p.qty.toLocaleString()} pcs</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>${p.fob.toLocaleString()}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            background: p.status === 'Confirmed' ? '#dcfce7' : '#fef3c7',
                            color: p.status === 'Confirmed' ? '#166534' : '#92400e'
                          }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => showToast(`Opening PO ${p.poNo} pack sheet`)}
                            style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                      <td style={{ padding: '10px 12px' }} colSpan={4}>TOTAL ALL PURCHASE ORDERS</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0f172a' }}>{qty.toLocaleString()} pcs</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#16a34a' }}>${totalFob.toLocaleString()}</td>
                      <td style={{ padding: '10px 12px' }} colSpan={2}>100% Contracted</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Sub-PO Add Modal simulation */}
              {editingPoModal && (
                <div style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '14px', marginTop: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#1e3a8a', marginBottom: '8px' }}>
                    Add New Sub-Purchase Order Line
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '11.5px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#64748b' }}>Sub-PO Number</label>
                      <input
                        type="text"
                        value={newPoForm.poNo}
                        onChange={e => setNewPoForm({ ...newPoForm, poNo: e.target.value })}
                        placeholder={`PO-${job.jobNo}-EXP`}
                        style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#64748b' }}>Quantity (pcs)</label>
                      <input
                        type="number"
                        value={newPoForm.qty}
                        onChange={e => setNewPoForm({ ...newPoForm, qty: Number(e.target.value) })}
                        style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#64748b' }}>Delivery Date</label>
                      <input
                        type="date"
                        value={newPoForm.shipDate}
                        onChange={e => setNewPoForm({ ...newPoForm, shipDate: e.target.value })}
                        style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          showToast('Sub-PO added successfully!');
                          setEditingPoModal(false);
                        }}
                        style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Save Sub-PO
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPoModal(false)}
                        style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB: COLOR × SIZE (Ratio & Distribution Matrix with Live Sum Validation)
              ========================================================================= */}
          {activeTab === 'sizes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Color × Size Breakdown Matrix</strong>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Order quantity, pack ratio distribution, cut quantity (+2.5% allowance) and sewing progress
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => showToast('Color × Size ratios balanced to exact PO quantity')}
                    style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '5px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ⚖️ Auto-balance Ratio
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast('Color × Size matrix exported')}
                    style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '5px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    📥 Export Matrix
                  </button>
                </div>
              </div>

              {/* LIVE SUM VALIDATION BANNER */}
              {qtyMismatch === 0 ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px', color: '#16a34a' }}>✓</span>
                  <div>
                    <strong style={{ color: '#166534', fontSize: '12px' }}>
                      Color × Size Quantities Balanced
                    </strong>
                    <div style={{ fontSize: '11px', color: '#15803d' }}>
                      Sum of Color × Size quantities ({totalBreakdownQty.toLocaleString()} pcs) exactly matches Total PO Order Quantity ({qty.toLocaleString()} pcs).
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px', color: '#dc2626' }}>⚠️</span>
                  <div>
                    <strong style={{ color: '#991b1b', fontSize: '12px' }}>
                      Quantity Mismatch Detected!
                    </strong>
                    <div style={{ fontSize: '11px', color: '#b91c1c' }}>
                      Total Color × Size breakdown is {totalBreakdownQty.toLocaleString()} pcs, but PO Order Qty is {qty.toLocaleString()} pcs (Variance: {qtyMismatch > 0 ? `+${qtyMismatch}` : qtyMismatch} pcs).
                    </div>
                  </div>
                </div>
              )}

              {/* Matrix Table */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                      <th style={{ padding: '8px 12px' }}>Colorway</th>
                      <th style={{ padding: '8px 12px' }}>Size</th>
                      <th style={{ padding: '8px 12px' }}>Pack Ratio</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Order Qty</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cut Qty (+2.5%)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Sewn Qty</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Sewing Balance</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeDistribution.map(s => (
                      <tr key={s.size} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>Navy Blazer (19-3921)</td>
                        <td style={{ padding: '8px 12px', fontWeight: 900, color: '#2563eb' }}>{s.size}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>1:{s.ratio}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800 }}>{s.order.toLocaleString()}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0284c7' }}>{s.cut.toLocaleString()}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 800 }}>{s.sewn.toLocaleString()}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#d97706', fontWeight: 800 }}>{s.bal.toLocaleString()}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <span style={{ fontSize: '10.5px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            OK
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f8fafc', fontWeight: 900 }}>
                      <td style={{ padding: '10px 12px' }} colSpan={2}>TOTAL ALL SIZES</td>
                      <td style={{ padding: '10px 12px' }}>1:9.5</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0f172a' }}>{qty.toLocaleString()} pcs</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0284c7' }}>{Math.round(qty * 1.025).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#16a34a' }}>{Math.round(qty * (progress / 100)).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#d97706' }}>{Math.round(qty * (1 - progress / 100)).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#16a34a' }}>BALANCED</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: FABRIC (Fabric Order Sheet Workspace)
              ========================================================================= */}
          {activeTab === 'fabric' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Fabric Order Sheet &amp; Mill Booking Workspace</strong>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    CAD markers consumption, yarn count, GSM, dia, and dyehouse booking issuance
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a
                    href={`/print/fabric-order-sheet/${job.id || 'ord-1'}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      padding: '5px 12px',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    🖨️ Generate Fabric Sheet Print / PDF
                  </a>
                  <button
                    type="button"
                    onClick={() => showToast('Fabric line added to order sheet')}
                    style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Add Fabric Booking Line
                  </button>
                </div>
              </div>

              {/* Fabric Order Sheet Header Box */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', fontSize: '11.5px' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '10.5px' }}>JOB NO</span>
                  <strong style={{ display: 'block', color: '#0f172a' }}>{job.jobNo}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '10.5px' }}>PO NO</span>
                  <strong style={{ display: 'block', color: '#0f172a' }}>{job.poNo || `PO-NA-${job.jobNo}`}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '10.5px' }}>STYLE REF</span>
                  <strong style={{ display: 'block', color: '#2563eb' }}>{job.styleNo}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '10.5px' }}>BUYER</span>
                  <strong style={{ display: 'block', color: '#0f172a' }}>{job.buyer}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '10.5px' }}>DELIVERY DATE</span>
                  <strong style={{ display: 'block', color: '#d97706' }}>{shipDate}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '10.5px' }}>TOTAL ORDER QTY</span>
                  <strong style={{ display: 'block', color: '#0f172a' }}>{qty.toLocaleString()} pcs</strong>
                </div>
              </div>

              {/* Fabric Booking Table */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                      <th style={{ padding: '8px 10px' }}>Component</th>
                      <th style={{ padding: '8px 10px' }}>Construction</th>
                      <th style={{ padding: '8px 10px' }}>GSM &amp; Width</th>
                      <th style={{ padding: '8px 10px' }}>Yarn Count</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Consumption (kg/pc)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Booking Qty (kg)</th>
                      <th style={{ padding: '8px 10px' }}>Supplier / Mill</th>
                      <th style={{ padding: '8px 10px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fabricRows.map(f => (
                      <tr key={f.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: '#0f172a' }}>{f.fabric}</td>
                        <td style={{ padding: '8px 10px' }}>{f.construction}</td>
                        <td style={{ padding: '8px 10px' }}>{f.gsm} GSM · {f.width}</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{f.yarnCount}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{f.consumption.toFixed(3)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>{f.bookingQty.toLocaleString()} kg</td>
                        <td style={{ padding: '8px 10px' }}>{f.supplier}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '10.5px' }}>
                            {f.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                      <td style={{ padding: '9px 10px' }} colSpan={4}>TOTAL BULK FABRIC REQUIREMENT</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>0.268 kg/pc</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: '#2563eb' }}>
                        {fabricRows.reduce((s, r) => s + r.bookingQty, 0).toLocaleString()} kg
                      </td>
                      <td style={{ padding: '9px 10px' }} colSpan={2}>Knitting &amp; Dyeing Slots Allocated</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Direct Link to Upstream Mills */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link
                  href="/modules/yarn"
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, color: '#0f172a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  🧶 Link to Yarn Spinning Requisition →
                </Link>
                <Link
                  href="/modules/knitting"
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, color: '#0f172a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  ⚙️ Link to Knitting Floor Program →
                </Link>
                <Link
                  href="/modules/dyeing"
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, color: '#0f172a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  🧪 Link to Dyeing Batch Schedule →
                </Link>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: T&A (Time & Action Critical Path)
              ========================================================================= */}
          {activeTab === 'ta' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Time &amp; Action Critical Path Schedule</strong>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    16 Operational Milestones with Department Responsibility, Delay Variance &amp; Alerts
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => showToast('T&A baseline revised and saved')}
                    style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    💾 Save T&A Updates
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast('Exporting T&A Excel Critical Path')}
                    style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '5px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    📥 Export T&A
                  </button>
                </div>
              </div>

              {/* T&A Table */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                      <th style={{ padding: '8px 10px' }}>Milestone / Task</th>
                      <th style={{ padding: '8px 10px' }}>Dept</th>
                      <th style={{ padding: '8px 10px' }}>Plan Start - End</th>
                      <th style={{ padding: '8px 10px' }}>Actual End</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Delay</th>
                      <th style={{ padding: '8px 10px' }}>Status</th>
                      <th style={{ padding: '8px 10px' }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taMilestones.map(m => {
                      const isOverdue = m.delay > 0;
                      return (
                        <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', background: isOverdue ? '#fff1f2' : undefined }}>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>{m.name}</td>
                          <td style={{ padding: '8px 10px', color: '#64748b' }}>{m.dept}</td>
                          <td style={{ padding: '8px 10px', color: '#475569' }}>{m.planStart} → {m.planEnd}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: m.actEnd !== '—' ? '#0f172a' : '#94a3b8' }}>{m.actEnd}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: isOverdue ? '#dc2626' : '#16a34a' }}>
                            {m.delay > 0 ? `+${m.delay}d` : '0d'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 800,
                              background: m.status === 'Completed' ? '#dcfce7' : m.status === 'In Progress' ? '#dbeafe' : isOverdue ? '#fee2e2' : '#fef3c7',
                              color: m.status === 'Completed' ? '#166534' : m.status === 'In Progress' ? '#1e40af' : isOverdue ? '#991b1b' : '#92400e'
                            }}>
                              {m.status}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', color: '#64748b' }}>{m.remarks}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: TRIMS (Trims & Accessories BOM Order Sheet)
              ========================================================================= */}
          {activeTab === 'trims' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Trims &amp; Accessories BOM Order Sheet</strong>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Required quantity, bookings, warehouse received and in-house clearance
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => showToast('All pending trims marked received in-house')}
                    style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ✓ Receive In-House
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast('Trims BOM export complete')}
                    style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '5px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    📥 Export BOM
                  </button>
                </div>
              </div>

              {/* Trims Table */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                      <th style={{ padding: '8px 10px' }}>Item</th>
                      <th style={{ padding: '8px 10px' }}>Description &amp; Specification</th>
                      <th style={{ padding: '8px 10px' }}>Nominated Supplier</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Req Qty</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Booking Qty</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rec Qty</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Balance</th>
                      <th style={{ padding: '8px 10px' }}>In-House Date</th>
                      <th style={{ padding: '8px 10px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trimsRows.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: '#0f172a' }}>{t.item}</td>
                        <td style={{ padding: '8px 10px' }}>{t.desc} ({t.sizeSpec})</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{t.supplier}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{t.reqQty.toLocaleString()} {t.uom}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{t.bookingQty.toLocaleString()} {t.uom}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>{t.recQty.toLocaleString()}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: t.balance > 0 ? '#dc2626' : '#64748b' }}>{t.balance}</td>
                        <td style={{ padding: '8px 10px' }}>{t.inHouseDate}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '10px' }}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: APPROVAL (Lab Dip, Shade Band, Strike-off)
              ========================================================================= */}
          {activeTab === 'approval' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Shade Band, Lab Dip &amp; Strike-Off Approvals</strong>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Spectrometer spectrophotometer ΔE values, light source matching and buyer sign-offs
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('New lab dip option submitted to buyer')}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  + Submit New Shade Option
                </button>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                      <th style={{ padding: '8px 12px' }}>Colorway</th>
                      <th style={{ padding: '8px 12px' }}>Sample Type</th>
                      <th style={{ padding: '8px 12px' }}>ΔE Spectro</th>
                      <th style={{ padding: '8px 12px' }}>Submitted</th>
                      <th style={{ padding: '8px 12px' }}>Approved Date</th>
                      <th style={{ padding: '8px 12px' }}>Light Box Standard</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 800, color: '#0f172a' }}>Navy Blazer (19-3921 TCX)</td>
                      <td style={{ padding: '8px 12px' }}>Lab Dip Option B</td>
                      <td style={{ padding: '8px 12px', color: '#16a34a', fontWeight: 700 }}>ΔE = 0.42 (PASS)</td>
                      <td style={{ padding: '8px 12px' }}>24-Jun-2026</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>28-Jun-2026</td>
                      <td style={{ padding: '8px 12px', color: '#64748b' }}>D65 Primary / TL84 Store</td>
                      <td style={{ padding: '8px 12px' }}><span style={{ color: '#16a34a', fontWeight: 800 }}>✓ APPROVED</span></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 800, color: '#0f172a' }}>Optical White</td>
                      <td style={{ padding: '8px 12px' }}>Lab Dip Option A</td>
                      <td style={{ padding: '8px 12px', color: '#16a34a', fontWeight: 700 }}>ΔE = 0.38 (PASS)</td>
                      <td style={{ padding: '8px 12px' }}>24-Jun-2026</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>27-Jun-2026</td>
                      <td style={{ padding: '8px 12px', color: '#64748b' }}>D65 / UV Optical Brightener</td>
                      <td style={{ padding: '8px 12px' }}><span style={{ color: '#16a34a', fontWeight: 800 }}>✓ APPROVED</span></td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', fontWeight: 800, color: '#0f172a' }}>AOP Rotary Print Strike-Off</td>
                      <td style={{ padding: '8px 12px' }}>3rd Strike (Pigment Discharge)</td>
                      <td style={{ padding: '8px 12px', color: '#16a34a', fontWeight: 700 }}>Visual Match OK</td>
                      <td style={{ padding: '8px 12px' }}>02-Jul-2026</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>05-Jul-2026</td>
                      <td style={{ padding: '8px 12px', color: '#64748b' }}>D65 Natural Daylight</td>
                      <td style={{ padding: '8px 12px' }}><span style={{ color: '#16a34a', fontWeight: 800 }}>✓ APPROVED</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: SAMPLE (Proto, Fit, Salesman, PP Sample Submissions)
              ========================================================================= */}
          {activeTab === 'sample' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Garment Sample Progression Ledger</strong>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Proto, Fit Sample, Salesman Sample (SMS), and Pre-Production (PP) dispatch records
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Sample room dispatch recorded')}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  + Record Sample Dispatch
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {[
                  { stage: 'Proto Sample', date: '10-May-2026', awb: 'Handover at Buyer Office', status: 'Approved', comment: 'Base block accepted' },
                  { stage: 'Fit Sample', date: '04-Jun-2026', awb: 'DHL #448920119', status: 'Approved', comment: 'Chest width +1cm adjusted' },
                  { stage: 'Salesman Sample (SMS)', date: '22-Jun-2026', awb: 'FedEx #778104921', status: 'Approved', comment: 'Showroom set 24 pcs shipped' },
                  { stage: 'Pre-Production (PP)', date: '15-Jul-2026', awb: 'DHL #884920194', status: 'Approved w/ Notes', comment: 'Ready for bulk cutting' }
                ].map((s, idx) => (
                  <div key={idx} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{s.stage}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Dispatched: {s.date}</div>
                    <div style={{ fontSize: '10.5px', color: '#2563eb', marginTop: '2px' }}>{s.awb}</div>
                    <div style={{ marginTop: '8px' }}>
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 800 }}>
                        ✓ {s.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic', marginTop: '6px' }}>
                      &ldquo;{s.comment}&rdquo;
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: PP COMMENTS & FILE HANDOVER (Crucial CAD Trigger Rule)
              ========================================================================= */}
          {activeTab === 'pp_comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Critical Rule Callout */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #93c5fd',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <span style={{ fontSize: '22px' }}>🎯</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: '#1e3a8a' }}>
                    NOS MERCHANDISING STANDARD: CAD HANDOVER ACTIVATION TRIGGER
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#1d4ed8', marginTop: '3px', lineHeight: '1.5' }}>
                    Receiving <strong>PP Comments</strong> from the buyer automatically triggers <strong>CAD File Handover</strong> and grading activation.
                    (Important: TT Comments do <em>not</em> activate CAD handover; only buyer PP Comments unlock production pattern release).
                  </div>
                </div>
              </div>

              {/* PP Comments Detail Card */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Buyer PP Sample Approval Sheet &amp; Technical Notes</strong>
                  <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '11px' }}>
                    STATUS: APPROVED TO PROCEED FOR BULK
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '11.5px', marginBottom: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Received Date:</span>
                    <strong style={{ display: 'block', color: '#0f172a' }}>20-Jul-2026, 14:15</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Buyer QA Sign-off:</span>
                    <strong style={{ display: 'block', color: '#0f172a' }}>Clara Jensen (Copenhagen Technical QA)</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Handover File Status:</span>
                    <strong style={{ display: 'block', color: '#16a34a' }}>Dispatched to CAD Department</strong>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', fontSize: '12px', color: '#334155' }}>
                  <strong style={{ display: 'block', color: '#0f172a', marginBottom: '4px' }}>Specific Technical Directives:</strong>
                  <p style={{ margin: '0 0 6px' }}>
                    1. &ldquo;Approved to proceed for bulk cutting with comments. Ensure neck opening holds 56cm minimum stretch recovery across all size ranges.&rdquo;
                  </p>
                  <p style={{ margin: '0 0 6px' }}>
                    2. &ldquo;Side seam label placement verified at 10cm above bottom hem on left side.&rdquo;
                  </p>
                  <p style={{ margin: 0 }}>
                    3. &ldquo;Main label centering on back neck tape must maintain zero tilt tolerance.&rdquo;
                  </p>
                </div>

                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => showToast('Buyer PP Comment PDF opened')}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    📄 View Original Buyer PP Comment PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('cad'); showToast('Jumped to CAD Workspace'); }}
                    style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    🚀 Open CAD Handover Workspace →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: CAD (CAD & Marker Efficiency)
              ========================================================================= */}
          {activeTab === 'cad' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>CAD Room, Grading &amp; Marker Efficiency Ledger</strong>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Pattern version, fabric shrinkage allowance, marker width and cutting table release
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Marker file dispatched to Gerber cutter')}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  ⚡ Send Marker to Auto-Cutter
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Pattern Master Version</span>
                  <strong style={{ display: 'block', fontSize: '15px', color: '#0f172a', marginTop: '2px' }}>VER_3.2_BULK_REV</strong>
                  <span style={{ fontSize: '11px', color: '#16a34a' }}>PP comments incorporated</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Cuttable Marker Width</span>
                  <strong style={{ display: 'block', fontSize: '15px', color: '#0f172a', marginTop: '2px' }}>67.5&quot; Open Width</strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Fabric edge allowance 1.0&quot;</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Marker Efficiency %</span>
                  <strong style={{ display: 'block', fontSize: '18px', color: '#16a34a', marginTop: '2px' }}>86.8%</strong>
                  <span style={{ fontSize: '11px', color: '#16a34a' }}>+1.2% above standard</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Shrinkage Allowance</span>
                  <strong style={{ display: 'block', fontSize: '15px', color: '#0f172a', marginTop: '2px' }}>L: -2.5% / W: -1.5%</strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Pre-wash tested by QA</span>
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', fontSize: '12px' }}>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '8px' }}>CAD File Tracking Information</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', color: '#475569' }}>
                  <div>CAD Handover Activation: <strong style={{ color: '#16a34a' }}>PP Comments Received (20-Jul)</strong></div>
                  <div>CAD Technician: <strong>Nazmul H. (Gerber CAD Dept)</strong></div>
                  <div>Marker File: <strong>NOS_{job.jobNo}_M01.mrk</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: SIZE SET (Cutting & Sewing Measurement Check)
              ========================================================================= */}
          {activeTab === 'sizeset' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Size Set Sample &amp; Measurement Audit</strong>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Pre-bulk cutting full size set (XS - 2XL) measurement verification and QA sign-off
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Size set audit signed off')}
                  style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  ✓ QA Sign-off Size Set
                </button>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                      <th style={{ padding: '8px 10px' }}>Measurement Point (POM)</th>
                      <th style={{ padding: '8px 10px' }}>Spec (M)</th>
                      <th style={{ padding: '8px 10px' }}>Tolerance</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Actual Size Set (M)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Variance</th>
                      <th style={{ padding: '8px 10px' }}>Audit Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { pom: 'Total Body Length (HSP)', spec: '72.0 cm', tol: '±1.0 cm', act: '72.2 cm', var: '+0.2 cm', ok: true },
                      { pom: 'Chest Width (1/2 below armhole)', spec: '53.0 cm', tol: '±1.0 cm', act: '53.1 cm', var: '+0.1 cm', ok: true },
                      { pom: 'Bottom Hem Width (1/2)', spec: '52.0 cm', tol: '±1.0 cm', act: '52.0 cm', var: '0.0 cm', ok: true },
                      { pom: 'Shoulder Width', spec: '45.0 cm', tol: '±0.5 cm', act: '45.2 cm', var: '+0.2 cm', ok: true },
                      { pom: 'Sleeve Length from Shoulder', spec: '22.0 cm', tol: '±0.5 cm', act: '22.1 cm', var: '+0.1 cm', ok: true },
                      { pom: 'Neck Opening Width', spec: '18.5 cm', tol: '±0.5 cm', act: '18.5 cm', var: '0.0 cm', ok: true },
                      { pom: 'Neck Drop Front', spec: '9.0 cm', tol: '±0.5 cm', act: '9.1 cm', var: '+0.1 cm', ok: true },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>{row.pom}</td>
                        <td style={{ padding: '8px 10px' }}>{row.spec}</td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{row.tol}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>{row.act}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>{row.var}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '10px' }}>
                            ✓ PASS
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: TT MEETING (Technical Trial / Pre-Production Meeting Minutes)
              ========================================================================= */}
          {activeTab === 'tt_meeting' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Pre-Production (TT) Meeting Minutes &amp; Floor Coordination</strong>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Cutting, Sewing, Quality, IE &amp; Merchandising alignment meeting before bulk line loading
                  </div>
                </div>
                <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '11px' }}>
                  ✓ TT MEETING SIGNED OFF (02-Aug-2026)
                </span>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '11.5px', marginBottom: '14px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Meeting Date:</span>
                    <strong style={{ display: 'block', color: '#0f172a' }}>02-Aug-2026, 11:00 AM</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Venue:</span>
                    <strong style={{ display: 'block', color: '#0f172a' }}>Factory 1 Conference Hall</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Assigned Line:</span>
                    <strong style={{ display: 'block', color: '#2563eb' }}>Line 14B &amp; 16B (NFL 1)</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Target Daily Output:</span>
                    <strong style={{ display: 'block', color: '#16a34a' }}>1,800 pcs / line / day</strong>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <strong style={{ color: '#0f172a' }}>Critical Precautionary Agreements:</strong>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    1. <strong>Needle Specification:</strong> Use Ballpoint SES #65 for single jersey knit to eliminate needle cut holes.
                  </div>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    2. <strong>Differential Feed:</strong> Sewing overlock machines must maintain 1:1.1 differential ratio on side seams to prevent roping effect.
                  </div>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    3. <strong>Metal Detector Calibration:</strong> All finished packed garments must pass 9-point 1.0mm ferrous test without exception.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: PRODUCTION (Floor Production Follow-up)
              ========================================================================= */}
          {activeTab === 'production' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Floor Production Execution &amp; Line Allocation</strong>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Cutting, Sewing, Finishing, Packing daily output vs targets and reject rates
                  </div>
                </div>
                <Link
                  href="/merchandising/production"
                  style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '5px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, textDecoration: 'none' }}
                >
                  📊 Production Module View →
                </Link>
              </div>

              {/* Floor KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Cutting Completed</span>
                  <strong style={{ display: 'block', fontSize: '16px', color: '#0f172a' }}>
                    {Math.round(qty * 1.025).toLocaleString()} pcs
                  </strong>
                  <span style={{ fontSize: '10.5px', color: '#16a34a', fontWeight: 700 }}>102.5% of order</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Sewing Actual</span>
                  <strong style={{ display: 'block', fontSize: '16px', color: '#2563eb' }}>
                    {Math.round(qty * (progress / 100)).toLocaleString()} pcs
                  </strong>
                  <span style={{ fontSize: '10.5px', color: '#2563eb', fontWeight: 700 }}>{progress}% completed</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Finishing / Ironing</span>
                  <strong style={{ display: 'block', fontSize: '16px', color: '#16a34a' }}>
                    {Math.round(qty * ((progress - 5) / 100)).toLocaleString()} pcs
                  </strong>
                  <span style={{ fontSize: '10.5px', color: '#16a34a', fontWeight: 700 }}>47% finished</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Packed in Cartons</span>
                  <strong style={{ display: 'block', fontSize: '16px', color: '#d97706' }}>
                    {Math.round(qty * ((progress - 12) / 100)).toLocaleString()} pcs
                  </strong>
                  <span style={{ fontSize: '10.5px', color: '#d97706', fontWeight: 700 }}>40% packed</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800 }}>Overall Sewing &amp; Finishing Completion</span>
                  <strong style={{ color: '#2563eb' }}>{progress}%</strong>
                </div>
                <div style={{ height: '10px', borderRadius: '5px', background: '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: '#2563eb' }} />
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: PACKING & SHIPMENT (Packing List, Inspection, Cargo Closing)
              ========================================================================= */}
          {activeTab === 'packing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Packing List, Commercial Handover &amp; Shipment</strong>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Carton breakdown, gross weight, CBM volume, final inspection pass and cargo closing
                  </div>
                </div>
                <Link
                  href="/merchandising/shipment-closing"
                  style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '5px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, textDecoration: 'none' }}
                >
                  📦 Shipment Closing Workspace →
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Total Cartons</span>
                  <strong style={{ display: 'block', fontSize: '16px', color: '#0f172a' }}>
                    {Math.ceil(qty / 24).toLocaleString()} ctn
                  </strong>
                  <span style={{ fontSize: '10.5px', color: '#64748b' }}>Solid ratio pack (24 pcs/ctn)</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Estimated CBM Volume</span>
                  <strong style={{ display: 'block', fontSize: '16px', color: '#0f172a' }}>
                    ~46.8 CBM
                  </strong>
                  <span style={{ fontSize: '10.5px', color: '#64748b' }}>1 x 40ft HQ Container</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Ex-Factory Target</span>
                  <strong style={{ display: 'block', fontSize: '16px', color: '#d97706' }}>
                    {shipDate}
                  </strong>
                  <span style={{ fontSize: '10.5px', color: '#16a34a', fontWeight: 700 }}>13 days remaining</span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Cargo Closing Port</span>
                  <strong style={{ display: 'block', fontSize: '16px', color: '#dc2626' }}>
                    18-Oct-2026
                  </strong>
                  <span style={{ fontSize: '10.5px', color: '#dc2626', fontWeight: 700 }}>Chittagong Port CFS</span>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: DOCUMENTS & CERTIFICATES
              ========================================================================= */}
          {activeTab === 'documents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Job Document &amp; Certificate Repository</strong>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Certified Tech Pack, Buyer PO Sheets, Fabric Booking, Certified Lab Reports and Trim Cards
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('New document attached to job file')}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  + Upload Document
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {[
                  { title: 'Buyer Tech Pack (Final Approved)', type: 'PDF Spec Sheet', size: '4.8 MB', date: '18-Jun-2026', author: 'Clara Jensen' },
                  { title: 'Purchase Order Contract (PO-ONLY-2026-A)', type: 'Official Buyer PO', size: '1.2 MB', date: '20-Jun-2026', author: 'Merchandising' },
                  { title: 'Fabric Order Sheet (CAD Consumption)', type: 'Internal Booking', size: '840 KB', date: '24-Jun-2026', author: 'Md. Jahidul Islam' },
                  { title: 'Lab Test Certificate (ISO 105 Fastness & Shrinkage)', type: 'Intertek Lab Report', size: '2.1 MB', date: '04-Jul-2026', author: 'Intertek QA' },
                  { title: 'Approved Trim & Accessories Card', type: 'Scanned Card & Seal', size: '3.4 MB', date: '10-Jul-2026', author: 'QA Sample Dept' },
                  { title: 'PP Sample Buyer Approval Sheet', type: 'Signed Sign-off', size: '1.5 MB', date: '20-Jul-2026', author: 'Buyer QA Dept' }
                ].map((doc, idx) => (
                  <div key={idx} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{doc.title}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {doc.type} · {doc.size} · Uploaded {doc.date}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => showToast(`Previewing ${doc.title}`)}
                        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => showToast(`Downloading ${doc.title}`)}
                        style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: ACTIVITY & AUDIT HISTORY
              ========================================================================= */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Job Operational Audit Trail &amp; Revisions</strong>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Complete timestamped log of merchandiser updates, approvals and system triggers
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Audit history exported as CSV')}
                  style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  📥 Export Audit Log
                </button>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { title: 'Sewing Floor Input Passed 50% Milestone', user: 'Shamim Hossain (Merchandiser)', time: '08 Oct 2026, 11:20', icon: '🧵', tag: 'PRODUCTION' },
                    { title: 'TT Meeting Minutes Approved & Production Lines Assigned', user: 'Md. Jahidul Islam (Sr. Merch)', time: '02 Aug 2026, 16:45', icon: '📝', tag: 'TT MEETING' },
                    { title: 'Size Set Measurement Audit Passed with 0.0mm Tolerance', user: 'QA Central Lab', time: '28 Jul 2026, 14:10', icon: '📏', tag: 'SIZE SET' },
                    { title: 'CAD File Handover Triggered by Buyer PP Comments', user: 'System Automatic Trigger', time: '20 Jul 2026, 14:16', icon: '⚡', tag: 'CAD TRIGGER' },
                    { title: 'Buyer PP Sample Approved with Comments', user: 'Clara Jensen (Buyer QA)', time: '20 Jul 2026, 14:15', icon: '✓', tag: 'APPROVAL' },
                    { title: 'All Trims In-House Verified at Warehouse Store', user: 'Warehouse Store In-charge', time: '10 Jul 2026, 09:30', icon: '📦', tag: 'TRIMS' },
                    { title: 'Fabric Order Sheet Issued to NFL Dyehouse', user: 'Md. Jahidul Islam (Sr. Merch)', time: '24 Jun 2026, 15:00', icon: '📋', tag: 'FABRIC' },
                    { title: 'Job Created and Initial PO Schedule Registered', user: 'Shamim Hossain (Merchandiser)', time: '20 Jun 2026, 09:12', icon: '✨', tag: 'ORDER ENTRY' }
                  ].map((act, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center', fontSize: '13px', flexShrink: 0 }}>
                        {act.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{act.title}</span>
                          <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '9.5px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px' }}>
                            {act.tag}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {act.user} · <span style={{ color: '#94a3b8' }}>{act.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: COSTING (Quick Pre-Order Cost Breakdown)
              ========================================================================= */}
          {activeTab === 'costing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>Pre-Order Cost Sheet Reference</strong>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Salesman sample pre-costing, fabric kg consumption and net CM profit analysis
                  </div>
                </div>
                <Link
                  href="/merchandising/costing"
                  style={{ background: '#2563eb', color: '#fff', padding: '5px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, textDecoration: 'none' }}
                >
                  Open Full Pre-Order Costing Screen →
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>FOB Unit Price</span>
                  <strong style={{ display: 'block', fontSize: '18px', color: '#0f172a' }}>${fobPrice.toFixed(2)}</strong>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Total FOB Revenue</span>
                  <strong style={{ display: 'block', fontSize: '18px', color: '#2563eb' }}>${totalFob.toLocaleString()}</strong>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Net Factory Margin</span>
                  <strong style={{ display: 'block', fontSize: '18px', color: '#16a34a' }}>18.4%</strong>
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Cost Component</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cost / Pc (USD)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Cost (USD)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Share %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { item: 'Yarn (28/1 Ne Combed Cotton)', cost: 1.85, share: '35.2%' },
                      { item: 'Knitting & Dyeing Processing', cost: 1.15, share: '21.9%' },
                      { item: 'CM (Cutting & Sewing Labor)', cost: 0.95, share: '18.1%' },
                      { item: 'Accessories & Packaging Trims', cost: 0.42, share: '8.0%' },
                      { item: 'Printing / Embroidery', cost: 0.28, share: '5.3%' },
                      { item: 'Commercial & Freight to Port', cost: 0.15, share: '2.9%' },
                      { item: 'Factory Margin (Profit)', cost: 0.45, share: '8.6%' }
                    ].map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{c.item}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>${c.cost.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>${Math.round(c.cost * qty).toLocaleString()}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b' }}>{c.share}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
