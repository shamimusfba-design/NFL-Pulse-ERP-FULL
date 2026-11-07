'use client';
// NOS SectionNav — Frozen horizontal section-button row for long pages (docs/UX-STANDARD.md §3a)
// Highlights active section left -> right while scrolling and jumps to section on click.
import React, { useEffect, useState } from 'react';

export interface SectionNavItem {
  id: string;
  label: string;
  code?: string;
  badge?: string | number;
}

export interface SectionNavProps {
  /** Either name works; `items` is accepted for pages written against the older shape. */
  sections?: SectionNavItem[];
  items?: SectionNavItem[];
  stickyTop?: number;
  activeId?: string;
  onSelect?: (id: string) => void;
}

export function SectionNav({
  sections,
  items,
  stickyTop = 0,
  activeId: controlledActiveId,
  onSelect,
}: SectionNavProps) {
  const list: SectionNavItem[] = sections ?? items ?? [];
  const [activeId, setActiveId] = useState<string>(
    controlledActiveId || (list[0]?.id ?? ''),
  );

  useEffect(() => {
    if (controlledActiveId) {
      setActiveId(controlledActiveId);
    }
  }, [controlledActiveId]);

  useEffect(() => {
    if (typeof window === 'undefined' || list.length === 0) return;

    const handleScroll = () => {
      const offset = 140;
      let current = list[0].id;
      for (const sec of list) {
        const el = document.getElementById(sec.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= offset) {
            current = sec.id;
          }
        }
      }
      setActiveId(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [list]);

  const handleClick = (id: string) => {
    setActiveId(id);
    onSelect?.(id);
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  };

  if (list.length === 0) return null;

  return (
    <nav
      aria-label="Page list"
      style={{
        position: 'sticky',
        top: stickyTop,
        zIndex: 25,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 8px',
        marginBottom: 12,
        background: 'var(--nos-card)',
        border: '1px solid var(--nos-line)',
        borderRadius: 'var(--r-md)',
        boxShadow: 'var(--sh-card)',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
      }}
    >
      {list.map((sec) => {
        const isOn = activeId === sec.id;
        return (
          <button
            key={sec.id}
            type="button"
            onClick={() => handleClick(sec.id)}
            className={isOn ? 'nos-tab-on' : ''}
            style={{
              height: 30,
              padding: '0 12px',
              borderRadius: 'var(--r-sm)',
              border: isOn ? '1px solid var(--nos-brand)' : '1px solid transparent',
              background: isOn ? 'var(--nos-brand)' : 'var(--nos-inset)',
              color: isOn ? '#ffffff' : 'var(--nos-ink-2)',
              fontSize: 'var(--fs-small)',
              fontWeight: isOn ? 600 : 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              transition: 'background 0.12s ease, color 0.12s ease',
            }}
          >
            <span>{sec.label}</span>
            {sec.badge !== undefined && (
              <span
                style={{
                  fontSize: 10,
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: isOn ? 'rgba(255,255,255,0.22)' : 'var(--nos-card)',
                  color: isOn ? '#ffffff' : 'var(--nos-ink-3)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {sec.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export default SectionNav;

