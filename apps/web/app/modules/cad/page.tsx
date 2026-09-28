'use client';

import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';
import { displayJobNo } from '../../../lib/display';

type Basis = 'KG_DOZ' | 'KG_PCS' | 'TOTAL_KG';
type ConsumptionRow = {
  styleId: string;
  color: string;
  orderQty: number;
  fabricDescription: string;
  fabricType: string;
  gsm: number | '';
  dia: string;
  consumptionValue: number | '';
  consumptionBasis: Basis;
  wastagePct: number | '';
  requiredKg: number;
  remarks: string;
};

function n(v: any) { return Number(v || 0); }
function calcRequired(row: ConsumptionRow) {
  const value = n(row.consumptionValue);
  const wastage = 1 + n(row.wastagePct) / 100;
  if (row.consumptionBasis === 'KG_DOZ') return (row.orderQty / 12) * value * wastage;
  if (row.consumptionBasis === 'KG_PCS') return row.orderQty * value * wastage;
  return value * wastage;
}
function roundKg(v: number) { return Math.round((v + Number.EPSILON) * 100) / 100; }
function basisLabel(b: Basis) { return b === 'KG_DOZ' ? 'KG / Dozen' : b === 'KG_PCS' ? 'KG / Piece' : 'Total KG'; }

export default function CadWorkspace() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [rows, setRows] = useState<ConsumptionRow[]>([]);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadQueue() {
    setLoading(true); setError('');
    try {
      const data = await api('/cad/workqueue');
      setTasks(data);
      if (!selectedOrderId && data[0]?.orderId) setSelectedOrderId(data[0].orderId);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadQueue(); }, []);

  useEffect(() => {
    if (!selectedOrderId) { setOrder(null); setRows([]); return; }
    setError(''); setMessage('');
    api(`/cad/orders/${selectedOrderId}/consumption`).then((data) => {
      setOrder(data.order);
      setRemarks(data.cadConsumption?.remarks || '');
      if (data.cadConsumption?.rows?.length) {
        setRows(data.cadConsumption.rows.map((r: any) => ({
          styleId: r.styleId, color: r.color || '', orderQty: n(r.orderQty), fabricDescription: r.fabricDescription || '',
          fabricType: r.fabricType || '', gsm: r.gsm ?? '', dia: r.dia || '', consumptionValue: r.consumptionValue ?? '',
          consumptionBasis: r.consumptionBasis || 'TOTAL_KG', wastagePct: r.wastagePct ?? '', requiredKg: n(r.requiredKg), remarks: r.remarks || '',
        })));
      } else {
        const initial: ConsumptionRow[] = [];
        for (const style of data.order.styles || []) {
          const byColor = new Map<string, number>();
          for (const b of style.breakdowns || []) byColor.set(b.color || 'Unspecified', (byColor.get(b.color || 'Unspecified') || 0) + n(b.qty));
          if (!byColor.size) byColor.set('Unspecified', n(style.quantity));
          for (const [color, qty] of byColor) initial.push({
            styleId: style.id, color, orderQty: qty, fabricDescription: '', fabricType: '', gsm: '', dia: '', consumptionValue: '', consumptionBasis: 'TOTAL_KG', wastagePct: '', requiredKg: 0, remarks: '',
          });
        }
        setRows(initial);
      }
    }).catch((e) => setError(e.message));
  }, [selectedOrderId]);

  const styleMap = useMemo(() => new Map((order?.styles || []).map((s: any) => [s.id, s])), [order]);
  const totalKg = useMemo(() => rows.reduce((sum, r) => sum + n(r.requiredKg), 0), [rows]);

  function updateRow(index: number, patch: Partial<ConsumptionRow>) {
    setRows((prev) => prev.map((row, i) => {
      if (i !== index) return row;
      const next = { ...row, ...patch } as ConsumptionRow;
      next.requiredKg = roundKg(calcRequired(next));
      return next;
    }));
  }
  function addRow(index: number) {
    const source = rows[index];
    setRows((prev) => [...prev.slice(0, index + 1), { ...source, fabricDescription: '', fabricType: '', gsm: '', dia: '', consumptionValue: '', wastagePct: '', requiredKg: 0, remarks: '' }, ...prev.slice(index + 1)]);
  }
  function removeRow(index: number) { setRows((prev) => prev.filter((_, i) => i !== index)); }

  async function save() {
    if (!order) return;
    if (!rows.length) { setError('At least one consumption row is required'); return; }
    if (rows.some((r) => !r.fabricDescription.trim())) { setError('Fabric Description is required for every row'); return; }
    setSaving(true); setError(''); setMessage('');
    try {
      await api(`/cad/orders/${order.id}/consumption`, { method: 'PUT', body: JSON.stringify({ rows: rows.map(r => ({ ...r, gsm: r.gsm === '' ? undefined : Number(r.gsm), consumptionValue: r.consumptionValue === '' ? 0 : Number(r.consumptionValue), wastagePct: r.wastagePct === '' ? 0 : Number(r.wastagePct), requiredKg: Number(r.requiredKg) })), remarks }) });
      setMessage('CAD consumption confirmed. Fabric Order Sheet is ready and CAD pending task is completed.');
      await loadQueue();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return <Shell title="CAD / Consumption / Pattern" eyebrow="Sample / CAD / Technical · job-linked consumption">
    <section className="module-hero">
      <div><span className="status-pill">Live foundation</span><h2>CAD Consumption Work Queue</h2><p>Confirmed Order Entry automatically creates a CAD pending task. CAD reviews color-wise quantities, prepares consumption and confirms the fabric requirement. The same data feeds the Fabric Order Sheet and Merchandising follow-up.</p></div>
      <div className="module-actions"><a className="btn btn-secondary" href="/tasks">My Pending Tasks</a></div>
    </section>

    {message && <div className="notice success-notice">{message}</div>}
    {error && <div className="notice">{error}</div>}

    <section className="cad-layout">
      <div className="panel cad-queue-panel">
        <div className="panel-head"><div><div className="panel-title">CAD Pending Jobs</div><div className="panel-sub">New orders and quantity-revision re-checks</div></div><span className="status-pill neutral">{loading ? 'Loading…' : tasks.length}</span></div>
        <div className="cad-task-list">
          {tasks.map((t) => <button key={t.id} className={`cad-task-card ${selectedOrderId === t.orderId ? 'active' : ''}`} onClick={() => setSelectedOrderId(t.orderId)}>
            <strong>{displayJobNo(t.order?.jobNo || 'Job',t.order?.buyer)}</strong><small>{t.title}</small>
          </button>)}
          {!loading && !tasks.length && <div className="empty-state compact"><strong>No CAD pending jobs</strong><span>New confirmed orders will appear here automatically.</span></div>}
        </div>
      </div>

      <div className="panel cad-editor-panel">
        {!order ? <div className="workspace-empty"><div className="workspace-symbol">CD</div><div><strong>Select a pending Job</strong><span>Consumption entry will open here.</span></div></div> : <>
          <div className="panel-head"><div><div className="panel-title">{displayJobNo(order.jobNo,order.buyer)}</div><div className="panel-sub">Order Qty {n(order.totalQty).toLocaleString()} pcs · color quantities are taken from Order Entry</div></div><div className="document-buttons"><a className="btn btn-primary btn-compact" href={`/modules/forms-print?job=${encodeURIComponent(order.jobNo)}`}>Company Forms / Print</a></div></div>
          <div className="cad-help">Consumption basis is selectable because the factory may use different methods. <b>Total KG</b> lets CAD enter the final requirement directly; KG/Dozen and KG/Piece calculate from order quantity. This can later be locked to your approved company rule.</div>
          <div className="wide-table-wrap">
            <table className="table cad-consumption-table"><thead><tr><th>Style</th><th>Color</th><th>Order Qty</th><th>Fabric Description</th><th>Fabric Type</th><th>GSM</th><th>Dia</th><th>Basis</th><th>Consumption / Total KG</th><th>Wastage %</th><th>Required KG</th><th>Remarks</th><th></th></tr></thead><tbody>
              {rows.map((r, i) => <tr key={`${r.styleId}-${r.color}-${i}`}>
                <td><strong>{(styleMap.get(r.styleId) as any)?.styleNo || '—'}</strong></td><td>{r.color}</td><td>{r.orderQty.toLocaleString()}</td>
                <td><input value={r.fabricDescription} onChange={e => updateRow(i, { fabricDescription: e.target.value })} placeholder="e.g. 95% Cotton 5% Elas" /></td>
                <td><input value={r.fabricType} onChange={e => updateRow(i, { fabricType: e.target.value })} placeholder="S/J, Rib, Terry…" /></td>
                <td><input type="number" min="0" value={r.gsm} onChange={e => updateRow(i, { gsm: e.target.value === '' ? '' : Number(e.target.value) })} /></td>
                <td><input value={r.dia} onChange={e => updateRow(i, { dia: e.target.value })} placeholder="Dia" /></td>
                <td><select value={r.consumptionBasis} onChange={e => updateRow(i, { consumptionBasis: e.target.value as Basis })}><option value="TOTAL_KG">Total KG</option><option value="KG_DOZ">KG / Dozen</option><option value="KG_PCS">KG / Piece</option></select></td>
                <td><input type="number" min="0" step="0.0001" value={r.consumptionValue} onChange={e => updateRow(i, { consumptionValue: e.target.value === '' ? '' : Number(e.target.value) })} title={basisLabel(r.consumptionBasis)} /></td>
                <td><input type="number" min="0" step="0.1" value={r.wastagePct} onChange={e => updateRow(i, { wastagePct: e.target.value === '' ? '' : Number(e.target.value) })} /></td>
                <td><strong>{r.requiredKg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></td>
                <td><input value={r.remarks} onChange={e => updateRow(i, { remarks: e.target.value })} /></td>
                <td><div className="row-actions"><button className="btn btn-secondary btn-compact" onClick={() => addRow(i)}>+ Fabric</button><button className="remove-row" onClick={() => removeRow(i)}>Remove</button></div></td>
              </tr>)}
            </tbody></table>
          </div>
          <div className="cad-footer"><div><label>CAD Remarks</label><textarea className="form-control textarea" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional consumption note" /></div><div className="cad-total"><span>Total Fabric Requirement</span><strong>{totalKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} KG</strong><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Confirm Consumption'}</button></div></div>
        </>}
      </div>
    </section>
  </Shell>;
}
