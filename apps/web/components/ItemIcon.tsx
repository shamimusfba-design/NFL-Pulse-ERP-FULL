'use client';
import React from 'react';

/**
 * Returns clean, lightweight SVG icon representing garment item types.
 * Supported types: T-Shirt, Sweatshirt, Polo, Pants / Trousers, Jacket, Hoodie, Tank Top, etc.
 */
export function ItemIcon({
  item,
  size = 20,
  className = ''
}: {
  item?: string | null;
  size?: number;
  className?: string;
}) {
  const desc = String(item || '').toLowerCase();
  const label = item || 'Item';

  // 1. Sweatshirt / Fleece / Sweater / Pullover
  if (desc.includes('sweat') || desc.includes('fleece') || desc.includes('sweater') || desc.includes('pullover')) {
    return (
      <span className={className} title={label} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <title>{label}</title>
          {/* Long sleeve sweatshirt */}
          <path d="M8 3c1.5 1 2.5 1 4 1s2.5 0 4-1l5 4.5-2 4-3-1.5V21H8V10.5L5 12l-2-4L8 3z" />
          <path d="M9 4a3 3 0 0 0 6 0" />
          <line x1="8" y1="21" x2="16" y2="21" strokeWidth="2.5" />
          <line x1="3" y1="8" x2="6" y2="12" />
          <line x1="21" y1="8" x2="18" y2="12" />
        </svg>
      </span>
    );
  }

  // 2. Pants / Trousers / Jogger / Leggings / Bottom
  if (desc.includes('pant') || desc.includes('trouser') || desc.includes('jogger') || desc.includes('bottom') || desc.includes('legging')) {
    return (
      <span className={className} title={label} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <title>{label}</title>
          {/* Trousers / pants */}
          <path d="M5 4h14l-1.5 17H13l-1-10-1 10H6.5L5 4z" />
          <line x1="5" y1="7" x2="19" y2="7" />
          <line x1="12" y1="7" x2="12" y2="11" />
        </svg>
      </span>
    );
  }

  // 3. Hoodie / Hood / Jacket
  if (desc.includes('hood') || desc.includes('hoodie') || desc.includes('jacket')) {
    return (
      <span className={className} title={label} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <title>{label}</title>
          <path d="M9 3a3 3 0 0 1 6 0l4 4-2 4-2-1v11H9V10L7 11l-2-4 4-4z" />
          <path d="M10 7a2 2 0 0 0 4 0" />
          <path d="M10 14h4v3h-4z" />
        </svg>
      </span>
    );
  }

  // 4. Polo / Shirt with collar
  if (desc.includes('polo') || (desc.includes('shirt') && !desc.includes('t-shirt') && !desc.includes('tee'))) {
    return (
      <span className={className} title={label} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <title>{label}</title>
          <path d="M8 3l4 3 4-3 5 4-2.5 3.5-2.5-1.5V21H8V9L5.5 10.5 3 7l5-4z" />
          <line x1="12" y1="6" x2="12" y2="12" />
          <circle cx="12" cy="8" r="0.5" fill="currentColor" />
          <circle cx="12" cy="10" r="0.5" fill="currentColor" />
        </svg>
      </span>
    );
  }

  // 5. Default: T-Shirt / Tee / Top
  return (
    <span className={className} title={label} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <title>{label}</title>
        <path d="M8 3a4 4 0 0 0 8 0l5 3.5-2 4-3-1.5V21H8V9L5 10.5l-2-4L8 3z" />
      </svg>
    </span>
  );
}

export function getItemBadgeName(item?: string | null): string {
  const desc = String(item || '').toLowerCase();
  if (desc.includes('sweat') || desc.includes('fleece') || desc.includes('sweater')) return 'Sweatshirt';
  if (desc.includes('pant') || desc.includes('trouser') || desc.includes('jogger')) return 'Pants';
  if (desc.includes('hood')) return 'Hoodie';
  if (desc.includes('polo')) return 'Polo';
  return 'T-Shirt';
}
