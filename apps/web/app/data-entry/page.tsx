'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Shell from '../../components/Shell';
import LiveDataEntrySheetCenter from '../../components/LiveDataEntrySheetCenter';
import { OperationalSheetKey } from '../../lib/store/operational-store';

function DataEntryPageInner() {
  const searchParams = useSearchParams();
  const sheetParam = (searchParams?.get('sheet') as OperationalSheetKey) || 'orders';
  return <LiveDataEntrySheetCenter initialSheet={sheetParam} />;
}

export default function DataEntryPage() {
  return (
    <Shell title="Live Data Entry & Master Sheet Workspace">
      <Suspense fallback={<div style={{ padding: 24 }}>Loading Master Sheet Workspace...</div>}>
        <DataEntryPageInner />
      </Suspense>
    </Shell>
  );
}
