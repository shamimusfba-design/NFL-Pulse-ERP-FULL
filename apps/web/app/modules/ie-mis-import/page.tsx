'use client';
import { useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';
import { fmtDate } from '../../../lib/format';

export default function MisImportPage() {
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<any>(null),
    [error, setError] = useState('');
  async function upload() {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      setResult(await api('/ie-ops/mis/import', { method: 'POST', body: fd }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell title="Daily MIS Import">
      {error && <div className="notice">{error}</div>}
      <section className="panel">
        <div className="panel-head">
          <div>
            <div className="panel-title">MIS workbook</div>
          </div>
        </div>
        <div className="import-grid">
          <label>
            Daily MIS .xlsx
            <input type="file" accept=".xlsx,.xlsm,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <button className="btn btn-primary" disabled={!file || busy} onClick={upload}>
            {busy ? 'Importing…' : 'Import Data'}
          </button>
        </div>
        {result && (
          <div className="import-result">
            <strong>{result.file}</strong>
            <span>{result.performanceRows} line-performance rows saved</span>
            <span>{result.summaryMetrics} factory/section summary metrics saved</span>
            <span>Dates: {(result.dates || []).map((d: string) => fmtDate(d)).join(', ')}</span>
          </div>
        )}
      </section>
      <section className="panel">
        <div className="panel-title">Source ownership</div>
        <div className="source-grid">
          <div>
            <b>MIS → AUTO</b>
          </div>
          <div>
            <b>Daily Quality → AUTO</b>
          </div>
          <div>
            <b>IE → AUTO</b>
            <span>Target, NPT, QCO, Bulletin, Weekly machine requirement.</span>
          </div>
          <div>
            <b>Manual</b>
            <span>Only KPI/board values with no connected source yet.</span>
          </div>
        </div>
      </section>
    </Shell>
  );
}

