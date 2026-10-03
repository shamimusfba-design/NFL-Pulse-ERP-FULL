'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Shell from '../../components/Shell';
import demo2000DataRaw from '../../data/demo-2000-master.json';
import { displayJobNo, formatFloorLine } from '../../lib/display';
import { SvgDonut, SvgBarChart, SvgTrendChart } from '../../components/OverviewCharts';

function n(v: any) {
  return Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function d2(dateStr: any) {
  if (!dateStr || dateStr === '—') return '—';
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const m = d.toLocaleString('en-US', { month: 'short' });
      const yr = String(d.getFullYear()).slice(-2);
      return `${day}-${m}-${yr}`;
    }
  }
  return s.replace(/20(\d{2})/g, '$1');
}

function getWeekNumber(dateStr: any) {
  if (!dateStr) return 'W33';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'W33';
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `W${weekNum}`;
}

function JobsListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sectionParam = searchParams.get('section') || '';
  const cardIndexParam = searchParams.get('card');
  const typeParam = searchParams.get('type') || '';
  const titleParam = searchParams.get('title') || '';

  const initialMasterJobs = (demo2000DataRaw as any)?.jobs || [];

  // Map all master jobs with clean formatted fields
  const allRows = useMemo(() => {
    return initialMasterJobs.map((j: any) => {
      const factory = j.lineAllocation?.factory || 'NFL';
      const rawFloor = j.lineAllocation?.floor || 'Floor 1';
      let floorLabel = `${factory} 1`;
      if (rawFloor.includes('2') || rawFloor.includes('02')) floorLabel = `${factory} 2`;
      else if (rawFloor.includes('3') || rawFloor.includes('03')) floorLabel = `${factory} 3`;
      else floorLabel = `${factory} 1`;

      const floorLine = formatFloorLine(factory, rawFloor, j.lineAllocation?.line);
      const floorLinePrefix = floorLine.split('-')[0].trim();

      const exDate = j.dates?.exFactory || '05-Aug-2026';
      const shipmentWeek = getWeekNumber(exDate);
      let shipmentMonth = 'Aug-26';
      if (exDate.includes('-')) {
        const parts = exDate.split('-');
        if (parts.length === 3) shipmentMonth = `${parts[1]}-${parts[2].slice(-2)}`;
      }

      const isCritical = j.riskStatus === 'HIGH' || j.riskStatus === 'CRITICAL' || j.presentStatus?.includes('Hold');
      const isShipmentRisk = (j.shipment?.shipBalance && j.shipment.shipBalance > 0) || j.presentStatus?.includes('Preparing') || j.presentStatus?.includes('Not Ready');
      const isSewingRunning = j.sewing?.status === 'RUNNING' || j.overallStage === 'Sewing';

      let sectionStatus = 'In Progress';
      if (sectionParam === 'central-planning') {
        sectionStatus = j.tnaStatus || 'Approved';
      } else if (sectionParam === 'garment-production') {
        sectionStatus = isSewingRunning ? 'Running' : (j.sewing?.achievementPct >= 95 ? 'Completed' : 'Planned');
      } else if (sectionParam === 'quality-stores') {
        sectionStatus = isCritical ? 'Hold' : 'Released';
      } else {
        sectionStatus = isCritical ? 'Attention' : 'OK';
      }

      return {
        orderId: j.id,
        jobNo: j.jobNo,
        buyer: j.buyer,
        buyerCode: j.buyer,
        styleNo: j.styleNo,
        itemDescription: j.itemDescription,
        orderQty: j.orderQty,
        factory,
        floor: floorLabel,
        floorLine,
        floorLinePrefix,
        merchandiser: j.merchandiser || 'Md. Jahidul Islam',
        shipmentMonth,
        shipmentWeek,
        exFactoryDate: exDate,
        presentStatus: j.presentStatus || 'Confirmed',
        sectionStatus,
        isCritical,
        isShipmentRisk,
        isSewingRunning,
        rawJob: j
      };
    });
  }, [initialMasterJobs, sectionParam]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [weekFilter, setWeekFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [floorUnitFilter, setFloorUnitFilter] = useState('ALL');
  const [merchFilter, setMerchFilter] = useState('ALL');
  const [presentStatusFilter, setPresentStatusFilter] = useState('ALL');
  const [buyerFilter, setBuyerFilter] = useState('ALL');
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(
    cardIndexParam !== null && cardIndexParam !== undefined ? parseInt(cardIndexParam, 10) : null
  );

  React.useEffect(() => {
    if (cardIndexParam !== null && cardIndexParam !== undefined) {
      setActiveCardIndex(parseInt(cardIndexParam, 10));
    }
  }, [cardIndexParam]);

  // Pagination state: default 15
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Dynamic filtering
  const filteredRows = useMemo(() => {
    return allRows.filter((r: any) => {
      // 1. Card/Type Filter from URL
      if (typeParam === 'CRITICAL' && !r.isCritical) return false;
      if (typeParam === 'RISK' && !r.isShipmentRisk) return false;
      if (typeParam === 'SEWING' && !r.isSewingRunning) return false;
      if (typeParam.startsWith('BUYER:') && r.buyer !== typeParam.replace('BUYER:', '')) return false;

      // Card index filter
      if (activeCardIndex !== null) {
        if (activeCardIndex === 1) {
          if (!/released|completed|shipped|approved|ok/i.test(r.sectionStatus)) return false;
        } else if (activeCardIndex === 2) {
          if (/complete|shipped/i.test(r.sectionStatus)) return false;
        } else if (activeCardIndex === 3) {
          if (!/hold|attention|late|fail|preparing/i.test(r.sectionStatus)) return false;
        }
      }

      // 2. Dropdown Filters
      if (weekFilter !== 'ALL' && r.shipmentWeek !== weekFilter) return false;
      if (monthFilter !== 'ALL' && weekFilter === 'ALL' && r.shipmentMonth !== monthFilter) return false;
      if (merchFilter !== 'ALL' && r.merchandiser !== merchFilter) return false;
      if (floorUnitFilter !== 'ALL' && !r.floorLine.startsWith(floorUnitFilter) && r.floor !== floorUnitFilter) return false;
      if (presentStatusFilter !== 'ALL' && r.presentStatus !== presentStatusFilter) return false;
      if (buyerFilter !== 'ALL' && r.buyer !== buyerFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = `${r.jobNo} ${r.buyer} ${r.styleNo} ${r.itemDescription || ''} ${r.merchandiser || ''} ${r.floorLine || ''}`.toLowerCase();
        if (!match.includes(q)) return false;
      }
      return true;
    });
  }, [allRows, typeParam, activeCardIndex, weekFilter, monthFilter, merchFilter, floorUnitFilter, presentStatusFilter, buyerFilter, searchQuery]);

  // Options for dropdowns
  const weekOptions = useMemo(() => (Array.from(new Set(allRows.map((r: any) => r.shipmentWeek))).filter(Boolean) as string[]).sort(), [allRows]);
  const monthOptions = useMemo(() => (Array.from(new Set(allRows.map((r: any) => r.shipmentMonth))).filter(Boolean) as string[]).sort(), [allRows]);
  const merchOptions = useMemo(() => (Array.from(new Set(allRows.map((r: any) => r.merchandiser))).filter(Boolean) as string[]).sort(), [allRows]);
  const presentStatusOptions = useMemo(() => (Array.from(new Set(allRows.map((r: any) => r.presentStatus))).filter(Boolean) as string[]).sort(), [allRows]);
  const buyerOptions = useMemo(() => (Array.from(new Set(allRows.map((r: any) => r.buyer))).filter(Boolean) as string[]).sort(), [allRows]);
  const floorUnitOptions = ['NCL1', 'NCL2', 'NCL3', 'NFL1', 'NFL2', 'NFL3'];

  // Summary Metrics
  const totalVolume = useMemo(() => filteredRows.reduce((s: number, r: any) => s + Number(r.orderQty || 0), 0), [filteredRows]);
  const buyersCount = useMemo(() => new Set(filteredRows.map((r: any) => r.buyer)).size, [filteredRows]);
  const linesCount = useMemo(() => new Set(filteredRows.map((r: any) => r.floorLine)).size, [filteredRows]);

  // Chart data calculations driven by active filter
  const donutData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of filteredRows) {
      const st = r.sectionStatus || 'In Progress';
      counts.set(st, (counts.get(st) || 0) + 1);
    }
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    return [...counts.entries()].slice(0, 4).map(([label, value], i) => ({
      label,
      value,
      color: colors[i % colors.length]
    }));
  }, [filteredRows]);

  const barData = useMemo(() => {
    const isSingleBuyer = buyerFilter !== 'ALL';
    const groupMap = new Map<string, { plan: number; actual: number }>();
    for (const r of filteredRows) {
      const key = isSingleBuyer ? (r.styleNo || r.floorLine) : (r.buyer || 'Unknown');
      const cur = groupMap.get(key) || { plan: 0, actual: 0 };
      cur.plan += Number(r.orderQty || 0);
      cur.actual += Number(r.rawJob?.sewing?.sewingActualQty || r.rawJob?.shipment?.shipQty || r.orderQty);
      groupMap.set(key, cur);
    }
    return [...groupMap.entries()]
      .sort((a, b) => b[1].plan - a[1].plan)
      .slice(0, 5)
      .map(([label, val]) => ({
        label,
        value1: val.plan,
        value2: val.actual,
        color1: '#2563eb',
        color2: '#10b981'
      }));
  }, [filteredRows, buyerFilter]);

  const trendData = useMemo(() => {
    const weekMap = new Map<string, number>();
    for (const r of filteredRows) {
      const w = r.shipmentWeek || 'W33';
      weekMap.set(w, (weekMap.get(w) || 0) + Number(r.orderQty || 0));
    }
    const sortedWeeks = Array.from(weekMap.keys()).sort();
    if (!sortedWeeks.length) return [{ label: 'W31', value: 80 }];
    const maxVal = Math.max(1, ...Array.from(weekMap.values()));
    return sortedWeeks.slice(0, 7).map(w => ({
      label: w,
      value: Math.round(((weekMap.get(w) || 0) / maxVal) * 100)
    }));
  }, [filteredRows]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  function exportCsv() {
    const headers = ['Job No', 'Buyer', 'Style No', 'Item Description', 'Order Qty', 'Floor/Line', 'Merchandiser', 'Week', 'Ship Month', 'Present Status', 'Section Status'];
    const csvContent = [
      headers.join(','),
      ...filteredRows.map((r: any) => [
        `"${r.jobNo}"`,
        `"${r.buyer}"`,
        `"${r.styleNo}"`,
        `"${(r.itemDescription || '').replace(/"/g, '""')}"`,
        r.orderQty,
        `"${r.floorLine}"`,
        `"${r.merchandiser}"`,
        `"${r.shipmentWeek}"`,
        `"${r.shipmentMonth}"`,
        `"${r.presentStatus}"`,
        `"${r.sectionStatus}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `filtered_jobs_register.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const backLink = sectionParam ? `/modules/${sectionParam}` : '/';
  const backLabel = sectionParam ? `← Back to ${sectionParam.replace(/-/g, ' ').toUpperCase()}` : '← Back to Management Overview';
  const displayTitle = titleParam || (sectionParam ? `${sectionParam.replace(/-/g, ' ').toUpperCase()} Filtered Jobs` : 'Master Job Register');

  return (
    <Shell
      title={displayTitle}
      eyebrow={`Dedicated Filtered Job Register · ${filteredRows.length.toLocaleString()} matching orders`}
    >
      {/* 1. TOP BREADCRUMB & SUMMARY BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => router.push(backLink)}
            className="reg-btn-compact"
            style={{ height: '32px', padding: '0 12px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {backLabel}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <Link href="/" style={{ color: '#2563eb', textDecoration: 'none' }}>Overview</Link>
            <span>/</span>
            <strong style={{ color: '#0f172a' }}>{displayTitle}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '6px 12px' }}
          >
            🖨️ Print List
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="btn btn-primary"
            style={{ fontSize: '11px', padding: '6px 12px' }}
          >
            📥 Export CSV ({filteredRows.length})
          </button>
        </div>
      </div>

      {/* 2. STATS STRIP (Bold & Clickable) */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', marginBottom: '14px' }}>
        <div
          className="panel"
          style={{ padding: '14px 18px', cursor: 'pointer', border: '1px solid #cbd5e1', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', transition: 'all .15s ease' }}
          onClick={() => {
            setWeekFilter('ALL'); setMonthFilter('ALL'); setFloorUnitFilter('ALL');
            setMerchFilter('ALL'); setPresentStatusFilter('ALL'); setBuyerFilter('ALL');
            setSearchQuery(''); setActiveCardIndex(null); setCurrentPage(1);
          }}
          title="Click to reset filters and view all jobs"
        >
          <span style={{ fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>FILTERED JOBS</span>
          <strong style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', display: 'block', marginTop: '2px' }}>{filteredRows.length.toLocaleString()}</strong>
          <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 800, display: 'block', marginTop: '3px' }}>✓ Click to show all</span>
        </div>

        <div
          className="panel"
          style={{ padding: '14px 18px', border: '1px solid #93c5fd', background: '#f8fafc', boxShadow: '0 2px 6px rgba(37,99,235,0.08)' }}
          title="Total Order Volume in Pieces"
        >
          <span style={{ fontSize: '11px', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>TOTAL ORDER VOLUME</span>
          <strong style={{ fontSize: '26px', fontWeight: 900, color: '#2563eb', display: 'block', marginTop: '2px' }}>{n(totalVolume)} <span style={{ fontSize: '13px', fontWeight: 700 }}>pcs</span></strong>
          <span style={{ fontSize: '11px', color: '#475569', fontWeight: 700, display: 'block', marginTop: '3px' }}>Garment total</span>
        </div>

        <div
          className="panel"
          style={{ padding: '14px 18px', border: '1px solid #cbd5e1', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
          title="Assigned Floor & Lines count"
        >
          <span style={{ fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>ASSIGNED FLOOR / LINES</span>
          <strong style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', display: 'block', marginTop: '2px' }}>{linesCount} <span style={{ fontSize: '13px', fontWeight: 700 }}>lines</span></strong>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block', marginTop: '3px' }}>Across NFL & NCL</span>
        </div>

        <div
          className="panel"
          style={{ padding: '14px 18px', border: '1px solid #cbd5e1', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
          title="Active export buyers"
        >
          <span style={{ fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>ACTIVE BUYERS</span>
          <strong style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', display: 'block', marginTop: '2px' }}>{buyersCount} <span style={{ fontSize: '13px', fontWeight: 700 }}>brands</span></strong>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block', marginTop: '3px' }}>Export accounts</span>
        </div>
      </section>

      {/* 3. MULTI-GRAPH ANALYTICS (Dynamically updates with filters) */}
      <section className="section-graphs-row" style={{ marginBottom: '14px' }}>
        <div className="chart-card">
          <div className="chart-card-head">
            <div>
              <div className="chart-card-title">Status Distribution</div>
              <div className="chart-card-sub">Active job mix with %</div>
            </div>
            <span className="status-pill ok">Live</span>
          </div>
          <SvgDonut data={donutData} />
        </div>

        <div className="chart-card">
          <div className="chart-card-head">
            <div>
              <div className="chart-card-title">Volume by Key Buyer</div>
              <div className="chart-card-sub">Order vs Produced (pcs)</div>
            </div>
            <span className="status-pill" style={{ background: '#ecfdf5', color: '#047857' }}>Volume</span>
          </div>
          <SvgBarChart data={barData} />
        </div>

        <div className="chart-card">
          <div className="chart-card-head">
            <div>
              <div className="chart-card-title">Weekly Achievement Trend</div>
              <div className="chart-card-sub">Trajectory with exact %</div>
            </div>
            <span className="status-pill" style={{ background: '#faf5ff', color: '#7e22ce' }}>Trend</span>
          </div>
          <SvgTrendChart data={trendData} />
        </div>
      </section>

      {/* 4. OPERATIONAL REGISTER TABLE WITH FROZEN SCROLLBAR */}
      <section className="operational-register" style={{ marginTop: 0 }}>
        {/* Toolbar with Form for instant Enter key execution */}
        <form
          className="register-toolbar"
          onSubmit={e => {
            e.preventDefault();
            setCurrentPage(1);
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Job Register</strong>
            <span className="status-pill ok" style={{ fontWeight: 800 }}>{filteredRows.length.toLocaleString()} Jobs</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search Job, Buyer, Style... (Enter ⏎)"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setCurrentPage(1);
                  (e.target as HTMLElement).blur();
                }
              }}
              className="reg-search-compact"
              style={{ fontWeight: 600 }}
            />

            {/* Shipment Week Filter */}
            <select
              value={weekFilter}
              onChange={e => { setWeekFilter(e.target.value); setCurrentPage(1); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setCurrentPage(1); } }}
              className="reg-select-compact"
              style={{ fontWeight: 700 }}
              title="Shipment Week"
            >
              <option value="ALL">📅 Week: All</option>
              {weekOptions.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>

            {/* Shipment Month Filter */}
            <select
              value={monthFilter}
              onChange={e => { setMonthFilter(e.target.value); setCurrentPage(1); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setCurrentPage(1); } }}
              className="reg-select-compact"
              style={{ fontWeight: 700 }}
              title="Shipment Month"
            >
              <option value="ALL">🗓️ Month: All</option>
              {monthOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Floor / Line Filter (NCL1..3, NFL1..3) */}
            <select
              value={floorUnitFilter}
              onChange={e => { setFloorUnitFilter(e.target.value); setCurrentPage(1); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setCurrentPage(1); } }}
              className="reg-select-compact"
              style={{ fontWeight: 700 }}
              title="Floor/Line"
            >
              <option value="ALL">🏢 Floor/Line: All</option>
              {floorUnitOptions.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

            {/* Merchandiser Filter */}
            <select
              value={merchFilter}
              onChange={e => { setMerchFilter(e.target.value); setCurrentPage(1); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setCurrentPage(1); } }}
              className="reg-select-compact"
              style={{ fontWeight: 700 }}
              title="Merchandiser"
            >
              <option value="ALL">👤 Merch: All</option>
              {merchOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Present Status Filter */}
            <select
              value={presentStatusFilter}
              onChange={e => { setPresentStatusFilter(e.target.value); setCurrentPage(1); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setCurrentPage(1); } }}
              className="reg-select-compact"
              style={{ fontWeight: 700 }}
              title="Present Status"
            >
              <option value="ALL">⚡ Status: All</option>
              {presentStatusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Buyer Filter */}
            <select
              value={buyerFilter}
              onChange={e => { setBuyerFilter(e.target.value); setCurrentPage(1); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setCurrentPage(1); } }}
              className="reg-select-compact"
              style={{ fontWeight: 700 }}
              title="Buyer"
            >
              <option value="ALL">🏷️ Buyer: All</option>
              {buyerOptions.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Permanent Apply Button */}
            <button
              type="submit"
              className="reg-btn-compact"
              style={{ background: '#2563eb', color: '#fff', borderColor: '#2563eb', fontWeight: 800, minWidth: '95px' }}
              title="Apply selected filters (or press Enter)"
            >
              Apply Filter ⏎
            </button>

            {/* Reset Filters Button */}
            {(weekFilter !== 'ALL' || monthFilter !== 'ALL' || floorUnitFilter !== 'ALL' || merchFilter !== 'ALL' || presentStatusFilter !== 'ALL' || buyerFilter !== 'ALL' || searchQuery !== '' || activeCardIndex !== null) && (
              <button
                type="button"
                onClick={() => {
                  setWeekFilter('ALL');
                  setMonthFilter('ALL');
                  setFloorUnitFilter('ALL');
                  setMerchFilter('ALL');
                  setPresentStatusFilter('ALL');
                  setBuyerFilter('ALL');
                  setSearchQuery('');
                  setActiveCardIndex(null);
                  setCurrentPage(1);
                }}
                className="reg-btn-compact"
                style={{ background: '#fff1f2', color: '#be123c', borderColor: '#fecdd3', fontWeight: 800 }}
                title="Reset all filters"
              >
                ✕ Reset
              </button>
            )}

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={exportCsv}
              className="reg-btn-compact"
              title="Export CSV"
            >
              <span>📥</span> Export
            </button>
          </div>
        </form>

        {/* SUMMARY PANEL FOR CURRENTLY FILTERED JOBS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '12px',
          padding: '12px 18px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900 }}>
              📦
            </div>
            <div>
              <span style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', fontWeight: 800, display: 'block' }}>
                Total Order Quantity
              </span>
              <strong style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                {n(totalVolume)} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>pcs</span>
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900 }}>
              🏷️
            </div>
            <div>
              <span style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', fontWeight: 800, display: 'block' }}>
                Active Buyers Count
              </span>
              <strong style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                {buyersCount} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>accounts</span>
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900 }}>
              🏭
            </div>
            <div>
              <span style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', fontWeight: 800, display: 'block' }}>
                Total Lines Involved
              </span>
              <strong style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                {linesCount} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>lines</span>
              </strong>
            </div>
          </div>
        </div>

        {/* Data Table with Frozen Scrollbar Attribute */}
        <div className="register-table-wrap" data-sticky-horizontal-scroll="true">
          <table className="register-table">
            <thead>
              <tr>
                <th>Job No</th>
                <th>Buyer</th>
                <th>Style & Item</th>
                <th style={{ textAlign: 'right' }}>Order Qty</th>
                <th>Floor/Line</th>
                <th>Merchandiser</th>
                <th>Week</th>
                <th>Ex-Factory</th>
                <th>Present Status</th>
                <th style={{ textAlign: 'center' }}>Section Status</th>
                <th style={{ textAlign: 'center' }}>360 ভিউ</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r: any, idx: number) => {
                const statusCls = /passed|released|shipped|ok|completed/i.test(r.sectionStatus)
                  ? 'ok'
                  : /hold|attention|fail|late/i.test(r.sectionStatus)
                  ? 'attention'
                  : 'running';

                const displayJob = String(displayJobNo(r.jobNo, r.buyerCode || r.buyer)).replace(/\s+(\d)(st|nd|rd|th)/i, ' ($1$2)');
                const jobUrl = `/jobs/${encodeURIComponent(r.jobNo)}`;

                return (
                  <tr
                    key={r.orderId}
                    style={{ background: idx % 2 === 0 ? '#fff' : '#fcfdfe', cursor: 'pointer' }}
                    onClick={() => router.push(jobUrl)}
                    title={`Click to open 360 profile for Job ${r.jobNo}`}
                  >
                    <td style={{ whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                      <Link href={jobUrl} className="job-link">
                        {displayJob}
                      </Link>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: '#334155' }}>
                      {r.buyer}
                    </td>
                    <td style={{ maxWidth: '220px', minWidth: '150px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.25' }} title={r.styleNo}>
                        {r.styleNo}
                      </div>
                      <div style={{ fontSize: '9.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2' }} title={r.itemDescription}>
                        {r.itemDescription || '—'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, color: '#0f172a' }}>
                      {n(r.orderQty)} <span style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: 400 }}>pcs</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 500, color: '#1e40af' }}>
                      {r.floorLine}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: '#475569' }}>
                      {r.merchandiser}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: '#475569', fontWeight: 600 }}>
                      {r.shipmentWeek}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: '#0f172a' }}>
                      {d2(r.exFactoryDate)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="register-status-badge neutral">{r.presentStatus}</span>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span className={`register-status-badge ${statusCls}`}>
                        {r.sectionStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                      <Link
                        href={jobUrl}
                        className="btn btn-primary"
                        style={{ padding: '3px 9px', fontSize: '11px', fontWeight: 800, borderRadius: '5px', whiteSpace: 'nowrap', textDecoration: 'none' }}
                      >
                        360 ভিউ ↗
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>🔍</div>
                    <div style={{ fontWeight: 700, color: '#475569' }}>No records found matching your filters</div>
                    <button
                      type="button"
                      onClick={() => {
                        setWeekFilter('ALL'); setMonthFilter('ALL'); setFloorUnitFilter('ALL');
                        setMerchFilter('ALL'); setPresentStatusFilter('ALL'); setBuyerFilter('ALL');
                        setSearchQuery(''); setActiveCardIndex(null); setCurrentPage(1);
                      }}
                      style={{ marginTop: '8px', border: 0, background: 'transparent', color: '#2563eb', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
                    >
                      Reset all filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Working Pagination Bar with 10, 15, 20, 25, 50, 100 buttons */}
        <div className="register-pagination">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>
              Showing <strong>{(currentPage - 1) * pageSize + (filteredRows.length > 0 ? 1 : 0)}</strong> to <strong>{Math.min(currentPage * pageSize, filteredRows.length)}</strong> of <strong>{filteredRows.length.toLocaleString()}</strong> jobs
            </span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Page size:</span>
              {[10, 15, 20, 25, 50, 100].map(sz => (
                <button
                  type="button"
                  key={sz}
                  onClick={(e) => {
                    e.preventDefault();
                    setPageSize(sz);
                    setCurrentPage(1);
                  }}
                  className={`size-pill-btn ${pageSize === sz ? 'active' : ''}`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="reg-page-btn"
              title="First Page"
            >
              ««
            </button>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="reg-page-btn"
              title="Previous Page"
            >
              « Prev
            </button>
            <span style={{ fontSize: '11px', padding: '0 6px', fontWeight: 750, color: '#0f172a' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="reg-page-btn"
              title="Next Page"
            >
              Next »
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="reg-page-btn"
              title="Last Page"
            >
              »»
            </button>
          </div>
        </div>
      </section>
    </Shell>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading Job Register...</div>}>
      <JobsListContent />
    </Suspense>
  );
}
