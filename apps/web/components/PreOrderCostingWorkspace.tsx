'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useActivePersona } from './NosTopNav';
import {
  RealCostSheet,
  FabricConsumptionRow,
  calculateCostSheetTotals
} from '../lib/costing-engine';

export default function PreOrderCostingWorkspace() {
  const { persona } = useActivePersona();
  const isHead = persona.role === 'HEAD_MERCHANDISER' || persona.role === 'ADMIN';

  // 1. Filter States
  const [buyerFilter, setBuyerFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 2. Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [costSheets, setCostSheets] = useState<RealCostSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<RealCostSheet | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isPrintPreview, setIsPrintPreview] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Fetch Cost Sheets
  const fetchCostSheets = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const params = new URLSearchParams({
        role: persona.role,
        assignedBuyer: persona.assignedBuyer,
        buyer: isHead ? buyerFilter : persona.assignedBuyer,
        status: statusFilter,
        search: searchQuery
      });
      const res = await fetch(`/api/merchandising/costing?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch cost sheets`);
      const data = await res.json();
      setCostSheets(data.costSheets || []);
      if (!selectedSheet && data.costSheets?.length > 0) {
        setSelectedSheet(data.costSheets[0]);
      } else if (selectedSheet) {
        const refreshed = data.costSheets?.find((c: any) => c.id === selectedSheet.id);
        if (refreshed) setSelectedSheet(refreshed);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading costing sheets');
    } finally {
      setLoading(false);
    }
  }, [persona, isHead, buyerFilter, statusFilter, searchQuery, selectedSheet]);

  useEffect(() => {
    fetchCostSheets();
  }, [persona, isHead, buyerFilter, statusFilter]);

  // Live Totals calculation for selectedSheet
  const calculatedTotals = useMemo(() => {
    if (!selectedSheet) return null;
    return calculateCostSheetTotals(selectedSheet);
  }, [selectedSheet]);

  // Handle Input Changes in active sheet
  const handleHeaderChange = (field: string, val: any) => {
    if (!selectedSheet) return;
    setSelectedSheet({
      ...selectedSheet,
      header: {
        ...selectedSheet.header,
        [field]: val
      }
    });
  };

  const handleFabricRowChange = (index: number, field: keyof FabricConsumptionRow, val: any) => {
    if (!selectedSheet) return;
    const updated = [...(selectedSheet.fabrics || [])];
    updated[index] = { ...updated[index], [field]: val };

    // Auto calculate consumption kg if width, length, gsm provided
    const r = updated[index];
    if (r.bLength && r.bWidth && r.gsm) {
      const rawKgPerDzn = ((r.bLength + 4) * (r.bWidth + 4) * r.gsm * 12) / 10000000;
      const consKg = Number((rawKgPerDzn / 12).toFixed(3));
      const waste = Number(r.wastePct || 8);
      const totalCons = Number((consKg * (1 + waste / 100)).toFixed(3));
      r.consumptionKg = consKg;
      r.totalConsumptionKg = totalCons;
      r.dozen = Number((totalCons * 12).toFixed(2));
    }

    setSelectedSheet({ ...selectedSheet, fabrics: updated });
  };

  const handleAddFabricRow = () => {
    if (!selectedSheet) return;
    const currentFabrics = selectedSheet.fabrics || [];
    const nextTag = currentFabrics.length === 1 ? 'Fabric B' : currentFabrics.length === 2 ? 'Fabric C' : `Fabric ${currentFabrics.length + 1}`;
    const newRow: FabricConsumptionRow = {
      id: `fab-${Date.now()}`,
      fabricTag: nextTag,
      fabricDescription: 'New Component Fabric',
      bWidth: 60,
      bLength: 70,
      slCm: 20,
      mqPc: 1,
      consumptionKg: 0.20,
      wastePct: 8,
      totalConsumptionKg: 0.216,
      dozen: 2.59,
      gsm: 160,
      formula: 'Standard Body Formula',
      wastageKg: 0.016,
      knittingCost: 0.45,
      dyeingFinishingCost: 1.15,
      convertCost: 0.20
    };
    setSelectedSheet({ ...selectedSheet, fabrics: [...currentFabrics, newRow] });
  };

  const handleRemoveFabricRow = (idx: number) => {
    if (!selectedSheet || (selectedSheet.fabrics || []).length <= 1) return;
    const updated = selectedSheet.fabrics.filter((_, i) => i !== idx);
    setSelectedSheet({ ...selectedSheet, fabrics: updated });
  };

  // Save Cost Sheet Changes
  const handleSaveSheet = async (statusOverride?: string) => {
    if (!selectedSheet) return;
    setErrorMessage('');
    setSaveSuccessMessage('');
    try {
      const payload = {
        ...selectedSheet,
        approvalStatus: statusOverride || selectedSheet.approvalStatus,
        revisedBy: persona.name,
        revisionReason: 'Updated costing specifications and consumption matrix'
      };
      const res = await fetch('/api/merchandising/costing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save costing sheet');
      const data = await res.json();
      setSelectedSheet(data.costSheet);
      setSaveSuccessMessage('Cost sheet saved successfully with revision logged!');
      setIsEditing(false);
      fetchCostSheets();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving cost sheet');
    }
  };

  // Approval actions (Approver / Management)
  const handleApprovalAction = async (action: 'APPROVE' | 'REJECT' | 'SUBMIT') => {
    if (!selectedSheet) return;
    try {
      const res = await fetch('/api/merchandising/costing/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedSheet.id,
          styleRef: selectedSheet.header.styleRef,
          action,
          actor: persona.name,
          remarks: action === 'APPROVE' ? `Approved by ${persona.name}` : `Reviewed by ${persona.name}`
        })
      });
      if (!res.ok) throw new Error('Approval request failed');
      const data = await res.json();
      setSelectedSheet(data.costSheet);
      setSaveSuccessMessage(`Cost sheet ${action === 'APPROVE' ? 'APPROVED' : action} successfully!`);
      fetchCostSheets();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating approval');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* 1. TOP HEADER & BREADCRUMB */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
            <span>Merchandising</span>
            <span>›</span>
            <span>01. Pre-Order &amp; Salesman Sample</span>
            <span>›</span>
            <span style={{ color: '#2563eb' }}>Real Cost Sheet Quotation</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>💵</span>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Pre-Order / Salesman Sample Costing
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 800,
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe'
            }}>
              Official Real Cost Sheet Format
            </span>
          </div>
        </div>

        {/* Top Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsPrintPreview(!isPrintPreview)}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: isPrintPreview ? '#eff6ff' : '#ffffff',
              color: isPrintPreview ? '#1d4ed8' : '#334155',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🖨️</span> {isPrintPreview ? 'Exit Print View' : 'Printable Cost Sheet'}
          </button>

          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveSheet()}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(22,163,74,0.2)'
                }}
              >
                ✓ Save Version {(selectedSheet?.version || 1) + 1}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: '1px solid #2563eb',
                background: '#2563eb',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ✏️ Edit Cost Rates
            </button>
          )}

          {/* Flow into Order Confirmation button */}
          <Link
            href="/orders/new"
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              border: '1px solid #0f172a',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 800,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Convert this approved quotation directly into Job / PO"
          >
            <span>→</span> Confirm Order (Create Job)
          </Link>
        </div>
      </div>

      {saveSuccessMessage && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
          ✓ {saveSuccessMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {/* 2. FILTER & STYLE SELECTION STRIP */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Active Style Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Select Style Ref:
            </span>
            <select
              value={selectedSheet?.id || ''}
              onChange={(e) => {
                const found = costSheets.find(c => c.id === e.target.value);
                if (found) setSelectedSheet(found);
              }}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #2563eb',
                background: '#eff6ff',
                fontSize: '12.5px',
                fontWeight: 800,
                color: '#1e3a8a'
              }}
            >
              {costSheets.map(c => (
                <option key={c.id} value={c.id}>
                  {c.header.styleRef} · {c.header.garmentDescription} ({c.header.buyer}) — v{c.version} [{c.approvalStatus}]
                </option>
              ))}
            </select>
          </div>

          {/* Status Badge */}
          {selectedSheet && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 9px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 800,
              background: selectedSheet.approvalStatus === 'APPROVED' ? '#dcfce7' : selectedSheet.approvalStatus === 'SUBMITTED' ? '#dbeafe' : '#fef3c7',
              color: selectedSheet.approvalStatus === 'APPROVED' ? '#166534' : selectedSheet.approvalStatus === 'SUBMITTED' ? '#1e40af' : '#92400e',
              border: '1px solid currentColor'
            }}>
              Status: {selectedSheet.approvalStatus} (v{selectedSheet.version})
            </span>
          )}
        </div>

        {/* Approval Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedSheet?.approvalStatus !== 'APPROVED' && (
            <button
              type="button"
              onClick={() => handleApprovalAction('APPROVE')}
              style={{
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              ✓ Approve Costing
            </button>
          )}

          {selectedSheet?.approvalStatus === 'DRAFT' && (
            <button
              type="button"
              onClick={() => handleApprovalAction('SUBMIT')}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Submit for Review
            </button>
          )}
        </div>
      </div>

      {/* 3. COST SHEET MAIN BODY (Real Garment Cost Sheet Format) */}
      {selectedSheet && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden'
        }}>
          {/* Printable / Formal Header Row */}
          <div style={{
            background: '#0f172a',
            color: '#ffffff',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #2563eb'
          }}>
            <div>
              <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 800 }}>
                NORTHERN FASHIONS LIMITED · MERCHANDISING DIVISION
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.01em', marginTop: '2px' }}>
                PRE-ORDER COST SHEET (SALESMAN SAMPLE STAGE)
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Ref: <strong style={{ color: '#ffffff' }}>{selectedSheet.header.styleRef}</strong>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Cost Sheet Date: <strong style={{ color: '#ffffff' }}>{selectedSheet.header.date}</strong>
              </div>
            </div>
          </div>

          {/* 3.1 SECTION 1: HEADER SPECIFICATIONS */}
          <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '10px' }}>
              1. Header &amp; Style Reference
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 700 }}>Garment Description</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={selectedSheet.header.garmentDescription}
                    onChange={(e) => handleHeaderChange('garmentDescription', e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #94a3b8', fontSize: '12.5px', fontWeight: 700 }}
                  />
                ) : (
                  <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{selectedSheet.header.garmentDescription}</strong>
                )}
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 700 }}>Buyer</span>
                {isEditing && isHead ? (
                  <input
                    type="text"
                    value={selectedSheet.header.buyer}
                    onChange={(e) => handleHeaderChange('buyer', e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #94a3b8', fontSize: '12.5px', fontWeight: 700 }}
                  />
                ) : (
                  <strong style={{ fontSize: '13.5px', color: '#2563eb' }}>{selectedSheet.header.buyer}</strong>
                )}
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 700 }}>Div / Group</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={selectedSheet.header.divGroup}
                    onChange={(e) => handleHeaderChange('divGroup', e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #94a3b8', fontSize: '12.5px', fontWeight: 700 }}
                  />
                ) : (
                  <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{selectedSheet.header.divGroup}</strong>
                )}
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 700 }}>Order Qty / Style</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={selectedSheet.header.orderQty}
                    onChange={(e) => handleHeaderChange('orderQty', Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #94a3b8', fontSize: '12.5px', fontWeight: 700 }}
                  />
                ) : (
                  <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{Number(selectedSheet.header.orderQty).toLocaleString()} Pcs</strong>
                )}
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 700 }}>Style Ref</span>
                <strong style={{ fontSize: '14px', color: '#0f172a', fontWeight: 900 }}>{selectedSheet.header.styleRef}</strong>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 700 }}>Date</span>
                <strong style={{ fontSize: '13px', color: '#475569' }}>{selectedSheet.header.date}</strong>
              </div>
            </div>
          </div>

          {/* 3.2 SECTION 2: FABRIC CONSUMPTION TABLE */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>
                2. Fabric Consumption Breakdown (Fabric A, B &amp; C)
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleAddFabricRow}
                  style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + Add Fabric Line
                </button>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#334155', fontWeight: 800 }}>
                    <th style={{ padding: '8px 10px' }}>Fabric</th>
                    <th style={{ padding: '8px 10px' }}>Fabric Description</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>B/Width (in)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>B/Length (cm)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>S/L CM</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>M / Q pc</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Consumption kg</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Waste %</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Cons kg</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Dozen</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>GSM</th>
                    <th style={{ padding: '8px 10px' }}>Formula</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Knitting ($)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Dye &amp; Fin ($)</th>
                    {isEditing && <th style={{ padding: '8px 10px', textAlign: 'center' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {(selectedSheet.fabrics || []).map((fab, idx) => (
                    <tr key={fab.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: '#1e3a8a', whiteSpace: 'nowrap' }}>
                        {fab.fabricTag}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={fab.fabricDescription}
                            onChange={(e) => handleFabricRowChange(idx, 'fabricDescription', e.target.value)}
                            style={{ width: '100%', padding: '3px 6px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                          />
                        ) : (
                          <strong style={{ color: '#0f172a' }}>{fab.fabricDescription}</strong>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        {isEditing ? (
                          <input
                            type="number"
                            value={fab.bWidth}
                            onChange={(e) => handleFabricRowChange(idx, 'bWidth', Number(e.target.value))}
                            style={{ width: '50px', textAlign: 'right', padding: '3px', fontSize: '11px', border: '1px solid #cbd5e1' }}
                          />
                        ) : fab.bWidth}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        {isEditing ? (
                          <input
                            type="number"
                            value={fab.bLength}
                            onChange={(e) => handleFabricRowChange(idx, 'bLength', Number(e.target.value))}
                            style={{ width: '50px', textAlign: 'right', padding: '3px', fontSize: '11px', border: '1px solid #cbd5e1' }}
                          />
                        ) : fab.bLength}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fab.slCm || '—'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fab.mqPc || 1}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {Number(fab.consumptionKg || 0).toFixed(3)}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#b45309', fontWeight: 700 }}>
                        {isEditing ? (
                          <input
                            type="number"
                            value={fab.wastePct}
                            onChange={(e) => handleFabricRowChange(idx, 'wastePct', Number(e.target.value))}
                            style={{ width: '45px', textAlign: 'right', padding: '3px', fontSize: '11px', border: '1px solid #cbd5e1' }}
                          />
                        ) : `${fab.wastePct}%`}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>
                        {Number(fab.totalConsumptionKg || 0).toFixed(3)}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>
                        {Number(fab.dozen || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        {isEditing ? (
                          <input
                            type="number"
                            value={fab.gsm}
                            onChange={(e) => handleFabricRowChange(idx, 'gsm', Number(e.target.value))}
                            style={{ width: '50px', textAlign: 'right', padding: '3px', fontSize: '11px', border: '1px solid #cbd5e1' }}
                          />
                        ) : fab.gsm}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#64748b', fontSize: '10.5px' }}>
                        {fab.formula || 'Standard'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        ${Number(fab.knittingCost || 0.45).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        ${Number(fab.dyeingFinishingCost || 1.15).toFixed(2)}
                      </td>
                      {isEditing && (
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveFabricRow(idx)}
                            style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '3px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3.3 SECTION 3: THREE-COLUMN FABRIC COST MATRICES (Fabric A, B, C) */}
          <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '10px' }}>
              3. Fabric Cost Breakdown Matrices ($ / KG)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Fabric A Matrix */}
              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#1e3a8a', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                  Fabric A Cost
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Yarn Price / KG</span>
                    <strong>${Number(selectedSheet.fabricACost?.yarnPricePerKg || 3.85).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Knitting Cost</span>
                    <strong>${Number(selectedSheet.fabricACost?.knittingCostPerKg || 0.45).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>AOP / Oil Dye</span>
                    <strong>${Number(selectedSheet.fabricACost?.aopOilDyePerKg || 0.95).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Dyeing &amp; Finishing</span>
                    <strong>${Number(selectedSheet.fabricACost?.dyeingFinishingPerKg || 1.15).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Wastage &amp; P/L (Knit+Dye)</span>
                    <strong>${Number(selectedSheet.fabricACost?.wastageKnittingDyeingPerKg || 0.25).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '6px', fontWeight: 800, color: '#1e3a8a' }}>
                    <span>Total Cost Fabric A / KG</span>
                    <span>${Number(selectedSheet.fabricACost?.totalCostFabricAPerKg || 6.65).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Fabric B Matrix */}
              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#1e3a8a', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                  Fabric B Cost (Rib / Component)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Yarn Price / KG</span>
                    <strong>${Number(selectedSheet.fabricBCost?.yarnPricePerKg || 4.20).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Spandex Surcharge</span>
                    <strong>${Number(selectedSheet.fabricBCost?.spandexPerKg || 0.40).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Knitting Cost</span>
                    <strong>${Number(selectedSheet.fabricBCost?.knittingCostPerKg || 0.55).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Wastage &amp; P/L</span>
                    <strong>${Number(selectedSheet.fabricBCost?.wastageKnittingDyeingPerKg || 0.30).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '6px', fontWeight: 800, color: '#1e3a8a' }}>
                    <span>Total Cost Fabric B / KG</span>
                    <span>${Number(selectedSheet.fabricBCost?.totalCostFabricBPerKg || 5.45).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Fabric C Matrix (Optional) */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#64748b', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                  Fabric C Cost (Optional)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Yarn Price</span>
                    <span style={{ color: '#94a3b8' }}>$0.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Knitting Cost</span>
                    <span style={{ color: '#94a3b8' }}>$0.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '6px', fontWeight: 700, color: '#64748b' }}>
                    <span>Total Cost Fabric C</span>
                    <span>$0.00 / KG</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3.4 SECTION 4: ACCESSORIES / TRIMMINGS COSTING */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '10px' }}>
              4. Accessories &amp; Trimmings Costing
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              {(selectedSheet.accessories || []).map((acc) => (
                <div key={acc.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '12px', color: '#0f172a', display: 'block' }}>{acc.item}</strong>
                    <span style={{ fontSize: '10.5px', color: '#64748b' }}>Dzn: ${Number(acc.costPerDzn || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '13px', color: '#2563eb' }}>${Number(acc.costPerPc || 0).toFixed(3)}</strong>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>/ Pc</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3.5 SECTION 5: FINAL ROLLUP, CM, OVERHEADS, PROFIT, FOB */}
          <div style={{ padding: '20px', background: '#f1f5f9' }}>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', marginBottom: '14px' }}>
              5. Final Costing Rollup &amp; FOB Quotation Output
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 700 }}>Total Fabric Cost / Pc</span>
                <strong style={{ fontSize: '18px', color: '#0f172a' }}>
                  ${calculatedTotals?.totalFabricCostPerPc.toFixed(2) || '1.73'}
                </strong>
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>Direct Yarn &amp; Mills</span>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 700 }}>CM (Cutting &amp; Making)</span>
                <strong style={{ fontSize: '18px', color: '#0f172a' }}>
                  ${Number(selectedSheet.otherCosts?.cmCuttingMakingPerPc || 0.92).toFixed(2)}
                </strong>
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>Labor &amp; Sewing floor</span>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 700 }}>Accessories / Pc</span>
                <strong style={{ fontSize: '18px', color: '#0f172a' }}>
                  ${calculatedTotals?.totalAccessoriesPerPc.toFixed(2) || '0.33'}
                </strong>
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>Main, Care, Carton, Poly</span>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 700 }}>Commercial &amp; Overhead</span>
                <strong style={{ fontSize: '18px', color: '#0f172a' }}>
                  ${calculatedTotals?.commercialOverheadPerPc.toFixed(2) || '0.11'}
                </strong>
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>{selectedSheet.otherCosts?.commercialOverheadPct || 3.5}% standard</span>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 700 }}>Factory Profit</span>
                <strong style={{ fontSize: '18px', color: '#16a34a' }}>
                  ${calculatedTotals?.profitPerPc.toFixed(2) || '0.27'}
                </strong>
                <span style={{ fontSize: '10.5px', color: '#16a34a' }}>{selectedSheet.otherCosts?.profitPct || 8.0}% Target Margin</span>
              </div>

              <div style={{ background: '#1e3a8a', color: '#ffffff', borderRadius: '8px', padding: '14px', border: '2px solid #3b82f6' }}>
                <span style={{ fontSize: '11px', color: '#93c5fd', display: 'block', fontWeight: 800, textTransform: 'uppercase' }}>
                  Total Garment Price / Pc FOB
                </span>
                <strong style={{ fontSize: '26px', color: '#ffffff', fontWeight: 900 }}>
                  ${calculatedTotals?.finalFobPrice.toFixed(2) || '3.78'}
                </strong>
                <span style={{ fontSize: '11px', color: '#bfdbfe', display: 'block', marginTop: '2px' }}>
                  ${calculatedTotals?.costPerDzn.toFixed(2) || '45.36'} / Dozen
                </span>
              </div>
            </div>
          </div>

          {/* 3.6 REVISION & APPROVAL HISTORY */}
          <div style={{ padding: '16px 20px', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '8px' }}>
              6. Costing Revision &amp; Approval Audit Trail
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(selectedSheet.revisions || []).map((rev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', padding: '6px 10px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <strong style={{ color: '#1e3a8a', marginRight: '8px' }}>Version {rev.version}</strong>
                    <span>{rev.reason}</span>
                    <span style={{ color: '#64748b', marginLeft: '6px' }}>— {rev.changedValues}</span>
                  </div>
                  <div style={{ color: '#475569', fontSize: '11px' }}>
                    <span>{rev.revisedAt} by <strong>{rev.revisedBy}</strong></span>
                    <span style={{ marginLeft: '8px', fontWeight: 800, color: '#16a34a' }}>FOB ${Number(rev.fobPrice).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
