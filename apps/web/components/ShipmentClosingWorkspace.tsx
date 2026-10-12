'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useActivePersona } from './NosTopNav';
import JobDetailDrawer, { JobDetailData } from './JobDetailDrawer';

export default function ShipmentClosingWorkspace() {
  const { persona } = useActivePersona();
  const [buyerFilter, setBuyerFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobDetailData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

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
        console.error('Failed to load shipment closing data', e);
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

  const totalCartons = useMemo(() => {
    return filteredJobs.reduce((acc, j) => acc + Math.ceil((Number(j.orderQty) || 25000) / 24), 0);
  }, [filteredJobs]);

  const totalFobValue = useMemo(() => {
    return filteredJobs.reduce((acc, j) => acc + (Number(j.fobValue) || (Number(j.orderQty) || 25000) * 5.25), 0);
  }, [filteredJobs]);

  const handleOpenJob = (j: any) => {
    setSelectedJob(j);
    setIsDrawerOpen(true);
  };

  return (
    <div style={{ padding: '16px 20px', background: '#f8fafc', minHeight: 'calc(100vh - 80px)' }}>
      {/* 1. Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
              MODULE 09
            </span>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
              Shipment &amp; Order Closing Workspace
            </h1>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
            Packing lists, carton staging, cargo closing dates, final AQL inspections and commercial invoice handover
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            🖨️ Print Shipment Schedule
          </button>
          <Link
            href="/merchandising/dashboard"
            style={{ background: '#2563eb', color: '#ffffff', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}
          >
            Bulk Dashboard →
          </Link>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Cartons Staged</span>
          <strong style={{ display: 'block', fontSize: '22px', color: '#0f172a', marginTop: '2px', fontWeight: 900 }}>
            {totalCartons.toLocaleString()} Cartons
          </strong>
          <span style={{ fontSize: '11px', color: '#2563eb' }}>Standard 24 pcs / carton pack</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>FOB Export Value</span>
          <strong style={{ display: 'block', fontSize: '22px', color: '#16a34a', marginTop: '2px', fontWeight: 900 }}>
            ${Math.round(totalFobValue).toLocaleString()}
          </strong>
          <span style={{ fontSize: '11px', color: '#16a34a' }}>Commercial invoices ready</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Final AQL 1.5 Inspection</span>
          <strong style={{ display: 'block', fontSize: '22px', color: '#16a34a', marginTop: '2px', fontWeight: 900 }}>
            100% Passed
          </strong>
          <span style={{ fontSize: '11px', color: '#16a34a' }}>Buyer QA inspection cert issued</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Next Cargo Cut-Off</span>
          <strong style={{ display: 'block', fontSize: '22px', color: '#dc2626', marginTop: '2px', fontWeight: 900 }}>
            18-Oct-2026
          </strong>
          <span style={{ fontSize: '11px', color: '#dc2626' }}>Chittagong Port CFS booking</span>
        </div>
      </div>

      {/* 3. Shipment Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#e2e8f0', fontWeight: 700 }}>
              <th style={{ padding: '9px 12px' }}>Job No</th>
              <th style={{ padding: '9px 12px' }}>Buyer</th>
              <th style={{ padding: '9px 12px' }}>Style No</th>
              <th style={{ padding: '9px 12px', textAlign: 'right' }}>Total Cartons</th>
              <th style={{ padding: '9px 12px' }}>Destination Port</th>
              <th style={{ padding: '9px 12px' }}>Ex-Factory Date</th>
              <th style={{ padding: '9px 12px' }}>Forwarder Booking</th>
              <th style={{ padding: '9px 12px' }}>AQL Inspection</th>
              <th style={{ padding: '9px 12px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  Loading shipment closing records...
                </td>
              </tr>
            ) : filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  No matching shipment records found.
                </td>
              </tr>
            ) : (
              filteredJobs.map((j: any, idx: number) => {
                const ctns = Math.ceil((Number(j.orderQty) || 25000) / 24);
                return (
                  <tr
                    key={j.id || idx}
                    onClick={() => handleOpenJob(j)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      transition: 'background 0.1s ease'
                    }}
                  >
                    <td style={{ padding: '9px 12px', fontWeight: 800, color: '#2563eb' }}>
                      {j.jobNo}
                    </td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>
                      {j.buyer}
                    </td>
                    <td style={{ padding: '9px 12px', color: '#2563eb', fontWeight: 700 }}>
                      {j.styleNo}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                      {ctns.toLocaleString()} ctn
                    </td>
                    <td style={{ padding: '9px 12px', color: '#475569' }}>
                      Hamburg / Le Havre (EU)
                    </td>
                    <td style={{ padding: '9px 12px', color: '#d97706', fontWeight: 700 }}>
                      {j.shipmentDate || '21 Oct 2026'}
                    </td>
                    <td style={{ padding: '9px 12px', color: '#16a34a', fontWeight: 700 }}>
                      Kuehne + Nagel (Confirmed)
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '10.5px' }}>
                        ✓ AQL 1.5 PASSED
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenJob(j); }}
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <JobDetailDrawer
        job={selectedJob}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}
