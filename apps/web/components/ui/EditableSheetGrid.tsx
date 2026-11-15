'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fmtNum } from '../../lib/format';

export type SheetColumnType = 'text' | 'number' | 'select' | 'date' | 'formula' | 'status';

export interface SheetColumn<T> {
  key: keyof T & string;
  header: string;
  type: SheetColumnType;
  width?: number;
  align?: 'left' | 'right' | 'center';
  color?: string;
  unit?: string;
  decimals?: number;
  options?: string[];
  /** Human-readable formula description shown in the fx bar, e.g. "= Stock (E) - Allocated (G)" */
  formulaLabel?: string;
  /** Pure calculation function for formula columns */
  compute?: (row: T) => number | string;
  /** Semantic tone for numbers or status badges */
  tone?: 'plan' | 'done' | 'balance' | 'mid' | 'neutral' | ((row: T) => 'plan' | 'done' | 'balance' | 'mid' | 'neutral');
  /** Aggregate method in the bottom footer row */
  summary?: 'sum' | 'avg' | 'count' | 'none';
  frozen?: boolean;
}

export interface EditableSheetGridProps<T extends Record<string, any>> {
  title: string;
  subtitle?: string;
  storageKey?: string;
  height?: number | string;
  columns: SheetColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Called whenever a cell edit, row addition, row deletion, or paste mutates the sheet */
  onChange?: (nextRows: T[]) => void;
  onRowsChange?: (nextRows: T[]) => void;
  /** Factory function to create a blank/default new row when user clicks + Add Row */
  createEmptyRow: (index: number) => T;
  /** Optional row normalizer/recalculator triggered after any cell edit */
  recalculateRow?: (row: T) => T;
  /** Optional callback to open the full spreadsheet import modal */
  onOpenImportModal?: () => void;
  exportFileName?: string;
}

