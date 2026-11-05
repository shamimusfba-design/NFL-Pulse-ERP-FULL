import React, { Suspense } from 'react';
import { Job360Client } from './Job360Client';

export function generateStaticParams() {
  return [
    { id: '46755' },
    { id: '48092' },
    { id: '48085' },
    { id: '48061' },
    { id: '22041' },
    { id: '45456' },
    { id: '44278' },
    { id: '46880' },
    { id: '46881' },
    { id: '47056' },
  ];
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#0F274E', fontWeight: 700 }}>Loading Job 360 Life-Cycle...</div>}>
      <Job360Client initialJobId={id} />
    </Suspense>
  );
}
