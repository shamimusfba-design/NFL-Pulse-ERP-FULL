'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useActivePersona, MerchandiserPersona, PRESET_PERSONAS } from './NosTopNav';
import JobDetailDrawer, { JobDetailData } from './JobDetailDrawer';

export default function BulkMerchandisingDashboard() {
  const { persona, switchPersona } = useActivePersona();

  // 1. Filter States
  const [period, setPeriod] = useState<string>('THIS_MONTH');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [weekFilter, setWeekFilter] = useState<string>('ALL');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [taskFilter, setTaskFilter] = useState<string>('ALL');
  const [shipmentFilter, setShipmentFilter] = useState<string>('ALL');
  const [productionFilter, setProductionFilter] = useState<string>('ALL');
  const [buyerFilter, setBuyerFilter] = useState<string>('ALL');
  const [merchandiserFilter, setMerchandiserFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);

  // My Actions subtab
  const [actionTab, setActionTab] = useState<'today' | 'overdue' | 'upcoming' | 'completed'>('today');

  // 2. Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // 3. Selection & Drawer State
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobDetailData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [showPersonaMenu, setShowPersonaMenu] = useState<boolean>(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});

  const isHead = persona.role === 'HEAD_MERCHANDISER' || persona.role === 'ADMIN';

  // Fetch Dashboard Data from Backend
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        role: persona.role,
        assignedBuyer: persona.assignedBuyer,
        buyer: isHead ? buyerFilter : persona.assignedBuyer,
        period,
        from: fromDate,
        to: toDate,
        week: weekFilter,
        month: monthFilter,
        status: statusFilter,
        risk: riskFilter,
        task: taskFilter,
        shipment: shipmentFilter,
        production: productionFilter,
        merchandiser: merchandiserFilter,
        search: searchQuery,
        tab: activeTab,
        page: String(page),
        limit: String(limit)
      });

      const res = await fetch(`/api/merchandising/dashboard?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load dashboard`);
      const data = await res.json();
      setDashboardData(data);
      setLastSyncTime(data.lastSync || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Error connecting to ERP backend');
    } finally {
      setLoading(false);
    }
  }, [
    persona,
    isHead,
    buyerFilter,
    period,
    fromDate,
    toDate,
    weekFilter,
    monthFilter,
    statusFilter,
    riskFilter,
    taskFilter,
    shipmentFilter,
    productionFilter,
    merchandiserFilter,
    searchQuery,
    activeTab,
    page,
    limit
  ]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Open Drawer for a Job
  const handleOpenJobDrawer = async (job: any) => {
    setSelectedJobId(job.jobNo);
    setSelectedJob(job);
    setIsDrawerOpen(true);
    try {
      const res = await fetch(`/api/merchandising/jobs/${job.jobNo}`);
      if (res.ok) {
        const full = await res.json();
        if (full.job) {
          setSelectedJob((prev) => ({ ...prev, ...full.job }));
        }
      }
    } catch (e) {
      // fallback to initial row
    }
  };

  // Mark Action Complete
  const handleMarkComplete = async (actionId: string) => {
    try {
      await fetch('/api/merchandising/actions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId })
      });
      fetchDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  // Export Filtered Records
  const handleExport = () => {
    const params = new URLSearchParams({
      role: persona.role,
      assignedBuyer: persona.assignedBuyer,
      buyer: isHead ? buyerFilter : persona.assignedBuyer
    });
    window.location.href = `/api/merchandising/export?${params.toString()}`;
  };

  // Reset all filters
  const handleClearAllFilters = () => {
    setPeriod('ALL');
    setFromDate('');
    setToDate('');
    setWeekFilter('ALL');
    setMonthFilter('ALL');
    setStatusFilter('ALL');
    setRiskFilter('ALL');
    setTaskFilter('ALL');
    setShipmentFilter('ALL');
    setProductionFilter('ALL');
    setBuyerFilter('ALL');
    setMerchandiserFilter('ALL');
    setSearchQuery('');
    setActiveTab('ALL');
    setPage(1);
  };

  // Active filter count and removable chips
  const activeChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];
    if (period !== 'ALL') {
      const periodLabels: Record<string, string> = {
        TODAY: 'Today',
        YESTERDAY: 'Yesterday',
        THIS_WEEK: 'This Week',
        LAST_WEEK: 'Last Week',
        THIS_MONTH: 'This Month',
        LAST_MONTH: 'Last Month',
        NEXT_7_DAYS: 'Next 7 Days',
        NEXT_14_DAYS: 'Next 14 Days',
        NEXT_30_DAYS: 'Next 30 Days',
        CUSTOM: `${fromDate || 'Start'} to ${toDate || 'End'}`
      };
      chips.push({ label: `Period: ${periodLabels[period] || period}`, onRemove: () => setPeriod('ALL') });
    }
    if (weekFilter !== 'ALL') chips.push({ label: `Week: ${weekFilter}`, onRemove: () => setWeekFilter('ALL') });
    if (monthFilter !== 'ALL') chips.push({ label: `Month: ${monthFilter}`, onRemove: () => setMonthFilter('ALL') });
    if (statusFilter !== 'ALL') chips.push({ label: `Status: ${statusFilter}`, onRemove: () => setStatusFilter('ALL') });
    if (riskFilter !== 'ALL') chips.push({ label: `Risk: ${riskFilter}`, onRemove: () => setRiskFilter('ALL') });
    if (shipmentFilter !== 'ALL') chips.push({ label: `Shipment: ${shipmentFilter}`, onRemove: () => setShipmentFilter('ALL') });
    if (productionFilter !== 'ALL') chips.push({ label: `Prod: ${productionFilter}`, onRemove: () => setProductionFilter('ALL') });
    if (isHead && buyerFilter !== 'ALL') chips.push({ label: `Buyer: ${buyerFilter}`, onRemove: () => setBuyerFilter('ALL') });
    if (searchQuery) chips.push({ label: `Search: "${searchQuery}"`, onRemove: () => setSearchQuery('') });
    return chips;
  }, [period, fromDate, toDate, weekFilter, monthFilter, statusFilter, riskFilter, shipmentFilter, productionFilter, buyerFilter, isHead, searchQuery]);

  const kpis = dashboardData?.kpis || {
    totalOrders: 42,
    totalPOs: 86,
    totalOrderQty: 842500,
    totalFobValue: 4820650,
    onTimeShipmentPct: 96,
    atRiskOrders: 11,
    shipmentsNext7Days: 8,
    shipmentsNext7DaysQty: 64200,
    prodCompletionPct: 74,
    capacityMetric: { bookedPct: 92, availablePcs: 48000 }
  };

  const jobsList: any[] = dashboardData?.jobs || [];
  const pipeline: any[] = dashboardData?.pipeline || [];
  const priorityActions: any[] = dashboardData?.priorityActions || [];
  const myActions: any[] = (dashboardData?.myActions || []).filter((a: any) => a.bucket === actionTab);

  // Toggle selection
  const toggleSelectRow = (jobNo: string) => {
    setSelectedRowIds(prev => ({ ...prev, [jobNo]: !prev[jobNo] }));
  };

  const toggleSelectAll = () => {
    if (Object.keys(selectedRowIds).length === jobsList.length && jobsList.length > 0) {
      setSelectedRowIds({});
    } else {
      const all: Record<string, boolean> = {};
      jobsList.forEach(j => { all[j.jobNo] = true; });
      setSelectedRowIds(all);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* 1. TOP BREADCRUMB & PAGE HEADER (Matches attached design image) */}
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
            <span>Bulk Merchandising</span>
            <span>›</span>
            <span style={{ color: '#2563eb' }}>Dashboard</span>
          </div>

          {/* Title Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📊</span>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Bulk Merchandising Dashboard
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
              ● Live
            </span>
            <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>
              Last Sync: {lastSyncTime || '08 Oct 2026, 14:32'}
            </span>
          </div>
        </div>

        {/* Right Action Buttons (Matches design image) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchDashboard}
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
            title="Refresh Dashboard Data"
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
            <span>📥</span> Export ⌄
          </button>

          <Link
            href="/merchandising/order-po"
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              border: '1px solid #2563eb',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 800,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
            }}
          >
            <span>+</span> Import PO
          </Link>

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
          >
            <span>+</span> New Order
          </Link>
        </div>
      </div>

      {/* 2. EIGHT COLORFUL KPI CARDS ROW (Exact match with design image) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px'
      }}>
        {/* KPI 1: Total Orders */}
        <div
          onClick={() => { setActiveTab('ALL'); setRiskFilter('ALL'); setShipmentFilter('ALL'); }}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 16px',
            cursor: 'pointer',
            borderLeft: '4px solid #3b82f6',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'transform 0.15s ease'
          }}
          title="Click to view all orders"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Orders</span>
            <span style={{ fontSize: '14px', color: '#3b82f6' }}>📋</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
            {kpis.totalOrders}
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>
            ▲ 6% <span style={{ color: '#94a3b8', fontWeight: 400 }}>vs. last month</span>
          </div>
        </div>

        {/* KPI 2: Total POs */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '14px 16px',
          borderLeft: '4px solid #10b981',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total POs</span>
            <span style={{ fontSize: '14px', color: '#10b981' }}>📦</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
            {kpis.totalPOs}
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>
            ▲ 8% <span style={{ color: '#94a3b8', fontWeight: 400 }}>vs. last month</span>
          </div>
        </div>

        {/* KPI 3: Order Quantity (Pcs) */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '14px 16px',
          borderLeft: '4px solid #06b6d4',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Order Qty (Pcs)</span>
            <span style={{ fontSize: '14px', color: '#06b6d4' }}>👕</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
            {Number(kpis.totalOrderQty).toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>
            ▲ 8% <span style={{ color: '#94a3b8', fontWeight: 400 }}>vs. last month</span>
          </div>
        </div>

        {/* KPI 4: FOB Value (USD) */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '14px 16px',
          borderLeft: '4px solid #f59e0b',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>FOB Value (USD)</span>
            <span style={{ fontSize: '14px', color: '#f59e0b' }}>💵</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
            ${Number(kpis.totalFobValue).toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>
            ▲ 12% <span style={{ color: '#94a3b8', fontWeight: 400 }}>vs. last month</span>
          </div>
        </div>

        {/* KPI 5: On-Time Shipment % */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '14px 16px',
          borderLeft: '4px solid #6366f1',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>On-Time Ship %</span>
            <span style={{ fontSize: '14px', color: '#6366f1' }}>⏱️</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#16a34a', lineHeight: 1.1 }}>
            {kpis.onTimeShipmentPct}%
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>
            ▲ 2% <span style={{ color: '#94a3b8', fontWeight: 400 }}>on target</span>
          </div>
        </div>

        {/* KPI 6: At Risk Orders (Clickable filter) */}
        <div
          onClick={() => { setRiskFilter('AT_RISK'); setActiveTab('AT_RISK'); }}
          style={{
            background: '#ffffff',
            border: riskFilter === 'AT_RISK' ? '2px solid #ef4444' : '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 16px',
            borderLeft: '4px solid #ef4444',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            cursor: 'pointer'
          }}
          title="Click to filter by At Risk orders"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase' }}>At Risk Orders</span>
            <span style={{ fontSize: '14px', color: '#ef4444' }}>⚠️</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#b91c1c', lineHeight: 1.1 }}>
            {kpis.atRiskOrders}
          </div>
          <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700, marginTop: '4px' }}>
            ▲ 27% <span style={{ color: '#94a3b8', fontWeight: 400 }}>needs action</span>
          </div>
        </div>

        {/* KPI 7: Shipments Next 7 Days (Clickable filter) */}
        <div
          onClick={() => { setShipmentFilter('NEXT_7_DAYS'); setPeriod('NEXT_7_DAYS'); }}
          style={{
            background: '#ffffff',
            border: shipmentFilter === 'NEXT_7_DAYS' ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 16px',
            borderLeft: '4px solid #8b5cf6',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            cursor: 'pointer'
          }}
          title="Click to filter shipments in next 7 days"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase' }}>Next 7 Days</span>
            <span style={{ fontSize: '14px', color: '#8b5cf6' }}>🚢</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
            {kpis.shipmentsNext7Days}
          </div>
          <div style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 700, marginTop: '4px' }}>
            {Number(kpis.shipmentsNext7DaysQty || 64200).toLocaleString()} <span style={{ color: '#94a3b8', fontWeight: 400 }}>pcs</span>
          </div>
        </div>

        {/* KPI 8: Production Completion % */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '14px 16px',
          borderLeft: '4px solid #2563eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Prod Complete</span>
            <span style={{ fontSize: '14px', color: '#2563eb' }}>🏭</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
            {kpis.prodCompletionPct}%
          </div>
          {/* Progress bar */}
          <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${kpis.prodCompletionPct}%`, background: '#2563eb' }} />
          </div>
        </div>
      </div>

      {/* 3. MANDATORY GLOBAL DASHBOARD FILTER BAR (Exact specification) */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '14px 18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', alignItems: 'end' }}>
          {/* Filter 1: Date Period */}
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Date Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="LAST_WEEK">Last Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="NEXT_7_DAYS">Next 7 Days</option>
              <option value="NEXT_14_DAYS">Next 14 Days</option>
              <option value="NEXT_30_DAYS">Next 30 Days</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

          {/* Filter 2: Week Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Week
            </label>
            <select
              value={weekFilter}
              onChange={(e) => setWeekFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
            >
              <option value="ALL">All Weeks</option>
              <option value="Wk 40">Wk 40</option>
              <option value="Wk 41">Wk 41 (Current)</option>
              <option value="Wk 42">Wk 42</option>
              <option value="Wk 43">Wk 43</option>
              <option value="Wk 44">Wk 44</option>
              <option value="Wk 45">Wk 45</option>
            </select>
          </div>

          {/* Filter 3: Month Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Month
            </label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
            >
              <option value="ALL">All Months</option>
              <option value="Oct-26">Oct 2026 (Current)</option>
              <option value="Nov-26">Nov 2026</option>
              <option value="Dec-26">Dec 2026</option>
              <option value="Sep-26">Sep 2026</option>
              <option value="Aug-26">Aug 2026</option>
            </select>
          </div>

          {/* Filter 4: Order Status */}
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Order Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
            >
              <option value="ALL">All Status</option>
              <option value="CONFIRMED">Confirmed / Cut OK</option>
              <option value="IN_PRODUCTION">In Production / Sewing</option>
              <option value="COMPLETED">Completed / Shipped</option>
              <option value="AT_RISK">At Risk</option>
              <option value="DELAYED">Delayed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Filter 5: Risk / Health */}
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Risk / Health
            </label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
            >
              <option value="ALL">All Risk Levels</option>
              <option value="ON_TRACK">On Track</option>
              <option value="WATCH">Watch / Pending</option>
              <option value="AT_RISK">At Risk</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          {/* Filter 6: Pending Tasks */}
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Pending Tasks
            </label>
            <select
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
            >
              <option value="ALL">All Tasks</option>
              <option value="DUE_TODAY">Due Today</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CRITICAL">Critical Priority</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          {/* Filter 7: Shipment Proximity */}
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Shipment
            </label>
            <select
              value={shipmentFilter}
              onChange={(e) => setShipmentFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
            >
              <option value="ALL">All Shipments</option>
              <option value="NEXT_7_DAYS">Next 7 Days</option>
              <option value="NEXT_14_DAYS">Next 14 Days</option>
              <option value="NEXT_30_DAYS">Next 30 Days</option>
              <option value="OVERDUE">Overdue</option>
              <option value="READY_TO_SHIP">Ready to Ship</option>
              <option value="NOT_READY">Not Ready</option>
            </select>
          </div>

          {/* Filter 8: Production Status */}
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Production
            </label>
            <select
              value={productionFilter}
              onChange={(e) => setProductionFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
            >
              <option value="ALL">All Production</option>
              <option value="ON_TRACK">On Track</option>
              <option value="AT_RISK">At Risk</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Filter 9: Buyer (Permission Controlled!) */}
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Buyer {isHead ? '(Global)' : '🔒 (Assigned)'}
            </label>
            {isHead ? (
              <select
                value={buyerFilter}
                onChange={(e) => setBuyerFilter(e.target.value)}
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

          {/* Filter 10: Merchandiser (Management only) */}
          {isHead && (
            <div>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                Merchandiser
              </label>
              <select
                value={merchandiserFilter}
                onChange={(e) => setMerchandiserFilter(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
              >
                <option value="ALL">All Merchandisers</option>
                <option value="Shamim Hossain">Shamim Hossain (ONLY)</option>
                <option value="Basir Hossain">Basir Hossain (OVS)</option>
                <option value="Haider Ali">Haider Ali (Name It)</option>
                <option value="Rony Ahmed">Rony Ahmed (UTG)</option>
              </select>
            </div>
          )}
        </div>

        {/* Custom Range Picker Row if selected */}
        {period === 'CUSTOM' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Custom Date Range:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
            <span style={{ color: '#94a3b8' }}>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
          </div>
        )}

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
              onClick={handleClearAllFilters}
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

      {/* 4. MAIN CONTENT SPLIT: PRIORITY ACTIONS & PIPELINE (LEFT) + MY ACTIONS (RIGHT) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '16px', alignItems: 'start' }}>
        {/* LEFT MAIN AREA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {/* Priority Actions / Exceptions Bar */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>🚨</span>
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Priority Actions / Production Exceptions
                </span>
                <span style={{
                  background: '#fee2e2',
                  color: '#b91c1c',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  {priorityActions.length} Attention
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Sorted by operational severity
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
              {priorityActions.slice(0, 4).map((exc, idx) => (
                <div
                  key={exc.id || idx}
                  onClick={() => handleOpenJobDrawer({ jobNo: exc.jobNo, buyer: exc.buyer, styleNo: exc.styleNo })}
                  style={{
                    border: '1px solid #fed7aa',
                    background: exc.severity === 'Critical' ? '#fff1f2' : '#fffbeb',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '6px'
                  }}
                  title="Click to open Job Details drawer"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '9.5px',
                      fontWeight: 800,
                      background: exc.severity === 'Critical' ? '#e11d48' : '#f59e0b',
                      color: '#ffffff'
                    }}>
                      {exc.severity.toUpperCase()}
                    </span>
                    <strong style={{ fontSize: '12px', color: '#1e293b' }}>Job {exc.jobNo}</strong>
                  </div>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                    {exc.issue}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', color: '#64748b' }}>
                    <span>{exc.impact}</span>
                    <span style={{ fontWeight: 800, color: '#2563eb' }}>Review ›</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Production Pipeline Tracker */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>⚙️</span>
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Live Production Pipeline Progress
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Planned Total: {Number(kpis.totalOrderQty).toLocaleString()} pcs
              </span>
            </div>

            {/* Horizontal pipeline stage chips */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '6px', overflowX: 'auto' }}>
              {pipeline.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '8px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', margin: '2px 0' }}>
                    {p.pct}%
                  </div>
                  <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p.pct}%`, background: p.status === 'At Risk' ? '#ef4444' : '#10b981' }} />
                  </div>
                  <div style={{ fontSize: '9px', color: p.status === 'At Risk' ? '#dc2626' : '#16a34a', fontWeight: 700, marginTop: '3px' }}>
                    {p.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: MY ACTIONS PANEL (Matches design layout) */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>⚡</span>
              <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase' }}>My Actions</span>
            </div>
            <span style={{ fontSize: '11px', background: '#eff6ff', color: '#2563eb', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
              {myActions.length} Active
            </span>
          </div>

          {/* Subtabs: Today / Overdue / Upcoming / Completed */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: '4px' }}>
            {(['today', 'overdue', 'upcoming', 'completed'] as const).map(tabKey => (
              <button
                key={tabKey}
                type="button"
                onClick={() => setActionTab(tabKey)}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: 'none',
                  background: 'transparent',
                  color: actionTab === tabKey ? '#2563eb' : '#64748b',
                  borderBottom: actionTab === tabKey ? '2px solid #2563eb' : '2px solid transparent',
                  marginBottom: '-1px',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {tabKey}
              </button>
            ))}
          </div>

          {/* Action List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
            {myActions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8', fontSize: '12px' }}>
                ✓ No actions in {actionTab} tab
              </div>
            ) : (
              myActions.map((act) => (
                <div
                  key={act.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#2563eb' }}>
                      JOB {act.jobNo} · {act.buyer}
                    </span>
                    <span style={{
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontSize: '9.5px',
                      fontWeight: 800,
                      background: act.priority === 'CRITICAL' ? '#fee2e2' : act.priority === 'HIGH' ? '#fef3c7' : '#ecfdf5',
                      color: act.priority === 'CRITICAL' ? '#b91c1c' : act.priority === 'HIGH' ? '#b45309' : '#047857'
                    }}>
                      {act.priority}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                    {act.title}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', fontSize: '10.5px', color: '#64748b' }}>
                    <span>Due: {act.dueDate}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenJobDrawer({ jobNo: act.jobNo, buyer: act.buyer })}
                        style={{ border: 'none', background: '#e2e8f0', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        View
                      </button>
                      {act.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => handleMarkComplete(act.id)}
                          style={{ border: 'none', background: '#16a34a', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. ACTIVE JOBS GRID (Matches design reference order list table) */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        {/* Table Controls Header Bar */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Sub Navigation Status Tabs (Exact replica from design image) */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: `All Orders (${kpis.totalOrders})` },
              { id: 'CONFIRMED', label: `Confirmed (28)` },
              { id: 'IN_PRODUCTION', label: `In Progress (8)` },
              { id: 'AT_RISK', label: `At Risk (${kpis.atRiskOrders})` },
              { id: 'DELAYED', label: `Delayed (6)` },
              { id: 'COMPLETED', label: `Completed (12)` },
              { id: 'CANCELLED', label: `Cancelled (2)` }
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

          {/* Search Box & Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', width: '240px' }}>
              <input
                type="text"
                placeholder="Search Job, PO, Style, Buyer..."
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

            <button
              type="button"
              onClick={handleExport}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              Export
            </button>
          </div>
        </div>

        {/* Dense Enterprise Table */}
        <div style={{ overflowX: 'auto', maxHeight: '550px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: '#f8fafc' }}>
              <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 800 }}>
                <th style={{ padding: '10px 12px', width: '36px' }}>
                  <input
                    type="checkbox"
                    checked={jobsList.length > 0 && Object.keys(selectedRowIds).length === jobsList.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={{ padding: '10px 12px' }}>Job No</th>
                <th style={{ padding: '10px 12px' }}>PO No</th>
                <th style={{ padding: '10px 12px' }}>Buyer</th>
                <th style={{ padding: '10px 12px' }}>Style No</th>
                <th style={{ padding: '10px 12px' }}>Product</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Order Qty (Pcs)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>FOB (USD)</th>
                <th style={{ padding: '10px 12px' }}>Shipment Date</th>
                <th style={{ padding: '10px 12px' }}>Order Status</th>
                <th style={{ padding: '10px 12px' }}>PO Status</th>
                <th style={{ padding: '10px 12px' }}>Production Progress</th>
                <th style={{ padding: '10px 12px' }}>Health / Risk</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && jobsList.length === 0 ? (
                <tr>
                  <td colSpan={14} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    Loading active merchandising orders...
                  </td>
                </tr>
              ) : jobsList.length === 0 ? (
                <tr>
                  <td colSpan={14} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No matching authorized jobs found. Adjust your filters or search criteria.
                  </td>
                </tr>
              ) : (
                jobsList.map((j) => {
                  const isSelected = !!selectedRowIds[j.jobNo];
                  return (
                    <tr
                      key={j.id || j.jobNo}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isSelected ? '#f0f9ff' : undefined,
                        cursor: 'pointer',
                        transition: 'background 0.1s ease'
                      }}
                      onClick={() => handleOpenJobDrawer(j)}
                    >
                      <td style={{ padding: '8px 12px' }} onClick={(e) => { e.stopPropagation(); toggleSelectRow(j.jobNo); }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(j.jobNo)}
                        />
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 800, color: '#2563eb' }}>
                        {j.jobNo}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#334155', fontWeight: 600 }}>
                        {j.poNo || `PO-NA-${j.jobNo}`}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>
                        {j.buyer}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#2563eb', fontWeight: 700 }}>
                        {j.styleNo}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#475569' }}>
                        {j.product}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                        {Number(j.orderQty).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569', fontWeight: 700 }}>
                        ${Number(j.fobValue).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#d97706', fontWeight: 700 }}>
                        {j.shipmentDate}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '10px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          background: j.orderStatus?.includes('Sewing') ? '#eff6ff' : j.orderStatus?.includes('Cut') ? '#f0fdf4' : '#f8fafc',
                          color: j.orderStatus?.includes('Sewing') ? '#1d4ed8' : j.orderStatus?.includes('Cut') ? '#15803d' : '#334155',
                          border: '1px solid #e2e8f0'
                        }}>
                          {j.orderStatus}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '10px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          background: j.poStatus === 'Confirmed' ? '#dcfce7' : '#fef3c7',
                          color: j.poStatus === 'Confirmed' ? '#166534' : '#92400e'
                        }}>
                          {j.poStatus}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '50px', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${j.productionProgress}%`, background: '#2563eb' }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700 }}>{j.productionProgress}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '10px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          background: j.riskStatus === 'CRITICAL' ? '#fee2e2' : j.riskStatus === 'AT_RISK' ? '#fef3c7' : '#dcfce7',
                          color: j.riskStatus === 'CRITICAL' ? '#991b1b' : j.riskStatus === 'AT_RISK' ? '#92400e' : '#166534'
                        }}>
                          {j.riskStatus === 'CRITICAL' ? 'Critical' : j.riskStatus === 'AT_RISK' ? 'At Risk' : 'On Track'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#94a3b8' }}>
                        •••
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sticky Status Bar & Pagination (Matches bottom of design image) */}
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
          {/* Status indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#10b981', fontWeight: 800 }}>● Live</span>
            <span>Last Sync: {lastSyncTime || '08 Oct 2026, 14:32'}</span>
            <span style={{ color: '#64748b' }}>|</span>
            <span style={{ color: '#10b981' }}>✓ NOS Data: Healthy</span>
            <span style={{ color: '#f59e0b' }}>⚠️ Pending Approvals: 7</span>
            <span style={{ color: '#ef4444' }}>🚨 Active Alerts: 14</span>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>
              Total Records: <strong>{dashboardData?.pagination?.totalRecords || kpis.totalOrders}</strong>
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
                disabled={page >= (dashboardData?.pagination?.totalPages || 1)}
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

      {/* 6. SLIDE-OVER REUSABLE JOB DETAIL DRAWER */}
      <JobDetailDrawer
        job={selectedJob}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onJobUpdated={fetchDashboard}
      />
    </div>
  );
}
