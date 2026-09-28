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
