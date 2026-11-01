'use client';

import React from 'react';

export type ApparelIconName =
  | 'factory'
  | 'tasks'
  | 'jobs'
  | 'hanger'
  | 'shirt'
  | 'dress'
  | 'button-trim'
  | 'sample-room'
  | 'measuring-tape'
  | 'tech-pack'
  | 'planning'
  | 'stopwatch'
  | 'approval'
  | 'calendar'
  | 'gantt'
  | 'subcontract'
  | 'yarn-cone'
  | 'yarn-store'
  | 'knitting'
  | 'fabric-roll'
  | 'dyeing'
  | 'machine-loading'
  | 'stenter'
  | 'finish-fabric'
  | 'cutting'
  | 'screen-print'
  | 'embroidery'
  | 'sewing'
  | 'quality'
  | 'quality-history'
  | 'ie'
  | 'kpi'
  | 'bulletin'
  | 'target'
  | 'import'
  | 'npt'
  | 'qco'
  | 'performance'
  | 'operator'
  | 'skill-matrix'
  | 'checkpoints'
  | 'report'
  | 'floor-tv'
  | 'maintenance'
  | 'compliance'
  | 'admin'
  | 'masters'
  | 'shipment';

interface ApparelIconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function ApparelIcon({ name, size = 16, className, style }: ApparelIconProps) {
  const s = size;

  switch (name) {
    // 1. Factory Composite HQ
    case 'factory':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M2 20h20" />
          <path d="M19 20V8l-6 4V8l-6 4V4H2v16z" />
          <path d="M18 4h2v4h-2z" />
        </svg>
      );

