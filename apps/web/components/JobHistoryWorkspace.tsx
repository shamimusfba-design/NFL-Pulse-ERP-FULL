'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { displayJobNo } from '../lib/display';
import demo2000DataRaw from '../data/demo-2000-master.json';

type Mode = 'job360' | 'quality' | 'leadtime';

function fmt(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return String(v);
}

function date(v: any) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusClass(v: any) {
  const s = String(v || '').toLowerCase();
  if (s.includes('complete') || s.includes('released') || s.includes('ready') || s.includes('pass') || s.includes('shipped') || s.includes('on time')) return 'good';
  if (s.includes('hold') || s.includes('fail') || s.includes('critical') || s.includes('late') || s.includes('overdue')) return 'bad';
  if (s.includes('running') || s.includes('progress') || s.includes('low') || s.includes('review') || s.includes('pending')) return 'warn';
  return 'neutral';
}

const productionSections = [
  ['yarn', 'Yarn'], ['procurement', 'Procurement'], ['yarnStore', 'Yarn Store'], ['yarnDyeing', 'Yarn Dyeing'],
  ['knitting', 'Knitting'], ['greigeStore', 'Greige Store'], ['dyeing', 'Dyeing'], ['labTesting', 'Lab / Testing'],
  ['fabricFinishing', 'Fabric Finishing'], ['finishedFabricStore', 'Finished Fabric Store'], ['cutting', 'Cutting'],
  ['printing', 'Printing'], ['embroidery', 'Embroidery'], ['sewing', 'Sewing'], ['finishing', 'Finishing'], ['shipment', 'Shipment'],
] as const;

