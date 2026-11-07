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
  CheckCircle2,
  Clock,
  FileCheck2,
  RotateCcw,
  Send,
  Search,
  Filter,
  FileText,
  AlertCircle,
  TrendingUp,
  Boxes,
  Eye,
  Plus,
  X,
  Sparkles,
} from 'lucide-react';

import { DataGrid, RecordPanel } from '../../../components/ui';
import { fmtDate, fmtNum } from '../../../lib/format';

function fmt(n: any) {
  return fmtNum(Number(n || 0));
}

function statusBadge(status: string) {
  switch (status) {
    case 'RELEASED_TO_KNITTING':
      return {
        bg: '#ECFDF5',
        border: '#A7F3D0',
        text: '#065F46',
        label: 'Released to Knitting',
      };
    case 'APPROVED':
      return {
        bg: '#EFF6FF',
        border: '#BFDBFE',
        text: '#1E40AF',
        label: 'Planning Approved',
      };
    case 'SIGNED_COPY_RECORDED':
      return {
        bg: '#EEF2FF',
        border: '#C7D2FE',
        text: '#3730A3',
        label: 'Signed Copy Verified',
      };
    case 'RETURNED':
      return {
        bg: '#FEF2F2',
        border: '#FECACA',
        text: '#991B1B',
        label: 'Returned to Merch',
      };
    default:
      return {
        bg: '#FFFBEB',
        border: '#FDE68A',
        text: '#92400E',
        label: 'Pending Review',
      };
  }
}

export default function PlanningApprovalsPage() {
  const [activeTab, setActiveTab] = useState<'BULK_DESK' | 'SAMPLE_QUOTA'>('BULK_DESK');
  const [queue, setQueue] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [activeChartBar, setActiveChartBar] = useState<number | null>(null);

  // Modals / Drawers
  const [signedModalJob, setSignedModalJob] = useState<any>(null);
  const [signedForm, setSignedForm] = useState({
    fabricSheet: true,
    tna: true,
    referenceNo: '',
    receivedBy: 'Shahidul Alam (Head of Planning)',
    remarks: 'Physical signed Fabric Order Sheet & T&A copy received at Central Planning desk',
  });

  const [reviewJob, setReviewJob] = useState<any>(null);
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
    const totalFinishKg = queue.reduce((s, x) => s + Number(x.totalFinishKg || 0), 0);
    return {
      total: queue.length,
      pending: queue.filter((x) => x.status === 'PENDING_REVIEW').length,
      signed: queue.filter((x) => x.status === 'SIGNED_COPY_RECORDED').length,
      approved: queue.filter((x) => x.status === 'APPROVED').length,
      returned: queue.filter((x) => x.status === 'RETURNED').length,
      released: queue.filter((x) => x.status === 'RELEASED_TO_KNITTING').length,
      totalFinishKg,
    };
  }, [queue]);

  // Chart data for status distribution
  const chartData = useMemo(() => {
    return [
      {
        name: 'Pending Review',
        count: kpiCounts.pending,
        key: 'PENDING_REVIEW',
        color: '#F59E0B',
        fill: '#FDE68A',
        finishKg: queue.filter((x) => x.status === 'PENDING_REVIEW').reduce((s, x) => s + Number(x.totalFinishKg || 0), 0),
      },
      {
        name: 'Signed Verified',
        count: kpiCounts.signed,
        key: 'SIGNED_COPY_RECORDED',
        color: '#6366F1',
        fill: '#C7D2FE',
        finishKg: queue.filter((x) => x.status === 'SIGNED_COPY_RECORDED').reduce((s, x) => s + Number(x.totalFinishKg || 0), 0),
      },
      {
        name: 'Approved',
        count: kpiCounts.approved,
        key: 'APPROVED',
        color: '#0284C7',
        fill: '#BAE6FD',
        finishKg: queue.filter((x) => x.status === 'APPROVED').reduce((s, x) => s + Number(x.totalFinishKg || 0), 0),
      },
      {
        name: 'Returned',
        count: kpiCounts.returned,
        key: 'RETURNED',
        color: '#EF4444',
        fill: '#FECACA',
        finishKg: queue.filter((x) => x.status === 'RETURNED').reduce((s, x) => s + Number(x.totalFinishKg || 0), 0),
      },
      {
        name: 'Released',
        count: kpiCounts.released,
        key: 'RELEASED_TO_KNITTING',
        color: '#10B981',
        fill: '#A7F3D0',
        finishKg: queue.filter((x) => x.status === 'RELEASED_TO_KNITTING').reduce((s, x) => s + Number(x.totalFinishKg || 0), 0),
      },
    ];
  }, [kpiCounts, queue]);

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
        part: 'Body',
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

  // Custom Interactive Tooltip for Recharts
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const pct = kpiCounts.total > 0 ? Math.round((d.count / kpiCounts.total) * 100) : 0;
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
          <div style={{ fontWeight: 700, color: d.color, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color }}></span>
            {d.name}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span style={{ color: '#94A3B8' }}>Submissions:</span>
            <span style={{ fontWeight: 700 }}>{d.count} Jobs ({pct}%)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span style={{ color: '#94A3B8' }}>Finish Fabric:</span>
            <span style={{ fontWeight: 700, color: '#38BDF8' }}>{fmt(d.finishKg)} Kg</span>
          </div>
          <div style={{ marginTop: '6px', paddingTop: '4px', borderTop: '1px solid #1E293B', fontSize: '10.5px', color: '#CBD5E1' }}>
            Click card below to filter queue
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Shell
      title="1. Central Planning Approval & Release Desk"
      eyebrow="Central Planning • Signed Copy Verification & Colour × Part Release"
    >
      <div className="erp-page-entrance" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Top Action & View Switcher Bar */}
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
              <FileCheck2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F274E', letterSpacing: '-0.01em' }}>
                Central Planning Approval &amp; Release Control
              </div>
