'use client';

import React, { useState } from 'react';
import Shell from '../../../components/Shell';
import DataImportCenter from '../../../components/DataImportCenter';
import LiveDataEntrySheetCenter from '../../../components/LiveDataEntrySheetCenter';

export default function DataImportAndSheetPage() {
  const [tab, setTab] = useState<'LIVE_SHEETS' | 'WORKBOOK_IMPORT'>('LIVE_SHEETS');

  return (
    <Shell title="Live Data Entry, Master Sheets & Excel Import">
      <div className="nos-stack" style={{ gap: '12px' }}>
        <div
          className="nos-card"
          style={{
            padding: '8px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div className="nos-seg" role="tablist">
            <button
              type="button"
              aria-selected={tab === 'LIVE_SHEETS'}
              onClick={() => setTab('LIVE_SHEETS')}
            >
              📊 Live Departmental Sheets &amp; Data Entry (7 Sheets)
            </button>
            <button
              type="button"
              aria-selected={tab === 'WORKBOOK_IMPORT'}
              onClick={() => setTab('WORKBOOK_IMPORT')}
            >
              📁 Factory Workbook Batch Analyzer (.xlsx / .csv)
            </button>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--nos-ink-3, #64748b)' }}>
            All sheet cell edits and form entries auto-calculate balances and update Executive &amp; Management KPIs in real time
          </span>
        </div>

        {tab === 'LIVE_SHEETS' ? <LiveDataEntrySheetCenter /> : <DataImportCenter />}
      </div>
    </Shell>
  );
}