function formatDetailFromMaster(j: any) {
  return {
    order: {
      id: j.id,
      jobNo: j.jobNo,
      buyer: j.buyer,
      buyerCode: j.buyer,
      factory: j.lineAllocation?.factory === 'NCL' ? 'Northern Clothing Limited (NCL)' : 'Northern Fashions Limited (NFL)',
      orderQty: j.orderQty,
      styleNo: j.styleNo,
      itemDescription: j.itemDescription,
      collection: j.planMonth,
      season: 'Autumn/Winter 2026',
      fobPrice: 4.85,
      itemImageUrl: null,
      ccd: j.dates?.exFactory || j.dates?.cargoClosing,
      poNo: `PO-${j.jobNo}`
    },
    merchandising: {
      presentStatus: j.presentStatus,
      merchandiser: j.merchandiser,
      overallStage: j.overallStage,
      riskStatus: j.riskStatus,
      dataQuality: j.dataQuality
    },
    planning: {
      taStatus: 'APPROVED',
      taPlanDate: j.dates?.tnaPlan,
      poReceivedDate: j.dates?.poReceived,
      cuttingStart: j.dates?.cuttingStart,
      cuttingEnd: j.dates?.cuttingEnd,
      sewingStart: j.dates?.sewingStart,
      sewingEnd: j.dates?.sewingEnd,
      exFactoryDate: j.dates?.exFactory,
      cargoClosingDate: j.dates?.cargoClosing,
      line: j.lineAllocation?.line,
      floor: j.lineAllocation?.floor
    },
    production: {
      fabricRequired: j.fabric?.fabricReqKg,
      fabricReceived: j.fabric?.fabricReceivedKg,
      fabricBalance: j.fabric?.fabricBalanceKg,
      cuttingQty: j.cutting?.cuttingQty,
      inputQty: j.sewing?.inputQty,
      packingQty: j.finishing?.packingQty,
      shipQty: j.shipment?.shipQty
    },
    sectionData: {
      yarn: { status: j.yarn?.status, requiredKg: j.yarn?.yarnReqKg, lotNo: j.yarn?.yarnLotNo },
      procurement: { status: 'COMPLETE', supplier: 'NFL Approved Mill' },
      yarnStore: { status: j.yarn?.status, receivedKg: j.yarn?.yarnReceivedKg, issuedKg: j.yarn?.yarnIssuedKg, balanceKg: j.yarn?.yarnBalanceKg, lotNo: j.yarn?.yarnLotNo },
      yarnDyeing: { status: j.yarn?.status, requiredKg: j.yarn?.yarnReqKg },
      knitting: { status: j.knitting?.status, requiredKg: j.knitting?.greyReqKg, producedKg: j.knitting?.greyProducedKg, balanceKg: j.knitting?.greyBalanceKg },
      greigeStore: { status: 'READY', stockKg: j.knitting?.greyProducedKg },
      dyeing: { status: j.fabric?.additionalProcess ? 'COMPLETED' : 'IN_PROGRESS', factory: j.fabric?.dyeingFactory, batchNo: j.fabric?.dyeBatchNo, requiredKg: j.fabric?.fabricReqKg },
      labTesting: { status: 'PASS', cfTest: 'Grade 4-5', pilling: 'Grade 4' },
      fabricFinishing: { status: 'COMPLETED', process: j.fabric?.additionalProcess || 'Standard Stenter + Compacting' },
      finishedFabricStore: { status: 'READY', receivedKg: j.fabric?.fabricReceivedKg, balanceKg: j.fabric?.fabricBalanceKg },
      cutting: { status: j.cutting?.status, cutQty: j.cutting?.cuttingQty, balanceQty: j.cutting?.cuttingBalance },
      printing: { status: j.printEmb?.status, applicable: Boolean(j.printEmb?.type && j.printEmb.type.includes('Printing')), sendQty: j.printEmb?.sendQty, receiveQty: j.printEmb?.recvQty },
      embroidery: { status: j.printEmb?.status, applicable: Boolean(j.printEmb?.type && j.printEmb.type.includes('Embroidery')), sendQty: j.printEmb?.sendQty, receiveQty: j.printEmb?.recvQty },
      sewing: { status: j.sewing?.status, line: j.lineAllocation?.line, readyForInput: j.sewing?.readyForInput, inputQty: j.sewing?.inputQty, actualQty: j.sewing?.sewingActualQty, balanceQty: j.sewing?.sewingBalance, achievement: `${j.sewing?.achievementPct}%`, smv: j.ie?.smv, efficiency: `${j.ie?.efficiencyPct}%` },
      finishing: { status: 'COMPLETED', finishedQty: j.finishing?.finishingQty, packingQty: j.finishing?.packingQty },
      shipment: { status: j.shipment?.status, shipQty: j.shipment?.shipQty, balanceQty: j.shipment?.shipBalance, exFactory: j.dates?.exFactory, ccd: j.dates?.cargoClosing }
    },
    qualityHistory: [
      { section: '1. Knitting Greige Audit', rootLabel: 'Knitting Shed #1 · Machine #14', releaseStatus: 'RELEASED', enteredBy: 'Md. Rafiqul Islam (QI-KN04)', releasedAt: j.dates?.tnaPlan, sampleQty: `${fmt(j.knitting?.greyProducedKg || 2400)} kg inspected`, remark: 'Minor Lycra tension variation rectified; loop length ±2% within buyer tolerance.' },
      { section: '2. Greige Store Roll Check', rootLabel: 'Greige Fabric Store Bay 4', releaseStatus: 'RELEASED', enteredBy: 'M. A. Mannan (Store QC Lead)', releasedAt: j.dates?.tnaPlan, sampleQty: '100% Roll Barcode & Weight', remark: 'GSM 180 verified, 4-point inspection passed (<18 points/100 sq.yd).' },
      { section: '3. Dyeing & Lab Dip Shade Approval', rootLabel: 'Dyeing Floor Winch #06', releaseStatus: 'RELEASED', enteredBy: 'Dr. Nazrul Islam (Dyeing Lab Head)', releasedAt: j.dates?.cuttingStart, sampleQty: `Full Batch (${fmt(j.fabric?.fabricReceivedKg || 2350)} kg)`, remark: `Shade matched vs master swatch under D65 / CWF. Batch: ${j.fabric?.dyeBatchNo || 'Standard'}` },
      { section: '4. Finished Fabric Store Inspection', rootLabel: 'Finished Fabric Store Rack B-12', releaseStatus: 'RELEASED', enteredBy: 'Jashim Uddin (QC Controller)', releasedAt: j.dates?.cuttingStart, sampleQty: `${fmt(j.fabric?.fabricReceivedKg || 2350)} kg delivered`, remark: 'Color fastness to wash Grade 4-5, shrinkage within allowable -3%.' },
      { section: '5. Cutting Spread & Notch Inspection', rootLabel: 'Cutting Floor 1 · Auto Spreader #2', releaseStatus: 'RELEASED', enteredBy: 'Aminul Islam (Cutting QI)', releasedAt: j.dates?.cuttingStart, sampleQty: `${fmt(j.orderQty)} Cut Pcs`, remark: 'Pattern grain line & bundle numbering 100% verified; zero marker overlap.' },
      { section: '6. Print & Embroidery Audit', rootLabel: 'Print / Embroidery Unit 1', releaseStatus: 'RELEASED', enteredBy: 'Shahidul Alam (Print QI Officer)', releasedAt: j.dates?.sewingStart, sampleQty: '100 Pcs Strike-off + Run Sample', remark: 'Strike-off wash fastness passed, sharp edge registration maintained.' },
      { section: '7. Sewing In-line & End-line Audit', rootLabel: `${j.lineAllocation?.factory || 'NFL'} · Floor ${j.lineAllocation?.floor || '1'} · Line ${j.lineAllocation?.line || '14B'}`, releaseStatus: 'RELEASED', enteredBy: 'Tariqul Hasan (Senior Sewing QI)', releasedAt: j.dates?.sewingStart, sampleQty: `${fmt(j.orderQty)} Sewing Pcs`, remark: 'SPI 12 maintained; minor skip stitch at sleeve hem corrected during line balancing.' },
      { section: '8. Finishing & Ironing Inspection', rootLabel: 'Finishing Floor 1 · Tunnel Steam Press', releaseStatus: 'RELEASED', enteredBy: 'Rezaul Karim (Finishing QC Controller)', releasedAt: j.dates?.sewingEnd, sampleQty: `${fmt(j.orderQty)} Finished Garments`, remark: 'Ironing shine check ok; needle detector 1.0mm ferrous test 100% passed.' },
      { section: '9. Final Inspection & OQL Audit', rootLabel: 'Central QA Audit Room · AQL 2.5', releaseStatus: 'RELEASED', enteredBy: 'Kabir Hossain (Quality Assurance Manager)', releasedAt: j.dates?.exFactory, sampleQty: '315 Pcs (AQL Level II Sample)', remark: 'Carton barcode, drop test, needle detection 100% passed; final shipment release signed.' }
    ],
    testReports: [
      { reportType: 'Color Fastness to Washing (ISO 105-C06)', reportRef: `LAB-CF-${j.jobNo}`, testDate: j.dates?.cuttingStart, result: 'PASS (Grade 4-5)', remarks: 'Meets buyer requirement', attachmentName: 'CF_Wash_Report.pdf' },
      { reportType: 'Pilling Resistance (Martindale ISO 12945-2)', reportRef: `LAB-PIL-${j.jobNo}`, testDate: j.dates?.cuttingStart, result: 'PASS (Grade 4)', remarks: '2000 revs no pilling', attachmentName: 'Pilling_Report.pdf' },
      { reportType: 'Dimensional Stability / Shrinkage', reportRef: `LAB-SHR-${j.jobNo}`, testDate: j.dates?.cuttingStart, result: 'PASS (Length -3%, Width -2%)', remarks: 'Within allowable ±4%', attachmentName: 'Shrinkage_Report.pdf' }
    ],
    leadTimeHistory: [
      { section: '1. PO Order Confirmation to T&A', plannedStart: j.dates?.poReceived, actualStart: j.dates?.poReceived, plannedFinish: j.dates?.tnaPlan, actualFinish: j.dates?.tnaPlan, varianceDays: 0, status: 'ON TIME', reason: 'Normal workflow' },
      { section: '2. Fabric & Yarn Inhouse Delivery', plannedStart: j.dates?.tnaPlan, actualStart: j.dates?.tnaPlan, plannedFinish: j.dates?.cuttingStart, actualFinish: j.dates?.cuttingStart, varianceDays: 0, status: 'ON TIME', reason: 'Fabric delivered on schedule' },
      { section: '3. Cutting Floor Execution', plannedStart: j.dates?.cuttingStart, actualStart: j.dates?.cuttingStart, plannedFinish: j.dates?.cuttingEnd, actualFinish: j.dates?.cuttingEnd, varianceDays: 0, status: 'ON TIME', reason: 'Cutting finished on target' },
      { section: '4. Sewing Line Production Output', plannedStart: j.dates?.sewingStart, actualStart: j.dates?.sewingStart, plannedFinish: j.dates?.sewingEnd, actualFinish: j.dates?.sewingEnd, varianceDays: 0, status: 'ON TIME', reason: `Completed on Line ${j.lineAllocation?.line}` },
      { section: '5. Finishing & Final Inspection Delivery', plannedStart: j.dates?.sewingEnd, actualStart: j.dates?.sewingEnd, plannedFinish: j.dates?.exFactory, actualFinish: j.dates?.exFactory, varianceDays: 0, status: 'ON TIME', reason: 'Shipped as per schedule' },
      { section: '6. Cargo Closing & Port Delivery', plannedStart: j.dates?.exFactory, actualStart: j.dates?.exFactory, plannedFinish: j.dates?.cargoClosing, actualFinish: j.dates?.cargoClosing, varianceDays: 0, status: 'ON TIME', reason: 'Forwarder delivery completed' }
    ]
  };
}

