'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Shell from '../../components/Shell';
import demo2000DataRaw from '../../data/demo-2000-master.json';
import { displayJobNo, formatFloorLine, matchesJobSearch } from '../../lib/display';
import { SvgDonut, SvgBarChart, SvgTrendChart } from '../../components/OverviewCharts';
import { api } from '../../lib/api';

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
  const qParam = searchParams.get('q') || searchParams.get('jobNo') || '';
  const myJobsParam = searchParams.get('myJobs') === 'true';

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myJobsOnly, setMyJobsOnly] = useState<boolean>(myJobsParam);

  const initialMasterJobs = (demo2000DataRaw as any)?.jobs || [];
  const [liveJobs, setLiveJobs] = useState<any[]>(initialMasterJobs);
  const tabParam = searchParams.get('tab') || 'all';
  const [activeDivisionTab, setActiveDivisionTab] = useState<'all' | 'preproduction'>(tabParam === 'preproduction' ? 'preproduction' : 'all');
  const [stageActionMsg, setStageActionMsg] = useState('');
  const [busyJobNo, setBusyJobNo] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nfl_user');
      if (stored) {
        const u = JSON.parse(stored);
        setCurrentUser(u);
        if (u.role === 'MERCHANDISER' || u.name?.includes('Imran') || myJobsParam) {
          setMyJobsOnly(true);
        }
      }
    } catch {}
  }, [myJobsParam]);

  const refreshJobs = () => {
    api('/jobs')
      .then((res) => {
        if (res?.jobs && Array.isArray(res.jobs)) {
          setLiveJobs(res.jobs);
        }
      })
      .catch(() => {});
  };

  React.useEffect(() => {
    refreshJobs();
  }, []);

  // Filter jobs for Pre-Production Stage Division
  const preProdJobs = useMemo(() => {
    return liveJobs.filter((j: any) => {
      const stage = String(j.overallStage || '').toLowerCase();
      const ps = String(j.presentStatus || '').toLowerCase();
      return (
        j.isNewlyImported ||
        stage.includes('pre-production') ||
        stage.includes('t&a') ||
        ps.includes('imported') ||
        ps.includes('pending') ||
        ps.includes('cut ok') ||
        !j.fabric?.fabricReceivedKg
      );
    });
  }, [liveJobs]);

  const pendingFosCount = useMemo(() => {
    return preProdJobs.filter((j: any) => {
      const wf = j.workflow;
      if (wf) return wf.fabricOrderSheet?.status !== 'PLANNING_APPROVED' && wf.fabricOrderSheet?.status !== 'PREPARED_OK';
      return j.isNewlyImported || !j.fabric?.fabricReceivedKg;
    }).length;
  }, [preProdJobs]);

  const pendingTnaCount = useMemo(() => {
    return preProdJobs.filter((j: any) => {
      const wf = j.workflow;
      if (wf) return wf.tna?.status !== 'PLANNING_APPROVED' && wf.tna?.status !== 'PREPARED_OK';
      return j.isNewlyImported || !j.dates?.tnaPlan;
    }).length;
  }, [preProdJobs]);

  const pendingLinePlanCount = useMemo(() => {
    return preProdJobs.filter((j: any) => {
      const wf = j.workflow;
      if (wf) return !wf.sewingPlanning?.allocatedLine;
      return j.isNewlyImported || !j.lineAllocation?.line || j.lineAllocation?.line.toLowerCase().includes('pending');
    }).length;
  }, [preProdJobs]);

  // Quick Action Handler for Pre-Production Stages
  const handleStageAction = async (jobNo: string, action: string, payload: any = {}) => {
    setBusyJobNo(jobNo);
    setStageActionMsg('');
    try {
      await api(`/jobs/${jobNo}/workflow`, {
        method: 'POST',
        body: JSON.stringify({ action, ...payload })
      });
      setStageActionMsg(`✓ Stage updated for Job #${jobNo}!`);
      refreshJobs();
    } catch (err: any) {
      setStageActionMsg(`❌ Failed: ${err.message || 'Server error'}`);
    } finally {
      setBusyJobNo(null);
    }
  };

  // Map all master jobs with clean formatted fields (putting newly imported jobs at the VERY TOP)
  const allRows = useMemo(() => {
    const sorted = [...liveJobs].sort((a: any, b: any) => {
      if (a.isNewlyImported && !b.isNewlyImported) return -1;
      if (!a.isNewlyImported && b.isNewlyImported) return 1;
      return 0;
    });

    return sorted.map((j: any) => {
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
      if (j.isNewlyImported) {
        sectionStatus = 'New PO Import';
      } else if (sectionParam === 'central-planning') {
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
  }, [liveJobs, sectionParam]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState(qParam);
  const [weekFilter, setWeekFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [floorUnitFilter, setFloorUnitFilter] = useState('ALL');
  const [merchFilter, setMerchFilter] = useState('ALL');
  const [presentStatusFilter, setPresentStatusFilter] = useState('ALL');
  const [buyerFilter, setBuyerFilter] = useState('ALL');
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(
    cardIndexParam !== null && cardIndexParam !== undefined ? parseInt(cardIndexParam, 10) : null
  );

  // Pre-production filtered jobs based on search query
  const filteredPreProdJobs = useMemo(() => {
    if (!searchQuery?.trim()) return preProdJobs;
    return preProdJobs.filter((j: any) => matchesJobSearch(j, searchQuery));
  }, [preProdJobs, searchQuery]);

  React.useEffect(() => {
    if (qParam) {
      setSearchQuery(qParam);
      setMyJobsOnly(false); // URL search should search across all factory jobs
    }
  }, [qParam]);

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
      // 0. Imran / Merchandiser Scope Filter (when myJobsOnly is active)
      if (myJobsOnly && currentUser) {
        const uMerch = (currentUser.merchandiserName || '').toLowerCase();
        const rMerch = (r.merchandiser || '').toLowerCase();
        const hasSearch = Boolean(searchQuery && searchQuery.trim());
        // Only enforce strict personal scope when NOT actively searching for a specific job/style/buyer
        if (!hasSearch) {
          if (uMerch && !rMerch.includes(uMerch) && !r.isNewlyImported) {
            return false;
          }
        }
      }

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

      // 3. Robust Search Matching (Job #, Style, Buyer, Merch, Item)
      if (searchQuery.trim() && !matchesJobSearch(r, searchQuery)) return false;

      return true;
    });
  }, [allRows, typeParam, activeCardIndex, weekFilter, monthFilter, merchFilter, floorUnitFilter, presentStatusFilter, buyerFilter, searchQuery, myJobsOnly, currentUser]);

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
      eyebrow={`Job Register · ${filteredRows.length.toLocaleString()} matching orders`}
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
            🖨️ Print
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

      {/* Merchandiser Scope Switcher Banner */}
      {currentUser && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', background: myJobsOnly ? '#ecfdf5' : '#f8fafc', padding: '10px 16px', borderRadius: '10px', border: `1.5px solid ${myJobsOnly ? '#059669' : '#cbd5e1'}`, flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>{myJobsOnly ? '👤' : '🌐'}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>
                  {currentUser.name?.includes('Imran') ? 'Md. Imran (Merchandiser · ONLY Buyer)' : currentUser.name || 'Current User'}
                </strong>
                <span style={{ fontSize: '11px', background: myJobsOnly ? '#059669' : '#475569', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                  {myJobsOnly ? 'FILTERED: MY ASSIGNED JOBS' : 'VIEWING ALL FACTORY JOBS'}
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
                {myJobsOnly
                  ? `Showing 61 jobs assigned to Imran (ONLY Buyer). Other merchandisers' jobs are hidden from your workspace.`
                  : `Showing all 2,000+ factory production jobs across all buyers and lines.`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setMyJobsOnly(true)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                background: myJobsOnly ? '#059669' : '#ffffff',
                color: myJobsOnly ? '#ffffff' : '#047857',
                border: '1.5px solid #059669'
              }}
            >
              ⭐ My Jobs Only ({currentUser.name?.includes('Imran') ? '61 Jobs' : 'My Scope'})
            </button>
            <button
              type="button"
              onClick={() => setMyJobsOnly(false)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                background: !myJobsOnly ? '#0f172a' : '#ffffff',
                color: !myJobsOnly ? '#ffffff' : '#334155',
                border: '1.5px solid #cbd5e1'
              }}
            >
              🌐 All Factory Jobs (2,000+)
            </button>
          </div>
        </div>
      )}

      {/* 1b. DIVISION TABS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', background: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveDivisionTab('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '7px',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeDivisionTab === 'all' ? '#0f172a' : '#ffffff',
              color: activeDivisionTab === 'all' ? '#ffffff' : '#475569',
              border: `1px solid ${activeDivisionTab === 'all' ? '#0f172a' : '#cbd5e1'}`
            }}
          >
            <span>🏭 Master Factory Register</span>
            <span style={{ fontSize: '11px', background: activeDivisionTab === 'all' ? '#334155' : '#f1f5f9', color: activeDivisionTab === 'all' ? '#fff' : '#64748b', padding: '1px 6px', borderRadius: '10px' }}>
              {liveJobs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDivisionTab('preproduction')}
            style={{
              padding: '8px 16px',
              borderRadius: '7px',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeDivisionTab === 'preproduction' ? '#2563eb' : '#ffffff',
              color: activeDivisionTab === 'preproduction' ? '#ffffff' : '#1e40af',
              border: `1px solid ${activeDivisionTab === 'preproduction' ? '#2563eb' : '#bfdbfe'}`
            }}
          >
            <span>⚡ Pre-Production Stage Division (PO Import → Planning)</span>
            <span style={{ fontSize: '11px', background: activeDivisionTab === 'preproduction' ? '#1d4ed8' : '#dbeafe', color: activeDivisionTab === 'preproduction' ? '#fff' : '#1e40af', padding: '1px 6px', borderRadius: '10px' }}>
              {preProdJobs.length} Jobs
            </span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Link
            href="/merchandising/order-po"
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              background: '#059669',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 800,
              textDecoration: 'none'
            }}
          >
            + Import New Buyer PO
          </Link>
          <Link
            href="/tasks"
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              background: '#0284c7',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 800,
              textDecoration: 'none'
            }}
          >
            📋 Department Tasks
          </Link>
        </div>
      </div>

      {activeDivisionTab === 'preproduction' ? (
        <div>
          {/* Pre-Production KPI Strip requested by user */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', marginBottom: '14px' }}>
            <div className="panel" style={{ padding: '14px 18px', border: '1px solid #93c5fd', background: '#eff6ff' }}>
              <span style={{ fontSize: '11px', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase' }}>TOTAL POs IN PRE-PRODUCTION</span>
              <strong style={{ fontSize: '26px', fontWeight: 900, color: '#1e3a8a', display: 'block', marginTop: '2px' }}>{preProdJobs.length}</strong>
              <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 600 }}>Active PO Import pipeline</span>
            </div>

            <div className="panel" style={{ padding: '14px 18px', border: '1px solid #fca5a5', background: '#fef2f2' }}>
              <span style={{ fontSize: '11px', color: '#991b1b', fontWeight: 800, textTransform: 'uppercase' }}>PENDING FABRIC ORDER SHEET</span>
              <strong style={{ fontSize: '26px', fontWeight: 900, color: '#b91c1c', display: 'block', marginTop: '2px' }}>{pendingFosCount}</strong>
              <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>Awaiting CAD / Merchandiser</span>
            </div>

            <div className="panel" style={{ padding: '14px 18px', border: '1px solid #fde047', background: '#fefce8' }}>
              <span style={{ fontSize: '11px', color: '#854d0e', fontWeight: 800, textTransform: 'uppercase' }}>PENDING T&A PLAN PREPARATION</span>
              <strong style={{ fontSize: '26px', fontWeight: 900, color: '#a16207', display: 'block', marginTop: '2px' }}>{pendingTnaCount}</strong>
              <span style={{ fontSize: '11px', color: '#ca8a04', fontWeight: 700 }}>Needs review & print</span>
            </div>

            <div className="panel" style={{ padding: '14px 18px', border: '1px solid #d8b4fe', background: '#faf5ff' }}>
              <span style={{ fontSize: '11px', color: '#6b21a8', fontWeight: 800, textTransform: 'uppercase' }}>PENDING SEWING LINE PLAN</span>
              <strong style={{ fontSize: '26px', fontWeight: 900, color: '#7e22ce', display: 'block', marginTop: '2px' }}>{pendingLinePlanCount}</strong>
              <span style={{ fontSize: '11px', color: '#9333ea', fontWeight: 700 }}>Central Planning allocation</span>
            </div>
          </section>

          {stageActionMsg && (
            <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7', padding: '10px 16px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', fontWeight: 700 }}>
              {stageActionMsg}
            </div>
          )}

          {/* Pre-Production Stage Division Table */}
          <div className="panel" style={{ padding: '16px', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Pre-Production Workflow & Stage Control (Central Planning Follow-up)
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                  Tracks from PO import to Sewing Line Plan & Planning Approval. Approval dispatches auto-copy to Knitting & Dyeing.
                </p>
              </div>

              {/* Pre-Production Search Box */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1.5px solid #2563eb', borderRadius: '6px', padding: '3px 8px', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search Job #, Style, Buyer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ border: 'none', outline: 'none', fontSize: '12px', fontWeight: 600, width: '220px', color: '#0f172a' }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '11px', fontWeight: 800 }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '4px', fontWeight: 800 }}>
                  {filteredPreProdJobs.length} Jobs
                </span>
              </div>
            </div>

            <div className="table-scroll">
              <table className="register-table compact-table" style={{ width: '100%' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th>Job No & Buyer</th>
                    <th>Style & Qty</th>
                    <th>1. Central IE</th>
                    <th>2. CAD Consumption</th>
                    <th>3. Fabric Order Sheet</th>
                    <th>4. Trims BOM & Order</th>
                    <th>5. Dyeing Lab Shade</th>
                    <th>6. T&A Plan</th>
                    <th>7. Planning Approval & Dispatch</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPreProdJobs.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                        No pre-production jobs found matching &ldquo;{searchQuery}&rdquo;.
                        {searchQuery && (
                          <div style={{ marginTop: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setSearchQuery('')}
                              style={{ border: 'none', background: 'transparent', color: '#2563eb', fontWeight: 700, cursor: 'pointer', fontSize: '11.5px' }}
                            >
                              Clear search query
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredPreProdJobs.slice(0, 50).map((j: any) => {
                    const wf = j.workflow || {};
                    const isFosApproved = wf.fabricOrderSheet?.status === 'PLANNING_APPROVED';
                    const isFosPrepared = wf.fabricOrderSheet?.status === 'PREPARED_OK' || isFosApproved;
                    const isTnaApproved = wf.tna?.status === 'PLANNING_APPROVED';
                    const isTnaPrepared = wf.tna?.status === 'PREPARED_OK' || isTnaApproved;
                    const isCadDone = wf.cad?.status === 'COMPLETED';
                    const isShadeOk = wf.labShade?.status === 'SHADE_OK';
                    const isIeDone = wf.ieBulletin?.status === 'READY_IMPORTED';
                    const isBusy = busyJobNo === j.jobNo;

                    return (
                      <tr key={j.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td>
                          {j.isNewlyImported && (
                            <span style={{ background: '#059669', color: '#fff', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', fontWeight: 900, marginRight: '4px' }}>
                              NEW PO
                            </span>
                          )}
                          <Link href={`/jobs/${j.jobNo}`} style={{ fontWeight: 900, color: '#2563eb', textDecoration: 'none' }}>
                            #{j.jobNo}
                          </Link>
                          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>{j.buyer}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '11.5px', color: '#0f172a' }}>{j.styleNo}</div>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>{Number(j.orderQty || 0).toLocaleString()} pcs</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, background: isIeDone ? '#ecfdf5' : '#f1f5f9', color: isIeDone ? '#065f46' : '#475569', border: `1px solid ${isIeDone ? '#a7f3d0' : '#cbd5e1'}` }}>
                            {isIeDone ? '✓ Bulletin Ready' : 'Pending IE'}
                          </span>
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>SMV: {wf.ieBulletin?.smv || j.ie?.smv || '8.5'}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, background: isCadDone ? '#ecfdf5' : '#fefce8', color: isCadDone ? '#065f46' : '#854d0e', border: `1px solid ${isCadDone ? '#a7f3d0' : '#fde047'}` }}>
                            {isCadDone ? '✓ Consumption Done' : 'Pending CAD'}
                          </span>
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{wf.cad?.consumptionKgPerDz || '2.65'} kg/dz · {wf.cad?.markerEfficiencyPct || '86.4'}%</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, background: isFosApproved ? '#dbeafe' : isFosPrepared ? '#ecfdf5' : '#fef2f2', color: isFosApproved ? '#1e40af' : isFosPrepared ? '#065f46' : '#991b1b', border: `1px solid ${isFosApproved ? '#bfdbfe' : isFosPrepared ? '#a7f3d0' : '#fecaca'}` }}>
                            {isFosApproved ? '✓ Planning Approved' : isFosPrepared ? '✓ Prepared OK' : 'Pending Prep'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1' }}>
                            {wf.trims?.orderingStatus === 'ORDER_OK' ? '✓ Order OK' : 'Partial / Follow-up'}
                          </span>
                          <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>Thread: pending shade match</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, background: isShadeOk ? '#ecfdf5' : '#fff7ed', color: isShadeOk ? '#065f46' : '#9a3412', border: `1px solid ${isShadeOk ? '#a7f3d0' : '#fed7aa'}` }}>
                            {isShadeOk ? '✓ Shade OK' : 'Lab Pending'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, background: isTnaApproved ? '#dbeafe' : isTnaPrepared ? '#ecfdf5' : '#fefce8', color: isTnaApproved ? '#1e40af' : isTnaPrepared ? '#065f46' : '#854d0e', border: `1px solid ${isTnaApproved ? '#bfdbfe' : isTnaPrepared ? '#a7f3d0' : '#fde047'}` }}>
                            {isTnaApproved ? '✓ Approved' : isTnaPrepared ? '✓ Prepared OK' : 'Pending Prep'}
                          </span>
                        </td>
                        <td>
                          {isFosApproved ? (
                            <span style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, background: '#ecfdf5', color: '#047857', border: '1px solid #6ee7b7' }}>
                              ✓ Auto-Dispatched (Knit & Dye)
                            </span>
                          ) : (
                            <button
                              disabled={isBusy}
                              onClick={() => handleStageAction(j.jobNo, 'planning_approval_submit')}
                              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 8px', fontSize: '10.5px', fontWeight: 800, cursor: 'pointer' }}
                              title="Planning approves FOS & T&A, auto-sending copy to Knitting and Dyeing"
                            >
                              {isBusy ? 'Saving...' : '⚡ Planning Approve & Dispatch'}
                            </button>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            <Link href={`/jobs/${j.jobNo}`} className="btn btn-secondary" style={{ fontSize: '10.5px', padding: '3px 7px', textDecoration: 'none' }}>
                              Profile
                            </Link>
                            <Link href={`/tasks?jobNo=${j.jobNo}`} className="btn btn-secondary" style={{ fontSize: '10.5px', padding: '3px 7px', textDecoration: 'none' }}>
                              Tasks
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 2. STATS STRIP */}
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
              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'block', marginTop: '3px' }}>Click to reset</span>
            </div>

        <div
          className="panel"
          style={{ padding: '14px 18px', border: '1px solid #93c5fd', background: '#f8fafc', boxShadow: '0 2px 6px rgba(37,99,235,0.08)' }}
          title="Total Order Volume in Pieces"
        >
          <span style={{ fontSize: '11px', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>TOTAL ORDER VOLUME</span>
          <strong style={{ fontSize: '26px', fontWeight: 900, color: '#2563eb', display: 'block', marginTop: '2px' }}>{n(totalVolume)} <span style={{ fontSize: '13px', fontWeight: 700 }}>pcs</span></strong>
          <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginTop: '3px' }}>Total order pcs</span>
        </div>

        <div
          className="panel"
          style={{ padding: '14px 18px', border: '1px solid #cbd5e1', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
          title="Assigned Floor & Lines count"
        >
          <span style={{ fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>ASSIGNED LINES</span>
          <strong style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', display: 'block', marginTop: '2px' }}>{linesCount} <span style={{ fontSize: '13px', fontWeight: 700 }}>lines</span></strong>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', marginTop: '3px' }}>NFL & NCL lines</span>
        </div>

        <div
          className="panel"
          style={{ padding: '14px 18px', border: '1px solid #cbd5e1', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
          title="Active export buyers"
        >
          <span style={{ fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>ACTIVE BUYERS</span>
          <strong style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', display: 'block', marginTop: '2px' }}>{buyersCount} <span style={{ fontSize: '13px', fontWeight: 700 }}>buyers</span></strong>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', marginTop: '3px' }}>Export brands</span>
        </div>
      </section>

      {/* 3. MULTI-GRAPH ANALYTICS */}
      <section className="section-graphs-row" style={{ marginBottom: '14px' }}>
        <div className="chart-card">
          <div className="chart-card-head">
            <div>
              <div className="chart-card-title">Status Distribution</div>
              <div className="chart-card-sub">Active job mix</div>
            </div>
            <span className="status-pill ok">Live</span>
          </div>
          <SvgDonut data={donutData} />
        </div>

        <div className="chart-card">
          <div className="chart-card-head">
            <div>
              <div className="chart-card-title">Volume by Buyer</div>
              <div className="chart-card-sub">Order vs Produced (pcs)</div>
            </div>
            <span className="status-pill" style={{ background: '#ecfdf5', color: '#047857' }}>Volume</span>
          </div>
          <SvgBarChart data={barData} />
        </div>

        <div className="chart-card">
          <div className="chart-card-head">
            <div>
              <div className="chart-card-title">Weekly Shipment Trend</div>
              <div className="chart-card-sub">Shipment schedule</div>
            </div>
            <span className="status-pill" style={{ background: '#faf5ff', color: '#7e22ce' }}>Trend</span>
          </div>
          <SvgTrendChart data={trendData} />
        </div>
      </section>

      {/* 4. OPERATIONAL REGISTER TABLE */}
      <section className="operational-register" style={{ marginTop: 0 }}>
        {/* Toolbar (Clean non-form div to eliminate any accidental page reload) */}
        <div className="register-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Job Register</strong>
            <span className="status-pill ok" style={{ fontWeight: 800 }}>{filteredRows.length.toLocaleString()} Jobs</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search Job, Buyer, Style..."
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
              <option value="ALL">Week: All</option>
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
              <option value="ALL">Month: All</option>
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
              <option value="ALL">Floor/Line: All</option>
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
              <option value="ALL">Merch: All</option>
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
              <option value="ALL">Status: All</option>
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
              <option value="ALL">Buyer: All</option>
              {buyerOptions.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Apply Button */}
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              className="reg-btn-compact"
              style={{ background: '#2563eb', color: '#fff', borderColor: '#2563eb', fontWeight: 800, minWidth: '75px' }}
              title="Apply filters"
            >
              Apply
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
        </div>

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
                Order Volume
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
                Active Buyers
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
                Assigned Lines
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
                <th style={{ textAlign: 'center' }}>360 View</th>
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
                      {r.rawJob?.isNewlyImported && (
                        <span style={{ background: '#059669', color: '#fff', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', fontWeight: 900, marginRight: '5px' }}>
                          NEW PO
                        </span>
                      )}
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
                        360 View ↗
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '26px', marginBottom: '6px' }}>🔍</div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>
                      {searchQuery ? `No jobs found matching "${searchQuery}"` : 'No records found matching your active filters'}
                    </div>
                    {myJobsOnly && (
                      <div style={{ marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => { setMyJobsOnly(false); }}
                          style={{
                            background: '#0f172a',
                            color: '#ffffff',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: 'none',
                            fontWeight: 800,
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          🌐 Expand Search across all 2,000+ Factory Jobs
                        </button>
                      </div>
                    )}
                    <div style={{ marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setWeekFilter('ALL'); setMonthFilter('ALL'); setFloorUnitFilter('ALL');
                          setMerchFilter('ALL'); setPresentStatusFilter('ALL'); setBuyerFilter('ALL');
                          setSearchQuery(''); setActiveCardIndex(null); setCurrentPage(1); setMyJobsOnly(false);
                        }}
                        style={{ border: 0, background: 'transparent', color: '#2563eb', fontWeight: 800, cursor: 'pointer', fontSize: '12.5px' }}
                      >
                        Reset all filters &amp; view all jobs →
                      </button>
                    </div>
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
        </>
      )}
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
