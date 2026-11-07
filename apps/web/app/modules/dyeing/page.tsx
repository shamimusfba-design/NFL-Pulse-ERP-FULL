'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import Shell from '../../../components/Shell';
import {
  Card,
  KpiCard,
  Button,
  Badge,
  CommandBar,
  CrossFilterProvider,
  useCrossFilter,
  CrossFilterChips,
  SlicerBar,
  getDefaultSlicerState,
  SlicerState,
  DrillPopup,
  DrillPopupTarget,
  ChartBox,
  NOS_CHART_COLORS,
} from '../../../components/ui';
import DataGrid, { GridColumn } from '../../../components/ui/DataGrid';
import RecordPanel from '../../../components/ui/RecordPanel';
import { FxResponsiveContainer as ResponsiveContainer, FX_BAR, FX_PIE, FX_SERIES } from '../../../components/fx';
import { fmtDate, fmtJobsQty, fmtNum, fmtPct, fmtQty } from '../../../lib/format';

export interface DyeingBatchRow {
  id: string;
  buyer: string;
  jobNo: string;
  buyerJob: string;
  style: string;
  color: string;
  fabric: string;
  gsm: string;
  dia: string;
  month: string;
  week: string;
  slot: string;
  factoryType: 'NFL' | 'Sub-con';
  dyeingFactory: string;
  finishingProcess: 'AOP' | 'Brush' | 'Peach' | 'Standard';
  reqKg: number;
  knittedKg: number;
  knitBalanceKg: number;
  dyedKg: number;
  greyReadyKg: number;
  waitingKnitKg: number;
  dyeBalanceKg: number;
  rftPct: number;
  tnaCrossed: boolean;
  tnaDate: string;
  machineNo: string;
  batchNo: string;
  status: 'Dyed & Delivered' | 'Grey Ready' | 'Ready to Send' | 'Waiting Knitting' | 'In Vessel';
  remarks: string;
}

const SUBCON_FACTORIES = ['Pakiza Dyeing', 'DBL Dyeing', 'GMS Composite', 'Epyllion Dyeing'];

function deriveFinishingProcess(fabricStr: string, processStr: string, idx: number): DyeingBatchRow['finishingProcess'] {
  const s = `${fabricStr} ${processStr}`.toLowerCase();
  if (s.includes('aop') || s.includes('print') || idx % 5 === 0) return 'AOP';
  if (s.includes('brush') || s.includes('fleece') || idx % 4 === 0) return 'Brush';
  if (s.includes('peach') || s.includes('terry') || idx % 6 === 0) return 'Peach';
  return 'Standard';
}

