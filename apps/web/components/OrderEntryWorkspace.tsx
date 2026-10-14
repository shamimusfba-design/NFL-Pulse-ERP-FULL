'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';

type Breakdown = { color: string; size: string; qty: number };
type RefRow = {
  poNumber: string;
  totalQty: number;
  ccd: string;
  shipmentDate: string;
  referenceType: string;
  destination: string;
  market: string;
  breakdowns: Breakdown[];
};
type StyleRow = {
  styleNo: string;
  itemDescription: string;
  itemImageUrl: string;
  itemImageName: string;
  fobPrice: number;
  quantity: number;
  breakdowns: Breakdown[];
  pos: RefRow[];
};

const emptyRef = (market = false): RefRow => ({
  poNumber: '',
  totalQty: 0,
  ccd: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  shipmentDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  referenceType: market ? 'MARKET' : 'PO',
  destination: '',
  market: '',
  breakdowns: []
});

const emptyStyle = (): StyleRow => ({
  styleNo: '',
  itemDescription: '',
  itemImageUrl: '',
  itemImageName: '',
  fobPrice: 4.5,
  quantity: 5000,
  breakdowns: [
    { color: 'Navy Blazer', size: 'S', qty: 1000 },
    { color: 'Navy Blazer', size: 'M', qty: 1500 },
    { color: 'Navy Blazer', size: 'L', qty: 1500 },
    { color: 'Navy Blazer', size: 'XL', qty: 1000 }
  ],
  pos: []
});

function flattenImportedColors(colors: any[]): Breakdown[] {
  return (colors || []).flatMap((c: any) =>
    (c.sizes || []).map((s: any) => ({
      color: String(c.color || ''),
      size: String(s.size || ''),
      qty: Number(s.qty || 0)
    }))
  ).filter((x: Breakdown) => x.color && x.size && x.qty > 0);
}

function aggregateBreakdowns(rows: Breakdown[]): Breakdown[] {
  const map = new Map<string, Breakdown>();
  rows.forEach(r => {
    const key = `${r.color}|||${r.size}`;
    const cur = map.get(key) || { color: r.color, size: r.size, qty: 0 };
    cur.qty += Number(r.qty || 0);
    map.set(key, cur);
  });
  return [...map.values()];
}

function breakdownSummary(rows: Breakdown[]) {
  if (!rows.length) return 'No sizes entered';
  const cCount = new Set(rows.map(x => x.color)).size;
  const sCount = new Set(rows.map(x => x.size)).size;
  const total = rows.reduce((s, x) => s + Number(x.qty || 0), 0);
  return `${cCount} color · ${sCount} size · ${total.toLocaleString()} pcs`;
}

function importedColorTotal(color: any) {
  return (color?.sizes || []).reduce((s: number, x: any) => s + Number(x?.qty || 0), 0);
}

function importedGrand(colors: any[]) {
  return (colors || []).reduce((s: number, c: any) => s + importedColorTotal(c), 0);
}

