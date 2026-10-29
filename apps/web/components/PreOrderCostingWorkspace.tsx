'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useActivePersona } from './NosTopNav';
import {
  RealCostSheet,
  FabricConsumptionRow,
  ItemizedCostItem,
  MasterRateItem,
  CostItemCategory,
  DEFAULT_MASTER_ITEM_RATES,
  calculateCostSheetTotals,
  calculateItemCostPerPc,
  generateDefaultItemizedCostsForStyle
} from '../lib/costing-engine';

export default function PreOrderCostingWorkspace() {
  const { persona } = useActivePersona();
  const isHead = persona.role === 'HEAD_MERCHANDISER' || persona.role === 'ADMIN';

  // 1. Filter States
  const [buyerFilter, setBuyerFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 2. Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [costSheets, setCostSheets] = useState<RealCostSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<RealCostSheet | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false); // Protected View Mode by default to prevent accidental scroll or edit
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isPrintPreview, setIsPrintPreview] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ITEMIZED' | 'FABRIC_MATRICES' | 'TRIMS_BOM' | 'MASTER_RATES'>('ITEMIZED');
  const [itemCategoryFilter, setItemCategoryFilter] = useState<string>('ALL');
  const [itemSearchFilter, setItemSearchFilter] = useState<string>('');

  // Helper to prevent wheel event from unintentionally changing number values on scroll
  const handleNumberWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  // Global listener: prevent mouse wheel from changing focused/hovered number input on scroll
  useEffect(() => {
    const preventWheelOnNumberInput = (e: WheelEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.tagName === 'INPUT' && (activeEl as HTMLInputElement).type === 'number') {
        (activeEl as HTMLElement).blur();
      }
    };
    window.addEventListener('wheel', preventWheelOnNumberInput, { passive: true });
    return () => window.removeEventListener('wheel', preventWheelOnNumberInput);
  }, []);

  // Modals
  const [isMasterRatesModalOpen, setIsMasterRatesModalOpen] = useState<boolean>(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState<boolean>(false);
  const [isCreateStyleModalOpen, setIsCreateStyleModalOpen] = useState<boolean>(false);

  // Master Rates state
  const [masterRates, setMasterRates] = useState<MasterRateItem[]>(DEFAULT_MASTER_ITEM_RATES);
  const [masterRatesSearch, setMasterRatesSearch] = useState<string>('');
  const [masterRatesCategory, setMasterRatesCategory] = useState<string>('ALL');

  // Messages
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // New Item State for Modal
  const [newItemCategory, setNewItemCategory] = useState<CostItemCategory>('TRIMS');
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemSpec, setNewItemSpec] = useState<string>('');
  const [newItemUnit, setNewItemUnit] = useState<'PC' | 'KG' | 'DZN' | 'GROSS' | 'CONE' | 'YDS' | 'CARTON' | 'SET'>('PC');
  const [newItemRate, setNewItemRate] = useState<number>(0.05);
  const [newItemConsumption, setNewItemConsumption] = useState<number>(1);
  const [newItemWastage, setNewItemWastage] = useState<number>(5);
  const [newItemSupplier, setNewItemSupplier] = useState<string>('Nominated Supplier');

  // New Style Modal State
  const [newStyleRef, setNewStyleRef] = useState<string>('');
  const [newStyleDesc, setNewStyleDesc] = useState<string>('');
  const [newStyleBuyer, setNewStyleBuyer] = useState<string>('ONLY');
  const [newStyleQty, setNewStyleQty] = useState<number>(5000);
  const [newStyleDiv, setNewStyleDiv] = useState<string>('Mens');

  // Fetch Master Rates
  const fetchMasterRates = useCallback(async () => {
    try {
      const res = await fetch('/api/merchandising/costing/rates');
      if (res.ok) {
        const data = await res.json();
        if (data.rates && Array.isArray(data.rates)) {
          setMasterRates(data.rates);
        }
      }
    } catch {
      // Fallback to local defaults
      setMasterRates(DEFAULT_MASTER_ITEM_RATES);
    }
  }, []);

  // Fetch Cost Sheets
  const fetchCostSheets = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const params = new URLSearchParams({
        role: persona.role,
        assignedBuyer: persona.assignedBuyer,
        buyer: isHead ? buyerFilter : persona.assignedBuyer,
        status: statusFilter,
        search: searchQuery
      });
      const res = await fetch(`/api/merchandising/costing?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch cost sheets`);
      const data = await res.json();
      const list: RealCostSheet[] = data.costSheets || [];

      // Ensure itemizedCosts exists on all sheets
      const enriched = list.map((cs) => {
        if (!cs.itemizedCosts || cs.itemizedCosts.length === 0) {
          return {
            ...cs,
            itemizedCosts: generateDefaultItemizedCostsForStyle(
              cs.header?.styleRef || 'REF',
              cs.header?.garmentDescription || 'Knit Tee',
              cs.header?.buyer || 'ONLY'
            )
          };
        }
        return cs;
      });

      setCostSheets(enriched);
      if (!selectedSheet && enriched.length > 0) {
        setSelectedSheet(enriched[0]);
      } else if (selectedSheet) {
        const refreshed = enriched.find((c: any) => c.id === selectedSheet.id);
        if (refreshed) setSelectedSheet(refreshed);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading costing sheets');
    } finally {
      setLoading(false);
    }
  }, [persona, isHead, buyerFilter, statusFilter, searchQuery, selectedSheet]);

  useEffect(() => {
    fetchCostSheets();
    fetchMasterRates();
  }, [persona, isHead, buyerFilter, statusFilter]);

  // Live Totals calculation for selectedSheet
  const calculatedTotals = useMemo(() => {
    if (!selectedSheet) return null;
    return calculateCostSheetTotals(selectedSheet);
  }, [selectedSheet]);

  // Update itemized row in active sheet
  const handleItemizedChange = (index: number, field: keyof ItemizedCostItem, val: any) => {
    if (!selectedSheet) return;
    const items = [...(selectedSheet.itemizedCosts || [])];
    const item = { ...items[index], [field]: val };

    // Auto-recalculate row cost
    if (field === 'unitPrice' || field === 'consumptionPerPc' || field === 'wastagePct') {
      const uPrice = field === 'unitPrice' ? Number(val) : Number(item.unitPrice || 0);
      const cons = field === 'consumptionPerPc' ? Number(val) : Number(item.consumptionPerPc || 0);
      const waste = field === 'wastagePct' ? Number(val) : Number(item.wastagePct || 0);
      const costPc = calculateItemCostPerPc(uPrice, cons, waste);
      item.costPerPc = costPc;
      item.costPerDzn = Number((costPc * 12).toFixed(3));
    }

    items[index] = item;
    setSelectedSheet({
      ...selectedSheet,
      itemizedCosts: items
    });
    setHasUnsavedChanges(true);
  };

  // Update Overhead percentages or CM in otherCosts
  const handleOverheadChange = (field: string, val: number) => {
    if (!selectedSheet) return;
    setSelectedSheet({
      ...selectedSheet,
      otherCosts: {
        ...selectedSheet.otherCosts,
        [field]: val
      }
    });
    setHasUnsavedChanges(true);
  };

  // Quick Add an empty editable row directly to the table
  const handleQuickAddEmptyRow = () => {
    if (!selectedSheet) return;
    const newRow: ItemizedCostItem = {
      id: `item-quick-${Date.now()}`,
      category: 'TRIMS',
      name: 'Custom Component / Trim',
      spec: 'Custom specification & details',
      unit: 'PC',
      unitPrice: 0.05,
      consumptionPerPc: 1,
      wastagePct: 5,
      costPerPc: 0.0525,
      costPerDzn: 0.63,
      supplier: 'Local Nominated'
    };
    setSelectedSheet({
      ...selectedSheet,
      itemizedCosts: [...(selectedSheet.itemizedCosts || []), newRow]
    });
    setHasUnsavedChanges(true);
    setSaveSuccessMessage('New row added! You can directly edit its name, unit, rate, and consumption.');
  };


  // Add Item to active sheet
  const handleAddItemToSheet = (item: ItemizedCostItem) => {
    if (!selectedSheet) return;
    const current = selectedSheet.itemizedCosts || [];
    setSelectedSheet({
      ...selectedSheet,
      itemizedCosts: [...current, item]
    });
    setIsAddItemModalOpen(false);
    setSaveSuccessMessage(`Added "${item.name}" ($${item.unitPrice}/${item.unit}) to cost sheet`);
  };

  // Quick Add from Master Rates
  const handleAddFromMasterRate = (rate: MasterRateItem) => {
    const costPc = calculateItemCostPerPc(rate.defaultRate, rate.defaultConsumption, rate.defaultWastagePct);
    const newItem: ItemizedCostItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      category: rate.category,
      name: rate.name,
      spec: rate.spec,
      unit: rate.unit,
      unitPrice: rate.defaultRate,
      consumptionPerPc: rate.defaultConsumption,
      wastagePct: rate.defaultWastagePct,
      costPerPc: costPc,
      costPerDzn: Number((costPc * 12).toFixed(3)),
      supplier: rate.defaultSupplier,
      remarks: rate.notes
    };
    handleAddItemToSheet(newItem);
  };

  // Duplicate item in sheet
  const handleDuplicateItem = (index: number) => {
    if (!selectedSheet) return;
    const current = selectedSheet.itemizedCosts || [];
    const target = current[index];
    if (!target) return;
    const duplicated: ItemizedCostItem = {
      ...target,
      id: `item-copy-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: `${target.name} (Copy)`
    };
    const updated = [...current.slice(0, index + 1), duplicated, ...current.slice(index + 1)];
    setSelectedSheet({
      ...selectedSheet,
      itemizedCosts: updated
    });
    setHasUnsavedChanges(true);
    setSaveSuccessMessage(`Duplicated "${target.name}"`);
  };

  // Update Header details (Order Qty, Buyer, Description, Style Ref, Season)
  const handleHeaderChange = (field: string, val: any) => {
    if (!selectedSheet) return;
    setSelectedSheet({
      ...selectedSheet,
      header: {
        ...selectedSheet.header,
        [field]: val
      }
    });
    setHasUnsavedChanges(true);
  };

  // Update fabric consumption row
  const handleFabricRowChange = (index: number, field: string, val: any) => {
    if (!selectedSheet) return;
    const current = [...(selectedSheet.fabrics || [])];
    const row = { ...current[index], [field]: val };

    if (['bWidth', 'bLength', 'slCm', 'gsm', 'wastePct'].includes(field)) {
      const w = Number(field === 'bWidth' ? val : row.bWidth || 0);
      const l = Number(field === 'bLength' ? val : row.bLength || 0);
      const sl = Number(field === 'slCm' ? val : row.slCm || 0);
      const gsm = Number(field === 'gsm' ? val : row.gsm || 0);
      const waste = Number(field === 'wastePct' ? val : row.wastePct || 0);

      const netPerPc = ((l + sl) * w * gsm) / 10000000;
      const totalCons = netPerPc * (1 + waste / 100);
      row.consumptionKg = Number(netPerPc.toFixed(4));
      row.totalConsumptionKg = Number(totalCons.toFixed(4));
      row.dozen = Number((totalCons * 12).toFixed(3));
    }

    current[index] = row;
    setSelectedSheet({
      ...selectedSheet,
      fabrics: current
    });
    setHasUnsavedChanges(true);
  };

  // Delete item from sheet
  const handleDeleteItem = (index: number) => {
    if (!selectedSheet) return;
    const current = selectedSheet.itemizedCosts || [];
    const removedName = current[index]?.name;
    const updated = current.filter((_, i) => i !== index);
    setSelectedSheet({
      ...selectedSheet,
      itemizedCosts: updated
    });
    setSaveSuccessMessage(`Removed "${removedName}" from cost breakdown`);
  };

  // Apply all master rates to existing items in sheet
  const handleApplyMasterRatesToSheet = () => {
    if (!selectedSheet) return;
    const current = selectedSheet.itemizedCosts || [];
    let updatedCount = 0;

    const updated = current.map((item) => {
      const match = masterRates.find(
        (r) => r.name.toLowerCase() === item.name.toLowerCase() || r.category === item.category && r.name.includes(item.name)
      );
      if (match) {
        updatedCount++;
        const costPc = calculateItemCostPerPc(match.defaultRate, item.consumptionPerPc || match.defaultConsumption, match.defaultWastagePct);
        return {
          ...item,
          unitPrice: match.defaultRate,
          wastagePct: match.defaultWastagePct,
          supplier: match.defaultSupplier || item.supplier,
          costPerPc: costPc,
          costPerDzn: Number((costPc * 12).toFixed(3))
        };
      }
      return item;
    });

    setSelectedSheet({
      ...selectedSheet,
      itemizedCosts: updated
    });
    setSaveSuccessMessage(`Synchronized ${updatedCount} items with official Master Rate catalog!`);
  };

  // Save Cost Sheet Changes
  const handleSaveSheet = async (statusOverride?: string) => {
    if (!selectedSheet) return;
    setErrorMessage('');
    setSaveSuccessMessage('');
    try {
      const payload = {
        ...selectedSheet,
        approvalStatus: statusOverride || selectedSheet.approvalStatus,
        revisedBy: persona.name,
        revisionReason: 'Updated itemized costing rates and consumption specifications'
      };
      const res = await fetch('/api/merchandising/costing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save costing sheet');
      const data = await res.json();
      setSelectedSheet(data.costSheet);
      setSaveSuccessMessage('Cost sheet and all itemized component rates saved successfully!');
      setHasUnsavedChanges(false);
      setIsEditing(false); // Return to protected View Mode after saving
      fetchCostSheets();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving cost sheet');
    }
  };

  // Create New Style Costing
  const handleCreateNewStyleCosting = async () => {
    if (!newStyleRef || !newStyleDesc) {
      setErrorMessage('Please provide Style Reference and Garment Description');
      return;
    }
    try {
      const defaultItems = generateDefaultItemizedCostsForStyle(newStyleRef, newStyleDesc, newStyleBuyer);
      const computed = calculateCostSheetTotals({ itemizedCosts: defaultItems });

      const newSheetPayload = {
        header: {
          styleRef: newStyleRef,
          garmentDescription: newStyleDesc,
          buyer: newStyleBuyer,
          divGroup: newStyleDiv,
          orderQty: newStyleQty,
          date: new Date().toLocaleDateString('en-GB'),
          season: 'Core 2026',
          currency: 'USD'
        },
        approvalStatus: 'DRAFT',
        itemizedCosts: defaultItems,
        fabrics: [
          {
            id: 'fab-new-1',
            fabricTag: 'Fabric A',
            fabricDescription: `${newStyleDesc} Main Fabric`,
            bWidth: 64,
            bLength: 72,
            slCm: 22,
            mqPc: 1,
            consumptionKg: 0.22,
            wastePct: 8,
            totalConsumptionKg: 0.238,
            dozen: 2.85,
            gsm: 160,
            formula: 'Standard Body Formula',
            wastageKg: 0.018,
            knittingCost: 0.45,
            dyeingFinishingCost: 1.15,
            convertCost: 0.20
          }
        ],
        otherCosts: {
          collarCuffPerPc: 0.15,
          totalFabricCostPerPc: computed.totalFabricCostPerPc,
          accessoriesPerPc: computed.totalAccessoriesPerPc,
          cmCuttingMakingPerPc: computed.totalCmPerPc,
          screenPrintPerPc: 0,
          embroideryPerPc: 0,
          sequinPerPc: 0,
          stonePerPc: 0,
          garmentWashPerPc: 0.06,
          commercialOverheadPct: 3.5,
          profitPct: 8.0,
          buyingCommissionPct: 5.0,
          chemicalTestPerPc: 0.04,
          totalGarmentPriceFobPerPc: computed.finalFobPrice
        }
      };

      const res = await fetch('/api/merchandising/costing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSheetPayload)
      });
      if (!res.ok) throw new Error('Failed to create new cost sheet');
      const data = await res.json();
      setIsCreateStyleModalOpen(false);
      setSaveSuccessMessage(`Cost sheet for Style #${newStyleRef} created with full itemized cost matrix!`);
      setSelectedSheet(data.costSheet);
      fetchCostSheets();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating style costing');
    }
  };

  // Approval actions
  const handleApprovalAction = async (action: 'APPROVE' | 'REJECT' | 'SUBMIT') => {
    if (!selectedSheet) return;
    try {
      const res = await fetch('/api/merchandising/costing/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedSheet.id,
          styleRef: selectedSheet.header.styleRef,
          action,
          actor: persona.name,
          remarks: action === 'APPROVE' ? `Approved by ${persona.name}` : `Reviewed by ${persona.name}`
        })
      });
      if (!res.ok) throw new Error('Approval request failed');
      const data = await res.json();
      setSelectedSheet(data.costSheet);
      setSaveSuccessMessage(`Cost sheet ${action === 'APPROVE' ? 'APPROVED' : action} successfully!`);
      fetchCostSheets();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating approval');
    }
  };

  // Filtered items in active sheet
  const filteredItemizedCosts = useMemo(() => {
    if (!selectedSheet?.itemizedCosts) return [];
    return selectedSheet.itemizedCosts.filter((item) => {
      const matchCat = itemCategoryFilter === 'ALL' || item.category === itemCategoryFilter;
      const matchSearch =
        !itemSearchFilter ||
        item.name.toLowerCase().includes(itemSearchFilter.toLowerCase()) ||
        item.spec?.toLowerCase().includes(itemSearchFilter.toLowerCase()) ||
        item.supplier?.toLowerCase().includes(itemSearchFilter.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedSheet?.itemizedCosts, itemCategoryFilter, itemSearchFilter]);

  // Category Color Badge Helper
  const getCategoryBadge = (cat: CostItemCategory) => {
    switch (cat) {
      case 'YARN':
        return { bg: '#e0e7ff', text: '#3730a3', label: 'Yarn' };
      case 'FABRIC':
        return { bg: '#dbeafe', text: '#1e40af', label: 'Fabric' };
      case 'PROCESSING':
        return { bg: '#cffafe', text: '#155e75', label: 'Mills / Process' };
      case 'TRIMS':
        return { bg: '#f3e8ff', text: '#6b21a8', label: 'Trims & BOM' };
      case 'PACKAGING':
        return { bg: '#fef3c7', text: '#92400e', label: 'Packaging' };
      case 'EMBELLISHMENT':
        return { bg: '#fce7f3', text: '#9d174d', label: 'Print / Emb' };
      case 'CM':
        return { bg: '#dcfce7', text: '#166534', label: 'CM (Labor)' };
      case 'WASH':
        return { bg: '#ccfbf1', text: '#115e59', label: 'Wash' };
      case 'TESTING':
        return { bg: '#ede9fe', text: '#5b21b6', label: 'Testing' };
      default:
        return { bg: '#f1f5f9', text: '#334155', label: cat };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* 1. TOP HEADER & BREADCRUMB */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
            <span>Merchandising</span>
            <span>›</span>
            <span>01. Pre-Order &amp; Costing</span>
            <span>›</span>
            <span style={{ color: '#2563eb' }}>Itemized Cost Determination System</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>📊</span>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Item-Wise Garment Cost Determination &amp; Quotation
              </h1>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                আমাদের প্রত্যেকটি জিনিসের আলাদা নির্ধারিত কস্ট রেট, কনজাম্পশন ও অপচয় শতাংশ অনুযায়ী নিখুঁত FOB নির্ণয়
              </div>
            </div>
          </div>
        </div>

        {/* Top Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Master Rates Library Button */}
          <button
            type="button"
            onClick={() => setActiveTab('MASTER_RATES')}
            style={{
              padding: '7px 13px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📋</span> Master Item Rate Catalog
          </button>

          {/* New Style Costing Modal */}
          <button
            type="button"
            onClick={() => setIsCreateStyleModalOpen(true)}
            style={{
              padding: '7px 13px',
              borderRadius: '6px',
              border: '1px solid #bfdbfe',
              background: '#eff6ff',
              color: '#1d4ed8',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>+</span> New Style Costing
          </button>

          {/* Printable Cost Sheet Button */}
          <button
            type="button"
            onClick={() => setIsPrintPreview(!isPrintPreview)}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: isPrintPreview ? '#eff6ff' : '#ffffff',
              color: isPrintPreview ? '#1d4ed8' : '#334155',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🖨️</span> {isPrintPreview ? 'Exit Print View' : 'Printable Sheet'}
          </button>

          {/* Save / Edit Button */}
          {isEditing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>🔒</span> Done / Lock View
              </button>
              <button
                type="button"
                onClick={() => handleSaveSheet()}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(22,163,74,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>💾</span> Save Version {(selectedSheet?.version || 1) + 1}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                border: '1.5px solid #2563eb',
                background: '#2563eb',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(37,99,235,0.25)'
              }}
            >
              <span>✏️</span> Edit Costing (এডিট করুন)
            </button>
          )}

          {/* Confirm Order / Create Job */}
          <Link
            href="/orders/new"
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              border: '1px solid #0f172a',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 800,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Convert this approved quotation directly into Job / PO"
          >
            <span>→</span> Confirm Order (Create Job)
          </Link>
        </div>
      </div>

      {saveSuccessMessage && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
          ✓ {saveSuccessMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {/* 2. STYLE SELECTOR & SUMMARY RIBBON */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Select Style Ref:
            </span>
            <select
              value={selectedSheet?.id || ''}
              onChange={(e) => {
                const found = costSheets.find((c) => c.id === e.target.value);
                if (found) {
                  setSelectedSheet(found);
                  setIsEditing(false); // Default to safe view mode when switching style
                  setHasUnsavedChanges(false);
                }
              }}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #2563eb',
                background: '#eff6ff',
                fontSize: '12.5px',
                fontWeight: 800,
                color: '#1e3a8a'
              }}
            >
              {costSheets.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.header.styleRef} · {c.header.garmentDescription} ({c.header.buyer}) — FOB ${c.otherCosts?.totalGarmentPriceFobPerPc?.toFixed(2) || '3.78'} [v{c.version}]
                </option>
              ))}
            </select>
          </div>

          {selectedSheet && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 9px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 800,
              background: selectedSheet.approvalStatus === 'APPROVED' ? '#dcfce7' : selectedSheet.approvalStatus === 'SUBMITTED' ? '#dbeafe' : '#fef3c7',
              color: selectedSheet.approvalStatus === 'APPROVED' ? '#166534' : selectedSheet.approvalStatus === 'SUBMITTED' ? '#1e40af' : '#92400e',
              border: '1px solid currentColor'
            }}>
              Status: {selectedSheet.approvalStatus} (v{selectedSheet.version})
            </span>
          )}

          {/* Quick sync with master rates button */}
          <button
            type="button"
            onClick={handleApplyMasterRatesToSheet}
            title="Update all items in this sheet to match the current standard Master Rate Catalog"
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#334155',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ⚡ Sync With Master Rates
          </button>
        </div>

        {/* Approval Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedSheet?.approvalStatus !== 'APPROVED' && (
            <button
              type="button"
              onClick={() => handleApprovalAction('APPROVE')}
              style={{
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              ✓ Approve Costing
            </button>
          )}

          {selectedSheet?.approvalStatus === 'DRAFT' && (
            <button
              type="button"
              onClick={() => handleApprovalAction('SUBMIT')}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Submit for Review
            </button>
          )}
        </div>
      </div>

      {/* 2b. STYLE HEADER & SPECIFICATION STRIP */}
      {selectedSheet && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* Header Strip Status & Mode Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '4px',
                background: isEditing ? '#fef3c7' : '#f1f5f9',
                color: isEditing ? '#92400e' : '#475569',
                border: '1px solid currentColor',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {isEditing ? '✏️ EDIT MODE ACTIVE' : '🔒 VIEW MODE (PROTECTED)'}
              </span>
              <span style={{ fontSize: '11px', color: isEditing ? '#b45309' : '#64748b', fontWeight: 600 }}>
                {isEditing
                  ? 'মাউস স্ক্রলিংয়ে সংখ্যা পরিবর্তন বন্ধ রাখা হয়েছে। প্রয়োজন অনুযায়ী সংখ্যা টাইপ করে পরিবর্তন করুন।'
                  : 'সংখ্যা ও কোয়ান্টিটি সম্পূর্ণ সুরক্ষিত। পরিবর্তন করতে চাইলে "✏️ Edit Costing" বাটনে চাপ দিন।'}
              </span>
            </div>

            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  🔒 Done / Lock View
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSheet()}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#16a34a',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  💾 Save Changes
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  border: '1px solid #2563eb',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>✏️</span> Edit Costing (এডিট করুন)
              </button>
            )}
          </div>

          {/* Fields */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            alignItems: 'end'
          }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '3px' }}>
                Style Ref #:
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={selectedSheet.header?.styleRef || ''}
                  onChange={(e) => handleHeaderChange('styleRef', e.target.value)}
                  placeholder="e.g. REF-22014574"
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    borderRadius: '5px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    color: '#0f172a'
                  }}
                />
              ) : (
                <div style={{ padding: '5px 8px', background: '#f8fafc', borderRadius: '5px', border: '1px solid #e2e8f0', fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
                  {selectedSheet.header?.styleRef || '—'}
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '3px' }}>
                Garment Description:
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={selectedSheet.header?.garmentDescription || ''}
                  onChange={(e) => handleHeaderChange('garmentDescription', e.target.value)}
                  placeholder="e.g. Mens Regular Fit Tee"
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155'
                  }}
                />
              ) : (
                <div style={{ padding: '5px 8px', background: '#f8fafc', borderRadius: '5px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  {selectedSheet.header?.garmentDescription || '—'}
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '3px' }}>
                Buyer Name:
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={selectedSheet.header?.buyer || ''}
                  onChange={(e) => handleHeaderChange('buyer', e.target.value)}
                  placeholder="e.g. ONLY, ONS, CARMA"
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#1e40af'
                  }}
                />
              ) : (
                <div style={{ padding: '5px 8px', background: '#eff6ff', borderRadius: '5px', border: '1px solid #bfdbfe', fontSize: '12px', fontWeight: 800, color: '#1e40af' }}>
                  {selectedSheet.header?.buyer || '—'}
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '3px' }}>
                Order Quantity (Pcs):
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={selectedSheet.header?.orderQty || 5000}
                  onChange={(e) => handleHeaderChange('orderQty', Number(e.target.value))}
                  onWheel={handleNumberWheel}
                  placeholder="5000"
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    borderRadius: '5px',
                    border: '1.5px solid #2563eb',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    color: '#1e3a8a'
                  }}
                />
              ) : (
                <div style={{ padding: '5px 8px', background: '#eff6ff', borderRadius: '5px', border: '1.5px solid #93c5fd', fontSize: '13px', fontWeight: 900, color: '#1e3a8a' }}>
                  {(selectedSheet.header?.orderQty || 5000).toLocaleString()} Pcs
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '3px' }}>
                Season / Delivery:
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={selectedSheet.header?.season || 'SS25'}
                  onChange={(e) => handleHeaderChange('season', e.target.value)}
                  placeholder="e.g. Spring/Summer 25"
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155'
                  }}
                />
              ) : (
                <div style={{ padding: '5px 8px', background: '#f8fafc', borderRadius: '5px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  {selectedSheet.header?.season || 'SS25'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. COST SUMMARY KPI CARDS & FORMULA EXPLAINER */}
      {selectedSheet && calculatedTotals && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Top 6 KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>1. Fabric &amp; Yarn Cost</span>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#1e40af', marginTop: '2px' }}>
                ${calculatedTotals.totalFabricCostPerPc.toFixed(2)}
              </div>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Yarn, Knitting &amp; Dyeing</span>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>2. Trims &amp; Packaging</span>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#6b21a8', marginTop: '2px' }}>
                ${calculatedTotals.totalAccessoriesPerPc.toFixed(2)}
              </div>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Labels, Poly, Carton, Thread</span>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>3. CM (Direct Labor)</span>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#15803d', marginTop: '2px' }}>
                ${calculatedTotals.totalCmPerPc.toFixed(2)}
              </div>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Cutting, Making, Ironing</span>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>4. Wash, Print &amp; Test</span>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f766e', marginTop: '2px' }}>
                ${(calculatedTotals.totalWashAndTestPerPc + calculatedTotals.totalEmbellishmentPerPc).toFixed(2)}
              </div>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Screen Print, Softener, SGS</span>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>5. Overheads &amp; Profit</span>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#b45309', marginTop: '2px' }}>
                ${(calculatedTotals.commercialOverheadPerPc + calculatedTotals.profitPerPc + calculatedTotals.buyingCommissionPerPc).toFixed(2)}
              </div>
              <span style={{ fontSize: '10px', color: '#64748b' }}>3.5% Comm + 8% Profit + 5% Agt</span>
            </div>

            <div style={{ background: '#0f172a', color: '#ffffff', borderRadius: '8px', padding: '12px 16px', border: '2px solid #2563eb' }}>
              <span style={{ fontSize: '10.5px', color: '#93c5fd', fontWeight: 800, textTransform: 'uppercase' }}>Total Quotation FOB</span>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
                ${calculatedTotals.finalFobPrice.toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 600, color: '#93c5fd' }}>/ Pc</span>
              </div>
              <span style={{ fontSize: '11px', color: '#cbd5e1' }}>${calculatedTotals.costPerDzn.toFixed(2)} / Dozen</span>
            </div>
          </div>

          {/* Visual Percentage Contribution Ribbon */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                Cost Determination Contribution Share (% Breakdown)
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Total 100% of FOB Price (${calculatedTotals.finalFobPrice.toFixed(2)})
              </span>
            </div>
            <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', background: '#f1f5f9' }}>
              {(calculatedTotals.categoryBreakdown || []).map((cat, i) => {
                const colors = ['#2563eb', '#9333ea', '#16a34a', '#ec4899', '#0d9488', '#f59e0b'];
                const color = colors[i % colors.length];
                return (
                  <div
                    key={cat.category}
                    title={`${cat.category}: $${cat.cost.toFixed(2)} (${cat.pct}%)`}
                    style={{
                      width: `${cat.pct}%`,
                      background: color,
                      transition: 'width 0.3s ease'
                    }}
                  />
                );
              })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px', fontSize: '10.5px' }}>
              {(calculatedTotals.categoryBreakdown || []).map((cat, i) => {
                const colors = ['#2563eb', '#9333ea', '#16a34a', '#ec4899', '#0d9488', '#f59e0b'];
                const color = colors[i % colors.length];
                return (
                  <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color }} />
                    <span style={{ color: '#475569', fontWeight: 600 }}>{cat.category}:</span>
                    <strong style={{ color: '#0f172a' }}>${cat.cost.toFixed(2)} ({cat.pct}%)</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. WORKSPACE TABS */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', gap: '4px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('ITEMIZED')}
          style={{
            padding: '9px 18px',
            fontSize: '12.5px',
            fontWeight: 800,
            cursor: 'pointer',
            border: 'none',
            borderBottom: activeTab === 'ITEMIZED' ? '3px solid #2563eb' : '3px solid transparent',
            background: activeTab === 'ITEMIZED' ? '#eff6ff' : 'transparent',
            color: activeTab === 'ITEMIZED' ? '#1d4ed8' : '#64748b',
            borderRadius: '6px 6px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>📋</span> Itemized Cost Breakdown (প্রত্যেক জিনিসের আলাদা কস্ট শিট)
          <span style={{ background: '#2563eb', color: '#ffffff', fontSize: '10px', padding: '1px 6px', borderRadius: '10px', fontWeight: 800 }}>
            {selectedSheet?.itemizedCosts?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('FABRIC_MATRICES')}
          style={{
            padding: '9px 18px',
            fontSize: '12.5px',
            fontWeight: 800,
            cursor: 'pointer',
            border: 'none',
            borderBottom: activeTab === 'FABRIC_MATRICES' ? '3px solid #2563eb' : '3px solid transparent',
            background: activeTab === 'FABRIC_MATRICES' ? '#eff6ff' : 'transparent',
            color: activeTab === 'FABRIC_MATRICES' ? '#1d4ed8' : '#64748b',
            borderRadius: '6px 6px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>🧶</span> Fabric Consumption &amp; Mills ($/KG)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TRIMS_BOM')}
          style={{
            padding: '9px 18px',
            fontSize: '12.5px',
            fontWeight: 800,
            cursor: 'pointer',
            border: 'none',
            borderBottom: activeTab === 'TRIMS_BOM' ? '3px solid #2563eb' : '3px solid transparent',
            background: activeTab === 'TRIMS_BOM' ? '#eff6ff' : 'transparent',
            color: activeTab === 'TRIMS_BOM' ? '#1d4ed8' : '#64748b',
            borderRadius: '6px 6px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>🏷️</span> Trims &amp; Packaging BOM
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('MASTER_RATES')}
          style={{
            padding: '9px 18px',
            fontSize: '12.5px',
            fontWeight: 800,
            cursor: 'pointer',
            border: 'none',
            borderBottom: activeTab === 'MASTER_RATES' ? '3px solid #2563eb' : '3px solid transparent',
            background: activeTab === 'MASTER_RATES' ? '#eff6ff' : 'transparent',
            color: activeTab === 'MASTER_RATES' ? '#1d4ed8' : '#64748b',
            borderRadius: '6px 6px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>⚙️</span> Master Rates Library ({masterRates.length})
        </button>
      </div>

      {/* 5. TAB 1: ITEMIZED COST BREAKDOWN TABLE (THE CORE USER REQUIREMENT) */}
      {activeTab === 'ITEMIZED' && selectedSheet && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden'
        }}>
          {/* Header Filter Strip */}
          <div style={{
            padding: '12px 18px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '4px',
                background: '#dcfce7',
                color: '#166534',
                fontSize: '11px',
                fontWeight: 800,
                border: '1px solid #bbf7d0'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
                🟢 Live Spreadsheet Editable
              </span>

              <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Filter:</span>
              <select
                value={itemCategoryFilter}
                onChange={(e) => setItemCategoryFilter(e.target.value)}
                style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11.5px', fontWeight: 700 }}
              >
                <option value="ALL">All Categories ({selectedSheet.itemizedCosts?.length || 0})</option>
                <option value="YARN">Yarn &amp; Fibers</option>
                <option value="FABRIC">Fabric</option>
                <option value="PROCESSING">Knitting &amp; Dyeing Processing</option>
                <option value="TRIMS">Trims &amp; Accessories</option>
                <option value="PACKAGING">Packaging &amp; Cartons</option>
                <option value="EMBELLISHMENT">Print &amp; Embroidery</option>
                <option value="CM">CM (Cutting &amp; Making Labor)</option>
                <option value="WASH">Washing</option>
                <option value="TESTING">Testing &amp; Inspection</option>
              </select>

              <input
                type="text"
                placeholder="Search item, spec, supplier..."
                value={itemSearchFilter}
                onChange={(e) => setItemSearchFilter(e.target.value)}
                style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11.5px', width: '180px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 16px',
                    borderRadius: '5px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(37,99,235,0.25)'
                  }}
                >
                  <span>✏️</span> Edit Sheet (এডিট মোড চালু করুন)
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleQuickAddEmptyRow}
                    style={{
                      background: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: '4px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>+</span> Quick Add Row
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddItemModalOpen(true)}
                    style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: '4px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>📋</span> Add from Catalog
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyMasterRatesToSheet}
                    style={{
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      padding: '5px 12px',
                      borderRadius: '4px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ Reset Rates
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    style={{
                      background: '#f8fafc',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      padding: '5px 12px',
                      borderRadius: '4px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🔒 Lock View (সম্পন্ন)
                  </button>
                </>
              )}

              {hasUnsavedChanges && (
                <button
                  type="button"
                  onClick={() => handleSaveSheet()}
                  style={{
                    background: '#ea580c',
                    color: '#ffffff',
                    border: 'none',
                    padding: '5px 14px',
                    borderRadius: '4px',
                    fontSize: '11.5px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(234,88,12,0.3)'
                  }}
                >
                  💾 Save Changes (v{(selectedSheet.version || 1) + 1})
                </button>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontWeight: 800 }}>
                  <th style={{ padding: '9px 12px', width: '30px' }}>#</th>
                  <th style={{ padding: '9px 12px', width: '110px' }}>Category</th>
                  <th style={{ padding: '9px 12px', minWidth: '220px' }}>Item Name &amp; Technical Spec (Editable)</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right', width: '90px' }}>Cons / Pc</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center', width: '70px' }}>Unit</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right', width: '100px' }}>Unit Rate ($)</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right', width: '70px' }}>Waste %</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right', width: '90px' }}>Cost / Pc ($)</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right', width: '90px' }}>Cost / Dzn ($)</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right', width: '65px' }}>Share %</th>
                  <th style={{ padding: '9px 12px', minWidth: '130px' }}>Supplier / Mill</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center', width: '50px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItemizedCosts.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      No cost items found for the selected filter. Click &ldquo;+ Quick Add Row&rdquo; to insert.
                    </td>
                  </tr>
                ) : (
                  filteredItemizedCosts.map((item, idx) => {
                    const badge = getCategoryBadge(item.category);
                    const originalIndex = selectedSheet.itemizedCosts?.findIndex((it) => it.id === item.id) ?? idx;
                    const fobPrice = calculatedTotals?.finalFobPrice || 1;
                    const itemCostPc = item.costPerPc || calculateItemCostPerPc(item.unitPrice, item.consumptionPerPc, item.wastagePct);
                    const sharePct = Number(((itemCostPc / fobPrice) * 100).toFixed(1));

                    return (
                      <tr
                        key={item.id || idx}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                        }}
                      >
                        <td style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                        
                        {/* Category */}
                        <td style={{ padding: '8px 10px' }}>
                          {isEditing ? (
                            <select
                              value={item.category}
                              onChange={(e) => handleItemizedChange(originalIndex, 'category', e.target.value as any)}
                              style={{
                                width: '100%',
                                padding: '3px 5px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                fontSize: '10.5px',
                                fontWeight: 800,
                                background: badge.bg,
                                color: badge.text
                              }}
                            >
                              <option value="YARN">Yarn</option>
                              <option value="FABRIC">Fabric</option>
                              <option value="PROCESSING">Processing</option>
                              <option value="TRIMS">Trims</option>
                              <option value="PACKAGING">Packaging</option>
                              <option value="EMBELLISHMENT">Print/Emb</option>
                              <option value="CM">CM (Labor)</option>
                              <option value="WASH">Wash</option>
                              <option value="TESTING">Testing</option>
                            </select>
                          ) : (
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 800,
                              background: badge.bg,
                              color: badge.text
                            }}>
                              {badge.label}
                            </span>
                          )}
                        </td>

                        {/* Item Name & Spec */}
                        <td style={{ padding: '8px 10px' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleItemizedChange(originalIndex, 'name', e.target.value)}
                                placeholder="Item name"
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: '#0f172a',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '4px'
                                }}
                              />
                              <input
                                type="text"
                                value={item.spec || ''}
                                onChange={(e) => handleItemizedChange(originalIndex, 'spec', e.target.value)}
                                placeholder="Technical specification"
                                style={{
                                  width: '100%',
                                  padding: '3px 6px',
                                  fontSize: '10.5px',
                                  color: '#64748b',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '3px'
                                }}
                              />
                            </div>
                          ) : (
                            <div>
                              <strong style={{ color: '#0f172a', display: 'block', fontSize: '12px' }}>{item.name}</strong>
                              <span style={{ color: '#64748b', fontSize: '10.5px' }}>{item.spec}</span>
                            </div>
                          )}
                        </td>

                        {/* Consumption Per Pc */}
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.001"
                              value={item.consumptionPerPc}
                              onChange={(e) => handleItemizedChange(originalIndex, 'consumptionPerPc', Number(e.target.value))}
                              onWheel={handleNumberWheel}
                              style={{ width: '68px', textAlign: 'right', padding: '4px 6px', fontSize: '12px', border: '1px solid #94a3b8', borderRadius: '4px', fontWeight: 700 }}
                            />
                          ) : (
                            <strong style={{ color: '#0f172a' }}>{Number(item.consumptionPerPc || 0).toFixed(3)}</strong>
                          )}
                        </td>

                        {/* Unit */}
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {isEditing ? (
                            <select
                              value={item.unit}
                              onChange={(e) => handleItemizedChange(originalIndex, 'unit', e.target.value as any)}
                              style={{ padding: '4px 4px', fontSize: '11px', fontWeight: 700, borderRadius: '4px', border: '1px solid #cbd5e1', color: '#475569' }}
                            >
                              <option value="PC">PC</option>
                              <option value="KG">KG</option>
                              <option value="DZN">DZN</option>
                              <option value="GROSS">GROSS</option>
                              <option value="CONE">CONE</option>
                              <option value="YDS">YDS</option>
                              <option value="CARTON">CARTON</option>
                              <option value="SET">SET</option>
                            </select>
                          ) : (
                            <span style={{ color: '#475569', fontWeight: 700 }}>{item.unit}</span>
                          )}
                        </td>

                        {/* Unit Rate ($) */}
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.005"
                              value={item.unitPrice}
                              onChange={(e) => handleItemizedChange(originalIndex, 'unitPrice', Number(e.target.value))}
                              onWheel={handleNumberWheel}
                              style={{
                                width: '75px',
                                textAlign: 'right',
                                padding: '4px 6px',
                                fontSize: '12px',
                                border: '1.5px solid #2563eb',
                                borderRadius: '4px',
                                fontWeight: 900,
                                background: '#eff6ff',
                                color: '#1e3a8a'
                              }}
                            />
                          ) : (
                            <strong style={{ color: '#1e3a8a' }}>${Number(item.unitPrice || 0).toFixed(3)}</strong>
                          )}
                        </td>

                        {/* Wastage % */}
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          {isEditing ? (
                            <input
                              type="number"
                              step="1"
                              value={item.wastagePct}
                              onChange={(e) => handleItemizedChange(originalIndex, 'wastagePct', Number(e.target.value))}
                              onWheel={handleNumberWheel}
                              style={{ width: '45px', textAlign: 'right', padding: '4px 4px', fontSize: '11.5px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                            />
                          ) : (
                            <span style={{ color: item.wastagePct > 0 ? '#b45309' : '#64748b', fontWeight: 700 }}>
                              {item.wastagePct}%
                            </span>
                          )}
                        </td>

                        {/* Cost / Pc */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, color: '#0f172a', fontSize: '12.5px' }}>
                          ${itemCostPc.toFixed(3)}
                        </td>

                        {/* Cost / Dozen */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                          ${(itemCostPc * 12).toFixed(2)}
                        </td>

                        {/* Share of FOB */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b', fontWeight: 700 }}>
                          {sharePct}%
                        </td>

                        {/* Supplier */}
                        <td style={{ padding: '8px 10px' }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.supplier || ''}
                              onChange={(e) => handleItemizedChange(originalIndex, 'supplier', e.target.value)}
                              placeholder="Supplier"
                              style={{ width: '100%', padding: '3px 6px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                            />
                          ) : (
                            <span style={{ color: '#475569', fontSize: '11px' }}>{item.supplier || 'In-house'}</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => handleDuplicateItem(originalIndex)}
                                title="Duplicate this item (রো কপি করুন)"
                                style={{
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: '4px',
                                  padding: '3px 6px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  fontWeight: 800
                                }}
                              >
                                📋
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(originalIndex)}
                                title="Remove this item (বাদ দিন)"
                                style={{
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '3px 6px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  fontWeight: 800
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '11px' }} title="এডিট মোড চালু থাকলে রো ডুপ্লিকেট বা ডিলিট করা যাবে">
                              🔒
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: '#0f172a', color: '#ffffff', fontWeight: 800 }}>
                  <td colSpan={7} style={{ padding: '10px 14px', textAlign: 'right', fontSize: '12px' }}>
                    DIRECT MANUFACTURING TOTAL (ALL ITEMS ROLLUP):
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '13px', color: '#93c5fd' }}>
                    ${calculatedTotals?.totalProductionCostPerPc.toFixed(3)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', color: '#93c5fd' }}>
                    ${((calculatedTotals?.totalProductionCostPerPc || 0) * 12).toFixed(2)}
                  </td>
                  <td colSpan={3} style={{ padding: '10px 14px', fontSize: '11px', color: '#cbd5e1' }}>
                    Excludes overhead &amp; margins
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Table Bottom Quick Actions & Overheads Configuration Card */}
          <div style={{ padding: '16px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleQuickAddEmptyRow}
                  style={{
                    background: '#ffffff',
                    border: '1.5px dashed #2563eb',
                    color: '#2563eb',
                    padding: '6px 14px',
                    borderRadius: '5px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  + Add Empty Row (সরাসরি টেবিলে নতুন আইটেম যোগ করুন)
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(true)}
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    padding: '6px 14px',
                    borderRadius: '5px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  📋 Insert from Master Rate Catalog
                </button>
              </div>

              {hasUnsavedChanges && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11.5px', color: '#c2410c', fontWeight: 700 }}>
                    ⚠️ Unsaved changes (লাইভ হিসাব আপডেট হচ্ছে)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSaveSheet()}
                    style={{
                      background: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '7px 18px',
                      borderRadius: '5px',
                      fontSize: '12px',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(22,163,74,0.3)'
                    }}
                  >
                    💾 Save Changes as Version {(selectedSheet.version || 1) + 1}
                  </button>
                </div>
              )}
            </div>

            {/* Configurable Overheads, Margin & CM Interactive Controls */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '14px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  ⚙️ Factory Overheads, Profit Margin &amp; Commission Rates {isEditing ? '(এডিটেবল মোড)' : '(সুরক্ষিত মোড)'}
                </span>
                <span style={{ fontSize: '11px', color: isEditing ? '#b45309' : '#64748b', fontWeight: 600 }}>
                  {isEditing
                    ? '✏️ স্ক্রলে অটো কোয়ান্টিটি চেঞ্জ বন্ধ রাখা হয়েছে। মান পরিবর্তন করলে FOB প্রাইজ রিক্যালকুলেট হবে।'
                    : '🔒 মান লকড আছে। পরিবর্তন করতে চাইলে "Edit Costing" বাটনে চাপ দিন।'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                {/* CM Labor */}
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    CM (Cutting &amp; Making) Labor $/Pc:
                  </label>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 800, color: '#475569' }}>$</span>
                      <input
                        type="number"
                        step="0.05"
                        value={selectedSheet.otherCosts?.cmCuttingMakingPerPc ?? 0.92}
                        onChange={(e) => handleOverheadChange('cmCuttingMakingPerPc', Number(e.target.value))}
                        onWheel={handleNumberWheel}
                        style={{ width: '90px', padding: '4px 8px', borderRadius: '4px', border: '1.5px solid #16a34a', fontWeight: 800, fontSize: '13px', color: '#166534' }}
                      />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>/ pc</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 900, color: '#166534' }}>
                        ${Number(selectedSheet.otherCosts?.cmCuttingMakingPerPc ?? 0.92).toFixed(2)}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>/ pc</span>
                    </div>
                  )}
                </div>

                {/* Commercial Overhead */}
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Commercial Overhead (Bank &amp; LC):
                  </label>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        step="0.1"
                        value={selectedSheet.otherCosts?.commercialOverheadPct ?? 3.5}
                        onChange={(e) => handleOverheadChange('commercialOverheadPct', Number(e.target.value))}
                        onWheel={handleNumberWheel}
                        style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: '1.5px solid #2563eb', fontWeight: 800, fontSize: '13px', color: '#1e3a8a' }}
                      />
                      <span style={{ fontWeight: 800, color: '#1e3a8a' }}>%</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>(${calculatedTotals?.commercialOverheadPerPc.toFixed(2)}/pc)</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 900, color: '#1e3a8a' }}>
                        {(selectedSheet.otherCosts?.commercialOverheadPct ?? 3.5).toFixed(1)}%
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>(${calculatedTotals?.commercialOverheadPerPc.toFixed(2)}/pc)</span>
                    </div>
                  )}
                </div>

                {/* Factory Profit Margin */}
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Factory Target Profit Margin:
                  </label>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        step="0.1"
                        value={selectedSheet.otherCosts?.profitPct ?? 8.0}
                        onChange={(e) => handleOverheadChange('profitPct', Number(e.target.value))}
                        onWheel={handleNumberWheel}
                        style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: '1.5px solid #16a34a', fontWeight: 800, fontSize: '13px', color: '#166534' }}
                      />
                      <span style={{ fontWeight: 800, color: '#166534' }}>%</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>(${calculatedTotals?.profitPerPc.toFixed(2)}/pc)</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 900, color: '#166534' }}>
                        {(selectedSheet.otherCosts?.profitPct ?? 8.0).toFixed(1)}%
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>(${calculatedTotals?.profitPerPc.toFixed(2)}/pc)</span>
                    </div>
                  )}
                </div>

                {/* Buying Commission */}
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Buying House / Agent Commission:
                  </label>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        step="0.1"
                        value={selectedSheet.otherCosts?.buyingCommissionPct ?? 5.0}
                        onChange={(e) => handleOverheadChange('buyingCommissionPct', Number(e.target.value))}
                        onWheel={handleNumberWheel}
                        style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: '1.5px solid #b45309', fontWeight: 800, fontSize: '13px', color: '#92400e' }}
                      />
                      <span style={{ fontWeight: 800, color: '#92400e' }}>%</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>(${calculatedTotals?.buyingCommissionPerPc.toFixed(2)}/pc)</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 900, color: '#92400e' }}>
                        {(selectedSheet.otherCosts?.buyingCommissionPct ?? 5.0).toFixed(1)}%
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>(${calculatedTotals?.buyingCommissionPerPc.toFixed(2)}/pc)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 6. TAB 2: FABRIC CONSUMPTION & MATRICES */}
      {activeTab === 'FABRIC_MATRICES' && selectedSheet && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              Fabric Consumption Matrix (Yarn, Knitting &amp; Dyeing Calculation)
            </h3>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
              Formula: (Length + Allowance) × (Width + Allowance) × GSM × 12 / 10,000,000 + Wastage %
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#334155', fontWeight: 800 }}>
                  <th style={{ padding: '8px 10px' }}>Fabric</th>
                  <th style={{ padding: '8px 10px' }}>Description</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>B/Width (in)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>B/Length (cm)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>S/L (cm)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>GSM</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Cons / Pc (kg)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Waste %</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Cons (kg)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Dozen (kg)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Knitting ($)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Dyeing ($)</th>
                </tr>
              </thead>
              <tbody>
                {(selectedSheet.fabrics || []).map((fab, idx) => (
                  <tr key={fab.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: '#1e3a8a' }}>{fab.fabricTag}</td>
                    <td style={{ padding: '8px 10px' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={fab.fabricDescription}
                          onChange={(e) => handleFabricRowChange(idx, 'fabricDescription', e.target.value)}
                          style={{ width: '100%', padding: '3px 6px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '3px' }}
                        />
                      ) : (
                        <span style={{ fontWeight: 600 }}>{fab.fabricDescription}</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={fab.bWidth}
                          onChange={(e) => handleFabricRowChange(idx, 'bWidth', Number(e.target.value))}
                          onWheel={handleNumberWheel}
                          style={{ width: '50px', textAlign: 'right', padding: '3px', fontSize: '11px', border: '1px solid #cbd5e1' }}
                        />
                      ) : fab.bWidth}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={fab.bLength}
                          onChange={(e) => handleFabricRowChange(idx, 'bLength', Number(e.target.value))}
                          onWheel={handleNumberWheel}
                          style={{ width: '50px', textAlign: 'right', padding: '3px', fontSize: '11px', border: '1px solid #cbd5e1' }}
                        />
                      ) : fab.bLength}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={fab.slCm || 0}
                          onChange={(e) => handleFabricRowChange(idx, 'slCm', Number(e.target.value))}
                          onWheel={handleNumberWheel}
                          style={{ width: '45px', textAlign: 'right', padding: '3px', fontSize: '11px', border: '1px solid #cbd5e1' }}
                        />
                      ) : (fab.slCm || '—')}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={fab.gsm}
                          onChange={(e) => handleFabricRowChange(idx, 'gsm', Number(e.target.value))}
                          onWheel={handleNumberWheel}
                          style={{ width: '50px', textAlign: 'right', padding: '3px', fontSize: '11px', border: '1px solid #cbd5e1' }}
                        />
                      ) : fab.gsm}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{Number(fab.consumptionKg).toFixed(3)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#b45309', fontWeight: 700 }}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={fab.wastePct}
                          onChange={(e) => handleFabricRowChange(idx, 'wastePct', Number(e.target.value))}
                          onWheel={handleNumberWheel}
                          style={{ width: '45px', textAlign: 'right', padding: '3px', fontSize: '11px', border: '1px solid #cbd5e1' }}
                        />
                      ) : `${fab.wastePct}%`}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>{Number(fab.totalConsumptionKg).toFixed(3)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{Number(fab.dozen).toFixed(2)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.05"
                          value={fab.knittingCost}
                          onChange={(e) => handleFabricRowChange(idx, 'knittingCost', Number(e.target.value))}
                          onWheel={handleNumberWheel}
                          style={{ width: '55px', textAlign: 'right', padding: '3px', fontSize: '11px', border: '1px solid #cbd5e1' }}
                        />
                      ) : `$${Number(fab.knittingCost).toFixed(2)}`}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.05"
                          value={fab.dyeingFinishingCost}
                          onChange={(e) => handleFabricRowChange(idx, 'dyeingFinishingCost', Number(e.target.value))}
                          onWheel={handleNumberWheel}
                          style={{ width: '55px', textAlign: 'right', padding: '3px', fontSize: '11px', border: '1px solid #cbd5e1' }}
                        />
                      ) : `$${Number(fab.dyeingFinishingCost).toFixed(2)}`}
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. TAB 3: TRIMS & PACKAGING BOM */}
      {activeTab === 'TRIMS_BOM' && selectedSheet && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              Trims, Fasteners &amp; Packaging BOM Breakdown
            </h3>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
              Every single trim has its unit rate ($ / gross / dzn / pc) and calculated contribution
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            {(selectedSheet.accessories || []).map((acc) => (
              <div key={acc.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '12.5px', color: '#0f172a', display: 'block' }}>{acc.item}</strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Supplier: {acc.supplier || 'Nominated'}</span>
                  <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>Dzn: ${Number(acc.costPerDzn || 0).toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '15px', color: '#2563eb' }}>${Number(acc.costPerPc || 0).toFixed(3)}</strong>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>/ Pc</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. TAB 4: MASTER RATES LIBRARY */}
      {activeTab === 'MASTER_RATES' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '14px 20px', background: '#0f172a', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 900 }}>Northern Fashions Master Item Rates Catalog (স্ট্যান্ডার্ড আইটেম রেট কার্ড)</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Official predefined standard unit rates for all yarn, fabrics, trims, embellishments, labor (CM), and packaging.
              </div>
            </div>
            <button
              type="button"
              onClick={handleApplyMasterRatesToSheet}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              ⚡ Apply Master Rates to Current Sheet
            </button>
          </div>

          <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search master rates..."
              value={masterRatesSearch}
              onChange={(e) => setMasterRatesSearch(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', width: '220px' }}
            />
            <select
              value={masterRatesCategory}
              onChange={(e) => setMasterRatesCategory(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
            >
              <option value="ALL">All Categories</option>
              <option value="YARN">Yarn</option>
              <option value="PROCESSING">Processing (Knit/Dye/AOP)</option>
              <option value="TRIMS">Trims &amp; Labels</option>
              <option value="PACKAGING">Packaging</option>
              <option value="EMBELLISHMENT">Embellishment</option>
              <option value="CM">CM (Labor)</option>
              <option value="WASH">Washing</option>
              <option value="TESTING">Testing</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#334155', fontWeight: 800 }}>
                  <th style={{ padding: '8px 12px' }}>Category</th>
                  <th style={{ padding: '8px 12px' }}>Item Name</th>
                  <th style={{ padding: '8px 12px' }}>Technical Specification</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Unit</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Standard Unit Rate ($)</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Default Cons / Pc</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Waste %</th>
                  <th style={{ padding: '8px 12px' }}>Preferred Supplier</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {masterRates
                  .filter((r) => {
                    const matchCat = masterRatesCategory === 'ALL' || r.category === masterRatesCategory;
                    const matchQ =
                      !masterRatesSearch ||
                      r.name.toLowerCase().includes(masterRatesSearch.toLowerCase()) ||
                      r.spec.toLowerCase().includes(masterRatesSearch.toLowerCase()) ||
                      r.defaultSupplier.toLowerCase().includes(masterRatesSearch.toLowerCase());
                    return matchCat && matchQ;
                  })
                  .map((rate, idx) => {
                    const badge = getCategoryBadge(rate.category);
                    return (
                      <tr key={rate.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, background: badge.bg, color: badge.text }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 800, color: '#0f172a' }}>{rate.name}</td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{rate.spec}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>{rate.unit}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 900, color: '#1e3a8a' }}>
                          ${rate.defaultRate.toFixed(3)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{rate.defaultConsumption}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#b45309', fontWeight: 700 }}>{rate.defaultWastagePct}%</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{rate.defaultSupplier}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleAddFromMasterRate(rate)}
                            style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            + Insert in Sheet
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. MODAL: ADD COST ITEM (Custom or From Catalog) */}
      {isAddItemModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '600px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{ background: '#0f172a', color: '#ffffff', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 900 }}>Add Component / Item to Costing Sheet</div>
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Category */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Item Category
                </label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value as CostItemCategory)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                >
                  <option value="TRIMS">Trims &amp; Accessories</option>
                  <option value="PACKAGING">Packaging &amp; Shipping</option>
                  <option value="YARN">Yarn &amp; Fibers</option>
                  <option value="FABRIC">Fabric</option>
                  <option value="PROCESSING">Mills Processing (Knit/Dye)</option>
                  <option value="EMBELLISHMENT">Print &amp; Embroidery</option>
                  <option value="CM">CM (Direct Labor)</option>
                  <option value="WASH">Garment Wash</option>
                  <option value="TESTING">Testing &amp; Inspection</option>
                </select>
              </div>

              {/* Item Name */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Item Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. 4-Hole Engraved Resin Button 18L"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              {/* Specification */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Specification / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3 pcs for polo placket, dyed to match color"
                  value={newItemSpec}
                  onChange={(e) => setNewItemSpec(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              {/* Unit, Rate, Consumption, Wastage grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Unit</label>
                  <select
                    value={newItemUnit}
                    onChange={(e: any) => setNewItemUnit(e.target.value)}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11.5px' }}
                  >
                    <option value="PC">PC</option>
                    <option value="KG">KG</option>
                    <option value="DZN">DZN</option>
                    <option value="GROSS">GROSS</option>
                    <option value="CONE">CONE</option>
                    <option value="YDS">YDS</option>
                    <option value="CARTON">CARTON</option>
                    <option value="SET">SET</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Unit Rate ($)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newItemRate}
                    onChange={(e) => setNewItemRate(Number(e.target.value))}
                    onWheel={handleNumberWheel}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11.5px', textAlign: 'right' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Cons / Pc</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItemConsumption}
                    onChange={(e) => setNewItemConsumption(Number(e.target.value))}
                    onWheel={handleNumberWheel}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11.5px', textAlign: 'right' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Waste %</label>
                  <input
                    type="number"
                    step="1"
                    value={newItemWastage}
                    onChange={(e) => setNewItemWastage(Number(e.target.value))}
                    onWheel={handleNumberWheel}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11.5px', textAlign: 'right' }}
                  />
                </div>
              </div>

              {/* Supplier */}
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Supplier / Vendor
                </label>
                <input
                  type="text"
                  placeholder="e.g. Avery Dennison / Coats / In-house"
                  value={newItemSupplier}
                  onChange={(e) => setNewItemSupplier(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              {/* Calculated Result Preview */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>Calculated Cost per Single Piece:</span>
                <strong style={{ fontSize: '16px', color: '#2563eb' }}>
                  ${calculateItemCostPerPc(newItemRate, newItemConsumption, newItemWastage).toFixed(4)} / Pc
                  <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>
                    (${((calculateItemCostPerPc(newItemRate, newItemConsumption, newItemWastage)) * 12).toFixed(2)}/Dzn)
                  </span>
                </strong>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '5px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newItemName) {
                      alert('Please provide an item name');
                      return;
                    }
                    const costPc = calculateItemCostPerPc(newItemRate, newItemConsumption, newItemWastage);
                    const item: ItemizedCostItem = {
                      id: `item-custom-${Date.now()}`,
                      category: newItemCategory,
                      name: newItemName,
                      spec: newItemSpec || 'Custom specification',
                      unit: newItemUnit,
                      unitPrice: newItemRate,
                      consumptionPerPc: newItemConsumption,
                      wastagePct: newItemWastage,
                      costPerPc: costPc,
                      costPerDzn: Number((costPc * 12).toFixed(3)),
                      supplier: newItemSupplier
                    };
                    handleAddItemToSheet(item);
                  }}
                  style={{ padding: '8px 18px', borderRadius: '5px', border: 'none', background: '#2563eb', color: '#ffffff', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Insert Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. MODAL: CREATE NEW STYLE COSTING */}
      {isCreateStyleModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '550px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{ background: '#0f172a', color: '#ffffff', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 900 }}>Create New Garment Style Costing</div>
              <button
                type="button"
                onClick={() => setIsCreateStyleModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Style Reference Number (Style Ref)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 22045990"
                  value={newStyleRef}
                  onChange={(e) => setNewStyleRef(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Garment Description &amp; Item
                </label>
                <input
                  type="text"
                  placeholder="e.g. onlORGANIC COTTON HENLEY TEE"
                  value={newStyleDesc}
                  onChange={(e) => setNewStyleDesc(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Buyer</label>
                  <select
                    value={newStyleBuyer}
                    onChange={(e) => setNewStyleBuyer(e.target.value)}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11.5px' }}
                  >
                    <option value="ONLY">ONLY</option>
                    <option value="ONS">ONS</option>
                    <option value="CARMA">CARMA</option>
                    <option value="OVS">OVS</option>
                    <option value="Name It">Name It</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Order Qty</label>
                  <input
                    type="number"
                    value={newStyleQty}
                    onChange={(e) => setNewStyleQty(Number(e.target.value))}
                    onWheel={handleNumberWheel}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11.5px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Division</label>
                  <input
                    type="text"
                    value={newStyleDiv}
                    onChange={(e) => setNewStyleDiv(e.target.value)}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11.5px' }}
                  />
                </div>
              </div>

              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '10px', fontSize: '11.5px', color: '#1e40af' }}>
                💡 <strong>Auto-Generation:</strong> All required itemized components (Body yarn, Rib, Knitting, Dyeing, All Labels, Poly, Carton, Thread, CM, Softener wash, Testing) will be automatically populated with standard unit rates from the Master Item Rate Catalog.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateStyleModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '5px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewStyleCosting}
                  style={{ padding: '8px 18px', borderRadius: '5px', border: 'none', background: '#16a34a', color: '#ffffff', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Generate Cost Sheet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 11. PRINT PREVIEW MODAL */}
      {isPrintPreview && selectedSheet && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px 30px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            color: '#0f172a'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 900 }}>NORTHERN FASHIONS LIMITED</div>
                <div style={{ fontSize: '12px', color: '#475569' }}>Garments Merchandising &amp; Pre-Order Costing Division</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>OFFICIAL GARMENT COST QUOTATION SHEET</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Style Ref: <strong>{selectedSheet.header.styleRef}</strong></div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Buyer: <strong>{selectedSheet.header.buyer}</strong></div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Date: <strong>{selectedSheet.header.date}</strong></div>
                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 800 }}>FOB Quotation: ${calculatedTotals?.finalFobPrice.toFixed(2)} / Pc</div>
              </div>
            </div>

            <div style={{ fontSize: '12px', marginBottom: '16px' }}>
              <strong>Garment Description:</strong> {selectedSheet.header.garmentDescription} | <strong>Order Qty:</strong> {selectedSheet.header.orderQty.toLocaleString()} Pcs | <strong>Division:</strong> {selectedSheet.header.divGroup}
            </div>

            {/* Print Itemized Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #0f172a' }}>
                  <th style={{ padding: '6px', textAlign: 'left' }}>Item Name &amp; Spec</th>
                  <th style={{ padding: '6px', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Consumption</th>
                  <th style={{ padding: '6px', textAlign: 'center' }}>Unit</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Rate ($)</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Waste %</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Cost / Pc ($)</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Cost / Dzn ($)</th>
                </tr>
              </thead>
              <tbody>
                {(selectedSheet.itemizedCosts || []).map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '5px 6px' }}>
                      <strong>{it.name}</strong>
                      <div style={{ fontSize: '9.5px', color: '#64748b' }}>{it.spec}</div>
                    </td>
                    <td style={{ padding: '5px 6px' }}>{it.category}</td>
                    <td style={{ padding: '5px 6px', textAlign: 'right' }}>{it.consumptionPerPc}</td>
                    <td style={{ padding: '5px 6px', textAlign: 'center' }}>{it.unit}</td>
                    <td style={{ padding: '5px 6px', textAlign: 'right' }}>${it.unitPrice.toFixed(3)}</td>
                    <td style={{ padding: '5px 6px', textAlign: 'right' }}>{it.wastagePct}%</td>
                    <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 800 }}>${it.costPerPc.toFixed(3)}</td>
                    <td style={{ padding: '5px 6px', textAlign: 'right' }}>${it.costPerDzn.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #0f172a', fontWeight: 900 }}>
                  <td colSpan={6} style={{ padding: '8px', textAlign: 'right' }}>FINAL FOB PRICE PER GARMENT:</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#2563eb', fontSize: '13px' }}>
                    ${calculatedTotals?.finalFobPrice.toFixed(2)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#2563eb', fontSize: '13px' }}>
                    ${calculatedTotals?.costPerDzn.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Signature Block */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #cbd5e1' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #475569', width: '80%', margin: '0 auto 6px' }}></div>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>Prepared by (Merchandiser)</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>{selectedSheet.revisions?.[0]?.revisedBy || 'Shamim Hossain'}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #475569', width: '80%', margin: '0 auto 6px' }}></div>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>Checked by (Head of Merch)</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Tariqul Islam</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #475569', width: '80%', margin: '0 auto 6px' }}></div>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>Approved by (Managing Director)</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Approved &amp; Confirmed</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '5px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
              >
                🖨️ Print
              </button>
              <button
                type="button"
                onClick={() => setIsPrintPreview(false)}
                style={{ background: '#475569', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '5px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
