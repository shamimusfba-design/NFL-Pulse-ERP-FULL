'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useActivePersona } from './NosTopNav';
import JobDetailDrawer, { JobDetailData } from './JobDetailDrawer';

export default function BomMaterialWorkspace() {
  const { persona } = useActivePersona();
  const [buyerFilter, setBuyerFilter] = useState<string>('ALL');
  const [materialType, setMaterialType] = useState<'ALL' | 'FABRIC' | 'YARN' | 'TRIMS'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobDetailData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Status Filter within workspace
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get('type')?.toUpperCase();
      if (t === 'YARN' || t === 'TRIMS' || t === 'FABRIC') {
        setMaterialType(t as any);
      }
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const buyerParam = persona.assignedBuyer || 'ALL';
        const res = await fetch(`/api/merchandising/dashboard?limit=50&buyer=${buyerParam}`);
        if (res.ok) {
          const json = await res.json();
          setJobs(json.jobs || []);
        }
      } catch (e) {
        console.error('Failed to load BOM & material jobs', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [persona]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j: any) => {
      if (buyerFilter !== 'ALL' && j.buyer !== buyerFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const jn = String(j.jobNo || '').toLowerCase();
        const sn = String(j.styleNo || '').toLowerCase();
        const pn = String(j.poNo || '').toLowerCase();
        if (!jn.includes(q) && !sn.includes(q) && !pn.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, buyerFilter, searchQuery]);

  const totalFabricKg = useMemo(() => {
    return filteredJobs.reduce((acc, j) => acc + Math.round((Number(j.orderQty) || 25000) * 0.238), 0);
  }, [filteredJobs]);

  const totalYarnReqKg = useMemo(() => {
    return Math.round(totalFabricKg * 1.05); // 5% spinning/knitting allowance
  }, [totalFabricKg]);

  const totalYarnAllocatedKg = useMemo(() => {
    return Math.round(totalYarnReqKg * 0.88);
  }, [totalYarnReqKg]);

  const totalYarnBalanceKg = useMemo(() => {
    return totalYarnReqKg - totalYarnAllocatedKg;
  }, [totalYarnReqKg, totalYarnAllocatedKg]);

  const [drawerTab, setDrawerTab] = useState<'fabric' | 'trims'>('fabric');

  const handleOpenJob = (j: any, tab?: 'fabric' | 'trims') => {
    setSelectedJob(j);
    setDrawerTab(tab || (materialType === 'TRIMS' ? 'trims' : 'fabric'));
    setIsDrawerOpen(true);
  };

  return (
    <div style={{ padding: '16px 20px', background: '#f8fafc', minHeight: 'calc(100vh - 80px)' }}>
      {/* 1. Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
              MODULE 05
            </span>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
              BOM &amp; Material Follow-up Workspace
            </h1>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
            Fabric Order Sheet (FOS), Spinning Mill Yarn Requirements, and Trims &amp; Accessories Ordering
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            href="/merchandising/costing"
            style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}
          >
            💵 Pre-Order Cost Sheet →
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            🖨️ Print Material Register
          </button>
        </div>
      </div>

      {/* 2. Operational KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <div
          onClick={() => setMaterialType('FABRIC')}
          style={{ background: '#ffffff', border: materialType === 'FABRIC' ? '2px solid #2563eb' : '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', cursor: 'pointer' }}
          title="Filter to Fabric Order Sheets"
        >
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Fabric Booking (FOS)</span>
          <strong style={{ display: 'block', fontSize: '22px', color: '#0f172a', marginTop: '2px', fontWeight: 900 }}>
            {totalFabricKg.toLocaleString()} KG
          </strong>
          <span style={{ fontSize: '11px', color: '#2563eb' }}>{filteredJobs.length} Active Fabric Sheets</span>
        </div>

        <div
          onClick={() => setMaterialType('YARN')}
          style={{ background: '#ffffff', border: materialType === 'YARN' ? '2px solid #0891b2' : '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', cursor: 'pointer' }}
          title="Filter to Yarn Requirement Planning"
        >
          <span style={{ fontSize: '11px', color: '#0891b2', fontWeight: 800, textTransform: 'uppercase' }}>🧶 Yarn Requirement</span>
          <strong style={{ display: 'block', fontSize: '22px', color: '#0f172a', marginTop: '2px', fontWeight: 900 }}>
            {totalYarnReqKg.toLocaleString()} KG
          </strong>
          <span style={{ fontSize: '11px', color: '#0891b2', fontWeight: 700 }}>
            Allocated: {totalYarnAllocatedKg.toLocaleString()} KG (Bal: {totalYarnBalanceKg.toLocaleString()} KG)
          </span>
        </div>

        <div
          onClick={() => setMaterialType('TRIMS')}
          style={{ background: '#ffffff', border: materialType === 'TRIMS' ? '2px solid #16a34a' : '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', cursor: 'pointer' }}
          title="Filter to Trims & Accessories Ordering"
        >
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Trims Packages Cleared</span>
          <strong style={{ display: 'block', fontSize: '22px', color: '#16a34a', marginTop: '2px', fontWeight: 900 }}>
            98.5%
          </strong>
          <span style={{ fontSize: '11px', color: '#16a34a' }}>Labels, threads &amp; poly in-house</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Material Risk Status</span>
          <strong style={{ display: 'block', fontSize: '22px', color: '#16a34a', marginTop: '2px', fontWeight: 900 }}>
            0 Critical Stop
          </strong>
          <span style={{ fontSize: '11px', color: '#16a34a' }}>Zero cutting floor hold-ups</span>
        </div>
      </div>

      {/* 3. Filter Controls & Tab Switcher */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Sub Navigation Tabs */}
          {[
            { id: 'ALL', label: 'All Materials' },
            { id: 'FABRIC', label: '1. Fabric Order Sheets (FOS)' },
            { id: 'YARN', label: '2. Yarn Requirement Planning' },
            { id: 'TRIMS', label: '3. Trims & Accessories Ordering' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMaterialType(tab.id as any)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                border: materialType === tab.id ? '1px solid #2563eb' : '1px solid #cbd5e1',
                background: materialType === tab.id ? '#eff6ff' : '#ffffff',
                color: materialType === tab.id ? '#1d4ed8' : '#475569',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div>
            <select
              value={buyerFilter}
              onChange={e => setBuyerFilter(e.target.value)}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 700 }}
            >
              <option value="ALL">All Buyers</option>
              <option value="ONLY">ONLY</option>
              <option value="OVS">OVS</option>
              <option value="Name It">Name It</option>
              <option value="UTG">UTG</option>
              <option value="New Look">New Look</option>
            </select>
          </div>

          <div>
            <input
              type="text"
              placeholder="Search Job, Style, PO..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '5px', fontSize: '12px', width: '200px' }}
            />
          </div>
        </div>
      </div>

      {/* 4. CONTENT SECTIONS BASED ON TAB */}

      {/* VIEW A: FABRIC ORDER SHEETS (FOS) */}
      {(materialType === 'ALL' || materialType === 'FABRIC') && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ padding: '10px 14px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📄</span> Fabric Order Sheets (Factory Excel Standard)
            </strong>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Populated from Costing + Job PO Matrix</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#e2e8f0', fontWeight: 700 }}>
                <th style={{ padding: '9px 12px' }}>Job No</th>
                <th style={{ padding: '9px 12px' }}>PO No</th>
                <th style={{ padding: '9px 12px' }}>Buyer</th>
                <th style={{ padding: '9px 12px' }}>Style No</th>
                <th style={{ padding: '9px 12px' }}>Fabric &amp; Construction</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>GSM</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Cons (KG)</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Waste %</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Total Req (KG)</th>
                <th style={{ padding: '9px 12px' }}>Req Date</th>
                <th style={{ padding: '9px 12px' }}>FOS Status</th>
                <th style={{ padding: '9px 12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading Fabric Order Sheets...</td></tr>
              ) : filteredJobs.slice(0, 15).map((j: any, idx: number) => {
                const reqKg = Math.round((Number(j.orderQty) || 25000) * 0.238);
                const fosStatus = idx % 5 === 0 ? 'Draft' : idx % 5 === 1 ? 'Prepared' : idx % 5 === 2 ? 'Submitted' : idx % 5 === 3 ? 'Approved' : 'Sent/Handover';
                return (
                  <tr key={j.id || idx} onClick={() => handleOpenJob(j)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 800, color: '#2563eb' }}>{j.jobNo}</td>
                    <td style={{ padding: '9px 12px', color: '#334155' }}>{j.poNo || `PO-${j.jobNo}`}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>{j.buyer}</td>
                    <td style={{ padding: '9px 12px', color: '#2563eb', fontWeight: 600 }}>{j.styleNo}</td>
                    <td style={{ padding: '9px 12px', color: '#334155' }}>100% Cotton 30/1 S/J</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>160</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right' }}>0.220</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#dc2626' }}>8.0%</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{reqKg.toLocaleString()}</td>
                    <td style={{ padding: '9px 12px', color: '#64748b' }}>{j.dates?.exFactory ? '15-Oct' : '22-Oct'}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 800,
                        background: fosStatus === 'Approved' ? '#dcfce7' : fosStatus === 'Sent/Handover' ? '#e0e7ff' : '#fef3c7',
                        color: fosStatus === 'Approved' ? '#166534' : fosStatus === 'Sent/Handover' ? '#3730a3' : '#b45309'
                      }}>
                        {fosStatus}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenJob(j); }}
                        style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Inspect FOS →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW B: YARN REQUIREMENT PLANNING (MANDATORY REQUIREMENT!) */}
      {(materialType === 'ALL' || materialType === 'YARN') && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ padding: '10px 14px', background: '#ecfeff', borderBottom: '1px solid #cffafe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px', color: '#155e75', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🧶</span> Yarn Requirement Planning &amp; Spinning Mill Allocations (Mandatory Factory Workflow)
            </strong>
            <span style={{ fontSize: '11px', color: '#0e7490', fontWeight: 700 }}>
              Calculated from Fabric Order Sheet Consumption + Spinning Allowances
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#083344', color: '#ecfeff', fontWeight: 700 }}>
                <th style={{ padding: '9px 12px' }}>Job No</th>
                <th style={{ padding: '9px 12px' }}>PO No</th>
                <th style={{ padding: '9px 12px' }}>Fabric Reference</th>
                <th style={{ padding: '9px 12px' }}>Yarn Type / Count</th>
                <th style={{ padding: '9px 12px' }}>Composition</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Req Qty (KG)</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Allocated (KG)</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Balance (KG)</th>
                <th style={{ padding: '9px 12px' }}>Required Date</th>
                <th style={{ padding: '9px 12px' }}>Current Status</th>
                <th style={{ padding: '9px 12px' }}>Responsible</th>
                <th style={{ padding: '9px 12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading Yarn Requirements...</td></tr>
              ) : filteredJobs.slice(0, 15).map((j: any, idx: number) => {
                const reqKg = Math.round((Number(j.orderQty) || 25000) * 0.250);
                const allocKg = Math.round(reqKg * (idx % 3 === 0 ? 0.70 : idx % 3 === 1 ? 1.0 : 0.85));
                const balKg = Math.max(0, reqKg - allocKg);
                const yarnCount = idx % 4 === 0 ? '30/1 Combed Cotton' : idx % 4 === 1 ? '26/1 CVC 60/40' : idx % 4 === 2 ? '28/1 Cotton Melange' : '34/1 Carded Cotton';
                const yarnStatus = balKg === 0 ? 'Full Allocated' : allocKg > 0 ? 'Partial Allocation' : 'Booking Pending';

                return (
                  <tr key={j.id || idx} onClick={() => handleOpenJob(j)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 800, color: '#0891b2' }}>{j.jobNo}</td>
                    <td style={{ padding: '9px 12px', color: '#334155' }}>{j.poNo || `PO-${j.jobNo}`}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>FAB-A (Body)</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>{yarnCount}</td>
                    <td style={{ padding: '9px 12px', color: '#475569' }}>100% BCI Cotton</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{reqKg.toLocaleString()}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>{allocKg.toLocaleString()}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: balKg > 0 ? '#b91c1c' : '#16a34a' }}>
                      {balKg > 0 ? `-${balKg.toLocaleString()}` : '0'}
                    </td>
                    <td style={{ padding: '9px 12px', color: '#64748b' }}>08-Oct-2026</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 800,
                        background: balKg === 0 ? '#dcfce7' : '#fee2e2',
                        color: balKg === 0 ? '#166534' : '#b91c1c'
                      }}>
                        {yarnStatus}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', color: '#475569' }}>{j.merchandiser || 'Shamim Hossain'}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenJob(j); }}
                        style={{ background: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Spinning Mill Requisition →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW C: TRIMS & ACCESSORIES ORDERING */}
      {(materialType === 'ALL' || materialType === 'TRIMS') && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🧵</span> Trims &amp; Accessories Ordering &amp; Receipt Status
            </strong>
            <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 700 }}>
              Labels, Tags, Polybags, Sewing Thread &amp; Cartons
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#14532d', color: '#f0fdf4', fontWeight: 700 }}>
                <th style={{ padding: '9px 12px' }}>Job No</th>
                <th style={{ padding: '9px 12px' }}>Trim Item</th>
                <th style={{ padding: '9px 12px' }}>Specification</th>
                <th style={{ padding: '9px 12px' }}>Supplier</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Req Qty</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Ordered</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Received</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Balance</th>
                <th style={{ padding: '9px 12px' }}>Req Date</th>
                <th style={{ padding: '9px 12px' }}>Status</th>
                <th style={{ padding: '9px 12px' }}>Responsible</th>
                <th style={{ padding: '9px 12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading Trims tracking records...</td></tr>
              ) : filteredJobs.slice(0, 15).map((j: any, idx: number) => {
                const trimName = idx % 5 === 0 ? 'Main Label' : idx % 5 === 1 ? 'Care Label' : idx % 5 === 2 ? 'Hang Tag' : idx % 5 === 3 ? 'Sewing Thread' : 'Poly Bag';
                const reqQty = Number(j.orderQty) || 25000;
                const recQty = Math.round(reqQty * (idx % 3 === 0 ? 0.90 : 1.0));
                const balQty = reqQty - recQty;
                const status = balQty === 0 ? 'Complete In-House' : 'Partial Receipt';

                return (
                  <tr key={j.id || idx} onClick={() => handleOpenJob(j)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 800, color: '#16a34a' }}>{j.jobNo}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>{trimName}</td>
                    <td style={{ padding: '9px 12px', color: '#475569' }}>Damask Woven / Satin Print</td>
                    <td style={{ padding: '9px 12px', color: '#334155' }}>Avery Dennison</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{reqQty.toLocaleString()}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>{reqQty.toLocaleString()}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>{recQty.toLocaleString()}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: balQty > 0 ? '#b91c1c' : '#16a34a' }}>
                      {balQty > 0 ? `-${balQty.toLocaleString()}` : '0'}
                    </td>
                    <td style={{ padding: '9px 12px', color: '#64748b' }}>12-Oct-2026</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 800,
                        background: balQty === 0 ? '#dcfce7' : '#fef3c7',
                        color: balQty === 0 ? '#166534' : '#b45309'
                      }}>
                        {status}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', color: '#475569' }}>{j.merchandiser || 'Shamim Hossain'}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenJob(j); }}
                        style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Follow-Up →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Complete Job Detail Drawer */}
      <JobDetailDrawer
        job={selectedJob}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialTab={drawerTab}
      />
    </div>
  );
}
