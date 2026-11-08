'use client';

/**
 * NOS Sales & Merchandising — Bulk Production Workspace
 *
 * Implements the 6 sequential merchandiser sub-menus (docs/UX-STANDARD.md):
 * 1. Dashboard — merchandiser KPI cards, stage progress donuts, and active job table
 * 2. Order Entry — repeat/new job, CCD grouping, edit-locked sizes, garment fabric-parts, photo upload
 * 3. Create BOM — fabric parts, trims checklist, IE thread/technical routing, planning approval gate
 * 4. Fabric Order Sheet — CAD consumption + DIA driven booking, pending badges, print view
 * 5. Trims Ordering — expandable items, timestamped updates, dedicated save button
 * 6. Follow-up — full-width milestone DataGrid (Lab Dip, Fabric, Trims, File Handover, PP Meeting, Sewing, Ex-factory)
 */

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Shell from '../../components/Shell';
import demo2000DataRaw from '../../data/demo-2000-master.json';
import {
  Card,
  KpiCard,
  Button,
  Badge,
  DataGrid,
  GridColumn,
  SectionNav,
  Alert
} from '../../components/ui';
import { fmtDate, fmtNum } from '../../lib/format';
import {
  LayoutDashboard,
  FilePlus,
  FileSpreadsheet,
  Layers,
  ShoppingBag,
  Clock,
  Printer,
  Download,
  Plus,
  Save,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Shirt,
  Sparkles,
  Search,
  Check,
  Send,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  Eye,
  FileCheck
} from 'lucide-react';

type SubTabId = 'dashboard' | 'order-entry' | 'create-bom' | 'fabric-sheet' | 'trims-order' | 'follow-up';

const SUB_TABS = [
  { id: 'dashboard', code: '01', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'order-entry', code: '02', label: 'Order Entry', icon: FilePlus },
  { id: 'create-bom', code: '03', label: 'Create BOM', icon: FileSpreadsheet },
  { id: 'fabric-sheet', code: '04', label: 'Fabric Order Sheet', icon: Layers },
  { id: 'trims-order', code: '05', label: 'Trims Ordering', icon: ShoppingBag },
  { id: 'follow-up', code: '06', label: 'Follow-up', icon: Clock }
];

const FABRIC_PARTS = [
  { id: 'part-body', part: 'Body Fabric', types: ['100% Combed Cotton Single Jersey 160 GSM', 'CVC 60/40 French Terry 260 GSM', '80/20 Cotton Poly Fleece 300 GSM', '100% Cotton Pique 210 GSM'] },
  { id: 'part-rib', part: 'Neck Rib', types: ['1x1 Cotton Lycra Rib 220 GSM', '2x2 Lycra Rib 280 GSM', 'Self Fabric Binding'] },
  { id: 'part-cuff', part: 'Cuff & Bottom Hem', types: ['1x1 Cotton Lycra Rib 220 GSM', '2x2 Lycra Rib 280 GSM', 'Standard Hem (No Rib)'] },
  { id: 'part-pocket', part: 'Pocket / Inner Lining', types: ['Single Jersey 140 GSM DTM', 'T/C Pocketing Fabric 110 GSM', 'Self Fabric'] }
];

