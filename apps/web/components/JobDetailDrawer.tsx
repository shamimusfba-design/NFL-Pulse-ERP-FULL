'use client';

import React, { useState } from 'react';

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
}

export default function JobDetailDrawer({ job, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'po' | 'sizes' | 'costing' | 'ta' | 'bom' | 'production' | 'shipment'>('po');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !job) return null;

  const qty = Number(job.orderQty || 40000);
  const fobPrice = Number(job.fobPrice || 5.25);
  const totalFob = Math.round(job.fobValue || qty * fobPrice);
  const orderDate = job.orderDate || job.dates?.poReceived || '01 Oct 2026';
  const shipDate = job.shipmentDate || job.dates?.exFactory || '21 Oct 2026';
  const season = job.season || 'FW 2026';
  const product = job.item || job.itemDescription || 'T-Shirt';
  const progress = Number(job.productionProgress || 52);

  // Sub PO breakdowns
  const poItems = [
    { poNo: job.poNo ? `${job.poNo}A` : `PO-NA-${job.jobNo}A`, color: 'Navy', qty: Math.round(qty * 0.25), fob: Math.round(totalFob * 0.25), unitPrice: fobPrice, status: 'Confirmed' },
    { poNo: job.poNo ? `${job.poNo}B` : `PO-NA-${job.jobNo}B`, color: 'Black', qty: Math.round(qty * 0.25), fob: Math.round(totalFob * 0.25), unitPrice: fobPrice, status: 'Confirmed' },
    { poNo: job.poNo ? `${job.poNo}C` : `PO-NA-${job.jobNo}C`, color: 'White', qty: Math.round(qty * 0.25), fob: Math.round(totalFob * 0.25), unitPrice: fobPrice, status: 'Confirmed' },
    { poNo: job.poNo ? `${job.poNo}D` : `PO-NA-${job.jobNo}D`, color: 'Grey Melange', qty: Math.round(qty * 0.25), fob: Math.round(totalFob * 0.25), unitPrice: fobPrice, status: 'Partial' },
  ];

  // Size distribution
  const sizeDistribution = [
    { size: 'XS', ratio: '1', order: Math.round(qty * 0.08), cut: Math.round(qty * 0.085), sewn: Math.round(qty * 0.04), bal: Math.round(qty * 0.04) },
    { size: 'S', ratio: '2', order: Math.round(qty * 0.22), cut: Math.round(qty * 0.23), sewn: Math.round(qty * 0.12), bal: Math.round(qty * 0.10) },
    { size: 'M', ratio: '3', order: Math.round(qty * 0.35), cut: Math.round(qty * 0.36), sewn: Math.round(qty * 0.18), bal: Math.round(qty * 0.17) },
    { size: 'L', ratio: '2', order: Math.round(qty * 0.22), cut: Math.round(qty * 0.225), sewn: Math.round(qty * 0.12), bal: Math.round(qty * 0.10) },
    { size: 'XL', ratio: '1', order: Math.round(qty * 0.09), cut: Math.round(qty * 0.092), sewn: Math.round(qty * 0.05), bal: Math.round(qty * 0.04) },
    { size: 'XXL', ratio: '0.5', order: Math.round(qty * 0.04), cut: Math.round(qty * 0.041), sewn: Math.round(qty * 0.02), bal: Math.round(qty * 0.02) }
  ];

  const handleCopyJob = () => {
    navigator.clipboard?.writeText(job.jobNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'flex-end', background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)' }}>
      {/* Background click to dismiss */}
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />

      {/* Slide Drawer Content */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '780px',
        height: '100%',
        background: '#ffffff',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        overflow: 'hidden'
      }}>
        {/* Top Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Order Details</span>
            <span style={{
              background: '#eff6ff',
              color: '#2563eb',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid #bfdbfe'
            }}>
              JOB {job.jobNo}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopyJob}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              {copied ? '✓ Copied' : 'Copy Job No'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#64748b',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center'
              }}
              title="Close Drawer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Drawer Body - Scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Main Key Info Box (Matches attached design reference) */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Job No</span>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>{job.jobNo}</span>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: progress >= 75 ? '#dcfce7' : '#ecfdf5',
                  color: '#15803d',
                  border: '1px solid #bbf7d0'
                }}>
                  {job.orderStatus || 'In Production'}
                </span>
                {job.riskStatus === 'CRITICAL' && (
                  <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}>
                    Critical Risk
                  </span>
                )}
                {job.riskStatus === 'HIGH' && (
                  <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                    At Risk
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                <span>Order Date: </span>
                <strong style={{ color: '#1e293b' }}>{orderDate}</strong>
              </div>
            </div>

            {/* Spec grid row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Buyer</span>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>{job.buyer}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Season</span>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>{season}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Style No</span>
                <strong style={{ fontSize: '13px', color: '#2563eb' }}>{job.styleNo}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Product</span>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>{product}</strong>
              </div>
            </div>

            {/* Spec grid row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', paddingTop: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Order Qty</span>
                <strong style={{ fontSize: '15px', color: '#0f172a', fontWeight: 800 }}>{qty.toLocaleString()} Pcs</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>FOB (USD)</span>
                <strong style={{ fontSize: '15px', color: '#0f172a', fontWeight: 800 }}>${totalFob.toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Unit Price</span>
                <strong style={{ fontSize: '14px', color: '#16a34a', fontWeight: 800 }}>${fobPrice.toFixed(2)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Shipment Date</span>
                <strong style={{ fontSize: '13px', color: '#d97706', fontWeight: 800 }}>{shipDate}</strong>
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            borderBottom: '2px solid #e2e8f0',
            marginBottom: '16px',
            overflowX: 'auto'
          }}>
            {[
              { id: 'po', label: 'PO Details' },
              { id: 'sizes', label: 'Color & Size' },
              { id: 'costing', label: 'Costing' },
              { id: 'ta', label: 'T&A' },
              { id: 'bom', label: 'BOM' },
              { id: 'production', label: 'Production' },
              { id: 'shipment', label: 'Shipment' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '8px 14px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  border: 'none',
                  background: 'transparent',
                  color: activeTab === tab.id ? '#2563eb' : '#64748b',
                  borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                  marginBottom: '-2px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: PO Details (Authoritative image replica) */}
          {activeTab === 'po' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Purchase Orders</span>
                <button
                  type="button"
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + Add PO
                </button>
              </div>

              {/* Purchase Orders Table */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                      <th style={{ padding: '8px 12px' }}>PO No</th>
                      <th style={{ padding: '8px 12px' }}>Color</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Qty</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>FOB (USD)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Unit Price</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poItems.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>{p.poNo}</td>
                        <td style={{ padding: '9px 12px' }}>{p.color}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{p.qty.toLocaleString()}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: '#475569' }}>${p.fob.toLocaleString()}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>${p.unitPrice.toFixed(2)}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            background: p.status === 'Confirmed' ? '#dcfce7' : '#fef3c7',
                            color: p.status === 'Confirmed' ? '#166534' : '#92400e'
                          }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'center', color: '#94a3b8', cursor: 'pointer' }}>•••</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PO Summary Card */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>PO Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Total PO Qty</span>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a' }}>{qty.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Total FOB (USD)</span>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a' }}>${totalFob.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Average Unit Price</span>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#16a34a' }}>${fobPrice.toFixed(2)}</strong>
                  </div>
                </div>

                {/* Progress bar split */}
                <div style={{ height: '8px', borderRadius: '4px', background: '#e2e8f0', display: 'flex', overflow: 'hidden', marginBottom: '6px' }}>
                  <div style={{ width: '75%', background: '#22c55e' }} title="Confirmed (75%)" />
                  <div style={{ width: '25%', background: '#f59e0b' }} title="Partial (25%)" />
                </div>
                <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: '#64748b' }}>
                  <span><strong style={{ color: '#16a34a' }}>●</strong> Confirmed 30,000 (75%)</span>
                  <span><strong style={{ color: '#d97706' }}>●</strong> Partial 10,000 (25%)</span>
                  <span><strong style={{ color: '#94a3b8' }}>●</strong> Pending 0 (0%)</span>
                </div>
              </div>

              {/* Recent Activities Timeline */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Recent Activities</span>
                  <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700, cursor: 'pointer' }}>View All</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 900, flexShrink: 0 }}>✓</div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>PO confirmed by supplier</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{job.merchandiser || 'Shamim Hossain'} (Merchandiser) · 05 Oct 2026, 10:24</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 900, flexShrink: 0 }}>✉</div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>PO sent to supplier</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{job.merchandiser || 'Shamim Hossain'} (Merchandiser) · 03 Oct 2026, 16:40</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', color: '#64748b', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 900, flexShrink: 0 }}>📄</div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Order created in NOS</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>System · {orderDate}, 09:12</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Color & Size Matrix */}
          {activeTab === 'sizes' && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                Color × Size Breakdown Matrix
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                      <th style={{ padding: '8px 12px' }}>Size</th>
                      <th style={{ padding: '8px 12px' }}>Ratio</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Order Qty</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cut Qty (+2.5%)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Sewn Qty</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Sewing Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeDistribution.map(s => (
                      <tr key={s.size} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 800, color: '#2563eb' }}>{s.size}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>1:{s.ratio}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{s.order.toLocaleString()}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0284c7' }}>{s.cut.toLocaleString()}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>{s.sewn.toLocaleString()}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#d97706', fontWeight: 700 }}>{s.bal.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                      <td style={{ padding: '10px 12px' }}>TOTAL</td>
                      <td style={{ padding: '10px 12px' }}>—</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0f172a' }}>{qty.toLocaleString()} Pcs</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0284c7' }}>{Math.round(qty * 1.025).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#16a34a' }}>{Math.round(qty * 0.52).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#d97706' }}>{Math.round(qty * 0.48).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Costing & Commercial */}
          {activeTab === 'costing' && (
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                FOB Cost Breakdown &amp; Margin Analysis
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>FOB Unit Price</span>
                  <strong style={{ display: 'block', fontSize: '18px', color: '#0f172a' }}>${fobPrice.toFixed(2)}</strong>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Total FOB Revenue</span>
                  <strong style={{ display: 'block', fontSize: '18px', color: '#2563eb' }}>${totalFob.toLocaleString()}</strong>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Projected Net CM Margin</span>
                  <strong style={{ display: 'block', fontSize: '18px', color: '#16a34a' }}>18.4%</strong>
                </div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
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

          {/* Tab 4: T&A Critical Path */}
          {activeTab === 'ta' && (
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                Time &amp; Action Critical Path Milestones
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Stage / Milestone</th>
                      <th style={{ padding: '8px 12px' }}>Plan Date</th>
                      <th style={{ padding: '8px 12px' }}>Actual Date</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'PO Received & Job Created', plan: job.dates?.poReceived || '20-Jun-2026', actual: job.dates?.poReceived || '20-Jun-2026', status: 'Completed' },
                      { name: 'Fabric Lab Dip & Strike-Off', plan: '30-Jun-2026', actual: '28-Jun-2026', status: 'Completed' },
                      { name: 'PP Sample Approval', plan: '15-Jul-2026', actual: '18-Jul-2026', status: 'Approved' },
                      { name: 'Bulk Yarn & Fabric In-House', plan: job.dates?.tnaPlan || '05-Aug-2026', actual: '04-Aug-2026', status: 'Completed' },
                      { name: 'Cutting Execution Start', plan: job.dates?.cuttingStart || '12-Aug-2026', actual: '12-Aug-2026', status: 'Completed' },
                      { name: 'Sewing Floor Input & Output', plan: job.dates?.sewingStart || '20-Aug-2026', actual: '22-Aug-2026', status: 'In Progress' },
                      { name: 'Finishing & Final Pre-Audit', plan: job.dates?.sewingEnd || '10-Oct-2026', actual: '—', status: 'Pending' },
                      { name: 'Ex-Factory / Cargo Closing', plan: job.dates?.exFactory || '21-Oct-2026', actual: '—', status: 'On Target' }
                    ].map((m, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{m.name}</td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{m.plan}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: m.actual !== '—' ? '#0f172a' : '#94a3b8' }}>{m.actual}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            background: m.status === 'Completed' || m.status === 'Approved' ? '#dcfce7' : m.status === 'In Progress' ? '#dbeafe' : '#fef3c7',
                            color: m.status === 'Completed' || m.status === 'Approved' ? '#166534' : m.status === 'In Progress' ? '#1e40af' : '#92400e'
                          }}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 5: BOM & Material */}
          {activeTab === 'bom' && (
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                Bill of Materials &amp; Sourcing Specifications
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Fabric Construction</span>
                    <strong style={{ fontSize: '13px' }}>100% Combed Cotton Single Jersey (180 GSM)</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Yarn Count &amp; Supplier</span>
                    <strong style={{ fontSize: '13px' }}>28/1 Ne Ring Spun · Badsha Textiles Ltd</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Neck Rib Component</span>
                    <strong style={{ fontSize: '13px' }}>95/5 Cotton Lycra Rib 1x1 (220 GSM)</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Dyeing Recipe Route</span>
                    <strong style={{ fontSize: '13px' }}>Reactive Winch Dyeing (NFL Dye House)</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 6: Production Follow-up */}
          {activeTab === 'production' && (
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                Floor-wise Production Execution &amp; Line Allocation
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Floor &amp; Line</span>
                  <strong style={{ display: 'block', fontSize: '14px', color: '#2563eb' }}>
                    {job.lineAllocation?.factory || 'NFL'} · Line {job.lineAllocation?.line || '14B'}
                  </strong>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Cutting Completed</span>
                  <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a' }}>
                    {Math.round(qty * 1.02).toLocaleString()} Pcs
                  </strong>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Sewing Actual</span>
                  <strong style={{ display: 'block', fontSize: '14px', color: '#16a34a' }}>
                    {Math.round(qty * (progress / 100)).toLocaleString()} Pcs
                  </strong>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Sewing Balance</span>
                  <strong style={{ display: 'block', fontSize: '14px', color: '#d97706' }}>
                    {Math.round(qty * (1 - progress / 100)).toLocaleString()} Pcs
                  </strong>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700 }}>Total Production Completion</span>
                  <strong style={{ color: '#2563eb' }}>{progress}%</strong>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: '#2563eb' }} />
                </div>
              </div>
            </div>
          )}

          {/* Tab 7: Shipment & Order Closing */}
          {activeTab === 'shipment' && (
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                Shipment Planning &amp; Commercial Closing
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Ex-Factory Target Date</span>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{shipDate}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Cargo Cut-off Date</span>
                    <strong style={{ fontSize: '13px', color: '#dc2626' }}>{job.dates?.cargoClosing || '18-Oct-2026'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Destination Port</span>
                    <strong style={{ fontSize: '13px' }}>Hamburg / Le Havre (EU)</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Estimated Cartons &amp; CBM</span>
                    <strong style={{ fontSize: '13px' }}>{Math.ceil(qty / 24).toLocaleString()} Cartons · ~46.5 CBM</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
