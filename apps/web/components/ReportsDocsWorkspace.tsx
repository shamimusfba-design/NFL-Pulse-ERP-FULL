'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ReportsDocsWorkspace() {
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const documents = [
    { id: 'doc-1', title: 'Fabric Order Sheet (CAD Consumption & Mill Allocation)', category: 'FABRIC', jobNo: 'JOB 45892', buyer: 'ONLY', style: 'ONL-TEE-2026', format: 'PRINTABLE / PDF', link: '/print/fabric-order-sheet/ord-1' },
    { id: 'doc-2', title: 'Buyer Tech Pack Spec Sheet (Approved Master)', category: 'TECHPACK', jobNo: 'JOB 45892', buyer: 'ONLY', style: 'ONL-TEE-2026', format: 'PDF SPEC', link: '/print/tech-pack/ord-1' },
    { id: 'doc-3', title: 'Buyer Purchase Order Contract (Official PO Schedule)', category: 'PO', jobNo: 'JOB 45892', buyer: 'ONLY', style: 'ONL-TEE-2026', format: 'OFFICIAL PO', link: '/print/po-sheet/ord-1' },
    { id: 'doc-4', title: 'Certified Lab Test Report (ISO 105 Fastness & Shrinkage)', category: 'LAB', jobNo: 'JOB 45892', buyer: 'ONLY', style: 'ONL-TEE-2026', format: 'INTERTEK CERT', link: '/modules/lab' },
    { id: 'doc-5', title: 'PP Comments & CAD Handover Release Note', category: 'CAD', jobNo: 'JOB 45892', buyer: 'ONLY', style: 'ONL-TEE-2026', format: 'SIGNED RECORD', link: '/modules/cad' },
    { id: 'doc-6', title: 'Final AQL 1.5 Inspection Certificate (Pre-Shipment Pass)', category: 'INSPECTION', jobNo: 'JOB 45892', buyer: 'ONLY', style: 'ONL-TEE-2026', format: 'AQL CERT', link: '/quality' },
    { id: 'doc-7', title: 'Fabric Management Meeting Review Minutes', category: 'MINUTES', jobNo: 'JOB ALL', buyer: 'INTERNAL', style: 'CORE FLEET', format: 'ERP REGISTER', link: '/modules/forms-print' },
    { id: 'doc-8', title: 'Merchandising Yarn Spinning Requisition Challan', category: 'YARN', jobNo: 'JOB 45892', buyer: 'ONLY', style: 'ONL-TEE-2026', format: 'STORE CHALLAN', link: '/modules/yarn' }
  ];

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const filteredDocs = documents.filter(d => {
    if (docTypeFilter !== 'ALL' && d.category !== docTypeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!d.title.toLowerCase().includes(q) && !d.jobNo.toLowerCase().includes(q) && !d.buyer.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '16px 20px', background: '#f8fafc', minHeight: 'calc(100vh - 80px)' }}>
      {/* 1. Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
              MODULE 10
            </span>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
              Reports, Documents &amp; Communication Center
            </h1>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
            Central repository of certified tech packs, fabric order sheets, buyer contracts, inspection certificates &amp; forms
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {toastMsg && (
            <span style={{ background: '#166534', color: '#bbf7d0', fontSize: '11.5px', padding: '4px 10px', borderRadius: '4px', fontWeight: 700 }}>
              ✓ {toastMsg}
            </span>
          )}
          <Link
            href="/modules/forms-print"
            style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}
          >
            📋 Company Standard Forms Archive →
          </Link>
          <button
            type="button"
            onClick={() => showToast('All documents archived')}
            style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            + Upload New Document
          </button>
        </div>
      </div>

      {/* 2. Filter Controls */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 700, marginBottom: '2px' }}>DOCUMENT TYPE</label>
            <select
              value={docTypeFilter}
              onChange={e => setDocTypeFilter(e.target.value)}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 600 }}
            >
              <option value="ALL">All Garment Documents</option>
              <option value="FABRIC">Fabric Order Sheets</option>
              <option value="TECHPACK">Tech Pack Specifications</option>
              <option value="PO">Purchase Order Contracts</option>
              <option value="LAB">Lab Test Certificates</option>
              <option value="CAD">CAD Handover Notes</option>
              <option value="INSPECTION">AQL Inspection Certificates</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 700, marginBottom: '2px' }}>SEARCH</label>
            <input
              type="text"
              placeholder="Search by Document Name, Job, Buyer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', width: '280px' }}
            />
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#64748b' }}>
          Showing <strong>{filteredDocs.length}</strong> certified enterprise documents
        </div>
      </div>

      {/* 3. Document Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {filteredDocs.map(doc => (
          <div key={doc.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ flex: 1, paddingRight: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, background: '#eff6ff', color: '#1e40af', padding: '2px 6px', borderRadius: '4px' }}>
                  {doc.category}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                  {doc.buyer} · {doc.jobNo}
                </span>
              </div>
              <strong style={{ fontSize: '13.5px', color: '#0f172a', display: 'block' }}>
                {doc.title}
              </strong>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px' }}>
                Style: <span style={{ color: '#2563eb', fontWeight: 700 }}>{doc.style}</span> · Format: <strong>{doc.format}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <a
                href={doc.link}
                target={doc.link.startsWith('/print') ? '_blank' : '_self'}
                rel="noreferrer"
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '5px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                🖨️ Open Print
              </a>
              <button
                type="button"
                onClick={() => showToast(`Downloaded ${doc.title}`)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  padding: '6px 10px',
                  borderRadius: '5px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📥 PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
