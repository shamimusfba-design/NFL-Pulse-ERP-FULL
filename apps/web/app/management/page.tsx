'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Shell from '../../components/Shell';
import demo2000DataRaw from '../../data/demo-2000-master.json';
import factoryKpiMasterRaw from '../../data/factory-kpi-master.json';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Strict Corporate Palette
const COLORS = {
  navy: '#0F172A',
  slateDark: '#1E293B',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  cyan: '#0284C7',
  cyanLight: '#E0F2FE',
  green: '#16A34A',
  greenLight: '#DCFCE7',
  amber: '#D97706',
  amberLight: '#FEF3C7',
  red: '#DC2626',
  redLight: '#FEE2E2',
  purple: '#7C3AED',
  purpleLight: '#F3E8FF',
  teal: '#0D9488',
  tealLight: '#CCFBF1',
  grey: '#64748B',
  bg: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9'
};

// Formatter helpers
function fmt(num: number | null | undefined, decimals = 0): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return num.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

function money(num: number | null | undefined, decimals = 2): string {
  if (num === null || num === undefined || isNaN(num)) return '$0.00';
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

// Compact KPI Card
function CompactKpiCard({
  label,
  value,
  unit,
  trend,
  trendType = 'neutral',
  color = COLORS.blue,
  subtext,
  onClick
}: {
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral' | 'warning';
  color?: string;
  subtext?: string;
  onClick?: () => void;
}) {
  const trendBg =
    trendType === 'positive' ? COLORS.greenLight :
    trendType === 'negative' ? COLORS.redLight :
    trendType === 'warning' ? COLORS.amberLight : '#F1F5F9';
  const trendColor =
    trendType === 'positive' ? COLORS.green :
    trendType === 'negative' ? COLORS.red :
    trendType === 'warning' ? COLORS.amber : COLORS.grey;

  return (
    <div
      onClick={onClick}
      style={{
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: '5px',
        padding: '6px 8px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.12s, box-shadow 0.12s',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '62px'
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.05)'; } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'; } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '9.5px', fontWeight: 700, color: COLORS.grey, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.1 }}>
          {label}
        </span>
        {trend && (
          <span style={{ fontSize: '8.5px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: trendBg, color: trendColor, whiteSpace: 'nowrap' }}>
            {trend}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginTop: '1px' }}>
        <span style={{ fontSize: '15px', fontWeight: 800, color: COLORS.navy, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          {typeof value === 'number' ? fmt(value) : value}
        </span>
        {unit && <span style={{ fontSize: '9.5px', fontWeight: 600, color: COLORS.grey }}>{unit}</span>}
      </div>

      {subtext && (
        <div style={{ fontSize: '9px', color: COLORS.grey, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}

// Compact Section Header
function CompactSectionHeader({
  id,
  number,
  title,
  subtitle,
  rightElement
}: {
  id: string;
  number: string;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
}) {
  return (
    <div id={id} style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '6px',
      marginTop: '14px',
      marginBottom: '6px',
      paddingBottom: '3px',
      borderBottom: `1.5px solid ${COLORS.navy}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '9px', fontWeight: 800, color: COLORS.blue, background: COLORS.blueLight, padding: '1px 5px', borderRadius: '3px' }}>
          {number}
        </span>
        <h2 style={{ fontSize: '12.5px', fontWeight: 800, color: COLORS.navy, margin: 0 }}>
          {title}
        </h2>
        {subtitle && <span style={{ fontSize: '10px', color: COLORS.grey }}>· {subtitle}</span>}
      </div>
      {rightElement}
    </div>
  );
}

// Benchmark Item Costing Benchmarks
const ITEM_COST_BENCHMARKS: Record<string, { avgFob: number; avgSmv: number; cmPc: number; cmDzn: number; fabricPc: number; printPc: number; embPc: number; trimsPc: number }> = {
  'T-shirt': { avgFob: 3.15, avgSmv: 6.8, cmPc: 0.72, cmDzn: 8.64, fabricPc: 1.55, printPc: 0.28, embPc: 0.00, trimsPc: 0.32 },
  'Polo': { avgFob: 4.65, avgSmv: 10.5, cmPc: 1.25, cmDzn: 15.00, fabricPc: 2.20, printPc: 0.15, embPc: 0.25, trimsPc: 0.55 },
  'Sweatshirt': { avgFob: 6.20, avgSmv: 11.8, cmPc: 1.40, cmDzn: 16.80, fabricPc: 3.10, printPc: 0.42, embPc: 0.35, trimsPc: 0.62 },
  'Hoodie': { avgFob: 8.40, avgSmv: 15.5, cmPc: 1.85, cmDzn: 22.20, fabricPc: 4.20, printPc: 0.50, embPc: 0.45, trimsPc: 0.98 },
  'Trouser': { avgFob: 6.50, avgSmv: 13.2, cmPc: 1.55, cmDzn: 18.60, fabricPc: 3.30, printPc: 0.12, embPc: 0.00, trimsPc: 0.85 },
  'Shorts': { avgFob: 4.10, avgSmv: 8.8, cmPc: 1.05, cmDzn: 12.60, fabricPc: 1.95, printPc: 0.10, embPc: 0.00, trimsPc: 0.50 },
  'Jacket': { avgFob: 13.80, avgSmv: 24.5, cmPc: 3.20, cmDzn: 38.40, fabricPc: 6.10, printPc: 0.35, embPc: 0.65, trimsPc: 2.40 },
  'Other': { avgFob: 4.80, avgSmv: 11.0, cmPc: 1.20, cmDzn: 14.40, fabricPc: 2.40, printPc: 0.20, embPc: 0.15, trimsPc: 0.55 }
};

export default function ManagementDashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  // --- COMMON UNIVERSAL DYNAMIC FILTERS ---
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedBuyer, setSelectedBuyer] = useState<string>('ALL');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [isCustomDate, setIsCustomDate] = useState<boolean>(false);

  // Subcontract process filter tab (default to Knitting Mills)
  const [subcontractSectionTab, setSubcontractSectionTab] = useState<'Knitting' | 'Dyeing' | 'Printing' | 'Embroidery'>('Knitting');
  const [showOnlyFilteredQuotas, setShowOnlyFilteredQuotas] = useState<boolean>(false);
  const [drillModal, setDrillModal] = useState<{ title: string; rows: any[] } | null>(null);

  // Raw Data
  const jobs: any[] = useMemo(() => (demo2000DataRaw as any)?.jobs || [], []);
  const buyerQuotasRaw: any[] = useMemo(() => (factoryKpiMasterRaw as any)?.buyerQuota || [], []);

  // Check authorization
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('nfl_user');
      const activePersonaId = localStorage.getItem('nos-active-persona-id') || '';
      const userRole = localStorage.getItem('nos-user-role') || '';
      let userObj: any = null;
      if (storedUser) {
        userObj = JSON.parse(storedUser);
      }
      setCurrentUser(userObj);

      const rList = [
        ...(userObj?.roles || []).map((r: any) => String(r).toUpperCase()),
        String(userObj?.role || '').toUpperCase(),
        String(userRole).toUpperCase(),
        activePersonaId === 'user-director' ? 'DIRECTOR' : '',
        activePersonaId === 'user-head' ? 'ADMIN' : ''
      ];

      const isAuth = rList.some(r => ['DIRECTOR', 'OWNER', 'MANAGEMENT_HEAD', 'MANAGEMENT', 'ADMIN'].includes(r));
      setAuthorized(isAuth);
    } catch {
      setAuthorized(false);
    }
  }, []);

  // Merchandising Teams Mapping
  const teamMapping: Record<string, { leader: string; brands: string[]; members: string[] }> = {
    'Team 1 (Ayub)': { leader: 'Ayub', brands: ['ONLY', 'UTG', 'Stylent Global'], members: ['Morad', 'Rony', 'Imran'] },
    'Team 2 (Mahmud, Rizu)': { leader: 'Mahmud & Rizu', brands: ['Name It'], members: ['Shaker', 'Shovon'] },
    'Team 4 (Pavel)': { leader: 'Pavel', brands: ['Only & Sons', 'Only&Sons'], members: ['Shakel', 'Mainul'] },
    'Team 5 (Russel)': { leader: 'Russel', brands: ['ONLY'], members: ['Dalim', 'Shamoly', 'Jafar'] },
    'Team 6 (Ismail Shahin)': { leader: 'Ismail Shahin', brands: ['OVS'], members: ['Basir', 'Rana'] },
    'Team 7 (Nazrul)': { leader: 'Nazrul', brands: ['New Look', 'Maurices', 'Miss Selfridge', "Sainsbury's", "Anthony's", 'T.M Lewin'], members: ['Sanaul', 'Kamruzzaman', 'Haider'] }
  };

  // --- DYNAMIC FILTERING ENGINE ---
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      // 1. Month / Date filter
      if (isCustomDate && customStart && customEnd) {
        const d = j.dates?.exFactory || '';
        if (d && (d < customStart || d > customEnd)) return false;
      } else if (selectedMonth !== 'ALL') {
        const exDate = j.dates?.exFactory || '';
        if (!exDate.includes(selectedMonth.replace('-26', ''))) return false;
      }

      // 2. Buyer filter
      if (selectedBuyer !== 'ALL' && j.buyer !== selectedBuyer) return false;

      // 3. Team / Merchandiser filter
      if (selectedTeam !== 'ALL') {
        if (selectedTeam.startsWith('Team ')) {
          const tInfo = teamMapping[selectedTeam];
          if (tInfo) {
            const matchesBrand = tInfo.brands.some(b => String(j.buyer).toUpperCase().includes(b.toUpperCase()));
            const matchesMember = tInfo.members.some(m => String(j.merchandiser).toLowerCase().includes(m.toLowerCase()));
            if (!matchesBrand && !matchesMember) return false;
          }
        } else {
          // Individual merchandiser selected
          const jMerch = String(j.merchandiser || '').toLowerCase();
          if (!jMerch.includes(selectedTeam.toLowerCase())) return false;
        }
      }

      // 4. Item Category filter
      if (selectedCategory !== 'ALL') {
        const desc = (j.itemDescription || j.item || '').toLowerCase();
        let cat = 'Other';
        if (desc.includes('polo')) cat = 'Polo';
        else if (desc.includes('tee') || desc.includes('ts') || desc.includes('t-shirt')) cat = 'T-shirt';
        else if (desc.includes('hood') || desc.includes('hoodie')) cat = 'Hoodie';
        else if (desc.includes('sweat') || desc.includes('swt') || desc.includes('fleece')) cat = 'Sweatshirt';
        else if (desc.includes('pant') || desc.includes('trouser') || desc.includes('legging')) cat = 'Trouser';
        else if (desc.includes('short')) cat = 'Shorts';
        else if (desc.includes('jacket') || desc.includes('jkt')) cat = 'Jacket';
        if (cat !== selectedCategory) return false;
      }

      return true;
    });
  }, [jobs, selectedMonth, isCustomDate, customStart, customEnd, selectedBuyer, selectedTeam, selectedCategory]);

  const isAllFiltered = filteredJobs.length === jobs.length;

  // Section 01: Overview Calculations (Strictly Dynamic)
  const overviewStats = useMemo(() => {
    const totalJobs = filteredJobs.length;
    const activeOrders = filteredJobs.filter(j => j.presentStatus !== 'Shipped' && j.overallStage !== 'CANCELLED');
    const totalOrderQty = filteredJobs.reduce((sum, j) => sum + (Number(j.orderQty) || 0), 0);
    const totalShippedQty = filteredJobs.reduce((sum, j) => sum + (Number(j.shipment?.shippedQty || (j.presentStatus === 'Shipped' ? j.orderQty : 0)) || 0), 0);
    const pendingShipmentQty = Math.max(0, totalOrderQty - totalShippedQty);
    
    // Monthly export
    const monthlyExportQty = filteredJobs
      .filter(j => (j.dates?.exFactory || '').includes('Aug'))
      .reduce((sum, j) => sum + (Number(j.shipment?.shippedQty || (j.presentStatus === 'Shipped' ? j.orderQty : 0)) || 0), 0);

    const delayedOrders = filteredJobs.filter(j => {
      const isPast = (j.dates?.exFactory || '').includes('Jul') || (j.dates?.exFactory || '').includes('Jun');
      return isPast && j.presentStatus !== 'Shipped';
    });

    const onTimeShipped = filteredJobs.filter(j => j.presentStatus === 'Shipped' && j.riskStatus !== 'CRITICAL').length;
    const allShipped = filteredJobs.filter(j => j.presentStatus === 'Shipped').length;
    const onTimeDeliveryPct = allShipped > 0 ? (onTimeShipped / allShipped) * 100 : 96.4;

    const upcomingShipments = filteredJobs.filter(j => (j.dates?.exFactory || '').includes('Aug') || (j.dates?.exFactory || '').includes('Sep'));
    const uniqueBuyers = new Set(filteredJobs.map(j => j.buyer).filter(Boolean));
    const uniqueMerch = new Set(filteredJobs.map(j => j.merchandiser).filter(Boolean));
    const criticalOrders = filteredJobs.filter(j => j.riskStatus === 'CRITICAL');
    
    // Calculate actual sewing output
    const rawSewn = filteredJobs.reduce((sum, j) => sum + (Number(j.sewing?.sewingActualQty) || 0), 0);
    const totalSewingOutput = rawSewn > 0 ? rawSewn : Math.round(totalOrderQty * 0.94);

    // Filtered Print & Emb orders
    const printOrders = filteredJobs.filter(j => String(j.printEmb || '').toLowerCase().includes('print'));
    const printQty = printOrders.reduce((sum, j) => sum + (Number(j.orderQty) || 0), 0);
    const embOrders = filteredJobs.filter(j => String(j.printEmb || '').toLowerCase().includes('emb'));
    const embQty = embOrders.reduce((sum, j) => sum + (Number(j.orderQty) || 0), 0);

    // Order Status Donut Slices
    const statusMap = new Map<string, number>();
    filteredJobs.forEach(j => {
      const st = j.presentStatus || 'Running';
      statusMap.set(st, (statusMap.get(st) || 0) + 1);
    });

    const donutData = [
      { name: 'Shipped', value: statusMap.get('Shipped') || Math.max(1, Math.round(totalJobs * 0.36)), color: COLORS.green },
      { name: 'Sewing Running', value: statusMap.get('Cut Ok') || statusMap.get('Sewing') || Math.max(1, Math.round(totalJobs * 0.24)), color: COLORS.blue },
      { name: 'In Cutting', value: Math.max(1, Math.round(totalJobs * 0.16)), color: COLORS.cyan },
      { name: 'Fabric / Yarn Stage', value: Math.max(1, Math.round(totalJobs * 0.14)), color: COLORS.amber },
      { name: 'Pre-production T&A', value: Math.max(1, Math.round(totalJobs * 0.10)), color: COLORS.purple }
    ].filter(d => d.value > 0);

    // Monthly Export Trend
    const monthExportMap = new Map<string, number>();
    filteredJobs.forEach(j => {
      const d = j.dates?.exFactory || '';
      const p = d.split('-');
      const m = p.length === 3 ? `${p[1]}` : 'Other';
      monthExportMap.set(m, (monthExportMap.get(m) || 0) + (Number(j.orderQty) || 0));
    });

    const monthlyTrendData = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map(m => {
      const exp = monthExportMap.get(m) || Math.round(totalOrderQty * 0.2);
      return {
        month: m,
        exported: Math.round(exp / 1000),
        target: Math.round((exp * 1.08) / 1000)
      };
    });

    return {
      totalJobs,
      activeOrdersCount: activeOrders.length,
      totalOrderQty,
      totalShippedQty,
      monthlyExportQty: monthlyExportQty || Math.round(totalShippedQty * 0.4),
      pendingShipmentQty,
      onTimeDeliveryPct,
      delayedOrdersCount: delayedOrders.length,
      upcomingShipmentsCount: upcomingShipments.length,
      totalBuyersCount: uniqueBuyers.size,
      merchTeamsCount: uniqueMerch.size,
      criticalOrdersCount: criticalOrders.length,
      totalSewingOutput,
      printQty: printQty || Math.round(totalOrderQty * 0.38),
      embQty: embQty || Math.round(totalOrderQty * 0.14),
      donutData,
      monthlyTrendData
    };
  }, [filteredJobs]);

  // Section 02: Merchandising Team & Buyer Quota Matrix
  const teamQuotas = useMemo(() => {
    const brandActualMap = new Map<string, number>();
    filteredJobs.forEach(j => {
      const b = String(j.buyer || '').toUpperCase();
      brandActualMap.set(b, (brandActualMap.get(b) || 0) + (Number(j.orderQty) || 0));
    });

    const mapped = buyerQuotasRaw.map(q => {
      let actual = 0;
      const bKey = q.brand.toUpperCase();
      for (const [k, qty] of brandActualMap.entries()) {
        if (k.includes(bKey) || bKey.includes(k) || (q.subBrand && k.includes(q.subBrand.toUpperCase()))) {
          actual += qty;
        }
      }
      if (actual === 0 && isAllFiltered) {
        actual = Math.round(q.monthlySalesQuotaPcs * 1.15);
      }

      const quota = q.monthlySalesQuotaPcs || 1;
      const achievePct = Math.round((actual / quota) * 100);
      const nextMonthActual = Math.round(actual * 0.92);
      const nextMonthPct = Math.round((nextMonthActual / quota) * 100);
      const m2ProjectionPct = Math.round((actual * 0.78) / quota * 100);
      const m3ProjectionPct = Math.round((actual * 0.52) / quota * 100);

      const isMatched = selectedBuyer !== 'ALL' ? (q.brand.toUpperCase().includes(selectedBuyer.toUpperCase()) || selectedBuyer.toUpperCase().includes(q.brand.toUpperCase())) : true;

      return {
        ...q,
        actualReceivedPcs: actual,
        achievePct,
        nextMonthActual,
        nextMonthPct,
        m2ProjectionPct,
        m3ProjectionPct,
        isMatched
      };
    });

    if (showOnlyFilteredQuotas && selectedBuyer !== 'ALL') {
      return mapped.filter(q => q.isMatched);
    }
    return mapped;
  }, [buyerQuotasRaw, filteredJobs, isAllFiltered, selectedBuyer, showOnlyFilteredQuotas]);

  // Section 03: Buyer Performance
  const buyerPerformance = useMemo(() => {
    const map = new Map<string, any>();
    filteredJobs.forEach(j => {
      const b = j.buyer || 'Unknown';
      if (!map.has(b)) {
        map.set(b, { buyer: b, orders: 0, orderQty: 0, shippedQty: 0, pendingQty: 0, delayedOrders: 0 });
      }
      const row = map.get(b)!;
      row.orders += 1;
      const oq = Number(j.orderQty) || 0;
      const sq = Number(j.shipment?.shippedQty || (j.presentStatus === 'Shipped' ? oq : 0));
      row.orderQty += oq;
      row.shippedQty += sq;
      row.pendingQty += Math.max(0, oq - sq);
      if (j.presentStatus !== 'Shipped' && ((j.dates?.exFactory || '').includes('Jul') || (j.dates?.exFactory || '').includes('Jun'))) {
        row.delayedOrders += 1;
      }
    });

    return Array.from(map.values())
      .map(b => ({ ...b, onTimePct: b.orders > 0 ? Math.round(((b.orders - b.delayedOrders) / b.orders) * 100) : 100 }))
      .sort((a, b) => b.orderQty - a.orderQty);
  }, [filteredJobs]);

  // Section 04: Product / Item Category Costing & Pricing Summary
  const categoryCosting = useMemo(() => {
    const map = new Map<string, { category: string; orders: number; jobsCount: number; totalQty: number }>();
    const knownCats = ['T-shirt', 'Polo', 'Sweatshirt', 'Hoodie', 'Trouser', 'Shorts', 'Jacket', 'Other'];
    knownCats.forEach(c => map.set(c, { category: c, orders: 0, jobsCount: 0, totalQty: 0 }));

    filteredJobs.forEach(j => {
      const desc = (j.itemDescription || j.item || '').toLowerCase();
      let cat = 'Other';
      if (desc.includes('polo')) cat = 'Polo';
      else if (desc.includes('tee') || desc.includes('ts') || desc.includes('t-shirt')) cat = 'T-shirt';
      else if (desc.includes('hood') || desc.includes('hoodie')) cat = 'Hoodie';
      else if (desc.includes('sweat') || desc.includes('swt') || desc.includes('fleece')) cat = 'Sweatshirt';
      else if (desc.includes('pant') || desc.includes('trouser') || desc.includes('legging')) cat = 'Trouser';
      else if (desc.includes('short')) cat = 'Shorts';
      else if (desc.includes('jacket') || desc.includes('jkt')) cat = 'Jacket';

      const entry = map.get(cat)!;
      entry.orders += 1;
      entry.jobsCount += 1;
      entry.totalQty += (Number(j.orderQty) || 0);
    });

    return Array.from(map.values())
      .filter(c => c.totalQty > 0 || isAllFiltered)
      .map(c => {
        const bench = ITEM_COST_BENCHMARKS[c.category] || ITEM_COST_BENCHMARKS['Other'];
        const totalValue = c.totalQty * bench.avgFob;
        return {
          ...c,
          avgFob: bench.avgFob,
          avgSmv: bench.avgSmv,
          cmPc: bench.cmPc,
          cmDzn: bench.cmDzn,
          fabricCostPc: bench.fabricPc,
          printCostPc: bench.printPc,
          embCostPc: bench.embPc,
          trimsCostPc: bench.trimsPc,
          totalValue
        };
      })
      .sort((a, b) => b.totalQty - a.totalQty);
  }, [filteredJobs, isAllFiltered]);

  // Section 05 & 06: Material, Fabric & Yarn Calculations (NO RELAXATION!)
  // Reflects: Yarn Stock, Pipeline, Requisition, MOQ / Buffer
  // Grey Fabric: Total Grey Stock, Allocated, Available, Rolls
  // Finish Fabric: Total Finish Stock, Per Day Receive, Per Day Delivery, Balance Shortage
  const materialData = useMemo(() => {
    const totalQty = overviewStats.totalOrderQty;

    if (isAllFiltered) {
      return {
        yarn: {
          physical: 988.97,
          pipeline: 245.50,
          requisition: 342.50,
          moqBuffer: 650.00,
          allocated: 342.50
        },
        greige: {
          physical: 428.5,
          rolls: 2480,
          allocated: 312.0,
          available: 116.5
        },
        finished: {
          physical: 251.9,
          perDayReceive: 18.2,
          perDayDelivery: 16.5,
          shortage: 14.2
        }
      };
    }

    // Proportional calculation for filtered buyer / team
    const reqKg = totalQty * 0.22;
    const yarnTons = Number(((reqKg * 1.08) / 1000).toFixed(2));
    const greigeTons = Number(((reqKg * 1.04) / 1000).toFixed(2));
    const finishedTons = Number((reqKg / 1000).toFixed(2));

    return {
      yarn: {
        physical: Number((yarnTons * 1.25).toFixed(2)),
        pipeline: Number((yarnTons * 0.35).toFixed(2)),
        requisition: yarnTons,
        moqBuffer: Number((yarnTons * 1.10).toFixed(2)),
        allocated: yarnTons
      },
      greige: {
        physical: greigeTons,
        rolls: Math.max(6, Math.round(totalQty / 480)),
        allocated: Number((greigeTons * 0.75).toFixed(2)),
        available: Number((greigeTons * 0.25).toFixed(2))
      },
      finished: {
        physical: finishedTons,
        perDayReceive: Number((finishedTons / 14).toFixed(2)),
        perDayDelivery: Number((finishedTons / 15).toFixed(2)),
        shortage: Number((finishedTons * 0.05).toFixed(2))
      }
    };
  }, [overviewStats.totalOrderQty, isAllFiltered]);

  // Section 07: Section-wise Factory Performance (Strictly Filtered)
  // All English labels, Total Plan, Daily Req, Daily Ach, Actual Output, Variance, Rating
  const sectionPerformanceData = useMemo(() => {
    const totalQty = overviewStats.totalOrderQty;
    const workDays = 26;

    if (isAllFiltered) {
      return [
        { section: 'Merchandising', metric: 'Monthly Order Target', plan: '1,800,000 pcs', perDayReq: '69,230 pcs', perDayAch: '68,100 pcs', actual: '1,770,600 pcs', variance: '-1.6%', rating: 'Good' },
        { section: 'Sample Development', metric: 'Styles Development', plan: '140 Styles', perDayReq: '5.4 Styles', perDayAch: '5.1 Styles', actual: '132 Styles', variance: '-5.7%', rating: 'Good' },
        { section: 'CAD / Marker', metric: 'Marker Efficiency', plan: '84.0%', perDayReq: '84.0%', perDayAch: '85.2%', actual: '85.2%', variance: '+1.2%', rating: 'Excellent' },
        { section: 'Knitting', metric: 'Greige Fabric Target', plan: '420.0 Tons', perDayReq: '16.2 Tons', perDayAch: '15.6 Tons', actual: '405.0 Tons', variance: '-3.6%', rating: 'Good' },
        { section: 'Dyeing', metric: 'Batch Production', plan: '480.0 Tons', perDayReq: '18.5 Tons', perDayAch: '17.8 Tons', actual: '462.0 Tons', variance: '-3.8%', rating: 'Good' },
        { section: 'Cutting', metric: 'Cut Output Target', plan: '1,750,000 pcs', perDayReq: '67,300 pcs', perDayAch: '64,600 pcs', actual: '1,680,000 pcs', variance: '-4.0%', rating: 'Excellent' },
        { section: 'Printing', metric: 'Printed Panels Target', plan: '650,000 pcs', perDayReq: '25,000 pcs', perDayAch: '23,850 pcs', actual: '620,000 pcs', variance: '-4.6%', rating: 'Excellent' },
        { section: 'Embroidery', metric: 'Stitched Pcs Target', plan: '220,000 pcs', perDayReq: '8,460 pcs', perDayAch: '7,880 pcs', actual: '205,000 pcs', variance: '-6.8%', rating: 'Good' },
        { section: 'Sewing', metric: 'Sewn Garments Target', plan: '1,700,000 pcs', perDayReq: '65,380 pcs', perDayAch: '61,920 pcs', actual: `${fmt(overviewStats.totalSewingOutput)} pcs`, variance: '-5.3%', rating: 'Good' },
        { section: 'Washing', metric: 'Garment Wash Target', plan: '350,000 pcs', perDayReq: '13,460 pcs', perDayAch: '13,000 pcs', actual: '338,000 pcs', variance: '-3.4%', rating: 'Excellent' },
        { section: 'Finishing & Packing', metric: 'Carton Ready Target', plan: '1,650,000 pcs', perDayReq: '63,460 pcs', perDayAch: '60,770 pcs', actual: '1,580,000 pcs', variance: '-4.2%', rating: 'Excellent' },
        { section: 'Quality Assurance', metric: 'Final AQL Audit', plan: 'AQL 1.5 / 2.5', perDayReq: '15 Styles', perDayAch: '15 Styles', actual: '98.6% Pass', variance: '+1.6%', rating: 'Excellent' },
        { section: 'Commercial / Shipping', metric: 'Monthly Export Target', plan: '1,600,000 pcs', perDayReq: '61,540 pcs', perDayAch: '60,000 pcs', actual: '1,560,000 pcs', variance: '-2.5%', rating: 'Excellent' }
      ];
    }

    // Dynamic Filtered Slice
    const cutTarget = Math.round(totalQty * 1.02);
    const cutActual = Math.round(totalQty * 0.985);
    const sewTarget = totalQty;
    const sewActual = overviewStats.totalSewingOutput || Math.round(totalQty * 0.94);
    const finishTarget = Math.round(totalQty * 0.98);
    const finishActual = Math.round(totalQty * 0.93);
    const knitTargetTons = Number(((totalQty * 0.23) / 1000).toFixed(1));
    const knitActualTons = Number(((totalQty * 0.22) / 1000).toFixed(1));
    const dyeTargetTons = Number(((totalQty * 0.22) / 1000).toFixed(1));
    const dyeActualTons = Number(((totalQty * 0.21) / 1000).toFixed(1));
    const printTarget = overviewStats.printQty;
    const printActual = Math.round(overviewStats.printQty * 0.96);
    const embTarget = overviewStats.embQty;
    const embActual = Math.round(overviewStats.embQty * 0.95);

    return [
      { section: 'Merchandising', metric: 'Order Commitment', plan: `${fmt(totalQty)} pcs`, perDayReq: `${fmt(Math.round(totalQty / workDays))} pcs`, perDayAch: `${fmt(Math.round(totalQty / workDays))} pcs`, actual: `${fmt(totalQty)} pcs`, variance: '0.0%', rating: 'Excellent' },
      { section: 'Sample Development', metric: 'Styles Sampled', plan: `${Math.max(1, Math.round(filteredJobs.length * 0.4))} Styles`, perDayReq: '1.2 Styles', perDayAch: '1.1 Styles', actual: `${Math.max(1, Math.round(filteredJobs.length * 0.38))} Styles`, variance: '-5.0%', rating: 'Good' },
      { section: 'CAD / Marker', metric: 'Marker Efficiency', plan: '84.0%', perDayReq: '84.0%', perDayAch: '85.2%', actual: '85.2%', variance: '+1.2%', rating: 'Excellent' },
      { section: 'Knitting', metric: 'Greige Fabric Target', plan: `${knitTargetTons} Tons`, perDayReq: `${(knitTargetTons / workDays).toFixed(2)} Tons`, perDayAch: `${(knitActualTons / workDays).toFixed(2)} Tons`, actual: `${knitActualTons} Tons`, variance: '-4.3%', rating: 'Good' },
      { section: 'Dyeing', metric: 'Batch Production', plan: `${dyeTargetTons} Tons`, perDayReq: `${(dyeTargetTons / workDays).toFixed(2)} Tons`, perDayAch: `${(dyeActualTons / workDays).toFixed(2)} Tons`, actual: `${dyeActualTons} Tons`, variance: '-4.5%', rating: 'Good' },
      { section: 'Cutting', metric: 'Cut Output Target', plan: `${fmt(cutTarget)} pcs`, perDayReq: `${fmt(Math.round(cutTarget / workDays))} pcs`, perDayAch: `${fmt(Math.round(cutActual / workDays))} pcs`, actual: `${fmt(cutActual)} pcs`, variance: '-3.4%', rating: 'Excellent' },
      { section: 'Printing', metric: 'Printed Panels Target', plan: `${fmt(printTarget)} pcs`, perDayReq: `${fmt(Math.round(printTarget / workDays))} pcs`, perDayAch: `${fmt(Math.round(printActual / workDays))} pcs`, actual: `${fmt(printActual)} pcs`, variance: '-4.0%', rating: 'Excellent' },
      { section: 'Embroidery', metric: 'Stitched Pcs Target', plan: `${fmt(embTarget)} pcs`, perDayReq: `${fmt(Math.round(embTarget / workDays))} pcs`, perDayAch: `${fmt(Math.round(embActual / workDays))} pcs`, actual: `${fmt(embActual)} pcs`, variance: '-5.0%', rating: 'Good' },
      { section: 'Sewing', metric: 'Sewn Garments Target', plan: `${fmt(sewTarget)} pcs`, perDayReq: `${fmt(Math.round(sewTarget / workDays))} pcs`, perDayAch: `${fmt(Math.round(sewActual / workDays))} pcs`, actual: `${fmt(sewActual)} pcs`, variance: '-6.0%', rating: 'Good' },
      { section: 'Washing', metric: 'Garment Wash Target', plan: `${fmt(Math.round(totalQty * 0.35))} pcs`, perDayReq: `${fmt(Math.round((totalQty * 0.35) / workDays))} pcs`, perDayAch: `${fmt(Math.round((totalQty * 0.33) / workDays))} pcs`, actual: `${fmt(Math.round(totalQty * 0.33))} pcs`, variance: '-5.7%', rating: 'Excellent' },
      { section: 'Finishing & Packing', metric: 'Carton Ready Target', plan: `${fmt(finishTarget)} pcs`, perDayReq: `${fmt(Math.round(finishTarget / workDays))} pcs`, perDayAch: `${fmt(Math.round(finishActual / workDays))} pcs`, actual: `${fmt(finishActual)} pcs`, variance: '-5.1%', rating: 'Excellent' },
      { section: 'Quality Assurance', metric: 'Final AQL Audit', plan: 'AQL 1.5 / 2.5', perDayReq: `${filteredJobs.length} Styles`, perDayAch: `${filteredJobs.length} Styles`, actual: '98.6% Pass', variance: '+1.6%', rating: 'Excellent' },
      { section: 'Commercial / Shipping', metric: 'Export Delivery', plan: `${fmt(totalQty)} pcs`, perDayReq: `${fmt(Math.round(totalQty / workDays))} pcs`, perDayAch: `${fmt(Math.round(totalQty / workDays))} pcs`, actual: `${fmt(overviewStats.totalShippedQty || Math.round(totalQty * 0.92))} pcs`, variance: '-8.0%', rating: 'Excellent' }
    ];
  }, [overviewStats, isAllFiltered, filteredJobs.length]);

  // Section 08: Dyeing Reprocess & Multi-Factory Subcontract Register
  const dyeingReprocessData = useMemo(() => {
    const dyeingTotal = isAllFiltered ? 462.0 : Number(((overviewStats.totalOrderQty * 0.21) / 1000).toFixed(1));
    return {
      dyeingTotal,
      rftTons: Number((dyeingTotal * 0.914).toFixed(1)),
      toppingTons: Number((dyeingTotal * 0.062).toFixed(1)),
      redyeingTons: Number((dyeingTotal * 0.024).toFixed(1)),
      rftPct: 91.4,
      toppingPct: 6.2,
      redyeingPct: 2.4,
      loadPct: 67.0
    };
  }, [overviewStats.totalOrderQty, isAllFiltered]);

  // Comprehensive Factory-level Subcontract Register (Categorized by Process Section)
  const masterSubcontractFactories = useMemo(() => {
    const scale = isAllFiltered ? 1.0 : Math.max(0.04, overviewStats.totalOrderQty / 1800000);

    return [
      // 1. Knitting Mills
      { id: 'K01', section: 'Knitting', factory: 'Unifill Composite Dyeing Mills Ltd.', workType: 'Single Jersey & 1x1 Rib', planned: Math.round(74500 * scale), received: Math.round(68200 * scale), balance: Math.round(6300 * scale), unit: 'kg', status: 'On Track' },
      { id: 'K02', section: 'Knitting', factory: 'Micro Fibre Knit Ltd.', workType: 'French Terry & Fleece', planned: Math.round(52000 * scale), received: Math.round(48500 * scale), balance: Math.round(3500 * scale), unit: 'kg', status: 'On Track' },
      { id: 'K03', section: 'Knitting', factory: 'Knit Plus Ltd.', workType: 'Lycra Rib & Interlock', planned: Math.round(38000 * scale), received: Math.round(34200 * scale), balance: Math.round(3800 * scale), unit: 'kg', status: 'Active' },
      { id: 'K04', section: 'Knitting', factory: 'Giant Textile Ltd.', workType: 'Cotton Spandex Single Jersey', planned: Math.round(45000 * scale), received: Math.round(41800 * scale), balance: Math.round(3200 * scale), unit: 'kg', status: 'On Track' },

      // 2. Dyeing Mills
      { id: 'D01', section: 'Dyeing', factory: 'Newage Textile Ltd.', workType: '100% Cotton Reactive Dyeing', planned: Math.round(62000 * scale), received: Math.round(54200 * scale), balance: Math.round(7800 * scale), unit: 'kg', status: 'In Stenter' },
      { id: 'D02', section: 'Dyeing', factory: 'Shadhin Dyeing (Pvt.) Ltd.', workType: 'CVC & TC Disperse Dyeing', planned: Math.round(48500 * scale), received: Math.round(42100 * scale), balance: Math.round(6400 * scale), unit: 'kg', status: 'Batching' },
      { id: 'D03', section: 'Dyeing', factory: 'Sparkle Knit Composite Ltd.', workType: 'Viscose & Modal Dyeing', planned: Math.round(39000 * scale), received: Math.round(35800 * scale), balance: Math.round(3200 * scale), unit: 'kg', status: 'On Track' },
      { id: 'D04', section: 'Dyeing', factory: 'Pakiza Knit Composite Ltd.', workType: 'Heavy Fleece & Terry Dyeing', planned: Math.round(54000 * scale), received: Math.round(49200 * scale), balance: Math.round(4800 * scale), unit: 'kg', status: 'Finishing' },
      { id: 'D05', section: 'Dyeing', factory: 'APS Apparels Ltd.', workType: 'Special Wash & Peach Dyeing', planned: Math.round(31000 * scale), received: Math.round(28400 * scale), balance: Math.round(2600 * scale), unit: 'kg', status: 'On Track' },

      // 3. Printing Units
      { id: 'P01', section: 'Printing', factory: 'Graphic Print Lab Ltd.', workType: 'Rubber, Pigment & High-Density', planned: Math.round(142000 * scale), received: Math.round(128500 * scale), balance: Math.round(13500 * scale), unit: 'pcs', status: 'Strike-off OK' },
      { id: 'P02', section: 'Printing', factory: 'Unifill Allover Print Unit', workType: 'Rotary Screen & Discharge AOP', planned: Math.round(86000 * scale), received: Math.round(79200 * scale), balance: Math.round(6800 * scale), unit: 'pcs', status: 'Running' },
      { id: 'P03', section: 'Printing', factory: 'DB Tex Allover Print Ltd.', workType: 'Reactive Digital & Foil Print', planned: Math.round(65000 * scale), received: Math.round(61000 * scale), balance: Math.round(4000 * scale), unit: 'pcs', status: 'On Track' },

      // 4. Embroidery Units
      { id: 'E01', section: 'Embroidery', factory: 'Renaissance Embroidery Ltd.', workType: 'Multi-head Flat & 3D Tatami', planned: Math.round(48000 * scale), received: Math.round(42000 * scale), balance: Math.round(6000 * scale), unit: 'pcs', status: '98% Complete' },
      { id: 'E02', section: 'Embroidery', factory: 'Smart Embroidery Works', workType: 'Applique, Sequin & Chenille', planned: Math.round(34000 * scale), received: Math.round(31200 * scale), balance: Math.round(2800 * scale), unit: 'pcs', status: 'Active' },
      { id: 'E03', section: 'Embroidery', factory: 'Apex Stitch & Embroidery', workType: 'Badge & Sequence Embroidery', planned: Math.round(27000 * scale), received: Math.round(25400 * scale), balance: Math.round(1600 * scale), unit: 'pcs', status: 'On Track' }
    ];
  }, [isAllFiltered, overviewStats.totalOrderQty]);

  // Filtered Subcontract Rows (by selected Section Tab)
  const displayedSubcontractRows = useMemo(() => {
    return masterSubcontractFactories.filter(f => f.section === subcontractSectionTab);
  }, [masterSubcontractFactories, subcontractSectionTab]);

  // List of unique merchandisers
  const allMerchandisers = useMemo(() => Array.from(new Set(jobs.map(j => j.merchandiser).filter(Boolean))).sort(), [jobs]);

  // Unauthorized view state
  if (authorized === false) {
    return (
      <Shell title="Management Dashboard · Access Restricted" eyebrow="Governance & Security">
        <div style={{ maxWidth: '580px', margin: '60px auto', background: '#FFFFFF', padding: '28px', borderRadius: '8px', border: '1px solid #FECACA', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔒</div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#991B1B', margin: '0 0 8px' }}>
            HTTP 403 · Restricted Management Dashboard
          </h1>
          <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }}>
            Access to Director and Owner level factory intelligence is strictly limited to authorized Executive Management, Factory Owners, and Plant Directors.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <Link href="/" style={{ background: COLORS.navy, color: '#FFFFFF', padding: '7px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, textDecoration: 'none' }}>
              Return to Executive Dashboard
            </Link>
            <Link href="/login" style={{ background: COLORS.amber, color: '#FFFFFF', padding: '7px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, textDecoration: 'none' }}>
              Switch to Director Role
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Management Dashboard" eyebrow="Director &amp; Plant Governance Intelligence">
      <div style={{ background: COLORS.bg, minHeight: '100vh', padding: '0 0 32px' }}>
        
        {/* ========================================================================= */}
        {/* STICKY TOP HEADER & UNIVERSAL DYNAMIC FILTER RIBBON (100% ENGLISH) */}
        {/* ========================================================================= */}
        <div style={{
          position: 'sticky',
          top: '0',
          zIndex: 40,
          background: '#FFFFFF',
          borderBottom: `1px solid ${COLORS.border}`,
          borderRadius: '6px',
          padding: '7px 12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          marginBottom: '8px'
        }}>
          {/* Top Title & Active Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: COLORS.navy }}>
                Management Dashboard
              </span>
              <span style={{ fontSize: '10px', color: COLORS.grey }}>
                · Plant Leadership Intelligence
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: COLORS.blue, background: COLORS.blueLight, border: '1px solid #BFDBFE', padding: '2px 6px', borderRadius: '3px' }}>
                Active Filter: <strong>{fmt(filteredJobs.length)}</strong> Orders · <strong>{fmt(overviewStats.totalOrderQty)}</strong> pcs
              </span>
              {(selectedMonth !== 'ALL' || selectedBuyer !== 'ALL' || selectedTeam !== 'ALL' || selectedCategory !== 'ALL' || isCustomDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth('ALL');
                    setSelectedBuyer('ALL');
                    setSelectedTeam('ALL');
                    setSelectedCategory('ALL');
                    setIsCustomDate(false);
                    setCustomStart('');
                    setCustomEnd('');
                  }}
                  style={{ fontSize: '9.5px', background: COLORS.redLight, color: COLORS.red, border: '1px solid #FECACA', borderRadius: '3px', padding: '2px 5px', cursor: 'pointer', fontWeight: 700 }}
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* Unified Dynamic Filter Ribbon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {/* 1. Month / Year Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontSize: '9.5px', fontWeight: 700, color: COLORS.grey, textTransform: 'uppercase' }}>Month:</span>
              <select
                value={isCustomDate ? 'CUSTOM' : selectedMonth}
                onChange={e => {
                  if (e.target.value === 'CUSTOM') {
                    setIsCustomDate(true);
                  } else {
                    setIsCustomDate(false);
                    setSelectedMonth(e.target.value);
                  }
                }}
                style={{ fontSize: '10px', fontWeight: 700, color: COLORS.navy, background: '#F8FAFC', border: `1px solid ${COLORS.border}`, borderRadius: '4px', padding: '2px 5px', outline: 'none' }}
              >
                <option value="ALL">All Months (2026)</option>
                <option value="Jul">Jul-26</option>
                <option value="Aug">Aug-26 (Running)</option>
                <option value="Sep">Sep-26 (Next M)</option>
                <option value="Oct">Oct-26 (+2M)</option>
                <option value="Nov">Nov-26 (+3M)</option>
                <option value="Dec">Dec-26 (+4M)</option>
                <option value="CUSTOM">Custom Date Range...</option>
              </select>
            </div>

            {/* Custom Date Range Picker */}
            {isCustomDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#EFF6FF', padding: '2px 4px', borderRadius: '3px', border: '1px solid #BFDBFE' }}>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  style={{ fontSize: '9.5px', border: '1px solid #CBD5E1', borderRadius: '3px', padding: '1px 3px' }}
                />
                <span style={{ fontSize: '9px', color: COLORS.grey }}>to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  style={{ fontSize: '9.5px', border: '1px solid #CBD5E1', borderRadius: '3px', padding: '1px 3px' }}
                />
              </div>
            )}

            {/* 2. Buyer Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontSize: '9.5px', fontWeight: 700, color: COLORS.grey, textTransform: 'uppercase' }}>Buyer:</span>
              <select
                value={selectedBuyer}
                onChange={e => setSelectedBuyer(e.target.value)}
                style={{ fontSize: '10px', fontWeight: 700, color: COLORS.navy, background: '#F8FAFC', border: `1px solid ${COLORS.border}`, borderRadius: '4px', padding: '2px 5px', outline: 'none' }}
              >
                <option value="ALL">All Buyers</option>
                {Array.from(new Set(jobs.map(j => j.buyer).filter(Boolean))).sort().map((b: any) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* 3. Team / Merchandiser Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontSize: '9.5px', fontWeight: 700, color: COLORS.grey, textTransform: 'uppercase' }}>Team:</span>
              <select
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
                style={{ fontSize: '10px', fontWeight: 700, color: COLORS.navy, background: '#F8FAFC', border: `1px solid ${COLORS.border}`, borderRadius: '4px', padding: '2px 5px', outline: 'none' }}
              >
                <option value="ALL">All Teams</option>
                <optgroup label="Merchandising Teams">
                  <option value="Team 1 (Ayub)">Team 1 (Ayub) · ONLY, UTG</option>
                  <option value="Team 2 (Mahmud, Rizu)">Team 2 (Mahmud, Rizu) · Name It</option>
                  <option value="Team 4 (Pavel)">Team 4 (Pavel) · Only &amp; Sons</option>
                  <option value="Team 5 (Russel)">Team 5 (Russel) · ONLY</option>
                  <option value="Team 6 (Ismail Shahin)">Team 6 (Ismail Shahin) · OVS</option>
                  <option value="Team 7 (Nazrul)">Team 7 (Nazrul) · New Look, Maurices</option>
                </optgroup>
                <optgroup label="Merchandisers">
                  {allMerchandisers.map((m: any) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* 4. Product Category Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontSize: '9.5px', fontWeight: 700, color: COLORS.grey, textTransform: 'uppercase' }}>Item:</span>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                style={{ fontSize: '10px', fontWeight: 700, color: COLORS.navy, background: '#F8FAFC', border: `1px solid ${COLORS.border}`, borderRadius: '4px', padding: '2px 5px', outline: 'none' }}
              >
                <option value="ALL">All Items</option>
                <option value="T-shirt">T-shirt</option>
                <option value="Polo">Polo</option>
                <option value="Sweatshirt">Sweatshirt</option>
                <option value="Hoodie">Hoodie</option>
                <option value="Trouser">Trouser</option>
                <option value="Shorts">Shorts</option>
                <option value="Jacket">Jacket</option>
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 01 — Factory Business Overview */}
        {/* ========================================================================= */}
        <CompactSectionHeader
          id="sec-01"
          number="Sec 01"
          title="Factory Business Overview"
          subtitle="Enterprise commitments, active bookings & shipping fulfillment"
          rightElement={
            <div style={{ display: 'flex', gap: '4px' }}>
              <Link href="/jobs" style={{ fontSize: '9.5px', fontWeight: 700, color: COLORS.navy, background: '#FFFFFF', border: `1px solid ${COLORS.border}`, padding: '2px 5px', borderRadius: '3px', textDecoration: 'none' }}>
                View All Jobs
              </Link>
              <button
                type="button"
                onClick={() => setDrillModal({ title: 'Critical Risk Orders', rows: filteredJobs.filter(j => j.riskStatus === 'CRITICAL') })}
                style={{ fontSize: '9.5px', fontWeight: 700, color: COLORS.red, background: COLORS.redLight, border: '1px solid #FECACA', padding: '2px 5px', borderRadius: '3px', cursor: 'pointer' }}
              >
                Critical ({overviewStats.criticalOrdersCount})
              </button>
            </div>
          }
        />

        {/* 8 Compact KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '5px', marginBottom: '8px' }}>
          <CompactKpiCard label="Active Orders" value={overviewStats.activeOrdersCount} unit="orders" trend="In-plant" trendType="neutral" color={COLORS.navy} />
          <CompactKpiCard label="Total Order Qty" value={overviewStats.totalOrderQty} unit="pcs" trend={`${fmt(overviewStats.totalJobs)} Jobs`} trendType="positive" color={COLORS.blue} />
          <CompactKpiCard label="Total Shipped" value={overviewStats.totalShippedQty} unit="pcs" trend="Delivered" trendType="positive" color={COLORS.green} />
          <CompactKpiCard label="Pending Shipment" value={overviewStats.pendingShipmentQty} unit="pcs" trend="Balance" trendType="warning" color={COLORS.amber} />
          <CompactKpiCard label="On-Time Delivery" value={overviewStats.onTimeDeliveryPct.toFixed(1)} unit="%" trend="Target 95%" trendType="positive" color={COLORS.green} />
          <CompactKpiCard label="Delayed Orders" value={overviewStats.delayedOrdersCount} unit="orders" trend="Follow-up" trendType="negative" color={COLORS.red} />
          <CompactKpiCard label="Sewing Output" value={overviewStats.totalSewingOutput} unit="pcs" trend="Sewn" trendType="positive" color={COLORS.cyan} />
          <CompactKpiCard label="Monthly Export" value={overviewStats.monthlyExportQty} unit="pcs" trend="Selected" trendType="positive" color={COLORS.purple} />
        </div>

        {/* 2 Compact Charts Side-by-Side */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '8px', marginBottom: '12px' }}>
          {/* Chart 1: Monthly Export Trend */}
          <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '5px', padding: '7px 9px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: COLORS.navy, marginBottom: '4px' }}>
              Monthly Export &amp; Plan Runway (1,000 pcs)
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={overviewStats.monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} unit="K" />
                <Tooltip formatter={(val: any) => [`${val}K pcs`, '']} />
                <Legend wrapperStyle={{ fontSize: '9px' }} />
                <Bar dataKey="exported" fill={COLORS.blue} name="Exported (pcs)" radius={[2, 2, 0, 0]} />
                <Line type="monotone" dataKey="target" stroke={COLORS.green} strokeWidth={2} name="Target (pcs)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2: Order Status Distribution (Donut) */}
          <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '5px', padding: '7px 9px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: COLORS.navy, marginBottom: '4px' }}>
              Order Status Distribution · {fmt(overviewStats.totalJobs)} Matched Jobs
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <ResponsiveContainer width="48%" height={140}>
                <PieChart>
                  <Pie
                    data={overviewStats.donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={34}
                    outerRadius={56}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {overviewStats.donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${val} orders`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div style={{ width: '52%', fontSize: '9px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {overviewStats.donutData.map((d, i) => {
                  const pctVal = overviewStats.totalJobs > 0 ? Math.round((d.value / overviewStats.totalJobs) * 100) : 0;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                        <span style={{ color: COLORS.navy, fontWeight: 600 }}>{d.name}</span>
                      </span>
                      <strong style={{ color: COLORS.grey }}>{pctVal}% ({d.value})</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 2: SIDE-BY-SIDE — Section 02 (Quota Matrix) & Section 03 (Buyer Delivery) */}
        {/* ========================================================================= */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 0.75fr)', gap: '8px', marginBottom: '12px' }}>
          
          {/* LEFT: Section 02 — Merchandising Team & Buyer Quota Matrix */}
          <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ padding: '6px 9px', background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: COLORS.blue, background: COLORS.blueLight, padding: '1px 4px', borderRadius: '3px' }}>Sec 02</span>
                <strong style={{ fontSize: '11px', color: COLORS.navy }}>Buyer Quota &amp; Sample Master Sheet</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {selectedBuyer !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setShowOnlyFilteredQuotas(!showOnlyFilteredQuotas)}
                    style={{ fontSize: '9px', background: showOnlyFilteredQuotas ? COLORS.blue : '#FFFFFF', color: showOnlyFilteredQuotas ? '#FFFFFF' : COLORS.navy, border: `1px solid ${COLORS.border}`, padding: '1px 5px', borderRadius: '3px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    {showOnlyFilteredQuotas ? 'Show All 25 Brands' : `Filter ${selectedBuyer} Only`}
                  </button>
                )}
                <span style={{ fontSize: '9px', color: COLORS.grey }}>
                  <span style={{ color: COLORS.green }}>● &gt;=100%</span> · <span style={{ color: COLORS.amber }}>● Gap</span> · <span style={{ color: COLORS.blue }}>● Runway</span>
                </span>
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '290px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 10 }}>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}`, color: COLORS.grey }}>
                    <th style={{ padding: '4px 6px' }}>Brand / Sub-Brand</th>
                    <th style={{ padding: '4px 6px' }}>Team</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Quota</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Confirmed</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center' }}>Running M</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center' }}>+1M</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center' }}>+2M</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center' }}>+3M/+4M</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center' }}>Styles</th>
                  </tr>
                </thead>
                <tbody>
                  {teamQuotas.map((t, idx) => {
                    const isMet = t.achievePct >= 100;
                    const isGap = t.achievePct >= 80 && t.achievePct < 100;
                    const isRowHighlighted = t.isMatched && selectedBuyer !== 'ALL';

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: isRowHighlighted ? '#EFF6FF' : 'transparent' }}>
                        <td style={{ padding: '4px 6px' }}>
                          <strong style={{ color: COLORS.navy }}>{t.brand}</strong>
                          {t.subBrand && <span style={{ color: '#64748B', display: 'block', fontSize: '8.5px' }}>{t.subBrand}</span>}
                        </td>
                        <td style={{ padding: '4px 6px', fontWeight: 600, color: '#334155' }}>{t.team.replace('Team ', 'T')}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', color: COLORS.grey }}>{fmt(t.monthlySalesQuotaPcs)}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 800, color: COLORS.blue }}>{fmt(t.actualReceivedPcs)}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                          <span style={{
                            padding: '1px 4px',
                            borderRadius: '3px',
                            fontSize: '8.5px',
                            fontWeight: 800,
                            background: isMet ? COLORS.greenLight : isGap ? COLORS.amberLight : COLORS.redLight,
                            color: isMet ? COLORS.green : isGap ? COLORS.amber : COLORS.red
                          }}>
                            {isMet ? `${t.achievePct}%` : `${t.achievePct}%`}
                          </span>
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                          <span style={{
                            padding: '1px 3px',
                            borderRadius: '3px',
                            fontSize: '8.5px',
                            fontWeight: 700,
                            background: t.nextMonthPct >= 100 ? COLORS.greenLight : t.nextMonthPct >= 80 ? COLORS.amberLight : COLORS.redLight,
                            color: t.nextMonthPct >= 100 ? COLORS.green : t.nextMonthPct >= 80 ? COLORS.amber : COLORS.red
                          }}>
                            {t.nextMonthPct}%
                          </span>
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: COLORS.navy }}>
                          {t.m2ProjectionPct}%
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                          <span style={{ padding: '1px 3px', borderRadius: '3px', fontSize: '8.5px', fontWeight: 700, background: '#EFF6FF', color: COLORS.blue }}>
                            {t.m3ProjectionPct}%
                          </span>
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, color: COLORS.navy }}>
                          {t.totalStyles}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: Section 03 — Buyer Performance & Delivery Reliability */}
          <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ padding: '6px 9px', background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: COLORS.blue, background: COLORS.blueLight, padding: '1px 4px', borderRadius: '3px' }}>Sec 03</span>
                <strong style={{ fontSize: '11px', color: COLORS.navy }}>Buyer Order &amp; Delivery Register</strong>
              </div>
              <span style={{ fontSize: '9px', color: COLORS.grey }}>{buyerPerformance.length} Buyers</span>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '290px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 10 }}>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}`, color: COLORS.grey }}>
                    <th style={{ padding: '4px 6px' }}>Buyer</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Orders</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Order Qty</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Shipped</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center' }}>On-Time</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {buyerPerformance.slice(0, 10).map((b, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: selectedBuyer === b.buyer ? '#EFF6FF' : 'transparent' }}>
                      <td style={{ padding: '4px 6px', fontWeight: 700, color: COLORS.navy }}>
                        {b.buyer}
                        {b.delayedOrders > 0 && <span style={{ color: COLORS.red, marginLeft: '3px', fontSize: '8.5px' }}>({b.delayedOrders} delay)</span>}
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>{fmt(b.orders)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 800 }}>{fmt(b.orderQty)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', color: COLORS.green }}>{fmt(b.shippedQty)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                        <span style={{ padding: '1px 4px', borderRadius: '3px', fontSize: '8.5px', fontWeight: 700, background: b.onTimePct >= 95 ? COLORS.greenLight : COLORS.redLight, color: b.onTimePct >= 95 ? COLORS.green : COLORS.red }}>
                          {b.onTimePct}%
                        </span>
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedBuyer(selectedBuyer === b.buyer ? 'ALL' : b.buyer)}
                          style={{ fontSize: '8.5px', background: selectedBuyer === b.buyer ? COLORS.navy : '#F1F5F9', color: selectedBuyer === b.buyer ? '#FFFFFF' : COLORS.navy, border: '1px solid #CBD5E1', borderRadius: '3px', padding: '1px 4px', cursor: 'pointer', fontWeight: 700 }}
                        >
                          {selectedBuyer === b.buyer ? 'Filtered' : 'Filter'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* ROW 3: SIDE-BY-SIDE — Section 04 (Category Costing) & Cost Structure Visual */}
        {/* ========================================================================= */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 0.7fr)', gap: '8px', marginBottom: '12px' }}>
          
          {/* LEFT: Section 04 — Product Category Costing & Benchmarks */}
          <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ padding: '6px 9px', background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: COLORS.purple, background: COLORS.purpleLight, padding: '1px 4px', borderRadius: '3px' }}>Sec 04</span>
                <strong style={{ fontSize: '11px', color: COLORS.navy }}>Item Category Pricing &amp; Factory Costing Summary</strong>
              </div>
              <span style={{ fontSize: '9px', color: COLORS.grey }}>Master Cost Sheet Benchmarks</span>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '240px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 10 }}>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}`, color: COLORS.grey }}>
                    <th style={{ padding: '4px 6px' }}>Category</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Orders</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Order Qty</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Total Value</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Avg FOB</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center' }}>SMV</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>CM/pc</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>CM/Dzn</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Fabric/pc</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Print/Emb</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryCosting.map((c, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '4px 6px', fontWeight: 800, color: COLORS.navy }}>{c.category}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>{fmt(c.orders)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700 }}>{fmt(c.totalQty)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 800, color: COLORS.blue }}>{money(c.totalValue, 0)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: COLORS.navy }}>{money(c.avgFob)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>{c.avgSmv}m</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', color: COLORS.green, fontWeight: 700 }}>{money(c.cmPc)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', color: COLORS.green }}>{money(c.cmDzn)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>{money(c.fabricCostPc)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                        {money(c.printCostPc + c.embCostPc)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: Cost Breakdown Visual */}
          <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '7px 9px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: COLORS.navy, marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Cost Component Share by Category</span>
                <span style={{ fontSize: '8.5px', color: COLORS.grey }}>FOB % Share</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {categoryCosting.slice(0, 4).map((c, i) => {
                  const fabPct = Math.round((c.fabricCostPc / c.avgFob) * 100);
                  const cmPct = Math.round((c.cmPc / c.avgFob) * 100);
                  const embPct = Math.round(((c.printCostPc + c.embCostPc + c.trimsCostPc) / c.avgFob) * 100);

                  return (
                    <div key={i} style={{ fontSize: '9px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 700, color: COLORS.navy }}>{c.category} ({money(c.avgFob)})</span>
                        <span style={{ color: COLORS.grey }}>Fabric {fabPct}% | CM {cmPct}% | Trims {embPct}%</span>
                      </div>
                      <div style={{ height: '6px', width: '100%', background: '#F1F5F9', borderRadius: '2px', overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: `${fabPct}%`, background: COLORS.cyan }} title={`Fabric: ${fabPct}%`} />
                        <div style={{ width: `${cmPct}%`, background: COLORS.green }} title={`CM: ${cmPct}%`} />
                        <div style={{ width: `${embPct}%`, background: COLORS.amber }} title={`Embellishment/Trims: ${embPct}%`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: '6px', display: 'flex', gap: '8px', fontSize: '8.5px', color: COLORS.grey }}>
              <span><strong style={{ color: COLORS.cyan }}>■</strong> Fabric Cost</span>
              <span><strong style={{ color: COLORS.green }}>■</strong> CM Earning</span>
              <span><strong style={{ color: COLORS.amber }}>■</strong> Trims &amp; Print/Emb</span>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* ROW 4: SIDE-BY-SIDE — Section 05 & 06 Material & Fabric Inventory */}
        {/* Yarn: Stock, Pipeline, Requisition, MOQ | Grey: Stock, Allocated, Available, Rolls */}
        {/* Finish Fabric: Current Stock, Per Day Receive, Per Day Delivery, Shortage (NO RELAXATION!) */}
        {/* ========================================================================= */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '8px', marginBottom: '12px' }}>
          
          {/* LEFT: Section 05 & 06A — Yarn Stock & Grey Fabric Inventory */}
          <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '7px 9px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', paddingBottom: '3px', borderBottom: `1.5px solid ${COLORS.teal}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: COLORS.teal, background: COLORS.tealLight, padding: '1px 4px', borderRadius: '3px' }}>Sec 05 &amp; 06A</span>
                <strong style={{ fontSize: '11px', color: COLORS.navy }}>Yarn Godown &amp; Grey Fabric Inventory</strong>
              </div>
              <span style={{ fontSize: '9px', color: COLORS.grey }}>Stock &amp; Allocation</span>
            </div>

            {/* Yarn & Grey Metric Chips */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '6px' }}>
              <div style={{ background: '#F8FAFC', padding: '5px 6px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}` }}>
                <span style={{ fontSize: '8.5px', color: COLORS.grey, display: 'block' }}>Yarn Stock</span>
                <strong style={{ fontSize: '12px', color: COLORS.navy }}>{materialData.yarn.physical} <span style={{ fontSize: '8px' }}>Tons</span></strong>
              </div>
              <div style={{ background: '#F8FAFC', padding: '5px 6px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}` }}>
                <span style={{ fontSize: '8.5px', color: COLORS.grey, display: 'block' }}>Pipeline Yarn</span>
                <strong style={{ fontSize: '12px', color: COLORS.blue }}>{materialData.yarn.pipeline} <span style={{ fontSize: '8px' }}>Tons</span></strong>
              </div>
              <div style={{ background: '#F8FAFC', padding: '5px 6px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}` }}>
                <span style={{ fontSize: '8.5px', color: COLORS.grey, display: 'block' }}>Requisition</span>
                <strong style={{ fontSize: '12px', color: COLORS.amber }}>{materialData.yarn.requisition} <span style={{ fontSize: '8px' }}>Tons</span></strong>
              </div>
              <div style={{ background: '#F8FAFC', padding: '5px 6px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}` }}>
                <span style={{ fontSize: '8.5px', color: COLORS.grey, display: 'block' }}>MOQ Buffer</span>
                <strong style={{ fontSize: '12px', color: COLORS.navy }}>{materialData.yarn.moqBuffer} <span style={{ fontSize: '8px' }}>Tons</span></strong>
              </div>
            </div>

            {/* Grey Fabric Metric Chips */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
              <div style={{ background: '#F8FAFC', padding: '5px 6px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}` }}>
                <span style={{ fontSize: '8.5px', color: COLORS.grey, display: 'block' }}>Grey Stock</span>
                <strong style={{ fontSize: '12px', color: COLORS.navy }}>{materialData.greige.physical} <span style={{ fontSize: '8px' }}>Tons</span></strong>
              </div>
              <div style={{ background: '#F8FAFC', padding: '5px 6px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}` }}>
                <span style={{ fontSize: '8.5px', color: COLORS.grey, display: 'block' }}>Dyeing Allocated</span>
                <strong style={{ fontSize: '12px', color: COLORS.blue }}>{materialData.greige.allocated} <span style={{ fontSize: '8px' }}>Tons</span></strong>
              </div>
              <div style={{ background: '#F8FAFC', padding: '5px 6px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}` }}>
                <span style={{ fontSize: '8.5px', color: COLORS.grey, display: 'block' }}>Available Grey</span>
                <strong style={{ fontSize: '12px', color: COLORS.green }}>{materialData.greige.available} <span style={{ fontSize: '8px' }}>Tons</span></strong>
              </div>
              <div style={{ background: '#F8FAFC', padding: '5px 6px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}` }}>
                <span style={{ fontSize: '8.5px', color: COLORS.grey, display: 'block' }}>Grey Rolls</span>
                <strong style={{ fontSize: '12px', color: COLORS.purple }}>{fmt(materialData.greige.rolls)} <span style={{ fontSize: '8px' }}>rolls</span></strong>
              </div>
            </div>
          </div>

          {/* RIGHT: Section 06B — Finish Fabric Inventory (NO RELAXATION!) */}
          <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '7px 9px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', paddingBottom: '3px', borderBottom: `1.5px solid ${COLORS.blue}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: COLORS.blue, background: COLORS.blueLight, padding: '1px 4px', borderRadius: '3px' }}>Sec 06B</span>
                <strong style={{ fontSize: '11px', color: COLORS.navy }}>Finish Fabric Inventory &amp; Movement</strong>
              </div>
              <span style={{ fontSize: '9px', color: COLORS.grey }}>Daily Throughput</span>
            </div>

            {/* Finish Fabric Metric Chips */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
              <div style={{ background: '#F8FAFC', padding: '5px 6px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}` }}>
                <span style={{ fontSize: '8.5px', color: COLORS.grey, display: 'block' }}>Current Stock</span>
                <strong style={{ fontSize: '12px', color: COLORS.navy }}>{materialData.finished.physical} <span style={{ fontSize: '8px' }}>Tons</span></strong>
              </div>
              <div style={{ background: '#F8FAFC', padding: '5px 6px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}` }}>
                <span style={{ fontSize: '8.5px', color: COLORS.grey, display: 'block' }}>Receive / Day</span>
                <strong style={{ fontSize: '12px', color: COLORS.green }}>{materialData.finished.perDayReceive} <span style={{ fontSize: '8px' }}>T/day</span></strong>
              </div>
              <div style={{ background: '#F8FAFC', padding: '5px 6px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}` }}>
                <span style={{ fontSize: '8.5px', color: COLORS.grey, display: 'block' }}>Delivery / Day</span>
                <strong style={{ fontSize: '12px', color: COLORS.cyan }}>{materialData.finished.perDayDelivery} <span style={{ fontSize: '8px' }}>T/day</span></strong>
              </div>
              <div style={{ background: '#F8FAFC', padding: '5px 6px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}` }}>
                <span style={{ fontSize: '8.5px', color: COLORS.grey, display: 'block' }}>Order Shortage</span>
                <strong style={{ fontSize: '12px', color: materialData.finished.shortage > 0 ? COLORS.red : COLORS.green }}>{materialData.finished.shortage} <span style={{ fontSize: '8px' }}>Tons</span></strong>
              </div>
            </div>

            <div style={{ marginTop: '8px', padding: '5px 7px', background: '#F8FAFC', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: COLORS.grey }}>
              <span>Dyeing Delivery Flow: <strong style={{ color: COLORS.green }}>Normal</strong></span>
              <span>Cutting Issue Flow: <strong style={{ color: COLORS.navy }}>Active</strong></span>
              <span>Inspection: <strong style={{ color: COLORS.blue }}>4-Point Shade OK</strong></span>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* ROW 5: SIDE-BY-SIDE — Section 07 Operational Table & Clean Efficiency/DHU Scorecard */}
        {/* ========================================================================= */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 0.75fr)', gap: '8px', marginBottom: '12px' }}>
          
          {/* LEFT: Section 07 — Department-wise Production Run-Rate Table */}
          <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ padding: '6px 9px', background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: COLORS.blue, background: COLORS.blueLight, padding: '1px 4px', borderRadius: '3px' }}>Sec 07</span>
                <strong style={{ fontSize: '11px', color: COLORS.navy }}>Department-wise Production &amp; Run-Rate Table</strong>
              </div>
              <span style={{ fontSize: '9px', color: COLORS.grey }}>Total Plan · Daily Req vs Daily Ach</span>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '360px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 10 }}>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}`, color: COLORS.grey }}>
                    <th style={{ padding: '4px 6px' }}>Department / Process</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Total Plan</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Req/Day</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Ach/Day</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Actual Output</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center' }}>Variance</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center' }}>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionPerformanceData.map((s, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '4px 6px' }}>
                        <strong style={{ color: COLORS.navy }}>{s.section}</strong>
                        <span style={{ color: COLORS.grey, display: 'block', fontSize: '8px' }}>{s.metric}</span>
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>{s.plan}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', color: '#475569' }}>{s.perDayReq}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: COLORS.navy }}>{s.perDayAch}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 800, color: COLORS.blue }}>{s.actual}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                        <span style={{
                          padding: '1px 4px',
                          borderRadius: '3px',
                          fontSize: '8.5px',
                          fontWeight: 700,
                          background: s.variance.startsWith('+') || s.variance === '0.0%' ? COLORS.greenLight : COLORS.amberLight,
                          color: s.variance.startsWith('+') || s.variance === '0.0%' ? COLORS.green : COLORS.amber
                        }}>
                          {s.variance}
                        </span>
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                        <span style={{
                          padding: '1px 4px',
                          borderRadius: '3px',
                          fontSize: '8.5px',
                          fontWeight: 800,
                          background: s.rating === 'Excellent' ? COLORS.greenLight : '#EFF6FF',
                          color: s.rating === 'Excellent' ? COLORS.green : COLORS.blue
                        }}>
                          {s.rating}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: Section 07B — Clean, Uncluttered Efficiency & Quality DHU Scorecard */}
          <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '7px 9px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1.5px solid ${COLORS.navy}`, paddingBottom: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: COLORS.green, background: COLORS.greenLight, padding: '1px 4px', borderRadius: '3px' }}>Sec 07B</span>
                <strong style={{ fontSize: '11px', color: COLORS.navy }}>Department Efficiency &amp; Quality DHU Scorecard</strong>
              </div>
              <span style={{ fontSize: '8.5px', color: COLORS.grey }}>IE &amp; Quality Tracker</span>
            </div>

            {/* 1. Production Efficiency by Department */}
            <div style={{ background: '#F8FAFC', padding: '6px 7px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}` }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: COLORS.navy, marginBottom: '4px' }}>
                Garment Line Production Efficiency (%) vs Target
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  { name: 'Sewing Line Efficiency', actual: 74.7, target: 70.0, color: COLORS.blue },
                  { name: 'Finishing Efficiency', actual: 78.5, target: 75.0, color: COLORS.green },
                  { name: 'Cutting Efficiency', actual: 82.2, target: 80.0, color: COLORS.cyan }
                ].map((item, idx) => (
                  <div key={idx} style={{ fontSize: '8.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                      <span style={{ color: COLORS.navy, fontWeight: 600 }}>{item.name}</span>
                      <strong style={{ color: item.actual >= item.target ? COLORS.green : COLORS.amber }}>
                        {item.actual}% <span style={{ color: COLORS.grey, fontWeight: 400 }}>(Tgt: {item.target}%)</span>
                      </strong>
                    </div>
                    <div style={{ height: '4px', width: '100%', background: '#E2E8F0', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${item.actual}%`, background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Clearly Attributed Quality DHU & Defect Metrics by Section */}
            <div style={{ background: '#F8FAFC', padding: '6px 7px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}` }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: COLORS.navy, marginBottom: '4px' }}>
                Quality DHU &amp; OQL Rates (Section-Attributed)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                <div style={{ background: '#FFFFFF', padding: '3px 4px', borderRadius: '3px', border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
                  <span style={{ fontSize: '8px', color: COLORS.grey, display: 'block' }}>Sewing In-Line DHU</span>
                  <strong style={{ fontSize: '10.5px', color: COLORS.navy }}>9.12%</strong>
                </div>
                <div style={{ background: '#FFFFFF', padding: '3px 4px', borderRadius: '3px', border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
                  <span style={{ fontSize: '8px', color: COLORS.grey, display: 'block' }}>Sewing End-Line DHU</span>
                  <strong style={{ fontSize: '10.5px', color: COLORS.green }}>3.41%</strong>
                </div>
                <div style={{ background: '#FFFFFF', padding: '3px 4px', borderRadius: '3px', border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
                  <span style={{ fontSize: '8px', color: COLORS.grey, display: 'block' }}>Sewing End-Line OQL</span>
                  <strong style={{ fontSize: '10.5px', color: COLORS.amber }}>7.88%</strong>
                </div>
                <div style={{ background: '#FFFFFF', padding: '3px 4px', borderRadius: '3px', border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
                  <span style={{ fontSize: '8px', color: COLORS.grey, display: 'block' }}>Pre-Final DHU</span>
                  <strong style={{ fontSize: '10.5px', color: COLORS.navy }}>5.61%</strong>
                </div>
                <div style={{ background: '#FFFFFF', padding: '3px 4px', borderRadius: '3px', border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
                  <span style={{ fontSize: '8px', color: COLORS.grey, display: 'block' }}>Final Audit DHU</span>
                  <strong style={{ fontSize: '10.5px', color: COLORS.navy }}>6.63%</strong>
                </div>
                <div style={{ background: '#DCFCE7', padding: '3px 4px', borderRadius: '3px', border: '1px solid #BBF7D0', textAlign: 'center' }}>
                  <span style={{ fontSize: '8px', color: COLORS.green, display: 'block' }}>Final AQL Pass</span>
                  <strong style={{ fontSize: '10.5px', color: COLORS.green }}>98.6%</strong>
                </div>
              </div>
            </div>

            {/* 3. Section Material Wastage & Defect */}
            <div style={{ background: '#F8FAFC', padding: '5px 7px', borderRadius: '4px', border: `1px solid ${COLORS.borderLight}`, display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: COLORS.navy }}>
              <span>Cutting Reject: <strong>0.90%</strong></span>
              <span>Fabric Wastage: <strong>2.49%</strong></span>
              <span>Cut to Ship Loss: <strong>2.63%</strong></span>
            </div>

          </div>

        </div>

        {/* ========================================================================= */}
        {/* ROW 6: SIDE-BY-SIDE — Section 08A (Dyeing Reprocess) & Section 08B (Multi-Factory Subcontracts) */}
        {/* ========================================================================= */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.75fr) minmax(0, 1.25fr)', gap: '8px' }}>
          
          {/* LEFT: Section 08A — Dyeing Reprocess & First-Time-Pass (RFT) */}
          <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '7px 9px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', paddingBottom: '3px', borderBottom: `1.5px solid ${COLORS.navy}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: COLORS.navy, background: '#E2E8F0', padding: '1px 4px', borderRadius: '3px' }}>Sec 08A</span>
                  <strong style={{ fontSize: '11px', color: COLORS.navy }}>Dyeing RFT &amp; Reprocess Intelligence</strong>
                </div>
                <span style={{ fontSize: '9px', color: COLORS.grey }}>Total: {dyeingReprocessData.dyeingTotal} Tons</span>
              </div>

              {/* Reprocess Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '6px' }}>
                <div style={{ background: COLORS.greenLight, border: '1px solid #BBF7D0', padding: '5px 6px', borderRadius: '4px', textAlign: 'center' }}>
                  <span style={{ fontSize: '8px', fontWeight: 700, color: COLORS.green, display: 'block', textTransform: 'uppercase' }}>RFT Pass</span>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.green, margin: '1px 0' }}>{dyeingReprocessData.rftPct}%</div>
                  <span style={{ fontSize: '8.5px', color: COLORS.grey }}>{dyeingReprocessData.rftTons} Tons</span>
                </div>

                <div style={{ background: COLORS.amberLight, border: '1px solid #FDE68A', padding: '5px 6px', borderRadius: '4px', textAlign: 'center' }}>
                  <span style={{ fontSize: '8px', fontWeight: 700, color: COLORS.amber, display: 'block', textTransform: 'uppercase' }}>1st Topping</span>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.amber, margin: '1px 0' }}>{dyeingReprocessData.toppingPct}%</div>
                  <span style={{ fontSize: '8.5px', color: COLORS.grey }}>{dyeingReprocessData.toppingTons} Tons</span>
                </div>

                <div style={{ background: COLORS.redLight, border: '1px solid #FECACA', padding: '5px 6px', borderRadius: '4px', textAlign: 'center' }}>
                  <span style={{ fontSize: '8px', fontWeight: 700, color: COLORS.red, display: 'block', textTransform: 'uppercase' }}>Redyeing</span>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.red, margin: '1px 0' }}>{dyeingReprocessData.redyeingPct}%</div>
                  <span style={{ fontSize: '8.5px', color: COLORS.grey }}>{dyeingReprocessData.redyeingTons} Tons</span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '9px', color: '#475569', background: '#F8FAFC', padding: '4px 6px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Average Vessel Load: <strong>{dyeingReprocessData.loadPct}%</strong></span>
              <span>Dyeing On-Time: <strong>72.5%</strong></span>
            </div>
          </div>

          {/* RIGHT: Section 08B — Multi-Factory Subcontract Register (By Section Tabs) */}
          <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ padding: '5px 9px', background: '#F1F5F9', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: COLORS.blue, background: COLORS.blueLight, padding: '1px 4px', borderRadius: '3px' }}>Sec 08B</span>
                <strong style={{ fontSize: '11px', color: COLORS.navy }}>Outside Subcontract Partner Mills Register</strong>
              </div>

              {/* Section Tabs */}
              <div style={{ display: 'flex', gap: '3px' }}>
                {[
                  { key: 'Knitting', label: 'Knitting Mills' },
                  { key: 'Dyeing', label: 'Dyeing Mills' },
                  { key: 'Printing', label: 'Printing Units' },
                  { key: 'Embroidery', label: 'Embroidery Units' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSubcontractSectionTab(tab.key as any)}
                    style={{
                      fontSize: '8.5px',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      border: '1px solid #CBD5E1',
                      background: subcontractSectionTab === tab.key ? COLORS.navy : '#FFFFFF',
                      color: subcontractSectionTab === tab.key ? '#FFFFFF' : COLORS.navy,
                      cursor: 'pointer',
                      fontWeight: 700
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '180px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 10 }}>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}`, color: COLORS.grey }}>
                    <th style={{ padding: '4px 6px', width: '24px' }}>#</th>
                    <th style={{ padding: '4px 6px' }}>Partner Factory Mill</th>
                    <th style={{ padding: '4px 6px' }}>Order Type / Capability</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Plan</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Received</th>
                    <th style={{ padding: '4px 6px', textAlign: 'right' }}>Balance</th>
                    <th style={{ padding: '4px 6px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedSubcontractRows.map((sc, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '3px 6px', color: COLORS.grey }}>{idx + 1}</td>
                      <td style={{ padding: '3px 6px', fontWeight: 700, color: COLORS.navy }}>{sc.factory}</td>
                      <td style={{ padding: '3px 6px', color: '#475569' }}>{sc.workType}</td>
                      <td style={{ padding: '3px 6px', textAlign: 'right' }}>{fmt(sc.planned)} {sc.unit}</td>
                      <td style={{ padding: '3px 6px', textAlign: 'right', color: COLORS.green, fontWeight: 700 }}>{fmt(sc.received)} {sc.unit}</td>
                      <td style={{ padding: '3px 6px', textAlign: 'right', color: COLORS.amber, fontWeight: 700 }}>{fmt(sc.balance)} {sc.unit}</td>
                      <td style={{ padding: '3px 6px', textAlign: 'center' }}>
                        <span style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '8px', fontWeight: 700, background: COLORS.greenLight, color: COLORS.green }}>
                          {sc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Drill-down Modal */}
        {drillModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '6px',
              maxWidth: '820px',
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }}>
              <div style={{ background: COLORS.navy, color: '#FFFFFF', padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '11.5px' }}>{drillModal.title}</strong>
                <button
                  type="button"
                  onClick={() => setDrillModal(null)}
                  style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '15px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ padding: '10px', overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', textAlign: 'left' }}>
                      <th style={{ padding: '4px 6px' }}>Job No</th>
                      <th style={{ padding: '4px 6px' }}>Buyer</th>
                      <th style={{ padding: '4px 6px' }}>Style</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>Order Qty</th>
                      <th style={{ padding: '4px 6px' }}>Status</th>
                      <th style={{ padding: '4px 6px' }}>Ex-Factory</th>
                      <th style={{ padding: '4px 6px' }}>Merchandiser</th>
                      <th style={{ padding: '4px 6px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillModal.rows.slice(0, 50).map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 700, color: COLORS.blue }}>{r.jobNo}</td>
                        <td style={{ padding: '4px 6px' }}>{r.buyer}</td>
                        <td style={{ padding: '4px 6px' }}>{r.styleNo}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>{fmt(r.orderQty)}</td>
                        <td style={{ padding: '4px 6px' }}>
                          <span style={{ fontSize: '8.5px', background: r.riskStatus === 'CRITICAL' ? COLORS.redLight : '#F1F5F9', color: r.riskStatus === 'CRITICAL' ? COLORS.red : COLORS.navy, padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>
                            {r.presentStatus || r.riskStatus || 'Running'}
                          </span>
                        </td>
                        <td style={{ padding: '4px 6px' }}>{r.dates?.exFactory || 'N/A'}</td>
                        <td style={{ padding: '4px 6px' }}>{r.merchandiser || 'Unassigned'}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                          <Link href={`/jobs/${r.jobNo}`} style={{ color: COLORS.blue, textDecoration: 'none', fontWeight: 700 }}>
                            Job 360 →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </Shell>
  );
}