    // 2. Pending Tasks (Garment checklist)
    case 'tasks':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 2h6v4H9z" />
          <path d="M9 11l2 2 4-4" />
          <path d="M9 16h6" />
        </svg>
      );

    // 3. All Jobs & Production Lots
    case 'jobs':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );

    // 4. Merchandising Hanger
    case 'hanger':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M12 4a2 2 0 0 1 2 2c0 1.2-1 2-2 3L3 16a2 2 0 0 0 1 3h16a2 2 0 0 0 1-3L12 9" />
          <circle cx="12" cy="4" r="1.5" />
        </svg>
      );

    // 5. Bulk Garment / Shirt / Polo
    case 'shirt':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M6 4l3 2h6l3-2 3 4-3 2v12H6V10L3 8l3-4z" />
          <path d="M10 6a3 3 0 0 0 4 0" />
          <line x1="12" y1="8" x2="12" y2="12" />
        </svg>
      );

    // 6. Sample Dress / Garment Specimen
    case 'dress':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M9 3h6l1 5-2 3 3 10H7l3-10-2-3 1-5z" />
          <path d="M10 3a2 2 0 0 0 4 0" />
          <line x1="12" y1="3" x2="12" y2="21" />
        </svg>
      );

    // 7. Trims & Accessories (4-hole Button & Zipper)
    case 'button-trim':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="6" strokeDasharray="2 2" />
          <circle cx="9.5" cy="9.5" r="1" fill="currentColor" />
          <circle cx="14.5" cy="9.5" r="1" fill="currentColor" />
          <circle cx="9.5" cy="14.5" r="1" fill="currentColor" />
          <circle cx="14.5" cy="14.5" r="1" fill="currentColor" />
        </svg>
      );

    // 8. Sample Room (Fabric Shears & Swatch)
    case 'sample-room':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="8.5" y1="8.5" x2="20" y2="20" />
          <line x1="8.5" y1="15.5" x2="20" y2="4" />
        </svg>
      );

    // 9. CAD & Pattern Grading Ruler
    case 'measuring-tape':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M3 21L21 3" />
          <path d="M5 21l16-16" />
          <line x1="7" y1="19" x2="9" y2="17" />
          <line x1="10" y1="16" x2="13" y2="13" />
          <line x1="14" y1="12" x2="16" y2="10" />
          <line x1="17" y1="9" x2="20" y2="6" />
        </svg>
      );

    // 10. Technical / Tech Pack
    case 'tech-pack':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <path d="M9 7l3 2 3-2" />
          <line x1="9" y1="13" x2="15" y2="13" />
        </svg>
      );

    // 11. Central Planning Calendar
    case 'planning':
    case 'calendar':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="8" y1="14" x2="8.01" y2="14" />
          <line x1="12" y1="14" x2="12.01" y2="14" />
          <line x1="16" y1="14" x2="16.01" y2="14" />
        </svg>
      );

    // 12. T&A Time & Action Stopwatch
    case 'stopwatch':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <circle cx="12" cy="13" r="8" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="13" x2="15" y2="15" />
          <line x1="10" y1="2" x2="14" y2="2" />
          <line x1="12" y1="2" x2="12" y2="5" />
        </svg>
      );

    // 13. Planning Approval Desk
    case 'approval':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <circle cx="12" cy="10" r="7" />
          <polyline points="9 10 11 12 15 8" />
          <path d="M8 16l-2 5 6-2 6 2-2-5" />
        </svg>
      );

    // 14. Sewing Line Gantt
    case 'gantt':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <rect x="3" y="4" width="7" height="4" rx="1" />
          <rect x="8" y="10" width="10" height="4" rx="1" />
          <rect x="5" y="16" width="14" height="4" rx="1" />
        </svg>
      );

    // 15. Subcontract Outsource
    case 'subcontract':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17" />
          <path d="M7 21h8a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-3" />
          <path d="M16 3l5 5-4 4" />
          <path d="M21 8H10" />
        </svg>
      );

    // 16. Spinning Mill Yarn Cone Package
    case 'yarn-cone':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <ellipse cx="12" cy="20" rx="6" ry="2" />
          <ellipse cx="12" cy="5" rx="2.5" ry="1" />
          <path d="M6 20L9.5 5M18 20l-3.5-15" />
          <path d="M7.5 16l8-4M8.5 12l6.5-3M7 19l9.5-5" />
        </svg>
      );

    // 17. Yarn Warehouse / Pallets
    case 'yarn-store':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M3 21h18" />
          <rect x="4" y="12" width="6" height="7" rx="1" />
          <rect x="14" y="12" width="6" height="7" rx="1" />
          <rect x="9" y="5" width="6" height="7" rx="1" />
        </svg>
      );

    // 18. Knitting Machine & Fabric Loops
    case 'knitting':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <circle cx="6" cy="6" r="2" />
          <circle cx="18" cy="6" r="2" />
          <line x1="7.5" y1="7.5" x2="19" y2="19" />
          <line x1="16.5" y1="7.5" x2="5" y2="19" />
          <path d="M8 14c1.5 2 2.5 2 4 0s2.5-2 4 0" />
        </svg>
      );

    // 19. Greige Fabric Roll / Textile Bolt (The Real Textile Fabric Bolt!)
    case 'fabric-roll':
    case 'greige-store':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <ellipse cx="6" cy="12" rx="3" ry="7" />
          <path d="M6 5h13a3 7 0 0 1 0 14H6" />
          <ellipse cx="19" cy="12" rx="2" ry="5" />
          <path d="M9 10v4M13 10v4" />
        </svg>
      );

    // 20. Dyeing Winch & Color Chemistry
    case 'dyeing':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M10 2v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3L14 8V2" />
          <line x1="9" y1="2" x2="15" y2="2" />
          <path d="M6.5 15h11" />
          <circle cx="12" cy="17" r="1.5" fill="currentColor" />
        </svg>
      );

    // 21. Winch Machine Loading Drum
    case 'machine-loading':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );

    // 22. Stenter Finishing & Heat Setting
    case 'stenter':
    case 'fabric-finishing':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <circle cx="6" cy="7" r="3" />
          <circle cx="18" cy="7" r="3" />
          <circle cx="12" cy="17" r="3" />
          <path d="M6 10c3 3 9 3 12 0" />
          <path d="M8 17h8" strokeDasharray="2 2" />
        </svg>
      );

    // 23. Finish Fabric Store (Inspected Fabric Roll + Barcode Tag)
    case 'finish-fabric':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <ellipse cx="6" cy="11" rx="3" ry="6" />
          <path d="M6 5h12a3 6 0 0 1 0 12H6" />
          <ellipse cx="18" cy="11" rx="2" ry="4" />
          <path d="M14 17v4h5v-4" />
          <line x1="16" y1="18" x2="16" y2="20" />
        </svg>
      );

    // 24. Heavy Cutting Shears
    case 'cutting':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="8.5" y1="8.5" x2="21" y2="21" />
          <line x1="8.5" y1="15.5" x2="21" y2="3" />
        </svg>
      );

    // 25. Screen / Rotary Print Squeegee
    case 'screen-print':
    case 'printing':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <rect x="4" y="3" width="16" height="5" rx="1" />
          <path d="M6 8v6l3 2h6l3-2V8" />
          <path d="M2 21h20" strokeWidth="2.5" />
        </svg>
      );

    // 26. Embroidery Hoop & Needle
    case 'embroidery':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <ellipse cx="12" cy="12" rx="8" ry="6" />
          <path d="M18 5L9 18M15 19l2-2" />
        </svg>
      );

    // 27. Industrial Sewing Machine
    case 'sewing':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M3 20h18" />
          <path d="M4 16h16" />
          <path d="M4 16V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4h-6v4" />
          <line x1="12" y1="12" x2="12" y2="16" />
          <circle cx="12" cy="10" r="1" fill="currentColor" />
        </svg>
      );

    // 28. Garment Quality Inspection Lens
    case 'quality':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16" y2="16" />
          <polyline points="8 11 10 13 14 9" />
        </svg>
      );

    // 29. Quality Audit History & COA
    case 'quality-history':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <circle cx="12" cy="14" r="3" />
          <path d="M12 17v3l2-1 2 1v-3" />
        </svg>
      );

    // 30. IE SMV Stopwatch / Work Study
    case 'ie':
    case 'kpi':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <circle cx="12" cy="13" r="8" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="13" x2="15" y2="11" />
          <line x1="10" y1="2" x2="14" y2="2" />
        </svg>
      );

    // 31. IE Bulletin Spec Sheet
    case 'bulletin':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <line x1="8" y1="8" x2="16" y2="8" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="8" y1="16" x2="12" y2="16" />
        </svg>
      );

    // 32. Daily Target Giving
    case 'target':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
      );

    // 33. Excel MIS Data Import
    case 'import':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <polyline points="9 15 12 18 15 15" />
        </svg>
      );

    // 34. Non-Productive Time (NPT Breakdown)
    case 'npt':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 6 12 12 16 14" />
          <path d="M3 3l18 18" stroke="#ef4444" />
        </svg>
      );

    // 35. Quick Changeover (QCO)
    case 'qco':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );

    // 36. Line Performance Trends
    case 'performance':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      );

    // 37. Operator / Responsible Person
    case 'operator':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );

    // 38. Skill Matrix Grid
    case 'skill-matrix':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor" fillOpacity="0.4" />
        </svg>
      );

    // 39. Production Checkpoints
    case 'checkpoints':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
      );

    // 40. Operational Reports
    case 'report':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <line x1="8" y1="18" x2="8" y2="14" />
          <line x1="12" y1="18" x2="12" y2="11" />
          <line x1="16" y1="18" x2="16" y2="13" />
        </svg>
      );

    // 41. Floor Digital Production TV Display
    case 'floor-tv':
    case 'mis':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <rect x="2" y="4" width="20" height="13" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <line x1="6" y1="9" x2="10" y2="9" />
          <line x1="6" y1="12" x2="14" y2="12" />
        </svg>
      );

    // 42. Machine Maintenance & Engineering
    case 'maintenance':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      );

    // 43. Administration & User Permissions
    case 'admin':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );

    // 44. Factory Configuration & Dropdown Masters
    case 'masters':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );

    // 45. Commercial Shipment & Export Dispatch
    case 'shipment':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M2 20a6 6 0 0 0 12 0" />
          <path d="M12 20a6 6 0 0 0 10 0" />
          <path d="M4 14l3-8h10l3 8" />
          <line x1="12" y1="6" x2="12" y2="14" />
          <line x1="8" y1="14" x2="8" y2="10" />
          <line x1="16" y1="14" x2="16" y2="10" />
        </svg>
      );

    // Default Garment Tag fallback
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
          <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2z" />
          <circle cx="7" cy="7" r="1.5" />
        </svg>
      );
  }
}
