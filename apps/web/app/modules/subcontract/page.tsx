'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid
} from 'recharts';
import { FX_SERIES, FX_BAR, FX_PIE, FxResponsiveContainer as ResponsiveContainer } from '../../../components/fx';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  X,
  Boxes,
  TrendingUp,
} from 'lucide-react';

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
  const [activeChartBar, setActiveChartBar] = useState<number | null>(null);

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

  // Chart data: breakdown by process
  const chartData = useMemo(() => {
    const processes = ['PRINTING', 'EMBROIDERY', 'WASH'];
    return processes.map((proc) => {
      const pOrders = orders.filter((o) => o.processType === proc);
      const sent = pOrders.reduce((s, x) => s + Number(x.sentQty || 0), 0);
      const recv = pOrders.reduce((s, x) => s + Number(x.receivedQty || 0), 0);
      const bal = pOrders.reduce((s, x) => s + Number(x.balanceQty || 0), 0);
      return {
        name: proc,
        orders: pOrders.length,
        sent,
        received: recv,
        balance: bal,
        color: proc === 'PRINTING' ? '#0284C7' : proc === 'EMBROIDERY' ? '#8B5CF6' : '#10B981',
      };
    });
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

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div
          style={{
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '10px 14px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            border: '1px solid #334155',
            fontSize: '12px',
            lineHeight: 1.4,
            minWidth: '170px',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 700, color: d.color, marginBottom: '4px' }}>
            {d.name} ({d.orders} WOs)
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span style={{ color: '#94A3B8' }}>Total Sent:</span>
            <span style={{ fontWeight: 700 }}>{fmt(d.sent)} pcs</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span style={{ color: '#94A3B8' }}>Received OK:</span>
            <span style={{ fontWeight: 700, color: '#10B981' }}>{fmt(d.received)} pcs</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span style={{ color: '#94A3B8' }}>Balance at Vendor:</span>
            <span style={{ fontWeight: 700, color: '#F59E0B' }}>{fmt(d.balance)} pcs</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Shell
      title="5. Print, Embroidery & Wash Sub-Contract Follow-up"
      eyebrow="Central Planning • Outside Work Order Dispatch & Return Tracker"
    >
      <div className="erp-page-entrance" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Module Header Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: '#FFFFFF',
            padding: '12px 18px',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284C7, #0369A1)',
                display: 'grid',
                placeItems: 'center',
                color: '#FFFFFF',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
              }}
            >
              <Truck size={18} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F274E', letterSpacing: '-0.01em' }}>
                Sub-Contract &amp; Outside Vendor Follow-up
              </div>
