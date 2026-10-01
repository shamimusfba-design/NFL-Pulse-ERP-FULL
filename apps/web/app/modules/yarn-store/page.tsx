'use client';

import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';

type YarnStoreTab = 'stock-ledger' | 'stock-summary' | 'safety-stock' | 'dead-stock';

function num(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? (Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 1 })) : String(v);
}
function dt(v: any) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function YarnStorePage() {
  const [tab, setTab] = useState<YarnStoreTab>('stock-ledger');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState('2026-10');
  const [q, setQ] = useState('');

  // Filters
  const [filterBrand, setFilterBrand] = useState('ALL');
  const [filterCount, setFilterCount] = useState('ALL');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await api(`/yarn-store/data?month=${month}`);
      setData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [month]);

  const d = data || {};
  const s = d.summary || {};
  const ledgerRows: any[] = d.ledgerRows || [];

  const brandOptions = useMemo(() => Array.from(new Set(ledgerRows.map(r => r.manufac).filter(Boolean))).sort(), [ledgerRows]);
  const countOptions = useMemo(() => Array.from(new Set(ledgerRows.map(r => r.description).filter(Boolean))).sort(), [ledgerRows]);

  const filteredLedger = useMemo(() => {
    return ledgerRows.filter(r => {
      if (filterBrand !== 'ALL' && r.manufac !== filterBrand) return false;
      if (filterCount !== 'ALL' && r.description !== filterCount) return false;
      if (q.trim()) {
        const query = q.toLowerCase();
        return `${r.description} ${r.manufac} ${r.lotNo} ${r.lcNo} ${r.location}`.toLowerCase().includes(query);
      }
      return true;
    });
  }, [ledgerRows, filterBrand, filterCount, q]);

  return (
    <Shell title="Yarn Store Management" eyebrow="Warehouse, Stock Ledger &amp; Flow Control · v0.4.43">
      <section className="module-hero">
        <div>
          <span className="status-pill good">Monthly Yarn Stock Format</span>
          <h2>Yarn Store: Receive → Issue → Closing Stock</h2>
          <p>
            Preserves the authoritative monthly Yarn Stock structure with Lot No, L/C, Opening, Received, Issue, In-house Program,
            Closing Stock, Safety Stock differences, and Dead Stock (usage &lt; 25% over 6 months).
          </p>
        </div>
        <div className="module-actions">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
          <a className="btn btn-secondary" href="/modules/knitting">Knitting Module</a>
        </div>
      </section>

      {error && <div className="notice">{error}</div>}

      {/* Dashboard KPI Bar */}
      <section className="ie-kpi-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', marginBottom: 16 }}>
        <div><span>Total Stock</span><strong>{loading ? '…' : `${num(s.totalStock)} KG`}</strong></div>
        <div><span>Received (Month)</span><strong style={{ color: '#2563eb' }}>{num(s.rcvdMonth)} KG</strong></div>
        <div><span>Issue / Delivery</span><strong style={{ color: '#16a34a' }}>{num(s.issueMonth)} KG</strong></div>
        <div><span>Closing Stock</span><strong style={{ color: '#0f172a' }}>{num(s.closingStock)} KG</strong></div>
        <div><span>Reserved Stock</span><strong>{num(s.reservedStock)} KG</strong></div>
        <div><span>Pipeline / L/C</span><strong>{num(s.pipeline)} KG</strong></div>
        <div><span>Safety Stock Gap</span><strong style={{ color: Number(s.safetyStockGap) < 0 ? '#dc2626' : '#16a34a' }}>{num(s.safetyStockGap)} KG</strong></div>
        <div><span>Shortage</span><strong style={{ color: Number(s.shortage) > 0 ? '#dc2626' : '#16a34a' }}>{num(s.shortage)} KG</strong></div>
        <div><span>Dead Stock (&lt;25%)</span><strong style={{ color: '#dc2626' }}>{num(s.deadStock)} KG</strong></div>
      </section>

      {/* Workspace Tabs */}
      <div className="workspace-tabs" style={{ marginBottom: 16 }}>
        <button className={tab === 'stock-ledger' ? 'active' : ''} onClick={() => setTab('stock-ledger')}>1. Monthly Stock Ledger (15 Cols)</button>
        <button className={tab === 'stock-summary' ? 'active' : ''} onClick={() => setTab('stock-summary')}>2. Yarn Stock Summary</button>
        <button className={tab === 'safety-stock' ? 'active' : ''} onClick={() => setTab('safety-stock')}>3. Safety Stock &amp; Diference</button>
        <button className={tab === 'dead-stock' ? 'active' : ''} onClick={() => setTab('dead-stock')}>4. Dead Stock Drilldown (6M &lt; 25%)</button>
      </div>

      {loading && <div className="panel"><div className="empty-state"><strong>Loading Yarn Store Ledger…</strong></div></div>}

      {/* Tab 1: Monthly Stock Ledger (Exact 15 Columns from Original Report) */}
      {!loading && tab === 'stock-ledger' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Monthly Yarn Stock Ledger</div>
              <div className="panel-sub">
                Original Excel Headings: S.L, Description of Yarn, Manufac, Lot No, Yarn Rcvd Date, L/c no/dt., Invoice No./Date,
                Opening Stock(kgs), RCVD(Kgs) During Month, Total (kgs), Issue (kgs), In House Prog. Qty, Closing Stock (kgs), L.P NO, Location.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => window.print()}>Print / Export</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
            <input
              style={{ minWidth: 260, padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
              placeholder="Search Description, Manufacturer, Lot No, LC, Location..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <label style={{ fontSize: 12, fontWeight: 700 }}>Manufacturer:
              <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} style={{ marginLeft: 6, padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                <option value="ALL">All Manufacturers</option>
                {brandOptions.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Description:
              <select value={filterCount} onChange={(e) => setFilterCount(e.target.value)} style={{ marginLeft: 6, padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                <option value="ALL">All Descriptions</option>
                {countOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <div className="table-scroll">
            <table className="data-table compact-table" style={{ fontSize: 11 }}>
              <thead>
                <tr>
                  <th>S.L</th>
                  <th>Description of Yarn</th>
                  <th>Manufac</th>
                  <th>Lot No</th>
                  <th>Yarn Rcvd Date</th>
                  <th>L/c no/dt.</th>
                  <th>Invoice No./Date</th>
                  <th>Opening Stock(kgs)</th>
                  <th>RCVD(Kgs) During Month</th>
                  <th>Total (kgs)</th>
                  <th>Issue (kgs)</th>
                  <th>In House Prog. Qty</th>
                  <th>Closing Stock (kgs)</th>
                  <th>L.P NO</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.map((r, i) => (
                  <tr key={`${r.sl}-${r.lotNo}-${i}`}>
                    <td>{r.sl || i + 1}</td>
                    <td><strong>{r.description}</strong></td>
                    <td>{r.manufac}</td>
                    <td><span className="status-pill neutral">{r.lotNo}</span></td>
                    <td>{dt(r.rcvdDate)}</td>
                    <td><small>{r.lcNo}</small></td>
                    <td><small>{r.invoiceNo}</small></td>
                    <td>{num(r.openingStock)}</td>
                    <td><strong style={{ color: '#2563eb' }}>{num(r.rcvdMonth)}</strong></td>
                    <td><strong>{num(r.total)}</strong></td>
                    <td><strong style={{ color: '#16a34a' }}>{num(r.issue)}</strong></td>
                    <td>{num(r.inHouseProgQty)}</td>
                    <td><strong style={{ color: '#0f172a' }}>{num(r.closingStock)}</strong></td>
                    <td>{r.lpNo || '—'}</td>
                    <td><strong>{r.location || 'Yarn Godown A'}</strong></td>
                  </tr>
                ))}
                {!filteredLedger.length && (
                  <tr><td colSpan={15} style={{ textAlign: 'center', padding: 20 }}>No yarn records match the filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="panel-note" style={{ marginTop: 10 }}>
            Flow: Opening Stock + RCVD During Month = Total; Total − Issue = Closing Stock.
          </div>
        </div>
      )}

      {/* Tab 2: Yarn Stock Summary */}
      {!loading && tab === 'stock-summary' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Yarn Stock Summary by Category &amp; Pipeline</div>
              <div className="panel-sub">
                Original Excel Summary: S N, Description of Yarn, Safty stock / Yarn Count, Factory Closing Stock White,
                Factory Closing Stock Colour, Factory Total, L/C Open / Pipeline White, Pipeline Colour Local, Pipeline Colour Import, G.Total.
              </div>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>S N</th>
                  <th>Description of Yarn</th>
                  <th>Safty stock / Yarn Count</th>
                  <th>Factory Closing Stock White (KG)</th>
                  <th>Factory Closing Stock Colour (KG)</th>
                  <th>Factory Total (KG)</th>
                  <th>L/C Open / Pipeline White</th>
                  <th>Pipeline Colour Local</th>
                  <th>Pipeline Colour Import</th>
                  <th>G.Total (KG)</th>
                </tr>
              </thead>
              <tbody>
                {(d.summaryRows || []).map((sr: any, i: number) => (
                  <tr key={`${sr.sn}-${sr.description}-${i}`}>
                    <td>{sr.sn || i + 1}</td>
                    <td><strong>{sr.description}</strong></td>
                    <td>{sr.safetyStockRef}</td>
                    <td>{num(sr.closingWhite)}</td>
                    <td>{num(sr.closingColour)}</td>
                    <td><strong>{num(sr.factoryTotal)}</strong></td>
                    <td>{num(sr.pipelineWhite)}</td>
                    <td>{num(sr.pipelineColourLocal)}</td>
                    <td>{num(sr.pipelineColourImport)}</td>
                    <td><strong style={{ color: '#2563eb' }}>{num(sr.gTotal)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Safety Stock (Original Headings & Typos Preserved) */}
      {!loading && tab === 'safety-stock' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Safety Stock Balance Analysis</div>
              <div className="panel-sub">
                Authoritative source headings: Yarn Cout, Physical stock, Safety Stock, Diference, Stock%.
              </div>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Yarn Cout</th>
                  <th>Physical stock (KG)</th>
                  <th>Safety Stock (KG)</th>
                  <th>Diference (KG)</th>
                  <th>Stock%</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(d.safetyRows || []).map((sf: any, i: number) => {
                  const diff = sf.physicalStock - sf.safetyStock;
                  const pct = sf.safetyStock > 0 ? Math.round((sf.physicalStock / sf.safetyStock) * 100) : 0;
                  const isLow = diff < 0;
                  return (
                    <tr key={sf.yarnCount} style={{ background: isLow ? '#fff1f2' : undefined }}>
                      <td><strong>{sf.yarnCount}</strong></td>
                      <td><strong>{num(sf.physicalStock)}</strong></td>
                      <td>{num(sf.safetyStock)}</td>
                      <td><strong style={{ color: isLow ? '#dc2626' : '#16a34a' }}>{diff > 0 ? `+${num(diff)}` : num(diff)}</strong></td>
                      <td><strong>{pct}%</strong></td>
                      <td><span className={`status-pill ${isLow ? 'bad' : 'good'}`}>{isLow ? 'BELOW SAFETY' : 'SAFE'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Dead Stock (<25% usage in last 6 months) */}
      {!loading && tab === 'dead-stock' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Dead Stock Drilldown (Usage &lt; 25% in 6 Months)</div>
              <div className="panel-sub">
                Evaluates consumption history over exactly 6 months. Items with usage ratio below 25% are classified as Dead Stock.
              </div>
            </div>
            <div className="metric-card" style={{ padding: '6px 12px', minHeight: 'auto' }}>
              <span style={{ fontSize: 10, color: '#64748b' }}>Dead Stock Quantity</span>
              <strong style={{ color: '#dc2626', fontSize: 16 }}>{num(s.deadStock)} KG</strong>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Composition</th>
                  <th>Yarn Count</th>
                  <th>Brand</th>
                  <th>Lot No</th>
                  <th>Location</th>
                  <th>Current Stock</th>
                  <th>6M Total Available</th>
                  <th>6M Total Issued</th>
                  <th>Usage Ratio</th>
                  <th>Dead Stock KG</th>
                  <th>Days Idle</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(d.deadStockLedger || []).map((row: any, i: number) => {
                  const isDead = row.usagePct < 25;
                  return (
                    <tr key={`${row.composition}-${row.lotNo}-${i}`} style={{ background: isDead ? '#fff1f2' : undefined }}>
                      <td><strong>{row.composition}</strong></td>
                      <td>{row.count}</td>
                      <td>{row.brand}</td>
                      <td><span className="status-pill neutral">{row.lotNo}</span></td>
                      <td>{row.location}</td>
                      <td><strong>{num(row.currentStock)} KG</strong></td>
                      <td>{num(row.available6m)} KG</td>
                      <td>{num(row.used6m)} KG</td>
                      <td><strong style={{ color: isDead ? '#dc2626' : '#16a34a' }}>{row.usagePct}%</strong></td>
                      <td><strong style={{ color: isDead ? '#dc2626' : '#64748b' }}>{num(row.deadQty)} KG</strong></td>
                      <td>{row.daysIdle} days</td>
                      <td><span className={`status-pill ${isDead ? 'bad' : 'good'}`}>{isDead ? 'DEAD STOCK (<25%)' : 'ACTIVE'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Shell>
  );
}
