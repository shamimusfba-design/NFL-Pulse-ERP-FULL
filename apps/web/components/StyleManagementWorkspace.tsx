'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useActivePersona } from './NosTopNav';
import StyleDetailDrawer, { StyleDetailData } from './StyleDetailDrawer';

export default function StyleManagementWorkspace() {
  const { persona } = useActivePersona();
  const isHead = persona.role === 'HEAD_MERCHANDISER' || persona.role === 'ADMIN';

  // 1. Filter States
  const [buyerFilter, setBuyerFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [seasonFilter, setSeasonFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);

  // 2. Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [stylesData, setStylesData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // 3. Modals & Drawer State
  const [selectedStyle, setSelectedStyle] = useState<StyleDetailData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});

  // 4. New Style Form State
  const [newStyleForm, setNewStyleForm] = useState({
    styleNo: '',
    buyerStyleNo: '',
    styleName: '',
    buyer: persona.assignedBuyer || 'ONLY',
    category: 'T-Shirt',
    season: 'Autumn/Winter 2026',
    department: 'Menswear',
    brand: 'Core',
    fabricType: '100% Cotton Single Jersey 180 GSM',
    gsm: '180',
    colors: 'Optical White, Black Beauty',
    sizes: 'XS, S, M, L, XL, 2XL',
    smv: '8.5',
    fobPrice: '5.25',
    orderQty: '25000',
    status: 'DEVELOPMENT'
  });

  // 5. Excel Import State
  const [importText, setImportText] = useState<string>('');
  const [importLoading, setImportLoading] = useState<boolean>(false);
  const [importMessage, setImportMessage] = useState<string>('');

  // Fetch Styles from Backend API
  const fetchStyles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        role: persona.role,
        assignedBuyer: persona.assignedBuyer,
        buyer: isHead ? buyerFilter : persona.assignedBuyer,
        status: activeTab !== 'ALL' ? activeTab : statusFilter,
        category: categoryFilter,
        season: seasonFilter,
        department: deptFilter,
        search: searchQuery,
        page: String(page),
        limit: String(limit)
      });

      const res = await fetch(`/api/merchandising/styles?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch styles master data`);
      const data = await res.json();
      setStylesData(data);
      setLastSyncTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      console.error('Failed to load styles:', err);
      setError(err.message || 'Error communicating with ERP server');
    } finally {
      setLoading(false);
    }
  }, [
    persona,
    isHead,
    buyerFilter,
    statusFilter,
    activeTab,
    categoryFilter,
    seasonFilter,
    deptFilter,
    searchQuery,
    page,
    limit
  ]);

  useEffect(() => {
    fetchStyles();
  }, [fetchStyles]);

  // Open Drawer
  const handleOpenStyle = async (styleItem: any) => {
    setSelectedStyle(styleItem);
    setIsDrawerOpen(true);
    try {
      const res = await fetch(`/api/merchandising/styles/${styleItem.styleNo}`);
      if (res.ok) {
        const full = await res.json();
        if (full.style) setSelectedStyle(full.style);
      }
    } catch (e) {
      // fallback to initial item
    }
  };

  // Export CSV
  const handleExport = () => {
    const params = new URLSearchParams({
      role: persona.role,
      assignedBuyer: persona.assignedBuyer,
      buyer: isHead ? buyerFilter : persona.assignedBuyer
    });
    window.location.href = `/api/merchandising/styles/export?${params.toString()}`;
  };

  // Submit New Style
  const handleCreateStyle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newStyleForm,
        colors: newStyleForm.colors.split(',').map(s => s.trim()).filter(Boolean),
        sizes: newStyleForm.sizes.split(',').map(s => s.trim()).filter(Boolean),
        orderQty: Number(newStyleForm.orderQty || 20000),
        fobPrice: Number(newStyleForm.fobPrice || 5.25),
        smv: Number(newStyleForm.smv || 8.5)
      };

      const res = await fetch('/api/merchandising/styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to create master style');
      setIsNewModalOpen(false);
      fetchStyles();
      setNewStyleForm({
        styleNo: '',
        buyerStyleNo: '',
        styleName: '',
        buyer: persona.assignedBuyer || 'ONLY',
        category: 'T-Shirt',
        season: 'Autumn/Winter 2026',
        department: 'Menswear',
        brand: 'Core',
        fabricType: '100% Cotton Single Jersey 180 GSM',
        gsm: '180',
        colors: 'Optical White, Black Beauty',
        sizes: 'XS, S, M, L, XL, 2XL',
        smv: '8.5',
        fobPrice: '5.25',
        orderQty: '25000',
        status: 'DEVELOPMENT'
      });
    } catch (err: any) {
      alert(err.message || 'Error creating style');
    }
  };

  // Submit Excel Import
  const handleImportExcel = async () => {
    if (!importText.trim()) return;
    setImportLoading(true);
    setImportMessage('');
    try {
      const lines = importText.trim().split('\n');
      const stylesToImport: any[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.includes('\t') ? line.split('\t') : line.split(',');
        if (i === 0 && (cols[0].toLowerCase().includes('style') || cols[0].toLowerCase().includes('no'))) {
          continue; // skip header
        }

        const styleNo = cols[0]?.trim();
        if (!styleNo) continue;

        stylesToImport.push({
          styleNo,
          styleName: cols[1]?.trim() || `Style ${styleNo}`,
          buyerStyleNo: cols[2]?.trim() || `BY-${styleNo}`,
          buyer: cols[3]?.trim() || persona.assignedBuyer || 'ONLY',
          category: cols[4]?.trim() || 'T-Shirt',
          season: cols[5]?.trim() || 'Autumn/Winter 2026',
          orderQty: Number(cols[6]?.trim() || 20000),
          fobPrice: Number(cols[7]?.trim() || 5.25),
          fabricType: cols[8]?.trim() || '100% Cotton Single Jersey',
          status: 'ACTIVE'
        });
      }

      if (stylesToImport.length === 0) {
        throw new Error('No valid style rows found. Please check format.');
      }

      const res = await fetch('/api/merchandising/styles/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styles: stylesToImport })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setImportMessage(`✓ Successfully imported ${data.importedCount || stylesToImport.length} styles!`);
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportText('');
        setImportMessage('');
        fetchStyles();
      }, 1200);
    } catch (err: any) {
      setImportMessage(`Error: ${err.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  // Toggle selection
  const toggleSelectRow = (styleNo: string) => {
    setSelectedRowIds(prev => ({ ...prev, [styleNo]: !prev[styleNo] }));
  };

  const toggleSelectAll = () => {
    const list = stylesData?.styles || [];
    if (Object.keys(selectedRowIds).length === list.length && list.length > 0) {
      setSelectedRowIds({});
    } else {
      const all: Record<string, boolean> = {};
      list.forEach((s: any) => { all[s.styleNo] = true; });
      setSelectedRowIds(all);
    }
  };

  // Reset Filters
  const handleClearFilters = () => {
    setBuyerFilter('ALL');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setSeasonFilter('ALL');
    setDeptFilter('ALL');
    setSearchQuery('');
    setActiveTab('ALL');
    setPage(1);
  };

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];
    if (isHead && buyerFilter !== 'ALL') chips.push({ label: `Buyer: ${buyerFilter}`, onRemove: () => setBuyerFilter('ALL') });
    if (statusFilter !== 'ALL') chips.push({ label: `Status: ${statusFilter}`, onRemove: () => setStatusFilter('ALL') });
    if (categoryFilter !== 'ALL') chips.push({ label: `Category: ${categoryFilter}`, onRemove: () => setCategoryFilter('ALL') });
    if (seasonFilter !== 'ALL') chips.push({ label: `Season: ${seasonFilter}`, onRemove: () => setSeasonFilter('ALL') });
    if (deptFilter !== 'ALL') chips.push({ label: `Dept: ${deptFilter}`, onRemove: () => setDeptFilter('ALL') });
    if (searchQuery) chips.push({ label: `Search: "${searchQuery}"`, onRemove: () => setSearchQuery('') });
    return chips;
  }, [buyerFilter, statusFilter, categoryFilter, seasonFilter, deptFilter, searchQuery, isHead]);

  const kpis = stylesData?.kpis || {
    totalStyles: 312,
    activeBulkStyles: 184,
    developmentStyles: 48,
    totalLinkedJobs: 412,
    totalOrderPcs: 2840000,
    techPackApprovedPct: 98,
    protoFitApprovedPct: 94
  };

  const stylesList: any[] = stylesData?.styles || [];
  const availableCategories: string[] = stylesData?.availableCategories || ['T-Shirt', 'Polo', 'Hoodie', 'Sweatshirt', 'Jacket', 'Trouser', 'Legging', 'Kidswear'];
  const availableSeasons: string[] = stylesData?.availableSeasons || ['Autumn/Winter 2026', 'Spring/Summer 2027', 'Core 2026'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* 1. TOP BREADCRUMB & ACTION BAR */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
            <span>Merchandising</span>
            <span>›</span>
            <span>03. Style & Product Management</span>
          </div>

          {/* Title Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>👕</span>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Style & Product Management
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 800,
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0'
            }}>
              ● Master Repository
            </span>
            <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>
              Last Sync: {lastSyncTime || '14:32'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchStyles}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Refresh Style Master List"
          >
            <span>⟳</span> Refresh
          </button>

          <button
            type="button"
            onClick={handleExport}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📥</span> Export CSV
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '12px',
              fontWeight: 700,
              color: '#1e293b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📊</span> Import Excel
          </button>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              border: '1px solid #2563eb',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
            }}
          >
            <span>+</span> New Style
          </button>
        </div>
      </div>

      {/* 2. SIX COLORFUL KPI SUMMARY CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px'
      }}>
        {/* KPI 1: Total Master Styles */}
        <div
          onClick={() => { setActiveTab('ALL'); setStatusFilter('ALL'); }}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 16px',
            borderLeft: '4px solid #3b82f6',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Master Styles</span>
            <span style={{ fontSize: '14px', color: '#3b82f6' }}>👕</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
            {kpis.totalStyles}
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>
            Active buyer scope
          </div>
        </div>

        {/* KPI 2: Active Bulk Styles */}
        <div
          onClick={() => { setActiveTab('RUNNING'); setStatusFilter('RUNNING'); }}
          style={{
            background: '#ffffff',
            border: activeTab === 'RUNNING' ? '2px solid #10b981' : '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 16px',
            borderLeft: '4px solid #10b981',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Active Bulk</span>
            <span style={{ fontSize: '14px', color: '#10b981' }}>🏭</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
            {kpis.activeBulkStyles}
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>
            In live production
          </div>
        </div>

        {/* KPI 3: Development / Sampling */}
        <div
          onClick={() => { setActiveTab('DEVELOPMENT'); setStatusFilter('DEVELOPMENT'); }}
          style={{
            background: '#ffffff',
            border: activeTab === 'DEVELOPMENT' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 16px',
            borderLeft: '4px solid #f59e0b',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Development</span>
            <span style={{ fontSize: '14px', color: '#f59e0b' }}>✂️</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
            {kpis.developmentStyles}
          </div>
          <div style={{ fontSize: '11px', color: '#d97706', fontWeight: 700, marginTop: '4px' }}>
            Sampling & Proto stage
          </div>
        </div>

        {/* KPI 4: Total Order Volume */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '14px 16px',
          borderLeft: '4px solid #6366f1',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Order Qty</span>
            <span style={{ fontSize: '14px', color: '#6366f1' }}>📦</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
            {Number(kpis.totalOrderPcs).toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: '#4f46e5', fontWeight: 700, marginTop: '4px' }}>
            Across {kpis.totalLinkedJobs} jobs
          </div>
        </div>

        {/* KPI 5: Tech Pack Approved % */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '14px 16px',
          borderLeft: '4px solid #06b6d4',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Tech Pack OK</span>
            <span style={{ fontSize: '14px', color: '#06b6d4' }}>📋</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#16a34a', lineHeight: 1.1 }}>
            {kpis.techPackApprovedPct}%
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>
            CAD markers released
          </div>
        </div>

        {/* KPI 6: Fit / PP Sample Approved % */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '14px 16px',
          borderLeft: '4px solid #8b5cf6',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Fit/PP Approved</span>
            <span style={{ fontSize: '14px', color: '#8b5cf6' }}>✨</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#16a34a', lineHeight: 1.1 }}>
            {kpis.protoFitApprovedPct}%
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>
            Buyer sign-off rate
          </div>
        </div>
      </div>

      {/* 3. COMPACT GLOBAL FILTER BAR */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '14px 18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', alignItems: 'end' }}>
          {/* Buyer Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Buyer {isHead ? '(Global Access)' : '🔒 (Assigned)'}
            </label>
            {isHead ? (
              <select
                value={buyerFilter}
                onChange={(e) => { setBuyerFilter(e.target.value); setPage(1); }}
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #2563eb', fontSize: '12px', background: '#eff6ff', fontWeight: 700 }}
              >
                <option value="ALL">All Buyers</option>
                <option value="ONLY">ONLY (Bestseller)</option>
                <option value="OVS">OVS (Italy)</option>
                <option value="Name It">Name It (Kids)</option>
                <option value="UTG">UTG (UK)</option>
                <option value="New Look">New Look</option>
                <option value="Maurices">Maurices</option>
              </select>
            ) : (
              <div style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>{persona.assignedBuyer}</span>
                <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 800 }}>LOCKED</span>
              </div>
            )}
          </div>

          {/* Style Status */}
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Style Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DEVELOPMENT">Development</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="RUNNING">Running / Production</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Product Category */}
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Product Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
            >
              <option value="ALL">All Categories</option>
              {availableCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Season */}
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Season
            </label>
            <select
              value={seasonFilter}
              onChange={(e) => { setSeasonFilter(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
            >
              <option value="ALL">All Seasons</option>
              {availableSeasons.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Department
            </label>
            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
            >
              <option value="ALL">All Departments</option>
              <option value="Menswear">Menswear</option>
              <option value="Womenswear">Womenswear</option>
              <option value="Kids">Kids</option>
            </select>
          </div>

          {/* Search Box */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Global Search (Style, Ref, PO, Job, Color...)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search style no, buyer ref, category, color..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 28px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px'
                }}
              />
              <span style={{ position: 'absolute', left: '8px', top: '7px', fontSize: '12px', color: '#94a3b8' }}>🔍</span>
            </div>
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {activeChips.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Active Filters ({activeChips.length}):</span>
            {activeChips.map((chip, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1d4ed8',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                {chip.label}
                <button
                  type="button"
                  onClick={chip.onRemove}
                  style={{ border: 'none', background: 'transparent', color: '#1d4ed8', cursor: 'pointer', fontWeight: 900, padding: 0 }}
                >
                  ×
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                marginLeft: 'auto',
                border: 'none',
                background: 'transparent',
                color: '#dc2626',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* 4. MASTER STYLES DATA GRID */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        {/* Table Subtabs */}
        <div style={{
          padding: '12px 18px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: `All Styles (${kpis.totalStyles})` },
              { id: 'RUNNING', label: `Active / Running (${kpis.activeBulkStyles})` },
              { id: 'DEVELOPMENT', label: `Development (${kpis.developmentStyles})` },
              { id: 'CONFIRMED', label: `Confirmed / Cut Ready` },
              { id: 'COMPLETED', label: `Completed` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id); setPage(1); }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  border: activeTab === tab.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  background: activeTab === tab.id ? '#eff6ff' : '#ffffff',
                  color: activeTab === tab.id ? '#1d4ed8' : '#475569',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Showing <strong>{stylesList.length}</strong> styles
          </div>
        </div>

        {/* Dense Enterprise Table */}
        <div style={{ overflowX: 'auto', maxHeight: '580px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: '#f8fafc' }}>
              <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 800 }}>
                <th style={{ padding: '10px 12px', width: '36px' }}>
                  <input
                    type="checkbox"
                    checked={stylesList.length > 0 && Object.keys(selectedRowIds).length === stylesList.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={{ padding: '10px 12px' }}>Style No</th>
                <th style={{ padding: '10px 12px' }}>Buyer Style Ref</th>
                <th style={{ padding: '10px 12px' }}>Buyer & Brand</th>
                <th style={{ padding: '10px 12px' }}>Description / Name</th>
                <th style={{ padding: '10px 12px' }}>Category</th>
                <th style={{ padding: '10px 12px' }}>Season & Dept</th>
                <th style={{ padding: '10px 12px' }}>Fabric & GSM</th>
                <th style={{ padding: '10px 12px' }}>Colorways</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Order Qty</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>FOB (USD)</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Linked Jobs</th>
                <th style={{ padding: '10px 12px' }}>Style Status</th>
                <th style={{ padding: '10px 12px' }}>Tech Pack</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && stylesList.length === 0 ? (
                <tr>
                  <td colSpan={15} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    Loading style master catalog...
                  </td>
                </tr>
              ) : stylesList.length === 0 ? (
                <tr>
                  <td colSpan={15} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No matching master styles found. Adjust your search or filters.
                  </td>
                </tr>
              ) : (
                stylesList.map((s) => {
                  const isSelected = !!selectedRowIds[s.styleNo];
                  return (
                    <tr
                      key={s.id || s.styleNo}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isSelected ? '#f0f9ff' : undefined,
                        cursor: 'pointer',
                        transition: 'background 0.1s ease'
                      }}
                      onClick={() => handleOpenStyle(s)}
                    >
                      <td style={{ padding: '8px 12px' }} onClick={(e) => { e.stopPropagation(); toggleSelectRow(s.styleNo); }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(s.styleNo)}
                        />
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 800, color: '#2563eb' }}>
                        {s.styleNo}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>
                        {s.buyerStyleNo || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>
                        {s.buyer} <span style={{ color: '#64748b', fontWeight: 400 }}>· {s.brand}</span>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: 600, maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.styleName}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: '#f1f5f9',
                          color: '#334155'
                        }}>
                          {s.category || s.product}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#475569' }}>
                        {s.season} · <strong style={{ color: '#0f172a' }}>{s.department}</strong>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#334155', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.fabricType}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: '11.5px', color: '#2563eb', fontWeight: 700 }}>
                          {(s.colors || []).length} Colors
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                        {Number(s.orderQty).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569', fontWeight: 700 }}>
                        ${Number(s.fobPrice || 5.25).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: (s.linkedJobs?.length || 0) > 0 ? '#eff6ff' : '#f8fafc',
                          color: (s.linkedJobs?.length || 0) > 0 ? '#1d4ed8' : '#94a3b8'
                        }}>
                          {s.linkedJobs?.length || 0} Jobs
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '10px',
                          fontSize: '10.5px',
                          fontWeight: 800,
                          background: s.status === 'RUNNING' ? '#eff6ff' : s.status === 'CONFIRMED' ? '#ecfdf5' : s.status === 'DEVELOPMENT' ? '#fffbeb' : '#f8fafc',
                          color: s.status === 'RUNNING' ? '#1d4ed8' : s.status === 'CONFIRMED' ? '#047857' : s.status === 'DEVELOPMENT' ? '#b45309' : '#475569',
                          border: '1px solid #e2e8f0'
                        }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: 800,
                          background: '#ecfdf5',
                          color: '#047857'
                        }}>
                          {s.techPackStatus || 'OK'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#2563eb', fontWeight: 800 }}>
                        View ›
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sticky Status Bar & Pagination */}
        <div style={{
          padding: '12px 18px',
          background: '#0b1329',
          color: '#cbd5e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#10b981', fontWeight: 800 }}>● Live Repository</span>
            <span>Sync: {lastSyncTime || '14:32'}</span>
            <span style={{ color: '#64748b' }}>|</span>
            <span style={{ color: '#10b981' }}>✓ Spec Database: Online</span>
            <span>Total Catalog: <strong>{stylesData?.pagination?.totalRecords || kpis.totalStyles}</strong></span>
          </div>

          {/* Pagination Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>
              Page {page} of {stylesData?.pagination?.totalPages || 1}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{ padding: '3px 8px', borderRadius: '4px', background: '#1e293b', border: '1px solid #334155', color: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: '11px' }}
              >
                ‹
              </button>
              <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#2563eb', color: '#fff', fontWeight: 800, fontSize: '11px' }}>
                {page}
              </span>
              <button
                type="button"
                disabled={page >= (stylesData?.pagination?.totalPages || 1)}
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '3px 8px', borderRadius: '4px', background: '#1e293b', border: '1px solid #334155', color: '#fff', cursor: 'pointer', fontSize: '11px' }}
              >
                ›
              </button>
            </div>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '3px 6px', borderRadius: '4px', fontSize: '11px' }}
            >
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. STYLE DETAIL SLIDE-OVER DRAWER */}
      <StyleDetailDrawer
        style={selectedStyle}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onStyleUpdated={fetchStyles}
      />

      {/* 6. NEW STYLE CREATION MODAL */}
      {isNewModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setIsNewModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '680px',
              maxWidth: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              padding: '24px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>👕</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                  Create New Master Style
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStyle} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Style No *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 13251599"
                    value={newStyleForm.styleNo}
                    onChange={(e) => setNewStyleForm(prev => ({ ...prev, styleNo: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Buyer Style / Customer Ref
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BY-ONL-2026"
                    value={newStyleForm.buyerStyleNo}
                    onChange={(e) => setNewStyleForm(prev => ({ ...prev, buyerStyleNo: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                  Style Description / Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mens Heavyweight Ribbed Crewneck Tee"
                  value={newStyleForm.styleName}
                  onChange={(e) => setNewStyleForm(prev => ({ ...prev, styleName: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Buyer
                  </label>
                  <select
                    value={newStyleForm.buyer}
                    onChange={(e) => setNewStyleForm(prev => ({ ...prev, buyer: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="ONLY">ONLY</option>
                    <option value="OVS">OVS</option>
                    <option value="Name It">Name It</option>
                    <option value="UTG">UTG</option>
                    <option value="New Look">New Look</option>
                    <option value="Maurices">Maurices</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Product Category
                  </label>
                  <select
                    value={newStyleForm.category}
                    onChange={(e) => setNewStyleForm(prev => ({ ...prev, category: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="T-Shirt">T-Shirt</option>
                    <option value="Polo">Polo</option>
                    <option value="Hoodie">Hoodie</option>
                    <option value="Sweatshirt">Sweatshirt</option>
                    <option value="Jacket">Jacket</option>
                    <option value="Trouser">Trouser</option>
                    <option value="Legging">Legging</option>
                    <option value="Kidswear">Kidswear</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Season
                  </label>
                  <select
                    value={newStyleForm.season}
                    onChange={(e) => setNewStyleForm(prev => ({ ...prev, season: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    <option value="Autumn/Winter 2026">Autumn/Winter 2026</option>
                    <option value="Spring/Summer 2027">Spring/Summer 2027</option>
                    <option value="Core 2026">Core 2026</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Primary Fabric Type
                  </label>
                  <input
                    type="text"
                    value={newStyleForm.fabricType}
                    onChange={(e) => setNewStyleForm(prev => ({ ...prev, fabricType: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Fabric Weight (GSM)
                  </label>
                  <input
                    type="text"
                    value={newStyleForm.gsm}
                    onChange={(e) => setNewStyleForm(prev => ({ ...prev, gsm: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Standard Min (SMV)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newStyleForm.smv}
                    onChange={(e) => setNewStyleForm(prev => ({ ...prev, smv: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Target FOB Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={newStyleForm.fobPrice}
                    onChange={(e) => setNewStyleForm(prev => ({ ...prev, fobPrice: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Planned Order Qty (Pcs)
                  </label>
                  <input
                    type="number"
                    value={newStyleForm.orderQty}
                    onChange={(e) => setNewStyleForm(prev => ({ ...prev, orderQty: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                  Colorways (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Navy Blazer, Optical White, Black Beauty"
                  value={newStyleForm.colors}
                  onChange={(e) => setNewStyleForm(prev => ({ ...prev, colors: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Create Master Style
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. IMPORT EXCEL MODAL */}
      {isImportModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setIsImportModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '640px',
              maxWidth: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📊</span>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                  Import Styles from Excel / CSV
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px 0' }}>
              Paste tab-separated rows copied directly from Excel, or comma-separated CSV lines.
              Columns expected: <code>Style No, Style Name, Buyer Style Ref, Buyer, Category, Season, Order Qty, FOB</code>
            </p>

            <textarea
              rows={8}
              placeholder="13251601	Womens Crop Top	BY-1601	ONLY	T-Shirt	AW 2026	15000	4.85
13251602	Boys Fleece Jogger	BY-1602	Name It	Trouser	AW 2026	12000	6.20"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontFamily: 'monospace',
                resize: 'vertical'
              }}
            />

            {importMessage && (
              <div style={{
                marginTop: '10px',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                background: importMessage.startsWith('✓') ? '#ecfdf5' : '#fee2e2',
                color: importMessage.startsWith('✓') ? '#047857' : '#b91c1c'
              }}>
                {importMessage}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importLoading || !importText.trim()}
                onClick={handleImportExcel}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: importLoading || !importText.trim() ? 'not-allowed' : 'pointer',
                  opacity: importLoading ? 0.7 : 1
                }}
              >
                {importLoading ? 'Importing...' : 'Process Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
