'use client';
// Universal Excel / CSV Data Importer Modal for NOS ERP
// Allows quick bulk upload of departmental operational data

import React, { useState } from 'react';
import { Button, Badge } from './index';
import { fmtNum } from '../../lib/format';

export interface DataImportModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  departmentName?: string;
  department?: string;
  expectedColumns: (string | { key: string; label?: string; required?: boolean })[];
  sampleRowExample?: string;
  sampleTemplate?: string;
  onCommitRows?: (rows: Record<string, any>[]) => void;
  onImport?: (rows: Record<string, any>[]) => void;
}

export function DataImportModal({
  open,
  isOpen,
  onClose,
  title,
  departmentName,
  department,
  expectedColumns,
  sampleRowExample,
  sampleTemplate,
  onCommitRows,
  onImport,
}: DataImportModalProps) {
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const modalOpen = Boolean(open ?? isOpen);
  const deptLabel = departmentName || department || 'Operational';
  const headerTitle = title || `Import ${deptLabel} Data`;
  const sampleText = sampleRowExample || sampleTemplate || '';

  if (!modalOpen) return null;

  const handleParse = (text: string) => {
    setCsvText(text);
    setErrorMsg('');
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    try {
      const lines = text.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        setErrorMsg('Please include a header row and at least one data row.');
        setParsedRows([]);
        return;
      }

      // Split header
      const headers = lines[0].split(/[,\t]/).map((h) => h.trim().replace(/^["']|["']$/g, ''));
      const rows: Record<string, string>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(/[,\t]/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = parts[idx] ?? '';
        });
        rows.push(row);
      }

      setParsedRows(rows);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse spreadsheet data');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || '');
      handleParse(content);
    };
    reader.readAsText(file);
  };

  const handleCommit = () => {
    if (parsedRows.length === 0) return;
    if (onCommitRows) onCommitRows(parsedRows);
    if (onImport) onImport(parsedRows);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-label={headerTitle}
        style={{
          width: '100%',
          maxWidth: 680,
          background: 'var(--nos-card)',
          border: '1px solid var(--nos-line-strong)',
          borderRadius: 12,
          boxShadow: 'var(--sh-pop)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '88vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderBottom: '1px solid var(--nos-line)',
          }}
        >
          <div>
            <div style={{ fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--nos-ink)' }}>
              {headerTitle}
            </div>
            <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)', marginTop: 2 }}>
              Upload an Excel (.csv) file or paste comma/tab-separated rows directly
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 26,
              height: 26,
              borderRadius: 4,
              border: '1px solid var(--nos-line)',
              background: 'var(--nos-inset)',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Expected Columns Pill list */}
          <div>
            <span style={{ fontSize: 'var(--fs-meta)', fontWeight: 700, color: 'var(--nos-ink-2)', textTransform: 'uppercase' }}>
              Expected Columns:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {expectedColumns.map((col, idx) => {
                const label = typeof col === 'string' ? col : col.label || col.key;
                return (
                  <Badge key={`${label}-${idx}`} tone="quiet">
                    {label}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Upload input */}
          <div
            style={{
              border: '2px dashed var(--nos-line-strong)',
              borderRadius: 8,
              padding: 14,
              textAlign: 'center',
              background: 'var(--nos-inset)',
            }}
          >
            <label style={{ cursor: 'pointer', display: 'inline-block' }}>
              <span style={{ fontWeight: 600, color: 'var(--nos-brand)', fontSize: 'var(--fs-small)' }}>
                Click to browse CSV / Excel file
              </span>
              <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)', marginTop: 4 }}>
              Or paste text directly below
            </div>
          </div>

          {/* Direct Paste Area */}
          <div>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => handleParse(e.target.value)}
              placeholder={`Header row...\n${sampleText}`}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--nos-line)',
                fontSize: 12,
                fontFamily: 'monospace',
                background: 'var(--nos-card)',
                color: 'var(--nos-ink)',
                resize: 'vertical',
              }}
            />
          </div>

          {errorMsg ? (
            <div style={{ padding: '8px 12px', borderRadius: 6, background: '#FEE2E2', color: '#B91C1C', fontSize: 'var(--fs-small)' }}>
              {errorMsg}
            </div>
          ) : null}

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 'var(--fs-small)', fontWeight: 700, color: 'var(--nos-ink)' }}>
                  Preview: {fmtNum(parsedRows.length)} row(s) detected
                </span>
                <Badge tone="done">Ready to Commit</Badge>
              </div>
              <div style={{ maxHeight: 160, overflowX: 'auto', overflowY: 'auto', border: '1px solid var(--nos-line)', borderRadius: 6 }}>
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: 'var(--nos-inset)' }}>
                    <tr>
                      {Object.keys(parsedRows[0] || {}).map((k) => (
                        <th key={k} style={{ padding: '6px 8px', borderBottom: '1px solid var(--nos-line)', fontWeight: 600 }}>
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 5).map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--nos-line)' }}>
                        {Object.values(r).map((v, j) => (
                          <td key={j} style={{ padding: '6px 8px' }}>
                            {String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '10px 18px',
            borderTop: '1px solid var(--nos-line)',
            background: 'var(--nos-inset)',
          }}
        >
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" disabled={parsedRows.length === 0} onClick={handleCommit}>
            Commit {parsedRows.length > 0 ? `${fmtNum(parsedRows.length)} Row(s)` : ''} to Live Register
          </Button>
        </div>
      </div>
    </div>
  );
}
