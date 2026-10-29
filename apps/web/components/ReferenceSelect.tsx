'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function ReferenceSelect({
  category,
  value,
  onChange,
  className = 'form-control',
  placeholder = 'Select…'
}: {
  category: string;
  value?: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    api(`/masters/references/${encodeURIComponent(category)}`)
      .then(res => {
        if (!active) return;
        if (Array.isArray(res)) {
          setRows(res);
        } else if (res && Array.isArray((res as any).items)) {
          setRows((res as any).items);
        } else if (res && Array.isArray((res as any).data)) {
          setRows((res as any).data);
        } else {
          setRows([]);
        }
      })
      .catch(() => {
        if (active) setRows([]);
      });
    return () => {
      active = false;
    };
  }, [category]);

  const safeRows = Array.isArray(rows) ? rows : [];
  const values = safeRows
    .map(r => (typeof r === 'object' && r !== null ? String(r.value || r.name || r.id || '') : String(r)))
    .filter(Boolean);

  const current = String(value || '');

  return (
    <select className={className} value={current} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {current && !values.includes(current) && <option value={current}>{current}</option>}
      {values.map(v => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  );
}
