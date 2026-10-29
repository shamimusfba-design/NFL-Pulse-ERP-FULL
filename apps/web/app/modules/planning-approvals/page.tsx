'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../../components/Shell';
import { api } from '../../../lib/api';

function fmt(n: any) {
  return Number(n || 0).toLocaleString();
}

function statusBadge(status: string) {
  switch (status) {
    case 'RELEASED_TO_KNITTING':
      return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200';
    case 'APPROVED':
      return 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200';
    case 'SIGNED_COPY_RECORDED':
      return 'border-indigo-500/40 bg-indigo-500/15 text-indigo-200';
    case 'RETURNED':
      return 'border-rose-500/40 bg-rose-500/15 text-rose-200';
    default:
      return 'border-amber-500/40 bg-amber-500/15 text-amber-200';
  }
}

export default function PlanningApprovalsPage() {
  const [activeTab, setActiveTab] = useState<'BULK_DESK' | 'SAMPLE_QUOTA'>('BULK_DESK');
  const [queue, setQueue] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<any>(null);

  // Modals / Drawers
  const [signedModalJob, setSignedModalJob] = useState<any>(null);
  const [signedForm, setSignedForm] = useState({
    fabricSheet: true,
    tna: true,
    referenceNo: '',
    receivedBy: 'Shahidul Alam (Head of Planning)',
    remarks: 'Physical signed Fabric Order Sheet & T&A copy received at Central Planning desk',
  });

  const [returnModalJob, setReturnModalJob] = useState<any>(null);
  const [returnForm, setReturnForm] = useState({
    target: 'BOTH',
    reason: '',
  });

  const [releaseModalJob, setReleaseModalJob] = useState<any>(null);
  const [releaseDraft, setReleaseDraft] = useState<any>(null);
  const [releaseRows, setReleaseRows] = useState<any[]>([]);
  const [overrideMismatch, setOverrideMismatch] = useState(false);
  const [releaseRemarks, setReleaseRemarks] = useState('');

  const [historyJob, setHistoryJob] = useState<any>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);

  // Sample TNA & Quota state
  const [sampleOrders, setSampleOrders] = useState<any[]>([]);
  const [quotaData, setQuotaData] = useState<any>(null);
  const [editingSampleForm, setEditingSampleForm] = useState<any>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadAll() {
    setError('');
    try {
      const [qData, smpData, qtData] = await Promise.all([
        api('/planning/approvals/queue'),
        api('/planning/approvals/sample-orders'),
        api('/planning/approvals/quota'),
      ]);
      setQueue(Array.isArray(qData) ? qData : []);
      setSampleOrders(Array.isArray(smpData) ? smpData : []);
      setQuotaData(qtData);
      if (!selectedJob && Array.isArray(qData) && qData.length > 0) {
        setSelectedJob(qData[0]);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load Central Planning Approval Desk');
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (search.trim()) {
        const hay = `${item.jobNo} ${item.styleNo} ${item.buyer} ${item.merchandiser} ${item.fabricSheetNo}`.toLowerCase();
        if (!hay.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [queue, statusFilter, search]);

  const kpiCounts = useMemo(() => {
    return {
      total: queue.length,
      pending: queue.filter((x) => x.status === 'PENDING_REVIEW').length,
      signed: queue.filter((x) => x.status === 'SIGNED_COPY_RECORDED').length,
      approved: queue.filter((x) => x.status === 'APPROVED').length,
      returned: queue.filter((x) => x.status === 'RETURNED').length,
      released: queue.filter((x) => x.status === 'RELEASED_TO_KNITTING').length,
    };
  }, [queue]);

  function openSignedCopyModal(job: any) {
    setSignedModalJob(job);
    setSignedForm({
      fabricSheet: job.signedCopy?.fabricSheet ?? true,
      tna: job.signedCopy?.tna ?? true,
      referenceNo: job.signedCopy?.referenceNo || `PHY-SIG-${job.jobNo}`,
      receivedBy: job.signedCopy?.receivedBy || 'Shahidul Alam (Head of Planning)',
      remarks: job.signedCopy?.remarks || 'Physical signed Fabric Order Sheet & T&A copy verified',
    });
  }

  async function submitSignedCopy() {
    if (!signedModalJob) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api(`/planning/approvals/jobs/${signedModalJob.styleId}/signed-copy`, {
        method: 'POST',
        body: JSON.stringify(signedForm),
      });
      setMessage(`Physical signed copy recorded for Job ${signedModalJob.jobNo} (${signedModalJob.styleNo}).`);
      setSignedModalJob(null);
      await loadAll();
    } catch (e: any) {
      setError(e.message || 'Failed to record signed copy');
    } finally {
      setSaving(false);
    }
  }

  async function submitReturn() {
    if (!returnModalJob) return;
    if (!returnForm.reason.trim()) {
      setError('Please enter a return reason before returning to Merchandiser.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api(`/planning/approvals/jobs/${returnModalJob.styleId}/return`, {
        method: 'POST',
        body: JSON.stringify(returnForm),
      });
      setMessage(`Job ${returnModalJob.jobNo} returned to Merchandiser (${returnModalJob.merchandiser}) with reason.`);
      setReturnModalJob(null);
      setReturnForm({ target: 'BOTH', reason: '' });
      await loadAll();
    } catch (e: any) {
      setError(e.message || 'Failed to return job');
    } finally {
      setSaving(false);
    }
  }

  async function openReleaseModal(job: any) {
    setReleaseModalJob(job);
    setOverrideMismatch(false);
    setReleaseRemarks(`Approved & released colour × part requirement for Job ${job.jobNo}`);
    setError('');
    try {
      const draft = await api(`/planning/approvals/jobs/${job.styleId}/release-draft`);
      setReleaseDraft(draft);
      setReleaseRows(Array.isArray(draft?.rows) ? draft.rows : []);
    } catch (e: any) {
      setError(e.message || 'Failed to load release draft');
    }
  }

  function updateReleaseRow(idx: number, field: string, value: any) {
    setReleaseRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const next = { ...r, [field]: value };
        if (field === 'finishKg' || field === 'processLossPct') {
          const fin = Number(field === 'finishKg' ? value : next.finishKg || 0);
          const loss = Number(field === 'processLossPct' ? value : next.processLossPct || 8);
          next.greyKg = Math.round(fin * (1 + loss / 100));
        }
        return next;
      })
    );
  }

  function addReleaseRow() {
    setReleaseRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        colour: 'New Colour',
        part: 'Body / Rib',
        fabricType: '100% Cotton Single Jersey',
        composition: '100% Combed Cotton',
        yarnCount: '30/1 Combed',
        stitchLength: '2.75 mm',
        gsm: 180,
        dia: '74" Open',
        processLossPct: 8,
        finishKg: 0,
        greyKg: 0,
      },
    ]);
  }

  function removeReleaseRow(idx: number) {
    setReleaseRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submitRelease(approveOnly = false) {
    if (!releaseModalJob) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api(`/planning/approvals/jobs/${releaseModalJob.styleId}/release`, {
        method: 'POST',
        body: JSON.stringify({
          approveOnly,
          expectedFinishKg: releaseDraft?.fabricSheetTotalFinishKg || releaseModalJob.totalFinishKg,
          overrideMismatch,
          remarks: releaseRemarks,
          rows: releaseRows,
        }),
      });
      setMessage(
        approveOnly
          ? `Job ${releaseModalJob.jobNo} marked as Planning Approved.`
          : `Job ${releaseModalJob.jobNo} (${releaseModalJob.styleNo}) released to Knitting, Dyeing & Fabric Stores!`
      );
      setReleaseModalJob(null);
      await loadAll();
    } catch (e: any) {
      setError(e.message || 'Release validation failed');
    } finally {
      setSaving(false);
    }
  }

  async function openHistoryDrawer(job: any) {
    setHistoryJob(job);
    try {
      const h = await api(`/planning/approvals/jobs/${job.styleId}/history`);
      setHistoryList(Array.isArray(h) ? h : []);
    } catch {
      setHistoryList([]);
    }
  }

  async function saveSampleOrderTna() {
    if (!editingSampleForm) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api(`/planning/approvals/sample-orders/${editingSampleForm.id}/tna`, {
        method: 'POST',
        body: JSON.stringify(editingSampleForm.tna),
      });
      setMessage(`Sample TNA & Dispatch dates updated for ${editingSampleForm.formNo} (Job ${editingSampleForm.jobNo}).`);
      setEditingSampleForm(null);
      await loadAll();
    } catch (e: any) {
      setError(e.message || 'Failed to save Sample TNA');
    } finally {
      setSaving(false);
    }
  }

  const draftSumFinishKg = releaseRows.reduce((s, r) => s + Number(r.finishKg || 0), 0);
  const draftSumGreyKg = releaseRows.reduce((s, r) => s + Number(r.greyKg || 0), 0);
  const expectedFinishKg = Number(releaseDraft?.fabricSheetTotalFinishKg || releaseModalJob?.totalFinishKg || 0);
  const finishDiffKg = Math.round((draftSumFinishKg - expectedFinishKg) * 10) / 10;

  return (
    <Shell
      title="Central Planning Approval Desk & Knitting Release"
      eyebrow="Central Planning • Signed Copy Verification & Colour × Part Release"
    >
      {/* Top Flow Navigation */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold uppercase tracking-wider text-slate-400">Central Planning Flow:</span>
          <Link href="/modules/ta" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-cyan-400">
            1. Time & Action (T&A)
          </Link>
          <span className="text-slate-600">→</span>
          <span className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-semibold text-cyan-200">
            2. Approval Desk & Release
          </span>
          <span className="text-slate-600">→</span>
          <Link href="/modules/capacity" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-cyan-400">
            3. Capacity & Holiday Calendar
          </Link>
          <span className="text-slate-600">→</span>
          <Link href="/modules/sewing-planning" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-cyan-400">
            4. Sewing Line Gantt
          </Link>
          <span className="text-slate-600">→</span>
          <Link href="/modules/subcontract" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-cyan-400">
            5. Subcontract Follow-up
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('BULK_DESK')}
            className={`rounded-xl px-3.5 py-1.5 font-semibold transition ${
              activeTab === 'BULK_DESK'
                ? 'bg-cyan-500 text-slate-950'
                : 'border border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
            }`}
          >
            Bulk Approval & Knitting Release ({queue.length})
          </button>
          <button
            onClick={() => setActiveTab('SAMPLE_QUOTA')}
            className={`rounded-xl px-3.5 py-1.5 font-semibold transition ${
              activeTab === 'SAMPLE_QUOTA'
                ? 'bg-cyan-500 text-slate-950'
                : 'border border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
            }`}
          >
            Sample Order TNA & Buyer Quota ({sampleOrders.length})
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">{message}</div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>
      )}

      {activeTab === 'BULK_DESK' && (
        <>
          {/* KPI Summary Strip */}
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-6">
            {[
              { key: 'ALL', label: 'All Submissions', count: kpiCounts.total, color: 'text-white' },
              { key: 'PENDING_REVIEW', label: 'Pending Signed Copy', count: kpiCounts.pending, color: 'text-amber-300' },
              { key: 'SIGNED_COPY_RECORDED', label: 'Signed Copy Verified', count: kpiCounts.signed, color: 'text-indigo-300' },
              { key: 'APPROVED', label: 'Planning Approved', count: kpiCounts.approved, color: 'text-cyan-300' },
              { key: 'RETURNED', label: 'Returned to Merch', count: kpiCounts.returned, color: 'text-rose-300' },
              { key: 'RELEASED_TO_KNITTING', label: 'Released to Knitting', count: kpiCounts.released, color: 'text-emerald-300' },
            ].map((card) => (
              <button
                key={card.key}
                onClick={() => setStatusFilter(card.key)}
                className={`rounded-2xl border p-3 text-left transition ${
                  statusFilter === card.key
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="text-[11px] text-slate-400">{card.label}</div>
                <div className={`mt-1 text-xl font-bold ${card.color}`}>{card.count}</div>
              </button>
            ))}
          </div>

          {/* Search & Queue Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-white">Fabric Order Sheet & T&A Approval Queue</h2>
                <p className="text-xs text-slate-400">
                  Gate Rule: Record physical signed copy first → Approve or Return to Merchandiser → Edit & Release Colour × Part Finish/Grey Kg to Knitting.
                </p>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Job #, Style, Buyer, Merchandiser..."
                className="w-72 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2.5 pr-3">Job / Style</th>
                    <th className="py-2.5 px-2">Buyer / Merchandiser</th>
                    <th className="py-2.5 px-2">Order Qty / CCD</th>
                    <th className="py-2.5 px-2">Fabric Sheet / Req Kg</th>
                    <th className="py-2.5 px-2">Signed Copy Gate</th>
                    <th className="py-2.5 px-2">Desk Status</th>
                    <th className="py-2.5 pl-3 text-right">Approval Desk Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredQueue.map((item) => (
                    <tr key={item.styleId} className="hover:bg-slate-950/50">
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-cyan-300">
                          Job #{item.jobNo} · {item.styleNo}
                        </div>
                        <div className="text-[11px] text-slate-400">{item.itemDescription}</div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-medium text-white">{item.buyer}</div>
                        <div className="text-[11px] text-slate-400">Merch: {item.merchandiser}</div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-mono text-white">{fmt(item.orderQty)} pcs</div>
                        <div className="text-[11px] text-cyan-300">CCD: {item.ccd}</div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-mono text-slate-200">
                          {item.fabricSheetNo} (Rev {item.fabricSheetRevision})
                        </div>
                        <div className="text-[11px] text-emerald-300">
                          Finish: {fmt(item.totalFinishKg)} Kg · Greige: {fmt(item.totalGreyKg)} Kg
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col gap-0.5 text-[11px]">
                          <span className={item.signedCopy?.fabricSheet ? 'text-emerald-300' : 'text-amber-300'}>
                            {item.signedCopy?.fabricSheet ? '✓ Fabric Sheet Signed' : '○ Fabric Sheet Unsigned'}
                          </span>
                          <span className={item.signedCopy?.tna ? 'text-emerald-300' : 'text-amber-300'}>
                            {item.signedCopy?.tna ? '✓ T&A Copy Signed' : '○ T&A Copy Unsigned'}
                          </span>
                          {item.signedCopy?.referenceNo && (
                            <span className="font-mono text-[10px] text-slate-400">Ref: {item.signedCopy.referenceNo}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${statusBadge(item.status)}`}>
                          {item.status.replace(/_/g, ' ')}
                        </span>
                        {item.returnReason && (
                          <div className="mt-1 max-w-[200px] text-[10px] text-rose-300">Reason: {item.returnReason}</div>
                        )}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            onClick={() => openSignedCopyModal(item)}
                            className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-medium text-indigo-200 hover:bg-indigo-500/20"
                          >
                            1. Signed Copy
                          </button>
                          <button
                            onClick={() => {
                              setReturnModalJob(item);
                              setReturnForm({ target: 'BOTH', reason: item.returnReason || '' });
                            }}
                            className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-200 hover:bg-rose-500/20"
                          >
                            Return
                          </button>
                          <button
                            onClick={() => openReleaseModal(item)}
                            className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400"
                          >
                            Edit & Release to Knitting
                          </button>
                          <button
                            onClick={() => openHistoryDrawer(item)}
                            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-500"
                          >
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'SAMPLE_QUOTA' && (
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Buyer Monthly Quota Board */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 lg:col-span-5">
            <h3 className="text-sm font-semibold text-white">Monthly Buyer Sample & Bulk Line Quota ({quotaData?.month || '2026-10'})</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Tracks Order Development (OD) samples, Salesman Samples (SMS), and Bulk Sewing Line allocation against monthly buyer quotas.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2">Buyer</th>
                    <th className="py-2">OD Sample Quota</th>
                    <th className="py-2">SMS Quota</th>
                    <th className="py-2">Bulk Lines</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {(quotaData?.buyerQuota || []).map((bq: any) => {
                    const odPct = bq.odQuota > 0 ? Math.round((bq.odUsed / bq.odQuota) * 100) : 0;
                    const smsPct = bq.smsQuota > 0 ? Math.round((bq.smsUsed / bq.smsQuota) * 100) : 0;
                    return (
                      <tr key={bq.buyer}>
                        <td className="py-2.5 font-semibold text-white">{bq.buyer}</td>
                        <td className="py-2.5">
                          <span className="font-mono text-cyan-200">
                            {bq.odUsed}/{bq.odQuota}
                          </span>{' '}
                          <span className="text-[10px] text-slate-400">({odPct}%)</span>
                        </td>
                        <td className="py-2.5">
                          <span className="font-mono text-emerald-200">
                            {bq.smsUsed}/{bq.smsQuota}
                          </span>{' '}
                          <span className="text-[10px] text-slate-400">({smsPct}%)</span>
                        </td>
                        <td className="py-2.5 font-mono text-slate-200">
                          {bq.bulkLinesUsed}/{bq.bulkLineQuota} Lines
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sample Order Sheet TNA Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 lg:col-span-7">
            <h3 className="text-sm font-semibold text-white">Sample Fabric & Garment Order Sheet — Planning TNA & Dispatch</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Central Planning fills Yarn, Knitting, Dyeing, Sewing and Target Dispatch dates on Merchandising Sample Order Sheets.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2">Form / Job</th>
                    <th className="py-2">Sample Type / Qty</th>
                    <th className="py-2">Knit / Dye / Sew</th>
                    <th className="py-2">Target / Actual Dispatch</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {sampleOrders.map((so) => (
                    <tr key={so.id}>
                      <td className="py-2.5">
                        <div className="font-semibold text-cyan-300">{so.formNo}</div>
                        <div className="text-[11px] text-slate-400">
                          Job #{so.jobNo} · {so.buyer}
                        </div>
                      </td>
                      <td className="py-2.5">
                        <div className="text-white">{so.sampleType}</div>
                        <div className="text-[11px] text-slate-400">{so.sampleQty} pcs</div>
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-slate-300">
                        <div>Knit: {so.tna?.knittingDate || '—'}</div>
                        <div>Dye: {so.tna?.dyeingDate || '—'}</div>
                        <div>Sew: {so.tna?.sewingDate || '—'}</div>
                      </td>
                      <td className="py-2.5 font-mono text-[11px]">
                        <div className="text-cyan-200">Plan: {so.tna?.dispatchDate || '—'}</div>
                        <div className="text-emerald-300">Act: {so.tna?.actualDispatchDate || 'Pending'}</div>
                        {so.tna?.awbNo && <div className="text-[10px] text-slate-400">AWB: {so.tna.awbNo}</div>}
                      </td>
                      <td className="py-2.5">
                        <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200">
                          {so.tna?.status || 'IN_PROGRESS'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => setEditingSampleForm(JSON.parse(JSON.stringify(so)))}
                          className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/20"
                        >
                          Edit Sample TNA
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Record Physical Signed Copy */}
      {signedModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-indigo-500/40 bg-slate-900 p-5 text-xs">
            <h3 className="text-sm font-semibold text-white">
              Record Physical Signed Copy — Job #{signedModalJob.jobNo} ({signedModalJob.styleNo})
            </h3>
            <p className="mt-1 text-slate-400">
              Confirm physical hand-signed copies of the Fabric Order Sheet and T&A before releasing to Knitting.
            </p>
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-slate-200">
                <input
                  type="checkbox"
                  checked={signedForm.fabricSheet}
                  onChange={(e) => setSignedForm({ ...signedForm, fabricSheet: e.target.checked })}
                />
                Physical Signed Fabric Order Sheet Received ({signedModalJob.fabricSheetNo})
              </label>
              <label className="flex items-center gap-2 text-slate-200">
                <input
                  type="checkbox"
                  checked={signedForm.tna}
                  onChange={(e) => setSignedForm({ ...signedForm, tna: e.target.checked })}
                />
                Physical Signed Bulk T&A Sheet Received
              </label>
              <div>
                <label className="block text-slate-400">Physical Register / File Reference No.</label>
                <input
                  type="text"
                  value={signedForm.referenceNo}
                  onChange={(e) => setSignedForm({ ...signedForm, referenceNo: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Verified By</label>
                <input
                  type="text"
                  value={signedForm.receivedBy}
                  onChange={(e) => setSignedForm({ ...signedForm, receivedBy: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400">Remarks</label>
                <input
                  type="text"
                  value={signedForm.remarks}
                  onChange={(e) => setSignedForm({ ...signedForm, remarks: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setSignedModalJob(null)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={submitSignedCopy}
                disabled={saving}
                className="rounded-lg bg-indigo-500 px-4 py-1.5 font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Signed Copy Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Return to Merchandiser */}
      {returnModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-slate-900 p-5 text-xs">
            <h3 className="text-sm font-semibold text-white">
              Return to Merchandiser — Job #{returnModalJob.jobNo} ({returnModalJob.styleNo})
            </h3>
            <p className="mt-1 text-slate-400">
              Returning re-opens the Merchandiser&apos;s task with your discrepancy note and blocks Knitting release until corrected.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-slate-400">Document to Return</label>
                <select
                  value={returnForm.target}
                  onChange={(e) => setReturnForm({ ...returnForm, target: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
                >
                  <option value="BOTH">Both Fabric Order Sheet & T&A</option>
                  <option value="FABRIC_SHEET">Fabric Order Sheet Only</option>
                  <option value="TNA">T&A Plan Only</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400">Mandatory Return / Discrepancy Reason</label>
                <textarea
                  rows={3}
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                  placeholder="e.g., Collar rib consumption & wastage % mismatch with CAD marker..."
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-white"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setReturnModalJob(null)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={submitReturn}
                disabled={saving}
                className="rounded-lg bg-rose-500 px-4 py-1.5 font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
              >
                {saving ? 'Returning...' : 'Return to Merchandiser'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Approve & Release to Knitting (Colour × Part Breakdown) */}
      {releaseModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-emerald-500/40 bg-slate-900 p-5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Approve & Release to Knitting — Job #{releaseModalJob.jobNo} · Style {releaseModalJob.styleNo} ({releaseModalJob.buyer})
                </h3>
                <p className="text-slate-400">
                  Review or edit Colour × Part Finish Kg, Process Loss %, and Greige Kg before creating Knitting & Dyeing execution rows.
                </p>
              </div>
              <button
                onClick={addReleaseRow}
                className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-semibold text-cyan-200 hover:bg-cyan-500/20"
              >
                + Add Colour × Part Row
              </button>
            </div>

            <div className="my-3 grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 md:grid-cols-4">
              <div>
                <div className="text-slate-400">Fabric Sheet Target Finish Kg</div>
                <div className="text-sm font-bold text-white">{fmt(expectedFinishKg)} Kg</div>
              </div>
              <div>
                <div className="text-slate-400">Release Rows Total Finish Kg</div>
                <div className={`text-sm font-bold ${Math.abs(finishDiffKg) <= 1 ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {fmt(draftSumFinishKg)} Kg ({finishDiffKg >= 0 ? `+${finishDiffKg}` : finishDiffKg} Kg)
                </div>
              </div>
              <div>
                <div className="text-slate-400">Total Greige Knitting Requirement</div>
                <div className="text-sm font-bold text-cyan-300">{fmt(draftSumGreyKg)} Kg</div>
              </div>
              <div className="flex items-center">
                {Math.abs(finishDiffKg) > 1 ? (
                  <label className="flex items-center gap-2 text-amber-300">
                    <input
                      type="checkbox"
                      checked={overrideMismatch}
                      onChange={(e) => setOverrideMismatch(e.target.checked)}
                    />
                    Override ±1.0 Kg tolerance check
                  </label>
                ) : (
                  <span className="text-emerald-300">✓ Matches Fabric Sheet within ±1.0 Kg</span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2 pr-2">Colour</th>
                    <th className="py-2 px-1">Garment Part</th>
                    <th className="py-2 px-1">Fabric Type & Composition</th>
                    <th className="py-2 px-1">Yarn Count / SL</th>
                    <th className="py-2 px-1">GSM / Dia</th>
                    <th className="py-2 px-1">Loss %</th>
                    <th className="py-2 px-1">Finish Kg</th>
                    <th className="py-2 px-1">Greige Kg</th>
                    <th className="py-2 pl-1"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {releaseRows.map((r, idx) => (
                    <tr key={r.id || idx}>
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={r.colour || ''}
                          onChange={(e) => updateReleaseRow(idx, 'colour', e.target.value)}
                          className="w-28 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="text"
                          value={r.part || ''}
                          onChange={(e) => updateReleaseRow(idx, 'part', e.target.value)}
                          className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="text"
                          value={r.fabricType || ''}
                          onChange={(e) => updateReleaseRow(idx, 'fabricType', e.target.value)}
                          className="w-40 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="text"
                          value={r.yarnCount || ''}
                          onChange={(e) => updateReleaseRow(idx, 'yarnCount', e.target.value)}
                          className="w-28 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <div className="flex gap-1">
                          <input
                            type="number"
                            value={r.gsm || 180}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => updateReleaseRow(idx, 'gsm', Number(e.target.value))}
                            className="w-14 rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-white"
                          />
                          <input
                            type="text"
                            value={r.dia || ''}
                            onChange={(e) => updateReleaseRow(idx, 'dia', e.target.value)}
                            className="w-20 rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-white"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={r.processLossPct ?? 8}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) => updateReleaseRow(idx, 'processLossPct', Number(e.target.value))}
                          className="w-14 rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-white"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={r.finishKg ?? 0}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) => updateReleaseRow(idx, 'finishKg', Number(e.target.value))}
                          className="w-20 rounded border border-emerald-500/50 bg-slate-950 px-2 py-1 font-mono text-emerald-200"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          value={r.greyKg ?? 0}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) => updateReleaseRow(idx, 'greyKg', Number(e.target.value))}
                          className="w-20 rounded border border-cyan-500/50 bg-slate-950 px-2 py-1 font-mono text-cyan-200"
                        />
                      </td>
                      <td className="py-2 pl-1">
                        <button
                          onClick={() => removeReleaseRow(idx)}
                          className="rounded border border-rose-500/30 px-2 py-1 text-rose-300 hover:bg-rose-500/10"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3">
              <label className="block text-slate-400">Release Remarks / Knitting Instruction</label>
              <input
                type="text"
                value={releaseRemarks}
                onChange={(e) => setReleaseRemarks(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
              />
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setReleaseModalJob(null)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => submitRelease(true)}
                disabled={saving}
                className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-4 py-1.5 font-semibold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50"
              >
                Approve Only (Hold Release)
              </button>
              <button
                onClick={() => submitRelease(false)}
                disabled={saving}
                className="rounded-lg bg-emerald-500 px-4 py-1.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {saving ? 'Releasing...' : 'Approve & Release to Knitting & Dyeing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Edit Sample Order TNA */}
      {editingSampleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-slate-900 p-5 text-xs">
            <h3 className="text-sm font-semibold text-white">
              Sample Order Sheet TNA — {editingSampleForm.formNo} (Job #{editingSampleForm.jobNo})
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                { key: 'yarnDate', label: 'Sample Yarn Ready Date' },
                { key: 'knittingDate', label: 'Sample Knitting Date' },
                { key: 'dyeingDate', label: 'Sample Dyeing Date' },
                { key: 'printingDate', label: 'Sample Print/Emb Date' },
                { key: 'sewingDate', label: 'Sample Making / Sewing Date' },
                { key: 'dispatchDate', label: 'Planned Dispatch Date' },
                { key: 'actualDispatchDate', label: 'Actual Dispatch Date' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-slate-400">{f.label}</label>
                  <input
                    type="date"
                    value={editingSampleForm.tna?.[f.key] || ''}
                    onChange={(e) =>
                      setEditingSampleForm({
                        ...editingSampleForm,
                        tna: { ...(editingSampleForm.tna || {}), [f.key]: e.target.value },
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                  />
                </div>
              ))}
              <div>
                <label className="block text-slate-400">Courier AWB No.</label>
                <input
                  type="text"
                  value={editingSampleForm.tna?.awbNo || ''}
                  onChange={(e) =>
                    setEditingSampleForm({
                      ...editingSampleForm,
                      tna: { ...(editingSampleForm.tna || {}), awbNo: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingSampleForm(null)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={saveSampleOrderTna}
                disabled={saving}
                className="rounded-lg bg-cyan-500 px-4 py-1.5 font-semibold text-slate-950 hover:bg-cyan-400"
              >
                Save Sample TNA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Approval Audit History Drawer */}
      {historyJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white">
                Approval & Release Audit Trail — Job #{historyJob.jobNo} ({historyJob.styleNo})
              </h3>
              <button onClick={() => setHistoryJob(null)} className="text-slate-400 hover:text-white">
                Close
              </button>
            </div>
            <div className="mt-3 space-y-2.5 max-h-80 overflow-y-auto">
              {historyList.map((h, i) => (
                <div key={h.id || i} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="flex justify-between font-semibold text-cyan-300">
                    <span>{h.action}</span>
                    <span className="font-mono text-[10px] text-slate-400">{String(h.timestamp || '').slice(0, 16).replace('T', ' ')}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">Actor: {h.actor}</div>
                  <div className="mt-1 text-slate-200">{h.remarks}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