</div>
          </div>

          {/* Tab Pill Switcher */}
          <div style={{ display: 'flex', gap: '6px', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
            <button
              onClick={() => setActiveTab('BULK_DESK')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: activeTab === 'BULK_DESK' ? 700 : 550,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'BULK_DESK' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'BULK_DESK' ? '#0284C7' : '#64748B',
                boxShadow: activeTab === 'BULK_DESK' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Boxes size={14} />
              Bulk Approval &amp; Release ({queue.length})
            </button>
            <button
              onClick={() => setActiveTab('SAMPLE_QUOTA')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: activeTab === 'SAMPLE_QUOTA' ? 700 : 550,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'SAMPLE_QUOTA' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'SAMPLE_QUOTA' ? '#0284C7' : '#64748B',
                boxShadow: activeTab === 'SAMPLE_QUOTA' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <TrendingUp size={14} />
              Sample Order TNA &amp; Quota ({sampleOrders.length})
            </button>
          </div>
        </div>

        {/* Notification Banners */}
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
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {activeTab === 'BULK_DESK' && (
          <>
            {/* Standard Trims & Accessories KPI Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '10px',
              }}
            >
              {/* Card 1: All Submissions */}
              <div
                onClick={() => setStatusFilter('ALL')}
                style={{
                  background: statusFilter === 'ALL' ? '#F0F9FF' : '#FFFFFF',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: statusFilter === 'ALL' ? '2px solid #0284C7' : '1px solid #E2E8F0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                }}
                title="Click to view all submissions in queue"
              >
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, textTransform: 'uppercase' }}>
                  All Submissions
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F274E', margin: '2px 0' }}>
                  {kpiCounts.total} Jobs
                </div>
                <div style={{ fontSize: '11.5px', color: '#0284C7', fontWeight: 600 }}>
                  {fmt(kpiCounts.totalFinishKg)} Kg Finish Fabric
                </div>
              </div>

              {/* Card 2: Pending Signed Copy */}
              <div
                onClick={() => setStatusFilter((p) => (p === 'PENDING_REVIEW' ? 'ALL' : 'PENDING_REVIEW'))}
                style={{
                  background: statusFilter === 'PENDING_REVIEW' ? '#FFFBEB' : '#FFFFFF',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: statusFilter === 'PENDING_REVIEW' ? '2px solid #D97706' : '1px solid #E2E8F0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                }}
                title="Click to filter jobs waiting for signed physical documents"
              >
                <div style={{ fontSize: '11px', color: '#D97706', fontWeight: 650, textTransform: 'uppercase' }}>
                  Pending Signed Copy
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#B45309', margin: '2px 0' }}>
                  {kpiCounts.pending} Jobs
                </div>
                <div style={{ fontSize: '11.5px', color: '#B45309', fontWeight: 600 }}>
                  Awaiting register entry
                </div>
              </div>

              {/* Card 3: Signed Copy Verified */}
              <div
                onClick={() => setStatusFilter((p) => (p === 'SIGNED_COPY_RECORDED' ? 'ALL' : 'SIGNED_COPY_RECORDED'))}
                style={{
                  background: statusFilter === 'SIGNED_COPY_RECORDED' ? '#EEF2FF' : '#FFFFFF',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: statusFilter === 'SIGNED_COPY_RECORDED' ? '2px solid #6366F1' : '1px solid #E2E8F0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                }}
                title="Click to filter jobs with signed physical copies recorded"
              >
                <div style={{ fontSize: '11px', color: '#6366F1', fontWeight: 650, textTransform: 'uppercase' }}>
                  Signed Copy Verified
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#4338CA', margin: '2px 0' }}>
                  {kpiCounts.signed} Jobs
                </div>
                <div style={{ fontSize: '11.5px', color: '#4338CA', fontWeight: 600 }}>
                  Ready for planning review
                </div>
              </div>

              {/* Card 4: Planning Approved */}
              <div
                onClick={() => setStatusFilter((p) => (p === 'APPROVED' ? 'ALL' : 'APPROVED'))}
                style={{
                  background: statusFilter === 'APPROVED' ? '#F0F9FF' : '#FFFFFF',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: statusFilter === 'APPROVED' ? '2px solid #0284C7' : '1px solid #E2E8F0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                }}
                title="Click to filter planning approved jobs"
              >
                <div style={{ fontSize: '11px', color: '#0284C7', fontWeight: 650, textTransform: 'uppercase' }}>
                  Planning Approved
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#0369A1', margin: '2px 0' }}>
                  {kpiCounts.approved} Jobs
                </div>
                <div style={{ fontSize: '11.5px', color: '#0284C7', fontWeight: 600 }}>
                  Ready for Colour x Part release
                </div>
              </div>

              {/* Card 5: Returned to Merch */}
              <div
                onClick={() => setStatusFilter((p) => (p === 'RETURNED' ? 'ALL' : 'RETURNED'))}
                style={{
                  background: statusFilter === 'RETURNED' ? '#FEF2F2' : '#FFFFFF',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: statusFilter === 'RETURNED' ? '2px solid #DC2626' : '1px solid #FECACA',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                }}
                title="Click to filter jobs returned for discrepancy resolution"
              >
                <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700, textTransform: 'uppercase' }}>
                  Returned to Merch
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#DC2626', margin: '2px 0' }}>
                  {kpiCounts.returned} Jobs
                </div>
                <div style={{ fontSize: '11.5px', color: '#991B1B', fontWeight: 600 }}>
                  Discrepancy rework
                </div>
              </div>

              {/* Card 6: Released to Knitting */}
              <div
                onClick={() => setStatusFilter((p) => (p === 'RELEASED_TO_KNITTING' ? 'ALL' : 'RELEASED_TO_KNITTING'))}
                style={{
                  background: statusFilter === 'RELEASED_TO_KNITTING' ? '#ECFDF5' : '#FFFFFF',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: statusFilter === 'RELEASED_TO_KNITTING' ? '2px solid #059669' : '1px solid #E2E8F0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                }}
                title="Click to filter jobs released to factory execution"
              >
                <div style={{ fontSize: '11px', color: '#059669', fontWeight: 650, textTransform: 'uppercase' }}>
                  Released to Knitting
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#047857', margin: '2px 0' }}>
                  {kpiCounts.released} Jobs
                </div>
                <div style={{ fontSize: '11.5px', color: '#047857', fontWeight: 600 }}>
                  Active floor execution
                </div>
              </div>
            </div>

            {/* Compact Interactive Chart: Approval & Release Velocity Breakdown */}
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
                  Interactive Analytics
                </span>
              </div>

              <div style={{ width: '100%', height: '160px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                    onClick={(e: any) => {
                      if (e && (e as any).activePayload && (e as any).activePayload[0]) {
                        const targetKey = (e as any).activePayload[0].payload.key;
                        setStatusFilter((prev) => (prev === targetKey ? 'ALL' : targetKey));
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748B', fontSize: 11, fontWeight: 550 }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#64748B', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(2, 132, 199, 0.06)' }} />
                    <Bar {...FX_BAR}
                      dataKey="count"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={55}
                      onMouseEnter={(_, index) => setActiveChartBar(index)}
                      onMouseLeave={() => setActiveChartBar(null)}
                    >
                      {chartData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={statusFilter === entry.key ? entry.color : activeChartBar === index ? entry.color : entry.fill}
                          stroke={entry.color}
                          strokeWidth={statusFilter === entry.key ? 2 : 1}
                          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Queue Table with Search and Action Triggers */}
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
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F274E' }}>
                    Fabric Order Sheet &amp; T&amp;A Approval Queue
                  </div>
</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search
                      size={14}
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94A3B8',
                      }}
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search Job #, Style, Buyer..."
                      style={{
                        height: '32px',
                        padding: '0 10px 0 30px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        outline: 'none',
                        width: '240px',
                        background: '#FFFFFF',
                        color: '#0F172A',
                      }}
                    />
                  </div>
                  {statusFilter !== 'ALL' && (
                    <button
                      onClick={() => setStatusFilter('ALL')}
                      style={{
                        height: '32px',
                        padding: '0 10px',
                        fontSize: '11.5px',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                        background: '#F8FAFC',
                        color: '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <X size={13} /> Reset Filter
                    </button>
                  )}
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#0284C7',
                      background: '#F0F9FF',
                      border: '1px solid #BAE6FD',
                      borderRadius: '12px',
                      padding: '4px 10px',
                    }}
                  >
                    Showing {filteredQueue.length} of {queue.length}
                  </span>
                </div>
              </div>

              <DataGrid
                rows={filteredQueue}
                rowKey={(item: any) => item.styleId || item.jobNo}
                activeRowKey={activeRecordId}
                onRowClick={(item: any) => setActiveRecordId(item.styleId || item.jobNo)}
                searchPlaceholder="Search Job #, Style, Buyer..."
                columns={[
                  {
                    key: 'jobNo',
                    header: 'Job / Style No.',
                    sortable: true,
                    filter: 'text',
                    render: (item: any) => (
                      <div>
                        <div style={{ fontWeight: 800, color: '#0284C7', fontSize: '12.5px' }}>Job #{item.jobNo}</div>
                        <div style={{ fontWeight: 600, color: '#0F274E', fontSize: '11.5px' }}>{item.styleNo}</div>
                        <div style={{ color: '#64748B', fontSize: '10.5px' }}>{item.itemDescription}</div>
                      </div>
                    ),
                    exportValue: (item: any) => `${item.jobNo} ${item.styleNo}`,
                  },
                  {
                    key: 'buyer',
                    header: 'Buyer & Merchandiser',
                    sortable: true,
                    filter: 'enum',
                    render: (item: any) => (
                      <div>
                        <div style={{ fontWeight: 700, color: '#1E293B' }}>{item.buyer}</div>
                        <div style={{ color: '#64748B', fontSize: '11px' }}>Merch: {item.merchandiser}</div>
                      </div>
                    ),
                    exportValue: (item: any) => `${item.buyer} (${item.merchandiser})`,
                  },
                  {
                    key: 'orderQty',
                    header: 'Order Qty / CCD',
                    align: 'right',
                    sortable: true,
                    sum: true,
                    render: (item: any) => (
                      <div>
                        <div style={{ fontWeight: 800, color: '#0F274E', fontFamily: 'monospace' }}>{fmt(item.orderQty)} pcs</div>
                        <div style={{ color: '#0284C7', fontSize: '11px', fontWeight: 600 }}>CCD: {fmtDate(item.ccd)}</div>
                      </div>
                    ),
                    exportValue: (item: any) => Number(item.orderQty || 0),
                  },
                  {
                    key: 'totalFinishKg',
                    header: 'Fabric Order Sheet',
                    align: 'right',
                    sortable: true,
                    sum: true,
                    render: (item: any) => (
                      <div>
                        <div style={{ fontWeight: 700, color: '#334155' }}>
                          {item.fabricSheetNo} <span style={{ color: '#94A3B8' }}>(Rev {item.fabricSheetRevision})</span>
                        </div>
                        <div style={{ color: '#059669', fontSize: '11.5px', fontWeight: 700 }}>Req Finish: {fmt(item.totalFinishKg)} Kg</div>
                      </div>
                    ),
                    exportValue: (item: any) => Number(item.totalFinishKg || 0),
                  },
                  {
                    key: 'signedCopy',
                    header: 'Signed Hard-Copy Gate',
                    render: (item: any) => (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                        <span style={{ color: item.signedCopy?.fabricSheet ? '#059669' : '#D97706', fontWeight: 600 }}>
                          {item.signedCopy?.fabricSheet ? '✓ Fabric Sheet Signed' : '○ Fabric Sheet Missing'}
                        </span>
                        <span style={{ color: item.signedCopy?.tna ? '#059669' : '#D97706', fontWeight: 600 }}>
                          {item.signedCopy?.tna ? '✓ T&A Copy Signed' : '○ T&A Copy Missing'}
                        </span>
                        {item.signedCopy?.referenceNo && (
                          <span style={{ color: '#64748B', fontSize: '10px', fontFamily: 'monospace' }}>
                            Ref: {item.signedCopy.referenceNo}
                          </span>
                        )}
                      </div>
                    ),
                    exportValue: (item: any) => item.signedCopy?.referenceNo || 'Pending',
                  },
                  {
                    key: 'status',
                    header: 'Current Status',
                    sortable: true,
                    filter: 'enum',
                    render: (item: any) => {
                      const badge = statusBadge(item.status);
                      return (
                        <div>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              background: badge.bg,
                              border: `1px solid ${badge.border}`,
                              color: badge.text,
                            }}
                          >
                            {badge.label}
                          </span>
                          {item.returnReason && (
                            <div style={{ marginTop: '4px', maxWidth: '180px', fontSize: '10.5px', color: '#DC2626', lineHeight: 1.2 }}>
                              Note: {item.returnReason}
                            </div>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    key: 'actions',
                    header: 'Action',
                    align: 'right',
                    render: (item: any) => (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReviewJob(item);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          border: '1px solid #0284C7',
                          background: '#F0F9FF',
                          color: '#0284C7',
                          cursor: 'pointer',
                        }}
                      >
                        Review &amp; Release
                      </button>
                    ),
                  },
                ]}
              />
            </div>

            <RecordPanel
              open={Boolean(activeRecordId)}
              onClose={() => setActiveRecordId(null)}
              rows={filteredQueue}
              rowKey={(item: any) => item.styleId || item.jobNo}
              activeKey={activeRecordId}
              onNavigate={(nextKey) => setActiveRecordId(String(nextKey))}
              title={(item: any) => `Job #${item.jobNo} · ${item.styleNo}`}
              subtitle={(item: any) => `${item.buyer} · Merchandiser: ${item.merchandiser}`}
              statusBadge={(item: any) => {
                const b = statusBadge(item.status);
                return {
                  label: b.label,
                  tone: item.status === 'RELEASED_TO_KNITTING' ? 'good' : item.status === 'RETURNED' ? 'bad' : 'warn',
                };
              }}
              sections={[
                {
                  key: 'orderInfo',
                  title: 'Job & Fabric Sheet Summary',
                  fields: [
                    { key: 'jobNo', label: 'Job No.', type: 'readonly', setByRole: 'Merchandising' },
                    { key: 'styleNo', label: 'Style No.', type: 'readonly', setByRole: 'Merchandising' },
                    { key: 'buyer', label: 'Buyer', type: 'readonly', setByRole: 'Merchandising' },
                    { key: 'merchandiser', label: 'Merchandiser', type: 'readonly', setByRole: 'Merchandising' },
                    { key: 'orderQty', label: 'Order Qty (pcs)', type: 'readonly', setByRole: 'Merchandising' },
                    { key: 'totalFinishKg', label: 'Finish Fabric Required (Kg)', type: 'readonly', setByRole: 'Merchandising' },
                    { key: 'fabricSheetNo', label: 'Fabric Sheet No.', type: 'readonly' },
                    { key: 'ccd', label: 'Cargo Closing Date (CCD)', type: 'readonly', format: (v) => fmtDate(v) },
                  ],
                },
                {
                  key: 'signedGate',
                  title: 'Signed Hard-Copy Verification',
                  fields: [
                    {
                      key: 'referenceNo',
                      label: 'Physical Register Reference No.',
                      type: 'text',
                      format: (_, row) => row.signedCopy?.referenceNo || `PHY-SIG-${row.jobNo}`,
                    },
                    {
                      key: 'receivedBy',
                      label: 'Verified By (Planning Desk)',
                      type: 'text',
                      format: (_, row) => row.signedCopy?.receivedBy || 'Shahidul Alam (Head of Planning)',
                    },
                  ],
                },
              ]}
              onSave={async (item: any, patch: Partial<any>) => {
                await api(`/planning/approvals/jobs/${item.styleId}/signed-copy`, {
                  method: 'POST',
                  body: JSON.stringify({
                    fabricSheet: true,
                    tna: true,
                    referenceNo: (patch as any).referenceNo || item.signedCopy?.referenceNo || `PHY-SIG-${item.jobNo}`,
                    receivedBy: (patch as any).receivedBy || item.signedCopy?.receivedBy || 'Shahidul Alam (Head of Planning)',
                    remarks: 'Signed hard-copy verified via RecordPanel',
                  }),
                });
                setMessage(`Physical signed copy verified for Job ${item.jobNo}.`);
                await loadAll();
              }}
              footerSlot={(item: any) => (
                <button
                  type="button"
                  className="ui-btn ui-btn-primary"
                  onClick={() => {
                    setActiveRecordId(null);
                    openReleaseModal(item);
                  }}
                >
                  Open Colour × Part Release Desk →
                </button>
              )}
            />
          </>
        )}

        {/* TAB 2: SAMPLE ORDER TNA & BUYER MONTHLY QUOTA */}
        {activeTab === 'SAMPLE_QUOTA' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {/* Buyer Monthly Quota Board */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F274E', marginBottom: '4px' }}>
                Monthly Buyer Sample &amp; Bulk Line Quota ({quotaData?.month || '2026-10'})
              </div>
<div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>Buyer</th>
                      <th style={{ padding: '8px' }}>OD Sample Quota</th>
                      <th style={{ padding: '8px' }}>SMS Quota</th>
                      <th style={{ padding: '8px' }}>Bulk Lines</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(quotaData?.buyerQuota || []).map((bq: any, i: number) => {
                      const odPct = bq.odQuota > 0 ? Math.round((bq.odUsed / bq.odQuota) * 100) : 0;
                      const smsPct = bq.smsQuota > 0 ? Math.round((bq.smsUsed / bq.smsQuota) * 100) : 0;
                      return (
                        <tr key={bq.buyer || i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px', fontWeight: 700, color: '#0F274E' }}>{bq.buyer}</td>
                          <td style={{ padding: '8px' }}>
                            <span style={{ fontWeight: 700, color: '#0284C7' }}>
                              {bq.odUsed}/{bq.odQuota}
                            </span>{' '}
                            <span style={{ color: '#64748B', fontSize: '10.5px' }}>({odPct}%)</span>
                          </td>
                          <td style={{ padding: '8px' }}>
                            <span style={{ fontWeight: 700, color: '#059669' }}>
                              {bq.smsUsed}/{bq.smsQuota}
                            </span>{' '}
                            <span style={{ color: '#64748B', fontSize: '10.5px' }}>({smsPct}%)</span>
                          </td>
                          <td style={{ padding: '8px', fontWeight: 650, color: '#334155' }}>
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
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
<div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>Form / Job</th>
                      <th style={{ padding: '8px' }}>Sample Type</th>
                      <th style={{ padding: '8px' }}>Knit / Dye / Sew</th>
                      <th style={{ padding: '8px' }}>Target Dispatch</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleOrders.map((so) => (
                      <tr key={so.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '8px' }}>
                          <div style={{ fontWeight: 700, color: '#0284C7' }}>{so.formNo}</div>
                          <div style={{ fontSize: '10.5px', color: '#64748B' }}>Job #{so.jobNo} · {so.buyer}</div>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <div style={{ fontWeight: 600, color: '#0F274E' }}>{so.sampleType}</div>
                          <div style={{ fontSize: '10.5px', color: '#64748B' }}>{so.sampleQty} pcs</div>
                        </td>
                        <td style={{ padding: '8px', fontSize: '10.5px', fontFamily: 'monospace', color: '#475569' }}>
                          <div>Knit: {so.tna?.knittingDate || '—'}</div>
                          <div>Dye: {so.tna?.dyeingDate || '—'}</div>
                          <div>Sew: {so.tna?.sewingDate || '—'}</div>
                        </td>
                        <td style={{ padding: '8px', fontSize: '11px' }}>
                          <div style={{ fontWeight: 700, color: '#0284C7' }}>Plan: {so.tna?.dispatchDate || '—'}</div>
                          <div style={{ color: so.tna?.actualDispatchDate ? '#059669' : '#D97706', fontSize: '10px' }}>
                            Act: {so.tna?.actualDispatchDate || 'Pending'}
                          </div>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <button
                            onClick={() => setEditingSampleForm(JSON.parse(JSON.stringify(so)))}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              border: '1px solid #0284C7',
                              background: '#F0F9FF',
                              color: '#0284C7',
                              cursor: 'pointer',
                            }}
                          >
                            Edit TNA
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

        {/* MODAL: Review & Action Selector */}
        {reviewJob && (
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
            onClick={() => setReviewJob(null)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '520px',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 20px 45px rgba(0,0,0,0.18)',
                fontSize: '12px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F274E' }}>
                    Job #{reviewJob.jobNo} · {reviewJob.styleNo}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                    {reviewJob.buyer} · Merchandiser: {reviewJob.merchandiser} · {fmt(reviewJob.orderQty)} pcs · CCD: {reviewJob.ccd}
                  </div>
                </div>
                <button
                  onClick={() => setReviewJob(null)}
                  style={{
                    border: 'none',
                    background: '#F1F5F9',
                    borderRadius: '6px',
                    width: '28px',
                    height: '28px',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#64748B',
                  }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  padding: '12px 14px',
                  marginBottom: '14px',
                  lineHeight: 1.6,
                }}
              >
                <div>Finish Fabric Required: <b>{fmt(reviewJob.totalFinishKg)} Kg</b></div>
                <div>
                  Signed Hard-Copy Gate:{' '}
                  {reviewJob.signedCopy?.fabricSheet && reviewJob.signedCopy?.tna ? (
                    <span style={{ color: '#059669', fontWeight: 700 }}>✓ Fabric Sheet &amp; T&amp;A Hard Copies Signed</span>
                  ) : (
                    <span style={{ color: '#D97706', fontWeight: 700 }}>○ Physical Signed Copies Pending</span>
                  )}
                </div>
                <div>Current Desk Status: <b style={{ color: '#0284C7' }}>{String(reviewJob.status || '').replace(/_/g, ' ')}</b></div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => {
                    const j = reviewJob;
                    setReviewJob(null);
                    openSignedCopyModal(j);
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F274E',
                    fontWeight: 700,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>1. Record Physical Signed Copy Gate</span>
                  <span style={{ color: '#0284C7', fontSize: '11px' }}>Open Form →</span>
                </button>

                <button
                  onClick={() => {
                    const j = reviewJob;
                    setReviewJob(null);
                    openReleaseModal(j);
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #059669',
                    background: '#ECFDF5',
                    color: '#065F46',
                    fontWeight: 700,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>2. Review Fabric &amp; Release to Knitting (Colour × Part)</span>
                  <span style={{ color: '#059669', fontSize: '11px' }}>Verify Breakdown →</span>
                </button>

                <button
                  onClick={() => {
                    const j = reviewJob;
                    setReviewJob(null);
                    setReturnModalJob(j);
                    setReturnForm({ target: 'BOTH', reason: j.returnReason || '' });
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #FECACA',
                    background: '#FEF2F2',
                    color: '#991B1B',
                    fontWeight: 700,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Return to Merchandiser with Discrepancy Note</span>
                  <span style={{ color: '#DC2626', fontSize: '11px' }}>Re-open Task →</span>
                </button>

                <button
                  onClick={() => {
                    const j = reviewJob;
                    setReviewJob(null);
                    openHistoryDrawer(j);
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    color: '#64748B',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  View Approval Audit Trail &amp; History
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 1: Record Physical Signed Copy */}
        {signedModalJob && (
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
                maxWidth: '480px',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 20px 45px rgba(0,0,0,0.18)',
                fontSize: '12px',
              }}
            >
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F274E', marginBottom: '4px' }}>
                Record Physical Signed Copy — Job #{signedModalJob.jobNo} ({signedModalJob.styleNo})
              </div>
<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E293B', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={signedForm.fabricSheet}
                    onChange={(e) => setSignedForm({ ...signedForm, fabricSheet: e.target.checked })}
                  />
                  Physical Signed Fabric Order Sheet Received ({signedModalJob.fabricSheetNo})
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E293B', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={signedForm.tna}
                    onChange={(e) => setSignedForm({ ...signedForm, tna: e.target.checked })}
                  />
                  Physical Signed Bulk T&amp;A Sheet Received
                </label>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '4px' }}>Physical File / Register Reference No.</label>
                  <input
                    type="text"
                    value={signedForm.referenceNo}
                    onChange={(e) => setSignedForm({ ...signedForm, referenceNo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '4px' }}>Verified By</label>
                  <input
                    type="text"
                    value={signedForm.receivedBy}
                    onChange={(e) => setSignedForm({ ...signedForm, receivedBy: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '4px' }}>Verification Remarks</label>
                  <input
                    type="text"
                    value={signedForm.remarks}
                    onChange={(e) => setSignedForm({ ...signedForm, remarks: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
                <button
                  onClick={() => setSignedModalJob(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitSignedCopy}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#0284C7',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Signed Copy Record'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: Return to Merchandiser */}
        {returnModalJob && (
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
                maxWidth: '480px',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #FECACA',
                padding: '20px',
                boxShadow: '0 20px 45px rgba(0,0,0,0.18)',
                fontSize: '12px',
              }}
            >
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#DC2626', marginBottom: '4px' }}>
                Return to Merchandiser — Job #{returnModalJob.jobNo} ({returnModalJob.styleNo})
              </div>
<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '4px' }}>Document to Return</label>
                  <select
                    value={returnForm.target}
                    onChange={(e) => setReturnForm({ ...returnForm, target: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                    }}
                  >
                    <option value="BOTH">Both Fabric Order Sheet &amp; T&amp;A</option>
                    <option value="FABRIC_SHEET">Fabric Order Sheet Only</option>
                    <option value="TNA">T&amp;A Plan Only</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '4px' }}>
                    Mandatory Discrepancy Reason / Note
                  </label>
                  <textarea
                    rows={3}
                    value={returnForm.reason}
                    onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                    placeholder="e.g., Collar rib consumption &amp; wastage % mismatch with CAD marker..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
                <button
                  onClick={() => setReturnModalJob(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitReturn}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#DC2626',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {saving ? 'Returning...' : 'Return to Merchandiser'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: Approve & Release to Knitting (Colour × Part Breakdown) */}
        {releaseModalJob && (
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
                maxWidth: '920px',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '22px',
                boxShadow: '0 20px 45px rgba(0,0,0,0.18)',
                fontSize: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  borderBottom: '1px solid #E2E8F0',
                  paddingBottom: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F274E' }}>
                    Approve &amp; Release to Knitting — Job #{releaseModalJob.jobNo} · Style {releaseModalJob.styleNo} ({releaseModalJob.buyer})
                  </div>
</div>
                <button
                  onClick={addReleaseRow}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #0284C7',
                    background: '#F0F9FF',
                    color: '#0284C7',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + Add Colour × Part Row
                </button>
              </div>

              {/* Tolerance & Balance Strip */}
              <div
                style={{
                  margin: '14px 0',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '10px',
                  background: '#F8FAFC',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div>
                  <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>Target Finish Kg</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F274E' }}>{fmt(expectedFinishKg)} Kg</div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>Breakdown Sum Finish Kg</div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: Math.abs(finishDiffKg) <= 1 ? '#059669' : '#D97706',
                    }}
                  >
                    {fmt(draftSumFinishKg)} Kg ({finishDiffKg >= 0 ? `+${finishDiffKg}` : finishDiffKg} Kg)
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>Greige Yarn Needed</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0284C7' }}>{fmt(draftSumGreyKg)} Kg</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {Math.abs(finishDiffKg) > 1 ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D97706', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={overrideMismatch}
                        onChange={(e) => setOverrideMismatch(e.target.checked)}
                      />
                      Override ±1.0 Kg mismatch
                    </label>
                  ) : (
                    <span style={{ color: '#059669', fontWeight: 700 }}>✓ Within ±1.0 Kg tolerance</span>
                  )}
                </div>
              </div>

              {/* Rows Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                      <th style={{ padding: '6px' }}>Colour</th>
                      <th style={{ padding: '6px' }}>Part</th>
                      <th style={{ padding: '6px' }}>Fabric Type &amp; Composition</th>
                      <th style={{ padding: '6px' }}>GSM / Dia</th>
                      <th style={{ padding: '6px' }}>CAD cons.</th>
                      <th style={{ padding: '6px' }}>Finish Kg</th>
                      <th style={{ padding: '6px' }}>Dye to Match</th>
                      <th style={{ padding: '6px', textAlign: 'right' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {releaseRows.map((r, idx) => (
                      <tr key={r.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="text"
                            value={r.colour || ''}
                            onChange={(e) => updateReleaseRow(idx, 'colour', e.target.value)}
                            style={{ width: '100px', padding: '4px 6px', border: '1px solid #CBD5E1', borderRadius: '4px' }}
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="text"
                            value={r.part || ''}
                            onChange={(e) => updateReleaseRow(idx, 'part', e.target.value)}
                            style={{ width: '80px', padding: '4px 6px', border: '1px solid #CBD5E1', borderRadius: '4px' }}
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="text"
                            value={r.fabricType || ''}
                            onChange={(e) => updateReleaseRow(idx, 'fabricType', e.target.value)}
                            style={{ width: '160px', padding: '4px 6px', border: '1px solid #CBD5E1', borderRadius: '4px' }}
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input
                              type="number"
                              value={r.gsm || 180}
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) => updateReleaseRow(idx, 'gsm', Number(e.target.value))}
                              style={{ width: '50px', padding: '4px', border: '1px solid #CBD5E1', borderRadius: '4px' }}
                            />
                            <input
                              type="text"
                              value={r.dia || ''}
                              onChange={(e) => updateReleaseRow(idx, 'dia', e.target.value)}
                              style={{ width: '65px', padding: '4px', border: '1px solid #CBD5E1', borderRadius: '4px' }}
                            />
                          </div>
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="number"
                            step="0.01"
                            value={r.cadConsKgDz ?? ''}
                            placeholder="kg/dz"
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => updateReleaseRow(idx, 'cadConsKgDz', e.target.value === '' ? null : Number(e.target.value))}
                            style={{ width: '65px', padding: '4px', border: '1px solid #CBD5E1', borderRadius: '4px' }}
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="number"
                            value={r.finishKg ?? 0}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => updateReleaseRow(idx, 'finishKg', Number(e.target.value))}
                            style={{
                              width: '75px',
                              padding: '4px',
                              border: '1px solid #059669',
                              borderRadius: '4px',
                              fontWeight: 700,
                              color: '#065F46',
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={!!r.dyeToMatch}
                            onChange={(e) => updateReleaseRow(idx, 'dyeToMatch', e.target.checked)}
                          />
                        </td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>
                          <button
                            onClick={() => removeReleaseRow(idx)}
                            style={{
                              border: 'none',
                              background: '#FEE2E2',
                              color: '#DC2626',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              cursor: 'pointer',
                            }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '14px' }}>
                <label style={{ display: 'block', color: '#64748B', marginBottom: '4px' }}>
                  Release Remarks / Knitting Instruction Note
                </label>
                <input
                  type="text"
                  value={releaseRemarks}
                  onChange={(e) => setReleaseRemarks(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
                <button
                  onClick={() => setReleaseModalJob(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => submitRelease(true)}
                  disabled={saving}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #0284C7',
                    background: '#F0F9FF',
                    color: '#0284C7',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Approve Only (Hold Release)
                </button>
                <button
                  onClick={() => submitRelease(false)}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#059669',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {saving ? 'Releasing...' : 'Approve & Release to Knitting'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: Edit Sample Order TNA */}
        {editingSampleForm && (
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
                boxShadow: '0 20px 45px rgba(0,0,0,0.18)',
                fontSize: '12px',
              }}
            >
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F274E', marginBottom: '12px' }}>
                Sample Order Sheet TNA — {editingSampleForm.formNo} (Job #{editingSampleForm.jobNo})
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
                    <label style={{ display: 'block', color: '#64748B', marginBottom: '2px', fontSize: '11px' }}>
                      {f.label}
                    </label>
                    <input
                      type="date"
                      value={editingSampleForm.tna?.[f.key] || ''}
                      onChange={(e) =>
                        setEditingSampleForm({
                          ...editingSampleForm,
                          tna: { ...(editingSampleForm.tna || {}), [f.key]: e.target.value },
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '11.5px',
                      }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', color: '#64748B', marginBottom: '2px', fontSize: '11px' }}>
                    Courier AWB No.
                  </label>
                  <input
                    type="text"
                    value={editingSampleForm.tna?.awbNo || ''}
                    onChange={(e) =>
                      setEditingSampleForm({
                        ...editingSampleForm,
                        tna: { ...(editingSampleForm.tna || {}), awbNo: e.target.value },
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '11.5px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
                <button
                  onClick={() => setEditingSampleForm(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveSampleOrderTna}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#0284C7',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Save Sample TNA
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5: History Audit Trail Drawer */}
        {historyJob && (
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
                boxShadow: '0 20px 45px rgba(0,0,0,0.18)',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F274E' }}>
                  Approval Audit Trail — Job #{historyJob.jobNo} ({historyJob.styleNo})
                </div>
                <button
                  onClick={() => setHistoryJob(null)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                {historyList.length === 0 ? (
                  <div style={{ color: '#94A3B8', padding: '12px', textAlign: 'center' }}>No log entries recorded yet</div>
                ) : (
                  historyList.map((h, i) => (
                    <div
                      key={h.id || i}
                      style={{
                        padding: '10px',
                        background: '#F8FAFC',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0284C7' }}>
                        <span>{h.action}</span>
                        <span style={{ color: '#64748B', fontSize: '10px', fontFamily: 'monospace' }}>
                          {String(h.timestamp || '').slice(0, 16).replace('T', ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Actor: {h.actor}</div>
                      <div style={{ fontSize: '11.5px', color: '#1E293B', marginTop: '4px' }}>{h.remarks}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
