'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Shell from '../../components/Shell';
import sampleMasterRaw from '../../data/sample-merchandising-master.json';
import demo2000MasterRaw from '../../data/demo-2000-master.json';
import {
  Badge,
  Card,
  KpiCard,
  DataGrid,
  GridColumn,
  RecordPanel,
  RecordSection
} from '../../components/ui';
import { fmtDate, fmtNum } from '../../lib/format';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Sparkles,
  Search,
  Filter,
  Check,
  Calendar,
  Save,
  Shirt,
  RefreshCw,
  Eye,
  FileSpreadsheet
} from 'lucide-react';

export interface SampleStyleRecord {
  id: string;
  key: string;
  buyer: string;
  styleNo: string;
  jobNo: string;
  sampleType: string;
  merchStatus: string;
  presentStatus: string;
  deliveryStatus: string;
  merchandiser: string;
  collNo: string;
  coloursCount: number;
  qtyPcs: number;
  orderSheetDate: string;
  nextDeliveryDue: string;
  colorsList: string[];
  note: string;
  reason: string;
}

// Build synchronized master list of sample styles
function buildSampleStyles(): SampleStyleRecord[] {
  const masterJobs = (demo2000MasterRaw as any)?.jobs || [];
  const jobMap = new Map<string, string>();
  masterJobs.forEach((j: any) => {
    if (j.styleNo) jobMap.set(String(j.styleNo).toLowerCase().trim(), String(j.jobNo));
  });

  const rawList = sampleMasterRaw as any[];
  const map = new Map<string, SampleStyleRecord>();

  rawList.forEach((r, idx) => {
    const style = String(r.style || `Dev-${500 + idx}`).trim();
    const buyer = String(r.buyer || 'ONL-JRSY').trim();
    const key = `${buyer}||${style}`;

    if (!map.has(key)) {
      const matchedJob =
        jobMap.get(style.toLowerCase()) ||
        String(44001 + (map.size % 2000));

      const isLate = r.statusRaw && String(r.statusRaw).toLowerCase().includes('late');
      const isDelivered = r.stage === 'Sewing ok' || r.delQty > 0;
      const deliveryStatus = isLate
        ? 'Overdue 22 d'
        : isDelivered
        ? 'Delivered'
        : 'Pending';

      const merchStatus =
        r.stage === 'Fabric due' || r.stage === 'Ready for sewing'
          ? 'In sample room'
          : r.stage === 'Sewing ok'
          ? 'Approved'
          : r.stage === 'Comments due'
          ? 'Comments pending'
          : 'In development';

      map.set(key, {
        id: `SMP-${1000 + map.size}`,
        key,
        buyer,
        styleNo: style,
        jobNo: matchedJob,
        sampleType: (r.types && r.types[0]) || r.cat || 'SMS',
        merchStatus,
        presentStatus: r.stage || 'Fabric due',
        deliveryStatus,
        merchandiser: r.merch || 'Faisal',
        collNo: r.coll || '5',
        coloursCount: 1,
        qtyPcs: Number(r.qty || 2),
        orderSheetDate: r.rcvd || '2026-09-29',
        nextDeliveryDue: r.delActual || r.sewClose || '2026-10-24',
        colorsList: r.color ? [r.color] : ['Solid Fabric'],
        note: r.note || '',
        reason: r.reason || ''
      });
    } else {
      const entry = map.get(key)!;
      entry.coloursCount += 1;
      entry.qtyPcs += Number(r.qty || 0);
      if (r.color && !entry.colorsList.includes(r.color)) {
        entry.colorsList.push(r.color);
      }
    }
  });

  return Array.from(map.values());
}

