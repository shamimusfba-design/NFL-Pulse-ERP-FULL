'use client';

import React, { useMemo, useState } from 'react';
import { Warehouse, Search, MapPin, ArrowRight, X, Check } from 'lucide-react';

/**
 * Finished Fabric Store — rack & shelf location tracking.
 * 20 racks × 9 shelves. A shelf holds one colour of one job. Racks are NOT buyer-fixed:
 * a colour is placed on whichever shelf is free when it arrives, and the system keeps track.
 */

export const FABRIC_RACKS = 20;
export const FABRIC_SHELVES = 9;

export type ShelfAssignment = { lineId: string; placedOn: string };
export type RackLocations = Record<string, ShelfAssignment>; // key = shelfId "R01-S1"

export type RackLine = {
  id: string;
  buyer: string;
  jobNo: string;
  style: string;
  color: string;
  fabric: string;
  gsm: string;
  dia: string;
  stockBalance: number;
  deliveryDate: string;
};

export const shelfId = (rack: number, shelf: number) => `R${String(rack).padStart(2, '0')}-S${shelf}`;
export const shelfLabel = (id: string) => {
  const m = /^R(\d+)-S(\d+)$/.exec(id);
  return m ? `Rack ${m[1]} · Shelf ${m[2]}` : id;
};
export const ALL_SHELVES: string[] = Array.from({ length: FABRIC_RACKS }, (_, r) =>
  Array.from({ length: FABRIC_SHELVES }, (_, s) => shelfId(r + 1, s + 1))
).flat();

/** First-time layout: in-store colours placed on shelves in arrival order (newest first), ~80% full. */
export function seedRackLocations(lines: RackLine[]): RackLocations {
  const inStore = lines
    .filter(l => l.stockBalance > 0.5)
    .sort((a, b) => String(b.deliveryDate).localeCompare(String(a.deliveryDate)));
  const out: RackLocations = {};
  const fill = Math.round(ALL_SHELVES.length * 0.82);
  ALL_SHELVES.slice(0, fill).forEach((sid, i) => {
    const l = inStore[i];
    if (l) out[sid] = { lineId: l.id, placedOn: l.deliveryDate };
  });
  return out;
}

