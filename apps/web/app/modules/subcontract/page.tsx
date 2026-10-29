'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';

function fmt(n: any) {
  return Number(n || 0).toLocaleString();
}

export default function SubcontractPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [processFilter, setProcessFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadData() {
    setError('');
    try {
      const ct = await api('/planning/control-tower');
      setOrders(Array.isArray(ct?.subcontractOrders) ? ct.subcontractOrders : []);
    } catch (e: any) {
      setError(e.message || 'Failed to load subcontract work orders');
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((wo) => {
      if (processFilter !== 'ALL' && wo.processType !== processFilter) return false;
      if (search.trim()) {
        const hay = `${wo.workOrderNo} ${wo.jobNo} ${wo.styleNo} ${wo.buyer} ${wo.vendorName} ${wo.challanNo}`.toLowerCase();
        if (!hay.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [orders, processFilter, search]);

  const kpis = useMemo(() => {
    return {
      totalOrders: orders.length,
      totalSent: orders.reduce((s, x) => s + Number(x.sentQty || 0), 0),
      totalRecv: orders.reduce((s, x) => s + Number(x.receivedQty || 0), 0),
      totalReject: orders.reduce((s, x) => s + Number(x.rejectQty || 0), 0),
      totalBalance: orders.reduce((s, x) => s + Number(x.balanceQty || 0), 0),
      delayedCount: orders.filter((x) => x.status === 'DELAYED').length,
    };
  }, [orders]);

  function openNewModal() {
    setEditingOrder({
      workOrderNo: `WO-PRT-${Math.floor(2610 + Math.random() * 90)}`,
      jobNo: '48085',
      styleNo: '13251506',
      buyer: 'ONLY',
      processType: 'PRINTING',
      vendorName: 'Apex Screen Print & Graphics Ltd.',
      sentDate: new Date().toISOString().slice(0, 10),
      sentQty: 5000,
      expectedReturnDate: '',
      receivedDate: '',
      receivedQty: 0,
      rejectQty: 0,
      challanNo: '',
      status: 'SENT_TO_VENDOR',
      remarks: '',
    });
  }

  async function saveWorkOrder() {
    if (!editingOrder) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api('/planning/subcontract', {
        method: 'POST',
        body: JSON.stringify(editingOrder),
      });
      setMessage(`Sub-contract work order ${editingOrder.workOrderNo} saved and synced with T&A.`);
      setEditingOrder(null);
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to save subcontract work order');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell
      title="Print, Embroidery & Wash Sub-Contract Follow-up"
      eyebrow="Central Planning • Outside Work Order Dispatch & Return Tracker"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold uppercase tracking-wider text-slate-400">Central Planning Flow:</span>
          <Link href="/modules/ta" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-cyan-400">
            1. Time & Action (T&A)
          </Link>
          <span className="text-slate-600">→</span>
          <Link href="/modules/planning-approvals" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-cyan-400">
            2. Approval Desk & Release
          </Link>
          <span className="text-slate-600">→</span>
          <Link href="/modules/capacity" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-cyan-400">
            3. Capacity & Holiday Calendar
          </Link>
          <span className="text-slate-600">→</span>
          <Link href="/modules/sewing-planning" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-cyan-400">
            4. Sewing Line Gantt
          </Link>
          <span className="text-slate-600">→</span>
          <span className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-semibold text-cyan-200">
            5. Subcontract Follow-up
          </span>
        </div>
        <button
          onClick={openNewModal}
          className="rounded-xl bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
        >
          + Issue Work Order / Challan
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">{message}</div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>
      )}

      {/* KPI Strip */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <div className="text-[11px] text-slate-400">Active Work Orders</div>
          <div className="mt-1 text-xl font-bold text-white">{kpis.totalOrders}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <div className="text-[11px] text-slate-400">Total Sent to Vendor</div>
          <div className="mt-1 text-xl font-bold text-cyan-300">{fmt(kpis.totalSent)} pcs</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <div className="text-[11px] text-slate-400">Total Received OK</div>
          <div className="mt-1 text-xl font-bold text-emerald-300">{fmt(kpis.totalRecv)} pcs</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <div className="text-[11px] text-slate-400">Vendor Reject Qty</div>
          <div className="mt-1 text-xl font-bold text-amber-300">{fmt(kpis.totalReject)} pcs</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <div className="text-[11px] text-slate-400">Balance at Vendor</div>
          <div className="mt-1 text-xl font-bold text-indigo-300">{fmt(kpis.totalBalance)} pcs</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <div className="text-[11px] text-slate-400">Delayed Work Orders</div>
          <div className="mt-1 text-xl font-bold text-rose-300">{kpis.delayedCount}</div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            {['ALL', 'PRINTING', 'EMBROIDERY', 'WASH'].map((p) => (
              <button
                key={p}
                onClick={() => setProcessFilter(p)}
                className={`rounded-lg px-3 py-1 font-medium ${
                  processFilter === p
                    ? 'bg-cyan-500 text-slate-950'
                    : 'border border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by WO #, Job #, Style, Vendor, Challan..."
            className="w-72 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2.5 pr-3">Work Order / Challan</th>
                <th className="py-2.5 px-2">Job / Style / Buyer</th>
                <th className="py-2.5 px-2">Process & Vendor</th>
                <th className="py-2.5 px-2">Sent / Return Dates</th>
                <th className="py-2.5 px-2">Sent Qty</th>
                <th className="py-2.5 px-2">Received OK</th>
                <th className="py-2.5 px-2">Reject / Balance</th>
                <th className="py-2.5 px-2">Status</th>
                <th className="py-2.5 pl-2 text-right">Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filtered.map((wo) => (
                <tr key={wo.workOrderNo} className="hover:bg-slate-950/50">
                  <td className="py-3 pr-3">
                    <div className="font-mono font-semibold text-cyan-300">{wo.workOrderNo}</div>
                    <div className="text-[11px] text-slate-400">Challan: {wo.challanNo || 'Pending'}</div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="font-semibold text-white">
                      Job #{wo.jobNo} · {wo.styleNo}
                    </div>
                    <div className="text-[11px] text-slate-400">{wo.buyer}</div>
                  </td>
                  <td className="py-3 px-2">
                    <span className="rounded border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-200">
                      {wo.processType}
                    </span>
                    <div className="mt-1 text-slate-200">{wo.vendorName}</div>
                  </td>
                  <td className="py-3 px-2 font-mono text-[11px]">
                    <div className="text-slate-300">Sent: {wo.sentDate || '—'}</div>
                    <div className="text-cyan-300">Due: {wo.expectedReturnDate || '—'}</div>
                    {wo.receivedDate && <div className="text-emerald-300">Recv: {wo.receivedDate}</div>}
                  </td>
                  <td className="py-3 px-2 font-mono text-white">{fmt(wo.sentQty)} pcs</td>
                  <td className="py-3 px-2 font-mono text-emerald-300">{fmt(wo.receivedQty)} pcs</td>
                  <td className="py-3 px-2 font-mono">
                    <div className="text-amber-300">Rej: {fmt(wo.rejectQty)}</div>
                    <div className="font-semibold text-white">Bal: {fmt(wo.balanceQty)}</div>
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                        wo.status === 'COMPLETED'
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                          : wo.status === 'DELAYED'
                          ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
                          : 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                      }`}
                    >
                      {wo.status}
                    </span>
                    {wo.remarks && <div className="mt-1 max-w-[180px] text-[10px] text-slate-400">{wo.remarks}</div>}
                  </td>
                  <td className="py-3 pl-2 text-right">
                    <button
                      onClick={() => setEditingOrder({ ...wo })}
                      className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-200 hover:bg-cyan-500/20"
                    >
                      Update Receive / Challan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-cyan-500/40 bg-slate-900 p-5 text-xs">
            <h3 className="text-sm font-semibold text-white">Sub-Contract Work Order Sent / Received Entry</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400">Work Order No.</label>
                <input
                  type="text"
                  value={editingOrder.workOrderNo}
                  onChange={(e) => setEditingOrder({ ...editingOrder, workOrderNo: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Process Type</label>
                <select
                  value={editingOrder.processType}
                  onChange={(e) => setEditingOrder({ ...editingOrder, processType: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                >
                  <option value="PRINTING">PRINTING</option>
                  <option value="EMBROIDERY">EMBROIDERY</option>
                  <option value="WASH">GARMENT WASH</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400">Job No.</label>
                <input
                  type="text"
                  value={editingOrder.jobNo}
                  onChange={(e) => setEditingOrder({ ...editingOrder, jobNo: e.target.value, styleId: `s-${e.target.value}` })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Style No.</label>
                <input
                  type="text"
                  value={editingOrder.styleNo}
                  onChange={(e) => setEditingOrder({ ...editingOrder, styleNo: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-slate-400">Outside Vendor Name</label>
                <input
                  type="text"
                  value={editingOrder.vendorName}
                  onChange={(e) => setEditingOrder({ ...editingOrder, vendorName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Sent Date</label>
                <input
                  type="date"
                  value={editingOrder.sentDate || ''}
                  onChange={(e) => setEditingOrder({ ...editingOrder, sentDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Expected Return Date</label>
                <input
                  type="date"
                  value={editingOrder.expectedReturnDate || ''}
                  onChange={(e) => setEditingOrder({ ...editingOrder, expectedReturnDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Sent Qty (Pcs)</label>
                <input
                  type="number"
                  value={editingOrder.sentQty || 0}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setEditingOrder({ ...editingOrder, sentQty: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Received OK Qty (Pcs)</label>
                <input
                  type="number"
                  value={editingOrder.receivedQty || 0}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setEditingOrder({ ...editingOrder, receivedQty: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Reject Qty (Pcs)</label>
                <input
                  type="number"
                  value={editingOrder.rejectQty || 0}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setEditingOrder({ ...editingOrder, rejectQty: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Delivery Challan No.</label>
                <input
                  type="text"
                  value={editingOrder.challanNo || ''}
                  onChange={(e) => setEditingOrder({ ...editingOrder, challanNo: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-slate-400">Remarks / Quality Note</label>
                <input
                  type="text"
                  value={editingOrder.remarks || ''}
                  onChange={(e) => setEditingOrder({ ...editingOrder, remarks: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingOrder(null)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={saveWorkOrder}
                disabled={saving}
                className="rounded-lg bg-cyan-500 px-4 py-1.5 font-semibold text-slate-950 hover:bg-cyan-400"
              >
                {saving ? 'Saving...' : 'Save Work Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