export default function OrderEntryWorkspace() {
  const [buyers, setBuyers] = useState<any[]>([
    { id: 'b-only', name: 'ONLY (Bestseller)', code: 'ONLY' },
    { id: 'b-ovs', name: 'OVS (Italy)', code: 'OVS' },
    { id: 'b-nameit', name: 'Name It (Kids)', code: 'Name It' },
    { id: 'b-utg', name: 'UTG (United Textiles)', code: 'UTG' },
    { id: 'b-newlook', name: 'New Look & Selfridge', code: 'New Look' },
    { id: 'b-maurices', name: 'Maurices', code: 'Maurices' },
    { id: 'b-jackjones', name: 'Jack & Jones', code: 'Jack & Jones' },
    { id: 'b-veromoda', name: 'Vero Moda', code: 'Vero Moda' },
    { id: 'b-selected', name: 'Selected', code: 'Selected' }
  ]);
  const [buyerId, setBuyerId] = useState('b-only');
  const [jobType, setJobType] = useState<'NEW' | 'REPEAT'>('NEW');
  const [repeatBaseJobNo, setRepeatBaseJobNo] = useState('');
  const [repeatLotNo, setRepeatLotNo] = useState('1st');
  const [baseJobOptions, setBaseJobOptions] = useState<string[]>([]);
  const [sequence, setSequence] = useState<any>({ lastJobNo: 48092, nextJobNo: 48093 });
  const [sequenceInput, setSequenceInput] = useState('');

  const [activeTab, setActiveTab] = useState<'manual' | 'import' | 'recent'>('manual');
  const [styles, setStyles] = useState<StyleRow[]>([
    {
      styleNo: '13251506',
      itemDescription: 'Crew Neck Knit Top - Short Sleeve',
      itemImageUrl: '',
      itemImageName: '',
      fobPrice: 4.85,
      quantity: 12000,
      breakdowns: [
        { color: 'Navy Blazer', size: 'S', qty: 2400 },
        { color: 'Navy Blazer', size: 'M', qty: 3600 },
        { color: 'Navy Blazer', size: 'L', qty: 3600 },
        { color: 'Navy Blazer', size: 'XL', qty: 2400 }
      ],
      pos: []
    }
  ]);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [reviewApproved, setReviewApproved] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [createdJob, setCreatedJob] = useState<any | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  // Modal editors
  const [breakEditor, setBreakEditor] = useState<{
    styleIndex: number;
    sizes: string[];
    colors: { name: string; qtys: Record<string, number> }[];
  } | null>(null);
  const [newSizeLabel, setNewSizeLabel] = useState('');

  // Load masters & existing orders
  const refreshSequence = () => api('/orders/job-sequence').then(setSequence).catch(() => {});
  const refreshBaseJobs = () => api('/orders/repeat-bases').then(setBaseJobOptions).catch(() => {});
  const loadOrders = () => {
    api('/orders')
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          setRecentOrders(data.slice(0, 15));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    api('/masters/buyers')
      .then((b: any[]) => {
        if (b && b.length) {
          setBuyers(b);
          setBuyerId(b[0]?.id || 'b-only');
        }
      })
      .catch(() => {});
    refreshSequence();
    refreshBaseJobs();
    loadOrders();
  }, []);

  const selectedBuyer = useMemo(() => buyers.find(x => x.id === buyerId) || buyers[0], [buyers, buyerId]);
  const isOvs = /\bOVS\b/i.test(String(selectedBuyer?.name || ''));

  const updateStyle = (i: number, k: keyof StyleRow, v: any) => {
    setStyles(cur => cur.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));
  };

  // Open breakdown editor
  const openBreakEditor = (styleIndex: number) => {
    const s = styles[styleIndex];
    const sizes = Array.from(new Set(s.breakdowns.map(x => x.size).filter(Boolean)));
    const colors = Array.from(new Set(s.breakdowns.map(x => x.color).filter(Boolean)));
    const activeSizes = sizes.length ? sizes : ['S', 'M', 'L', 'XL'];
    const activeColors = colors.length ? colors : ['Navy Blazer'];

    setBreakEditor({
      styleIndex,
      sizes: activeSizes,
      colors: activeColors.map(name => ({
        name,
        qtys: Object.fromEntries(
          activeSizes.map(sz => [sz, s.breakdowns.find(x => x.color === name && x.size === sz)?.qty || 0])
        )
      }))
    });
  };

  const applySizeTemplate = (templateSizes: string[]) => {
    if (!breakEditor) return;
    setBreakEditor({
      ...breakEditor,
      sizes: templateSizes,
      colors: breakEditor.colors.map(c => ({
        name: c.name,
        qtys: Object.fromEntries(templateSizes.map(sz => [sz, c.qtys[sz] || 0]))
      }))
    });
  };

  const addCustomSize = () => {
    const lbl = newSizeLabel.trim().toUpperCase();
    if (!lbl || !breakEditor || breakEditor.sizes.includes(lbl)) return;
    setBreakEditor({
      ...breakEditor,
      sizes: [...breakEditor.sizes, lbl],
      colors: breakEditor.colors.map(c => ({
        name: c.name,
        qtys: { ...c.qtys, [lbl]: 0 }
      }))
    });
    setNewSizeLabel('');
  };

  const saveBreakdownModal = () => {
    if (!breakEditor) return;
    const newBreakdowns: Breakdown[] = [];
    let totalQty = 0;

    breakEditor.colors.forEach(c => {
      breakEditor.sizes.forEach(sz => {
        const q = Number(c.qtys[sz] || 0);
        if (c.name.trim() && q > 0) {
          newBreakdowns.push({ color: c.name.trim(), size: sz, qty: q });
          totalQty += q;
        }
      });
    });

    setStyles(cur =>
      cur.map((s, idx) =>
        idx === breakEditor.styleIndex
          ? {
              ...s,
              breakdowns: newBreakdowns,
              quantity: totalQty > 0 ? totalQty : s.quantity
            }
          : s
      )
    );
    setBreakEditor(null);
  };

  // Submit manual order
  const handleSaveManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setBusy(true);

    if (jobType === 'REPEAT' && (!repeatBaseJobNo || !repeatLotNo)) {
      setMessage('⚠ Repeat Job requires a Base Job Number and Repeat Lot identifier (e.g. 1st / 2nd).');
      setBusy(false);
      return;
    }

    try {
      // Auto-synthesize default PO reference if not explicitly added by user
      const preparedStyles = styles.map((s, idx) => {
        let pos = s.pos;
        if (!pos || pos.length === 0) {
          const defaultShipDate = new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10);
          pos = [
            {
              poNumber: isOvs ? `OVS-MKT-${s.styleNo || idx + 1}` : `PO-${s.styleNo || idx + 1}-MAIN`,
              totalQty: Number(s.quantity) || 5000,
              ccd: defaultShipDate,
              shipmentDate: defaultShipDate,
              referenceType: isOvs ? 'MARKET' : 'PO',
              destination: isOvs ? 'ITALY' : 'EU CENTRAL',
              market: isOvs ? 'ITALY' : 'GERMANY',
              breakdowns: s.breakdowns
            }
          ];
        }

        return {
          styleNo: s.styleNo.trim() || `ST-${Date.now().toString().slice(-6)}`,
          itemDescription: s.itemDescription.trim() || 'Knit Casual Garment',
          fobPrice: Number(s.fobPrice) || 4.5,
          quantity: Number(s.quantity) || 5000,
          breakdowns: s.breakdowns,
          pos
        };
      });

      const payload = {
        buyerId,
        jobType,
        repeatBaseJobNo: jobType === 'REPEAT' ? repeatBaseJobNo : undefined,
        repeatLotNo: jobType === 'REPEAT' ? repeatLotNo : undefined,
        styles: preparedStyles
      };

      const res = await api('/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const newJobNo = res?.order?.jobNo || String(sequence?.nextJobNo || '48093');
      setCreatedJob({
        jobNo: newJobNo,
        buyer: selectedBuyer?.name || 'ONLY',
        qty: preparedStyles.reduce((sum, st) => sum + st.quantity, 0),
        styleNo: preparedStyles[0]?.styleNo
      });

      setMessage(`✓ Order successfully registered! Job No: ${newJobNo} created with ${preparedStyles.length} style(s).`);
      refreshSequence();
      refreshBaseJobs();
      loadOrders();

      // Reset style form with new blank
      setStyles([emptyStyle()]);
    } catch (err: any) {
      setMessage(`❌ Failed to save order: ${err.message || 'Server error'}`);
    } finally {
      setBusy(false);
    }
  };

  // Real file upload & parsing handler
  const handleFileUpload = async (uploadedFile?: File) => {
    if (!uploadedFile) return;
    // 1. Clear previous parsed state, messages, warnings, and review approvals
    setFile(uploadedFile);
    setPreview(null);
    setMessage('');
    setImportWarnings([]);
    setReviewApproved(false);
    setBusy(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      if (selectedBuyer?.name) {
        formData.append('buyerCode', selectedBuyer.name);
      }
      const res = await api('/orders/import/preview', {
        method: 'POST',
        body: formData
      });

      if (res?.error) {
        throw new Error(res.error);
      }

      setPreview(res);
      setImportWarnings(res.warnings || []);
      const isValidated = res.validation?.status === 'VALIDATED';
      if (isValidated) {
        setMessage(`✓ File "${uploadedFile.name}" parsed and reconciled 100%! All internal checks passed.`);
      } else {
        setMessage(`⚠️ File "${uploadedFile.name}" parsed with items requiring review. Check discrepancies below.`);
      }
    } catch (err: any) {
      setPreview(null);
      setMessage(`❌ Failed to parse "${uploadedFile.name}": ${err.message || 'Check file format or contents.'}`);
    } finally {
      setBusy(false);
    }
  };

  // Quick load demo import (strictly isolated demo fixture for testing only)
  const loadDemoImport = (type: 'bestseller' | 'ovs') => {
    setBusy(true);
    setFile(null); // Clear real file so UI indicates this is an isolated demo fixture
    setMessage('');
    setImportWarnings([]);
    setReviewApproved(false);
    setTimeout(() => {
      if (type === 'bestseller') {
        setBuyerId('b-only');
        setPreview({
          parserFamily: 'BESTSELLER',
          parserVersion: 'v2.4-demo-fixture',
          sourceFileName: 'DEMO_BESTSELLER_FIXTURE.pdf',
          validation: {
            status: 'VALIDATED',
            checks: [
              { code: 'STYLE_COLOR_TOTAL', ok: true, message: 'Style quantities reconcile with Color × Size total ✓' },
              { code: 'ORDER_REFERENCE_TOTAL', ok: true, message: 'PO allocation matches style total ✓' }
            ]
          },
          styles: [
            {
              styleNo: '13251506',
              styleDescription: 'Crew Neck Knit Top - Short Sleeve',
              totalQty: 12000,
              collection: 'Autumn 26',
              season: 'Fall/Winter',
              colors: [
                {
                  color: 'Navy Blazer',
                  colorCode: '19-3921',
                  totalQty: 12000,
                  sizes: [
                    { size: 'S', qty: 2400 },
                    { size: 'M', qty: 3600 },
                    { size: 'L', qty: 3600 },
                    { size: 'XL', qty: 2400 }
                  ]
                }
              ],
              orderReferences: [
                {
                  reference: 'PO-48093-GERMANY',
                  referenceType: 'PO',
                  totalQty: 6000,
                  ccd: '2026-10-25',
                  market: 'Germany Direct',
                  colors: [
                    {
                      color: 'Navy Blazer',
                      sizes: [
                        { size: 'S', qty: 1200 },
                        { size: 'M', qty: 1800 },
                        { size: 'L', qty: 1800 },
                        { size: 'XL', qty: 1200 }
                      ]
                    }
                  ]
                },
                {
                  reference: 'PO-48093-FRANCE',
                  referenceType: 'PO',
                  totalQty: 6000,
                  ccd: '2026-11-05',
                  market: 'France Direct',
                  colors: [
                    {
                      color: 'Navy Blazer',
                      sizes: [
                        { size: 'S', qty: 1200 },
                        { size: 'M', qty: 1800 },
                        { size: 'L', qty: 1800 },
                        { size: 'XL', qty: 1200 }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        });
      } else {
        setBuyerId('b-ovs');
        setPreview({
          parserFamily: 'OVS',
          parserVersion: 'v2.4-demo-fixture',
          sourceFileName: 'DEMO_OVS_FIXTURE.pdf',
          validation: {
            status: 'VALIDATED',
            checks: [
              { code: 'STYLE_COLOR_TOTAL', ok: true, message: 'Style quantities reconcile with Color × Size total ✓' },
              { code: 'ORDER_REFERENCE_TOTAL', ok: true, message: 'Country/Market allocation matches style total ✓' }
            ]
          },
          styles: [
            {
              styleNo: 'OVS-99421',
              styleDescription: 'Cotton Pique Polo - Regular Fit',
              totalQty: 8500,
              collection: 'Spring 26',
              season: 'Spring/Summer',
              colors: [
                {
                  color: 'Optical White',
                  colorCode: '11-0601',
                  totalQty: 8500,
                  sizes: [
                    { size: 'S', qty: 1700 },
                    { size: 'M', qty: 2550 },
                    { size: 'L', qty: 2550 },
                    { size: 'XL', qty: 1700 }
                  ]
                }
              ],
              orderReferences: [
                {
                  reference: 'OVS-ITALY-CENTRAL',
                  referenceType: 'MARKET',
                  totalQty: 8500,
                  ccd: '2026-11-15',
                  market: 'ITALY WAREHOUSE',
                  colors: [
                    {
                      color: 'Optical White',
                      sizes: [
                        { size: 'S', qty: 1700 },
                        { size: 'M', qty: 2550 },
                        { size: 'L', qty: 2550 },
                        { size: 'XL', qty: 1700 }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        });
      }
      setBusy(false);
      setMessage(`⚡ Demo ${type === 'bestseller' ? 'Bestseller' : 'OVS'} fixture loaded (isolated sample data).`);
    }, 200);
  };

  // Confirm import
  const handleConfirmImport = async () => {
    if (!preview) return;
    const isValidated = preview.validation?.status === 'VALIDATED';
    if (!isValidated && !reviewApproved) {
      setMessage('⚠️ Please review the parser warnings and check the approval box before confirming.');
      return;
    }
    setBusy(true);
    setMessage('');

    try {
      const res = await api('/orders/import/confirm', {
        method: 'POST',
        body: JSON.stringify({
          buyerId,
          preview,
          approveNeedReview: isValidated ? false : reviewApproved,
          jobType,
          repeatBaseJobNo: jobType === 'REPEAT' ? repeatBaseJobNo : undefined,
          repeatLotNo: jobType === 'REPEAT' ? repeatLotNo : undefined
        })
      });

      if (res?.error) {
        throw new Error(res.error);
      }

      const newJobNo = res?.jobNo || String(sequence?.nextJobNo || '48093');
      const totalPcs = (preview.styles || []).reduce((acc: number, s: any) => acc + (s.totalQty || 0), 0);

      setCreatedJob({
        jobNo: newJobNo,
        buyer: selectedBuyer?.name || preview.buyerCode || 'Buyer',
        qty: totalPcs,
        styleNo: preview.styles?.[0]?.styleNo
      });

      setMessage(`✓ Import confirmed! Job ${newJobNo} registered and released for Production Lots (${totalPcs.toLocaleString()} pcs across ${preview.styles.length} style(s)).`);
      setPreview(null);
      setFile(null);
      setImportWarnings([]);
      setReviewApproved(false);
      refreshSequence();
      refreshBaseJobs();
      loadOrders();
    } catch (err: any) {
      setMessage(`❌ Failed to confirm import: ${err.message || 'Server error'}`);
    } finally {
      setBusy(false);
    }
  };

  // Set sequence manually (admin)
  const handleSetSequence = async () => {
    const n = Number(sequenceInput);
    if (!n) return;
    try {
      const res = await api('/orders/job-sequence', {
        method: 'POST',
        body: JSON.stringify({ lastJobNo: n })
      });
      setSequence(res);
      setSequenceInput('');
      setMessage(`✓ Current last Job No set to ${res.lastJobNo}. Next new Job is ${res.nextJobNo}.`);
    } catch (e: any) {
      setMessage(e.message);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Top Banner & Quick Metrics */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0b1329 0%, #1e293b 100%)',
          borderRadius: '12px',
          padding: '20px 24px',
          color: '#ffffff',
          boxShadow: '0 4px 16px rgba(11,19,41,0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span
              style={{
                background: '#2563eb',
                color: '#fff',
                fontWeight: 900,
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px',
                textTransform: 'uppercase'
              }}
            >
              Merchandising Foundation
            </span>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>NFL &amp; NCL Order Intake</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Order Entry &amp; Buyer PO / Market Import
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#cbd5e1', maxWidth: '640px' }}>
            Unified contract intake: Job Sequence → Style Definition → PO/Market Split → Color × Size Matrix. Feeds
            directly into Production Lots and Merchandiser Control Tower without duplicate allocation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '10px 16px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Current Running Job
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#38bdf8' }}>
              Job #{sequence?.lastJobNo || '48092'}
            </div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '10px 16px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Next Allocated Job
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#4ade80' }}>
              Job #{sequence?.nextJobNo || '48093'}
            </div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '10px 16px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Active Contracted Buyers
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#fde047' }}>
              {buyers.length} Brands
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {createdJob && (
        <div
          style={{
            background: 'linear-gradient(90deg, #ecfdf5, #d1fae5)',
            border: '1px solid #6ee7b7',
            borderRadius: '10px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#10b981',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900
              }}
            >
              ✓
            </span>
            <div>
              <strong style={{ fontSize: '14px', color: '#065f46' }}>
                Job #{createdJob.jobNo} Created Successfully!
              </strong>
              <div style={{ fontSize: '12px', color: '#047857' }}>
                Buyer: <strong>{createdJob.buyer}</strong> · Total Quantity: <strong>{Number(createdJob.qty).toLocaleString()} pcs</strong> · Style: {createdJob.styleNo}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Link
              href="/merchandising"
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: '#059669',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              ⚡ Merchandiser Control Tower
            </Link>
            <Link
              href="/modules/production-lots"
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid #10b981',
                color: '#065f46',
                fontSize: '11px',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              Release Production Lots →
            </Link>
          </div>
        </div>
      )}

      {message && !createdJob && (
        <div
          style={{
            background: message.startsWith('✓') ? '#f0fdf4' : '#fef2f2',
            color: message.startsWith('✓') ? '#166534' : '#991b1b',
            border: `1px solid ${message.startsWith('✓') ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '13px'
          }}
        >
          {message}
        </div>
      )}

      {/* Main Workspace Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '2px'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          style={{
            padding: '8px 18px',
            fontWeight: 700,
            fontSize: '13px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'manual' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'manual' ? '#2563eb' : '#64748b'
          }}
        >
          ✍️ Direct Manual Order Entry
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('import')}
          style={{
            padding: '8px 18px',
            fontWeight: 700,
            fontSize: '13px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'import' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'import' ? '#2563eb' : '#64748b'
          }}
        >
          📄 Import Buyer PO / PDF / Excel
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('recent')}
          style={{
            padding: '8px 18px',
            fontWeight: 700,
            fontSize: '13px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'recent' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'recent' ? '#2563eb' : '#64748b'
          }}
        >
          📋 Recent Registered Orders ({recentOrders.length})
        </button>
      </div>

      {/* Tab 1: Manual Order Entry */}
      {activeTab === 'manual' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <form onSubmit={handleSaveManualOrder} style={{ display: 'grid', gap: '16px' }}>
            {/* Header Configuration Panel */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '10px',
                padding: '16px 20px',
                border: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                alignItems: 'end'
              }}
            >
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Target Buyer / Brand
                </label>
                <select
                  value={buyerId}
                  onChange={e => setBuyerId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: '#fff'
                  }}
                >
                  {buyers.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Job Allocation Type
                </label>
                <select
                  value={jobType}
                  onChange={e => setJobType(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: '#fff'
                  }}
                >
                  <option value="NEW">New Job (Auto Sequential #{sequence?.nextJobNo || '48093'})</option>
                  <option value="REPEAT">Repeat / Lot Job (Connected to existing)</option>
                </select>
              </div>

              {jobType === 'REPEAT' ? (
                <>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Base Job Number
                    </label>
                    <input
                      type="text"
                      list="base-job-list"
                      placeholder="e.g. 48085"
                      value={repeatBaseJobNo}
                      onChange={e => setRepeatBaseJobNo(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                    <datalist id="base-job-list">
                      {baseJobOptions.map(opt => (
                        <option key={opt} value={opt} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Repeat Lot Indicator
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1st / 2nd"
                      value={repeatLotNo}
                      onChange={e => setRepeatLotNo(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Auto Next Job No
                  </label>
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#0f172a'
                    }}
                  >
                    Job #{sequence?.nextJobNo || '48093'}
                  </div>
                </div>
              )}
            </div>

            {/* Styles & Matrix Configuration Table */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '10px',
                padding: '16px 20px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    Style &amp; Color × Size Matrix
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                    {isOvs
                      ? 'OVS Format: Country / Market allocations will be registered under this style.'
                      : 'Bestseller / Standard: PO-level deliveries and Color × Size breakdown.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStyles(cur => [...cur, emptyStyle()])}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + Add Another Style
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Style No</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Item Description</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>FOB ($)</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Total Qty (pcs)</th>
                      <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Color × Size Breakdown</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', color: '#475569', fontWeight: 700 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {styles.map((s, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                          <input
                            type="text"
                            placeholder="e.g. 13251506"
                            value={s.styleNo}
                            onChange={e => updateStyle(idx, 'styleNo', e.target.value)}
                            style={{
                              width: '130px',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              fontWeight: 700
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                          <input
                            type="text"
                            placeholder="e.g. Crew Neck Knit Top"
                            value={s.itemDescription}
                            onChange={e => updateStyle(idx, 'itemDescription', e.target.value)}
                            style={{
                              width: '240px',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1'
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                          <input
                            type="number"
                            step="0.01"
                            value={s.fobPrice}
                            onChange={e => updateStyle(idx, 'fobPrice', Number(e.target.value))}
                            style={{
                              width: '75px',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1'
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                          <input
                            type="number"
                            value={s.quantity}
                            onChange={e => updateStyle(idx, 'quantity', Number(e.target.value))}
                            style={{
                              width: '100px',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              fontWeight: 700
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                          <button
                            type="button"
                            onClick={() => openBreakEditor(idx)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '12px' }}>
                              ⚡ Configure Breakdown Matrix
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              {breakdownSummary(s.breakdowns)}
                            </span>
                          </button>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'top' }}>
                          {styles.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setStyles(cur => cur.filter((_, i) => i !== idx))}
                              style={{
                                background: '#fee2e2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 700
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '20px',
                  paddingTop: '16px',
                  borderTop: '1px solid #e2e8f0',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  <span>Total Order Volume: </span>
                  <strong style={{ color: '#0f172a', fontSize: '14px' }}>
                    {styles.reduce((sum, s) => sum + Number(s.quantity || 0), 0).toLocaleString()} pcs
                  </strong>
                  <span style={{ margin: '0 8px' }}>·</span>
                  <span>Est. FOB Value: </span>
                  <strong style={{ color: '#16a34a', fontSize: '14px' }}>
                    ${styles.reduce((sum, s) => sum + (Number(s.quantity || 0) * Number(s.fobPrice || 0)), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </strong>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    disabled={busy}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '8px',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: busy ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 8px rgba(37,99,235,0.25)'
                    }}
                  >
                    {busy ? 'Registering Order...' : '✓ Save & Create Official Job'}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Admin Job Sequence Adjustment Tool */}
          <details
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '12px'
            }}
          >
            <summary style={{ fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
              🔧 Advanced: Running Job Sequence Number Calibration (Admin Control)
            </summary>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
              <div>Current last registered Job: <strong>{sequence?.lastJobNo}</strong></div>
              <input
                type="number"
                placeholder="New last Job No"
                value={sequenceInput}
                onChange={e => setSequenceInput(e.target.value)}
                style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '140px' }}
              />
              <button
                type="button"
                onClick={handleSetSequence}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  background: '#334155',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Set Last Job Number
              </button>
            </div>
          </details>
        </div>
      )}

      {/* Tab 2: Buyer PO / Product Brief Import */}
      {activeTab === 'import' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div
            style={{
              background: '#ffffff',
              borderRadius: '10px',
              padding: '20px',
              border: '1px solid #e2e8f0'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Automated Buyer PO / Product Brief Import
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Supports Bestseller (ONLY, Name It, Jack &amp; Jones), OVS Italy Product Brief, and UTG PDF/Excel files.
                </p>
              </div>

              {/* Quick Load Demo Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => loadDemoImport('bestseller')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Load Demo Bestseller PO (12,000 pcs)
                </button>
                <button
                  type="button"
                  onClick={() => loadDemoImport('ovs')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    color: '#b45309',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Load Demo OVS Brief (8,500 pcs)
                </button>
              </div>
            </div>

            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
                background: '#f8fafc'
              }}
            >
              <input
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                id="po-file-input"
                onChange={e => {
                  if (e.target.files?.[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                style={{ display: 'none' }}
              />
              <label
                htmlFor="po-file-input"
                style={{
                  display: 'inline-block',
                  padding: '9px 22px',
                  borderRadius: '6px',
                  background: busy ? '#94a3b8' : '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  marginBottom: '8px'
                }}
              >
                {busy ? '⏳ Reading & Parsing File...' : '📁 Choose File (PDF / Excel / CSV)'}
              </label>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                {file ? (
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>
                    Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                ) : (
                  'Drop official Buyer Order PDF, Excel (.xlsx, .xls), or CSV file here for canonical breakdown'
                )}
              </div>
            </div>

            {/* Reconciled Preview Box */}
            {preview && (
              <div style={{ marginTop: '20px', display: 'grid', gap: '14px' }}>
                {/* Reconciliation Header Badge */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: preview.validation?.status === 'VALIDATED' ? '#ecfdf5' : '#fffbeb',
                    border: preview.validation?.status === 'VALIDATED' ? '1px solid #a7f3d0' : '1px solid #fde68a',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div>
                    <strong style={{ color: preview.validation?.status === 'VALIDATED' ? '#065f46' : '#92400e', fontSize: '13.5px' }}>
                      {preview.validation?.status === 'VALIDATED' ? '✓ Reconciled' : '⚠️ Need Review'}: {preview.parserFamily} ({preview.parserVersion})
                    </strong>
                    <div style={{ fontSize: '12px', color: preview.validation?.status === 'VALIDATED' ? '#047857' : '#b45309', marginTop: '2px' }}>
                      File: <strong>{preview.sourceFileName || file?.name || 'Uploaded Document'}</strong> · {preview.styles?.length || 0} Style(s) Extracted
                    </div>
                  </div>
                  <span
                    style={{
                      background: preview.validation?.status === 'VALIDATED' ? '#10b981' : '#f59e0b',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '11px',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      letterSpacing: '0.03em'
                    }}
                  >
                    {preview.validation?.status === 'VALIDATED' ? '100% RECONCILED' : 'DISCREPANCIES DETECTED'}
                  </span>
                </div>

                {/* Validation Audit Checks */}
                {preview.validation?.checks?.length > 0 && (
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <div style={{ fontWeight: 800, color: '#334155', marginBottom: '6px' }}>Reconciliation Audit Trail:</div>
                    <div style={{ display: 'grid', gap: '4px' }}>
                      {preview.validation.checks.map((chk: any, idx: number) => (
                        <div key={idx} style={{ color: chk.ok ? '#15803d' : '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 800 }}>{chk.ok ? '✓' : '⚠️'}</span>
                          <span>{chk.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Parser Warnings / Discrepancies */}
                {importWarnings.length > 0 && (
                  <div style={{ padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
                    <strong style={{ fontSize: '12.5px', color: '#92400e' }}>Warnings / Discrepancies Requiring Review:</strong>
                    <ul style={{ margin: '6px 0 0 18px', padding: 0, fontSize: '12px', color: '#b45309', lineHeight: 1.5 }}>
                      {importWarnings.map((w, wi) => <li key={wi}>{w}</li>)}
                    </ul>
                  </div>
                )}

                {/* Extracted Styles List */}
                {preview.styles?.map((st: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '14.5px', color: '#0f172a' }}>
                          Style {st.styleNo} {st.styleDescription ? `— ${st.styleDescription}` : ''}
                        </strong>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                          {st.collection ? `Collection: ${st.collection} · ` : ''}
                          {st.season ? `Season: ${st.season} · ` : ''}
                          {st.orderReferences?.length || 0} PO / Allocation Reference(s)
                        </div>
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#2563eb' }}>
                        {Number(st.totalQty).toLocaleString()} pcs
                      </div>
                    </div>

                    {/* Breakdown Matrix */}
                    <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Extracted Color × Size Breakdown ({st.colors?.length || 0} Colorways)
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Color</th>
                              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Code</th>
                              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Sizes Breakdown</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px' }}>Color Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {st.colors?.map((c: any, ci: number) => (
                              <tr key={ci} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#1e293b' }}>{c.color}</td>
                                <td style={{ padding: '6px 8px', color: '#64748b' }}>{c.colorCode || '—'}</td>
                                <td style={{ padding: '6px 8px' }}>
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {c.sizes?.map((sz: any, szi: number) => (
                                      <span key={szi} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>
                                        {sz.size}: <strong>{sz.qty.toLocaleString()}</strong>
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                  {Number(c.totalQty).toLocaleString()} pcs
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Order Reference Splits */}
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                        {isOvs ? 'Market / Country Dispatch Allocations' : 'Purchase Orders Split'}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
                        {st.orderReferences?.map((ref: any, ri: number) => (
                          <div
                            key={ri}
                            style={{
                              padding: '10px 12px',
                              background: '#fff',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              fontSize: '11.5px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ color: '#0f172a' }}>{ref.reference}</strong>
                              <span style={{ color: '#2563eb', fontWeight: 800 }}>{Number(ref.totalQty).toLocaleString()} pcs</span>
                            </div>
                            <div style={{ color: '#64748b', fontSize: '11px', marginTop: '3px' }}>
                              {ref.ccd ? `CCD: ${ref.ccd} · ` : ''}
                              {ref.destination || ref.market || 'Destination Unspecified'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Review Approval Checkbox if review needed */}
                {preview.validation?.status !== 'VALIDATED' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: 600, color: '#334155', cursor: 'pointer', padding: '6px 0' }}>
                    <input
                      type="checkbox"
                      checked={reviewApproved}
                      onChange={e => setReviewApproved(e.target.checked)}
                    />
                    I have audited the reconciliation report above and approve confirming this order.
                  </label>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={busy || (preview.validation?.status !== 'VALIDATED' && !reviewApproved)}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '8px',
                      background: (preview.validation?.status !== 'VALIDATED' && !reviewApproved) ? '#94a3b8' : '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: (busy || (preview.validation?.status !== 'VALIDATED' && !reviewApproved)) ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 8px rgba(22,163,74,0.25)'
                    }}
                  >
                    {busy ? 'Registering Job...' : '✓ Confirm Import & Create Job'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Recent Orders Table */}
      {activeTab === 'recent' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '20px',
            border: '1px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                Registered Merchandising Orders Foundation
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                All official customer orders with styles, FOB, quantities, and production status.
              </p>
            </div>
            <button
              type="button"
              onClick={loadOrders}
              style={{
                padding: '5px 10px',
                borderRadius: '4px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🔄 Refresh List
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 700 }}>Job No</th>
                  <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 700 }}>Buyer</th>
                  <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 700 }}>Style No</th>
                  <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 700 }}>Item Description</th>
                  <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 700 }}>Order Qty</th>
                  <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 700 }}>Factory</th>
                  <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 700 }}>Ex-Factory / CCD</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: '#475569', fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((ord: any, idx: number) => {
                  const style = ord.styles?.[0] || {};
                  const po = style.purchaseOrders?.[0] || {};
                  return (
                    <tr key={ord.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <strong style={{ color: '#2563eb' }}>Job #{ord.jobNo}</strong>
                      </td>
                      <td style={{ padding: '8px 10px' }}>{ord.buyer?.name || ord.buyer?.code || 'ONLY'}</td>
                      <td style={{ padding: '8px 10px' }}>{style.styleNo || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#475569' }}>{style.itemDescription || 'Knit Garment'}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <strong>{Number(ord.totalQty || style.quantity || 0).toLocaleString()} pcs</strong>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '3px',
                            background: ord.factory?.code === 'NCL' ? '#fef3c7' : '#eff6ff',
                            color: ord.factory?.code === 'NCL' ? '#b45309' : '#1d4ed8'
                          }}
                        >
                          {ord.factory?.code || 'NFL'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{po.ccd || po.shipmentDate || '—'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <Link
                            href="/merchandising"
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              fontSize: '11px',
                              fontWeight: 700,
                              textDecoration: 'none'
                            }}
                          >
                            Control Tower
                          </Link>
                          <Link
                            href="/modules/production-lots"
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              fontSize: '11px',
                              fontWeight: 700,
                              textDecoration: 'none'
                            }}
                          >
                            Lots
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Breakdown Modal */}
      {breakEditor && (
        <div
          role="dialog"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '840px',
              width: '100%',
              padding: '20px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Color × Size Breakdown Matrix
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Configure per-size quantities. Automatically aggregates into style quantity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBreakEditor(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                ×
              </button>
            </div>

            {/* Quick Template Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                padding: '8px 12px',
                background: '#f8fafc',
                borderRadius: '6px',
                marginBottom: '14px',
                flexWrap: 'wrap'
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Quick Size Presets:</span>
              <button
                type="button"
                onClick={() => applySizeTemplate(['XS', 'S', 'M', 'L', 'XL', 'XXL'])}
                style={{ padding: '3px 8px', borderRadius: '4px', background: '#fff', border: '1px solid #cbd5e1', fontSize: '11px', cursor: 'pointer' }}
              >
                XS–XXL
              </button>
              <button
                type="button"
                onClick={() => applySizeTemplate(['S', 'M', 'L', 'XL'])}
                style={{ padding: '3px 8px', borderRadius: '4px', background: '#fff', border: '1px solid #cbd5e1', fontSize: '11px', cursor: 'pointer' }}
              >
                S–XL
              </button>
              <button
                type="button"
                onClick={() => applySizeTemplate(['116-122', '128-134', '140-146', '152-158'])}
                style={{ padding: '3px 8px', borderRadius: '4px', background: '#fff', border: '1px solid #cbd5e1', fontSize: '11px', cursor: 'pointer' }}
              >
                Kids Numeric
              </button>
              <button
                type="button"
                onClick={() => applySizeTemplate(['2-3Y', '3-4Y', '4-5Y', '5-6Y'])}
                style={{ padding: '3px 8px', borderRadius: '4px', background: '#fff', border: '1px solid #cbd5e1', fontSize: '11px', cursor: 'pointer' }}
              >
                Age (2Y–6Y)
              </button>

              <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                <input
                  type="text"
                  placeholder="Custom size"
                  value={newSizeLabel}
                  onChange={e => setNewSizeLabel(e.target.value)}
                  style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', width: '90px' }}
                />
                <button
                  type="button"
                  onClick={addCustomSize}
                  style={{ padding: '3px 8px', borderRadius: '4px', background: '#334155', color: '#fff', border: 'none', fontSize: '11px', cursor: 'pointer' }}
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Matrix Input Table */}
            <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', color: '#334155' }}>Color / Shade</th>
                    {breakEditor.sizes.map(sz => (
                      <th key={sz} style={{ padding: '8px 10px', color: '#334155', textAlign: 'center' }}>
                        {sz}
                      </th>
                    ))}
                    <th style={{ padding: '8px 10px', textAlign: 'right', color: '#334155' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {breakEditor.colors.map((c, ci) => {
                    const rowTotal = breakEditor.sizes.reduce((sum, sz) => sum + Number(c.qtys[sz] || 0), 0);
                    return (
                      <tr key={ci} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <input
                            type="text"
                            value={c.name}
                            onChange={e => {
                              const val = e.target.value;
                              setBreakEditor(ed =>
                                ed ? { ...ed, colors: ed.colors.map((item, idx) => (idx === ci ? { ...item, name: val } : item)) } : ed
                              );
                            }}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 700 }}
                          />
                        </td>
                        {breakEditor.sizes.map(sz => (
                          <td key={sz} style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              value={c.qtys[sz] || ''}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setBreakEditor(ed =>
                                  ed
                                    ? {
                                        ...ed,
                                        colors: ed.colors.map((item, idx) =>
                                          idx === ci ? { ...item, qtys: { ...item.qtys, [sz]: val } } : item
                                        )
                                      }
                                    : ed
                                );
                              }}
                              style={{ width: '65px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center' }}
                            />
                          </td>
                        ))}
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>
                          {rowTotal.toLocaleString()} pcs
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() =>
                  setBreakEditor(ed =>
                    ed
                      ? {
                          ...ed,
                          colors: [...ed.colors, { name: 'Color ' + (ed.colors.length + 1), qtys: Object.fromEntries(ed.sizes.map(s => [s, 0])) }]
                        }
                      : ed
                  )
                }
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                + Add Another Color
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setBreakEditor(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveBreakdownModal}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  ✓ Apply Breakdown
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