export default function JobHistoryWorkspace({ mode = 'job360' }: { mode?: Mode }) {
  const masterRawJobs = (demo2000DataRaw as any)?.jobs || [];
  const initialMasterJobs = useMemo(() => {
    return masterRawJobs.map((j: any) => ({
      id: j.id,
      jobNo: j.jobNo,
      buyer: j.buyer,
      buyerCode: j.buyer,
      styleNo: j.styleNo,
      itemDescription: j.itemDescription,
      orderQty: j.orderQty,
      ccd: j.dates?.exFactory || j.dates?.cargoClosing || null,
      presentStatus: j.presentStatus || 'Confirmed',
      qualityStatus: j.finishing?.inspectionStatus || 'PASSED',
      shipmentStatus: j.shipment?.status || 'SCHEDULED',
      _raw: j
    }));
  }, [masterRawJobs]);

  const [jobs, setJobs] = useState<any[]>(initialMasterJobs);
  const [selected, setSelected] = useState(initialMasterJobs[0]?.id || '');
  const [detail, setDetail] = useState<any>(initialMasterJobs[0] ? formatDetailFromMaster(initialMasterJobs[0]._raw) : null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState(mode === 'quality' ? 'quality' : mode === 'leadtime' ? 'leadtime' : 'production');

  useEffect(() => {
    api('/demo/job360').then((rows) => {
      if (Array.isArray(rows) && rows.length > 0) {
        setJobs(rows);
        if (rows[0]) setSelected(rows[0].id);
      }
    }).catch(() => {
      // Keep initial master jobs fallback
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    const foundMaster = jobs.find((x) => x.id === selected);
    if (foundMaster?._raw) {
      setDetail(formatDetailFromMaster(foundMaster._raw));
      return;
    }
    setDetail(null);
    api(`/demo/job360/${selected}`).then(setDetail).catch(() => {
      if (foundMaster?._raw) setDetail(formatDetailFromMaster(foundMaster._raw));
    });
  }, [selected, jobs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => `${displayJobNo(j.jobNo,j.buyerCode||j.buyer)} ${j.styleNo} ${j.itemDescription}`.toLowerCase().includes(q));
  }, [jobs, query]);

  const title = mode === 'quality' ? 'Job Quality History' : mode === 'leadtime' ? 'Lead Time & Delivery History' : 'Job 360';

  if (loading) return <section className="panel"><div className="empty-state"><strong>Loading demo jobs…</strong></div></section>;
  if (!jobs.length) return <section className="panel"><div className="empty-state"><strong>No jobs available</strong><span>Import or create real job data first.</span></div></section>;

  return <div className="history-workspace">
    <section className="history-picker panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">{title}</div>
          <div className="panel-sub">
            <strong>2,000 Realistic Demo Jobs (Aug–Nov 2026)</strong> · 10,175,057 Pcs across 91 lines (NFL 52 + NCL 39) · Choose any job to inspect connected section data.
          </div>
        </div>
        <span className="status-pill good">2,000 JOBS LOADED</span>
      </div>
      <div className="history-picker-row">
        <input className="history-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Buyer Job No / Style / Item / Color among 2,000 jobs…" />
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {filtered.slice(0, 300).map((j) => <option value={j.id} key={j.id}>{displayJobNo(j.jobNo,j.buyerCode||j.buyer)} · {j.styleNo} · {fmt(j.orderQty)} pcs</option>)}
        </select>
        {filtered.length > 300 && (
          <span style={{ fontSize: 11, color: '#64748b', alignSelf: 'center' }}>
            Showing 300 of {filtered.length.toLocaleString()} matching jobs
          </span>
        )}
      </div>
    </section>

    {detail && <>
      <section className="job360-head panel">
        <div className="job360-title"><div className="job360-image">{detail.order.itemImageUrl ? <img src={detail.order.itemImageUrl} alt="Item" /> : <span>ITEM</span>}</div><div><div className="page-eyebrow">Buyer Job No</div><h2>{displayJobNo(detail.order.jobNo,detail.order.buyerCode||detail.order.buyer)} · {detail.order.styleNo}</h2><p>{detail.order.itemDescription || '—'}</p></div></div>
        <div className="job360-facts">
          <div><span>Order Qty</span><strong>{fmt(detail.order.orderQty)} pcs</strong></div><div><span>FOB</span><strong>{detail.order.fobPrice ? `$${fmt(detail.order.fobPrice)}` : '—'}</strong></div><div><span>CCD / Ship</span><strong>{date(detail.order.ccd)}</strong></div><div><span>PO</span><strong>{fmt(detail.order.poNo)}</strong></div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link href={`/jobs/${encodeURIComponent(detail.order.jobNo)}`} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '11px', fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Full 360 View ↗
            </Link>
          </div>
        </div>
      </section>

      {mode === 'job360' && <div className="workspace-tabs history-tabs">
        <button type="button" className={tab === 'production' ? 'active' : ''} onClick={() => setTab('production')}>Stage Production &amp; IE</button>
        <button type="button" className={tab === 'tests' ? 'active' : ''} onClick={() => setTab('tests')}>Lab Test Reports</button>
        <button type="button" className={tab === 'quality' ? 'active' : ''} onClick={() => setTab('quality')}>Quality History &amp; Audits</button>
        <button type="button" className={tab === 'leadtime' ? 'active' : ''} onClick={() => setTab('leadtime')}>T&amp;A Schedule &amp; Lead Time</button>
      </div>}

      {(tab === 'production' && mode === 'job360') && <section className="panel">
        <div className="panel-head"><div><div className="panel-title">End-to-end production position</div><div className="panel-sub">Every demo job has Yarn → Shipment data so every section can be tested.</div></div></div>
        <div className="section360-grid">
          {productionSections.map(([key, label]) => {
            const row = detail.sectionData?.[key] || {};
            const st = row.status || row.latestStatus || row.overallStatus || (row.applicable === false ? 'N/A' : 'Demo');
            const entries = Object.entries(row).filter(([k, v]) => !['status','latestStatus','overallStatus','reports','history','applicable'].includes(k) && typeof v !== 'object').slice(0, 4);
            return <div className="section360-card" key={key}><div className="section360-card-head"><strong>{label}</strong><span className={`history-status ${statusClass(st)}`}>{st}</span></div>{entries.map(([k,v]) => <div className="section360-line" key={k}><span>{k.replace(/([A-Z])/g,' $1')}</span><b>{k.toLowerCase().includes('date') || k.toLowerCase().includes('eta') || k.toLowerCase().includes('start') ? date(v) : fmt(v)}</b></div>)}</div>;
          })}
        </div>
      </section>}

      {(tab === 'tests' && mode === 'job360') && <section className="panel"><div className="panel-head"><div><div className="panel-title">Testing Lab Reports</div><div className="panel-sub">Demo follows the regular Testing Lab report source: CF Test and Inhouse Pilling Test.</div></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Test</th><th>Report Ref</th><th>Date</th><th>Result</th><th>Retest</th><th>Remarks</th><th>Attachment</th></tr></thead><tbody>{(detail.testReports || []).map((r:any)=><tr key={r.reportRef}><td><strong>{r.reportType}</strong></td><td>{r.reportRef}</td><td>{date(r.testDate)}</td><td><span className={`history-status ${statusClass(r.result)}`}>{r.result}</span></td><td>{r.retest ? `${r.retest.reportRef} · ${r.retest.result}` : '—'}</td><td>{r.remarks || '—'}</td><td>{r.attachmentName || '—'}</td></tr>)}</tbody></table></div></section>}

      {(tab === 'quality' || mode === 'quality') && <section className="panel"><div className="panel-head"><div><div className="panel-title">Section / Floor Quality History & Root Cause Log</div><div className="panel-sub">Verified records from Knitting to Final Inspection by designated Floor QI and Controllers with inspected production pcs.</div></div></div><div className="quality-timeline">{(detail.qualityHistory || []).map((q:any)=><div className="quality-history-row" key={q.section} style={{ display: 'grid', gridTemplateColumns: '28px minmax(140px, 1.2fr) minmax(130px, 1fr) 90px 90px minmax(180px, 2fr)', gap: '10px', alignItems: 'center' }}><div className={`quality-marker ${statusClass(q.releaseStatus)}`}>{q.releaseStatus === 'RELEASED' ? '✓' : q.releaseStatus === 'HOLD' ? '!' : '·'}</div><div><strong style={{ fontSize: '12px' }}>{q.section}</strong><span style={{ fontSize: '10px', color: '#64748b' }}>{q.rootLabel || 'Floor Section'}</span></div><div><span style={{ fontSize: '11px', fontWeight: 600 }}>{q.enteredBy}</span><span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>{q.sampleQty || 'Production Sample'}</span></div><span className={`history-status ${statusClass(q.releaseStatus)}`}>{q.releaseStatus}</span><div><span className="muted-label" style={{ fontSize: '9px' }}>Release Date</span><strong style={{ fontSize: '11px' }}>{date(q.releasedAt)}</strong></div><div className="quality-remark" style={{ fontSize: '11px' }}>{q.remark || 'No exception remark'}</div></div>)}</div><div className="lab-link-note"><strong>Testing Lab remains the detailed regular report source.</strong> Its test reports are available in Job 360 → Test Reports.</div></section>}

      {(tab === 'leadtime' || mode === 'leadtime') && <section className="panel"><div className="panel-head"><div><div className="panel-title">Planned vs Actual Lead Time</div><div className="panel-sub">Planning view: milestone timing, production delivery, delay days and delay reason — not full QC detail.</div></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Section / Milestone</th><th>Planned Start</th><th>Actual Start</th><th>Planned Finish</th><th>Actual Finish</th><th>Variance</th><th>Status</th><th>Reason</th></tr></thead><tbody>{(detail.leadTimeHistory || []).map((r:any)=><tr key={r.section}><td><strong>{r.section}</strong></td><td>{date(r.plannedStart)}</td><td>{date(r.actualStart)}</td><td>{date(r.plannedFinish)}</td><td>{date(r.actualFinish)}</td><td>{r.varianceDays === null || r.varianceDays === undefined ? '—' : `${r.varianceDays > 0 ? '+' : ''}${r.varianceDays} day`}</td><td><span className={`history-status ${statusClass(r.status)}`}>{r.status}</span></td><td>{r.reason || '—'}</td></tr>)}</tbody></table></div></section>}
    </>}
  </div>;
}
