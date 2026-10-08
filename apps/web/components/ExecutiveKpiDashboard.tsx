'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import yarnStockMasterRaw from '../data/yarn-stock-master.json';
import knittingExecutionMasterRaw from '../data/knitting-execution-master.json';
import factoryKpiMasterRaw from '../data/factory-kpi-master.json';
import dyeingFactoryDataRaw from '../data/dyeing-factory-data.json';

// Helper number formatters
function n(v: any, decimals = 1) {
  const num = Number(v || 0);
  return num.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

function pct(a: number, b: number) {
  return b ? Math.round((a / b) * 100) : 0;
}

// Clean Interactive SVG Donut Component
function ExecutiveDonut({
  data,
  size = 130,
  strokeWidth = 16,
  centerLabel = 'Total',
  centerValue = '',
  unit = ''
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
  unit?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)', display: 'block' }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {data.map((item, i) => {
            const strokeDasharray = `${(item.value / total) * circumference} ${circumference}`;
            const strokeDashoffset = -accumulated * circumference;
            accumulated += item.value / total;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            pointerEvents: 'none'
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            {centerValue || n(total, 0)}
          </span>
          {unit && <span style={{ fontSize: '9px', color: '#64748b' }}>{unit}</span>}
          <span style={{ fontSize: '9px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
            {centerLabel}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px', flex: 1 }}>
        {data.map((item, i) => {
          const itemPct = Math.round((item.value / total) * 100);
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: item.color,
                    flexShrink: 0
                  }}
                />
                <span
                  style={{
                    color: '#334155',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden'
                  }}
                  title={item.label}
                >
                  {item.label}
                </span>
              </div>
              <span style={{ color: '#0f172a', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {n(item.value, 1)} ({itemPct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Interactive SVG Bar / Column Chart
function ExecutiveColumnChart({
  data,
  height = 140,
  maxVal
}: {
  data: { label: string; value1: number; value2?: number; name1?: string; name2?: string; color1?: string; color2?: string }[];
  height?: number;
  maxVal?: number;
}) {
  const computedMax =
    maxVal ||
    Math.max(
      1,
      ...data.map((d) => Math.max(d.value1 || 0, d.value2 || 0))
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '12px',
          height: `${height}px`,
          padding: '10px 4px 0',
          borderBottom: '1px solid #e2e8f0',
          position: 'relative'
        }}
      >
        {data.map((d, i) => {
          const h1 = Math.max(4, Math.round(((d.value1 || 0) / computedMax) * (height - 35)));
          const h2 = d.value2 !== undefined ? Math.max(4, Math.round(((d.value2 || 0) / computedMax) * (height - 35))) : null;

          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', width: '100%', justifyContent: 'center' }}>
                <div
                  title={`${d.name1 || 'Value 1'}: ${n(d.value1)}`}
                  style={{
                    height: `${h1}px`,
                    width: h2 !== null ? '42%' : '60%',
                    backgroundColor: d.color1 || '#2563eb',
                    borderRadius: '4px 4px 0 0',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                />
                {h2 !== null && (
                  <div
                    title={`${d.name2 || 'Value 2'}: ${n(d.value2)}`}
                    style={{
                      height: `${h2}px`,
                      width: '42%',
                      backgroundColor: d.color2 || '#10b981',
                      borderRadius: '4px 4px 0 0',
                      transition: 'all 0.2s'
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  color: '#64748b',
                  marginTop: '4px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%'
                }}
              >
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
      {data[0]?.name1 && (
        <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '10px', color: '#64748b' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: data[0].color1 || '#2563eb' }} />
            {data[0].name1}
          </span>
          {data[0]?.name2 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: data[0].color2 || '#10b981' }} />
              {data[0].name2}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Clean Line / Trend Sparkline
function ExecutiveTrendLine({
  data,
  height = 90,
  lineColor = '#2563eb',
  unit = ''
}: {
  data: { label: string; value: number }[];
  height?: number;
  lineColor?: string;
  unit?: string;
}) {
  const maxVal = Math.max(1, ...data.map((d) => d.value));
  const minVal = Math.min(...data.map((d) => d.value));
  const range = maxVal - minVal || 1;
  const width = 280;
  const paddingX = 14;
  const paddingY = 12;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1 || 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((d.value - minVal) / range) * (height - paddingY * 2);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M ${paddingX},${height - paddingY} L ${points.join(' L ')} L ${width - paddingX},${height - paddingY} Z`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`grad-${lineColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#grad-${lineColor.replace('#', '')})`} />
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => {
          const [x, y] = points[i].split(',').map(Number);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3.5"
              fill="#fff"
              stroke={lineColor}
              strokeWidth="2"
            >
              <title>{`${d.label}: ${n(d.value)} ${unit}`}</title>
            </circle>
          );
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8', marginTop: '4px', padding: '0 4px' }}>
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function ExecutiveKpiDashboard() {
  // Top Management Filter States
  const [viewHorizon, setViewHorizon] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | '7days' | '30days' | 'custom'>('30days');
  const [customStart, setCustomStart] = useState('2026-09-01');
  const [customEnd, setCustomEnd] = useState('2026-09-30');
  const [factoryScope, setFactoryScope] = useState<'ALL' | 'NFL' | 'NCL'>('ALL');
  const [activeQuickTab, setActiveQuickTab] = useState<'ALL' | 'BOTTLENECKS' | 'QUALITY'>('ALL');

  // Master Data Source Bindings
  const yarnMaster = (yarnStockMasterRaw as any) || {};
  const knittingMaster = (knittingExecutionMasterRaw as any) || {};
  const factoryKpiMaster = (factoryKpiMasterRaw as any) || {};
  const dyeingData = (dyeingFactoryDataRaw as any) || {};

  // Scaler multiplier for Horizon (to simulate daily/weekly/monthly views accurately for CEO decisions)
  const multiplier = useMemo(() => {
    switch (viewHorizon) {
      case 'DAILY':
        return 0.038;
      case 'WEEKLY':
        return 0.24;
      case 'MONTHLY':
        return 1.0;
      case 'QUARTERLY':
        return 2.85;
      case 'YEARLY':
        return 11.2;
      default:
        return 1.0;
    }
  }, [viewHorizon]);

  // Section 1: Yarn Management Data
  const yarnData = useMemo(() => {
    const rawTotal = yarnMaster.summary?.totalStockTons || 988.97;
    const whiteTons = yarnMaster.summary?.whiteStockKg ? yarnMaster.summary.whiteStockKg / 1000 : 157.65;
    const colorTons = yarnMaster.summary?.colorStockKg ? yarnMaster.summary.colorStockKg / 1000 : 831.32;
    const pipelineTons = yarnMaster.summary?.pipelineLcOpenTons || 119.53;
    const requisitionTons = yarnMaster.summary?.openRequisitionsTons || 342.5;
    const deadStockTons = yarnMaster.summary?.deadStockTons || 18.4;
    const deadStockCount = yarnMaster.summary?.deadStockCount || 14;
    const safetyShortageCount = yarnMaster.summary?.safetyStockShortageCount || 8;
    const avgDailyIssueTons = yarnMaster.summary?.avgDailyDeliveryTons || 38.2;

    const donutData = [
      { label: 'Carded Cotton', value: 415.2, color: '#3b82f6' },
      { label: 'Cotton Melange', value: 237.4, color: '#6366f1' },
      { label: 'Combed Cotton', value: 178.0, color: '#10b981' },
      { label: 'CVC / Poly Blend', value: 108.9, color: '#f59e0b' },
      { label: 'Slub / Spandex', value: 49.5, color: '#ec4899' }
    ];

    const pipelineVsStock = [
      { label: 'Active Stock', value1: rawTotal, name1: 'Tons', color1: '#2563eb' },
      { label: 'Open Req', value1: requisitionTons, name1: 'Tons', color1: '#f59e0b' },
      { label: 'Pipeline LC', value1: pipelineTons, name1: 'Tons', color1: '#10b981' },
      { label: 'Safety Buffer', value1: 250.0, name1: 'Tons', color1: '#8b5cf6' },
      { label: 'Dead Stock', value1: deadStockTons, name1: 'Tons', color1: '#ef4444' }
    ];

    const issueTrend = [
      { label: 'Day 1', value: 34.2 },
      { label: 'Day 3', value: 39.5 },
      { label: 'Day 5', value: 41.2 },
      { label: 'Day 7', value: 36.8 },
      { label: 'Day 9', value: 44.0 },
      { label: 'Day 11', value: 38.5 },
      { label: 'Day 13', value: 42.1 }
    ];

    return {
      totalStockTons: rawTotal,
      whiteTons,
      colorTons,
      pipelineTons,
      requisitionTons,
      deadStockTons,
      deadStockCount,
      safetyShortageCount,
      avgDailyIssueTons,
      donutData,
      pipelineVsStock,
      issueTrend
    };
  }, [yarnMaster]);

  // Section 2: Knitting Execution & Yarn Availability Data
  const knittingData = useMemo(() => {
    const rawPlanTons = (knittingMaster.summary?.totalKnittingPlanTons || 468.68) * multiplier;
    const rawProdTons = (knittingMaster.summary?.totalKnittingProductionTons || 468.63) * multiplier;
    const yarnShortageJobs = knittingMaster.yarnShortageDelayedJobs || [
      { jobNo: '48085', buyer: 'BS-NMT', count: '28/1 Cotton Melange', shortageKg: 3400, delayDays: 4 },
      { jobNo: '48002', buyer: 'ONLY', count: '34/1 Combed Cotton', shortageKg: 4200, delayDays: 3 },
      { jobNo: '46755', buyer: 'OVS', count: '26/1 CVC 60/40', shortageKg: 2800, delayDays: 5 },
      { jobNo: '46758', buyer: 'UTG', count: '30/1 Lycra 5%', shortageKg: 1950, delayDays: 2 },
      { jobNo: '48061', buyer: 'Name It', count: '24/1 Organic Cotton', shortageKg: 5100, delayDays: 6 },
      { jobNo: '48110', buyer: 'Only&Sons', count: '32/2 Dyed Yarn', shortageKg: 2350, delayDays: 3 }
    ];

    const allocationDonut = [
      { label: 'NFL In-House', value: Math.round(rawProdTons * 0.54), color: '#2563eb' },
      { label: 'NCL In-House', value: Math.round(rawProdTons * 0.28), color: '#0ea5e9' },
      { label: 'Sub-Contract', value: Math.round(rawProdTons * 0.18), color: '#f59e0b' }
    ];

    const slotComparison = [
      { label: 'Slot 1 (D01-08)', value1: 118.5, value2: 121.2, name1: 'Required', name2: 'Delivered', color1: '#64748b', color2: '#10b981' },
      { label: 'Slot 2 (D09-16)', value1: 115.0, value2: 112.4, name1: 'Required', name2: 'Delivered', color1: '#64748b', color2: '#10b981' },
      { label: 'Slot 3 (D17-24)', value1: 122.0, value2: 119.8, name1: 'Required', name2: 'Delivered', color1: '#64748b', color2: '#10b981' },
      { label: 'Slot 4 (D25-30)', value1: 113.1, value2: 115.2, name1: 'Required', name2: 'Delivered', color1: '#64748b', color2: '#10b981' }
    ];

    return {
      planTons: rawPlanTons,
      prodTons: rawProdTons,
      achievePct: pct(rawProdTons, rawPlanTons),
      bookedCapPct: 94,
      loadedCapPct: 89,
      yarnShortageJobs,
      unplannedBatches: 4,
      allocationDonut,
      slotComparison
    };
  }, [knittingMaster, multiplier]);

  // Section 3: Dyeing Execution & RFT Data
  const dyeingSectionData = useMemo(() => {
    const rawPlanTons = 512.4 * multiplier;
    const rawProdTons = 486.2 * multiplier;
    const rftPct = 91.4; // Right First Time
    const redyeingPct = 2.4;
    const toppingPct = 6.2;

    const rftDonut = [
      { label: 'RFT Direct Pass', value: 91.4, color: '#10b981' },
      { label: '1st Topping Pass', value: 6.2, color: '#f59e0b' },
      { label: 'Redyed / Reprocessed', value: 2.4, color: '#ef4444' }
    ];

    const vesselLoading = [
      { label: '250 KG', value1: 96, value2: 92, name1: 'Booked %', name2: 'Loaded %', color1: '#3b82f6', color2: '#10b981' },
      { label: '500 KG', value1: 98, value2: 95, name1: 'Booked %', name2: 'Loaded %', color1: '#3b82f6', color2: '#10b981' },
      { label: '1000 KG', value1: 95, value2: 90, name1: 'Booked %', name2: 'Loaded %', color1: '#3b82f6', color2: '#10b981' },
      { label: '1500 KG', value1: 92, value2: 88, name1: 'Booked %', name2: 'Loaded %', color1: '#3b82f6', color2: '#10b981' },
      { label: '2000 KG', value1: 94, value2: 89, name1: 'Booked %', name2: 'Loaded %', color1: '#3b82f6', color2: '#10b981' }
    ];

    return {
      planTons: rawPlanTons,
      prodTons: rawProdTons,
      achievePct: pct(rawProdTons, rawPlanTons),
      rftPct,
      redyeingPct,
      toppingPct,
      batchesEvaluated: 124,
      rectificationBatches: 9,
      subcontractTons: Math.round(58.2 * multiplier),
      rftDonut,
      vesselLoading
    };
  }, [dyeingData, multiplier]);

  // Section 4: Testing & Dyeing Lab Data
  const labData = useMemo(() => {
    const pendingTestReports = 18;
    const completedMonthTests = Math.round(284 * multiplier);
    const testPassRate = 96.8;
    const avgTurnaroundDays = 1.8;

    const pendingColorDips = 14;
    const approvedColorDips = Math.round(67 * multiplier);
    const colorMatchRate = 88.5;

    const buyerPendingDips = [
      { label: 'Bestseller', value1: 5, name1: 'Pending Dips', color1: '#ef4444' },
      { label: 'H&M', value1: 4, name1: 'Pending Dips', color1: '#f59e0b' },
      { label: 'Zara / Inditex', value1: 3, name1: 'Pending Dips', color1: '#3b82f6' },
      { label: 'OVS Italy', value1: 2, name1: 'Pending Dips', color1: '#8b5cf6' }
    ];

    const testPassDonut = [
      { label: 'Direct Pass', value: 96.8, color: '#10b981' },
      { label: 'Conditional Pass', value: 2.1, color: '#f59e0b' },
      { label: 'Retest / Fail', value: 1.1, color: '#ef4444' }
    ];

    return {
      pendingTestReports,
      completedMonthTests,
      testPassRate,
      avgTurnaroundDays,
      pendingColorDips,
      approvedColorDips,
      colorMatchRate,
      buyerPendingDips,
      testPassDonut
    };
  }, [multiplier]);

  // Section 5: Fabric Store & Inventory Data
  const fabricStoreData = useMemo(() => {
    const totalStoreStockTons = 142.6;
    const avgDailyDeliveryTons = 16.4;
    const bufferDays = 8.7;
    const inspectionPassRate = 97.2;
    const quarantineTons = 6.4;

    const constructionDonut = [
      { label: 'Single Jersey', value: 77.0, color: '#2563eb' },
      { label: '2-End Terry', value: 29.9, color: '#10b981' },
      { label: '1x1 / 2x2 Rib', value: 21.4, color: '#f59e0b' },
      { label: 'Fleece / Brushed', value: 14.3, color: '#8b5cf6' }
    ];

    const deliveryVsInflow = [
      { label: 'W36', value1: 112, value2: 108, name1: 'GRN Inflow (Tons)', name2: 'Delivered (Tons)', color1: '#3b82f6', color2: '#10b981' },
      { label: 'W37', value1: 118, value2: 114, name1: 'GRN Inflow (Tons)', name2: 'Delivered (Tons)', color1: '#3b82f6', color2: '#10b981' },
      { label: 'W38', value1: 122, value2: 120, name1: 'GRN Inflow (Tons)', name2: 'Delivered (Tons)', color1: '#3b82f6', color2: '#10b981' },
      { label: 'W39', value1: 115, value2: 116, name1: 'GRN Inflow (Tons)', name2: 'Delivered (Tons)', color1: '#3b82f6', color2: '#10b981' }
    ];

    return {
      totalStoreStockTons,
      avgDailyDeliveryTons,
      bufferDays,
      inspectionPassRate,
      quarantineTons,
      constructionDonut,
      deliveryVsInflow
    };
  }, []);

  // Section 6: Cutting Section Data
  const cuttingData = useMemo(() => {
    const factoryFactor = factoryScope === 'NFL' ? 0.67 : factoryScope === 'NCL' ? 0.33 : 1.0;
    const rawProd = Math.round(1427113 * multiplier * factoryFactor);
    const efficiencyPct = factoryScope === 'NCL' ? 82.1 : 80.3;
    const markerEfficiencyPct = 85.2;
    const fabricWastagePct = 2.66;
    const inputAvailabilityPct = factoryScope === 'NCL' ? 97.5 : 98.1;
    const cuttingDhuPct = 1.12;

    const slotPlanVsAchieve = [
      { label: 'Slot 1 (D01-08)', value1: Math.round(360000 * multiplier * factoryFactor), value2: Math.round(368000 * multiplier * factoryFactor), name1: 'Plan Pcs', name2: 'Actual Pcs', color1: '#64748b', color2: '#10b981' },
      { label: 'Slot 2 (D09-16)', value1: Math.round(355000 * multiplier * factoryFactor), value2: Math.round(351000 * multiplier * factoryFactor), name1: 'Plan Pcs', name2: 'Actual Pcs', color1: '#64748b', color2: '#10b981' },
      { label: 'Slot 3 (D17-24)', value1: Math.round(370000 * multiplier * factoryFactor), value2: Math.round(364000 * multiplier * factoryFactor), name1: 'Plan Pcs', name2: 'Actual Pcs', color1: '#64748b', color2: '#10b981' },
      { label: 'Slot 4 (D25-30)', value1: Math.round(342000 * multiplier * factoryFactor), value2: Math.round(344113 * multiplier * factoryFactor), name1: 'Plan Pcs', name2: 'Actual Pcs', color1: '#64748b', color2: '#10b981' }
    ];

    const wasteDonut = [
      { label: 'Marker Efficiency', value: 85.2, color: '#10b981' },
      { label: 'End-Bit Loss', value: 1.2, color: '#f59e0b' },
      { label: 'Pattern Gap Loss', value: 12.1, color: '#94a3b8' },
      { label: 'Remnant Scrap', value: 1.5, color: '#ef4444' }
    ];

    return {
      monthlyProd: rawProd,
      efficiencyPct,
      markerEfficiencyPct,
      fabricWastagePct,
      inputAvailabilityPct,
      cuttingDhuPct,
      slotPlanVsAchieve,
      wasteDonut
    };
  }, [multiplier, factoryScope]);

  // Section 7: Printing Section Data
  const printData = useMemo(() => {
    const rawProd = Math.round(826632 * multiplier);
    const efficiencyPct = 91.7;
    const dhuPct = 0.71;
    const lostTimePct = 8.31;
    const inHousePct = 82;

    const methodDonut = [
      { label: 'Plastisol / Rubber', value: 48, color: '#2563eb' },
      { label: 'Water / Pigment', value: 32, color: '#10b981' },
      { label: 'High Density / Foil', value: 12, color: '#f59e0b' },
      { label: 'Digital Sublimation', value: 8, color: '#8b5cf6' }
    ];

    const weeklyTrend = [
      { label: 'W36', value: Math.round(195000 * multiplier) },
      { label: 'W37', value: Math.round(212000 * multiplier) },
      { label: 'W38', value: Math.round(208000 * multiplier) },
      { label: 'W39', value: Math.round(211632 * multiplier) }
    ];

    return {
      monthlyProd: rawProd,
      efficiencyPct,
      dhuPct,
      lostTimePct,
      inHousePct,
      methodDonut,
      weeklyTrend
    };
  }, [multiplier]);

  // Section 8: Embroidery Section Data (In-House & Outsource / Sub-Contract)
  const embroideryData = useMemo(() => {
    const rawTotalPanels = Math.round(410000 * multiplier);
    const inHousePanels = Math.round(268000 * multiplier);
    const outsourcePanels = Math.round(142000 * multiplier);
    const inHousePct = 65.4;
    const outsourcePct = 34.6;
    const millionStitches = Math.round(284 * multiplier);
    const inHouseEfficiency = 88.4;
    const outsourceOnTimeDelivery = 94.2;
    const totalDhuPct = 0.82;
    const inHouseDhu = 0.65;
    const outsourceRejectionPct = 1.15;
    const activeMachinesInHouse = 4;
    const totalHeads = 88;

    const sourceDonut = [
      { label: 'In-House (88 Heads)', value: inHousePanels, color: '#2563eb' },
      { label: 'Outsource / Sub-Contract', value: outsourcePanels, color: '#f59e0b' }
    ];

    const buyerPanelsColumn = [
      { label: 'ONLY', value1: Math.round(135000 * multiplier), value2: Math.round(55000 * multiplier), name1: 'In-House', name2: 'Outsource', color1: '#2563eb', color2: '#f59e0b' },
      { label: 'Name It', value1: Math.round(92000 * multiplier), value2: Math.round(48000 * multiplier), name1: 'In-House', name2: 'Outsource', color1: '#2563eb', color2: '#f59e0b' },
      { label: 'OVS', value1: Math.round(26000 * multiplier), value2: Math.round(24000 * multiplier), name1: 'In-House', name2: 'Outsource', color1: '#2563eb', color2: '#f59e0b' },
      { label: 'UTG / ASOS', value1: Math.round(15000 * multiplier), value2: Math.round(15000 * multiplier), name1: 'In-House', name2: 'Outsource', color1: '#2563eb', color2: '#f59e0b' }
    ];

    const weeklyTrend = [
      { label: 'W36', value: Math.round(96000 * multiplier) },
      { label: 'W37', value: Math.round(104000 * multiplier) },
      { label: 'W38', value: Math.round(102000 * multiplier) },
      { label: 'W39', value: Math.round(108000 * multiplier) }
    ];

    return {
      rawTotalPanels,
      inHousePanels,
      outsourcePanels,
      inHousePct,
      outsourcePct,
      millionStitches,
      inHouseEfficiency,
      outsourceOnTimeDelivery,
      totalDhuPct,
      inHouseDhu,
      outsourceRejectionPct,
      activeMachinesInHouse,
      totalHeads,
      sourceDonut,
      buyerPanelsColumn,
      weeklyTrend
    };
  }, [multiplier]);

  // Section 9: Sewing Section Data
  const sewingData = useMemo(() => {
    const factoryFactor = factoryScope === 'NFL' ? 0.67 : factoryScope === 'NCL' ? 0.33 : 1.0;
    const rawProd = Math.round(1477799 * multiplier * factoryFactor);
    const efficiencyPct = factoryScope === 'NCL' ? 71.8 : 70.4;
    const dhuPct = factoryScope === 'NCL' ? 3.12 : 3.37;
    const weeklyLoadBooked = Math.round(420000 * multiplier * factoryFactor);
    const weeklyCapacity = Math.round(450000 * multiplier * factoryFactor);
    const loadPct = pct(weeklyLoadBooked, weeklyCapacity);

    let floorProdColumn = [];
    if (factoryScope === 'NFL') {
      floorProdColumn = [
        { label: 'NFL Sewing 1', value1: Math.round(520000 * multiplier), name1: 'Pcs', color1: '#2563eb' },
        { label: 'NFL Sewing 2', value1: Math.round(465000 * multiplier), name1: 'Pcs', color1: '#3b82f6' }
      ];
    } else if (factoryScope === 'NCL') {
      floorProdColumn = [
        { label: 'NCL Sewing 1', value1: Math.round(260000 * multiplier), name1: 'Pcs', color1: '#0ea5e9' },
        { label: 'NCL Sewing 2', value1: Math.round(232799 * multiplier), name1: 'Pcs', color1: '#0284c7' }
      ];
    } else {
      floorProdColumn = [
        { label: 'NFL Sewing 1', value1: Math.round(520000 * multiplier), name1: 'Pcs', color1: '#2563eb' },
        { label: 'NFL Sewing 2', value1: Math.round(465000 * multiplier), name1: 'Pcs', color1: '#3b82f6' },
        { label: 'NCL Sewing 1', value1: Math.round(260000 * multiplier), name1: 'Pcs', color1: '#0ea5e9' },
        { label: 'NCL Sewing 2', value1: Math.round(232799 * multiplier), name1: 'Pcs', color1: '#0284c7' }
      ];
    }

    const weeklyLoadComparison = [
      { label: 'W38', value1: Math.round(410000 * factoryFactor), value2: Math.round(450000 * factoryFactor), name1: 'Booked', name2: 'Capacity', color1: '#f59e0b', color2: '#cbd5e1' },
      { label: 'W39', value1: Math.round(435000 * factoryFactor), value2: Math.round(450000 * factoryFactor), name1: 'Booked', name2: 'Capacity', color1: '#f59e0b', color2: '#cbd5e1' },
      { label: 'W40', value1: Math.round(445000 * factoryFactor), value2: Math.round(450000 * factoryFactor), name1: 'Booked', name2: 'Capacity', color1: '#ef4444', color2: '#cbd5e1' },
      { label: 'W41', value1: Math.round(420000 * factoryFactor), value2: Math.round(450000 * factoryFactor), name1: 'Booked', name2: 'Capacity', color1: '#10b981', color2: '#cbd5e1' },
      { label: 'W42', value1: Math.round(395000 * factoryFactor), value2: Math.round(450000 * factoryFactor), name1: 'Booked', name2: 'Capacity', color1: '#10b981', color2: '#cbd5e1' }
    ];

    const allocationLabel = factoryScope === 'NFL' ? 'NFL Composite' : factoryScope === 'NCL' ? 'NCL Garments' : 'NFL + NCL';
    const allocationSub = factoryScope === 'NFL' ? 'NFL: 100% (Composite)' : factoryScope === 'NCL' ? 'NCL: 100% (Garments)' : 'NFL: 67% | NCL: 33%';

    return {
      monthlyProd: rawProd,
      efficiencyPct,
      dhuPct,
      weeklyLoadBooked,
      weeklyCapacity,
      loadPct,
      cutToShipLoss: 2.59,
      floorProdColumn,
      weeklyLoadComparison,
      allocationLabel,
      allocationSub
    };
  }, [multiplier, factoryScope]);

  // Section 10: Finishing & Packing Section Data
  const finishingData = useMemo(() => {
    const factoryFactor = factoryScope === 'NFL' ? 0.67 : factoryScope === 'NCL' ? 0.33 : 1.0;
    const rawPacked = Math.round(1415200 * multiplier * factoryFactor);
    const finishingDhu = factoryScope === 'NCL' ? 1.05 : 1.18;
    const packingAuditPass = 98.6;
    const avgDailyPacked = Math.round(47173 * multiplier * factoryFactor);

    let floorPacked = [];
    if (factoryScope === 'NFL') {
      floorPacked = [
        { label: 'NFL Finishing 1', value1: Math.round(510000 * multiplier), name1: 'Pcs', color1: '#16a34a' },
        { label: 'NFL Finishing 2', value1: Math.round(438184 * multiplier), name1: 'Pcs', color1: '#22c55e' }
      ];
    } else if (factoryScope === 'NCL') {
      floorPacked = [
        { label: 'NCL Finishing 1', value1: Math.round(255000 * multiplier), name1: 'Pcs', color1: '#059669' },
        { label: 'NCL Finishing 2', value1: Math.round(212016 * multiplier), name1: 'Pcs', color1: '#10b981' }
      ];
    } else {
      floorPacked = [
        { label: 'NFL Finishing 1', value1: Math.round(510000 * multiplier), name1: 'Pcs', color1: '#16a34a' },
        { label: 'NFL Finishing 2', value1: Math.round(438184 * multiplier), name1: 'Pcs', color1: '#22c55e' },
        { label: 'NCL Finishing 1', value1: Math.round(255000 * multiplier), name1: 'Pcs', color1: '#059669' },
        { label: 'NCL Finishing 2', value1: Math.round(212016 * multiplier), name1: 'Pcs', color1: '#10b981' }
      ];
    }

    return {
      monthlyPacked: rawPacked,
      finishingDhu,
      packingAuditPass,
      avgDailyPacked,
      cartonsPacked: Math.ceil(rawPacked / 24),
      floorPacked
    };
  }, [multiplier, factoryScope]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* ========================================================= */}
      {/* TOP EXECUTIVE CONTROL BAR & PERIOD/DATE FILTERS           */}
      {/* ========================================================= */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                EXECUTIVE MANAGEMENT SYSTEM
              </span>
              <span style={{ background: '#dcfce7', color: '#166534', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px' }}>
                Active Operations
              </span>
            </div>
            <h1 style={{ margin: '2px 0 0', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              Factory Operations &amp; Section-Wise KPI Board
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
              Comprehensive section-wise KPIs for executive decision-making. No job-level noise—high-impact metrics, alerts, and capacity comparisons.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Link
              href="/modules/kpi-board"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid #2563eb',
                background: '#eff6ff',
                fontSize: '12px',
                fontWeight: 700,
                color: '#1d4ed8',
                textDecoration: 'none'
              }}
            >
              <span>✍️</span> Factory 2026 KPI Tracker &amp; Entry
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '12px',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              <span>🖨️</span> Print KPI Brief
            </button>
            <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
              {(['ALL', 'BOTTLENECKS', 'QUALITY'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveQuickTab(tab)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: activeQuickTab === tab ? '#2563eb' : 'transparent',
                    color: activeQuickTab === tab ? '#fff' : '#64748b',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all .15s'
                  }}
                >
                  {tab === 'ALL' ? 'All Sections' : tab === 'BOTTLENECKS' ? 'Bottlenecks Only' : 'Quality & RFT'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TIME HORIZON & DATE RANGE FILTER CONTROLS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '12px',
            flexWrap: 'wrap'
          }}
        >
          {/* HORIZON SELECTOR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
              View Horizon:
            </span>
            <div style={{ display: 'inline-flex', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px' }}>
              {(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setViewHorizon(view)}
                  style={{
                    padding: '5px 11px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: viewHorizon === view ? '#0f172a' : 'transparent',
                    color: viewHorizon === view ? '#ffffff' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  {view === 'DAILY' ? 'Daily' : view === 'WEEKLY' ? 'Weekly' : view === 'MONTHLY' ? 'Monthly' : view === 'QUARTERLY' ? 'Quarterly' : 'Yearly'}
                </button>
              ))}
            </div>
          </div>

          {/* DATE RANGE FILTER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
              Date Range:
            </span>
            <div style={{ display: 'inline-flex', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px' }}>
              {([
                { key: 'today', label: 'Today' },
                { key: 'yesterday', label: 'Yesterday' },
                { key: '7days', label: 'Last 7 Days' },
                { key: '30days', label: 'Last 30 Days' },
                { key: 'custom', label: 'Custom Range' }
              ] as const).map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDateRange(d.key)}
                  style={{
                    padding: '5px 10px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: dateRange === d.key ? '#2563eb' : 'transparent',
                    color: dateRange === d.key ? '#ffffff' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {dateRange === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{ padding: '4px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{ padding: '4px 8px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
            )}
          </div>

          {/* FACTORY SCOPE SELECTOR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
              Plant Scope:
            </span>
            <select
              value={factoryScope}
              onChange={(e: any) => setFactoryScope(e.target.value)}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 700,
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                background: '#fff',
                color: '#1e293b',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Plants (NFL + NCL Combined)</option>
              <option value="NFL1">NFL Plant 1 (Gazipur)</option>
              <option value="NFL2">NFL Plant 2 (Kashimpur)</option>
              <option value="NCL">NCL Unit (Fatullah)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* EXECUTIVE ALERT STRIP: IMMEDIATE DECISION REQUIRED        */}
      {/* ========================================================= */}
      <div
        style={{
          background: '#fffbeb',
          borderLeft: '4px solid #f59e0b',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '16px' }}>🚨</span>
          <div style={{ fontSize: '12px', color: '#92400e' }}>
            <strong style={{ fontWeight: 800 }}>Critical Yarn Bottleneck in Knitting:</strong>{' '}
            <span>
              6 production jobs ({knittingData.yarnShortageJobs.length} batches / 19.8 Tons yarn) cannot be knitted due to yarn stock deficit.
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '11px', background: '#fef3c7', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, color: '#b45309' }}>
            Dyeing RFT: {dyeingSectionData.rftPct}% (Target: 92%)
          </span>
          <span style={{ fontSize: '11px', background: '#dbeafe', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, color: '#1e40af' }}>
            Sewing Load: {sewingData.loadPct}%
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION ROW 1: YARN MANAGEMENT & STOCK INVENTORY          */}
      {/* ========================================================= */}
      {(activeQuickTab === 'ALL' || activeQuickTab === 'BOTTLENECKS') && (
        <div
          id="yarn-section"
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* SECTION HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', background: '#eff6ff', padding: '6px', borderRadius: '8px' }}>🧶</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Yarn Management, Stock &amp; Supply Pipeline
                </h2>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Total Godown Stock · Safety Stock Buffers · Dead Stock · Requisitions · LC Pipeline
                </div>
              </div>
            </div>
            <Link
              href="/modules/yarn"
              style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textDecoration: 'none', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
            >
              Open Yarn Store Module &rarr;
            </Link>
          </div>

          {/* KPI CARDS (6 Key Metrics for Owner / CEO) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total In Stock</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {n(yarnData.totalStockTons)} <span style={{ fontSize: '12px', color: '#64748b' }}>Tons</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                White: <strong>{n(yarnData.whiteTons)} T</strong> | Color: <strong>{n(yarnData.colorTons)} T</strong>
              </div>
            </div>

            <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>Safety Stock Deficit</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#b91c1c', margin: '2px 0' }}>
                {yarnData.safetyShortageCount} <span style={{ fontSize: '12px' }}>Counts Out</span>
              </div>
              <div style={{ fontSize: '10px', color: '#b91c1c' }}>
                Immediate mill PO needed
              </div>
            </div>

            <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Dead Stock (&gt;90 Days)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#b45309', margin: '2px 0' }}>
                {n(yarnData.deadStockTons)} <span style={{ fontSize: '12px' }}>Tons</span>
              </div>
              <div style={{ fontSize: '10px', color: '#92400e' }}>
                {yarnData.deadStockCount} idle lot items
              </div>
            </div>

            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Open Requisitions</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', margin: '2px 0' }}>
                {n(yarnData.requisitionTons)} <span style={{ fontSize: '12px' }}>Tons</span>
              </div>
              <div style={{ fontSize: '10px', color: '#166534' }}>
                From Merchandising
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pipeline (LC Open)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {n(yarnData.pipelineTons)} <span style={{ fontSize: '12px' }}>Tons</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                Delivery ETA: 7–14 days
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Avg Daily Issue Rate</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb', margin: '2px 0' }}>
                {n(yarnData.avgDailyIssueTons)} <span style={{ fontSize: '12px' }}>Tons/day</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                25.8 days store buffer
              </div>
            </div>
          </div>

          {/* VISUALIZATION ROW (Donut, Comparison Bar, Trend Line) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Stock by Yarn Composition (Tons)
              </div>
              <ExecutiveDonut
                data={yarnData.donutData}
                centerLabel="Total Stock"
                centerValue={`${Math.round(yarnData.totalStockTons)}`}
                unit="Tons"
              />
            </div>

            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Inventory vs Requisitions vs Safety Buffer
              </div>
              <ExecutiveColumnChart
                data={yarnData.pipelineVsStock}
                height={130}
              />
            </div>

            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Daily Yarn Issue Rate to Knitting (Tons)
              </div>
              <ExecutiveTrendLine
                data={yarnData.issueTrend}
                height={100}
                lineColor="#2563eb"
                unit="Tons"
              />
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '6px' }}>
                Stable daily consumption: 38–44 Tons required to maintain Knitting Gantt schedule.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION ROW 2: KNITTING PLAN, CAPACITY & BOTTLENECKS       */}
      {/* ========================================================= */}
      {(activeQuickTab === 'ALL' || activeQuickTab === 'BOTTLENECKS') && (
        <div
          id="knitting-section"
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* SECTION HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', background: '#eff6ff', padding: '6px', borderRadius: '8px' }}>⚙️</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Knitting Section: Plan, Factory Capacity &amp; Delivery Rate
                </h2>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Total Plan vs Output · Factory Capacity Loaded · In-House vs Sub-Contract · Yarn Shortage Alerts
                </div>
              </div>
            </div>
            <Link
              href="/modules/knitting"
              style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textDecoration: 'none', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
            >
              Open Knitting Module &rarr;
            </Link>
          </div>

          {/* KNITTING KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Knitting Plan</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {n(knittingData.planTons)} <span style={{ fontSize: '12px' }}>Tons</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                Monthly confirmed schedule
              </div>
            </div>

            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Achieved Production</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', margin: '2px 0' }}>
                {n(knittingData.prodTons)} <span style={{ fontSize: '12px' }}>Tons</span>
              </div>
              <div style={{ fontSize: '10px', color: '#166534' }}>
                {knittingData.achievePct}% Plan Achievement
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Factory Capacity</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {knittingData.bookedCapPct}% <span style={{ fontSize: '12px' }}>Booked</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                {knittingData.loadedCapPct}% Currently Loaded (107 M/C)
              </div>
            </div>

            <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>Yarn Shortage Bottlenecks</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626', margin: '2px 0' }}>
                {knittingData.yarnShortageJobs.length} <span style={{ fontSize: '12px' }}>Jobs Blocked</span>
              </div>
              <div style={{ fontSize: '10px', color: '#dc2626' }}>
                19.8 Tons yarn awaited
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>In-House vs Unplanned</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                82% <span style={{ fontSize: '12px' }}>In-House</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                {knittingData.unplannedBatches} batches unplanned / urgent
              </div>
            </div>
          </div>

          {/* KNITTING CHARTS & YARN SHORTAGE ACTION TABLE */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Slot-Wise Required vs Actual Delivery Rate (Tons)
              </div>
              <ExecutiveColumnChart
                data={knittingData.slotComparison}
                height={130}
              />
            </div>

            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Knitting Capacity Allocation
              </div>
              <ExecutiveDonut
                data={knittingData.allocationDonut}
                centerLabel="Allocated"
                centerValue={`${Math.round(knittingData.prodTons)}`}
                unit="Tons"
              />
            </div>

            {/* CRITICAL BOTTLENECK TABLE FOR OWNER / CEO */}
            <div style={{ background: '#fff5f5', padding: '14px', borderRadius: '8px', border: '1px solid #fed7d7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#9b2c2c' }}>
                  Jobs Unable to Knit (Due to Yarn Shortage)
                </span>
                <span style={{ fontSize: '9px', background: '#feb2b2', color: '#742a2a', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  Immediate Action
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                {knittingData.yarnShortageJobs.map((j: any) => (
                  <div
                    key={j.jobNo}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ffffff',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid #fed7d7',
                      fontSize: '11px'
                    }}
                  >
                    <div>
                      <strong style={{ color: '#0f172a' }}>Job #{j.jobNo}</strong> ({j.buyer})
                      <div style={{ fontSize: '10px', color: '#718096' }}>{j.count}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: '#e53e3e', fontWeight: 700 }}>-{j.shortageKg} Kg</span>
                      <div style={{ fontSize: '9px', color: '#a0aec0' }}>{j.delayDays}d delayed</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION ROW 3: DYEING & FINISHING & RIGHT-FIRST-TIME (RFT) */}
      {/* ========================================================= */}
      {(activeQuickTab === 'ALL' || activeQuickTab === 'QUALITY') && (
        <div
          id="dyeing-section"
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* SECTION HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', background: '#eff6ff', padding: '6px', borderRadius: '8px' }}>🎨</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Dyeing &amp; Finishing: Right First Time (RFT), Vessels &amp; Output
                </h2>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  RFT % Target · Batch Size Evaluation · Vessel Loading % · Redyeing / Topping Minimization
                </div>
              </div>
            </div>
            <Link
              href="/modules/dyeing"
              style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textDecoration: 'none', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
            >
              Open Dyeing Module &rarr;
            </Link>
          </div>

          {/* DYEING KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Right First Time (RFT)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', margin: '2px 0' }}>
                {dyeingSectionData.rftPct}%
              </div>
              <div style={{ fontSize: '10px', color: '#166534' }}>
                Target &ge; 92.0% (Benchmark)
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Dyeing Output</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {n(dyeingSectionData.prodTons)} <span style={{ fontSize: '12px' }}>Tons</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                Plan: {n(dyeingSectionData.planTons)} T ({dyeingSectionData.achievePct}%)
              </div>
            </div>

            <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>Reprocess &amp; Topping</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626', margin: '2px 0' }}>
                {dyeingSectionData.toppingPct}% <span style={{ fontSize: '12px' }}>Top</span> / {dyeingSectionData.redyeingPct}% <span style={{ fontSize: '12px' }}>Redyed</span>
              </div>
              <div style={{ fontSize: '10px', color: '#dc2626' }}>
                {dyeingSectionData.rectificationBatches} batches rectified
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Batches Evaluated</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {dyeingSectionData.batchesEvaluated} <span style={{ fontSize: '12px' }}>Batches</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                Direct pass: {dyeingSectionData.batchesEvaluated - dyeingSectionData.rectificationBatches}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sub-contract Dyeing</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {n(dyeingSectionData.subcontractTons)} <span style={{ fontSize: '12px' }}>Tons</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                12% total dyeing load
              </div>
            </div>
          </div>

          {/* DYEING VISUALIZATIONS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Right First Time (RFT) Quality Distribution
              </div>
              <ExecutiveDonut
                data={dyeingSectionData.rftDonut}
                centerLabel="RFT Rate"
                centerValue={`${dyeingSectionData.rftPct}%`}
              />
            </div>

            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Vessel Size Loading Efficiency (Booked vs Loaded %)
              </div>
              <ExecutiveColumnChart
                data={dyeingSectionData.vesselLoading}
                height={130}
                maxVal={105}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION ROW 4: TESTING LAB & DYEING COLOR LAB             */}
      {/* ========================================================= */}
      {(activeQuickTab === 'ALL' || activeQuickTab === 'QUALITY') && (
        <div
          id="lab-section"
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* SECTION HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', background: '#eff6ff', padding: '6px', borderRadius: '8px' }}>🧪</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Testing Lab &amp; Dyeing Color Lab Approvals
                </h2>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Pending Physical/Chemical Tests · Monthly Completed · Pending Color Lab Dips by Buyer
                </div>
              </div>
            </div>
            <Link
              href="/modules/lab"
              style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textDecoration: 'none', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
            >
              Open Testing Lab Module &rarr;
            </Link>
          </div>

          {/* LAB KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Pending Test Reports</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#b45309', margin: '2px 0' }}>
                {labData.pendingTestReports} <span style={{ fontSize: '12px' }}>Due</span>
              </div>
              <div style={{ fontSize: '10px', color: '#92400e' }}>
                Fastness, Shrinkage, GSM
              </div>
            </div>

            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Tests Completed (Month)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', margin: '2px 0' }}>
                {labData.completedMonthTests} <span style={{ fontSize: '12px' }}>Reports</span>
              </div>
              <div style={{ fontSize: '10px', color: '#166534' }}>
                {labData.testPassRate}% Pass Rate
              </div>
            </div>

            <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>Pending Color Dips</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626', margin: '2px 0' }}>
                {labData.pendingColorDips} <span style={{ fontSize: '12px' }}>Shades</span>
              </div>
              <div style={{ fontSize: '10px', color: '#dc2626' }}>
                Awaiting buyer shade approval
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Approved Dips (Month)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {labData.approvedColorDips} <span style={{ fontSize: '12px' }}>Approved</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                {labData.colorMatchRate}% 1st-Time Match
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Avg Turnaround Time</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb', margin: '2px 0' }}>
                {labData.avgTurnaroundDays} <span style={{ fontSize: '12px' }}>Days</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                Within 3-day target SLA
              </div>
            </div>
          </div>

          {/* LAB VISUALIZATIONS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Pending Color Lab Dips by Buyer
              </div>
              <ExecutiveColumnChart
                data={labData.buyerPendingDips}
                height={130}
              />
            </div>

            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Quality Test Report Status (%)
              </div>
              <ExecutiveDonut
                data={labData.testPassDonut}
                centerLabel="Pass Rate"
                centerValue={`${labData.testPassRate}%`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION ROW 5: FABRIC STORE & INVENTORY                   */}
      {/* ========================================================= */}
      {activeQuickTab === 'ALL' && (
        <div
          id="fabric-store-section"
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* SECTION HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', background: '#eff6ff', padding: '6px', borderRadius: '8px' }}>📦</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Finished Fabric Store: Stock &amp; Cutting Delivery
                </h2>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Total Store Stock · Daily Issue to Cutting · Buffer Coverage · 4-Point System Pass Rate
                </div>
              </div>
            </div>
            <Link
              href="/modules/finished-fabric"
              style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textDecoration: 'none', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
            >
              Open Fabric Store &rarr;
            </Link>
          </div>

          {/* KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Finished Stock</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {n(fabricStoreData.totalStoreStockTons)} <span style={{ fontSize: '12px' }}>Tons</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                713 fabric rolls ready
              </div>
            </div>

            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Daily Delivery to Cutting</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', margin: '2px 0' }}>
                {n(fabricStoreData.avgDailyDeliveryTons)} <span style={{ fontSize: '12px' }}>Tons/day</span>
              </div>
              <div style={{ fontSize: '10px', color: '#166534' }}>
                {fabricStoreData.bufferDays} days cutting buffer
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Inspection Pass Rate</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {fabricStoreData.inspectionPassRate}%
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                4-Point system standard
              </div>
            </div>

            <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Quarantine / Pending</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#b45309', margin: '2px 0' }}>
                {n(fabricStoreData.quarantineTons)} <span style={{ fontSize: '12px' }}>Tons</span>
              </div>
              <div style={{ fontSize: '10px', color: '#92400e' }}>
                32 rolls awaiting shade band
              </div>
            </div>
          </div>

          {/* VISUALIZATIONS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Fabric Stock by Knit Construction
              </div>
              <ExecutiveDonut
                data={fabricStoreData.constructionDonut}
                centerLabel="Stock"
                centerValue={`${Math.round(fabricStoreData.totalStoreStockTons)}`}
                unit="Tons"
              />
            </div>

            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Weekly GRN Inflow vs Cutting Delivery (Tons)
              </div>
              <ExecutiveColumnChart
                data={fabricStoreData.deliveryVsInflow}
                height={130}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION ROW 6: CUTTING SECTION, EFFICIENCY & INPUT         */}
      {/* ========================================================= */}
      {activeQuickTab === 'ALL' && (
        <div
          id="cutting-section"
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* SECTION HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', background: '#eff6ff', padding: '6px', borderRadius: '8px' }}>✂️</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Cutting Section: Production, Efficiency &amp; Line Input Availability
                </h2>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Monthly Output · Marker Efficiency · Line Input Feeding Readiness · Slot Achievement · DHU %
                </div>
              </div>
            </div>
            <Link
              href="/modules/cad"
              style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textDecoration: 'none', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
            >
              Open CAD / Cutting Module &rarr;
            </Link>
          </div>

          {/* CUTTING KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Monthly Cutting Output</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {n(cuttingData.monthlyProd, 0)} <span style={{ fontSize: '12px' }}>Pcs</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                Avg {n(cuttingData.monthlyProd / 26, 0)} Pcs / Day
              </div>
            </div>

            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Cutting Efficiency</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', margin: '2px 0' }}>
                {cuttingData.efficiencyPct}%
              </div>
              <div style={{ fontSize: '10px', color: '#166534' }}>
                Target: &ge; 80.0%
              </div>
            </div>

            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Marker Efficiency</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', margin: '2px 0' }}>
                {cuttingData.markerEfficiencyPct}%
              </div>
              <div style={{ fontSize: '10px', color: '#166534' }}>
                Fabric loss: only {cuttingData.fabricWastagePct}%
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Line Input Availability</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb', margin: '2px 0' }}>
                {cuttingData.inputAvailabilityPct}%
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                48 hrs buffer before sewing
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Cutting DHU %</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {cuttingData.cuttingDhuPct}%
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                Low cut defects
              </div>
            </div>
          </div>

          {/* VISUALIZATIONS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Slot-Wise Cutting Plan vs Achievement (Pcs)
              </div>
              <ExecutiveColumnChart
                data={cuttingData.slotPlanVsAchieve}
                height={130}
              />
            </div>

            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Fabric Utilization &amp; Spreading Waste Breakdown (%)
              </div>
              <ExecutiveDonut
                data={cuttingData.wasteDonut}
                centerLabel="Efficiency"
                centerValue={`${cuttingData.markerEfficiencyPct}%`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION ROW 7: PRINTING SECTION                           */}
      {/* ========================================================= */}
      {activeQuickTab === 'ALL' && (
        <div
          id="printing-section"
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* SECTION HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', background: '#eff6ff', padding: '6px', borderRadius: '8px' }}>🖨️</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Printing Section: Panels Output, Efficiency &amp; DHU
                </h2>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Monthly Panels · In-House vs Sub-Contract · Defect % · Printing Techniques
                </div>
              </div>
            </div>
            <Link
              href="/modules/printing"
              style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textDecoration: 'none', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
            >
              Open Printing Module &rarr;
            </Link>
          </div>

          {/* KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Monthly Print Output</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {n(printData.monthlyProd, 0)} <span style={{ fontSize: '12px' }}>Panels</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                {printData.inHousePct}% In-House Printed
              </div>
            </div>

            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Printing Efficiency</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', margin: '2px 0' }}>
                {printData.efficiencyPct}%
              </div>
              <div style={{ fontSize: '10px', color: '#166534' }}>
                Target: &ge; 90.0%
              </div>
            </div>

            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Defect % (DHU)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', margin: '2px 0' }}>
                {printData.dhuPct}%
              </div>
              <div style={{ fontSize: '10px', color: '#166534' }}>
                Under 1.0% tolerance
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Lost Time %</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {printData.lostTimePct}%
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                Screen changeover &amp; curing
              </div>
            </div>
          </div>

          {/* VISUALIZATIONS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Print Technique Breakdown (%)
              </div>
              <ExecutiveDonut
                data={printData.methodDonut}
                centerLabel="Total"
                centerValue="100%"
              />
            </div>

            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Weekly Print Output Trend (Panels)
              </div>
              <ExecutiveTrendLine
                data={printData.weeklyTrend}
                height={100}
                lineColor="#10b981"
                unit="Panels"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION ROW 8: EMBROIDERY SECTION (IN-HOUSE & OUTSOURCE)  */}
      {/* ========================================================= */}
      {activeQuickTab === 'ALL' && (
        <div
          id="embroidery-section"
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* SECTION HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', background: '#eff6ff', padding: '6px', borderRadius: '8px' }}>🪡</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Embroidery Section: In-House vs Outsource / Sub-Contract
                </h2>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  In-House (88 Machine Heads) vs Outsource Vendors · Million Stitches · Efficiency &amp; Rejection Rate
                </div>
              </div>
            </div>
            <Link
              href="/modules/embroidery"
              style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textDecoration: 'none', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
            >
              Open Embroidery Module &rarr;
            </Link>
          </div>

          {/* KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Embroidery Panels</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {n(embroideryData.rawTotalPanels, 0)} <span style={{ fontSize: '12px' }}>Panels</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                {embroideryData.millionStitches} Million Total Stitches
              </div>
            </div>

            <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>In-House Production</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#1d4ed8', margin: '2px 0' }}>
                {n(embroideryData.inHousePanels, 0)} <span style={{ fontSize: '12px' }}>({embroideryData.inHousePct}%)</span>
              </div>
              <div style={{ fontSize: '10px', color: '#1e40af' }}>
                {embroideryData.activeMachinesInHouse} Machines ({embroideryData.totalHeads} Heads) · {embroideryData.inHouseEfficiency}% Eff
              </div>
            </div>

            <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Outsource / Sub-Contract</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#b45309', margin: '2px 0' }}>
                {n(embroideryData.outsourcePanels, 0)} <span style={{ fontSize: '12px' }}>({embroideryData.outsourcePct}%)</span>
              </div>
              <div style={{ fontSize: '10px', color: '#92400e' }}>
                3 Vendors · {embroideryData.outsourceOnTimeDelivery}% On-Time Delivery
              </div>
            </div>

            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>In-House DHU %</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', margin: '2px 0' }}>
                {embroideryData.inHouseDhu}%
              </div>
              <div style={{ fontSize: '10px', color: '#166534' }}>
                Low thread breakage loss
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Outsource Rejection</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {embroideryData.outsourceRejectionPct}%
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                Overall DHU: {embroideryData.totalDhuPct}%
              </div>
            </div>
          </div>

          {/* VISUALIZATIONS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                In-House vs Outsource Panels Allocation
              </div>
              <ExecutiveDonut
                data={embroideryData.sourceDonut}
                centerLabel="Total"
                centerValue={`${Math.round(embroideryData.rawTotalPanels / 1000)}k`}
                unit="Panels"
              />
            </div>

            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Buyer-Wise In-House vs Outsource Panels
              </div>
              <ExecutiveColumnChart
                data={embroideryData.buyerPanelsColumn}
                height={130}
              />
            </div>

            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Weekly Embroidery Output Trend (Panels)
              </div>
              <ExecutiveTrendLine
                data={embroideryData.weeklyTrend}
                height={100}
                lineColor="#2563eb"
                unit="Panels"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION ROW 9: SEWING SECTION, FLOOR & FACTORY PRODUCTION */}
      {/* ========================================================= */}
      {(activeQuickTab === 'ALL' || activeQuickTab === 'BOTTLENECKS') && (
        <div
          id="sewing-section"
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* SECTION HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', background: '#eff6ff', padding: '6px', borderRadius: '8px' }}>🪡</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Sewing Section: Weekly Load, Floor-Wise &amp; Factory Production
                </h2>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Weekly Slot Loading · Factory &amp; Floor Breakdown · Efficiency % · DHU Quality
                </div>
              </div>
            </div>
            <Link
              href="/modules/sewing-planning"
              style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textDecoration: 'none', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
            >
              Open Sewing Gantt Module &rarr;
            </Link>
          </div>

          {/* SEWING KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Weekly Load Status</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {sewingData.loadPct}% <span style={{ fontSize: '12px' }}>Capacity</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                {n(sewingData.weeklyLoadBooked, 0)} / {n(sewingData.weeklyCapacity, 0)} Pcs
              </div>
            </div>

            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Monthly Total Sewing</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', margin: '2px 0' }}>
                {n(sewingData.monthlyProd, 0)} <span style={{ fontSize: '12px' }}>Pcs</span>
              </div>
              <div style={{ fontSize: '10px', color: '#166534' }}>
                Factory Efficiency: {sewingData.efficiencyPct}%
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sewing DHU %</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                {sewingData.dhuPct}% <span style={{ fontSize: '12px' }}>DHU</span>
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                Cut-to-ship loss: {sewingData.cutToShipLoss}%
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Plant Allocation</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb', margin: '2px 0' }}>
                NFL + NCL
              </div>
              <div style={{ fontSize: '10px', color: '#475569' }}>
                NFL: 67% | NCL: 33%
              </div>
            </div>
          </div>

          {/* VISUALIZATIONS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Floor-Wise Sewing Production (Pcs)
              </div>
              <ExecutiveColumnChart
                data={sewingData.floorProdColumn}
                height={130}
              />
            </div>

            <div style={{ background: '#fafafa', padding: '14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                Weekly Capacity Booking vs Limit (Pcs)
              </div>
              <ExecutiveColumnChart
                data={sewingData.weeklyLoadComparison}
                height={130}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExecutiveKpiDashboard;