const BUYER_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#d97706', '#059669', '#0891b2', '#dc2626', '#4f46e5', '#65a30d', '#0f766e'];
export function buyerColor(buyer: string) {
  let h = 0;
  for (const ch of buyer || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return BUYER_COLORS[h % BUYER_COLORS.length];
}

const today = () => new Date().toISOString().slice(0, 10);

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
  const [sub, setSub] = useState<'racks' | 'tracking'>(initialSub);
  const [query, setQuery] = useState(initialQuery);
  const [selShelf, setSelShelf] = useState<string | null>(null);
  const [jobQuery, setJobQuery] = useState(initialQuery);
  const [selJob, setSelJob] = useState<string | null>(initialQuery || null);
  const [moveTo, setMoveTo] = useState('');
  const [placeLine, setPlaceLine] = useState('');

  const byId = useMemo(() => {
    const m = new Map<string, RackLine>();
    lines.forEach(l => m.set(l.id, l));
    return m;
  }, [lines]);

  const lineShelf = useMemo(() => {
    const m: Record<string, string> = {};
    Object.entries(locations).forEach(([sid, a]) => (m[a.lineId] = sid));
    return m;
  }, [locations]);

  const freeShelves = useMemo(() => ALL_SHELVES.filter(s => !locations[s]), [locations]);
  const inStore = useMemo(() => lines.filter(l => l.stockBalance > 0.5), [lines]);
  const unplaced = useMemo(() => inStore.filter(l => !lineShelf[l.id]), [inStore, lineShelf]);
  const occupied = ALL_SHELVES.length - freeShelves.length;

  const q = query.trim().toLowerCase();
  const matches = (sid: string) => {
    if (!q) return true;
    const a = locations[sid];
    const l = a && byId.get(a.lineId);
    if (!l) return false;
    return `${l.jobNo} ${l.color} ${l.style} ${l.buyer}`.toLowerCase().includes(q);
  };
  const matchCount = q ? ALL_SHELVES.filter(matches).length : 0;

  // ---- actions ----
  const move = (from: string, to: string) => {
    const a = locations[from];
    if (!a || !to || locations[to]) return;
    const next = { ...locations };
    delete next[from];
    next[to] = { lineId: a.lineId, placedOn: today() };
    const l = byId.get(a.lineId);
    onChange(next, `${l?.jobNo} · ${l?.color} moved to ${shelfLabel(to)}`);
    setSelShelf(to);
    setMoveTo('');
  };
  const clear = (sid: string) => {
    const a = locations[sid];
    if (!a) return;
    const next = { ...locations };
    delete next[sid];
    const l = byId.get(a.lineId);
    onChange(next, `${shelfLabel(sid)} is now free (${l?.jobNo} · ${l?.color} taken out)`);
  };
  const place = (sid: string, lineId: string) => {
    if (!lineId || locations[sid]) return;
    const existing = lineShelf[lineId];
    const next = { ...locations };
    if (existing) delete next[existing];
    next[sid] = { lineId, placedOn: today() };
    const l = byId.get(lineId);
    onChange(next, `${l?.jobNo} · ${l?.color} placed on ${shelfLabel(sid)}`);
    setPlaceLine('');
    setSelShelf(sid);
  };

  // ---- job-wise tracking data ----
  const jobs = useMemo(() => {
    const m = new Map<string, { key: string; buyer: string; jobNo: string; style: string; colors: RackLine[] }>();
    inStore.forEach(l => {
      const key = `${l.buyer}|${l.jobNo}`;
      if (!m.has(key)) m.set(key, { key, buyer: l.buyer, jobNo: l.jobNo, style: l.style, colors: [] });
      m.get(key)!.colors.push(l);
    });
    const placedCount = (j: { colors: RackLine[] }) => j.colors.filter(c => lineShelf[c.id]).length;
    return Array.from(m.values()).sort((a, b) => placedCount(b) - placedCount(a) || a.jobNo.localeCompare(b.jobNo));
  }, [inStore, lineShelf]);
  const jq = jobQuery.trim().toLowerCase();
  const jobList = useMemo(
    () => jobs.filter(j => !jq || `${j.jobNo} ${j.buyer} ${j.style} ${j.colors.map(c => c.color).join(' ')}`.toLowerCase().includes(jq)).slice(0, 80),
    [jobs, jq]
  );
  const activeJob = jobs.find(j => j.key === selJob) || (jq ? jobList[0] : undefined);

  const showOnRack = (sid: string, jobNo: string) => {
    setSub('racks');
    setQuery(jobNo);
    setSelShelf(sid);
  };

  const sel = selShelf ? locations[selShelf] : undefined;
  const selLine = sel ? byId.get(sel.lineId) : undefined;

  const subBtn = (k: 'racks' | 'tracking', label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setSub(k)}
      className={`px-4 py-2 rounded-lg text-[13px] font-bold flex items-center gap-2 border ${
        sub === k ? 'nos-tab-on' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {subBtn('racks', `Store Rack View (${FABRIC_RACKS} Racks × ${FABRIC_SHELVES} Shelves)`, <Warehouse className="w-4 h-4" />)}
        {subBtn('tracking', 'Job-wise Location Tracking', <MapPin className="w-4 h-4" />)}
        <div className="ml-auto flex flex-wrap gap-2 text-[12.5px] font-semibold">
          <span className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-800">Shelves: {ALL_SHELVES.length}</span>
          <span className="px-2.5 py-1 rounded-md border border-sky-300 bg-sky-50 text-sky-900">Occupied: {occupied}</span>
          <span className="px-2.5 py-1 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-900">Free: {freeShelves.length}</span>
          <span className="px-2.5 py-1 rounded-md border border-amber-300 bg-amber-50 text-amber-900">In store, not on a rack: {unplaced.length}</span>
        </div>
      </div>

      {sub === 'racks' && (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) 330px' }}>
          <div className="bg-white rounded-xl border border-slate-300 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h3 className="text-[15px] font-extrabold text-slate-900 m-0">Finished Fabric Store — Rack Floor Plan</h3>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-600 absolute left-2.5 top-2" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Find job, colour or style on the racks"
                  className="pl-8 pr-8 py-1.5 text-[13px] rounded-lg border border-slate-300 w-[300px] text-slate-900"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="absolute right-2 top-1.5 text-slate-600" title="Clear">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {q && (
              <div className="mb-3 text-[13px] font-semibold text-slate-800">
                {matchCount ? `${matchCount} shelf${matchCount > 1 ? 'ves' : ''} found for “${query}” — highlighted below` : `Nothing on the racks matches “${query}”`}
              </div>
            )}
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(178px, 1fr))' }}>
              {Array.from({ length: FABRIC_RACKS }, (_, r) => {
                const rack = r + 1;
                const shelves = Array.from({ length: FABRIC_SHELVES }, (_, s) => shelfId(rack, FABRIC_SHELVES - s)); // top shelf first
                const used = shelves.filter(s => locations[s]).length;
                return (
                  <div key={rack} className="rounded-lg border border-slate-300 bg-slate-50 overflow-hidden">
                    <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-100 border-b border-slate-300">
                      <span className="text-[13px] font-extrabold text-slate-900">Rack {String(rack).padStart(2, '0')}</span>
                      <span className={`text-[11.5px] font-bold ${used === FABRIC_SHELVES ? 'text-rose-700' : 'text-slate-700'}`}>
                        {used}/{FABRIC_SHELVES}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 p-1.5">
                      {shelves.map(sid => {
                        const a = locations[sid];
                        const l = a && byId.get(a.lineId);
                        const hit = matches(sid);
                        const isSel = sid === selShelf;
                        const sNo = sid.split('-S')[1];
                        return (
                          <button
                            key={sid}
                            type="button"
                            onClick={() => setSelShelf(sid)}
                            title={l ? `${shelfLabel(sid)}\n${l.buyer} ${l.jobNo} · ${l.color}\n${Math.round(l.stockBalance)} kg` : `${shelfLabel(sid)} — empty`}
                            className="text-left rounded-md flex items-center gap-1.5 px-1.5 py-1 transition-opacity"
                            style={{
                              background: l ? '#ffffff' : 'transparent',
                              border: isSel ? '2px solid #0f274e' : l ? '1px solid #cbd5e1' : '1px dashed #94a3b8',
                              borderLeft: l ? `4px solid ${buyerColor(l.buyer)}` : undefined,
                              opacity: q && !hit ? 0.28 : 1,
                              boxShadow: q && hit && l ? '0 0 0 2px #f59e0b' : undefined,
                              minHeight: 30,
                            }}
                          >
                            <span className="text-[10.5px] font-bold text-slate-600 w-5 shrink-0">S{sNo}</span>
                            {l ? (
                              <span className="min-w-0 leading-tight">
                                <span className="block text-[11.5px] font-extrabold text-slate-900 truncate">{l.jobNo}</span>
                                <span className="block text-[10.5px] font-semibold text-slate-700 truncate">{l.color}</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-500">Empty</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* selected shelf */}
          <div className="bg-white rounded-xl border border-slate-300 p-4 self-start sticky top-4">
            {!selShelf && (
              <div className="text-[13px] text-slate-700 font-medium">
                Click any shelf to see what is stored there, move it, take it out, or place a newly received colour on an empty shelf.
              </div>
            )}
            {selShelf && (
              <>
                <div className="text-[11.5px] font-bold uppercase tracking-wide text-slate-600">Selected shelf</div>
                <div className="text-[18px] font-extrabold text-slate-900 mb-3">{shelfLabel(selShelf)}</div>
                {selLine ? (
                  <>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px] mb-4">
                      <div><div className="text-[11.5px] font-semibold text-slate-600">Buyer - Job</div><div className="font-bold text-slate-900">{selLine.buyer} - {selLine.jobNo}</div></div>
                      <div><div className="text-[11.5px] font-semibold text-slate-600">Style</div><div className="font-bold text-slate-900">{selLine.style || '—'}</div></div>
                      <div className="col-span-2"><div className="text-[11.5px] font-semibold text-slate-600">Colour</div><div className="font-bold text-slate-900">{selLine.color}</div></div>
                      <div><div className="text-[11.5px] font-semibold text-slate-600">Fabric</div><div className="font-semibold text-slate-900">{selLine.fabric} · {selLine.gsm} GSM · {selLine.dia}</div></div>
                      <div><div className="text-[11.5px] font-semibold text-slate-600">In stock</div><div className="font-bold text-sky-800">{Math.round(selLine.stockBalance).toLocaleString()} kg</div></div>
                      <div className="col-span-2"><div className="text-[11.5px] font-semibold text-slate-600">Placed on</div><div className="font-semibold text-slate-900">{sel?.placedOn}</div></div>
                    </div>
                    <label className="block text-[12px] font-bold text-slate-800 mb-1">Move to another shelf</label>
                    <div className="flex gap-2 mb-3">
                      <select value={moveTo} onChange={e => setMoveTo(e.target.value)} className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-[13px] text-slate-900">
                        <option value="">Choose a free shelf…</option>
                        {freeShelves.map(s => <option key={s} value={s}>{shelfLabel(s)}</option>)}
                      </select>
                      <button disabled={!moveTo} onClick={() => move(selShelf, moveTo)} className="px-3 py-1.5 rounded-lg text-[13px] font-bold nos-btn-primary disabled:opacity-50">
                        Move
                      </button>
                    </div>
                    <button onClick={() => clear(selShelf)} className="w-full px-3 py-1.5 rounded-lg text-[13px] font-bold border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100">
                      Take out — shelf becomes free
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-[13px] text-slate-800 font-medium mb-2">This shelf is empty. Place a colour that is in store but not on a rack yet:</div>
                    <select value={placeLine} onChange={e => setPlaceLine(e.target.value)} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-[13px] text-slate-900 mb-2">
                      <option value="">Choose a colour… ({unplaced.length} waiting)</option>
                      {unplaced.slice(0, 400).map(l => (
                        <option key={l.id} value={l.id}>{l.buyer} {l.jobNo} · {l.color} · {Math.round(l.stockBalance)} kg</option>
                      ))}
                    </select>
                    <button disabled={!placeLine} onClick={() => place(selShelf, placeLine)} className="w-full px-3 py-1.5 rounded-lg text-[13px] font-bold nos-btn-primary disabled:opacity-50">
                      Place on this shelf
                    </button>
                  </>
                )}
              </>
            )}
            <div className="mt-4 pt-3 border-t border-slate-200 text-[12px] text-slate-700">
              Left colour bar = buyer. Racks are not buyer-fixed: a colour goes on whichever shelf is free when it arrives.
            </div>
          </div>
        </div>
      )}

      {sub === 'tracking' && (
        <div className="grid gap-4" style={{ gridTemplateColumns: '320px minmax(0,1fr)' }}>
          <div className="bg-white rounded-xl border border-slate-300 p-3 self-start">
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-600 absolute left-2.5 top-2" />
              <input
                value={jobQuery}
                onChange={e => { setJobQuery(e.target.value); setSelJob(null); }}
                placeholder="Search job, buyer, style or colour"
                className="pl-8 pr-2 py-1.5 text-[13px] rounded-lg border border-slate-300 w-full text-slate-900"
              />
            </div>
            <div className="text-[12px] font-semibold text-slate-700 mb-2">{jobs.length.toLocaleString()} jobs have fabric in store</div>
            <div className="flex flex-col gap-1 max-h-[560px] overflow-auto">
              {jobList.map(j => {
                const placed = j.colors.filter(c => lineShelf[c.id]).length;
                const on = activeJob?.key === j.key;
                return (
                  <button
                    key={j.key}
                    onClick={() => setSelJob(j.key)}
                    className={`text-left px-2.5 py-2 rounded-lg border ${on ? 'border-[#0f274e] bg-sky-50' : 'border-slate-200 hover:bg-slate-50'}`}
                    style={{ borderLeft: `4px solid ${buyerColor(j.buyer)}` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-extrabold text-slate-900">{j.buyer} - {j.jobNo}</span>
                      <ArrowRight className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="text-[12px] font-semibold text-slate-700">
                      {j.colors.length} colour{j.colors.length > 1 ? 's' : ''} · {placed} on rack{placed !== j.colors.length ? ` · ${j.colors.length - placed} not placed` : ''}
                    </div>
                  </button>
                );
              })}
              {!jobList.length && <div className="text-[13px] text-slate-700 p-2">No job with fabric in store matches.</div>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-300 p-4 self-start">
            {!activeJob ? (
              <div className="text-[13px] text-slate-700 font-medium">Choose a job on the left to see where each of its colours is stored.</div>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <div>
                    <div className="text-[11.5px] font-bold uppercase tracking-wide text-slate-600">Job location</div>
                    <div className="text-[18px] font-extrabold text-slate-900">{activeJob.buyer} - {activeJob.jobNo} <span className="text-[13px] font-semibold text-slate-700">Style {activeJob.style || '—'}</span></div>
                  </div>
                  <div className="text-[13px] font-semibold text-slate-800">
                    {Math.round(activeJob.colors.reduce((s, c) => s + c.stockBalance, 0)).toLocaleString()} kg in store
                  </div>
                </div>
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="text-left border-b-2 border-slate-300">
                      <th className="py-2 pr-2 font-bold text-slate-800">#</th>
                      <th className="py-2 pr-2 font-bold text-slate-800">Colour</th>
                      <th className="py-2 pr-2 font-bold text-slate-800 text-right">In stock</th>
                      <th className="py-2 pr-2 font-bold text-slate-800">Location</th>
                      <th className="py-2 pr-2 font-bold text-slate-800">Placed on</th>
                      <th className="py-2 font-bold text-slate-800">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeJob.colors.map((c, i) => {
                      const sid = lineShelf[c.id];
                      return (
                        <tr key={c.id} className="border-b border-slate-200">
                          <td className="py-2 pr-2 font-semibold text-slate-700">{i + 1}</td>
                          <td className="py-2 pr-2 font-bold text-slate-900">{c.color}</td>
                          <td className="py-2 pr-2 text-right font-semibold text-slate-900">{Math.round(c.stockBalance).toLocaleString()} kg</td>
                          <td className="py-2 pr-2">
                            {sid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-sky-300 bg-sky-50 text-sky-900 font-bold">
                                <MapPin className="w-3.5 h-3.5" /> {shelfLabel(sid)}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md border border-amber-300 bg-amber-50 text-amber-900 font-bold">Not on a rack</span>
                            )}
                          </td>
                          <td className="py-2 pr-2 font-semibold text-slate-800">{sid ? locations[sid].placedOn : '—'}</td>
                          <td className="py-2">
                            {sid ? (
                              <button onClick={() => showOnRack(sid, activeJob.jobNo)} className="px-2.5 py-1 rounded-md text-[12.5px] font-bold border border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
                                Show on rack
                              </button>
                            ) : (
                              <AssignShelf free={freeShelves} onAssign={to => place(to, c.id)} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AssignShelf({ free, onAssign }: { free: string[]; onAssign: (sid: string) => void }) {
  const [v, setV] = useState('');
  return (
    <div className="flex gap-1.5">
      <select value={v} onChange={e => setV(e.target.value)} className="border border-slate-300 rounded-md px-1.5 py-1 text-[12.5px] text-slate-900">
        <option value="">Free shelf…</option>
        {free.map(s => <option key={s} value={s}>{shelfLabel(s)}</option>)}
      </select>
      <button disabled={!v} onClick={() => onAssign(v)} className="px-2 py-1 rounded-md text-[12.5px] font-bold nos-btn-primary disabled:opacity-50" title="Assign">
        <Check className="w-4 h-4" />
      </button>
    </div>
  );
}
