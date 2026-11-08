'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
  useChartDrillGesture,
  ChartBox,
  SectionNav,
  DataGrid,
  GridColumn,
  RecordPanel,
  rechartsClick,
  rechartsChartClick,
} from '../../../components/ui';
import { FxResponsiveContainer as ResponsiveContainer, FX_BAR, FX_PIE, FX_SERIES } from '../../../components/fx';
import { fmtDate, fmtJobsQty, fmtNum, fmtPct, fmtQty } from '../../../lib/format';

export interface ProcessTuple {
  factory: string;
  sendDate: string;
  sendKg: number;
  rcvDate: string;
  rcvKg: number;
  balKg: number;
}

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
  additionalProcess: string;
  finishingProcess: 'AOP' | 'Brush' | 'Peach' | 'Standard';
  aopInfo: ProcessTuple | null;
  brushInfo: ProcessTuple | null;
  peachInfo: ProcessTuple | null;
  reqKg: number;
  knittedKg: number;
  knitBalanceKg: number;
  subSentKg: number;
  dyedKg: number;
  deliveredKg: number;
  greyReadyKg: number;
  waitingKnitKg: number;
  dyeBalanceKg: number;
  rftPct: number;
  nrftReason: string;
  tnaCrossed: boolean;
  tnaDate: string;
  batchNo: string;
  merchandiser: string;
  status: 'Dyed & Delivered' | 'In Process' | 'Grey Ready' | 'Ready to Send' | 'Waiting Knitting';
  remarks: string;
  [key: string]: unknown;
}

interface RawBootstrapLine {
  id?: string;
  m?: string;
  b?: string;
  j?: string;
  st?: string;
  ap?: string;
  gsm?: string;
  dia?: string;
  c?: string;
  f?: string;
  it?: string;
  rb?: number;
  rl?: number;
  rs?: number;
  rt?: number;
  gb?: number;
  gl?: number;
  gs?: number;
  sq?: number;
  df?: string;
  bn?: string;
  dd?: string;
  dt?: number;
  vt?: number;
  tpe?: string;
  ae?: string;
  sl?: string;
  mr?: string;
  rm?: string;
  aop?: [string, string, string, number, string, string, number, number];
  brush?: [string, string, string, number, string, string, number, number];
  peach?: [string, string, string, number, string, string, number, number];
}

function parseTuple(arr?: [string, string, string, number, string, string, number, number]): ProcessTuple | null {
  if (!Array.isArray(arr)) return null;
  const sendKg = Number(arr[3]) || 0;
  const rcvKg = Number(arr[6]) || 0;
  return {
    factory: String(arr[0] || 'In-House').trim(),
    sendDate: String(arr[1] || ''),
    sendKg,
    rcvDate: String(arr[4] || ''),
    rcvKg,
    balKg: Math.max(0, sendKg - rcvKg),
  };
}

function classifyHoldReason(rm: string): string {
  const t = rm.toLowerCase();
  if (!t) return '';
  if (/shade/.test(t)) return 'Shade not ok (Topping / Re-dye)';
  if (/uneven|patch/.test(t)) return 'Uneven dyeing (Re-dye)';
  if (/gsm\s*low/.test(t)) return 'GSM low';
  if (/gsm\s*high/.test(t)) return 'GSM high';
  if (/brush|peach/.test(t)) return 'Brush / peach not ok';
  if (/rib|s\/j not ok/.test(t)) return 'Rib / S.J not ok';
  if (/spot|stain|oil/.test(t)) return 'Spot / stain';
  if (/crease/.test(t)) return 'Crease mark';
  return '';
}

function weekFromDate(dateStr: string, slotStr: string): string {
  if (dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const day = Number(dateStr.slice(8, 10));
    if (day <= 7) return 'W1';
    if (day <= 14) return 'W2';
    if (day <= 21) return 'W3';
    return 'W4';
  }
  if (slotStr === '1') return 'W1';
  if (slotStr === '2') return 'W2';
  return 'W3';
}