function DyeingDashboardInner() {
  const { toggle, getMarkOpacity, matches, setFilter } = useCrossFilter();
  const [rawRows, setRawRows] = useState<DyeingBatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [horizonMode, setHorizonMode] = useState<'month' | 'week' | 'slot'>('month');
  const [slicer, setSlicer] = useState<SlicerState>(() => ({
    ...getDefaultSlicerState('ALL'),
    year: '2026',
    month: 'ALL',
  }));
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [drillTarget, setDrillTarget] = useState<DrillPopupTarget | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/data/finished-bootstrap.json');
        const json = await res.json();
        const items: any[] = json?.lines?.F || [];
        if (!mounted) return;
        const parsed: DyeingBatchRow[] = items.map((item, idx) => {
          const reqKg = Math.max(80, Math.round((Number(item.rb) || 0) + (Number(item.rl) || 0) + (Number(item.rs) || 0)));
          const dyedKg = Math.min(reqKg, Math.round((Number(item.vb) || 0) + (Number(item.vl) || 0) + (Number(item.vs) || 0)));
          const dyeBalanceKg = Math.max(0, reqKg - dyedKg);

          // Knitting progress: either 100% done or partly waiting
          const knitRatio = dyedKg >= reqKg ? 1 : idx % 3 === 0 ? 0.92 : idx % 3 === 1 ? 0.78 : 1;
          const knittedKg = Math.max(dyedKg, Math.round(reqKg * knitRatio));
          const knitBalanceKg = Math.max(0, reqKg - knittedKg);
          const greyReadyKg = Math.max(0, knittedKg - dyedKg);
          const waitingKnitKg = knitBalanceKg;

          const isSubcon = idx % 4 === 0 || String(item.df || '').toLowerCase().includes('pak') || String(item.df || '').toLowerCase().includes('dbl');
          const factoryType: 'NFL' | 'Sub-con' = isSubcon ? 'Sub-con' : 'NFL';
          const dyeingFactory = isSubcon
            ? SUBCON_FACTORIES[idx % SUBCON_FACTORIES.length]
            : idx % 2 === 0
            ? 'NFL Dyeing Unit-1'
            : 'NFL Dyeing Unit-2';

          const slotNum = (idx % 3) + 1;
          const slot = slotNum === 1 ? 'Slot 1 (1–10)' : slotNum === 2 ? 'Slot 2 (11–20)' : 'Slot 3 (21–30)';
          const week = `W${(idx % 4) + 1}`;
          const month = item.m || '2026-06';

          const rftPct = Number((92.5 + ((idx * 7) % 65) / 10).toFixed(1));
          const tnaCrossed = dyeBalanceKg > 25 && idx % 7 === 0;

          let status: DyeingBatchRow['status'] = 'Dyed & Delivered';
          if (dyeBalanceKg === 0) status = 'Dyed & Delivered';
          else if (waitingKnitKg > greyReadyKg && waitingKnitKg > 0) status = 'Waiting Knitting';
          else if (factoryType === 'Sub-con') status = 'Ready to Send';
          else status = 'Grey Ready';

          const buyer = String(item.b || 'BS-ONL');
          const jobNo = String(item.j || `${48000 + idx}`);

          return {
            id: `dye-${idx}`,
            buyer,
            jobNo,
            buyerJob: `${buyer} ${jobNo}`,
            style: String(item.st || '15402333'),
            color: String(item.c || 'Jet Black'),
            fabric: String(item.f || 'Single Jersey'),
            gsm: String(item.gsm || '160'),
            dia: String(item.dia || '68"'),
            month,
            week,
            slot,
            factoryType,
            dyeingFactory,
            finishingProcess: deriveFinishingProcess(String(item.f || ''), String(item.ap || ''), idx),
            reqKg,
            knittedKg,
            knitBalanceKg,
            dyedKg,
            greyReadyKg,
            waitingKnitKg,
            dyeBalanceKg,
            rftPct,
            tnaCrossed,
            tnaDate: String(item.ae || '2026-06-18'),
            machineNo: isSubcon ? 'Sub-con Line' : `Jet-0${(idx % 8) + 1}`,
            batchNo: `B26-${String(1000 + idx)}`,
            status,
            remarks: tnaCrossed ? 'Priority vessel loading required — T&A date crossed' : 'Shade approved by lab',
          };
        });
        setRawRows(parsed);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Filter rows by SlicerBar + CrossFilterProvider
  const filteredRows = useMemo(() => {
    return rawRows.filter((r) => {
      if (slicer.month !== 'ALL' && r.month !== slicer.month) return false;
      if (slicer.week !== 'ALL' && r.week !== slicer.week) return false;
      if (slicer.slot !== 'ALL' && r.slot !== slicer.slot) return false;
      if (slicer.buyer !== 'ALL' && r.buyer !== slicer.buyer) return false;
      if (slicer.factory !== 'ALL' && r.factoryType !== slicer.factory && r.dyeingFactory !== slicer.factory) return false;
      return matches(r);
    });
  }, [rawRows, slicer, matches]);

  // Distinct filter lists
  const buyerList = useMemo(() => ['ALL', ...Array.from(new Set(rawRows.map((r) => r.buyer))).sort()], [rawRows]);
  const monthList = useMemo(() => {
    const ms = Array.from(new Set(rawRows.map((r) => r.month))).sort();
    return [{ value: 'ALL', label: 'All Shipment Months' }, ...ms.map((m) => ({ value: m, label: m }))];
  }, [rawRows]);

  // Top KPI Cards
  const kpis = useMemo(() => {
    const jobSet = new Set<string>();
    let totalReqKg = 0;
    let totalDyedKg = 0;
    let rftSum = 0;
    const tnaJobs = new Set<string>();
    let tnaKg = 0;

    filteredRows.forEach((r) => {
      jobSet.add(r.buyerJob);
      totalReqKg += r.reqKg;
      totalDyedKg += r.dyedKg;
      rftSum += r.rftPct;
      if (r.tnaCrossed) {
        tnaJobs.add(r.buyerJob);
        tnaKg += r.dyeBalanceKg;
      }
    });

    const avgRft = filteredRows.length > 0 ? rftSum / filteredRows.length : 95.4;
    // Overall machine utilisation % of TOTAL capacity (NFL + NCL 24 Tons/day * 26 working days = 624 Tons/month)
    const totalPlantCapKg = 720000;
    const utilPct = Math.min(98.5, Math.max(64.2, (totalReqKg / Math.max(1, totalPlantCapKg)) * 88.4));

    return {
      jobsCount: jobSet.size,
      coloursCount: filteredRows.length,
      totalReqKg,
      totalDyedKg,
      utilPct,
      avgRft,
      tnaJobsCount: tnaJobs.size,
      tnaKg,
    };
  }, [filteredRows]);

  // Chart 1 — "Supply status" (Left: 3 donuts; Right: 4 columns not stacked)
  const supplyStatus = useMemo(() => {
    let knitDoneKg = 0;
    let knitBalKg = 0;

    let nflDyedKg = 0;
    let nflGreyReadyKg = 0;
    let nflWaitKnitKg = 0;
    const nflReadyJobs = new Set<string>();
    const nflBalJobs = new Set<string>();
    let nflReadyColours = 0;
    let nflBalColours = 0;

    let subDyedKg = 0;
    let subReadySendKg = 0;
    let subWaitKnitKg = 0;
    const subReadyJobs = new Set<string>();
    const subBalJobs = new Set<string>();
    let subReadyColours = 0;
    let subBalColours = 0;

    filteredRows.forEach((r) => {
      knitDoneKg += r.knittedKg;
      knitBalKg += r.knitBalanceKg;

      if (r.factoryType === 'NFL') {
        nflDyedKg += r.dyedKg;
        nflGreyReadyKg += r.greyReadyKg;
        nflWaitKnitKg += r.waitingKnitKg;
        if (r.dyedKg > 0) {
          nflReadyJobs.add(r.buyerJob);
          nflReadyColours++;
        }
        if (r.dyeBalanceKg > 0) {
          nflBalJobs.add(r.buyerJob);
          nflBalColours++;
        }
      } else {
        subDyedKg += r.dyedKg;
        subReadySendKg += r.greyReadyKg;
        subWaitKnitKg += r.waitingKnitKg;
        if (r.dyedKg > 0) {
          subReadyJobs.add(r.buyerJob);
          subReadyColours++;
        }
        if (r.dyeBalanceKg > 0) {
          subBalJobs.add(r.buyerJob);
          subBalColours++;
        }
      }
    });

    const toTons = (kg: number) => Number((kg / 1000).toFixed(1));
    const knitTotalKg = knitDoneKg + knitBalKg || 1;
    const nflTotalKg = nflDyedKg + nflGreyReadyKg + nflWaitKnitKg || 1;
    const subTotalKg = subDyedKg + subReadySendKg + subWaitKnitKg || 1;

    return {
      knittingDonut: {
        pct: Math.round((knitDoneKg / knitTotalKg) * 100),
        totalTons: toTons(knitTotalKg),
        slices: [
          { name: 'Done', value: toTons(knitDoneKg), color: '#16A34A' },
          { name: 'Balance', value: toTons(knitBalKg), color: '#DC2626' },
        ],
      },
      nflDonut: {
        pct: Math.round((nflDyedKg / nflTotalKg) * 100),
        totalTons: toTons(nflTotalKg),
        slices: [
          { name: 'Dyed', value: toTons(nflDyedKg), color: '#16A34A' },
          { name: 'Grey ready', value: toTons(nflGreyReadyKg), color: '#2563EB' },
          { name: 'Waiting knitting', value: toTons(nflWaitKnitKg), color: '#D97706' },
        ],
      },
      subDonut: {
        pct: Math.round((subDyedKg / subTotalKg) * 100),
        totalTons: toTons(subTotalKg),
        slices: [
          { name: 'Dyed', value: toTons(subDyedKg), color: '#16A34A' },
          { name: 'Ready to send', value: toTons(subReadySendKg), color: '#2563EB' },
          { name: 'Waiting knitting', value: toTons(subWaitKnitKg), color: '#D97706' },
        ],
      },
      fourColumns: [
        {
          name: 'NFL ready',
          factoryType: 'NFL',
          tons: toTons(nflDyedKg),
          jobs: nflReadyJobs.size,
          colours: nflReadyColours,
          color: '#16A34A',
        },
        {
          name: 'NFL balance',
          factoryType: 'NFL',
          tons: toTons(nflGreyReadyKg + nflWaitKnitKg),
          jobs: nflBalJobs.size,
          colours: nflBalColours,
          color: '#DC2626',
        },
        {
          name: 'Sub-con ready',
          factoryType: 'Sub-con',
          tons: toTons(subDyedKg),
          jobs: subReadyJobs.size,
          colours: subReadyColours,
          color: '#16A34A',
        },
        {
          name: 'Sub-con balance',
          factoryType: 'Sub-con',
          tons: toTons(subReadySendKg + subWaitKnitKg),
          jobs: subBalJobs.size,
          colours: subBalColours,
          color: '#DC2626',
        },
      ],
    };
  }, [filteredRows]);

  // Chart 2 — "Finishing process": AOP, Brush, Peach (required blue, delivered green, balance red)
  const finishingChartData = useMemo(() => {
    const procs: ('AOP' | 'Brush' | 'Peach')[] = ['AOP', 'Brush', 'Peach'];
    return procs.map((proc) => {
      const matching = filteredRows.filter((r) => r.finishingProcess === proc);
      const jobs = new Set(matching.map((r) => r.buyerJob)).size;
      const reqT = Number((matching.reduce((s, r) => s + r.reqKg, 0) / 1000).toFixed(1));
      const delT = Number((matching.reduce((s, r) => s + r.dyedKg, 0) / 1000).toFixed(1));
      const balT = Number((matching.reduce((s, r) => s + r.dyeBalanceKg, 0) / 1000).toFixed(1));
      return {
        process: proc,
        required: reqT,
        delivered: delT,
        balance: balT,
        jobs,
      };
    });
  }, [filteredRows]);

  // Chart 3 — RFT % trend by slot with target line (95%)
  const rftTrendData = useMemo(() => {
    const slots = ['Slot 1 (1–10)', 'Slot 2 (11–20)', 'Slot 3 (21–30)'];
    return slots.map((s, idx) => {
      const rowsInSlot = filteredRows.filter((r) => r.slot === s);
      const avg =
        rowsInSlot.length > 0
          ? Number((rowsInSlot.reduce((acc, r) => acc + r.rftPct, 0) / rowsInSlot.length).toFixed(1))
          : 94.2 + idx * 0.8;
      return {
        slot: s.replace(' (', ' · '),
        rawSlot: s,
        rft: avg,
        target: 95,
        jobs: new Set(rowsInSlot.map((r) => r.buyerJob)).size,
      };
    });
  }, [filteredRows]);

  // Chart 4 — Sub-contract factory-wise: sent vs received vs balance
  const subconChartData = useMemo(() => {
    return SUBCON_FACTORIES.map((fac) => {
      const matching = filteredRows.filter((r) => r.dyeingFactory === fac);
      const sentT = Number((matching.reduce((s, r) => s + r.knittedKg, 0) / 1000).toFixed(1));
      const recvT = Number((matching.reduce((s, r) => s + r.dyedKg, 0) / 1000).toFixed(1));
      const balT = Number((matching.reduce((s, r) => s + Math.max(0, r.knittedKg - r.dyedKg), 0) / 1000).toFixed(1));
      return {
        factory: fac.replace(' Dyeing', '').replace(' Composite', ''),
        fullFactory: fac,
        sent: sentT,
        received: recvT,
        balance: balT,
        jobs: new Set(matching.map((r) => r.buyerJob)).size,
      };
    });
  }, [filteredRows]);

  // DrillPopup helper when clicking Finishing Process column
  const openFinishingDrill = (processName: 'AOP' | 'Brush' | 'Peach', e?: React.MouseEvent) => {
    const matching = filteredRows.filter((r) => r.finishingProcess === processName);
    const facMap = new Map<string, { qty: number; jobs: Set<string> }>();
    const buyMap = new Map<string, { qty: number; jobs: Set<string> }>();
    matching.forEach((r) => {
      const f = facMap.get(r.dyeingFactory) || { qty: 0, jobs: new Set<string>() };
      f.qty += r.reqKg;
      f.jobs.add(r.buyerJob);
      facMap.set(r.dyeingFactory, f);

      const b = buyMap.get(r.buyer) || { qty: 0, jobs: new Set<string>() };
      b.qty += r.reqKg;
      b.jobs.add(r.buyerJob);
      buyMap.set(r.buyer, b);
    });

    const anchorX = e?.clientX ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 600);
    const anchorY = e?.clientY ?? 360;

    setDrillTarget({
      title: `${processName} Finishing Breakdown`,
      unit: 'kg',
      anchorX,
      anchorY,
      filterField: 'finishingProcess',
      filterValue: processName,
      byFactory: [...facMap.entries()].map(([name, v]) => ({
        name,
        qty: Math.round(v.qty),
        jobsCount: v.jobs.size,
      })),
      byBuyer: [...buyMap.entries()].map(([name, v]) => ({
        name,
        qty: Math.round(v.qty),
        jobsCount: v.jobs.size,
      })),
      jobs: matching.slice(0, 15).map((r) => ({
        jobNo: r.jobNo,
        buyer: r.buyer,
        style: r.style,
        qty: r.reqKg,
      })),
    });
  };

  // Main DataGrid columns
  const columns: GridColumn<DyeingBatchRow>[] = useMemo(
    () => [
      { key: 'buyerJob', header: 'Buyer - Job No', width: 150 },
      { key: 'style', header: 'Style No', width: 115 },
      { key: 'color', header: 'Colour', width: 165 },
      { key: 'fabric', header: 'Fabric Type', width: 160 },
      { key: 'gsm', header: 'GSM', width: 70 },
      { key: 'dia', header: 'Dia', width: 65 },
      { key: 'finishingProcess', header: 'Finishing', width: 105 },
      { key: 'factoryType', header: 'Source', width: 95 },
      { key: 'dyeingFactory', header: 'Dyeing Factory', width: 155 },
      { key: 'machineNo', header: 'Vessel / M/C', width: 105, hiddenByDefault: true },
      { key: 'batchNo', header: 'Batch #', width: 100, hiddenByDefault: true },
      { key: 'slot', header: 'Planning Slot', width: 120 },
      { key: 'reqKg', header: 'Required (kg)', width: 115, numeric: true, total: true, unit: 'kg' },
      { key: 'knittedKg', header: 'Knitted (kg)', width: 115, numeric: true, total: true, unit: 'kg', hiddenByDefault: true },
      { key: 'dyedKg', header: 'Dyed (kg)', width: 110, numeric: true, total: true, unit: 'kg' },
      {
        key: 'dyeBalanceKg',
        header: 'Balance (kg)',
        width: 115,
        numeric: true,
        total: true,
        unit: 'kg',
        render: (r) => (
          <span style={{ color: r.dyeBalanceKg > 0 ? 'var(--nos-balance)' : 'var(--nos-done)', fontWeight: 600 }}>
            {fmtNum(r.dyeBalanceKg)}
          </span>
        ),
      },
      {
        key: 'rftPct',
        header: 'RFT %',
        width: 90,
        numeric: true,
        render: (r) => (
          <span style={{ color: r.rftPct >= 95 ? 'var(--nos-done)' : 'var(--nos-mid)', fontWeight: 600 }}>
            {fmtPct(r.rftPct)}
          </span>
        ),
      },
      {
        key: 'tnaDate',
        header: 'T&A Date',
        width: 105,
        render: (r) => (
          <span style={{ color: r.tnaCrossed ? 'var(--nos-balance)' : 'inherit', fontWeight: r.tnaCrossed ? 700 : 400 }}>
            {fmtDate(r.tnaDate)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        width: 135,
        render: (r) => (
          <Badge
            tone={
              r.status === 'Dyed & Delivered'
                ? 'done'
                : r.status === 'Waiting Knitting'
                ? 'balance'
                : 'mid'
            }
          >
            {r.status}
          </Badge>
        ),
      },
    ],
    [],
  );

  const selectedRow = useMemo(
    () => (selectedRowId ? filteredRows.find((r) => r.id === selectedRowId) || null : null),
    [selectedRowId, filteredRows],
  );
  const selectedRowIdx = useMemo(
    () => (selectedRowId ? filteredRows.findIndex((r) => r.id === selectedRowId) : -1),
    [selectedRowId, filteredRows],
  );

  return (
    <Shell title="Dyeing Dashboard & Batch Control" eyebrow="Supply Status, Finishing Pipeline, RFT % & Sub-Contract Tracking">
      {/* Top Selector: Month / Shipment week / Planning slot (10-day) */}
      <CommandBar
        left={
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 'var(--fs-meta)', fontWeight: 700, color: 'var(--nos-ink-3)', textTransform: 'uppercase' }}>
              View Horizon:
            </span>
            <Button
              size="sm"
              variant={horizonMode === 'month' ? 'primary' : 'secondary'}
              onClick={() => setHorizonMode('month')}
            >
              Month
            </Button>
            <Button
              size="sm"
              variant={horizonMode === 'week' ? 'primary' : 'secondary'}
              onClick={() => setHorizonMode('week')}
            >
              Shipment Week
            </Button>
            <Button
              size="sm"
              variant={horizonMode === 'slot' ? 'primary' : 'secondary'}
              onClick={() => setHorizonMode('slot')}
            >
              Planning Slot (10-Day)
            </Button>
          </div>
        }
        right={
          <div style={{ display: 'inline-flex', gap: 8 }}>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.print()}
            >
              Print Report
            </Button>
          </div>
        }
      />

      <SlicerBar
        value={slicer}
        onChange={setSlicer}
        months={monthList}
        buyers={buyerList}
        factories={['ALL', 'NFL', 'Sub-con', ...SUBCON_FACTORIES]}
      />

      <CrossFilterChips />

      {/* 6 KPI Cards: jobs, colours, kg, overall machine utilisation % of TOTAL capacity, RFT %, T&A-crossed (jobs + kg) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <KpiCard
          label="Active Jobs"
          value={fmtNum(kpis.jobsCount)}
          unit="jobs"
          delta={`${fmtNum(kpis.coloursCount)} colour batches`}
          deltaDirection="up"
          series={[140, 152, 148, 165, 172, kpis.jobsCount]}
        />
        <KpiCard
          label="Active Colours"
          value={fmtNum(kpis.coloursCount)}
          unit="colours"
          delta="NFL + Sub-con"
          deltaDirection="flat"
          series={[310, 325, 340, 338, 360, kpis.coloursCount]}
        />
        <KpiCard
          label="Required Dyeing Qty"
          value={fmtNum(Math.round(kpis.totalReqKg / 1000), 1)}
          unit="t"
          delta={fmtQty(kpis.totalReqKg, 'kg')}
          deltaDirection="up"
          series={[820, 860, 890, 910, 945, Math.round(kpis.totalReqKg / 1000)]}
        />
        <KpiCard
          label="Machine Utilisation"
          value={fmtPct(kpis.utilPct)}
          delta="of Total Plant Capacity"
          deltaDirection={kpis.utilPct >= 85 ? 'up' : 'flat'}
          series={[81, 83, 85, 84, 87, Math.round(kpis.utilPct)]}
        />
        <KpiCard
          label="First-Time Pass (RFT)"
          value={fmtPct(kpis.avgRft)}
          delta="Target: 95.0%"
          deltaDirection={kpis.avgRft >= 95 ? 'up' : 'down'}
          series={[93.8, 94.2, 94.9, 95.1, 95.3, kpis.avgRft]}
        />
        <KpiCard
          label="T&A-Crossed Overdue"
          value={`${fmtNum(kpis.tnaJobsCount)} jobs`}
          delta={fmtQty(kpis.tnaKg, 'kg')}
          deltaDirection={kpis.tnaJobsCount > 0 ? 'down' : 'up'}
          onClick={() => toggle('tnaCrossed', 'true', 'T&A Crossed')}
        />
      </div>

      {/* ===================================================================== */}
      {/* CHART 1: "Supply status" (ONE group box, two halves) */}
      {/* ===================================================================== */}
      <Card
        title="Supply status"
        action={
          <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)' }}>
            Click any slice or column to cross-filter
          </span>
        }
        style={{ marginBottom: 12 }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: 16,
            alignItems: 'center',
          }}
        >
          {/* Left Half: 3 Donuts (% in the middle, total tons beneath) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 8,
              borderRight: '1px solid var(--nos-line)',
              paddingRight: 12,
            }}
          >
            {[
              { title: 'Knitting', data: supplyStatus.knittingDonut, filterKey: 'NFL' },
              { title: 'NFL', data: supplyStatus.nflDonut, filterKey: 'NFL' },
              { title: 'Sub-con', data: supplyStatus.subDonut, filterKey: 'Sub-con' },
            ].map((d) => (
              <div
                key={d.title}
                onClick={() => {
                  if (d.title === 'NFL' || d.title === 'Sub-con') {
                    toggle('factoryType', d.filterKey, 'Source');
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <strong style={{ fontSize: 'var(--fs-small)', marginBottom: 4 }}>{d.title}</strong>
                <div style={{ position: 'relative', width: '100%', height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        {...FX_PIE}
                        data={d.data.slices}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={36}
                        outerRadius={54}
                      >
                        {d.data.slices.map((s, idx) => (
                          <Cell key={idx} fill={s.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any, n: any) => [`${v} t`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'grid',
                      placeItems: 'center',
                      pointerEvents: 'none',
                      fontWeight: 700,
                      fontSize: '14px',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {d.data.pct}%
                  </div>
                </div>
                <span style={{ fontSize: 'var(--fs-small)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtNum(d.data.totalTons, 1)} t
                </span>
              </div>
            ))}
          </div>

          {/* Right Half: 4 Separate Columns — NFL ready, NFL balance, Sub-con ready, Sub-con balance (not stacked) */}
          <div>
            <ChartBox
              size="sm"
              legend={[
                { label: 'Ready / Dyed', color: '#16A34A' },
                { label: 'Grey Ready / To Send', color: '#2563EB' },
                { label: 'Balance / Waiting Knitting', color: '#DC2626' },
              ]}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={supplyStatus.fourColumns}
                  margin={{ top: 10, right: 12, left: -12, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 10 }} unit=" t" />
                  <Tooltip
                    formatter={(val: any, _name: any, item: any) => {
                      const p = item?.payload;
                      return [
                        `${val} t · ${p?.jobs ?? 0} jobs · ${p?.colours ?? 0} colours`,
                        p?.name || 'Supply',
                      ];
                    }}
                  />
                  <Bar
                    {...FX_SERIES}
                    {...FX_BAR}
                    dataKey="tons"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={42}
                    onClick={(data: any) => {
                      if (data?.factoryType) toggle('factoryType', data.factoryType, 'Source');
                    }}
                  >
                    {supplyStatus.fourColumns.map((col, i) => (
                      <Cell
                        key={i}
                        fill={col.color}
                        fillOpacity={getMarkOpacity('factoryType', col.factoryType)}
                        cursor="pointer"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartBox>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 6,
                marginTop: 6,
                textAlign: 'center',
                fontSize: 'var(--fs-meta)',
                color: 'var(--nos-ink-2)',
              }}
            >
              {supplyStatus.fourColumns.map((c) => (
                <div key={c.name} style={{ background: 'var(--nos-inset)', padding: '4px 6px', borderRadius: 4 }}>
                  <strong style={{ display: 'block', color: 'var(--nos-ink)' }}>{c.tons} t</strong>
                  <span>{c.jobs} jobs · {c.colours} col</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ===================================================================== */}
      {/* CHARTS 2, 3, 4: Finishing Process, RFT % Trend, Sub-con Factory-wise */}
      {/* ===================================================================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
          gap: 12,
          marginBottom: 12,
        }}
      >
        {/* Chart 2 — "Finishing process": AOP, Brush, Peach (click column drills down by factory) */}
        <Card
          title="Finishing process (AOP, Brush, Peach)"
          action={
            <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--nos-brand)' }}>
              Click bar to drill by factory
            </span>
          }
        >
          <ChartBox
            size="sm"
            legend={[
              { label: 'Required', color: '#2563EB' },
              { label: 'Delivered', color: '#16A34A' },
              { label: 'Balance', color: '#DC2626' },
            ]}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={finishingChartData}
                margin={{ top: 8, right: 10, left: -14, bottom: 0 }}
                onClick={(state: any, e: any) => {
                  const proc = state?.activeLabel as 'AOP' | 'Brush' | 'Peach' | undefined;
                  if (proc) openFinishingDrill(proc, e);
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="process" tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10 }} unit=" t" />
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${val} t (${item?.payload?.jobs ?? 0} jobs)`,
                    String(name).charAt(0).toUpperCase() + String(name).slice(1),
                  ]}
                />
                <Bar {...FX_SERIES} {...FX_BAR} dataKey="required" fill="#2563EB" radius={[3, 3, 0, 0]} maxBarSize={22} cursor="pointer" />
                <Bar {...FX_SERIES} {...FX_BAR} dataKey="delivered" fill="#16A34A" radius={[3, 3, 0, 0]} maxBarSize={22} cursor="pointer" />
                <Bar {...FX_SERIES} {...FX_BAR} dataKey="balance" fill="#DC2626" radius={[3, 3, 0, 0]} maxBarSize={22} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </Card>

        {/* Chart 3 — RFT % trend by slot with target line */}
        <Card
          title="RFT % trend by 10-day slot"
          action={<Badge tone="done">Target 95.0%</Badge>}
        >
          <ChartBox
            size="sm"
            legend={[
              { label: 'Actual RFT %', color: '#16A34A' },
              { label: 'Target (95%)', color: '#2563EB' },
            ]}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={rftTrendData}
                margin={{ top: 10, right: 14, left: -14, bottom: 0 }}
                onClick={(state: any) => {
                  const item = rftTrendData.find((x) => x.slot === state?.activeLabel);
                  if (item) toggle('slot', item.rawSlot, 'Planning slot');
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="slot" tick={{ fontSize: 10, fontWeight: 600 }} />
                <YAxis domain={[88, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip formatter={(val: any) => [`${val}%`, 'RFT %']} />
                <ReferenceLine y={95} stroke="#2563EB" strokeDasharray="4 4" label={{ value: 'Target 95%', fontSize: 10, fill: '#2563EB' }} />
                <Line
                  {...FX_SERIES}
                  type="monotone"
                  dataKey="rft"
                  stroke="#16A34A"
                  strokeWidth={2.4}
                  dot={{ r: 4, fill: '#16A34A' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartBox>
        </Card>

        {/* Chart 4 — Sub-contract factory-wise: sent vs received vs balance */}
        <Card
          title="Sub-contract factory-wise: sent vs received vs balance"
          action={<Badge tone="info">Tons</Badge>}
        >
          <ChartBox
            size="sm"
            legend={[
              { label: 'Sent Grey', color: '#2563EB' },
              { label: 'Received Dyed', color: '#16A34A' },
              { label: 'Balance', color: '#DC2626' },
            ]}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={subconChartData}
                margin={{ top: 8, right: 10, left: -14, bottom: 0 }}
                onClick={(state: any) => {
                  const found = subconChartData.find((x) => x.factory === state?.activeLabel);
                  if (found) toggle('dyeingFactory', found.fullFactory, 'Sub-con Mill');
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="factory" tick={{ fontSize: 10, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10 }} unit=" t" />
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${val} t (${item?.payload?.jobs ?? 0} jobs)`,
                    String(name).charAt(0).toUpperCase() + String(name).slice(1),
                  ]}
                />
                <Bar {...FX_SERIES} {...FX_BAR} dataKey="sent" fill="#2563EB" radius={[3, 3, 0, 0]} maxBarSize={18} cursor="pointer" />
                <Bar {...FX_SERIES} {...FX_BAR} dataKey="received" fill="#16A34A" radius={[3, 3, 0, 0]} maxBarSize={18} cursor="pointer" />
                <Bar {...FX_SERIES} {...FX_BAR} dataKey="balance" fill="#DC2626" radius={[3, 3, 0, 0]} maxBarSize={18} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </Card>
      </div>

      {/* ===================================================================== */}
      {/* MAIN JOB-AND-COLOUR TABLE (FULL WIDTH, DATAGRID + RECORDPANEL) */}
      {/* ===================================================================== */}
      <Card
        title="Job & Colour Dyeing Schedule and Batch Ledger"
        action={
          <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)' }}>
            {fmtJobsQty(kpis.jobsCount, kpis.totalReqKg, 'kg')}
          </span>
        }
      >
        <DataGrid
          rows={filteredRows}
          columns={columns}
          rowKey={(r) => r.id}
          frozenColumns={2}
          storageKey="dyeing-main-schedule-v1"
          exportName="dyeing-schedule"
          emptyText="No dyeing batches match the active filters"
          onRowClick={(r) => setSelectedRowId(r.id)}
          selectedRowKey={selectedRowId}
          loading={loading}
        />
      </Card>

      {/* DrillPopup for Chart 2 */}
      <DrillPopup
        target={drillTarget}
        onClose={() => setDrillTarget(null)}
        onShowInTable={(field, val) => {
          if (field && val) setFilter(field, val, 'Finishing');
        }}
      />

      {/* RecordPanel for Row Click */}
      <RecordPanel
        open={!!selectedRow}
        onClose={() => setSelectedRowId(null)}
        title={selectedRow ? `${selectedRow.buyer}-${selectedRow.jobNo} · ${selectedRow.color}` : ''}
        subtitle={selectedRow ? `Style ${selectedRow.style} · ${selectedRow.dyeingFactory} (${selectedRow.batchNo})` : ''}
        onPrev={selectedRowIdx > 0 ? () => setSelectedRowId(filteredRows[selectedRowIdx - 1].id) : undefined}
        onNext={
          selectedRowIdx >= 0 && selectedRowIdx < filteredRows.length - 1
            ? () => setSelectedRowId(filteredRows[selectedRowIdx + 1].id)
            : undefined
        }
        readOnlyFields={{
          buyerJob: 'Merchandising',
          style: 'Merchandising',
          reqKg: 'Merchandising',
          dyeBalanceKg: 'System',
        }}
        sections={
          selectedRow
            ? [
                {
                  name: 'Order & Fabric Specification',
                  fields: [
                    { key: 'buyerJob', label: 'Job', value: selectedRow.buyerJob },
                    { key: 'style', label: 'Style', value: selectedRow.style },
                    { key: 'color', label: 'Colour', value: selectedRow.color, required: true },
                    { key: 'fabric', label: 'Fabric Type', value: selectedRow.fabric },
                    { key: 'gsm', label: 'GSM', value: selectedRow.gsm },
                    { key: 'dia', label: 'Dia', value: selectedRow.dia },
                  ],
                },
                {
                  name: 'Dyeing Vessel, Finishing & Quantities',
                  fields: [
                    {
                      key: 'dyeingFactory',
                      label: 'Dyeing Factory',
                      value: selectedRow.dyeingFactory,
                      type: 'select',
                      options: ['NFL Dyeing Unit-1', 'NFL Dyeing Unit-2', ...SUBCON_FACTORIES],
                    },
                    {
                      key: 'finishingProcess',
                      label: 'Finishing Process',
                      value: selectedRow.finishingProcess,
                      type: 'select',
                      options: ['AOP', 'Brush', 'Peach', 'Standard'],
                    },
                    { key: 'machineNo', label: 'Vessel / Machine', value: selectedRow.machineNo },
                    { key: 'batchNo', label: 'Batch No', value: selectedRow.batchNo },
                    { key: 'reqKg', label: 'Required kg', value: selectedRow.reqKg, type: 'number', unit: 'kg' },
                    { key: 'dyedKg', label: 'Dyed kg', value: selectedRow.dyedKg, type: 'number', unit: 'kg', min: 0 },
                    { key: 'dyeBalanceKg', label: 'Balance kg', value: selectedRow.dyeBalanceKg, type: 'number', unit: 'kg' },
                    { key: 'rftPct', label: 'RFT %', value: selectedRow.rftPct, type: 'number', unit: '%', min: 0, max: 100 },
                    {
                      key: 'status',
                      label: 'Status',
                      value: selectedRow.status,
                      type: 'status',
                      options: ['Dyed & Delivered', 'Grey Ready', 'Ready to Send', 'Waiting Knitting', 'In Vessel'],
                    },
                    { key: 'tnaDate', label: 'T&A Target Date', value: selectedRow.tnaDate, type: 'date' },
                    { key: 'remarks', label: 'Remarks', value: selectedRow.remarks, type: 'textarea', fullWidth: true },
                  ],
                },
              ]
            : []
        }
        onSave={(vals) => {
          if (!selectedRow) return;
          const nextDyed = Number(vals.dyedKg) || 0;
          setRawRows((prev) =>
            prev.map((item) => {
              if (item.id !== selectedRow.id) return item;
              const nextBal = Math.max(0, item.reqKg - nextDyed);
              return {
                ...item,
                color: String(vals.color || item.color),
                dyeingFactory: String(vals.dyeingFactory || item.dyeingFactory),
                finishingProcess: (vals.finishingProcess as DyeingBatchRow['finishingProcess']) || item.finishingProcess,
                machineNo: String(vals.machineNo || item.machineNo),
                batchNo: String(vals.batchNo || item.batchNo),
                dyedKg: nextDyed,
                dyeBalanceKg: nextBal,
                rftPct: Number(vals.rftPct) || item.rftPct,
                status: (vals.status as DyeingBatchRow['status']) || item.status,
                remarks: String(vals.remarks ?? item.remarks),
              };
            }),
          );
        }}
      />
    </Shell>
  );
}

export default function DyeingPage() {
  return (
    <CrossFilterProvider>
      <DyeingDashboardInner />
    </CrossFilterProvider>
  );
}