</div>
          </div>

          <button
            onClick={openNewModal}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#0284C7',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={14} /> Issue Work Order / Challan
          </button>
        </div>

        {/* Notifications */}
        {message && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#065F46',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} />
            {message}
          </div>
        )}
        {error && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* Trims & Accessories Store Standard KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px',
          }}
        >
          {/* Card 1: Active Work Orders */}
          <div
            onClick={() => setProcessFilter('ALL')}
            style={{
              background: processFilter === 'ALL' ? '#F0F9FF' : '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '8px',
              border: processFilter === 'ALL' ? '2px solid #0284C7' : '1px solid #E2E8F0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>
              Active Work Orders
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F274E', margin: '2px 0' }}>
              {kpis.totalOrders} Orders
            </div>
            <div style={{ fontSize: '11.5px', color: '#0284C7', fontWeight: 600 }}>
              Outside embellishments
            </div>
          </div>

          {/* Card 2: Total Sent */}
          <div
            style={{
              background: '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>
              Total Sent to Vendors
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F274E', margin: '2px 0' }}>
              {fmt(kpis.totalSent)} pcs
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B' }}>
              Cut panels dispatched
            </div>
          </div>

          {/* Card 3: Received OK */}
          <div
            style={{
              background: '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>
              Total Received OK
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#059669', margin: '2px 0' }}>
              {fmt(kpis.totalRecv)} pcs
            </div>
            <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
              Ready for sewing input
            </div>
          </div>

          {/* Card 4: Vendor Reject */}
          <div
            style={{
              background: '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>
              Vendor Rejection
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#D97706', margin: '2px 0' }}>
              {fmt(kpis.totalReject)} pcs
            </div>
            <div style={{ fontSize: '11.5px', color: '#D97706', fontWeight: 600 }}>
              Print/embroidery flaws
            </div>
          </div>

          {/* Card 5: Balance at Vendor */}
          <div
            style={{
              background: '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>
              Balance at Vendor
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#4338CA', margin: '2px 0' }}>
              {fmt(kpis.totalBalance)} pcs
            </div>
            <div style={{ fontSize: '11.5px', color: '#4338CA', fontWeight: 600 }}>
              Work in progress
            </div>
          </div>

          {/* Card 6: Delayed Work Orders */}
          <div
            style={{
              background: kpis.delayedCount > 0 ? '#FEF2F2' : '#FFFFFF',
              padding: '12px 14px',
              borderRadius: '8px',
              border: kpis.delayedCount > 0 ? '2px solid #DC2626' : '1px solid #FECACA',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700, textTransform: 'uppercase' }}>
              Delayed Work Orders
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#DC2626', margin: '2px 0' }}>
              {kpis.delayedCount} Orders
            </div>
            <div style={{ fontSize: '11.5px', color: '#991B1B', fontWeight: 600 }}>
              Past expected return
            </div>
          </div>
        </div>

        {/* Compact Interactive Chart */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            padding: '14px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 750, color: '#0F274E' }}>
                Outside Process Breakdown: Dispatched vs Received vs Balance
              </div>
</div>
            <span
              style={{
                background: '#F0F9FF',
                color: '#0284C7',
                border: '1px solid #BAE6FD',
                padding: '3px 9px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 650,
              }}
            >
              Vendor Analytics
            </span>
          </div>

          <div style={{ width: '100%', height: '140px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11, fontWeight: 550 }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(2, 132, 199, 0.06)' }} />
                <Bar {...FX_BAR}
                  dataKey="sent"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                  onMouseEnter={(_, index) => setActiveChartBar(index)}
                  onMouseLeave={() => setActiveChartBar(null)}
                >
                  {chartData.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={activeChartBar === index ? entry.color : '#BAE6FD'}
                      stroke={entry.color}
                      strokeWidth={1.5}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Main Work Orders Table */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'PRINTING', 'EMBROIDERY', 'WASH'].map((p) => (
                <button
                  key={p}
                  onClick={() => setProcessFilter(p)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: processFilter === p ? 700 : 550,
                    border: '1px solid #CBD5E1',
                    background: processFilter === p ? '#0284C7' : '#FFFFFF',
                    color: processFilter === p ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Work Order, Job, Vendor..."
                style={{
                  height: '30px',
                  padding: '0 10px 0 28px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '11.5px',
                  width: '240px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>Work Order / Challan</th>
                  <th style={{ padding: '8px 10px' }}>Job / Style / Buyer</th>
                  <th style={{ padding: '8px 10px' }}>Process &amp; Vendor</th>
                  <th style={{ padding: '8px 10px' }}>Sent / Return Dates</th>
                  <th style={{ padding: '8px 10px' }}>Sent Qty</th>
                  <th style={{ padding: '8px 10px' }}>Received OK</th>
                  <th style={{ padding: '8px 10px' }}>Reject / Balance</th>
                  <th style={{ padding: '8px 10px' }}>Status</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((wo, idx) => (
                  <tr key={wo.workOrderNo || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 800, color: '#0284C7', fontFamily: 'monospace' }}>
                        {wo.workOrderNo}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748B' }}>Challan: {wo.challanNo || 'Pending'}</div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 800, color: '#0F274E' }}>Job #{wo.jobNo} · {wo.styleNo}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{wo.buyer}</div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ background: '#EEF2FF', color: '#4338CA', padding: '2px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 700 }}>
                        {wo.processType}
                      </span>
                      <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}>{wo.vendorName}</div>
                    </td>
                    <td style={{ padding: '10px', fontSize: '11px', fontFamily: 'monospace' }}>
                      <div>Sent: {wo.sentDate || '—'}</div>
                      <div style={{ color: '#0284C7', fontWeight: 600 }}>Due: {wo.expectedReturnDate || '—'}</div>
                      {wo.receivedDate && <div style={{ color: '#059669' }}>Recv: {wo.receivedDate}</div>}
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 700 }}>
                      {fmt(wo.sentQty)} pcs
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>
                      {fmt(wo.receivedQty)} pcs
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'monospace' }}>
                      <div style={{ color: '#D97706', fontSize: '11px' }}>Rej: {fmt(wo.rejectQty)}</div>
                      <div style={{ fontWeight: 700, color: '#0F274E' }}>Bal: {fmt(wo.balanceQty)}</div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          background: wo.status === 'COMPLETED' ? '#ECFDF5' : wo.status === 'DELAYED' ? '#FEF2F2' : '#FFFBEB',
                          color: wo.status === 'COMPLETED' ? '#059669' : wo.status === 'DELAYED' ? '#DC2626' : '#D97706',
                        }}
                      >
                        {wo.status}
                      </span>
                      {wo.remarks && <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>{wo.remarks}</div>}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button
                        onClick={() => setEditingOrder({ ...wo })}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '5px',
                          border: '1px solid #0284C7',
                          background: '#F0F9FF',
                          color: '#0284C7',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Update Receive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Edit Subcontract Work Order */}
        {editingOrder && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '520px',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                fontSize: '12px',
              }}
            >
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F274E', marginBottom: '12px' }}>
                Sub-Contract Work Order &amp; Challan Follow-up
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '2px' }}>Work Order No.</label>
                  <input
                    type="text"
                    value={editingOrder.workOrderNo}
                    onChange={(e) => setEditingOrder({ ...editingOrder, workOrderNo: e.target.value })}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '2px' }}>Process Type</label>
                  <select
                    value={editingOrder.processType}
                    onChange={(e) => setEditingOrder({ ...editingOrder, processType: e.target.value })}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                  >
                    <option value="PRINTING">PRINTING</option>
                    <option value="EMBROIDERY">EMBROIDERY</option>
                    <option value="WASH">GARMENT WASH</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '2px' }}>Job No.</label>
                  <input
                    type="text"
                    value={editingOrder.jobNo}
                    onChange={(e) => setEditingOrder({ ...editingOrder, jobNo: e.target.value, styleId: `s-${e.target.value}` })}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '2px' }}>Style No.</label>
                  <input
                    type="text"
                    value={editingOrder.styleNo}
                    onChange={(e) => setEditingOrder({ ...editingOrder, styleNo: e.target.value })}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '2px' }}>Outside Vendor Name</label>
                  <input
                    type="text"
                    value={editingOrder.vendorName}
                    onChange={(e) => setEditingOrder({ ...editingOrder, vendorName: e.target.value })}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '2px' }}>Sent Qty (Pcs)</label>
                  <input
                    type="number"
                    value={editingOrder.sentQty || 0}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => setEditingOrder({ ...editingOrder, sentQty: Number(e.target.value) })}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '2px' }}>Received OK Qty (Pcs)</label>
                  <input
                    type="number"
                    value={editingOrder.receivedQty || 0}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => setEditingOrder({ ...editingOrder, receivedQty: Number(e.target.value) })}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '2px' }}>Delivery Challan No.</label>
                  <input
                    type="text"
                    value={editingOrder.challanNo || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, challanNo: e.target.value })}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '2px' }}>Expected Return Date</label>
                  <input
                    type="date"
                    value={editingOrder.expectedReturnDate || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, expectedReturnDate: e.target.value })}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  onClick={() => setEditingOrder(null)}
                  style={{ padding: '6px 12px', borderRadius: '5px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveWorkOrder}
                  disabled={saving}
                  style={{ padding: '6px 14px', borderRadius: '5px', border: 'none', background: '#0284C7', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                >
                  {saving ? 'Saving...' : 'Save Work Order'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