export default function SampleMerchandisingPage() {
  const [samples, setSamples] = useState<SampleStyleRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [activeTypeTab, setActiveTypeTab] = useState<string>('ALL');
  const [activeStatusQuick, setActiveStatusQuick] = useState<string>('ALL');
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    const list = buildSampleStyles();
    setSamples(list);
    if (list.length > 0 && !selectedRecordId) {
      setSelectedRecordId(list[0].id);
    }
  }, []);

  // Filtered rows for DataGrid
  const filteredSamples = useMemo(() => {
    return samples.filter((s) => {
      if (activeTypeTab !== 'ALL' && s.sampleType.toUpperCase() !== activeTypeTab) {
        return false;
      }
      if (activeStatusQuick === 'OVERDUE' && !s.deliveryStatus.toLowerCase().includes('overdue')) {
        return false;
      }
      if (activeStatusQuick === 'IN_SAMPLE_ROOM' && s.merchStatus !== 'In sample room') {
        return false;
      }
      if (activeStatusQuick === 'FABRIC_DUE' && s.presentStatus !== 'Fabric due') {
        return false;
      }
      if (activeStatusQuick === 'READY_SEWING' && s.presentStatus !== 'Ready for sewing') {
        return false;
      }
      if (activeStatusQuick === 'DELIVERED' && s.deliveryStatus !== 'Delivered') {
        return false;
      }
      return true;
    });
  }, [samples, activeTypeTab, activeStatusQuick]);

  // High-level KPI counts
  const kpiCounts = useMemo(() => {
    const total = samples.length;
    const inSampleRoom = samples.filter((s) => s.merchStatus === 'In sample room').length;
    const readyForSewing = samples.filter((s) => s.presentStatus === 'Ready for sewing').length;
    const fabricDue = samples.filter((s) => s.presentStatus === 'Fabric due').length;
    const overdue = samples.filter((s) => s.deliveryStatus.toLowerCase().includes('overdue')).length;
    const delivered = samples.filter((s) => s.deliveryStatus === 'Delivered').length;
    return { total, inSampleRoom, readyForSewing, fabricDue, overdue, delivered };
  }, [samples]);

  // Selected record for RecordPanel
  const selectedRecord = useMemo(() => {
    return samples.find((r) => r.id === selectedRecordId) || null;
  }, [samples, selectedRecordId]);

  const recordSections = useMemo<RecordSection[]>(() => {
    if (!selectedRecord) return [];
    return [
      {
        name: 'Sample Identification',
        fields: [
          { key: 'styleNo', label: 'Style No', value: selectedRecord.styleNo, readOnly: true },
          { key: 'jobNo', label: 'Associated Job #', value: selectedRecord.jobNo, readOnly: true },
          { key: 'buyer', label: 'Sub-brand / Buyer', value: selectedRecord.buyer, readOnly: true },
          { key: 'merchandiser', label: 'Merchandiser', value: selectedRecord.merchandiser, required: true },
          { key: 'sampleType', label: 'Sample Stage / Type', value: selectedRecord.sampleType, required: true },
          { key: 'collNo', label: 'Collection No', value: selectedRecord.collNo }
        ]
      },
      {
        name: 'Production & Delivery Workflow',
        fields: [
          { key: 'merchStatus', label: 'Merchandising Status', value: selectedRecord.merchStatus, required: true },
          { key: 'presentStatus', label: 'Present Factory Stage', value: selectedRecord.presentStatus, required: true },
          { key: 'deliveryStatus', label: 'Delivery Timeliness', value: selectedRecord.deliveryStatus, required: true },
          { key: 'orderSheetDate', label: 'Order Sheet Date', value: fmtDate(selectedRecord.orderSheetDate) },
          { key: 'nextDeliveryDue', label: 'Delivery Target Date', value: fmtDate(selectedRecord.nextDeliveryDue), required: true },
          { key: 'coloursCount', label: 'Colorways Count', value: selectedRecord.coloursCount, type: 'number' },
          { key: 'qtyPcs', label: 'Total Sample Qty', value: selectedRecord.qtyPcs, type: 'number', unit: 'pcs' }
        ]
      },
      {
        name: 'Technical Notes & Execution Details',
        fields: [
          { key: 'colors', label: 'Colorways Specification', value: selectedRecord.colorsList.join(' · '), multiline: true },
          { key: 'note', label: 'Sample Room Progress Note', value: selectedRecord.note || 'Within target line', multiline: true },
          { key: 'reason', label: 'Delay / Exception Reason', value: selectedRecord.reason || 'None (on schedule)', multiline: true }
        ]
      }
    ];
  }, [selectedRecord]);

  const handleRecordSave = (patch: Record<string, any>) => {
    if (!selectedRecordId) return;
    setSamples((prev) =>
      prev.map((s) => (s.id === selectedRecordId ? { ...s, ...patch } : s))
    );
    setSaveSuccess(`Style #${selectedRecord?.styleNo} updated successfully`);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  // Grid columns with Excel-style filters on every column
  const columns = useMemo<GridColumn<SampleStyleRecord>[]>(
    () => [
      {
        key: 'buyer',
        header: 'Sub-brand',
        width: 125,
        value: (r) => r.buyer,
        render: (r) => <strong>{r.buyer}</strong>
      },
      {
        key: 'styleNo',
        header: 'Style No.',
        width: 155,
        value: (r) => r.styleNo,
        render: (r) => (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Link
              href={`/jobs/${encodeURIComponent(r.jobNo)}`}
              onClick={(e) => e.stopPropagation()}
              className="dg-job-link"
              style={{ fontWeight: 800 }}
              title={`Open Job 360 for #${r.jobNo}`}
            >
              {r.styleNo}
            </Link>
          </div>
        )
      },
      {
        key: 'jobNo',
        header: 'Job No.',
        width: 105,
        value: (r) => r.jobNo,
        render: (r) => (
          <Link
            href={`/jobs/${encodeURIComponent(r.jobNo)}`}
            onClick={(e) => e.stopPropagation()}
            className="dg-job-link"
          >
            #{r.jobNo}
          </Link>
        )
      },
      {
        key: 'sampleType',
        header: 'Sample Type',
        width: 120,
        value: (r) => r.sampleType,
        render: (r) => (
          <Badge
            tone={
              r.sampleType === 'SMS'
                ? 'info'
                : r.sampleType === 'Development'
                ? 'mid'
                : r.sampleType === 'PP'
                ? 'done'
                : 'quiet'
            }
          >
            {r.sampleType}
          </Badge>
        )
      },
      {
        key: 'merchStatus',
        header: 'Merchandising Status',
        width: 160,
        value: (r) => r.merchStatus,
        render: (r) => {
          const isApproved = r.merchStatus === 'Approved';
          const isInRoom = r.merchStatus === 'In sample room';
          return (
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                background: isApproved ? '#dcfce7' : isInRoom ? '#eff6ff' : '#f1f5f9',
                color: isApproved ? '#15803d' : isInRoom ? '#1d4ed8' : '#475569',
                border: isApproved ? '1px solid #bbf7d0' : isInRoom ? '1px solid #bfdbfe' : '1px solid #cbd5e1'
              }}
            >
              {r.merchStatus}
            </span>
          );
        }
      },
      {
        key: 'presentStatus',
        header: 'Present Status',
        width: 145,
        value: (r) => r.presentStatus,
        render: (r) => {
          const isDue = r.presentStatus === 'Fabric due';
          const isSewing = r.presentStatus.includes('Sewing');
          return (
            <span
              style={{
                fontWeight: 650,
                color: isDue ? '#b45309' : isSewing ? '#2563eb' : '#1e293b'
              }}
            >
              {r.presentStatus}
            </span>
          );
        }
      },
      {
        key: 'deliveryStatus',
        header: 'Delivery Status',
        width: 135,
        value: (r) => r.deliveryStatus,
        render: (r) => {
          const isLate = r.deliveryStatus.toLowerCase().includes('overdue');
          const isDelivered = r.deliveryStatus === 'Delivered';
          return (
            <Badge tone={isLate ? 'balance' : isDelivered ? 'done' : 'mid'}>
              {r.deliveryStatus}
            </Badge>
          );
        }
      },
      {
        key: 'merchandiser',
        header: 'Merchandiser',
        width: 120,
        value: (r) => r.merchandiser
      },
      {
        key: 'collNo',
        header: 'Coll #',
        width: 80,
        align: 'center',
        value: (r) => r.collNo
      },
      {
        key: 'coloursCount',
        header: 'Colours',
        width: 85,
        numeric: true,
        align: 'right',
        total: true,
        value: (r) => r.coloursCount,
        render: (r) => fmtNum(r.coloursCount)
      },
      {
        key: 'qtyPcs',
        header: 'Qty (pcs)',
        width: 100,
        numeric: true,
        align: 'right',
        total: true,
        unit: 'pcs',
        value: (r) => r.qtyPcs,
        render: (r) => <strong>{fmtNum(r.qtyPcs)}</strong>
      },
      {
        key: 'orderSheetDate',
        header: 'Order Sheet Date',
        width: 130,
        value: (r) => r.orderSheetDate,
        render: (r) => fmtDate(r.orderSheetDate)
      },
      {
        key: 'nextDeliveryDue',
        header: 'Next Delivery Due',
        width: 135,
        value: (r) => r.nextDeliveryDue,
        render: (r) => fmtDate(r.nextDeliveryDue)
      }
    ],
    []
  );

  return (
    <Shell title="Sample Merchandising">
      {saveSuccess && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 24,
            zIndex: 100,
            background: '#15803d',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '13px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Check size={16} />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Top Summary Widgets - Naturally scroll away when scrolling down */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <KpiCard
          label="Total Sample Styles"
          value={fmtNum(kpiCounts.total)}
          delta={`${fmtNum(samples.reduce((s, x) => s + x.qtyPcs, 0))} total pcs`}
        />
        <KpiCard
          label="In Sample Room"
          value={fmtNum(kpiCounts.inSampleRoom)}
          delta="Pattern & cutting active"
        />
        <KpiCard
          label="Ready for Sewing"
          value={fmtNum(kpiCounts.readyForSewing)}
          delta="Fabric cleared"
        />
        <KpiCard
          label="Fabric Due"
          value={fmtNum(kpiCounts.fabricDue)}
          delta="Awaiting lab / knitting"
        />
        <KpiCard
          label="Overdue Deliveries"
          value={fmtNum(kpiCounts.overdue)}
          delta="Urgent follow-up required"
        />
        <KpiCard
          label="Delivered / Dispatched"
          value={fmtNum(kpiCounts.delivered)}
          delta="Completed samples"
        />
      </div>

      {/* Quick Filter Buttons Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          flexWrap: 'wrap'
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--nos-ink-2)' }}>Type:</span>
        {['ALL', 'SMS', 'DEVELOPMENT', 'FIT', 'PP'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTypeTab(t)}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 650,
              borderRadius: '6px',
              border: activeTypeTab === t ? '1px solid #2563eb' : '1px solid var(--nos-line)',
              background: activeTypeTab === t ? '#2563eb' : 'var(--nos-card)',
              color: activeTypeTab === t ? '#ffffff' : 'var(--nos-ink)',
              cursor: 'pointer'
            }}
          >
            {t === 'ALL' ? 'All Types' : t}
          </button>
        ))}

        <div style={{ width: 1, height: 18, background: 'var(--nos-line)', margin: '0 6px' }} />

        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--nos-ink-2)' }}>Quick Filter:</span>
        {[
          { key: 'ALL', label: 'All Samples' },
          { key: 'IN_SAMPLE_ROOM', label: 'In Sample Room' },
          { key: 'READY_SEWING', label: 'Ready for Sewing' },
          { key: 'FABRIC_DUE', label: 'Fabric Due' },
          { key: 'OVERDUE', label: 'Overdue Deliveries' },
          { key: 'DELIVERED', label: 'Delivered' }
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActiveStatusQuick(f.key)}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 650,
              borderRadius: '6px',
              border: activeStatusQuick === f.key ? '1px solid #2563eb' : '1px solid var(--nos-line)',
              background: activeStatusQuick === f.key ? 'rgba(37,99,235,0.12)' : 'var(--nos-card)',
              color: activeStatusQuick === f.key ? '#2563eb' : 'var(--nos-ink)',
              cursor: 'pointer'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Main Table: Full width, frozen headers, Excel filters, fills naturally to bottom */}
      <DataGrid<SampleStyleRecord>
        storageKey="sample-merchandising-matrix"
        exportName="sample-merchandising-matrix"
        rows={filteredSamples}
        columns={columns}
        rowKey={(r) => r.id}
        frozenColumns={2}
        selectedRowKey={selectedRecordId}
        onRowClick={(r) => setSelectedRecordId(r.id)}
        emptyMessage="No sample style records match the selected filters."
      />

      {/* Standard Right-Side RecordPanel */}
      <RecordPanel
        open={Boolean(selectedRecord)}
        onClose={() => setSelectedRecordId(null)}
        title={selectedRecord ? `Sample Style #${selectedRecord.styleNo}` : 'Sample Details'}
        subtitle={selectedRecord ? `${selectedRecord.buyer} · Job #${selectedRecord.jobNo} · ${selectedRecord.merchandiser}` : ''}
        sections={recordSections}
        onSave={handleRecordSave}
      />
    </Shell>
  );
}