export default function BulkMerchandisingPage() {
  const masterJobs: any[] = useMemo(() => (demo2000DataRaw as any)?.jobs || [], []);
  const [activeTab, setActiveTab] = useState<SubTabId>('dashboard');
  const [selectedJobNo, setSelectedJobNo] = useState<string>(masterJobs[0]?.jobNo ? String(masterJobs[0].jobNo) : '44001');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Currently focused job for BOM / Fabric / Trims views
  const currentJob = useMemo(() => {
    return masterJobs.find(j => String(j.jobNo) === String(selectedJobNo)) || masterJobs[0];
  }, [selectedJobNo, masterJobs]);

  /* ------------------------------------------------------------------ TAB 1: DASHBOARD */
  const dashboardStats = useMemo(() => {
    const totalJobs = masterJobs.length;
    const totalVolume = masterJobs.reduce((s, j) => s + (j.orderQty || 0), 0);
    const inProductionJobs = masterJobs.filter(j => j.overallStage !== 'Shipment' && j.overallStage !== 'Order Entry').length;
    const inProductionVolume = masterJobs
      .filter(j => j.overallStage !== 'Shipment' && j.overallStage !== 'Order Entry')
      .reduce((s, j) => s + (j.orderQty || 0), 0);
    const shippedVolume = masterJobs
      .filter(j => j.overallStage === 'Shipment')
      .reduce((s, j) => s + (j.orderQty || 0), 0);

    return { totalJobs, totalVolume, inProductionJobs, inProductionVolume, shippedVolume };
  }, [masterJobs]);

  const dashboardColumns: GridColumn<any>[] = useMemo(() => [
    {
      key: 'jobNo',
      header: 'Job No',
      width: 120,
      render: (j) => (
        <Link
          href={`/jobs?q=${encodeURIComponent(j.jobNo)}`}
          onClick={(e) => e.stopPropagation()}
          style={{ color: '#0284C7', fontWeight: 700, textDecoration: 'none' }}
          className="hover:underline"
        >
          {j.jobNo}
        </Link>
      )
    },
    { key: 'buyer', header: 'Buyer', width: 130 },
    { key: 'styleNo', header: 'Style No', width: 130 },
    { key: 'item', header: 'Garment Item', width: 140 },
    { key: 'orderQty', header: 'Order Qty (pcs)', width: 130, numeric: true, total: true, render: (j) => fmtNum(j.orderQty) },
    { key: 'overallStage', header: 'Overall Stage', width: 150 },
    {
      key: 'riskStatus',
      header: 'Status',
      width: 120,
      render: (j) => (
        <Badge tone={j.riskStatus === 'CRITICAL' ? 'balance' : j.riskStatus === 'ATTENTION' ? 'mid' : 'done'}>
          {j.riskStatus}
        </Badge>
      )
    },
    { key: 'planMonth', header: 'Ship Month', width: 110 },
    { key: 'merchandiser', header: 'Merchandiser', width: 130 }
  ], []);

  /* ------------------------------------------------------------------ TAB 2: ORDER ENTRY */
  const [entryJobType, setEntryJobType] = useState<'NEW' | 'REPEAT'>('NEW');
  const [entryBuyer, setEntryBuyer] = useState('ONLY');
  const [entryStyle, setEntryStyle] = useState('ONLY-20268819');
  const [entryItem, setEntryItem] = useState('T-Shirt');
  const [entryBodyFabric, setEntryBodyFabric] = useState(FABRIC_PARTS[0].types[0]);
  const [entryNeckRib, setEntryNeckRib] = useState(FABRIC_PARTS[1].types[0]);
  const [entryCuff, setEntryCuff] = useState(FABRIC_PARTS[2].types[2]);
  const [sizesLocked, setSizesLocked] = useState(false);
  const [sizes, setSizes] = useState({ XS: 500, S: 1200, M: 2000, L: 1800, XL: 1000, XXL: 500 });
  const entryTotalQty = useMemo(() => Object.values(sizes).reduce((a, b) => a + b, 0), [sizes]);
  const [frontImageUploaded, setFrontImageUploaded] = useState(false);
  const [backImageUploaded, setBackImageUploaded] = useState(false);
  const [orderCreatedSuccess, setOrderCreatedSuccess] = useState(false);

  /* ------------------------------------------------------------------ TAB 3: CREATE BOM */
  const [bomSubmittedToPlanning, setBomSubmittedToPlanning] = useState(false);
  const [bomIeThreadStatus, setBomIeThreadStatus] = useState<'ISSUED' | 'PENDING'>('ISSUED');
  const [bomTechLaceStatus, setBomTechLaceStatus] = useState<'CONFIRMED' | 'PENDING'>('CONFIRMED');

  /* ------------------------------------------------------------------ TAB 4: FABRIC ORDER SHEET */
  const fabricSheetLines = useMemo(() => {
    const f = currentJob.fabric || {};
    const req = f.fabricReqKg || 2500;
    return [
      { part: 'Body', fabric: f.fabricType || '100% Cotton Single Jersey', gsm: f.gsm || '160', dia: f.widthDia || '76" Open', cadCons: 2.14, bookingKg: req, mill: f.dyeingFactory || 'NFL', status: 'Booked' },
      { part: 'Neck Rib', fabric: '1x1 Cotton Lycra Rib', gsm: '220', dia: '48" Tubular', cadCons: 0.18, bookingKg: Math.round(req * 0.08), mill: f.dyeingFactory || 'NFL', status: 'Booked' }
    ];
  }, [currentJob]);

  /* ------------------------------------------------------------------ TAB 5: TRIMS ORDERING */
  const [trimsItems, setTrimsItems] = useState<any[]>([]);
  useEffect(() => {
    if (currentJob?.trims?.items) {
      setTrimsItems(currentJob.trims.items.map((it: any, idx: number) => ({
        id: `trim-${idx}`,
        name: it.name,
        supplier: it.supplier,
        reqQty: currentJob.orderQty,
        orderQty: Math.round(currentJob.orderQty * 1.03),
        status: it.status,
        inHouseDate: currentJob.trims?.inHouseDate || '15-Nov-2026'
      })));
    }
  }, [currentJob]);

  /* ------------------------------------------------------------------ TAB 6: FOLLOW-UP MILESTONES */
  const followUpColumns: GridColumn<any>[] = useMemo(() => [
    {
      key: 'jobNo',
      header: 'Job No',
      width: 110,
      render: (j) => (
        <Link
          href={`/jobs?q=${encodeURIComponent(j.jobNo)}`}
          onClick={(e) => e.stopPropagation()}
          style={{ color: '#0284C7', fontWeight: 700, textDecoration: 'none' }}
          className="hover:underline"
        >
          {j.jobNo}
        </Link>
      )
    },
    { key: 'buyer', header: 'Buyer', width: 120 },
    { key: 'styleNo', header: 'Style No', width: 120 },
    { key: 'orderQty', header: 'Order Qty', width: 110, numeric: true, render: (j) => fmtNum(j.orderQty) },
    {
      key: 'labDip',
      header: 'Lab Dip (Approval)',
      width: 150,
      render: (j) => (
        <span style={{ fontSize: '11px', color: j.dyeingLab?.status === 'APPROVED' ? '#16A34A' : '#D97706', fontWeight: 600 }}>
          {j.dyeingLab?.status === 'APPROVED' ? `Approved (${j.dyeingLab.optionApproved})` : 'Pending'}
        </span>
      )
    },
    {
      key: 'fabricInhouse',
      header: 'Fabric Status',
      width: 140,
      render: (j) => (
        <span style={{ fontSize: '11px', color: j.fabric?.fabricBalanceKg === 0 ? '#16A34A' : '#D97706', fontWeight: 600 }}>
          {j.fabric?.fabricBalanceKg === 0 ? '100% In-house' : `${fmtNum(j.fabric?.fabricReceivedKg || 0)} kg Recv`}
        </span>
      )
    },
    {
      key: 'trimsStatus',
      header: 'Trims In-house',
      width: 130,
      render: (j) => (
        <Badge tone={j.trims?.status === 'IN_HOUSE' ? 'done' : j.trims?.status === 'ORDERED' ? 'info' : 'mid'}>
          {j.trims?.status || 'DUE'}
        </Badge>
      )
    },
    { key: 'sewingStart', header: 'Sewing Start', width: 115, render: (j) => j.dates?.sewingStart || '—' },
    { key: 'exFactory', header: 'Ex-Factory Date', width: 125, render: (j) => j.dates?.exFactory || '—' },
    {
      key: 'health',
      header: 'Milestone Health',
      width: 130,
      render: (j) => (
        <Badge tone={j.riskStatus === 'CRITICAL' ? 'balance' : j.riskStatus === 'ATTENTION' ? 'mid' : 'done'}>
          {j.riskStatus === 'ON_TRACK' ? 'On Track' : j.riskStatus}
        </Badge>
      )
    }
  ], []);

  return (
    <Shell
      title="Sales & Merchandising"
      eyebrow="Bulk Production & Milestone Lifecycle"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 16,
          right: 24,
          zIndex: 9999,
          background: '#0F274E',
          color: '#FFFFFF',
          padding: '10px 18px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '12px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <CheckCircle2 size={16} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sequential 6-SubMenu Navigation */}
      <div style={{ marginBottom: 16 }}>
        <SectionNav
          stickyTop={0}
          sections={SUB_TABS}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as SubTabId)}
        />
      </div>

      {/* ===================================================================== TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <KpiCard
              label="My Open Jobs"
              value={fmtNum(dashboardStats.totalJobs)}
            />
            <KpiCard
              label="Total Order Volume"
              value={`${fmtNum(dashboardStats.totalVolume)} pcs`}
            />
            <KpiCard
              label="In Production"
              value={`${fmtNum(dashboardStats.inProductionVolume)} pcs`}
            />
            <KpiCard
              label="Shipped Volume"
              value={`${fmtNum(dashboardStats.shippedVolume)} pcs`}
            />
          </div>

          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Active Bulk Merchandising Register</div>
              <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>Click any Job No to inspect complete 360 life-cycle</span>
            </div>
          }>
            <DataGrid
              rows={masterJobs}
              columns={dashboardColumns}
              rowKey={(j) => String(j.id || j.jobNo)}
              frozenColumns={1}
              storageKey="bulk-merch-dashboard-grid"
              exportName="merchandising-bulk-jobs"
            />
          </Card>
        </div>
      )}

      {/* ===================================================================== TAB 2: ORDER ENTRY */}
      {activeTab === 'order-entry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orderCreatedSuccess && (
            <Alert tone="info">
              Job created and dispatched to Central IE, CAD, Dyeing Lab, and Central Planning!
            </Alert>
          )}

          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Order Entry & Garment Part Configuration</div>
              <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>Create or re-order repeat lots with part-wise fabric selection</span>
            </div>
          }>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              {/* Order Meta */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Job Type</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setEntryJobType('NEW')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: entryJobType === 'NEW' ? '1px solid #0284C7' : '1px solid #CBD5E1',
                        background: entryJobType === 'NEW' ? '#0F274E' : '#FFFFFF',
                        color: entryJobType === 'NEW' ? '#FFFFFF' : '#334155',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      New Order
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryJobType('REPEAT')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: entryJobType === 'REPEAT' ? '1px solid #0284C7' : '1px solid #CBD5E1',
                        background: entryJobType === 'REPEAT' ? '#0F274E' : '#FFFFFF',
                        color: entryJobType === 'REPEAT' ? '#FFFFFF' : '#334155',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Repeat Order Lot
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Buyer</label>
                  <select
                    value={entryBuyer}
                    onChange={(e) => setEntryBuyer(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px' }}
                  >
                    <option value="ONLY">ONLY (Bestseller)</option>
                    <option value="Name It">Name It (Bestseller)</option>
                    <option value="OVS">OVS S.p.A.</option>
                    <option value="UTG">UTG Group</option>
                    <option value="Only & Sons">Only & Sons</option>
                    <option value="New Look">New Look</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Style No</label>
                  <input
                    type="text"
                    value={entryStyle}
                    onChange={(e) => setEntryStyle(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Garment Item</label>
                  <select
                    value={entryItem}
                    onChange={(e) => setEntryItem(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px' }}
                  >
                    <option value="T-Shirt">T-Shirt (Crew Neck)</option>
                    <option value="Polo Shirt">Polo Shirt (Rib Collar)</option>
                    <option value="Sweatshirt">Sweatshirt (French Terry)</option>
                    <option value="Hoodie">Hoodie (Brushed Fleece)</option>
                    <option value="Trouser">Jogger Trouser</option>
                    <option value="Shorts">French Terry Shorts</option>
                  </select>
                </div>
              </div>

              {/* Part-wise Fabric Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Layers size={14} color="#0284C7" />
                  Garment Fabric Parts
                </h4>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Body Fabric</label>
                  <select
                    value={entryBodyFabric}
                    onChange={(e) => setEntryBodyFabric(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px' }}
                  >
                    {FABRIC_PARTS[0].types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Neck Rib / Collar</label>
                  <select
                    value={entryNeckRib}
                    onChange={(e) => setEntryNeckRib(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px' }}
                  >
                    {FABRIC_PARTS[1].types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Cuff / Bottom Rib</label>
                  <select
                    value={entryCuff}
                    onChange={(e) => setEntryCuff(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px' }}
                  >
                    {FABRIC_PARTS[2].types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Garment Photos / Sketches */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shirt size={14} color="#0284C7" />
                  Garment Sketches (Front / Back)
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div
                    onClick={() => setFrontImageUploaded(true)}
                    style={{
                      border: '2px dashed #CBD5E1',
                      borderRadius: 8,
                      padding: 14,
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: frontImageUploaded ? '#F0FDF4' : '#F8FAFC'
                    }}
                  >
                    <Upload size={20} color={frontImageUploaded ? '#16A34A' : '#64748B'} style={{ margin: '0 auto 6px' }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: frontImageUploaded ? '#16A34A' : '#475569', display: 'block' }}>
                      {frontImageUploaded ? 'Front View Attached' : 'Upload Front Sketch'}
                    </span>
                  </div>

                  <div
                    onClick={() => setBackImageUploaded(true)}
                    style={{
                      border: '2px dashed #CBD5E1',
                      borderRadius: 8,
                      padding: 14,
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: backImageUploaded ? '#F0FDF4' : '#F8FAFC'
                    }}
                  >
                    <Upload size={20} color={backImageUploaded ? '#16A34A' : '#64748B'} style={{ margin: '0 auto 6px' }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: backImageUploaded ? '#16A34A' : '#475569', display: 'block' }}>
                      {backImageUploaded ? 'Back View Attached' : 'Upload Back Sketch'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Size Breakdown */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E', margin: 0 }}>Size Breakdown & Order Quantities</h4>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>Total: {fmtNum(entryTotalQty)} pcs</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSizesLocked(!sizesLocked)}
                >
                  {sizesLocked ? <Lock size={12} style={{ marginRight: 4 }} /> : <Unlock size={12} style={{ marginRight: 4 }} />}
                  {sizesLocked ? 'Unlock Sizes' : 'Lock Sizes'}
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
                {(['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const).map(sz => (
                  <div key={sz}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', textAlign: 'center', marginBottom: 4 }}>{sz}</label>
                    <input
                      type="number"
                      disabled={sizesLocked}
                      value={sizes[sz]}
                      onChange={(e) => setSizes({ ...sizes, [sz]: Number(e.target.value) || 0 })}
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        padding: '6px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: sizesLocked ? '#F1F5F9' : '#FFFFFF'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button
                variant="primary"
                onClick={() => {
                  setOrderCreatedSuccess(true);
                  showToast('Order saved & dispatched to Central IE, CAD & Planning!');
                }}
              >
                <Save size={14} style={{ marginRight: 6 }} />
                Save & Dispatch Order
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== TAB 3: CREATE BOM */}
      {activeTab === 'create-bom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Job Picker Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E' }}>Active Job:</span>
            <select
              value={selectedJobNo}
              onChange={(e) => setSelectedJobNo(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600 }}
            >
              {masterJobs.slice(0, 50).map(j => (
                <option key={j.jobNo} value={j.jobNo}>Job #{j.jobNo} · {j.buyer} · {j.styleNo} ({fmtNum(j.orderQty)} pcs)</option>
              ))}
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <Badge tone={bomSubmittedToPlanning ? 'done' : 'mid'}>
                {bomSubmittedToPlanning ? 'Planning Approval: Submitted' : 'Planning Approval: Pending Draft'}
              </Badge>
            </div>
          </div>

          {/* BOM Sections */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
            {/* Fabric Section */}
            <Card title={
              <div>
                <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Fabric BOM Breakdown</div>
                <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>CAD consumption driven parts</span>
              </div>
            }>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                      <th style={{ padding: '8px 4px' }}>Part</th>
                      <th style={{ padding: '8px 4px' }}>Fabric Spec</th>
                      <th style={{ padding: '8px 4px' }}>CAD Cons</th>
                      <th style={{ padding: '8px 4px', textAlign: 'right' }}>Req (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 4px', fontWeight: 700 }}>Body</td>
                      <td style={{ padding: '8px 4px' }}>{currentJob.fabric?.fabricType || 'Single Jersey 160 GSM'}</td>
                      <td style={{ padding: '8px 4px' }}>2.14 kg/dz</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>{fmtNum(currentJob.fabric?.fabricReqKg || 2500)} kg</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 4px', fontWeight: 700 }}>Neck Rib</td>
                      <td style={{ padding: '8px 4px' }}>1x1 Cotton Lycra Rib 220 GSM</td>
                      <td style={{ padding: '8px 4px' }}>0.18 kg/dz</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>{fmtNum(Math.round((currentJob.fabric?.fabricReqKg || 2500) * 0.08))} kg</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Trims Section */}
            <Card title={
              <div>
                <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Trims & Accessories BOM Checklist</div>
                <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>Departmental task routing</span>
              </div>
            }>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#F8FAFC', borderRadius: 6 }}>
                  <div>
                    <strong style={{ fontSize: '12px', color: '#0F274E' }}>Sewing Thread (IE Department)</strong>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Consumption calculated from seam length</div>
                  </div>
                  <Badge tone={bomIeThreadStatus === 'ISSUED' ? 'done' : 'mid'}>
                    {bomIeThreadStatus === 'ISSUED' ? 'IE Issued' : 'Pending IE'}
                  </Badge>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#F8FAFC', borderRadius: 6 }}>
                  <div>
                    <strong style={{ fontSize: '12px', color: '#0F274E' }}>Technical & Special Trims</strong>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Drawcord, aglet, eyelet, zipper validation</div>
                  </div>
                  <Badge tone={bomTechLaceStatus === 'CONFIRMED' ? 'done' : 'mid'}>
                    {bomTechLaceStatus === 'CONFIRMED' ? 'Technical OK' : 'Pending Tech'}
                  </Badge>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#F8FAFC', borderRadius: 6 }}>
                  <div>
                    <strong style={{ fontSize: '12px', color: '#0F274E' }}>Packaging Materials</strong>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Polybag, master carton, barcode stickers</div>
                  </div>
                  <Badge tone="done">Merchandiser Confirmed</Badge>
                </div>

                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="primary"
                    disabled={bomSubmittedToPlanning}
                    onClick={() => {
                      setBomSubmittedToPlanning(true);
                      showToast('BOM submitted to Central Planning for production release!');
                    }}
                  >
                    <FileCheck size={14} style={{ marginRight: 6 }} />
                    {bomSubmittedToPlanning ? 'BOM Submitted to Planning' : 'Submit BOM for Planning Approval'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ===================================================================== TAB 4: FABRIC ORDER SHEET */}
      {activeTab === 'fabric-sheet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E' }}>Order Sheet Job:</span>
              <select
                value={selectedJobNo}
                onChange={(e) => setSelectedJobNo(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600 }}
              >
                {masterJobs.slice(0, 50).map(j => (
                  <option key={j.jobNo} value={j.jobNo}>Job #{j.jobNo} · {j.buyer} · {j.styleNo}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                <Printer size={13} style={{ marginRight: 4 }} />
                Print Order Sheet
              </Button>
            </div>
          </div>

          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Fabric Booking Order Sheet — Job #{currentJob.jobNo}</div>
              <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>{currentJob.buyer} · Style: {currentJob.styleNo} · {fmtNum(currentJob.orderQty)} pcs</span>
            </div>
          }>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '10px 8px' }}>Garment Part</th>
                    <th style={{ padding: '10px 8px' }}>Fabric Type</th>
                    <th style={{ padding: '10px 8px' }}>GSM</th>
                    <th style={{ padding: '10px 8px' }}>Finish Dia</th>
                    <th style={{ padding: '10px 8px' }}>CAD Cons</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Booking (kg)</th>
                    <th style={{ padding: '10px 8px' }}>Dyeing Mill</th>
                    <th style={{ padding: '10px 8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fabricSheetLines.map((line, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 700 }}>{line.part}</td>
                      <td style={{ padding: '10px 8px' }}>{line.fabric}</td>
                      <td style={{ padding: '10px 8px' }}>{line.gsm}</td>
                      <td style={{ padding: '10px 8px' }}>{line.dia}</td>
                      <td style={{ padding: '10px 8px' }}>{line.cadCons} kg/dz</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#0284C7' }}>{fmtNum(line.bookingKg)} kg</td>
                      <td style={{ padding: '10px 8px' }}>{line.mill}</td>
                      <td style={{ padding: '10px 8px' }}><Badge tone="done">{line.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== TAB 5: TRIMS ORDERING */}
      {activeTab === 'trims-order' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F274E' }}>Trims for Job:</span>
              <select
                value={selectedJobNo}
                onChange={(e) => setSelectedJobNo(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600 }}
              >
                {masterJobs.slice(0, 50).map(j => (
                  <option key={j.jobNo} value={j.jobNo}>Job #{j.jobNo} · {j.buyer} · {j.styleNo}</option>
                ))}
              </select>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => showToast('Trims procurement order updates saved successfully!')}
            >
              <Save size={13} style={{ marginRight: 4 }} />
              Save Trims Orders
            </Button>
          </div>

          <Card title={
            <div>
              <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Trims Purchase & Delivery Follow-up</div>
              <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>Expand item to update supplier progress and in-house target dates</span>
            </div>
          }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {trimsItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '12px 14px',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <strong style={{ fontSize: '12px', color: '#0F274E', display: 'block' }}>{item.name}</strong>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Supplier: {item.supplier}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>Order Qty</span>
                      <strong style={{ fontSize: '12px', color: '#0F274E' }}>{fmtNum(item.orderQty)}</strong>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10px', color: '#64748B', display: 'block' }}>In-House Target</span>
                      <strong style={{ fontSize: '12px', color: '#0F274E' }}>{item.inHouseDate}</strong>
                    </div>

                    <Badge tone={item.status === 'In-house' ? 'done' : 'info'}>
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== TAB 6: FOLLOW-UP */}
      {activeTab === 'follow-up' && (
        <Card title={
          <div>
            <div style={{ fontWeight: 700, color: 'var(--nos-ink)' }}>Merchandiser Milestone Follow-up Matrix</div>
            <span style={{ fontSize: '11px', color: 'var(--nos-ink-2)', fontWeight: 400 }}>Lab Dip, Fabric, Trims, PP Meeting & Shipment Ex-Factory Tracking</span>
          </div>
        }>
          <DataGrid
            rows={masterJobs}
            columns={followUpColumns}
            rowKey={(j) => String(j.id || j.jobNo)}
            frozenColumns={1}
            storageKey="merchandiser-followup-grid"
            exportName="merchandising-milestone-followup"
          />
        </Card>
      )}
    </Shell>
  );
}
