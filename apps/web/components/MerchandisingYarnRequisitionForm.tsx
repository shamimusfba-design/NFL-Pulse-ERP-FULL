'use client';

import { useState } from 'react';

export interface YarnRequisitionFormData {
  jobNo: string;
  buyer: string;
  styleNo: string;
  garmentItem: string;
  fabricType: string;
  yarnCount: string;
  composition: string;
  requiredKg: number;
  inHouseTarget: string;
  merchandiser: string;
  remarks: string;
}

export interface MerchandisingYarnRequisitionFormProps {
  initialData?: Partial<YarnRequisitionFormData>;
  stockAvailableKg?: number;
  stockLookup?: Record<string, number>;
  onSubmit: (data: YarnRequisitionFormData) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

const COMMON_YARN_COUNTS = [
  '30/1 Ne Combed Cotton',
  '26/1 Ne Carded Cotton',
  '24/1 Ne Cotton Slub',
  '20/1 Ne Carded Cotton',
  '32/1 CVC 60/40 Melange',
  '34/1 Ne Combed Cotton',
  '40/1 Ne Combed Cotton',
  '40D Spandex / Elastane',
  '70D Spandex / Elastane',
  '20/1 Ne Slub Cotton',
  '10/1 Poly Heather Fleece'
];

const PRESET_TEMPLATES = [
  {
    label: 'BS-NMT · Lurex T-Shirt (30/1 Ne)',
    jobNo: '48085',
    buyer: 'BS-NMT',
    styleNo: '13251506',
    garmentItem: 'Lurex T-Shirt',
    fabricType: 'Single Jersey + Lurex 180 GSM',
    yarnCount: '30/1 Ne Combed Cotton',
    composition: '98% Cotton + 2% Metallic Lurex',
    requiredKg: 4850,
    merchandiser: 'Md. Jahidul Islam'
  },
  {
    label: 'BS-JJ · CVC Fleece Hoodie (32/1 CVC)',
    jobNo: '48086',
    buyer: 'BS-JJ',
    styleNo: '12267123',
    garmentItem: 'Hooded Sweatshirt',
    fabricType: 'CVC Fleece 280 GSM',
    yarnCount: '32/1 CVC 60/40 Melange',
    composition: '60% Cotton / 40% Polyester',
    requiredKg: 7200,
    merchandiser: 'K. M. Tareq'
  },
  {
    label: 'ONLY · Crewneck (30/1 Ne Combed)',
    jobNo: '48087',
    buyer: 'ONLY',
    styleNo: '15289944',
    garmentItem: 'Basic Crewneck',
    fabricType: 'Single Jersey 160 GSM',
    yarnCount: '30/1 Ne Combed Cotton',
    composition: '100% Cotton BCI Certified',
    requiredKg: 3600,
    merchandiser: 'S. N. Shuvo'
  },
  {
    label: 'OVS · Slub Pique Polo (24/1 Slub)',
    jobNo: '48088',
    buyer: 'OVS',
    styleNo: '903412',
    garmentItem: 'Polo Shirt',
    fabricType: 'Pique / Lacoste 200 GSM',
    yarnCount: '24/1 Ne Cotton Slub',
    composition: '100% Cotton Ring Slub',
    requiredKg: 5400,
    merchandiser: 'Md. Jahidul Islam'
  }
];

export default function MerchandisingYarnRequisitionForm({
  initialData,
  stockLookup = {},
  onSubmit,
  onCancel,
  isModal = false
}: MerchandisingYarnRequisitionFormProps) {
  const [formData, setFormData] = useState<YarnRequisitionFormData>({
    jobNo: initialData?.jobNo || '48095',
    buyer: initialData?.buyer || 'BS-NMT',
    styleNo: initialData?.styleNo || '13259920',
    garmentItem: initialData?.garmentItem || 'T-Shirt',
    fabricType: initialData?.fabricType || 'Single Jersey 180 GSM',
    yarnCount: initialData?.yarnCount || '30/1 Ne Combed Cotton',
    composition: initialData?.composition || '100% Cotton BCI Certified',
    requiredKg: initialData?.requiredKg || 3500,
    inHouseTarget: initialData?.inHouseTarget || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    merchandiser: initialData?.merchandiser || 'Md. Jahidul Islam',
    remarks: initialData?.remarks || 'Approved buyer colorway; urgent knitting program feed'
  });

  const [useCustomCount, setUseCustomCount] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Find available stock for the selected count
  const matchingStock = stockLookup[formData.yarnCount] ?? 0;
  const isStockSufficient = matchingStock >= formData.requiredKg;
  const stockDeficit = Math.max(0, formData.requiredKg - matchingStock);
  const bagsEstimate = Math.ceil(formData.requiredKg / 45.36); // 1 bag = 45.36 kg / 100 lbs standard

  function handlePresetApply(preset: typeof PRESET_TEMPLATES[0]) {
    setFormData(prev => ({
      ...prev,
      jobNo: preset.jobNo,
      buyer: preset.buyer,
      styleNo: preset.styleNo,
      garmentItem: preset.garmentItem,
      fabricType: preset.fabricType,
      yarnCount: preset.yarnCount,
      composition: preset.composition,
      requiredKg: preset.requiredKg,
      merchandiser: preset.merchandiser
    }));
    setUseCustomCount(false);
    setErrorMsg('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.jobNo.trim()) {
      setErrorMsg('Please enter a valid Job Number.');
      return;
    }
    if (!formData.styleNo.trim()) {
      setErrorMsg('Please enter a Style Number.');
      return;
    }
    if (!formData.yarnCount.trim()) {
      setErrorMsg('Please specify the Yarn Count.');
      return;
    }
    if (!formData.composition.trim()) {
      setErrorMsg('Please specify the Fiber Composition.');
      return;
    }
    if (!formData.requiredKg || formData.requiredKg <= 0) {
      setErrorMsg('Required KG must be greater than 0.');
      return;
    }

    setErrorMsg('');
    onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="merchandising-yarn-req-form" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header & Preset Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
                📋 Merchandising Yarn Requisition Creation
              </span>
              <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                মার্চেন্ডাইজিং ইয়ার্ন রিকুইজিশন
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Issue direct yarn requirement from Merchandising into Godown inventory or SCM procurement queue.
            </div>
          </div>
          {onCancel && isModal && (
            <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>
              ✕
            </button>
          )}
        </div>

        {/* Quick Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Quick Presets:</span>
          {PRESET_TEMPLATES.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePresetApply(p)}
              style={{
                fontSize: '10px',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#334155',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e2e8f0';
                e.currentTarget.style.borderColor = '#94a3b8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '8px 12px', borderRadius: '6px', fontSize: '11px' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Row 1: Job No & Buyer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '4px' }}>
            Job No <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. 48085, 48086, 48092"
            value={formData.jobNo}
            onChange={e => setFormData(p => ({ ...p, jobNo: e.target.value }))}
            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '4px' }}>
            Buyer Account <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <select
            value={formData.buyer}
            onChange={e => setFormData(p => ({ ...p, buyer: e.target.value }))}
            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
          >
            <option value="BS-NMT">BS-NMT (Bestseller - Name It)</option>
            <option value="BS-JJ">BS-JJ (Bestseller - Jack &amp; Jones)</option>
            <option value="ONLY">ONLY (Bestseller Female)</option>
            <option value="OVS">OVS (Italy)</option>
            <option value="UTG">UTG (Unlimit)</option>
            <option value="CELIO">CELIO (France)</option>
            <option value="MANGO">MANGO (Spain)</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '4px' }}>
            Style Number <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. 13251506, 12267123"
            value={formData.styleNo}
            onChange={e => setFormData(p => ({ ...p, styleNo: e.target.value }))}
            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
          />
        </div>
      </div>

      {/* Row 2: Garment Item & Fabric Construction */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '4px' }}>
            Garment Item
          </label>
          <select
            value={formData.garmentItem}
            onChange={e => setFormData(p => ({ ...p, garmentItem: e.target.value }))}
            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
          >
            <option value="T-Shirt">T-Shirt (Single Jersey)</option>
            <option value="Hooded Sweatshirt">Hooded Sweatshirt / Pullover</option>
            <option value="Polo Shirt">Polo Shirt (Pique / Lacoste)</option>
            <option value="Fleece Pullover">Fleece Pullover / Terry</option>
            <option value="Rib Top">Rib Top (1x1 / 2x2 Lycra)</option>
            <option value="Leggings">Leggings (Single Jersey + Spandex)</option>
            <option value="Pants / Jogger">Jogger Pants</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '4px' }}>
            Fabric Type &amp; Target GSM <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Single Jersey 180 GSM, 2x2 Lycra Rib 240 GSM"
            value={formData.fabricType}
            onChange={e => setFormData(p => ({ ...p, fabricType: e.target.value }))}
            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
          />
        </div>
      </div>

      {/* Row 3: Yarn Count & Fiber Composition (Requested Critical Fields) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>
              Yarn Count <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <button
              type="button"
              onClick={() => setUseCustomCount(!useCustomCount)}
              style={{ fontSize: '10px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {useCustomCount ? 'Select standard list' : 'Type custom count'}
            </button>
          </div>
          {useCustomCount ? (
            <input
              type="text"
              required
              placeholder="e.g. 50/1 Ne Modal, 16/1 Ne Open End"
              value={formData.yarnCount}
              onChange={e => setFormData(p => ({ ...p, yarnCount: e.target.value }))}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            />
          ) : (
            <select
              value={formData.yarnCount}
              onChange={e => setFormData(p => ({ ...p, yarnCount: e.target.value }))}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            >
              {COMMON_YARN_COUNTS.map((cnt) => (
                <option key={cnt} value={cnt}>{cnt}</option>
              ))}
            </select>
          )}
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>
            Standard count specified by knitting machine gauge (24GG / 28GG / 14GG).
          </div>
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
            Fiber Composition <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. 100% Cotton BCI, 60% Cotton / 40% Polyester, 98% Cotton + 2% Lurex"
            value={formData.composition}
            onChange={e => setFormData(p => ({ ...p, composition: e.target.value }))}
            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
          />
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>
            Certified fiber blend (BCI / Organic GOTS / OCS / Recycled Polyester).
          </div>
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
            Required Quantity (KG) <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              min="1"
              step="1"
              required
              placeholder="e.g. 3500"
              value={formData.requiredKg}
              onChange={e => setFormData(p => ({ ...p, requiredKg: Number(e.target.value) }))}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700 }}
            />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>KG</span>
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>
            Equivalent to approx <strong>{bagsEstimate} standard bags</strong> (~45.36 KG / 100 lbs bag).
          </div>
        </div>
      </div>

      {/* Real-time Inventory Availability & Allocation Verdict Banner */}
      <div style={{
        background: isStockSufficient ? '#f0fdf4' : '#fffbeb',
        border: `1px solid ${isStockSufficient ? '#bbf7d0' : '#fde68a'}`,
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>{isStockSufficient ? '🟢' : '🟡'}</span>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: isStockSufficient ? '#166534' : '#92400e' }}>
              {isStockSufficient
                ? `Immediate Godown Allocation Available (${matchingStock.toLocaleString()} KG in stock)`
                : `Stock Shortage Alert: Deficit of ${stockDeficit.toLocaleString()} KG`}
            </div>
            <div style={{ fontSize: '10px', color: isStockSufficient ? '#15803d' : '#b45309' }}>
              {isStockSufficient
                ? `Physical stock for "${formData.yarnCount}" in Godown A/B exceeds required ${formData.requiredKg.toLocaleString()} KG. Lot reservation will be auto-locked.`
                : `Physical stock (${matchingStock.toLocaleString()} KG) is below required ${formData.requiredKg.toLocaleString()} KG. SCM Spinning Mill PO will be queued.`}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            fontSize: '10px',
            padding: '4px 10px',
            borderRadius: '12px',
            fontWeight: 800,
            background: isStockSufficient ? '#dcfce7' : '#fef3c7',
            color: isStockSufficient ? '#166534' : '#92400e'
          }}>
            {isStockSufficient ? 'LOT ALLOCATED' : 'SCM PO REQUIRED'}
          </span>
        </div>
      </div>

      {/* Row 4: In-House Date, Merchandiser, Remarks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '4px' }}>
            In-House Target Date <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="date"
            required
            value={formData.inHouseTarget}
            onChange={e => setFormData(p => ({ ...p, inHouseTarget: e.target.value }))}
            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '4px' }}>
            Responsible Merchandiser <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Md. Jahidul Islam"
            value={formData.merchandiser}
            onChange={e => setFormData(p => ({ ...p, merchandiser: e.target.value }))}
            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '4px' }}>
            Special Instructions / Knitting Notes
          </label>
          <input
            type="text"
            placeholder="e.g. Urgent circular knitting feed, 24GG, check CSP > 2700"
            value={formData.remarks}
            onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))}
            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            style={{ fontSize: '11px', padding: '6px 14px' }}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setFormData({
              jobNo: '',
              buyer: 'BS-NMT',
              styleNo: '',
              garmentItem: 'T-Shirt',
              fabricType: '',
              yarnCount: '30/1 Ne Combed Cotton',
              composition: '',
              requiredKg: 0,
              inHouseTarget: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
              merchandiser: '',
              remarks: ''
            });
          }}
          style={{
            fontSize: '11px',
            padding: '6px 12px',
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            cursor: 'pointer',
            color: '#475569'
          }}
        >
          Clear Form
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          style={{
            fontSize: '11px',
            padding: '7px 18px',
            background: '#2563eb',
            border: 'none',
            fontWeight: 700,
            borderRadius: '6px'
          }}
        >
          ✓ Submit Merchandising Yarn Requisition (জমা দিন)
        </button>
      </div>
    </form>
  );
}
