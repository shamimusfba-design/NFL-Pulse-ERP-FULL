'use client';

import React, { useState } from 'react';

export interface StyleDetailData {
  id: string;
  styleNo: string;
  buyer: string;
  styleName: string;
  buyerStyleNo?: string;
  product?: string;
  category?: string;
  season?: string;
  brand?: string;
  department?: string;
  customerReference?: string;
  status: string;
  orderQty: number;
  fobPrice?: number;
  fobValue?: number;
  smv?: number;
  fabricType?: string;
  gsm?: string;
  colors?: string[];
  sizes?: string[];
  sizeRatio?: number[];
  linkedJobs?: any[];
  techPackStatus?: string;
  cadPatternStatus?: string;
  sampleStatus?: { proto?: string; fit?: string; pp?: string };
  revisions?: { revNo: string; date: string; by: string; remarks: string }[];
  specMeasurements?: { pom: string; tol: string; xs: number; s: number; m: number; l: number; xl: number; xxl: number }[];
  bomItems?: { category: string; item: string; supplier: string; consumption: string; color: string; status: string }[];
  samples?: { type: string; submissionDate: string; approvalDate: string; status: string; comments: string }[];
}

interface Props {
  style: StyleDetailData | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (style: StyleDetailData) => void;
  onStyleUpdated?: () => void;
}

