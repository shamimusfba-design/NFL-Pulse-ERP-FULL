'use client';

import React, { useMemo, useState } from 'react';
import {
  Warehouse,
  Search,
  MapPin,
  ArrowRight,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Package,
  Layers,
  ExternalLink,
  FileSpreadsheet
} from 'lucide-react';

/**
 * Finished Fabric Store — 20 Master Racks × 20 Shelves location tracking.
 * Mirrors the Trims & Accessories location tracking layout.
 * Racks are general (not buyer-fixed). A shelf can hold multiple jobs/colors.
 */

export const FABRIC_RACKS = 20;
export const FABRIC_SHELVES = 20;

export interface ShelfItem {
  lineId: string;
  jobNo: string;
  buyer: string;
  style: string;
  color: string;
  fabric?: string;
  kg: number;
  rolls?: number;
  placedOn: string;
  custom?: string;
}

/**
 * Key = "R01-S01" to "R20-S20", or "X:<lineId>" for custom locations outside racks.
 * Supports array of ShelfItem per shelf (multi-job / multi-color shelf support).
 */
export type RackLocations = Record<string, ShelfItem[] | any>;

export const isShelfKey = (k: string) => /^R\d+-S\d+$/.test(k);
export const customKey = (lineId: string) => `X:${lineId}`;

export const shelfId = (rack: number, shelf: number) =>
  `R${String(rack).padStart(2, '0')}-S${String(shelf).padStart(2, '0')}`;

export const shelfLabel = (id: string) => {
  const m = /^R(\d+)-S(\d+)$/.exec(id);
  if (!m) return id;
  return `Rack ${m[1]} · Shelf ${m[2]}`;
};

export const ALL_SHELVES: string[] = Array.from({ length: FABRIC_RACKS }, (_, r) =>
  Array.from({ length: FABRIC_SHELVES }, (_, s) => shelfId(r + 1, s + 1))
).flat();

/** Normalize any stored shelf value into an array of ShelfItem */
export function getShelfItems(locations: RackLocations, sid: string): ShelfItem[] {
  const val = locations[sid];
  if (!val) return [];
  if (Array.isArray(val)) return val;
  // Backwards compatibility with v1 single assignment { lineId, placedOn, custom }
  if (val && typeof val === 'object' && val.lineId) {
    return [{
      lineId: val.lineId,
      jobNo: val.jobNo || '',
      buyer: val.buyer || '',
      style: val.style || '',
      color: val.color || '',
      fabric: val.fabric || '',
      kg: Number(val.kg) || 0,
      rolls: Number(val.rolls) || 1,
      placedOn: val.placedOn || '',
      custom: val.custom,
    }];
  }
  return [];
}

/** Human label for any location */
export function locLabel(key: string | undefined, locations: RackLocations): string {
  if (!key) return '';
  if (isShelfKey(key)) return shelfLabel(key);
  const items = getShelfItems(locations, key);
  return items[0]?.custom ? `Other: ${items[0].custom}` : key;
}

export type LocationPick = { mode: 'shelf' | 'other'; rack: string; shelf: string; other: string };
export const emptyPick = (): LocationPick => ({ mode: 'shelf', rack: '', shelf: '', other: '' });

export const pickIsValid = (p: LocationPick, _locations?: RackLocations) => {
  if (p.mode === 'shelf') return !!p.shelf;
  return p.other.trim().length > 0;
};

export const pickLabel = (p: LocationPick) => {
  if (p.mode === 'shelf') return p.shelf ? shelfLabel(p.shelf) : '';
  return p.other.trim() ? `Other: ${p.other.trim()}` : '';
};