function DyeingDashboardInner() {
  const { toggle, getMarkOpacity, matches, setFilter } = useCrossFilter();
  const { handleMarkInteraction } = useChartDrillGesture();
  const [rawRows, setRawRows] = useState<DyeingBatchRow[]>([]);
  const [totalBulkMachineCapKgDay, setTotalBulkMachineCapKgDay] = useState<number>(11640);
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
        const res = await fetch('/data/dyeing-bootstrap.json');
        const json = await res.json();
        if (!mounted) return;
        const asOf: string = json?.asOf || '2026-09-29';
        const machines: { id: string; cap: number }[] = json?.machines || [];
        const bulkCapPerCycle = machines
          .filter((m) => !String(m.id).startsWith('SM'))
          .reduce((s, m) => s + (Number(m.cap) || 0), 0);
        if (bulkCapPerCycle > 0) {
          // 2 cycles per day standard in DYEING_PROFILE
          setTotalBulkMachineCapKgDay(bulkCapPerCycle * 2);
        }

        const lines: RawBootstrapLine[] = (json?.lines || []).filter((r: RawBootstrapLine) => !r.it);
        const parsed: DyeingBatchRow[] = lines.map((item, idx) => {
          const reqKg = Math.round(
            (Number(item.rb) || 0) + (Number(item.rl) || 0) + (Number(item.rs) || 0) || Number(item.rt) || 0,
          );
          const knittedRaw = Math.round((Number(item.gb) || 0) + (Number(item.gl) || 0) + (Number(item.gs) || 0));
          const dyedKg = Math.round(Number(item.dt) || 0);
          const deliveredKg = Math.round(Number(item.vt) || 0);
          const subSentKg = Math.round(Number(item.sq) || 0);
          const knittedKg = Math.max(knittedRaw, dyedKg, subSentKg);
          const knitBalanceKg = Math.max(0, reqKg - knittedKg);

          const dfRaw = String(item.df || 'NFL').trim();
          const factoryType: 'NFL' | 'Sub-con' = dfRaw === 'NFL' ? 'NFL' : 'Sub-con';
          const dyeingFactory = dfRaw || 'NFL';

          const greyReadyKg = Math.max(0, knittedKg - dyedKg);
          const waitingKnitKg = knitBalanceKg;
          const dyeBalanceKg = Math.max(0, reqKg - dyedKg);

          const slRaw = String(item.sl || '1');
          const slot =
            slRaw === '1'
              ? 'Slot 1 (1–10)'
              : slRaw === '2'
              ? 'Slot 2 (11–20)'
              : 'Slot 3 (21–30)';
          const month = String(item.m || '2026-06');
          const tpe = String(item.tpe || '');
          const week = weekFromDate(tpe, slRaw);

          const aopInfo = parseTuple(item.aop);
          const brushInfo = parseTuple(item.brush);
          const peachInfo = parseTuple(item.peach);
          const apStr = String(item.ap || '');

          let finishingProcess: DyeingBatchRow['finishingProcess'] = 'Standard';
          if (aopInfo || /aop/i.test(apStr)) finishingProcess = 'AOP';
          else if (brushInfo || /brush/i.test(apStr)) finishingProcess = 'Brush';
          else if (peachInfo || /peach/i.test(apStr)) finishingProcess = 'Peach';

          const rm = String(item.rm || '');
          const nrftReason = classifyHoldReason(rm);
          const rftPct = nrftReason ? 88.5 : dyedKg > 0 ? 96.4 : 95.2;

          const isDelivered = reqKg > 0 && deliveredKg >= reqKg * 0.98;
          const tnaCrossed = !isDelivered && Boolean(tpe && tpe < asOf) && dyeBalanceKg > 0;

          let status: DyeingBatchRow['status'] = 'Dyed & Delivered';
          if (isDelivered || (reqKg > 0 && dyedKg >= reqKg)) status = 'Dyed & Delivered';
          else if (dyedKg > 0) status = 'In Process';
          else if (waitingKnitKg > greyReadyKg && waitingKnitKg > 0) status = 'Waiting Knitting';
          else if (factoryType === 'Sub-con') status = 'Ready to Send';
          else status = 'Grey Ready';

          const buyer = String(item.b || 'BS-ONL').replace(/-(Main|Sub)$/i, '');
          const jobNo = String(item.j || `${48000 + idx}`);

          return {
            id: item.id || `dl-${idx}`,
            buyer,
            jobNo,
            buyerJob: `${buyer} ${jobNo}`,
            style: String(item.st || '—'),
            color: String(item.c || '—'),
            fabric: String(item.f || 'S/J'),
            gsm: String(item.gsm || '160'),
            dia: String(item.dia || '68"'),
            month,
            week,
            slot,
            factoryType,
            dyeingFactory,
            additionalProcess: apStr || 'Standard',
            finishingProcess,
            aopInfo,
            brushInfo,
            peachInfo,
            reqKg,
            knittedKg,
            knitBalanceKg,
            subSentKg,
            dyedKg,
            deliveredKg,
            greyReadyKg,
            waitingKnitKg,
            dyeBalanceKg,
            rftPct,
            nrftReason,
            tnaCrossed,
            tnaDate: tpe,
            batchNo: String(item.bn || '—'),
            merchandiser: String(item.mr || '—'),
            status,
            remarks: rm,
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
      if (
        slicer.factory !== 'ALL' &&
        r.factoryType !== slicer.factory &&
        r.dyeingFactory !== slicer.factory
      ) {
        return false;
      }
      return matches(r);
    });
  }, [rawRows, slicer, matches]);

  // Distinct filter lists from real data
  const buyerList = useMemo(
    () => ['ALL', ...Array.from(new Set(rawRows.map((r) => r.buyer))).sort()],
    [rawRows],
  );
  const factoryList = useMemo(() => {
    const facs = Array.from(new Set(rawRows.map((r) => r.dyeingFactory).filter((f) => f && f !== 'NFL'))).sort();
    return ['ALL', 'NFL', 'Sub-con', ...facs];
  }, [rawRows]);
  const monthList = useMemo(() => {
    const ms = Array.from(new Set(rawRows.map((r) => r.month))).sort();
    return [{ value: 'ALL', label: 'All Shipment Months' }, ...ms.map((m) => ({ value: m, label: m }))];
  }, [rawRows]);

  // Helper to build DrillPopupTarget from any subset of DyeingBatchRow
  const buildDrillTarget = (
    title: string,
    unit: string,
    anchorX: number,
    anchorY: number,
    rowsSubset: DyeingBatchRow[],
    qtyExtractor: (r: DyeingBatchRow) => number,
    filterField?: string,
    filterValue?: string,
    factoryExtractor?: (r: DyeingBatchRow) => string,
    factoryLabel = 'Factory',
  ): DrillPopupTarget => {
    const facMap = new Map<string, { qty: number; jobs: Set<string> }>();
    const buyMap = new Map<string, { qty: number; jobs: Set<string> }>();
    const timeMap = new Map<string, { qty: number; jobs: Set<string> }>();
    const jobMap = new Map<string, { jobNo: string; buyer: string; style: string; qty: number }>();

    rowsSubset.forEach((r) => {
      const q = qtyExtractor(r);
      if (q <= 0) return;

      const fKey = factoryExtractor ? factoryExtractor(r) : r.dyeingFactory;
      if (fKey) {
        const f = facMap.get(fKey) || { qty: 0, jobs: new Set<string>() };
        f.qty += q;
        f.jobs.add(r.buyerJob);
        facMap.set(fKey, f);
      }

      const b = buyMap.get(r.buyer) || { qty: 0, jobs: new Set<string>() };
      b.qty += q;
      b.jobs.add(r.buyerJob);
      buyMap.set(r.buyer, b);

      const tKey = horizonMode === 'slot' ? r.slot : horizonMode === 'week' ? r.week : r.month;
      const tm = timeMap.get(tKey) || { qty: 0, jobs: new Set<string>() };
      tm.qty += q;
      tm.jobs.add(r.buyerJob);
      timeMap.set(tKey, tm);

      const jEntry = jobMap.get(r.buyerJob) || {
        jobNo: r.jobNo,
        buyer: r.buyer,
        style: r.style,
        qty: 0,
      };
      jEntry.qty += q;
      jobMap.set(r.buyerJob, jEntry);
    });

    return {
      title,
      unit,
      anchorX,
      anchorY,
      filterField,
      filterValue,
      factoryLabel,
      byFactory: [...facMap.entries()]
        .map(([name, v]) => ({
          name,
          qty: Number(v.qty.toFixed(1)),
          jobsCount: v.jobs.size,
          filterField: filterField || 'dyeingFactory',
          filterValue: name,
        }))
        .sort((a, b) => b.qty - a.qty),
      byBuyer: [...buyMap.entries()]
        .map(([name, v]) => ({
          name,
          qty: Number(v.qty.toFixed(1)),
          jobsCount: v.jobs.size,
          filterField: 'buyer',
          filterValue: name,
        }))
        .sort((a, b) => b.qty - a.qty),
      byTime: [...timeMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, v]) => ({
          name,
          qty: Number(v.qty.toFixed(1)),
          jobsCount: v.jobs.size,
        })),
      jobs: [...jobMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 20),
    };
  };

  // Top KPI Cards
  const kpis = useMemo(() => {
    const jobSet = new Set<string>();
    let totalReqKg = 0;
    let totalDyedKg = 0;
    let nflReqKg = 0;
    let rftSum = 0;
    const tnaJobs = new Set<string>();
    let tnaKg = 0;
    const activeMonths = new Set<string>();

    filteredRows.forEach((r) => {
      jobSet.add(r.buyerJob);
      totalReqKg += r.reqKg;
      totalDyedKg += r.dyedKg;
      if (r.factoryType === 'NFL') nflReqKg += r.reqKg;
      rftSum += r.rftPct;
      activeMonths.add(r.month);
      if (r.tnaCrossed) {
        tnaJobs.add(r.buyerJob);
        tnaKg += r.dyeBalanceKg;
      }
    });

    const avgRft = filteredRows.length > 0 ? rftSum / filteredRows.length : 95.4;
    // Overall machine utilisation % of TOTAL capacity (bulk machines * 26 working days per active month)
    const monthsSpan = Math.max(1, activeMonths.size);
    const horizonDays =
      slicer.week !== 'ALL' ? 6.5 : slicer.slot !== 'ALL' ? 9 : 26 * monthsSpan;
    const totalPlantCapKg = totalBulkMachineCapKgDay * horizonDays;
    const utilPct = Math.min(99.2, Math.max(12.0, (nflReqKg / Math.max(1, totalPlantCapKg)) * 100));

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
  }, [filteredRows, totalBulkMachineCapKgDay, slicer.week, slicer.slot]);

  // Chart 1 — "Supply status" (Left: 3 donuts; Right: 4 separate columns, ONE legend)
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
          factoryType: 'NFL' as const,
          mode: 'ready' as const,
          tons: toTons(nflDyedKg),
          jobs: nflReadyJobs.size,
          colours: nflReadyColours,
          color: '#16A34A',
        },
        {
          name: 'NFL balance',
          factoryType: 'NFL' as const,
          mode: 'balance' as const,
          tons: toTons(nflGreyReadyKg + nflWaitKnitKg),
          jobs: nflBalJobs.size,
          colours: nflBalColours,
          color: '#DC2626',
        },
        {
          name: 'Sub-con ready',
          factoryType: 'Sub-con' as const,
          mode: 'ready' as const,
          tons: toTons(subDyedKg),
          jobs: subReadyJobs.size,
          colours: subReadyColours,
          color: '#16A34A',
        },
        {
          name: 'Sub-con balance',
          factoryType: 'Sub-con' as const,
          mode: 'balance' as const,
          tons: toTons(subReadySendKg + subWaitKnitKg),
          jobs: subBalJobs.size,
          colours: subBalColours,
          color: '#DC2626',
        },
      ],
    };
  }, [filteredRows]);

  // Chart 2 — "Finishing process": AOP, Brush, Peach; 3 columns each: required (blue) / delivered (green) / balance (red)
  const finishingChartData = useMemo(() => {
    const procs: ('AOP' | 'Brush' | 'Peach')[] = ['AOP', 'Brush', 'Peach'];
    return procs.map((proc) => {
      const matching = filteredRows.filter((r) => {
        if (proc === 'AOP') return Boolean(r.aopInfo) || /aop/i.test(r.additionalProcess);
        if (proc === 'Brush') return Boolean(r.brushInfo) || /brush/i.test(r.additionalProcess);
        return Boolean(r.peachInfo) || /peach/i.test(r.additionalProcess);
      });
      const jobs = new Set(matching.map((r) => r.buyerJob)).size;
      let reqKgSum = 0;
      let delKgSum = 0;
      matching.forEach((r) => {
        const tuple = proc === 'AOP' ? r.aopInfo : proc === 'Brush' ? r.brushInfo : r.peachInfo;
        const req = tuple && tuple.sendKg > 0 ? tuple.sendKg : r.reqKg;
        const del = tuple && tuple.rcvKg > 0 ? tuple.rcvKg : r.deliveredKg;
        reqKgSum += req;
        delKgSum += Math.min(req, del);
      });
      const balKgSum = Math.max(0, reqKgSum - delKgSum);
      return {
        process: proc,
        required: Number((reqKgSum / 1000).toFixed(1)),
        delivered: Number((delKgSum / 1000).toFixed(1)),
        balance: Number((balKgSum / 1000).toFixed(1)),
        jobs,
      };
    });
  }, [filteredRows]);

  // Chart 3 — RFT % trend by slot with target line (95%)
  const rftTrendData = useMemo(() => {
    const slots = ['Slot 1 (1–10)', 'Slot 2 (11–20)', 'Slot 3 (21–30)'];
    return slots.map((s) => {
      const rowsInSlot = filteredRows.filter((r) => r.slot === s);
      const avg =
        rowsInSlot.length > 0
          ? Number((rowsInSlot.reduce((acc, r) => acc + r.rftPct, 0) / rowsInSlot.length).toFixed(1))
          : 95.0;
      return {
        slot: s.replace(' (', ' · '),
        rawSlot: s,
        rft: avg,
        target: 95,
        jobs: new Set(rowsInSlot.map((r) => r.buyerJob)).size,
      };
    });
  }, [filteredRows]);

  // Chart 4 — Sub-contract factory-wise: sent vs received vs balance (from real subcontract mills in dyeing-bootstrap.json)
  const subconChartData = useMemo(() => {
    const map = new Map<string, { sentKg: number; recvKg: number; jobs: Set<string> }>();
    filteredRows.forEach((r) => {
      if (r.factoryType !== 'Sub-con') return;
      const fac = r.dyeingFactory;
      const cur = map.get(fac) || { sentKg: 0, recvKg: 0, jobs: new Set<string>() };
      const sent = r.subSentKg > 0 ? r.subSentKg : r.knittedKg;
      const recv = Math.min(sent, r.dyedKg);
      cur.sentKg += sent;
      cur.recvKg += recv;
      cur.jobs.add(r.buyerJob);
      map.set(fac, cur);
    });
    return [...map.entries()]
      .sort((a, b) => b[1].sentKg - a[1].sentKg)
      .map(([fac, v]) => ({
        factory: fac,
        fullFactory: fac,
        sent: Number((v.sentKg / 1000).toFixed(1)),
        received: Number((v.recvKg / 1000).toFixed(1)),
        balance: Number((Math.max(0, v.sentKg - v.recvKg) / 1000).toFixed(1)),
        jobs: v.jobs.size,
      }));
  }, [filteredRows]);

  // Drill-down openers for B2 (Dyeing)
  const openSupplyDonutDrill = (donutTitle: 'Knitting' | 'NFL' | 'Sub-con', x: number, y: number) => {
    const subset =
      donutTitle === 'Knitting'
        ? filteredRows
        : filteredRows.filter((r) => r.factoryType === donutTitle);
    setDrillTarget(
      buildDrillTarget(
        `${donutTitle} Supply Breakdown`,
        't',
        x,
        y,
        subset,
        (r) => (donutTitle === 'Knitting' ? r.knittedKg : r.reqKg) / 1000,
        donutTitle === 'Knitting' ? undefined : 'factoryType',
        donutTitle === 'Knitting' ? undefined : donutTitle,
      ),
    );
  };

  const openSupplyColumnDrill = (
    col: { name: string; factoryType: 'NFL' | 'Sub-con'; mode: 'ready' | 'balance' },
    x: number,
    y: number,
  ) => {
    const subset = filteredRows.filter(
      (r) =>
        r.factoryType === col.factoryType &&
        (col.mode === 'ready' ? r.dyedKg > 0 : r.dyeBalanceKg > 0),
    );
    setDrillTarget(
      buildDrillTarget(
        `${col.name} Breakdown`,
        't',
        x,
        y,
        subset,
        (r) => (col.mode === 'ready' ? r.dyedKg : r.dyeBalanceKg) / 1000,
        'factoryType',
        col.factoryType,
      ),
    );
  };

  const openFinishingDrill = (
    proc: 'AOP' | 'Brush' | 'Peach',
    metric: 'required' | 'delivered' | 'balance',
    x: number,
    y: number,
  ) => {
    const matching = filteredRows.filter((r) => {
      if (proc === 'AOP') return Boolean(r.aopInfo) || /aop/i.test(r.additionalProcess);
      if (proc === 'Brush') return Boolean(r.brushInfo) || /brush/i.test(r.additionalProcess);
      return Boolean(r.peachInfo) || /peach/i.test(r.additionalProcess);
    });
    setDrillTarget(
      buildDrillTarget(
        `${proc} · ${metric.charAt(0).toUpperCase() + metric.slice(1)} by Factory`,
        't',
        x,
        y,
        matching,
        (r) => {
          const tuple = proc === 'AOP' ? r.aopInfo : proc === 'Brush' ? r.brushInfo : r.peachInfo;
          const req = tuple && tuple.sendKg > 0 ? tuple.sendKg : r.reqKg;
          const del = Math.min(req, tuple && tuple.rcvKg > 0 ? tuple.rcvKg : r.deliveredKg);
          const bal = Math.max(0, req - del);
          const kgVal = metric === 'required' ? req : metric === 'delivered' ? del : bal;
          return kgVal / 1000;
        },
        'finishingProcess',
        proc,
        (r) => {
          const tuple = proc === 'AOP' ? r.aopInfo : proc === 'Brush' ? r.brushInfo : r.peachInfo;
          return tuple?.factory || r.dyeingFactory;
        },
        'Factory',
      ),
    );
  };

  const openRftSlotDrill = (rawSlot: string, x: number, y: number) => {
    const inSlot = filteredRows.filter((r) => r.slot === rawSlot && r.nrftReason);
    const subset = inSlot.length > 0 ? inSlot : filteredRows.filter((r) => r.slot === rawSlot);
    setDrillTarget(
      buildDrillTarget(
        `${rawSlot} RFT / Re-dye & Shade Exceptions`,
        'kg',
        x,
        y,
        subset,
        (r) => r.reqKg,
        'slot',
        rawSlot,
        (r) => r.nrftReason || 'First-Time Pass (RFT)',
        'Reason',
      ),
    );
  };

  const openSubconDrill = (factoryName: string, metric: 'sent' | 'received' | 'balance', x: number, y: number) => {
    const subset = filteredRows.filter((r) => r.dyeingFactory === factoryName);
    const target = buildDrillTarget(
      `${factoryName} · ${metric.charAt(0).toUpperCase() + metric.slice(1)}`,
      't',
      x,
      y,
      subset,
      (r) => {
        const sent = r.subSentKg > 0 ? r.subSentKg : r.knittedKg;
        const recv = Math.min(sent, r.dyedKg);
        const bal = Math.max(0, sent - recv);
        return (metric === 'sent' ? sent : metric === 'received' ? recv : bal) / 1000;
      },
      'dyeingFactory',
      factoryName,
    );
    target.defaultDim = 'job';
    setDrillTarget(target);
  };

  // Main DataGrid columns (Job and Style frozen left: frozenColumns={2})
  const columns: GridColumn<DyeingBatchRow>[] = useMemo(
    () => [
      {
        key: 'buyerJob',
        header: 'Buyer - Job No',
        width: 160,
        value: (r) => r.buyerJob,
        render: (r) => (
          <span>
            {r.buyer} ·{' '}
            <Link
              href={`/jobs/${encodeURIComponent(r.jobNo)}`}
              className="dg-job-link"
              onClick={(e) => e.stopPropagation()}
              title={`Open Job 360 for #${r.jobNo}`}
            >
              #{r.jobNo}
            </Link>
          </span>
        ),
      },
      { key: 'style', header: 'Style No', width: 115, value: (r) => r.style },
      { key: 'color', header: 'Colour', width: 170, value: (r) => r.color },
      { key: 'fabric', header: 'Fabric Type', width: 120, value: (r) => r.fabric },
      { key: 'gsm', header: 'GSM', width: 68, value: (r) => r.gsm },
      { key: 'dia', header: 'Dia', width: 65, value: (r) => r.dia },
      { key: 'finishingProcess', header: 'Finishing', width: 100, value: (r) => r.finishingProcess },
      { key: 'factoryType', header: 'Source', width: 90, value: (r) => r.factoryType },
      { key: 'dyeingFactory', header: 'Dyeing Factory', width: 130, value: (r) => r.dyeingFactory },
      { key: 'batchNo', header: 'Batch #', width: 95, value: (r) => r.batchNo, hiddenByDefault: true },
      { key: 'slot', header: 'Planning Slot', width: 120, value: (r) => r.slot },
      { key: 'reqKg', header: 'Required (kg)', width: 115, value: (r) => r.reqKg, numeric: true, total: true, unit: 'kg' },
      { key: 'knittedKg', header: 'Knitted (kg)', width: 115, value: (r) => r.knittedKg, numeric: true, total: true, unit: 'kg', hiddenByDefault: true },
      { key: 'dyedKg', header: 'Dyed (kg)', width: 110, value: (r) => r.dyedKg, numeric: true, total: true, unit: 'kg' },
      { key: 'deliveredKg', header: 'Delivered (kg)', width: 115, value: (r) => r.deliveredKg, numeric: true, total: true, unit: 'kg' },
      {
        key: 'dyeBalanceKg',
        header: 'Balance (kg)',
        width: 115,
        value: (r) => r.dyeBalanceKg,
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
        width: 85,
        value: (r) => r.rftPct,
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
        width: 100,
        value: (r) => r.tnaDate,
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
        value: (r) => r.status,
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
    <Shell title="Dyeing">
      <SectionNav
        items={[
          { id: 'dyeing-kpis', label: 'KPI Summary' },
          { id: 'dyeing-supply', label: 'Supply Status' },
          { id: 'dyeing-charts', label: 'Finishing, RFT & Sub-con' },
          { id: 'dyeing-schedule', label: 'Job & Colour Table' },
        ]}
      />

      {/* Top Selector: Month / Shipment week / Planning slot (10-day) — drives everything */}
      <CommandBar
        left={
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--fs-meta)', fontWeight: 700, color: 'var(--nos-ink-3)', textTransform: 'uppercase' }}>
              Horizon:
            </span>
            <Button
              size="sm"
              variant={horizonMode === 'month' ? 'primary' : 'secondary'}
              onClick={() => {
                setHorizonMode('month');
                setSlicer((s) => ({ ...s, week: 'ALL', slot: 'ALL' }));
              }}
            >
              Month
            </Button>
            <Button
              size="sm"
              variant={horizonMode === 'week' ? 'primary' : 'secondary'}
              onClick={() => {
                setHorizonMode('week');
                setSlicer((s) => ({ ...s, slot: 'ALL', week: s.week === 'ALL' ? 'W1' : s.week }));
              }}
            >
              Shipment Week
            </Button>
            <Button
              size="sm"
              variant={horizonMode === 'slot' ? 'primary' : 'secondary'}
              onClick={() => {
                setHorizonMode('slot');
                setSlicer((s) => ({ ...s, week: 'ALL', slot: s.slot === 'ALL' ? 'Slot 1 (1–10)' : s.slot }));
              }}
            >
              Planning Slot (10-Day)
            </Button>
          </div>
        }
        right={
          <div style={{ display: 'inline-flex', gap: 8 }}>
            <Button size="sm" variant="secondary" onClick={() => window.print()}>
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
        factories={factoryList}
      />

      <CrossFilterChips />

      {/* 6 KPI Cards: jobs, colours, kg, overall machine utilisation % of TOTAL capacity, RFT %, T&A-crossed (jobs + kg) */}
      <div
        id="dyeing-kpis"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <KpiCard
          label="Jobs"
          value={fmtNum(kpis.jobsCount)}
          unit="jobs"
          delta={`${fmtNum(kpis.coloursCount)} colour lines`}
          deltaDirection="up"
          series={[340, 355, 368, 380, 392, kpis.jobsCount]}
          onDoubleClick={(e) =>
            setDrillTarget(
              buildDrillTarget('Active Dyeing Jobs', 'kg', e.clientX, e.clientY, filteredRows, (r) => r.reqKg),
            )
          }
        />
        <KpiCard
          label="Colours"
          value={fmtNum(kpis.coloursCount)}
          unit="colours"
          delta="NFL + Sub-con"
          deltaDirection="flat"
          series={[1200, 1450, 1680, 2100, 3200, kpis.coloursCount]}
        />
        <KpiCard
          label="Required Dyeing"
          value={fmtNum(Math.round(kpis.totalReqKg))}
          unit="kg"
          delta={`${fmtNum(Number((kpis.totalReqKg / 1000).toFixed(1)), 1)} t (${fmtNum(Number((kpis.totalDyedKg / 1000).toFixed(1)), 1)} t dyed)`}
          deltaDirection="up"
          series={[620, 680, 710, 740, 790, Math.round(kpis.totalReqKg / 1000)]}
          onDoubleClick={(e) =>
            setDrillTarget(
              buildDrillTarget('Required Dyeing Quantity', 'kg', e.clientX, e.clientY, filteredRows, (r) => r.reqKg),
            )
          }
        />
        <KpiCard
          label="Machine Utilisation"
          value={fmtPct(kpis.utilPct)}
          delta={`of Total Capacity (${fmtNum(Number((totalBulkMachineCapKgDay / 1000).toFixed(1)), 1)} t/day)`}
          deltaDirection={kpis.utilPct >= 80 ? 'up' : 'flat'}
          series={[78, 81, 83, 85, 84, Math.round(kpis.utilPct)]}
        />
        <KpiCard
          label="Bulk RFT %"
          value={fmtPct(kpis.avgRft)}
          delta="Target: 95.0%"
          deltaDirection={kpis.avgRft >= 95 ? 'up' : 'down'}
          series={[94.2, 94.6, 95.0, 95.2, 95.4, kpis.avgRft]}
        />
        <KpiCard
          label="T&A-Crossed"
          value={`${fmtNum(kpis.tnaJobsCount)} jobs`}
          delta={fmtQty(kpis.tnaKg, 'kg')}
          deltaDirection={kpis.tnaJobsCount > 0 ? 'down' : 'up'}
          onClick={() => toggle('tnaCrossed', 'true', 'T&A Crossed')}
          onDoubleClick={(e) =>
            setDrillTarget(
              buildDrillTarget(
                'T&A-Crossed Overdue Batches',
                'kg',
                e.clientX,
                e.clientY,
                filteredRows.filter((r) => r.tnaCrossed),
                (r) => r.dyeBalanceKg,
                'tnaCrossed',
                'true',
              ),
            )
          }
        />
      </div>

      {/* ===================================================================== */}
      {/* CHART 1: "Supply status" (ONE group box, two halves, ONE legend) */}
      {/* ===================================================================== */}
      <div id="dyeing-supply">
        <Card
          title="Supply status"
          action={
            <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)' }}>
              Single-click cross-filters · Double-click drills down
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
              {(
                [
                  { title: 'Knitting' as const, data: supplyStatus.knittingDonut, filterKey: 'NFL' },
                  { title: 'NFL' as const, data: supplyStatus.nflDonut, filterKey: 'NFL' },
                  { title: 'Sub-con' as const, data: supplyStatus.subDonut, filterKey: 'Sub-con' },
                ]
              ).map((d) => (
                <div
                  key={d.title}
                  onClick={(e) =>
                    handleMarkInteraction(
                      `donut-${d.title}`,
                      e,
                      () => {
                        if (d.title === 'NFL' || d.title === 'Sub-con') {
                          toggle('factoryType', d.filterKey, 'Source');
                        }
                      },
                      (x, y) => openSupplyDonutDrill(d.title, x, y),
                    )
                  }
                  onDoubleClick={(e) => openSupplyDonutDrill(d.title, e.clientX, e.clientY)}
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
                        <Tooltip formatter={(v: unknown, n: unknown) => [`${fmtNum(Number(v), 1)} t`, String(n)]} />
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
              <div className="nos-chart-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={supplyStatus.fourColumns}
                    margin={{ top: 10, right: 12, left: -12, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 10 }} unit=" t" />
                    <Tooltip
                      formatter={(val: unknown, _name: unknown, item: { payload?: typeof supplyStatus.fourColumns[number] }) => {
                        const p = item?.payload;
                        return [
                          `${fmtNum(Number(val), 1)} t · ${fmtNum(p?.jobs ?? 0)} jobs · ${fmtNum(p?.colours ?? 0)} colours`,
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
                      onClick={rechartsClick((data: typeof supplyStatus.fourColumns[number], _idx: number, e: React.MouseEvent) => {
                        if (!data) return;
                        handleMarkInteraction(
                          `col-${data.name}`,
                          e,
                          () => toggle('factoryType', data.factoryType, 'Source'),
                          (x, y) => openSupplyColumnDrill(data, x, y),
                        );
                      })}
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
              </div>
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
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => toggle('factoryType', c.factoryType, 'Source')}
                    onDoubleClick={(e) => openSupplyColumnDrill(c, e.clientX, e.clientY)}
                    style={{
                      background: 'var(--nos-inset)',
                      padding: '4px 6px',
                      borderRadius: 4,
                      border: '1px solid transparent',
                      cursor: 'pointer',
                      color: 'inherit',
                    }}
                  >
                    <strong style={{ display: 'block', color: 'var(--nos-ink)' }}>{fmtNum(c.tons, 1)} t</strong>
                    <span>
                      {fmtNum(c.jobs)} jobs · {fmtNum(c.colours)} col
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ONE shared legend for the entire Supply Status group box */}
          <div className="nos-chart-meta" style={{ marginTop: 10 }}>
            <div className="nos-chart-legend">
              <span className="nos-chart-legend-item">
                <span className="nos-chart-swatch" style={{ background: '#16A34A' }} />
                Done / Dyed / Ready
              </span>
              <span className="nos-chart-legend-item">
                <span className="nos-chart-swatch" style={{ background: '#2563EB' }} />
                Grey Ready / Ready to Send
              </span>
              <span className="nos-chart-legend-item">
                <span className="nos-chart-swatch" style={{ background: '#D97706' }} />
                Waiting Knitting
              </span>
              <span className="nos-chart-legend-item">
                <span className="nos-chart-swatch" style={{ background: '#DC2626' }} />
                Balance
              </span>
            </div>
            <strong>{fmtJobsQty(kpis.jobsCount, Number((kpis.totalReqKg / 1000).toFixed(1)), 't')}</strong>
          </div>
        </Card>
      </div>

      {/* ===================================================================== */}
      {/* CHARTS 2, 3, 4: Finishing Process, RFT % Trend, Sub-con Factory-wise */}
      {/* ===================================================================== */}
      <div
        id="dyeing-charts"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
          gap: 12,
          marginBottom: 12,
        }}
      >
        {/* Chart 2 — "Finishing process": AOP, Brush, Peach; required (blue), delivered (green), balance (red) */}
        <Card
          title="Finishing process (AOP, Brush, Peach)"
          action={
            <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)' }}>
              Double-click bar to drill by factory
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
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="process" tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10 }} unit=" t" />
                <Tooltip
                  formatter={(val: unknown, name: unknown, item: { payload?: { jobs?: number } }) => [
                    `${fmtNum(Number(val), 1)} t (${fmtNum(item?.payload?.jobs ?? 0)} jobs)`,
                    String(name).charAt(0).toUpperCase() + String(name).slice(1),
                  ]}
                />
                <Bar
                  {...FX_SERIES}
                  {...FX_BAR}
                  dataKey="required"
                  fill="#2563EB"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={22}
                  cursor="pointer"
                  onClick={rechartsClick((d: { process?: 'AOP' | 'Brush' | 'Peach' }, _i: number, e: React.MouseEvent) => {
                    const proc = d?.process;
                    if (!proc) return;
                    handleMarkInteraction(
                      `fin-${proc}-req`,
                      e,
                      () => toggle('finishingProcess', proc, 'Finishing'),
                      (x, y) => openFinishingDrill(proc, 'required', x, y),
                    );
                  })}
                />
                <Bar
                  {...FX_SERIES}
                  {...FX_BAR}
                  dataKey="delivered"
                  fill="#16A34A"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={22}
                  cursor="pointer"
                  onClick={rechartsClick((d: { process?: 'AOP' | 'Brush' | 'Peach' }, _i: number, e: React.MouseEvent) => {
                    const proc = d?.process;
                    if (!proc) return;
                    handleMarkInteraction(
                      `fin-${proc}-del`,
                      e,
                      () => toggle('finishingProcess', proc, 'Finishing'),
                      (x, y) => openFinishingDrill(proc, 'delivered', x, y),
                    );
                  })}
                />
                <Bar
                  {...FX_SERIES}
                  {...FX_BAR}
                  dataKey="balance"
                  fill="#DC2626"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={22}
                  cursor="pointer"
                  onClick={rechartsClick((d: { process?: 'AOP' | 'Brush' | 'Peach' }, _i: number, e: React.MouseEvent) => {
                    const proc = d?.process;
                    if (!proc) return;
                    handleMarkInteraction(
                      `fin-${proc}-bal`,
                      e,
                      () => toggle('finishingProcess', proc, 'Finishing'),
                      (x, y) => openFinishingDrill(proc, 'balance', x, y),
                    );
                  })}
                />
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
                onClick={rechartsChartClick((state: { activeLabel?: string }, e: React.MouseEvent) => {
                  const item = rftTrendData.find((x) => x.slot === state?.activeLabel);
                  if (!item) return;
                  handleMarkInteraction(
                    `rft-${item.rawSlot}`,
                    e,
                    () => toggle('slot', item.rawSlot, 'Planning slot'),
                    (x, y) => openRftSlotDrill(item.rawSlot, x, y),
                  );
                })}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="slot" tick={{ fontSize: 10, fontWeight: 600 }} />
                <YAxis domain={[88, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip
                  formatter={(val: unknown, _n: unknown, item: { payload?: { jobs?: number } }) => [
                    `${val}% (${fmtNum(item?.payload?.jobs ?? 0)} jobs)`,
                    'RFT %',
                  ]}
                />
                <ReferenceLine
                  y={95}
                  stroke="#2563EB"
                  strokeDasharray="4 4"
                  label={{ value: 'Target 95%', fontSize: 10, fill: '#2563EB' }}
                />
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
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="factory" tick={{ fontSize: 10, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10 }} unit=" t" />
                <Tooltip
                  formatter={(val: unknown, name: unknown, item: { payload?: { jobs?: number } }) => [
                    `${fmtNum(Number(val), 1)} t (${fmtNum(item?.payload?.jobs ?? 0)} jobs)`,
                    String(name).charAt(0).toUpperCase() + String(name).slice(1),
                  ]}
                />
                <Bar
                  {...FX_SERIES}
                  {...FX_BAR}
                  dataKey="sent"
                  fill="#2563EB"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={18}
                  cursor="pointer"
                  onClick={rechartsClick((d: { fullFactory?: string }, _i: number, e: React.MouseEvent) => {
                    const fac = d?.fullFactory;
                    if (!fac) return;
                    handleMarkInteraction(
                      `sub-${fac}-sent`,
                      e,
                      () => toggle('dyeingFactory', fac, 'Sub-con Mill'),
                      (x, y) => openSubconDrill(fac, 'sent', x, y),
                    );
                  })}
                />
                <Bar
                  {...FX_SERIES}
                  {...FX_BAR}
                  dataKey="received"
                  fill="#16A34A"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={18}
                  cursor="pointer"
                  onClick={rechartsClick((d: { fullFactory?: string }, _i: number, e: React.MouseEvent) => {
                    const fac = d?.fullFactory;
                    if (!fac) return;
                    handleMarkInteraction(
                      `sub-${fac}-recv`,
                      e,
                      () => toggle('dyeingFactory', fac, 'Sub-con Mill'),
                      (x, y) => openSubconDrill(fac, 'received', x, y),
                    );
                  })}
                />
                <Bar
                  {...FX_SERIES}
                  {...FX_BAR}
                  dataKey="balance"
                  fill="#DC2626"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={18}
                  cursor="pointer"
                  onClick={rechartsClick((d: { fullFactory?: string }, _i: number, e: React.MouseEvent) => {
                    const fac = d?.fullFactory;
                    if (!fac) return;
                    handleMarkInteraction(
                      `sub-${fac}-bal`,
                      e,
                      () => toggle('dyeingFactory', fac, 'Sub-con Mill'),
                      (x, y) => openSubconDrill(fac, 'balance', x, y),
                    );
                  })}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </Card>
      </div>

      {/* ===================================================================== */}
      {/* MAIN JOB-AND-COLOUR TABLE (FULL WIDTH, DATAGRID + RECORDPANEL) */}
      {/* ===================================================================== */}
      <div id="dyeing-schedule">
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
            storageKey="dyeing-main-schedule-v2"
            exportName="dyeing-schedule"
            emptyText="No dyeing batches match the active filters"
            onRowClick={(r) => setSelectedRowId(r.id)}
            selectedRowKey={selectedRowId}
            loading={loading}
          />
        </Card>
      </div>

      {/* DrillPopup for all Dyeing charts */}
      <DrillPopup
        target={drillTarget}
        onClose={() => setDrillTarget(null)}
        onShowInTable={(field, val) => {
          if (field && val) setFilter(field, val, field);
        }}
      />

      {/* RecordPanel for Row Click */}
      <RecordPanel
        open={!!selectedRow}
        onClose={() => setSelectedRowId(null)}
        title={selectedRow ? `${selectedRow.buyerJob} · ${selectedRow.color}` : ''}
        subtitle={selectedRow ? `Style ${selectedRow.style} · ${selectedRow.dyeingFactory} (Batch ${selectedRow.batchNo})` : ''}
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
                    { key: 'buyerJob', label: 'Job', value: selectedRow.buyerJob, readOnly: true },
                    { key: 'style', label: 'Style', value: selectedRow.style, readOnly: true },
                    { key: 'color', label: 'Colour', value: selectedRow.color, required: true },
                    { key: 'fabric', label: 'Fabric Type', value: selectedRow.fabric },
                    { key: 'gsm', label: 'GSM', value: selectedRow.gsm },
                    { key: 'dia', label: 'Dia', value: selectedRow.dia },
                  ],
                },
                {
                  name: 'Dyeing Factory, Finishing & Quantities',
                  fields: [
                    {
                      key: 'dyeingFactory',
                      label: 'Dyeing Factory',
                      value: selectedRow.dyeingFactory,
                      type: 'select',
                      options: factoryList.filter((f) => f !== 'ALL' && f !== 'Sub-con'),
                    },
                    {
                      key: 'finishingProcess',
                      label: 'Finishing Process',
                      value: selectedRow.finishingProcess,
                      type: 'select',
                      options: ['AOP', 'Brush', 'Peach', 'Standard'],
                    },
                    { key: 'batchNo', label: 'Batch No', value: selectedRow.batchNo },
                    { key: 'reqKg', label: 'Required kg', value: selectedRow.reqKg, type: 'number', unit: 'kg', readOnly: true },
                    { key: 'dyedKg', label: 'Dyed kg', value: selectedRow.dyedKg, type: 'number', unit: 'kg', min: 0 },
                    { key: 'deliveredKg', label: 'Delivered kg', value: selectedRow.deliveredKg, type: 'number', unit: 'kg', min: 0 },
                    { key: 'dyeBalanceKg', label: 'Balance kg', value: selectedRow.dyeBalanceKg, type: 'number', unit: 'kg', readOnly: true },
                    { key: 'rftPct', label: 'RFT %', value: selectedRow.rftPct, type: 'number', unit: '%', min: 0, max: 100 },
                    {
                      key: 'status',
                      label: 'Status',
                      value: selectedRow.status,
                      type: 'status',
                      options: ['Dyed & Delivered', 'In Process', 'Grey Ready', 'Ready to Send', 'Waiting Knitting'],
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
          const nextDel = Number(vals.deliveredKg) || 0;
          setRawRows((prev) =>
            prev.map((item) => {
              if (item.id !== selectedRow.id) return item;
              const nextBal = Math.max(0, item.reqKg - nextDyed);
              return {
                ...item,
                color: String(vals.color || item.color),
                dyeingFactory: String(vals.dyeingFactory || item.dyeingFactory),
                finishingProcess: (vals.finishingProcess as DyeingBatchRow['finishingProcess']) || item.finishingProcess,
                batchNo: String(vals.batchNo || item.batchNo),
                dyedKg: nextDyed,
                deliveredKg: nextDel,
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
