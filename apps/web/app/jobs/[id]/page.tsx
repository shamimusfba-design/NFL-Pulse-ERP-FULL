import React, { Suspense } from 'react';
import { Job360Client } from './Job360Client';

import demo2000DataRaw from '../../../data/demo-2000-master.json';

/** Every job gets its own page. Without this, Firebase's "unknown path -> /index.html"
 *  rule sends the job straight to the Executive Dashboard. */
export function generateStaticParams() {
  const jobs = ((demo2000DataRaw as { jobs?: { jobNo?: string }[] }).jobs ?? []);
  const ids = Array.from(new Set(jobs.map((j) => String(j.jobNo || '')).filter(Boolean)));
  return ids.map((id) => ({ id }));
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let decodedId = id;
  try { decodedId = decodeURIComponent(id); } catch {}
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#0F274E', fontWeight: 700 }}>Loading Job 360 Life-Cycle...</div>}>
      <Job360Client initialJobId={decodedId} />
    </Suspense>
  );
}