function colLetter(idx: number): string {
  let s = '';
  let n = idx;
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

const TONE_COLORS: Record<'plan' | 'done' | 'balance' | 'mid' | 'neutral', string> = {
  plan: '#2563EB',
  done: '#16A34A',
  balance: '#DC2626',
  mid: '#D97706',
  neutral: 'var(--nos-ink)',
};

export function EditableSheetGrid<T extends Record<string, any>>({
  title,
  subtitle,
  columns,
  rows,
  rowKey,
  onChange,
  onRowsChange,
  createEmptyRow,
  recalculateRow,
  onOpenImportModal,
  exportFileName = 'erp-sheet-export',
}: EditableSheetGridProps<T>) {
  const emitChange = useCallback(
    (nextRows: T[]) => {
      if (onChange) onChange(nextRows);
      if (onRowsChange) onRowsChange(nextRows);
    },
    [onChange, onRowsChange]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCell, setActiveCell] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<string>('');
  const [showQuickPaste, setShowQuickPaste] = useState(false);
  const [quickPasteText, setQuickPasteText] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [QuickAddCount, setQuickAddCount] = useState<number>(1);
  const cellInputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase().trim();
    return rows.filter((r) =>
      columns.some((col) => {
        const val = col.compute ? col.compute(r) : r[col.key];
        return String(val ?? '')
          .toLowerCase()
          .includes(q);
      })
    );
  }, [rows, columns, searchQuery]);

  const currentRow = filteredRows[activeCell.r] ?? null;
  const currentCol = columns[activeCell.c] ?? null;

  const currentCellRefLabel = useMemo(() => {
    if (!currentCol) return 'A1';
    return `${colLetter(activeCell.c)}${activeCell.r + 1}`;
  }, [activeCell, currentCol]);

  const getCellValue = useCallback(
    (row: T, col: SheetColumn<T>) => {
      if (col.compute) return col.compute(row);
      return row[col.key];
    },
    []
  );

  // Sync draft when activeCell changes and not editing
  useEffect(() => {
    if (!isEditing && currentRow && currentCol) {
      const raw = getCellValue(currentRow, currentCol);
      setEditDraft(raw === null || raw === undefined ? '' : String(raw));
    }
  }, [activeCell, isEditing, currentRow, currentCol, getCellValue]);

  useEffect(() => {
    if (isEditing && cellInputRef.current) {
      cellInputRef.current.focus();
      if ('select' in cellInputRef.current && typeof cellInputRef.current.select === 'function') {
        cellInputRef.current.select();
      }
    }
  }, [isEditing]);

  const commitCellEdit = useCallback(
    (rIdx: number, cIdx: number, rawValue: string) => {
      const targetRow = filteredRows[rIdx];
      const col = columns[cIdx];
      if (!targetRow || !col || col.type === 'formula') {
        setIsEditing(false);
        return;
      }

      const keyId = rowKey(targetRow);
      let parsedValue: any = rawValue;
      if (col.type === 'number') {
        const cleaned = String(rawValue).replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        parsedValue = Number.isFinite(num) ? num : 0;
      }

      const nextRows = rows.map((item) => {
        if (rowKey(item) !== keyId) return item;
        const updated = { ...item, [col.key]: parsedValue };
        return recalculateRow ? recalculateRow(updated) : updated;
      });

      emitChange(nextRows);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setIsEditing(false);
    },
    [filteredRows, columns, rowKey, rows, recalculateRow, emitChange]
  );

  const handleAddRows = (count = 1) => {
    const newEntries: T[] = [];
    for (let i = 0; i < count; i++) {
      const raw = createEmptyRow(rows.length + i + 1);
      newEntries.push(recalculateRow ? recalculateRow(raw) : raw);
    }
    const nextRows = [...newEntries, ...rows];
    emitChange(nextRows);
    setActiveCell({ r: 0, c: 0 });
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  const handleDuplicateActiveRow = () => {
    if (!currentRow) return;
    const base = createEmptyRow(rows.length + 1);
    const cloned: T = {
      ...currentRow,
      id: base.id ?? `${rowKey(currentRow)}-copy-${Date.now().toString().slice(-3)}`,
    };
    const nextRows = [
      ...rows.slice(0, activeCell.r + 1),
      recalculateRow ? recalculateRow(cloned) : cloned,
      ...rows.slice(activeCell.r + 1),
    ];
    emitChange(nextRows);
    setActiveCell((prev) => ({ r: prev.r + 1, c: prev.c }));
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  const handleDeleteActiveRow = () => {
    if (!currentRow || rows.length <= 1) return;
    const targetId = rowKey(currentRow);
    const nextRows = rows.filter((r) => rowKey(r) !== targetId);
    emitChange(nextRows);
    setActiveCell((prev) => ({
      r: Math.max(0, Math.min(prev.r, nextRows.length - 1)),
      c: prev.c,
    }));
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  const handleQuickPasteApply = () => {
    if (!quickPasteText.trim()) return;
    const lines = quickPasteText
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return;

    const editableCols = columns.filter((c) => c.type !== 'formula');
    const addedRows: T[] = lines.map((line, idx) => {
      const cells = line.includes('\t') ? line.split('\t') : line.split(',');
      const base = createEmptyRow(rows.length + idx + 1);
      const patched: Record<string, any> = { ...base };
      cells.forEach((cellVal, cIdx) => {
        const col = editableCols[cIdx];
        if (!col) return;
        const trimmed = cellVal.trim().replace(/^"|"$/g, '');
        if (col.type === 'number') {
          const n = parseFloat(trimmed.replace(/[^0-9.-]/g, ''));
          patched[col.key] = Number.isFinite(n) ? n : 0;
        } else {
          patched[col.key] = trimmed;
        }
      });
      return recalculateRow ? recalculateRow(patched as T) : (patched as T);
    });

    emitChange([...addedRows, ...rows]);
    setQuickPasteText('');
    setShowQuickPaste(false);
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  const handleExportCsv = () => {
    const headers = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',');
    const csvLines = filteredRows.map((row) =>
      columns
        .map((c) => {
          const v = getCellValue(row, c);
          return `"${String(v ?? '').replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const blob = new Blob([[headers, ...csvLines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportFileName}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitCellEdit(activeCell.r, activeCell.c, editDraft);
        setActiveCell((prev) => ({
          r: Math.min(filteredRows.length - 1, prev.r + 1),
          c: prev.c,
        }));
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitCellEdit(activeCell.r, activeCell.c, editDraft);
        const dir = e.shiftKey ? -1 : 1;
        setActiveCell((prev) => {
          const nextC = prev.c + dir;
          if (nextC >= columns.length) {
            return { r: Math.min(filteredRows.length - 1, prev.r + 1), c: 0 };
          }
          if (nextC < 0) {
            return { r: Math.max(0, prev.r - 1), c: columns.length - 1 };
          }
          return { r: prev.r, c: nextC };
        });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditing(false);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveCell((prev) => ({ r: Math.min(filteredRows.length - 1, prev.r + 1), c: prev.c }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveCell((prev) => ({ r: Math.max(0, prev.r - 1), c: prev.c }));
    } else if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      setActiveCell((prev) => ({ r: prev.r, c: Math.min(columns.length - 1, prev.c + 1) }));
    } else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      setActiveCell((prev) => ({ r: prev.r, c: Math.max(0, prev.c - 1) }));
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      if (currentCol && currentCol.type !== 'formula') {
        setIsEditing(true);
      }
    }
  };

  // Compute summary totals row
  const summaryValues = useMemo(() => {
    const out: Record<string, string> = {};
    columns.forEach((col, idx) => {
      if (idx === 0) {
        out[col.key] = `TOTAL (${filteredRows.length} rows)`;
        return;
      }
      if (!col.summary || col.summary === 'none') {
        out[col.key] = '';
        return;
      }
      const nums = filteredRows.map((r) => {
        const v = getCellValue(r, col);
        const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
        return Number.isFinite(n) ? n : 0;
      });
      if (col.summary === 'sum') {
        const sum = nums.reduce((a, b) => a + b, 0);
        out[col.key] = `${fmtNum(sum, col.decimals ?? 0)}${col.unit ? ` ${col.unit}` : ''}`;
      } else if (col.summary === 'avg') {
        const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
        out[col.key] = `${fmtNum(avg, col.decimals ?? 1)}${col.unit ? `${col.unit}` : ''}`;
      } else if (col.summary === 'count') {
        out[col.key] = `${filteredRows.length}`;
      }
    });
    return out;
  }, [columns, filteredRows, getCellValue]);

  return (
    <div
      className="nos-card"
      style={{
        padding: 0,
        overflow: 'hidden',
        border: '1px solid var(--nos-line-strong, #cbd5e1)',
        background: 'var(--nos-surface, #ffffff)',
      }}
    >
      {/* 1. Sheet Top Ribbon */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '10px 14px',
          background: 'var(--nos-bg-subtle, #f8fafc)',
          borderBottom: '1px solid var(--nos-line, #e2e8f0)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: '4px',
                background: '#DCFCE7',
                color: '#166534',
                letterSpacing: '0.03em',
              }}
            >
              LIVE SHEET
            </span>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--nos-ink, #0f172a)' }}>
              {title}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--nos-ink-3, #64748b)' }}>
              · {filteredRows.length} rows
            </span>
            {lastSavedTime && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A' }}>
                ✓ Synced to ERP at {lastSavedTime}
              </span>
            )}
          </div>
          {subtitle && (
            <div style={{ fontSize: '11.5px', color: 'var(--nos-ink-3, #64748b)', marginTop: '2px' }}>
              {subtitle}
            </div>
          )}
        </div>

        {/* Sheet Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActiveCell({ r: 0, c: 0 });
            }}
            placeholder="Filter sheet cells..."
            style={{
              fontSize: '12px',
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid var(--nos-line-strong, #cbd5e1)',
              background: 'var(--nos-surface, #fff)',
              color: 'var(--nos-ink, #0f172a)',
              width: '170px',
            }}
          />

          <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #2563EB', borderRadius: '6px', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => handleAddRows(QuickAddCount)}
              style={{
                background: '#2563EB',
                color: '#ffffff',
                border: 'none',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Add {QuickAddCount > 1 ? `${QuickAddCount} Rows` : 'Row'}
            </button>
            <select
              value={QuickAddCount}
              onChange={(e) => setQuickAddCount(Number(e.target.value))}
              aria-label="Number of rows to add"
              style={{
                background: '#EFF6FF',
                color: '#1E40AF',
                border: 'none',
                borderLeft: '1px solid #93C5FD',
                padding: '5px 4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <option value={1}>1</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleDuplicateActiveRow}
            className="btn btn-secondary"
            style={{ fontSize: '11.5px', padding: '5px 9px' }}
            title="Duplicate active row"
          >
            Duplicate Row
          </button>

          <button
            type="button"
            onClick={handleDeleteActiveRow}
            className="btn btn-secondary"
            style={{ fontSize: '11.5px', padding: '5px 9px', color: '#DC2626' }}
            title="Delete active row"
          >
            Delete Row
          </button>

          <button
            type="button"
            onClick={() => setShowQuickPaste((p) => !p)}
            className="btn btn-secondary"
            style={{ fontSize: '11.5px', padding: '5px 9px' }}
          >
            📋 Paste Rows
          </button>

          {onOpenImportModal && (
            <button
              type="button"
              onClick={onOpenImportModal}
              className="btn btn-secondary"
              style={{ fontSize: '11.5px', padding: '5px 9px' }}
            >
              📁 Upload CSV/Excel
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            className="btn btn-secondary"
            style={{ fontSize: '11.5px', padding: '5px 9px' }}
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {/* 2. Quick Paste Drawer (when toggled) */}
      {showQuickPaste && (
        <div
          style={{
            padding: '10px 14px',
            background: '#EFF6FF',
            borderBottom: '1px solid #BFDBFE',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E3A8A' }}>
              Paste rows directly from Excel or CSV (Columns in order:{' '}
              {columns
                .filter((c) => c.type !== 'formula')
                .map((c) => c.header)
                .join(' → ')}
              )
            </span>
            <button
              type="button"
              onClick={() => setShowQuickPaste(false)}
              style={{ background: 'transparent', border: 'none', fontSize: '14px', fontWeight: 800, color: '#1E3A8A', cursor: 'pointer' }}
            >
              ×
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <textarea
              rows={3}
              value={quickPasteText}
              onChange={(e) => setQuickPasteText(e.target.value)}
              placeholder="Paste tab-separated (Excel) or comma-separated lines here..."
              style={{
                flex: 1,
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '12px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #93C5FD',
                background: '#ffffff',
                color: '#0f172a',
              }}
            />
            <button
              type="button"
              onClick={handleQuickPasteApply}
              className="btn btn-primary"
              style={{ padding: '8px 14px', fontSize: '12px' }}
            >
              Insert Pasted Rows
            </button>
          </div>
        </div>
      )}

      {/* 3. Spreadsheet Formula & Active Cell Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          background: 'var(--nos-surface, #ffffff)',
          borderBottom: '1px solid var(--nos-line, #e2e8f0)',
          fontSize: '12px',
        }}
      >
        <span
          style={{
            minWidth: '46px',
            textAlign: 'center',
            fontFamily: 'var(--font-mono, monospace)',
            fontWeight: 800,
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'var(--nos-bg-subtle, #f1f5f9)',
            border: '1px solid var(--nos-line-strong, #cbd5e1)',
            color: 'var(--nos-ink, #0f172a)',
          }}
        >
          {currentCellRefLabel}
        </span>

        <span
          style={{
            fontFamily: 'serif',
            fontStyle: 'italic',
            fontWeight: 800,
            color: currentCol?.type === 'formula' ? '#2563EB' : 'var(--nos-ink-3, #64748b)',
            padding: '0 4px',
          }}
        >
          fx
        </span>

        <span style={{ fontWeight: 700, color: 'var(--nos-ink-2, #334155)', minWidth: '120px' }}>
          {currentCol?.header}
          {currentCol?.unit ? ` (${currentCol.unit})` : ''}:
        </span>

        {currentCol?.type === 'formula' ? (
          <div
            style={{
              flex: 1,
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '12px',
              color: '#2563EB',
              fontWeight: 700,
              background: 'var(--nos-bg-subtle, #f8fafc)',
              padding: '4px 10px',
              borderRadius: '4px',
              border: '1px dashed #93C5FD',
            }}
          >
            {currentCol.formulaLabel || 'Auto-calculated formula column'} ={' '}
            <strong>
              {currentRow ? String(getCellValue(currentRow, currentCol)) : '—'}
              {currentCol.unit ? ` ${currentCol.unit}` : ''}
            </strong>
          </div>
        ) : (
          <input
            type="text"
            value={editDraft}
            disabled={!currentRow}
            onChange={(e) => {
              setEditDraft(e.target.value);
              if (!isEditing) setIsEditing(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitCellEdit(activeCell.r, activeCell.c, editDraft);
              }
            }}
            onBlur={() => {
              if (isEditing) commitCellEdit(activeCell.r, activeCell.c, editDraft);
            }}
            placeholder="Select a cell to edit value..."
            style={{
              flex: 1,
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '12.5px',
              padding: '4px 10px',
              borderRadius: '4px',
              border: '1px solid var(--nos-line-strong, #cbd5e1)',
              background: 'var(--nos-surface, #ffffff)',
              color: 'var(--nos-ink, #0f172a)',
            }}
          />
        )}

        <span style={{ fontSize: '11px', color: 'var(--nos-ink-3, #64748b)' }}>
          Double-click or press Enter to edit · Arrow keys / Tab to navigate
        </span>
      </div>

      {/* 4. Main Spreadsheet Grid Canvas */}
      <div
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{
          overflowX: 'auto',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 280px)',
          minHeight: '340px',
          outline: 'none',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: '12.5px',
            tableLayout: 'fixed',
          }}
        >
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            {/* Row A: Excel Column Letters (A, B, C, D...) */}
            <tr style={{ background: 'var(--nos-bg-subtle, #f1f5f9)' }}>
              <th
                style={{
                  width: '44px',
                  padding: '3px 4px',
                  textAlign: 'center',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: 'var(--nos-ink-3, #64748b)',
                  borderBottom: '1px solid var(--nos-line, #cbd5e1)',
                  borderRight: '1px solid var(--nos-line, #cbd5e1)',
                  background: 'var(--nos-bg-subtle, #e2e8f0)',
                }}
              >
                #
              </th>
              {columns.map((col, cIdx) => {
                const isColSelected = activeCell.c === cIdx;
                return (
                  <th
                    key={`letter-${col.key}`}
                    style={{
                      width: col.width ? `${col.width}px` : '135px',
                      padding: '2px 6px',
                      textAlign: 'center',
                      fontSize: '10.5px',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontWeight: 800,
                      color: isColSelected ? '#2563EB' : 'var(--nos-ink-3, #64748b)',
                      background: isColSelected ? '#DBEAFE' : 'var(--nos-bg-subtle, #e2e8f0)',
                      borderBottom: '1px solid var(--nos-line, #cbd5e1)',
                      borderRight: '1px solid var(--nos-line, #cbd5e1)',
                    }}
                  >
                    {colLetter(cIdx)}
                    {col.type === 'formula' ? ' · fx' : ''}
                  </th>
                );
              })}
            </tr>

            {/* Row B: Descriptive Column Headers */}
            <tr style={{ background: 'var(--nos-surface-2, #f8fafc)' }}>
              <th
                style={{
                  width: '44px',
                  padding: '7px 4px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--nos-ink-3, #64748b)',
                  borderBottom: '2px solid var(--nos-line-strong, #94a3b8)',
                  borderRight: '1px solid var(--nos-line, #cbd5e1)',
                  background: 'var(--nos-surface-2, #f8fafc)',
                }}
              >
                Row
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    width: col.width ? `${col.width}px` : '135px',
                    padding: '7px 8px',
                    textAlign: col.type === 'number' || col.type === 'formula' ? 'right' : 'left',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: 'var(--nos-ink, #0f172a)',
                    borderBottom: '2px solid var(--nos-line-strong, #94a3b8)',
                    borderRight: '1px solid var(--nos-line, #cbd5e1)',
                    background: col.type === 'formula' ? 'rgba(37, 99, 235, 0.06)' : 'var(--nos-surface-2, #f8fafc)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  <span>{col.header}</span>
                  {col.unit && (
                    <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--nos-ink-3, #64748b)', marginLeft: '4px' }}>
                      ({col.unit})
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredRows.map((row, rIdx) => {
              const rKey = rowKey(row);
              const isRowActive = activeCell.r === rIdx;

              return (
                <tr
                  key={rKey}
                  style={{
                    background: isRowActive
                      ? 'rgba(37, 99, 235, 0.04)'
                      : rIdx % 2 === 1
                      ? 'var(--nos-bg-subtle, #f8fafc)'
                      : 'var(--nos-surface, #ffffff)',
                  }}
                >
                  {/* Row Number Gutter */}
                  <td
                    style={{
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: isRowActive ? '#2563EB' : 'var(--nos-ink-3, #64748b)',
                      background: isRowActive ? '#DBEAFE' : 'var(--nos-bg-subtle, #f1f5f9)',
                      borderBottom: '1px solid var(--nos-line, #e2e8f0)',
                      borderRight: '1px solid var(--nos-line, #cbd5e1)',
                      padding: '5px 4px',
                      userSelect: 'none',
                    }}
                  >
                    {rIdx + 1}
                  </td>

                  {columns.map((col, cIdx) => {
                    const isSelected = activeCell.r === rIdx && activeCell.c === cIdx;
                    const cellRaw = getCellValue(row, col);
                    const isFormula = col.type === 'formula';
                    const isNumeric = col.type === 'number' || isFormula;
                    const resolvedTone =
                      typeof col.tone === 'function' ? col.tone(row) : col.tone || 'neutral';
                    const textColor = TONE_COLORS[resolvedTone];

                    return (
                      <td
                        key={`${rKey}-${col.key}`}
                        onClick={() => {
                          if (activeCell.r !== rIdx || activeCell.c !== cIdx) {
                            if (isEditing) {
                              commitCellEdit(activeCell.r, activeCell.c, editDraft);
                            }
                            setActiveCell({ r: rIdx, c: cIdx });
                            setIsEditing(false);
                          }
                        }}
                        onDoubleClick={() => {
                          setActiveCell({ r: rIdx, c: cIdx });
                          if (!isFormula) {
                            setEditDraft(cellRaw === null || cellRaw === undefined ? '' : String(cellRaw));
                            setIsEditing(true);
                          }
                        }}
                        style={{
                          padding: isSelected && isEditing ? '0' : '5px 8px',
                          textAlign: isNumeric ? 'right' : 'left',
                          fontFamily: isNumeric ? 'var(--font-mono, monospace)' : 'inherit',
                          fontWeight: isFormula || cIdx <= 1 || resolvedTone !== 'neutral' ? 700 : 500,
                          color: textColor,
                          background: isSelected
                            ? 'rgba(37, 99, 235, 0.08)'
                            : isFormula
                            ? 'rgba(37, 99, 235, 0.03)'
                            : 'transparent',
                          borderBottom: '1px solid var(--nos-line, #e2e8f0)',
                          borderRight: '1px solid var(--nos-line, #e2e8f0)',
                          outline: isSelected ? '2px solid #2563EB' : 'none',
                          outlineOffset: '-2px',
                          cursor: isFormula ? 'default' : 'cell',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {isSelected && isEditing && !isFormula ? (
                          col.type === 'select' || col.type === 'status' ? (
                            <select
                              ref={cellInputRef as React.RefObject<HTMLSelectElement>}
                              value={editDraft}
                              onChange={(e) => {
                                setEditDraft(e.target.value);
                                commitCellEdit(rIdx, cIdx, e.target.value);
                              }}
                              onBlur={() => commitCellEdit(rIdx, cIdx, editDraft)}
                              style={{
                                width: '100%',
                                height: '28px',
                                border: 'none',
                                padding: '0 6px',
                                fontSize: '12.5px',
                                background: '#ffffff',
                                color: '#0f172a',
                                outline: 'none',
                              }}
                            >
                              {(col.options || []).map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              ref={cellInputRef as React.RefObject<HTMLInputElement>}
                              type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
                              step={col.decimals ? '0.01' : '1'}
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              onBlur={() => commitCellEdit(rIdx, cIdx, editDraft)}
                              style={{
                                width: '100%',
                                height: '28px',
                                border: 'none',
                                padding: '0 8px',
                                fontSize: '12.5px',
                                textAlign: isNumeric ? 'right' : 'left',
                                fontFamily: isNumeric ? 'var(--font-mono, monospace)' : 'inherit',
                                background: '#ffffff',
                                color: '#0f172a',
                                outline: 'none',
                              }}
                            />
                          )
                        ) : isNumeric && typeof cellRaw === 'number' ? (
                          <>
                            {fmtNum(cellRaw, col.decimals ?? 0)}
                            {col.unit ? (
                              <span style={{ fontSize: '10.5px', color: 'var(--nos-ink-3, #64748b)', marginLeft: '3px' }}>
                                {col.unit}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          String(cellRaw ?? '—')
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>

          {/* 5. Sticky Bottom Totals & Formula Summary Row */}
          <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 9 }}>
            <tr style={{ background: 'var(--nos-surface-2, #f1f5f9)' }}>
              <td
                style={{
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: '11px',
                  color: '#2563EB',
                  borderTop: '2px solid var(--nos-line-strong, #94a3b8)',
                  borderRight: '1px solid var(--nos-line, #cbd5e1)',
                  padding: '7px 4px',
                  background: 'var(--nos-surface-2, #e2e8f0)',
                }}
              >
                ∑
              </td>
              {columns.map((col, idx) => (
                <td
                  key={`sum-${col.key}`}
                  style={{
                    padding: '7px 8px',
                    textAlign: col.type === 'number' || col.type === 'formula' ? 'right' : 'left',
                    fontFamily: col.type === 'number' || col.type === 'formula' ? 'var(--font-mono, monospace)' : 'inherit',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: idx === 0 ? 'var(--nos-ink, #0f172a)' : '#2563EB',
                    borderTop: '2px solid var(--nos-line-strong, #94a3b8)',
                    borderRight: '1px solid var(--nos-line, #cbd5e1)',
                    background: 'var(--nos-surface-2, #f1f5f9)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {summaryValues[col.key] || ''}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default EditableSheetGrid;
