'use client';

import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';

type SampleType = 'Development Sample' | 'Offer Sample' | 'Fit Sample' | 'SMS Sample' | 'PP Sample';
type PresentStatus = 'Pending' | 'In Development' | 'Ready for Submission' | 'Submitted to Buyer' | 'Waiting for Buyer Feedback' | 'Revision Required' | 'Completed';
type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Revision Required';
type SampleRecord = {
  id: string;
  styleNo: string;
  buyer: string;
  colour: string;
  sampleType: SampleType;
  orderQty: number | null;
  sampleQty: number;
  requiredFabric: string;
  presentStatus: PresentStatus;
  approvalStatus: ApprovalStatus;
  collection: string;
  poReference: string;
  source: 'MANUAL' | 'SO';
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'nos-sample-followup-records-v1';
const SAMPLE_TYPES: SampleType[] = ['Development Sample', 'Offer Sample', 'Fit Sample', 'SMS Sample', 'PP Sample'];
const PRESENT_STATUSES: PresentStatus[] = ['Pending', 'In Development', 'Ready for Submission', 'Submitted to Buyer', 'Waiting for Buyer Feedback', 'Revision Required', 'Completed'];
const APPROVAL_STATUSES: ApprovalStatus[] = ['Pending', 'Approved', 'Rejected', 'Revision Required'];
const emptyForm = {
  entryMethod: 'MANUAL' as 'MANUAL' | 'SO',
  soId: '',
  styleNo: '',
  buyer: '',
  sampleType: 'Development Sample' as SampleType,
  colour: '',
  orderQty: '',
  sampleQty: '1',
  requiredFabric: '',
  presentStatus: 'Pending' as PresentStatus,
  approvalStatus: 'Pending' as ApprovalStatus,
  collection: 'Collection 1',
  poReference: '',
};

function uniqueStyleCount(records: SampleRecord[], type: SampleType) {
  return new Set(records.filter(r => r.sampleType === type).map(r => r.styleNo.trim().toLowerCase()).filter(Boolean)).size;
}
function pcsCount(records: SampleRecord[], type: SampleType) {
  return records.filter(r => r.sampleType === type).reduce((sum, r) => sum + (Number(r.sampleQty) || 0), 0);
}
function hitRate(records: SampleRecord[], from: SampleType, to: SampleType) {
  const base = new Set(records.filter(r => r.sampleType === from).map(r => r.styleNo.trim().toLowerCase()).filter(Boolean));
  if (!base.size) return null;
  const converted = new Set(records.filter(r => r.sampleType === to).map(r => r.styleNo.trim().toLowerCase()).filter(Boolean));
  return Math.round([...base].filter(style => converted.has(style)).length / base.size * 100);
}
function statusClass(value: string) {
  if (['Approved', 'Completed'].includes(value)) return 'good';
  if (['Rejected', 'Revision Required'].includes(value)) return 'bad';
  if (['In Development', 'Ready for Submission', 'Submitted to Buyer'].includes(value)) return 'warn';
  return 'neutral';
}

export default function SampleMerchandisingPage() {
  const [records, setRecords] = useState<SampleRecord[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [activeView, setActiveView] = useState<'ENTRY' | 'REGISTER'>('ENTRY');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [collectionFilter, setCollectionFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setRecords(JSON.parse(saved));
    } catch {
      setError('Saved sample records could not be read from this browser.');
    }
    api('/orders').then((data: any) => setOrders(Array.isArray(data) ? data : data?.orders || [])).catch(() => setOrders([]));
  }, []);

  const persist = (next: SampleRecord[]) => {
    setRecords(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setMessage('Sample Report saved in this browser.');
      setError('');
    } catch {
      setError('Could not save Sample Report in browser storage.');
    }
  };

  const selectedOrder = orders.find((o: any) => String(o.id) === form.soId);
  const orderStyles: any[] = selectedOrder?.styles || [];
  const selectedStyle = orderStyles.find((s: any) => String(s.styleNo || s.id) === form.styleNo) || orderStyles[0];

  function changeEntryMethod(method: 'MANUAL' | 'SO') {
    setForm(prev => ({ ...prev, entryMethod: method, soId: '', styleNo: '', buyer: '', colour: '', orderQty: '', poReference: '' }));
    setMessage('');
  }
  function selectOrder(orderId: string) {
    const order = orders.find((o: any) => String(o.id) === orderId);
    const firstStyle = order?.styles?.[0];
    setForm(prev => ({
      ...prev,
      soId: orderId,
      buyer: order?.buyer?.name || order?.buyer?.code || '',
      styleNo: firstStyle?.styleNo || '',
      orderQty: firstStyle?.quantity == null ? '' : String(firstStyle.quantity),
      colour: firstStyle?.colors?.[0]?.name || firstStyle?.color || '',
      poReference: '',
    }));
  }
  function selectStyle(styleNo: string) {
    const style = orderStyles.find((s: any) => String(s.styleNo || s.id) === styleNo);
    setForm(prev => ({ ...prev, styleNo, orderQty: style?.quantity == null ? prev.orderQty : String(style.quantity), colour: style?.colors?.[0]?.name || style?.color || prev.colour }));
  }
  function saveRecord(event: React.FormEvent) {
    event.preventDefault();
    if (!form.styleNo.trim() || !form.colour.trim()) {
      setError('Style No. and Colour are required.');
      return;
    }
    const sampleQty = Number(form.sampleQty);
    if (!Number.isInteger(sampleQty) || sampleQty < 1) {
      setError('Sample Qty must be a positive whole number.');
      return;
    }
    if (form.sampleType === 'PP Sample' && !form.poReference.trim()) {
      setError('PO Reference is required for PP Sample.');
      return;
    }
    const now = new Date().toISOString();
    const record: SampleRecord = {
      id: crypto.randomUUID(),
      styleNo: form.styleNo.trim(),
      buyer: form.buyer.trim(),
      colour: form.colour.trim(),
      sampleType: form.sampleType,
      orderQty: form.orderQty === '' ? null : Number(form.orderQty),
      sampleQty,
      requiredFabric: form.requiredFabric.trim(),
      presentStatus: form.presentStatus,
      approvalStatus: form.approvalStatus,
      collection: form.collection,
      poReference: form.sampleType === 'PP Sample' ? form.poReference.trim() : '',
      source: form.entryMethod,
      createdAt: now,
      updatedAt: now,
    };
    persist([record, ...records]);
    setForm({ ...emptyForm, entryMethod: form.entryMethod, buyer: form.buyer, collection: form.collection });
    setActiveView('REGISTER');
  }

  function updateRecord(id: string, patch: Partial<SampleRecord>) {
    persist(records.map(r => r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r));
  }

  const filtered = useMemo(() => records.filter(r => {
    const q = query.trim().toLowerCase();
    if (q && ![r.styleNo, r.buyer, r.colour, r.requiredFabric].some(v => v.toLowerCase().includes(q))) return false;
    if (typeFilter !== 'ALL' && r.sampleType !== typeFilter) return false;
    if (statusFilter !== 'ALL' && r.presentStatus !== statusFilter) return false;
    if (collectionFilter !== 'ALL' && r.collection !== collectionFilter) return false;
    return true;
  }), [records, query, typeFilter, statusFilter, collectionFilter]);

  const styles = useMemo(() => Array.from(new Set(records.map(r => r.styleNo))).length, [records]);
  const pending = records.filter(r => !['Completed'].includes(r.presentStatus)).length;
  const approved = records.filter(r => r.approvalStatus === 'Approved').length;
  const offerSmsRate = hitRate(records, 'Offer Sample', 'SMS Sample');
  const smsPpRate = hitRate(records, 'SMS Sample', 'PP Sample');

  return (
    <Shell title="Sample Follow-up" eyebrow="NOS / MERCHANDISING · SAMPLE MANAGEMENT">
      <div className="page-stack" style={{ gap: 16 }}>
        <section className="panel" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div className="panel-title">Sample Dashboard</div>
              <div className="panel-sub">Sample Report থেকে Style, Colour, Sample Qty এবং বর্তমান Status-এর সারসংক্ষেপ।</div>
            </div>
            <span className="status-pill neutral">Always visible</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 16 }}>
            {SAMPLE_TYPES.map(type => (
              <button key={type} type="button" onClick={() => { setTypeFilter(type); setActiveView('REGISTER'); }} style={{ textAlign: 'left', border: '1px solid #dbe3ef', background: typeFilter === type ? '#eff6ff' : '#fff', borderRadius: 12, padding: 14, cursor: 'pointer', color: '#0f172a' }}>
                <div style={{ color: '#64748b', fontSize: 12, minHeight: 32 }}>{type}</div>
                <div style={{ fontSize: 25, fontWeight: 800, marginTop: 6 }}>{uniqueStyleCount(records, type).toLocaleString()}</div>
                <div style={{ color: '#64748b', fontSize: 12 }}>Styles · {pcsCount(records, type).toLocaleString()} sample pcs</div>
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginTop: 12 }}>
            <div style={{ border: '1px solid #dbe3ef', borderRadius: 12, padding: 14 }}><div style={{ fontSize: 12, color: '#64748b' }}>Total Styles</div><div style={{ fontSize: 23, fontWeight: 800 }}>{styles}</div></div>
            <div style={{ border: '1px solid #dbe3ef', borderRadius: 12, padding: 14 }}><div style={{ fontSize: 12, color: '#64748b' }}>Pending Samples</div><div style={{ fontSize: 23, fontWeight: 800 }}>{pending}</div></div>
            <div style={{ border: '1px solid #dbe3ef', borderRadius: 12, padding: 14 }}><div style={{ fontSize: 12, color: '#64748b' }}>Approved</div><div style={{ fontSize: 23, fontWeight: 800 }}>{approved}</div></div>
            <div style={{ border: '1px solid #dbe3ef', borderRadius: 12, padding: 14 }}><div style={{ fontSize: 12, color: '#64748b' }}>Offer → SMS</div><div style={{ fontSize: 23, fontWeight: 800 }}>{offerSmsRate === null ? 'N/A' : `${offerSmsRate}%`}</div><div style={{ fontSize: 11, color: '#64748b' }}>Style-based conversion</div></div>
            <div style={{ border: '1px solid #dbe3ef', borderRadius: 12, padding: 14 }}><div style={{ fontSize: 12, color: '#64748b' }}>SMS → PP</div><div style={{ fontSize: 23, fontWeight: 800 }}>{smsPpRate === null ? 'N/A' : `${smsPpRate}%`}</div><div style={{ fontSize: 11, color: '#64748b' }}>Style-based conversion</div></div>
          </div>
        </section>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className={activeView === 'ENTRY' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setActiveView('ENTRY')}>Sample Order Entry & Report</button>
          <button type="button" className={activeView === 'REGISTER' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setActiveView('REGISTER')}>Sample Follow-up Register</button>
        </div>

        {message && <div className="notice" role="status">{message}</div>}
        {error && <div className="notice notice-error" role="alert">{error}</div>}

        {activeView === 'ENTRY' ? (
          <section className="panel" style={{ padding: 18 }}>
            <div className="panel-head">
              <div><div className="panel-title">Sample Order Entry & Sample Report</div><div className="panel-sub">একটি Row = একটি Style + Colour + Sample Type। এক Style-এর একাধিক Colour আলাদা Record হিসেবে Entry করুন।</div></div>
            </div>
            <form onSubmit={saveRecord} style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className={form.entryMethod === 'MANUAL' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => changeEntryMethod('MANUAL')}>Manual Entry</button>
                <button type="button" className={form.entryMethod === 'SO' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => changeEntryMethod('SO')}>Entry from SO</button>
              </div>
              {form.entryMethod === 'SO' && (
                <div className="form-field">
                  <label>Sales Order</label>
                  <select className="form-control" value={form.soId} onChange={e => selectOrder(e.target.value)} required>
                    <option value="">Select Sales Order</option>
                    {orders.map((o: any) => <option key={o.id} value={o.id}>{o.jobNo || o.orderNo || o.id} · {o.buyer?.name || o.buyer?.code || 'Buyer'} · {(o.styles || []).length} styles</option>)}
                  </select>
                  {!orders.length && <small>SO list unavailable. Check API connection or use Manual Entry.</small>}
                </div>
              )}
              {form.entryMethod === 'SO' && selectedOrder && orderStyles.length > 0 && (
                <div className="form-field">
                  <label>Style from SO</label>
                  <select className="form-control" value={form.styleNo} onChange={e => selectStyle(e.target.value)}>
                    {orderStyles.map((s: any) => <option key={s.id || s.styleNo} value={s.styleNo || s.id}>{s.styleNo || s.id} · {s.itemDescription || s.item || 'Style'}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
                <div className="form-field"><label>Style No. *</label><input className="form-control" value={form.styleNo} onChange={e => setForm(p => ({ ...p, styleNo: e.target.value }))} required /></div>
                <div className="form-field"><label>Buyer</label><input className="form-control" value={form.buyer} onChange={e => setForm(p => ({ ...p, buyer: e.target.value }))} /></div>
                <div className="form-field"><label>Sample Type *</label><select className="form-control" value={form.sampleType} onChange={e => setForm(p => ({ ...p, sampleType: e.target.value as SampleType, poReference: '' }))}>{SAMPLE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div className="form-field"><label>Colour *</label><input className="form-control" value={form.colour} onChange={e => setForm(p => ({ ...p, colour: e.target.value }))} required /></div>
                <div className="form-field"><label>Order Qty (Colour-wise)</label><input className="form-control" type="number" min="0" value={form.orderQty} onChange={e => setForm(p => ({ ...p, orderQty: e.target.value }))} /></div>
                <div className="form-field"><label>Sample Qty *</label><input className="form-control" type="number" min="1" step="1" value={form.sampleQty} onChange={e => setForm(p => ({ ...p, sampleQty: e.target.value }))} required /></div>
                <div className="form-field"><label>Collection</label><select className="form-control" value={form.collection} onChange={e => setForm(p => ({ ...p, collection: e.target.value }))}>{Array.from({ length: 8 }, (_, i) => `Collection ${i + 1}`).map(c => <option key={c}>{c}</option>)}</select></div>
                <div className="form-field"><label>Required Fabric</label><input className="form-control" value={form.requiredFabric} onChange={e => setForm(p => ({ ...p, requiredFabric: e.target.value }))} placeholder="Fabric description / GSM" /></div>
                {form.sampleType === 'PP Sample' && <div className="form-field"><label>PO Reference * (PP only)</label><input className="form-control" value={form.poReference} onChange={e => setForm(p => ({ ...p, poReference: e.target.value }))} required /></div>}
                <div className="form-field"><label>Present Status</label><select className="form-control" value={form.presentStatus} onChange={e => setForm(p => ({ ...p, presentStatus: e.target.value as PresentStatus }))}>{PRESENT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div className="form-field"><label>Approval Status</label><select className="form-control" value={form.approvalStatus} onChange={e => setForm(p => ({ ...p, approvalStatus: e.target.value as ApprovalStatus }))}>{APPROVAL_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button type="button" className="btn btn-secondary" onClick={() => setForm(emptyForm)}>Reset</button><button type="submit" className="btn btn-primary">Save Sample Report</button></div>
            </form>
          </section>
        ) : (
          <section className="panel" style={{ padding: 18 }}>
            <div className="panel-head"><div><div className="panel-title">Sample Follow-up Register</div><div className="panel-sub">মূল Sample Report থেকে তৈরি; Date ও T&A তথ্য এখানে নেই।</div></div><span className="status-pill neutral">{filtered.length} records</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, margin: '12px 0 16px' }}>
              <div className="form-field"><label>Search</label><input className="form-control" value={query} onChange={e => setQuery(e.target.value)} placeholder="Style / Buyer / Colour / Fabric" /></div>
              <div className="form-field"><label>Sample Type</label><select className="form-control" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="ALL">All Sample Types</option>{SAMPLE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div className="form-field"><label>Present Status</label><select className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="ALL">All Statuses</option>{PRESENT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
              <div className="form-field"><label>Collection</label><select className="form-control" value={collectionFilter} onChange={e => setCollectionFilter(e.target.value)}><option value="ALL">All Collections</option>{Array.from({ length: 8 }, (_, i) => `Collection ${i + 1}`).map(c => <option key={c}>{c}</option>)}</select></div>
            </div>
            <div className="table-scroll"><table className="data-table compact-table"><thead><tr><th>Style No.</th><th>Colour</th><th>Sample Type</th><th>Required Fabric</th><th>Present Status</th><th>Approval Status</th><th>Action</th></tr></thead><tbody>
              {filtered.map(r => <tr key={r.id}><td><strong>{r.styleNo}</strong><div style={{ fontSize: 11, color: '#64748b' }}>{r.buyer || '—'}</div>{r.sampleType === 'PP Sample' && r.poReference && <div style={{ fontSize: 11, color: '#64748b' }}>PO: {r.poReference}</div>}</td><td>{r.colour}</td><td>{r.sampleType}</td><td>{r.requiredFabric || '—'}</td><td><select aria-label={`Present status for ${r.styleNo}`} className="form-control" value={r.presentStatus} onChange={e => updateRecord(r.id, { presentStatus: e.target.value as PresentStatus })}>{PRESENT_STATUSES.map(s => <option key={s}>{s}</option>)}</select><span className={`status-pill ${statusClass(r.presentStatus)}`}>{r.presentStatus}</span></td><td><select aria-label={`Approval status for ${r.styleNo}`} className="form-control" value={r.approvalStatus} onChange={e => updateRecord(r.id, { approvalStatus: e.target.value as ApprovalStatus })}>{APPROVAL_STATUSES.map(s => <option key={s}>{s}</option>)}</select><span className={`status-pill ${statusClass(r.approvalStatus)}`}>{r.approvalStatus}</span></td><td><button type="button" className="btn btn-secondary btn-tiny" onClick={() => { setForm({ ...emptyForm, styleNo: r.styleNo, buyer: r.buyer, colour: r.colour, sampleType: r.sampleType, orderQty: r.orderQty == null ? '' : String(r.orderQty), sampleQty: String(r.sampleQty), requiredFabric: r.requiredFabric, presentStatus: r.presentStatus, approvalStatus: r.approvalStatus, collection: r.collection, poReference: r.poReference }); setActiveView('ENTRY'); }}>Edit / Copy</button></td></tr>)}
              {!filtered.length && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>No sample records match the selected filters.</td></tr>}
            </tbody></table></div>
            <div style={{ marginTop: 12, color: '#64748b', fontSize: 12 }}>Order Qty and Sample Qty are stored separately. Request and delivery dates belong in the separate Sample T&A section.</div>
          </section>
        )}
        <div className="notice" style={{ fontSize: 12 }}>MVP note: Sample Reports currently save in this browser only. SO lookup uses the existing Orders API. Before production use, connect Sample Reports to the shared backend database so authorized users see the same records across devices.</div>
      </div>
    </Shell>
  );
}