/** Put a colour at a shelf or a custom place. Returns the updated map. */
export function assignLocation(
  locations: RackLocations,
  lineId: string,
  pick: LocationPick,
  placedOn: string,
  extra?: Partial<ShelfItem>
): RackLocations {
  const next: RackLocations = {};

  // Copy existing, removing this lineId from any previous shelf
  Object.entries(locations).forEach(([k, val]) => {
    const list = getShelfItems(locations, k).filter(it => it.lineId !== lineId);
    if (list.length > 0) next[k] = list;
  });

  const newItem: ShelfItem = {
    lineId,
    jobNo: extra?.jobNo || '',
    buyer: extra?.buyer || '',
    style: extra?.style || '',
    color: extra?.color || '',
    fabric: extra?.fabric || '',
    kg: Number(extra?.kg) || 0,
    rolls: Number(extra?.rolls) || 1,
    placedOn,
    custom: pick.mode === 'other' ? pick.other.trim() : undefined,
  };

  const targetKey = pick.mode === 'shelf' ? pick.shelf : customKey(lineId);
  if (targetKey) {
    const current = next[targetKey] ? [...next[targetKey]] : [];
    current.push(newItem);
    next[targetKey] = current;
  }

  return next;
}

export interface RackLine {
  id: string;
  buyer: string;
  jobNo: string;
  style: string;
  color: string;
  fabric: string;
  fabricType?: string;
  composition?: string;
  gsm: string;
  dia: string;
  reqBody?: number;
  reqRib?: number;
  reqSJ?: number;
  totalReq?: number;
  recvBody?: number;
  recvRib?: number;
  recvSJ?: number;
  totalRecv?: number;
  issuedBody?: number;
  issuedRib?: number;
  issuedSJ?: number;
  totalIssued?: number;
  stockBalance: number;
  deliveryDate?: string;
}