export default function StyleDetailDrawer({ style, isOpen, onClose, onEdit, onStyleUpdated }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'colors' | 'specs' | 'bom' | 'samples' | 'revisions'>('overview');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !style) return null;

  const handleCopyStyleNo = () => {
    navigator.clipboard?.writeText(style.styleNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const getStatusBadgeColor = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'ACTIVE' || s === 'RUNNING') return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
    if (s === 'CONFIRMED') return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    if (s === 'DEVELOPMENT') return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
    if (s === 'COMPLETED') return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    return { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
  };

  const badge = getStatusBadgeColor(style.status);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '840px',
          maxWidth: '95vw',
          height: '100%',
          background: '#ffffff',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP HEADER */}
        <div style={{
          padding: '16px 20px',
          background: '#0b1329',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>👕</span>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Style: {style.styleNo}
                <button
                  type="button"
                  onClick={handleCopyStyleNo}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#cbd5e1',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  title="Copy Style No"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </h2>
              <span style={{
                background: badge.bg,
                color: badge.color,
                border: `1px solid ${badge.border}`,
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 800
              }}>
                {style.status}
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '3px', display: 'flex', gap: '12px' }}>
              <span>Buyer: <strong style={{ color: '#ffffff' }}>{style.buyer}</strong></span>
              <span>·</span>
              <span>Category: <strong style={{ color: '#ffffff' }}>{style.category || style.product}</strong></span>
              <span>·</span>
              <span>Season: <strong style={{ color: '#ffffff' }}>{style.season}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(style)}
                style={{
                  background: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                ✎ Edit Style
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '22px',
                cursor: 'pointer',
                lineHeight: 1,
                padding: '0 4px'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div style={{
          display: 'flex',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 16px',
          overflowX: 'auto',
          gap: '4px'
        }}>
          {[
            { id: 'overview', label: '1. Overview & Specs' },
            { id: 'jobs', label: `2. Linked Jobs (${style.linkedJobs?.length || 0})` },
            { id: 'colors', label: `3. Colors & Sizes (${style.colors?.length || 0})` },
            { id: 'specs', label: '4. Measurement Chart' },
            { id: 'bom', label: `5. BOM & Trims (${style.bomItems?.length || 0})` },
            { id: 'samples', label: '6. Samples & Approvals' },
            { id: 'revisions', label: `7. Revisions (${style.revisions?.length || 0})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 12px',
                fontSize: '11.5px',
                fontWeight: activeTab === tab.id ? 800 : 600,
                color: activeTab === tab.id ? '#2563eb' : '#64748b',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* DRAWER BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Highlight Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Order Qty</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                    {Number(style.orderQty).toLocaleString()} pcs
                  </div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Target FOB Price</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                    ${Number(style.fobPrice || 5.25).toFixed(2)}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total FOB Value</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>
                    ${Number(style.fobValue || style.orderQty * 5.25).toLocaleString()}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Standard Min (SMV)</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#2563eb', marginTop: '2px' }}>
                    {style.smv || 8.5} min
                  </div>
                </div>
              </div>

              {/* Master Style Details Grid */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Master Specification Data
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10.5px', fontWeight: 700 }}>STYLE DESCRIPTION</span>
                    <strong style={{ color: '#0f172a' }}>{style.styleName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10.5px', fontWeight: 700 }}>BUYER STYLE / REF NO</span>
                    <strong style={{ color: '#0f172a' }}>{style.buyerStyleNo || style.customerReference || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10.5px', fontWeight: 700 }}>BUYER & BRAND</span>
                    <strong style={{ color: '#0f172a' }}>{style.buyer} · {style.brand || 'Core'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10.5px', fontWeight: 700 }}>DEPARTMENT & GENDER</span>
                    <strong style={{ color: '#0f172a' }}>{style.department || 'Menswear'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10.5px', fontWeight: 700 }}>PRIMARY FABRIC SPECIFICATION</span>
                    <strong style={{ color: '#0f172a' }}>{style.fabricType || '100% Cotton Single Jersey'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10.5px', fontWeight: 700 }}>FABRIC WEIGHT (GSM)</span>
                    <strong style={{ color: '#0f172a' }}>{style.gsm || '180'} GSM</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10.5px', fontWeight: 700 }}>TECH PACK STATUS</span>
                    <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', background: '#ecfdf5', color: '#047857', fontWeight: 800, fontSize: '11px' }}>
                      {style.techPackStatus || 'APPROVED'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10.5px', fontWeight: 700 }}>CAD PATTERN / MARKER YIELD</span>
                    <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', background: '#ecfdf5', color: '#047857', fontWeight: 800, fontSize: '11px' }}>
                      {style.cadPatternStatus || 'APPROVED'} (84.6% Marker Efficiency)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LINKED JOBS & POS */}
          {activeTab === 'jobs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>
                  Linked Manufacturing Jobs ({style.linkedJobs?.length || 0})
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  All production orders utilizing this master style
                </span>
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Job No</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>PO Reference</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Order Qty</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Ex-Factory Date</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Current Stage</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Factory</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(style.linkedJobs || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                          No linked bulk jobs currently in production.
                        </td>
                      </tr>
                    ) : (
                      style.linkedJobs?.map((j, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 800, color: '#2563eb' }}>{j.jobNo}</td>
                          <td style={{ padding: '8px 12px', color: '#334155' }}>{j.poNo || `PO-${j.jobNo}`}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                            {Number(j.orderQty).toLocaleString()} pcs
                          </td>
                          <td style={{ padding: '8px 12px', color: '#d97706', fontWeight: 700 }}>{j.shipmentDate || '21-Oct-2026'}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8', fontSize: '10.5px', fontWeight: 700 }}>
                              {j.status || 'Running'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>{j.factory || 'NFL'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: COLORS & SIZES MATRIX */}
          {activeTab === 'colors' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>
                  Approved Colorways ({style.colors?.length || 0})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(style.colors || ['Optical White', 'Black Beauty']).map((c, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#1e293b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: c.toLowerCase().includes('black') ? '#000' : c.toLowerCase().includes('white') ? '#fff' : c.toLowerCase().includes('navy') ? '#1e3a8a' : '#64748b',
                        border: '1px solid #94a3b8'
                      }} />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>
                  Standard Size Range & Packing Ratio
                </h4>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                  {(style.sizes || ['XS', 'S', 'M', 'L', 'XL', '2XL']).map((sz, i) => {
                    const ratio = style.sizeRatio?.[i] ?? [1, 2, 3, 3, 2, 1][i] ?? 1;
                    return (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          minWidth: '70px',
                          textAlign: 'center',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{ background: '#0b1329', color: '#fff', padding: '6px', fontSize: '12px', fontWeight: 800 }}>
                          {sz}
                        </div>
                        <div style={{ background: '#eff6ff', padding: '8px', fontSize: '14px', fontWeight: 900, color: '#1d4ed8' }}>
                          Ratio {ratio}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SPEC MEASUREMENT CHART */}
          {activeTab === 'specs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>
                  Point of Measure (POM) Grading Chart (cm)
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Based on Buyer Approved Spec Spec-2026-v1
                </span>
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Point of Measure (POM)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Tol</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>XS</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>S</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>M</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>L</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>XL</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>2XL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(style.specMeasurements || []).map((m, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>{m.pom}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b', fontSize: '11px' }}>{m.tol}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>{m.xs}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>{m.s}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#2563eb' }}>{m.m}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>{m.l}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>{m.xl}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>{m.xxl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: BOM & TRIMS */}
          {activeTab === 'bom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>
                Master Bill of Materials & Trims Configuration
              </span>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Category</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Item Description</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Nominated Supplier</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Consumption</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(style.bomItems || []).map((b, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 800, color: '#2563eb' }}>{b.category}</td>
                        <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: 700 }}>{b.item}</td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{b.supplier}</td>
                        <td style={{ padding: '8px 12px', color: '#334155', fontWeight: 600 }}>{b.consumption}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: b.status === 'IN_HOUSE' ? '#ecfdf5' : '#eff6ff',
                            color: b.status === 'IN_HOUSE' ? '#047857' : '#1d4ed8',
                            fontSize: '10.5px',
                            fontWeight: 800
                          }}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: SAMPLES & APPROVALS */}
          {activeTab === 'samples' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>
                Development & Fit Sample Milestones
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(style.samples || []).map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>{s.type}</strong>
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: s.status === 'APPROVED' ? '#ecfdf5' : '#fffbeb',
                          color: s.status === 'APPROVED' ? '#047857' : '#b45309',
                          fontSize: '10.5px',
                          fontWeight: 800
                        }}>
                          {s.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '4px' }}>
                        {s.comments}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>
                      <div>Submitted: <strong>{s.submissionDate}</strong></div>
                      <div>Approved: <strong style={{ color: '#16a34a' }}>{s.approvalDate}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: REVISIONS & AUDIT */}
          {activeTab === 'revisions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>
                Tech Pack & Style Revision Log
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(style.revisions || []).map((r, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      borderLeft: '4px solid #2563eb'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '12.5px', color: '#2563eb' }}>{r.revNo}</strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{r.date} by {r.by}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                      {r.remarks}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
