'use client';

import React from 'react';
import { useFxScope } from './fx';

// Compact Donut Chart with Exact Data Labels
export function SvgDonut({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const size = 110;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;
  const fx = useFxScope();

  return (
    <div className="donut-flex" ref={fx.ref} data-fx={fx['data-fx']}>
      <div className="donut-svg-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
          {data.map((item, i) => {
            const strokeDasharray = `${(item.value / total) * circumference} ${circumference}`;
            const strokeDashoffset = -accumulated * circumference;
            accumulated += item.value / total;
            const segLen = (item.value / total) * circumference;
            return (
              <circle
                key={i}
                className="fx-donut-seg"
                style={{ ['--fx-dash' as any]: segLen, ['--fx-c' as any]: circumference, ['--fx-i' as any]: i }}
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
        <div className="donut-center-text fx-donut-center">
          <span className="donut-center-val">{total.toLocaleString()}</span>
          <span className="donut-center-lbl">Total Jobs</span>
        </div>
      </div>

      <div className="donut-legend-col">
        {data.map((item, i) => (
          <div key={i} className="donut-legend-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <span className="donut-legend-dot" style={{ backgroundColor: item.color }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85px', color: '#475569' }} title={item.label}>
                {item.label}
              </span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#0f172a', whiteSpace: 'nowrap' }}>
              {Math.round((item.value / total) * 100)}% <span style={{ color: '#94a3b8', fontWeight: 400 }}>({item.value})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Compact Multi-Bar Chart with Data Labels on bars
export function SvgBarChart({ data }: { data: { label: string; value1: number; value2?: number; color1?: string; color2?: string }[] }) {
  const maxVal = Math.max(1, ...data.flatMap(d => [d.value1, d.value2 || 0]));
  const fx = useFxScope();
  return (
    <div ref={fx.ref} data-fx={fx['data-fx']} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div className="bar-chart-flex">
        {data.map((d, i) => (
          <div key={i} className="bar-col">
            <div className="bar-bars">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '8px', fontWeight: 700, color: '#1e40af', marginBottom: '1px' }}>
                  {d.value1 >= 1000 ? `${(d.value1 / 1000).toFixed(0)}k` : d.value1}
                </span>
                <div
                  className="bar-fill fx-bar"
                  style={{ height: `${Math.max(6, (d.value1 / maxVal) * 70)}px`, backgroundColor: d.color1 || '#2563eb', ['--fx-i' as any]: i * 2 }}
                  title={`${d.label} (Plan): ${d.value1.toLocaleString()}`}
                />
              </div>
              {d.value2 !== undefined && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '8px', fontWeight: 700, color: '#047857', marginBottom: '1px' }}>
                    {d.value2 >= 1000 ? `${(d.value2 / 1000).toFixed(0)}k` : d.value2}
                  </span>
                  <div
                    className="bar-fill fx-bar"
                    style={{ height: `${Math.max(6, (d.value2 / maxVal) * 70)}px`, backgroundColor: d.color2 || '#10b981', ['--fx-i' as any]: i * 2 + 1 }}
                    title={`${d.label} (Actual): ${d.value2.toLocaleString()}`}
                  />
                </div>
              )}
            </div>
            <span className="bar-lbl" title={d.label}>{d.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginTop: '6px', fontSize: '10px', color: '#64748b' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <i style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#2563eb', display: 'inline-block' }} /> Plan / Qty
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <i style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981', display: 'inline-block' }} /> Produced
        </span>
      </div>
    </div>
  );
}

// Compact Trend Area Chart with Exact Numeric Labels above each point
export function SvgTrendChart({ data }: { data: { label: string; value: number }[] }) {
  const maxVal = Math.max(1, ...data.map(d => d.value));
  const minVal = Math.min(...data.map(d => d.value));
  const range = maxVal - minVal || 1;
  const width = 300;
  const height = 75;
  const padX = 14;
  const padY = 16;
  const gw = width - padX * 2;
  const gh = height - padY * 2;
  const fx = useFxScope();

  const points = data.map((d, i) => {
    const x = padX + (i / (data.length - 1 || 1)) * gw;
    const y = height - padY - ((d.value - minVal) / range) * gh;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
  const areaD = `${pathD} L ${points[points.length - 1]?.x || width} ${height} L ${points[0]?.x || 0} ${height} Z`;

  return (
    <div ref={fx.ref} data-fx={fx['data-fx']} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path className="fx-area" d={areaD} fill="url(#trend-grad)" />
        <path className="fx-line" pathLength={1} d={pathD} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle className="fx-dot" style={{ ['--fx-i' as any]: i }} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#7c3aed" strokeWidth="2" />
            <text className="fx-label" style={{ ['--fx-i' as any]: i }} x={p.x} y={p.y - 6} textAnchor="middle" fontSize="8.5" fill="#6d28d9" fontWeight="700">
              {p.value}%
            </text>
            <text x={p.x} y={height - 2} textAnchor="middle" fontSize="8" fill="#64748b" fontWeight="600">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '10px', color: '#64748b' }}>
        Weekly Production Achievement Trajectory
      </div>
    </div>
  );
}