const BUYER_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#d97706', '#059669', '#0891b2', '#dc2626', '#4f46e5', '#65a30d', '#0f766e'];
export function buyerColor(buyer: string) {
  let h = 0;
  for (const ch of buyer || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return BUYER_COLORS[h % BUYER_COLORS.length];
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Dropdown picker for selecting Rack & Shelf
 */
export function LocationPicker({
  locations,
  value,
  onChange,
  compact = false,
}: {
  locations: RackLocations;
  value: LocationPick;
  onChange: (v: LocationPick) => void;
  lineLabel?: (lineId: string) => string;
  compact?: boolean;
}) {
  const sel = 'border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-slate-900';
  return (
    <div className={`flex ${compact ? 'flex-wrap' : 'flex-wrap'} items-center gap-2`}>
      <select
        className={sel}
        value={value.mode === 'other' ? '__other' : value.rack}
        onChange={e => {
          const v = e.target.value;
          if (v === '__other') onChange({ ...value, mode: 'other', rack: '', shelf: '' });
          else onChange({ ...value, mode: 'shelf', rack: v, shelf: '' });
        }}
      >
        <option value="">Select Rack...</option>
        {Array.from({ length: FABRIC_RACKS }, (_, r) => {
          const rNum = r + 1;
          return (
            <option key={r} value={String(rNum)}>
              Rack R-{String(rNum).padStart(2, '0')} (Finished Store)
            </option>
          );
        })}
        <option value="__other">Other Store Location (Custom Text)...</option>
      </select>

      {value.mode === 'shelf' && (
        <select
          className={sel}
          value={value.shelf}
          disabled={!value.rack}
          onChange={e => onChange({ ...value, shelf: e.target.value })}
        >
          <option value="">Select Shelf (1-20)...</option>
          {value.rack &&
            Array.from({ length: FABRIC_SHELVES }, (_, i) => {
              const sid = shelfId(Number(value.rack), i + 1);
              const items = getShelfItems(locations, sid);
              const count = items.length;
              return (
                <option key={sid} value={sid}>
                  Shelf {String(i + 1).padStart(2, '0')}{count > 0 ? ` (${count} items stored)` : ' (Free)'}
                </option>
              );
            })}
        </select>
      )}

      {value.mode === 'other' && (
        <input
          autoFocus
          className={`${sel} min-w-[220px]`}
          placeholder="e.g. Floor buffer gate 2, Bay 3, NCL Store"
          value={value.other}
          onChange={e => onChange({ ...value, other: e.target.value })}
        />
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: FABRIC RACK LOCATION TRACKING (20 RACKS × 20 SHELVES)
// ============================================================================

export default function FabricRackLocation({
  lines,
  locations,
  onChange,
  initialSub = 'racks',
  initialQuery = '',
}: {
  lines: RackLine[];
  locations: RackLocations;
  onChange: (next: RackLocations, message: string) => void;
  initialSub?: 'racks' | 'tracking';
  initialQuery?: string;
}) {
  const [subTab, setSubTab] = useState<'LAYOUT' | 'JOB_SEARCH'>(
    initialSub === 'tracking' ? 'JOB_SEARCH' : 'LAYOUT'
  );
  const [selectedRackNum, setSelectedRackNum] = useState<number>(1);
  const [expandedShelf, setExpandedShelf] = useState<string | null>(null);
  const [jobSearchQuery, setJobSearchQuery] = useState(initialQuery || '48002');
  const [floorPlanSearch, setFloorPlanSearch] = useState('');
  const [addFabricLineId, setAddFabricLineId] = useState('');

  // Map of lineId -> line
  const byId = useMemo(() => {
    const m = new Map<string, RackLine>();
    lines.forEach(l => m.set(l.id, l));
    return m;
  }, [lines]);

  // Lookup of lineId -> shelf keys where it is placed
  const lineShelfMap = useMemo(() => {
    const m: Record<string, string[]> = {};
    Object.entries(locations).forEach(([sid, val]) => {
      const items = getShelfItems(locations, sid);
      items.forEach(it => {
        if (!m[it.lineId]) m[it.lineId] = [];
        m[it.lineId].push(sid);
      });
    });
    return m;
  }, [locations]);

  // Stats across the 400 shelves
  const shelfStats = useMemo(() => {
    let occupiedCount = 0;
    let totalItems = 0;
    let totalKg = 0;
    const rackOccMap: Record<number, number> = {};

    for (let r = 1; r <= FABRIC_RACKS; r++) {
      let rOcc = 0;
      for (let s = 1; s <= FABRIC_SHELVES; s++) {
        const sid = shelfId(r, s);
        const items = getShelfItems(locations, sid);
        if (items.length > 0) {
          occupiedCount++;
          rOcc++;
          totalItems += items.length;
          items.forEach(it => { totalKg += Number(it.kg) || 0; });
        }
      }
      rackOccMap[r] = rOcc;
    }

    return {
      totalShelves: ALL_SHELVES.length,
      occupiedCount,
      freeCount: ALL_SHELVES.length - occupiedCount,
      totalItems,
      totalKg,
      rackOccMap,
    };
  }, [locations]);

  // Available in-store lines not yet on a rack
  const unplacedLines = useMemo(() => {
    return lines.filter(l => l.stockBalance > 0.5 && (!lineShelfMap[l.id] || lineShelfMap[l.id].length === 0));
  }, [lines, lineShelfMap]);

  // Handle adding an item to currently expanded shelf
  const handleAddItemToShelf = (sid: string, lineId: string) => {
    if (!lineId) return;
    const line = byId.get(lineId);
    if (!line) return;

    const next = assignLocation(locations, lineId, { mode: 'shelf', rack: String(selectedRackNum), shelf: sid, other: '' }, today(), {
      jobNo: line.jobNo,
      buyer: line.buyer,
      style: line.style,
      color: line.color,
      fabric: `${line.fabric} ${line.gsm} GSM`,
      kg: line.stockBalance,
      rolls: 1,
    });

    onChange(next, `Added ${line.jobNo} (${line.color}) to ${shelfLabel(sid)}`);
    setAddFabricLineId('');
  };

  // Handle removing item from shelf
  const handleRemoveItem = (sid: string, lineId: string) => {
    const items = getShelfItems(locations, sid).filter(it => it.lineId !== lineId);
    const next = { ...locations };
    if (items.length > 0) {
      next[sid] = items;
    } else {
      delete next[sid];
    }
    const line = byId.get(lineId);
    onChange(next, `Removed ${line?.jobNo || ''} from ${shelfLabel(sid)}`);
  };

  // Job Search matching
  const searchedJob = useMemo(() => {
    const q = jobSearchQuery.trim().toLowerCase();
    if (!q) return null;

    // Find all lines matching jobNo
    const matched = lines.filter(l =>
      l.jobNo.toLowerCase().includes(q) ||
      l.buyer.toLowerCase().includes(q) ||
      l.style.toLowerCase().includes(q)
    );

    if (matched.length === 0) return null;

    const first = matched[0];
    return {
      jobNo: first.jobNo,
      buyer: first.buyer,
      style: first.style,
      fabric: first.fabric,
      gsm: first.gsm,
      dia: first.dia,
      colors: matched,
    };
  }, [lines, jobSearchQuery]);

  const selectedRackId = `R-${String(selectedRackNum).padStart(2, '0')}`;

  return (
    <div className="flex flex-col gap-4">
      {/* =================================================================== */}
      {/* SUB-TABS: 1. Present Store Layout | 2. Job-wise Location Search */}
      {/* =================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('LAYOUT')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
              subTab === 'LAYOUT'
                ? 'bg-blue-50 text-blue-900 border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Warehouse size={15} color={subTab === 'LAYOUT' ? '#1D4ED8' : '#64748B'} />
            <span>1. Present Store Layout (20 Master Racks × 20 Shelves)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('JOB_SEARCH')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
              subTab === 'JOB_SEARCH'
                ? 'bg-blue-50 text-blue-900 border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Search size={15} color={subTab === 'JOB_SEARCH' ? '#1D4ED8' : '#64748B'} />
            <span>2. Job-wise Location Search</span>
          </button>
        </div>

        {/* Global Summary Badge Counters */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700">
            Total Shelves: <strong className="text-slate-900">{shelfStats.totalShelves}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200 text-sky-800">
            Occupied: <strong className="text-sky-900">{shelfStats.occupiedCount}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800">
            Free: <strong className="text-emerald-900">{shelfStats.freeCount}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-purple-50 border border-purple-200 text-purple-800">
            In Store Total: <strong className="text-purple-900">{Math.round(shelfStats.totalKg).toLocaleString()} kg</strong>
          </span>
          {unplacedLines.length > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
              Unplaced Fabrics: <strong className="text-amber-900">{unplacedLines.length}</strong>
            </span>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* SUB-TAB 1: PRESENT STORE LAYOUT (20 RACKS GRID + SELECTED RACK MATRIX) */}
      {/* =================================================================== */}
      {subTab === 'LAYOUT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT 7-8 COLS: Warehouse Floor Plan (20 Master Racks) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-[#0F274E] m-0 flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-sky-600" />
                  Warehouse Floor Plan (20 Master Racks)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  General Fabric Storage Racks · Each rack contains 20 storage shelves
                </p>
              </div>

              {/* Floor Plan Quick Filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={floorPlanSearch}
                  onChange={e => setFloorPlanSearch(e.target.value)}
                  placeholder="Find Job / Color on racks..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 w-[220px] focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                {floorPlanSearch && (
                  <button onClick={() => setFloorPlanSearch('')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 20 RACKS GRID (5 Columns × 4 Rows) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {Array.from({ length: FABRIC_RACKS }, (_, i) => {
                const rNum = i + 1;
                const rId = `R-${String(rNum).padStart(2, '0')}`;
                const isSelected = selectedRackNum === rNum;
                const occ = shelfStats.rackOccMap[rNum] || 0;

                // Check if this rack matches floor search
                const hasMatch = floorPlanSearch.trim() && Array.from({ length: FABRIC_SHELVES }, (_, s) => {
                  const sid = shelfId(rNum, s + 1);
                  const items = getShelfItems(locations, sid);
                  return items.some(it =>
                    `${it.jobNo} ${it.color} ${it.buyer} ${it.style}`.toLowerCase().includes(floorPlanSearch.toLowerCase())
                  );
                }).some(Boolean);

                return (
                  <div
                    key={rNum}
                    onClick={() => {
                      setSelectedRackNum(rNum);
                      setExpandedShelf(null);
                    }}
                    className={`cursor-pointer rounded-xl border p-3 transition-all text-center flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50 text-blue-950 border-2 border-blue-600 shadow-md ring-2 ring-blue-300 font-bold'
                        : hasMatch
                        ? 'bg-amber-50 border-amber-400 text-slate-900 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                    style={{ minHeight: '92px' }}
                  >
                    <div>
                      <div className={`text-xs font-black tracking-wider ${isSelected ? 'text-blue-950 font-black' : 'text-slate-900 font-extrabold'}`}>
                        {rId}
                      </div>
                      <div className={`text-[10px] uppercase font-bold mt-0.5 ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>
                        General Fabric
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <div className={`text-[11px] font-bold ${isSelected ? 'text-blue-900' : occ > 0 ? 'text-sky-800' : 'text-slate-400'}`}>
                        {occ} / 20 Shelves
                      </div>
                      {/* Mini visual occupancy bar */}
                      <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isSelected ? 'bg-blue-600' : occ > 15 ? 'bg-rose-500' : occ > 0 ? 'bg-sky-600' : 'bg-transparent'
                          }`}
                          style={{ width: `${(occ / 20) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
              <span>● Click any Rack above to view its 20 Storage Shelves on the right.</span>
              <span>● Click on any shelf row to fold/unfold items stored inside.</span>
            </div>
          </div>

          {/* RIGHT 4-5 COLS: Selected Rack Matrix (Shelf 01 to Shelf 20) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sticky top-4">
            <div className="border-b border-slate-100 pb-3 mb-3">
              <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider">
                SELECTED RACK MATRIX
              </div>
              <div className="text-base font-extrabold text-[#0F274E] mt-0.5 flex items-center justify-between">
                <span>{selectedRackId} (General Store)</span>
                <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {shelfStats.rackOccMap[selectedRackNum] || 0} / 20 Shelves
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Zone: Finished Fabric Bay · 20 Storage Shelves
              </div>
            </div>

            {/* 20 Storage Shelves Accordion List */}
            <div className="overflow-y-auto max-h-[580px] space-y-2 pr-1 divide-y divide-slate-100">
              {Array.from({ length: FABRIC_SHELVES }, (_, sIdx) => {
                const sNum = sIdx + 1;
                const sid = shelfId(selectedRackNum, sNum);
                const items = getShelfItems(locations, sid);
                const isFolded = expandedShelf !== sid;
                const isOccupied = items.length > 0;
                const shelfTotalKg = items.reduce((sum, it) => sum + (Number(it.kg) || 0), 0);

                return (
                  <div key={sid} className="pt-2 first:pt-0">
                    {/* Shelf Header Row (Click to toggle fold/unfold) */}
                    <div
                      onClick={() => setExpandedShelf(isFolded ? sid : null)}
                      className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors border ${
                        isOccupied
                          ? isFolded
                            ? 'bg-sky-50/60 hover:bg-sky-100/60 border-sky-200'
                            : 'bg-sky-100 border-sky-300 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isFolded ? (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-sky-700" />
                        )}
                        <div>
                          <span className="text-xs font-bold text-slate-900 block leading-tight">
                            Shelf {String(sNum).padStart(2, '0')}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {isOccupied
                              ? `${items.length} Color${items.length > 1 ? 's' : ''} stored`
                              : 'Empty shelf'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        {isOccupied ? (
                          <span className="text-[11px] font-black text-sky-800 bg-white px-2 py-0.5 rounded border border-sky-200">
                            {Math.round(shelfTotalKg).toLocaleString()} kg
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">
                            FREE
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unfolded Content (Multi-job / Multi-color list) */}
                    {!isFolded && (
                      <div className="mt-2 pl-4 pr-1 pb-2 space-y-2 border-l-2 border-sky-400 ml-2 animate-in fade-in duration-150">
                        {isOccupied ? (
                          items.map((it, idx) => (
                            <div
                              key={`${it.lineId}-${idx}`}
                              className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-xs text-xs"
                            >
                              <div className="flex items-center justify-between font-bold text-slate-900">
                                <span>{it.buyer} - {it.jobNo}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(sid, it.lineId)}
                                  className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50"
                                  title="Take out from shelf"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="text-[11px] text-slate-600 mt-0.5">
                                Style: <strong className="text-slate-800">{it.style || '—'}</strong>
                              </div>
                              <div className="text-[11px] text-sky-800 font-bold mt-0.5">
                                Color: {it.color}
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-100">
                                <span>Weight: <strong className="text-slate-800 font-bold">{Math.round(it.kg)} kg</strong></span>
                                <span>Placed: {it.placedOn || 'Recent'}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-[11px] text-slate-500 italic py-1">
                            No fabric currently placed on this shelf.
                          </div>
                        )}

                        {/* Add Fabric to this Shelf Form */}
                        <div className="pt-2">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={addFabricLineId}
                              onChange={e => setAddFabricLineId(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none"
                            >
                              <option value="">+ Add Fabric to Shelf {String(sNum).padStart(2, '0')}...</option>
                              {unplacedLines.slice(0, 50).map(l => (
                                <option key={l.id} value={l.id}>
                                  {l.buyer} · Job {l.jobNo} · {l.color} ({Math.round(l.stockBalance)} kg)
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={!addFabricLineId}
                              onClick={() => handleAddItemToShelf(sid, addFabricLineId)}
                              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-md disabled:opacity-40 transition-colors shrink-0"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 2: JOB-WISE LOCATION SEARCH (MATCHING SCREENSHOT 1) */}
      {/* =================================================================== */}
      {subTab === 'JOB_SEARCH' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          {/* Job Search Input Bar */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Search Job No to Locate Finished Fabric:
            </label>
            <div className="flex items-center gap-2 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={jobSearchQuery}
                  onChange={e => setJobSearchQuery(e.target.value)}
                  placeholder="e.g. 48002, 48283, 48845..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={() => {}}
                className="px-4 py-2 bg-[#0F274E] text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
              >
                GO
              </button>
            </div>
          </div>

          {/* Job Details Banner (Matching Screenshot 1) */}
          {searchedJob ? (
            <div className="space-y-4">
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs font-bold text-[#0F274E] flex items-center justify-between">
                <span>
                  Job {searchedJob.jobNo} ({searchedJob.buyer} - {searchedJob.style}) — {searchedJob.fabric} · {searchedJob.gsm} GSM · Dia {searchedJob.dia}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-sky-100">
                  {searchedJob.colors.length} Color{searchedJob.colors.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Exact Location & Stock Summary Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#0F274E] text-white text-[11px]">
                    <tr>
                      <th className="px-3 py-2.5 font-bold">Color / Item</th>
                      <th className="px-3 py-2.5 font-semibold">Fabric Type & Process</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Order Qty (Kg)</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Received (Kg)</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Delivery / Issue</th>
                      <th className="px-3 py-2.5 text-right font-bold bg-sky-950 text-sky-200">In-Stock Qty</th>
                      <th className="px-3 py-2.5 font-bold text-center bg-[#0d2244]">Exact Shelf Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {searchedJob.colors.map(c => {
                      const shelfKeys = lineShelfMap[c.id] || [];
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2.5 font-bold text-slate-900">
                            {c.color}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {c.fabric} ({c.gsm} GSM)
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                            {Math.round(c.totalReq || 0).toLocaleString()} kg
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">
                            {Math.round(c.totalRecv || 0).toLocaleString()} kg
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium text-purple-700">
                            {Math.round(c.totalIssued || 0).toLocaleString()} kg
                          </td>
                          <td className="px-3 py-2.5 text-right font-black text-sky-800 bg-sky-50/50">
                            {Math.round(c.stockBalance || 0).toLocaleString()} kg
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {shelfKeys.length > 0 ? (
                              <div className="flex flex-wrap justify-center gap-1">
                                {shelfKeys.map(sid => (
                                  <button
                                    key={sid}
                                    type="button"
                                    onClick={() => {
                                      const m = /^R(\d+)-S(\d+)$/.exec(sid);
                                      if (m) {
                                        setSelectedRackNum(Number(m[1]));
                                        setExpandedShelf(sid);
                                        setSubTab('LAYOUT');
                                      }
                                    }}
                                    className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 transition-colors"
                                  >
                                    {shelfLabel(sid)}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                                Not assigned yet
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No matching job found for “{jobSearchQuery}”</p>
              <p className="text-[11px] text-slate-400 mt-1">Try searching for job numbers like 48002, 48283, 48845, 48858, 48153</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
