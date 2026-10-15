export function buyerShortCode(value?: string | null) {
  const raw = String(value || '').trim().toUpperCase();
  const compact = raw.replace(/\s+/g, '');
  const map: Record<string,string> = {
    ONLY:'ONL', ONL:'ONL', ONLYSONS:'ONS', 'ONLY & SONS':'ONS', ONS:'ONS',
    NAMEIT:'NMT', 'NAME IT':'NMT', NMT:'NMT', OVS:'OVS', UTG:'UTG',
  };
  return map[raw] || map[compact] || raw.replace(/[^A-Z0-9]/g,'').slice(0,4) || 'JOB';
}

export function displayJobNo(jobNo: string | number | null | undefined, buyer?: any) {
  const raw = String(jobNo ?? '').trim();
  if (!raw) return '—';
  if (/^[A-Z]{2,5}\s+\d+/i.test(raw)) return raw.toUpperCase();
  const buyerValue = typeof buyer === 'string' ? buyer : buyer?.code || buyer?.name || buyer?.buyerCode;
  return `${buyerShortCode(buyerValue)} ${raw}`;
}

export function compactDate(value: any) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0,10) || '—';
  return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).replace(/ /g,'-');
}

export function formatFloorLine(factory?: string | null, floor?: string | null, line?: string | null) {
  const fac = (factory || 'NFL').trim().toUpperCase();
  const flStr = String(floor || '').trim();
  let flNum = '1';
  if (flStr.includes('2') || flStr.includes('02')) flNum = '2';
  else if (flStr.includes('3') || flStr.includes('03')) flNum = '3';

  let lineStr = String(line || '1').trim();
  if (lineStr.startsWith('L-') || lineStr.startsWith('l-')) {
    lineStr = lineStr.slice(2).trim();
  }
  return `${fac}${flNum}- ${lineStr}`;
}

export function normalizeJobSearch(input: string) {
  const raw = String(input || '').trim().toLowerCase();
  // Strip 'job', '#', 'no', 'num', buyer prefixes 'onl', 'ovs', 'utg', 'ons', 'nmt', colons, dashes
  const clean = raw
    .replace(/^job\s*(#|no\.?|num\.?)?\s*/i, '')
    .replace(/^#\s*/, '')
    .replace(/^(onl|ons|ovs|nmt|utg)\s+/i, '')
    .trim();
  const digits = clean.replace(/\D/g, '');
  return { raw, clean, digits };
}

export function matchesJobSearch(job: any, query: string): boolean {
  if (!query || !query.trim()) return true;
  const { raw, clean, digits } = normalizeJobSearch(query);
  if (!clean && !digits) return true;

  const jNo = String(job.jobNo || '').toLowerCase().trim();
  const cleanJNo = jNo.replace(/^(onl|ons|ovs|nmt|utg)\s+/i, '').replace(/^#\s*/, '').trim();
  const jDigits = cleanJNo.replace(/\D/g, '');
  const sNo = String(job.styleNo || '').toLowerCase();
  const buyer = String(job.buyer || job.buyerCode || '').toLowerCase();
  const merch = String(job.merchandiser || '').toLowerCase();
  const item = String(job.itemDescription || job.item || '').toLowerCase();
  const id = String(job.id || '').toLowerCase();
  const displayed = displayJobNo(job.jobNo, job.buyer).toLowerCase();

  // 1. Direct or partial on Job Number
  if (jNo === clean || jNo === raw || displayed.includes(raw) || displayed.includes(clean)) return true;
  if (cleanJNo === clean || cleanJNo.startsWith(clean) || clean.startsWith(cleanJNo)) return true;
  if (clean.length >= 2 && jNo.includes(clean)) return true;
  if (clean.length >= 2 && clean.includes(cleanJNo)) return true;

  // 2. Digits match (e.g. searching "22041" matches "22041 61th")
  if (digits.length >= 3) {
    if (jDigits === digits || jDigits.startsWith(digits) || jDigits.includes(digits)) return true;
    if (jNo.startsWith(digits)) return true;
  }

  // 3. Style, Buyer, Merchandiser, Item, ID
  if (sNo.includes(clean) || sNo.includes(raw)) return true;
  if (buyer.includes(clean) || buyer.includes(raw)) return true;
  if (merch.includes(clean) || merch.includes(raw)) return true;
  if (item.includes(clean) || item.includes(raw)) return true;
  if (id === raw || id === clean) return true;

  return false;
}
